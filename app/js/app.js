// ===================================================================
// MAIN APP COORDINATOR (TỔ 4 - MÔN TƯ DUY HỆ THỐNG)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
  initIntakeView();

  // Quick lookup helper: change placeholder based on radio selection
  const radios = document.querySelectorAll('input[name="lookupType"]');
  const inputEl = document.getElementById('lookupInput');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'phone') {
        inputEl.placeholder = "Nhập số điện thoại (Ví dụ: 0981234567)...";
        inputEl.value = "0981234567";
      } else {
        inputEl.placeholder = "Nhập địa chỉ email (Ví dụ: daotao.dhqg.edu.vn@gmail.com)...";
        inputEl.value = "daotao.dhqg.edu.vn@gmail.com";
      }
      document.getElementById('lookupResultContainer').innerHTML = '';
    });
  });

  // Run initial default lookup
  executeLookup();
});

function switchAppTab(tabName) {
  document.querySelectorAll('.app-tab-nav button').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  document.querySelectorAll('.tab-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `tab-${tabName}`);
  });
}
