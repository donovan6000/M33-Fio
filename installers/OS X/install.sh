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
		cd $TMPDIR
		
		# Stop OctoPrint
		sudo -u $SUDO_USER launchctl unload /Library/LaunchAgents/com.octoprint.app.plist

		# Install Python
		while ! curl -f -o index.html https://www.python.org/downloads/mac-osx/
		do
			:
		done
		version="$(perl -nle'print $1 if m/Latest Python 2 Release - Python ([0-9\.]*)/' index.html)"
		rm index.html
		while ! curl -f -o python.pkg https://www.python.org/ftp/python/${version}/python-${version}-macosx10.6.pkg
		do
			:
		done
		installer -pkg python.pkg -target /
		rm python.pkg
		
		# Update pip
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip install pip --user --upgrade
		do
			:
		done
		
		# Install command line tools
		while ! curl -f -O 'https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/OS%20X/command%20line%20tools%20installer.bash'
		do
			:
		done
		while ! bash 'command%20line%20tools%20installer.bash'
		do
			:
		done
		rm 'command%20line%20tools%20installer.bash'

		# Install PyObjC core
		while ! curl -f -o index.html https://pypi.python.org/pypi/pyobjc-core
		do
			:
		done
		version="$(perl -nle'print $1 if m/pyobjc-core-([0-9\.]*)\.tar\.gz/' index.html | head -1)"
		rm index.html
		while ! curl -f -o pyobjc-core.tar.gz https://pypi.python.org/packages/source/p/pyobjc-core/pyobjc-core-${version}.tar.gz
		do
			:
		done
		sudo -u $SUDO_USER tar zxvf pyobjc-core.tar.gz
		rm pyobjc-core.tar.gz
		cd pyobjc-core-${version}

		# Patch installer to fix compiling issues
		sudo -u $SUDO_USER sed -i '' -e 's/get_sdk_level() or get_os_level()/get_os_level() or get_sdk_level()/g' setup.py
		sudo -u $SUDO_USER sed -i '' -e 's/\(self\.sdk_root = subprocess.*\)/try:\
                    \1/g' setup.py
		sudo -u $SUDO_USER sed -i '' -e 's/\(universal_newlines=True.*\)/\1\
                except subprocess.CalledProcessError as e:\
                    self.sdk_root = \'"'"'\/\'"'"'/g' setup.py
		
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/python setup.py install --user
		do
			:
		done
		cd ..
		rm -rf pyobjc-core-${version}

		# Install PyObjC Cocoa framework
		while ! curl -f -o index.html https://pypi.python.org/pypi/pyobjc-framework-Cocoa
		do
			:
		done
		version="$(perl -nle'print $1 if m/pyobjc-framework-Cocoa-([0-9\.]*)\.tar\.gz/' index.html | head -1)"
		rm index.html
		while ! curl -f -o pyobjc-framework-Cocoa.tar.gz https://pypi.python.org/packages/source/p/pyobjc-framework-Cocoa/pyobjc-framework-Cocoa-${version}.tar.gz
		do
			:
		done
		sudo -u $SUDO_USER tar zxvf pyobjc-framework-Cocoa.tar.gz
		rm pyobjc-framework-Cocoa.tar.gz
		cd pyobjc-framework-Cocoa-${version}
		
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/python setup.py install --user
		do
			:
		done
		cd ..
		rm -rf pyobjc-framework-Cocoa-${version}
		
		# Install PyObjC Quartz framework
		while ! curl -f -o index.html https://pypi.python.org/pypi/pyobjc-framework-Quartz
		do
			:
		done
		version="$(perl -nle'print $1 if m/pyobjc-framework-Quartz-([0-9\.]*)\.tar\.gz/' index.html | head -1)"
		rm index.html
		while ! curl -f -o pyobjc-framework-Quartz.tar.gz https://pypi.python.org/packages/source/p/pyobjc-framework-Quartz/pyobjc-framework-Quartz-${version}.tar.gz
		do
			:
		done
		sudo -u $SUDO_USER tar zxvf pyobjc-framework-Quartz.tar.gz
		rm pyobjc-framework-Quartz.tar.gz
		cd pyobjc-framework-Quartz-${version}
		
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/python setup.py install --user
		do
			:
		done
		cd ..
		rm -rf pyobjc-framework-Quartz-${version}
		
		# Install PyObjC QTKit framework
		while ! curl -f -o index.html https://pypi.python.org/pypi/pyobjc-framework-QTKit
		do
			:
		done
		version="$(perl -nle'print $1 if m/pyobjc-framework-QTKit-([0-9\.]*)\.tar\.gz/' index.html | head -1)"
		rm index.html
		while ! curl -f -o pyobjc-framework-QTKit.tar.gz https://pypi.python.org/packages/source/p/pyobjc-framework-QTKit/pyobjc-framework-QTKit-${version}.tar.gz
		do
			:
		done
		sudo -u $SUDO_USER tar zxvf pyobjc-framework-QTKit.tar.gz
		rm pyobjc-framework-QTKit.tar.gz
		cd pyobjc-framework-QTKit-${version}
		
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/python setup.py install --user
		do
			:
		done
		cd ..
		rm -rf pyobjc-framework-QTKit-${version}
		
		# Install OctoPrint
		while ! curl -f -LOk https://github.com/foosel/OctoPrint/archive/master.zip
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
		while ! curl -f -LOk https://github.com/donovan6000/M33-Fio/archive/master.zip
		do
			:
		done
		while ! sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip install master.zip --user
		do
			:
		done
		rm master.zip
		
		# Install heatbed drivers
		while ! curl -f -O 'https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/OS%20X/CH34x_Install.pkg'
		do
			:
		done
		installer -pkg CH34x_Install.pkg -target /
		rm CH34x_Install.pkg
		
		# Add OctoPrint to startup programs
		while ! curl -f -O 'https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/OS%20X/com.octoprint.app.plist'
		do
			:
		done
		sed -i '' -e 's/path to octoprint/\/Users\/'"$SUDO_USER"'\/Library\/Python\/2.7\/bin\/octoprint/g' com.octoprint.app.plist
		mv com.octoprint.app.plist '/Library/LaunchAgents'
		
		# Create URL link on desktop
		while ! curl -f -O 'https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/OS%20X/shortcut.zip'
		do
			:
		done
		sudo -u $SUDO_USER ditto -x -k --sequesterRsrc --rsrc shortcut.zip '/Users/'"$SUDO_USER"'/Desktop'
		
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
