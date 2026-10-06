// ===================================================================
// STORAGE & KNOWLEDGE BASE MODULE (TỔ 4 - TƯ DUY HỆ THỐNG)
// CƠ SỞ DỮ LIỆU CẢNH BÁO LỪA ĐẢO - CHỈ GỒM DỮ LIỆU CÓ NGUỒN KIỂM CHỨNG
//
// Nguyên tắc dữ liệu:
// 1. Mỗi số điện thoại / email / đầu số đều phải xuất hiện nguyên văn trong
//    ít nhất 1 nguồn công khai (cơ quan công an, cổng thông tin nhà nước, báo chí).
// 2. Ghi rõ nguồn + ngày công bố để người dùng tự kiểm tra lại.
// 3. Không tự đặt ra số/email "minh họa": gắn nhầm số của người thật là
//    lừa đảo gây hại nghiêm trọng cho người đó.
// Rà soát lần cuối: 06/10/2026.
// ===================================================================

const SCAM_DATA_AS_OF = '06/10/2026';

// -------------------------------------------------------------------
// DANH MỤC NGUỒN (đã mở từng trang để đối chiếu nội dung)
// -------------------------------------------------------------------
const SCAM_SOURCES = {
  CA_NGHEAN_2025: {
    name: 'Báo Công an Nghệ An - Danh sách các số điện thoại lừa đảo không nên nghe, gọi lại',
    url: 'https://congan.nghean.gov.vn/thong-tin-chuyen-de/canh-bao-toi-pham/202504/danh-sach-cac-so-dien-thoai-lua-dao-khong-nen-nghe-goi-lai-1039887/index.htm',
    publishedAt: '2025-04-16'
  },
  KENH14_17SO_2025: {
    name: 'Kênh14 - Công bố 17 số điện thoại không nên bắt máy (tổng hợp cảnh báo của Vietcombank, Công an Hà Nội, Bình Định, Sơn La)',
    url: 'https://kenh14.vn/cong-bo-17-so-dien-thoai-dau-so-02-05-07-08-09-khong-nen-bat-may-khong-ket-ban-zalo-de-tranh-bi-lua-tien-215250501233708719.chn',
    publishedAt: '2025-05-02'
  },
  TUOITRE_8CUOCGOI_2025: {
    name: 'Tuổi Trẻ - Cảnh báo 8 cuộc gọi không nên nghe, dễ mất tiền oan',
    url: 'https://tuoitre.vn/canh-bao-8-cuoc-goi-khong-nen-nghe-de-mat-tien-oan-20250716104043436.htm',
    publishedAt: '2025-07-16'
  },
  LEVANTHINH_2025: {
    name: 'Cổng TT Bệnh viện Lê Văn Thịnh - Công an nêu đích danh 8 số điện thoại lừa đảo (kèm đầu số quốc tế, tin nhắn dịch vụ)',
    url: 'https://benhvienlevanthinh.vn/2025/05/cong-an-neu-dich-danh-8-so-dien-thoai-lua-dao-nguoi-dan-khong-nen-nghe-goi-lai/',
    publishedAt: '2025-05-05'
  },
  QUANGCHAU_2024: {
    name: 'Cổng TTĐT xã Quảng Châu (Nghệ An) - 50 số điện thoại cần chặn ngay (theo thông báo của Công an các quận TP.HCM)',
    url: 'https://quangchau.nghean.gov.vn/tin-noi-bat/50-so-dien-thoai-tuyet-doi-khong-nen-nghe-chan-ngay-khi-nhan-duoc-cuoc-goi-950942?pageindex=0',
    publishedAt: '2024-07-17'
  },
  HATINH_2024: {
    name: 'Cổng TTĐT tỉnh Hà Tĩnh - Danh sách đầu số điện thoại lừa đảo, không nên nghe',
    url: 'https://hatinh.gov.vn/vi/bai-viet/danh-sach-dau-so-dien-thoai-lua-dao-khong-nen-nghe-keo-mat-sach-tien',
    publishedAt: '2024-05-22'
  },
  AFAMILY_PHUTHO_2026: {
    name: 'Afamily - Công an xã Hùng Việt (Phú Thọ) cảnh báo số điện thoại giả danh công an',
    url: 'https://afamily.vn/phat-hien-dau-so-lua-dao-moi-cong-an-canh-bao-nguoi-dan-khong-nghe-may-keo-mat-tien-oan-236260324065617101.chn',
    publishedAt: '2026-03-24'
  },
  CAFEF_CAHN_2026: {
    name: 'CafeF - Công an TP Hà Nội cảnh báo giả danh công an yêu cầu cập nhật định danh điện tử',
    url: 'https://cafef.vn/co-quan-cong-an-phat-thong-bao-khan-neu-nhan-duoc-cuoc-goi-co-dau-hieu-nay-cup-may-ngay-lap-tuc-1882610052359373.chn',
    publishedAt: '2026-10-05'
  },
  DANVIET_AJC_2021: {
    name: 'Dân Việt - Email giả mạo yêu cầu tân sinh viên đóng học phí (Học viện Báo chí và Tuyên truyền)',
    url: 'https://danviet.vn/email-gia-mao-yeu-cau-tan-sinh-vien-dong-hoc-phi-nham-truc-loi-20211031140441062-d984324.html',
    publishedAt: '2021-10-31'
  },
  KENH14_SINHVIEN_2025: {
    name: 'Kênh14 - Công an cảnh báo khẩn tới sinh viên: giả mạo email, tài khoản nhà trường thông báo học bổng',
    url: 'https://kenh14.vn/cong-an-phat-canh-bao-khan-toi-tat-ca-sinh-vien-va-phu-huynh-toan-quoc-215251006155349851.chn',
    publishedAt: '2025-10-06'
  },
  CA_TUYENQUANG_CTV: {
    name: 'Công an tỉnh Tuyên Quang - Cảnh giác thủ đoạn lừa đảo tuyển cộng tác viên làm online "việc nhẹ, lương cao"',
    url: 'https://congan.tuyenquang.gov.vn/vi/tin-bai/canh-giac-thu-doan-lua-dao-tuyen-cong-tac-vien-lam-online-viec-nhe-luong-cao?type=NEWS&id=163145',
    publishedAt: null
  },
  CHINHPHU_156_2022: {
    name: 'Báo Điện tử Chính phủ - Bộ TT&TT triển khai tổng đài 156 tiếp nhận phản ánh tin nhắn rác, cuộc gọi lừa đảo',
    url: 'https://media.chinhphu.vn/bo-tttt-trien-khai-tong-dai-156-tiep-nhan-phan-anh-tin-nhan-rac-cuoc-goi-co-dau-hieu-lua-dao-10222110111003774.htm',
    publishedAt: '2022-11-01'
  }
};

// -------------------------------------------------------------------
// SỐ ĐIỆN THOẠI ĐÃ BỊ CẢNH BÁO CÔNG KHAI (nhóm theo thủ đoạn)
// numbers: ghi đúng như nguồn (bỏ dấu chấm); khóa tra cứu chuẩn hóa bằng normalizeTarget()
// -------------------------------------------------------------------
const PHONE_WARNING_GROUPS = [
  {
    category: 'Mạo danh ngân hàng',
    riskScore: 95,
    threatType: 'Mạo danh nhân viên ngân hàng (Vietcombank) gọi mời nâng hạn mức thẻ tín dụng, hỗ trợ tài khoản; yêu cầu cung cấp mã OTP, mật khẩu hoặc cài ứng dụng giả để chiếm quyền tài khoản.',
    sources: ['CA_NGHEAN_2025', 'KENH14_17SO_2025', 'TUOITRE_8CUOCGOI_2025'],
    numbers: ['02366888766', '02488860469', '02888865154', '1900355561', '02886895963']
  },
  {
    category: 'Giả danh công an',
    riskScore: 95,
    threatType: 'Giả danh cán bộ công an / điều tra viên, báo nạn nhân liên quan vụ án (ma túy, rửa tiền) rồi ép chuyển tiền để "xác minh" hoặc "bảo lãnh".',
    sources: ['CA_NGHEAN_2025', 'KENH14_17SO_2025', 'TUOITRE_8CUOCGOI_2025'],
    numbers: ['0833109259', '0853975728']
  },
  {
    category: 'Giả danh công an',
    riskScore: 95,
    threatType: 'Giả danh cán bộ công an, thông báo nạn nhân liên quan đến một vụ lừa đảo đang điều tra và yêu cầu chuyển tiền vào tài khoản do đối tượng chỉ định.',
    sources: ['AFAMILY_PHUTHO_2026'],
    numbers: ['0354716975']
  },
  {
    category: 'Mạo danh điện lực',
    riskScore: 95,
    threatType: 'Mạo danh nhân viên điện lực báo nợ tiền điện, dọa cắt điện và hướng dẫn thanh toán qua đường link hoặc ứng dụng giả mạo.',
    sources: ['CA_NGHEAN_2025', 'KENH14_17SO_2025', 'TUOITRE_8CUOCGOI_2025'],
    numbers: ['0889050231', '0917896904']
  },
  {
    category: 'Mạo danh giao hàng / ngân hàng',
    riskScore: 90,
    threatType: 'Công an TP Hà Nội cảnh báo: số được dùng để mạo danh nhân viên giao hàng (shipper) hoặc nhân viên ngân hàng, yêu cầu chuyển tiền hoặc cung cấp thông tin cá nhân.',
    sources: ['KENH14_17SO_2025'],
    numbers: ['0598428337', '0598427578', '0819343248', '0901757297', '0902204629', '0903553785', '0706582201', '0932378465', '0903494514']
  },
  {
    category: 'Số quốc tế nháy máy',
    riskScore: 90,
    threatType: 'Số quốc tế nằm trong danh sách Công an khuyến cáo không nghe, không gọi lại: thường nháy máy 1 hồi chuông để nạn nhân gọi lại và bị tính cước quốc tế rất cao.',
    sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'],
    numbers: ['+22375260052', '+22382271520', '+8919008198', '+22379262886', '+4422222202']
  },
  {
    category: 'Đầu số 1900 bị cảnh báo',
    riskScore: 85,
    threatType: 'Số tổng đài 1900 (tính cước cao) nằm trong danh sách Công an TP.HCM thông báo người dân không nghe, không gọi lại.',
    sources: ['QUANGCHAU_2024', 'HATINH_2024'],
    numbers: ['19003439', '19004510', '19002191', '19003441', '19002170', '19002446', '19001095', '19002190', '19002196', '19004562', '19003440', '19001199']
  },
  {
    category: 'Cuộc gọi rác / lừa đảo (024)',
    riskScore: 85,
    threatType: 'Số cố định Hà Nội (024) nằm trong danh sách cuộc gọi rác, lừa đảo được Công an TP.HCM thông báo.',
    sources: ['QUANGCHAU_2024', 'HATINH_2024'],
    numbers: ['02439446395', '02499950060', '02499954266', '0249997041', '02444508888', '02499950412', '0249997037', '02499997044', '02499950212', '02499950036', '0249997038', '0249992623', '0249997035', '0249994266', '02499985212', '0245678520', '02499985220', '0249997044']
  },
  {
    category: 'Cuộc gọi rác / lừa đảo (028)',
    riskScore: 85,
    threatType: 'Số cố định TP.HCM (028) nằm trong danh sách cuộc gọi rác, lừa đảo được Công an TP.HCM thông báo.',
    sources: ['QUANGCHAU_2024', 'HATINH_2024'],
    numbers: ['02899964439', '02856786501', '02899964438', '02899964437', '02873034653', '02899950012', '02873065555', '02899964448', '02822000266', '0287108690', '02899950015', '02899958588', '02871099082', '02899996142']
  }
];

// Kênh chính thức (không phải lừa đảo) - giúp người dùng không nhầm lẫn
const OFFICIAL_CHANNELS = {
  '156': { name: 'Tổng đài 156 - tiếp nhận phản ánh tin nhắn rác, cuộc gọi rác, cuộc gọi lừa đảo (Bộ TT&TT, miễn phí)', sources: ['CHINHPHU_156_2022'] },
  '5656': { name: 'Đầu số 5656 - tiếp nhận phản ánh tin nhắn rác, cuộc gọi lừa đảo (Bộ TT&TT, miễn phí)', sources: ['CHINHPHU_156_2022'] }
};

// Tra cứu nhanh: khóa = số đã chuẩn hóa
const PHONE_DATABASE = {};
PHONE_WARNING_GROUPS.forEach(group => {
  group.numbers.forEach(num => {
    const key = normalizeTarget(num);
    if (PHONE_DATABASE[key]) {
      // Số xuất hiện ở nhiều nhóm: gộp nguồn
      PHONE_DATABASE[key].sources = Array.from(new Set([...PHONE_DATABASE[key].sources, ...group.sources]));
      return;
    }
    PHONE_DATABASE[key] = {
      number: num,
      category: group.category,
      riskScore: group.riskScore,
      threatType: group.threatType,
      sources: group.sources.slice()
    };
  });
});

// -------------------------------------------------------------------
// ĐẦU SỐ QUỐC TẾ ĐƯỢC CẢNH BÁO (nháy máy / bẫy cước gọi lại)
// -------------------------------------------------------------------
const SCAM_PATTERNS = [
  { prefix: '+224', country: 'Guinea', risk: 90, sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'] },
  { prefix: '+231', country: 'Liberia', risk: 90, sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'] },
  { prefix: '+232', country: 'Sierra Leone', risk: 90, sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'] },
  { prefix: '+247', country: 'Đảo Ascension', risk: 90, sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'] },
  { prefix: '+252', country: 'Somalia', risk: 90, sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'] },
  { prefix: '+255', country: 'Tanzania', risk: 85, sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'] },
  { prefix: '+370', country: 'Litva', risk: 85, sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'] },
  { prefix: '+371', country: 'Latvia', risk: 85, sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'] },
  { prefix: '+375', country: 'Belarus', risk: 85, sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'] },
  { prefix: '+381', country: 'Serbia', risk: 85, sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'] },
  { prefix: '+563', country: 'Mã quốc tế lạ', risk: 85, sources: ['LEVANTHINH_2025', 'QUANGCHAU_2024'] },
  { prefix: '+900', country: 'Mã quốc tế lạ', risk: 80, sources: ['LEVANTHINH_2025'] },
  { prefix: '+373', country: 'Moldova', risk: 85, sources: ['HATINH_2024'] },
  { prefix: '+216', country: 'Tunisia', risk: 85, sources: ['HATINH_2024'] },
  { prefix: '+240', country: 'Guinea Xích Đạo', risk: 85, sources: ['HATINH_2024'] },
  { prefix: '+226', country: 'Burkina Faso', risk: 85, sources: ['HATINH_2024'] },
  { prefix: '+882', country: 'Mạng quốc tế / vệ tinh', risk: 75, sources: ['LEVANTHINH_2025'] },
  // +60 (Malaysia) có rất nhiều cuộc gọi hợp pháp -> chỉ ở mức khả nghi
  { prefix: '+60', country: 'Malaysia', risk: 55, sources: ['LEVANTHINH_2025'] }
];

// Đầu số tin nhắn dịch vụ được Công an cảnh báo
const SCAM_SMS_SHORTCODES = ['6781', '6768', '7775', '8781', '7777', '8700', '8125', '7769', '6716', '8791', '7786', '8774'];
const SCAM_SMS_SHORTCODE_SOURCES = ['LEVANTHINH_2025'];

// -------------------------------------------------------------------
// EMAIL ĐÃ BỊ CẢNH BÁO CÔNG KHAI
// -------------------------------------------------------------------
const EMAIL_DATABASE = {
  'baochivatuyentruyenhocvien@gmail.com': {
    email: 'baochivatuyentruyenhocvien@gmail.com',
    category: 'Mạo danh nhà trường thu học phí',
    riskScore: 90,
    threatType: 'Hòm thư Gmail giả mạo Học viện Báo chí và Tuyên truyền, gửi thông báo tăng học phí 10-15%, yêu cầu tân sinh viên đóng tiền trước hạn và mua "bảo hiểm thi lại". Học viện chỉ thông báo học phí qua cổng thông tin chính thức.',
    sources: ['DANVIET_AJC_2021']
  }
};

// ===================================================================
// DỮ LIỆU BÁO CÁO CỘNG ĐỒNG TÍCH HỢP SẴN (SYSTEM SEED REPORTS)
// Đảm bảo mọi máy mở lên (kể cả clone GitHub hay mở offline) đều CÓ SẴN
// đầy đủ dữ liệu phản ánh thực tế và đối soát không phụ thuộc tải file local.
// Thời gian ghi nhận là mốc cố định (không tính theo Date.now() để tránh
// hiển thị sai lệch "6 phút trước" vĩnh viễn).
// ===================================================================
// Lưu ý: đây là HỒ SƠ MẪU minh họa luồng tiếp nhận. Mọi đối tượng (SĐT/email)
// đều lấy từ danh sách đã bị cảnh báo công khai ở trên (PHONE_DATABASE / EMAIL_DATABASE),
// không dùng số/email tự đặt ra.
const SYSTEM_SEED_REPORTS = [
  {
    id: "HS-TDHT-9104",
    target: "02366888766",
    scamType: "Mạo danh ngân hàng",
    content: "Tự xưng nhân viên Vietcombank mời nâng hạn mức thẻ tín dụng, yêu cầu đọc mã OTP để \"xác thực\".",
    status: "Cảnh báo cao",
    createdAt: Date.parse("2026-10-05T21:40:00+07:00")
  },
  {
    id: "HS-TDHT-8821",
    target: "baochivatuyentruyenhocvien@gmail.com",
    scamType: "Mạo danh thu học phí",
    content: "Email Gmail giả mạo Học viện Báo chí và Tuyên truyền thông báo tăng học phí, yêu cầu tân sinh viên đóng tiền trước hạn.",
    status: "Đã xác minh",
    createdAt: Date.parse("2026-10-05T19:15:00+07:00")
  },
  {
    id: "HS-TDHT-7734",
    target: "0354716975",
    scamType: "Giả danh công an",
    content: "Gọi điện tự xưng cán bộ công an, báo có liên quan một vụ lừa đảo đang điều tra và yêu cầu chuyển tiền vào tài khoản chỉ định.",
    status: "Cảnh báo cao",
    createdAt: Date.parse("2026-10-05T16:05:00+07:00")
  },
  {
    id: "HS-TDHT-6102",
    target: "+22375260052",
    scamType: "Nháy máy số quốc tế",
    content: "Cuộc gọi nhỡ 1 hồi chuông lúc nửa đêm từ số quốc tế lạ; gọi lại có thể bị tính cước quốc tế rất cao.",
    status: "Cảnh báo cao",
    createdAt: Date.parse("2026-10-05T10:30:00+07:00")
  },
  {
    id: "HS-TDHT-5541",
    target: "0833109259",
    scamType: "Công an dọa án phạt",
    content: "Tự xưng điều tra viên, dọa sinh viên liên quan vụ án ma túy, rửa tiền và ép chuyển tiền \"bảo lãnh\".",
    status: "Cảnh báo cao",
    createdAt: Date.parse("2026-10-04T20:20:00+07:00")
  },
  {
    id: "HS-TDHT-4923",
    target: "0889050231",
    scamType: "Mạo danh điện lực",
    content: "Báo nợ tiền điện, dọa cắt điện nhà trọ trong ngày và gửi đường link thanh toán lạ.",
    status: "Đã xác minh",
    createdAt: Date.parse("2026-10-04T14:45:00+07:00")
  },
  {
    id: "HS-TDHT-4108",
    target: "0901757297",
    scamType: "Mạo danh shipper giao hàng",
    content: "Tự xưng shipper báo có đơn hàng, yêu cầu chuyển khoản trước vào tài khoản cá nhân rồi mới giao.",
    status: "Cảnh báo cao",
    createdAt: Date.parse("2026-10-04T09:10:00+07:00")
  },
  {
    id: "HS-TDHT-3755",
    target: "0598428337",
    scamType: "Mạo danh ngân hàng",
    content: "Gọi yêu cầu cung cấp thông tin tài khoản ngân hàng với lý do \"cập nhật hồ sơ\".",
    status: "Cảnh báo cao",
    createdAt: Date.parse("2026-10-03T18:00:00+07:00")
  },
  {
    id: "HS-TDHT-2914",
    target: "02888865154",
    scamType: "Mạo danh ngân hàng",
    content: "Gọi \"hỗ trợ\" tài khoản, hướng dẫn cài ứng dụng ngân hàng giả qua đường link gửi qua tin nhắn.",
    status: "Cảnh báo cao",
    createdAt: Date.parse("2026-10-03T08:25:00+07:00")
  },
  {
    id: "HS-TDHT-1832",
    target: "19003439",
    scamType: "Đầu số 1900 tính cước cao",
    content: "Nháy máy để người nhận gọi lại tổng đài 1900, cuộc gọi bị kéo dài và tính cước cao.",
    status: "Đã xác minh",
    createdAt: Date.parse("2026-10-02T15:50:00+07:00")
  },
  {
    id: "HS-TDHT-1290",
    target: "0853975728",
    scamType: "Giả danh công an",
    content: "Giả danh cán bộ công an gọi điện, ép chuyển tiền vào tài khoản để \"xác minh\" không liên quan vụ án.",
    status: "Đã xác minh",
    createdAt: Date.parse("2026-10-01T11:00:00+07:00")
  }
];

// ===================================================================
// CHUẨN HÓA ĐỐI TƯỢNG TRA CỨU (SĐT / EMAIL)
// Dùng chung cho tra cứu, đếm báo cáo và lưu thống kê để mọi định dạng
// (+84 912..., 0912.xxx, 84912xxx) đều quy về cùng một khóa.
// ===================================================================
function normalizeTarget(target) {
  const raw = String(target == null ? '' : target).trim().toLowerCase();
  // Email: chỉ bỏ khoảng trắng, giữ nguyên dấu chấm / gạch ngang (thuộc địa chỉ)
  if (raw.includes('@')) return raw.replace(/\s+/g, '');
  let t = raw.replace(/[\s.\-()]/g, '');
  if (t.startsWith('+84')) t = '0' + t.slice(3);
  else if (t.startsWith('0084')) t = '0' + t.slice(4);
  else if (/^84\d{9}$/.test(t)) t = '0' + t.slice(2);
  return t;
}

// ===================================================================
// BỘ QUẢN LÝ BÁO CÁO CỘNG ĐỒNG ĐỘNG (LOCAL REPORT REGISTRY)
// Lưu trữ các lần người dùng bấm báo cáo để tăng % khả nghi ngay tức thì
// ===================================================================
const LocalReportRegistry = {
  STORAGE_KEY: 'to4_custom_number_stats',
  MAX_REPORTS_PER_TARGET: 20,

  getAll() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  },

  // Lọc dữ liệu đọc từ localStorage (có thể bị sửa tay / hỏng)
  sanitizeStats(entry) {
    const count = Number(entry && entry.reportCount);
    const score = Number(entry && entry.customRiskScore);
    return {
      reportCount: isFinite(count) && count > 0 ? Math.floor(count) : 0,
      customRiskScore: isFinite(score) ? Math.min(99, Math.max(0, score)) : 0,
      customReports: Array.isArray(entry && entry.customReports) ? entry.customReports.slice(0, this.MAX_REPORTS_PER_TARGET) : [],
      lastUpdated: Number(entry && entry.lastUpdated) || 0
    };
  },

  getStats(target) {
    if (!target) return { reportCount: 0, customRiskScore: 0, customReports: [] };
    const all = this.getAll();
    return this.sanitizeStats(all[normalizeTarget(target)]);
  },

  report(target, threatType = "Nghi vấn lừa đảo qua phản ánh người dùng") {
    if (!target) return null;
    const clean = normalizeTarget(target);
    const all = this.getAll();
    const current = this.sanitizeStats(all[clean]);

    // Tăng số lượt báo cáo
    current.reportCount += 1;

    // Tăng % khả nghi (Risk Percentage) theo số lượt báo cáo
    // 1 lượt -> 45% (Khả nghi), 2 lượt -> 75% (Cảnh báo cao), 3+ lượt -> 85%-99% (Nguy hiểm)
    let newScore = 45;
    if (current.reportCount === 2) {
      newScore = 75;
    } else if (current.reportCount >= 3) {
      newScore = Math.min(99, 85 + (current.reportCount - 3) * 5);
    }
    current.customRiskScore = Math.max(current.customRiskScore, newScore);
    current.lastUpdated = Date.now();

    const reportItem = {
      scamType: String(threatType || '').slice(0, 120),
      createdAt: Date.now(),
      status: "Đang xác minh"
    };
    current.customReports.unshift(reportItem);
    current.customReports = current.customReports.slice(0, this.MAX_REPORTS_PER_TARGET);

    all[clean] = current;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error("[LocalReportRegistry] Lỗi lưu stats:", e);
    }

    return {
      cleanTarget: clean,
      reportCount: current.reportCount,
      riskScore: current.customRiskScore,
      reportItem
    };
  }
};
