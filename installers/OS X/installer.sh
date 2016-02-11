#!/bin/sh

# Request elevated privileges
[ "$(whoami)" != "root" ] && exec sudo -- "$0" "$@"

# Check if not run as root
if [ "$(id -u)" != "0" ]; then

	# Display message
	echo
	echo 'Root privileges required.'
	echo

# Otherwise
else

	# Check if connected to the internet
	ping -q -t5 -W1 -c1 google.com
	if [ $? -eq 0 ]; then

		# Move to temporary location
		cd $TMPDIR

		# Install Python
		curl -o index.html https://www.python.org/downloads/mac-osx/
		version="$(perl -nle'print $1 if m/Latest Python 2 Release - Python ([0-9\.]*)/' index.html)"
		rm index.html
		curl -o python.pkg https://www.python.org/ftp/python/${version}/python-${version}-macosx10.6.pkg
		installer -pkg python.pkg -target /
		rm python.pkg
		pythonVersion="$(cut -f1,2 -d'.' <<< ${version})"

		# Install command line tools
		curl -O 'https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/OS%20X/command%20line%20tools%20installer.bash'
		bash 'command%20line%20tools%20installer.bash'
		rm 'command%20line%20tools%20installer.bash'

		# Install PyObjC core
		curl -o index.html https://pypi.python.org/pypi/pyobjc-core
		version="$(perl -nle'print $1 if m/pyobjc-core-([0-9\.]*)\.tar\.gz/' index.html | head -1)"
		rm index.html
		curl -o pyobjc-core.tar.gz https://pypi.python.org/packages/source/p/pyobjc-core/pyobjc-core-${version}.tar.gz
		tar zxvf pyobjc-core.tar.gz
		rm pyobjc-core.tar.gz
		cd pyobjc-core-${version}

		# Patch installer
		sed -i '' -e 's/\(self\.sdk_root = subprocess.*\)/try:\
                    \1/g' setup.py
		sed -i '' -e 's/\(universal_newlines=True.*\)/\1\
                except subprocess.CalledProcessError as e:\
                    self.sdk_root = \'"'"'\/\'"'"'/g' setup.py

		/Library/Frameworks/Python.framework/Versions/${pythonVersion}/bin/python setup.py install
		cd ..
		rm -rf pyobjc-core-${version}

		# Install PyObjC framework
		curl -o index.html https://pypi.python.org/pypi/pyobjc-framework-Cocoa
		version="$(perl -nle'print $1 if m/pyobjc-framework-Cocoa-([0-9\.]*)\.tar\.gz/' index.html | head -1)"
		rm index.html
		curl -o pyobjc-framework-Cocoa.tar.gz https://pypi.python.org/packages/source/p/pyobjc-framework-Cocoa/pyobjc-framework-Cocoa-${version}.tar.gz
		tar zxvf pyobjc-framework-Cocoa.tar.gz
		rm pyobjc-framework-Cocoa.tar.gz
		cd pyobjc-framework-Cocoa-${version}
		/Library/Frameworks/Python.framework/Versions/${pythonVersion}/bin/python setup.py install
		cd ..
		rm -rf pyobjc-framework-Cocoa-${version}
		
		# Install OctoPrint
		su $SUDO_USER -c 'launchctl unload /Library/LaunchAgents/com.octoprint.app.plist'
		curl -LOk https://github.com/foosel/OctoPrint/archive/master.zip
		unzip master.zip
		cd OctoPrint-master
		/Library/Frameworks/Python.framework/Versions/${pythonVersion}/bin/python setup.py install
		cd ..
		rm -rf OctoPrint-master
		rm master.zip

		# Install M3D Fio
		echo 'y' | /Library/Frameworks/Python.framework/Versions/${pythonVersion}/bin/pip uninstall OctoPrint-M3DFio
		curl -LOk https://github.com/donovan6000/M3D-Fio/archive/master.zip
		while ! /Library/Frameworks/Python.framework/Versions/${pythonVersion}/bin/pip install master.zip
		do
			:
		done
		rm master.zip
		
		# Install heatbed drivers
		curl -O 'https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/OS%20X/CH34x_Install.pkg'
		installer -pkg CH34x_Install.pkg -target /
		rm CH34x_Install.pkg
		
		# Get OctoPrint parameter
		octoPrintVersion="$(/Library/Frameworks/Python.framework/Versions/${pythonVersion}/bin/octoprint --version | cut -d' ' -f3)"
		if [ $octoPrintVersion = "1.2.8" ] || [ $octoPrintVersion = "1.2.9" ]; then
			octoPrintParameter=""
		else
			octoPrintParameter="<string>serve<\/string>"
		fi
		
		# Add OctoPrint to startup programs
		curl -O 'https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/OS%20X/com.octoprint.app.plist'
		sed -i '' -e 's/path to octoprint/\/Library\/Frameworks\/Python.framework\/Versions\/'"${pythonVersion}"'\/bin\/octoprint/g' com.octoprint.app.plist
		sed -i '' -e 's/<string>octoprint parameter<\/string>/'"$octoPrintParameter"'/g' com.octoprint.app.plist
		mv com.octoprint.app.plist '/Library/LaunchAgents'
		
		# Create URL link on desktop
		curl -O 'https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/OS%20X/shortcut.zip'
		ditto -x -k --sequesterRsrc --rsrc shortcut.zip '/Users/'"$SUDO_USER"'/Desktop'
		
		# Start OctoPrint
		su $SUDO_USER -c 'launchctl load /Library/LaunchAgents/com.octoprint.app.plist'
		
		# Display message
		echo
		echo 'OctoPrint and M3D Fio have been successfully installed. Go to http://localhost:5000 in any web browser to access OctoPrint.'
		echo
	
	# Otherwise
	else
	
		# Display message
		echo
		echo 'An internet connection is required.'
		echo
	fi
fi
