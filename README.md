# M3D Fio
OctoPrint plugin for the Micro 3D printer that provides a complete, platform independent alternative to the printer's official software.

© 2015-2016 Exploit Kings. All rights reserved.

M3D Fio can be installed with OctoPrint's built in plugin manager.
![alt text](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/images/install.png "Install")

It works in conjunction with OctoPrint's autodetect serial port and baudrate feature, so neither of those values need to be specified in order to successfully connect to the Micro 3D printer.

Installers were made for Windows, OS X, and Linux to simplify installing OctoPrint, M3D Fio, and all their dependencies like any device drivers. If your using Windows, you can run [this file](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Windows/install.zip) to install everything. If your using OS X, you can run [this file](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/OS%20X/install.zip) to install everything. If your using Linux, you can run [this file](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Linux/install.zip) or run the following commands to install everything.

```shell
wget https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Linux/install.zip
unzip install.zip -x uninstall.sh
sudo sh ./install.sh
```

M3D Fio expands the capabilities of OctoPrint to make it fully compatible with the Micro 3D printer. All of the printer's settings can be customized.
![alt text](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/images/settings.png "Settings")

Controls are added which allow calibrating the print bed, loading/unloading filament, updating the firmware, managing the EEPROM, etc.
![alt text](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/images/controls.png "Controls")

Slicing profiles can be customized before slicing a model.
![alt text](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/images/profile%20editor.png "Profile Editor")

Any model sliced in OctoPrint can be modified before hand.
![alt text](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/images/model%20editor.png "Model Editor")

New instances of OctoPrint can be created to allow using multiple printers at once.
![alt text](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/images/multiple%20instances.png "Multiple Instances")
