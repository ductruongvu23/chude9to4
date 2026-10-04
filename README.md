# BÀI LÀM TỔ 4 • MÔN TƯ DUY HỆ THỐNG
## Đề Tài 9: Lừa Đảo Trực Tuyến Nhắm Vào Sinh Viên

Dự án nghiên cứu, slide trình chiếu và cổng dịch vụ tra cứu & tiếp nhận phản ánh lừa đảo trực tuyến dành cho sinh viên đại học dưới lăng kính **Lý thuyết Hệ thống (General Systems Theory - Chương 1)**: Mục tiêu hệ thống, Phân hệ, Độ bền liên kết, Tính nhất thể (Wholeness), Vòng phản hồi thích nghi (Feedback loop), và Yêu cầu chức năng/phi chức năng.

---

### 📦 Danh Mục Sản Phẩm Dự Án

### 📦 Danh Mục Sản Phẩm Dự Án

1. **Bộ Slide Trình Chiếu Chuyên Nghiệp (16 Slides Hệ Thống Chuẩn Hóa)**:
   - Thư mục: [`slides/`](slides/) (Mở trực tiếp [`slides/index.html`](slides/index.html))
   - **Tải về file PDF 16 trang hoàn chỉnh**: [`Slide_To4_DeTai9.pdf`](Slide_To4_DeTai9.pdf) hoặc [`slides/Slide_To4_DeTai9.pdf`](slides/Slide_To4_DeTai9.pdf)
   - Xuất bản đồng bộ 4 phong cách thiết kế:
     - Bản 1: *Minimalist Swiss (Sáng tối giản)* — [`Slide_To4_ThietKe1_Swiss_Tech.pdf`](Slide_To4_ThietKe1_Swiss_Tech.pdf)
     - Bản 2: *Minimal Dark (Tối giản thanh lịch)* — [`Slide_To4_ThietKe2_Minimal_Dark.pdf`](Slide_To4_ThietKe2_Minimal_Dark.pdf)
     - Bản 3: *Academic Editorial (Học thuật trang nhã)* — [`Slide_To4_ThietKe3_Academic_Editorial.pdf`](Slide_To4_ThietKe3_Academic_Editorial.pdf)
     - Bản 4: *Modern Cyber Defense (Phong cách Canva Tech Pitch Deck)* — [`Slide_To4_ThietKe4_Cyber_Defense.pdf`](Slide_To4_ThietKe4_Cyber_Defense.pdf) (Mở trực tiếp [`slides/theme_cyber.html`](slides/theme_cyber.html)) — Thiết kế chuyên nghiệp lấy cảm hứng từ mẫu Pitch Deck Cyber Security của Canva: Nền xanh đen công nghệ, đường nét kim loại bạc và viền sáng Cyan neon.
   - **Phân tích có hệ thống đầy đủ 5 trụ cột**: Mục tiêu hệ thống, Phân hệ đối kháng/phòng vệ, Tính nhất thể (Wholeness & Emergent Properties), Yêu cầu chức năng/phi chức năng (FR1-FR5 & NFR1-NFR5), Ma trận 5 Rủi ro hệ thống & Kiểm soát.
   - **Tích hợp Mã QR truy cập tức thì**: Quét mã QR tại Slide 14 và Slide 16 để mở ứng dụng web trực tiếp trên điện thoại.
   - **Kịch bản xử lý khủng hoảng "Giờ Vàng" 15-30 phút đầu** (Slide 15): Khóa thẻ khẩn cấp, ngắt app độc hại, bảo toàn chứng cứ số và trình báo Công an/156.
   - **Chế độ Presenter Drawer**: Ghi chú thuyết minh chi tiết cho 4 thành viên kèm đồng hồ đếm giờ 10-12 phút.

2. **Cổng Tra Cứu & Tiếp Nhận Phản Ánh Lừa Đảo (Web App & Local AI)**:
   - Thư mục: [`app/`](app/) (Mở file [`app/index.html`](app/index.html))
   - Online GitHub Pages: [https://ductruongvu23.github.io/chude9to4/app/index.html](https://ductruongvu23.github.io/chude9to4/app/index.html)
   - **Tra cứu SĐT, Email & STK nghi vấn**: Đối soát với CSDL hơn 100 số điện thoại lừa đảo đã được Bộ Công An, Báo Tuổi Trẻ, Bệnh viện Lê Văn Thịnh, Thư Viện Pháp Luật nêu tên; bóc tách hòm thư miễn phí `@gmail.com` mạo danh trường học.
   - **Trợ lý AI bóc tách tin nhắn (Local AI NLP/Vision)**: Phân tích áp lực thời gian, dấu hiệu đe dọa nợ học phí, bóc tách kịch bản thao túng tâm lý; bảo mật 100% dữ liệu (chạy Offline tại máy khách, không thu thập PII theo Nghị định 13/2023/NĐ-CP).
   - **Tiếp nhận phản ánh & CSDL SQL**: Tự động sinh mã Ticket ID định danh (`TK-2026-XXXX`), cập nhật vào CSDL quan hệ chuẩn [`scam_phone_database.sql`](scam_phone_database.sql).
   - **Tối ưu 100% Mobile & Chế độ Sáng / Tối**: Chuẩn UX/UI hiện đại, hỗ trợ vuốt chạm chuyển tab mượt mà.

3. **Tài Liệu Hướng Dẫn & Nghiên Cứu Chuyên Sâu**:
   - [`docs/GIOI_THIEU_CONG_TRA_CUU_TO4.md`](docs/GIOI_THIEU_CONG_TRA_CUU_TO4.md): Tài liệu ngắn giới thiệu toàn diện Cổng Tra cứu & Tiếp nhận phản ánh, mã QR quét điện thoại, 4 tính năng cốt lõi và cam kết bảo mật Nghị định 13/2023.
   - [`docs/KICH_BAN_THUYET_TRINH_VA_BAN_GIAY.md`](docs/KICH_BAN_THUYET_TRINH_VA_BAN_GIAY.md): Kịch bản thuyết trình chi tiết 16 slide, phân công lời thoại 4 diễn giả và ngân hàng câu hỏi phản biện Q&A.
   - [`docs/TIEU_LUAN_PHAN_TICH_HE_THONG.md`](docs/TIEU_LUAN_PHAN_TICH_HE_THONG.md): Tiểu luận nghiên cứu 4 nhiệm vụ theo chuẩn học thuật Tổ 4.

---

### 📌 Nguồn Dẫn Chứng Có Thật & Đường Link Xác Thực

- **Danh mục 50 số điện thoại lừa đảo cần chặn ngay**: [Cổng Thông tin Điện tử Xã Quảng Châu, Nghệ An](https://quangchau.nghean.gov.vn/tin-noi-bat/50-so-dien-thoai-tuyet-doi-khong-nen-nghe-chan-ngay-khi-nhan-duoc-cuoc-goi-950942?pageindex=0)
- **Cảnh báo lừa đảo thu học phí & chỗ ở sinh viên**: [Báo Điện tử Chính phủ (baochinhphu.vn)](https://baochinhphu.vn/lua-dao-sinh-vien-chuyen-tien-dang-ky-cho-o-ky-tuc-xa-10224081107491905.htm)
- **Chiến dịch Nhận diện lừa đảo trực tuyến quốc gia**: [Báo Điện tử Chính phủ (baochinhphu.vn)](https://baochinhphu.vn/chien-dich-nhan-dien-lua-dao-truc-tuyen-102240717152259919.htm)
- **Bóc trần chiêu lừa đảo mới nhắm vào sinh viên**: [Báo Tuổi Trẻ Online (tuoitre.vn)](https://tuoitre.vn/chieu-lua-dao-moi-nham-vao-sinh-vien-cu-nguoi-den-tan-noi-nhan-tien-100260913131739695.htm)
- **Thống kê người trẻ đối mặt lừa đảo mạng**: [Báo Tiền Phong](https://tienphong.vn) & [Dự án Chống Lừa Đảo (chongluadao.vn)](https://chongluadao.vn)
