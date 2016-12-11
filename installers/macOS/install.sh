#!/bin/sh

# Request elevated privileges
[ "$(whoami)" != "root" ] && exec sudo "$0" "$@"

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
		cd "$TMPDIR"
		
		# Stop OctoPrint
		sudo -u $SUDO_USER launchctl unload /Library/LaunchAgents/com.octoprint.app.plist

		# Install Python
		while ! curl -f -o index.html 'https://www.python.org/downloads/mac-osx/'
		do
			:
		done
		version="$(perl -nle'print $1 if m/Latest Python 2 Release - Python ([0-9\.]*)/' index.html)"
		rm index.html
		while ! curl -f -o python.pkg 'https://www.python.org/ftp/python/'"${version}"'/python-'"${version}"'-macosx10.6.pkg'
		do
			:
		done
		while ! installer -allowUntrusted -pkg python.pkg -target /
		do
			:
		done
		rm python.pkg
		
		# Install pip
		while ! curl -f -O 'https://bootstrap.pypa.io/get-pip.py'
		do
			:
		done
		sudo su <<COMMAND
while ! /Library/Frameworks/Python.framework/Versions/2.7/bin/python get-pip.py
do
	:
done
COMMAND
		rm get-pip.py
		
		# Update pip
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip install pip --user --upgrade
		do
			:
		done
		
		# Install command line tools
		while ! curl -f -O 'https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/macOS/command%20line%20tools%20installer.bash'
		do
			:
		done
		while ! bash 'command%20line%20tools%20installer.bash'
		do
			:
		done
		rm 'command%20line%20tools%20installer.bash'

		# Install PyObjC core
		while ! curl -f -o index.html 'https://pypi.python.org/pypi/pyobjc-core'
		do
			:
		done
		version="$(perl -nle'print $1 if m/pyobjc-core-([0-9\.]*)\.tar\.gz/' index.html | head -1)"
		url="$(perl -nle'print $1 if m/<a class=\"button green\".*?href=\"(.*)\">Download/' index.html | head -1)"
		rm index.html
		while ! curl -f -o pyobjc-core.tar.gz ''"${url}"''
		do
			:
		done
		sudo -u $SUDO_USER tar zxvf pyobjc-core.tar.gz
		rm pyobjc-core.tar.gz
		cd pyobjc-core-${version}

		# Patch installer to fix compiling issues
		sudo -u $SUDO_USER sed -i '' -e 's/def get_sdk_level():/def get_sdk_level():\
    return None/g' setup.py
		sudo -u $SUDO_USER sed -i '' -e 's/if os\.path\.exists('\''\/usr\/bin\/xcodebuild'\''):/if False and os\.path\.exists('\''\/usr\/bin\/xcodebuild'\''):/g' setup.py
		
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/python setup.py install --user
		do
			:
		done
		cd ..
		rm -rf pyobjc-core-${version}

		# Install PyObjC Cocoa framework
		while ! curl -f -o index.html 'https://pypi.python.org/pypi/pyobjc-framework-Cocoa'
		do
			:
		done
		version="$(perl -nle'print $1 if m/pyobjc-framework-Cocoa-([0-9\.]*)\.tar\.gz/' index.html | head -1)"
		url="$(perl -nle'print $1 if m/<a class=\"button green\".*?href=\"(.*)\">Download/' index.html | head -1)"
		rm index.html
		while ! curl -f -o pyobjc-framework-Cocoa.tar.gz ''"${url}"''
		do
			:
		done
		sudo -u $SUDO_USER tar zxvf pyobjc-framework-Cocoa.tar.gz
		rm pyobjc-framework-Cocoa.tar.gz
		cd pyobjc-framework-Cocoa-${version}
		
		# Patch installer to fix compiling issues
		sudo -u $SUDO_USER sed -i '' -e 's/def get_sdk_level():/def get_sdk_level():\
    return None/g' pyobjc_setup.py
		sudo -u $SUDO_USER sed -i '' -e 's/xcodebuild -version -sdk macosx Path/echo "\/"/g' pyobjc_setup.py
		
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/python setup.py install --user
		do
			:
		done
		cd ..
		rm -rf pyobjc-framework-Cocoa-${version}
		
		# Install PyObjC Quartz framework
		while ! curl -f -o index.html 'https://pypi.python.org/pypi/pyobjc-framework-Quartz'
		do
			:
		done
		version="$(perl -nle'print $1 if m/pyobjc-framework-Quartz-([0-9\.]*)\.tar\.gz/' index.html | head -1)"
		url="$(perl -nle'print $1 if m/<a class=\"button green\".*?href=\"(.*)\">Download/' index.html | head -1)"
		rm index.html
		while ! curl -f -o pyobjc-framework-Quartz.tar.gz ''"${url}"''
		do
			:
		done
		sudo -u $SUDO_USER tar zxvf pyobjc-framework-Quartz.tar.gz
		rm pyobjc-framework-Quartz.tar.gz
		cd pyobjc-framework-Quartz-${version}
		
		# Patch installer to fix compiling issues
		sudo -u $SUDO_USER sed -i '' -e 's/def get_sdk_level():/def get_sdk_level():\
    return None/g' pyobjc_setup.py
    		sudo -u $SUDO_USER sed -i '' -e 's/xcodebuild -version -sdk macosx Path/echo "\/"/g' pyobjc_setup.py
		
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/python setup.py install --user
		do
			:
		done
		cd ..
		rm -rf pyobjc-framework-Quartz-${version}
		
		# Install PyObjC QTKit framework
		while ! curl -f -o index.html 'https://pypi.python.org/pypi/pyobjc-framework-QTKit'
		do
			:
		done
		version="$(perl -nle'print $1 if m/pyobjc-framework-QTKit-([0-9\.]*)\.tar\.gz/' index.html | head -1)"
		url="$(perl -nle'print $1 if m/<a class=\"button green\".*?href=\"(.*)\">Download/' index.html | head -1)"
		rm index.html
		while ! curl -f -o pyobjc-framework-QTKit.tar.gz ''"${url}"''
		do
			:
		done
		sudo -u $SUDO_USER tar zxvf pyobjc-framework-QTKit.tar.gz
		rm pyobjc-framework-QTKit.tar.gz
		cd pyobjc-framework-QTKit-${version}
		
		# Patch installer to fix compiling issues
		sudo -u $SUDO_USER sed -i '' -e 's/def get_sdk_level():/def get_sdk_level():\
    return None/g' pyobjc_setup.py
    		sudo -u $SUDO_USER sed -i '' -e 's/xcodebuild -version -sdk macosx Path/echo "\/"/g' pyobjc_setup.py
		
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/python setup.py install --user
		do
			:
		done
		cd ..
		rm -rf pyobjc-framework-QTKit-${version}
		
		# Install OctoPrint
		while ! curl -f -LOk 'https://github.com/foosel/OctoPrint/archive/master.zip'
		do
			:
		done
		sudo -u $SUDO_USER unzip master.zip
		cd OctoPrint-master
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/python setup.py install --user
		do
			:
		done
		cd ..
		sudo -u $SUDO_USER mkdir -p '/Users/'"$SUDO_USER"'/Library/Application Support/OctoPrint'
		rm -rf '/Users/'"$SUDO_USER"'/Library/Application Support/OctoPrint/checkout'
		#sudo -u $SUDO_USER mv OctoPrint-master '/Users/'"$SUDO_USER"'/Library/Application Support/OctoPrint/checkout'
		rm -rf OctoPrint-master
		rm master.zip

		# Install M33 Fio
		while echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall OctoPrint-M3DFio
		do
			:
		done
		while echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall OctoPrint-M33Fio
		do
			:
		done
		while ! curl -f -LOk 'https://github.com/donovan6000/M33-Fio/archive/master.zip'
		do
			:
		done
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip install master.zip --user
		do
			:
		done
		rm master.zip
		
		# Install heatbed drivers
		while ! curl -f -O 'https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/macOS/CH34x_Install.pkg'
		do
			:
		done
		while ! installer -allowUntrusted -pkg CH34x_Install.pkg -target /
		do
			:
		done
		rm CH34x_Install.pkg
		
		# Add OctoPrint to startup programs
		while ! curl -f -O 'https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/macOS/com.octoprint.app.plist'
		do
			:
		done
		sed -i '' -e 's/path to octoprint/\/Users\/'"$SUDO_USER"'\/Library\/Python\/2.7\/bin\/octoprint/g' com.octoprint.app.plist
		mv com.octoprint.app.plist '/Library/LaunchAgents'
		
		# Create URL link on desktop
		while ! curl -f -O 'https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/macOS/shortcut.zip'
		do
			:
		done
		sudo -u $SUDO_USER ditto -x -k --sequesterRsrc --rsrc shortcut.zip '/Users/'"$SUDO_USER"'/Desktop'
		rm shortcut.zip
		
		# Start OctoPrint
		rm -rf '/Users/'"$SUDO_USER"'/.python-eggs'
		sudo -u $SUDO_USER launchctl load /Library/LaunchAgents/com.octoprint.app.plist
		
		# Display message
		echo
		echo 'OctoPrint and M33 Fio have been successfully installed. Go to http://localhost:5000 in any web browser to access OctoPrint.'
		echo
	
	# Otherwise
	else
	
		# Display message
		echo
		echo 'An internet connection is required.'
		echo
	fi
fi
