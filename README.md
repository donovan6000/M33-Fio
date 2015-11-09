# M3D Fio
OctoPrint plugin for the Micro 3D printer
<br>
© 2015 Exploit Kings. All rights reserved.
<br>
<br>
You can install it with OctoPrint's built in plugin manager. The URL for that is '<a href="https://github.com/donovan6000/M3D-Fio/archive/master.zip">https://github.com/donovan6000/M3D-Fio/archive/master.zip</a>' or you can install it manually with the command 'pip install https://github.com/donovan6000/M3D-Fio/archive/master.zip'
<br>
<br>
<br>
If your using Windows and the printer isn't recognized in the device manager, then you'll need to install the drivers manually which are located in /drivers/Windows/.
<br>
<br>
If you are using Linux, the 90-m3d-local.rules needs to applied in order to avoid issues. You can apply it with the following commands:
<br>
wget -O /etc/udev/rules.d/90-m3d-local.rules https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/drivers/Linux/90-m3d-local.rules
<br>
sudo /etc/init.d/udev restart
