"""
TOOLS/SYNC_AGENT.PY - TỰ ĐỘNG HÓA KIỂM THỬ, ĐỒNG BỘ & ĐẨY GIT (GEMINI & CLAUDE)
Cách dùng:
    python tools/sync_agent.py            # kiểm thử -> (đạt) đồng bộ bai_to_5 -> commit & push
    python tools/sync_agent.py --prune    # như trên + HỎI trước khi xóa tệp thừa ở bai_to_5
    hoặc bấm đúp vào file sync.bat ở thư mục gốc

An toàn:
- Chỉ đồng bộ / commit / push khi kiểm thử ĐẠT (trình duyệt + test đơn vị).
- Chỉ git add các đường dẫn có chủ đích (SYNC_PATHS), không add -A toàn bộ repo.
- Không tự xóa tệp ở bai_to_5: chỉ liệt kê; xóa khi chạy --prune và gõ "y" xác nhận.
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

# Các đường dẫn (tương đối với ROOT_4) được phép đồng bộ sang bai_to_5 và git add.
# Thêm thư mục / tệp mới vào đây có chủ đích - tệp nằm ngoài danh sách sẽ không bị đẩy lên Git.
SYNC_PATHS = [
    'app', 'api', 'tools', 'docs', 'assets',
    'AGENT_SYNC.md', 'CLAUDE.md', 'README.md',
    'index.html', 'vercel.json', '.gitignore', 'sync.bat',
]
SKIP_NAMES = ('.git', '__pycache__', '.tempmediaStorage')
PRUNE = '--prune' in sys.argv[1:]

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

# Test đơn vị (normalizeTarget, RiskEngine) - chạy bằng Node, không cần mạng
unit_test = os.path.join(ROOT_4, 'tools', 'tests', 'unit_test.js')
if os.path.exists(unit_test):
    node_exe = shutil.which('node')
    if not node_exe:
        print("    ❌ Không tìm thấy Node.js để chạy test đơn vị -> coi là KHÔNG ĐẠT.")
        qa_passed = False
    else:
        ut = subprocess.run([node_exe, unit_test], cwd=ROOT_4, capture_output=True, text=True, encoding='utf-8', errors='replace')
        for line in (ut.stdout.strip() or ut.stderr.strip()).splitlines():
            print("    " + line)
        if ut.returncode != 0:
            qa_passed = False

try:
    server.server_close()
except Exception:
    pass

# -------------------------------------------------------------
# BƯỚC 3: ĐỒNG BỘ SANG BAI_TO_5 (CHỈ KHI KIỂM THỬ ĐẠT)
# -------------------------------------------------------------
def stale_files_in_root5():
    """Tệp / thư mục trong các đường dẫn đồng bộ của bai_to_5 không còn ở bai_to_4."""
    stale = []
    for rel in SYNC_PATHS:
        dst = os.path.join(ROOT_5, rel)
        if not os.path.isdir(dst):
            continue
        for root, dirs, files in os.walk(dst):
            dirs[:] = [d for d in dirs if d not in SKIP_NAMES]
            src_root = os.path.join(ROOT_4, os.path.relpath(root, ROOT_5))
            for name in dirs + files:
                if name.endswith('.pyc'):
                    continue
                if not os.path.exists(os.path.join(src_root, name)):
                    stale.append(os.path.join(root, name))
            # Không đi sâu vào thư mục đã bị liệt kê là thừa
            dirs[:] = [d for d in dirs if os.path.exists(os.path.join(src_root, d))]
    return stale


if not qa_passed:
    print("[*] 3/4. BỎ QUA đồng bộ bai_to_5 vì kiểm thử chưa đạt.")
else:
    print("[*] 3/4. Đang đồng bộ tệp sang thư mục bai_to_5...")
    try:
        os.makedirs(ROOT_5, exist_ok=True)
        for rel in SYNC_PATHS:
            src = os.path.join(ROOT_4, rel)
            dst = os.path.join(ROOT_5, rel)
            if os.path.isdir(src):
                shutil.copytree(src, dst, dirs_exist_ok=True,
                                ignore=shutil.ignore_patterns(*SKIP_NAMES, '*.pyc'))
            elif os.path.isfile(src):
                shutil.copy2(src, dst)
        print("    ✅ Đã đồng bộ các tệp trong SYNC_PATHS sang bai_to_5!")

        stale = stale_files_in_root5()
        if stale:
            print(f"    ℹ️ bai_to_5 có {len(stale)} tệp/thư mục không còn ở bai_to_4 (KHÔNG tự xóa):")
            for pth in stale:
                print(f"       - {os.path.relpath(pth, ROOT_5)}")
            if PRUNE:
                answer = input("    ❓ Xóa các mục trên khỏi bai_to_5? Gõ 'y' để xác nhận: ").strip().lower()
                if answer == 'y':
                    for pth in stale:
                        if os.path.isdir(pth):
                            shutil.rmtree(pth)
                        elif os.path.exists(pth):
                            os.remove(pth)
                    print("    🗑️ Đã xóa theo xác nhận.")
                else:
                    print("    ↩️ Giữ nguyên, không xóa gì.")
            else:
                print("    👉 Muốn dọn: chạy lại với --prune (sẽ hỏi xác nhận trước khi xóa).")
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

def git(*args):
    return subprocess.run(['git', '-C', ROOT_4, *args], capture_output=True, text=True, encoding='utf-8')


# Chỉ add các đường dẫn có chủ đích: đang tồn tại, hoặc đã từng được Git theo dõi (để ghi nhận việc xóa)
tracked = git('ls-files').stdout.splitlines()
add_paths = [p for p in SYNC_PATHS
             if os.path.exists(os.path.join(ROOT_4, p))
             or any(t == p or t.startswith(p + '/') for t in tracked)]
subprocess.run(['git', '-C', ROOT_4, 'add', '-A', '--', *add_paths], check=True)

# Cảnh báo tệp mới nằm ngoài danh sách (không add)
outside = [l[3:] for l in git('status', '--porcelain').stdout.splitlines() if l.startswith('?? ')]
if outside:
    print("    ℹ️ Tệp mới NGOÀI danh sách SYNC_PATHS (không đưa lên Git):")
    for f in outside:
        print(f"       - {f}")

if git('diff', '--cached', '--quiet').returncode == 0:
    print("    ℹ️ Không có thay đổi mới nào cần commit trong SYNC_PATHS.")
else:
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
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
