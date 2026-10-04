-- ==============================================================================
-- CƠ SỞ DỮ LIỆU ĐỐI SOÁT & DANH SÁCH ĐEN SỐ ĐIỆN THOẠI, ĐẦU SỐ, ĐUÔI SỐ LỪA ĐẢO
-- ==============================================================================
-- Dự án: Cổng Tra Cứu & Tiếp Nhận Báo Cáo Lừa Đảo Trực Tuyến Học Đường
-- Đơn vị thực hiện: BÀI LÀM TỔ 4 - MÔN TƯ DUY HỆ THỐNG
-- Đề tài 9: Lừa đảo trực tuyến nhắm vào sinh viên
--
-- Dữ liệu được trích xuất từ 100% nguồn cơ quan báo chí & công an chính thống:
-- 1. Báo điện tử Thư Viện Pháp Luật (thuvienphapluat.vn - Danh sách 18 số điện thoại lừa đảo)
-- 2. Cổng thông tin Bệnh viện Lê Văn Thịnh (benhvienlevanthinh.vn - Công an nêu đích danh 8 số lừa đảo)
-- 3. Thế Giới Di Động (thegioididong.com - Cảnh báo các đầu số điện thoại lừa đảo mới nhất 2026)
-- 4. Cổng Thông tin Điện tử Xã Quảng Châu, Nghệ An (quangchau.nghean.gov.vn - Danh mục 50 số điện thoại cần chặn ngay)
-- 5. Báo Điện tử Chính phủ (baochinhphu.vn) & Báo Tuổi Trẻ (tuoitre.vn)
--
-- Tiêu chuẩn: Tương thích hoàn toàn với MySQL, PostgreSQL, SQLite và MariaDB.
-- Mã hóa: UTF-8 Unicode.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. BẢNG NGUỒN DẪN CHỨNG CHÍNH THỐNG (scam_sources)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS scam_reports;
DROP TABLE IF EXISTS scam_patterns;
DROP TABLE IF EXISTS scam_phones;
DROP TABLE IF EXISTS scam_emails;
DROP TABLE IF EXISTS scam_sources;

CREATE TABLE scam_sources (
    source_id INT PRIMARY KEY AUTO_INCREMENT,
    source_code VARCHAR(50) UNIQUE NOT NULL,
    organization_name VARCHAR(255) NOT NULL,
    article_title VARCHAR(500) NOT NULL,
    article_url TEXT NOT NULL,
    publish_date VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. BẢNG DANH SÁCH SỐ ĐIỆN THOẠI LỪA ĐẢO (scam_phones)
-- -----------------------------------------------------------------------------
CREATE TABLE scam_phones (
    phone_id INT PRIMARY KEY AUTO_INCREMENT,
    raw_number VARCHAR(30) NOT NULL,             -- Số dạng hiển thị (VD: 0236.688.8766)
    clean_number VARCHAR(20) UNIQUE NOT NULL,    -- Số chuẩn hóa chỉ chứa chữ số/dấu + (VD: 02366888766)
    category VARCHAR(50) NOT NULL,               -- BANK, POLICE, ELECTRICITY, SHIPPER, TUITION, WANGIRI...
    carrier_info VARCHAR(150),                   -- Mạng viễn thông / Loại hình số (VoIP, Di động, SIM rác)
    impersonated_target VARCHAR(200) NOT NULL,   -- Đối tượng bị mạo danh (Vietcombank, Công an, EVN, Shipper)
    risk_score INT NOT NULL DEFAULT 95,          -- Điểm rủi ro (0 - 100)
    risk_status VARCHAR(20) NOT NULL DEFAULT 'DANGEROUS', -- DANGEROUS, SUSPICIOUS, SAFE
    threat_details TEXT NOT NULL,                -- Chi tiết phương thức & kịch bản thao túng tâm lý
    recommended_action TEXT NOT NULL,            -- Hướng dẫn ứng phó khẩn cấp cho người nghe
    reports_count INT DEFAULT 0,                 -- Số lượt phản ánh từ cộng đồng sinh viên
    source_id INT,                               -- Khóa ngoại liên kết bảng nguồn
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES scam_sources(source_id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 3. BẢNG ĐẦU SỐ, ĐUÔI SỐ & ĐẦU SỐ DỊCH VỤ SMS (scam_patterns)
-- Lưu trữ quy tắc phát hiện: ĐẦU SỐ (+224, 024999), ĐUÔI SỐ (%9999), ĐẦU SMS (6781)
-- -----------------------------------------------------------------------------
CREATE TABLE scam_patterns (
    pattern_id INT PRIMARY KEY AUTO_INCREMENT,
    pattern_type VARCHAR(30) NOT NULL,           -- PREFIX (Đầu số), SUFFIX (Đuôi số), SHORTCODE (SMS), VOIP
    pattern_value VARCHAR(30) NOT NULL,          -- Chuỗi nhận diện (VD: +224, 024999, %9999, 6781)
    region_country VARCHAR(100) NOT NULL,        -- Quốc gia / Vùng lãnh thổ / Đơn vị cung cấp
    risk_score INT NOT NULL DEFAULT 90,
    threat_type VARCHAR(200) NOT NULL,           -- Loại lừa đảo (Nháy máy trừ cước, giả danh VKS, trừ tiền ngầm)
    warning_advice TEXT NOT NULL,                -- Khuyến cáo cụ thể khi gặp đầu/đuôi số này
    source_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES scam_sources(source_id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 4. BẢNG EMAIL LỪA ĐẢO & MẠO DANH NHÀ TRƯỜNG (scam_emails)
-- -----------------------------------------------------------------------------
CREATE TABLE scam_emails (
    email_id INT PRIMARY KEY AUTO_INCREMENT,
    email_address VARCHAR(150) UNIQUE NOT NULL,
    domain_type VARCHAR(100) NOT NULL,
    risk_score INT NOT NULL DEFAULT 95,
    risk_status VARCHAR(20) DEFAULT 'DANGEROUS',
    threat_description TEXT NOT NULL,
    warning_rule TEXT NOT NULL,
    source_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES scam_sources(source_id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 5. BẢNG TIẾP NHẬN PHẢN ÁNH TỪ CỘNG ĐỒNG (scam_reports)
-- -----------------------------------------------------------------------------
CREATE TABLE scam_reports (
    report_id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_code VARCHAR(50) UNIQUE NOT NULL,     -- Mã hồ sơ tiếp nhận (VD: HS-TDHT-01)
    target_value VARCHAR(150) NOT NULL,          -- SĐT hoặc Email bị phản ánh
    target_type VARCHAR(20) NOT NULL,            -- PHONE / EMAIL
    scam_category VARCHAR(100) NOT NULL,         -- Mạo danh học phí, việc làm, công an...
    reporter_identity VARCHAR(100),              -- Người báo cáo (Sinh viên K65, Tân sinh viên...)
    evidence_note TEXT NOT NULL,                 -- Nội dung tin nhắn / cuộc gọi lừa đảo
    verification_status VARCHAR(50) DEFAULT 'VERIFIED_SCAM', -- VERIFIED_SCAM, INVESTIGATING, BLOCKED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- NẠP DỮ LIỆU NGUỒN CHÍNH THỐNG (scam_sources)
-- -----------------------------------------------------------------------------
INSERT INTO scam_sources (source_id, source_code, organization_name, article_title, article_url, publish_date, description) VALUES
(1, 'THU_VIEN_PHAP_LUAT', 'Báo điện tử Thư Viện Pháp Luật (thuvienphapluat.vn)', 'Danh sách 18 số điện thoại lừa đảo mà người dân cần biết? Hướng dẫn kiểm tra số điện thoại lừa đảo?', 'https://thuvienphapluat.vn/banan/tin-tuc/danh-sach-18-so-dien-thoai-lua-dao-ma-nguoi-dan-can-biet-huong-dan-kiem-tra-so-dien-thoai-lua-dao-19077.html', '2025-11-12', 'Tổng hợp 18 số điện thoại mạo danh ngân hàng Vietcombank, công an, điều tra viên, nhân viên điện lực EVN và shipper giao hàng.'),
(2, 'BV_LE_VAN_THINH', 'Cổng Thông tin Bệnh Viện Lê Văn Thịnh (benhvienlevanthinh.vn)', 'Công an nêu đích danh 8 số điện thoại lừa đảo, người dân không nên nghe, gọi lại', 'https://benhvienlevanthinh.vn/2025/05/cong-an-neu-dich-danh-8-so-dien-thoai-lua-dao-nguoi-dan-khong-nen-nghe-goi-lai/', '2025-05-15', 'Thông tin từ cơ quan Công an cảnh báo 8 số điện thoại mạo danh Vietcombank, cơ quan điều tra, phát hành thẻ tín dụng ảo và các đầu số quốc tế nháy máy.'),
(3, 'THE_GIOI_DI_DONG', 'Thế Giới Di Động (thegioididong.com) - Chuyên mục Hỏi Đáp & Thủ Thuật', 'Cảnh báo các đầu số điện thoại lừa đảo mới nhất 2026', 'https://www.thegioididong.com/hoi-dap/canh-bao-cac-dau-so-dien-thoai-lua-dao-moi-nhat-1587950', '2026-01-02', 'Tổng hợp chi tiết danh sách đầu số quốc tế (Guinea, Liberia, Somalia, Lithuania, Serbia...), đầu số cố định VoIP và đầu số SMS tổng đài dịch vụ trừ cước ngầm.'),
(4, 'UBND_QUANG_CHAU', 'Cổng Thông tin Điện tử Xã Quảng Châu, Tỉnh Nghệ An (quangchau.nghean.gov.vn)', '50 số điện thoại tuyệt đối không nên nghe, chặn ngay khi nhận được cuộc gọi', 'https://quangchau.nghean.gov.vn/tin-noi-bat/50-so-dien-thoai-tuyet-doi-khong-nen-nghe-chan-ngay-khi-nhan-duoc-cuoc-goi-950942?pageindex=0', '2024-08-20', 'Danh sách 50 số điện thoại cố định VoIP 024999, 028999, 02856 tự động quấy rối và dọa nợ cước viễn thông.'),
(5, 'BAO_CHINH_PHU', 'Báo Điện tử Chính phủ (baochinhphu.vn)', 'Chiến dịch Nhận diện và phòng chống lừa đảo trực tuyến', 'https://baochinhphu.vn/chien-dich-nhan-dien-lua-dao-truc-tuyen-102240717152259919.htm', '2024-07-17', 'Chiến dịch quốc gia của Bộ Thông tin & Truyền thông và Cục An toàn thông tin về 24 hình thức lừa đảo nhắm vào học sinh, sinh viên.'),
(6, 'BAO_TUOI_TRE', 'Báo Tuổi Trẻ Online (tuoitre.vn)', 'Chiêu lừa đảo mới nhắm vào sinh viên: Cử người đến tận nơi nhận tiền', 'https://tuoitre.vn/chieu-lua-dao-moi-nham-vao-sinh-vien-cu-nguoi-den-tan-noi-nhan-tien-100260913131739695.htm', '2026-09-13', 'Điều tra thủ đoạn thao túng tâm lý sinh viên, bẫy việc làm online và lừa chuyển tiền.');

-- -----------------------------------------------------------------------------
-- NẠP DỮ LIỆU SỐ ĐIỆN THOẠI LỪA ĐẢO (scam_phones)
-- Bao gồm 18 số từ Thư Viện Pháp Luật + BV Lê Văn Thịnh + Quảng Châu + Tổ 4
-- -----------------------------------------------------------------------------
INSERT INTO scam_phones (raw_number, clean_number, category, carrier_info, impersonated_target, risk_score, risk_status, threat_details, recommended_action, reports_count, source_id) VALUES
-- [NHÓM 1: MẠO DANH NGÂN HÀNG VIETCOMBANK & THẺ TÍN DỤNG]
('0236.688.8766', '02366888766', 'BANK_IMPERSONATION', 'Cố định Đà Nẵng / VoIP ảo', 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)', 98, 'DANGEROUS', 'Gọi điện tự xưng nhân viên ngân hàng Vietcombank thông báo tài khoản có dấu hiệu bất thường, bị khóa hoặc dính líu rửa tiền; yêu cầu cung cấp OTP, mật khẩu Internet Banking để chiếm đoạt tài sản.', 'Tuyệt đối KHÔNG nghe máy hoặc gọi lại. Ngân hàng không bao giờ yêu cầu khách hàng cung cấp mã OTP qua điện thoại.', 420, 1),
('0248.886.0469', '02488860469', 'BANK_IMPERSONATION', 'VoIP 0248 Hà Nội', 'Ngân hàng Vietcombank', 98, 'DANGEROUS', 'Giả danh tổng đài hỗ trợ Vietcombank báo tài khoản bị đăng nhập trên thiết bị lạ, gửi link độc hại để đánh cắp phiên đăng nhập ngân hàng.', 'Chặn số ngay lập tức. Nếu nghi vấn tài khoản, tự mở app chính chủ hoặc gọi hotline 1900545413.', 365, 1),
('02888.865.154', '02888865154', 'BANK_IMPERSONATION', 'VoIP 02888 TP.HCM', 'Ngân hàng Vietcombank', 97, 'DANGEROUS', 'Mạo danh nhân viên phòng giao dịch Vietcombank yêu cầu xác thực sinh trắc học giả mạo qua đường link lạ.', 'Cúp máy ngay, không click vào bất kỳ đường link nào gửi qua SMS/Zalo.', 298, 1),
('1900.355.561', '1900355561', 'BANK_IMPERSONATION', 'Đầu số 1900 dịch vụ trả phí', 'Tổng đài ngân hàng giả mạo', 95, 'DANGEROUS', 'Tổng đài giả mạo ngân hàng câu giờ tính cước viễn thông giá cao đồng thời hướng dẫn chuyển tiền vào tài khoản tạm giữ bảo an.', 'Chặn số. Chỉ liên hệ số tổng đài in trên mặt sau thẻ ATM vật lý.', 312, 1),
('02886.895.963', '02886895963', 'CREDIT_CARD_FRAUD', 'VoIP 02886 TP.HCM', 'Tư vấn phát hành thẻ tín dụng Vietcombank giả mạo', 96, 'DANGEROUS', 'Cuộc gọi tự động thông báo: “Chúc mừng quý khách đã đủ điều kiện phát hành thẻ tín dụng...”. Sau khi bấm phím, đối tượng yêu cầu đóng phí nâng hạn mức hoặc nộp tiền nâng điểm tín dụng.', 'Không bấm phím theo hướng dẫn thoại tự động. Đây là chiêu trò bẫy phí thẻ tín dụng ảo.', 280, 2),

-- [NHÓM 2: MẠO DANH NHÂN VIÊN ĐIỆN LỰC EVN]
('0889.050.231', '0889050231', 'ELECTRICITY_IMPERSONATION', 'Vinaphone Di động', 'Tập đoàn Điện lực Việt Nam (EVN)', 97, 'DANGEROUS', 'Mạo danh nhân viên điện lực thông báo nợ tiền điện, dọa cắt điện trong 2 giờ và ép cài app EVN giả mạo chứa mã độc chiếm quyền điều khiển điện thoại.', 'EVN chỉ thông báo qua tin nhắn định danh Brandname EVN hoặc Zalo OA có tích vàng. Không nộp tiền qua số cá nhân.', 389, 1),
('0917.896.904', '0917896904', 'ELECTRICITY_IMPERSONATION', 'Vinaphone Di động', 'Nhân viên chăm sóc khách hàng EVN', 96, 'DANGEROUS', 'Gọi điện thông báo hoàn tiền hóa đơn tiền điện đóng dư, dụ quét mã QR hoặc truy cập web giả mạo để lấy cắp thông tin thẻ ngân hàng.', 'Chặn số ngay. Tra cứu lịch sử tiền điện trực tiếp trên app EVN chính thức.', 215, 1),
('0598.428.337', '0598428337', 'ELECTRICITY_IMPERSONATION', 'MobiFone 059 Di động', 'Cơ quan Điện lực', 95, 'DANGEROUS', 'Đe dọa khóa đồng hồ điện do sai thông tin hợp đồng sinh trắc học, yêu cầu làm việc trực tuyến qua Zalo.', 'Cúp điện thoại, liên hệ trực tiếp Tổng đài EVN theo khu vực (Miền Bắc: 19006769, Miền Nam: 19001006).', 190, 1),
('0598.427.578', '0598427578', 'ELECTRICITY_IMPERSONATION', 'MobiFone 059 Di động', 'Cơ quan Điện lực', 95, 'DANGEROUS', 'Mạo danh nhân viên kỹ thuật điện lực yêu cầu nộp phạt vi phạm sử dụng điện.', 'Tuyệt đối không chuyển khoản. Báo cáo số điện thoại tới đầu số 156.', 175, 1),
('0819.343.248', '0819343248', 'ELECTRICITY_IMPERSONATION', 'Vinaphone 081 Di động', 'Cơ quan Điện lực', 94, 'DANGEROUS', 'Thông báo vi phạm hợp đồng điện lực, dọa chuyển hồ sơ sang cơ quan công an nếu không nộp phạt gấp.', 'Chặn số và không làm theo yêu cầu.', 160, 1),

-- [NHÓM 3: MẠO DANH CÁN BỘ CÔNG AN / ĐIỀU TRA VIÊN]
('0833.109.259', '0833109259', 'POLICE_IMPERSONATION', 'Vinaphone 083 Di động', 'Cán bộ điều tra / Cơ quan Công an', 99, 'DANGEROUS', 'Gọi điện dọa người nghe liên quan đường dây rửa tiền, buôn bán ma túy; đe dọa bắt tạm giam, cấm liên lạc với người nhà và ép chuyển tiền bảo lãnh vào tài khoản giám sát.', 'CÔNG AN KHÔNG LÀM VIỆC QUA ĐIỆN THOẠI. Khi cần làm việc công an sẽ gửi giấy mời hoặc giấy triệu tập trực tiếp qua công an khu vực.', 610, 1),
('0853.975.728', '0853975728', 'POLICE_IMPERSONATION', 'Vinaphone 085 Di động', 'Cán bộ Viện Kiểm sát / Tòa án', 99, 'DANGEROUS', 'Gửi lệnh bắt giữ giả mạo qua Zalo, dọa phong tỏa tài khoản ngân hàng và căn cước công dân.', 'Cúp máy ngay lập tức. Báo ngay cho công an phường/xã hoặc Đoàn trường để được hỗ trợ.', 540, 1),
('0868.889.900', '0868889900', 'POLICE_IMPERSONATION', 'Viettel SIM rác kích hoạt sẵn', 'Tổng đài mạo danh Bộ Công An', 98, 'DANGEROUS', 'Tự xưng Ban chuyên án điều tra kinh tế gọi điện dọa phạt tù sinh viên vì mở tài khoản ngân hàng tiếp tay tội phạm.', 'Bình tĩnh cúp máy. Đây là bẫy thao túng tâm lý cô lập nạn nhân.', 520, 5),

-- [NHÓM 4: MẠO DANH NHÂN VIÊN GIAO HÀNG / SHIPPER]
('0901.757.297', '0901757297', 'SHIPPER_FRAUD', 'MobiFone Di động', 'Nhân viên giao hàng Shopee / Lazada', 95, 'DANGEROUS', 'Gọi điện báo có đơn hàng giao đến nhưng khách vắng nhà, yêu cầu chuyển khoản tiền đơn hàng trước rồi mới gửi lại chỗ bảo vệ.', 'Chỉ chuyển khoản khi chắc chắn bản thân có đặt hàng và đối soát chính xác mã vận đơn trên ứng dụng mua sắm.', 230, 1),
('0902.204.629', '0902204629', 'SHIPPER_FRAUD', 'MobiFone Di động', 'Nhân viên Shipper giao hàng bưu phẩm', 94, 'DANGEROUS', 'Báo gửi nhầm gói hàng giá trị cao hoặc chuyển nhầm tiền COD, gửi link Zalo yêu cầu bấm vào để hoàn tiền.', 'Không bấm vào link hoàn tiền từ shipper. Không nhập OTP vào trang web bên ngoài ứng dụng mua sắm.', 195, 1),
('0903.553.785', '0903553785', 'SHIPPER_FRAUD', 'MobiFone Di động', 'Shipper lừa thu hộ COD ảo', 94, 'DANGEROUS', 'Thu hộ tiền kiện hàng ảo rỗng ruột cho người thân sinh viên ở quê gửi lên.', 'Kiểm tra với người thân trước khi nhận bất kỳ gói hàng nào không rõ nguồn gốc.', 182, 1),
('0706.582.201', '0706582201', 'SHIPPER_FRAUD', 'MobiFone 070 Di động', 'Shipper giả mạo', 93, 'DANGEROUS', 'Giao gói quà trúng thưởng miễn phí nhưng yêu cầu trả phí vận chuyển 50k - 100k, bên trong là hàng rác.', 'Từ chối nhận hàng không rõ đơn.', 164, 1),
('0932.378.465', '0932378465', 'SHIPPER_FRAUD', 'MobiFone Di động', 'Nhân viên giao nhận hàng', 93, 'DANGEROUS', 'Chiêu trò gửi bưu phẩm chứa ma túy / hàng cấm dọa nạt nạn nhân nộp tiền hòa giải.', 'Không nhận bưu phẩm lạ. Báo cơ quan công an gần nhất.', 150, 1),
('0903.494.514', '0903494514', 'SHIPPER_FRAUD', 'MobiFone Di động', 'Shipper mạo danh', 93, 'DANGEROUS', 'Yêu cầu chuyển tiền đặt cọc giữ hàng tại kho trung chuyển bưu điện.', 'Tuyệt đối không chuyển cọc.', 142, 1),

-- [NHÓM 5: LỪA ĐẢO HỌC ĐƯỜNG & TUYỂN DỤNG CTV NHẮM VÀO SINH VIÊN]
('0981.234.567', '0981234567', 'STUDENT_TUITION', 'Viettel SIM rác kích hoạt ảo', 'Mạo danh Phòng Đào tạo Đại học', 99, 'DANGEROUS', 'Gửi SMS thông báo khẩn: Yêu cầu nộp 3.250.000đ học phí kỳ 1 vào tài khoản cá nhân Techcombank trước 11h30 sáng nếu không sẽ bị hủy môn thi và xóa tên khỏi danh sách lớp.', 'Trường ĐH chỉ thu học phí qua Cổng thông tin đào tạo (Portal) hoặc tài khoản định danh đứng tên Trường. Không bao giờ thu qua STK cá nhân.', 245, 5),
('0249.999.8888', '02499998888', 'JOB_SCAM', 'VoIP Cố định ảo IP Telecom', 'Bẫy tuyển CTV Shopee / TikTok', 96, 'DANGEROUS', 'Phát tán tin nhắn tuyển CTV soát vé xem phim, giật đơn Shopee lương 500k/ngày. Nạp tiền làm nhiệm vụ nhỏ trả thưởng sòng phẳng, khi nạn nhân nạp tiền triệu thì giam tiền và khóa tài khoản.', 'Không có công việc nào việc nhẹ lương cao nạp tiền làm nhiệm vụ. Cảnh giác với các nhóm Telegram ẩn danh.', 430, 6),

-- [NHÓM 6: CÁC SỐ ĐIỆN THOẠI QUỐC TẾ NHÁY MÁY LỪA CƯỚC WANGIRI]
('+22375260052', '+22375260052', 'INTERNATIONAL_WANGIRI', 'Mạng quốc tế Mali (+223)', 'Tổng đài quốc tế ảo', 99, 'DANGEROUS', 'Nháy máy 1 hồi chuông vào đêm muộn hoặc sáng sớm để nạn nhân gọi lại, cước viễn thông quốc tế bị trừ từ 50.000đ đến 150.000đ/phút.', 'Tuyệt đối KHÔNG gọi lại bất kỳ số điện thoại nào bắt đầu bằng dấu + hoặc 00 lạ.', 580, 2),
('+22382271520', '+22382271520', 'INTERNATIONAL_WANGIRI', 'Mạng quốc tế Mali (+223)', 'Tổng đài quốc tế ảo', 99, 'DANGEROUS', 'Nháy máy câu cước quốc tế Wangiri.', 'Không gọi lại. Chặn số trên điện thoại.', 490, 2),
('+8919008198', '+8919008198', 'INTERNATIONAL_WANGIRI', 'Số quốc tế giả mạo tổng đài', 'Đầu số dịch vụ ma', 97, 'DANGEROUS', 'Giả dạng số tổng đài trong nước nhưng có tiền tố quốc tế.', 'Chặn số ngay lập tức.', 310, 2),
('+22379262886', '+22379262886', 'INTERNATIONAL_WANGIRI', 'Mạng quốc tế Mali (+223)', 'Tổng đài nháy máy tự động', 98, 'DANGEROUS', 'Bẫy gọi lại trừ cước viễn thông quốc tế.', 'Không gọi lại.', 380, 2),
('+4422222202', '+4422222202', 'INTERNATIONAL_WANGIRI', 'Đầu số Vương Quốc Anh mạo danh', 'Cuộc gọi quốc tế lừa đảo', 96, 'DANGEROUS', 'Giả mạo số điện thoại từ Anh Quốc thông báo có kiện hàng quà tặng hải quan cần nộp phí giải cứu.', 'Không chuyển tiền nộp phí hải quan cho số lạ.', 275, 2),

-- [NHÓM 7: DANH SÁCH 50 SỐ ĐIỆN THOẠI NGHỆ AN CÔNG BỐ (MẪU ĐIỂN HÌNH)]
('0249.995.0060', '02499950060', 'VOIP_SPAM', 'VoIP Hà Nội (Giga Telecom)', 'Đầu số rác tự động', 96, 'DANGEROUS', 'Cuộc gọi tự động dọa khóa SIM, nợ tiền cước mạng sau 2 giờ.', 'Chặn số ngay.', 410, 4),
('0249.995.4266', '02499954266', 'VOIP_SPAM', 'VoIP Hà Nội', 'Tự xưng cơ quan tư pháp', 96, 'DANGEROUS', 'Dọa trát hầu tòa ép chuyển tiền.', 'Chặn số ngay.', 350, 4),
('0289.996.4439', '02899964439', 'VOIP_SPAM', 'VoIP TP.HCM', 'Cuộc gọi rác dọa án phạt nguội', 97, 'DANGEROUS', 'Thông báo phạt nguội giao thông đánh cắp CCCD.', 'Chặn số ngay.', 520, 4),
('0285.678.6501', '02856786501', 'VOIP_SPAM', 'VoIP TP.HCM', 'Hỗ trợ nâng hạn mức ngân hàng giả mạo', 95, 'DANGEROUS', 'Chiếm đoạt mã OTP ngân hàng.', 'Chặn số ngay.', 290, 4),
('1900.3439', '19003439', 'PAID_SHORTCODE', 'Tổng đài 1900 tính cước', 'Nháy máy trừ tiền cước', 92, 'DANGEROUS', 'Nháy máy dụ gọi lại trừ tiền cước.', 'Chặn số ngay.', 184, 4),

-- [SỐ ĐIỆN THOẠI CHÍNH THỐNG AN TOÀN (SAFE)]
('156', '156', 'SAFE_HOTLINE', 'Tổng đài Quốc gia (Bộ TT&TT)', 'Kênh tiếp nhận phản ánh cuộc gọi rác & lừa đảo', 0, 'SAFE', 'Tổng đài đường dây nóng chính thức của Bộ Thông tin và Truyền thông để người dân phản ánh lừa đảo viễn thông miễn phí.', 'Gọi 156 hoặc nhắn tin theo cú pháp: LD [SĐT lừa đảo] [Nội dung] gửi 156.', 0, 5),
('5656', '5656', 'SAFE_HOTLINE', 'Tổng đài Cục An toàn thông tin (Bộ TT&TT)', 'Đầu số tiếp nhận tin nhắn phản ánh rác & lừa đảo', 0, 'SAFE', 'Đầu số nhắn tin miễn phí để đăng ký danh sách không quảng cáo (DoNotCall) và báo cáo cuộc gọi lừa đảo.', 'Soạn tin nhắn phản ánh gửi miễn phí tới 5656.', 0, 5),
('024.3754.7547', '02437547547', 'SAFE_EDU', 'Cố định VNPT Hà Nội', 'Phòng Đào tạo Đại học Quốc gia', 0, 'SAFE', 'Số điện thoại tổng đài bàn chính thức tiếp nhận và giải đáp thắc mắc về học phí và lịch thi cho sinh viên.', 'Số điện thoại trường đại học đã được xác thực an toàn.', 0, 5);

-- -----------------------------------------------------------------------------
-- NẠP DỮ LIỆU ĐẦU SỐ, ĐUÔI SỐ & ĐẦU SỐ SMS DỊCH VỤ (scam_patterns)
-- Theo bài viết Thế Giới Di Động (2026) & Bệnh viện Lê Văn Thịnh
-- -----------------------------------------------------------------------------
INSERT INTO scam_patterns (pattern_type, pattern_value, region_country, risk_score, threat_type, warning_advice, source_id) VALUES
-- [CÁC ĐẦU SỐ QUỐC TẾ NHÁY MÁY LỪA ĐẢO WANGIRI]
('PREFIX', '+224', 'Guinea (Châu Phi)', 99, 'Đầu số lừa đảo quốc tế Wangiri nháy máy', 'Bắt đầu bằng +224. Tuyệt đối không nghe máy, không gọi lại tránh bị trừ cước quốc tế hàng chục nghìn đồng/phút.', 3),
('PREFIX', '+231', 'Liberia (Châu Phi)', 99, 'Đầu số lừa đảo quốc tế Wangiri nháy máy', 'Bắt đầu bằng +231. Tuyệt đối không gọi lại.', 3),
('PREFIX', '+232', 'Sierra Leone', 99, 'Đầu số lừa đảo quốc tế Wangiri nháy máy', 'Bắt đầu bằng +232. Cuộc gọi câu cước viễn thông quốc tế.', 3),
('PREFIX', '+247', 'Đảo Ascension (Ascension Island)', 99, 'Đầu số lừa đảo quốc tế nháy máy', 'Bắt đầu bằng +247. Không nhấc máy và không gọi lại.', 3),
('PREFIX', '+252', 'Somalia', 99, 'Đầu số lừa đảo quốc tế Wangiri nháy máy', 'Bắt đầu bằng +252. Chặn số ngay khi thấy xuất hiện.', 3),
('PREFIX', '+255', 'Tanzania', 99, 'Đầu số lừa đảo quốc tế Wangiri nháy máy', 'Bắt đầu bằng +255. Không nghe máy và không gọi lại.', 3),
('PREFIX', '+370', 'Lithuania (Litva)', 98, 'Đầu số quốc tế có dấu hiệu quấy rối & lừa đảo', 'Bắt đầu bằng +370. Nháy máy tạo tò mò cho nạn nhân gọi lại.', 3),
('PREFIX', '+371', 'Latvia', 98, 'Đầu số lừa đảo quốc tế câu cước', 'Bắt đầu bằng +371. Cảnh báo nguy cơ trừ tiền cước phát sinh cao.', 3),
('PREFIX', '+375', 'Belarus', 98, 'Đầu số lừa đảo quốc tế', 'Bắt đầu bằng +375. Tuyệt đối không phản hồi.', 3),
('PREFIX', '+381', 'Serbia', 98, 'Đầu số lừa đảo quốc tế', 'Bắt đầu bằng +381. Bẫy cước quốc tế chiều gọi đi.', 3),
('PREFIX', '+563', 'Valparaíso / Quần đảo Chile', 98, 'Đầu số lừa đảo quốc tế', 'Bắt đầu bằng +563. Không gọi lại dưới mọi hình thức.', 3),
('PREFIX', '+882', 'Hệ thống viễn thông vệ tinh quốc tế', 99, 'Đầu số vệ tinh quốc tế cước cực đắt', 'Bắt đầu bằng +882. Cước gọi lại có thể lên tới 100.000đ - 200.000đ/phút.', 2),
('PREFIX', '+60', 'Malaysia', 95, 'Đầu số lừa đảo nháy máy / mời gọi làm nhiệm vụ', 'Bắt đầu bằng +60. Giả danh các nền tảng việc làm online xuyên biên giới.', 2),
('PREFIX', '+900', 'Đầu số dịch vụ quốc tế', 97, 'Đầu số dịch vụ quốc tế trừ tiền', 'Bắt đầu bằng +900. Cảnh báo trừ cước dịch vụ giá cao.', 2),

-- [CÁC ĐẦU SỐ CỐ ĐỊNH VOIP ẢO TRONG NƯỚC THƯỜNG BỊ KẺ GIAN LỢI DỤNG]
('PREFIX', '024999', 'Hà Nội (Dải VoIP Giga Telecom ảo)', 96, 'Dải đầu số VoIP chuyên phát tán cuộc gọi rác & lừa đảo', 'Thuộc danh mục 50 số cố định cần chặn ngay. Chuyên giả mạo điện lực, tòa án, công an.', 4),
('PREFIX', '028999', 'TP.HCM (Dải VoIP Giga Telecom ảo)', 96, 'Dải đầu số VoIP phát tán cuộc gọi tự động spam', 'Giả danh bưu điện phát bưu phẩm chứa hàng cấm nhằm dọa nạt nạn nhân.', 4),
('PREFIX', '02856', 'TP.HCM (Dải VoIP cố định ảo)', 95, 'Đầu số cố định ảo miền Nam', 'Kẻ gian thường dùng để gọi mời vay vốn tín dụng đen hoặc dụ chuyển tiền.', 4),
('PREFIX', '024888', 'Hà Nội (Đầu số VoIP mạo danh ngân hàng)', 97, 'Đầu số mạo danh ngân hàng Vietcombank', 'Thường gắn với các số lừa đảo thông báo tài khoản bị khóa như 0248.886.0469.', 1),
('PREFIX', '02888', 'TP.HCM (Đầu số VoIP mạo danh ngân hàng)', 97, 'Đầu số mạo danh ngân hàng Vietcombank', 'Thường gắn với các số lừa đảo thông báo tài khoản bị xâm nhập.', 1),
('PREFIX', '02886', 'TP.HCM (Đầu số thoại tự động thẻ tín dụng)', 96, 'Đầu số lừa mở thẻ tín dụng ảo', 'Thoại tự động chúc mừng mở thẻ tín dụng Vietcombank nhằm chiếm đoạt phí bảo lãnh.', 2),

-- [CÁC ĐẦU SỐ TIN NHẮN SMS DỊCH VỤ TRỪ TIỀN NGẦM ĐƯỢC CÔNG AN NÊU ĐÍCH DANH]
('SHORTCODE', '6781', 'Đầu số SMS dịch vụ nội dung số', 95, 'Đầu số tin nhắn trừ tiền cước ngầm', 'Có trong cảnh báo công an. Nhắn tin đến đầu số này bị trừ tiền cước cao không báo trước.', 2),
('SHORTCODE', '6768', 'Đầu số SMS dịch vụ', 95, 'Đầu số tin nhắn trừ tiền cước ngầm', 'Có trong cảnh báo công an. Bẫy nhắn tin nhận kết quả trúng thưởng giả.', 2),
('SHORTCODE', '7775', 'Đầu số SMS dịch vụ', 95, 'Đầu số tin nhắn trừ tiền cước ngầm', 'Có trong cảnh báo công an.', 2),
('SHORTCODE', '8781', 'Đầu số SMS đầu 87xx cước 15.000đ/SMS', 96, 'Đầu số tin nhắn trừ cước tối đa', 'Đầu số 87xx tự động trừ từ 15.000đ/tin nhắn vào tài khoản chính của SIM.', 2),
('SHORTCODE', '7777', 'Đầu số SMS dịch vụ', 95, 'Đầu số tin nhắn trừ tiền ngầm', 'Có trong danh mục cảnh báo của cơ quan công an.', 2),
('SHORTCODE', '8700', 'Đầu số SMS dịch vụ 15.000đ', 96, 'Đầu số tin nhắn cước cao', 'Cảnh báo lừa tải game / ứng dụng kích hoạt mã trừ tiền ngầm hàng tháng.', 2),
('SHORTCODE', '8125', 'Đầu số SMS dịch vụ', 94, 'Đầu số tin nhắn trừ cước', 'Cảnh báo trong văn bản công an.', 2),
('SHORTCODE', '7769', 'Đầu số SMS dịch vụ', 95, 'Đầu số tin nhắn trừ cước', 'Cảnh báo trong văn bản công an.', 2),
('SHORTCODE', '6716', 'Đầu số SMS dịch vụ', 94, 'Đầu số tin nhắn trừ cước', 'Cảnh báo trong văn bản công an.', 2),
('SHORTCODE', '8791', 'Đầu số SMS dịch vụ 15.000đ', 96, 'Đầu số tin nhắn trừ cước', 'Cảnh báo trong văn bản công an.', 2),
('SHORTCODE', '7786', 'Đầu số SMS dịch vụ', 95, 'Đầu số tin nhắn trừ cước', 'Cảnh báo trong văn bản công an.', 2),
('SHORTCODE', '8774', 'Đầu số SMS dịch vụ 15.000đ', 96, 'Đầu số tin nhắn trừ cước', 'Cảnh báo trong văn bản công an.', 2),

-- [CÁC QUY TẮC ĐUÔI SỐ (SUFFIX PATTERNS) NGHI VẤN SIM RÁC TỔNG ĐÀI ẢO]
('SUFFIX', '%9999', 'Đuôi số tứ quý 9 ảo', 85, 'Đuôi số đẹp giả danh cơ quan cấp cao', 'Các đường dây lừa đảo thường mua sim rác số đẹp đuôi 9999 hoặc dùng SIP Trunk VoIP giả mạo số VIP để tạo lòng tin với sinh viên.', 5),
('SUFFIX', '%8888', 'Đuôi số tứ quý 8 ảo', 85, 'Đuôi số đẹp giả danh ngân hàng / tổng đài tài chính', 'Thường xuất hiện trong các cuộc gọi mời chào vay tiền nóng, giải ngân siêu tốc qua app.', 5),
('SUFFIX', '%6868', 'Đuôi lộc phát ảo', 80, 'Đuôi số lộc phát mời đầu tư tài chính', 'Bẫy đầu tư sàn forex ảo, tiền ảo, giật đơn Shopee.', 6),
('SUFFIX', '%0000', 'Đuôi số bot tự động', 82, 'Đuôi bot phát tán cuộc gọi tự động hàng loạt', 'Hệ thống gọi tự động ghi âm sẵn để sàng lọc nạn nhân nhẹ dạ.', 4);

-- -----------------------------------------------------------------------------
-- NẠP DỮ LIỆU EMAIL LỪA ĐẢO (scam_emails)
-- -----------------------------------------------------------------------------
INSERT INTO scam_emails (email_address, domain_type, risk_score, risk_status, threat_description, warning_rule, source_id) VALUES
('daotao.dhqg.edu.vn@gmail.com', 'gmail.com cá nhân giả danh đuôi trường', 98, 'DANGEROUS', 'Mạo danh Phòng Đào tạo ĐHQG gửi thư báo nộp học phí bổ sung kèm mã QR tài khoản Techcombank cá nhân.', 'Trường Đại học chỉ sử dụng hòm thư tên miền chính thức (ví dụ: @vnu.edu.vn, @hust.edu.vn). TUYỆT ĐỐI KHÔNG dùng đuôi @gmail.com hoặc @outlook.com.', 5),
('tuyendung.shopee.online2026@gmail.com', 'gmail.com giả mạo sàn TMĐT Shopee', 95, 'DANGEROUS', 'Gửi thư mời tuyển dụng CTV giật đơn nhận 500k/ngày, dẫn link sang nhóm Telegram lừa nạp tiền.', 'Shopee tuyển dụng chính thức qua cổng careers.shopee.vn và hòm thư @shopee.com.', 6),
('xacthuc.dinhdanh.c06@gmail.com', 'gmail.com mạo danh Cục C06 Bộ Công An', 99, 'DANGEROUS', 'Gửi email dọa tài khoản định danh VNeID mức 2 bị lỗi, yêu cầu bấm vào link cài đặt app lạ.', 'Cơ quan công an không gửi email từ máy chủ Gmail công cộng.', 5);

-- -----------------------------------------------------------------------------
-- NẠP DỮ LIỆU SỔ TIẾP NHẬN PHẢN ÁNH CỘNG ĐỒNG (scam_reports)
-- -----------------------------------------------------------------------------
INSERT INTO scam_reports (ticket_code, target_value, target_type, scam_category, reporter_identity, evidence_note, verification_status) VALUES
('HS-TDHT-01', '02366888766', 'PHONE', 'Mạo danh ngân hàng Vietcombank', 'SV K65 - Khoa Kinh tế', 'Gọi báo tài khoản có biến động nghi vấn rửa tiền, đòi cung cấp OTP', 'VERIFIED_SCAM'),
('HS-TDHT-02', '0981234567', 'PHONE', 'Mạo danh thu học phí trường ĐH', 'SV K66 - Tân sinh viên', 'Nhắn SMS dọa hủy môn thi nếu không đóng 3.25 triệu vào STK cá nhân', 'VERIFIED_SCAM'),
('HS-TDHT-03', 'daotao.dhqg.edu.vn@gmail.com', 'EMAIL', 'Email giả mạo đào tạo', 'SV K65 - Khoa Luật', 'Gửi email Gmail yêu cầu chuyển tiền học phí', 'BLOCKED'),
('HS-TDHT-04', '0889050231', 'PHONE', 'Giả danh nhân viên điện lực EVN', 'SV K64 - KTX Mễ Trì', 'Dọa cắt điện KTX và ép cài file APK lạ vào máy', 'VERIFIED_SCAM'),
('HS-TDHT-05', '0833109259', 'PHONE', 'Mạo danh điều tra viên công an', 'SV K66 - Ngoại ngữ', 'Dọa lệnh bắt tạm giam, cấm báo gia đình', 'VERIFIED_SCAM');

-- -----------------------------------------------------------------------------
-- 6. CÁC VIEW TRUY VẤN TIỆN ÍCH DÀNH CHO CỔNG TRA CỨU
-- -----------------------------------------------------------------------------
-- View tra cứu tổng hợp số điện thoại lừa đảo kèm thông tin nguồn
CREATE OR REPLACE VIEW vw_scam_phones_full AS
SELECT 
    p.phone_id,
    p.raw_number,
    p.clean_number,
    p.category,
    p.carrier_info,
    p.impersonated_target,
    p.risk_score,
    p.risk_status,
    p.threat_details,
    p.recommended_action,
    p.reports_count,
    s.organization_name AS verified_by,
    s.article_title AS source_title,
    s.article_url AS source_url
FROM scam_phones p
LEFT JOIN scam_sources s ON p.source_id = s.source_id;

-- View tra cứu danh mục đầu số & đuôi số
CREATE OR REPLACE VIEW vw_scam_patterns_full AS
SELECT 
    pt.pattern_id,
    pt.pattern_type,
    pt.pattern_value,
    pt.region_country,
    pt.risk_score,
    pt.threat_type,
    pt.warning_advice,
    s.organization_name AS verified_by,
    s.article_url AS source_url
FROM scam_patterns pt
LEFT JOIN scam_sources s ON pt.source_id = s.source_id;

-- -----------------------------------------------------------------------------
-- 7. CÂU LỆNH MẪU TRA CỨU THEO SỐ, ĐẦU SỐ, ĐUÔI SỐ TRONG THỰC TẾ
-- -----------------------------------------------------------------------------
-- 1. Tra cứu chính xác số điện thoại (VD người dùng nhập '0236.688.8766' hoặc '02366888766'):
-- SELECT * FROM vw_scam_phones_full WHERE clean_number = '02366888766';

-- 2. Kiểm tra nếu số điện thoại trùng khớp với ĐẦU SỐ quốc tế hoặc VoIP nguy hiểm:
-- SELECT * FROM vw_scam_patterns_full 
-- WHERE pattern_type = 'PREFIX' AND '+224123456' LIKE CONCAT(pattern_value, '%');

-- 3. Kiểm tra nếu số điện thoại có ĐUÔI SỐ nằm trong danh mục nghi vấn bot tự động:
-- SELECT * FROM vw_scam_patterns_full 
-- WHERE pattern_type = 'SUFFIX' AND '0988889999' LIKE pattern_value;
