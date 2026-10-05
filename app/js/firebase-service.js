// ===================================================================
// CLOUD DATABASE SERVICE MODULE - Google Sheets Backend
// Thay thế Firebase bằng Google Sheets API qua Apps Script Web App
// Toàn bộ máy đều thấy cùng dữ liệu - đồng bộ thật sự
// ===================================================================

const FirebaseService = (function () {
  // ============================================================
  // CẤU HÌNH GOOGLE SHEETS BACKEND
  // Sau khi deploy Apps Script, paste URL vào đây:
  // ============================================================
  const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbyaYe5lkRtG3PmE_hn_a4OlXrVRBAD3ZGyaM9EmEjEKiBJCMh8XiHLSnpQY5ckRntX6dQ/exec";
  // Ví dụ: "https://script.google.com/macros/s/AKfycb.../exec"

  let isSheetsLive = false;
  let activeListeners = [];
  let cachedReports = [];

  // Quản lý Cooldown chống spam (30s)
  const COOLDOWN_SECONDS = 30;
  let lastSubmitTime = 0;

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
  // 1. KIỂM TRA KẾT NỐI VÀ KHỞI TẠO
  // =================================================================
  async function init() {
    console.log("[CloudDB] Đang kết nối Google Sheets backend...");

    if (!SHEETS_API_URL || SHEETS_API_URL === "PASTE_YOUR_APPS_SCRIPT_URL_HERE") {
      console.warn("[CloudDB] ⚠️ Chưa cấu hình Google Sheets URL. Sử dụng dữ liệu tích hợp sẵn.");
      setupLocalFallback();
      updateCloudStatusBadge(false, "Dữ liệu: Cục bộ");
      loadLocalFallbackData();
      return;
    }

    try {
      // Ping để kiểm tra kết nối với timeout rộng rãi 12s cho mạng 4G/di động
      const fetchOpts = {
        method: "GET",
        mode: "cors"
      };
      const signal = getSignal(12000);
      if (signal) fetchOpts.signal = signal;

      const resp = await fetch(`${SHEETS_API_URL}?action=getAll`, fetchOpts);

      if (resp.ok) {
        const json = await resp.json();
        if (json.success) {
          isSheetsLive = true;
          cachedReports = json.reports || [];
          saveLocalFallbackData();
          console.log(`[CloudDB] ✅ Kết nối Google Sheets thành công. ${cachedReports.length} báo cáo được tải.`);
          updateCloudStatusBadge(true, "Dữ liệu: Đồng bộ Sheets");
          notifySubscribers();
          return;
        }
      }
      throw new Error("Không thể nạp dữ liệu từ Sheets");
    } catch (err) {
      console.warn("[CloudDB] Không kết nối được Sheets, dùng dữ liệu cục bộ:", err.message);
      setupLocalFallback();
      loadLocalFallbackData();
      updateCloudStatusBadge(false, "Dữ liệu: Cục bộ");
    }
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
  // 2. FALLBACK CỤC BỘ (Khi chưa cấu hình Sheets hoặc offline)
  // =================================================================
  function setupLocalFallback() {
    isSheetsLive = false;
    window.addEventListener('storage', (e) => {
      if (e.key === 'to4_firestore_reports' || e.key === 'to4_custom_number_stats') {
        loadLocalFallbackData();
        notifySubscribers();
      }
    });
  }

  function loadLocalFallbackData() {
    try {
      const stored = localStorage.getItem('to4_firestore_reports');
      const seedList = typeof SYSTEM_SEED_REPORTS !== 'undefined' ? SYSTEM_SEED_REPORTS : [];

      if (stored) {
        const userSaved = JSON.parse(stored);
        const idMap = new Set();
        const merged = [];

        userSaved.forEach(item => {
          if (!idMap.has(item.id)) {
            idMap.add(item.id);
            merged.push(item);
          }
        });

        seedList.forEach(seed => {
          if (!idMap.has(seed.id)) {
            idMap.add(seed.id);
            merged.push(seed);
          }
        });

        cachedReports = merged;
      } else {
        cachedReports = seedList.length > 0 ? [...seedList] : [];
        saveLocalFallbackData();
      }
    } catch (e) {
      console.error("[CloudDB] Lỗi nạp local:", e);
      cachedReports = typeof SYSTEM_SEED_REPORTS !== 'undefined' ? [...SYSTEM_SEED_REPORTS] : [];
    }
  }

  function saveLocalFallbackData() {
    try {
      localStorage.setItem('to4_firestore_reports', JSON.stringify(cachedReports));
    } catch (e) {
      console.error("[CloudDB] Lỗi lưu local:", e);
    }
  }

  function notifySubscribers() {
    activeListeners.forEach(cb => {
      try { cb(cachedReports); } catch (err) { /* ignore */ }
    });
  }

  // =================================================================
  // 3. RATE LIMITING (30s cooldown)
  // =================================================================
  function getCooldownRemaining() {
    return Math.max(0, COOLDOWN_SECONDS - Math.floor((Date.now() - lastSubmitTime) / 1000));
  }

  function canSubmit() {
    return getCooldownRemaining() === 0;
  }

  // =================================================================
  // 4. GỬI BÁO CÁO MỚI - LƯU VÀO GOOGLE SHEETS
  // =================================================================
  async function submitReport({ target, scamType, content }) {
    const remaining = getCooldownRemaining();
    if (remaining > 0) {
      throw new Error(`Bạn đang gửi quá nhanh! Vui lòng chờ ${remaining} giây nữa.`);
    }

    const cleanTarget = String(target || '').trim();
    const cleanType = String(scamType || '').trim();
    const cleanContent = String(content || '').trim();

    if (!cleanTarget || cleanTarget.length < 3 || cleanTarget.length > 100) {
      throw new Error("Số điện thoại hoặc Email nghi vấn không hợp lệ (từ 3 đến 100 ký tự)!");
    }
    if (!cleanType || cleanType.length > 120) {
      throw new Error("Vui lòng chọn loại hình thủ đoạn hợp lệ!");
    }
    if (!cleanContent || cleanContent.length < 5 || cleanContent.length > 1500) {
      throw new Error("Nội dung phản ánh phải từ 5 đến 1500 ký tự!");
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reportId = `HS-TDHT-${randomSuffix}`;
    const status = "Đang xác minh";

    // Ghi vào Google Sheets
    if (SHEETS_API_URL && SHEETS_API_URL !== "PASTE_YOUR_APPS_SCRIPT_URL_HERE") {
      try {
        const fetchOpts = {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            id: reportId,
            target: cleanTarget,
            scamType: cleanType,
            content: cleanContent,
            status: status
          })
        };
        const signal = getSignal(15000);
        if (signal) fetchOpts.signal = signal;

        const resp = await fetch(SHEETS_API_URL, fetchOpts);
        const json = await resp.json();
        if (!json.success) {
          throw new Error(json.error || "Lưu Sheets thất bại");
        }
        isSheetsLive = true;
        updateCloudStatusBadge(true, "Dữ liệu: Đồng bộ Sheets");
        console.log(`[CloudDB] ✅ Đã ghi báo cáo vào Google Sheets: ${reportId}`);
      } catch (err) {
        console.warn("[CloudDB] Ghi Sheets thất bại, lưu local:", err.message);
        writeToLocalFallback(reportId, cleanTarget, cleanType, cleanContent, status);
      }
    } else {
      writeToLocalFallback(reportId, cleanTarget, cleanType, cleanContent, status);
    }

    if (typeof LocalReportRegistry !== 'undefined') {
      LocalReportRegistry.report(cleanTarget, cleanType);
    }

    lastSubmitTime = Date.now();

    return { success: true, reportId, target: cleanTarget };
  }

  function writeToLocalFallback(id, target, scamType, content, status) {
    const newDoc = { id, target, scamType, content, status, createdAt: Date.now() };
    cachedReports.unshift(newDoc);
    saveLocalFallbackData();
    notifySubscribers();
  }

  // =================================================================
  // 5. ĐĂNG KÝ LẮNG NGHE (Subscribe)
  // =================================================================
  function subscribeToReports(callback) {
    activeListeners.push(callback);
    if (cachedReports.length > 0) callback(cachedReports);

    return () => {
      activeListeners = activeListeners.filter(cb => cb !== callback);
    };
  }

  // =================================================================
  // 6. ĐẾM SỐ BÁO CÁO - QUERY TỪ GOOGLE SHEETS
  // =================================================================
  async function getCommunityReportsCount(targetQuery) {
    if (!targetQuery) return { count: 0, reports: [] };

    const cleanQuery = targetQuery.replace(/[\s.\-()]/g, '').toLowerCase();

    // Query từ Google Sheets
    if (SHEETS_API_URL && SHEETS_API_URL !== "PASTE_YOUR_APPS_SCRIPT_URL_HERE") {
      try {
        const fetchOpts = {
          method: "GET",
          mode: "cors"
        };
        const signal = getSignal(12000);
        if (signal) fetchOpts.signal = signal;

        const resp = await fetch(
          `${SHEETS_API_URL}?action=count&target=${encodeURIComponent(cleanQuery)}`,
          fetchOpts
        );
        const json = await resp.json();
        if (json.success) {
          isSheetsLive = true;
          updateCloudStatusBadge(true, "Dữ liệu: Đồng bộ Sheets");
          const sheetCount = json.count || 0;
          const localStats = typeof LocalReportRegistry !== 'undefined'
            ? LocalReportRegistry.getStats(cleanQuery) : null;
          const localCount = localStats ? localStats.reportCount : 0;
          const totalCount = Math.max(sheetCount, localCount);

          return {
            count: totalCount,
            reports: json.reports || [],
            customRiskScore: localStats ? (localStats.customRiskScore || 0) : 0
          };
        }
      } catch (e) {
        console.warn("[CloudDB] Query Sheets thất bại, dùng cache:", e.message);
      }
    }

    // Fallback: tìm trong cache
    const matches = cachedReports.filter(r => {
      const itemTarget = String(r.target || '').replace(/[\s.\-()]/g, '').toLowerCase();
      return itemTarget === cleanQuery || itemTarget.includes(cleanQuery) || cleanQuery.includes(itemTarget);
    });

    const localStats = typeof LocalReportRegistry !== 'undefined'
      ? LocalReportRegistry.getStats(cleanQuery) : null;
    let customRiskScore = 0;
    if (localStats && localStats.reportCount > 0) {
      customRiskScore = localStats.customRiskScore || 0;
    }

    const localCount = localStats ? localStats.reportCount : 0;
    const totalCount = Math.max(matches.length, localCount);

    return { count: totalCount, reports: matches, customRiskScore };
  }

  // =================================================================
  // 7. FORMAT THỜI GIAN TƯƠNG ĐỐI
  // =================================================================
  function formatRelativeTime(timestamp) {
    if (!timestamp) return "Mới đây";
    let ms = typeof timestamp === 'number' ? timestamp : (Number(timestamp) || Date.now());
    const diffSeconds = Math.floor((Date.now() - ms) / 1000);

    if (diffSeconds < 45) return "Vừa xong";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} phút trước`;
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
    submitReport,
    subscribeToReports,
    getCommunityReportsCount,
    formatRelativeTime,
    getCooldownRemaining,
    canSubmit,
    isLive: () => isSheetsLive
  };
})();
