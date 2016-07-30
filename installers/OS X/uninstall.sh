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
	
	# Stop OctoPrint
	sudo -u $SUDO_USER launchctl unload /Library/LaunchAgents/com.octoprint.app.plist
	
	# Uninstall M33 Fio
	while echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall OctoPrint-M3DFio
	do
		:
	done
	while echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall OctoPrint-M33Fio
	do
		:
	done
	
	# Uninstall OctoPrint
	while echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall OctoPrint
	do
		:
	done
	rm -rf '/Users/'"$SUDO_USER"'/Library/Application Support/OctoPrint'
	
	# Uninstall PyObjC QTKit framework
	while echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall pyobjc-framework-QTKit
	do
		:
	done
	
	# Uninstall PyObjC Quartz framework
	while echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall pyobjc-framework-Quartz
	do
		:
	done
	
	# Uninstall PyObjC Cocoa framework
	while echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall pyobjc-framework-Cocoa
	do
		:
	done
	
	# Uninstall PyObjC core
	while echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall pyobjc-core
	do
		:
	done
	
	# TODO Uninstall Git
	
	# TODO Uninstall command line tools
	
	# Uninstall Python
	rm -rf /Library/Frameworks/Python.framework/Versions/2.7
	rm -rf '/Applications/Python 2.7'
	cd /usr/local/bin/
	ls -l /usr/local/bin | grep '../Library/Frameworks/Python.framework/Versions/2.7/' | awk '{print $9}' | tr -d @ | xargs rm
	pkgutil --forget org.python.Python.PythonApplications-2.7
	pkgutil --forget org.python.Python.PythonDocumentation-2.7
	pkgutil --forget org.python.Python.PythonFramework-2.7
	pkgutil --forget org.python.Python.PythonUnixTools-2.7
	
	# Uninstall heatbed drivers
	kextunload /Library/Extensions/usbserial.kext
	rm -rf /Library/Extensions/usbserial.kext
	pkgutil --forget com.wch.usbserial.pkg
	
	# Remove OctoPrint from startup programs
	rm '/Library/LaunchAgents/com.octoprint.app.plist'
	
	# Remove URL link on desktop
	rm '/Users/'"$SUDO_USER"'/Desktop/OctoPrint.webloc'
	
	# Display message
	echo
	echo 'OctoPrint and M33 Fio have been successfully uninstalled'
	echo
fi
