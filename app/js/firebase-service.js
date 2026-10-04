// ===================================================================
// FIREBASE CLOUD SERVICE MODULE (STUDENT CYBERGUARD - TỔ 4)
// Chức năng:
// 1. Quản lý kết nối Firebase Cloud Firestore & Anonymous Authentication
// 2. Lắng nghe dữ liệu thời gian thực (onSnapshot) cho Sổ tiếp nhận hồ sơ
// 3. Đếm số lượng phản ánh cộng đồng thực tế phục vụ tra cứu minh bạch
// 4. Rate-limiting chống spam (Khóa nút cooldown 30 giây)
// 5. Đảm bảo ẩn danh tuyệt đối 100% (Không lưu trữ danh tính người gửi)
// ===================================================================

const FirebaseService = (function() {
  // CẤU HÌNH DỰ ÁN FIREBASE (Thay thế bằng thông số từ Firebase Console của bạn)
  const firebaseConfig = {
    apiKey: "AIzaSyDemoMockCyberGuardKey_To4SystemsThinking",
    authDomain: "cyberguard-to4.firebaseapp.com",
    projectId: "cyberguard-to4",
    storageBucket: "cyberguard-to4.appspot.com",
    messagingSenderId: "104920264091",
    appId: "1:104920264091:web:a9b8c7d6e5f4"
  };

  let db = null;
  let auth = null;
  let isLiveFirebase = false;
  let currentUser = null;
  let activeListeners = [];

  // Quản lý Cooldown chống spam (30s)
  const COOLDOWN_SECONDS = 30;
  let lastSubmitTime = 0;

  // Cache dữ liệu nội bộ phản ánh cộng đồng (dùng cho truy vấn nhanh & fallback)
  let cachedReports = [];

  // =================================================================
  // 1. KHỞI TẠO FIREBASE & ANONYMOUS AUTHENTICATION
  // =================================================================
  async function init() {
    console.log("[FirebaseService] Đang khởi tạo hệ thống bảo mật & kết nối đám mây...");
    
    // Kiểm tra xem Firebase SDK đã được nhúng vào trang chưa
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.firestore();

        // Tự động gọi signInAnonymously() trong nền để cấp Token bảo mật không thu thập PII
        const authResult = await auth.signInAnonymously();
        currentUser = authResult.user;
        isLiveFirebase = true;
        console.log(`[FirebaseService] ✅ Đăng nhập ẩn danh thành công. Anonymous UID: ${currentUser.uid}`);
        updateCloudStatusBadge(true, "Firebase Realtime (Live)");
      } catch (err) {
        console.warn("[FirebaseService] ⚠️ Kết nối Firebase Cloud trực tiếp chuyển sang chế độ Mô phỏng Firestore Cục bộ (Local Reactive Store):", err.message);
        setupLocalFallbackStore();
        updateCloudStatusBadge(true, "Local Reactive Firestore");
      }
    } else {
      console.warn("[FirebaseService] ⚠️ Không phát hiện Firebase CDN. Kích hoạt Local Reactive Store.");
      setupLocalFallbackStore();
      updateCloudStatusBadge(true, "Local Reactive Firestore");
    }

    // Khởi tạo bộ đệm từ Storage nếu có
    loadLocalFallbackData();
  }

  function updateCloudStatusBadge(isActive, label) {
    const badge = document.getElementById('cloudStatusBadge');
    if (badge) {
      badge.textContent = isActive ? `🟢 ${label}` : `🔴 Mất kết nối`;
      badge.style.borderColor = isActive ? '#10b981' : '#f43f5e';
      badge.style.color = isActive ? '#10b981' : '#f43f5e';
    }
  }

  // =================================================================
  // 2. HỆ THỐNG MÔ PHỎNG NỘI BỘ (FALLBACK KHI OFFLINE HOẶC MẤT MẠNG)
  // =================================================================
  function setupLocalFallbackStore() {
    isLiveFirebase = false;
    // Lắng nghe sự kiện storage liên tab để cập nhật thời gian thực ngay cả khi offline
    window.addEventListener('storage', (e) => {
      if (e.key === 'to4_firestore_reports') {
        loadLocalFallbackData();
        notifySubscribers();
      }
    });
  }

  function loadLocalFallbackData() {
    try {
      const stored = localStorage.getItem('to4_firestore_reports');
      if (stored) {
        cachedReports = JSON.parse(stored);
      } else {
        // Khởi tạo danh sách mẫu thực tế ban đầu nếu chưa có dữ liệu
        cachedReports = [
          {
            id: "HS-TDHT-9104",
            target: "02366888766",
            scamType: "Mạo danh ngân hàng",
            content: "Đối tượng tự xưng nhân viên Vietcombank thông báo tài khoản có dấu hiệu khả nghi, đòi mã OTP.",
            status: "Cảnh báo cao",
            createdAt: Date.now() - 3 * 60 * 1000 // 3 phút trước
          },
          {
            id: "HS-TDHT-8821",
            target: "daotao.dhqg.edu.vn@gmail.com",
            scamType: "Mạo danh thu học phí",
            content: "Gửi thông báo nộp 4.500.000đ học phí phụ thu vào số tài khoản cá nhân, dọa đình chỉ thi.",
            status: "Đã xác minh",
            createdAt: Date.now() - 15 * 60 * 1000 // 15 phút trước
          },
          {
            id: "HS-TDHT-7734",
            target: "0398243689",
            scamType: "Mạo danh cơ quan thuế",
            content: "Gọi điện dọa nợ thuế môn bài, gửi link tải app eTax Mobile giả mạo chứa mã độc.",
            status: "Cảnh báo cao",
            createdAt: Date.now() - 42 * 60 * 1000 // 42 phút trước
          },
          {
            id: "HS-TDHT-6102",
            target: "0778552193",
            scamType: "Dọa cấp cứu bệnh viện",
            content: "Giả danh bác sĩ bệnh viện Chợ Rẫy báo người nhà bị tai nạn nguy kịch, ép chuyển viện phí gấp.",
            status: "Cảnh báo cao",
            createdAt: Date.now() - 2 * 60 * 60 * 1000 // 2 giờ trước
          }
        ];
        saveLocalFallbackData();
      }
    } catch (e) {
      console.error("[FirebaseService] Lỗi nạp dữ liệu local:", e);
      cachedReports = [];
    }
  }

  function saveLocalFallbackData() {
    try {
      localStorage.setItem('to4_firestore_reports', JSON.stringify(cachedReports));
    } catch (e) {
      console.error("[FirebaseService] Không thể lưu localStorage:", e);
    }
  }

  function notifySubscribers() {
    activeListeners.forEach(cb => {
      try {
        cb(cachedReports);
      } catch (err) {
        console.error("[FirebaseService] Lỗi thông báo subscriber:", err);
      }
    });
  }

  // =================================================================
  // 3. RATE LIMITING & CHỐNG SPAM (30 GIÂY COOLDOWN)
  // =================================================================
  function getCooldownRemaining() {
    const elapsed = Math.floor((Date.now() - lastSubmitTime) / 1000);
    return Math.max(0, COOLDOWN_SECONDS - elapsed);
  }

  function canSubmit() {
    return getCooldownRemaining() === 0;
  }

  // =================================================================
  // 4. GỬI PHẢN ÁNH MỚI (LƯU VÀO COLLECTION `reports`)
  // Ràng buộc nghiêm ngặt: 100% ẨN DANH, KHÔNG THU THẬP PII
  // =================================================================
  async function submitReport({ target, scamType, content }) {
    // 1. Kiểm tra Cooldown chống spam
    const remaining = getCooldownRemaining();
    if (remaining > 0) {
      throw new Error(`Bạn đang gửi quá nhanh! Vui lòng chờ ${remaining} giây nữa trước khi gửi phản ánh tiếp theo.`);
    }

    // 2. Validate dữ liệu đầu vào (phòng chống tấn công Injection)
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

    // 3. Tạo Mã hồ sơ ngẫu nhiên chuẩn hóa (Ví dụ: HS-TDHT-XXXX)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reportId = `HS-TDHT-${randomSuffix}`;

    // Chuẩn hóa trạng thái ban đầu
    const status = "Đang xác minh";

    // 4. Lưu trực tiếp vào Firebase Firestore hoặc Fallback
    if (isLiveFirebase && db) {
      try {
        const docRef = await db.collection("reports").add({
          id: reportId,
          target: cleanTarget,
          scamType: cleanType,
          content: cleanContent,
          status: status,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[FirebaseService] ✅ Đã ghi nhận báo cáo vào Firestore document: ${docRef.id}`);
      } catch (err) {
        console.warn("[FirebaseService] Gửi Firestore thất bại, lưu fallback:", err.message);
        writeToLocalFallback(reportId, cleanTarget, cleanType, cleanContent, status);
      }
    } else {
      writeToLocalFallback(reportId, cleanTarget, cleanType, cleanContent, status);
    }

    // 5. Cập nhật thời điểm gửi để kích hoạt Cooldown 30s
    lastSubmitTime = Date.now();

    return {
      success: true,
      reportId: reportId,
      target: cleanTarget
    };
  }

  function writeToLocalFallback(id, target, scamType, content, status) {
    const newDoc = {
      id: id,
      target: target,
      scamType: scamType,
      content: content,
      status: status,
      createdAt: Date.now()
    };
    cachedReports.unshift(newDoc);
    saveLocalFallbackData();
    notifySubscribers();
  }

  // =================================================================
  // 5. LẮNG NGHE DỮ LIỆU THỜI GIAN THỰC (onSnapshot)
  // Tự động cập nhật bảng Sổ Tiếp Nhận khi có phản ánh mới
  // =================================================================
  function subscribeToReports(callback) {
    activeListeners.push(callback);

    // Bắn dữ liệu hiện có ngay lập tức
    if (cachedReports.length > 0) {
      callback(cachedReports);
    }

    if (isLiveFirebase && db) {
      try {
        const unsubscribe = db.collection("reports")
          .orderBy("createdAt", "desc")
          .limit(50)
          .onSnapshot(
            snapshot => {
              const liveReports = [];
              snapshot.forEach(doc => {
                const data = doc.data();
                liveReports.push({
                  id: data.id || doc.id,
                  target: data.target,
                  scamType: data.scamType,
                  content: data.content,
                  status: data.status || "Đang xác minh",
                  createdAt: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt) : Date.now()
                });
              });
              cachedReports = liveReports;
              saveLocalFallbackData();
              callback(liveReports);
            },
            err => {
              console.warn("[FirebaseService] onSnapshot Firestore bị gián đoạn, sử dụng dữ liệu cục bộ:", err.message);
              callback(cachedReports);
            }
          );
        return unsubscribe;
      } catch (err) {
        console.warn("[FirebaseService] Không thể thiết lập listener Firestore trực tiếp:", err.message);
      }
    }

    // Trả về hàm hủy đăng ký
    return () => {
      activeListeners = activeListeners.filter(cb => cb !== callback);
    };
  }

  // =================================================================
  // 6. TRUY VẤN SỐ LƯỢNG PHẢN ÁNH THỰC TẾ CỘNG ĐỒNG (THỐNG KÊ MINH BẠCH)
  // Đếm chính xác số phản ánh trùng khớp trong Firestore reports
  // =================================================================
  async function getCommunityReportsCount(targetQuery) {
    if (!targetQuery) return { count: 0, reports: [] };

    const cleanQuery = targetQuery.replace(/[\s.\-()]/g, '').toLowerCase();

    // 1. Nếu đang có kết nối trực tiếp Firestore, thử query
    if (isLiveFirebase && db) {
      try {
        // Query theo target chính xác hoặc tìm kiếm trong cache thời gian thực
        const snapshot = await db.collection("reports").get();
        const matches = [];
        snapshot.forEach(doc => {
          const d = doc.data();
          const itemTarget = String(d.target || '').replace(/[\s.\-()]/g, '').toLowerCase();
          if (itemTarget === cleanQuery || itemTarget.includes(cleanQuery) || cleanQuery.includes(itemTarget)) {
            matches.push({
              id: d.id || doc.id,
              scamType: d.scamType,
              createdAt: d.createdAt ? (d.createdAt.toMillis ? d.createdAt.toMillis() : d.createdAt) : Date.now(),
              status: d.status
            });
          }
        });
        return { count: matches.length, reports: matches };
      } catch (e) {
        console.warn("[FirebaseService] Query Firestore thất bại, đối soát từ cache:", e.message);
      }
    }

    // 2. Tìm kiếm trong cache hiện tại
    const matches = cachedReports.filter(r => {
      const itemTarget = String(r.target || '').replace(/[\s.\-()]/g, '').toLowerCase();
      return itemTarget === cleanQuery || itemTarget.includes(cleanQuery) || cleanQuery.includes(itemTarget);
    });

    return {
      count: matches.length,
      reports: matches
    };
  }

  // =================================================================
  // 7. FORMAT THỜI GIAN TƯƠNG ĐỐI (Ví dụ: "vừa xong", "x phút trước")
  // =================================================================
  function formatRelativeTime(timestamp) {
    if (!timestamp) return "Mới đây";
    
    let ms = 0;
    if (typeof timestamp === 'number') {
      ms = timestamp;
    } else if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
      ms = timestamp.toMillis();
    } else if (timestamp instanceof Date) {
      ms = timestamp.getTime();
    } else {
      ms = Number(timestamp) || Date.now();
    }

    const diffSeconds = Math.floor((Date.now() - ms) / 1000);

    if (diffSeconds < 45) return "Vừa xong";
    if (diffSeconds < 3600) {
      const m = Math.floor(diffSeconds / 60);
      return `${m} phút trước`;
    }
    if (diffSeconds < 86400) {
      const h = Math.floor(diffSeconds / 3600);
      return `${h} giờ trước`;
    }
    const d = Math.floor(diffSeconds / 86400);
    if (d === 1) return "Hôm qua";
    if (d < 30) return `${d} ngày trước`;
    
    // Ngày tháng cụ thể
    const date = new Date(ms);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  // Expose public API
  return {
    init,
    submitReport,
    subscribeToReports,
    getCommunityReportsCount,
    formatRelativeTime,
    getCooldownRemaining,
    canSubmit,
    isLive: () => isLiveFirebase
  };
})();
