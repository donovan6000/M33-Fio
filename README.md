# M33 Fio
OctoPrint plugin that provides the world's first platform independent software solution for the Micro 3D printer.

© 2015-2016 Exploit Kings. All rights reserved.

### Description
M33 Fio is a plugin for [OctoPrint](http://octoprint.org/) that extends its capabilities to make it fully compatible with the Micro 3D printer. Both OctoPrint and M33 Fio can run on Windows, OS X, and Linux, so this solution is the first platform independent option available for this printer.

The latest version of M33 Fio is V1.9 released on October Xth, 2016, and an entire changelog for it can be found [here](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/Changelog).

### Features
* Platform independent
* Open source (M33 Fio's source code can be found [here](https://github.com/donovan6000/M33-Fio))
* Supports STL, OBJ, M3D, AMF, VRML, COLLADA, and 3MF file formats
* Allows printing multiple objects together
* Displays an accurate representation of the printable region
* Objects can be manipulated, cloned, cut, and merged
* Displays an objects dimensions
* Multiple printer support
* Fully customizable slicing profiles
* Accurate bed calibration
* Supports the [Micro 3D compatible heatbed](https://www.kickstarter.com/projects/1668748285/the-micro-m3d-compatible-heated-print-bed)
* Firmware updating system that allows installing official and third party firmwares
* EEPROM management
* Webcam streaming
* Changing filament in the middle of a print
* Compatible with the Micro 3D open source firmware [iMe](https://github.com/donovan6000/iMe)

### Installation
There's installers available for [Windows](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/Windows/install.zip), [OS X](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/OS%20X/install.zip), and [Linux](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/Linux/install.zip) that install OctoPrint, M33 Fio, and device drivers for the printer and heatbed. These installers all add OctoPrint as a startup program and create a shortcut on the desktop that allows accessing OctoPrint's user interface.

If you already have OctoPrint installed, M33 Fio can be installed directly from OctoPrint's builtin plugin manager by searching for it in the plugin repository.

### Usage
After installing OctoPrint and M33 Fio, you can immediately connect to a printer and start printing. M33 Fio works in conjunction with OctoPrint's auto-detect serial port and baud rate features, so neither of those values need to be specified in order to successfully connect to the printer. After connecting to a printer, all of that printer's existing settings, like backlash and bed calibration values, will be read in and used by M33 Fio to make transitioning over from M3D's official software as simple as possible.

OctoPrint uses external slicers to convert 3D object files into printable G-code, and, if you currently have M3D's official software installed, M33 Fio will automatically configure OctoPrint to use the Cura Engine slicer that comes with it. However I recommend installing the latest [Cura V15.04](https://ultimaker.com/en/products/cura-software/list) release so that you can enjoy all the latest improvements to the Cura Engine slicer. After a slicer is installed, printing a model is as simple as dragging and dropping a file onto OctoPrint's user interface.

OctoPrint is a web server, and it can allow remotely connecting to it. So you can open port 5000 in your computer's firewall and configure your router to route all traffic on that port to your computer to allow using your printer from anywhere in the world.

### Images
Additional controls are added to OctoPrint's control panel that allow doing everything from loading filament to updating the firmware.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/controls.png "Controls")
M33 Fio allows changing all of the printer's settings in the M33 Fio tab located in OctoPrint's settings.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/settings.png "Settings")
The slicer profile editor lets you quickly specify the quality and fill options of a print while still giving you the ability to fine tune every available setting.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/profile%20editor.png "Profile Editor")
The model editor allows manipulating the model before it's sliced. It can perform all the standard operations like translating, rotating, and scaling models.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/model%20editor.png "Model Editor")
It can also clone and import other models to allow printing more than one model at a time.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/clone.png "Clone And Import Models")
It can even cut and merge models to make even large models printable.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/cut.png "Cut And Merge Models")
### Troubleshooting
Q. I can't connect to the printer. I receive an error similar to, "Unexpected error while connecting to serial port: AUTO SerialException: 'could not open port 'COM13': WindowsError(5, 'Access is denied.')'" every time I try to connect."

A. Close M3D's official software if it's open, and make sure no other programs are currently using the printer. If the problem persists, then restart your computer.
___
Q. I receive a message similar to, "It's recommended that you disable this server's sleep functionality while printing if it's not already disabled." What does this mean?

A. M33 Fio attempts to prevent the server that it's running on from suspending/sleeping while printing, and that message gets displayed if it is unable to do so. Don't be too alarmed by this message since it doesn't mean that the server will go to sleep. It just means that M33 Fio can't prevent it from going to sleep.
___
Q. I installed Cura, but the slice button next to the uploaded files is still grayed out.

A. If M33 Fio detects that Cura is installed, it'll automatically configure OctoPrint to use it. However OctoPrint isn't aware of that configuration change immediately so you'll need to refresh your web browser several times for it to take affect.
___
Q. How do I re-open the print session if I closed the web browser?

A. Just go to the same URL that you were at before and it'll re-open the same session. You might have to refresh your web browser several times if it doesn't successfully restore the session.
___
Q. Even though I have the heatbed plugged in, I get an error similar to, "Warn: Not sending "M190 S100", printer profile has no heated bed" when I try to use it.

A. M33 Fio dynamically changes the printer profile whenever the heatbed is plugged in, however OctoPrint will sometimes not immediately become aware of that profile changed. So either refresh your web browser a couple of times or unplug and re-plugin the heatbed.
___
Q. OctoPrint's terminal shows an error about how it couldn't determine the printer's baud rate when trying to connect to the printer.

A. Something caused M33 Fio to crash, so you'll need to restart it. This can be accomplished by restarting OctoPrint, which can be done by restarting your computer.
___
Q. Can I use this plugin if I don't have a Micro 3D printer?

A. Enable M33 Fio's "Not using a Micro 3D printer" setting in OctoPrint's settings to disable all this plugin's Micro 3D specific functionality. All of M33 Fio's printer independent features are still usable when this option is enabled, so you'll be able to use the slicer profile editor, model editor, OctoPrint instance manager, expanded 3D file format support, webcam support, etc.
