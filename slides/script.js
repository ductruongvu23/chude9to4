// ===================================================================
// SLIDE INTERACTION & PRESENTATION LOGIC
// ===================================================================

let currentSlideIndex = 1;
const totalSlides = 15;
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;

// DOM Elements
const slides = document.querySelectorAll('.slide-item');
const currentSlideNumEl = document.getElementById('currentSlideNum');
const totalSlidesNumEl = document.getElementById('totalSlidesNum');
const progressBarEl = document.getElementById('progressBar');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const themeSelect = document.getElementById('themeSelect');
const presenterDrawer = document.getElementById('presenterDrawer');
const currentSpeakerTag = document.getElementById('currentSpeakerTag');
const notesBody = document.getElementById('notesBody');
const timerDisplay = document.getElementById('timerDisplay');
const printModal = document.getElementById('printModal');

// Initialize
function initPresentation() {
  totalSlidesNumEl.textContent = totalSlides;
  updateSlideDisplay();
  
  // Keyboard navigation
  document.addEventListener('keydown', handleKeyNavigation);

  // Load saved theme
  const savedTheme = localStorage.getItem('slide_theme') || 'swiss';
  changeTheme(savedTheme);
  themeSelect.value = savedTheme;
}

// Change Theme (3 bản thiết kế khác nhau)
function changeTheme(themeName) {
  document.body.setAttribute('data-theme', themeName);
  localStorage.setItem('slide_theme', themeName);
}

// Slide Navigation
function showSlide(index) {
  if (index < 1) index = 1;
  if (index > totalSlides) index = totalSlides;
  
  currentSlideIndex = index;
  updateSlideDisplay();
}

function nextSlide() {
  if (currentSlideIndex < totalSlides) {
    currentSlideIndex++;
    updateSlideDisplay();
  }
}

function prevSlide() {
  if (currentSlideIndex > 1) {
    currentSlideIndex--;
    updateSlideDisplay();
  }
}

function updateSlideDisplay() {
  slides.forEach((slide, idx) => {
    if (idx + 1 === currentSlideIndex) {
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });

  // Update counters
  currentSlideNumEl.textContent = currentSlideIndex;
  const progressPercent = (currentSlideIndex / totalSlides) * 100;
  progressBarEl.style.width = `${progressPercent}%`;

  // Button states
  prevBtn.disabled = (currentSlideIndex === 1);
  nextBtn.disabled = (currentSlideIndex === totalSlides);

  // Sync speaker notes
  syncPresenterNotes();
}

// Keyboard Navigation
function handleKeyNavigation(e) {
  // If typing in input, ignore
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return;
  }

  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
    e.preventDefault();
    nextSlide();
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault();
    prevSlide();
  } else if (e.key === 'Home') {
    e.preventDefault();
    showSlide(1);
  } else if (e.key === 'End') {
    e.preventDefault();
    showSlide(totalSlides);
  } else if (e.key === 'p' || e.key === 'P') {
    togglePresenterMode();
  } else if (e.key === 'f' || e.key === 'F') {
    toggleFullScreen();
  }
}

// Presenter Mode & Notes
function togglePresenterMode() {
  presenterDrawer.classList.toggle('open');
  if (presenterDrawer.classList.contains('open')) {
    syncPresenterNotes();
  }
}

function syncPresenterNotes() {
  const activeSlide = document.querySelector(`.slide-item[data-slide="${currentSlideIndex}"]`);
  if (!activeSlide) return;

  const speaker = activeSlide.getAttribute('data-speaker') || 'Cả nhóm';
  const notesElement = activeSlide.querySelector('.speaker-notes-content');
  const notesHtml = notesElement ? notesElement.innerHTML : 'Chưa có ghi chú cho slide này.';

  currentSpeakerTag.textContent = `Người nói: ${speaker}`;
  notesBody.innerHTML = notesHtml;
}

// Timer Functions
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
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  timerDisplay.textContent = formatted;

  // Warning color if exceeding 12 mins
  if (mins >= 12) {
    timerDisplay.style.color = 'var(--accent-danger)';
  } else if (mins >= 10) {
    timerDisplay.style.color = 'var(--accent-warning)';
  } else {
    timerDisplay.style.color = 'var(--accent-primary)';
  }
}

// Fullscreen
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log(`Fullscreen error: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// Print Modal
function openPrintModal() {
  printModal.classList.add('open');
}

function closePrintModal() {
  printModal.classList.remove('open');
}

// On Load
document.addEventListener('DOMContentLoaded', initPresentation);
