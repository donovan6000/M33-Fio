# coding=utf-8
import setuptools
import os
import sys
import subprocess

########################################################################################################################

plugin_identifier = "m33fio"
plugin_package = "octoprint_%s" % plugin_identifier
plugin_name = "OctoPrint-M33Fio"
plugin_version = "1.8.2016101906"
plugin_description = "Makes OctoPrint fully compatible with the Micro 3D printer"
plugin_author = "donovan6000"
plugin_author_email = "donovan6000@exploitkings.com"
plugin_url = "https://github.com/donovan6000/M33-Fio"
plugin_license = "GPLv3"
plugin_additional_data = []

########################################################################################################################

def package_data_dirs(source, sub_folders):
	import os
	dirs = []

	for d in sub_folders:
		folder = os.path.join(source, d)
		if not os.path.exists(folder):
			continue

		for dirname, _, files in os.walk(folder):
			dirname = os.path.relpath(dirname, source)
			for f in files:
				dirs.append(os.path.join(dirname, f))

	return dirs

def params():

	# Our metadata, as defined above
	name = plugin_name
	version = plugin_version
	description = plugin_description
	author = plugin_author
	author_email = plugin_author_email
	url = plugin_url
	license = plugin_license

	# we only have our plugin package to install
	packages = [plugin_package]

	# we might have additional data files in sub folders that need to be installed too
	package_data = {plugin_package: package_data_dirs(plugin_package, ['static', 'templates', 'translations'] + plugin_additional_data)}
	include_package_data = True

	# If you have any package data that needs to be accessible on the file system, such as templates or static assets
	# this plugin is not zip_safe.
	zip_safe = False

	# Read the requirements from our requirements.txt file
	install_requires = open("requirements.txt").read().split("\n")
	
	# Hook the plugin into the "octoprint.plugin" entry point, mapping the plugin_identifier to the plugin_package.
	# That way OctoPrint will be able to find the plugin and load it.
	entry_points = {
		"octoprint.plugin": ["%s = %s" % (plugin_identifier, plugin_package)]
	}

	return locals()

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

# Uninstall M3D Fio
pipCommand = findPip()
if pipCommand is not None :
	subprocess.call([pipCommand, "uninstall", "OctoPrint-M3DFio", "-y"])

# Install package
setuptools.setup(**params())
