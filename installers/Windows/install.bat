@ECHO OFF

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
	
		REM Download Wget
		CD "%TEMP%"
		bitsadmin.exe /transfer "Wget" https://eternallybored.org/misc/wget/current/wget.exe "%TEMP%\wget.exe"

		REM Install OctoPrint dependencies
		wget.exe -O python.msi https://www.python.org/ftp/python/2.7.11/python-2.7.11.msi
		msiexec /i python.msi TARGETDIR=C:\python /quiet
		DEL python.msi

		REM Install OctoPrint
		wget.exe https://github.com/foosel/OctoPrint/archive/master.zip
		wget http://stahlworks.com/dev/unzip.exe
		unzip.exe master.zip
		CD OctoPrint-master
		C:\python\python.exe setup.py install
		MOVE /Y run "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\OctoPrint.pyw"
		CD ..
		RD /s /q OctoPrint-master
		DEL unzip.exe
		DEL master.zip
	
		REM Install M3D Fio
		ECHO y | C:\python\Scripts\pip.exe uninstall OctoPrint-M3DFio
		wget.exe https://github.com/donovan6000/M3D-Fio/archive/master.zip
		:loop
		C:\python\Scripts\pip.exe install master.zip
		IF ERRORLEVEL 1 GOTO loop
		DEL master.zip
		
		REM Install drivers
		wget https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Windows/M3D.inf
		wget https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Windows/M3D.cat
		PnPUtil -i -a M3D.inf
		DEL M3D.inf
		DEL M3D.cat
		
		REM Create URL link on desktop
		wget https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Windows/OctoPrint.url
		MOVE OctoPrint.url "C:\Users\%USERNAME%\Desktop"
		DEL wget.exe

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
