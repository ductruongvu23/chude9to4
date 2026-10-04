// ===================================================================
// INTAKE & REPORTING MODULE (TỔ 4)
// ===================================================================

function initIntakeView() {
  renderIntakeTable();
}

function renderIntakeTable() {
  const container = document.getElementById('intakeTableBody');
  const reports = getIntakeReports();

  if (!container) return;

  container.innerHTML = reports.map(r => `
    <tr>
      <td><strong>${r.id}</strong></td>
      <td><code>${r.target}</code></td>
      <td>${r.type}</td>
      <td><span class="badge-status-danger">${r.status}</span></td>
      <td class="text-muted">${r.time}</td>
    </tr>
  `).join('');
}

function handleIntakeFormSubmit(e) {
  e.preventDefault();
  const target = document.getElementById('intakeTarget').value.trim();
  const type = document.getElementById('intakeType').value;
  const note = document.getElementById('intakeNote').value.trim();

  if (!target || !note) {
    alert('Vui lòng nhập đối tượng nghi vấn và nội dung tóm tắt!');
    return;
  }

  const randomNum = Math.floor(100 + Math.random() * 900);
  const ticketId = `HS-TDHT-${randomNum}`;

  const newReport = {
    id: ticketId,
    target: target,
    type: type,
    time: "Vừa gửi",
    status: "Đã tiếp nhận vào Blacklist"
  };

  saveIntakeReport(newReport);
  renderIntakeTable();

  // Reset form
  document.getElementById('intakeForm').reset();

  alert(`✅ TIẾP NHẬN THÀNH CÔNG!\n\nMã hồ sơ tiếp nhận: ${ticketId}\nĐối tượng: ${target}\nĐã cập nhật vào cơ sở dữ liệu cảnh báo của Tổ 4.`);
}
