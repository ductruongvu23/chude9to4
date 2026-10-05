// ===================================================================
// INTAKE & REPORTING MODULE (STUDENT CYBERGUARD - TỔ 4)
// Tích hợp Firebase Cloud Firestore:
// 1. Ghi nhận phản ánh trực tiếp vào collection `reports`
// 2. Lắng nghe thời gian thực onSnapshot() không cần F5 trang
// 3. Hiển thị thời gian tương đối ("vừa xong", "x phút trước")
// 4. Rate-limiting chống spam (Khóa nút cooldown 30 giây)
// 5. Ẩn danh tuyệt đối 100% (Không thu thập họ tên, email cá nhân, IP)
// ===================================================================

let intakeCooldownInterval = null;
const INTAKE_MAX_ROWS = 100; // Giới hạn số dòng hiển thị để bảng render nhanh trên điện thoại
let lastSubmittedReceipt = null; // Hồ sơ vừa gửi, dùng để tạo biên nhận (Task C-02)

function initIntakeView() {
  console.log("[IntakeModule] Khởi tạo giao diện tiếp nhận phản ánh & kết nối Firebase...");

  // Đăng ký lắng nghe thời gian thực từ Firestore
  FirebaseService.subscribeToReports((reports) => {
    renderIntakeTable(reports);
  });

  // Kiểm tra nếu có cooldown đang dở dang
  checkAndResumeCooldown();

  const receiptBtn = document.getElementById('btnDownloadReceipt');
  if (receiptBtn) {
    receiptBtn.addEventListener('click', downloadIntakeReceipt);
  }
}

function renderIntakeTable(reports) {
  const container = document.getElementById('intakeTableBody');
  if (!container) return;

  if (!reports || reports.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-dim); padding: 24px;">
          <em>Hệ thống chưa ghi nhận phản ánh nào. Hãy là người đầu tiên báo cáo để bảo vệ cộng đồng sinh viên!</em>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = reports.slice(0, INTAKE_MAX_ROWS).map(r => {
    const status = r.status || "Đang xác minh";
    let statusBadgeClass = "badge-status-warning";
    if (status === "Cảnh báo cao") {
      statusBadgeClass = "badge-status-danger";
    } else if (status === "Đã xác minh") {
      statusBadgeClass = "badge-status-verified";
    }

    const relativeTime = FirebaseService.formatRelativeTime(r.createdAt);

    return `
      <tr>
        <td data-label="Mã hồ sơ:"><strong class="ticket-badge" style="color: var(--primary); white-space: nowrap;">${escapeHtml(r.id)}</strong></td>
        <td data-label="Đối tượng:"><code style="font-size: 0.88rem; word-break: break-all;">${escapeHtml(r.target)}</code></td>
        <td data-label="Thủ đoạn:" class="cell-scam-type"><span style="font-size: 0.85rem; line-height: 1.4;">${escapeHtml(r.scamType)}</span></td>
        <td data-label="Trạng thái:"><span class="${statusBadgeClass}">${escapeHtml(status)}</span></td>
        <td data-label="Thời gian:" class="text-muted"><span style="font-size: 0.82rem; white-space: nowrap;">${relativeTime}</span></td>
      </tr>
    `;
  }).join('');
}

async function handleIntakeFormSubmit(e) {
  e.preventDefault();

  const targetInput = document.getElementById('intakeTarget');
  const typeInput = document.getElementById('intakeType');
  const noteInput = document.getElementById('intakeNote');
  const submitBtn = document.querySelector('.btn-submit-intake');

  const target = targetInput.value.trim();
  const scamType = typeInput.value;
  const content = noteInput.value.trim();

  if (!target || !content) {
    alert('Vui lòng nhập đối tượng nghi vấn và nội dung tóm tắt vụ việc!');
    return;
  }

  if (!FirebaseService.canSubmit()) {
    const remaining = FirebaseService.getCooldownRemaining();
    alert(`⏳ Bạn đang gửi phản ánh quá nhanh!\nVui lòng chờ ${remaining} giây nữa trước khi gửi hồ sơ tiếp theo để hệ thống chống spam.`);
    return;
  }

  // Ẩn biên nhận của hồ sơ trước khi gửi hồ sơ mới
  setReceiptButtonVisible(false);

  // Khóa nút tạm thời khi đang gửi
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳ Đang ghi nhận vào hệ thống...</span>`;
  }

  try {
    const result = await FirebaseService.submitReport({
      target: target,
      scamType: scamType,
      content: content
    });

    // Reset form
    document.getElementById('intakeForm').reset();

    // Cho phép tải biên nhận của hồ sơ vừa gửi
    lastSubmittedReceipt = result;
    setReceiptButtonVisible(true);

    // Kích hoạt đồng hồ đếm ngược Cooldown 30s
    startCooldownTimer(30);

    // Thông báo thành công với Ticket ID được cấp
    alert(`✅ TIẾP NHẬN PHẢN ÁNH THÀNH CÔNG!\n\n` +
          `• Mã hồ sơ định danh: ${result.reportId}\n` +
          `• Đối tượng nghi vấn: ${result.target}\n` +
          `• Bảo mật: Đã xác thực ẩn danh 100% (Không lưu trữ danh tính cá nhân)\n` +
          (result.savedToCloud
            ? `• Dữ liệu đã được đồng bộ tức thời vào Sổ tiếp nhận chung của cộng đồng.`
            : `• Chưa kết nối được máy chủ: hồ sơ được lưu tạm trên máy và sẽ tự động gửi lại khi có mạng.`));

  } catch (err) {
    console.error("[IntakeModule] Lỗi gửi báo cáo:", err);
    alert(`❌ KHÔNG THỂ GỬI BÁO CÁO:\n${err.message}`);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `📥 Nộp Phản Ánh & Cấp Mã Hồ Sơ`;
    }
  }
}

function startCooldownTimer(seconds) {
  const submitBtn = document.querySelector('.btn-submit-intake');
  if (!submitBtn) return;

  if (intakeCooldownInterval) {
    clearInterval(intakeCooldownInterval);
  }

  submitBtn.disabled = true;

  const updateText = () => {
    const remaining = FirebaseService.getCooldownRemaining();
    if (remaining > 0) {
      submitBtn.innerHTML = `⏳ Vui lòng chờ (${remaining}s)...`;
    } else {
      clearInterval(intakeCooldownInterval);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `📥 Nộp Phản Ánh & Cấp Mã Hồ Sơ`;
    }
  };

  updateText();
  intakeCooldownInterval = setInterval(updateText, 1000);
}

function checkAndResumeCooldown() {
  const remaining = FirebaseService.getCooldownRemaining();
  if (remaining > 0) {
    startCooldownTimer(remaining);
  }
}

// ===================================================================
// BIÊN NHẬN TỐ GIÁC (Task C-02)
// Tạo file .txt tóm tắt hồ sơ để sinh viên đính kèm khi trình báo công an.
// Tạo hoàn toàn trên máy, không gửi dữ liệu đi đâu.
// ===================================================================
function setReceiptButtonVisible(visible) {
  const btn = document.getElementById('btnDownloadReceipt');
  if (btn) btn.style.display = visible ? '' : 'none';
}

function buildReceiptText(r) {
  const time = new Date(r.createdAt).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false
  });
  return [
    'BIÊN NHẬN TIẾP NHẬN PHẢN ÁNH LỪA ĐẢO TRỰC TUYẾN',
    'Cổng Tra Cứu & Tiếp Nhận Báo Cáo Lừa Đảo - Tổ 4 (Tư duy hệ thống)',
    '==============================================================',
    '',
    `Mã hồ sơ:            ${r.reportId}`,
    `Thời gian tiếp nhận: ${time} (GMT+7)`,
    `Đối tượng nghi vấn:  ${r.target}`,
    `Thủ đoạn:            ${r.scamType}`,
    `Trạng thái:          ${r.status}`,
    `Lưu trữ:             ${r.savedToCloud ? 'Đã đồng bộ lên hệ thống chung' : 'Lưu tạm trên thiết bị, sẽ tự gửi khi có mạng'}`,
    '',
    'Nội dung phản ánh:',
    r.content,
    '',
    '--------------------------------------------------------------',
    'LƯU Ý:',
    '- Đây là biên nhận của cổng thông tin sinh viên, KHÔNG phải văn bản',
    '  tiếp nhận tố giác của cơ quan công an.',
    '- Khi trình báo, hãy mang theo biên nhận này cùng bằng chứng gốc',
    '  (ảnh chụp tin nhắn, lịch sử cuộc gọi, sao kê chuyển khoản) đến',
    '  công an phường/xã nơi cư trú hoặc gọi 113 trong trường hợp khẩn cấp.',
    ''
  ].join('\r\n');
}

function downloadIntakeReceipt() {
  if (!lastSubmittedReceipt) return;
  // BOM để Notepad trên Windows hiển thị đúng tiếng Việt
  const blob = new Blob(['﻿' +buildReceiptText(lastSubmittedReceipt)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bien-nhan-${lastSubmittedReceipt.reportId}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
