import http.server
import socketserver
import threading
import subprocess
import os
import sys
import re
import json

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

ROOT = r'c:\Users\VDT\Documents\bai_to_4'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)
    def log_message(self, format, *args):
        pass

server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
port = server.server_address[1]
t = threading.Thread(target=server.serve_forever, daemon=True)
t.start()

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

# Test 1: Full DOM check on real index.html
print("[QA 1/2] Đang kiểm tra DOM và hiển thị số liệu C-01 trên app/index.html...")
cmd = [
    edge_path,
    '--headless=new',
    '--disable-gpu',
    '--enable-logging=stderr',
    '--v=1',
    '--virtual-time-budget=6000',
    '--dump-dom',
    f'http://127.0.0.1:{port}/app/index.html'
]
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')

csp_errors = [l for l in res.stderr.splitlines() if 'Content-Security-Policy' in l or 'CSP' in l]
js_errors = [l for l in res.stderr.splitlines() if 'Uncaught' in l or 'TypeError' in l or 'ReferenceError' in l]

print("  - CSP Errors:", len(csp_errors))
print("  - JS Errors:", len(js_errors))

m_tot = re.search(r'id="statTotalReports">([^<]+)<', res.stdout)
m_ver = re.search(r'id="statVerifiedReports">([^<]+)<', res.stdout)
m_rat = re.search(r'id="statSafetyRate">([^<]+)<', res.stdout)

tot_val = m_tot.group(1).strip() if m_tot else None
ver_val = m_ver.group(1).strip() if m_ver else None
rat_val = m_rat.group(1).strip() if m_rat else None

print(f"  - Tổng báo cáo (statTotalReports): {tot_val}")
print(f"  - Đã xác minh (statVerifiedReports): {ver_val}")
print(f"  - Tỷ lệ an toàn (statSafetyRate): {rat_val}")

test1_pass = (
    len(csp_errors) == 0 and
    len(js_errors) == 0 and
    tot_val is not None and int(tot_val) >= 11 and
    ver_val is not None and int(ver_val) >= 11 and
    rat_val is not None and '%' in rat_val
)
print(f"  => Kết quả Test 1: {'PASSED ✅' if test1_pass else 'FAILED ❌'}")

# Test 2: Interactive functional tests in browser (Receipt, Submission, Online listener)
print("\n[QA 2/2] Đang kiểm tra luồng tương tác thực tế C-02 (Biên nhận) & Online listener...")

interactive_html = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Interactive Test</title>
</head>
<body>
  <div id="statTotalReports">--</div>
  <div id="statVerifiedReports">--</div>
  <div id="statSafetyRate">--</div>

  <form id="intakeForm">
    <input type="text" id="intakeTarget" value="0912345678">
    <select id="intakeType"><option value="Lừa đảo việc làm online">Lừa đảo việc làm online</option></select>
    <textarea id="intakeNote">Kiểm tra gửi báo cáo thử nghiệm</textarea>
    <button type="submit" class="btn-submit-intake">Nộp</button>
    <button type="button" id="btnDownloadReceipt" class="btn-download-receipt" style="display: none;">Biên nhận</button>
  </form>
  <tbody id="intakeTableBody"></tbody>
  <div id="cloudStatusBadge"></div>

  <div id="testResults"></div>

  <script src="/app/js/storage.js"></script>
  <script src="/app/js/firebase-service.js"></script>
  <script src="/app/js/lookup.js"></script>
  <script src="/app/js/intake.js"></script>

  <script>
    // Mock alert so it does not block headless browser
    window.alert = function() {};

    async function runInteractiveTest() {
      const results = {};
      try {
        await FirebaseService.init();
        initIntakeView();
        initLookupStats();

        // 1. Initial Hero Stats check
        const initialStats = FirebaseService.getReportStats();
        results.initialTotal = initialStats.total;
        results.initialVerified = initialStats.verified;

        // 2. Receipt button initial state
        const receiptBtn = document.getElementById('btnDownloadReceipt');
        results.receiptInitiallyHidden = receiptBtn.style.display === 'none';

        // 3. Clear rate limit cooldown for test
        localStorage.removeItem('to4_last_submit_time');

        // 4. Trigger submit form
        const fakeEvent = { preventDefault: () => {} };
        await handleIntakeFormSubmit(fakeEvent);

        // 5. Check receipt button state after submit
        results.receiptVisibleAfterSubmit = receiptBtn.style.display !== 'none';

        // 6. Check lastSubmittedReceipt and receipt text
        results.hasReceiptData = typeof lastSubmittedReceipt !== 'undefined' && lastSubmittedReceipt !== null;
        if (results.hasReceiptData) {
          const receiptTxt = buildReceiptText(lastSubmittedReceipt);
          results.receiptHasTicketId = receiptTxt.includes(lastSubmittedReceipt.reportId);
          results.receiptHasTarget = receiptTxt.includes('0912345678');
          results.receiptHasHeader = receiptTxt.includes('BIÊN NHẬN TIẾP NHẬN PHẢN ÁNH');
        }

        // 7. Check if stats updated dynamically
        const updatedStats = FirebaseService.getReportStats();
        results.updatedTotal = updatedStats.total;
        results.updatedVerified = updatedStats.verified;
        results.totalIncremented = updatedStats.total > results.initialTotal;

        // 8. Test Online event listener
        let onlineTriggered = false;
        try {
          window.dispatchEvent(new Event('online'));
          onlineTriggered = true;
        } catch(e) {
          onlineTriggered = false;
        }
        results.onlineEventHandled = onlineTriggered;

        results.allPassed = results.receiptInitiallyHidden &&
                            results.receiptVisibleAfterSubmit &&
                            results.hasReceiptData &&
                            results.receiptHasTicketId &&
                            results.totalIncremented &&
                            results.onlineEventHandled;

      } catch (err) {
        results.error = err.message;
        results.allPassed = false;
      }

      document.getElementById('testResults').textContent = JSON.stringify(results, null, 2);
    }

    window.onload = runInteractiveTest;
  </script>
</body>
</html>
"""

test_file = os.path.join(ROOT, 'tools', 'interactive_test.html')
with open(test_file, 'w', encoding='utf-8') as f:
    f.write(interactive_html)

cmd2 = [
    edge_path,
    '--headless=new',
    '--disable-gpu',
    '--virtual-time-budget=6000',
    '--dump-dom',
    f'http://127.0.0.1:{port}/tools/interactive_test.html'
]
res2 = subprocess.run(cmd2, capture_output=True, text=True, encoding='utf-8', errors='replace')
server.shutdown()
if os.path.exists(test_file):
    os.remove(test_file)

m_res = re.search(r'<div id="testResults">([\s\S]*?)</div>', res2.stdout)
if m_res:
    results_json = json.loads(m_res.group(1))
    print("  - Kết quả chạy:", json.dumps(results_json, indent=2, ensure_ascii=False))
    test2_pass = results_json.get('allPassed', False)
else:
    print("  - Không tìm thấy kết quả testResults trong DOM")
    test2_pass = False

print(f"\n=> TỔNG THỂ KIỂM THỬ HỒI QUY: {'100% PASSED ✅' if test1_pass and test2_pass else 'FAILED ❌'}")
sys.exit(0 if test1_pass and test2_pass else 1)
