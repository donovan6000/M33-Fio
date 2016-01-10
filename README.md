# M3D Fio
OctoPrint plugin for the Micro 3D printer that provides a complete, platform independent alternative to the printer's official software .

© 2015-2016 Exploit Kings. All rights reserved.

You can install it with OctoPrint's built in plugin manager using the following URL as the plugins source.

```shell
https://github.com/donovan6000/M3D-Fio/archive/master.zip
```

M3D Fio works in conjunction with OctoPrint's autodetect serial port and baudrate feature, so neither of those values need to be specified in order to successfully connect to the Micro 3D printer.

Installers were made for Windows, OS X, and Linux to simplify installing OctoPrint, M3D Fio, and all their dependencies. If your using Windows, you can run [this file](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Windows/installer.zip) to install everything. If your using OS X, you can run [this file](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/OS%20X/installer.zip) to install everything. If your using Linux, you can run [this file](https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Linux/installer.zip) or run the following commands to install everything.

```shell
wget https://raw.githubusercontent.com/donovan6000/M3D-Fio/master/installers/Linux/installer.zip
unzip ./installer.zip
sudo sh ./installer.sh
```

M3D Fio expands the capabilities of OctoPrint to make it fully compatible with the Micro 3D printer. All of the printer's settings can be customized.
![alt text](https://raw.githubusercontent.com/donovan6000/M3D-Fio/images/settings.png "Settings")

Controls are added which allow calibrating the print bed, loading/unloading filament, updating the firmware, managing the EEPROM, etc.
![alt text](https://raw.githubusercontent.com/donovan6000/M3D-Fio/images/controls.png "Controls")

Any model sliced in OctoPrint can be modified before hand.
![alt text](https://raw.githubusercontent.com/donovan6000/M3D-Fio/images/model%20editor.png "Model Editor")

New instances of OctoPrint can be created to allow using multiple printers at once.
![alt text](https://raw.githubusercontent.com/donovan6000/M3D-Fio/images/multiple%20instances.png "Multiple Instances")
