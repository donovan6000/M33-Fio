#!/bin/bash

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
	wget -q --tries=1 --timeout=5 --spider http://google.com
	if [ $? -eq 0 ]; then
	
		cd $TEMP
	
		# Set if using OctoPi
		if [ -f /etc/init.d/octoprint ]; then
			usingOctoPi=true
		else
			usingOctoPi=false
		fi
		
		# Check if not using OctoPi
		if ! $usingOctoPi
		then
		
			# Install OctoPrint dependencies
			apt-get -y install python python-pip
	
			# Install OctoPrint
			wget https://github.com/foosel/OctoPrint/archive/master.zip
			unzip master.zip
			cd OctoPrint-master
			python setup.py install
			cd ..
			rm -rf OctoPrint-master
			rm master.zip
		fi
	
		# Install M3D Fio
		echo 'y' | pip uninstall OctoPrint-M3DFio
		wget https://github.com/donovan6000/M3D-Fio/archive/master.zip
		while ! pip install master.zip
		do
			:
		done
		rm master.zip
	
		# Apply udev rule
		wget -O /etc/udev/rules.d/90-m3d-local.rules https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Linux/90-m3d-local.rules
		sudo /etc/init.d/udev restart
		
		# Check if not using OctoPi
		if ! $usingOctoPi
		then
	
			# Add OctoPrint to list of startup commands if not already there
			if ! grep ' octoprint$' /etc/rc.local
			then
				sed -i -e '$i \su '"$SUDO_USER"' -c octoprint\n' /etc/rc.local
			fi
			
			# Create URL link on desktop
			wget https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Linux/OctoPrint.desktop
			mv OctoPrint.desktop '/home/'"$SUDO_USER"'/Desktop'
			
			# Start OctoPrint
			su $SUDO_USER -c 'nohup octoprint >/dev/null 2>&1 &'
			
			# Display message
			echo 'OctoPrint and M3D Fio have been successfully installed. Go to http://localhost:5000 in any web browser to access OctoPrint.'
			echo
		
		else
		
			# Display message
			echo
			echo 'M3D Fio have been successfully installed.'
			echo
		fi
	
	# Otherwise
	else
	
		# Display message
		echo
		echo 'An internet connection is required.'
		echo
	fi
fi
