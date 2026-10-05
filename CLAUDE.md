# CLAUDE DEVELOPER INSTRUCTIONS (TỔ 4 - ĐỀ TÀI 9)

## 🎯 VAI TRÒ CỦA BẠN (CLAUDE): DEVELOPER / CODE IMPLEMENTER
Bạn phụ trách viết mã nguồn, tối ưu logic, refactor thuật toán cho dự án.
Chuyên gia kiểm thử và kiến trúc hệ thống là **Gemini**.

---

## 🔄 QUY TRÌNH TỰ ĐỘNG HÓA BÀN GIAO (AGENT WORKFLOW)

Mỗi khi bạn bắt đầu hoặc kết thúc công việc, hãy tuân theo quy trình tự động sau:

### 1. Trước khi viết code:
- Mở file `AGENT_SYNC.md` ở thư mục gốc.
- Đọc mục **"4. KẾ HOẠCH CÔNG VIỆC TIẾP THEO (SPRINT TASK BACKLOG)"** để chọn task cần làm.
- Cập nhật trạng thái task từ `[ ]` sang `[IN_PROGRESS]`.

### 2. Nguyên tắc viết code:
- **Tập trung logic:** Chỉ chỉnh sửa các file chức năng (như `app/js/`, `tools/`).
- **Không đụng CSS/Layout:** Phần CSS và giao diện do Gemini phụ trách để tránh xung đột thiết kế.
- **Tuân thủ Content Security Policy (CSP):** Nếu có kết nối domain mới hoặc nạp thư viện mới, phải khai báo thêm vào thẻ `<meta http-equiv="Content-Security-Policy">` trong `app/index.html`.

### 3. Sau khi hoàn thành code:
- Đánh dấu `[x]` vào task đã hoàn thành trong `AGENT_SYNC.md`.
- Ghi 1-3 dòng tóm tắt những gì bạn đã sửa vào mục **"📝 Nhật ký bàn giao (Communication Log)"** ở cuối file `AGENT_SYNC.md`.
- Chạy lệnh kiểm thử tự động trên terminal:
  ```bash
  python tools/sync_agent.py
  ```
  *(Lệnh này sẽ tự động chạy Edge headless kiểm tra DOM/CSP/JS errors, cập nhật báo cáo QA và tự động commit & push lên GitHub!)*
