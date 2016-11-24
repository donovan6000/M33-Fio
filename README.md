# M33 Fio
© 2015-2016 Exploit Kings. All rights reserved.

### Description
M33 Fio is a general purpose plugin for [OctoPrint](http://octoprint.org/) that extends its capabilities to include many useful feature like the ability to use a Micro 3D printer, modify a model before printing it, host a webcam stream, and much more.

The latest version of M33 Fio is V1.12 released on November Xth, 2016, and an entire changelog for it can be found [here](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/Changelog).

### Features
* Adds a model viewer tab to OctoPrint's interface where any uploaded model can be viewed
* Allows importing OBJ, M3D, AMF, VRML, COLLADA, and 3MF files into OctoPrint
* Updates OctoPrint's list of available serial ports in real time
* Includes an OctoPrint instance manager that can create and terminate OctoPrint instances which allows easily running multiple printers on the same host
* Adds support for the [Micro 3D printer](https://www.kickstarter.com/projects/m3d/the-micro-the-first-truly-consumer-3d-printer)
* Wraps groups of buttons in OctoPrint's controls tab into sections that can be collapsed and expanded
* Capable of hosting a webcam stream and configuring OctoPrint to use it
* Disables the hosts sleep functionality when printing
* Includes a slicer profile editor that allows customizing everything in the selected slicer profile before slicing
* Includes a model editor that allows modifying a model before slicing and can perform operations like moving, rotating, scaling, cutting, merging, clonging, and importing other models into the scene

### Installation
There's installers available for [Windows](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/Windows/install.zip), [OS X](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/OS%20X/install.zip), and [Linux](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/installers/Linux/install.zip) that install OctoPrint, M33 Fio, and device drivers for the Micro 3D printer and [Micro 3D compatible heatbed](https://www.kickstarter.com/projects/1668748285/the-micro-m3d-compatible-heated-print-bed). These installers all add OctoPrint as a startup program and create a shortcut on the desktop that allows accessing OctoPrint's user interface.

If you already have OctoPrint installed, M33 Fio can be installed directly from OctoPrint's builtin plugin manager by searching for it in the plugin repository.

### Usage
By default M33 Fio is setup to make OctoPrint fully compatible with the Micro 3D printer. If you are not using a Micro 3D printer, then make sure to enable the Settings > M33 Fio > 'Not using a Micro 3D printer' setting to disable all of M33 Fio's features that are Micro 3D printer specific.

### Known Issues
* Everything works in all versions of OctoPrint >= 1.2.0 except the Micro 3D printer connection routine which only works with versions of OctoPrint >= 1.2.5
* Microsoft Internet Explorer 11 doesn't display webcam stream since it doesn't natively support MJPEG videos
* Microsoft Internet Explorer 11 doesn't resize the slicer profile editor correctly
* Microsoft Internet Explorer 11 doesn't insert a tab character when typing the tab key in the advanced section of the slicer profile editor since it doesn't support using the document.execCommand function with the "insertText" parameter
* Microsoft Edge displays webcam stream as a still image
* Can't host more than one webcam stream at a time since it always hosts on port 4999

### Translating
If your interested in translating M33 Fio into a different language, you just need to create a [gettext PO file](https://en.wikipedia.org/wiki/Gettext) for your target language, translate all the text in that file, and bundle that file into M33 Fio. Creating an up-to-date PO file for a specific language can be done with the following commands. A list of language codes can be found [here](http://www.lingoes.net/en/translator/langcode.htm).
```
python setup.py babel_refresh
python setup.py babel_new --locale=<language code>
```
That will generate a PO file at `translations/<language code>/LC_MESSAGES/messages.po`. Once that PO file is fully translated into your target language it can be compiled and bundled into the plugin by running the following commands.
```
python setup.py babel_compile
python setup.py babel_bundle --locale=<language code>
```
Stick to the following guidelines when translating text.
* All text is HTML, so make sure you convert `&`, `<`, and `>` to `&amp;`, `&lt;`, and `&gt;` respectively when they are used as character literals. Do not encode any other characters as HTML entities, and you shouldn't have to use any other HTML entities since the text uses UTF-8 encoding.
* Keep whitespace, like newlines and tabs, formatted the same as they are in the source
* Keep HTML tags, like `<b>…</b>`, the same as they are in the source
* Keep placeholders, like `%(…)d` and `%(…)s` intact, but make sure to move them where they belong to in your target language
* OctoPrint uses the informal version of languages, so try to follow that trend

### Images
The slicer profile editor lets you quickly specify the quality and fill options of a print while still giving you the ability to fine tune every available setting.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/profile%20editor.png "Profile Editor")
The model editor allows manipulating a model before it's sliced. It can perform all the standard operations like moving, rotating, and scaling.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/model%20editor.png "Model Editor")
When using a Micro 3D printer, the model editor will change to visualize the printer's dimensions and boundaries.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/micro%203d.png "Model Editor")
It's easy to print more than one model at a time thanks to the model editor's cloning and importing features.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/clone.png "Clone And Import Models")
It's even possible to cut and merge models to allow printing files that couldn't normally be printed.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/cut.png "Cut And Merge Models")
The model viewer allows easily seeing how any uploaded model looks.
![alt text](https://raw.githubusercontent.com/donovan6000/M33-Fio/master/images/model%20viewer.png "Model Viewer")
### Troubleshooting
Q. Can I use this plugin if I don't have a Micro 3D printer?

A. Yes, you don't need a Micro 3D printer to use this plugin. Just enable the Settings > M33 Fio > 'Not using a Micro 3D printer' setting to disable all this plugin's Micro 3D specific functionality. All of M33 Fio's printer independent features are still usable when this option is enabled, so you'll be able to use the slicer profile editor, model editor, OctoPrint instance manager, expanded 3D file format support, webcam support, etc.
___
Q. I can't connect to my Micro 3D printer. I receive an error similar to, "Unexpected error while connecting to serial port: AUTO SerialException: 'could not open port 'COM13': WindowsError(5, 'Access is denied.')'" every time I try to connect."

A. Close M3D's official software if it's open, and make sure no other programs are currently using the printer. If the problem persists, then restart your computer.
___
Q. I receive a message similar to, "It's recommended that you disable this server's sleep functionality while printing if it's not already disabled." What does this mean?

A. M33 Fio attempts to prevent the server that it's running on from suspending/sleeping while printing, and that message gets displayed if it is unable to do so. Don't be too alarmed by this message since it doesn't mean that the server will go to sleep. It just means that M33 Fio can't prevent it from going to sleep.
