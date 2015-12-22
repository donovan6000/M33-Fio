@ECHO OFF
@SETLOCAL ENABLEDELAYEDEXPANSION

REM Request elevated privileges
IF "%PROCESSOR_ARCHITECTURE%" EQU "amd64" (
	>nul 2>&1 "%SYSTEMROOT%\SysWOW64\icacls.exe" "%SYSTEMROOT%\SysWOW64\config\system"
) ELSE (
	>nul 2>&1 "%SYSTEMROOT%\system32\icacls.exe" "%SYSTEMROOT%\system32\config\system"
)

IF %ERRORLEVEL% NEQ 0 (
	GOTO UACPrompt
) ELSE (
	GOTO gotAdmin
)

:UACPrompt
	ECHO Set UAC = CreateObject^("Shell.Application"^) > "%TEMP%\getadmin.vbs"
	SET params = %*:"=""
	ECHO UAC.ShellExecute "cmd.exe", "/c %~s0 %params%", "", "runas", 1 >> "%TEMP%\getadmin.vbs"

	"%TEMP%\getadmin.vbs"
	DEL "%TEMP%\getadmin.vbs"
	EXIT /B

:gotAdmin
	PUSHD "%CD%"
	CD /D "%~dp0"

REM Check if run as admin
NET SESSION >nul 2>&1
IF %ERRORLEVEL% EQU 0 (

	REM Check if not connected to the internet
	Ping www.google.com -n 1 -w 1000
	IF ERRORLEVEL 1 (

		REM Display message
		ECHO.
		ECHO An internet connection is required.

	REM Otherwise
	) ELSE (
	
		REM Move to temporary location
		CD "%TEMP%"
		
		REM Install OctoPrint dependencies
		bitsadmin.exe /transfer "Python Version" https://www.python.org/downloads/windows/ "%TEMP%\index.html"
		FOR /f "tokens=8" %%f IN ('find "Latest Python 2 Release" "%TEMP%\index.html"') DO SET version=%%f
		SET version=!version:~0,-9!
		bitsadmin.exe /transfer "Python" https://www.python.org/ftp/python/!version!/python-!version!.msi "%TEMP%\python.msi"
		msiexec /i python.msi TARGETDIR=C:\python /quiet
		DEL python.msi
		DEL index.html

		REM Create Wget
		COPY /y nul wget.py
		ECHO import sys> wget.py
		ECHO import urllib>> wget.py
		ECHO urllib.urlretrieve(str(sys.argv[1]^), str(sys.argv[2]^)^)>> wget.py
		
		REM Create unzip
		COPY /y nul unzip.py
		ECHO import sys> unzip.py
		ECHO import zipfile>> unzip.py
		ECHO with zipfile.ZipFile(str(sys.argv[1]^), 'r'^) as contents :>> unzip.py
		ECHO 	contents.extractall(^)>> unzip.py

		REM Install OctoPrint
		C:\python\python.exe wget.py https://github.com/foosel/OctoPrint/archive/master.zip master.zip
		C:\python\python.exe unzip.py master.zip
		CD OctoPrint-master
		C:\python\python.exe setup.py install
		MOVE /Y run "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\OctoPrint.pyw"
		CD ..
		RD /s /q OctoPrint-master
		DEL unzip.py
		DEL master.zip
	
		REM Install M3D Fio
		ECHO y | C:\python\Scripts\pip.exe uninstall OctoPrint-M3DFio
		C:\python\python.exe wget.py https://github.com/donovan6000/M3D-Fio/archive/master.zip master.zip
		:loop
		C:\python\Scripts\pip.exe install master.zip
		IF ERRORLEVEL 1 GOTO loop
		DEL master.zip
		
		REM Install drivers
		C:\python\python.exe wget.py https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Windows/M3D.inf M3D.inf
		C:\python\python.exe wget.py https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Windows/M3D.cat M3D.cat
		PnPUtil -i -a M3D.inf
		DEL M3D.inf
		DEL M3D.cat
		
		REM Create URL link on desktop
		C:\python\python.exe wget.py https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Windows/OctoPrint.url OctoPrint.url
		MOVE OctoPrint.url "C:\Users\%USERNAME%\Desktop"
		DEL wget.py

		REM Start OctoPrint
		START "C:\python\python.exe" "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\OctoPrint.pyw"
		
		REM Display message
		ECHO.
		ECHO OctoPrint and M3D Fio have been successfully installed. Go to http://localhost:5000 in any web browser to access OctoPrint.
	)

REM Otherwise
) ELSE (

	REM Display message
	ECHO.
	ECHO Admin privileges required.
)
