// ===================================================================
// PRESENTATION CONTROLLER MODULE (TỔ 4)
// ===================================================================

let currentSlideIndex = 1;
let totalSlides = 16;
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

  // Restore saved slide edits if any
  const savedEdits = localStorage.getItem('to4_saved_slides_' + (document.body.getAttribute('data-theme') || 'default'));
  if (savedEdits) {
    const container = document.getElementById('slidesContainer');
    if (container) container.innerHTML = savedEdits;
  }

  totalSlides = getTotalSlides();
  const totalEl = document.getElementById('totalSlidesNum');
  if (totalEl) totalEl.textContent = totalSlides;

  updateSlideView();

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.target.isContentEditable) return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'p' || e.key === 'P') {
      togglePresenterMode();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullBleed();
    } else if (e.key === 'e' || e.key === 'E') {
      toggleEditMode();
    } else if (e.key === 'Escape') {
      closeLightbox();
      if (document.body.classList.contains('edit-mode-active')) toggleEditMode();
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

  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = `${(currentSlideIndex / totalSlides) * 100}%`;

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) prevBtn.disabled = (currentSlideIndex === 1);
  if (nextBtn) nextBtn.disabled = (currentSlideIndex === totalSlides);

  syncNotes();
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
// CHẾ ĐỘ FULL VIỀN (BORDERLESS / EDGE-TO-EDGE)
// ===================================================================
function toggleFullBleed() {
  document.body.classList.toggle('full-bleed');
  const isFull = document.body.classList.contains('full-bleed');
  localStorage.setItem('to4_full_bleed', isFull ? 'true' : 'false');
  const btn = document.getElementById('btnFullBleed');
  if (btn) {
    btn.innerHTML = isFull ? '⏹️ Thu Viền' : '🔲 Full Viền';
    btn.classList.toggle('btn-highlight', isFull);
  }
}

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


