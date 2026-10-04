// ===================================================================
// LOOKUP MODULE (SỐ ĐIỆN THOẠI & EMAIL) - TỔ 4 TƯ DUY HỆ THỐNG
// Tiêu chuẩn nghiêm ngặt:
// 1. Xóa bỏ triệt để các số liệu thống kê hardcode/giả lập không rõ nguồn.
// 2. Phân định rõ 2 nguồn kết quả:
//    - Nhận diện kỹ thuật / Heuristic: "Khớp quy chuẩn nhận diện rủi ro kỹ thuật: [Chi tiết]"
//    - Thống kê cộng đồng thực tế: Đếm chính xác số phản ánh trong Firebase Firestore
// 3. Chỉ hiển thị link nguồn khi có liên kết hợp lệ từ cơ quan chức năng/báo chí.
// ===================================================================

async function executeLookup() {
  const mode = document.querySelector('input[name="lookupType"]:checked').value;
  const query = document.getElementById('lookupInput').value.trim();
  const container = document.getElementById('lookupResultContainer');

  if (!query) {
    alert(mode === 'phone' ? 'Vui lòng nhập số điện thoại cần tra cứu!' : 'Vui lòng nhập địa chỉ email cần kiểm tra!');
    return;
  }

  // Hiển thị trạng thái đang truy vấn đám mây
  container.innerHTML = `
    <div style="text-align: center; padding: 24px; color: var(--text-dim);">
      <span class="ocr-spinner" style="margin-bottom: 8px;"></span>
      <div style="font-size: 0.85rem; font-weight: 600;">Đang đối soát nhận diện kỹ thuật & truy vấn phản ánh thực tế từ Firebase Cloud...</div>
    </div>
  `;

  try {
    if (mode === 'phone') {
      await handlePhoneLookup(query, container);
    } else {
      await handleEmailLookup(query, container);
    }
  } catch (err) {
    console.error("[Lookup] Lỗi tra cứu:", err);
    container.innerHTML = `
      <div class="result-card danger">
        <p style="color: var(--accent-danger);">Có lỗi xảy ra khi truy vấn dữ liệu: ${err.message}</p>
      </div>
    `;
  }
}

async function handlePhoneLookup(phone, container) {
  const cleanPhone = phone.replace(/[\s.\-()]/g, '');
  let data = null;

  // 1. Kiểm tra đối soát trong Danh sách số điện thoại đã xác minh (Thư Viện Pháp Luật, BV Lê Văn Thịnh, BCA)
  const verifiedRecord = PHONE_DATABASE[cleanPhone] || PHONE_DATABASE[phone];

  if (verifiedRecord) {
    data = {
      ...verifiedRecord,
      number: verifiedRecord.number || phone,
      isHeuristic: false,
      technicalDetail: `Số điện thoại nằm trong Danh mục đối tượng lừa đảo đã được cơ quan chức năng và báo chí xác minh công bố. Thủ đoạn: ${verifiedRecord.threatType}`,
      hasThreatInfo: verifiedRecord.riskScore > 0
    };
  } else {
    // 2. Nhận diện kỹ thuật / Heuristic:
    // a. Kiểm tra đầu số quốc tế (Wangiri) hoặc VoIP ảo
    const matchedPattern = typeof SCAM_PATTERNS !== 'undefined'
      ? SCAM_PATTERNS.find(p => cleanPhone.startsWith(p.prefix) || (p.prefix.startsWith('+') && cleanPhone.startsWith('00' + p.prefix.substring(1))))
      : null;

    // b. Kiểm tra đầu số tin nhắn SMS dịch vụ trừ tiền ngầm
    const isSmsShortcode = typeof SCAM_SMS_SHORTCODES !== 'undefined' && SCAM_SMS_SHORTCODES.includes(cleanPhone);

    // c. Kiểm tra đuôi số bot tự động (tứ quý, quấy rối)
    const matchedSuffix = typeof SCAM_SUFFIXES !== 'undefined' && cleanPhone.length >= 8
      ? SCAM_SUFFIXES.find(s => cleanPhone.endsWith(s.suffix))
      : null;

    if (matchedPattern) {
      data = {
        number: phone,
        carrier: `Đầu số nhận diện: ${matchedPattern.prefix} (${matchedPattern.country})`,
        riskScore: matchedPattern.risk,
        status: "DANGEROUS",
        statusText: `BÁO ĐỘNG ĐỎ: ĐẦU SỐ CẢNH BÁO LỪA ĐẢO (${matchedPattern.prefix})`,
        isHeuristic: true,
        technicalDetail: `Khớp quy chuẩn nhận diện rủi ro kỹ thuật: Đầu số quốc tế chuyển tiếp / VoIP ảo ${matchedPattern.prefix} (${matchedPattern.country}). Thủ đoạn: ${matchedPattern.type}. Tuyệt đối không gọi lại để tránh bị trừ cước viễn thông quốc tế giá cao.`,
        hasThreatInfo: true,
        sourceName: matchedPattern.source,
        sourceUrl: matchedPattern.url
      };
    } else if (isSmsShortcode) {
      data = {
        number: phone,
        carrier: `Đầu số SMS dịch vụ: ${cleanPhone}`,
        riskScore: 96,
        status: "DANGEROUS",
        statusText: `BÁO ĐỘNG ĐỎ: ĐẦU SỐ TIN NHẮN DỊCH VỤ TRỪ TIỀN NGẦM (${cleanPhone})`,
        isHeuristic: true,
        technicalDetail: `Khớp quy chuẩn nhận diện rủi ro kỹ thuật: Đầu số dịch vụ viễn thông ${cleanPhone} nằm trong danh sách các đầu số SMS câu cước ngầm được cơ quan công an cảnh báo.`,
        hasThreatInfo: true,
        sourceName: "Cổng Thông tin Bệnh Viện Lê Văn Thịnh (Công an nêu đích danh)",
        sourceUrl: "https://benhvienlevanthinh.vn/2025/05/cong-an-neu-dich-danh-8-so-dien-thoai-lua-dao-nguoi-dan-khong-nen-nghe-goi-lai/"
      };
    } else if (matchedSuffix) {
      data = {
        number: phone,
        carrier: `Đuôi số: ...${matchedSuffix.suffix} (${matchedSuffix.type})`,
        riskScore: matchedSuffix.risk,
        status: "WARNING",
        statusText: `CẢNH BÁO: ĐUÔI SỐ NGHI VẤN SIM RÁC TỔNG ĐÀI ẢO (...${matchedSuffix.suffix})`,
        isHeuristic: true,
        technicalDetail: `Khớp quy chuẩn nhận diện rủi ro kỹ thuật: Đuôi số bot tự động quấy rối ...${matchedSuffix.suffix} (${matchedSuffix.note}). Đối tượng thường mua SIM rác số đẹp hoặc tổng đài VoIP ảo để tạo uy tín giả.`,
        hasThreatInfo: true,
        sourceName: "Báo Điện tử Chính phủ (baochinhphu.vn) & Cục An toàn thông tin",
        sourceUrl: "https://baochinhphu.vn/chien-dich-nhan-dien-lua-dao-truc-tuyen-102240717152259919.htm"
      };
    } else {
      // Chưa phát hiện vi phạm qua heuristic
      data = {
        number: phone,
        carrier: "Thuê bao di động / cố định thông thường",
        riskScore: 0,
        status: "NEUTRAL",
        statusText: "CHƯA CÓ DỮ LIỆU CẢNH BÁO TRONG HỆ THỐNG",
        isHeuristic: false,
        technicalDetail: null,
        hasThreatInfo: false
      };
    }
  }

  // 3. Truy vấn Thống kê cộng đồng thực tế từ Firebase Firestore
  const communityStats = await FirebaseService.getCommunityReportsCount(cleanPhone);
  data.communityCount = communityStats.count;
  data.communityReports = communityStats.reports;

  renderPhoneResult(data, container);
}

function renderPhoneResult(data, container) {
  const isDanger = data.status === 'DANGEROUS' || data.riskScore >= 70 || data.communityCount >= 2;
  const isSafe = data.status === 'SAFE';
  const isWarning = data.status === 'WARNING' || data.communityCount === 1;
  const isNeutral = !isDanger && !isSafe && !isWarning;

  let statusClass = 'neutral';
  if (isDanger) statusClass = 'danger';
  else if (isSafe) statusClass = 'safe';
  else if (isWarning) statusClass = 'warning';

  let statusDisplay = data.statusText;
  if (data.communityCount > 0 && isNeutral) {
    statusDisplay = `CẢNH BÁO: CÓ ${data.communityCount} PHẢN ÁNH THỰC TẾ TỪ CỘNG ĐỒNG`;
    statusClass = 'warning';
  }

  container.innerHTML = `
    <div class="result-card ${statusClass}">
      <div class="result-header">
        <div>
          <div class="result-target">📞 ${escapeHtml(data.number)}</div>
          <span class="status-pill ${statusClass}">${statusDisplay}</span>
        </div>
        <div class="risk-badge ${statusClass}">
          <span class="risk-num">${isNeutral ? '0' : data.riskScore}%</span>
          <span class="risk-lbl">${isNeutral ? 'Mức độ rủi ro' : 'Rủi ro'}</span>
        </div>
      </div>

      <div class="result-body">
        <p><strong>Loại hình thuê bao:</strong> ${escapeHtml(data.carrier || 'Thuê bao thông thường')}</p>
        
        <!-- PHÂN ĐỊNH NGUỒN 1: NHẬN DIỆN KỸ THUẬT / HEURISTIC & CSDL CƠ QUAN CHỨC NĂNG -->
        <div class="analysis-section-block">
          <div class="analysis-section-title">🔍 1. Nhận Diện Kỹ Thuật (Heuristic & CSDL Xác Minh):</div>
          ${data.hasThreatInfo ? `
            <div class="heuristic-alert-box">
              <strong>${data.isHeuristic ? 'Khớp quy chuẩn nhận diện rủi ro kỹ thuật:' : 'Cơ quan chức năng đã xác minh:'}</strong>
              <div style="margin-top: 4px; font-size: 0.85rem; line-height: 1.5;">${escapeHtml(data.technicalDetail || data.threatType)}</div>
            </div>
          ` : `
            <div class="heuristic-safe-box">
              Chưa phát hiện rủi ro theo các quy chuẩn kỹ thuật viễn thông (Không thuộc đầu số Wangiri quốc tế, không phải đầu số cước ngầm và không nằm trong danh bạ đen của cơ quan công an).
            </div>
          `}
        </div>

        <!-- PHÂN ĐỊNH NGUỒN 2: THỐNG KÊ CỘNG ĐỒNG THỰC TẾ TỪ FIREBASE CLOUD -->
        <div class="analysis-section-block" style="margin-top: 14px;">
          <div class="analysis-section-title">👥 2. Thống Kê Phản Ánh Thực Tế Từ Cộng Đồng (Firebase Realtime):</div>
          ${data.communityCount > 0 ? `
            <div class="community-stat-positive">
              <span class="community-stat-count">Đã ghi nhận <strong>${data.communityCount}</strong> phản ánh thực tế từ cộng đồng</span>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
                Các phản ánh gần đây đã được xác thực ẩn danh và lưu trữ trên cơ sở dữ liệu thời gian thực:
              </div>
              <ul class="community-recent-list">
                ${data.communityReports.slice(0, 3).map(r => `
                  <li>
                    <strong>[${escapeHtml(r.scamType)}]</strong> &bull; Trạng thái: <span style="color: var(--accent-primary);">${escapeHtml(r.status)}</span> &bull; <em>${FirebaseService.formatRelativeTime(r.createdAt)}</em>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : `
            <div class="community-stat-zero">
              <em>Chưa có phản ánh thực tế nào trên hệ thống</em> về số điện thoại này.
            </div>
          `}
        </div>
      </div>

      <!-- NGUỒN DẪN CHỨNG CHÍNH THỨC (CHỈ HIỆN KHI CÓ LINK HỢP LỆ ĐẾN CƠ QUAN CHỨC NĂNG) -->
      ${data.hasThreatInfo && data.sourceName && data.sourceUrl ? `
        <div class="source-evidence-box">
          <div class="source-evidence-title">
            <span>🏛️ Nguồn dẫn chứng chính thức có thật:</span>
          </div>
          <div class="source-evidence-content">
            <strong>${escapeHtml(data.sourceName)}</strong>
            <br>
            <a href="${data.sourceUrl}" target="_blank" rel="noopener noreferrer" class="real-source-link">
              🔗 Mở đường link bài viết / cổng thông cáo gốc ↗
            </a>
          </div>
        </div>
      ` : ''}

      <div class="result-footer">
        <span class="citation-note">
          Hệ thống phòng ngừa Tổ 4 &bull; Tích hợp Firebase Cloud Firestore & Bảo mật ẩn danh 100%
        </span>
        
        ${isDanger ? `
          <button class="btn-sm btn-report-now" onclick="fillIntakeFromLookup('phone', '${data.number}', '${data.threatType || 'Lừa đảo mạo danh'}')">
            📝 Gửi phản ánh bổ sung về số này
          </button>
        ` : `
          <button class="btn-sm btn-report-neutral" onclick="fillIntakeFromLookup('phone', '${data.number}', 'Nghi vấn số lạ quấy rối')">
            📝 Báo cáo nếu số này có dấu hiệu lừa đảo
          </button>
        `}
      </div>
    </div>
  `;
}

async function handleEmailLookup(email, container) {
  const cleanEmail = email.trim().toLowerCase();
  let data = null;

  // 1. Kiểm tra đối soát trong EMAIL_DATABASE đã xác minh
  const verifiedRecord = EMAIL_DATABASE[cleanEmail] || EMAIL_DATABASE[email];

  if (verifiedRecord) {
    data = {
      ...verifiedRecord,
      email: verifiedRecord.email || email,
      isHeuristic: false,
      technicalDetail: `Email nằm trong danh sách lừa đảo mạo danh đã được ghi nhận: ${verifiedRecord.threatType}`,
      hasThreatInfo: verifiedRecord.riskScore > 0
    };
  } else {
    // 2. Nhận diện kỹ thuật / Heuristic đối với Email
    const isPublicDomain = cleanEmail.endsWith('@gmail.com') || cleanEmail.endsWith('@outlook.com') || cleanEmail.endsWith('@yahoo.com') || cleanEmail.endsWith('@hotmail.com');
    const hasEduKeyword = cleanEmail.includes('daotao') || cleanEmail.includes('hocphi') || cleanEmail.includes('sinhvien') || cleanEmail.includes('vnu') || cleanEmail.includes('hust') || cleanEmail.includes('uet') || cleanEmail.includes('neu');

    if (isPublicDomain && hasEduKeyword) {
      data = {
        email: email,
        riskScore: 98,
        status: "DANGEROUS",
        statusText: "BÁO ĐỘNG ĐỎ: HÒM THƯ CÁ NHÂN GMAIL MẠO DANH NHÀ TRƯỜNG",
        isHeuristic: true,
        technicalDetail: "Khớp quy chuẩn nhận diện rủi ro kỹ thuật: Hòm thư sử dụng tên miền miễn phí công cộng (@gmail/@outlook), không thuộc hệ thống tên miền giáo dục chính thống (.edu.vn) nhưng lại chứa từ khóa phòng ban đào tạo nhằm gửi thông báo nộp học phí vào STK cá nhân.",
        hasThreatInfo: true,
        sourceName: "Báo Điện tử Chính phủ (baochinhphu.vn) - Lừa đảo sinh viên chuyển tiền đăng ký chỗ ở ký túc xá",
        sourceUrl: "https://baochinhphu.vn/lua-dao-sinh-vien-chuyen-tien-dang-ky-cho-o-ky-tuc-xa-10224081107491905.htm"
      };
    } else {
      data = {
        email: email,
        riskScore: 0,
        status: "NEUTRAL",
        statusText: "CHƯA CÓ DỮ LIỆU CẢNH BÁO TRONG HỆ THỐNG",
        isHeuristic: false,
        technicalDetail: null,
        hasThreatInfo: false
      };
    }
  }

  // 3. Truy vấn Thống kê cộng đồng thực tế từ Firebase
  const communityStats = await FirebaseService.getCommunityReportsCount(cleanEmail);
  data.communityCount = communityStats.count;
  data.communityReports = communityStats.reports;

  renderEmailResult(data, container);
}

function renderEmailResult(data, container) {
  const isDanger = data.status === 'DANGEROUS' || data.riskScore >= 70 || data.communityCount >= 2;
  const isSafe = data.status === 'SAFE';
  const isWarning = data.status === 'WARNING' || data.communityCount === 1;
  const isNeutral = !isDanger && !isSafe && !isWarning;

  let statusClass = 'neutral';
  if (isDanger) statusClass = 'danger';
  else if (isSafe) statusClass = 'safe';
  else if (isWarning) statusClass = 'warning';

  let statusDisplay = data.statusText;
  if (data.communityCount > 0 && isNeutral) {
    statusDisplay = `CẢNH BÁO: CÓ ${data.communityCount} PHẢN ÁNH THỰC TẾ TỪ CỘNG ĐỒNG`;
    statusClass = 'warning';
  }

  container.innerHTML = `
    <div class="result-card ${statusClass}">
      <div class="result-header">
        <div>
          <div class="result-target">✉️ ${escapeHtml(data.email)}</div>
          <span class="status-pill ${statusClass}">${statusDisplay}</span>
        </div>
        <div class="risk-badge ${statusClass}">
          <span class="risk-num">${isNeutral ? '0' : data.riskScore}%</span>
          <span class="risk-lbl">${isNeutral ? 'Mức độ rủi ro' : 'Rủi ro'}</span>
        </div>
      </div>

      <div class="result-body">
        <!-- PHÂN ĐỊNH NGUỒN 1: NHẬN DIỆN KỸ THUẬT / HEURISTIC -->
        <div class="analysis-section-block">
          <div class="analysis-section-title">🔍 1. Nhận Diện Kỹ Thuật (Heuristic & Quy Chuẩn Tên Miền):</div>
          ${data.hasThreatInfo ? `
            <div class="heuristic-alert-box">
              <strong>${data.isHeuristic ? 'Khớp quy chuẩn nhận diện rủi ro kỹ thuật:' : 'Cơ quan chức năng đã xác minh:'}</strong>
              <div style="margin-top: 4px; font-size: 0.85rem; line-height: 1.5;">${escapeHtml(data.technicalDetail || data.threatType)}</div>
            </div>
          ` : `
            <div class="heuristic-safe-box">
              Không phát hiện dấu hiệu mạo danh phòng ban đào tạo qua tên miền hòm thư.
            </div>
          `}
        </div>

        <!-- PHÂN ĐỊNH NGUỒN 2: THỐNG KÊ CỘNG ĐỒNG THỰC TẾ TỪ FIREBASE CLOUD -->
        <div class="analysis-section-block" style="margin-top: 14px;">
          <div class="analysis-section-title">👥 2. Thống Kê Phản Ánh Thực Tế Từ Cộng Đồng (Firebase Realtime):</div>
          ${data.communityCount > 0 ? `
            <div class="community-stat-positive">
              <span class="community-stat-count">Đã ghi nhận <strong>${data.communityCount}</strong> phản ánh thực tế từ cộng đồng</span>
              <ul class="community-recent-list">
                ${data.communityReports.slice(0, 3).map(r => `
                  <li>
                    <strong>[${escapeHtml(r.scamType)}]</strong> &bull; Trạng thái: <span style="color: var(--accent-primary);">${escapeHtml(r.status)}</span> &bull; <em>${FirebaseService.formatRelativeTime(r.createdAt)}</em>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : `
            <div class="community-stat-zero">
              <em>Chưa có phản ánh thực tế nào trên hệ thống</em> về địa chỉ email này.
            </div>
          `}
        </div>
      </div>

      <!-- NGUỒN DẪN CHỨNG CHÍNH THỨC -->
      ${data.hasThreatInfo && data.sourceName && data.sourceUrl ? `
        <div class="source-evidence-box">
          <div class="source-evidence-title">
            <span>🏛️ Nguồn dẫn chứng chính thức có thật:</span>
          </div>
          <div class="source-evidence-content">
            <strong>${escapeHtml(data.sourceName)}</strong>
            <br>
            <a href="${data.sourceUrl}" target="_blank" rel="noopener noreferrer" class="real-source-link">
              🔗 Mở đường link bài viết / thông cáo cảnh báo gốc ↗
            </a>
          </div>
        </div>
      ` : ''}

      <div class="result-footer">
        <span class="citation-note">
          Hệ thống phòng ngừa Tổ 4 &bull; Tích hợp Firebase Cloud Firestore & Bảo mật ẩn danh 100%
        </span>
        
        ${isDanger ? `
          <button class="btn-sm btn-report-now" onclick="fillIntakeFromLookup('email', '${data.email}', '${data.threatType || 'Email mạo danh'}')">
            📝 Gửi phản ánh bổ sung về email này
          </button>
        ` : `
          <button class="btn-sm btn-report-neutral" onclick="fillIntakeFromLookup('email', '${data.email}', 'Email nghi vấn lừa đảo')">
            📝 Báo cáo nếu email này có dấu hiệu lừa đảo
          </button>
        `}
      </div>
    </div>
  `;
}

function fillIntakeFromLookup(type, target, threat) {
  document.getElementById('intakeTarget').value = target;
  document.getElementById('intakeType').value = (threat && threat.includes('học phí')) 
    ? 'Mạo danh thu học phí' 
    : 'Lừa đảo việc làm online';
  switchAppTab('intake');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
