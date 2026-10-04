// ===================================================================
// CỔNG TRA CỨU & TIẾP NHẬN PHẢN ÁNH LỪA ĐẢO HỌC ĐƯỜNG
// Bài làm Tổ 4 - Môn Tư duy hệ thống
// ===================================================================

let currentTab = 'lookup';
let currentLookupMode = 'phone';
let callTimerInterval = null;
let callSeconds = 0;
let intakeReportsList = [...COMMUNITY_REPORTS];

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initIntakeRegistry();
  loadPhonePreset('0981234567');
  loadEmailPreset('daotao.dhqg.edu.vn@gmail.com');
  loadMessagePreset(0);
  setSystemMode('broken');

  // Char counter for message
  const msgInput = document.getElementById('messageInput');
  if (msgInput) {
    msgInput.addEventListener('input', () => {
      document.getElementById('charCount').textContent = `${msgInput.value.length} ký tự`;
    });
  }
});

// ===================================================================
// TAB SWITCHING
// ===================================================================
function switchTab(tabId) {
  currentTab = tabId;
  
  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId));
  if (activeBtn) activeBtn.classList.add('active');

  // Tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
  const targetPane = document.getElementById(`tab-${tabId}`);
  if (targetPane) targetPane.classList.add('active');
}

// Sub-tab switch (SĐT vs Email)
function switchLookupMode(mode) {
  currentLookupMode = mode;
  document.getElementById('subBtnPhone').classList.toggle('active', mode === 'phone');
  document.getElementById('subBtnEmail').classList.toggle('active', mode === 'email');

  document.getElementById('viewLookupPhone').classList.toggle('active', mode === 'phone');
  document.getElementById('viewLookupEmail').classList.toggle('active', mode === 'email');
}

// ===================================================================
// TAB 1.1: TRA CỨU SỐ ĐIỆN THOẠI
// ===================================================================
function loadPhonePreset(phone) {
  document.getElementById('phoneInput').value = phone;
  analyzePhone();
}

function analyzePhone() {
  const phone = document.getElementById('phoneInput').value.trim();
  const container = document.getElementById('phoneResultContainer');

  if (!phone) {
    alert('Vui lòng nhập số điện thoại cần tra cứu!');
    return;
  }

  let data = PHONE_DATABASE[phone];
  
  if (!data) {
    const isUnknownSpam = phone.startsWith('024') || phone.startsWith('028') || phone.startsWith('08') || phone.startsWith('+');
    data = {
      number: phone,
      carrier: "Thuê bao di động chưa định danh chính chủ",
      location: "Không xác định vị trí đăng ký",
      riskScore: isUnknownSpam ? 75 : 30,
      status: isUnknownSpam ? "DANGEROUS" : "SUSPICIOUS",
      statusText: isUnknownSpam ? "CẢNH BÁO: ĐẦU SỐ CÓ NGUY CƠ CAO (CHƯA ĐƯỢC XÁC THỰC)" : "MỨC ĐỘ TRUNG BÌNH: CHƯA CÓ TRONG DANH BẠ TIN CẬY",
      reportsCount: isUnknownSpam ? 18 : 2,
      threatType: isUnknownSpam ? "Số lạ gọi ngoài giờ hành chính / Tiếp thị rác" : "Chưa có báo cáo vi phạm nghiêm trọng",
      tags: isUnknownSpam ? ["Số lạ chưa xác minh", "Cần cảnh giác", "Không cung cấp mã OTP"] : ["Số mới"],
      verifiedBy: ["Hệ thống giám sát OSINT thời gian thực - Tổ 4"],
      history: [
        { date: "Mới nhất", note: "Hệ thống tự động kích hoạt truy vấn dữ liệu từ các diễn đàn cảnh báo." }
      ]
    };
  }

  const isDanger = data.riskScore >= 70;
  const isSafe = data.riskScore <= 10;
  const badgeClass = isDanger ? 'danger' : (isSafe ? 'safe' : 'warning');
  const iconEmoji = isDanger ? '🚨' : (isSafe ? '🛡️' : '⚠️');

  let historyHtml = data.history.map(item => `
    <div class="history-item">
      <span>${item.note}</span>
      <span class="history-date">${item.date}</span>
    </div>
  `).join('');

  let tagsHtml = data.tags.map(t => `<span class="tag-badge"># ${t}</span>`).join('');
  let verifiedHtml = data.verifiedBy.map(v => `<span class="tag-badge">✓ ${v}</span>`).join('');

  container.innerHTML = `
    <div class="phone-threat-header">
      <div class="threat-main-info">
        <div class="threat-icon-large">${iconEmoji}</div>
        <div>
          <div class="threat-num">${data.number}</div>
          <span class="threat-status-badge ${badgeClass}">${data.statusText}</span>
        </div>
      </div>

      <div class="trust-gauge-box">
        <div class="gauge-circle ${badgeClass}">${data.riskScore}%</div>
        <span class="gauge-label">Chỉ số rủi ro</span>
      </div>
    </div>

    <div class="osint-meta-grid">
      <div class="osint-card">
        <span class="osint-card-label">Hạ tầng mạng / Định tuyến:</span>
        <span class="osint-card-val">${data.carrier}</span>
      </div>
      <div class="osint-card">
        <span class="osint-card-label">Vị trí & Nguồn gốc SIM:</span>
        <span class="osint-card-val">${data.location}</span>
      </div>
      <div class="osint-card">
        <span class="osint-card-label">Báo cáo từ sinh viên:</span>
        <span class="osint-card-val"><strong>${data.reportsCount}</strong> lượt tiếp nhận vi phạm</span>
      </div>
    </div>

    <div class="osint-card">
      <span class="osint-card-label">Phân loại thủ đoạn tội phạm:</span>
      <span class="osint-card-val" style="color: ${isDanger ? 'var(--accent-red)' : 'var(--accent-green)'};">
        ${data.threatType}
      </span>
      <div class="tags-row" style="margin-top: 8px;">${tagsHtml}</div>
    </div>

    <div class="threat-history">
      <span class="osint-card-label">Nhật ký dữ liệu mở (OSINT Telemetry):</span>
      ${historyHtml}
    </div>

    <div class="tags-row" style="margin-top: 10px;">
      <span style="font-size: 0.75rem; color: var(--text-dim); margin-right: 6px;">Nguồn kiểm chứng:</span>
      ${verifiedHtml}
    </div>

    ${isDanger ? `
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <button class="btn-primary" style="background: var(--accent-red); color: #fff;" onclick="quickReportFromPhone('${data.number}')">
          📝 Đẩy Sang Hồ Sơ Tiếp Nhận
        </button>
        <button class="btn-secondary" onclick="alert('Đã thêm số ${data.number} vào danh sách CHẶN TỰ ĐỘNG trên máy!')">
          🚫 Chặn Số Này Ngay
        </button>
      </div>
    ` : ''}
  `;
}

// ===================================================================
// TAB 1.2: TRA CỨU ĐỊA CHỈ EMAIL
// ===================================================================
function loadEmailPreset(email) {
  document.getElementById('emailInput').value = email;
  analyzeEmail();
}

function analyzeEmail() {
  const email = document.getElementById('emailInput').value.trim();
  const container = document.getElementById('emailResultContainer');

  if (!email) {
    alert('Vui lòng nhập địa chỉ email cần kiểm tra!');
    return;
  }

  let data = EMAIL_DATABASE[email];

  if (!data) {
    const isPublicDomain = email.endsWith('@gmail.com') || email.endsWith('@outlook.com') || email.endsWith('@yahoo.com') || email.endsWith('@hotmail.com');
    const hasEduName = email.includes('daotao') || email.includes('hocphi') || email.includes('sinhvien') || email.includes('tuyensinh') || email.includes('vnu') || email.includes('hust');

    if (isPublicDomain && hasEduName) {
      data = {
        email: email,
        domain: "Email dịch vụ công cộng giả mạo danh nghĩa trường học",
        riskScore: 95,
        status: "DANGEROUS",
        statusText: "BÁO ĐỘNG ĐỎ: ĐỊA CHỈ EMAIL CÓ DẤU HIỆU GIẢ DANH CƠ SỞ ĐÀO TẠO",
        reportsCount: 12,
        threatType: "Mạo danh phòng ban đào tạo / kế toán của nhà trường",
        tags: ["Đuôi Gmail/Outlook miễn phí", "Mạo danh tên trường", "Cảnh báo Phishing"],
        warningReason: "Tất cả các thông báo chính thức của trường đều gửi từ tên miền nội bộ (ví dụ: @edu.vn). Nhà trường KHÔNG BAO GIỜ dùng hòm thư miễn phí."
      };
    } else {
      data = {
        email: email,
        domain: "Hòm thư chưa có trong cơ sở dữ liệu xác thực",
        riskScore: 40,
        status: "SUSPICIOUS",
        statusText: "CẦN LƯU Ý: ĐỊA CHỈ EMAIL LẠ (CHƯA XÁC THỰC DANH TÍNH)",
        reportsCount: 1,
        threatType: "Chưa rõ nguồn gốc người gửi",
        tags: ["Email ngoài danh bạ"],
        warningReason: "Không bấm vào đường link hoặc file đính kèm lạ (PDF, ZIP, DOCX) gửi từ địa chỉ này."
      };
    }
  }

  const isDanger = data.riskScore >= 70;
  const isSafe = data.riskScore <= 10;
  const badgeClass = isDanger ? 'danger' : (isSafe ? 'safe' : 'warning');
  const iconEmoji = isDanger ? '🚨' : (isSafe ? '🛡️' : '⚠️');

  let tagsHtml = data.tags.map(t => `<span class="tag-badge"># ${t}</span>`).join('');

  container.innerHTML = `
    <div class="phone-threat-header">
      <div class="threat-main-info">
        <div class="threat-icon-large">${iconEmoji}</div>
        <div>
          <div class="threat-num" style="font-size: 1.25rem;">${data.email}</div>
          <span class="threat-status-badge ${badgeClass}">${data.statusText}</span>
        </div>
      </div>

      <div class="trust-gauge-box">
        <div class="gauge-circle ${badgeClass}">${data.riskScore}%</div>
        <span class="gauge-label">Chỉ số rủi ro</span>
      </div>
    </div>

    <div class="osint-meta-grid">
      <div class="osint-card">
        <span class="osint-card-label">Phân tích Tên miền (Domain Analysis):</span>
        <span class="osint-card-val">${data.domain}</span>
      </div>
      <div class="osint-card">
        <span class="osint-card-label">Phân loại nguy cơ:</span>
        <span class="osint-card-val" style="color: ${isDanger ? 'var(--accent-red)' : 'var(--accent-green)'};">
          ${data.threatType}
        </span>
      </div>
      <div class="osint-card">
        <span class="osint-card-label">Báo cáo cộng đồng:</span>
        <span class="osint-card-val"><strong>${data.reportsCount}</strong> lượt phản ánh</span>
      </div>
    </div>

    <div class="osint-card" style="border-left: 4px solid ${isDanger ? 'var(--accent-red)' : 'var(--accent-green)'};">
      <span class="osint-card-label">Khuyến cáo an toàn từ Tổ 4:</span>
      <p style="font-size: 0.9rem; color: var(--text-main); margin-top: 4px; line-height: 1.5;">
        ${data.warningReason}
      </p>
      <div class="tags-row" style="margin-top: 10px;">${tagsHtml}</div>
    </div>

    ${isDanger ? `
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <button class="btn-primary" style="background: var(--accent-red); color: #fff;" onclick="quickReportFromEmail('${data.email}')">
          📝 Đưa Vào Hồ Sơ Tiếp Nhận Ngay
        </button>
      </div>
    ` : ''}
  `;
}

function quickReportFromPhone(phone) {
  switchTab('intake');
  document.getElementById('intakeTargetType').value = 'phone';
  document.getElementById('intakeTargetVal').value = phone;
  document.getElementById('intakeType').value = 'Mạo danh thu học phí';
}

function quickReportFromEmail(email) {
  switchTab('intake');
  document.getElementById('intakeTargetType').value = 'email';
  document.getElementById('intakeTargetVal').value = email;
  document.getElementById('intakeType').value = 'Mạo danh thu học phí';
}

// ===================================================================
// TAB 2: CỔNG TIẾP NHẬN PHẢN ÁNH HỒ SƠ
// ===================================================================
function initIntakeRegistry() {
  renderIntakeList();
}

function renderIntakeList() {
  const container = document.getElementById('intakeRegistryList');
  document.getElementById('intakeBadgeCount').textContent = intakeReportsList.length;

  container.innerHTML = intakeReportsList.map(item => `
    <div class="feed-item-card">
      <div class="feed-top-row">
        <span class="feed-phone" style="font-size: 0.92rem;">📁 [${item.id}] ${item.target}</span>
        <span class="feed-time">${item.time}</span>
      </div>
      <div style="display: flex; gap: 6px; margin: 4px 0;">
        <span class="feed-type-tag">${item.type}</span>
        <span class="tag-badge" style="color: var(--accent-green); border-color: var(--accent-green);">${item.status}</span>
      </div>
      <div class="feed-meta">Người phản ánh: <strong>${item.reporter}</strong></div>
    </div>
  `).join('');
}

function handleIntakeSubmit(e) {
  e.preventDefault();
  const targetVal = document.getElementById('intakeTargetVal').value.trim();
  const targetType = document.getElementById('intakeTargetType').value;
  const intakeType = document.getElementById('intakeType').value;
  const sender = document.getElementById('intakeSender').value.trim();
  const money = document.getElementById('intakeMoney').value.trim();
  const note = document.getElementById('intakeNote').value.trim();

  if (!targetVal || !sender || !note) {
    alert('Vui lòng điền đủ các mục bắt buộc!');
    return;
  }

  // Generate unique Ticket ID
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const ticketId = `HS-TDHT-${randomNum}`;

  const newRecord = {
    id: ticketId,
    target: targetVal,
    type: intakeType,
    reporter: sender,
    time: "Vừa tiếp nhận",
    status: "Đã đưa vào Blacklist"
  };

  intakeReportsList.unshift(newRecord);
  renderIntakeList();

  // Reset form
  document.getElementById('intakeForm').reset();

  alert(`✅ TIẾP NHẬN HỒ SƠ THÀNH CÔNG!\n\nMã hồ sơ tiếp nhận: ${ticketId}\nĐối tượng: ${targetVal}\nTrạng thái: Đã cập nhật cảnh báo vào toàn bộ hệ thống phòng vệ của Tổ 4.`);
}

// ===================================================================
// TAB 3: NLP MESSAGE ANALYZER
// ===================================================================
function loadMessagePreset(index) {
  const preset = PRESET_MESSAGES[index];
  if (!preset) return;

  const msgInput = document.getElementById('messageInput');
  msgInput.value = preset.content;
  document.getElementById('charCount').textContent = `${preset.content.length} ký tự`;
  analyzeMessage();
}

function clearMessage() {
  document.getElementById('messageInput').value = '';
  document.getElementById('charCount').textContent = '0 ký tự';
  document.getElementById('messageResultContainer').innerHTML = '';
}

function analyzeMessage() {
  const content = document.getElementById('messageInput').value.trim();
  const container = document.getElementById('messageResultContainer');

  if (!content) {
    alert('Vui lòng nhập hoặc chọn nội dung tin nhắn!');
    return;
  }

  const lower = content.toLowerCase();
  let riskScore = 15;
  let traps = [];
  let detectedEntities = [];
  let actions = [];

  if (lower.includes('hoc phi') || lower.includes('học phí') || lower.includes('xoa ten') || lower.includes('xóa tên') || lower.includes('thu quy') || lower.includes('thủ quỹ')) {
    riskScore += 80;
    traps.push({
      name: "Tạo áp lực thời gian khẩn cấp (Urgency Manipulation)",
      desc: "Kẻ lừa đảo dọa 'hủy mã sinh viên' hoặc 'xóa tên khỏi lớp' trong thời gian ngắn (trước 11h30) để khiến nạn nhân hoảng loạn, không kịp kiểm chứng."
    });
    traps.push({
      name: "Mạo danh cơ sở giáo dục (Academic Impersonation)",
      desc: "Sử dụng từ ngữ hành chính, xưng danh phòng kế toán nhưng lại cung cấp số tài khoản cá nhân để thu tiền."
    });
    detectedEntities.push("STK cá nhân nghi vấn: 1903456789123 (Techcombank - Tran Thi Thu Quy)");
    actions.push("TUYỆT ĐỐI KHÔNG chuyển tiền vào bất kỳ số tài khoản cá nhân nào.");
    actions.push("Nhà trường CHỈ thu học phí qua Cổng thanh toán tích hợp trực tiếp trong Portal sinh viên.");
    actions.push("Liên hệ ngay Phòng Quản lý Đào tạo trường qua hotline chính thức để đối chiếu.");
  }

  if (lower.includes('viec nhe') || lower.includes('việc nhẹ') || lower.includes('300k') || lower.includes('500k') || lower.includes('hoa hong') || lower.includes('hoa hồng') || lower.includes('telegram') || lower.includes('tiktok') || lower.includes('shopee')) {
    riskScore += 75;
    traps.push({
      name: "Mồi câu hoa hồng bất thường (Greed Trigger)",
      desc: "Hứa hẹn mức thu nhập 300k - 800k/ngày cho các công việc đơn giản như xem video, giật đơn hàng online."
    });
    traps.push({
      name: "Dẫn dụ vào kênh liên lạc ẩn danh (Telegram Trap)",
      desc: "Kéo nạn nhân ra khỏi các nền tảng kiểm soát chính thống để vào nhóm kín Telegram tự hủy tin nhắn."
    });
    detectedEntities.push("Đường link Telegram nghi vấn: t.me/tuyendung_tiktok_vietnam_vip");
    actions.push("Không tham gia các hội nhóm Telegram/Zalo tuyển dụng không có tư cách pháp nhân.");
    actions.push("Cảnh giác chiêu trò ban đầu trả 50k thật để tạo lòng tin rồi sau đó ép nạp tiền làm nhiệm vụ lớn.");
  }

  if (lower.includes('canh sat') || lower.includes('cảnh sát') || lower.includes('cong an') || lower.includes('công an') || lower.includes('toa an') || lower.includes('tòa án') || lower.includes('lenh bat') || lower.includes('lệnh bắt') || lower.includes('ma tuy') || lower.includes('ma túy') || lower.includes('khong duoc tiet lo') || lower.includes('không được tiết lộ')) {
    riskScore += 82;
    traps.push({
      name: "Khủng bố tâm lý tột độ (Fear Intimidation)",
      desc: "Dọa nạt khởi tố, bắt giam, dính líu đến đường dây ma túy để làm nạn nhân mất hết khả năng phán đoán logic."
    });
    traps.push({
      name: "Kỹ thuật cô lập nạn nhân (Linkage Isolation)",
      desc: "Dặn dò 'Bí mật nghiệp vụ, cấm nói cho gia đình'. Mục tiêu là bẻ gãy liên kết phòng vệ giữa Sinh viên và Cha mẹ."
    });
    detectedEntities.push("Yêu cầu chuyển tiền vào 'Tài khoản giám sát tư pháp'");
    actions.push("Cơ quan Công an & Viện Kiểm sát KHÔNG BAO GIỜ làm việc hay tống đạt lệnh bắt qua điện thoại/Zalo.");
    actions.push("Công an KHÔNG CÓ 'Tài khoản tạm giữ' để yêu cầu người dân chuyển tiền chứng minh vô tội.");
    actions.push("Ngắt máy ngay và gọi điện cho bố mẹ hoặc báo cảnh sát khu vực.");
  }

  if (lower.includes('portal.edu.vn') && lower.includes('khong thu hoc phi qua tai khoan ca nhan')) {
    riskScore = 0;
    traps = [];
    detectedEntities.push("Kênh xác thực: https://portal.edu.vn");
    detectedEntities.push("Số điện thoại chính thức: (024) 3754 7547");
    actions.push("Thông báo chuẩn xác từ Nhà trường. Sinh viên thực hiện theo hướng dẫn trên Portal.");
  }

  if (riskScore > 98) riskScore = 98;
  const isHighDanger = riskScore >= 70;
  const isSafeMsg = riskScore <= 10;
  const badgeClass = isHighDanger ? 'danger' : (isSafeMsg ? 'safe' : 'warning');

  let trapsHtml = traps.length > 0 ? traps.map(t => `
    <div class="se-item">
      <strong>⚡ ${t.name}:</strong><br>
      <span>${t.desc}</span>
    </div>
  `).join('') : '<div style="color: var(--accent-green); font-size: 0.85rem;">✓ Không phát hiện dấu hiệu thao túng tâm lý.</div>';

  let entitiesHtml = detectedEntities.map(e => `<li style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px;">🔍 ${e}</li>`).join('');
  let actionsHtml = actions.map(a => `<li>${a}</li>`).join('');

  container.innerHTML = `
    <div class="phone-threat-header">
      <div>
        <h3 style="font-size: 1.15rem; color: var(--text-main);">Kết Quả Phân Tích Ngữ Nghĩa NLP (Tổ 4 AI Engine)</h3>
        <span class="threat-status-badge ${badgeClass}">
          ${isHighDanger ? 'BÁO ĐỘNG ĐỎ: PHÁT HIỆN DẤU HIỆU LỪA ĐẢO TỐI ĐA' : (isSafeMsg ? 'XÁC THỰC: TIN NHẮN AN TOÀN CHÍNH THỐNG' : 'CẢNH BÁO: CÓ DẤU HIỆU ĐÁNG NGỜ')}
        </span>
      </div>

      <div class="trust-gauge-box">
        <div class="gauge-circle ${badgeClass}">${riskScore}%</div>
        <span class="gauge-label">Xác suất rủi ro</span>
      </div>
    </div>

    <div class="nlp-analysis-grid">
      <div class="nlp-card">
        <div class="nlp-card-title ${isHighDanger ? 'danger' : ''}">Bóc Tách Thủ Đoạn Thao Túng Tâm Lý:</div>
        <div class="social-eng-list">
          ${trapsHtml}
        </div>
      </div>

      <div class="nlp-card">
        <div class="nlp-card-title">Thực Thể Rủi Cao Nhận Diện Được:</div>
        <ul style="padding-left: 18px; line-height: 1.5;">
          ${entitiesHtml}
        </ul>
      </div>
    </div>

    <div class="action-guidance-box">
      <div class="guidance-title">🛡️ Khuyến Nghị Hành Động Theo Tư Duy Hệ Thống:</div>
      <ol class="guidance-steps">
        ${actionsHtml}
      </ol>
    </div>
  `;
}

// ===================================================================
// TAB 4: DEEPFAKE VIDEO CALL SIMULATOR
// ===================================================================
function acceptCall() {
  document.getElementById('callIncomingState').style.display = 'none';
  document.getElementById('callActiveState').style.display = 'flex';
  
  callSeconds = 0;
  clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    callSeconds++;
    const mins = Math.floor(callSeconds / 60);
    const secs = callSeconds % 60;
    document.getElementById('callLiveTimer').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, 1000);
}

function resetCall() {
  clearInterval(callTimerInterval);
  callSeconds = 0;
  document.getElementById('callIncomingState').style.display = 'flex';
  document.getElementById('callActiveState').style.display = 'none';
}

// ===================================================================
// TAB 5: SYSTEM DEFENSE VISUALIZER (TƯ DUY HỆ THỐNG - TỔ 4)
// ===================================================================
function setSystemMode(mode) {
  const btnBroken = document.getElementById('btnModeBroken');
  const btnUnified = document.getElementById('btnModeUnified');
  const centralHub = document.getElementById('centralHub');
  const threatActor = document.getElementById('threatActor');
  const threatDesc = document.getElementById('threatDesc');
  const studentState = document.getElementById('studentStateBadge');
  const explanation = document.getElementById('systemExplanation');

  if (mode === 'broken') {
    btnBroken.classList.add('active');
    btnUnified.classList.remove('active');
    centralHub.classList.remove('active');

    threatActor.style.borderColor = 'var(--accent-red)';
    threatDesc.innerHTML = '⚡ Khai thác khoảng trống liên kết! Sinh viên bị cô lập!';
    studentState.innerHTML = '⚠️ Bị cô lập tâm lý • Sập bẫy';
    studentState.style.color = 'var(--accent-red)';

    explanation.innerHTML = `
      <strong style="color: var(--accent-red); font-size: 1.05rem;">HIỆN TRẠNG: HỆ THỐNG RỜI RẠC • THIẾU TÍNH NHẤT THỂ (WHOLENESS GAP)</strong><br>
      - <strong>Sinh viên $\\leftrightarrow$ Gia đình:</strong> Bị bẻ gãy do tâm lý sợ bị mắng và khoảng cách địa lý.<br>
      - <strong>Sinh viên $\\leftrightarrow$ Nhà trường:</strong> Kênh thông tin hành chính 1 chiều, chậm phản hồi khi có tình huống gấp ngoài giờ.<br>
      - <strong>Ngân hàng $\\leftrightarrow$ Công an:</strong> Độ trễ hành chính nhiều ngày trong khi dòng tiền bị tẩu tán trong 3 phút.<br>
      👉 <strong>Hậu quả:</strong> Từng bên cảnh báo đơn lẻ trở thành "tiếng ồn vô nghĩa". Kẻ lừa đảo tấn công thẳng vào khoảng trống không ai bảo vệ.
    `;
  } else {
    btnUnified.classList.add('active');
    btnBroken.classList.remove('active');
    centralHub.classList.add('active');

    threatActor.style.borderColor = 'var(--border-color)';
    threatDesc.innerHTML = '🛡️ Bị vô hiệu hóa bởi màng lọc liên thông!';
    studentState.innerHTML = '🛡️ Được bảo vệ 24/7 • Phản xạ nhanh';
    studentState.style.color = 'var(--accent-green)';

    explanation.innerHTML = `
      <strong style="color: var(--accent-green); font-size: 1.05rem;">GIẢI PHÁP: TÍNH NHẤT THỂ ĐƯỢC TÁI LẬP NHỜ CỔNG TIẾP NHẬN & TRA CỨU TỔ 4</strong><br>
      - <strong>Dữ liệu liên thông thời gian thực:</strong> Số điện thoại nghi vấn, email giả mạo và tài khoản học phí được đối soát chéo với Nhà trường và Ngân hàng ngay tức thì.<br>
      - <strong>Hàn gắn liên kết gia đình:</strong> Tính năng SOS 1 chạm gửi bằng chứng cho phụ huynh trước khi sinh viên bấm chuyển tiền.<br>
      - <strong>Đặc tính nảy sinh (Emergent Property):</strong> $1 + 1 > 2$. Cả hệ sinh thái 6 tác nhân cùng chia sẻ một lá chắn tự động thích nghi.
    `;
  }
}
