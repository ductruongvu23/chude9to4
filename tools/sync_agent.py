"""
TOOLS/SYNC_AGENT.PY - TỰ ĐỘNG HÓA KIỂM THỬ, ĐỒNG BỘ & ĐẨY GIT (GEMINI & CLAUDE)
Cách dùng:
    python tools/sync_agent.py
    hoặc bấm đúp vào file sync.bat ở thư mục gốc
"""

import http.server
import socketserver
import threading
import subprocess
import os
import sys
import time
import shutil
from datetime import datetime

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

ROOT_4 = r'c:\Users\VDT\Documents\bai_to_4'
ROOT_5 = r'c:\Users\VDT\Documents\bai_to_5'

print("=" * 65)
print("🚀 HỆ THỐNG TỰ ĐỘNG HÓA KIỂM THỬ & ĐỒNG BỘ DỰ ÁN (TỔ 4)")
print("=" * 65)

# -------------------------------------------------------------
# BƯỚC 1: KHỞI ĐỘNG SERVER ẢO NỘI BỘ
# -------------------------------------------------------------
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_4, **kwargs)
    def log_message(self, format, *args):
        pass

server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
port = server.server_address[1]

def run_server():
    try:
        server.serve_forever()
    except Exception:
        pass

t = threading.Thread(target=run_server, daemon=True)
t.start()
print(f"[*] 1/4. Server ảo nội bộ đang chạy trên cổng {port}...")

# -------------------------------------------------------------
# BƯỚC 2: CHẠY KIỂM THỬ TRÌNH DUYỆT THẬT (EDGE CHROMIUM ENGINE)
# -------------------------------------------------------------
edge_paths = [
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
]
edge_exe = next((p for p in edge_paths if os.path.exists(p)), None)
if not edge_exe:
    print("[-] Không tìm thấy Edge! Bỏ qua kiểm thử giao diện.")
    qa_passed = False
else:
    print(f"[*] 2/4. Đang chạy kiểm thử trình duyệt tự động (Headless Edge)...")
    url = f"http://127.0.0.1:{port}/app/index.html"
    cmd = [
        edge_exe,
        '--headless=new',
        '--disable-gpu',
        '--enable-logging=stderr',
        '--v=1',
        '--virtual-time-budget=6000',
        '--dump-dom',
        url
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    
    csp_errors = [l for l in res.stderr.splitlines() if 'Content-Security-Policy' in l or 'CSP' in l]
    js_errors = [l for l in res.stderr.splitlines() if 'Uncaught' in l or 'TypeError' in l or 'ReferenceError' in l]
    
    has_input = 'id="lookupInput"' in res.stdout
    has_form = 'id="intakeForm"' in res.stdout
    has_stats = 'id="statTotalReports"' in res.stdout
    has_receipt_btn = 'id="btnDownloadReceipt"' in res.stdout
    
    qa_passed = len(csp_errors) == 0 and len(js_errors) == 0 and has_input and has_form and has_stats and has_receipt_btn
    
    if qa_passed:
        print("    ✅ KIỂM THỬ THÀNH CÔNG: 0 lỗi CSP, 0 lỗi JS, DOM & UI anchors hoàn chỉnh!")
    else:
        print(f"    ⚠️ CẢNH BÁO KIỂM THỬ: CSP: {len(csp_errors)}, JS: {len(js_errors)}, DOM OK: {has_input and has_form and has_stats and has_receipt_btn}")

try:
    server.server_close()
except Exception:
    pass

# -------------------------------------------------------------
# BƯỚC 3: ĐỒNG BỘ TỰ ĐỘNG SANG BAI_TO_5
# -------------------------------------------------------------
print("[*] 3/4. Đang đồng bộ tệp sang thư mục bai_to_5...")
try:
    for item in os.listdir(ROOT_4):
        if item in ('.git', '__pycache__', '.tempmediaStorage'):
            continue
        s = os.path.join(ROOT_4, item)
        d = os.path.join(ROOT_5, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
    print("    ✅ Đã đồng bộ 100% tệp sang bai_to_5!")
except Exception as e:
    print(f"    ⚠️ Lỗi đồng bộ sang bai_to_5: {e}")

# -------------------------------------------------------------
# BƯỚC 4: GIT COMMIT & PUSH TỰ ĐỘNG (CHỈ KHI KIỂM THỬ ĐẠT 100%)
# -------------------------------------------------------------
print("[*] 4/4. Đang kiểm tra thay đổi và tiến hành commit...")
if not qa_passed:
    print("    ❌ KIỂM THỬ THẤT BẠI! ĐÃ HỦY BỎ BƯỚC COMMIT & PUSH ĐỂ BẢO VỆ REPO.")
    print("    👉 Vui lòng sửa lỗi kiểm thử ở trên trước khi đẩy code lên Git.")
    sys.exit(1)

status_res = subprocess.run(['git', '-C', ROOT_4, 'status', '--porcelain'], capture_output=True, text=True, encoding='utf-8')
changes = status_res.stdout.strip()

if not changes:
    print("    ℹ️ Không có thay đổi mới nào cần commit. Trạng thái Git đã sạch!")
else:
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    subprocess.run(['git', '-C', ROOT_4, 'add', 'app', 'tools', 'AGENT_SYNC.md', 'CLAUDE.md', 'sync.bat', 'index.html', '.gitignore'], check=True)
    commit_msg = f"sync: automated QA verified & synced [{now_str}]"
    subprocess.run(['git', '-C', ROOT_4, 'commit', '-m', commit_msg], check=True)
    push_res = subprocess.run(['git', '-C', ROOT_4, 'push', 'origin', 'main'], capture_output=True, text=True, encoding='utf-8')
    if push_res.returncode == 0:
        print("    ✅ ĐÃ ĐẨY LÊN GITHUB THÀNH CÔNG (nhánh main)!")
    else:
        print(f"    ⚠️ Git push thất bại: {push_res.stderr}")

print("=" * 65)
print("🎉 TOÀN BỘ TIẾN TRÌNH ĐÃ HOÀN TẤT TRƠN TRU!")
print("=" * 65)
