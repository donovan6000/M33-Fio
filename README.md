# M3D Fio
© 2015 Exploit Kings. All rights reserved.

An OctoPrint plugin for the Micro 3D printer
<br>
<br>
You can install it with OctoPrint's built in plugin manager. The URL for that is <a href="https://github.com/donovan6000/M3D-Fio/archive/master.zip"https://github.com/donovan6000/M3D-Fio/archive/master.zip</a> or you can install it manually with the command:
<br>
pip install 'https://github.com/donovan6000/M3D-Fio/archive/master.zip'
<br>
<br>
<br>
The 90-m3d-local.rules needs to applied in order to avoid issues. You can apply it like this:
<br>
mv ./90-m3d-local.rules /etc/udev/rules.d/
<br>
sudo /etc/init.d/udev restart
