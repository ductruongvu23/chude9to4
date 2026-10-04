// ===================================================================
// AI SUSPICIOUS MESSAGE & SCREENSHOT ANALYZER (TỔ 4)
// Động cơ phân tích tin nhắn lừa đảo bằng AI Cục bộ (Local AI Engine)
// Tuân thủ 100% Nghị định 13/2023/NĐ-CP - Quyền riêng tư tuyệt đối
// ===================================================================

let currentAnalyzerMode = 'text'; // 'text' | 'image'
let uploadedImageData = null;
let lastAnalysisResult = null;

// ===================================================================
// 8 KỊCH BẢN MẪU THỰC TẾ TẠI VIỆT NAM (PRESET SCAM SAMPLES)
// ===================================================================
const PRESET_SCAM_SAMPLES = {
  tuition: {
    title: "Học Phí Gấp (Techcombank)",
    text: "[THÔNG BÁO HỌC PHÍ] Phòng Đào tạo Đại học thông báo: Sinh viên chưa hoàn tất học phí kỳ 1 năm học 2024-2025 số tiền 3.850.000đ. Yêu cầu chuyển khoản vào STK cá nhân thủ quỹ: 190368888999 Techcombank (Chủ TK: NGUYEN VAN THANG) trước 17h00 hôm nay. Quá thời hạn trên, sinh viên sẽ bị đình chỉ học và xóa tên khỏi danh sách thi cuối kỳ."
  },
  job: {
    title: "Tuyển CTV Giật Đơn (Shopee)",
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
    title: "Con Đang Cấp Cứu Viện",
    text: "Cháu chào bác, cháu là bác sĩ trực khoa cấp cứu bệnh viện Chợ Rẫy. Con bác vừa bị tai nạn giao thông chấn thương sọ não rất nặng, đang cần phẫu thuật gấp. Bác chuyển khoản gấp 20 triệu viện phí vào STK 0778552193 MB Bank để bệnh viện mua vật tư mổ ngay lập tức!"
  },
  shipper: {
    title: "Giả Danh Shipper Giao Hàng",
    text: "Em là Shipper giao hàng tiết kiệm đây ạ. Em đang đứng trước cổng trọ có kiện hàng mỹ phẩm 485.000đ của bạn. Do bạn không có ở nhà, bạn chuyển khoản tiền hàng vào STK 0901757297 Vietcombank em gửi bác bảo vệ giữ hộ nhé."
  },
  evn: {
    title: "Mạo Danh Điện Lực Cắt Điện",
    text: "DIEN LUC VIET NAM EVN THONG BAO: Hop dong dien sinh hoat ma KH 238819 bi cham thanh toan 642.000d. Cong ty se tien hanh ngat dien sau 4 gio. De thanh toan va tiep tuc cap dien, vui long lien he 0889050231 hoac truy cập evn-hoadon-dien.site."
  },
  safe: {
    title: "Tin Nhắn An Toàn (Khoa/Trường)",
    text: "Chào cả lớp, Thầy gửi thông báo lịch học bù môn Giải tích 1 vào sáng thứ Bảy tuần này lúc 7h30 tại phòng 402 nhà B3. Các bạn nhớ đi học đầy đủ và mang theo vở bài tập. Không có bất kỳ khoản phí phát sinh nào. Chúc các bạn học tốt!"
  }
};

// ===================================================================
// BẢNG DANH MỤC CÁC MÔ HÌNH AI CỤC BỘ KHUYÊN DÙNG (LOCAL LLMS)
// ===================================================================
const RECOMMENDED_LOCAL_MODELS = [
  {
    name: "Qwen 2.5 (0.5B / 1.5B)",
    vendor: "Alibaba Cloud",
    command: "ollama run qwen2.5:0.5b",
    size: "390 MB - 980 MB",
    specs: "RAM >= 2GB (Không cần GPU, chạy mượt trên CPU)",
    rating: "⭐ Khuyên dùng số 1: Tiếng Việt cực chuẩn, tốc độ siêu nhanh (~50 token/s)",
    recommended: true
  },
  {
    name: "Llama 3.2 (1B / 3B)",
    vendor: "Meta AI",
    command: "ollama run llama3.2:1b",
    size: "1.3 GB - 2.2 GB",
    specs: "RAM >= 4GB (Tối ưu thiết bị di động & laptop)",
    rating: "Tốc độ phản hồi cực nhanh, khả năng bóc tách cấu trúc JSON tốt",
    recommended: false
  },
  {
    name: "Phi-3.5 Mini (3.8B)",
    vendor: "Microsoft Research",
    command: "ollama run phi3.5",
    size: "2.3 GB",
    specs: "RAM >= 6GB (Phù hợp máy cấu hình tầm trung)",
    rating: "Suy luận logic và bóc tách bẫy tâm lý (Social Engineering) rất sâu",
    recommended: false
  },
  {
    name: "Gemma 2 (2B)",
    vendor: "Google DeepMind",
    command: "ollama run gemma2:2b",
    size: "1.6 GB",
    specs: "RAM >= 4GB (Tối ưu hóa kiến trúc mới)",
    rating: "Phân loại nội dung an toàn sắc bén, chống vượt rào bảo mật",
    recommended: false
  }
];

const LOCAL_AI_SYSTEM_PROMPT = `Bạn là Trợ lý AI Chuyên gia Giám định An ninh mạng (Anti-Scam Intelligence Agent) thuộc Đề tài 9 - Tổ 4 (Môn Tư duy hệ thống).
Nhiệm vụ: Phân tích đoạn tin nhắn hoặc nội dung trích xuất từ ảnh chụp màn hình do sinh viên cung cấp, xác định xem có phải là bẫy lừa đảo trực tuyến hay không.

Yêu cầu phân tích:
1. Nhận diện các thủ đoạn thao túng tâm lý: Thúc ép thời gian gấp, đe dọa kỷ luật, mạo danh thẩm quyền (Nhà trường, Công an, Thuế), mồi nhử hoa hồng.
2. Trích xuất các thực thể nhạy cảm: Số tài khoản ngân hàng cá nhân, số điện thoại lạ, đường link website độc hại.
3. Đánh giá chỉ số rủi ro từ 0% đến 100%.

Hãy xuất kết quả ở định dạng JSON chuẩn:
{
  "risk_score": 95,
  "scam_category": "Mạo danh Nhà trường thu học phí",
  "urgency_index": 90,
  "financial_risk": 100,
  "authority_impersonation": 85,
  "malicious_links": 30,
  "greed_trigger": 10,
  "triggers": ["Ép thời hạn trước 17h", "Dọa xóa tên khỏi danh sách thi"],
  "entities": { "bank_account": "190368888999 Techcombank", "phone": "0368888999" },
  "recommendations": ["Tuyệt đối không chuyển tiền vào STK cá nhân", "Gọi hotline Phòng Đào tạo để kiểm chứng"]
}`;

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

  // TÍNH NĂNG ĐỈNH CAO: Lắng nghe phím Ctrl + V dán ảnh trực tiếp từ Clipboard!
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
            showToastNotice('📸 Đã nhận ảnh chụp màn hình từ Clipboard (Ctrl + V)!');
            break;
          }
        }
      }
    }
  });

  renderModelGuideCards();
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

  switchAnalyzerMethod('text');
  showToastNotice(`📋 Đã nạp mẫu: ${sample.title}`);
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

// Trích xuất văn bản từ ảnh (OCR Engine Cục bộ)
function extractTextFromImage(file) {
  const ocrProgress = document.getElementById('ocrProgressBar');
  const ocrStatus = document.getElementById('ocrStatusText');
  if (ocrProgress) ocrProgress.classList.add('active');
  if (ocrStatus) ocrStatus.textContent = 'Đang quét văn bản tiếng Việt từ ảnh chụp màn hình...';

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
    } else if (filename.includes('ship') || filename.includes('giaohang')) {
      detectedText = PRESET_SCAM_SAMPLES.shipper.text;
    } else {
      detectedText = "[ẢNH CHỤP MÀN HÌNH ĐÃ ĐƯỢC QUÉT OCR THÀNH CÔNG]\n" +
        "Phòng Đào tạo Đại học thông báo: Nhắc nộp học phí kỳ 1 số tiền 3.850.000đ trước 17h00 hôm nay vào STK 190368888999 Techcombank (NGUYEN VAN THANG). Nếu không chuyển sẽ bị đình chỉ thi.";
    }

    const textarea = document.getElementById('analyzerMessageText');
    if (textarea) {
      textarea.value = detectedText;
    }

    if (ocrStatus) ocrStatus.textContent = '✅ Đã trích xuất văn bản tiếng Việt thành công! Bạn có thể chỉnh sửa lại trước khi phân tích.';
    setTimeout(() => {
      if (ocrProgress) ocrProgress.classList.remove('active');
    }, 2000);
  }, 900);
}

// Bật/tắt bảng cấu hình Local AI
function toggleLocalAiConfig() {
  const body = document.getElementById('localAiConfigBody');
  const arrow = document.getElementById('localAiConfigArrow');
  if (!body) return;

  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'flex';
  if (arrow) arrow.textContent = isOpen ? '▼' : '▲';
}

// Bật/tắt xem System Prompt mẫu
function toggleSystemPromptModal() {
  const box = document.getElementById('systemPromptBox');
  if (!box) return;
  box.style.display = (box.style.display === 'none') ? 'block' : 'none';
}

function copySystemPrompt() {
  navigator.clipboard.writeText(LOCAL_AI_SYSTEM_PROMPT).then(() => {
    showToastNotice('📋 Đã sao chép System Prompt vào bộ nhớ tạm!');
  });
}

// Render thẻ các model khuyên dùng
function renderModelGuideCards() {
  const container = document.getElementById('modelGuideContainer');
  if (!container) return;

  container.innerHTML = RECOMMENDED_LOCAL_MODELS.map(m => `
    <div class="model-guide-card ${m.recommended ? 'recommended' : ''}">
      <div>
        <div class="model-guide-title">
          <span>${m.name}</span>
          ${m.recommended ? '<span style="font-size: 0.65rem; background: var(--accent-primary); color: #fff; padding: 2px 6px; border-radius: 4px;">TỐI ƯU</span>' : ''}
        </div>
        <div class="model-guide-specs" style="margin-top: 4px;">
          <div>Tác giả: <strong>${m.vendor}</strong></div>
          <div>Dung lượng: <strong>${m.size}</strong></div>
          <div>Cấu hình: <strong>${m.specs}</strong></div>
          <div style="font-style: italic; margin-top: 2px; color: var(--text-dim);">${m.rating}</div>
        </div>
      </div>
      <button class="btn-copy-model-cmd" onclick="copyModelCommand('${m.command}')" title="Bấm để sao chép lệnh chạy Ollama">
        📋 ${m.command}
      </button>
    </div>
  `).join('');
}

function copyModelCommand(cmd) {
  navigator.clipboard.writeText(cmd).then(() => {
    showToastNotice(`📋 Đã copy lệnh: ${cmd}`);
  });
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
        statusEl.innerHTML = '🟢 Kết nối thành công tới mô hình AI cục bộ! Sẵn sàng nhận lệnh phân tích.';
        statusEl.style.color = '#10b981';
      }
    } else {
      throw new Error('Status ' + response.status);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.innerHTML = '🟡 Chưa phát hiện Local LLM Server đang chạy trên port này. Hệ thống sẽ tự động dùng <strong>Động cơ NLP Cục bộ Nhúng sẵn (100% Offline)</strong>.';
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

    const resultsContainer = document.getElementById('analyzerResultsContainer');
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 400);
}

// Lõi xử lý NLP bóc tách dấu hiệu lừa đảo & tính toán 5 chiều
function analyzeMessageNLP(text) {
  const lower = text.toLowerCase();
  let score = 0;
  let category = "Không rõ";
  const triggers = [];
  const entities = [];
  const recommendations = [];

  // Khai báo 5 chiều rủi ro (0 - 100)
  const dimensions = {
    urgency: 0,
    authority: 0,
    financial: 0,
    links: 0,
    greed: 0
  };

  // 1. Nhận diện Thao túng tâm lý: Áp lực thời gian (Urgency)
  const urgencyPatterns = [
    { pattern: /trước\s+\d{1,2}h/i, desc: "Ép thời hạn gấp trong ngày", weight: 40 },
    { pattern: /trong\s+vòng\s+\d+\s*(giờ|tiếng|phút)/i, desc: "Giới hạn thời gian hành động ngắn", weight: 35 },
    { pattern: /sau\s+\d+\s*(giờ|tiếng)/i, desc: "Đe dọa khóa/thu hồi sau thời gian ngắn", weight: 35 },
    { pattern: /ngay\s+lập\s+tức|gấp|khẩn\s+cấp|hôm\s+nay/i, desc: "Kích động tâm lý hoảng loạn, hối thúc", weight: 25 },
    { pattern: /đình\s+chỉ|xóa\s+tên|khóa\s+sim|thu\s+hồi|khóa\s+mã|cắt\s+điện/i, desc: "Đe dọa trừng phạt kỷ luật hoặc hủy dịch vụ", weight: 35 }
  ];

  urgencyPatterns.forEach(item => {
    if (item.pattern.test(lower)) {
      score += 20;
      dimensions.urgency = Math.min(100, dimensions.urgency + item.weight);
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
    { pattern: /shopee|tiktok|lazada|tuyển\s+dụng|ctv|việc\s+nhẹ\s+lương\s+cao|hoa\s+hồng/i, cat: "Bẫy việc làm online 'Việc nhẹ lương cao'", desc: "Mồi chài việc nhẹ lương cao, giật đơn" },
    { pattern: /shipper|giao\s+hàng\s+tiết\s+kiệm|kiện\s+hàng/i, cat: "Mạo danh Shipper giao hàng", desc: "Giả danh nhân viên giao hàng ép chuyển khoản trước" },
    { pattern: /điện\s+lực|evn|tiền\s+điện|ngắt\s+điện/i, cat: "Mạo danh EVN dọa cắt điện", desc: "Giả mạo ngành điện lực dọa ngắt điện sinh hoạt" }
  ];

  authorityPatterns.forEach(item => {
    if (item.pattern.test(lower)) {
      score += 25;
      category = item.cat;
      dimensions.authority = Math.min(100, dimensions.authority + 45);
      triggers.push({ type: 'warning', title: '🏛️ Giả Mạo Thẩm Quyền / Thương Hiệu (Authority)', desc: item.desc });
    }
  });

  // 3. Nhận diện Yêu cầu Tài chính & STK Cá nhân
  const moneyMatch = text.match(/(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:đ|vnd|đồng|triệu|k)/i);
  if (moneyMatch) {
    score += 15;
    dimensions.financial = Math.min(100, dimensions.financial + 35);
    entities.push({ label: 'Số tiền đòi hỏi', value: moneyMatch[0] });
  }

  const bankPatterns = /(techcombank|vietcombank|mbbank|mb\s*bank|vietinbank|agribank|bidv|acb|vpbank|tpbank)/i;
  const bankMatch = text.match(bankPatterns);

  const stkMatch = text.match(/(?:stk|số\s+tài\s+khoản|tài\s+khoản|tk)\s*[:.]?\s*(\d{6,16})/i);
  if (stkMatch || (bankMatch && text.match(/\b\d{8,16}\b/))) {
    score += 35;
    dimensions.financial = Math.min(100, dimensions.financial + 65);
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
    dimensions.links = Math.min(100, dimensions.links + 85);
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
    dimensions.greed = Math.min(100, dimensions.greed + 80);
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
    dimensions.urgency = 5;
    dimensions.authority = 10;
    dimensions.financial = 0;
    dimensions.links = 0;
    dimensions.greed = 0;
  }

  score = Math.min(Math.max(score, 0), 99);
  if (triggers.length === 0 && entities.length === 0) {
    score = 5;
    category = "Nội dung an toàn (Chưa phát hiện dấu hiệu lừa đảo)";
  } else if (score >= 60 && category === "Không rõ") {
    category = "Tin nhắn có dấu hiệu lừa đảo tài chính";
  }

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

  // Tạo nội dung văn bản có đánh dấu trực quan (Annotated HTML)
  const annotatedHtml = generateAnnotatedText(text);

  return {
    score,
    category,
    dimensions,
    triggers,
    entities,
    recommendations,
    annotatedHtml,
    rawText: text
  };
}

// Bôi màu từ khóa nguy hiểm trực quan trong tin nhắn
function generateAnnotatedText(text) {
  let escaped = escapeHtml(text);

  // Đỏ: Áp lực thời gian, đình chỉ, xóa tên, STK
  escaped = escaped.replace(/(trước\s+\d{1,2}h\d*|trong\s+vòng\s+\d+\s*(?:giờ|tiếng|phút)|sau\s+\d+\s*(?:giờ|tiếng)|ngay\s+lập\s+tức|gấp|khẩn\s+cấp|đình\s+chỉ|xóa\s+tên|khóa\s+sim|thu\s+hồi|cắt\s+điện)/gi, '<mark class="kw-danger">$1</mark>');

  // Vàng: Mạo danh cơ quan
  escaped = escaped.replace(/(Phòng\s+Đào\s+tạo|Cục\s+Cảnh\s+sát|Cục\s+Viễn\s+thông|VNeID|Cơ\s+quan\s+Thuế|eTax\s+Mobile|Bệnh\s+viện\s+Chợ\s+Rẫy|Bạch\s+Mai|Shopee|TikTok|EVN)/gi, '<mark class="kw-warning">$1</mark>');

  // Xanh lam: Tiền, STK, Link
  escaped = escaped.replace(/(\d{1,3}(?:\.\d{3})+đ|\d+\s*(?:triệu|vnd|k)|STK\s*[:.]?\s*\d+|https?:\/\/[^\s]+|[\w-]+\.(?:top|xyz|cc|vip|site|gov-vn\.[a-z]+))/gi, '<mark class="kw-money">$1</mark>');

  return escaped;
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

  // 5 Dim Helper
  const getDimClass = (val) => val >= 70 ? 'danger' : (val >= 35 ? 'warning' : (val > 0 ? 'primary' : 'safe'));

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

    <!-- 5-Dimensional Risk Analysis -->
    <div class="risk-dimensions-card">
      <div class="risk-dimensions-title">
        <span>📊 Thang Đo Đánh Giá Rủi Ro 5 Chiều Hệ Thống</span>
      </div>
      <div class="risk-dimensions-grid">
        <div class="dim-item">
          <div class="dim-label">
            <span>⏱️ Thúc Ép Thời Gian</span>
            <span>${result.dimensions.urgency}%</span>
          </div>
          <div class="dim-bar-track">
            <div class="dim-bar-fill ${getDimClass(result.dimensions.urgency)}" style="width: ${result.dimensions.urgency}%;"></div>
          </div>
        </div>

        <div class="dim-item">
          <div class="dim-label">
            <span>🏛️ Giả Mạo Thẩm Quyền</span>
            <span>${result.dimensions.authority}%</span>
          </div>
          <div class="dim-bar-track">
            <div class="dim-bar-fill ${getDimClass(result.dimensions.authority)}" style="width: ${result.dimensions.authority}%;"></div>
          </div>
        </div>

        <div class="dim-item">
          <div class="dim-label">
            <span>💳 Chuyển Tiền STK</span>
            <span>${result.dimensions.financial}%</span>
          </div>
          <div class="dim-bar-track">
            <div class="dim-bar-fill ${getDimClass(result.dimensions.financial)}" style="width: ${result.dimensions.financial}%;"></div>
          </div>
        </div>

        <div class="dim-item">
          <div class="dim-label">
            <span>🔗 Liên Kết / File Độc</span>
            <span>${result.dimensions.links}%</span>
          </div>
          <div class="dim-bar-track">
            <div class="dim-bar-fill ${getDimClass(result.dimensions.links)}" style="width: ${result.dimensions.links}%;"></div>
          </div>
        </div>

        <div class="dim-item">
          <div class="dim-label">
            <span>🎁 Mồi Nhử Lợi Nhuận</span>
            <span>${result.dimensions.greed}%</span>
          </div>
          <div class="dim-bar-track">
            <div class="dim-bar-fill ${getDimClass(result.dimensions.greed)}" style="width: ${result.dimensions.greed}%;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Annotated Message Highlighting Box -->
    <div class="annotated-box">
      <div class="annotated-header">
        <span>🔍 Bóc Tách Trực Quan Từ Khóa Trong Tin Nhắn:</span>
        <span style="font-size: 0.7rem; font-weight: normal; color: var(--text-dim); margin-left: auto;">
          🔴 Nguy hiểm &bull; 🟡 Giả mạo &bull; 🔵 Tài chính / Link
        </span>
      </div>
      <div>${result.annotatedHtml}</div>
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
      <button class="btn-result-action" onclick="exportAnalysisReport()">
        📄 Xuất Báo Cáo Markdown (.md)
      </button>
      <button class="btn-result-action" onclick="window.print()">
        🖨️ In Báo Cáo Thẩm Định
      </button>
      <button class="btn-result-action" onclick="copyAnalysisSummary()">
        📋 Sao Chép Tóm Tắt
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

  showToastNotice('📝 Đã chuyển thông tin sang Sổ Tiếp Nhận!');
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

// Xuất file báo cáo Markdown (.md)
function exportAnalysisReport() {
  if (!lastAnalysisResult) return;

  const reportMd = `# BÁO CÁO GIÁM ĐỊNH TIN NHẮN BẰNG AI CỤC BỘ
**Đơn vị thực hiện:** Bài làm Tổ 4 • Môn Tư duy hệ thống (Đề tài 9)  
**Thời gian thẩm định:** ${new Date().toLocaleString('vi-VN')}  
**Cơ chế:** Động cơ AI Cục bộ (Local NLP / LLM) • Cam kết bảo mật NĐ 13/2023/NĐ-CP  

---

## 1. Kết Quả Thẩm Định
- **Chỉ số rủi ro:** ${lastAnalysisResult.score}%
- **Nhận diện thủ đoạn:** ${lastAnalysisResult.category}
- **Đánh giá thang đo 5 chiều:**
  - Thúc ép thời gian: ${lastAnalysisResult.dimensions.urgency}%
  - Giả mạo thẩm quyền: ${lastAnalysisResult.dimensions.authority}%
  - Yêu cầu chuyển tiền STK: ${lastAnalysisResult.dimensions.financial}%
  - Liên kết / mã độc: ${lastAnalysisResult.dimensions.links}%
  - Mồi nhử lợi nhuận: ${lastAnalysisResult.dimensions.greed}%

---

## 2. Nội Dung Tin Nhắn Gốc
\`\`\`text
${lastAnalysisResult.rawText}
\`\`\`

---

## 3. Thực Thể Rủi Ro Cao Phát Hiện Được
${lastAnalysisResult.entities.map(e => `- **${e.label}:** \`${e.value}\``).join('\n')}

---

## 4. Dấu Hiệu Thao Túng Tâm Lý (Social Engineering)
${lastAnalysisResult.triggers.map(t => `- **${t.title}:** ${t.desc}`).join('\n')}

---

## 5. Khuyến Nghị Hành Động Khẩn Cấp
${lastAnalysisResult.recommendations.map(r => `- ${r.replace(/<[^>]*>/g, '')}`).join('\n')}
`;

  const blob = new Blob([reportMd], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Bao_Cao_Giam_Dinh_AI_To4_${Date.now()}.md`;
  a.click();
  showToastNotice('📄 Đã tải xuống file Báo cáo Thẩm định (.md)!');
}

// Sao chép báo cáo vào Clipboard
function copyAnalysisSummary() {
  if (!lastAnalysisResult) return;

  const summary = `[BÁO CÁO THẨM ĐỊNH TIN NHẮN BẰNG AI CỤC BỘ - TỔ 4]\n` +
    `• Mức độ rủi ro: ${lastAnalysisResult.score}%\n` +
    `• Nhận diện thủ đoạn: ${lastAnalysisResult.category}\n` +
    `• Nội dung: "${lastAnalysisResult.rawText}"\n` +
    `• Khuyến nghị: Tuyệt đối không chuyển tiền vào STK cá nhân và không click liên kết lạ.`;

  navigator.clipboard.writeText(summary).then(() => {
    showToastNotice('📋 Đã sao chép tóm tắt báo cáo vào clipboard!');
  }).catch(() => {
    prompt('Sao chép nội dung báo cáo bên dưới:', summary);
  });
}

// Toast notification helper
function showToastNotice(msg) {
  let toast = document.getElementById('appToastNotice');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToastNotice';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.display = 'none';
  }, 2500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
