import http.server
import socketserver
import threading
import subprocess
import os
import sys
import time
import json
import urllib.request

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

print(f"Test server running at http://127.0.0.1:{port}/")

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
url = f"http://127.0.0.1:{port}/app/index.html"

# Run Edge with logging
cmd = [
    edge_path,
    '--headless=new',
    '--disable-gpu',
    '--enable-logging=stderr',
    '--v=1',
    '--virtual-time-budget=6000',
    '--dump-dom',
    url
]

res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
server.shutdown()

print("--- BROWSER CONSOLE / STDERR ---")
csp_errors = []
js_errors = []
for line in res.stderr.splitlines():
    if 'Content-Security-Policy' in line or 'CSP' in line:
        csp_errors.append(line)
    elif 'CONSOLE' in line or 'Error' in line or 'Uncaught' in line:
        js_errors.append(line)

print(f"Total Stderr lines: {len(res.stderr.splitlines())}")
if csp_errors:
    print(f"CSP issues detected ({len(csp_errors)}):")
    for e in csp_errors[:10]:
        print("  [CSP]", e)
else:
    print("No CSP violations detected!")

if js_errors:
    print(f"JS Console/Errors ({len(js_errors)}):")
    for e in js_errors[:10]:
        print("  [JS]", e)
else:
    print("No JS errors detected in stderr!")

# Check rendered DOM for elements
dom = res.stdout
print("\n--- DOM INSPECTION ---")
print("Total DOM length:", len(dom))
print("Has lookup input:", 'id="lookupInput"' in dom)
print("Has intake form:", 'id="intakeForm"' in dom)
print("Has table/cards:", 'id="intakeTableBody"' in dom)
print("Has sample cards / rows:", 'HS-TDHT-' in dom or 'HS-' in dom)
