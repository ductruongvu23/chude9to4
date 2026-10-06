// ===================================================================
// MINI AI - PHÂN LOẠI TIN NHẮN LỪA ĐẢO NGAY TRÊN TRÌNH DUYỆT (Task C-05)
// - Mô hình hồi quy logistic nhỏ (~60 KB, app/js/mini-ai-model.js) do Tổ 4 tự huấn luyện
//   bằng tools/mini_ai/train.py: đọc từ ngữ (đã bỏ dấu) và cặp từ trong tin nhắn.
// - Chạy hoàn toàn trên máy: không gửi tin nhắn đi đâu, không cần máy chủ / tài khoản.
// - Là TÍN HIỆU PHỤ: một mình Mini AI tối đa đẩy lên mức "cảnh giác", không lên "nguy cơ cao".
// ===================================================================

const MiniAI = (function () {
  const CONFIG = {
    minScamProb: 0.6, // xác suất "lừa đảo" tối thiểu để coi là nghi vấn
    safeProb: 0.7,    // xác suất "bình thường" để ghi nhận là giống tin thường
    aiOnlyFloor: 45,  // Mini AI phát hiện nhưng quy tắc không: nâng lên mức cảnh giác
    aiOnlyCap: 60,    // ... nhưng không vượt mức này
    boost: 10,        // đồng thuận với quy tắc: cộng thêm
    topWords: 4
  };

  const model = typeof MINI_AI_MODEL !== 'undefined' ? MINI_AI_MODEL : null;
  const SAFE = model ? model.labels.indexOf('safe') : -1;

  // PHẢI giống hệt tokenize() trong tools/mini_ai/train.py
  function tokenize(text) {
    const t = String(text).toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
      .replace(/[0-9]+/g, '#');
    return t.split(/[^a-z#]+/).filter(Boolean);
  }

  function features(text) {
    const toks = tokenize(text);
    const feats = new Set(toks);
    for (let i = 0; i + 1 < toks.length; i++) feats.add(`${toks[i]} ${toks[i + 1]}`);
    return feats;
  }

  function isReady() {
    return !!model;
  }

  function analyze(text) {
    if (!model || !String(text || '').trim()) return null;
    const n = model.labels.length;
    const z = model.bias.slice();
    const used = [];
    features(text).forEach(f => {
      const w = model.weights[f];
      if (!w) return;
      used.push([f, w]);
      for (let c = 0; c < n; c++) z[c] += w[c];
    });

    const max = Math.max(...z);
    const exp = z.map(v => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    const probs = exp.map(v => v / sum);

    const scamProb = 1 - probs[SAFE];
    // Loại thủ đoạn khả nghi nhất (bỏ qua "bình thường")
    let bestScam = SAFE === 0 ? 1 : 0;
    probs.forEach((p, i) => { if (i !== SAFE && p > probs[bestScam]) bestScam = i; });
    // Tổng xác suất lừa đảo đủ cao -> lấy loại thủ đoạn khả nghi nhất, kể cả khi từng loại thấp hơn "bình thường"
    const best = scamProb >= CONFIG.minScamProb || probs[bestScam] > probs[SAFE] ? bestScam : SAFE;
    const label = model.labels[best];

    // Giải thích: từ ngữ đẩy mạnh nhất về phía loại thủ đoạn được dự đoán (so với "bình thường")
    const words = [];
    if (label !== 'safe') {
      used.map(([f, w]) => [f, w[best] - w[SAFE]])
        // Ưu tiên cụm 2 từ (dễ hiểu hơn), bỏ từ đơn quá ngắn / ít nghĩa
        .filter(([f, s]) => s > 0 && (f.includes(' ') || f.length >= 4))
        .sort((a, b) => (b[0].includes(' ') - a[0].includes(' ')) || b[1] - a[1])
        .forEach(([f]) => {
          if (words.length >= CONFIG.topWords) return;
          // Bỏ từ/cặp từ trùng lặp với cụm đã chọn (so theo từng từ)
          const ft = f.split(' ');
          if (words.some(w => {
            const wt = w.split(' ');
            return ft.every(p => wt.includes(p)) || wt.every(p => ft.includes(p));
          })) return;
          words.push(f);
        });
    }

    return {
      label,
      labelName: model.labelNames[label] || label,
      scamProb,
      safeProb: probs[SAFE],
      words: words.map(w => w.replace(/#/g, '[số]')), // "#" = mọi con số khi tách từ
      matchedFeatures: used.length
    };
  }

  // Gộp kết quả Mini AI vào kết quả phân tích quy tắc (analyzeMessageContext)
  function merge(analysis, ai) {
    if (!ai || ai.matchedFeatures === 0) return analysis;
    const percent = Math.round(ai.scamProb * 100);
    const looksScam = ai.label !== 'safe' && ai.scamProb >= CONFIG.minScamProb;
    const looksSafe = ai.safeProb >= CONFIG.safeProb;

    let score = analysis.score;
    let category = analysis.category;
    const redFlags = analysis.redFlags.slice();

    if (looksScam) {
      if (score < 35) {
        score = Math.min(CONFIG.aiOnlyCap, Math.max(score, CONFIG.aiOnlyFloor));
        category = `Mini AI nghi vấn: ${ai.labelName}`;
        const idx = redFlags.findIndex(f => /^Không phát hiện/.test(f));
        if (idx >= 0) redFlags.splice(idx, 1);
      } else {
        score = Math.min(99, score + CONFIG.boost);
      }
      const why = ai.words.length ? ` — từ ngữ đáng ngờ: ${ai.words.map(w => `"${w}"`).join(', ')}` : '';
      redFlags.push(`Mini AI: ${percent}% khả năng là "${ai.labelName}"${why}.`);
    }

    return {
      ...analysis,
      score,
      category,
      redFlags,
      ai: { percent, labelName: ai.labelName, words: ai.words, looksScam, looksSafe }
    };
  }

  function init() {
    const progress = document.getElementById('aiProgressContainer');
    if (progress) progress.style.display = 'none';
    const badge = document.getElementById('aiStatusBadge');
    const text = document.getElementById('aiBadgeText');
    if (badge) {
      badge.classList.remove('loading');
      badge.classList.toggle('offline', !model);
      badge.title = model
        ? `Mini AI do Tổ 4 tự huấn luyện (${model.trainedOn} tin nhắn mẫu), chạy ngay trên máy bạn, không gửi tin nhắn đi đâu.`
        : 'Không nạp được Mini AI - đang dùng bộ phân tích quy tắc.';
    }
    if (text) text.textContent = model ? 'Mini AI: Sẵn sàng' : 'Mini AI: Không khả dụng';
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  return { isReady, analyze, merge, tokenize, CONFIG };
})();
