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

function initIntakeView() {
  console.log("[IntakeModule] Khởi tạo giao diện tiếp nhận phản ánh & kết nối Firebase...");

  // Đăng ký lắng nghe thời gian thực từ Firestore
  FirebaseService.subscribeToReports((reports) => {
    renderIntakeTable(reports);
  });

  // Kiểm tra nếu có cooldown đang dở dang
  checkAndResumeCooldown();
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

  container.innerHTML = reports.map(r => {
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
        <td><strong style="font-family: var(--font-mono); color: var(--primary);">${escapeHtml(r.id)}</strong></td>
        <td><code style="font-size: 0.85rem;">${escapeHtml(r.target)}</code></td>
        <td style="font-size: 0.82rem; max-width: 220px; white-space: normal;">${escapeHtml(r.scamType)}</td>
        <td><span class="${statusBadgeClass}">${escapeHtml(status)}</span></td>
        <td class="text-muted" style="font-size: 0.8rem; white-space: nowrap;">${relativeTime}</td>
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

  // Khóa nút tạm thời khi đang gửi
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳ Đang ghi nhận vào Cloud Firestore...</span>`;
  }

  try {
    const result = await FirebaseService.submitReport({
      target: target,
      scamType: scamType,
      content: content
    });

    // Reset form
    document.getElementById('intakeForm').reset();

    // Kích hoạt đồng hồ đếm ngược Cooldown 30s
    startCooldownTimer(30);

    // Thông báo thành công với Ticket ID được cấp
    alert(`✅ TIẾP NHẬN PHẢN ÁNH THÀNH CÔNG!\n\n` +
          `• Mã hồ sơ định danh: ${result.reportId}\n` +
          `• Đối tượng nghi vấn: ${result.target}\n` +
          `• Bảo mật: Đã xác thực ẩn danh 100% (Không lưu trữ danh tính cá nhân)\n` +
          `• Dữ liệu đã được đồng bộ tức thời vào Sổ tiếp nhận chung của cộng đồng.`);

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

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
