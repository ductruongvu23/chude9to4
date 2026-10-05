@echo off
chcp 65001 >nul
echo ================================================================
echo 🛑 HỆ THỐNG TẮT MÁY TỰ ĐỘNG - ĐỀ TÀI 9 TỔ 4
echo ================================================================
echo Máy tính của bạn sẽ tự động tắt sau 60 giây.
echo.
echo 💡 NẾU MUỐN HỦY LỆNH TẮT MÁY:
echo    - Nhấp đúp vào file 'huy_tat_may.bat'
echo    - Hoặc mở Command Prompt / PowerShell và gõ: shutdown /a
echo ================================================================
shutdown /s /t 60 /c "Dang tien hanh tat may theo lenh cua nguoi dung. Go 'shutdown /a' de huy bo."
echo.
echo Đã gửi lệnh tắt máy thành công!
pause
