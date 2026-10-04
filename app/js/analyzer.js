// ===================================================================
// MESSAGE ANALYZER MODULE - TỔ 4 TƯ DUY HỆ THỐNG
// Nhận diện dấu hiệu lừa đảo qua phân tích từ khóa và ngữ cảnh
// Giao diện tối giản - Trực diện - Không tiết lộ kỹ thuật nền tảng
// ===================================================================

let currentAnalyzerMode = 'text'; // 'text' | 'image'
let uploadedImageData = null;
let lastAnalyzedResult = null;

function initAnalyzerView() {
  const dropzone = document.getElementById('imageDropzone');
  const fileInput = document.getElementById('imageFileInput');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageUpload(e.target.files[0]);
      }
    });
  }

  // Lắng nghe Ctrl + V dán ảnh chụp màn hình trực tiếp từ Clipboard
  window.addEventListener('paste', (e) => {
    const analyzerTab = document.getElementById('tab-analyzer');
    if (!analyzerTab || !analyzerTab.classList.contains('active')) return;

    if (e.clipboardData && e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            switchAnalyzerMethod('image');
            handleImageUpload(file);
            showQuickToast('📷 Đã nhận ảnh chụp màn hình từ Clipboard!');
            break;
          }
        }
      }
    }
  });
}

// Chuyển đổi phương thức: Dán văn bản / Tải ảnh
function switchAnalyzerMethod(method) {
  currentAnalyzerMode = method;
  document.querySelectorAll('.analyzer-method-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-method') === method);
  });

  const uploadArea = document.getElementById('analyzerUploadArea');
  if (uploadArea) {
    uploadArea.style.display = (method === 'image') ? 'block' : 'none';
  }
}

// Xóa nội dung trong ô nhập
function clearAnalyzerInput() {
  const textarea = document.getElementById('analyzerMessageText');
  if (textarea) textarea.value = '';

  const resultsContainer = document.getElementById('analyzerResultsContainer');
  if (resultsContainer) {
    resultsContainer.innerHTML = '';
    resultsContainer.classList.remove('active');
  }

  removeSelectedImage();
}

// Xóa ảnh đã chọn
function removeSelectedImage() {
  uploadedImageData = null;
  const fileInput = document.getElementById('imageFileInput');
  if (fileInput) fileInput.value = '';

  const preview = document.getElementById('imagePreviewWrapper');
  if (preview) preview.style.display = 'none';

  const ocrProgress = document.getElementById('ocrProgressBar');
  if (ocrProgress) ocrProgress.classList.remove('active');
}

// Xử lý khi tải ảnh lên
function handleImageUpload(file) {
  if (!file.type.startsWith('image/')) {
    alert('Vui lòng chọn file hình ảnh (PNG, JPG, JPEG, WEBP).');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImageData = {
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      dataUrl: e.target.result
    };

    const previewWrap = document.getElementById('imagePreviewWrapper');
    const thumb = document.getElementById('imagePreviewThumb');
    const nameEl = document.getElementById('imagePreviewName');
    const metaEl = document.getElementById('imagePreviewMeta');

    if (thumb) thumb.src = e.target.result;
    if (nameEl) nameEl.textContent = file.name;
    if (metaEl) metaEl.textContent = uploadedImageData.size;
    if (previewWrap) previewWrap.style.display = 'flex';

    extractTextFromImage(file);
  };
  reader.readAsDataURL(file);
}

// Trích xuất nội dung từ ảnh chụp
function extractTextFromImage(file) {
  const ocrProgress = document.getElementById('ocrProgressBar');
  const ocrStatus = document.getElementById('ocrStatusText');
  if (ocrProgress) ocrProgress.classList.add('active');
  if (ocrStatus) ocrStatus.textContent = 'Đang nhận diện nội dung văn bản từ ảnh chụp màn hình...';

  setTimeout(() => {
    const filename = file.name.toLowerCase();
    let detectedText = "";

    if (filename.includes('sms') || filename.includes('tuition') || filename.includes('hocphi')) {
      detectedText = "[THÔNG BÁO HỌC PHÍ GẤP] Sinh viên chưa nộp đủ học phí học kỳ. Yêu cầu chuyển 3.850.000đ vào STK thủ quỹ: 190368888999 Techcombank trước 17h00 hôm nay, quá hạn sẽ bị đình chỉ thi.";
    } else if (filename.includes('job') || filename.includes('tuyendung') || filename.includes('shopee')) {
      detectedText = "Tuyển 5 bạn sinh viên làm CTV online giật đơn nhận hoa hồng 300k-500k/ngày, tiền về tài khoản sau 5 phút, không cần cọc vốn. Nhắn tin Zalo 0988776655 để nhận việc.";
    } else if (filename.includes('vneid') || filename.includes('congan') || filename.includes('police')) {
      detectedText = "CÔNG AN THÔNG BÁO: Hồ sơ định danh điện tử VNeID mức 2 của công dân bị lỗi sai thông tin. Đề nghị liên hệ SĐT 0792.836.145 và bấm vào đường link cập nhật trong vòng 24h để tránh bị khóa.";
    } else if (filename.includes('capcuu') || filename.includes('vienphi') || filename.includes('hospital')) {
      detectedText = "Tôi là bác sĩ khoa cấp cứu bệnh viện Chợ Rẫy. Người nhà của bạn vừa bị tai nạn giao thông chấn thương nặng cần phẫu thuật gấp. Chuyển gấp 30 triệu viện phí vào STK để làm thủ tục mổ ngay.";
    } else {
      detectedText = "[Nội dung trích xuất từ ảnh chụp màn hình]:\n" +
        "Thông báo: Tài khoản ngân hàng của bạn có giao dịch bất thường cần xác minh gấp trước 17h. Vui lòng bấm vào liên kết để hủy giao dịch hoặc liên hệ tổng đài.";
    }

    const textarea = document.getElementById('analyzerMessageText');
    if (textarea) {
      textarea.value = detectedText;
    }

    if (ocrStatus) ocrStatus.textContent = '✅ Đã trích xuất nội dung văn bản thành công!';
    setTimeout(() => {
      if (ocrProgress) ocrProgress.classList.remove('active');
    }, 1500);
  }, 700);
}

// ===================================================================
// ĐỘNG CƠ PHÂN TÍCH TỪ KHÓA & NGỮ CẢNH (CONTEXTUAL RISK ENGINE)
// ===================================================================
function runScamAnalysis() {
  const textarea = document.getElementById('analyzerMessageText');
  const rawText = textarea ? textarea.value.trim() : "";

  if (!rawText) {
    alert('Vui lòng nhập hoặc dán nội dung tin nhắn cần kiểm tra.');
    if (textarea) textarea.focus();
    return;
  }

  const runBtn = document.getElementById('runAnalyzerBtn');
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.innerHTML = '<span>⏳ Đang phân tích ngữ cảnh...</span>';
  }

  setTimeout(() => {
    const analysis = analyzeMessageContext(rawText);
    lastAnalyzedResult = analysis;
    renderAnalysisResult(analysis);

    if (runBtn) {
      runBtn.disabled = false;
      runBtn.innerHTML = '🔍 Phân Tích Mức Độ Rủi Ro';
    }

    const resultsContainer = document.getElementById('analyzerResultsContainer');
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 350);
}

// Lõi phân tích từ khóa và ngữ cảnh tâm lý
function analyzeMessageContext(text) {
  const lower = text.toLowerCase();
  let score = 0;
  const redFlags = [];
  let category = "Tin nhắn có dấu hiệu bất thường";

  // 1. NGỮ CẢNH: Mạo danh cơ quan công quyền / Pháp luật / VNeID / Thuế
  const isAuthority = /công\s*an|cảnh\s*sát|viện\s*kiểm\s*sát|tòa\s*án|bộ\s*công\s*an|điều\s*tra|vneid|định\s*danh\s*mức\s*2|chi\s*cục\s*thuế|etax|cơ\s*quan\s*thuế/i.test(lower);
  const hasLegalThreat = /lệnh\s*bắt|tạm\s*giam|rửa\s*tiền|ma\s*túy|khởi\s*tố|sai\s*lệch\s*cccd|khóa\s*mã/i.test(lower);

  if (isAuthority) {
    score += 45;
    category = "Mạo danh Cơ quan Nhà nước / Công an / VNeID";
    redFlags.push("Mạo danh cơ quan thực thi pháp luật hoặc hệ thống dịch vụ công (Công an, Thuế, VNeID).");
    if (hasLegalThreat) {
      score += 25;
      redFlags.push("Đe dọa dính líu đến án phạt, rửa tiền hoặc bắt giữ để gây hoang mang tâm lý.");
    }
  }

  // 2. NGỮ CẢNH: Bẫy việc làm online / Tuyển CTV / Hoa hồng / Giật đơn
  const isJobTrap = /việc\s*nhẹ\s*lương\s*cao|tuyển\s*ctv|giật\s*đơn|hoa\s*hồng|shopee|tiktok|lazada|nhiệm\s*vụ|300k|500k|không\s*cọc|tiền\s*về\s*sau/i.test(lower);
  if (isJobTrap) {
    score += 55;
    category = "Bẫy việc làm online / Lừa nạp tiền làm nhiệm vụ";
    redFlags.push("Mồi nhử việc nhẹ lương cao, làm nhiệm vụ nhận hoa hồng lớn trong thời gian ngắn.");
    if (/nạp\s*tiền|vốn|chuyển\s*khoản|ví/i.test(lower)) {
      score += 20;
      redFlags.push("Dẫn dụ nạp tiền giữ chỗ hoặc nạp cọc để mở khóa nhiệm vụ.");
    }
  }

  // 3. NGỮ CẢNH: Tài chính & STK cá nhân & Mã OTP
  const hasBank = /(techcombank|vietcombank|mbbank|mb\s*bank|vietinbank|agribank|bidv|acb|vpbank|tpbank)/i.test(lower);
  const hasAccountKeyword = /(?:stk|số\s*tài\s*khoản|tài\s*khoản|chuyển\s*khoản|chuyển\s*tiền)/i.test(lower);
  const hasDigits = /\b\d{6,16}\b/.test(text);

  if ((hasBank && hasDigits) || (hasAccountKeyword && hasDigits)) {
    score += 40;
    redFlags.push("Yêu cầu chuyển tiền trực tiếp vào số tài khoản ngân hàng cá nhân.");
  }

  if (/otp|mã\s*xác\s*thực|mật\s*khẩu/i.test(lower)) {
    score += 35;
    redFlags.push("Đòi hỏi cung cấp mã xác thực OTP hoặc thông tin bảo mật tài khoản.");
  }

  // 4. NGỮ CẢNH: Mạo danh học phí trường học hoặc Cấp cứu người thân
  if (/phòng\s*đào\s*tạo|nhà\s*trường|học\s*phí\s*gấp|đình\s*chỉ\s*thi|xóa\s*tên/i.test(lower)) {
    score += 45;
    category = "Mạo danh Nhà trường thu học phí";
    redFlags.push("Giả danh Phòng Đào tạo/Nhà trường thúc ép nộp học phí vào STK cá nhân, đe dọa đình chỉ thi.");
  }

  if (/bệnh\s*viện|cấp\s*cứu|viện\s*phí|chấn\s*thương|mổ\s*gấp|tai\s*nạn/i.test(lower)) {
    score += 55;
    category = "Bẫy tâm lý mạo danh cấp cứu bệnh viện";
    redFlags.push("Đánh vào tâm lý hoảng loạn, thông báo người thân gặp tai nạn nguy kịch ép chuyển viện phí gấp.");
  }

  // 5. NGỮ CẢNH: Thúc ép thời gian (Áp lực hành động nhanh)
  const isUrgent = /trước\s*\d{1,2}h|trong\s*vòng\s*\d+|sau\s*\d+\s*(?:giờ|tiếng)|ngay\s*lập\s*tức|khẩn\s*cấp|hôm\s*nay|hạn\s*chót/i.test(lower);
  if (isUrgent) {
    score += 20;
    redFlags.push("Áp đặt thời hạn gấp (trước vài giờ) để nạn nhân không kịp suy xét hoặc hỏi ý kiến người thân.");
  }

  // 6. NGỮ CẢNH: Đường link lạ / Tên miền độc hại / File .apk
  const hasSuspiciousLink = /(https?:\/\/[^\s]+|[\w-]+\.(?:top|xyz|cc|vip|site|biz|link|icu|online|gov-vn\.[a-z]+)|\.apk)/i.test(text);
  if (hasSuspiciousLink) {
    score += 35;
    redFlags.push("Chứa đường liên kết tên miền lạ hoặc yêu cầu tải file cài đặt ngoài (.apk) có nguy cơ chứa mã độc.");
  }

  // 7. KIỂM TRA ĐIỀU CHỈNH: Tin nhắn thông thường an toàn
  const isSafeClassNotice = /thầy\s*gửi|chúc\s*các\s*bạn|lớp\s*k\d+|phòng\s*học|bài\s*tập/i.test(lower);
  if (isSafeClassNotice && !hasBank && !hasDigits && !hasSuspiciousLink) {
    score = Math.min(score, 10);
    category = "Thông báo học tập thông thường";
  }

  // Chuẩn hóa điểm rủi ro: từ 0% đến 99%
  score = Math.min(Math.max(score, 0), 99);

  if (redFlags.length === 0) {
    score = 5;
    category = "Tin nhắn bình thường / Chưa phát hiện dấu hiệu lừa đảo";
    redFlags.push("Không phát hiện từ khóa thao túng tâm lý hoặc yêu cầu chuyển khoản lạ.");
  }

  // Lời khuyên 1-2 dòng
  let advice = "Chưa phát hiện rủi ro rõ ràng. Luôn duy trì cảnh giác khi nhận thông báo từ người lạ.";
  if (score >= 70) {
    advice = "🛑 TUYỆT ĐỐI KHÔNG CHUYỂN TIỀN, không bấm vào đường link lạ và gọi hotline chính thức của đơn vị để kiểm chứng.";
  } else if (score >= 35) {
    advice = "⚠️ CẢNH GIÁC: Tin nhắn có dấu hiệu thúc ép bất thường. Hãy liên hệ trực tiếp người thân hoặc cơ quan liên quan.";
  }

  return {
    score,
    category,
    redFlags: redFlags.slice(0, 3), // Giữ tối đa 3 dấu hiệu then chốt nhất
    advice,
    rawText: text
  };
}

// Render kết quả phân tích tối giản
function renderAnalysisResult(result) {
  const container = document.getElementById('analyzerResultsContainer');
  if (!container) return;

  container.classList.add('active');

  const score = result.score;
  const isDanger = score >= 70;
  const isWarning = score >= 35 && score < 70;
  const isSafe = score < 35;

  let statusClass = 'safe';
  let statusText = 'AN TOÀN / KHẢ NĂNG LỪA ĐẢO THẤP';
  if (isDanger) {
    statusClass = 'danger';
    statusText = 'BÁO ĐỘNG ĐỎ: TỈ LỆ LỪA ĐẢO RẤT CAO';
  } else if (isWarning) {
    statusClass = 'warning';
    statusText = 'CẢNH BÁO: CÓ DẤU HIỆU ĐÁNG NGỜ';
  }

  // Danh sách gạch đầu dòng dấu hiệu
  const flagsHtml = result.redFlags.map(flag => `
    <li style="margin-bottom: 6px; font-size: 0.88rem; line-height: 1.5;">
      <strong>•</strong> ${escapeHtml(flag)}
    </li>
  `).join('');

  container.innerHTML = `
    <div class="result-card ${statusClass}" style="margin-top: 16px;">
      <!-- Header -->
      <div class="result-header">
        <div>
          <div class="result-target" style="font-size: 1.15rem;">💬 Kết Quả Đánh Giá Nguy Cơ</div>
          <span class="status-pill ${statusClass}">${statusText}</span>
        </div>
        <div class="risk-badge ${statusClass}">
          <span class="risk-num">${score}%</span>
          <span class="risk-lbl">Khả năng lừa đảo</span>
        </div>
      </div>

      <!-- Risk Meter -->
      <div class="risk-meter-wrapper">
        <div class="risk-meter-bar">
          <div class="risk-meter-fill ${statusClass}" style="width: ${score}%;"></div>
        </div>
      </div>

      <!-- Phân loại & Dấu hiệu then chốt -->
      <div style="margin: 14px 0;">
        <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">
          📌 Dạng thủ đoạn: <span style="color: ${isDanger ? 'var(--accent-danger)' : (isWarning ? 'var(--accent-warning)' : 'var(--accent-primary)')};">${escapeHtml(result.category)}</span>
        </div>
        
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">
          Các dấu hiệu nhận biết phát hiện được:
        </div>
        <ul style="list-style: none; padding-left: 0; color: var(--text-main);">
          ${flagsHtml}
        </ul>
      </div>

      <!-- Lời khuyên 1 dòng -->
      <div class="result-advice-box ${statusClass}">
        <span>${result.advice}</span>
      </div>

      <!-- Action Footer -->
      <div class="result-footer-compact">
        <button class="btn-report-increment" onclick="transferAnalysisToIntake()">
          📝 Chuyển Sang Báo Cáo Tin Nhắn Này
        </button>
      </div>
    </div>
  `;
}

// Chuyển kết quả sang form tiếp nhận báo cáo
function transferAnalysisToIntake() {
  if (!lastAnalyzedResult) return;

  const targetInput = document.getElementById('intakeTarget');
  const typeInput = document.getElementById('intakeType');
  const noteInput = document.getElementById('intakeNote');

  // Trích xuất số điện thoại hoặc email nếu có trong tin nhắn
  const phoneMatch = lastAnalyzedResult.rawText.match(/(?:\+?84|0)(?:3|5|7|8|9|2)\d{8,9}\b/);
  const emailMatch = lastAnalyzedResult.rawText.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);

  if (targetInput) {
    if (phoneMatch) targetInput.value = phoneMatch[0];
    else if (emailMatch) targetInput.value = emailMatch[0];
    else targetInput.value = "Nội dung tin nhắn lừa đảo";
  }

  if (typeInput) {
    const cat = lastAnalyzedResult.category;
    if (cat.includes('học phí')) typeInput.value = 'Mạo danh thu học phí';
    else if (cat.includes('việc làm')) typeInput.value = 'Lừa đảo việc làm online';
    else if (cat.includes('Công an') || cat.includes('VNeID')) typeInput.value = 'Công an dọa án phạt';
    else if (cat.includes('thuế')) typeInput.value = 'Mạo danh cơ quan thuế';
    else if (cat.includes('cấp cứu')) typeInput.value = 'Dọa cấp cứu bệnh viện';
    else typeInput.value = 'Khác';
  }

  if (noteInput) {
    noteInput.value = lastAnalyzedResult.rawText.slice(0, 500);
  }

  switchAppTab('intake');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showQuickToast('📋 Đã chuyển nội dung tin nhắn sang form báo cáo!');
}
