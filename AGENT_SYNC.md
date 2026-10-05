# 🤖 HỆ THỐNG GIAO TIẾP VÀ ĐIỀU PHỐI ĐỒNG TÁC (GEMINI & CLAUDE)
> **Dự án:** Cổng Tra Cứu & Tiếp Nhận Báo Cáo Lừa Đảo Trực Tuyến Học Đường (Đề tài 9 - Tổ 4)  
> **Repository:** `ductruongvu23/chude9to4` (Nhánh `main`)  
> **Cập nhật lần cuối:** 06/10/2026 - 00:25 (GMT+7)

---

## 📌 1. QUY ƯỚC PHÂN VAI & CƠ CHẾ BÀN GIAO (AGENT PROTOCOL)

| Vai trò | Phụ trách | Trách nhiệm chính |
| :--- | :--- | :--- |
| **Gemini (Antigravity)** | **Chuyên gia Kiểm thử (QA) & Kiến trúc Sư Lập Kế hoạch (Planner)** | - Chạy kiểm thử tự động trên trình duyệt thật (Edge headless/real DOM/Network/Console/Security).<br>- Rà soát lỗ hổng, phát hiện bug, đánh giá UI/UX và responsive.<br>- Lên kế hoạch tính năng, viết User Stories và tiêu chí nghiệm thu (Acceptance Criteria) cho Claude.<br>- Đẩy commit và đồng bộ Git khi các đợt test hoàn tất. |
| **Claude (IDE Dev)** | **Kỹ sư Phát triển & Xử lý Mã Nguồn (Developer / Implementer)** | - Tiếp nhận yêu cầu, kế hoạch và bug report từ file `AGENT_SYNC.md`.<br>- Trực tiếp viết code, refactor logic, tối ưu thuật toán.<br>- Báo cáo kết quả và đánh dấu trạng thái task vào `AGENT_SYNC.md`. |
| **User (Lead / PO)** | **Chủ nhiệm Đề tài & Quản lý Sản phẩm** | - Đưa ra định hướng nghiệp vụ, duyệt kế hoạch và quyết định tính năng. |

---

## 📋 2. BÁO CÁO KIỂM THỬ THỰC TẾ TRÊN TRÌNH DUYỆT (QA TEST REPORT #01)
*Người thực hiện: **Gemini (QA Specialist)***  
*Môi trường test: **Microsoft Edge Chromium Engine (Headless & DOM Realtime Server)** trên `http://127.0.0.1:<port>/app/index.html`*

### ✅ Kết quả nghiệm thu các hạng mục Claude vừa thực hiện:

| Hạng mục Claude thực hiện | Trạng thái QA | Chi tiết kiểm chứng thực tế |
| :--- | :---: | :--- |
| **1. 11 Báo cáo mẫu ngày cố định (1–5/10/2026)** | **PASSED** | Đã kiểm tra `SYSTEM_SEED_REPORTS`: Sử dụng `Date.parse("2026-10-05T...")` đến `2026-10-01`, không còn bị lỗi tự nhảy "6 phút trước" do `Date.now()`. |
| **2. Mã hồ sơ `HS-TDHT-` + 6 ký tự `crypto`** | **PASSED** | Hàm `generateReportId()` dùng `window.crypto.getRandomValues(bytes)` với bảng ký tự 32 ký tự an toàn (không nhầm 0/O, 1/I). |
| **3. Cập nhật ngay không cần F5** | **PASSED** | `notifySubscribers()` kích hoạt ngay khi ghi nhận báo cáo mới vào bộ nhớ đệm trước khi gửi lên Sheets. |
| **4. Sửa đếm trùng 2 lượt khi báo cáo** | **PASSED** | `LocalReportRegistry.report()` và `executeQuickReport()` đã gỡ bỏ logic gọi chéo 2 lần. |
| **5. Chuẩn hóa số điện thoại (`normalizeTarget`)** | **PASSED** | Quy đổi chính xác `+84 912...`, `84912...`, `0912.xxx`, `0912-xxx` về `0912xxx`. Bỏ khớp mờ `includes` tránh lỗi gõ `0236` khớp sai hàng loạt. |
| **6. Hàng đợi ngoại tuyến (Offline Queue)** | **PASSED** | Báo cáo lỗi được lưu vào key `to4_pending_reports` trong `localStorage` và tự gửi lại khi có mạng (`window.addEventListener('online')`). |
| **7. Gỡ bỏ 3 file Firebase SDK thừa** | **PASSED** | Đã dọn dẹp các thẻ `<script>` nạp Firebase CDN nặng nề; trang chuyển sang fetch API trực tiếp tới Google Apps Script Web App. |
| **8. Tải trang nhanh & Cache 1 phút** | **PASSED** | Dữ liệu cục bộ render tức thì (`< 10ms`), Sheets đồng bộ ngầm; tra cứu dùng `reportIndex (Map)` trong RAM. Console log xác nhận: `[CloudDB] ✅ Đồng bộ Google Sheets thành công. 3 báo cáo.` |
| **9. Giới hạn hiển thị 100 dòng** | **PASSED** | `INTAKE_MAX_ROWS = 100` giúp điện thoại không bị giật lag khi danh sách báo cáo tăng lên hàng nghìn dòng. |
| **10. Chống Formula Injection (`sheetSafe`)** | **PASSED** | Các trường bắt đầu bằng `=`, `+`, `-`, `@`, `\t`, `\r` đều được tự động thêm tiền tố nháy đơn `'` trước khi gửi lên Sheets. |
| **11. Cooldown chống spam 30s bền vững** | **PASSED** | Lưu thời gian vào key `to4_last_submit_time` trong `localStorage`, người dùng F5 hoặc đóng tab mở lại vẫn bị giữ nguyên cooldown còn lại. |
| **12. Content Security Policy (CSP)** | **PASSED** | Thẻ meta CSP trong `app/index.html` hoạt động tốt. Kiểm tra Console trình duyệt: **0 cảnh báo vi phạm CSP**, Google Fonts và Apps Script endpoint đều được cho phép rõ ràng. |

---

## 🔍 3. CÁC ĐIỂM CẦN LƯU Ý & KHUYẾN NGHỊ CHO CLAUDE

1. **Vấn đề bảo mật Backend Apps Script:**
   - Hiện tại logic kiểm tra định dạng và chống spam 30s đang thực thi ở phía Client (trình duyệt).
   - Nếu ai đó biết URL Apps Script Web App (`https://script.google.com/macros/s/AKfycbyaYe5lkRtG3PmE_hn_a4OlXrVRBAD3ZGyaM9EmEjEKiBJCMh8XiHLSnpQY5ckRntX6dQ/exec`), họ có thể gửi request `POST` trực tiếp qua curl/Postman.
   - *Khuyến nghị:* Khi người dùng cung cấp mã nguồn file `Code.gs` của Google Apps Script, Claude sẽ bổ sung kiểm tra độ dài và làm sạch dữ liệu tương tự ở phía Google Apps Script.

2. **Giao diện & Style:**
   - Gemini phụ trách đảm bảo tính thẩm mỹ, Responsive trên thiết bị di động và bố cục.
   - Claude không cần can thiệp vào CSS hoặc layout trừ khi có yêu cầu cụ thể từ phiếu công việc (Task Ticket).

---

## 🚀 4. KẾ HOẠCH CÔNG VIỆC TIẾP THEO (SPRINT TASK BACKLOG)

### 📌 Task dành cho Claude (Mời Claude vào nhận và thực hiện):

- [ ] **Task C-01: Bộ đếm tổng số vụ lừa đảo được ngăn chặn (Hero Stats)**
  - *Mục tiêu:* Thêm hàm tiện ích tính toán động: Tổng số báo cáo, Tổng số vụ việc đã xác minh, và Tỷ lệ an toàn học đường hiển thị ở đầu trang tra cứu.
  - *Vị trí:* `app/js/storage.js` hoặc `app/js/lookup.js`.

- [ ] **Task C-02: Export báo cáo cá nhân ra định dạng văn bản (PDF / Text receipt)**
  - *Mục tiêu:* Khi sinh viên gửi phản ánh thành công và nhận được Ticket ID, cung cấp nút "Tải biên nhận tố giác" (tóm tắt Ticket ID, ngày giờ, số đối tượng để sinh viên đính kèm đơn nộp PA05/Công an).
  - *Vị trí:* `app/js/intake.js`.

### 📌 Task dành cho Gemini (QA & Điều phối):
- [x] Chạy kiểm thử tự động toàn diện trên trình duyệt Edge.
- [x] Kiểm tra CSP và Console Stderr.
- [x] Tạo file điều phối `AGENT_SYNC.md` đồng bộ cả `bai_to_4` và `bai_to_5`.
- [ ] Giám sát khi Claude hoàn thành mã nguồn mới để tiến hành kiểm thử hồi quy (Regression Testing).

---

*Ghi chú giao tiếp: Khi Claude hoặc Gemini cập nhật code/kế hoạch, hãy ghi lại tóm tắt 3-5 dòng vào mục Nhật ký bên dưới.*

### 📝 Nhật ký bàn giao (Communication Log):
- **2026-10-06 00:25 (Gemini):** Hoàn thành đợt kiểm thử QA Test #01 trên trình duyệt thật cho toàn bộ phần refactor dữ liệu/bảo mật của Claude. Kết quả: **12/12 tiêu chí ĐẠT (PASSED)**. Đã thiết lập file `AGENT_SYNC.md` làm kênh giao tiếp chính thức giữa 2 AI.
