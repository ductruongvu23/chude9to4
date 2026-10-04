// ===================================================================
// CỔNG TRA CỨU & TIẾP NHẬN BÁO CÁO LỪA ĐẢO HỌC ĐƯỜNG
// Bài làm Tổ 4 - Môn Tư duy hệ thống
// ===================================================================

// CƠ SỞ DỮ LIỆU SỐ ĐIỆN THOẠI
const PHONE_DATABASE = {
  "0981234567": {
    number: "0981234567",
    carrier: "Viettel (Đầu số nghi vấn bị chiếm dụng)",
    location: "Khu vực Tây Bắc (SIM rác không chính chủ)",
    riskScore: 96,
    status: "DANGEROUS",
    statusText: "BÁO ĐỘNG ĐỎ: ĐÃ BỊ 142 SINH VIÊN BÁO CÁO LỪA ĐẢO",
    reportsCount: 142,
    threatType: "Giả mạo Phòng Đào tạo thu học phí bổ sung",
    tags: ["Mạo danh nhà trường", "Đe dọa khóa thẻ sinh viên", "Yêu cầu chuyển khoản gấp"],
    verifiedBy: ["Cục An toàn thông tin (Chống Lừa Đảo)", "Cộng đồng SV Tổ 4"],
    history: [
      { date: "Hôm nay 08:30", note: "Báo cáo: Nhắn tin mạo danh yêu cầu nộp 3.2 triệu học phí kỳ 1" },
      { date: "Hôm qua 15:20", note: "Báo cáo: Gọi điện dọa hủy kết quả nhập học nếu không chuyển khoản ngay" },
      { date: "3 ngày trước", note: "Báo cáo: Tự xưng trợ lý khoa Quản lý đào tạo" }
    ]
  },
  "02499998888": {
    number: "02499998888",
    carrier: "Đầu số VoIP cố định ảo (IP Telecom)",
    location: "Chuyển tiếp quốc tế (Campuchia / Tam giác vàng)",
    riskScore: 92,
    status: "DANGEROUS",
    statusText: "BÁO ĐỘNG ĐỎ: TỔNG ĐÀI LỪA ĐẢO 'VIỆC NHẸ LƯƠNG CAO'",
    reportsCount: 318,
    threatType: "Bẫy việc làm CTV Shopee/TikTok/Lazada",
    tags: ["Giật đơn ảo", "Hoa hồng 30%", "Lừa nạp tiền cọc nhiệm vụ"],
    verifiedBy: ["Hệ thống Viễn thông Quốc gia", "Diễn đàn Sinh viên"],
    history: [
      { date: "Hôm nay 10:15", note: "Báo cáo: Phát tán tin nhắn tuyển 20 CTV soát vé xem phim lương 500k/ngày" },
      { date: "Hôm qua 21:00", note: "Báo cáo: Nạn nhân bị lừa 8 triệu đồng sau khi nạp tiền làm nhiệm vụ thứ 3" }
    ]
  },
  "0868889900": {
    number: "0868889900",
    carrier: "Mạng di động kích hoạt ảo",
    location: "Không xác định định danh (SIM rác)",
    riskScore: 98,
    status: "DANGEROUS",
    statusText: "BÁO ĐỘNG ĐỎ: GIẢ DANH CƠ QUAN CÔNG AN / VIỆN KIỂM SÁT",
    reportsCount: 520,
    threatType: "Dọa nạt dính líu án ma túy / Phạt nguội giao thông",
    tags: ["Giả mạo công an", "Yêu cầu bí mật điều tra", "Đòi chuyển tiền vào tài khoản tạm giữ"],
    verifiedBy: ["Bộ Công An (Cảnh báo toàn quốc)", "Cục Viễn Thông"],
    history: [
      { date: "Sáng nay 09:00", note: "Báo cáo: Gọi cho tân sinh viên dọa bị phong tỏa căn cước công dân" }
    ]
  },
  "02437547547": {
    number: "02437547547",
    carrier: "VNPT Cố định Hà Nội",
    location: "Khuôn viên Đại học Chính thống",
    riskScore: 0,
    status: "SAFE",
    statusText: "AN TOÀN TUYỆT ĐỐI: SỐ TỔNG ĐÀI ĐÀO TẠO ĐÃ XÁC THỰC",
    reportsCount: 0,
    threatType: "Không có nguy cơ",
    tags: ["Số chính thức trường ĐH", "Phòng Công tác sinh viên", "Đã ký số xác thực"],
    verifiedBy: ["Hệ thống xác thực Giáo dục EduNet"],
    history: [
      { date: "Liên tục", note: "Số điện thoại thường trực tiếp tân sinh viên và giải đáp học phí" }
    ]
  },
  "0912345678": {
    number: "0912345678",
    carrier: "Vinaphone Chính chủ",
    location: "Danh bạ cá nhân sinh viên",
    riskScore: 2,
    status: "SAFE",
    statusText: "AN TOÀN: SỐ ĐIỆN THOẠI NGƯỜI THÂN ĐÃ LƯU",
    reportsCount: 0,
    threatType: "Không có nguy cơ",
    tags: ["Danh bạ gia đình", "Phụ huynh sinh viên", "Số tin cậy"],
    verifiedBy: ["Danh bạ an toàn của người dùng"],
    history: [
      { date: "Gần đây", note: "Các cuộc gọi đàm thoại thông thường trong gia đình" }
    ]
  }
};

// CƠ SỞ DỮ LIỆU EMAIL
const EMAIL_DATABASE = {
  "daotao.dhqg.edu.vn@gmail.com": {
    email: "daotao.dhqg.edu.vn@gmail.com",
    domain: "gmail.com (Email cá nhân miễn phí giả danh trường)",
    riskScore: 98,
    status: "DANGEROUS",
    statusText: "BÁO ĐỘNG ĐỎ: EMAIL MẠO DANH PHÒNG ĐÀO TẠO ĐẠI HỌC",
    reportsCount: 89,
    threatType: "Gửi thông báo giả mạo nộp học phí qua STK cá nhân",
    tags: ["Mạo danh đuôi .edu.vn", "Dùng Gmail miễn phí", "Đính kèm mã QR ngân hàng lừa đảo"],
    warningReason: "Trường Đại học chỉ sử dụng hòm thư tên miền chính thức (ví dụ: @vnu.edu.vn, @hust.edu.vn), TUYỆT ĐỐI KHÔNG dùng đuôi @gmail.com hoặc @outlook.com."
  },
  "tuyendung.shopee.online2026@gmail.com": {
    email: "tuyendung.shopee.online2026@gmail.com",
    domain: "gmail.com (Mạo danh sàn TMĐT Shopee)",
    riskScore: 94,
    status: "DANGEROUS",
    statusText: "BÁO ĐỘNG ĐỎ: EMAIL LỪA ĐẢO TUYỂN DỤNG VIỆC LÀM ONLINE",
    reportsCount: 165,
    threatType: "Gửi thư mời nhận việc CTV giật đơn Shopee lương 500k/ngày",
    tags: ["Giả mạo Shopee", "Kéo vào nhóm Telegram", "Yêu cầu nạp tiền cọc"],
    warningReason: "Shopee tuyển dụng chính thức qua careers.shopee.vn và địa chỉ email tên miền nội bộ @shopee.com."
  },
  "support@daotao.vnu.edu.vn": {
    email: "support@daotao.vnu.edu.vn",
    domain: "daotao.vnu.edu.vn (Tên miền cơ sở giáo dục đã xác thực)",
    riskScore: 0,
    status: "SAFE",
    statusText: "AN TOÀN: HÒM THƯ ĐIỆN TỬ CHÍNH THỨC CỦA NHÀ TRƯỜNG",
    reportsCount: 0,
    threatType: "Không có nguy cơ",
    tags: ["Email giáo dục xác thực", "Tên miền .edu.vn", "Đã chứng thực DNS DKIM/SPF"],
    warningReason: "Địa chỉ email chính thống có chữ ký số xác thực từ hệ thống máy chủ trường Đại học."
  }
};

// KỊCH BẢN TIN NHẮN MẪU
const PRESET_MESSAGES = [
  {
    title: "1. Giả Mạo Nhà Trường Thu Học Phí Bổ Sung",
    category: "scam_tuition",
    sender: "0981234567 (Tự xưng: P.Kế Toán Trường)",
    content: "THONG BAO KHAN: Sinh vien NGUYEN VAN A (MSV: 2402015) con thieu 3.250.000d hoc phi ky 1 nam hoc 2026. Do he thong cong thanh toan chinh dang bao tri, yeu cau nop vao STK tam thoi cua Thu quy: 1903456789123 (Techcombank - Tran Thi Thu Quy). Han chot truoc 11h30 sang nay neu khong se bi XOA TEN khoi danh sach lop va HUY MON THI! Lien he Zalo: 0981234567.",
    targetBank: "Techcombank: 1903456789123 (Trần Thị Thu Quỹ - Tài khoản cá nhân lừa đảo)",
    urgencyLevel: "Cực kỳ cấp bách (Dọa xóa tên sinh viên trong 2 giờ)",
    psychologyTrap: "Đánh vào nỗi sợ hãi bị hủy tư cách sinh viên và sự thiếu hiểu biết về quy trình thu học phí chuẩn qua cổng Portal."
  },
  {
    title: "2. Bẫy 'Việc Nhẹ Lương Cao' Tuyển CTV Giật Đơn",
    category: "scam_job",
    sender: "Zalo Tuyển Dụng Shopee / TikTok",
    content: "[TIKTOK VIETNAM CAREER] Chuc mung ban da duoc chon vao chuong trinh 'Sinh vien khoi nghiep 2026'. Cong viec don gian: Like video va dat don ho tro shop tang tuong tac, luong 300k - 800k/ngay nhan tien ngay trong 5 phut. Khong can coc, lam truc tiep tren dien thoai. Nhan tin ngay tham gia nhom Telegram: https://t.me/tuyendung_tiktok_vietnam_vip de nhan 50k thu viec dau tien!",
    targetBank: "Dẫn dụ nạp tiền cọc làm nhiệm vụ nâng cấp VIP",
    urgencyLevel: "Kích thích lòng tham (Nhận 50k ngay, hứa hẹn hoa hồng khủng)",
    psychologyTrap: "Cho ăn mồi nhỏ (50k - 100k sòng phẳng ban đầu) để tạo lòng tin, sau đó nâng hạn mức nạp tiền lên hàng triệu rồi khóa rút."
  },
  {
    title: "3. Giả Danh Công An / Dọa Lệnh Bắt Tạm Giam",
    category: "scam_police",
    sender: "0868889900 (Tổng đài mạo danh Bộ Công An)",
    content: "CUC CANH SAT HINH SU THONG BAO: So dien thoai va so CCCD cua ban dang lien quan den duong day rua tien va buon ban ma tuy xuyen quoc gia do Nguyen Van B cam dau. Hien Toa an da ra lenh tam giam vao ngay mai. Yeu cau ket ban Zalo ngay de nhan lenh bat va chuyen toan bo so tien tiet kiem vao 'Tai khoan giam sat tu phap' cua Vien Kiem Sat de chung minh vo toi. KHONG DUOC TIET LO VOI GIA DINH VI DAY LA BI MAT CHUYEN AN!",
    targetBank: "Tài khoản cá nhân mạo danh Ban Chuyên Án",
    urgencyLevel: "Đe dọa bắt bớ, cấm liên lạc với gia đình",
    psychologyTrap: "Khủng bố tinh thần cực độ kết hợp kỹ thuật cô lập nạn nhân (Linkage Isolation) khỏi sự trợ giúp của bố mẹ."
  },
  {
    title: "4. Thông Báo Chính Thống Của Nhà Trường (Mẫu An Toàn)",
    category: "safe_school",
    sender: "TruongDaiHoc_Official (Brandname Đã Đăng Ký)",
    content: "Thong bao tu Phong Dao tao: Lich thi ket thuc hoc phan Hoc ky 1 da duoc cong bo tren Cong thong tin sinh vien https://portal.edu.vn. Sinh vien dung tai khoan va mat khau ca nhan de tra cuu phong thi. Luu y: Nha truong KHONG THU HOC PHI qua tai khoan ca nhan cua bat ky can bo nao. Moi khoan thu chi nop qua Cong thanh toan truc tuyen tich hop trong Portal. Hotline: (024) 3754 7547.",
    targetBank: "Cổng thanh toán chính thức https://portal.edu.vn",
    urgencyLevel: "Bình thường, hướng dẫn tra cứu minh bạch",
    psychologyTrap: "Không có bẫy tâm lý. Thông tin minh bạch, có số hotline trường xác thực."
  }
];

// DANH SÁCH TIẾP NHẬN BÁO CÁO BAN ĐẦU
const COMMUNITY_REPORTS = [
  { id: "HS-TDHT-01", target: "0981234567", type: "Mạo danh thu học phí", reporter: "SV K65 - Khoa Luật", time: "10 phút trước", status: "Đã xác minh lừa đảo" },
  { id: "HS-TDHT-02", target: "daotao.dhqg.edu.vn@gmail.com", type: "Email mạo danh trường ĐH", reporter: "SV K66 - Tân sinh viên", time: "25 phút trước", status: "Đã chặn cảnh báo" },
  { id: "HS-TDHT-03", target: "02499998888", type: "Việc làm online TikTok 500k", reporter: "SV K64 - Khoa Kinh tế", time: "1 giờ trước", status: "Đã xác minh lừa đảo" },
  { id: "HS-TDHT-04", target: "0868889900", type: "Công an dọa án ma túy", reporter: "SV K66 - KTX Mễ Trì", time: "2 giờ trước", status: "Đã báo công an khu vực" }
];
