# BÀI LÀM TỔ 4 • MÔN TƯ DUY HỆ THỐNG
## Đề Tài 9: Lừa Đảo Trực Tuyến Nhắm Vào Sinh Viên

Dự án nghiên cứu, slide trình chiếu và cổng dịch vụ tra cứu & tiếp nhận phản ánh lừa đảo trực tuyến dành cho sinh viên đại học dưới lăng kính **Lý thuyết Hệ thống (General Systems Theory - Chương 1)**: Mục tiêu hệ thống, Phân hệ, Độ bền liên kết, Tính nhất thể (Wholeness), Vòng phản hồi thích nghi (Feedback loop), và Yêu cầu chức năng/phi chức năng.

---

### 📦 Danh Mục Sản Phẩm Dự Án

Mở [`index.html`](index.html) (trang chủ) để truy cập nhanh cả hai sản phẩm.

1. **Slide thuyết trình — Bản 4 Modern Cyber Defense (14 slide, 16:9)**:
   - Trình chiếu: [`slides/index.html`](slides/index.html) — phím ← → chuyển slide, **F** toàn màn hình, **P** ghi chú người nói + đồng hồ.
   - Tải về: [`slides/Slide_To4_DeTai9.pdf`](slides/Slide_To4_DeTai9.pdf) • [`slides/Slide_To4_DeTai9.pptx`](slides/Slide_To4_DeTai9.pptx) (PowerPoint 13.333 × 7.5 in, kèm ghi chú người nói, mở được trên PowerPoint / Google Slides / Canva).
   - Sau khi sửa nội dung slide, xuất lại PPTX chỉnh sửa được bằng: `python tools/export_slides_editable.py` (cần Microsoft Edge, `python-pptx`, `Pillow`).

2. **Cổng Tra Cứu & Tiếp Nhận Phản Ánh Lừa Đảo (Web App)**:
   - Thư mục: [`app/`](app/) (mở [`app/index.html`](app/index.html)) • Online: [https://chude9to4.vercel.app/app/index.html](https://chude9to4.vercel.app/app/index.html)
   - **Tra cứu** SĐT, số tài khoản, email giả danh nhà trường (hỗ trợ `?q=<giá trị>` để tra thẳng từ trang chủ).
   - **Kiểm tra tin nhắn**: dán văn bản hoặc ảnh chụp màn hình để phát hiện dấu hiệu thao túng, xử lý ngay trên máy.
   - **Báo cáo lừa đảo**: gửi phản ánh ẩn danh, nhận mã hồ sơ `TK-2026-XXXX`, đồng bộ cảnh báo cho cộng đồng.

3. **Tài Liệu Hướng Dẫn & Nghiên Cứu Chuyên Sâu**:
   - [`docs/GIOI_THIEU_CONG_TRA_CUU_TO4.md`](docs/GIOI_THIEU_CONG_TRA_CUU_TO4.md): Tài liệu ngắn giới thiệu toàn diện Cổng Tra cứu & Tiếp nhận phản ánh, mã QR quét điện thoại, 4 tính năng cốt lõi và cam kết bảo mật Nghị định 13/2023.
   - [`docs/KICH_BAN_THUYET_TRINH_VA_BAN_GIAY.md`](docs/KICH_BAN_THUYET_TRINH_VA_BAN_GIAY.md): Kịch bản thuyết trình chi tiết, phân công lời thoại 4 diễn giả và ngân hàng câu hỏi phản biện Q&A.
   - [`docs/TIEU_LUAN_PHAN_TICH_HE_THONG.md`](docs/TIEU_LUAN_PHAN_TICH_HE_THONG.md): Tiểu luận nghiên cứu 4 nhiệm vụ theo chuẩn học thuật Tổ 4.

---

### 📌 Nguồn Dẫn Chứng Có Thật & Đường Link Xác Thực

- **Danh mục 50 số điện thoại lừa đảo cần chặn ngay**: [Cổng Thông tin Điện tử Xã Quảng Châu, Nghệ An](https://quangchau.nghean.gov.vn/tin-noi-bat/50-so-dien-thoai-tuyet-doi-khong-nen-nghe-chan-ngay-khi-nhan-duoc-cuoc-goi-950942?pageindex=0)
- **Cảnh báo lừa đảo thu học phí & chỗ ở sinh viên**: [Báo Điện tử Chính phủ (baochinhphu.vn)](https://baochinhphu.vn/lua-dao-sinh-vien-chuyen-tien-dang-ky-cho-o-ky-tuc-xa-10224081107491905.htm)
- **Chiến dịch Nhận diện lừa đảo trực tuyến quốc gia**: [Báo Điện tử Chính phủ (baochinhphu.vn)](https://baochinhphu.vn/chien-dich-nhan-dien-lua-dao-truc-tuyen-102240717152259919.htm)
- **Bóc trần chiêu lừa đảo mới nhắm vào sinh viên**: [Báo Tuổi Trẻ Online (tuoitre.vn)](https://tuoitre.vn/chieu-lua-dao-moi-nham-vao-sinh-vien-cu-nguoi-den-tan-noi-nhan-tien-100260913131739695.htm)
- **Thống kê người trẻ đối mặt lừa đảo mạng**: [Báo Tiền Phong](https://tienphong.vn) & [Dự án Chống Lừa Đảo (chongluadao.vn)](https://chongluadao.vn)
