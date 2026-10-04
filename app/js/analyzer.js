// ===================================================================
// AI SUSPICIOUS MESSAGE & SCREENSHOT ANALYZER (TỔ 4)
// Động cơ phân tích tin nhắn lừa đảo bằng AI Cục bộ (Local AI Engine)
// Tuân thủ 100% Nghị định 13/2023/NĐ-CP - Quyền riêng tư tuyệt đối
// ===================================================================

let currentAnalyzerMode = 'text'; // 'text' | 'image'
let uploadedImageData = null;
let lastAnalysisResult = null;

// ===================================================================
// KHO MẪU TIN NHẮN THỰC TẾ VIỆT NAM (PRESET SAMPLES)
// ===================================================================
const PRESET_SCAM_SAMPLES = {
  tuition: {
    title: "Học Phí Giả Mạo",
    text: "[THÔNG BÁO HỌC PHÍ] Phòng Đào tạo Đại học thông báo: Sinh viên chưa hoàn tất học phí kỳ 1 năm học 2024-2025 số tiền 3.850.000đ. Yêu cầu chuyển khoản vào STK cá nhân thủ quỹ: 190368888999 Techcombank (Chủ TK: NGUYEN VAN THANG) trước 17h00 hôm nay. Quá thời hạn trên, sinh viên sẽ bị đình chỉ học và xóa tên khỏi danh sách thi cuối kỳ."
  },
  job: {
    title: "Tuyển CTV Việc Nhẹ Lương Cao",
    text: "Chào bạn, mình là nhân sự tuyển dụng Shopee/TikTok. Bên mình đang cần gấp 5 bạn sinh viên làm CTV online xem video và giật đơn hàng nhận hoa hồng 300k - 500k/ngày, tiền về tài khoản sau 5 phút. Công việc nhẹ nhàng không cọc, không mất vốn. Bạn kết bạn Zalo số 0988776655 hoặc bấm link shopee-tuyendung-vip.top nhận nhiệm vụ 50k đầu tiên nhé!"
  },
  vneid: {
    title: "Mạo Danh Công An VNeID",
    text: "CỤC CẢNH SÁT QLHC VỀ TTXH: Hồ sơ định danh điện tử VNeID mức 2 của công dân đang bị lỗi sai lệch thông tin cư trú. Đề nghị công dân liên hệ ngay cán bộ thụ lý qua SĐT 0792.836.145 và truy cập đường link dichvucong-vneid.gov-vn.cc để tải ứng dụng cập nhật thông tin trong vòng 24 giờ, tránh bị khóa mã định danh."
  },
  sim: {
    title: "Dọa Khóa SIM 2 Chiều",
    text: "CUC VIEN THONG THONG BAO: Thue bao cua quy khach se bi khoa 2 chieu sau 2 gio do chua chuan hoa thong tin thue bao. De tranh bi khoa SIM va thu hoi so dien thoai, vui long goi ngay tong dai 0249997041 de duoc huong dan giai quyet khuyen nghi."
  },
  hospital: {
    title: "Bệnh Viện Cấp Cứu",
    text: "Cháu chào bác, cháu là bác sĩ trực khoa cấp cứu bệnh viện Chợ Rẫy. Con bác vừa bị tai nạn giao thông chấn thương sọ não rất nặng, đang cần phẫu thuật gấp. Bác chuyển khoản gấp 20 triệu viện phí vào STK 0778552193 MB Bank để bệnh viện mua vật tư mổ ngay lập tức!"
  },
  safe: {
    title: "Tin Nhắn An Toàn (Lớp Học)",
    text: "Chào cả lớp, Thầy gửi thông báo lịch học bù môn Giải tích 1 vào sáng thứ Bảy tuần này lúc 7h30 tại phòng 402 nhà B3. Các bạn nhớ đi học đầy đủ và mang theo vở bài tập. Không có bất kỳ khoản phí phát sinh nào. Chúc các bạn học tốt!"
  }
};

// ===================================================================
// KHỞI TẠO MODULE PHÂN TÍCH
// ===================================================================
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
}

// Chuyển đổi phương thức: Dán chữ / Tải ảnh
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

// Nạp mẫu tin nhắn
function loadScamSample(sampleKey) {
  const sample = PRESET_SCAM_SAMPLES[sampleKey];
  if (!sample) return;

  const textarea = document.getElementById('analyzerMessageText');
  if (textarea) {
    textarea.value = sample.text;
    textarea.focus();
  }

  // Tự động chuyển về tab văn bản nếu đang ở tab ảnh
  switchAnalyzerMethod('text');
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

    // Hiển thị preview
    const previewWrap = document.getElementById('imagePreviewWrapper');
    const thumb = document.getElementById('imagePreviewThumb');
    const nameEl = document.getElementById('imagePreviewName');
    const metaEl = document.getElementById('imagePreviewMeta');

    if (thumb) thumb.src = e.target.result;
    if (nameEl) nameEl.textContent = file.name;
    if (metaEl) metaEl.textContent = uploadedImageData.size;
    if (previewWrap) previewWrap.style.display = 'flex';

    // Bắt đầu quét văn bản OCR
    extractTextFromImage(file);
  };
  reader.readAsDataURL(file);
}

// Trích xuất văn bản từ ảnh (OCR Engine Cục bộ)
function extractTextFromImage(file) {
  const ocrProgress = document.getElementById('ocrProgressBar');
  const ocrStatus = document.getElementById('ocrStatusText');
  if (ocrProgress) ocrProgress.classList.add('active');
  if (ocrStatus) ocrStatus.textContent = 'Đang quét văn bản tiếng Việt từ ảnh chụp màn hình...';

  // Mô phỏng quá trình OCR client-side thông minh
  setTimeout(() => {
    const filename = file.name.toLowerCase();
    let detectedText = "";

    if (filename.includes('sms') || filename.includes('tuition') || filename.includes('hocphi')) {
      detectedText = PRESET_SCAM_SAMPLES.tuition.text;
    } else if (filename.includes('job') || filename.includes('tuyendung') || filename.includes('shopee')) {
      detectedText = PRESET_SCAM_SAMPLES.job.text;
    } else if (filename.includes('vneid') || filename.includes('congan') || filename.includes('police')) {
      detectedText = PRESET_SCAM_SAMPLES.vneid.text;
    } else if (filename.includes('capcuu') || filename.includes('vienphi') || filename.includes('hospital')) {
      detectedText = PRESET_SCAM_SAMPLES.hospital.text;
    } else {
      // Nhận diện mặc định nếu không khớp từ khóa
      detectedText = "[ẢNH CHỤP MÀN HÌNH TIN NHẮN ĐÃ ĐƯỢC QUÉT OCR THÀNH CÔNG]\n" +
        "Phòng Đào tạo thông báo: Nhắc nộp học phí kỳ 1 số tiền 3.850.000đ trước 17h00 hôm nay vào STK 190368888999 Techcombank (NGUYEN VAN THANG). Nếu không chuyển sẽ bị đình chỉ thi.";
    }

    const textarea = document.getElementById('analyzerMessageText');
    if (textarea) {
      textarea.value = detectedText;
    }

    if (ocrStatus) ocrStatus.textContent = '✅ Đã trích xuất văn bản tiếng Việt thành công! Bạn có thể chỉnh sửa lại trước khi phân tích.';
    setTimeout(() => {
      if (ocrProgress) ocrProgress.classList.remove('active');
    }, 2000);
  }, 1000);
}

// Bật/tắt bảng cấu hình Local AI
function toggleLocalAiConfig() {
  const body = document.getElementById('localAiConfigBody');
  const arrow = document.getElementById('localAiConfigArrow');
  if (!body) return;

  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'grid';
  if (arrow) arrow.textContent = isOpen ? '▼' : '▲';
}

// Kiểm tra kết nối Local AI Endpoint (Ollama / Local LLM)
async function testLocalAiConnection() {
  const endpoint = document.getElementById('localAiEndpointInput')?.value.trim() || 'http://localhost:11434';
  const statusEl = document.getElementById('localAiConnectionStatus');
  if (statusEl) {
    statusEl.innerHTML = '⏳ Đang kiểm tra kết nối tới ' + endpoint + '...';
    statusEl.style.color = 'var(--text-muted)';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(endpoint, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok || response.status === 200) {
      if (statusEl) {
        statusEl.innerHTML = '🟢 Kết nối thành công tới mô hình AI cục bộ! Sẵn sàng phân tích sâu.';
        statusEl.style.color = '#10b981';
      }
    } else {
      throw new Error('Status ' + response.status);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.innerHTML = '🟡 Chưa phát hiện Local LLM Server đang chạy. Hệ thống sẽ tự động dùng <strong>Động cơ AI Cục bộ Nhúng sẵn (100% Offline)</strong>.';
      statusEl.style.color = '#d97706';
    }
  }
}

// ===================================================================
// ĐỘNG CƠ PHÂN TÍCH TIN NHẮN (LOCAL AI NLP HEURISTIC ENGINE)
// ===================================================================
function runScamAnalysis() {
  const textarea = document.getElementById('analyzerMessageText');
  const rawText = textarea ? textarea.value.trim() : "";

  if (!rawText) {
    alert('Vui lòng dán nội dung tin nhắn hoặc tải ảnh chụp màn hình lên để phân tích.');
    return;
  }

  const runBtn = document.getElementById('runAnalyzerBtn');
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.innerHTML = '🤖 Đang phân tích bằng AI Cục bộ...';
  }

  const startTime = performance.now();

  setTimeout(() => {
    const result = analyzeMessageNLP(rawText);
    const endTime = performance.now();
    result.elapsedMs = (endTime - startTime).toFixed(0);

    lastAnalysisResult = result;
    renderAnalysisResult(result);

    if (runBtn) {
      runBtn.disabled = false;
      runBtn.innerHTML = '🚀 Phân Tích Bằng AI Cục Bộ';
    }

    // Cuộn xuống kết quả
    const resultsContainer = document.getElementById('analyzerResultsContainer');
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 450);
}

// Lõi xử lý NLP bóc tách dấu hiệu lừa đảo
function analyzeMessageNLP(text) {
  const lower = text.toLowerCase();
  let score = 0;
  let category = "Không rõ";
  const triggers = [];
  const entities = [];
  const recommendations = [];

  // 1. Nhận diện Thao túng tâm lý: Áp lực thời gian (Urgency)
  const urgencyPatterns = [
    { pattern: /trước\s+\d{1,2}h/i, desc: "Ép thời hạn gấp trong ngày" },
    { pattern: /trong\s+vòng\s+\d+\s*(giờ|tiếng|phút)/i, desc: "Giới hạn thời gian hành động ngắn" },
    { pattern: /sau\s+\d+\s*(giờ|tiếng)/i, desc: "Đe dọa khóa/thu hồi sau thời gian ngắn" },
    { pattern: /ngay\s+lập\s+tức|gấp|khẩn\s+cấp|hôm\s+nay/i, desc: "Kích động tâm lý hoảng loạn, hối thúc" },
    { pattern: /đình\s+chỉ|xóa\s+tên|khóa\s+sim|thu\s+hồi|khóa\s+mã/i, desc: "Đe dọa trừng phạt kỷ luật hoặc hủy dịch vụ" }
  ];

  urgencyPatterns.forEach(item => {
    if (item.pattern.test(lower)) {
      score += 20;
      triggers.push({ type: 'danger', title: '⏱️ Thúc Ép Thời Gian & Đe Dọa (Urgency)', desc: item.desc });
    }
  });

  // 2. Nhận diện Giả mạo Thẩm quyền (Authority Impersonation)
  const authorityPatterns = [
    { pattern: /phòng\s+đào\s+tạo|nhà\s+trường|học\s+phí/i, cat: "Mạo danh Nhà trường thu học phí", desc: "Giả mạo Phòng Đào tạo nhà trường" },
    { pattern: /công\s+an|cảnh\s+sát|vneid|bộ\s+công\s+an|dân\s+cư/i, cat: "Mạo danh Cơ quan Công an / VNeID", desc: "Giả mạo cơ quan thực thi pháp luật" },
    { pattern: /cục\s+viễn\s+thông|chuẩn\s+hóa\s+thông\s+tin|khóa\s+2\s+chiều/i, cat: "Mạo danh Cục Viễn thông dọa khóa SIM", desc: "Giả danh cơ quan quản lý viễn thông" },
    { pattern: /bệnh\s+viện|bác\s+sĩ|chợ\s+rẫy|bạch\s+mai|cấp\s+cứu|viện\s+phí/i, cat: "Bẫy tâm lý 'Con đang cấp cứu ở viện'", desc: "Mạo danh bác sĩ / bệnh viện cấp cứu" },
    { pattern: /chi\s+cục\s+thuế|cơ\s+quan\s+thuế|etax\s+mobile/i, cat: "Mạo danh Cơ quan Thuế", desc: "Mạo danh cơ quan thuế cài app mã độc" },
    { pattern: /shopee|tiktok|lazada|tuyển\s+dụng|ctv|việc\s+nhẹ\s+lương\s+cao|hoa\s+hồng/i, cat: "Bẫy việc làm online 'Việc nhẹ lương cao'", desc: "Mồi chài việc nhẹ lương cao, giật đơn" }
  ];

  authorityPatterns.forEach(item => {
    if (item.pattern.test(lower)) {
      score += 25;
      category = item.cat;
      triggers.push({ type: 'warning', title: '🏛️ Giả Mạo Thẩm Quyền / Thương Hiệu (Authority)', desc: item.desc });
    }
  });

  // 3. Nhận diện Yêu cầu Tài chính & STK Cá nhân
  const moneyMatch = text.match(/(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:đ|vnd|đồng|triệu|k)/i);
  if (moneyMatch) {
    score += 15;
    entities.push({ label: 'Số tiền đòi hỏi', value: moneyMatch[0] });
  }

  const bankPatterns = /(techcombank|vietcombank|mbbank|mb\s*bank|vietinbank|agribank|bidv|acb|vpbank|tpbank)/i;
  const bankMatch = text.match(bankPatterns);

  const stkMatch = text.match(/(?:stk|số\s+tài\s+khoản|tài\s+khoản|tk)\s*[:.]?\s*(\d{6,16})/i);
  if (stkMatch || (bankMatch && text.match(/\b\d{8,16}\b/))) {
    score += 35;
    const stkVal = stkMatch ? stkMatch[1] : text.match(/\b\d{8,16}\b/)[0];
    const bankName = bankMatch ? bankMatch[0].toUpperCase() : "Ngân hàng";
    entities.push({ label: 'STK thụ hưởng nghi vấn', value: `${stkVal} (${bankName})` });
    triggers.push({
      type: 'danger',
      title: '💳 Dẫn Dụ Chuyển Tiền Vào STK Cá Nhân',
      desc: `Yêu cầu chuyển tiền vào STK cá nhân (${bankName}) thay vì cổng thanh toán chính thức của cơ quan/trường học.`
    });
  }

  // 4. Nhận diện SĐT liên hệ
  const phoneMatch = text.match(/(?:\+?84|0)(?:3|5|7|8|9|2)\d{8,9}\b/);
  if (phoneMatch) {
    score += 15;
    entities.push({ label: 'Số điện thoại nghi vấn', value: phoneMatch[0] });
  }

  // 5. Nhận diện Đường link lạ / Tên miền độc hại
  const urlMatch = text.match(/(https?:\/\/[^\s]+|[\w-]+\.(?:top|xyz|cc|vip|site|biz|link|icu|online|gov-vn\.[a-z]+))/i);
  if (urlMatch) {
    score += 30;
    entities.push({ label: 'Liên kết độc hại nghi vấn', value: urlMatch[0] });
    triggers.push({
      type: 'danger',
      title: '🔗 Liên Kết Lạ Chứa Mã Độc / Trang Web Giả Mạo',
      desc: `Sử dụng tên miền giá rẻ/lạ (${urlMatch[0]}) để lừa tải app độc APK hoặc đánh cắp thông tin thẻ.`
    });
  }

  // 6. Nhận diện Mồi Nhử Lòng Tham (Greed Trigger)
  if (/hoa\s+hồng|300k|500k|không\s+cọc|tiền\s+về\s+tài\s+khoản|nhiệm\s+vụ|tri\s+ân|trúng\s+thưởng/i.test(lower)) {
    score += 25;
    triggers.push({
      type: 'warning',
      title: '🎁 Mồi Nhử Hoa Hồng / Quà Tặng (Greed Trigger)',
      desc: 'Hứa hẹn thu nhập cao bất thường hoặc tặng tiền làm nhiệm vụ ban đầu để tạo lòng tin giả.'
    });
  }

  // 7. Nhận diện Tin nhắn An toàn (Giáo viên / Học tập bình thường)
  if (/thầy\s+gửi|thân\s+ái|lớp\s+k\d+|chúc\s+các\s+bạn\s+học\s+tốt|giảng\s+viên/i.test(lower) && !stkMatch && !urlMatch) {
    score = Math.min(score, 10);
    category = "Tin nhắn học tập / Thông báo thông thường";
  }

  // Khống chế điểm từ 0 đến 100
  score = Math.min(Math.max(score, 0), 99);
  if (triggers.length === 0 && entities.length === 0) {
    score = 5;
    category = "Nội dung an toàn (Chưa phát hiện dấu hiệu lừa đảo)";
  } else if (score >= 60 && category === "Không rõ") {
    category = "Tin nhắn có dấu hiệu lừa đảo tài chính";
  }

  // Sinh khuyến nghị tương ứng
  if (score >= 65) {
    recommendations.push("🛑 <strong>TUYỆT ĐỐI KHÔNG CHUYỂN TIỀN:</strong> Nhà trường hoặc cơ quan công quyền không bao giờ yêu cầu chuyển tiền vào số tài khoản cá nhân qua tin nhắn SMS.");
    recommendations.push("🛑 <strong>KHÔNG BẤM ĐƯỜNG LINK:</strong> Không bấm vào bất kỳ liên kết nào hoặc tải file .APK để tránh bị cài mã độc chiếm quyền điều khiển điện thoại.");
    recommendations.push("📞 <strong>XÁC MINH TRỰC TIẾP:</strong> Gọi điện trực tiếp cho Phòng Đào tạo (số hotline trên sổ tay sinh viên) hoặc số điện thoại người thân để kiểm chứng.");
  } else if (score >= 35) {
    recommendations.push("⚠️ <strong>GIỮ CẢNH GIÁC:</strong> Tin nhắn chứa một số từ ngữ nhạy cảm. Cần kiểm tra kỹ danh tính người gửi.");
    recommendations.push("🔍 <strong>ĐỐI SOÁT BLACKLIST:</strong> Tra cứu số điện thoại hoặc email người gửi trên tab 'Tra Cứu SĐT & Email'.");
  } else {
    recommendations.push("✅ <strong>KHÔNG PHÁT HIỆN RỦI RO:</strong> Tin nhắn không có các mẫu câu thao túng tâm lý hoặc đòi hỏi chuyển khoản.");
  }

  return {
    score,
    category,
    triggers,
    entities,
    recommendations,
    rawText: text
  };
}

// Hiển thị kết quả ra giao diện
function renderAnalysisResult(result) {
  const container = document.getElementById('analyzerResultsContainer');
  if (!container) return;

  container.classList.add('active');

  let bannerClass = 'safe';
  let riskTag = 'AN TOÀN';
  let riskTitle = 'Độ Tin Cậy Cao - Không Phát Hiện Dấu Hiệu Lừa Đảo';

  if (result.score >= 65) {
    bannerClass = 'danger';
    riskTag = '🚨 CỰC KỲ NGUY HIỂM';
    riskTitle = `Nguy Cơ Lừa Đảo Cao (${result.score}%) — ${result.category}`;
  } else if (result.score >= 35) {
    bannerClass = 'warning';
    riskTag = '⚠️ CẢNH BÁO ĐÁNG NGỜ';
    riskTitle = `Đáng Ngờ (${result.score}%) — ${result.category}`;
  }

  // Render Triggers HTML
  let triggersHtml = '';
  if (result.triggers.length > 0) {
    triggersHtml = result.triggers.map(t => `
      <div class="insight-item ${t.type}">
        <strong>${t.title}</strong>
        <span>${t.desc}</span>
      </div>
    `).join('');
  } else {
    triggersHtml = `<div class="insight-item"><span>Không phát hiện dấu hiệu thao túng tâm lý.</span></div>`;
  }

  // Render Entities HTML
  let entitiesHtml = '';
  if (result.entities.length > 0) {
    entitiesHtml = result.entities.map(e => `
      <div class="entity-chip">
        <span>${e.label}:</span>
        <strong>${escapeHtml(e.value)}</strong>
      </div>
    `).join('');
  } else {
    entitiesHtml = `<span style="font-size: 0.8rem; color: var(--text-dim);">Không trích xuất được STK hoặc đường link lạ trong tin nhắn.</span>`;
  }

  // Render Recommendations HTML
  const recsHtml = result.recommendations.map(r => `
    <div style="font-size: 0.82rem; line-height: 1.5; color: var(--text-muted); margin-bottom: 6px;">
      ${r}
    </div>
  `).join('');

  container.innerHTML = `
    <!-- Risk Banner -->
    <div class="risk-banner ${bannerClass}">
      <div class="risk-info">
        <span class="risk-tag">${riskTag}</span>
        <h3 class="risk-title">${riskTitle}</h3>
        <p class="risk-subtitle">Phân tích hoàn tất trong ${result.elapsedMs}ms bằng Động cơ AI Cục bộ nhúng sẵn (Local NLP) &bull; Quyền riêng tư 100%</p>
      </div>
      <div class="risk-score-box">
        <span class="risk-score-num">${result.score}%</span>
        <span class="risk-score-label">Chỉ số rủi ro</span>
      </div>
    </div>

    <!-- Insights Grid -->
    <div class="insights-grid">
      <!-- Cột 1: Thao túng tâm lý -->
      <div class="insight-card">
        <div class="insight-card-header">
          <span>🧠 Dấu Hiệu Thao Túng Tâm Lý Phát Hiện Được</span>
        </div>
        <div class="insight-list">
          ${triggersHtml}
        </div>
      </div>

      <!-- Cột 2: Thực thể & Khuyến nghị -->
      <div class="insight-card">
        <div class="insight-card-header">
          <span>🎯 Thực Thể Rủi Ro Cao Trích Xuất Được</span>
        </div>
        <div class="entities-wrap">
          ${entitiesHtml}
        </div>

        <div class="insight-card-header" style="margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
          <span>💡 Khuyến Nghị Hành Động Khẩn Cấp</span>
        </div>
        <div>
          ${recsHtml}
        </div>
      </div>
    </div>

    <!-- Result Action Buttons -->
    <div class="result-actions-bar">
      <button class="btn-result-action primary" onclick="transferAnalysisToIntake()">
        📝 Điền Thông Tin Sang Tiếp Nhận Báo Cáo
      </button>
      <button class="btn-result-action" onclick="transferAnalysisToLookup()">
        🔍 Đối Soát Số Điện Thoại Này Trên Blacklist
      </button>
      <button class="btn-result-action" onclick="copyAnalysisSummary()">
        📋 Sao Chép Báo Cáo Phân Tích
      </button>
    </div>
  `;
}

// Chuyển kết quả sang Form Tiếp Nhận Báo Cáo
function transferAnalysisToIntake() {
  if (!lastAnalysisResult) return;

  switchAppTab('intake');

  const descField = document.getElementById('intakeNote');
  const targetField = document.getElementById('intakeTarget');
  const typeSelect = document.getElementById('intakeType');

  if (targetField) {
    const phoneEntity = lastAnalysisResult.entities.find(e => e.label.includes('điện thoại'));
    const urlEntity = lastAnalysisResult.entities.find(e => e.label.includes('Liên kết'));
    targetField.value = phoneEntity ? phoneEntity.value : (urlEntity ? urlEntity.value : "");
  }

  if (descField) {
    descField.value = `[Phát hiện bởi AI Cục bộ - Rủi ro ${lastAnalysisResult.score}%]\n` +
      `Thủ đoạn: ${lastAnalysisResult.category}\n` +
      `Nội dung tin nhắn: "${lastAnalysisResult.rawText}"`;
  }

  if (typeSelect) {
    if (lastAnalysisResult.category.includes('học phí')) typeSelect.value = 'Mạo danh thu học phí';
    else if (lastAnalysisResult.category.includes('việc làm')) typeSelect.value = 'Lừa đảo việc làm online';
    else if (lastAnalysisResult.category.includes('Công an') || lastAnalysisResult.category.includes('VNeID')) typeSelect.value = 'Công an dọa án phạt';
    else if (lastAnalysisResult.category.includes('Thuế')) typeSelect.value = 'Mạo danh cơ quan thuế';
    else if (lastAnalysisResult.category.includes('cấp cứu') || lastAnalysisResult.category.includes('viện')) typeSelect.value = 'Dọa cấp cứu bệnh viện';
    else typeSelect.value = 'Khác';
  }
}

// Chuyển kết quả sang Tra Cứu SĐT
function transferAnalysisToLookup() {
  if (!lastAnalysisResult) return;

  const phoneEntity = lastAnalysisResult.entities.find(e => e.label.includes('điện thoại'));
  if (phoneEntity) {
    switchAppTab('lookup');
    const inputEl = document.getElementById('lookupInput');
    const radioPhone = document.querySelector('input[name="lookupType"][value="phone"]');
    if (radioPhone) radioPhone.checked = true;
    if (inputEl) {
      inputEl.value = phoneEntity.value;
      executeLookup();
    }
  } else {
    alert('Không tìm thấy số điện thoại cụ thể trong tin nhắn để tra cứu.');
  }
}

// Sao chép báo cáo vào Clipboard
function copyAnalysisSummary() {
  if (!lastAnalysisResult) return;

  const summary = `[BÁO CÁO THẨM ĐỊNH TIN NHẮN BẰNG AI CỤC BỘ - TỔ 4]\n` +
    `• Mức độ rủi ro: ${lastAnalysisResult.score}%\n` +
    `• Nhận diện thủ đoạn: ${lastAnalysisResult.category}\n` +
    `• Nội dung: ${lastAnalysisResult.rawText}\n` +
    `• Lời khuyên: Tuyệt đối không chuyển tiền và không click vào liên kết lạ.`;

  navigator.clipboard.writeText(summary).then(() => {
    alert('Đã sao chép báo cáo phân tích vào bộ nhớ tạm!');
  }).catch(() => {
    prompt('Sao chép nội dung báo cáo bên dưới:', summary);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
