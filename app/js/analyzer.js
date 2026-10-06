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
  ocrJobId++; // Bỏ qua kết quả OCR của ảnh vừa gỡ
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

// ===================================================================
// NHẬN DIỆN CHỮ TRONG ẢNH (OCR THẬT - Tesseract.js, tiếng Việt)
// - Chạy hoàn toàn trên trình duyệt: ảnh KHÔNG được tải lên máy chủ nào.
// - Thư viện (~ vài MB) chỉ được tải khi người dùng đưa ảnh lên lần đầu.
// - Phiên bản cố định + kiểm tra toàn vẹn (SRI) cho file script chính.
// ===================================================================
const OCR_CONFIG = {
  scriptUrl: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
  scriptIntegrity: 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F',
  workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
  corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
  langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/vie/4.0.0_best_int',
  lang: 'vie'
};

let ocrScriptPromise = null;
let ocrWorkerPromise = null;
let ocrProgressHandler = null;
let ocrJobId = 0;

function loadOcrLibrary() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (ocrScriptPromise) return ocrScriptPromise;

  ocrScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = OCR_CONFIG.scriptUrl;
    script.integrity = OCR_CONFIG.scriptIntegrity;
    script.crossOrigin = 'anonymous';
    script.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Không khởi tạo được thư viện OCR')));
    script.onerror = () => reject(new Error('Không tải được thư viện nhận diện chữ (kiểm tra kết nối mạng)'));
    document.head.appendChild(script);
  }).catch(err => {
    ocrScriptPromise = null; // Cho phép thử lại lần sau
    throw err;
  });
  return ocrScriptPromise;
}

function getOcrWorker() {
  if (ocrWorkerPromise) return ocrWorkerPromise;

  ocrWorkerPromise = loadOcrLibrary()
    .then(Tesseract => Tesseract.createWorker(OCR_CONFIG.lang, 1, {
      workerPath: OCR_CONFIG.workerPath,
      corePath: OCR_CONFIG.corePath,
      langPath: OCR_CONFIG.langPath,
      logger: m => { if (ocrProgressHandler) ocrProgressHandler(m); }
    }))
    .catch(err => {
      ocrWorkerPromise = null;
      throw err;
    });
  return ocrWorkerPromise;
}

const OCR_STATUS_TEXT = {
  'loading tesseract core': 'Đang tải bộ nhận diện chữ',
  'initializing tesseract': 'Đang khởi động bộ nhận diện',
  'loading language traineddata': 'Đang tải dữ liệu tiếng Việt',
  'initializing api': 'Đang chuẩn bị',
  'recognizing text': 'Đang đọc chữ trong ảnh'
};

async function extractTextFromImage(file) {
  const jobId = ++ocrJobId;
  const ocrProgress = document.getElementById('ocrProgressBar');
  const ocrStatus = document.getElementById('ocrStatusText');
  const setStatus = text => { if (ocrStatus && jobId === ocrJobId) ocrStatus.textContent = text; };

  if (ocrProgress) ocrProgress.classList.add('active');
  setStatus('Đang tải bộ nhận diện chữ (lần đầu có thể mất vài giây)...');

  ocrProgressHandler = m => {
    const label = OCR_STATUS_TEXT[m.status];
    if (label) setStatus(`${label}... ${Math.round((m.progress || 0) * 100)}%`);
  };

  try {
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(file);
    if (jobId !== ocrJobId) return; // Người dùng đã chọn ảnh khác

    const text = (data && data.text ? data.text : '').replace(/[ \t]+\n/g, '\n').trim();
    const textarea = document.getElementById('analyzerMessageText');

    if (!text) {
      setStatus('⚠️ Không đọc được chữ trong ảnh. Hãy thử ảnh rõ nét hơn hoặc dán nội dung tin nhắn vào ô bên dưới.');
      return;
    }

    if (textarea) textarea.value = text;
    setStatus('✅ Đã đọc chữ từ ảnh. Hãy kiểm tra lại nội dung (có thể sai vài ký tự) rồi bấm Phân tích.');
  } catch (err) {
    console.error('[Analyzer] Lỗi OCR:', err);
    setStatus(`❌ ${err.message || 'Không nhận diện được ảnh'}. Bạn có thể dán nội dung tin nhắn trực tiếp.`);
  } finally {
    if (jobId === ocrJobId) {
      ocrProgressHandler = null;
      setTimeout(() => {
        if (ocrProgress && jobId === ocrJobId) ocrProgress.classList.remove('active');
      }, 4000);
    }
  }
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
    try {
      let analysis = analyzeMessageContext(rawText);

      // Mini AI (chạy ngay trên máy) đọc từ ngữ trong tin nhắn; lỗi thì giữ nguyên kết quả quy tắc
      if (typeof MiniAI !== 'undefined' && MiniAI.isReady()) {
        analysis = MiniAI.merge(analysis, MiniAI.analyze(rawText));
        analysis.advice = adviceForScore(analysis.score);
      }

      lastAnalyzedResult = analysis;
      renderAnalysisResult(analysis);
    } catch (err) {
      console.error('[Analyzer] Lỗi phân tích:', err);
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = '🔍 Phân Tích Mức Độ Rủi Ro';
      }
    }

    const resultsContainer = document.getElementById('analyzerResultsContainer');
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 350);
}

// Lời khuyên 1 dòng theo điểm rủi ro
function adviceForScore(score) {
  if (score >= 70) {
    return "🛑 TUYỆT ĐỐI KHÔNG CHUYỂN TIỀN, không bấm vào đường link lạ và gọi hotline chính thức của đơn vị để kiểm chứng.";
  }
  if (score >= 35) {
    return "⚠️ CẢNH GIÁC: Tin nhắn có dấu hiệu thúc ép bất thường. Hãy liên hệ trực tiếp người thân hoặc cơ quan liên quan.";
  }
  return "Chưa phát hiện rủi ro rõ ràng. Luôn duy trì cảnh giác khi nhận thông báo từ người lạ.";
}

// Tìm SĐT / email trong tin nhắn (chấp nhận dấu chấm, khoảng trắng, gạch ngang)
function extractContactTargets(text) {
  const found = [];
  const seen = new Set();
  const add = (raw, type) => {
    const key = type === 'email' ? normalizeTarget(raw) : RiskEngine.normalizePhone(raw);
    if (!seen.has(key)) { seen.add(key); found.push({ raw: raw.trim(), key, type }); }
  };

  (text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || []).forEach(m => add(m, 'email'));

  const phoneRe = /(?:\+|00)\d{1,3}(?:[ .-]?\d){6,12}|\b0\d(?:[ .-]?\d){7,9}\b|\b1[89]00(?:[ .-]?\d){4,6}\b/g;
  (text.match(phoneRe) || []).forEach(m => {
    const digits = m.replace(/\D/g, '');
    // Bỏ chuỗi số quá dài (thường là số tài khoản ngân hàng, không phải SĐT)
    if (digits.length >= 8 && digits.length <= 14) add(m, 'phone');
  });

  return found.slice(0, 5);
}

// Lõi phân tích từ khóa và ngữ cảnh tâm lý
function analyzeMessageContext(text) {
  const lower = text.toLowerCase();
  // So khớp trên văn bản đã bỏ dấu: tin nhắn lừa đảo hay viết không dấu,
  // và chữ đọc từ ảnh (OCR) thường sai/mất dấu.
  const plain = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  let score = 0;
  const redFlags = [];
  let category = "Tin nhắn có dấu hiệu bất thường";

  // 1. NGỮ CẢNH: Mạo danh cơ quan công quyền / Pháp luật / VNeID / Thuế
  const isAuthority = /cong\s*an|canh\s*sat|vien\s*kiem\s*sat|toa\s*an|dieu\s*tra|vneid|dinh\s*danh\s*(?:dien\s*tu|muc\s*2)|chi\s*cuc\s*thue|etax|co\s*quan\s*thue/.test(plain);
  const hasLegalThreat = /lenh\s*bat|tam\s*giam|rua\s*tien|ma\s*tuy|khoi\s*to|sai\s*lech\s*cccd|khoa\s*ma|giay\s*trieu\s*tap/.test(plain);

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
  const isJobTrap = /viec\s*nhe\s*luong\s*cao|tuyen\s*ctv|cong\s*tac\s*vien|giat\s*don|hoa\s*hong|shopee|tiktok|lazada|nhiem\s*vu|\b[1-9]\d{2}k\b|khong\s*(?:can\s*)?coc|tien\s*ve\s*sau/.test(plain);
  if (isJobTrap) {
    score += 55;
    category = "Bẫy việc làm online / Lừa nạp tiền làm nhiệm vụ";
    redFlags.push("Mồi nhử việc nhẹ lương cao, làm nhiệm vụ nhận hoa hồng lớn trong thời gian ngắn.");
    if (/nap\s*tien|\bvon\b|chuyen\s*khoan|vi\s*dien\s*tu/.test(plain)) {
      score += 20;
      redFlags.push("Dẫn dụ nạp tiền giữ chỗ hoặc nạp cọc để mở khóa nhiệm vụ.");
    }
  }

  // 3. NGỮ CẢNH: Tài chính & STK cá nhân & Mã OTP
  const hasBank = /(techcombank|vietcombank|mbbank|mb\s*bank|vietinbank|agribank|bidv|\bacb\b|vpbank|tpbank)/.test(plain);
  const hasAccountKeyword = /\bstk\b|so\s*tai\s*khoan|tai\s*khoan|chuyen\s*khoan|chuyen\s*tien/.test(plain);
  const hasDigits = /\b\d{6,16}\b/.test(text);

  if ((hasBank && hasDigits) || (hasAccountKeyword && hasDigits)) {
    score += 40;
    redFlags.push("Yêu cầu chuyển tiền trực tiếp vào số tài khoản ngân hàng cá nhân.");
  }

  if (/\botp\b|ma\s*xac\s*(?:thuc|nhan)|mat\s*khau/.test(plain)) {
    score += 35;
    redFlags.push("Đòi hỏi cung cấp mã xác thực OTP hoặc thông tin bảo mật tài khoản.");
  }

  // 4. NGỮ CẢNH: Mạo danh học phí trường học hoặc Cấp cứu người thân
  if (/phong\s*dao\s*tao|nha\s*truong|hoc\s*phi\s*(?:gap|con\s*thieu|bo\s*sung)|dinh\s*chi\s*thi|xoa\s*ten/.test(plain)) {
    score += 45;
    category = "Mạo danh Nhà trường thu học phí";
    redFlags.push("Giả danh Phòng Đào tạo/Nhà trường thúc ép nộp học phí vào STK cá nhân, đe dọa đình chỉ thi.");
  }

  if (/benh\s*vien|cap\s*cuu|vien\s*phi|chan\s*thuong|mo\s*gap|tai\s*nan/.test(plain)) {
    score += 55;
    category = "Bẫy tâm lý mạo danh cấp cứu bệnh viện";
    redFlags.push("Đánh vào tâm lý hoảng loạn, thông báo người thân gặp tai nạn nguy kịch ép chuyển viện phí gấp.");
  }

  // 5. NGỮ CẢNH: Thúc ép thời gian (Áp lực hành động nhanh)
  const isUrgent = /truoc\s*\d{1,2}\s*h|trong\s*vong\s*\d+|sau\s*\d+\s*(?:gio|tieng)|ngay\s*lap\s*tuc|khan\s*cap|hom\s*nay|han\s*chot/.test(plain);
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
  const isSafeClassNotice = /thay\s*gui|chuc\s*cac\s*ban|lop\s*k\d+|phong\s*hoc|bai\s*tap/.test(plain);
  if (isSafeClassNotice && !hasBank && !hasDigits && !hasSuspiciousLink) {
    score = Math.min(score, 10);
    category = "Thông báo học tập thông thường";
  }

  // 8. ĐỐI SOÁT SĐT / EMAIL TRONG TIN NHẮN (RiskEngine: danh sách cảnh báo công khai + quy tắc nhận diện)
  const targets = (typeof RiskEngine !== 'undefined')
    ? extractContactTargets(text).map(t => ({ ...t, assessment: RiskEngine.assess(t.raw) }))
    : [];
  const targetFlags = [];
  targets.forEach(t => {
    const a = t.assessment;
    if (a.riskScore < 40) return;
    const top = a.flags.find(f => f.severity !== 'info');
    targetFlags.push(`${t.type === 'email' ? 'Email' : 'Số'} ${t.raw}: ${top ? top.title : a.riskLabel} (${a.riskScore}%).`);
    score = Math.max(score, a.riskScore);
    // Chỉ dùng nhãn của SĐT/email khi nội dung tin nhắn chưa xác định được thủ đoạn
    if (a.isListed && a.category && category === "Tin nhắn có dấu hiệu bất thường") category = a.category;
  });

  // Chuẩn hóa điểm rủi ro: từ 0% đến 99%
  score = Math.min(Math.max(score, 0), 99);

  if (redFlags.length === 0 && targetFlags.length === 0) {
    score = 5;
    category = "Tin nhắn bình thường / Chưa phát hiện dấu hiệu lừa đảo";
    redFlags.push("Không phát hiện từ khóa thao túng tâm lý hoặc yêu cầu chuyển khoản lạ.");
  }

  // Lời khuyên 1-2 dòng
  const advice = adviceForScore(score);

  return {
    score,
    category,
    // Ưu tiên dấu hiệu từ SĐT/email đã bị cảnh báo, sau đó tối đa 3 dấu hiệu ngữ cảnh
    redFlags: [...targetFlags, ...redFlags.slice(0, 3)],
    targets,
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
          📌 Dạng thủ đoạn: <span style="color: ${isDanger ? 'var(--accent-danger)' : (isWarning ? 'var(--warning)' : 'var(--accent-primary)')};">${escapeHtml(result.category)}</span>
        </div>
        ${result.ai ? `
        <div class="ai-similarity-line" id="aiSimilarityLine">
          🧠 Mini AI: <strong>${result.ai.percent}%</strong> khả năng lừa đảo${result.ai.looksSafe
            ? ' (giống tin nhắn bình thường)'
            : ` (gần nhất với "${escapeHtml(result.ai.labelName)}")`}${result.ai.words.length
            ? `<br><span class="ai-suspicious-words">Từ ngữ đáng ngờ: ${result.ai.words.map(w => `<mark>${escapeHtml(w)}</mark>`).join(' ')}</span>`
            : ''}
        </div>` : ''}
        
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

      <p class="risk-disclaimer">⚠️ Kết quả được suy ra tự động từ từ khóa và danh sách cảnh báo công khai, chỉ mang tính tham khảo: tin nhắn bình thường có thể bị đánh giá nhầm và ngược lại. Khi nghi ngờ, hãy xác minh qua kênh chính thức trước khi làm theo bất kỳ yêu cầu nào.</p>

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

  // Ưu tiên SĐT/email nguy cơ cao nhất tìm thấy trong tin nhắn
  const targets = (lastAnalyzedResult.targets || [])
    .slice()
    .sort((a, b) => (b.assessment ? b.assessment.riskScore : 0) - (a.assessment ? a.assessment.riskScore : 0));
  const bestTarget = targets[0];

  if (targetInput) {
    // Không có SĐT/email: để trống cho người dùng tự nhập (ô này bắt buộc là SĐT hoặc email hợp lệ)
    targetInput.value = bestTarget ? bestTarget.raw : '';
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
  if (bestTarget) {
    showQuickToast('📋 Đã chuyển nội dung tin nhắn sang form báo cáo!');
  } else {
    showQuickToast('📋 Đã chuyển nội dung. Hãy nhập SĐT hoặc email của người gửi tin nhắn.');
    if (targetInput) targetInput.focus();
  }
}
