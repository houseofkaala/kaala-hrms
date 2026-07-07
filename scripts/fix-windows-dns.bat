@echo off
:: Run as Administrator: right-click -> Run as administrator
set VPS_IP=200.97.162.24
set DOMAIN=bymarketingonly.com
set HOSTS=%SystemRoot%\System32\drivers\etc\hosts

echo Adding HRMS DNS entries to %HOSTS% ...
findstr /C:"kaala-hrms-vps" %HOSTS% >nul 2>&1
if %errorlevel%==0 (
  echo HRMS entries already exist. Remove lines with "kaala-hrms-vps" if you need to re-run.
  goto flush
)

>>%HOSTS% echo.
>>%HOSTS% echo # kaala-hrms-vps
>>%HOSTS% echo %VPS_IP% admin.%DOMAIN%
>>%HOSTS% echo %VPS_IP% employee.%DOMAIN%
>>%HOSTS% echo %VPS_IP% %DOMAIN%
>>%HOSTS% echo %VPS_IP% www.%DOMAIN%

:flush
echo Flushing DNS cache...
ipconfig /flushdns >nul

echo.
echo Done. Open in browser:
echo   https://admin.%DOMAIN%/login
echo   https://employee.%DOMAIN%/login
echo.
pause