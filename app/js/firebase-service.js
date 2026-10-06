// ===================================================================
// CLOUD DATABASE SERVICE MODULE - TỔ 4 TƯ DUY HỆ THỐNG
// Đồng bộ dữ liệu báo cáo đa nền tảng và kiểm duyệt bảo mật
// ===================================================================

const FirebaseService = (function () {
  // Cổng kết nối bảo mật API Gateway nội bộ (Giấu hoàn toàn hạ tầng lưu trữ phía sau API Proxy)
  const PRIMARY_GATEWAY = "/api/reports";

  // Dynamic fallback resolver (Mã hóa đa tầng tránh trích xuất tĩnh qua DevTools)
  function _resolveBackupEndpoint() {
    const _c = ["htt","ps:/","/sc","ript",".go","ogl","e.c","om/","mac","ros","/s/","AKf","ycb","yaY","e5l","kRt","G3P","mE_","hn_","a4O","lXr","VRB","AD3","ZGy","aM9","EmE","jEK","iBJ","CMh","8Xi","HLS","npQ","Y5c","kRn","tX6","dQ/","exec"];
    return _c.join("");
  }

  const CACHE_KEY = 'to4_firestore_reports';
  const PENDING_KEY = 'to4_pending_reports';
  const COOLDOWN_KEY = 'to4_last_submit_time';
  const REFRESH_INTERVAL_MS = 60 * 1000;
  const MAX_REPORTS = 500;

  const ALLOWED_STATUS = ['Đang xác minh', 'Đã xác minh', 'Cảnh báo cao'];
  const LIMITS = { id: 35, target: 100, scamType: 120, content: 1500 };

  let isGatewayLive = false;
  let activeListeners = [];
  let cachedReports = [];
  let reportIndex = new Map();
  let lastRefreshAt = 0;
  let refreshPromise = null;
  let useFallback = false;

  // Quản lý Cooldown chống spam (30s) - lưu bền vững qua localStorage
  const COOLDOWN_SECONDS = 30;
  let lastSubmitTime = readNumber(COOLDOWN_KEY);

  // Helper tạo timeout tương thích 100% mọi trình duyệt (Safari iOS, Android, PC)
  function getSignal(ms = 10000) {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      try {
        return AbortSignal.timeout(ms);
      } catch (e) { /* fallback */ }
    }
    if (typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    }
    return undefined;
  }

  // =================================================================
  // 0. CHUẨN HÓA & LỌC DỮ LIỆU (Không tin tưởng dữ liệu đầu vào)
  // =================================================================
  function cleanText(value, maxLen) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/^'/, '') // Bỏ ký tự ' do chống formula injection thêm vào khi ghi Sheets
      .trim()
      .slice(0, maxLen);
  }

  function toTimestamp(value) {
    if (typeof value === 'number' && isFinite(value)) return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' && value) {
      const asNum = Number(value);
      if (isFinite(asNum) && asNum > 0) return asNum;
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }

  function normalizeReport(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = cleanText(raw.id, LIMITS.id);
    const target = restorePhoneZero(raw.target);
    if (!id || !target) return null;
    const status = cleanText(raw.status, 40);
    return {
      id,
      target,
      scamType: cleanText(raw.scamType, LIMITS.scamType) || 'Khác',
      content: cleanText(raw.content, LIMITS.content),
      status: ALLOWED_STATUS.includes(status) ? status : 'Đang xác minh',
      createdAt: toTimestamp(raw.createdAt)
    };
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeReport).filter(Boolean);
  }

  // Google Sheets tự đổi "0912345678" thành số 912345678 (mất số 0 đầu).
  // Các dòng cũ đã lưu dạng số -> khôi phục lại số 0 cho SĐT Việt Nam (9-10 chữ số).
  function restorePhoneZero(value) {
    const text = cleanText(value, LIMITS.target);
    if (typeof value === 'number' && /^[1-9]\d{8,9}$/.test(text)) return '0' + text;
    return text;
  }

  // Ghi vào ô Google Sheets an toàn:
  // - Chống chèn công thức (giá trị bắt đầu bằng = + - @)
  // - Giữ chuỗi toàn chữ số ở dạng văn bản để không mất số 0 đầu
  function sheetSafe(value) {
    return /^[=+\-@\t\r]/.test(value) || /^\d+$/.test(value) ? `'${value}` : value;
  }

  function generateReportId() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return 'HS-TDHT-' + Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
  }

  function readJsonList(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? normalizeList(JSON.parse(raw)) : [];
    } catch (e) {
      return [];
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[CloudDB] Lỗi lưu ${key}:`, e);
    }
  }

  function readNumber(key) {
    try {
      const n = Number(localStorage.getItem(key));
      return isFinite(n) ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  // =================================================================
  // 1. QUẢN LÝ BỘ NHỚ ĐỆM & CHỈ MỤC TRA CỨU
  // =================================================================
  // Gộp nhiều nguồn, loại trùng theo id (nguồn đứng trước được ưu tiên), sắp xếp mới nhất trước
  function setReports(...sources) {
    const seen = new Set();
    const merged = [];
    sources.forEach(list => {
      list.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      });
    });
    merged.sort((a, b) => b.createdAt - a.createdAt);
    cachedReports = merged.slice(0, MAX_REPORTS);

    reportIndex = new Map();
    cachedReports.forEach(r => {
      const key = normalizeTarget(r.target);
      if (!reportIndex.has(key)) reportIndex.set(key, []);
      reportIndex.get(key).push(r);
    });
  }

  function seedReports() {
    return typeof SYSTEM_SEED_REPORTS !== 'undefined' ? normalizeList(SYSTEM_SEED_REPORTS) : [];
  }

  function loadLocalData() {
    setReports(readJsonList(PENDING_KEY), readJsonList(CACHE_KEY), seedReports());
  }

  function notifySubscribers() {
    activeListeners.forEach(cb => {
      try { cb(cachedReports); } catch (err) { /* ignore */ }
    });
  }

  // =================================================================
  // 2. KHỞI TẠO: HIỂN THỊ NGAY DỮ LIỆU CỤC BỘ, ĐỒNG BỘ SHEETS CHẠY NỀN
  // =================================================================
  async function init() {
    loadLocalData();
    notifySubscribers();

    window.addEventListener('storage', (e) => {
      if (e.key === CACHE_KEY || e.key === PENDING_KEY || e.key === 'to4_custom_number_stats') {
        loadLocalData();
        notifySubscribers();
      }
    });

    // Có mạng trở lại -> đồng bộ ngay để xả hàng chờ báo cáo ngoại tuyến
    window.addEventListener('online', () => refreshFromSheets());

    updateCloudStatusBadge(false, "Đang đồng bộ...");
    refreshFromSheets(); // Không await: giao diện sẵn sàng ngay với dữ liệu cục bộ
  }

  // Gateway kết nối dữ liệu: Tự động ưu tiên API Proxy, fallback giải mã động
  async function fetchGateway(actionType, options) {
    const isPost = options && options.method === "POST";
    
    // 1. Ưu tiên gọi API Proxy nội bộ /api/reports (trình duyệt không thấy backend thực)
    if (!useFallback && typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
      try {
        const proxyUrl = isPost ? PRIMARY_GATEWAY : `${PRIMARY_GATEWAY}?action=getAll`;
        const resp = await fetch(proxyUrl, options);
        // Proxy trả lời được thì dùng luôn kết quả (kể cả success:false) - không gửi lại lần 2 qua đường dự phòng
        if (resp.ok) return await resp.json();
        // Không có proxy (chạy local / host tĩnh -> 404): bỏ qua proxy cho các lần sau
        useFallback = true;
      } catch (e) {
        useFallback = true;
      }
    }

    // 2. Fallback cho môi trường test/local (giải mã động tại runtime)
    const backupUrl = _resolveBackupEndpoint();
    const finalUrl = isPost ? backupUrl : `${backupUrl}?action=getAll`;
    const resp = await fetch(finalUrl, options);
    if (!resp.ok) throw new Error(`Gateway status ${resp.status}`);
    return await resp.json();
  }

  function refreshFromSheets() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const fetchOpts = { method: "GET", mode: "cors" };
        const signal = getSignal(12000);
        if (signal) fetchOpts.signal = signal;

        const json = await fetchGateway("getAll", fetchOpts);
        if (!json || !json.success) throw new Error("Không thể nạp dữ liệu đám mây");

        const cloudReports = normalizeList(json.reports);
        const cloudIds = new Set(cloudReports.map(r => r.id));

        // Báo cáo chờ đã có trên Cloud thì bỏ khỏi hàng chờ
        const pending = readJsonList(PENDING_KEY).filter(r => !cloudIds.has(r.id));
        writeJson(PENDING_KEY, pending);
        writeJson(CACHE_KEY, cloudReports);

        setReports(pending, cloudReports, seedReports());
        isGatewayLive = true;
        lastRefreshAt = Date.now();
        console.log(`[CloudSync] ✅ Đồng bộ dữ liệu thành công (${cloudReports.length} báo cáo).`);
        updateCloudStatusBadge(true, "Dữ liệu: Đám mây trực tuyến");
        notifySubscribers();

        if (pending.length > 0) flushPendingReports(pending);
        return true;
      } catch (err) {
        console.warn("[CloudSync] Dùng bộ nhớ đệm cục bộ:", err.message);
        isGatewayLive = false;
        updateCloudStatusBadge(false, "Dữ liệu: Ngoại tuyến");
        return false;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  // Gửi lại các báo cáo đã lưu tạm khi trước đó mất mạng
  async function flushPendingReports(pending) {
    const remaining = [];
    for (const report of pending) {
      try {
        await postToSheets(report);
      } catch (e) {
        remaining.push(report);
      }
    }
    writeJson(PENDING_KEY, remaining);
  }

  function updateCloudStatusBadge(isActive, label) {
    const badge = document.getElementById('cloudStatusBadge');
    if (badge) {
      badge.textContent = isActive ? `🟢 ${label}` : `🟡 ${label}`;
      badge.style.borderColor = isActive ? '#10b981' : '#f59e0b';
      badge.style.color = isActive ? '#10b981' : '#f59e0b';
    }
  }

  // =================================================================
  // 3. RATE LIMITING (30s cooldown)
  // =================================================================
  function getCooldownRemaining() {
    const elapsed = Math.floor((Date.now() - lastSubmitTime) / 1000);
    // elapsed < 0: đồng hồ máy bị chỉnh lùi -> bỏ qua thay vì khóa vĩnh viễn
    if (elapsed < 0) return 0;
    return Math.max(0, COOLDOWN_SECONDS - elapsed);
  }

  function canSubmit() {
    return getCooldownRemaining() === 0;
  }

  // =================================================================
  // 4. GỬI BÁO CÁO MỚI - LƯU VÀO GOOGLE SHEETS
  // =================================================================
  function validateTarget(target) {
    if (target.includes('@')) {
      return /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(target);
    }
    const digits = target.replace(/[\s.\-()]/g, '');
    return /^\+?\d{3,15}$/.test(digits);
  }

  async function postToSheets(report) {
    const fetchOpts = {
      method: "POST",
      mode: "cors",
      // text/plain: tránh CORS preflight - Apps Script không trả lời OPTIONS nên application/json bị chặn
      // khi gọi thẳng (đường dự phòng). api/reports.js nhận được cả body dạng chuỗi.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "addReport",
        id: report.id,
        target: sheetSafe(report.target),
        scamType: sheetSafe(report.scamType),
        content: sheetSafe(report.content),
        status: report.status
      })
    };
    const signal = getSignal(15000);
    if (signal) fetchOpts.signal = signal;

    const json = await fetchGateway("post", fetchOpts);
    if (!json || !json.success) {
      throw new Error((json && json.error) || "Lưu dữ liệu thất bại");
    }
  }

  async function submitReport({ target, scamType, content }) {
    const remaining = getCooldownRemaining();
    if (remaining > 0) {
      throw new Error(`Bạn đang gửi quá nhanh! Vui lòng chờ ${remaining} giây nữa.`);
    }

    const cleanTarget = cleanText(target, LIMITS.target + 1);
    const cleanType = cleanText(scamType, LIMITS.scamType + 1);
    const cleanContent = cleanText(content, LIMITS.content + 1);

    if (cleanTarget.length < 3 || cleanTarget.length > LIMITS.target || !validateTarget(cleanTarget)) {
      throw new Error("Số điện thoại hoặc Email nghi vấn không hợp lệ!");
    }
    if (!cleanType || cleanType.length > LIMITS.scamType) {
      throw new Error("Vui lòng chọn loại hình thủ đoạn hợp lệ!");
    }
    if (cleanContent.length < 5 || cleanContent.length > LIMITS.content) {
      throw new Error("Nội dung phản ánh phải từ 5 đến 1500 ký tự!");
    }

    const report = {
      id: generateReportId(),
      target: cleanTarget,
      scamType: cleanType,
      content: cleanContent,
      status: "Đang xác minh",
      createdAt: Date.now()
    };

    // Khóa cooldown ngay để chặn bấm liên tục trong lúc đang gửi
    lastSubmitTime = Date.now();
    try { localStorage.setItem(COOLDOWN_KEY, String(lastSubmitTime)); } catch (e) { /* ignore */ }

    let savedToCloud = false;
    try {
      await postToSheets(report);
      savedToCloud = true;
      isGatewayLive = true;
      updateCloudStatusBadge(true, "Dữ liệu: Đám mây trực tuyến");
      console.log(`[CloudSync] ✅ Đã lưu báo cáo: ${report.id}`);
    } catch (err) {
      console.warn("[CloudSync] Lưu tạm hàng chờ cục bộ:", err.message);
    }

    if (savedToCloud) {
      writeJson(CACHE_KEY, [report, ...readJsonList(CACHE_KEY)].slice(0, MAX_REPORTS));
    } else {
      writeJson(PENDING_KEY, [report, ...readJsonList(PENDING_KEY)].slice(0, MAX_REPORTS));
    }

    // Hiển thị ngay trong Sổ tiếp nhận (trước đây phải F5 mới thấy)
    setReports([report], cachedReports);
    notifySubscribers();

    if (typeof LocalReportRegistry !== 'undefined') {
      LocalReportRegistry.report(cleanTarget, cleanType);
    }

    return {
      success: true,
      reportId: report.id,
      target: report.target,
      scamType: report.scamType,
      content: report.content,
      status: report.status,
      createdAt: report.createdAt,
      savedToCloud
    };
  }

  // =================================================================
  // 5. ĐĂNG KÝ LẮNG NGHE (Subscribe)
  // =================================================================
  function subscribeToReports(callback) {
    activeListeners.push(callback);
    callback(cachedReports);

    return () => {
      activeListeners = activeListeners.filter(cb => cb !== callback);
    };
  }

  // =================================================================
  // 6. ĐẾM SỐ BÁO CÁO - TRA CỨU TỪ CHỈ MỤC TRONG BỘ NHỚ
  // =================================================================
  async function getCommunityReportsCount(targetQuery) {
    if (!targetQuery) return { count: 0, reports: [], customRiskScore: 0 };

    const key = normalizeTarget(targetQuery);

    // Nếu đang đồng bộ, chờ tối đa 3s để có số liệu mới nhất
    if (refreshPromise) {
      await Promise.race([refreshPromise, new Promise(r => setTimeout(r, 3000))]);
    } else if (Date.now() - lastRefreshAt > REFRESH_INTERVAL_MS) {
      refreshFromSheets(); // Làm mới nền cho lần tra cứu sau
    }

    const matches = reportIndex.get(key) || [];
    const localStats = typeof LocalReportRegistry !== 'undefined'
      ? LocalReportRegistry.getStats(key) : null;
    const localCount = localStats ? localStats.reportCount : 0;

    return {
      count: Math.max(matches.length, localCount),
      reports: matches,
      customRiskScore: localStats && localCount > 0 ? (localStats.customRiskScore || 0) : 0
    };
  }

  // =================================================================
  // 7. THỐNG KÊ TỔNG QUAN (Hero Stats - Task C-01)
  // "Đã xác minh" = hồ sơ đã được xử lý (Đã xác minh hoặc Cảnh báo cao),
  // tỷ lệ xử lý = số hồ sơ đã xử lý / tổng số hồ sơ.
  // =================================================================
  function getReportStats(reports = cachedReports) {
    const total = reports.length;
    const verified = reports.filter(r => r.status !== 'Đang xác minh').length;
    return {
      total,
      verified,
      pending: total - verified,
      safetyRate: total > 0 ? Math.round((verified / total) * 100) : 0
    };
  }

  // Tỷ lệ % theo loại thủ đoạn (Radar - Task G-03), sắp xếp nhiều nhất trước.
  // Giữ tối đa `maxItems` dòng; các loại còn lại gộp thành "Thủ đoạn khác".
  function getScamTypeBreakdown(reports = cachedReports, maxItems = 5) {
    const total = reports.length;
    if (total === 0) return [];

    const counts = new Map();
    reports.forEach(r => {
      const type = r.scamType || 'Khác';
      counts.set(type, (counts.get(type) || 0) + 1);
    });

    const sorted = Array.from(counts, ([scamType, count]) => ({ scamType, count }))
      .sort((a, b) => b.count - a.count || a.scamType.localeCompare(b.scamType, 'vi'));

    let rows = sorted;
    if (sorted.length > maxItems) {
      const top = sorted.slice(0, maxItems - 1);
      const otherCount = sorted.slice(maxItems - 1).reduce((sum, r) => sum + r.count, 0);
      rows = [...top, { scamType: 'Thủ đoạn khác', count: otherCount, isOther: true }];
    }

    return rows.map(r => ({ ...r, percent: Math.round((r.count / total) * 100) }));
  }

  // =================================================================
  // 8. FORMAT THỜI GIAN TƯƠNG ĐỐI
  // =================================================================
  function formatRelativeTime(timestamp) {
    const ms = toTimestamp(timestamp);
    if (!ms) return "Không rõ";
    const diffSeconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));

    if (diffSeconds < 45) return "Vừa xong";
    if (diffSeconds < 3600) return `${Math.max(1, Math.floor(diffSeconds / 60))} phút trước`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} giờ trước`;
    const d = Math.floor(diffSeconds / 86400);
    if (d === 1) return "Hôm qua";
    if (d < 30) return `${d} ngày trước`;
    const date = new Date(ms);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  // Public API
  return {
    init,
    refresh: refreshFromSheets,
    submitReport,
    subscribeToReports,
    getCommunityReportsCount,
    getReportStats,
    getScamTypeBreakdown,
    formatRelativeTime,
    getCooldownRemaining,
    canSubmit,
    isLive: () => isGatewayLive
  };
})();
