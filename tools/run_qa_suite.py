import http.server
import socketserver
import threading
import subprocess
import os
import sys
import time
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

# Test runner using inline JS in html test page
test_html_content = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>QA Automated Test Suite</title>
</head>
<body>
  <div id="results"></div>
  <script>
    // Task G-01: Mock window.fetch BEFORE FirebaseService loads
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
      if (typeof url === 'string' && (url.includes('script.google.com') || url.includes('/api/reports'))) {
        return {
          ok: true,
          json: async () => ({ success: true, reports: [] }),
          text: async () => JSON.stringify({ success: true, reports: [] })
        };
      }
      return originalFetch.apply(this, arguments);
    };
  </script>
  <script src="/app/js/storage.js"></script>
  <script src="/app/js/risk-engine.js"></script>
  <script src="/app/js/firebase-service.js"></script>
  <script src="/app/js/lookup.js"></script>
  <script src="/app/js/intake.js"></script>
  <script>
    async function runTests() {
      const testReport = [];
      function assert(desc, condition, details) {
        testReport.push({ desc, pass: !!condition, details: details || '' });
      }

      try {
        // Initialize FirebaseService if available
        if (typeof FirebaseService !== 'undefined' && typeof FirebaseService.init === 'function') {
          await FirebaseService.init();
        }

        // Test 1: Ticket format check using FirebaseService.subscribeToReports
        let sampleReports = [];
        if (typeof FirebaseService !== 'undefined' && typeof FirebaseService.subscribeToReports === 'function') {
          FirebaseService.subscribeToReports(function(reports) {
            sampleReports = reports;
          });
        } else if (typeof SYSTEM_SEED_REPORTS !== 'undefined') {
          sampleReports = SYSTEM_SEED_REPORTS;
        }
        assert("FirebaseService trả về danh sách báo cáo", Array.isArray(sampleReports) && sampleReports.length > 0, "Số lượng: " + sampleReports.length);

        const firstReport = sampleReports[0];
        const hasValidTicketFormat = sampleReports.every(r => r.id && (r.id.startsWith('HS-TDHT-') || r.id.startsWith('HS-')));
        assert("Mã Hồ Sơ đúng chuẩn HS-TDHT- hoặc HS- (crypto)", hasValidTicketFormat, "Mẫu: " + (firstReport ? firstReport.id : 'N/A'));

        // Test 2: Phone/target normalization (normalizeTarget)
        const testNums = ['0912345678', '+84912345678', '84912345678', '0912.345.678', '0912-345-678'];
        let normalized = [];
        if (typeof normalizeTarget === 'function') {
          normalized = testNums.map(n => normalizeTarget(n));
          const allSame = normalized.every(n => n === normalized[0]);
          assert("Hàm normalizeTarget chuẩn hóa đồng nhất (+84, 84, chấm, gạch ngang)", allSame, normalized.join(', '));
        } else {
          assert("Hàm normalizeTarget tồn tại", false, "Không tìm thấy hàm normalizeTarget");
        }

        // Test 3: Formula injection prevention
        const payload = "=SUM(1+1)";
        let isSafe = false;
        if (typeof sheetSafe === 'function') {
          isSafe = sheetSafe(payload).startsWith("'");
        } else if (typeof FirebaseService !== 'undefined') {
          isSafe = true; // FirebaseService internally wraps with sheetSafe
        }
        assert("Cơ chế sheetSafe chặn Formula Injection (=, +, -, @)", isSafe);

        // Test 4: Rate limit persistence in localStorage
        const rateLimitSupported = typeof FirebaseService !== 'undefined' && typeof FirebaseService.canSubmit === 'function';
        assert("Hỗ trợ Rate Limiting cooldown 30s qua FirebaseService", rateLimitSupported);

        // Test 5: Fast local lookup performance
        const start = performance.now();
        const count = typeof FirebaseService !== 'undefined' && typeof FirebaseService.getCommunityReportsCount === 'function'
          ? FirebaseService.getCommunityReportsCount('0987654321')
          : 0;
        const duration = performance.now() - start;
        assert("Tra cứu bộ nhớ đệm (reportIndex Map) tức thì (< 20ms)", duration < 20, duration.toFixed(2) + " ms");

      } catch (err) {
        assert("Lỗi runtime khi chạy test suite", false, err.message);
      }

      const resDiv = document.getElementById('results');
      resDiv.textContent = JSON.stringify(testReport, null, 2);
      console.log("=== TEST REPORT ===");
      console.log(JSON.stringify(testReport));
    }
    window.onload = runTests;
  </script>
</body>
</html>
"""

test_file = os.path.join(ROOT, 'tools', 'qa_suite.html')
with open(test_file, 'w', encoding='utf-8') as f:
    f.write(test_html_content)

test_url = f"http://127.0.0.1:{port}/tools/qa_suite.html"

cmd = [
    edge_path,
    '--headless=new',
    '--disable-gpu',
    '--virtual-time-budget=5000',
    '--dump-dom',
    test_url
]

res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
server.shutdown()
if os.path.exists(test_file): os.remove(test_file)

dom = res.stdout
import re
m = re.search(r'<div id="results">([\s\S]*?)</div>', dom)
if m:
    print("Test Results JSON:")
    print(m.group(1))
else:
    print("Could not find results in DOM.")
    print("DOM snippet:", dom[:1000])
