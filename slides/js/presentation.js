// ===================================================================
// PRESENTATION CONTROLLER MODULE (TỔ 4)
// ===================================================================

let currentSlideIndex = 1;
let totalSlides = 17;
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;

function getTotalSlides() {
  const slides = document.querySelectorAll('.slide-item');
  return slides.length > 0 ? slides.length : totalSlides;
}

document.addEventListener('DOMContentLoaded', () => {
  // Restore full-bleed preference
  if (localStorage.getItem('to4_full_bleed') === 'true') {
    document.body.classList.add('full-bleed');
    const btn = document.getElementById('btnFullBleed');
    if (btn) {
      btn.innerHTML = '⏹️ Thu Viền';
      btn.classList.add('btn-highlight');
    }
  }

  // Invalidate stale 16-slide cache if upgrading to 17-slide structure
  const slideVersion = 'v17_16x9';
  if (localStorage.getItem('to4_slide_version') !== slideVersion) {
    ['cyber', 'canva', 'swiss', 'dark', 'academic', 'default'].forEach(t => {
      localStorage.removeItem('to4_saved_slides_' + t);
    });
    localStorage.setItem('to4_slide_version', slideVersion);
  }

  // Restore saved slide edits if any
  const savedEdits = localStorage.getItem('to4_saved_slides_' + (document.body.getAttribute('data-theme') || 'default'));
  if (savedEdits) {
    const container = document.getElementById('slidesContainer');
    if (container) container.innerHTML = savedEdits;
  }

  totalSlides = getTotalSlides();
  const totalEl = document.getElementById('totalSlidesNum');
  if (totalEl) totalEl.textContent = totalSlides;

  const dockTotalEl = document.getElementById('dockTotalNum');
  if (dockTotalEl) dockTotalEl.textContent = totalSlides;

  updateSlideView();
  fitSlidesToScreen();
  window.addEventListener('resize', fitSlidesToScreen);
  window.addEventListener('load', fitSlidesToScreen);
  window.addEventListener('orientationchange', fitSlidesToScreen);
  document.addEventListener('fullscreenchange', () => { setTimeout(fitSlidesToScreen, 100); });
  document.addEventListener('webkitfullscreenchange', () => { setTimeout(fitSlidesToScreen, 100); });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.target.isContentEditable) return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'p' || e.key === 'P') {
      togglePresenterMode();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleFullScreen();
    } else if (e.key === 'e' || e.key === 'E') {
      toggleEditMode();
    } else if (e.key === 'Escape') {
      closeLightbox();
      if (document.body.classList.contains('edit-mode-active')) toggleEditMode();
      if (document.body.classList.contains('is-presentation-mode')) exitPresentationMode();
    }
  });

  // Mobile touch swipe gestures
  let touchStartX = 0;
  let touchStartY = 0;
  const container = document.getElementById('slidesContainer');
  if (container) {
    container.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;

      // Detect horizontal swipe if delta X > 45px and predominantly horizontal
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        if (dx < 0) {
          nextSlide(); // Vuốt sang trái -> chuyển slide tiếp theo
        } else {
          prevSlide(); // Vuốt sang phải -> quay lại slide trước
        }
      }
    }, { passive: true });
  }

  // Restore theme (respect pre-set body data-theme, URL param, or localStorage)
  const urlParams = new URLSearchParams(window.location.search);
  const paramTheme = urlParams.get('theme');
  const paramSlide = parseInt(urlParams.get('slide'), 10);
  const bodyTheme = document.body.getAttribute('data-theme');
  const savedTheme = localStorage.getItem('to4_slide_theme');
  const activeTheme = paramTheme || bodyTheme || savedTheme || 'swiss';
  changeTheme(activeTheme);
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) themeSelect.value = activeTheme;

  if (paramSlide && paramSlide >= 1 && paramSlide <= totalSlides) {
    showSlide(paramSlide);
  }
});

function changeTheme(themeName) {
  if (themeName === 'canva') {
    if (!window.location.pathname.endsWith('theme_canva_cyber.html')) {
      window.location.href = 'theme_canva_cyber.html';
      return;
    }
  }
  document.body.setAttribute('data-theme', themeName);
  localStorage.setItem('to4_slide_theme', themeName);
}

function showSlide(idx) {
  totalSlides = getTotalSlides();
  if (idx < 1) idx = 1;
  if (idx > totalSlides) idx = totalSlides;
  currentSlideIndex = idx;
  updateSlideView();
}

function nextSlide() {
  totalSlides = getTotalSlides();
  if (currentSlideIndex < totalSlides) {
    currentSlideIndex++;
    updateSlideView();
  }
}

function prevSlide() {
  totalSlides = getTotalSlides();
  if (currentSlideIndex > 1) {
    currentSlideIndex--;
    updateSlideView();
  }
}

function updateSlideView() {
  const slides = document.querySelectorAll('.slide-item');
  slides.forEach((s, i) => {
    s.classList.toggle('active', i + 1 === currentSlideIndex);
  });

  const numEl = document.getElementById('currentSlideNum');
  if (numEl) numEl.textContent = currentSlideIndex;

  const dockNumEl = document.getElementById('dockCurrentNum');
  if (dockNumEl) dockNumEl.textContent = currentSlideIndex;

  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = `${(currentSlideIndex / totalSlides) * 100}%`;

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) prevBtn.disabled = (currentSlideIndex === 1);
  if (nextBtn) nextBtn.disabled = (currentSlideIndex === totalSlides);

  syncNotes();
  fitSlidesToScreen();
}

function togglePresenterMode() {
  const drawer = document.getElementById('presenterDrawer');
  if (drawer) {
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) syncNotes();
  }
}

function syncNotes() {
  const activeSlide = document.querySelector(`.slide-item[data-slide="${currentSlideIndex}"]`);
  if (!activeSlide) return;

  const speaker = activeSlide.getAttribute('data-speaker') || 'Tổ 4';
  const notesEl = activeSlide.querySelector('.speaker-notes-content');
  const notesBody = document.getElementById('notesBody');
  const tag = document.getElementById('currentSpeakerTag');

  if (tag) tag.textContent = `Người nói: ${speaker}`;
  if (notesBody) notesBody.innerHTML = notesEl ? notesEl.innerHTML : 'Chưa có ghi chú.';
}

function startTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;
  timerInterval = setInterval(() => {
    timerSeconds++;
    renderTimer();
  }, 1000);
}

function pauseTimer() {
  isTimerRunning = false;
  clearInterval(timerInterval);
}

function resetTimer() {
  pauseTimer();
  timerSeconds = 0;
  renderTimer();
}

function renderTimer() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  const display = document.getElementById('timerDisplay');
  if (display) display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function openPrintModal() {
  window.print();
}

function toggleDownloadMenu() {
  const menu = document.getElementById('downloadMenu');
  if (menu) {
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
  }
}

document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.download-dropdown-wrap');
  const menu = document.getElementById('downloadMenu');
  if (wrap && menu && !wrap.contains(e.target)) {
    menu.style.display = 'none';
  }
});

// ===================================================================
// TỰ ĐỘNG CÂN CHỈNH TỈ LỆ 16:9 & PHÓNG TO THÀNH PHẦN (FIT TO SCREEN)
// ===================================================================
function fitSlidesToScreen() {
  const container = document.getElementById('slidesContainer');
  const viewport = document.querySelector('.slide-viewport');
  if (!container || !viewport) return;

  const isPres = document.body.classList.contains('is-presentation-mode');
  const baseW = 1600;
  const baseH = 900;

  const availW = isPres ? window.innerWidth : viewport.clientWidth;
  const availH = isPres ? window.innerHeight : viewport.clientHeight;

  if (availW <= 0 || availH <= 0) return;

  const padX = isPres ? 0 : 20;
  const padY = isPres ? 0 : 16;

  const maxW = Math.max(100, availW - padX * 2);
  const maxH = Math.max(100, availH - padY * 2);

  const scale = Math.min(maxW / baseW, maxH / baseH);

  container.style.transform = `scale(${scale})`;
  container.style.transformOrigin = 'center center';
}

// ===================================================================
// CHẾ ĐỘ TRÌNH CHIẾU TOÀN MÀN HÌNH CHUẨN CANVA & POWERPOINT
// ===================================================================
function toggleFullScreen() {
  if (!document.body.classList.contains('is-presentation-mode')) {
    enterPresentationMode();
  } else {
    exitPresentationMode();
  }
}

function enterPresentationMode() {
  document.body.classList.add('is-presentation-mode');

  // Trigger HTML5 fullscreen
  const el = document.documentElement;
  const rfs = el.requestFullscreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (rfs && !document.fullscreenElement) {
    rfs.call(el).catch(err => console.warn('Native fullscreen request:', err));
  }

  const btn = document.getElementById('btnFullScreen');
  if (btn) btn.innerHTML = '🗗 Thu Nhỏ';

  const dockCur = document.getElementById('dockCurrentNum');
  const dockTot = document.getElementById('dockTotalNum');
  if (dockCur) dockCur.textContent = currentSlideIndex;
  if (dockTot) dockTot.textContent = totalSlides;

  fitSlidesToScreen();
  resetIdleTimer();
}

function exitPresentationMode() {
  document.body.classList.remove('is-presentation-mode');
  document.body.classList.remove('mouse-idle');

  const btn = document.getElementById('btnFullScreen');
  if (btn) btn.innerHTML = '⛶ Trình Chiếu (Full)';

  const dock = document.getElementById('presentationDock');
  if (dock) dock.classList.remove('dock-hidden');

  if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
    const efs = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (efs) efs.call(document).catch(err => console.warn(err));
  }

  clearTimeout(idleTimeout);
  setTimeout(fitSlidesToScreen, 100);
}

// Tự động ẩn thanh dock nổi khi chuột không di chuyển trong 3.5 giây (như Canva)
let idleTimeout = null;
function resetIdleTimer() {
  const dock = document.getElementById('presentationDock');
  if (dock) dock.classList.remove('dock-hidden');
  document.body.classList.remove('mouse-idle');

  clearTimeout(idleTimeout);
  if (document.body.classList.contains('is-presentation-mode')) {
    idleTimeout = setTimeout(() => {
      if (document.body.classList.contains('is-presentation-mode')) {
        if (dock) dock.classList.add('dock-hidden');
        document.body.classList.add('mouse-idle');
      }
    }, 3500);
  }
}

document.addEventListener('mousemove', () => {
  if (document.body.classList.contains('is-presentation-mode')) {
    resetIdleTimer();
  }
});

// Đồng bộ khi người dùng thoát fullscreen bằng phím Esc của trình duyệt
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && document.body.classList.contains('is-presentation-mode')) {
    exitPresentationMode();
  }
});
document.addEventListener('webkitfullscreenchange', () => {
  if (!document.webkitFullscreenElement && document.body.classList.contains('is-presentation-mode')) {
    exitPresentationMode();
  }
});

// ===================================================================
// CHẾ ĐỘ CHỈNH SỬA TRỰC TIẾP (LIVE INLINE EDIT MODE)
// ===================================================================
function toggleEditMode() {
  document.body.classList.toggle('edit-mode-active');
  const isEdit = document.body.classList.contains('edit-mode-active');
  const btn = document.getElementById('btnEditMode');
  if (btn) {
    btn.innerHTML = isEdit ? '✅ Đang Sửa' : '✏️ Chỉnh Sửa';
    btn.classList.toggle('btn-highlight', isEdit);
  }

  const editableSelectors = '.slide-title, .hero-title, .hero-subtitle, .slide-desc, .section-tag, .tag-pill, .stat-card h3, .stat-card p, .point-card h4, .point-card p, .diagram-step-title, .diagram-step-desc, .mindmap-branch-card p, .spec-box h4, .spec-box p, .actor-card-title, .actor-card p, .crisis-step-title, .crisis-card p, .risk-card-item p, .system-goal-banner, .diagram-img-frame .caption, .slide-source-caption, p, h1, h2, h3, h4';

  document.querySelectorAll(editableSelectors).forEach(el => {
    if (!el.closest('.presentation-header') && !el.closest('.presentation-footer') && !el.closest('.presenter-drawer') && !el.closest('.lightbox-modal')) {
      if (isEdit) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
      } else {
        el.removeAttribute('contenteditable');
      }
    }
  });

  let bar = document.getElementById('editFloatingBar');
  if (isEdit) {
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'editFloatingBar';
      bar.className = 'edit-floating-bar';
      bar.innerHTML = `
        <div class="edit-title">✏️ Chế độ chỉnh sửa đang BẬT</div>
        <button class="edit-btn primary" onclick="saveEdits()">💾 Lưu thay đổi</button>
        <button class="edit-btn" onclick="resetEdits()">↺ Khôi phục gốc</button>
        <button class="edit-btn" onclick="toggleEditMode()">✖️ Đóng</button>
      `;
      document.body.appendChild(bar);
    } else {
      bar.style.display = 'flex';
    }
  } else if (bar) {
    bar.style.display = 'none';
  }
}

function saveEdits() {
  const container = document.getElementById('slidesContainer');
  if (container) {
    const theme = document.body.getAttribute('data-theme') || 'default';
    localStorage.setItem('to4_saved_slides_' + theme, container.innerHTML);
    alert('✅ Đã lưu toàn bộ nội dung chỉnh sửa vào trình duyệt của bạn!');
  }
}

function resetEdits() {
  if (confirm('Bạn có chắc chắn muốn xóa các nội dung đã sửa và khôi phục lại mặc định?')) {
    const theme = document.body.getAttribute('data-theme') || 'default';
    localStorage.removeItem('to4_saved_slides_' + theme);
    window.location.reload();
  }
}

// ===================================================================
// LIGHTBOX MODAL PHÓNG TO SƠ ĐỒ CHI TIẾT
// ===================================================================
function openLightbox(src, caption) {
  const modal = document.getElementById('imageLightbox');
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  if (modal && img) {
    img.src = src;
    if (cap) cap.textContent = caption || '';
    modal.classList.add('active');
  }
}

function closeLightbox() {
  const modal = document.getElementById('imageLightbox');
  if (modal) modal.classList.remove('active');
}


