// ===================================================================
// Đo bố cục 1 slide (slides/index.html?export=1&slide=N) để dựng PPTX chỉnh sửa được.
// Được nạp bởi trang tạm do tools/export_slides_editable.py sinh ra.
//
// mode=extract : ghi JSON (khối chữ + ảnh + vị trí) vào <pre id="out">
// mode=bg      : ẩn toàn bộ chữ và ảnh (giữ emoji, khung, nền) để chụp làm ảnh nền
// ===================================================================
(function () {
  const params = new URLSearchParams(location.search);
  const MODE = params.get('mode') || 'extract';
  const SLIDE = params.get('slide') || '1';
  const NBSP = String.fromCharCode(160); // khoảng trắng không ngắt
  // Emoji + mũi tên + số khoanh tròn: font chữ trên Canva thường thiếu glyph -> vẽ vào ảnh nền
  const EMOJI_RE = /(?:\p{Extended_Pictographic}|[\u2190-\u21FF\u2460-\u24FF\u2700-\u27BF\u2B00-\u2BFF]|\uFE0F|\u200D|\u20E3)+/gu;
  // Open Sans rộng hơn Segoe UI ~2-3%: thu nhỏ chữ 5% để xuống dòng giống bản thiết kế
  // và chừa khoảng dư cho chênh lệch nhỏ khi Canva/PowerPoint dàn chữ
  const FONT_SCALE = 0.95;

  const frame = document.getElementById('slideFrame');
  frame.src = `slides/index.html?export=1&slide=${SLIDE}`;

  // Canva không có Segoe UI -> dàn trang bằng đúng font sẽ dùng trong PPTX.
  // Open Sans: có trên Canva, đủ dấu tiếng Việt, bề rộng & chiều cao dòng gần Segoe UI nhất.
  // Chỉ nạp đậm 700 (PPTX chỉ có thường/đậm) để đo đúng bề rộng chữ sẽ hiển thị.
  const FONT_SANS = 'Open Sans';
  const FONT_MONO = 'Roboto Mono';
  const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Roboto+Mono:wght@400;700&display=block';
  const FONT_OVERRIDE = `
    :root {
      --font-sans: '${FONT_SANS}', sans-serif !important;
      --font-heading: '${FONT_SANS}', sans-serif !important;
      --font-mono: '${FONT_MONO}', monospace !important;
    }
    *, *::before, *::after { animation: none !important; transition: none !important; }
  `;

  const HIDE_TEXT = `
    body * {
      color: transparent !important;
      -webkit-text-fill-color: transparent !important;
      text-shadow: none !important;
      text-decoration-color: transparent !important;
    }
    img { visibility: hidden !important; }

  `;

  function addStyle(doc, css) {
    const st = doc.createElement('style');
    st.textContent = css;
    doc.head.appendChild(st);
  }

  // Bọc emoji vào <span class="__emo"> để có thể giữ emoji trong ảnh nền
  function wrapEmoji(doc, root) {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      EMOJI_RE.lastIndex = 0;
      if (EMOJI_RE.test(walker.currentNode.textContent)) nodes.push(walker.currentNode);
    }
    nodes.forEach(node => {
      const text = node.textContent;
      const frag = doc.createDocumentFragment();
      let last = 0;
      text.replace(EMOJI_RE, (m, idx) => {
        if (idx > last) frag.appendChild(doc.createTextNode(text.slice(last, idx)));
        const span = doc.createElement('span');
        span.className = '__emo';
        span.textContent = m;
        frag.appendChild(span);
        last = idx + m.length;
        return m;
      });
      if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function isVisible(win, el) {
    if (!el.getClientRects().length) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = win.getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    }
    return true;
  }

  function isInline(win, el) {
    const d = win.getComputedStyle(el).display;
    return d === 'inline' || d === 'contents';
  }

  function parseColor(str) {
    const m = String(str).match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?/);
    if (!m) return null;
    let a = m[4] === undefined ? 1 : parseFloat(m[4]) / (m[4].endsWith('%') ? 100 : 1);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }

  // Màu chữ thực tế (xử lý chữ gradient: background-clip:text)
  function textColor(win, el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = win.getComputedStyle(e);
      const fill = parseColor(cs.webkitTextFillColor);
      if (fill && fill.a === 0 && cs.backgroundImage && cs.backgroundImage.includes('gradient')) {
        const first = parseColor(cs.backgroundImage);
        if (first) return first;
      }
      if (e === el) {
        const c = (fill && fill.a > 0) ? fill : parseColor(cs.color);
        if (c && c.a > 0) return c;
      }
    }
    return parseColor(win.getComputedStyle(el).color) || { r: 255, g: 255, b: 255, a: 1 };
  }

  function runStyle(win, el) {
    const cs = win.getComputedStyle(el);
    return {
      fontFamily: cs.fontFamily,
      fontSize: parseFloat(cs.fontSize),
      fontWeight: parseInt(cs.fontWeight, 10) || 400,
      italic: cs.fontStyle === 'italic',
      underline: (cs.textDecorationLine || '').includes('underline'),
      color: textColor(win, el),
      letterSpacing: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0,
      textTransform: cs.textTransform
    };
  }

  // Gom chữ trực tiếp của 1 khối (bỏ qua khối con không inline: chúng là khối riêng)
  function collectRuns(win, childNodes) {
    const runs = [];
    const textNodes = [];
    const spacerEls = []; // emoji được thay bằng khoảng trắng: vẫn tính vào vị trí hộp chữ
    (function walk(nodes) {
      nodes.forEach(n => {
        if (n.nodeType === 3) {
          if (n.parentElement.classList.contains('__emo')) return; // emoji nằm trong ảnh nền
          if (!n.textContent) return;
          runs.push({ text: n.textContent, style: runStyle(win, n.parentElement) });
          textNodes.push(n);
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') { runs.push({ br: true }); return; }
          if (n.classList.contains('__emo')) {
            // Emoji nằm trong ảnh nền: giữ chỗ bằng khoảng trắng không ngắt (NBSP) cùng bề rộng
            const w = n.getBoundingClientRect().width;
            const cs = win.getComputedStyle(n.parentElement);
            const ctx = (collectRuns.canvas || (collectRuns.canvas = win.document.createElement('canvas'))).getContext('2d');
            ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
            const nb = ctx.measureText(NBSP).width || parseFloat(cs.fontSize) * 0.25;
            if (w > 0) {
              runs.push({ text: NBSP.repeat(Math.max(1, Math.round(w / nb))), style: runStyle(win, n.parentElement), spacer: true });
              spacerEls.push(n);
            }
            return;
          }
          if (!isInline(win, n) || !isVisible(win, n)) return;
          walk(Array.from(n.childNodes));
        }
      });
    })(childNodes);
    return { runs, textNodes, spacerEls };
  }

  function unionRects(win, doc, textNodes) {
    let box = null;
    const lineTops = new Set();
    const tops = [];
    textNodes.forEach(n => {
      const text = n.textContent;
      const re = /\S+(?:\s+\S+)*/g;
      let m;
      while ((m = re.exec(text))) {
        const range = doc.createRange();
        range.setStart(n, m.index);
        range.setEnd(n, m.index + m[0].length);
        Array.from(range.getClientRects()).forEach(r => {
          if (r.width < 0.5 || r.height < 0.5) return;
          if (!lineTops.has(Math.round(r.top / 4))) tops.push(r.top);
          lineTops.add(Math.round(r.top / 4));
          box = box
            ? { l: Math.min(box.l, r.left), t: Math.min(box.t, r.top), r: Math.max(box.r, r.right), b: Math.max(box.b, r.bottom) }
            : { l: r.left, t: r.top, r: r.right, b: r.bottom };
        });
      }
    });
    if (!box) return null;
    tops.sort((a, b) => a - b);
    // Khoảng cách dòng thực tế (đo từ đỉnh dòng đầu tới đỉnh dòng cuối)
    // Lấy khoảng cách nhỏ nhất giữa 2 dòng liền nhau (bỏ qua dòng trống do <br><br>)
    let pitch = null;
    for (let i = 1; i < tops.length; i++) {
      const d = tops[i] - tops[i - 1];
      if (d > 1 && (pitch === null || d < pitch)) pitch = d;
    }
    return { ...box, lines: lineTops.size, pitch };
  }

  function extract(win, doc) {
    const slide = doc.querySelector('.slide-item.active') || doc.querySelector('.slide-item');
    const blocks = [];
    slide.querySelectorAll('*').forEach(el => {
      if (el.classList.contains('__emo') || el.closest('.speaker-notes-content')) return;
      if (isInline(win, el) || !isVisible(win, el)) return;
      const cs = win.getComputedStyle(el);
      const isFlexLike = /flex|grid/.test(cs.display);
      const segments = [];
      let cur = [];
      Array.from(el.childNodes).forEach(n => {
        const breaks = isFlexLike && n.nodeType === 1 && !n.classList.contains('__emo') && !isInline(win, n);
        if (breaks) { if (cur.length) segments.push(cur); cur = []; } else cur.push(n);
      });
      if (cur.length) segments.push(cur);
      segments.forEach(seg => addBlock(el, cs, seg));
    });

    function addBlock(el, cs, seg) {
      const { runs, textNodes, spacerEls } = collectRuns(win, seg);
      const hasText = runs.some(r => r.text && r.text.replace(EMOJI_RE, '').trim());
      if (!hasText) return;
      const box = unionRects(win, doc, textNodes);
      if (!box) return;
      spacerEls.forEach(sp => {
        const r = sp.getBoundingClientRect();
        if (r.width > 0) { box.l = Math.min(box.l, r.left); box.r = Math.max(box.r, r.right); }
      });
      const er = el.getBoundingClientRect();
      const padL = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
      const padR = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
      const lh = cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight);
      blocks.push({
        tag: el.tagName,
        display: cs.display,
        textAlign: cs.textAlign,
        whiteSpace: cs.whiteSpace,
        lineHeight: lh,
        box,
        content: { l: er.left + padL, r: er.right - padR },
        runs
      });
    }

    const images = [];
    slide.querySelectorAll('img').forEach(img => {
      if (!isVisible(win, img) || !img.naturalWidth) return;
      const r = img.getBoundingClientRect();
      const cs = win.getComputedStyle(img);
      images.push({
        src: img.currentSrc || img.src,
        l: r.left, t: r.top, w: r.width, h: r.height,
        objectFit: cs.objectFit,
        radius: parseFloat(cs.borderTopLeftRadius) || 0,
        naturalW: img.naturalWidth, naturalH: img.naturalHeight
      });
    });

    const fontsOk = {
      sans: doc.fonts.check(`700 16px "${FONT_SANS}"`),
      mono: doc.fonts.check(`16px "${FONT_MONO}"`),
      titleFont: win.getComputedStyle(slide.querySelector('h2, h1') || slide).fontFamily
    };
    return { blocks, images, fontsOk };
  }

  // Giữ nguyên các đường viền/bóng đổ đang dùng currentColor trước khi làm chữ trong suốt
  function freezeBorderColors(win, doc) {
    const items = [];
    doc.querySelectorAll('body *').forEach(el => {
      const cs = win.getComputedStyle(el);
      items.push([el, cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor, cs.boxShadow, cs.outlineColor]);
    });
    items.forEach(([el, t, r, b, l, sh, oc]) => {
      el.style.setProperty('border-top-color', t, 'important');
      el.style.setProperty('border-right-color', r, 'important');
      el.style.setProperty('border-bottom-color', b, 'important');
      el.style.setProperty('border-left-color', l, 'important');
      el.style.setProperty('box-shadow', sh, 'important');
      el.style.setProperty('outline-color', oc, 'important');
    });
  }

  frame.addEventListener('load', async () => {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    await new Promise(resolve => {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_CSS_URL;
      link.onload = link.onerror = resolve;
      doc.head.appendChild(link);
    });
    addStyle(doc, FONT_OVERRIDE);
    await Promise.all(['400', '700', 'italic 400', 'italic 700'].map(w => doc.fonts.load(`${w} 16px "${FONT_SANS}"`)));
    await Promise.all(['400', '700'].map(w => doc.fonts.load(`${w} 16px "${FONT_MONO}"`)));
    // Chụp cỡ chữ gốc của mọi phần tử trước, rồi mới gán (tránh nhân dồn với đơn vị em)
    const sizes = Array.from(doc.querySelectorAll('body *')).map(el => [el, win.getComputedStyle(el)]);
    sizes.map(([el, cs]) => [el, parseFloat(cs.fontSize), cs.fontFamily])
      .forEach(([el, size, fam]) => {
        if (!/mono/i.test(fam)) el.style.setProperty('font-size', `${(size * FONT_SCALE).toFixed(2)}px`, 'important');
      });
    wrapEmoji(doc, doc.body);
    await doc.fonts.ready;
    await Promise.all(Array.from(doc.images).map(i => (i.complete ? null : new Promise(r => { i.onload = i.onerror = r; }))));
    await new Promise(r => setTimeout(r, 600));

    if (MODE === 'bg') {
      freezeBorderColors(win, doc);
      // Emoji / mũi tên giữ đúng màu gốc (mũi tên là glyph đơn sắc, emoji màu không bị ảnh hưởng)
      doc.querySelectorAll('.__emo').forEach(sp => {
        const c = textColor(win, sp);
        const rgb = `rgb(${c.r}, ${c.g}, ${c.b})`;
        sp.style.setProperty('color', rgb, 'important');
        sp.style.setProperty('-webkit-text-fill-color', rgb, 'important');
      });
      addStyle(doc, HIDE_TEXT);
      document.body.setAttribute('data-ready', '1');
      return;
    }
    const data = extract(win, doc);
    document.getElementById('out').textContent = JSON.stringify(data);
  });
})();
