// ===================================================================
// MAIN APP COORDINATOR (TỔ 4 - MÔN TƯ DUY HỆ THỐNG)
// Hỗ trợ Quản lý Theme Sáng / Tối & Điều hướng Giao diện
// ===================================================================

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();

  // Khởi tạo Firebase Service (Anonymous Auth + Realtime listeners).
  // Không chặn giao diện: ping mạng có thể mất tới 12s trên 4G.
  const firebaseReady = (typeof FirebaseService !== 'undefined' && typeof FirebaseService.init === 'function')
    ? FirebaseService.init().catch(e => console.error("[App] Lỗi khởi tạo FirebaseService:", e))
    : Promise.resolve();

  // Hỗ trợ nhấn phím Enter trong ô tra cứu
  const inputEl = document.getElementById('lookupInput');
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeLookup();
      }
    });
  }

  // URL parameters: ?tab=lookup|analyzer|intake, ?q=<SĐT/STK/email> (từ ô tra cứu nhanh ở trang chủ)
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get('tab');
  if (requestedTab) {
    switchAppTab(requestedTab);
  }
  const requestedQuery = (urlParams.get('q') || '').trim();
  if (requestedQuery && inputEl) {
    switchAppTab('lookup');
    inputEl.value = requestedQuery;
    firebaseReady.then(() => executeLookup());
  }

  await firebaseReady;

  initIntakeView();
  if (typeof initAnalyzerView === 'function') {
    initAnalyzerView();
  }

  const requestedSample = urlParams.get('sample');
  if (requestedSample && typeof loadScamSample === 'function') {
    loadScamSample(requestedSample);
  }
  if (urlParams.get('analyze') === 'true' && typeof runScamAnalysis === 'function') {
    setTimeout(() => runScamAnalysis(), 250);
  }
});

// Chuyển Tab
function switchAppTab(tabName) {
  if (!document.getElementById(`tab-${tabName}`)) tabName = 'lookup';
  document.querySelectorAll('.app-tab-nav button').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  document.querySelectorAll('.tab-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `tab-${tabName}`);
  });
}

// ===================================================================
// QUẢN LÝ CHẾ ĐỘ SÁNG / TỐI (THEME MANAGER)
// ===================================================================
function initTheme() {
  const saved = localStorage.getItem('to4_portal_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const target = current === 'dark' ? 'light' : 'dark';
  applyTheme(target);
  localStorage.setItem('to4_portal_theme', target);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '☀️ Sáng' : '🌙 Tối';
    btn.setAttribute('title', theme === 'dark' ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối');
    btn.setAttribute('aria-label', theme === 'dark' ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối');
  }
}
