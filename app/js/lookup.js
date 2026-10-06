// ===================================================================
// LOOKUP MODULE (SỐ ĐIỆN THOẠI & EMAIL) - TỔ 4 TƯ DUY HỆ THỐNG
// Giao diện tối giản - Tập trung mục đích chính - Tự động tăng % khả nghi khi bị báo cáo
// ===================================================================

let currentLookupData = null;

// ===================================================================
// HERO STATS (Task C-01): Tổng báo cáo / Đã xác minh / Tỷ lệ xử lý
// Tự cập nhật mỗi khi FirebaseService có dữ liệu mới
// ===================================================================
function initLookupStats() {
  FirebaseService.subscribeToReports(renderHeroStats);
  FirebaseService.subscribeToReports(renderScamBreakdown);
}

// ===================================================================
// RADAR - TỶ LỆ THỦ ĐOẠN TIẾP NHẬN (Task G-03)
// Tính từ báo cáo thật thay cho số liệu viết cứng trong HTML.
// Dựng bằng DOM + textContent (không innerHTML) vì scamType đến từ người dùng.
// ===================================================================
const SCAM_TYPE_ICONS = [
  [/việc làm|ctv|shopee|tiktok/i, '💼'],
  [/học phí|đào tạo|trường/i, '🏫'],
  [/công an|vneid|điều tra/i, '👮'],
  [/cấp cứu|bệnh viện|bác sĩ/i, '🏥'],
  [/thuế/i, '📱'],
  [/ngân hàng/i, '🏦'],
  [/điện lực|evn/i, '⚡'],
  [/shipper|giao hàng/i, '📦'],
  [/sim|viễn thông|thuê bao/i, '📶']
];
const BREAKDOWN_COLORS = ['danger', 'warning', 'amber', 'blue', 'blue'];

function renderScamBreakdown(reports) {
  const container = document.getElementById('scamTypeBreakdown');
  if (!container) return;

  const rows = FirebaseService.getScamTypeBreakdown(reports);
  container.textContent = '';

  if (rows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'breakdown-item';
    empty.textContent = 'Chưa có dữ liệu phản ánh.';
    container.appendChild(empty);
    return;
  }

  rows.forEach((row, i) => {
    const color = row.isOther ? 'blue' : BREAKDOWN_COLORS[i] || 'blue';
    const match = SCAM_TYPE_ICONS.find(([re]) => re.test(row.scamType));
    const icon = row.isOther ? '🧩' : (match ? match[1] : '⚠️');

    const item = document.createElement('div');
    item.className = 'breakdown-item';
    item.title = `${row.count} hồ sơ`;

    const info = document.createElement('div');
    info.className = 'breakdown-info';
    const name = document.createElement('span');
    name.className = 'scam-name';
    name.textContent = `${icon} ${row.scamType}`;
    const pct = document.createElement('span');
    pct.className = `scam-pct ${color}-text`;
    pct.textContent = `${row.percent}%`;
    info.append(name, pct);

    const track = document.createElement('div');
    track.className = 'bar-track';
    const fill = document.createElement('div');
    fill.className = `bar-fill ${color}-bar`;
    fill.style.width = `${row.percent}%`;
    track.appendChild(fill);

    item.append(info, track);
    container.appendChild(item);
  });
}

function renderHeroStats(reports) {
  const stats = FirebaseService.getReportStats(reports);
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setText('statTotalReports', stats.total.toLocaleString('vi-VN'));
  setText('statVerifiedReports', stats.verified.toLocaleString('vi-VN'));
  setText('statSafetyRate', stats.total > 0 ? `${stats.safetyRate}%` : '--');
}

async function executeLookup() {
  const inputEl = document.getElementById('lookupInput');
  const query = inputEl ? inputEl.value.trim() : '';
  const container = document.getElementById('lookupResultContainer');

  if (!query) {
    if (inputEl) inputEl.focus();
    return;
  }

  // Trạng thái đang kiểm tra
  container.innerHTML = `
    <div style="text-align: center; padding: 20px; color: var(--text-dim);">
      <span class="ocr-spinner" style="margin-bottom: 8px;"></span>
      <div style="font-size: 0.85rem; font-weight: 600;">Đang đối soát dữ liệu & kiểm tra phản ánh cộng đồng...</div>
    </div>
  `;

  try {
    await handleTargetLookup(query, container);
  } catch (err) {
    console.error("[Lookup] Lỗi tra cứu:", err);
    container.innerHTML = `
      <div class="result-card danger">
        <p style="color: var(--accent-danger); font-size: 0.88rem;">Có lỗi xảy ra khi kiểm tra dữ liệu: ${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

// Tra cứu SĐT / email: đối soát danh sách cảnh báo + quy tắc nhận diện (RiskEngine)
// rồi cộng thêm điểm từ phản ánh cộng đồng.
async function handleTargetLookup(query, container) {
  let assessment = RiskEngine.assess(query);

  const communityStats = await FirebaseService.getCommunityReportsCount(assessment.normalized);
  const communityCount = communityStats.count || 0;
  assessment = RiskEngine.applyCommunity(assessment, communityCount);

  const topFlag = assessment.flags.find(f => f.severity === 'danger')
    || assessment.flags.find(f => f.severity === 'warning')
    || assessment.flags[0];

  currentLookupData = {
    assessment,
    target: assessment.target,
    type: assessment.type,
    cleanTarget: assessment.normalized,
    finalRiskScore: assessment.riskScore,
    communityCount,
    communityReports: communityStats.reports || [],
    riskIncrement: assessment.communityIncrement || 0,
    threatDetail: topFlag ? topFlag.detail : NO_WARNING_TEXT
  };

  renderConciseResult(currentLookupData, container);
}

const NO_WARNING_TEXT = "Chưa ghi nhận tiền sử vi phạm hoặc cảnh báo từ cơ quan chức năng.";

function safeUrl(url) {
  return /^https:\/\//i.test(String(url || '')) ? url : '#';
}

function renderSourceLinks(sources) {
  if (!sources || sources.length === 0) return '';
  return sources.map(s => `
    <a class="risk-source-link" href="${escapeHtml(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">
      ${escapeHtml(s.name)}${s.publishedAt ? ` (${escapeHtml(s.publishedAt.split('-').reverse().join('/'))})` : ''}
    </a>`).join('');
}

// Render Thẻ Kết Quả Tối Giản & Tóm Gọn
function renderConciseResult(data, container) {
  const a = data.assessment;
  const score = data.finalRiskScore;
  const isDanger = score >= 70;
  const isWarning = score >= 35 && score < 70;

  let statusClass = 'safe';
  if (isDanger) statusClass = 'danger';
  else if (isWarning) statusClass = 'warning';

  const statusText = a.isOfficialChannel ? 'KÊNH CHÍNH THỨC' : a.riskLabel.toUpperCase();
  const headlineAdvice = a.advice[0] || '';

  const flagsHtml = a.flags.map(f => `
    <li class="risk-flag risk-flag-${escapeHtml(f.severity)}">
      <strong class="risk-flag-title">${escapeHtml(f.title)}</strong>
      <span class="risk-flag-detail">${escapeHtml(f.detail)}</span>
      ${f.sources && f.sources.length ? `<span class="risk-flag-sources">Nguồn: ${renderSourceLinks(f.sources)}</span>` : ''}
    </li>`).join('');

  const adviceHtml = a.advice.map(t => `<li>${escapeHtml(t)}</li>`).join('');

  container.innerHTML = `
    <div class="result-card ${statusClass}" id="conciseResultCard" data-risk-level="${escapeHtml(a.riskLevel)}">
      <!-- Result Header -->
      <div class="result-header">
        <div>
          <div class="result-target">${data.type === 'email' ? '✉️' : '📞'} ${escapeHtml(data.target)}</div>
          <span class="status-pill ${statusClass}" id="resultStatusPill">${escapeHtml(statusText)}</span>
        </div>
        <div class="risk-badge ${statusClass}">
          <span class="risk-num" id="resultRiskNum">${score}%</span>
          <span class="risk-lbl">Khả nghi</span>
        </div>
      </div>

      <!-- Risk Meter Bar -->
      <div class="risk-meter-wrapper">
        <div class="risk-meter-bar">
          <div class="risk-meter-fill ${statusClass}" id="resultMeterFill" style="width: ${score}%;"></div>
        </div>
      </div>

      <!-- Tóm Gọn Thông Tin Chính -->
      <div class="result-summary-list">
        <div class="summary-item">
          <strong>Phân loại:</strong> <span>${escapeHtml(a.category || (a.isListed ? 'Đã bị cảnh báo' : 'Chưa xác định thủ đoạn'))}</span>
        </div>
        <div class="summary-item">
          <strong>Đánh giá:</strong> <span>${escapeHtml(data.threatDetail)}</span>
        </div>
        <div class="summary-item">
          <strong>Phản ánh cộng đồng:</strong>
          <span id="resultCommunityCount" style="font-weight: 700; color: ${data.communityCount > 0 ? '#ef4444' : 'var(--text-dim)'};">
            ${data.communityCount > 0
              ? `Đã có ${data.communityCount} lượt báo cáo nghi vấn <span class="badge-increment" style="display: inline-block; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.78rem; font-weight: 700; margin-left: 6px;">(+${data.riskIncrement || (data.communityCount * 5)}% nguy cơ)</span>`
              : 'Chưa có báo cáo từ cộng đồng'}
          </span>
        </div>
      </div>

      <!-- Lời khuyên chính -->
      <div class="result-advice-box ${statusClass}">
        <span>${escapeHtml(headlineAdvice)}</span>
      </div>

      <!-- Các dấu hiệu phát hiện (RiskEngine flags) -->
      ${flagsHtml ? `
      <div class="risk-section">
        <h4 class="risk-section-title">Dấu hiệu phát hiện</h4>
        <ul class="risk-flags" id="resultRiskFlags">${flagsHtml}</ul>
      </div>` : ''}

      <!-- Khuyến nghị đầy đủ -->
      <div class="risk-section">
        <h4 class="risk-section-title">Bạn nên làm gì</h4>
        <ul class="risk-advice" id="resultRiskAdvice">${adviceHtml}</ul>
      </div>

      <!-- Cảnh báo rủi ro của kết quả -->
      <p class="risk-disclaimer" id="resultRiskDisclaimer">⚠️ ${escapeHtml(a.disclaimer)}</p>

      <!-- Action Footer: Bấm báo cáo tăng % khả nghi ngay -->
      ${a.isOfficialChannel ? '' : `
      <div class="result-footer-compact">
        <button class="btn-report-increment" id="btnReportIncrement" onclick="triggerReportIncrement()">
          🚨 Báo Cáo Số Này (+5% Mức Độ Nguy Cơ)
        </button>
        <span class="report-notice-hint">
          Bấm báo cáo sẽ tự động cộng thêm +5% tỉ lệ rủi ro của số này trên hệ thống để cảnh báo sinh viên khác.
        </span>
      </div>`}
    </div>
  `;
}

// Xử lý khi người dùng bấm Báo Cáo Số Này -> Tăng ngay % khả nghi trên màn hình
async function triggerReportIncrement() {
  if (!currentLookupData) return;

  const btn = document.getElementById('btnReportIncrement');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>⏳ Đang ghi nhận & tăng +5% nguy cơ...</span>`;
  }

  const target = currentLookupData.target;
  const threatReason = currentLookupData.threatDetail && currentLookupData.threatDetail !== NO_WARNING_TEXT
    ? currentLookupData.threatDetail
    : "Người dùng báo cáo có dấu hiệu lừa đảo / quấy rối";

  // 1. Tính toán mức rủi ro mới: Tăng +5% nguy cơ
  const currentScore = currentLookupData.finalRiskScore || 0;
  let newReportCount = (currentLookupData.communityCount || 0) + 1;
  let updatedScore = Math.min(99, Math.max(currentScore + 5, 45)); // Tăng +5% nguy cơ
  let newIncrement = newReportCount * 5;

  // 2. Gửi vào Google Sheets qua FirebaseService
  //    (submitReport tự ghi LocalReportRegistry - không gọi thêm ở đây để tránh đếm trùng 2 lần)
  try {
    await FirebaseService.submitReport({
      target: target,
      scamType: currentLookupData.type === 'email' ? 'Mạo danh thu học phí' : 'Nghi vấn số lạ lừa đảo',
      content: `Phản ánh trực tiếp: ${currentLookupData.type === 'email' ? 'Email' : 'Số'} ${target} có hành vi đáng ngờ được người dùng cảnh báo qua cổng tra cứu.
Đánh giá hệ thống: ${threatReason}`.slice(0, 1500)
    });
  } catch (e) {
    console.warn("[Lookup] Không ghi nhận được báo cáo:", e.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `🚨 Báo Cáo Số Này (+5% Mức Độ Nguy Cơ)`;
    }
    showQuickToast(`❌ ${e.message}`);
    return;
  }

  // 3. Cập nhật dữ liệu hiện tại
  currentLookupData.finalRiskScore = updatedScore;
  currentLookupData.communityCount = newReportCount;
  currentLookupData.riskIncrement = newIncrement;

  // 4. Cập nhật giao diện mượt mà (Hiệu ứng tăng số % và thanh chạy)
  const card = document.getElementById('conciseResultCard');
  const pill = document.getElementById('resultStatusPill');
  const num = document.getElementById('resultRiskNum');
  const fill = document.getElementById('resultMeterFill');
  const countEl = document.getElementById('resultCommunityCount');

  const isDanger = updatedScore >= 70;
  const statusClass = isDanger ? 'danger' : 'warning';
  const statusText = isDanger ? 'BÁO ĐỘNG ĐỎ: NGUY CƠ LỪA ĐẢO CAO' : 'CẢNH BÁO: ĐANG CÓ DẤU HIỆU NGHI VẤN';

  if (card) {
    card.className = `result-card ${statusClass}`;
  }
  if (pill) {
    pill.className = `status-pill ${statusClass}`;
    pill.textContent = statusText;
  }
  if (num) {
    num.textContent = `${updatedScore}%`;
    num.parentElement.className = `risk-badge ${statusClass}`;
  }
  if (fill) {
    fill.className = `risk-meter-fill ${statusClass}`;
    fill.style.width = `${updatedScore}%`;
  }
  if (countEl) {
    countEl.style.color = '#ef4444';
    countEl.innerHTML = `Đã có ${newReportCount} lượt báo cáo nghi vấn <span class="badge-increment" style="display: inline-block; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 2px 6px; border-radius: 4px; font-size: 0.78rem; font-weight: 700; margin-left: 6px;">(+${newIncrement}% nguy cơ)</span> (Vừa cập nhật)`;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `✅ Đã Tăng +5% Nguy Cơ (${updatedScore}%)`;
    btn.style.backgroundColor = '#10b981';
    btn.style.borderColor = '#10b981';
  }

  // Toast thông báo ngắn gọn
  showQuickToast(`✅ Báo cáo thành công! Mức độ rủi ro đã tăng thêm +5% nguy cơ (Hiện tại: ${updatedScore}%).`);
}

function showQuickToast(msg) {
  let toast = document.getElementById('quickToastNotice');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'quickToastNotice';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
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
