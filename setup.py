# coding=utf-8

########################################################################################################################
### Do not forget to adjust the following variables to your own plugin.

# The plugin's identifier, has to be unique
plugin_identifier = "m33fio"

# The plugin's python package, should be "octoprint_<plugin identifier>", has to be unique
plugin_package = "octoprint_m33fio"

# The plugin's human readable name. Can be overwritten within OctoPrint's internal data via __plugin_name__ in the
# plugin module
plugin_name = "OctoPrint-M33Fio"

# The plugin's version. Can be overwritten within OctoPrint's internal data via __plugin_version__ in the plugin module
plugin_version = "1.15.2016121917"

# The plugin's description. Can be overwritten within OctoPrint's internal data via __plugin_description__ in the plugin
# module
plugin_description = """Allows viewing uploaded models, using a Micro 3D printer, modifying a slicer profile and model before slicing, uploading OBJs and other 3D file formats, hosting a webcam stream, and much more"""

# The plugin's author. Can be overwritten within OctoPrint's internal data via __plugin_author__ in the plugin module
plugin_author = "donovan6000"

# The plugin's author's mail address.
plugin_author_email = "donovan6000@exploitkings.com"

# The plugin's homepage URL. Can be overwritten within OctoPrint's internal data via __plugin_url__ in the plugin module
plugin_url = "https://github.com/donovan6000/M33-Fio"

# The plugin's license. Can be overwritten within OctoPrint's internal data via __plugin_license__ in the plugin module
plugin_license = "GPLv3"

# Any additional requirements besides OctoPrint should be listed here
plugin_requires = []

### --------------------------------------------------------------------------------------------------------------------
### More advanced options that you usually shouldn't have to touch follow after this point
### --------------------------------------------------------------------------------------------------------------------

# Additional package data to install for this plugin. The subfolders "templates", "static" and "translations" will
# already be installed automatically if they exist.
plugin_additional_data = []

# Any additional python packages you need to install with your plugin that are not contained in <plugin_package>.*
plugin_additional_packages = []

# Any python packages within <plugin_package>.* you do NOT want to install with your plugin
plugin_ignored_packages = []

# Additional parameters for the call to setuptools.setup. If your plugin wants to register additional entry points,
# define dependency links or other things like that, this is the place to go. Will be merged recursively with the
# default setup parameters as provided by octoprint_setuptools.create_plugin_setup_parameters using
# octoprint.util.dict_merge.
#
# Example:
#     plugin_requires = ["someDependency==dev"]
#     additional_setup_parameters = {"dependency_links": ["https://github.com/someUser/someRepo/archive/master.zip#egg=someDependency-dev"]}
additional_setup_parameters = {}

########################################################################################################################

from setuptools import setup
import os
import sys
import subprocess

try:
	import octoprint_setuptools
except:
	print("Could not import OctoPrint's setuptools, are you sure you are running that under "
	      "the same python installation that OctoPrint is installed under?")
	import sys
	sys.exit(-1)

setup_parameters = octoprint_setuptools.create_plugin_setup_parameters(
	identifier=plugin_identifier,
	package=plugin_package,
	name=plugin_name,
	version=plugin_version,
	description=plugin_description,
	author=plugin_author,
	mail=plugin_author_email,
	url=plugin_url,
	license=plugin_license,
	requires=plugin_requires,
	additional_packages=plugin_additional_packages,
	ignored_packages=plugin_ignored_packages,
	additional_data=plugin_additional_data
)

if len(additional_setup_parameters):
	from octoprint.util import dict_merge
	setup_parameters = dict_merge(setup_parameters, additional_setup_parameters)

def findPip() :

	# Created by Gina Häußge <osd@foosel.net>
	# Copyright (C) 2014 The OctoPrint Project - Released under terms of the AGPLv3 License
	python_command = sys.executable
	binary_dir = os.path.dirname(python_command)

	pip_command = os.path.join(binary_dir, "pip")
	if sys.platform == "win32":
		# Windows is a bit special... first of all the file will be called pip.exe, not just pip, and secondly
		# for a non-virtualenv install (e.g. global install) the pip binary will not be located in the
		# same folder as python.exe, but in a subfolder Scripts, e.g.
		#
		# C:\Python2.7\
		#  |- python.exe
		#  `- Scripts
		#      `- pip.exe

		# virtual env?
		pip_command = os.path.join(binary_dir, "pip.exe")

		if not os.path.isfile(pip_command):
			# nope, let's try the Scripts folder then
			scripts_dir = os.path.join(binary_dir, "Scripts")
			if os.path.isdir(scripts_dir):
				pip_command = os.path.join(scripts_dir, "pip.exe")

	if not os.path.isfile(pip_command) or not os.access(pip_command, os.X_OK):
		pip_command = None
	
	return pip_command

# Uninstall plugins that break M33 Fio if installing M33 Fio
pipCommand = findPip()
if pipCommand is not None and "install" in sys.argv :
	subprocess.call([pipCommand, "uninstall", "OctoPrint-M3DFio", "-y"])
	subprocess.call([pipCommand, "uninstall", "OctoPrint-Slicer", "-y"])

setup(**setup_parameters)
