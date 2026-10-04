# TÀI LIỆU GIỚI THIỆU: CỔNG TRA CỨU & TIẾP NHẬN PHẢN ÁNH LỪA ĐẢO TRỰC TUYẾN HỌC ĐƯỜNG (STUDENT CYBERGUARD)
> **Dự án thực tế phục vụ Đề tài 9:** *Phân tích hệ thống lừa đảo trực tuyến nhắm vào tân sinh viên & Đề xuất giải pháp toàn diện*  
> **Đơn vị thực hiện:** Nhóm nghiên cứu Tổ 4 &bull; Học phần: **Tư duy hệ thống (Systems Thinking)**  
> **Phiên bản:** 2.0 (Hỗ trợ Local AI, CSDL SQL, Mã QR truy cập tức thời & 100% Responsive Mobile/Desktop)

---

## 1. TỔNG QUAN HỆ THỐNG & ĐỊA CHỈ TRUY CẬP

**Cổng Tra Cứu & Tiếp Nhận Phản Ánh Lừa Đảo Học Đường Tổ 4** là giải pháp công nghệ phòng vệ chủ động, đóng vai trò là "bộ điều phối liên kết" giúp khôi phục **Tính nhất thể (System Wholeness)** trong mạng lưới phòng thủ học đường. Hệ thống được xây dựng nhằm bảo vệ tân sinh viên trước các thủ đoạn lừa đảo học phí, việc làm ảo, mạo danh cán bộ nhà trường và bẫy công nghệ cao.

* **Truy cập trực tuyến (GitHub Pages):**  
  👉 [https://ductruongvu23.github.io/chude9to4/app/index.html](https://ductruongvu23.github.io/chude9to4/app/index.html)
* **Truy cập nội bộ (Local Offline):**  
  👉 Mở trực tiếp file `app/index.html` trên bất kỳ trình duyệt web nào (Chrome, Edge, Safari, Firefox).
* **Mã QR trải nghiệm nhanh trên điện thoại:**  
  Người dùng chỉ cần mở ứng dụng Camera trên smartphone (iOS / Android) và hướng ống kính vào mã QR bên dưới để truy cập trực tiếp:

```
      ┌──────────────────────────────────────────────┐
      │  📲 QUÉT MÃ QR TRẢI NGHIỆM TRÊN ĐIỆN THOẠI   │
      │                                              │
      │    [Mã QR sắc nét lưu tại:                   │
      │     assets/images/qr_web_app.png]            │
      │                                              │
      │  URL: https://ductruongvu23.github.io/       │
      │       chude9to4/app/index.html               │
      └──────────────────────────────────────────────┘
```

---

## 2. NỀN TẢNG TƯ DUY HỆ THỐNG (SYSTEMS THINKING FOUNDATION)

Theo nguyên lý của nhà khoa học hệ thống **Donella H. Meadows** (*"Thinking in Systems: A Primer"*), một hệ thống không thể vận hành hiệu quả nếu các phân hệ bị chia cắt thành các "ốc đảo dữ liệu" (Data Silos).

| Vấn đề hệ thống hiện tại | Hậu quả đối kháng | Giải pháp của Cổng Tổ 4 |
| :--- | :--- | :--- |
| **Ốc đảo dữ liệu (Data Silos)** | Ngân hàng thấy chuyển tiền, Trường thấy nợ học phí, Nhà mạng thấy cuộc gọi rác nhưng không ai liên thông. Kẻ gian đánh vào "vùng đệm ranh giới". | **Tập trung hóa dữ liệu đối soát**: Tra cứu đồng thời SĐT vi phạm, định dạng hòm thư trường học và STK thu học phí trên một giao diện duy nhất. |
| **Độ trễ vận tốc (Velocity Disparity)** | Tội phạm tẩu tán dòng tiền qua tài khoản rác (mule) trong **3 phút**, trong khi quy trình công văn hành chính mất **vài ngày**. | **Tiền kiểm tức thời (&lt; 50ms)**: Sinh viên tra cứu ngay trước khi bấm nút chuyển tiền, ngăn chặn thiệt hại trước khi xảy ra. |
| **Quá tải cảnh báo (Warning Fatigue)** | Cảnh báo chung chung qua loa phát thanh/email khiến sinh viên trơ phản ứng (Habituation), thường bấm bỏ qua. | **Cảnh báo theo ngữ cảnh (Contextual AI)**: Trợ lý AI phân tích cụ thể từng tin nhắn, chỉ ra đích danh thủ đoạn tâm lý và bằng chứng vi phạm. |
| **Tính cộng sinh ($1 + 1 > 2$)** | Mỗi sinh viên bị lừa trong âm thầm vì sợ bố mẹ la mắng, tạo điều kiện cho kẻ lừa đảo tiếp tục dùng chiêu cũ lừa người khác. | **Tiếp nhận & Cấp Ticket ID**: Một sinh viên báo cáo, CSDL SQL cập nhật tức thì, giúp hàng nghìn sinh viên khác được cảnh báo chéo. |

---

## 3. CÁC TÍNH NĂNG NỔI BẬT CỦA CỔNG ỨNG DỤNG

### 🔍 1. Tra cứu đa nguồn SĐT, Email & STK học phí
* **Kiểm tra SĐT lạ:** Đối soát trực tiếp với CSDL 100+ số điện thoại lừa đảo đã được Bộ Công An, Báo Tuổi Trẻ, Cổng TTĐT Công an các tỉnh, Thư Viện Pháp Luật và Bệnh viện Lê Văn Thịnh chính thức công bố danh tính.
* **Đối soát Email phòng ban:** Tự động kiểm tra đuôi tên miền. Nếu là hòm thư miễn phí (`@gmail.com`, `@yahoo.com`, `@outlook.com`) tự xưng là "Phòng Đào tạo", "Ban Quản lý KTX" hay "Phòng Công tác sinh viên", hệ thống sẽ lập tức gắn cờ đỏ cảnh báo mạo danh vì các trường đại học chỉ dùng email tên miền chính thống `.edu.vn`.
* **Đối soát STK nộp học phí:** Kiểm tra tài khoản người nhận xem có phải là tài khoản cá nhân mạo danh hay không, nhắc nhở sinh viên chỉ nộp học phí qua cổng thanh toán chính thức của nhà trường.

### 🤖 2. Trợ lý AI Bóc tách tin nhắn & ảnh bằng chứng (Local AI Analyzer)
* **Phân tích ngữ cảnh đe dọa:** Nhận diện các thủ thuật thao túng tâm lý kinh điển như:
  * Tạo áp lực thời gian gấp rút ("Nộp ngay trong 30 phút nếu không sẽ bị xóa tên khỏi danh sách trúng tuyển").
  * Mạo danh cán bộ cơ quan tư pháp/công an hoặc nhà trường.
  * Mồi chài việc làm thêm "việc nhẹ lương cao", làm nhiệm vụ Shopee/TikTok nhận hoa hồng 50.000đ.
* **Xử lý đa phương thức (Multimodal):** Cho phép copy-paste đoạn tin nhắn văn bản hoặc tải ảnh chụp màn hình tin nhắn (Zalo/SMS/Telegram).
* **Triết lý "Human-in-the-loop":** AI không phán quyết thay con người mà cung cấp bảng điểm rủi ro, phân tích chi tiết các dấu hiệu khả nghi và đưa ra bảng danh mục tự kiểm tra (Checklist phản xạ an toàn), kích hoạt tư duy phản biện của chính sinh viên.

### 📋 3. Hệ thống Tiếp nhận báo cáo & Cơ sở dữ liệu SQL chuẩn hóa
* **Cấp mã Ticket ID tự động:** Khi sinh viên gửi phản ánh kèm chứng cứ, hệ thống tự động sinh mã định danh duy nhất (ví dụ: `TK-2026-4091`) để theo dõi tình trạng xử lý và hỗ trợ hồ sơ làm việc với Cơ quan Công an.
* **CSDL SQL vi phạm (`scam_phone_database.sql`):** Toàn bộ dữ liệu được quản lý dưới dạng cấu trúc cơ sở dữ liệu quan hệ chuẩn, bao gồm thông tin số điện thoại, nhà mạng, loại hình thủ đoạn, cấp độ rủi ro, nguồn xác thực và bằng chứng kèm theo.
* **Sổ tiếp nhận trực tuyến:** Hiển thị danh sách các cảnh báo mới nhất từ cộng đồng sinh viên, biến mỗi nạn nhân tiềm năng thành một "mắt xích cảm biến" bảo vệ toàn trường.

### 🚨 4. Sổ tay Quy trình "Giờ Vàng" 15-30 phút đầu khi bị lừa
Hướng dẫn chi tiết 6 bước hành động khẩn cấp cứu vãn tình thế khi lỡ bấm link độc hại hoặc chuyển tiền:
1. **Bước 1:** Bật chế độ máy bay, ngắt Wifi/4G và gỡ app độc hại để ngăn chặn kẻ gian điều khiển máy từ xa qua dịch vụ trợ năng (Accessibility).
2. **Bước 2:** Gọi hotline ngân hàng khẩn cấp khóa thẻ và phát lệnh cảnh báo giao dịch gian lận trong 15 phút đầu.
3. **Bước 3:** Chụp màn hình, in sao kê ủy nhiệm chi bảo toàn chứng cứ số.
4. **Bước 4:** Nộp đơn tố giác tại Công an phường/quận hoặc cổng *dichvucong.bocongan.gov.vn*.
5. **Bước 5:** Soạn tin phản ánh miễn phí gửi tổng đài **156 / 5656** của Bộ TT&TT.
6. **Bước 6:** Đổi mật khẩu toàn diện (Email, VNeID, Mạng xã hội) và báo ngay cho gia đình để chặn bẫy mạo danh vay mượn tiền.

---

## 4. ĐẶC TẢ KỸ THUẬT & CAM KẾT BẢO MẬT (NFR & PRIVACY)

* **Tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân:**
  * Nguyên tắc **Privacy-by-Design**: Hệ thống không yêu cầu tạo tài khoản, không lưu trữ thông tin nhận dạng cá nhân (PII), không truy cập danh bạ hay định vị GPS của người dùng.
  * **Auto-masking:** Tự động che mờ số CCCD và 4 số cuối của tài khoản ngân hàng khi hiển thị trên giao diện công cộng.
* **Kiến trúc Local AI Offline:**
  * Mô hình phân tích ngôn ngữ tự nhiên chạy trực tiếp trên máy khách (Client-side), không truyền tải nội dung tin nhắn riêng tư của sinh viên lên bất kỳ máy chủ đám mây bên ngoài nào.
* **Tối ưu hóa đa thiết bị (100% Responsive):**
  * Tối ưu giao diện mượt mà trên các màn hình di động phổ biến (iPhone, Samsung, Xiaomi,... độ rộng từ 360px đến 430px) cũng như máy tính bảng và màn hình máy tính lớn.
  * Hỗ trợ chuyển đổi nhanh giữa chế độ Sáng (Light Mode) và Tối (Dark Mode) thân thiện với mắt người dùng.
* **Hiệu năng cao:**
  * Thời gian phản hồi tra cứu CSDL SQL: **&lt; 50ms**.
  * Thời gian phân tích tin nhắn của Trợ lý AI: **&lt; 2 giây**.

---

## 5. HƯỚNG DẪN TRẢI NGHIỆM NHANH (QUICK WALKTHROUGH)

1. **Bước 1:** Dùng điện thoại quét mã QR hoặc mở liên kết [https://ductruongvu23.github.io/chude9to4/app/index.html](https://ductruongvu23.github.io/chude9to4/app/index.html).
2. **Bước 2 (Tra cứu SĐT):** Nhập số điện thoại nghi vấn (ví dụ: `02477799999` hoặc `02888899999`), bấm **"Tra cứu an toàn"** để xem phân tích nhà mạng, tiền án lừa đảo và cảnh báo của Bộ Công An.
3. **Bước 3 (Thử Trợ lý AI):** Chuyển sang tab **"Trợ Lý AI Phân Tích"**, dán một đoạn tin nhắn giục đóng học phí gấp kèm STK cá nhân, bấm **"Bắt đầu phân tích AI"** để xem AI bóc tách các dấu hiệu thao túng tâm lý.
4. **Bước 4 (Tiếp nhận phản ánh):** Chuyển sang tab **"Báo Cáo Lừa Đảo"**, điền thông tin và bấm **"Gửi hồ sơ phản ánh"** để nhận ngay mã **Ticket ID** bảo vệ cộng đồng.

---
*Tài liệu được biên soạn và chuẩn hóa bởi Nhóm nghiên cứu Tổ 4 — Đề tài 9 &bull; Lưu trữ tại thư mục `/docs` của dự án.*
