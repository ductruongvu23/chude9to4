// ===================================================================
// PRESENTATION CONTROLLER (TỔ 4 • BẢN 4 CYBER DEFENSE)
// Điều hướng slide, trình chiếu toàn màn, ghi chú người nói, phóng to sơ đồ.
// ?slide=N        mở thẳng slide N
// ?export=1&slide=N  render đúng 1 slide 1600x900 không khung (dùng cho tools/export_slides.py)
// ===================================================================

const BASE_W = 1600;
const BASE_H = 900;

let currentSlideIndex = 1;
let totalSlides = 1;
let timerInterval = null;
let timerSeconds = 0;
let idleTimeout = null;

const params = new URLSearchParams(window.location.search);
const isExportMode = params.get('export') === '1';

document.addEventListener('DOMContentLoaded', () => {
  // Dọn dữ liệu cũ của chế độ "chỉnh sửa" / đổi theme (tránh nội dung cũ đè lên slide mới)
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('to4_saved_slides_') || k === 'to4_slide_theme' || k === 'to4_full_bleed' || k === 'to4_slide_version')
      .forEach(k => localStorage.removeItem(k));
  } catch (e) { /* bỏ qua khi bị chặn storage */ }

  totalSlides = document.querySelectorAll('.slide-item').length;
  document.querySelectorAll('[data-total-slides]').forEach(el => { el.textContent = totalSlides; });

  if (isExportMode) document.body.classList.add('export-mode');

  const startSlide = parseInt(params.get('slide'), 10);
  showSlide(startSlide >= 1 ? startSlide : 1);

  if (isExportMode) return;

  window.addEventListener('resize', fitSlidesToScreen);
  window.addEventListener('load', fitSlidesToScreen);
  window.addEventListener('orientationchange', fitSlidesToScreen);

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('mousemove', () => {
    if (document.body.classList.contains('is-presentation-mode')) resetIdleTimer();
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.classList.contains('is-presentation-mode')) exitPresentationMode();
    setTimeout(fitSlidesToScreen, 100);
  });

  initSwipe();
});

function onKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  switch (e.key) {
    case 'ArrowRight': case ' ': case 'PageDown': case 'Enter':
      e.preventDefault(); nextSlide(); break;
    case 'ArrowLeft': case 'PageUp': case 'Backspace':
      e.preventDefault(); prevSlide(); break;
    case 'Home': showSlide(1); break;
    case 'End': showSlide(totalSlides); break;
    case 'p': case 'P': togglePresenterMode(); break;
    case 'f': case 'F': e.preventDefault(); toggleFullScreen(); break;
    case 'Escape':
      closeLightbox();
      if (document.body.classList.contains('is-presentation-mode')) exitPresentationMode();
      break;
  }
}

function initSwipe() {
  const container = document.getElementById('slidesContainer');
  if (!container) return;
  let startX = 0;
  let startY = 0;
  container.addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].screenX;
    startY = e.changedTouches[0].screenY;
  }, { passive: true });
  container.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].screenX - startX;
    const dy = e.changedTouches[0].screenY - startY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      if (dx < 0) nextSlide(); else prevSlide();
    }
  }, { passive: true });
}

// ------------------------- Điều hướng slide -------------------------
function showSlide(idx) {
  currentSlideIndex = Math.min(Math.max(idx, 1), totalSlides);
  updateSlideView();
}

function nextSlide() { showSlide(currentSlideIndex + 1); }
function prevSlide() { showSlide(currentSlideIndex - 1); }

function updateSlideView() {
  document.querySelectorAll('.slide-item').forEach((s, i) => {
    s.classList.toggle('active', i + 1 === currentSlideIndex);
  });
  document.querySelectorAll('[data-current-slide]').forEach(el => { el.textContent = currentSlideIndex; });

  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = `${(currentSlideIndex / totalSlides) * 100}%`;

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) prevBtn.disabled = currentSlideIndex === 1;
  if (nextBtn) nextBtn.disabled = currentSlideIndex === totalSlides;

  syncNotes();
  fitSlidesToScreen();
}

// ---------------------- Cân tỉ lệ 16:9 theo màn hình ----------------------
function fitSlidesToScreen() {
  const container = document.getElementById('slidesContainer');
  const viewport = document.querySelector('.slide-viewport');
  if (!container || !viewport || isExportMode) return;

  const isPres = document.body.classList.contains('is-presentation-mode');
  const availW = isPres ? window.innerWidth : viewport.clientWidth;
  const availH = isPres ? window.innerHeight : viewport.clientHeight;
  if (availW <= 0 || availH <= 0) return;

  const pad = isPres ? 0 : 16;
  const scale = Math.min((availW - pad * 2) / BASE_W, (availH - pad * 2) / BASE_H);
  container.style.transform = `scale(${Math.max(scale, 0.05)})`;
  container.style.transformOrigin = 'center center';
}

// ------------------------- Trình chiếu toàn màn -------------------------
function toggleFullScreen() {
  if (document.body.classList.contains('is-presentation-mode')) exitPresentationMode();
  else enterPresentationMode();
}

function enterPresentationMode() {
  document.body.classList.add('is-presentation-mode');
  const el = document.documentElement;
  if (el.requestFullscreen && !document.fullscreenElement) {
    el.requestFullscreen().catch(() => {});
  }
  fitSlidesToScreen();
  resetIdleTimer();
}

function exitPresentationMode() {
  document.body.classList.remove('is-presentation-mode', 'mouse-idle');
  const dock = document.getElementById('presentationDock');
  if (dock) dock.classList.remove('dock-hidden');
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  clearTimeout(idleTimeout);
  setTimeout(fitSlidesToScreen, 100);
}

// Ẩn thanh điều khiển nổi khi chuột đứng yên 3,5 giây
function resetIdleTimer() {
  const dock = document.getElementById('presentationDock');
  if (dock) dock.classList.remove('dock-hidden');
  document.body.classList.remove('mouse-idle');
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    if (!document.body.classList.contains('is-presentation-mode')) return;
    if (dock) dock.classList.add('dock-hidden');
    document.body.classList.add('mouse-idle');
  }, 3500);
}

// ---------------------- Ghi chú người nói & đồng hồ ----------------------
function togglePresenterMode() {
  const drawer = document.getElementById('presenterDrawer');
  if (!drawer) return;
  drawer.classList.toggle('open');
  if (drawer.classList.contains('open')) syncNotes();
}

function syncNotes() {
  const activeSlide = document.querySelector(`.slide-item[data-slide="${currentSlideIndex}"]`);
  if (!activeSlide) return;
  const notesEl = activeSlide.querySelector('.speaker-notes-content');
  const notesBody = document.getElementById('notesBody');
  const tag = document.getElementById('currentSpeakerTag');
  if (tag) tag.textContent = `Người nói: ${activeSlide.getAttribute('data-speaker') || 'Tổ 4'}`;
  if (notesBody) notesBody.innerHTML = notesEl ? notesEl.innerHTML : 'Chưa có ghi chú.';
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => { timerSeconds++; renderTimer(); }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  timerSeconds = 0;
  renderTimer();
}

function renderTimer() {
  const display = document.getElementById('timerDisplay');
  if (!display) return;
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ------------------------- Phóng to sơ đồ -------------------------
function openLightbox(src, caption) {
  if (isExportMode) return;
  const modal = document.getElementById('imageLightbox');
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  if (!modal || !img) return;
  img.src = src;
  if (cap) cap.textContent = caption || '';
  modal.classList.add('active');
}

function closeLightbox() {
  const modal = document.getElementById('imageLightbox');
  if (modal) modal.classList.remove('active');
}
