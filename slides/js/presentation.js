// ===================================================================
// PRESENTATION CONTROLLER MODULE (TỔ 4)
// ===================================================================

let currentSlideIndex = 1;
const totalSlides = 14;
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;

document.addEventListener('DOMContentLoaded', () => {
  const totalEl = document.getElementById('totalSlidesNum');
  if (totalEl) totalEl.textContent = totalSlides;

  updateSlideView();

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'p' || e.key === 'P') {
      togglePresenterMode();
    }
  });

  // Restore theme (respect pre-set body data-theme, URL param, or localStorage)
  const urlParams = new URLSearchParams(window.location.search);
  const paramTheme = urlParams.get('theme');
  const bodyTheme = document.body.getAttribute('data-theme');
  const savedTheme = localStorage.getItem('to4_slide_theme');
  const activeTheme = paramTheme || bodyTheme || savedTheme || 'swiss';
  changeTheme(activeTheme);
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) themeSelect.value = activeTheme;
});

function changeTheme(themeName) {
  document.body.setAttribute('data-theme', themeName);
  localStorage.setItem('to4_slide_theme', themeName);
}

function showSlide(idx) {
  if (idx < 1) idx = 1;
  if (idx > totalSlides) idx = totalSlides;
  currentSlideIndex = idx;
  updateSlideView();
}

function nextSlide() {
  if (currentSlideIndex < totalSlides) {
    currentSlideIndex++;
    updateSlideView();
  }
}

function prevSlide() {
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

