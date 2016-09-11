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
	wget -q --tries=1 --timeout=5 --spider http://google.com
	if [ $? -eq 0 ]; then
	
		# Move to temporary location
		cd $(dirname $(mktemp -u))
	
		# Set if using OctoPi
		if [ -f /etc/init.d/octoprint ]; then
			usingOctoPi=true
		else
			usingOctoPi=false
		fi
		
		# Check if not using OctoPi
		if ! $usingOctoPi
		then
		
			# Stop OctoPrint
			killall -w octoprint
		
			# Install OctoPrint and M33 Fio dependencies
			if [ -f /etc/debian_version ]; then
				while ! apt-get update
				do
					:
				done
				while ! apt-get -y install python python-pip python-dev libyaml-dev build-essential python-pygame libjpeg-dev zlib1g-dev git
				do
					:
				done
			elif [ -f /etc/fedora-release ]; then
				while ! dnf check-update
				do
					:
				done
				while ! dnf -y install python python-pip python-devel libyaml-devel make automake gcc gcc-c++ kernel-devel pygame libjpeg-turbo-devel zlib-devel git
				do
					:
				done
			fi
			
			while ! sudo -u $SUDO_USER pip install pip --user --upgrade
			do
				:
			done
			while ! sudo -u $SUDO_USER pip install regex --user --upgrade
			do
				:
			done
			while ! sudo -u $SUDO_USER pip install pillow --user --upgrade
			do
				:
			done
	
			# Install OctoPrint
			while ! sudo -u $SUDO_USER git clone https://github.com/foosel/OctoPrint.git
			do
				:
			done
			cd OctoPrint
			while ! sudo -u $SUDO_USER python setup.py install --user
			do
				:
			done
			cd ..
			sudo -u $SUDO_USER mkdir -p '/home/'"$SUDO_USER"'/.octoprint'
			rm -rf '/home/'"$SUDO_USER"'/.octoprint/checkout'
			sudo -u $SUDO_USER mv OctoPrint '/home/'"$SUDO_USER"'/.octoprint/checkout'
			
			# Install M33 Fio
			while echo 'y' | sudo -u $SUDO_USER pip uninstall OctoPrint-M3DFio
			do
				:
			done
			while echo 'y' | sudo -u $SUDO_USER pip uninstall OctoPrint-M33Fio
			do
				:
			done
			while ! wget https://github.com/donovan6000/M33-Fio/archive/master.zip -O master.zip
			do
				:
			done
			while ! sudo -u $SUDO_USER pip install master.zip --user
			do
				:
			done
			rm master.zip
		
		# Otherwise
		else
		
			# Install M33 Fio
			while echo 'y' | sudo -u pi /home/pi/oprint/bin/pip uninstall OctoPrint-M3DFio
			do
				:
			done
			while echo 'y' | sudo -u pi /home/pi/oprint/bin/pip uninstall OctoPrint-M33Fio
			do
				:
			done
			while ! wget https://github.com/donovan6000/M33-Fio/archive/master.zip -O master.zip
			do
				:
			done
			while ! sudo -u pi /home/pi/oprint/bin/pip install master.zip
			do
				:
			done
			rm master.zip
		fi
	
		# Apply printer udev rule
		while ! wget -O /etc/udev/rules.d/90-micro-3d-local.rules https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/Linux/90-micro-3d-local.rules
		do
			:
		done
		
		# Apply heatbed udev rule
		while ! wget -O /etc/udev/rules.d/91-micro-3d-heatbed-local.rules https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/Linux/91-micro-3d-heatbed-local.rules
		do
			:
		done
		
		# Reload udev rules
		udevadm control --reload-rules
		udevadm trigger
		
		# Check if not using OctoPi
		if ! $usingOctoPi
		then
		
			# Check if startup file doesn't exist
			if [ ! -f /etc/rc.local ]; then

				# Create startup file
				touch /etc/rc.local
				echo "#!/bin/sh -e" >> /etc/rc.local
				chmod +x /etc/rc.local
			fi

			# Check if startup file doesn't contain exit 0
			if ! grep -q "^exit 0$" /etc/rc.local; then

				# Append exit 0 to the end of startup file
				echo "exit 0" >> /etc/rc.local
			fi

			# Remove existing OctoPrint startup commands
			sed -i '/octoprint/d' /etc/rc.local

			# Add OctoPrint to list of startup commands
			sed -i -e 's|^exit 0$|sudo -u '"$SUDO_USER"' "/home/'"$SUDO_USER"'/.local/bin/octoprint"\n&|' /etc/rc.local
			
			# Create URL link on desktop
			while ! wget https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/Linux/octoprint.png -O octoprint.png
			do
				:
			done
			mv octoprint.png '/usr/share/icons'
			while ! sudo -u $SUDO_USER wget https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/Linux/OctoPrint.desktop -O OctoPrint.desktop
			do
				:
			done
			mv OctoPrint.desktop '/home/'"$SUDO_USER"'/Desktop'
			
			# Start OctoPrint
			rm -rf '/home/'"$SUDO_USER"'/.python-eggs'
			sudo -u $SUDO_USER nohup '/home/'"$SUDO_USER"'/.local/bin/octoprint' >/dev/null 2>&1 &
			
			# Display message
			echo 'OctoPrint and M33 Fio have been successfully installed. Go to http://localhost:5000 in any web browser to access OctoPrint.'
			echo
		
		# Otherwise
		else
		
			# Display message
			echo
			echo 'M33 Fio has been successfully installed.'
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
