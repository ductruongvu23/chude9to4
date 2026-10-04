// ===================================================================
// LOOKUP MODULE (SỐ ĐIỆN THOẠI & EMAIL) - TỔ 4 TƯ DUY HỆ THỐNG
// Giao diện tối giản - Tập trung mục đích chính - Tự động tăng % khả nghi khi bị báo cáo
// ===================================================================

let currentLookupData = null;

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
    const isEmail = query.includes('@');
    if (isEmail) {
      await handleEmailLookup(query, container);
    } else {
      await handlePhoneLookup(query, container);
    }
  } catch (err) {
    console.error("[Lookup] Lỗi tra cứu:", err);
    container.innerHTML = `
      <div class="result-card danger">
        <p style="color: var(--accent-danger); font-size: 0.88rem;">Có lỗi xảy ra khi kiểm tra dữ liệu: ${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

async function handlePhoneLookup(phone, container) {
  const cleanPhone = phone.replace(/[\s.\-()]/g, '');
  let data = null;

  // 1. Kiểm tra đối soát trong Danh sách xác minh
  const verifiedRecord = PHONE_DATABASE[cleanPhone] || PHONE_DATABASE[phone];

  if (verifiedRecord) {
    data = {
      target: verifiedRecord.number || phone,
      carrier: verifiedRecord.carrier || "Thuê bao di động / cố định",
      baseRisk: verifiedRecord.riskScore || 95,
      isVerifiedScam: verifiedRecord.riskScore > 0,
      threatDetail: verifiedRecord.threatType || "Số điện thoại nằm trong danh mục lừa đảo đã được cơ quan chức năng công bố.",
      sourceName: verifiedRecord.sourceName,
      sourceUrl: verifiedRecord.sourceUrl
    };
  } else {
    // 2. Nhận diện kỹ thuật (Đầu số quốc tế bẫy cước, VoIP ảo, SMS dịch vụ, đuôi số)
    const matchedPattern = typeof SCAM_PATTERNS !== 'undefined'
      ? SCAM_PATTERNS.find(p => cleanPhone.startsWith(p.prefix) || (p.prefix.startsWith('+') && cleanPhone.startsWith('00' + p.prefix.substring(1))))
      : null;

    const isSmsShortcode = typeof SCAM_SMS_SHORTCODES !== 'undefined' && SCAM_SMS_SHORTCODES.includes(cleanPhone);

    const matchedSuffix = typeof SCAM_SUFFIXES !== 'undefined' && cleanPhone.length >= 8
      ? SCAM_SUFFIXES.find(s => cleanPhone.endsWith(s.suffix))
      : null;

    if (matchedPattern) {
      data = {
        target: phone,
        carrier: `Đầu số quốc tế: ${matchedPattern.prefix} (${matchedPattern.country})`,
        baseRisk: matchedPattern.risk || 95,
        isVerifiedScam: true,
        threatDetail: `Đầu số quốc tế nháy máy bẫy cước viễn thông giá cao (${matchedPattern.type}). Tuyệt đối không gọi lại.`,
        sourceName: matchedPattern.source,
        sourceUrl: matchedPattern.url
      };
    } else if (isSmsShortcode) {
      data = {
        target: phone,
        carrier: `Đầu số SMS dịch vụ: ${cleanPhone}`,
        baseRisk: 95,
        isVerifiedScam: true,
        threatDetail: `Đầu số tin nhắn dịch vụ câu cước ngầm được cơ quan công an cảnh báo.`,
        sourceName: "Cổng TT Bệnh Viện Lê Văn Thịnh",
        sourceUrl: "https://benhvienlevanthinh.vn"
      };
    } else if (matchedSuffix) {
      data = {
        target: phone,
        carrier: `Đuôi số: ...${matchedSuffix.suffix} (${matchedSuffix.type})`,
        baseRisk: matchedSuffix.risk || 80,
        isVerifiedScam: true,
        threatDetail: `Đuôi số tổng đài VoIP ảo thường bị đối tượng xấu lợi dụng để tạo uy tín giả (${matchedSuffix.note}).`,
        sourceName: "Báo Điện tử Chính phủ & Cục An toàn thông tin",
        sourceUrl: "https://baochinhphu.vn"
      };
    } else {
      // Số thông thường chưa có trong danh sách đen
      data = {
        target: phone,
        carrier: "Thuê bao viễn thông thông thường",
        baseRisk: 0,
        isVerifiedScam: false,
        threatDetail: "Chưa ghi nhận tiền sử vi phạm hoặc cảnh báo từ cơ quan chức năng.",
        sourceName: null,
        sourceUrl: null
      };
    }
  }

  // 3. Truy vấn thống kê phản ánh cộng đồng (Bao gồm dữ liệu sẵn có + người dùng báo cáo)
  const communityStats = await FirebaseService.getCommunityReportsCount(cleanPhone);
  data.communityCount = communityStats.count || 0;
  data.communityReports = communityStats.reports || [];

  // Tính toán % khả nghi tổng hợp:
  // Nếu có báo cáo từ cộng đồng -> tự động tăng % khả nghi!
  let calculatedRisk = data.baseRisk;
  if (data.communityCount >= 1) {
    if (data.communityCount === 1) {
      calculatedRisk = Math.max(calculatedRisk, 45);
    } else if (data.communityCount === 2) {
      calculatedRisk = Math.max(calculatedRisk, 75);
    } else {
      calculatedRisk = Math.max(calculatedRisk, 95);
    }
  }

  data.finalRiskScore = Math.min(99, calculatedRisk);
  data.cleanTarget = cleanPhone;
  data.type = 'phone';

  currentLookupData = data;
  renderConciseResult(data, container);
}

async function handleEmailLookup(email, container) {
  const cleanEmail = email.trim().toLowerCase();
  let data = null;

  // 1. Kiểm tra đối soát trong EMAIL_DATABASE
  const verifiedRecord = EMAIL_DATABASE[cleanEmail] || EMAIL_DATABASE[email];

  if (verifiedRecord) {
    data = {
      target: verifiedRecord.email || email,
      carrier: "Hòm thư điện tử",
      baseRisk: verifiedRecord.riskScore || 95,
      isVerifiedScam: verifiedRecord.riskScore > 0,
      threatDetail: verifiedRecord.threatType || "Email mạo danh tổ chức giáo dục / đào tạo.",
      sourceName: verifiedRecord.sourceName,
      sourceUrl: verifiedRecord.sourceUrl
    };
  } else {
    // 2. Nhận diện kỹ thuật: Domain công cộng mạo danh trường học
    const isPublicDomain = cleanEmail.endsWith('@gmail.com') || cleanEmail.endsWith('@outlook.com') || cleanEmail.endsWith('@yahoo.com') || cleanEmail.endsWith('@hotmail.com');
    const hasEduKeyword = cleanEmail.includes('daotao') || cleanEmail.includes('hocphi') || cleanEmail.includes('sinhvien') || cleanEmail.includes('vnu') || cleanEmail.includes('hust') || cleanEmail.includes('uet') || cleanEmail.includes('neu');

    if (isPublicDomain && hasEduKeyword) {
      data = {
        target: email,
        carrier: "Hòm thư miễn phí (@gmail/@outlook)",
        baseRisk: 95,
        isVerifiedScam: true,
        threatDetail: "Hòm thư cá nhân miễn phí nhưng chứa từ khóa đào tạo/học phí nhằm mạo danh nhà trường gửi thông báo nộp tiền.",
        sourceName: "Cục An toàn thông tin",
        sourceUrl: "https://ais.gov.vn"
      };
    } else {
      data = {
        target: email,
        carrier: "Hòm thư điện tử",
        baseRisk: 0,
        isVerifiedScam: false,
        threatDetail: "Chưa có dữ liệu cảnh báo vi phạm đối với địa chỉ email này.",
        sourceName: null,
        sourceUrl: null
      };
    }
  }

  // 3. Thống kê cộng đồng
  const communityStats = await FirebaseService.getCommunityReportsCount(cleanEmail);
  data.communityCount = communityStats.count || 0;
  data.communityReports = communityStats.reports || [];

  let calculatedRisk = data.baseRisk;
  if (data.communityCount >= 1) {
    if (data.communityCount === 1) {
      calculatedRisk = Math.max(calculatedRisk, 45);
    } else if (data.communityCount === 2) {
      calculatedRisk = Math.max(calculatedRisk, 75);
    } else {
      calculatedRisk = Math.max(calculatedRisk, 95);
    }
  }

  data.finalRiskScore = Math.min(99, calculatedRisk);
  data.cleanTarget = cleanEmail;
  data.type = 'email';

  currentLookupData = data;
  renderConciseResult(data, container);
}

// Render Thẻ Kết Quả Tối Giản & Tóm Gọn
function renderConciseResult(data, container) {
  const score = data.finalRiskScore;
  const isDanger = score >= 70;
  const isWarning = score >= 35 && score < 70;
  const isSafe = score < 35;

  let statusClass = 'safe';
  let statusText = 'AN TOÀN / CHƯA CÓ CẢNH BÁO';
  let advice = 'Chưa phát hiện rủi ro, tuy nhiên vẫn cần cảnh giác trước các yêu cầu chuyển khoản lạ.';

  if (isDanger) {
    statusClass = 'danger';
    statusText = 'BÁO ĐỘNG ĐỎ: NGUY CƠ LỪA ĐẢO CAO';
    advice = '🛑 Tuyệt đối không chuyển tiền, không cung cấp mã OTP hoặc làm theo hướng dẫn.';
  } else if (isWarning) {
    statusClass = 'warning';
    statusText = 'CẢNH BÁO: ĐANG CÓ DẤU HIỆU NGHI VẤN';
    advice = '⚠️ Cần xác minh kỹ qua hotline chính thức trước khi thực hiện bất kỳ giao dịch nào.';
  }

  container.innerHTML = `
    <div class="result-card ${statusClass}" id="conciseResultCard">
      <!-- Result Header -->
      <div class="result-header">
        <div>
          <div class="result-target">${data.type === 'email' ? '✉️' : '📞'} ${escapeHtml(data.target)}</div>
          <span class="status-pill ${statusClass}" id="resultStatusPill">${statusText}</span>
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
          <strong>Thông tin:</strong> <span>${escapeHtml(data.carrier)}</span>
        </div>
        <div class="summary-item">
          <strong>Đánh giá:</strong> <span>${escapeHtml(data.threatDetail)}</span>
        </div>
        <div class="summary-item">
          <strong>Phản ánh cộng đồng:</strong> 
          <span id="resultCommunityCount" style="font-weight: 700; color: ${data.communityCount > 0 ? 'var(--accent-primary)' : 'var(--text-dim)'};">
            ${data.communityCount > 0 ? `Đã có ${data.communityCount} lượt báo cáo nghi vấn` : 'Chưa có báo cáo từ cộng đồng'}
          </span>
        </div>
      </div>

      <!-- Lời khuyên 1 dòng -->
      <div class="result-advice-box ${statusClass}">
        <span>${advice}</span>
      </div>

      <!-- Action Footer: Bấm báo cáo tăng % khả nghi ngay -->
      <div class="result-footer-compact">
        <button class="btn-report-increment" id="btnReportIncrement" onclick="triggerReportIncrement()">
          🚨 Báo Cáo Số Này (+Tăng Mức Độ Khả Nghi)
        </button>
        <span class="report-notice-hint">
          Bấm báo cáo sẽ tăng ngay tỉ lệ rủi ro của số này trên hệ thống để cảnh báo sinh viên khác.
        </span>
      </div>
    </div>
  `;
}

// Xử lý khi người dùng bấm Báo Cáo Số Này -> Tăng ngay % khả nghi trên màn hình
async function triggerReportIncrement() {
  if (!currentLookupData) return;

  const btn = document.getElementById('btnReportIncrement');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>⏳ Đang ghi nhận báo cáo...</span>`;
  }

  const target = currentLookupData.target;
  const threatReason = currentLookupData.threatDetail && currentLookupData.threatDetail !== "Chưa ghi nhận tiền sử vi phạm hoặc cảnh báo từ cơ quan chức năng."
    ? currentLookupData.threatDetail
    : "Người dùng báo cáo có dấu hiệu lừa đảo / quấy rối";

  // 1. Lưu vào LocalReportRegistry và tính toán mức rủi ro mới
  let updatedScore = 45;
  let newReportCount = (currentLookupData.communityCount || 0) + 1;

  if (typeof LocalReportRegistry !== 'undefined') {
    const regResult = LocalReportRegistry.report(target, threatReason);
    if (regResult) {
      updatedScore = regResult.riskScore;
      newReportCount = regResult.reportCount;
    }
  } else {
    updatedScore = Math.min(99, Math.max(currentLookupData.finalRiskScore + 35, 45));
  }

  // 2. Gửi vào Sổ tiếp nhận hồ sơ qua FirebaseService
  try {
    await FirebaseService.submitReport({
      target: target,
      scamType: currentLookupData.type === 'email' ? 'Mạo danh thu học phí' : 'Nghi vấn số lạ lừa đảo',
      content: `Phản ánh trực tiếp: Số ${target} có hành vi đáng ngờ được người dùng cảnh báo qua cổng tra cứu.`
    });
  } catch (e) {
    console.log("[Lookup] Báo cáo ghi nhận cục bộ:", e.message);
  }

  // 3. Cập nhật dữ liệu hiện tại
  currentLookupData.finalRiskScore = updatedScore;
  currentLookupData.communityCount = newReportCount;

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
    countEl.style.color = 'var(--accent-primary)';
    countEl.textContent = `Đã có ${newReportCount} lượt báo cáo nghi vấn (Vừa cập nhật)`;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `✅ Đã Ghi Nhận Báo Cáo (${updatedScore}%)`;
    btn.style.backgroundColor = '#10b981';
    btn.style.borderColor = '#10b981';
  }

  // Toast thông báo ngắn gọn
  showQuickToast(`✅ Báo cáo thành công! Mức độ khả nghi của số này đã tăng lên ${updatedScore}%.`);
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
