@echo off
chcp 65001 >nul
echo ================================================================
echo 🚀 ĐỒNG BỘ DỰ ÁN LÊN GIT VÀ TỰ ĐỘNG TẮT MÁY (TỔ 4)
echo ================================================================
echo [1/2] Đang chạy kiểm thử tự động, đồng bộ bai_to_5 và đẩy lên GitHub...
python tools/sync_agent.py

if %errorlevel% neq 0 (
    echo.
    echo ❌ CẢNH BÁO: Kiểm thử hoặc đồng bộ thất bại!
    echo Đã hủy lệnh tắt máy tự động để bạn kiểm tra lại code.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] ✅ Đồng bộ và kiểm thử thành công 100%!
echo Tiến hành kích hoạt lệnh tắt máy sau 60 giây...
echo Gõ 'shutdown /a' hoặc bấm 'huy_tat_may.bat' nếu muốn hủy.
echo ================================================================
shutdown /s /t 60 /c "Hoan tat dong bo du an To 4. May se tat sau 60 giay. Go 'shutdown /a' de huy bo."
pause
