// ===================================================================
// MAIN APP COORDINATOR (TỔ 4 - MÔN TƯ DUY HỆ THỐNG)
// Hỗ trợ Quản lý Theme Sáng / Tối & Điều hướng Giao diện
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initIntakeView();

  // Quick lookup helper: change placeholder based on radio selection
  const radios = document.querySelectorAll('input[name="lookupType"]');
  const inputEl = document.getElementById('lookupInput');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'phone') {
        inputEl.placeholder = "Nhập số điện thoại (Ví dụ: 0236.688.8766)...";
        inputEl.value = "0236.688.8766";
      } else {
        inputEl.placeholder = "Nhập địa chỉ email (Ví dụ: daotao.dhqg.edu.vn@gmail.com)...";
        inputEl.value = "daotao.dhqg.edu.vn@gmail.com";
      }
      document.getElementById('lookupResultContainer').innerHTML = '';
      executeLookup();
    });
  });

  // Run initial default lookup
  executeLookup();
});

// Chuyển Tab
function switchAppTab(tabName) {
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
