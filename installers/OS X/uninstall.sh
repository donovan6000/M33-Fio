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
	
	# Stop OctoPrint
	sudo -u $SUDO_USER launchctl unload /Library/LaunchAgents/com.octoprint.app.plist
	
	# Uninstall M3D Fio
	echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall OctoPrint-M3DFio
	
	# Uninstall OctoPrint
	echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall OctoPrint
	
	# Uninstall PyObjC QTKit framework
	echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall pyobjc-framework-QTKit
	
	# Uninstall PyObjC Quartz framework
	echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall pyobjc-framework-Quartz
	
	# Uninstall PyObjC Cocoa framework
	echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall pyobjc-framework-Cocoa
	
	# Uninstall PyObjC core
	echo 'y' | sudo -u $SUDO_USER /Library/Frameworks/Python.framework/Versions/2.7/bin/pip uninstall pyobjc-core
	
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
	echo 'OctoPrint and M3D Fio have been successfully uninstalled'
	echo
fi
