@echo off
chcp 65001 > nul
echo ========================================================
echo   KÍCH HOẠT HỆ THỐNG ĐỒNG BỘ & KIỂM THỬ TỰ ĐỘNG
echo ========================================================
python "%~dp0tools\sync_agent.py"
pause
