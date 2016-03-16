# coding=utf-8
from __future__ import absolute_import


# Plugin details
__author__ = "donovan6000 <donovan6000@exploitkings.com>"
__license__ = "GNU General Public License http://www.gnu.org/licenses/gpl.txt"
__copyright__ = "Copyright (C) 2015-2016 Exploit Kings. All rights reserved."


# Imports
import octoprint
import octoprint.plugin
import octoprint.events
import octoprint.filemanager
import octoprint.printer
import octoprint.settings
import tempfile
import os
import time
import datetime
import struct
import shutil
import sys
import math
import copy
import flask
import serial
import serial.tools.list_ports
import binascii
import re
import collections
import json
import imp
import glob
import ctypes
import platform
import subprocess
import psutil
import socket
import threading
import BaseHTTPServer
import SocketServer
import yaml
import zipfile
from .gcode import Gcode
from .vector import Vector

# Check if using Windows or Linux
if platform.uname()[0].startswith("Windows") or platform.uname()[0].startswith("Linux") :

	# Import webcam libraries
	try :
		import StringIO
		from PIL import Image
		import pygame.camera
	
	except ImportError :
		pass
	
	# Check if using Linux
	if platform.uname()[0].startswith("Linux") :

		# Import DBus
		try :
			import dbus
	
		except ImportError :
			pass

# Otherwise check if using OS X
elif platform.uname()[0].startswith("Darwin") :

	# Import OS X frameworks
	try :
		import CoreFoundation
		import objc
		from AppKit import *
		from PyObjCTools import AppHelper
		from Quartz import *
		import QTKit
	
	except ImportError :
		pass
		

# Command class
class Command(object) :

	# Constructor
	def __init__(self, line, origin, skip) :
	
		# Set values
		self.line = line
		self.origin = origin
		self.skip = skip

# Plugin class
class M3DFioPlugin(
		octoprint.plugin.StartupPlugin,
		octoprint.plugin.ShutdownPlugin,
		octoprint.plugin.EventHandlerPlugin,
		octoprint.plugin.TemplatePlugin,
		octoprint.plugin.SettingsPlugin,
		octoprint.plugin.SimpleApiPlugin,
		octoprint.plugin.AssetPlugin,
		octoprint.printer.PrinterCallback,
		octoprint.plugin.BlueprintPlugin
	) :

	# Constructor
	def __init__(self) :

		# Initialize data members
		self.originalWrite = None
		self.originalRead = None
		self.invalidPrinter = True
		self.waitingUntilCommandsSent = False
		self.processingSlice = False
		self.heatbedConnection = None
		self.heatbedConnected = False
		self.showHeatbedTemperature = False
		self.settingHeatbedTemperature = False
		self.eeprom = None
		self.messageResponse = None
		self.invalidBedCenter = False
		self.invalidBedOrientation = False
		self.slicerChanges = None
		self.sharedLibrary = None
		self.lastCommandSent = None
		self.lastResponseWasWait = False
		self.allSerialPorts = []
		self.currentSerialPort = None
		self.providedFirmwares = {}
		self.printerColor = "Black"
		self.camera = None
		self.lastLineNumberSent = None
		self.fileLock = threading.Lock()
		
		# Rom decryption and encryption tables
		self.romDecryptionTable = [0x26, 0xE2, 0x63, 0xAC, 0x27, 0xDE, 0x0D, 0x94, 0x79, 0xAB, 0x29, 0x87, 0x14, 0x95, 0x1F, 0xAE, 0x5F, 0xED, 0x47, 0xCE, 0x60, 0xBC, 0x11, 0xC3, 0x42, 0xE3, 0x03, 0x8E, 0x6D, 0x9D, 0x6E, 0xF2, 0x4D, 0x84, 0x25, 0xFF, 0x40, 0xC0, 0x44, 0xFD, 0x0F, 0x9B, 0x67, 0x90, 0x16, 0xB4, 0x07, 0x80, 0x39, 0xFB, 0x1D, 0xF9, 0x5A, 0xCA, 0x57, 0xA9, 0x5E, 0xEF, 0x6B, 0xB6, 0x2F, 0x83, 0x65, 0x8A, 0x13, 0xF5, 0x3C, 0xDC, 0x37, 0xD3, 0x0A, 0xF4, 0x77, 0xF3, 0x20, 0xE8, 0x73, 0xDB, 0x7B, 0xBB, 0x0B, 0xFA, 0x64, 0x8F, 0x08, 0xA3, 0x7D, 0xEB, 0x5C, 0x9C, 0x3E, 0x8C, 0x30, 0xB0, 0x7F, 0xBE, 0x2A, 0xD0, 0x68, 0xA2, 0x22, 0xF7, 0x1C, 0xC2, 0x17, 0xCD, 0x78, 0xC7, 0x21, 0x9E, 0x70, 0x99, 0x1A, 0xF8, 0x58, 0xEA, 0x36, 0xB1, 0x69, 0xC9, 0x04, 0xEE, 0x3B, 0xD6, 0x34, 0xFE, 0x55, 0xE7, 0x1B, 0xA6, 0x4A, 0x9A, 0x54, 0xE6, 0x51, 0xA0, 0x4E, 0xCF, 0x32, 0x88, 0x48, 0xA4, 0x33, 0xA5, 0x5B, 0xB9, 0x62, 0xD4, 0x6F, 0x98, 0x6C, 0xE1, 0x53, 0xCB, 0x46, 0xDD, 0x01, 0xE5, 0x7A, 0x86, 0x75, 0xDF, 0x31, 0xD2, 0x02, 0x97, 0x66, 0xE4, 0x38, 0xEC, 0x12, 0xB7, 0x00, 0x93, 0x15, 0x8B, 0x6A, 0xC5, 0x71, 0x92, 0x45, 0xA1, 0x59, 0xF0, 0x06, 0xA8, 0x5D, 0x82, 0x2C, 0xC4, 0x43, 0xCC, 0x2D, 0xD5, 0x35, 0xD7, 0x3D, 0xB2, 0x74, 0xB3, 0x09, 0xC6, 0x7C, 0xBF, 0x2E, 0xB8, 0x28, 0x9F, 0x41, 0xBA, 0x10, 0xAF, 0x0C, 0xFC, 0x23, 0xD9, 0x49, 0xF6, 0x7E, 0x8D, 0x18, 0x96, 0x56, 0xD1, 0x2B, 0xAD, 0x4B, 0xC1, 0x4F, 0xC8, 0x3A, 0xF1, 0x1E, 0xBD, 0x4C, 0xDA, 0x50, 0xA7, 0x52, 0xE9, 0x76, 0xD8, 0x19, 0x91, 0x72, 0x85, 0x3F, 0x81, 0x61, 0xAA, 0x05, 0x89, 0x0E, 0xB5, 0x24, 0xE0]

		self.romEncryptionTable = [0xAC, 0x9C, 0xA4, 0x1A, 0x78, 0xFA, 0xB8, 0x2E, 0x54, 0xC8, 0x46, 0x50, 0xD4, 0x06, 0xFC, 0x28, 0xD2, 0x16, 0xAA, 0x40, 0x0C, 0xAE, 0x2C, 0x68, 0xDC, 0xF2, 0x70, 0x80, 0x66, 0x32, 0xE8, 0x0E, 0x4A, 0x6C, 0x64, 0xD6, 0xFE, 0x22, 0x00, 0x04, 0xCE, 0x0A, 0x60, 0xE0, 0xBC, 0xC0, 0xCC, 0x3C, 0x5C, 0xA2, 0x8A, 0x8E, 0x7C, 0xC2, 0x74, 0x44, 0xA8, 0x30, 0xE6, 0x7A, 0x42, 0xC4, 0x5A, 0xF6, 0x24, 0xD0, 0x18, 0xBE, 0x26, 0xB4, 0x9A, 0x12, 0x8C, 0xD8, 0x82, 0xE2, 0xEA, 0x20, 0x88, 0xE4, 0xEC, 0x86, 0xEE, 0x98, 0x84, 0x7E, 0xDE, 0x36, 0x72, 0xB6, 0x34, 0x90, 0x58, 0xBA, 0x38, 0x10, 0x14, 0xF8, 0x92, 0x02, 0x52, 0x3E, 0xA6, 0x2A, 0x62, 0x76, 0xB0, 0x3A, 0x96, 0x1C, 0x1E, 0x94, 0x6E, 0xB2, 0xF4, 0x4C, 0xC6, 0xA0, 0xF0, 0x48, 0x6A, 0x08, 0x9E, 0x4E, 0xCA, 0x56, 0xDA, 0x5E, 0x2F, 0xF7, 0xBB, 0x3D, 0x21, 0xF5, 0x9F, 0x0B, 0x8B, 0xFB, 0x3F, 0xAF, 0x5B, 0xDB, 0x1B, 0x53, 0x2B, 0xF3, 0xB3, 0xAD, 0x07, 0x0D, 0xDD, 0xA5, 0x95, 0x6F, 0x83, 0x29, 0x59, 0x1D, 0x6D, 0xCF, 0x87, 0xB5, 0x63, 0x55, 0x8D, 0x8F, 0x81, 0xED, 0xB9, 0x37, 0xF9, 0x09, 0x03, 0xE1, 0x0F, 0xD3, 0x5D, 0x75, 0xC5, 0xC7, 0x2D, 0xFD, 0x3B, 0xAB, 0xCD, 0x91, 0xD1, 0x4F, 0x15, 0xE9, 0x5F, 0xCB, 0x25, 0xE3, 0x67, 0x17, 0xBD, 0xB1, 0xC9, 0x6B, 0xE5, 0x77, 0x35, 0x99, 0xBF, 0x69, 0x13, 0x89, 0x61, 0xDF, 0xA3, 0x45, 0x93, 0xC1, 0x7B, 0xC3, 0xF1, 0xD7, 0xEB, 0x4D, 0x43, 0x9B, 0x05, 0xA1, 0xFF, 0x97, 0x01, 0x19, 0xA7, 0x9D, 0x85, 0x7F, 0x4B, 0xEF, 0x73, 0x57, 0xA9, 0x11, 0x79, 0x39, 0xB7, 0xE7, 0x1F, 0x49, 0x47, 0x41, 0xD9, 0x65, 0x71, 0x33, 0x51, 0x31, 0xD5, 0x27, 0x7D, 0x23]
		
		# EEPROM offsets
		self.eepromOffsets = dict(
			firmwareVersion = dict(
				offset = 0x00,
				bytes = 4
			),
			firmwareCrc = dict(
				offset = 0x04,
				bytes = 4
			),
			lastRecordedZValue = dict(
				offset = 0x08,
				bytes = 4
			),
			backlashX = dict(
				offset = 0x0C,
				bytes = 4
			),
			backlashY = dict(
				offset = 0x10,
				bytes = 4
			),
			bedOrientationBackRight = dict(
				offset = 0x14,
				bytes = 4
			),
			bedOrientationBackLeft = dict(
				offset = 0x18,
				bytes = 4
			),
			bedOrientationFrontLeft = dict(
				offset = 0x1C,
				bytes = 4
			),
			bedOrientationFrontRight = dict(
				offset = 0x20,
				bytes = 4
			),
			filamentColor = dict(
				offset = 0x24,
				bytes = 4
			),
			filamentTypeAndLocation = dict(
				offset = 0x28,
				bytes = 1
			),
			filamentTemperature = dict(
				offset = 0x29,
				bytes = 1
			),
			filamentAmount = dict(
				offset = 0x2A,
				bytes = 4
			),
			backlashExpansionXPlus = dict(
				offset = 0x2E,
				bytes = 4
			),
			backlashExpansionYLPlus = dict(
				offset = 0x32,
				bytes = 4
			),
			backlashExpansionYRPlus = dict(
				offset = 0x36,
				bytes = 4
			),
			backlashExpansionYRMinus = dict(
				offset = 0x3A,
				bytes = 4
			),
			backlashExpansionZ = dict(
				offset = 0x3E,
				bytes = 4
			),
			backlashExpansionE = dict(
				offset = 0x42,
				bytes = 4
			),
			bedOffsetBackLeft = dict(
				offset = 0x46,
				bytes = 4
			),
			bedOffsetBackRight = dict(
				offset = 0x4A,
				bytes = 4
			),
			bedOffsetFrontRight = dict(
				offset = 0x4E,
				bytes = 4
			),
			bedOffsetFrontLeft = dict(
				offset = 0x52,
				bytes = 4
			),
			bedHeightOffset = dict(
				offset = 0x56,
				bytes = 4
			),
			reserved = dict(
				offset = 0x5A,
				bytes = 4
			),
			backlashSpeed = dict(
				offset = 0x5E,
				bytes = 4
			),
			bedOrientationVersion = dict(
				offset = 0x62,
				bytes = 1
			),
			speedLimitX = dict(
				offset = 0x66,
				bytes = 4
			),
			speedLimitY = dict(
				offset = 0x6A,
				bytes = 4
			),
			speedLimitZ = dict(
				offset = 0x6E,
				bytes = 4
			),
			speedLimitEPositive = dict(
				offset = 0x72,
				bytes = 4
			),
			speedLimitENegative = dict(
				offset = 0x76,
				bytes = 4
			),
			bedOrientationFirstSample = dict(
				offset = 0x106,
				bytes = 4
			),
			fanType = dict(
				offset = 0x2AB,
				bytes = 1
			),
			fanOffset = dict(
				offset = 0x2AC,
				bytes = 1
			),
			fanScale = dict(
				offset = 0x2AD,
				bytes = 4
			),
			heaterCalibrationMode = dict(
				offset = 0x2B1,
				bytes = 1
			),
			xMotorCurrent = dict(
				offset = 0x2B2,
				bytes = 2
			),
			yMotorCurrent = dict(
				offset = 0x2B4,
				bytes = 2
			),
			zMotorCurrent = dict(
				offset = 0x2B6,
				bytes = 2
			),
			hardwareStatus = dict(
				offset = 0x2B8,
				bytes = 2
			),
			heaterTemperatureMeasurementB = dict(
				offset = 0x2BA,
				bytes = 4
			),
			hoursCounter = dict(
				offset = 0x2C0,
				bytes = 4
			),
			xAxisStepsPerMm = dict(
				offset = 0x2D6,
				bytes = 4
			),
			yAxisStepsPerMm = dict(
				offset = 0x2DA,
				bytes = 4
			),
			zAxisStepsPerMm = dict(
				offset = 0x2DE,
				bytes = 4
			),
			eAxisStepsPerMm = dict(
				offset = 0x2E2,
				bytes = 4
			),
			savedZState = dict(
				offset = 0x2E6,
				bytes = 2
			),
			extruderCurrent = dict(
				offset = 0x2E8,
				bytes = 2
			),
			heaterResistanceM = dict(
				offset = 0x2EA,
				bytes = 4
			),
			serialNumber = dict(
				offset = 0x2EF,
				bytes = 17
			)
		)
		
		# Bed dimensions
		self.bedLowMaxX = 106.0
		self.bedLowMinX = -2.0
		self.bedLowMaxY = 105.0
		self.bedLowMinY = -2.0
		self.bedLowMaxZ = 5.0
		self.bedLowMinZ = 0.0
		self.bedMediumMaxX = 106.0
		self.bedMediumMinX = -2.0
		self.bedMediumMaxY = 105.0
		self.bedMediumMinY = -9.0
		self.bedMediumMaxZ = 73.5
		self.bedMediumMinZ = self.bedLowMaxZ
		self.bedHighMaxX = 97.0
		self.bedHighMinX = 7.0
		self.bedHighMaxY = 85.0
		self.bedHighMinY = 9.0
		self.bedHighMaxZ = 112.0
		self.bedHighMinZ = self.bedMediumMaxZ
		self.bedWidth = 121.0
		self.bedDepth = 121.0
		self.bedCenterOffsetX = 8.5
		self.bedCenterOffsetY = 2.0
		
		# Chip details
		self.chipName = "ATxmega32C4"
		self.chipPageSize = 0x80
		self.chipNrwwSize = 0x20
		self.chipNumberOfPages = 0x80
		self.chipTotalMemory = self.chipNumberOfPages * self.chipPageSize * 2
		
		# Wave bonding pre-processor settings
		self.wavePeriod = 5.0
		self.wavePeriodQuarter = self.wavePeriod / 4.0
		self.waveSize = 0.15
		
		# Bed compensation pre-processor settings
		self.segmentLength = 2.0
		
		# Reset print and pre-processor settings
		self.resetPreprocessorSettings()
	
	# Reset print settings
	def resetPrintSettings(self) :
	
		# General settings
		self.printingTestBorder = False
		self.printingBacklashCalibrationCylinder = False
		self.sentCommands = {}
		self.resetLineNumberCommandSent = False
		self.numberWrapCounter = 0
	
	# Reset pre-processor settings
	def resetPreprocessorSettings(self) :
	
		# General settings
		self.preprocessOnTheFlyReady = False
		self.currentE = 0
		self.currentZ = 0
		self.relativeMode = False
		self.printedLayers = []
		self.onNewPrintedLayer = False
		
		# Print settings
		self.resetPrintSettings()
		
		# Mid-print filament change pre-processor settings
		self.midPrintFilamentChangeLayerCounter = 0
		self.midPrintFilamentChangeLayers = []
		
		# Center model pre-processor settings
		self.displacementX = 0
		self.displacementY = 0
	
		# Preparation pre-processor settings
		self.addedIntro = False
		self.addedOutro = False
		self.preparationLayerCounter = 0

		# Wave bonding pre-processor settings
		self.waveStep = 0
		self.waveBondingRelativeMode = False
		self.waveBondingLayerCounter = 0
		self.waveBondingChangesPlane = False
		self.waveBondingCornerCounter = 0
		self.waveBondingPositionRelativeX = 0
		self.waveBondingPositionRelativeY = 0
		self.waveBondingPositionRelativeZ = 0
		self.waveBondingPositionRelativeE = 0
		self.waveBondingPreviousGcode = Gcode()
		self.waveBondingRefrenceGcode = Gcode()
		self.waveBondingTackPoint = Gcode()
		self.waveBondingExtraGcode = Gcode()

		# Thermal bonding pre-processor settings
		self.thermalBondingRelativeMode = False
		self.thermalBondingLayerCounter = 0
		self.thermalBondingCornerCounter = 0
		self.thermalBondingPreviousGcode = Gcode()
		self.thermalBondingRefrenceGcode = Gcode()
		self.thermalBondingTackPoint = Gcode()

		# Bed compensation pre-processor settings
		self.bedCompensationRelativeMode = False
		self.bedCompensationChangesPlane = False
		self.bedCompensationPositionAbsoluteX = 0
		self.bedCompensationPositionAbsoluteY = 0
		self.bedCompensationPositionRelativeX = 0
		self.bedCompensationPositionRelativeY = 0
		self.bedCompensationPositionRelativeZ = 0
		self.bedCompensationPositionRelativeE = 0
		self.bedCompensationExtraGcode = Gcode()

		# Backlash compensation pre-processor settings
		self.backlashCompensationRelativeMode = False
		self.valueF = "1000"
		self.previousDirectionX = "Neither"
		self.previousDirectionY = "Neither"
		self.compensationX = 0
		self.compensationY = 0
		self.backlashPositionRelativeX = 0
		self.backlashPositionRelativeY = 0
		self.backlashPositionRelativeZ = 0
		self.backlashPositionRelativeE = 0
		self.backlashCompensationExtraGcode = Gcode()
	
	# Get cpu hardware
	def getCpuHardware(self) :

		# Check if CPU info exists
		if os.path.isfile("/proc/cpuinfo") :

			# Read in CPU info
			for line in open("/proc/cpuinfo") :
	
				# Check if line contains hardware information
				if line.startswith("Hardware") and ':' in line :
		
					# Return CPU hardware
					return line[line.index(':') + 2 : -1]
	
		# Return empty string
		return ''
	
	# Save ports
	def savePorts(self, currentPort) :
	
		# Clear saved serial ports
		self.allSerialPorts = []
		
		# Go through all connected serial ports
		for port in list(serial.tools.list_ports.comports()) :
		
			# Get device
			device = port[2].upper()
			
			# Check if port contains the correct VID and PID
			if device.startswith("USB VID:PID=03EB:2404") or device.startswith("USB VID:PID=3EB:2404") :
			
				# Save serial port
				self.allSerialPorts += [port[0]]
		
		# Save current serial port
		self.currentSerialPort = currentPort
	
	# Get port
	def getPort(self) :
	
		# Initialize variables
		searchForCurrent = True
		serialPorts = list(serial.tools.list_ports.comports())
		firstUninitializedPrinter = None
		firstInitializedPrinter = None
		
		# Loop forever
		while(True) :
		
			# Go through all connected serial ports
			for port in serialPorts :
			
				# Check if searching for current port or searching for a new port
				if (searchForCurrent and (self.currentSerialPort is None or port[0] == self.currentSerialPort)) or (not searchForCurrent and port[0] not in self.allSerialPorts) :
		
					# Get device
					device = port[2].upper()
			
					# Check if port contains the correct VID and PID
					if device.startswith("USB VID:PID=03EB:2404") or device.startswith("USB VID:PID=3EB:2404") :
					
						# Check if first time connecting 
						if searchForCurrent and self.currentSerialPort is None :
						
							# Check if printer is initialized
							if "SNR" in device :
							
								# Save port
								firstInitializedPrinter = port[0]
							
							# Otherwise
							else :
						
								# Save port
								firstUninitializedPrinter = port[0]
						
						# Otherwise
						else :
					
							# Return port
							return port[0]
			
			# Check if current port has changed
			if searchForCurrent :
			
				# Check if an uninitialized printer was found
				if firstUninitializedPrinter is not None :
				
					# Return port
					return firstUninitializedPrinter
				
				# Check if an initialized printer was found
				if firstInitializedPrinter is not None :
				
					# Return port
					return firstInitializedPrinter
			
				# Clear search for current
				searchForCurrent = False
			
			# Otherwise
			else :
			
				# Break
				break
		
		# Return none
		return None
	
	# Get heatbed port
	def getHeatbedPort(self) :
	
		# Go through all connected serial ports
		for port in list(serial.tools.list_ports.comports()) :
		
			# Get device
			device = port[2].upper()
			
			# Check if port contains the correct VID and PID
			if device.startswith("USB VID:PID=1A86:7523") :
			
				# Return serial port
				return port[0]
		
		# Return none
		return None
	
	# Monitor heatbed
	def monitorHeatbed(self) :
	
		# Initialize variables
		previousHeatbedPort = None
		
		# Loop forever
		while True :
		
			# Get heatbed port
			heatbedPort = self.getHeatbedPort()
		
			# Check if a heatbed has been disconnected
			if self.heatbedConnected and heatbedPort is None :
			
				# Clear heatbed connected
				self.heatbedConnected = False
			
				# Close heatbed connection
				self.heatbedConnection.close()
				self.heatbedConnection = None
				
				# Set heated bed to false in printer profile
				if self._printer_profile_manager.exists("micro_3d") :
					printerProfile = self._printer_profile_manager.get("micro_3d")
					printerProfile["heatedBed"] = False
					self._printer_profile_manager.save(printerProfile, True)
			
				# Send message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Heatbed Not Detected"))
										
				# Create message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "notice", title = "Heatbed removed", text = "Heatbed has been disconnected"))
			
			# Otherwise check if a heatbed has been connected
			elif not self.heatbedConnected and heatbedPort is not None :
			
				# Connect to heatbed
				error = False
				try :
					self.heatbedConnection = serial.Serial(heatbedPort, 115200, timeout = 5)
					if float(serial.VERSION) < 3 :
						self.heatbedConnection.writeTimeout = 1
					else :
						self.heatbedConnection.write_timeout = 1
				except Exception :
					error = True
				
				# Check if no errors occured
				if not error :
				
					# Loop forever
					while True :
					
						# Wait for heatbed to initialize
						try :
							if self.heatbedConnection.read() == '\x1B' :
								self.heatbedConnection.timeout = 1
								break
						except Exception :
							error = True
							break
					
					# Check if no errors occured
					if not error :
				
						# Put heatbed into temperature mode
						try :
							if float(serial.VERSION) < 3 :
								self.heatbedConnection.flushInput()
								self.heatbedConnection.flushOutput()
							else :
								self.heatbedConnection.reset_input_buffer()
								self.heatbedConnection.reset_output_buffer()
							
							self.heatbedConnection.write("i\r")
							
							time.sleep(0.5)
							
							if float(serial.VERSION) < 3 :
								self.heatbedConnection.flushInput()
								self.heatbedConnection.flushOutput()
							else :
								self.heatbedConnection.reset_input_buffer()
								self.heatbedConnection.reset_output_buffer()
							
						except Exception :
							error = True
					
						# Check if no errors occured
						if not error :
				
							# Set heated bed to true in printer profile
							if self._printer_profile_manager.exists("micro_3d") :
								printerProfile = self._printer_profile_manager.get("micro_3d")
								printerProfile["heatedBed"] = True
								self._printer_profile_manager.save(printerProfile, True)
							
							# Set heatbed connected
							self.heatbedConnected = True
				
							# Send message
							self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Heatbed Detected"))
													
							# Create message
							self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "success", title = "Heatbed detected", text = "Heatbed has been connected"))
				
				# Otherwise check if an error occured and it hasn't been show yet
				if error and previousHeatbedPort != heatbedPort :
				
					# Create message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "error", title = "Heatbed error", text = "Failed to connect to heatbed"))
			
			# Set previous heatbed port
			previousHeatbedPort = heatbedPort
			
			# Delay
			time.sleep(0.5)
	
	# On after startup
	def on_after_startup(self) :
	
		# Set reminders on initial OctoPrint instance
		currentPort = self.getListenPort(psutil.Process(os.getpid()))
		if currentPort is not None and self.getListenPort(psutil.Process(os.getpid())) == 5000 :
			self.curaReminder = True
			self.sleepReminder = True
		else :
			self.curaReminder = False
			self.sleepReminder = False
	
		# Create and overwrite Micro 3D printer profile
		printerProfile = dict(
			id = "micro_3d",
			name = "Micro 3D",
			model = "Micro 3D",
			color = "default",
			volume=dict(
				width = self.bedLowMaxX - self.bedLowMinX,
				depth = self.bedLowMaxY - self.bedLowMinY,
				height = self.bedHighMaxZ - self.bedLowMinZ,
				formFactor = "rectangular",
				origin = "lowerleft"
			),
			heatedBed = False,
			extruder=dict(
				count = 1,
				offsets = [
					(0, 0)
				],
				nozzleDiameter = 0.35
			),
			axes=dict(
				x = dict(speed = 4800, inverted=False),
				y = dict(speed = 4800, inverted=False),
				z = dict(speed = 90, inverted=False),
				e = dict(speed = 600, inverted=False)
			)
		)
		self._printer_profile_manager.save(printerProfile, True, True)
		
		# Select Micro 3D printer profile
		self._printer_profile_manager.select("micro_3d")
		
		# Find provided firmwares
		for file in os.listdir(self._basefolder.replace('\\', '/') + "/static/files/") :
			if file.endswith(".hex") :
			
				# Get version number
				version = file[file.find(' ') + 1 :]
				version = version[0 : version.find('.')]
				
				# Set release
				if file[0 : file.find(' ')] == "M3D" :
					release = version
				else :
					release = version[2 : 4] + '.' + version[4 : 6] + '.' + version[6 : 8] + '.' + version[8 : 10]
				
				# Append provided firmware to list
				self.providedFirmwares[file[0 : file.find(' ')]] = {
					"Version" : version,
					"Release" : release,
					"File" : file
				}
		
		# Set file locations
		self.setFileLocations()
		
		# Check if running on Linux
		if platform.uname()[0].startswith("Linux") :
		
			# Check if running on a Raspberry Pi 1
			if platform.uname()[4].startswith("armv6l") and self.getCpuHardware() == "BCM2708" :
			
				# Set shared library
				self.sharedLibrary = ctypes.cdll.LoadLibrary(self._basefolder.replace('\\', '/') + "/static/libraries/preprocessor_arm1176jzf-s.so")
			
			# Otherwise check if running on a Raspberry Pi 2 or Raspberry Pi 3
			elif platform.uname()[4].startswith("armv7l") and self.getCpuHardware() == "BCM2709" :
			
				# Set shared library
				self.sharedLibrary = ctypes.cdll.LoadLibrary(self._basefolder.replace('\\', '/') + "/static/libraries/preprocessor_arm_cortex-a7.so")
			
			# Otherwise check if running on an ARM7 device
			elif platform.uname()[4].startswith("armv7") :
			
				# Set shared library
				self.sharedLibrary = ctypes.cdll.LoadLibrary(self._basefolder.replace('\\', '/') + "/static/libraries/preprocessor_arm7.so")
			
			# Otherwise check if using an i386 or x86-64 device
			elif platform.uname()[4].endswith("86") or platform.uname()[4].endswith("64") :
		
				# Check if Python is running as 32-bit
				if platform.architecture()[0].startswith("32") :
				
					# Set shared library
					self.sharedLibrary = ctypes.cdll.LoadLibrary(self._basefolder.replace('\\', '/') + "/static/libraries/preprocessor_i386.so")
			
				# Otherwise check if Python is running as 64-bit
				elif platform.architecture()[0].startswith("64") :
				
					# Set shared library
					self.sharedLibrary = ctypes.cdll.LoadLibrary(self._basefolder.replace('\\', '/') + "/static/libraries/preprocessor_x86-64.so")
		
		# Otherwise check if running on Windows and using an i386 or x86-64 device
		elif platform.uname()[0].startswith("Windows") and (platform.uname()[4].endswith("86") or platform.uname()[4].endswith("64")) :
		
			# Check if Python is running as 32-bit
			if platform.architecture()[0].startswith("32") :
			
				# Set shared library
				self.sharedLibrary = ctypes.cdll.LoadLibrary(self._basefolder.replace('\\', '/') + "/static/libraries/preprocessor_i386.dll")
		
			# Otherwise check if Python is running as 64-bit
			elif platform.architecture()[0].startswith("64") :
			
				# Set shared library
				self.sharedLibrary = ctypes.cdll.LoadLibrary(self._basefolder.replace('\\', '/') + "/static/libraries/preprocessor_x86-64.dll")
		
		# Otherwise check if running on OS X and using an i386 or x86-64 device
		elif platform.uname()[0].startswith("Darwin") and (platform.uname()[4].endswith("86") or platform.uname()[4].endswith("64")) :
		
			# Check if Python is running as 32-bit
			if platform.architecture()[0].startswith("32") :
			
				# Set shared library
				self.sharedLibrary = ctypes.cdll.LoadLibrary(self._basefolder.replace('\\', '/') + "/static/libraries/preprocessor_i386.dylib")
		
			# Otherwise check if Python is running as 64-bit
			elif platform.architecture()[0].startswith("64") :
			
				# Set shared library
				self.sharedLibrary = ctypes.cdll.LoadLibrary(self._basefolder.replace('\\', '/') + "/static/libraries/preprocessor_x86-64.dylib")
		
		# Check if shared library was set
		if self.sharedLibrary :
		
			# Set output types of shared library functions
			self.sharedLibrary.getMaxXExtruderLow.restype = ctypes.c_double
			self.sharedLibrary.getMaxXExtruderMedium.restype = ctypes.c_double
			self.sharedLibrary.getMaxXExtruderHigh.restype = ctypes.c_double
			self.sharedLibrary.getMaxYExtruderLow.restype = ctypes.c_double
			self.sharedLibrary.getMaxYExtruderMedium.restype = ctypes.c_double
			self.sharedLibrary.getMaxYExtruderHigh.restype = ctypes.c_double
			self.sharedLibrary.getMaxZExtruder.restype = ctypes.c_double
			self.sharedLibrary.getMinXExtruderLow.restype = ctypes.c_double
			self.sharedLibrary.getMinXExtruderMedium.restype = ctypes.c_double
			self.sharedLibrary.getMinXExtruderHigh.restype = ctypes.c_double
			self.sharedLibrary.getMinYExtruderLow.restype = ctypes.c_double
			self.sharedLibrary.getMinYExtruderMedium.restype = ctypes.c_double
			self.sharedLibrary.getMinYExtruderHigh.restype = ctypes.c_double
			self.sharedLibrary.getMinZExtruder.restype = ctypes.c_double
			self.sharedLibrary.collectPrintInformation.restype = ctypes.c_bool
	  		self.sharedLibrary.preprocess.restype = ctypes.c_char_p
	  		self.sharedLibrary.getDetectedFanSpeed.restype = ctypes.c_ubyte
	  		self.sharedLibrary.getDetectedMidPrintFilamentChange.restype = ctypes.c_bool
	  		self.sharedLibrary.getObjectSuccessfullyCentered.restype = ctypes.c_bool
	    	
	    	# Set printer callbacks is using a different printer
		if self._settings.get_boolean(["UsingADifferentPrinter"]) :
			self._printer.unregister_callback(self)
		else :
			self._printer.register_callback(self)
		
		# Monitor heatbed
		monitorHeatbedThread = threading.Thread(target = self.monitorHeatbed)
		monitorHeatbedThread.daemon = True
		monitorHeatbedThread.start()
		
		# Check if pygame camera or QTKit is usable and hosting camera
		if ("pygame.camera" in sys.modules or "QTKit" in sys.modules) and self._settings.get_boolean(["HostCamera"]) :
		
			# Check if camera port is set
			cameraPort = self._settings.get(["CameraPort"])
			if cameraPort is not None :
			
				# Start webcam server
				subprocess.Popen([sys.executable.replace('\\', '/'), self._basefolder.replace('\\', '/') + "/webcam_server.py", str(cameraPort), "4999", str(self._settings.get_int(["CameraFramesPerSecond"])), str(self._settings.get_int(["CameraWidth"])), str(self._settings.get_int(["CameraHeight"]))])
	
	# Get firmware details
	def getFirmwareDetails(self) :
	
		# Check if EEPROM was read
		if self.eeprom is not None :
		
			# Get firmware version from EEPROM
			index = 3
			firmwareVersion = 0
			while index >= 0 :
				firmwareVersion <<= 8
				firmwareVersion += int(ord(self.eeprom[self.eepromOffsets["firmwareVersion"]["offset"] + index]))
				index -= 1
		
			# Get firmware name
			firmwareName = None
			firmwareRelease = None
			for firmware in self.providedFirmwares :
				if int(self.providedFirmwares[firmware]["Version"]) / 100000000 == firmwareVersion / 100000000 :
					firmwareName = firmware
		
			# Get firmware release
			firmwareRelease = format(firmwareVersion, "010")
			if firmwareName is None or firmwareName != "M3D" :
				firmwareRelease = firmwareRelease[2 : 4] + '.' + firmwareRelease[4 : 6] + '.' + firmwareRelease[6 : 8] + '.' + firmwareRelease[8 : 10]
			
			# Return values
			return firmwareName, firmwareVersion, firmwareRelease
		
		# Return none
		return None, None, None
	
	# Covert Cura to profile
	def convertCuraToProfile(self, input, output, name, displayName, description) :
	
		# Create input file
		fd, curaProfile = tempfile.mkstemp()
			
		# Remove comments from input
		for line in open(input) :
			if ';' in line and ".gcode" not in line and line[0] != '\t' :
				os.write(fd, line[0 : line.index(';')] + '\n')
			else :
				os.write(fd, line)
		os.close(fd)
			
		# Import profile manager
		profileManager = imp.load_source("Profile", self._slicing_manager.get_slicer("cura")._basefolder.replace('\\', '/') + "/profile.py")
		
		# Create profile
		profile = octoprint.slicing.SlicingProfile("cura", name, profileManager.Profile.from_cura_ini(curaProfile), displayName, description)
		
		# Save profile	
		self._slicing_manager.get_slicer("cura").save_slicer_profile(output, profile)
	
	# Covert Profile to Cura
	def convertProfileToCura(self, input, output, printerProfile) :
	
		# Cura plugin needs to be updated to include 'solidarea_speed', 'perimeter_before_infill', 'raft_airgap_all', 'raft_surface_thickness', and 'raft_surface_linewidth'
		
		# Initialize variables
		machine = {}
		settings = {}
		alterations = {}
		
		# Get printer profile
		printerProfile = self._printer_profile_manager.get(printerProfile)
		
		# Set machine values
		machine["extruder_amount"] = printerProfile["extruder"]["count"]
		machine["has_heated_bed"] = printerProfile["heatedBed"]
		machine["machine_center_is_zero"] = printerProfile["volume"]["formFactor"] == "circular" or printerProfile["volume"]["origin"] == "center"
		machine["machine_width"] = printerProfile["volume"]["width"]
		machine["machine_height"] = printerProfile["volume"]["height"]
		machine["machine_depth"] = printerProfile["volume"]["depth"]
		if printerProfile["volume"]["formFactor"] == "circular" :
			machine["machine_shape"] = "Circular"
		else :
			machine["machine_shape"] = "Square"
		
		index = 0
		while index < printerProfile["extruder"]["count"] :
			machine["extruder_offset_x" + str(index + 1)] = printerProfile["extruder"]["offsets"][index][0]
			machine["extruder_offset_y" + str(index + 1)] = printerProfile["extruder"]["offsets"][index][1]
			index += 1
		
		# Set settings
		settings["nozzle_size"] = printerProfile["extruder"]["nozzleDiameter"]
		
		# Set alterations
		alterations["start.gcode"] = ['']
		alterations["end.gcode"] = ['']
		alterations["support_start.gcode"] = ['']
		alterations["support_end.gcode"] = ['']
		alterations["cool_start.gcode"] = ['']
		alterations["cool_end.gcode"] = ['']
		alterations["replace.csv"] = ['']
		alterations["preswitchextruder.gcode"] = ['']
		alterations["postswitchextruder.gcode"] = ['']
	
		# Create output
		output = open(output, "wb")
		
		# Import profile manager
		profileManager = imp.load_source("Profile", self._slicing_manager.get_slicer("cura")._basefolder.replace('\\', '/') + "/profile.py")
		
		# Create profile
		profile = profileManager.Profile(self._slicing_manager.get_slicer("cura")._load_profile(input), printerProfile, None, None)
		
		# Go through all profile values
		values = profile.profile()
		for key in values.keys() :
		
			# Get current value
			currentValue = str(key)
			
			# Fix value
			if currentValue.endswith("_gcode") :
				currentValue = currentValue[: -6] + ".gcode"
			
			elif currentValue == "first_layer_width_factor" :
				currentValue = "layer0_width_factor"
			
			elif currentValue == "outer_shell_speed" :
				currentValue = "inset0_speed"
			
			elif currentValue == "inner_shell_speed" :
				currentValue = "insetx_speed"
			
			elif currentValue == "follow_surface" :
				currentValue = "simple_mode"
			
			# Append values to alterations or settings
			if currentValue.endswith("gcode") :
				alterations[currentValue] = values[key]
			
			else :
			
				if isinstance(values[key], list) :
					settings[currentValue] = values[key]
				else :
					settings[currentValue] = str(values[key]).capitalize()
		
		# Write machine
		output.write("[machine]\n")
		
		# Go through all machine values
		for key in machine.keys() :
		
			# Write setting to output
			output.write(str(key) + " = " + str(machine[key]))
			if str(key) == "machine_shape" :
				output.write("; Square, Circular")
			output.write('\n')
		
		# Write profile
		output.write("\n[profile]\n")
		
		# Go through all settings
		for key in settings.keys() :
		
			# Check if settings is a list
			if isinstance(settings[key], list) :
			
				# Check if setting is print temperature or filament diameter
				if key == "print_temperature" or key == "filament_diameter" :
				
					# Go through all setting's parts
					index = 0
					while index < len(settings[key]) :
					
						# Write setting part to output
						if index == 0 :
							output.write(str(key) + " = " + str(float(settings[key][index])) + '\n')
						else :
							output.write(str(key) + str(index + 1) + " = " + str(float(settings[key][index])) + '\n')
						index += 1
			
			# Otherwise
			else :
			
				# Write setting to output
				output.write(str(key) + " = " + str(settings[key]))
				if str(key) == "retraction_combing" :
					output.write("; Off, All, No Skin")
				elif str(key) == "support" :
					output.write("; None, Touching buildplate, Everywhere")
				elif str(key) == "platform_adhesion" :
					output.write("; None, Brim, Raft")
				elif str(key) == "support_dual_extrusion" :
					output.write("; Both, First extruder, Second extruder")
				elif str(key) == "support_type" :
					output.write("; Grid, Lines")
				output.write('\n')
		
		# Write alterations
		output.write("\n[alterations]\n")
		
		# Go through all alterations
		for key in alterations.keys() :
			
			# Go through all alteration's parts
			index = 0
			while index < len(alterations[key]) :
			
				# Write alteration part to output
				if index == 0 :
					output.write(str(key) + " = " + str(alterations[key][index]).replace("\n\n", '\n').replace('\n', "\n\t").rstrip() + '\n')
				else :
					output.write(str(key) + str(index + 1) + " = " + str(alterations[key][index]).replace("\n\n", '\n').replace('\n', "\n\t").rstrip() + '\n')
				index += 1
	
	# On shutdown
	def on_shutdown(self) :
	
		# Remove temporary files
		self.removeTemporaryFiles();
		
		# Restore files
		self.restoreFiles()
		
		# Remove config file
		configFile = self._settings.global_get_basefolder("base").replace('\\', '/') + "/config.yaml" + str(self.getListenPort(psutil.Process(os.getpid())))
		if os.path.isfile(configFile) :
			os.remove(configFile)
		
		# Enable sleep
		self.enableSleep()
	
	# Remove temporary files
	def removeTemporaryFiles(self) :
	
		# Delete all temporary files aside from the log
		path = self.get_plugin_data_folder().replace('\\', '/') + '/'
		for file in os.listdir(path) :
			if file != "log.txt" :
				os.remove(path + file)
	
	# Get default settings
	def get_settings_defaults(self) :
	
		# Return default settings
		return dict(
			BacklashX = 0.3,
			BacklashY = 0.6,
			BackLeftOrientation = 0,
			BackRightOrientation = 0,
			FrontRightOrientation = 0,
			FrontLeftOrientation = 0,
			BacklashSpeed = 1500,
			BackLeftOffset = 0,
			BackRightOffset = 0,
			FrontRightOffset = 0,
			FrontLeftOffset = 0,
			BedHeightOffset = 0,
			FilamentTemperature = 215,
			FilamentType = "PLA",
			UseValidationPreprocessor = True,
			UsePreparationPreprocessor = True,
			UseThermalBondingPreprocessor = True,
			UseWaveBondingPreprocessor = False,
			UseBedCompensationPreprocessor = True,
			UseBacklashCompensationPreprocessor = True,
			AutomaticallyObtainSettings = True,
			UseCenterModelPreprocessor = False,
			IgnorePrintDimensionLimitations = False,
			PreprocessOnTheFly = True,
			PrinterColor = "Black",
			FilamentColor = "White",
			UseSharedLibrary = True,
			SpeedLimitX = 1500,
			SpeedLimitY = 1500,
			SpeedLimitZ = 60,
			SpeedLimitEPositive = 102,
			SpeedLimitENegative = 360,
			ChangeSettingsBeforePrint = True,
			UsingADifferentPrinter = False,
			CalibrateBeforePrint = False,
			RemoveFanCommands = True,
			RemoveTemperatureCommands = True,
			UseGpio = False,
			GpioPin = None,
			GpioLayer = None,
			HeatbedTemperature = 70,
			ExternalBedHeight = 0,
			HostCamera = False,
			CameraPort = None,
			CameraWidth = 640,
			CameraHeight = 480,
			CameraFramesPerSecond = 20,
			MidPrintFilamentChangeLayers = '',
			LogSentReceivedData = False
		)
	
	# On settings save
	def on_settings_save(self, data) :
	
		# Get old host camera settings
		oldHostCamera = self._settings.get_boolean(["HostCamera"])
		
		# Save settings
		octoprint.plugin.SettingsPlugin.on_settings_save(self, data)
		
		# Send message for enabling/disabling GPIO
		if self._settings.get_boolean(["UseGpio"]) and self._settings.get_int(["GpioPin"]) is not None and self._settings.get_int(["GpioLayer"]) is not None :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Enable GPIO"))
		else :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Disable GPIO"))
		
		# Get new host camera settings
		newHostCamera = self._settings.get_boolean(["HostCamera"])
		
		# Check if host camera setting changed
		if oldHostCamera != newHostCamera :
		
			# Check if now hosting camera
			if newHostCamera :
			
				# Set camera URLs
				octoprint.settings.settings().set(["webcam", "stream"], "http://" + socket.gethostbyname(socket.gethostname()) + ":4999/stream.mjpg")
				octoprint.settings.settings().set(["webcam", "snapshot"], "http://" + socket.gethostbyname(socket.gethostname()) + ":4999/snapshot.jpg")
				
			# Otherwise assume now not hosting camera
			else :
			
				# Clear camera URLs
				octoprint.settings.settings().set(["webcam", "stream"], None)
				octoprint.settings.settings().set(["webcam", "snapshot"], None)
			
			# Save settings
			octoprint.settings.settings().save()
	
	# Template manager
	def get_template_configs(self) :
	
		# Return settings
		return [
			dict(
				type = "settings",
				custom_bindings = False
			)
		]
	
	# Asset manager
	def get_assets(self) :
	
		# Return asset
		return dict(
			js = ["js/m3dfio.js", "js/three.min.js", "js/OrbitControls.js", "js/STLLoader.js", "js/OBJLoader.js", "js/M3DLoader.js", "js/STLBinaryExporter.js", "js/TransformControls.js", "js/ThreeCSG.js", "js/AMFLoader.js", "js/VRMLLoader.js", "js/ColladaLoader.js", "js/Detector.js"],
			css = ["css/m3dfio.css"]
		)
	
	# Get update information
	def getUpdateInformation(self, *args, **kwargs) :
	
		# Return update information
		return dict(
			m3dfio = dict(
			
				displayName = self._plugin_name,
				displayVersion = self._plugin_version,
				type = "github_release",
				current = self._plugin_version,
				user = "donovan6000",
				repo = "M3D-Fio",
				pip = "https://github.com/donovan6000/M3D-Fio/archive/{target_version}.zip"
			)
		)
	
	# Get commands typea
	def get_api_commands(self) :
	
		# Return command types
		return dict(
			message = ["value"],
			file = ["name", "content"]
		)
	
	# On command
	def on_api_command(self, command, data) :
	
		# Check if command is a message
		if command == "message" :
		
			# Check if parameter is a list of commands
			if isinstance(data["value"], list) :
			
				# Set no line numbers if first command is to remove line numbers
				if data["value"][0] == "M65538;no line numbers" :
					noLineNumber = True
					data["value"].pop(0)
				
				# Otherwise clear no line numbers
				else :
					noLineNumber = False
			
				# Set waiting until commands sent if last command is to wait
				if data["value"][-1] == "M65536;wait" :
					self.waitingUntilCommandsSent = True
				
				# Check if not using line numbers or printing
				if noLineNumber or self._printer.is_printing() :
				
					# Send commands to printer
					self.sendCommands(data["value"])
				
				# Otherwise
				else :
				
					# Send commands with line numbers
					self.sendCommandsWithLineNumbers(data["value"])
				
				# Send response
				return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to set fan
			elif data["value"].startswith("Set Fan:") :
			
				# Initialize variables
				error = False
				
				# Disable printer callbacks
				self._printer.unregister_callback(self)
				
				# Get current printer connection state
				currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
				
				# Set baudrate if invalid
				if not currentBaudrate or currentBaudrate == 0 :
					currentBaudrate = 115200
				
				# Save ports
				self.savePorts(currentPort)
				
				# Switch into bootloader mode
				self.sendCommands("M115 S628")
				time.sleep(1)
				
				# Set updated port
				currentPort = self.getPort()
				
				# Return error if printer wasn't found
				if currentPort is None :
					return flask.jsonify(dict(value = "Error"))
				
				# Connect to the printer
				connection = serial.Serial(currentPort, currentBaudrate)
						
				# Check if getting EEPROM failed
				if not self.getEeprom(connection) :
				
					# Set error
					error = True
				
				# Otherwise
				else :
				
					# Check if setting fan failed
					if not self.setFan(connection, data["value"][9 :]) :
				
						# Set error
						error = True
					
					# Otherwise
					else :
				
						# Send new EEPROM
						self.getEeprom(connection, True)
				
				# Close connection
				connection.close()
				
				# Enable printer callbacks if using a Micro 3D printer
			    	if not self._settings.get_boolean(["UsingADifferentPrinter"]) :
					self._printer.register_callback(self)
			
				# Re-connect
				self._printer.connect(currentPort, currentBaudrate, currentProfile)
				
				# Wait until connection is established
				while not isinstance(self._printer.get_transport(), serial.Serial) :
					time.sleep(0.01)
				
				# Remove serial timeout
				self._printer.get_transport().timeout = None
				if float(serial.VERSION) < 3 :
					self._printer.get_transport().writeTimeout = None
				else :
					self._printer.get_transport().write_timeout = None
				
				# Send response
				if error :
					return flask.jsonify(dict(value = "Error"))
				else :
					return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to set extruder current
			elif data["value"].startswith("Set Extruder Current:") :
			
				# Initialize variables
				error = False
				
				# Disable printer callbacks
				self._printer.unregister_callback(self)
				
				# Get current printer connection state
				currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
				
				# Set baudrate if invalid
				if not currentBaudrate or currentBaudrate == 0 :
					currentBaudrate = 115200
				
				# Save ports
				self.savePorts(currentPort)
				
				# Switch into bootloader mode
				self.sendCommands("M115 S628")
				time.sleep(1)
				
				# Set updated port
				currentPort = self.getPort()
				
				# Return error if printer wasn't found
				if currentPort is None :
					return flask.jsonify(dict(value = "Error"))
				
				# Connect to the printer
				connection = serial.Serial(currentPort, currentBaudrate)
				
				# Check if getting EEPROM failed
				if not self.getEeprom(connection) :
				
					# Set error
					error = True
				
				# Otherwise
				else :
				
					# Check if setting extruder current failed
					if not self.setExtruderCurrent(connection, int(data["value"][22 :])) :
				
						# Set error
						error = True
					
					# Otherwise
					else :
					
						# Send new EEPROM
						self.getEeprom(connection, True)
				
				# Close connection
				connection.close()
				
				# Enable printer callbacks if using a Micro 3D printer
		    		if not self._settings.get_boolean(["UsingADifferentPrinter"]) :
					self._printer.register_callback(self)
				
				# Re-connect
				self._printer.connect(currentPort, currentBaudrate, currentProfile)
				
				# Wait until connection is established
				while not isinstance(self._printer.get_transport(), serial.Serial) :
					time.sleep(0.01)
				
				# Remove serial timeout
				self._printer.get_transport().timeout = None
				if float(serial.VERSION) < 3 :
					self._printer.get_transport().writeTimeout = None
				else :
					self._printer.get_transport().write_timeout = None
				
				# Send response
				if error :
					return flask.jsonify(dict(value = "Error"))
				else :
					return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to print test border or backlash calibration cylinder
			elif data["value"] == "Print Test Border" or data["value"] == "Print Backlash Calibration Cylinder" :
			
				# Set file location and destination
				if data["value"] == "Print Test Border" :
					location = self._basefolder.replace('\\', '/') + "/static/files/test border.gcode"
					destination = self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "test border.gcode").replace('\\', '/')
				else :
					location = self._basefolder.replace('\\', '/') + "/static/files/backlash calibration cylinder.gcode"
					destination = self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "backlash calibration cylinder.gcode").replace('\\', '/')
				
				# Remove destination file if it already exists
				if os.path.isfile(destination) :
					os.remove(destination)
				
				# Check if not pre-processing on the fly
				if not self._settings.get_boolean(["PreprocessOnTheFly"]) :
					
					# Reset pre-processor settings
					self.resetPreprocessorSettings()
				
					# Set printing type and display message
					if data["value"] == "Print Test Border" :
						self.printingTestBorder = True
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Preparing test border"))
					else :
						self.printingBacklashCalibrationCylinder = True
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Preparing backlash calibration cylinder"))
					
					# Check if using shared library
					if self.sharedLibrary and self._settings.get_boolean(["UseSharedLibrary"]) :
					
						# Reset pre-processor settings
						self.sharedLibrary.resetPreprocessorSettings()
				
						# Set values
						self.sharedLibrary.setBacklashX(ctypes.c_double(self._settings.get_float(["BacklashX"])))
						self.sharedLibrary.setBacklashY(ctypes.c_double(self._settings.get_float(["BacklashY"])))
						self.sharedLibrary.setBacklashSpeed(ctypes.c_double(self._settings.get_float(["BacklashSpeed"])))
						self.sharedLibrary.setBackRightOrientation(ctypes.c_double(self._settings.get_float(["BackRightOrientation"])))
						self.sharedLibrary.setBackLeftOrientation(ctypes.c_double(self._settings.get_float(["BackLeftOrientation"])))
						self.sharedLibrary.setFrontLeftOrientation(ctypes.c_double(self._settings.get_float(["FrontLeftOrientation"])))
						self.sharedLibrary.setFrontRightOrientation(ctypes.c_double(self._settings.get_float(["FrontRightOrientation"])))
						self.sharedLibrary.setBedHeightOffset(ctypes.c_double(self._settings.get_float(["BedHeightOffset"])))
						self.sharedLibrary.setBackRightOffset(ctypes.c_double(self._settings.get_float(["BackRightOffset"])))
						self.sharedLibrary.setBackLeftOffset(ctypes.c_double(self._settings.get_float(["BackLeftOffset"])))
						self.sharedLibrary.setFrontLeftOffset(ctypes.c_double(self._settings.get_float(["FrontLeftOffset"])))
						self.sharedLibrary.setFrontRightOffset(ctypes.c_double(self._settings.get_float(["FrontRightOffset"])))
						self.sharedLibrary.setFilamentTemperature(ctypes.c_ushort(self._settings.get_int(["FilamentTemperature"])))
						self.sharedLibrary.setFilamentType(ctypes.c_char_p(str(self._settings.get(["FilamentType"]))))
						self.sharedLibrary.setUseValidationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseValidationPreprocessor"])))
						self.sharedLibrary.setUsePreparationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UsePreparationPreprocessor"])))
						self.sharedLibrary.setUseWaveBondingPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseWaveBondingPreprocessor"])))
						self.sharedLibrary.setUseThermalBondingPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseThermalBondingPreprocessor"])))
						self.sharedLibrary.setUseBedCompensationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseBedCompensationPreprocessor"])))
						self.sharedLibrary.setUseBacklashCompensationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseBacklashCompensationPreprocessor"])))
						self.sharedLibrary.setUseCenterModelPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseCenterModelPreprocessor"])))
						self.sharedLibrary.setIgnorePrintDimensionLimitations(ctypes.c_bool(self._settings.get_boolean(["IgnorePrintDimensionLimitations"])))
						self.sharedLibrary.setUsingHeatbed(ctypes.c_bool(self.heatbedConnected))
						self.sharedLibrary.setPrintingTestBorder(ctypes.c_bool(self.printingTestBorder))
						self.sharedLibrary.setPrintingBacklashCalibrationCylinder(ctypes.c_bool(self.printingBacklashCalibrationCylinder))
						self.sharedLibrary.setPrinterColor(ctypes.c_char_p(self.printerColor))
						self.sharedLibrary.setCalibrateBeforePrint(ctypes.c_bool(self._settings.get_boolean(["CalibrateBeforePrint"])))
						self.sharedLibrary.setRemoveFanCommands(ctypes.c_bool(self._settings.get_boolean(["RemoveFanCommands"])))
						self.sharedLibrary.setRemoveTemperatureCommands(ctypes.c_bool(self._settings.get_boolean(["RemoveTemperatureCommands"])))
						self.sharedLibrary.setUseGpio(ctypes.c_bool(self._settings.get_boolean(["UseGpio"])))
						if self._settings.get_int(["GpioLayer"]) is not None :
							self.sharedLibrary.setGpioLayer(ctypes.c_ushort(self._settings.get_int(["GpioLayer"])))
						self.sharedLibrary.setHeatbedTemperature(ctypes.c_ushort(self._settings.get_int(["HeatbedTemperature"])))
						self.sharedLibrary.setExternalBedHeight(ctypes.c_double(self._settings.get_float(["ExternalBedHeight"])))
						self.sharedLibrary.setMidPrintFilamentChangeLayers(ctypes.c_char_p(' '.join(re.findall("\\d+", str(self._settings.get(["MidPrintFilamentChangeLayers"]))))))
									
						# Collect print information
						self.sharedLibrary.collectPrintInformation(ctypes.c_char_p(location))
						
						# Get extruder min and max movements
						self.maxXExtruderLow = self.sharedLibrary.getMaxXExtruderLow()
						self.maxXExtruderMedium = self.sharedLibrary.getMaxXExtruderMedium()
						self.maxXExtruderHigh = self.sharedLibrary.getMaxXExtruderHigh()
						self.maxYExtruderLow = self.sharedLibrary.getMaxYExtruderLow()
						self.maxYExtruderMedium = self.sharedLibrary.getMaxYExtruderMedium()
						self.maxYExtruderHigh = self.sharedLibrary.getMaxYExtruderHigh()
						self.maxZExtruder = self.sharedLibrary.getMaxZExtruder()
						self.minXExtruderLow = self.sharedLibrary.getMinXExtruderLow()
						self.minXExtruderMedium = self.sharedLibrary.getMinXExtruderMedium()
						self.minXExtruderHigh = self.sharedLibrary.getMinXExtruderHigh()
						self.minYExtruderLow = self.sharedLibrary.getMinYExtruderLow()
						self.minYExtruderMedium = self.sharedLibrary.getMinYExtruderMedium()
						self.minYExtruderHigh = self.sharedLibrary.getMinYExtruderHigh()
						self.minZExtruder = self.sharedLibrary.getMinZExtruder()
						
						# Get detected fan speed
						self.detectedFanSpeed = self.sharedLibrary.getDetectedFanSpeed()
						
						# Get detected mid-print filament change
						self.detectedMidPrintFilamentChange = self.sharedLibrary.getDetectedMidPrintFilamentChange()
					
						# Get object successfully centered
						self.objectSuccessfullyCentered = self.sharedLibrary.getObjectSuccessfullyCentered()
					
						# Pre-process file and moved to destination
						self.sharedLibrary.preprocess(ctypes.c_char_p(location), ctypes.c_char_p(destination), ctypes.c_bool(False))
					
					# Otherwise
					else :
					
						# Collect print information
						self.collectPrintInformation(location)
			
						# Pre-process file and moved to destination
						self.preprocess(location, destination)
					
					# Hide message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Hide Message"))
				
				# Otherwise
				else :
				
					# Copy file to destination
					shutil.copyfile(location, destination)
				
				# Set correct file location for Windows
				if platform.uname()[0].startswith("Windows") :
					destination = destination.replace('/', '\\')
				
				# Empty command queue
				self.emptyCommandQueue()
				
				# Set first line number to zero and clear history
				if self._printer._comm is not None :
					self._printer._comm._gcode_M110_sending("N0")
					self._printer._comm._long_running_command = True
				
				# Clear sent commands
				self.sentCommands = {}
				self.resetLineNumberCommandSent = False
				self.numberWrapCounter = 0
				
				# Print test border
				self._printer.select_file(destination, False, True)
			
			# Otherwise check if parameter is to read EEPROM
			elif data["value"] == "Read EEPROM" :
			
				# Disable printer callbacks
				self._printer.unregister_callback(self)
				
				# Get current printer connection state
				currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
				
				# Set baudrate if invalid
				if not currentBaudrate or currentBaudrate == 0 :
					currentBaudrate = 115200
				
				# Save ports
				self.savePorts(currentPort)
				
				# Switch into bootloader mode
				self.sendCommands("M115 S628")
				time.sleep(1)
				
				# Set updated port
				currentPort = self.getPort()
				
				# Return error if printer wasn't found
				if currentPort is None :
					return flask.jsonify(dict(value = "Error"))
				
				# Connect to the printer
				connection = serial.Serial(currentPort, currentBaudrate)
				
				# Get EEPROM and send it
				self.getEeprom(connection, True)
				
				# Close connection
				connection.close()
				
				# Enable printer callbacks if using a Micro 3D printer
		    		if not self._settings.get_boolean(["UsingADifferentPrinter"]) :
					self._printer.register_callback(self)
				
				# Re-connect
				self._printer.connect(currentPort, currentBaudrate, currentProfile)
				
				# Wait until connection is established
				while not isinstance(self._printer.get_transport(), serial.Serial) :
					time.sleep(0.01)
				
				# Remove serial timeout
				self._printer.get_transport().timeout = None
				if float(serial.VERSION) < 3 :
					self._printer.get_transport().writeTimeout = None
				else :
					self._printer.get_transport().write_timeout = None
				
				# Send response
				if self.eeprom is None :
					return flask.jsonify(dict(value = "Error"))
				else :
					return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to write EEPROM
			elif data["value"].startswith("Write EEPROM:") :
			
				# Initialize variables
				error = False
			
				# Get new EEPROM
				newEeprom = data["value"][13 :].decode("hex")
				
				# Check if new EEPROM is an invalid size
				if len(newEeprom) != 0x300 :
				
					# Set error
					error = True
				
				# Otherwise
				else :
			
					# Disable printer callbacks
					self._printer.unregister_callback(self)
				
					# Get current printer connection state
					currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
					
					# Set baudrate if invalid
					if not currentBaudrate or currentBaudrate == 0 :
						currentBaudrate = 115200
					
					# Save ports
					self.savePorts(currentPort)
					
					# Switch into bootloader mode
					self.sendCommands("M115 S628")
					time.sleep(1)
				
					# Set updated port
					currentPort = self.getPort()
					
					# Return error if printer wasn't found
					if currentPort is None :
						return flask.jsonify(dict(value = "Error"))
				
					# Connect to the printer
					connection = serial.Serial(currentPort, currentBaudrate)
					
					# Check if getting EEPROM failed
					if not self.getEeprom(connection) :
				
						# Set error
						error = True
				
					# Otherwise
					else :
				
						# Go through bytes of new EEPROM
						index = 0
						while index < len(newEeprom) :
						
							# Check if bytes in EEPROM differ
							if self.eeprom[index] != newEeprom[index] :

								# Check if updating byte in EEPROM failed
								if not error and not self.writeToEeprom(connection, index, newEeprom[index]) :
			
									# Set error
									error = True
		
							# Increment index
							index += 1
						
						# Check if an error hasn't occured
						if not error :
					
							# Clear EEPROM
							self.eeprom = None
				
					# Close connection
					connection.close()
					
					# Save connection
					self.savedCurrentPort = currentPort
					self.savedCurrentBaudrate = currentBaudrate
					self.savedCurrentProfile = currentProfile
					
					# Enable printer callbacks if using a Micro 3D printer
		    			if not self._settings.get_boolean(["UsingADifferentPrinter"]) :
						self._printer.register_callback(self)
				
				# Send response
				if error :
					return flask.jsonify(dict(value = "Error"))
				else :
					return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to saved settings
			elif data["value"] == "Saved Settings" :
			
				# Set printer callbacks is using a different printer
				if self._settings.get_boolean(["UsingADifferentPrinter"]) :
					self._printer.unregister_callback(self)
				else :
					self._printer.register_callback(self)
			
				# Check if a Micro 3D is connected and not printing
				if not self.invalidPrinter and not self._printer.is_printing() :
				
					# Save settings to the printer
					self.sendCommands(self.getSaveCommands())
			
			# Otherwise check if parameter is a response to a message
			elif data["value"] == "OK" or data["value"] == "Yes" or data["value"] == "No" :
			
				# Check if waiting for a response
				if self.messageResponse is None :
			
					# Set response
					if data["value"] == "No" :
						self.messageResponse = False
					else :
						self.messageResponse = True
				
				# Send response
				return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to disable reminder
			elif data["value"].startswith("Disable Reminder:") :
			
				# Get value
				value = data["value"][18 :]
				
				# Disable Cura reminder
				if value == "Cura" :
					self.curaReminder = False
				
				# Disable sleep reminder
				elif value == "Sleep" :
					self.sleepReminder = False
			
			# Otherwise check if parameter is to view a profile
			elif data["value"].startswith("View Profile:") :
			
				# Get values
				values = json.loads(data["value"][14 :])
			
				# Get slicer profile's location
				fileLocation = self._slicing_manager.get_profile_path(values["slicerName"], values["slicerProfileName"])
				
				# Check if slicer profile's name contains path traversal, slicer profile doesn't exist, or printer profile doesn't exist
				if "../" in values["slicerProfileName"] or not os.path.isfile(fileLocation) or not self._printer_profile_manager.exists(values["printerProfileName"]) :
				
					# Return error
					return flask.jsonify(dict(value = "Error"))
				
				# Set file's destination
				destinationName = "slicer_profile.ini"
				fileDestination = self.get_plugin_data_folder().replace('\\', '/') + '/' + destinationName
				
				# Remove file in destination if it already exists
				if os.path.isfile(fileDestination) :
					os.remove(fileDestination)
			
				# Copy file to accessible location
				temp = tempfile.mkstemp()[1]
				shutil.copyfile(fileLocation, temp)
				
				if values["slicerName"] == "cura" :
					self.convertProfileToCura(temp, fileDestination, values["printerProfileName"])
				else :
					shutil.move(temp, fileDestination)
				
				# Return location
				return flask.jsonify(dict(value = "OK", path = "m3dfio/download/" + destinationName))
			
			# Otherwise check if parameter is to get printer settings
			elif data["value"] == "Get Printer Settings" :
			
				# Get printer settings
				printerSettings = dict(
					BacklashX = self._settings.get_float(["BacklashX"]),
					BacklashY = self._settings.get_float(["BacklashY"]),
					BackLeftOrientation = self._settings.get_float(["BackLeftOrientation"]),
					BackRightOrientation = self._settings.get_float(["BackRightOrientation"]),
					FrontRightOrientation = self._settings.get_float(["FrontRightOrientation"]),
					FrontLeftOrientation = self._settings.get_float(["FrontLeftOrientation"]),
					BacklashSpeed = self._settings.get_float(["BacklashSpeed"]),
					BackLeftOffset = self._settings.get_float(["BackLeftOffset"]),
					BackRightOffset = self._settings.get_float(["BackRightOffset"]),
					FrontRightOffset = self._settings.get_float(["FrontRightOffset"]),
					FrontLeftOffset = self._settings.get_float(["FrontLeftOffset"]),
					BedHeightOffset = self._settings.get_float(["BedHeightOffset"]),
					FilamentTemperature = self._settings.get_int(["FilamentTemperature"]),
					FilamentType = str(self._settings.get(["FilamentType"])),
					PrinterColor = str(self._settings.get(["PrinterColor"])),
					FilamentColor = str(self._settings.get(["FilamentColor"])),
					SpeedLimitX = self._settings.get_float(["SpeedLimitX"]),
					SpeedLimitY = self._settings.get_float(["SpeedLimitY"]),
					SpeedLimitZ = self._settings.get_float(["SpeedLimitZ"]),
					SpeedLimitEPositive = self._settings.get_float(["SpeedLimitEPositive"]),
					SpeedLimitENegative = self._settings.get_float(["SpeedLimitENegative"]),
					ExternalBedHeight = self._settings.get_float(["ExternalBedHeight"])
				)
				
				# Set file's destination
				destinationName = "printer_settings.yaml"
				fileDestination = self.get_plugin_data_folder().replace('\\', '/') + '/' + destinationName
				
				# Remove file in destination if it already exists
				if os.path.isfile(fileDestination) :
					os.remove(fileDestination)
				
				# Write printer settings to file
				output = open(fileDestination, "wb")
    				output.write(yaml.dump(printerSettings, default_flow_style = True))
    				output.close()
    				
    				# Return location
				return flask.jsonify(dict(value = "OK", path = "m3dfio/download/" + destinationName))
			
			# Otherwise check if parameter is to get log
			elif data["value"] == "Get Log" :
			
				# Set file's destination
				destinationName = "log.zip"
				fileDestination = self.get_plugin_data_folder().replace('\\', '/') + '/' + destinationName
				logLocation = self.get_plugin_data_folder().replace('\\', '/') + "/log.txt"
				
				# Remove file in destination if it already exists
				if os.path.isfile(fileDestination) :
					os.remove(fileDestination)
				
				# Open archive
				output = zipfile.ZipFile(fileDestination, 'w')
				
				# Acquire lock
				self.fileLock.acquire()
				
				# Write log to archive
				if os.path.isfile(logLocation) :
					output.write(logLocation, "log.txt")
    				else :
    					output.writestr("log.txt", '')
    				
    				# Release lock
				self.fileLock.release()
    				
    				# Close archive
    				output.close()
    				
    				# Return location
				return flask.jsonify(dict(value = "OK", path = "m3dfio/download/" + destinationName))
			
			# Otherwise check if parameter is to clear log
			elif data["value"] == "Clear Log" :
			
				# Erase log files
				self.eraseLogFiles()
			
			# Otherwise check if parameter is to set printer settings
			elif data["value"].startswith("Set Printer Settings:") :
			
				# Get printer settings
				try :
					printerSettings = yaml.load(data["value"][21 :])
				except Exception :
					return flask.jsonify(dict(value = "Error"))
				
				# Save printer settings
				if "BacklashX" in printerSettings :
					self._settings.set_float(["BacklashX"], float(printerSettings["BacklashX"]))
				
				if "BacklashY" in printerSettings :
					self._settings.set_float(["BacklashY"], float(printerSettings["BacklashY"]))
				
				if "BackLeftOrientation" in printerSettings :
					self._settings.set_float(["BackLeftOrientation"], float(printerSettings["BackLeftOrientation"]))
				
				if "BackRightOrientation" in printerSettings :
					self._settings.set_float(["BackRightOrientation"], float(printerSettings["BackRightOrientation"]))
				
				if "FrontRightOrientation" in printerSettings :
					self._settings.set_float(["FrontRightOrientation"], float(printerSettings["FrontRightOrientation"]))
				
				if "FrontLeftOrientation" in printerSettings :
					self._settings.set_float(["FrontLeftOrientation"], float(printerSettings["FrontLeftOrientation"]))
				
				if "BacklashSpeed" in printerSettings :
					self._settings.set_float(["BacklashSpeed"], float(printerSettings["BacklashSpeed"]))
				
				if "BackLeftOffset" in printerSettings :
					self._settings.set_float(["BackLeftOffset"], float(printerSettings["BackLeftOffset"]))
				
				if "BackRightOffset" in printerSettings :
					self._settings.set_float(["BackRightOffset"], float(printerSettings["BackRightOffset"]))
				
				if "FrontRightOffset" in printerSettings :
					self._settings.set_float(["FrontRightOffset"], float(printerSettings["FrontRightOffset"]))
				
				if "FrontLeftOffset" in printerSettings :
					self._settings.set_float(["FrontLeftOffset"], float(printerSettings["FrontLeftOffset"]))
				
				if "BedHeightOffset" in printerSettings :
					self._settings.set_float(["BedHeightOffset"], float(printerSettings["BedHeightOffset"]))
				
				if "FilamentTemperature" in printerSettings :
					self._settings.set_int(["FilamentTemperature"], int(printerSettings["FilamentTemperature"]))
				
				if "FilamentType" in printerSettings :
					self._settings.set(["FilamentType"], str(printerSettings["FilamentType"]))
				
				if "PrinterColor" in printerSettings and (str(printerSettings["PrinterColor"]) == "Black" or str(printerSettings["PrinterColor"]) == "White" or str(printerSettings["PrinterColor"]) == "Blue" or str(printerSettings["PrinterColor"]) == "Green" or str(printerSettings["PrinterColor"]) == "Orange" or str(printerSettings["PrinterColor"]) == "Clear" or str(printerSettings["PrinterColor"]) == "Silver" or str(printerSettings["PrinterColor"]) == "Purple") :
					self._settings.set(["PrinterColor"], str(printerSettings["PrinterColor"]))
				
				if "FilamentColor" in printerSettings :
					self._settings.set(["FilamentColor"], str(printerSettings["FilamentColor"]))
				
				if "SpeedLimitX" in printerSettings :
					self._settings.set_float(["SpeedLimitX"], float(printerSettings["SpeedLimitX"]))
				
				if "SpeedLimitY" in printerSettings :
					self._settings.set_float(["SpeedLimitY"], float(printerSettings["SpeedLimitY"]))
				
				if "SpeedLimitZ" in printerSettings :
					self._settings.set_float(["SpeedLimitZ"], float(printerSettings["SpeedLimitZ"]))
				
				if "SpeedLimitEPositive" in printerSettings :
					self._settings.set_float(["SpeedLimitEPositive"], float(printerSettings["SpeedLimitEPositive"]))
				
				if "SpeedLimitENegative" in printerSettings :
					self._settings.set_float(["SpeedLimitENegative"], float(printerSettings["SpeedLimitENegative"]))
				
				if "ExternalBedHeight" in printerSettings :
					self._settings.set_float(["ExternalBedHeight"], float(printerSettings["ExternalBedHeight"]))
				
				# Check if a Micro 3D is connected and not printing
				if not self.invalidPrinter and not self._printer.is_printing() :
				
					# Save settings to the printer
					self.sendCommands(self.getSaveCommands())
				
				# Save software settings
				octoprint.settings.settings().save()
				
				# Send response
				return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to remove temporary files
			elif data["value"] == "Remove Temp" :
			
				# Remove temporary files
				self.removeTemporaryFiles();
			
			# Otherwise check if parameter is to update firmware to provided
			elif data["value"].startswith("Update Firmware To Provided:") :
				
				# Get firmware name
				firmwareName = data["value"][29 :]
				
				# Return error if firmware name isn't provided
				if firmwareName not in self.providedFirmwares :
					return flask.jsonify(dict(value = "Error"))
			
				# Initialize variables
				error = False
			
				# Disable printer callbacks
				self._printer.unregister_callback(self)
			
				# Get current printer connection state
				currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
				
				# Set baudrate if invalid
				if not currentBaudrate or currentBaudrate == 0 :
					currentBaudrate = 115200
				
				# Save ports
				self.savePorts(currentPort)
				
				# Switch into bootloader mode
				self.sendCommands("M115 S628")
				time.sleep(1)
			
				# Set updated port
				currentPort = self.getPort()
				
				# Return error if printer wasn't found
				if currentPort is None :
					return flask.jsonify(dict(value = "Error"))
		
				# Connect to the printer
				connection = serial.Serial(currentPort, currentBaudrate)
				
				# Check if getting EEPROM failed
				if not self.getEeprom(connection) :
		
					# Set error
					error = True
		
				# Otherwise
				else :
			
					# Check if updating firmware failed
					if not self.updateToProvidedFirmware(connection, firmwareName) :
			
						# Set error
						error = True
				
					# Otherwise
					else :
				
						# Clear EEPROM
						self.eeprom = None
			
				# Close connection
				connection.close()
				
				# Save connection
				self.savedCurrentPort = currentPort
				self.savedCurrentBaudrate = currentBaudrate
				self.savedCurrentProfile = currentProfile
			
				# Enable printer callbacks if using a Micro 3D printer
		    		if not self._settings.get_boolean(["UsingADifferentPrinter"]) :
					self._printer.register_callback(self)
			
				# Send response
				if error :
					return flask.jsonify(dict(value = "Error"))
				else :
					return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if value is to close an OctoPrint instance
			elif data["value"].startswith("Close OctoPrint Instance:") :
			
				# Get port
				port = int(data["value"][26 :])
				
				# Check if attempting to close initial OctoPrint instance
				if port == 5000 :
				
					# Return error
					return flask.jsonify(dict(value = "Error"))
				
				# Find all OctoPrint instances
				for process in psutil.process_iter() :
					if process.name().lower().startswith("octoprint") or process.name().lower().startswith("python") :
						
						# Check if process has the specified port
						processDetails = psutil.Process(process.pid)
						processPort = self.getListenPort(processDetails)
						if processPort is not None and port == processPort :
						
							# Terminate process
							processDetails.terminate()
							
							# Break
							break
				
				# Return response
				return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if value is to create an OctoPrint instance
			elif data["value"] == "Create OctoPrint Instance" :
			
				# Go through all ports
				port = 5000
				while True :
				
					# Check if port is open
					if self.isPortOpen(port) :
					
						# Break
						break
					
					# Check if at last port
					if port == 9999 :
				
						# Send response
						return flask.jsonify(dict(value = "Error"))
			
					# Try next port
					port += 1
			
				# Create config file
				shutil.copyfile(self._settings.global_get_basefolder("base").replace('\\', '/') + "/config.yaml", self._settings.global_get_basefolder("base").replace('\\', '/') + "/config.yaml" + str(port))
				
				# Create instance
				if octoprint.__version__ == "0+unknown" or tuple(map(int, (octoprint.__version__.split(".")))) >= tuple(map(int, ("1.3.0".split(".")))) :
					subprocess.Popen([sys.executable.replace('\\', '/'), "-c", "import octoprint;octoprint.main()", "serve", "--port", str(port), "--config", self._settings.global_get_basefolder("base").replace('\\', '/') + "/config.yaml" + str(port)])
				else :
					subprocess.Popen([sys.executable.replace('\\', '/'), "-c", "import octoprint;octoprint.main()", "--port", str(port), "--config", self._settings.global_get_basefolder("base").replace('\\', '/') + "/config.yaml" + str(port)])
				
				# Send response
				return flask.jsonify(dict(value = "OK", port = port))
			
			# Otherwise check if value is to set printer color
			elif data["value"].startswith("Set Printer Color:") :
			
				# Get color
				color = data["value"][19 :]
				
				# Check if color is valid
				if color == "Black" or color == "White" or color == "Blue" or color == "Green" or color == "Orange" or color == "Clear" or color == "Silver" or color == "Purple" :
				
					# Set setting
					self._settings.set(["PrinterColor"], color)
					
					# Return response
					return flask.jsonify(dict(value = "OK"))
				
				# Return response
				return flask.jsonify(dict(value = "Error"))
			
			# Otherwise check if value is to set filament color
			elif data["value"].startswith("Set Filament Color:") :
			
				# Get color
				color = data["value"][20 :]
				
				# Check if color is valid
				if color == "White" or color == "Pink" or color == "Red" or color == "Orange" or color == "Yellow" or color == "Green" or color == "Light Blue" or color == "Blue" or color == "Purple" or color == "Black" :
				
					# Set setting
					self._settings.set(["FilamentColor"], color)
					
					# Return response
					return flask.jsonify(dict(value = "OK"))
				
				# Return response
				return flask.jsonify(dict(value = "Error"))
			
			# Otherwise check if parameter is print settings
			elif data["value"].startswith("Print Settings:") :
			
				# Get values
				values = json.loads(data["value"][16 :])
				
				# Set filament temperature, heatbed temperature, and type
				self._settings.set_int(["FilamentTemperature"], int(values["filamentTemperature"]))
				self._settings.set_int(["HeatbedTemperature"], int(values["heatbedTemperature"]))
				self._settings.set(["FilamentType"], str(values["filamentType"]))
				self._settings.set_boolean(["UseWaveBondingPreprocessor"], bool(values["useWaveBondingPreprocessor"]))
				
				# Save settings
				octoprint.settings.settings().save()
				
				# Return response
				return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to set mid-print filament change layers
			elif data["value"].startswith("Mid-Print Filament Change Layers:") :
				
				# Set mid-print filament change layers
				self._settings.set(["MidPrintFilamentChangeLayers"], data["value"][33 :])
				
				# Save settings
				octoprint.settings.settings().save()
			
			# Otherwise check if parameter is emergency stop
			elif data["value"] == "Emergency Stop" :
			
				# Check if printing or paused
				if self._printer.is_printing() or self._printer.is_paused() :
			
					# Stop printing
					self._printer.cancel_print()
			
				# Empty command queue
				self.emptyCommandQueue()
				
				# Set first line number to zero and clear history
				if self._printer._comm is not None :
					self._printer._comm._gcode_M110_sending("N0")
					self._printer._comm._long_running_command = True
				
				# Clear sent commands
				self.sentCommands = {}
				self.resetLineNumberCommandSent = False
				self.numberWrapCounter = 0
			
				# Send emergency stop immediately to the printer
				if isinstance(self._printer.get_transport(), serial.Serial) :
					self._printer.get_transport().write("M0")
			
			# Otherwise check if parameter is ping
			elif data["value"] == "Ping" :
			
				# Check if paused
				if self._printer.is_paused() :
				
					# Send command to keep printer from being inactive for too long
					self._printer.commands("G4")
				
				# Return response
				return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to reconnect
			elif data["value"] == "Reconnect" :
			
				# Check if connection was saved
				if hasattr(self, "savedCurrentPort") and self.savedCurrentPort is not None and hasattr(self, "savedCurrentBaudrate") and self.savedCurrentBaudrate is not None and hasattr(self, "savedCurrentProfile") and self.savedCurrentProfile is not None :
				
					# Re-connect
					self._printer.connect(self.savedCurrentPort, self.savedCurrentBaudrate, self.savedCurrentProfile)
					
					# Remove saved connection
					self.savedCurrentPort = None
					self.savedCurrentBaudrate = None
					self.savedCurrentProfile = None
					
					# Wait until connection is established
					while not isinstance(self._printer.get_transport(), serial.Serial) :
						time.sleep(0.01)
				
					# Remove serial timeout
					self._printer.get_transport().timeout = None
					if float(serial.VERSION) < 3 :
						self._printer.get_transport().writeTimeout = None
					else :
						self._printer.get_transport().write_timeout = None
			
			# Otherwise check if parameter is to pause
			elif data["value"] == "Pause" :
			
				# Send pause command
				self._printer.commands("M25")
			
			# Otherwise check if parameter is to resume
			elif data["value"] == "Resume" :
			
				# Send resume command
				self._printer.commands("M24")
			
			# Otherwise check if parameter is to get print information
			elif data["value"] == "Print Information" :
			
				# Return print information
				return flask.jsonify(dict(value = "OK", maxXLow = self.maxXExtruderLow, maxXMedium = self.maxXExtruderMedium, maxXHigh = self.maxXExtruderHigh, maxYLow = self.maxYExtruderLow, maxYMedium = self.maxYExtruderMedium, maxYHigh = self.maxYExtruderHigh, maxZ = self.maxZExtruder, minXLow = self.minXExtruderLow, minXMedium = self.minXExtruderMedium, minXHigh = self.minXExtruderHigh, minYLow = self.minYExtruderLow, minYMedium = self.minYExtruderMedium, minYHigh = self.minYExtruderHigh, minZ = self.minZExtruder))
			
			# Otherwise check if parameter is starting print
			elif data["value"] == "Starting Print" :
			
				# Empty command queue
				self.emptyCommandQueue()
				
				# Set first line number to zero and clear history
				if self._printer._comm is not None :
					self._printer._comm._gcode_M110_sending("N0")
					self._printer._comm._long_running_command = True
				
				# Clear sent commands
				self.sentCommands = {}
				self.resetLineNumberCommandSent = False
				self.numberWrapCounter = 0
		
		# Otherwise check if command is a file
		elif command == "file" :
		
			# Initialize variables
			error = False
			encryptedRom = ''
			
			# Disable printer callbacks
			self._printer.unregister_callback(self)
			
			# Get current printer connection state
			currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
			
			# Set baudrate if invalid
			if not currentBaudrate or currentBaudrate == 0 :
				currentBaudrate = 115200
			
			# Remove firmware name
			if ' ' in data["name"] :
				data["name"] = data["name"][data["name"].find(' ') + 1 :]
			
			# Check if rom version is valid ROM version
			if len(data["name"]) >= 10 and data["name"][0 : 10].isdigit() :
			
				# Save ports
				self.savePorts(currentPort)
				
				# Switch into bootloader mode
				self.sendCommands("M115 S628")
				time.sleep(1)
				
				# Set updated port
				currentPort = self.getPort()
				
				# Return error if printer wasn't found
				if currentPort is None :
					return flask.jsonify(dict(value = "Error"))
			
				# Connect to the printer
				connection = serial.Serial(currentPort, currentBaudrate)
				
				# Get encrypted rom from unicode content
				for character in data["content"] :
					encryptedRom += chr(ord(character))
				
				# Check if getting EEPROM failed
				if not self.getEeprom(connection) :
			
					# Set error
					error = True
			
				# Otherwise
				else :
				
					# Check if updating firmware failed
					if not self.updateFirmware(connection, encryptedRom, int(data["name"][0 : 10])) :
				
						# Set error
						error = True
					
					# Otherwise
					else :
					
						# Clear EEPROM
						self.eeprom = None
				
				# Close connection
				connection.close()
				
				# Save connection
				self.savedCurrentPort = currentPort
				self.savedCurrentBaudrate = currentBaudrate
				self.savedCurrentProfile = currentProfile
			
			# Otherwise
			else :
		
				# Set error
				error = True
			
			# Enable printer callbacks if using a Micro 3D printer
		    	if not self._settings.get_boolean(["UsingADifferentPrinter"]) :
				self._printer.register_callback(self)
			
			# Send response
			if error :
				return flask.jsonify(dict(value = "Error"))
			else :
				return flask.jsonify(dict(value = "OK"))
	
	# Write to log
	def writeToLog(self, data) :
	
		# Acquire lock
		self.fileLock.acquire()
		
		# Write to log
		output = open(self.get_plugin_data_folder().replace('\\', '/') + "/log.txt", "ab+")
		output.write(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f") + " - " + data.rstrip() + '\n')
		output.close()
		
		# Release lock
		self.fileLock.release()
	
	# Erase log files
	def eraseLogFiles(self) :
	
		# Set file location
		logLocation = self.get_plugin_data_folder().replace('\\', '/') + "/log.txt"
		zipLocation = self.get_plugin_data_folder().replace('\\', '/') + "/log.zip"
		
		# Acquire lock
		self.fileLock.acquire()
		
		# Remove log file if it exists
		if os.path.isfile(logLocation) :
			os.remove(logLocation)
		
		# Release lock
		self.fileLock.release()
		
		# Remove zip file if it exists
		if os.path.isfile(zipLocation) :
			os.remove(zipLocation)
	
	# Write to EEPROM
	def writeToEeprom(self, connection, address, data) :
	
		# Send write to EEPROM request
		connection.write('U')
		connection.write(chr((address >> 8) & 0xFF))
		connection.write(chr(address & 0xFF))
		connection.write(chr((len(data) >> 8) & 0xFF))
		connection.write(chr(len(data) & 0xFF))
	
		# Send data
		for character in data :
			connection.write(character)
		
		# Return if write was successful
		return connection.read() == '\r'
	
	# Get EEPROM
	def getEeprom(self, connection, send = False) :
	
		# Request EEPROM
		connection.write('S')

		# Get response
		self.eeprom = connection.read(0x301)
	
		# Check if EEPROM wasn't read successfully
		if self.eeprom[-1] != '\r' :
		
			# Don't save response
			self.eeprom = None
	
			# Return false
			return False
		
		# Remove newline character from end of EEPROM
		self.eeprom = self.eeprom[:-1]
		
		# Check if sending
		if send :
		
			# Send EEPROM
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "EEPROM", eeprom = self.eeprom.encode("hex").upper()))
			
			# Get firmware details
			firmwareName, firmwareVersion, firmwareRelease = self.getFirmwareDetails()
			
			# Send firmware details
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Current Firmware", name = firmwareName, release = firmwareRelease))
		
		# Get serial number from EEPROM
		serialNumber = self.eeprom[self.eepromOffsets["serialNumber"]["offset"] : self.eepromOffsets["serialNumber"]["offset"] + self.eepromOffsets["serialNumber"]["bytes"] - 1]
		
		# Send printer details
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Printer Details", serialNumber = serialNumber, serialPort = connection.port))
		
		# Return true
		return True
	
	# Update to provided firmware
	def updateToProvidedFirmware(self, connection, firmwareName) :
	
		# Return if firmware was updated successfully
		encryptedRom = open(self._basefolder.replace('\\', '/') + "/static/files/" + self.providedFirmwares[firmwareName]["File"], "rb")
		return self.updateFirmware(connection, encryptedRom.read(), int(self.providedFirmwares[firmwareName]["Version"]))
	
	# Update firmware
	def updateFirmware(self, connection, encryptedRom, romVersion) :
	
		# Initialize variables
		error = False
		temp = ''
		decryptedRom = ''
		oldChipCrc = 0
		newChipCrc = 0
		eepromCrc = 0
		
		# Check if rom isn't encrypted
		if encryptedRom[0] == '\x0C' or encryptedRom[0] == '\xFD' :
	
			# Go through the ROM
			index = 0
			while index < len(encryptedRom) :
		
				# Check if padding wasn't required
				if index % 2 != 0 or index != len(encryptedRom) - 1 :
			
					# Encrypt the ROM
					if index % 2 :
						temp += chr(self.romEncryptionTable[int(ord(encryptedRom[index - 1]))])
					else :
				
						temp += chr(self.romEncryptionTable[int(ord(encryptedRom[index + 1]))])
				
				# Increment index
				index += 1
		
			# Set encrypted ROM
			encryptedRom = temp
	
		# Check if rom isn't too big
		if len(encryptedRom) <= self.chipTotalMemory :
		
			# Request current CRC from chip
			connection.write('C')
			connection.write('A')

			# Get response
			response = connection.read(4)

			# Get chip CRC
			index = 0
			while index < 4 :
				oldChipCrc <<= 8
				oldChipCrc += int(ord(response[index]))
				index += 1
		
			# Request that chip be erased
			connection.write('E')
		
			# Check if chip was erased successfully
			if connection.read() == '\r' :
		
				# Send address zero
				connection.write('A')
				connection.write('\x00')
				connection.write('\x00')

				# Check if address was acknowledged
				if connection.read() == '\r' :
		
					# Set pages to write
					pagesToWrite = len(encryptedRom) / 2 / self.chipPageSize
					if len(encryptedRom) / 2 % self.chipPageSize != 0 :
						pagesToWrite += 1

					# Go through all pages to write
					index = 0
					while index < pagesToWrite :

						# Send write to page request
						connection.write('B')
						connection.write(chr((self.chipPageSize * 2 >> 8) & 0xFF))
						connection.write(chr((self.chipPageSize * 2) & 0xFF))

						# Go through all values for the page
						pageAddress = 0
						while pageAddress < self.chipPageSize * 2 :

							# Check if data to be written exists
							position = pageAddress + self.chipPageSize * index * 2
							if position < len(encryptedRom) :
			
								# Send value
								if position % 2 == 0 :
									connection.write(encryptedRom[position + 1])
								else :
									connection.write(encryptedRom[position - 1])

							# Otherwise
							else :

								# Send padding
								connection.write(chr(self.romEncryptionTable[0xFF]))
			
							# Increment page address
							pageAddress += 1

						# Check if chip failed to be flashed
						if connection.read() != '\r' :
				
							# Set error
							error = True
							break
		
						# Increment index
						index += 1
			
					# Check if chip was successfully flashed
					if not error :
			
						# Send address zero
						connection.write('A')
						connection.write('\x00')
						connection.write('\x00')

						# Check if address was acknowledged
						if connection.read() == '\r' :
						
							# Request new CRC from chip
							connection.write('C')
							connection.write('A')

							# Get response
							response = connection.read(4)

							# Get chip CRC
							index = 0
							while index < 4 :
								newChipCrc <<= 8
								newChipCrc += int(ord(response[index]))
								index += 1
						
							# Decrypt the ROM
							index = 0
							while index < self.chipTotalMemory :

								# Check if data exists in the ROM
								if index < len(encryptedRom) :

									# Check if padding is required
									if index % 2 == 0 and index == len(encryptedRom) - 1 :

										# Put padding
										decryptedRom += '\xFF'

									# Otherwise
									else :

										# Decrypt the ROM
										if index % 2 == 0 :
											decryptedRom += chr(self.romDecryptionTable[int(ord(encryptedRom[index + 1]))])
										else :
											decryptedRom += chr(self.romDecryptionTable[int(ord(encryptedRom[index - 1]))])

								# Otherwise
								else :

									# Put padding
									decryptedRom += '\xFF'

								# Increment index
								index += 1

							# Get ROM CRC
							romCrc = binascii.crc32(decryptedRom) & 0xFFFFFFFF
					
							# Check if firmware update was successful
							if newChipCrc == struct.unpack("<I", struct.pack(">I", romCrc))[0] :
					
								# Get firmware CRC from EEPROM
								index = 0
								while index < 4 :
									eepromCrc <<= 8
									eepromCrc += int(ord(self.eeprom[self.eepromOffsets["firmwareCrc"]["offset"] + index]))
									index += 1
					
								# Check if Z state wasn't saved or previous firmware was corrupt
								if self.eeprom[self.eepromOffsets["savedZState"]["offset"]] == '\x00' or oldChipCrc != eepromCrc :
						
									# Go through bytes of last recorded Z value
									index = 0
									while index < 4 :

										# Check if zeroing out last recorded Z value in EEPROM failed
										if not error and not self.writeToEeprom(connection, self.eepromOffsets["lastRecordedZValue"]["offset"] + index, '\x00') :
								
											# Set error
											error = True
							
										# Increment index
										index += 1
						
								# Go through bytes of all steps per MM sections
								index = 0
								while index < 16 :
						
									# Check if zeroing out steps per MM in EEPROM failed
									if not error and not self.writeToEeprom(connection, self.eepromOffsets["xAxisStepsPerMm"]["offset"] + index, '\x00') :
							
										# Set error
										error = True
							
									# Increment index
									index += 1

								# Go through bytes of firmware version
								index = 0
								while index < 4 :
						
									# Check if updating firmware version in EEPROM failed
									if not error and not self.writeToEeprom(connection, self.eepromOffsets["firmwareVersion"]["offset"] + index, chr((romVersion >> 8 * index) & 0xFF)) :
							
										# Set error
										error = True
							
									# Increment index
									index += 1

								# Go through bytes of firmware CRC
								index = 0
								while index < 4 :
						
									# Check if updating firmware CRC in EEPROM failed
									if not error and not self.writeToEeprom(connection, self.eepromOffsets["firmwareCrc"]["offset"] + index, chr((romCrc >> 8 * index) & 0xFF)) :
							
										# Set error
										error = True
							
									# Increment index
									index += 1
					
							# Otherwise
							else :
						
								# Set error
								error = True
				
						# Otherwise
						else :
				
							# Set error
							error = True
		
				# Otherwise
				else :
		
					# Set error
					error = True
	
			# Otherwise
			else :
	
				# Set error
				error = True
		
		# Otherwise
		else :

			# Set error
			error = True
		
		# Return false if an error occured
		if error :
			return False
		
		# Return true
		return True
	
	# Set fan
	def setFan(self, connection, name) :
	
		# Clear error
		error = False
	
		# Set fan type, offset, and scale based on name
		if name == "HengLiXin" :
			fanType = 1
			fanOffset = 200
			fanScale = 0.2165354
		
		elif name == "Listener" :
			fanType = 2
			fanOffset = 145
			fanScale = 0.3333333
		
		elif name == "Shenzhew" :
			fanType = 3
			fanOffset = 82
			fanScale = 0.3843137
		
		elif name == "Xinyujie" :
			fanType = 4
			fanOffset = 200
			fanScale = 0.2165354
		
		else :
			return False
		
		# Get current fan type, offset, and scale from EEPROM
		currentFanType = int(ord(self.eeprom[self.eepromOffsets["fanType"]["offset"]]))
		currentFanOffset = int(ord(self.eeprom[self.eepromOffsets["fanOffset"]["offset"]]))
		data = [int(ord(self.eeprom[self.eepromOffsets["fanScale"]["offset"]])), int(ord(self.eeprom[self.eepromOffsets["fanScale"]["offset"] + 1])), int(ord(self.eeprom[self.eepromOffsets["fanScale"]["offset"] + 2])), int(ord(self.eeprom[self.eepromOffsets["fanScale"]["offset"] + 3]))]
		bytes = struct.pack("4B", *data)
		currentFanScale = round(struct.unpack('f', bytes)[0], 6)
		
		# Check if fan scales differ
		if currentFanScale != round(fanScale, 6) :
		
			# Convert fan scale to binary
			packed = struct.pack('f', fanScale)
			fanScale = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
		
			# Go through all fan scale values
			index = 0
			while index < 4 :
		
				# Check if saving fan scale failed
				if not error and not self.writeToEeprom(connection, self.eepromOffsets["fanScale"]["offset"] + index, chr((fanScale >> 8 * index) & 0xFF)) :
		
					# Set error
					error = True
			
				# Increment index
				index += 1
		
		# Check if fan offsets differ
		if not error and currentFanOffset != fanOffset :
		
			# Check if saving fan offset failed
			if not self.writeToEeprom(connection, self.eepromOffsets["fanOffset"]["offset"], chr(fanOffset)) :
	
				# Set error
				error = True
		
		# Check if fan types differ
		if not error and currentFanType != fanType :
		
			# Check if saving fan type failed
			if not self.writeToEeprom(connection, self.eepromOffsets["fanType"]["offset"], chr(fanType)) :
	
				# Set error
				error = True
	
		# Return false if an error occured
		if error :
			return False
		
		# Return true
		return True
	
	# Set extruder current
	def setExtruderCurrent(self, connection, value) :
	
		# Check if extruder current values differ
		if int(ord(self.eeprom[self.eepromOffsets["extruderCurrent"]["offset"]])) + (int(ord(self.eeprom[self.eepromOffsets["extruderCurrent"]["offset"] + 1])) << 8) != value :
	
			# Check if saving extruder current failed
			if not self.writeToEeprom(connection, self.eepromOffsets["extruderCurrent"]["offset"], chr(value & 0xFF)) or not self.writeToEeprom(connection, self.eepromOffsets["extruderCurrent"]["offset"] + 1, chr((value >> 8) & 0xFF)) :
				
				# Return false
				return False
		
		# Return true
		return True
	
	# Send command
	def sendCommands(self, commands) :
		
		# Check if printing and communication layer is established
		if self._printer.is_printing() and self._printer._comm is not None :
		
			# Make sure commands is a list
			if not isinstance(commands, list) :
				commands = [commands]
		
			# Append all currently queued commands to list
			while not self._printer._comm._send_queue.empty() :
				command = self._printer._comm._send_queue.get()
				commands += [(command[0], command[2])]
			
			while not self._printer._comm._commandQueue.empty() :
				command = self._printer._comm._commandQueue.get()
				commands += [(command[0], command[1])]
			
			# Insert list into queue
			for command in commands :
				if isinstance(command, tuple) :
					self._printer._comm._commandQueue.put(command)
				else :
					self._printer._comm._commandQueue.put((command, None))
		
		# Otherwise
		else :
		
			# Send commands to printer
			self._printer.commands(commands)
	
	# Send commands with line numbers
	def sendCommandsWithLineNumbers(self, commands) :
	
		# Initialize line number
		lineNumber = 1
		self.sendCommands("N0 M110")
	
		# Go through all commands
		for command in commands :
	
			# Check if command provides feedback
			if command == "M114" or command == "M117" or command.startswith("M618 ") or command.startswith("M619 ") :
		
				# Send command to printer
				self.sendCommands(command)
		
			# Otherwise
			else :
		
				# Send command with line number to printer
				self.sendCommands('N' + str(lineNumber) + ' ' + command)
		
				# Increment line number
				lineNumber += 1
	
	# Empty command queue
	def emptyCommandQueue(self) :
	
		# Check if communication layer has been established
		if self._printer._comm is not None :
		
			# Empty command queues
			while not self._printer._comm._send_queue.empty() :
				self._printer._comm._send_queue.get()
		
			while not self._printer._comm._commandQueue.empty() :
				self._printer._comm._commandQueue.get()
	
	# Process write
	def processWrite(self, data) :
	
		# Log sent data
		if self._settings.get_boolean(["LogSentReceivedData"]) :
			self.writeToLog("Original Sent: " + data)
	
		# Check if printing
		if self._printer.is_printing() :
			
			# Check if using on the fly pre-processing
			if self._settings.get_boolean(["PreprocessOnTheFly"]) :
	
				# Wait until pre-processing on the fly is ready or print is canceled
				while not self.preprocessOnTheFlyReady and self._printer.is_printing() :
				
					# Update communication timeout to prevent other commands from being sent
					if self._printer._comm is not None :
						self._printer._comm._gcode_G4_sent("G4")
					
					time.sleep(0.01)
				
				# Check if print was invalid
				if not self._printer.is_printing() :
				
					# Set command to emergency stop
					data = "M65537;stop"
		
		# Check if request is hard emergency stop
		if "M0" in data :
			
			# Check if printing or paused
			if self._printer.is_printing() or self._printer.is_paused() :
			
				# Stop printing
				self._printer.cancel_print()
			
			# Empty command queue
			self.emptyCommandQueue()
			
			# Set first line number to zero and clear history
			if self._printer._comm is not None :
				self._printer._comm._gcode_M110_sending("N0")
				self._printer._comm._long_running_command = True
			
			# Clear sent commands
			self.sentCommands = {}
			self.resetLineNumberCommandSent = False
			self.numberWrapCounter = 0
		
		# Otherwise check if request is soft emergency stop
		elif "M65537" in data :
		
			# Empty command queue
			self.emptyCommandQueue()
		
			# Set data to emergency stop
			data = "M0\n"
			
			# Wait until all sent commands have been processed
			while len(self.sentCommands) :
			
				# Update communication timeout to prevent other commands from being sent
				if self._printer._comm is not None :
					self._printer._comm._gcode_G4_sent("G4")
				
				time.sleep(0.01)
			
			# Check if printing or paused
			if self._printer.is_printing() or self._printer.is_paused() :
			
				# Stop printing
				self._printer.cancel_print()
			
			# Empty command queue
			self.emptyCommandQueue()
			
			# Set first line number to zero and clear history
			if self._printer._comm is not None :
				self._printer._comm._gcode_M110_sending("N0")
				self._printer._comm._long_running_command = True
			
			# Clear sent commands
			self.sentCommands = {}
			self.resetLineNumberCommandSent = False
			self.numberWrapCounter = 0
		
		# Check if request ends waiting for commands sent
		if "M65536" in data :
			
			# Set to wait for a wait response
			if self.waitingUntilCommandsSent :
				self.waitingUntilCommandsSent = None
			
			# Send fake acknowledgment
			self._printer.fake_ack()
		
		# Otherwise check if request is invalid
		elif (not self._printer.is_printing() and (data.startswith("N0 M110 N0") or data.startswith("M110"))) or data == "M21\n" or data == "M84\n" :
		
			# Send fake acknowledgment
			self._printer.fake_ack()
		
		# Otherwise
		else :
		
			# Check if pre-processing on the fly and command is not a starting line number and wasn't added on the fly
			if self._printer.is_printing() and self._settings.get_boolean(["PreprocessOnTheFly"]) and not data.startswith("N0 M110") and "**" not in data :
			
				# Get line number
				lineNumber = int(re.findall("^N(\d+)", data)[0])
				
				# Check if using shared library
				if self.sharedLibrary and self._settings.get_boolean(["UseSharedLibrary"]) :
				
					# Pre-process command
					commands = self.sharedLibrary.preprocess(ctypes.c_char_p(data), ctypes.c_char_p(None), ctypes.c_bool(False)).split(',')
				
				# Otherwise
				else :
				
					# Pre-process command
					commands = self.preprocess(data)
				
				# Check if pre-processed commands were returned
				if len(commands) and commands != [''] :
				
					# Set data to first pre-processed command
					data = 'N' + str(lineNumber) + ' ' + commands[0] + '\n'
			
					# Send the remaining pre-processed commands to the printer
					self.sendCommands(commands[1 :])
				
				# Otherwise
				else :
				
					# Set command to nothing
					data = 'N' + str(lineNumber) + " G4\n"
			
			# Check if command contains valid G-code
			gcode = Gcode()
			if gcode.parseLine(data) :
			
				# Check if using a heatbed
				if self.heatbedConnected :
				
					# Check if command is to set heatbed temperature
					if gcode.getValue('M') == "140" :
					
						# Send heatbed the specified temperature
						try :
							if gcode.hasValue('S') :
								temperature = gcode.getValue('S')
							else :
								temperature = "0"
							
							self.heatbedConnection.write("s " + temperature + '\r')
							self.showHeatbedTemperature = temperature != "0"
						
						except Exception :
							pass
						
						# Set command to nothing
						gcode.removeParameter('M')
						gcode.removeParameter('S')
						gcode.setValue('G', '4')
					
					# Otherwise check if command is to set heatbed temperature and wait
					elif gcode.getValue('M') == "190" :
					
						# Send heatbed the specified temperature
						error = False
						try :
							if gcode.hasValue('S') :
								temperature = gcode.getValue('S')
							else :
								temperature = "0"
							
							self.heatbedConnection.write("w " + temperature + '\r')
							self.showHeatbedTemperature = temperature != "0"
						
						except Exception :
							error = True
						
						# Check if no errors occured and communication layer has been established
						if not error and self._printer._comm is not None :
						
							# Set setting heatbed temperature
							self.settingHeatbedTemperature = True
						
							# Start processing temperature
							self._printer._comm._heating = True
							self._printer._comm._heatupWaitStartTime = time.time()
							
							# Loop forever
							readingTemperature = True
							while readingTemperature :
							
								# Read heatbed temperature
								heatbedTemperature = ''
								while len(heatbedTemperature) == 0 :
								
									# Read heatbed temperature until it stops
									try :
										heatbedTemperature = self.heatbedConnection.readline().strip()
										
										if heatbedTemperature == "ok" :
											readingTemperature = False
									except Exception :
										readingTemperature = False
										break
								
								# Check it not done
								if readingTemperature :
								
									# Display heatbed temperature
									if len(self._printer._comm.getTemp()) and self._printer._comm.getTemp()[0][0] is not None :
										command = "T:" + str(self._printer._comm.getTemp()[0][0]) + " B:" + heatbedTemperature
									else :
										command = "T:0.0 B:" + heatbedTemperature
								
									self._printer._comm._processTemperatures(command)
									self._printer._comm._callback.on_comm_temperature_update(self._printer._comm._temp, self._printer._comm._bedTemp)
									self._printer._addLog("Recv: " + command)
								
									# Update communication timeout to prevent other commands from being sent
									if self._printer._comm is not None :
										self._printer._comm._gcode_G4_sent("G4")
								
									# Delay
									time.sleep(1)
							
							# Clear setting heatbed temperature
							self.settingHeatbedTemperature = False
						
						# Set command to nothing
						gcode.removeParameter('M')
						gcode.removeParameter('S')
						gcode.setValue('G', '4')
			
				# Check if using a GPIO pin
				if self._settings.get_boolean(["UseGpio"]) :
			
					# Check if command is to set GPIO pin high
					if gcode.getValue('M') == "106" and gcode.getValue('T') == '1' :
				
						# Set GPIO pin high
						self.setGpioPinHigh()
						
						# Set command to nothing
						gcode.removeParameter('M')
						gcode.removeParameter('T')
						gcode.setValue('G', '4')
					
					# Check if command is to set GPIO pin low
					elif gcode.getValue('M') == "107" and gcode.getValue('T') == '1' :
					
						# Set GPIO pin low
						self.setGpioPinLow()
						
						# Set command to nothing
						gcode.removeParameter('M')
						gcode.removeParameter('T')
						gcode.setValue('G', '4')
				
				# Check if pause command
				if gcode.getValue('M') == "25" :
				
					# Check if printing
					if self._printer.is_printing() :
					
						# Wait until all sent commands have been processed
						while len(self.sentCommands) :
			
							# Update communication timeout to prevent other commands from being sent
							if self._printer._comm is not None :
								self._printer._comm._gcode_G4_sent("G4")
				
							time.sleep(0.01)
						
						# Pause print
						if self._printer._comm is not None :
							self._printer._comm.setPause(True)
						
						# Empty command queue
						self.emptyCommandQueue()
			
						# Set first line number to zero and clear history
						if self._printer._comm is not None :
							self._printer._comm._gcode_M110_sending("N0")
							self._printer._comm._long_running_command = True
			
						# Clear sent commands
						self.sentCommands = {}
						self.resetLineNumberCommandSent = False
						self.numberWrapCounter = 0
					
					# Set command to nothing
					gcode.removeParameter('M')
					gcode.setValue('G', '4')
				
				# Check if resume command
				elif gcode.getValue('M') == "24" :
				
					# Check if paused
					if self._printer.is_paused() :
					
						# Empty command queue
						self.emptyCommandQueue()
				
						# Set first line number to zero and clear history
						if self._printer._comm is not None :
							self._printer._comm._gcode_M110_sending("N0")
							self._printer._comm._long_running_command = True
				
						# Clear sent commands
						self.sentCommands = {}
						self.resetLineNumberCommandSent = False
						self.numberWrapCounter = 0
					
						# Resume print
						if self._printer._comm is not None :
							self._printer._comm.setPause(False)
						
						# Restart line numbers
						self.sendCommands(["N0 M110", "G90"])
						if self._printer._comm is not None :
							self._printer._comm._gcode_M110_sending("N1")
							self._printer._comm._long_running_command = True
					
					# Set command to nothing
					gcode.removeParameter('M')
					gcode.setValue('G', '4')
				
				# Otherwise check if change filament mid-print command
				elif gcode.getValue('M') == "600" :
				
					# Set command to nothing
					gcode.removeParameter('M')
					gcode.setValue('G', '4')
				
					# Check if printing
					if self._printer.is_printing() :
					
						# Send message
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Mid-Print Filament Change"))
						
						# Set command to delay for half a second
						gcode.setValue('P', "500")
						
						# Update communication timeout
						if self._printer._comm is not None :
							self._printer._comm._gcode_G4_sent("G4 P500")
				
				# Get the command's binary representation
				data = gcode.getBinary()
				
				# Log sent data
				if self._settings.get_boolean(["LogSentReceivedData"]) :
					self.writeToLog("Processed Sent: " + gcode.getAscii())
				
				# Check if command has a line number
				if gcode.hasValue('N') :
			
					# Limit the amount of commands that can simultaneous be sent to the printer
					while len(self.sentCommands) :
				
						# Update communication timeout to prevent other commands from being sent
						if self._printer._comm is not None :
							self._printer._comm._gcode_G4_sent("G4")
					
						time.sleep(0.01)
					
					# Get line number
					lineNumber = int(gcode.getValue('N'))
					
					# Set last line number sent
					self.lastLineNumberSent = lineNumber
		
					# Check if command contains a starting line number
					if lineNumber == 0 and gcode.getValue('M') == "110" :
				
						# Set reset line number command sent
						self.resetLineNumberCommandSent = True
					
					# Store command
					self.sentCommands[lineNumber % 0x10000] = data
			
			# Set long running command to prevent force sending commands
			if self._printer._comm is not None :
				self._printer._comm._long_running_command = True
			
			# Set last command sent
			self.lastCommandSent = data
			
			# Send command to printer
			self.originalWrite(data)
	
	# Process read
	def processRead(self) :
	
		# Get response
		response = self.originalRead()
		
		# Log received data
		if self._settings.get_boolean(["LogSentReceivedData"]) :
			self.writeToLog("Original Response: " + response)
		
		# Check if setting heatbed temperature
		if self.settingHeatbedTemperature :
	
			# Clear response
			response = ''
		
		# Check if response is wait
		if response.startswith("wait") :
		
			# Check if last response wasn't wait
			if not self.lastResponseWasWait :
		
				# Set last response was wait
				self.lastResponseWasWait = True
		
			# Otherwise
			else :
			
				# Check if printing
				if self._printer.is_printing() :
				
					# Set response
					response = "rs\n"
				
				# Otherwise
				else :
		
					# Clear response
					response = ''
			
				# Send message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Duplicate Wait"))
			
			# Check if waiting for a wait response
			if self.waitingUntilCommandsSent is None :
			
				# Clear waiting until commands sent
				self.waitingUntilCommandsSent = False
			
				# Send message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Done Waiting"))
			
			# Check if waiting for a command to be processed
			if self.lastLineNumberSent is not None and self.lastLineNumberSent % 0x10000 in self.sentCommands :
			
				# Set response to resending command
				response = "rs " + str(self.lastLineNumberSent) + '\n'
		
		# Otherwise
		else :
		
			# Clear last response was wait
			self.lastResponseWasWait = False
		
		# Log received data
		if self._settings.get_boolean(["LogSentReceivedData"]) :
			self.writeToLog("Processed Response: " + response)
		
		# Check if response is a temperature reading
		if response.startswith("T:") :
		
			# Isolate temperature
			response = response.split(' ')[0] + '\n'
			
			# Check if using a heatbed
			if self.heatbedConnected :
			
				# Check if heatbed temperature isn't set
				if not self.showHeatbedTemperature :
				
					# Set temperature to 0
					heatbedTemperature = "0"
				
				else :
					
					# Read heatbed temperature
					heatbedTemperature = ''
					while len(heatbedTemperature) == 0 :
					
						try :
							self.heatbedConnection.write("t\r")
							heatbedTemperature = self.heatbedConnection.readline().strip()
		
						except Exception :
							heatbedTemperature = "0"
				
				# Append heatbed temperature to to response
				response = response.strip() + " B:" + heatbedTemperature + '\n'
		
		# Otherwise check if response was a processed or skipped value
		elif (response.startswith("ok ") and response[3].isdigit()) or response.startswith("skip ") :
	
			# Get line number
			if response.startswith("ok ") : 
				lineNumber = int(response[3 :].split()[0]) % 0x10000
			else :
				lineNumber = int(response[5 :]) % 0x10000
			
			# Check if processing an unprocessed command
			if lineNumber in self.sentCommands :
			
				# Check if processing a reset line number command
				if self.resetLineNumberCommandSent and lineNumber == 0 :
			
					# Clear reset line number command sent
					self.resetLineNumberCommandSent = False
				
					# Reset number wrap counter
					self.numberWrapCounter = 0
				
				# Set response to contain adjusted line number
				response = "ok " + str(lineNumber + self.numberWrapCounter * 0x10000) + '\n'
	
				# Increment number wrap counter if applicable
				if lineNumber == 0xFFFF :
					self.numberWrapCounter += 1
				
				# Remove stored command
				self.sentCommands.pop(lineNumber)
			
			# Otherwise
			else :
			
				# Clear response
				response = ''
		
		# Otherwise check if response was a resend value
		elif response.startswith("rs") :
		
			# Check if resending specified value
			if response.startswith("rs ") :
	
				# Get line number
				lineNumber = int(response[3 :]) % 0x10000
				
				# Check if command hasn't been processed
				if lineNumber in self.sentCommands :
	
					# Resend command
					self.originalWrite(self.sentCommands[lineNumber])
			
			# Otherwise
			else :
			
				# Send last command
				self.originalWrite(self.lastCommandSent)
			
			# Clear response
			response = ''
		
		# Otherwise check if response was an error code
		elif response.startswith("Error:") :

			# Set error response
			if response[6 : 10] == "1000" :
				response = "ok M110 without a line number\n"
			elif response[6 : 10] == "1001" :
				response = "ok Cannot cold extrude\n"
			elif response[6 : 10] == "1002" :
				response = "ok Cannot calibrate in an unknown state\n"
			elif response[6 : 10] == "1003" :
				response = "ok Unknown G-Code\n"
			elif response[6 : 10] == "1004" :
				response = "ok Unknown M-Code\n"
			elif response[6 : 10] == "1005" :
				response = "ok Unknown command\n"
			elif response[6 : 10] == "1006" :
				response = "ok Heater failed\n"
			elif response[6 : 10] == "1007" :
				response = "ok Move to large\n"
			elif response[6 : 10] == "1008" :
				response = "ok System has been inactive for too long, heater and motors have been turned off\n"
			elif response[6 : 10] == "1009" :
				response = "ok Target address out of range\n"
			elif response[6 : 10] == "1010" :
				response = "ok Command cannot run because micro motion chip encountered an error\n"
			elif response[6 : 10].isdigit() :
				response = "ok An error has occured\n"
			else :
				response = "ok " +  response[6 :]
			
			# Send message
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = response[3 : -1], confirm = True))
		
		# Return response
		return response
	
	# Restore files
	def restoreFiles(self) :
	
		# Check if slicer was changed
		if self.slicerChanges is not None :
		
			# Move original files back
			os.remove(self.slicerChanges.get("Slicer Profile Location"))
			shutil.copyfile(self.slicerChanges.get("Slicer Profile Temporary"), self.slicerChanges.get("Slicer Profile Location"))
			
			if "Model Temporary" in self.slicerChanges :
				os.remove(self.slicerChanges.get("Model Location"))
				shutil.copyfile(self.slicerChanges.get("Model Temporary"), self.slicerChanges.get("Model Location"))
		
			# Restore printer profile
			self._printer_profile_manager.save(self.slicerChanges.get("Printer Profile Content"), True)
			
			# Attempt to remove temporary files
			try :
				os.remove(self.slicerChanges.get("Slicer Profile Temporary"))
				
				if "Model Temporary" in self.slicerChanges :
					os.remove(self.slicerChanges.get("Model Temporary"))
			except Exception :
				pass
			
			# Clear slicer changes
			self.slicerChanges = None
	
	# Set file locations
	def setFileLocations(self) :
	
		# Check if rot running in a virtual environment and Pip isn't set
		if not hasattr(sys, "real_prefix") and (octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._pip_caller is None or not octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._pip_caller.available) and octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._settings.get(["pip"]) is None :
	
			# Set Pip locations
			pipLocations = []
			if platform.uname()[0].startswith("Windows") :
	
				pipLocations = [
					os.environ["SYSTEMDRIVE"] + "/python/Scripts/pip.exe"
				]
	
			elif platform.uname()[0].startswith("Darwin") :
	
				pipLocations = [
					"/Library/Frameworks/Python.framework/Versions/*/bin/pip"
				]
	
			elif platform.uname()[0].startswith("Linux") :
	
				pipLocations = [
					"/usr/bin/pip"
				]
	
			# Go through all Pip location
			for locations in pipLocations :
				for location in glob.glob(locations) :

					# Check if location is a file
					if os.path.isfile(location) :
		
						# Set Pip location
						octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._settings.set(["pip"], location)
						break
		
		# Check if Cura is a registered slicer
		if "cura" in self._slicing_manager.registered_slicers :
	
			# Check if Cura is not configured
			if not "cura" in self._slicing_manager.configured_slicers :
			
				# Set Cura Engine locations
				curaEngineLocations = []
				if platform.uname()[0].startswith("Windows") :
				
					curaEngineLocations = [
						os.environ["SYSTEMDRIVE"] + "/Program Files*/Cura_*/CuraEngine.exe",
						os.environ["SYSTEMDRIVE"] + "/Program Files*/M3D*/*/Resources/CuraEngine/CuraEngine.exe"
					]
				
				elif platform.uname()[0].startswith("Darwin") :
				
					curaEngineLocations = [
						"/Applications/Cura/Cura.app/Contents/Resources/CuraEngine",
						"/Applications/M3D.app/Contents/Resources/CuraEngine/CuraEngine"
					]
				
				elif platform.uname()[0].startswith("Linux") :
				
					curaEngineLocations = [
						"/usr/share/cura/CuraEngine",
						"/usr/local/bin/CuraEngine",
						"/usr/bin/CuraEngine",
						"/usr/local/bin/cura_engine"
					]
				
				# Go through all Cura Engine location
				for locations in curaEngineLocations :
					for location in glob.glob(locations) :
			
						# Check if location is a file
						if os.path.isfile(location) :
					
							# Set Cura Engine location
							self._slicing_manager.get_slicer("cura", False)._settings.set(["cura_engine"], location)
							break
	
	# Event monitor
	def on_event(self, event, payload) :
	
		# Check if printer is disconnected
		if event == octoprint.events.Events.DISCONNECTED :
		
			# Check if a Micro 3D is connected
			if not self.invalidPrinter :
		
				# Clear invalid printer
				self.invalidPrinter = True
				
				# Clear EEPROM
				self.eeprom = None
			
				# Clear original write and read
				self.originalWrite = None
				self.originalRead = None
			
				# Send printer status
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Micro 3D Not Connected"))
		
		# Otherwise check if client connects
		elif event == octoprint.events.Events.CLIENT_OPENED :
		
			# Send OctoPrint process details
			self.sendOctoPrintProcessDetails()
		
			# Send provided firmware versions
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Provided Firmwares", firmwares = self.providedFirmwares))
			
			# Check if shared library exists
			if self.sharedLibrary :
		
				# Show shared library options
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Using Shared Library"))
		
			# Otherwise
			else :
		
				# Hide shared library options
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Not Using Shared Library"))
			
			# Check if EEPROM was read and connection to the printer has been established
			if self.eeprom is not None and isinstance(self._printer.get_transport(), serial.Serial) :
			
				# Send eeprom
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "EEPROM", eeprom = self.eeprom.encode("hex").upper()))
				
				# Get firmware details
				firmwareName, firmwareVersion, firmwareRelease = self.getFirmwareDetails()
				
				# Send firmware details
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Current Firmware", name = firmwareName, release = firmwareRelease))
				
				# Get serial number from EEPROM
				serialNumber = self.eeprom[self.eepromOffsets["serialNumber"]["offset"] : self.eepromOffsets["serialNumber"]["offset"] + self.eepromOffsets["serialNumber"]["bytes"] - 1]
				
				# Send printer details
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Printer Details", serialNumber = serialNumber, serialPort = self._printer.get_transport().port))
			
			# Send message if a heatbed is detected
			if not self.heatbedConnected :
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Heatbed Not Detected"))
			else :
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Heatbed Detected"))
			
			# Send message about hosting camera
			try :
			
				if "pygame.camera" in sys.modules :
					pygame.camera.init()
					if len(pygame.camera.list_cameras()) :
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Camera Hostable", cameras = pygame.camera.list_cameras()))
				
				elif "QTKit" in sys.modules and len(QTKit.QTCaptureDevice.inputDevices()) :
					cameras = []
					for camera in QTKit.QTCaptureDevice.inputDevices() :
						cameras += [str(camera)]
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Camera Hostable", cameras = cameras))
				
				else :
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Camera Not Hostable"))
					
			except Exception :
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Camera Not Hostable"))
			
			# Set file locations
			self.setFileLocations()
			
			# Send message for enabling/disabling GPIO
			if self._settings.get_boolean(["UseGpio"]) and self._settings.get_int(["GpioPin"]) is not None and self._settings.get_int(["GpioLayer"]) is not None :
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Enable GPIO"))
			else :
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Disable GPIO"))
			
			# Check if sending Cura reminder
			if self.curaReminder :
			
				# Check if Cura is not configured
				if not "cura" in self._slicing_manager.configured_slicers :
			
					# Send message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Cura Not Installed"))
			
			# Check if Cura is configured
			if "cura" in self._slicing_manager.configured_slicers :
	
				# Set Cura profile location and destination
				profileLocation = self._basefolder.replace('\\', '/') + "/static/profiles/"
				profileDestination = self._slicing_manager.get_slicer_profile_path("cura").replace('\\', '/') + '/'
				
				# Remove deprecated profiles
				for profile in glob.glob(profileDestination + "m3d_*mm.profile") :
					os.remove(profile)
	
				# Go through all Cura profiles
				for profile in os.listdir(profileLocation) :
		
					# Set profile version, identifier, and name
					profileIdentifier = profile[0 : profile.find('.')]
					profileName = self._slicing_manager.get_profile_path("cura", profileIdentifier)[len(profileDestination) :].lower()
		
					# Save Cura profile as OctoPrint profile
					self.convertCuraToProfile(profileLocation + profile, profileDestination + profileName, profileName, profileIdentifier, "Imported by M3D Fio on " + time.strftime("%Y-%m-%d %H:%M"))
			
			# Check if sending sleep reminder
			if not self._printer.is_printing() and not self._printer.is_paused() and self.sleepReminder :
			
				# Check if disabling sleep doesn't works
				if not self.disableSleep() :
				
					# Send message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Sleep Wont Disable"))
				
				# Enable sleep
				self.enableSleep()
		
		# Otherwise check if event is slicing started
		elif event == octoprint.events.Events.SLICING_STARTED :
		
			# Set processing slice
			self.processingSlice = True
		
		# Otherwise check if event is slicing done, cancelled, or failed
		elif event == octoprint.events.Events.SLICING_DONE or event == octoprint.events.Events.SLICING_CANCELLED or event == octoprint.events.Events.SLICING_FAILED :
		
			# Clear processing slice
			self.processingSlice = False
			
			# Restore files
			self.restoreFiles()
		
		# Otherwise check if a print is starting
		elif event == octoprint.events.Events.PRINT_STARTED :
		
			# Disable sleep
			self.disableSleep()
			
			# Erase log files
			self.eraseLogFiles()
		
			# Check if pre-processing on the fly
			if self._settings.get_boolean(["PreprocessOnTheFly"]) :
			
				# Reset pre-processor settings
				self.resetPreprocessorSettings()
			
			# Otherwise
			else :
		
				# Reset print settings
				self.resetPrintSettings()
			
			# Check if printing test border
			if payload.get("filename") == os.path.basename(self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "test border.gcode").replace('\\', '/')) :
	
				# Set printing test border
				self.printingTestBorder = True
	
			# Otherwise check if printing backlash calibration cylinder
			elif payload.get("filename") == os.path.basename(self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "backlash calibration cylinder.gcode").replace('\\', '/')) :
	
				# Set printing backlash calibration cylinder
				self.printingBacklashCalibrationCylinder = True
		
			# Check if pre-processing on the fly
			if self._settings.get_boolean(["PreprocessOnTheFly"]) :
			
				# Display message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Collecting print information"))
		
				# Check if using shared library
				if self.sharedLibrary and self._settings.get_boolean(["UseSharedLibrary"]) :
		
					# Reset pre-processor settings
					self.sharedLibrary.resetPreprocessorSettings()

					# Set values
					self.sharedLibrary.setBacklashX(ctypes.c_double(self._settings.get_float(["BacklashX"])))
					self.sharedLibrary.setBacklashY(ctypes.c_double(self._settings.get_float(["BacklashY"])))
					self.sharedLibrary.setBacklashSpeed(ctypes.c_double(self._settings.get_float(["BacklashSpeed"])))
					self.sharedLibrary.setBackRightOrientation(ctypes.c_double(self._settings.get_float(["BackRightOrientation"])))
					self.sharedLibrary.setBackLeftOrientation(ctypes.c_double(self._settings.get_float(["BackLeftOrientation"])))
					self.sharedLibrary.setFrontLeftOrientation(ctypes.c_double(self._settings.get_float(["FrontLeftOrientation"])))
					self.sharedLibrary.setFrontRightOrientation(ctypes.c_double(self._settings.get_float(["FrontRightOrientation"])))
					self.sharedLibrary.setBedHeightOffset(ctypes.c_double(self._settings.get_float(["BedHeightOffset"])))
					self.sharedLibrary.setBackRightOffset(ctypes.c_double(self._settings.get_float(["BackRightOffset"])))
					self.sharedLibrary.setBackLeftOffset(ctypes.c_double(self._settings.get_float(["BackLeftOffset"])))
					self.sharedLibrary.setFrontLeftOffset(ctypes.c_double(self._settings.get_float(["FrontLeftOffset"])))
					self.sharedLibrary.setFrontRightOffset(ctypes.c_double(self._settings.get_float(["FrontRightOffset"])))
					self.sharedLibrary.setFilamentTemperature(ctypes.c_ushort(self._settings.get_int(["FilamentTemperature"])))
					self.sharedLibrary.setFilamentType(ctypes.c_char_p(str(self._settings.get(["FilamentType"]))))
					self.sharedLibrary.setUseValidationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseValidationPreprocessor"])))
					self.sharedLibrary.setUsePreparationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UsePreparationPreprocessor"])))
					self.sharedLibrary.setUseWaveBondingPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseWaveBondingPreprocessor"])))
					self.sharedLibrary.setUseThermalBondingPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseThermalBondingPreprocessor"])))
					self.sharedLibrary.setUseBedCompensationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseBedCompensationPreprocessor"])))
					self.sharedLibrary.setUseBacklashCompensationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseBacklashCompensationPreprocessor"])))
					self.sharedLibrary.setUseCenterModelPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseCenterModelPreprocessor"])))
					self.sharedLibrary.setIgnorePrintDimensionLimitations(ctypes.c_bool(self._settings.get_boolean(["IgnorePrintDimensionLimitations"])))
					self.sharedLibrary.setUsingHeatbed(ctypes.c_bool(self.heatbedConnected))
					self.sharedLibrary.setPrintingTestBorder(ctypes.c_bool(self.printingTestBorder))
					self.sharedLibrary.setPrintingBacklashCalibrationCylinder(ctypes.c_bool(self.printingBacklashCalibrationCylinder))
					self.sharedLibrary.setPrinterColor(ctypes.c_char_p(self.printerColor))
					self.sharedLibrary.setCalibrateBeforePrint(ctypes.c_bool(self._settings.get_boolean(["CalibrateBeforePrint"])))
					self.sharedLibrary.setRemoveFanCommands(ctypes.c_bool(self._settings.get_boolean(["RemoveFanCommands"])))
					self.sharedLibrary.setRemoveTemperatureCommands(ctypes.c_bool(self._settings.get_boolean(["RemoveTemperatureCommands"])))
					self.sharedLibrary.setUseGpio(ctypes.c_bool(self._settings.get_boolean(["UseGpio"])))
					if self._settings.get_int(["GpioLayer"]) is not None :
						self.sharedLibrary.setGpioLayer(ctypes.c_ushort(self._settings.get_int(["GpioLayer"])))
					self.sharedLibrary.setHeatbedTemperature(ctypes.c_ushort(self._settings.get_int(["HeatbedTemperature"])))
					self.sharedLibrary.setExternalBedHeight(ctypes.c_double(self._settings.get_float(["ExternalBedHeight"])))
					self.sharedLibrary.setMidPrintFilamentChangeLayers(ctypes.c_char_p(' '.join(re.findall("\\d+", str(self._settings.get(["MidPrintFilamentChangeLayers"]))))))
					
					# Collect print information
					printIsValid = self.sharedLibrary.collectPrintInformation(ctypes.c_char_p(payload.get("file")))
					
					# Get extruder min and max movements
					self.maxXExtruderLow = self.sharedLibrary.getMaxXExtruderLow()
					self.maxXExtruderMedium = self.sharedLibrary.getMaxXExtruderMedium()
					self.maxXExtruderHigh = self.sharedLibrary.getMaxXExtruderHigh()
					self.maxYExtruderLow = self.sharedLibrary.getMaxYExtruderLow()
					self.maxYExtruderMedium = self.sharedLibrary.getMaxYExtruderMedium()
					self.maxYExtruderHigh = self.sharedLibrary.getMaxYExtruderHigh()
					self.maxZExtruder = self.sharedLibrary.getMaxZExtruder()
					self.minXExtruderLow = self.sharedLibrary.getMinXExtruderLow()
					self.minXExtruderMedium = self.sharedLibrary.getMinXExtruderMedium()
					self.minXExtruderHigh = self.sharedLibrary.getMinXExtruderHigh()
					self.minYExtruderLow = self.sharedLibrary.getMinYExtruderLow()
					self.minYExtruderMedium = self.sharedLibrary.getMinYExtruderMedium()
					self.minYExtruderHigh = self.sharedLibrary.getMinYExtruderHigh()
					self.minZExtruder = self.sharedLibrary.getMinZExtruder()
					
					# Get detected fan speed
					self.detectedFanSpeed = self.sharedLibrary.getDetectedFanSpeed()
					
					# Get detected mid-print filament change
					self.detectedMidPrintFilamentChange = self.sharedLibrary.getDetectedMidPrintFilamentChange()
					
					# Get object successfully centered
					self.objectSuccessfullyCentered = self.sharedLibrary.getObjectSuccessfullyCentered()
	
				# Otherwise
				else :
		
					# Collect print information
					printIsValid = self.collectPrintInformation(payload.get("file"))

				# Check if print goes out of bounds
				if not printIsValid :

					# Create message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "error", title = "Print failed", text = "Could not print the file. The dimensions of the model go outside the bounds of the printer."))
			
					# Stop printing
					self._printer.cancel_print()
				
				# Otherwise
				else :
				
					# Check if detected fan speed is 0
					if self.detectedFanSpeed == 0 :
				
						# Create message
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "notice", title = "Print warning", text = "No fan speed has been detected in this file which could cause the print to fail"))
					
					# Check if detected mid-print filament change
					if self.detectedMidPrintFilamentChange :
			
						# Create message
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "notice", title = "Print warning", text = "This file uses mid-print filament change commands. These commands will be ignored if a client is not connected when they are run, so it's recommended that you keep this page open and stay connected to the server for the entire duration of the print."))
					
					# Check if objected couldn't be centered
					if self._settings.get_boolean(["UseCenterModelPreprocessor"]) and not self.objectSuccessfullyCentered :
			
						# Create message
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "notice", title = "Print warning", text = "Object too large to center on print bed"))
				
				# Set pre-process on the fly ready
				self.preprocessOnTheFlyReady = True
				
				# Hide message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Hide Message"))
		
		# Otherwise check if a print is paused
		elif event == octoprint.events.Events.PRINT_PAUSED :
		
			# Enable sleep
			self.enableSleep()
		
		# Otherwise check if a print is resumed
		elif event == octoprint.events.Events.PRINT_RESUMED :
		
			# Disable sleep
			self.disableSleep()
		
		# Otherwise check if a print is done
		elif event == octoprint.events.Events.PRINT_DONE :
		
			# Empty command queue
			self.emptyCommandQueue()
			
			# Set first line number to zero and clear history
			if self._printer._comm is not None :
				self._printer._comm._gcode_M110_sending("N0")
				self._printer._comm._long_running_command = True
			
			# Clear sent commands
			self.sentCommands = {}
			self.resetLineNumberCommandSent = False
			self.numberWrapCounter = 0
		
			# Check if pre-processing on the fly
			if self._settings.get_boolean(["PreprocessOnTheFly"]) :
				
				# Check if using shared library
				if self.sharedLibrary and self._settings.get_boolean(["UseSharedLibrary"]) :
				
					# Pre-process command
					commands = self.sharedLibrary.preprocess(ctypes.c_char_p("G4"), ctypes.c_char_p(None), ctypes.c_bool(True)).split(',')
				
				# Otherwise
				else :
				
					# Pre-process command
					commands = self.preprocess("G4", None, True)
				
				# Send commands with line numbers
				self.sendCommandsWithLineNumbers(commands)
			
			# Reset print settings
			self.resetPrintSettings()
			
			# Clear pre-process on the fly ready
			self.preprocessOnTheFlyReady = False
			
			# Enable sleep
			self.enableSleep()
		
		# Otherwise check if a print failed
		elif event == octoprint.events.Events.PRINT_FAILED :
		
			# Empty command queue
			self.emptyCommandQueue()
			
			# Set first line number to zero and clear history
			if self._printer._comm is not None :
				self._printer._comm._gcode_M110_sending("N0")
				self._printer._comm._long_running_command = True
			
			# Clear sent commands
			self.sentCommands = {}
			self.resetLineNumberCommandSent = False
			self.numberWrapCounter = 0
			
			# Set commands
			commands = [
				"M107",
				"M104 S0",
				"M18"
			]
			
			if self.heatbedConnected :
				commands += ["M140 S0"]
				
			if self.printerColor == "Clear" :
				commands += ["M420 T20"]
			else :
				commands += ["M420 T100"]
			
			# Send commands with line numbers
			self.sendCommandsWithLineNumbers(commands)
			
			# Reset print settings
			self.resetPrintSettings()
			
			# Clear pre-process on the fly ready
			self.preprocessOnTheFlyReady = False
			
			# Enable sleep
			self.enableSleep()
	
	# Is port open
	def isPortOpen(self, port) :

		# Create socket
		socketConnection = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	
		# Try to open port
		try :
			socketConnection.bind(('', port))
	
		# Return false if an error occured
		except socket.error :
			return False
	
		# Return true
		return True
	
	# Get listen port
	def getListenPort(self, process) :
	
		# Attempt to get process's connections
		try :
			connections = process.connections()
		
		# Return none if process doesn't exist
		except Exception :
			return None
	
		# Go through all connections
		for connection in connections :
		
			# Check if listening on port and it's not the camera
			if connection.status == "LISTEN" and connection.laddr[1] != 4999 :
			
				# Return port
				return connection.laddr[1]
		
		# Return none
		return None
	
	# Send OctoPrint process details
	def sendOctoPrintProcessDetails(self) :
	
		# Initialize variables
		processes = []
		
		# Find all OctoPrint instances
		for process in psutil.process_iter() :
			if process.name().lower().startswith("octoprint") or process.name().lower().startswith("python") :
			
				# Check if process is listening on a port
				processPort = self.getListenPort(psutil.Process(process.pid))
				if processPort is not None :
			
					# Append process to list
					processes += [[processPort, os.getpid() == process.pid]]
		
		# Send OctoPrint instances
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Process Details", processes = processes))
	
	# Receive data to log
	def on_printer_add_log(self, data) :
	
		# Check if connection was just established
		if data.startswith("Send: ") and "M110" in data and (self._printer.get_state_string() == "Connecting" or self._printer.get_state_string() == "Detecting baudrate") :
		
			# Disable printer callbacks
			self._printer.unregister_callback(self)
			
			# Clear error
			error = False
		
			# Get current printer connection state
			currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
			
			# Automatic port detection
			if not currentPort or currentPort == "AUTO" :
				currentPort = self.getPort()
			
			# Automatic baudrate detection
			if not currentBaudrate or currentBaudrate == 0 :
				currentBaudrate = 115200
			
			# Close connection
			if self._printer._comm is not None :
			
				try :
					self._printer._comm.close(False, False)
				except TypeError :
					pass
			
			self._printer.disconnect()
			
			# Check if printer wasn't found
			if currentPort is None :
				
				# Send message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "No Micro 3D printer detected. Try cycling the printer's power and try again.", confirm = True))
			
			# Otherwise
			else :
			
				# Connect to the printer
				connection = serial.Serial(currentPort, currentBaudrate)
			
				# Attempt to get current printer mode
				try :
					connection.write("M115")
					bootloaderVersion = connection.read()
				
					if float(serial.VERSION) < 3 :
						bootloaderVersion += connection.read(connection.inWaiting())
					else :
						bootloaderVersion += connection.read(connection.in_waiting)
			
				# Check if an error occured
				except serial.SerialException :
			
					# Set error
					error = True
			
				# Check if no errors occured
				if not error :
			
					# Check if not in bootloader mode
					if not bootloaderVersion.startswith('B') :
			
						# Save ports
						self.savePorts(currentPort)
					
						# Switch to bootloader mode
						connection.write("M115 S628")
					
						try :
							gcode = Gcode("M115 S628")
							connection.write(gcode.getBinary())
					
						# Check if an error occured
						except serial.SerialException :	
							pass
					
						time.sleep(1)
					
						# Close connection
						connection.close()
					
						# Set updated port
						currentPort = self.getPort()
					
						# Check if printer wasn't found
						if currentPort is None :
						
							# Send message
							self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "No Micro 3D printer detected. Try cycling the printer's power and try again.", confirm = True))
						
							# Set error
							error = True
					
						# Otherwise
						else :
				
							# Re-connect; wait for the device to be available
							connection = None
							for i in xrange(5) :
								try :
									connection = serial.Serial(currentPort, currentBaudrate)
									break
						
								except Exception :
									connection = None
									time.sleep(1)
					
							# Check if using OS X or Linux and the user lacks read/write access to the printer
							if (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
	
								# Send message
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "You don't have read/write access to " + str(port), confirm = True))
							
								# Set error
								error = True
	
							# Otherwise check if connecting to printer failed
							elif connection is None :
	
								# Send message
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "No Micro 3D printer detected. Try cycling the printer's power and try again.", confirm = True))
							
								# Set error
								error = True
			
					# Check if an error hasn't occured and getting EEPROM was successful
					if not error and self.getEeprom(connection) :
					
						# Get firmware CRC from EEPROM
						index = 0
						eepromCrc = 0
						while index < 4 :
							eepromCrc <<= 8
							eepromCrc += int(ord(self.eeprom[self.eepromOffsets["firmwareCrc"]["offset"] + index]))
							index += 1
				
						# Request firmware CRC from chip
						connection.write('C')
						connection.write('A')

						# Get response
						response = connection.read(4)

						# Get chip CRC
						index = 0
						chipCrc = 0
						while index < 4 :
							chipCrc <<= 8
							chipCrc += int(ord(response[index]))
							index += 1
					
						# Get firmware details
						firmwareName, firmwareVersion, firmwareRelease = self.getFirmwareDetails()
					
						# Get serial number from EEPROM
						serialNumber = self.eeprom[self.eepromOffsets["serialNumber"]["offset"] : self.eepromOffsets["serialNumber"]["offset"] + self.eepromOffsets["serialNumber"]["bytes"] - 1]
				
						# Set printer color
						color = serialNumber[0 : 2]
						if color == "BK" :
							self.printerColor = "Black"
							self._settings.set(["PrinterColor"], "Black")
						elif color == "WH" :
							self.printerColor = "White"
							self._settings.set(["PrinterColor"], "White")
						elif color == "BL" :
							self.printerColor = "Blue"
							self._settings.set(["PrinterColor"], "Blue")
						elif color == "GR" :
							self.printerColor = "Green"
							self._settings.set(["PrinterColor"], "Green")
						elif color == "OR" :
							self.printerColor = "Orange"
							self._settings.set(["PrinterColor"], "Orange")
						elif color == "CL" :
							self.printerColor = "Clear"
							self._settings.set(["PrinterColor"], "Clear")
						elif color == "SL" :
							self.printerColor = "Silver"
							self._settings.set(["PrinterColor"], "Silver")
						elif color == "PL" :
							self.printerColor = "Purple"
							self._settings.set(["PrinterColor"], "Purple")
				
						# Get fan type from EEPROM
						fanType = int(ord(self.eeprom[self.eepromOffsets["fanType"]["offset"]]))
				
						# Check if fan hasn't been set yet
						if fanType == 0 or fanType == 0xFF :
		
							# Check if device is newer
							if int(serialNumber[2 : 8]) >= 150602 :
		
								# Set default newer fan
								fanName = "Shenzhew"
					
							# Otherwise
							else :
					
								# Set default older fan
								fanName = "HengLiXin"
					
							# Check if setting fan failed
							if not self.setFan(connection, fanName) :
			
								# Set error
								error = True
					
							# Check if an error occured
							if error :
					
								# Display error
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Setting fan failed", confirm = True))
				
						# Otherwise
						else :
				
							# Set fan name
							if fanType == 1 :
								fanName = "HengLiXin"
							elif fanType == 2 :
								fanName = "Listener"
							elif fanType == 3 :
								fanName = "Shenzhew"
							elif fanType == 4 :
								fanName = "Xinyujie"
					
							# Check if updating fan failed
							if not self.setFan(connection, fanName) :
					
								# Set error
								error = True
					
								# Display error
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Updating fan settings failed", confirm = True))
				
						# Check if printer uses 500mA extruder current
						shortSerialNumber = serialNumber[0 : 13]
						if not error and (shortSerialNumber == "BK15033001100" or shortSerialNumber == "BK15040201050" or shortSerialNumber == "BK15040301050" or shortSerialNumber == "BK15040602050" or shortSerialNumber == "BK15040801050" or shortSerialNumber == "BK15040802100" or shortSerialNumber == "GR15032702100" or shortSerialNumber == "GR15033101100" or shortSerialNumber == "GR15040601100" or shortSerialNumber == "GR15040701100" or shortSerialNumber == "OR15032701100" or shortSerialNumber == "SL15032601050") :
				
							# Check if setting extruder current failed
							if not self.setExtruderCurrent(connection, 500) :
					
								# Set error
								error = True
					
								# Display error
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Updating extruder current failed", confirm = True))
				
						# Check if using M3D firmware and it's from before new bed orientation and adjustable backlash speed
						if not error and firmwareName is not None and firmwareName == "M3D" and firmwareVersion < 2015080402 :
					
							# Go through bytes of bed offsets
							index = 0
							while index < 19 :

								# Check if zeroing out all bed offets in EEPROM failed
								if not error and not self.writeToEeprom(connection, self.eepromOffsets["bedOffsetBackLeft"]["offset"] + index, '\x00') :
				
									# Set error
									error = True
			
								# Increment index
								index += 1
					
							# Check if an error hasn't occured
							if not error :
					
								# Convert default backlash speed to binary
								packed = struct.pack('f', 1500)
								backlashSpeed = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
		
								# Go through bytes of backlash speed
								index = 0
								while index < 4 :
		
									# Check if saving backlash speed failed
									if not error and not self.writeToEeprom(connection, self.eepromOffsets["backlashSpeed"]["offset"] + index, chr((backlashSpeed >> 8 * index) & 0xFF)) :
		
										# Set error
										error = True
			
									# Increment index
									index += 1
						
							# Check if an error has occured
							if error :
					
								# Display error
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Updating version changes failed", confirm = True))
				
						# Check if an error hasn't occured
						if not error :
				
							# Get speed limit X
							data = [int(ord(self.eeprom[self.eepromOffsets["speedLimitX"]["offset"]])), int(ord(self.eeprom[self.eepromOffsets["speedLimitX"]["offset"] + 1])), int(ord(self.eeprom[self.eepromOffsets["speedLimitX"]["offset"] + 2])), int(ord(self.eeprom[self.eepromOffsets["speedLimitX"]["offset"] + 3]))]
							bytes = struct.pack("4B", *data)
							speedLimitX = round(struct.unpack('f', bytes)[0], 6)
				
							# Check if speed limit X is invalid
							if math.isnan(speedLimitX) or speedLimitX < 120 or speedLimitX > 4800 :
				
								# Convert default speed limit X to binary
								packed = struct.pack('f', 1500)
								speedLimitX = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
				
								# Go through bytes of speed limit X
								index = 0
								while index < 4 :
				
									# Check if saving speed limit X failed
									if not error and not self.writeToEeprom(connection, self.eepromOffsets["speedLimitX"]["offset"] + index, chr((speedLimitX >> 8 * index) & 0xFF)) :
				
										# Set error
										error = True
				
									# Increment index
									index += 1
					
							# Check if an error hasn't occured
							if not error :
					
								# Get speed limit Y
								data = [int(ord(self.eeprom[self.eepromOffsets["speedLimitY"]["offset"]])), int(ord(self.eeprom[self.eepromOffsets["speedLimitY"]["offset"] + 1])), int(ord(self.eeprom[self.eepromOffsets["speedLimitY"]["offset"] + 2])), int(ord(self.eeprom[self.eepromOffsets["speedLimitY"]["offset"] + 3]))]
								bytes = struct.pack("4B", *data)
								speedLimitY = round(struct.unpack('f', bytes)[0], 6)
				
								# Check if speed limit Y is invalid
								if math.isnan(speedLimitY) or speedLimitY < 120 or speedLimitY > 4800 :
				
									# Convert default speed limit Y to binary
									packed = struct.pack('f', 1500)
									speedLimitY = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
				
									# Go through bytes of speed limit Y
									index = 0
									while index < 4 :
				
										# Check if saving speed limit Y failed
										if not error and not self.writeToEeprom(connection, self.eepromOffsets["speedLimitY"]["offset"] + index, chr((speedLimitY >> 8 * index) & 0xFF)) :
				
											# Set error
											error = True
				
										# Increment index
										index += 1
					
							# Check if an error hasn't occured
							if not error :
					
								# Get speed limit Z
								data = [int(ord(self.eeprom[self.eepromOffsets["speedLimitZ"]["offset"]])), int(ord(self.eeprom[self.eepromOffsets["speedLimitZ"]["offset"] + 1])), int(ord(self.eeprom[self.eepromOffsets["speedLimitZ"]["offset"] + 2])), int(ord(self.eeprom[self.eepromOffsets["speedLimitZ"]["offset"] + 3]))]
								bytes = struct.pack("4B", *data)
								speedLimitZ = round(struct.unpack('f', bytes)[0], 6)
				
								# Check if speed limit Z is invalid
								if math.isnan(speedLimitZ) or speedLimitZ < 30 or speedLimitZ > 60 :
							
									# Convert default speed limit Z to binary
									packed = struct.pack('f', 60)
									speedLimitZ = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
				
									# Go through bytes of speed limit Z
									index = 0
									while index < 4 :
				
										# Check if saving speed limit Z failed
										if not error and not self.writeToEeprom(connection, self.eepromOffsets["speedLimitZ"]["offset"] + index, chr((speedLimitZ >> 8 * index) & 0xFF)) :
				
											# Set error
											error = True
				
										# Increment index
										index += 1
				
							# Check if an error hasn't occured
							if not error :
					
								# Get speed limit E positive
								data = [int(ord(self.eeprom[self.eepromOffsets["speedLimitEPositive"]["offset"]])), int(ord(self.eeprom[self.eepromOffsets["speedLimitEPositive"]["offset"] + 1])), int(ord(self.eeprom[self.eepromOffsets["speedLimitEPositive"]["offset"] + 2])), int(ord(self.eeprom[self.eepromOffsets["speedLimitEPositive"]["offset"] + 3]))]
								bytes = struct.pack("4B", *data)
								speedLimitEPositive = round(struct.unpack('f', bytes)[0], 6)
				
								# Check if speed limit E positive is invalid
								if math.isnan(speedLimitEPositive) or speedLimitEPositive < 60 or speedLimitEPositive > 600 :
				
									# Convert default speed limit E positive to binary
									packed = struct.pack('f', 102)
									speedLimitEPositive = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
				
									# Go through bytes of speed limit E positive
									index = 0
									while index < 4 :
				
										# Check if saving speed limit E positive failed
										if not error and not self.writeToEeprom(connection, self.eepromOffsets["speedLimitEPositive"]["offset"] + index, chr((speedLimitEPositive >> 8 * index) & 0xFF)) :
				
											# Set error
											error = True
				
										# Increment index
										index += 1
					
							# Check if an error hasn't occured
							if not error :
					
								# Get speed limit E negative
								data = [int(ord(self.eeprom[self.eepromOffsets["speedLimitENegative"]["offset"]])), int(ord(self.eeprom[self.eepromOffsets["speedLimitENegative"]["offset"] + 1])), int(ord(self.eeprom[self.eepromOffsets["speedLimitENegative"]["offset"] + 2])), int(ord(self.eeprom[self.eepromOffsets["speedLimitENegative"]["offset"] + 3]))]
								bytes = struct.pack("4B", *data)
								speedLimitENegative = round(struct.unpack('f', bytes)[0], 6)
				
								# Check if speed limit E negative is invalid
								if math.isnan(speedLimitENegative) or speedLimitENegative < 60 or speedLimitENegative > 720 :
				
									# Convert default speed limit E negative to binary
									packed = struct.pack('f', 360)
									speedLimitENegative = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
				
									# Go through bytes of speed limit E negative
									index = 0
									while index < 4 :
				
										# Check if saving speed limit E negative failed
										if not error and not self.writeToEeprom(connection, self.eepromOffsets["speedLimitENegative"]["offset"] + index, chr((speedLimitENegative >> 8 * index) & 0xFF)) :
				
											# Set error
											error = True
				
										# Increment index
										index += 1
				
							# Check if an error has occured
							if error :
				
								# Display error
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Updating speed limits failed", confirm = True))
				
						# Check if firmware is corrupt
						if not error and eepromCrc != chipCrc :
					
							# Set temp firmware name
							if firmwareName is None :
								currentFirmwareName = "M3D"
							else :
								currentFirmwareName = firmwareName
				
							# Display message
							self.messageResponse = None
							self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Firmware is corrupt. Update to " + currentFirmwareName + " firmware version " + self.providedFirmwares[currentFirmwareName]["Release"] + '?', response = True))
					
							# Wait until response is obtained
							while self.messageResponse is None :
								time.sleep(0.01)
					
							# Check if response was no
							if not self.messageResponse :
					
								# Set error
								error = True
				
							# Otherwise
							else :
					
								# Send message
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Updating firmware"))
					
								# Check if updating firmware failed
								if not self.updateToProvidedFirmware(connection, currentFirmwareName) :
					
									# Send message
									self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Updating firmware failed", confirm = True))
							
									# Set error
									error = True
						
								# Otherwise
								else :
					
									# Send message
									self.messageResponse = None
									self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Updating firmware was successful", confirm = True))
					
									# Wait until response is obtained
									while self.messageResponse is None :
										time.sleep(0.01)
					
						# Otherwise check if firmware is outdated
						elif not error and firmwareName is not None and firmwareVersion < int(self.providedFirmwares[firmwareName]["Version"]) :
				
							# Set if firmware is incompatible
							if firmwareName == "M3D" :
								incompatible = firmwareVersion < 2015122112
							elif firmwareName == "iMe" :
								incompatible = firmwareVersion < 1900000001
						
							# Display message
							self.messageResponse = None
							if incompatible :
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Firmware is incompatible. Update to " + firmwareName + " firmware version " + self.providedFirmwares[firmwareName]["Release"] + '?', response = True))
							else :
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Newer firmware available. Update to " + firmwareName + " firmware version " + self.providedFirmwares[firmwareName]["Release"] + '?', response = True))
					
							# Wait until response is obtained
							while self.messageResponse is None :
								time.sleep(0.01)
					
							# Check if response was no
							if not self.messageResponse :
					
								# Set error if incompatible
								if incompatible :
									error = True
				
							# Otherwise
							else :
					
								# Send message
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Updating firmware"))
							
								# Check if updating firmware failed
								if not self.updateToProvidedFirmware(connection, firmwareName) :
					
									# Send message
									self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Updating firmware failed", confirm = True))
							
									# Set error
									error = True
						
								# Otherwise
								else :
					
									# Send message
									self.messageResponse = None
									self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error", message = "Updating firmware was successful", confirm = True))
					
									# Wait until response is obtained
									while self.messageResponse is None :
										time.sleep(0.01)
				
						# Check if no errors occured
						if not error :
				
							# Send new EEPROM
							self.getEeprom(connection, True)
			
					# Otherwise
					else :
			
						# Set error
						error = True
			
				# Close connection
				connection.close()
			
				# Check if an error has occured
				if error :
			
					# Clear EEPROM
					self.eeprom = None
				
					# Close connection
					if self._printer._comm is not None :
				
						try :
							self._printer._comm.close(False, False)
						except TypeError :
							pass
				
					self._printer.disconnect()
			
				# Otherwise
				else :

					# Connect to the printer
					connection = serial.Serial(currentPort, currentBaudrate)
				
					# Save ports
					self.savePorts(currentPort)
				
					# Attempt to put printer into G-code processing mode
					connection.write("Q")
					time.sleep(1)
				
					# Close connection
					connection.close()
	
					# Set updated port
					currentPort = self.getPort()
				
					# Check if printer wasn't found
					if currentPort is None :

						# Send message
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "No Micro 3D printer detected. Try cycling the printer's power and try again.", confirm = True))
				
					# Otherwise
					else :
	
						# Re-connect to printer
						self._printer.connect(currentPort, currentBaudrate, currentProfile)
				
						# Wait until connection is established
						while not isinstance(self._printer.get_transport(), serial.Serial) :
							time.sleep(0.01)
				
						# Remove serial timeout
						self._printer.get_transport().timeout = None
						if float(serial.VERSION) < 3 :
							self._printer.get_transport().writeTimeout = None
						else :
							self._printer.get_transport().write_timeout = None
				
						# Check if communication layer has been established
						if self._printer._comm is not None :
					
							# Set printer state to operational
							self._printer._comm._changeState(self._printer._comm.STATE_OPERATIONAL)
					
							# Check if using M3D firmware
							if self.getFirmwareDetails()[0] == "M3D" :
		
								# Save original write and read functions
								self.originalWrite = self._printer.get_transport().write
								self.originalRead = self._printer.get_transport().readline
		
								# Overwrite write and read functions to process write and read functions
								self._printer.get_transport().write = self.processWrite
								self._printer.get_transport().readline = self.processRead
			
							# Clear invalid printer
							self.invalidPrinter = False
			
							# Request printer information
							self._printer.get_transport().write("M115")
			
			# Enable printer callbacks
			self._printer.register_callback(self)
		
		# Otherwise check if data contains printer information
		elif "MACHINE_TYPE:" in data :
		
			# Check if printer isn't a Micro 3D
			if "MACHINE_TYPE:The_Micro" not in data :
				
				# Set write and read functions back to original
				if self.originalWrite is not None and isinstance(self._printer.get_transport(), serial.Serial) :
					self._printer.get_transport().write = self.originalWrite
					self._printer.get_transport().readline = self.originalRead
				
				# Set invalid printer
				self.invalidPrinter = True
			
			# Otherwise
			else :
			
				# Clear invalid values
				self.invalidBedCenter = None
				self.invalidBedOrientation = None
				
				# Request printer settings
				commands = [
					"M117",
					"M114",
					"M619 S" + str(self.eepromOffsets["backlashX"]["offset"]) + " T" + str(self.eepromOffsets["backlashX"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["backlashY"]["offset"]) + " T" + str(self.eepromOffsets["backlashY"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["bedOrientationBackRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationBackRight"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["bedOrientationBackLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationBackLeft"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["bedOrientationFrontLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationFrontLeft"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["bedOrientationFrontRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationFrontRight"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["filamentTypeAndLocation"]["offset"]) + " T" + str(self.eepromOffsets["filamentTypeAndLocation"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["filamentTemperature"]["offset"]) + " T" + str(self.eepromOffsets["filamentTemperature"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["bedOffsetBackLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetBackLeft"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["bedOffsetBackRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetBackRight"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["bedOffsetFrontRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetFrontRight"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["bedOffsetFrontLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetFrontLeft"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["bedHeightOffset"]["offset"]) + " T" + str(self.eepromOffsets["bedHeightOffset"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["backlashSpeed"]["offset"]) + " T" + str(self.eepromOffsets["backlashSpeed"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["speedLimitX"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitX"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["speedLimitY"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitY"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["speedLimitZ"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitZ"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["speedLimitEPositive"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitEPositive"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["speedLimitENegative"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitENegative"]["bytes"]),
					"M619 S" + str(self.eepromOffsets["bedOrientationVersion"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationVersion"]["bytes"])
				]
			
				# Lower LED brightness for clear color printers
				if self.printerColor == "Clear" :
					commands += ["M420 T20"]
				else :
					commands += ["M420 T100"]
				
				# Send commands
				self.sendCommands(commands)
		
		# Otherwise check if data contains valid Z information
		elif "ZV:" in data :
		
			# Send invalid Z
			if data[data.find("ZV:") + 3] == '0' :
			
				# Set invalid bed center
				self.invalidBedCenter = True
		
		# Otherwise check if data contains current Z
		elif "Z:" in data :
		
			# Set location X
			if "X:" in data :
				start = data.find("X:") + 2
				locationX = data[start : data[start :].find(' ') + start]
			else :
				locationX = None
			
			# Set location Y
			if "Y:" in data :
				start = data.find("Y:") + 2
				locationY = data[start : data[start :].find(' ') + start]
			else :
				locationY = None
				
			# Set location E
			if "E:" in data :
				start = data.find("E:") + 2
				locationE = data[start : data[start :].find(' ') + start]
			else :
				locationE = None
			
			# Set location Z
			locationZ = data[data.find("Z:") + 2 :]
			
			# Send current location
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Current Location", locationX = locationX, locationY = locationY, locationZ = locationZ, locationE = locationE))
		
		# Otherwise check if data contains an EEPROM value
		elif "DT:" in data :
		
			# Check if data is for backlash X
			if "PT:" + str(self.eepromOffsets["backlashX"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerBacklashX = self.get_settings_defaults()["BacklashX"]
				else :
					self.printerBacklashX = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BacklashX"], self.printerBacklashX)
			
			# Otherwise check if data is for backlash Y
			elif "PT:" + str(self.eepromOffsets["backlashY"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerBacklashY = self.get_settings_defaults()["BacklashY"]
				else :
					self.printerBacklashY = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BacklashY"], self.printerBacklashY)
			
			# Otherwise check if data is for back right orientation
			elif "PT:" + str(self.eepromOffsets["bedOrientationBackRight"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerBackRightOrientation = self.get_settings_defaults()["BackRightOrientation"]
				else :
					self.printerBackRightOrientation = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BackRightOrientation"], self.printerBackRightOrientation)
			
			# Otherwise check if data is for back left orientation
			elif "PT:" + str(self.eepromOffsets["bedOrientationBackLeft"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerBackLeftOrientation = self.get_settings_defaults()["BackLeftOrientation"]
				else :
					self.printerBackLeftOrientation = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BackLeftOrientation"], self.printerBackLeftOrientation)
			
			# Otherwise check if data is for front left orientation
			elif "PT:" + str(self.eepromOffsets["bedOrientationFrontLeft"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerFrontLeftOrientation = self.get_settings_defaults()["FrontLeftOrientation"]
				else :
					self.printerFrontLeftOrientation = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["FrontLeftOrientation"], self.printerFrontLeftOrientation)
			
			# Otherwise check if data is for front right orientation
			elif "PT:" + str(self.eepromOffsets["bedOrientationFrontRight"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerFrontRightOrientation = self.get_settings_defaults()["FrontRightOrientation"]
				else :
					self.printerFrontRightOrientation = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["FrontRightOrientation"], self.printerFrontRightOrientation)
				
					# Send invalid bed orientation
					if self.printerBackRightOrientation == 0 and self.printerBackLeftOrientation == 0 and self.printerFrontLeftOrientation == 0 and self.printerFrontRightOrientation == 0 :
					
						# Set invalid bed orientation
						self.invalidBedOrientation = True
				
			# Otherwise check if data is for filament type and location
			elif "PT:" + str(self.eepromOffsets["filamentTypeAndLocation"]["offset"]) + ' ' in data :
			
				# Convert data to value
				value = int(data[data.find("DT:") + 3 :])
				if value & 0x3F == 1 :
					filamentType = "ABS"
				elif value & 0x3F == 2 :
					filamentType = "PLA"
				elif value & 0x3F == 3 :
					filamentType = "HIPS"
				elif value & 0x3F == 5 :
					filamentType = "FLX"
				elif value & 0x3F == 6 :
					filamentType = "TGH"
				elif value & 0x3F == 7 :
					filamentType = "CAM"
				else :
					filamentType = "OTHER"
				self.printerFilamentType = filamentType
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set(["FilamentType"], self.printerFilamentType)
			
			# Otherwise check if data is for filament temperature
			elif "PT:" + str(self.eepromOffsets["filamentTemperature"]["offset"]) + ' ' in data :
			
				# Convert data to value
				self.printerFilamentTemperature = int(data[data.find("DT:") + 3 :]) + 100
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_int(["FilamentTemperature"], self.printerFilamentTemperature)
			
			# Otherwise check if data is for back left offset
			elif "PT:" + str(self.eepromOffsets["bedOffsetBackLeft"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerBackLeftOffset = self.get_settings_defaults()["BackLeftOffset"]
				else :
					self.printerBackLeftOffset = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BackLeftOffset"], self.printerBackLeftOffset)
			
			# Otherwise check if data is for back right offset
			elif "PT:" + str(self.eepromOffsets["bedOffsetBackRight"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerBackRightOffset = self.get_settings_defaults()["BackRightOffset"]
				else :
					self.printerBackRightOffset = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BackRightOffset"], self.printerBackRightOffset)
			
			# Otherwise check if data is for front right offset
			elif "PT:" + str(self.eepromOffsets["bedOffsetFrontRight"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerFrontRightOffset = self.get_settings_defaults()["FrontRightOffset"]
				else :
					self.printerFrontRightOffset = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["FrontRightOffset"], self.printerFrontRightOffset)
			
			# Otherwise check if data is for front left offset
			elif "PT:" + str(self.eepromOffsets["bedOffsetFrontLeft"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerFrontLeftOffset = self.get_settings_defaults()["FrontLeftOffset"]
				else :
					self.printerFrontLeftOffset = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["FrontLeftOffset"], self.printerFrontLeftOffset)
			
			# Otherwise check if data is for bed height offset
			elif "PT:" + str(self.eepromOffsets["bedHeightOffset"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerBedHeightOffset = self.get_settings_defaults()["BedHeightOffset"]
				else :
					self.printerBedHeightOffset = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BedHeightOffset"], self.printerBedHeightOffset)
			
			# Otherwise check if data is for backlash speed
			elif "PT:" + str(self.eepromOffsets["backlashSpeed"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerBacklashSpeed = self.get_settings_defaults()["BacklashSpeed"]
				else :
					self.printerBacklashSpeed = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BacklashSpeed"], self.printerBacklashSpeed)
			
			# Otherwise check if data is for speed limit X
			elif "PT:" + str(self.eepromOffsets["speedLimitX"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerSpeedLimitX = self.get_settings_defaults()["SpeedLimitX"]
				else :
					self.printerSpeedLimitX = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["SpeedLimitX"], self.printerSpeedLimitX)
			
			# Otherwise check if data is for speed limit Y
			elif "PT:" + str(self.eepromOffsets["speedLimitY"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerSpeedLimitY = self.get_settings_defaults()["SpeedLimitY"]
				else :
					self.printerSpeedLimitY = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["SpeedLimitY"], self.printerSpeedLimitY)
			
			# Otherwise check if data is for speed limit Z
			elif "PT:" + str(self.eepromOffsets["speedLimitZ"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerSpeedLimitZ = self.get_settings_defaults()["SpeedLimitZ"]
				else :
					self.printerSpeedLimitZ = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["SpeedLimitZ"], self.printerSpeedLimitZ)
			
			# Otherwise check if data is for speed limit E positive
			elif "PT:" + str(self.eepromOffsets["speedLimitEPositive"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerSpeedLimitEPositive = self.get_settings_defaults()["SpeedLimitEPositive"]
				else :
					self.printerSpeedLimitEPositive = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["SpeedLimitEPositive"], self.printerSpeedLimitEPositive)
			
			# Otherwise check if data is for speed limit E negative
			elif "PT:" + str(self.eepromOffsets["speedLimitENegative"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack("4B", *data)
				value = struct.unpack('f', bytes)[0]
				
				if math.isnan(value) or not isinstance(value, float) :
					self.printerSpeedLimitENegative = self.get_settings_defaults()["SpeedLimitENegative"]
				else :
					self.printerSpeedLimitENegative = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["SpeedLimitENegative"], self.printerSpeedLimitENegative)
			
			# Otherwise check if data is for bed orientation version
			elif "PT:" + str(self.eepromOffsets["bedOrientationVersion"]["offset"]) + ' ' in data :
			
				# Send invalid bed orientation if calibration question hasn't already been asked
				if data[data.find("DT:") + 3 :] == '0' and self.invalidBedOrientation is not None :
				
					# Set invalid bed orientation
					self.invalidBedOrientation = True
				
				# Check if not automatically collecting settings from printer
				if not self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
				
					# Save settings to the printer
					self.sendCommands(self.getSaveCommands())
				
				# Otherwise
				else :
					
					# Save software settings
					octoprint.settings.settings().save()
				
				# Send invalid values
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Invalid", bedCenter = self.invalidBedCenter, bedOrientation = self.invalidBedOrientation))
	
	# Get save commands
	def getSaveCommands(self) :
	
		# Get software settings
		softwareBacklashX = self._settings.get_float(["BacklashX"])
		if not isinstance(softwareBacklashX, float) :
			softwareBacklashX = self.get_settings_defaults()["BacklashX"]
		
		softwareBacklashY = self._settings.get_float(["BacklashY"])
		if not isinstance(softwareBacklashY, float) :
			softwareBacklashY = self.get_settings_defaults()["BacklashY"]
		
		softwareBackLeftOrientation = self._settings.get_float(["BackLeftOrientation"])
		if not isinstance(softwareBackLeftOrientation, float) :
			softwareBackLeftOrientation = self.get_settings_defaults()["BackLeftOrientation"]
		
		softwareBackRightOrientation = self._settings.get_float(["BackRightOrientation"])
		if not isinstance(softwareBackRightOrientation, float) :
			softwareBackRightOrientation = self.get_settings_defaults()["BackRightOrientation"]
		
		softwareFrontRightOrientation = self._settings.get_float(["FrontRightOrientation"])
		if not isinstance(softwareFrontRightOrientation, float) :
			softwareFrontRightOrientation = self.get_settings_defaults()["FrontRightOrientation"]
		
		softwareFrontLeftOrientation = self._settings.get_float(["FrontLeftOrientation"])
		if not isinstance(softwareFrontLeftOrientation, float) :
			softwareFrontLeftOrientation = self.get_settings_defaults()["FrontLeftOrientation"]
		
		softwareBacklashSpeed = self._settings.get_float(["BacklashSpeed"])
		if not isinstance(softwareBacklashSpeed, float) :
			softwareBacklashSpeed = self.get_settings_defaults()["BacklashSpeed"]
		
		softwareBackLeftOffset = self._settings.get_float(["BackLeftOffset"])
		if not isinstance(softwareBackLeftOffset, float) :
			softwareBackLeftOffset = self.get_settings_defaults()["BackLeftOffset"]
		
		softwareBackRightOffset = self._settings.get_float(["BackRightOffset"])
		if not isinstance(softwareBackRightOffset, float) :
			softwareBackRightOffset = self.get_settings_defaults()["BackRightOffset"]
		
		softwareFrontRightOffset = self._settings.get_float(["FrontRightOffset"])
		if not isinstance(softwareFrontRightOffset, float) :
			softwareFrontRightOffset = self.get_settings_defaults()["FrontRightOffset"]
		
		softwareFrontLeftOffset = self._settings.get_float(["FrontLeftOffset"])
		if not isinstance(softwareFrontLeftOffset, float) :
			softwareFrontLeftOffset = self.get_settings_defaults()["FrontLeftOffset"]
		
		softwareBedHeightOffset = self._settings.get_float(["BedHeightOffset"])
		if not isinstance(softwareBedHeightOffset, float) :
			softwareBedHeightOffset = self.get_settings_defaults()["BedHeightOffset"]
		
		softwareFilamentTemperature = self._settings.get_int(["FilamentTemperature"])
		if not isinstance(softwareFilamentTemperature, int) :
			softwareFilamentTemperature = self.get_settings_defaults()["FilamentTemperature"]
		
		softwareFilamentType = str(self._settings.get(["FilamentType"]))
		if not isinstance(softwareFilamentType, str) :
			softwareFilamentType = self.get_settings_defaults()["FilamentType"]
		
		softwareSpeedLimitX = self._settings.get_float(["SpeedLimitX"])
		if not isinstance(softwareSpeedLimitX, float) :
			softwareSpeedLimitX = self.get_settings_defaults()["SpeedLimitX"]
		
		softwareSpeedLimitY = self._settings.get_float(["SpeedLimitY"])
		if not isinstance(softwareSpeedLimitY, float) :
			softwareSpeedLimitY = self.get_settings_defaults()["SpeedLimitY"]
		
		softwareSpeedLimitZ = self._settings.get_float(["SpeedLimitZ"])
		if not isinstance(softwareSpeedLimitZ, float) :
			softwareSpeedLimitZ = self.get_settings_defaults()["SpeedLimitZ"]
		
		softwareSpeedLimitEPositive = self._settings.get_float(["SpeedLimitEPositive"])
		if not isinstance(softwareSpeedLimitEPositive, float) :
			softwareSpeedLimitEPositive = self.get_settings_defaults()["SpeedLimitEPositive"]
		
		softwareSpeedLimitENegative = self._settings.get_float(["SpeedLimitENegative"])
		if not isinstance(softwareSpeedLimitENegative, float) :
			softwareSpeedLimitENegative = self.get_settings_defaults()["SpeedLimitENegative"]
	
		# Check if backlash Xs differ
		commandList = []
		if hasattr(self, "printerBacklashX") and self.printerBacklashX != softwareBacklashX :

			# Add new value to list
			packed = struct.pack('f', softwareBacklashX)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["backlashX"]["offset"]) + " T" + str(self.eepromOffsets["backlashX"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["backlashX"]["offset"]) + " T" + str(self.eepromOffsets["backlashX"]["bytes"])]

		# Check if backlash Ys differ
		if hasattr(self, "printerBacklashY") and self.printerBacklashY != softwareBacklashY :

			# Add new value to list
			packed = struct.pack('f', softwareBacklashY)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["backlashY"]["offset"]) + " T" + str(self.eepromOffsets["backlashY"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["backlashY"]["offset"]) + " T" + str(self.eepromOffsets["backlashY"]["bytes"])]

		# Check if back right orientations differ
		if hasattr(self, "printerBackRightOrientation") and self.printerBackRightOrientation != softwareBackRightOrientation :

			# Add new value to list
			packed = struct.pack('f', softwareBackRightOrientation)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["bedOrientationBackRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationBackRight"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["bedOrientationBackRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationBackRight"]["bytes"])]

		# Check if back left orientations differ
		if hasattr(self, "printerBackLeftOrientation") and self.printerBackLeftOrientation != softwareBackLeftOrientation :

			# Add new value to list
			packed = struct.pack('f', softwareBackLeftOrientation)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["bedOrientationBackLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationBackLeft"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["bedOrientationBackLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationBackLeft"]["bytes"])]

		# Check if front left orientations differ
		if hasattr(self, "printerFrontLeftOrientation") and self.printerFrontLeftOrientation != softwareFrontLeftOrientation :

			# Add new value to list
			packed = struct.pack('f', softwareFrontLeftOrientation)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["bedOrientationFrontLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationFrontLeft"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["bedOrientationFrontLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationFrontLeft"]["bytes"])]

		# Check if front right orientations differ
		if hasattr(self, "printerFrontRightOrientation") and self.printerFrontRightOrientation != softwareFrontRightOrientation :

			# Add new value to list
			packed = struct.pack('f', softwareFrontRightOrientation)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["bedOrientationFrontRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationFrontRight"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["bedOrientationFrontRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationFrontRight"]["bytes"])]

		# Check if backlash speeds differ
		if hasattr(self, "printerBacklashSpeed") and self.printerBacklashSpeed != softwareBacklashSpeed :

			# Add new value to list
			packed = struct.pack('f', softwareBacklashSpeed)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["backlashSpeed"]["offset"]) + " T" + str(self.eepromOffsets["backlashSpeed"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["backlashSpeed"]["offset"]) + " T" + str(self.eepromOffsets["backlashSpeed"]["bytes"])]

		# Check if back left offsets differ
		if hasattr(self, "printerBackLeftOffset") and self.printerBackLeftOffset != softwareBackLeftOffset :

			# Add new value to list
			packed = struct.pack('f', softwareBackLeftOffset)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["bedOffsetBackLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetBackLeft"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["bedOffsetBackLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetBackLeft"]["bytes"])]

		# Check if back right offsets differ
		if hasattr(self, "printerBackRightOffset") and self.printerBackRightOffset != softwareBackRightOffset :

			# Add new value to list
			packed = struct.pack('f', softwareBackRightOffset)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["bedOffsetBackRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetBackRight"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["bedOffsetBackRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetBackRight"]["bytes"])]

		# Check if front right offsets differ
		if hasattr(self, "printerFrontRightOffset") and self.printerFrontRightOffset != softwareFrontRightOffset :

			# Add new value to list
			packed = struct.pack('f', softwareFrontRightOffset)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["bedOffsetFrontRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetFrontRight"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["bedOffsetFrontRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetFrontRight"]["bytes"])]

		# Check if front left offsets differ
		if hasattr(self, "printerFrontLeftOffset") and self.printerFrontLeftOffset != softwareFrontLeftOffset :

			# Add new value to list
			packed = struct.pack('f', softwareFrontLeftOffset)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["bedOffsetFrontLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetFrontLeft"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["bedOffsetFrontLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetFrontLeft"]["bytes"])]

		# Check if bed height offsets differ
		if hasattr(self, "printerBedHeightOffset") and self.printerBedHeightOffset != softwareBedHeightOffset :

			# Add new value to list
			packed = struct.pack('f', softwareBedHeightOffset)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["bedHeightOffset"]["offset"]) + " T" + str(self.eepromOffsets["bedHeightOffset"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["bedHeightOffset"]["offset"]) + " T" + str(self.eepromOffsets["bedHeightOffset"]["bytes"])]

		# Check if filament temperatures differ
		if hasattr(self, "printerFilamentTemperature") and self.printerFilamentTemperature != softwareFilamentTemperature :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["filamentTemperature"]["offset"]) + " T" + str(self.eepromOffsets["filamentTemperature"]["bytes"]) + " P" + str(softwareFilamentTemperature - 100), "M619 S" + str(self.eepromOffsets["filamentTemperature"]["offset"]) + " T" + str(self.eepromOffsets["filamentTemperature"]["bytes"])]

		# Check if filament types differ
		if hasattr(self, "printerFilamentType") and self.printerFilamentType != softwareFilamentType :

			# Add new value to list
			newValue = 0x80
			if softwareFilamentType == "ABS" :
				newValue |= 0x01
			elif softwareFilamentType == "PLA" :
				newValue |= 0x02
			elif softwareFilamentType == "HIPS" :
				newValue |= 0x03
			elif softwareFilamentType == "OTHER" :
				newValue |= 0x04
			elif softwareFilamentType == "FLX" :
				newValue |= 0x05
			elif softwareFilamentType == "TGH" :
				newValue |= 0x06
			elif softwareFilamentType == "CAM" :
				newValue |= 0x07
			
			commandList += ["M618 S" + str(self.eepromOffsets["filamentTypeAndLocation"]["offset"]) + " T" + str(self.eepromOffsets["filamentTypeAndLocation"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["filamentTypeAndLocation"]["offset"]) + " T" + str(self.eepromOffsets["filamentTypeAndLocation"]["bytes"])]
		
		# Check if speed limit Xs differ
		if hasattr(self, "printerSpeedLimitX") and self.printerSpeedLimitX != softwareSpeedLimitX :
		
			# Add new value to list
			packed = struct.pack('f', softwareSpeedLimitX)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["speedLimitX"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitX"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["speedLimitX"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitX"]["bytes"])]
		
		# Check if speed limit Ys differ
		if hasattr(self, "printerSpeedLimitY") and self.printerSpeedLimitY != softwareSpeedLimitY :
		
			# Add new value to list
			packed = struct.pack('f', softwareSpeedLimitY)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["speedLimitY"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitY"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["speedLimitY"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitY"]["bytes"])]
		
		# Check if speed limit Zs differ
		if hasattr(self, "printerSpeedLimitZ") and self.printerSpeedLimitZ != softwareSpeedLimitZ :
		
			# Add new value to list
			packed = struct.pack('f', softwareSpeedLimitZ)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["speedLimitZ"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitZ"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["speedLimitZ"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitZ"]["bytes"])]
		
		# Check if speed limit E positives differ
		if hasattr(self, "printerSpeedLimitEPositive") and self.printerSpeedLimitEPositive != softwareSpeedLimitEPositive :
		
			# Add new value to list
			packed = struct.pack('f', softwareSpeedLimitEPositive)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["speedLimitEPositive"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitEPositive"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["speedLimitEPositive"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitEPositive"]["bytes"])]
		
		# Check if speed limit E negatives differ
		if hasattr(self, "printerSpeedLimitENegative") and self.printerSpeedLimitENegative != softwareSpeedLimitENegative :
		
			# Add new value to list
			packed = struct.pack('f', softwareSpeedLimitENegative)
			newValue = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
			commandList += ["M618 S" + str(self.eepromOffsets["speedLimitENegative"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitENegative"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["speedLimitENegative"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitENegative"]["bytes"])]
		
		# Return command list
		return commandList
	
	# Pre-process G-code
	def preprocessGcode(self, path, file_object, links = None, printer_profile = None, allow_overwrite = True, *args, **kwargs) :
	
		# Check if file is not G-code
		if not octoprint.filemanager.valid_file_type(path, "gcode") :
		
			# Return unmodified file
			return file_object
		
		# Create input file
		fd, input = tempfile.mkstemp()
		
		# Copy file to input file
		for line in file_object.stream() :
			os.write(fd, line)
		os.close(fd)
		
		# Check if not pre-processing on the fly
		if not self._settings.get_boolean(["PreprocessOnTheFly"]) :
		
			# Reset pre-processor settings
			self.resetPreprocessorSettings()
		
			# Set progress bar percent and text
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Collecting Print Information …"))
			
			# Check if using shared library
			if self.sharedLibrary and self._settings.get_boolean(["UseSharedLibrary"]) :
			
				# Reset pre-processor settings
				self.sharedLibrary.resetPreprocessorSettings()
		
				# Set values
				self.sharedLibrary.setBacklashX(ctypes.c_double(self._settings.get_float(["BacklashX"])))
				self.sharedLibrary.setBacklashY(ctypes.c_double(self._settings.get_float(["BacklashY"])))
				self.sharedLibrary.setBacklashSpeed(ctypes.c_double(self._settings.get_float(["BacklashSpeed"])))
				self.sharedLibrary.setBackRightOrientation(ctypes.c_double(self._settings.get_float(["BackRightOrientation"])))
				self.sharedLibrary.setBackLeftOrientation(ctypes.c_double(self._settings.get_float(["BackLeftOrientation"])))
				self.sharedLibrary.setFrontLeftOrientation(ctypes.c_double(self._settings.get_float(["FrontLeftOrientation"])))
				self.sharedLibrary.setFrontRightOrientation(ctypes.c_double(self._settings.get_float(["FrontRightOrientation"])))
				self.sharedLibrary.setBedHeightOffset(ctypes.c_double(self._settings.get_float(["BedHeightOffset"])))
				self.sharedLibrary.setBackRightOffset(ctypes.c_double(self._settings.get_float(["BackRightOffset"])))
				self.sharedLibrary.setBackLeftOffset(ctypes.c_double(self._settings.get_float(["BackLeftOffset"])))
				self.sharedLibrary.setFrontLeftOffset(ctypes.c_double(self._settings.get_float(["FrontLeftOffset"])))
				self.sharedLibrary.setFrontRightOffset(ctypes.c_double(self._settings.get_float(["FrontRightOffset"])))
				self.sharedLibrary.setFilamentTemperature(ctypes.c_ushort(self._settings.get_int(["FilamentTemperature"])))
				self.sharedLibrary.setFilamentType(ctypes.c_char_p(str(self._settings.get(["FilamentType"]))))
				self.sharedLibrary.setUseValidationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseValidationPreprocessor"])))
				self.sharedLibrary.setUsePreparationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UsePreparationPreprocessor"])))
				self.sharedLibrary.setUseWaveBondingPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseWaveBondingPreprocessor"])))
				self.sharedLibrary.setUseThermalBondingPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseThermalBondingPreprocessor"])))
				self.sharedLibrary.setUseBedCompensationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseBedCompensationPreprocessor"])))
				self.sharedLibrary.setUseBacklashCompensationPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseBacklashCompensationPreprocessor"])))
				self.sharedLibrary.setUseCenterModelPreprocessor(ctypes.c_bool(self._settings.get_boolean(["UseCenterModelPreprocessor"])))
				self.sharedLibrary.setIgnorePrintDimensionLimitations(ctypes.c_bool(self._settings.get_boolean(["IgnorePrintDimensionLimitations"])))
				self.sharedLibrary.setUsingHeatbed(ctypes.c_bool(self.heatbedConnected))
				self.sharedLibrary.setPrintingTestBorder(ctypes.c_bool(self.printingTestBorder))
				self.sharedLibrary.setPrintingBacklashCalibrationCylinder(ctypes.c_bool(self.printingBacklashCalibrationCylinder))
				self.sharedLibrary.setPrinterColor(ctypes.c_char_p(self.printerColor))
				self.sharedLibrary.setCalibrateBeforePrint(ctypes.c_bool(self._settings.get_boolean(["CalibrateBeforePrint"])))
				self.sharedLibrary.setRemoveFanCommands(ctypes.c_bool(self._settings.get_boolean(["RemoveFanCommands"])))
				self.sharedLibrary.setRemoveTemperatureCommands(ctypes.c_bool(self._settings.get_boolean(["RemoveTemperatureCommands"])))
				self.sharedLibrary.setUseGpio(ctypes.c_bool(self._settings.get_boolean(["UseGpio"])))
				if self._settings.get_int(["GpioLayer"]) is not None :
					self.sharedLibrary.setGpioLayer(ctypes.c_ushort(self._settings.get_int(["GpioLayer"])))
				self.sharedLibrary.setHeatbedTemperature(ctypes.c_ushort(self._settings.get_int(["HeatbedTemperature"])))
				self.sharedLibrary.setExternalBedHeight(ctypes.c_double(self._settings.get_float(["ExternalBedHeight"])))
				self.sharedLibrary.setMidPrintFilamentChangeLayers(ctypes.c_char_p(' '.join(re.findall("\\d+", str(self._settings.get(["MidPrintFilamentChangeLayers"]))))))
				
				# Collect print information
				printIsValid = self.sharedLibrary.collectPrintInformation(ctypes.c_char_p(input))
				
				# Get extruder min and max movements
				self.maxXExtruderLow = self.sharedLibrary.getMaxXExtruderLow()
				self.maxXExtruderMedium = self.sharedLibrary.getMaxXExtruderMedium()
				self.maxXExtruderHigh = self.sharedLibrary.getMaxXExtruderHigh()
				self.maxYExtruderLow = self.sharedLibrary.getMaxYExtruderLow()
				self.maxYExtruderMedium = self.sharedLibrary.getMaxYExtruderMedium()
				self.maxYExtruderHigh = self.sharedLibrary.getMaxYExtruderHigh()
				self.maxZExtruder = self.sharedLibrary.getMaxZExtruder()
				self.minXExtruderLow = self.sharedLibrary.getMinXExtruderLow()
				self.minXExtruderMedium = self.sharedLibrary.getMinXExtruderMedium()
				self.minXExtruderHigh = self.sharedLibrary.getMinXExtruderHigh()
				self.minYExtruderLow = self.sharedLibrary.getMinYExtruderLow()
				self.minYExtruderMedium = self.sharedLibrary.getMinYExtruderMedium()
				self.minYExtruderHigh = self.sharedLibrary.getMinYExtruderHigh()
				self.minZExtruder = self.sharedLibrary.getMinZExtruder()
				
				# Get detected fan speed
				self.detectedFanSpeed = self.sharedLibrary.getDetectedFanSpeed()
				
				# Get detected mid-print filament change
				self.detectedMidPrintFilamentChange = self.sharedLibrary.getDetectedMidPrintFilamentChange()
				
				# Get object successfully centered
				self.objectSuccessfullyCentered = self.sharedLibrary.getObjectSuccessfullyCentered()
			
			# Otherwise
			else :
			
				# Collect print information
				printIsValid = self.collectPrintInformation(input)
		
			# Check if print goes out of bounds
			if not printIsValid :
		
				# Check if processing a slice
				if self.processingSlice :
			
					# Clear processing slice
					self.processingSlice = False
			
					# Set progress bar percent
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "0"))
				
					# Create message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "error", title = "Slicing failed", text = "Could not slice the file. The dimensions of the model go outside the bounds of the printer."))
			
				# Otherwise
				else :
		
					# Set error message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Change last message", text = "Could not upload the file. The dimensions of the model go outside the bounds of the printer."))
				
				# Restore files
				self.restoreFiles()
				
				# Return false
				return False
			
			# Otherwise
			else :
			
				# Check if detected fan speed is 0
				if self.detectedFanSpeed == 0 :
			
					# Create message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "notice", title = "Print warning", text = "No fan speed has been detected in this file which could cause the print to fail"))
				
				# Check if detected mid-print filament change
				if self.detectedMidPrintFilamentChange :
		
					# Create message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "notice", title = "Print warning", text = "This file uses mid-print filament change commands. These commands will be ignored if a client is not connected when they are run, so it's recommended that you keep this page open and stay connected to the server for the entire duration of the print."))
				
				# Check if objected couldn't be centered
				if self._settings.get_boolean(["UseCenterModelPreprocessor"]) and not self.objectSuccessfullyCentered :
			
					# Create message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "notice", title = "Print warning", text = "Object too large to center on print bed"))
			
			# Move the input file to a temporary file
			temp = tempfile.mkstemp()[1]
			shutil.move(input, temp)
			
			# Check if using shared library
			if self.sharedLibrary and self._settings.get_boolean(["UseSharedLibrary"]) :
			
				# Set progress bar text
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Pre-processing …"))
			
				# Pre-process file
				self.sharedLibrary.preprocess(ctypes.c_char_p(temp), ctypes.c_char_p(input), ctypes.c_bool(False))
			
			# Otherwise
			else :
			
				# Pre-process file
				self.preprocess(temp, input)
			
			# Remove temporary file
			os.remove(temp)
		
		# Return processed G-code
		return octoprint.filemanager.util.DiskFileWrapper(os.path.basename(input), input)
	
	# Collect print information
	def collectPrintInformation(self, file) :
	
		# Initialize variables
		localX = None
		localY = None
		localZ = None
		relativeMode = False
		tier = "Low"
		gcode = Gcode()
		
		# Adjust bed Z values to account for external bed height
		self.bedMediumMaxZ = 73.5 - self._settings.get_float(["ExternalBedHeight"])
		self.bedHighMaxZ = 112.0 - self._settings.get_float(["ExternalBedHeight"])
		self.bedHighMinZ = self.bedMediumMaxZ
		
		# Reset detected fan speed
		self.detectedFanSpeed = None
		
		# Reset detected mid-print filament change
		self.detectedMidPrintFilamentChange = False
		
		# Reset object successfully centered
		self.objectSuccessfullyCentered = True
		
		# Reset all print values
		self.maxXExtruderLow = -sys.float_info.max
		self.maxXExtruderMedium = -sys.float_info.max
		self.maxXExtruderHigh = -sys.float_info.max
		self.maxYExtruderLow = -sys.float_info.max
		self.maxYExtruderMedium = -sys.float_info.max
		self.maxYExtruderHigh = -sys.float_info.max
		self.maxZExtruder = -sys.float_info.max
		self.minXExtruderLow = sys.float_info.max
		self.minXExtruderMedium = sys.float_info.max
		self.minXExtruderHigh = sys.float_info.max
		self.minYExtruderLow = sys.float_info.max
		self.minYExtruderMedium = sys.float_info.max
		self.minYExtruderHigh = sys.float_info.max
		self.minZExtruder = sys.float_info.max
	
		# Read in file
		for line in open(file) :

			# Check if line was parsed successfully and it's a G command
			if gcode.parseLine(line) :
			
				# Check if command is the first fan command
				if self.detectedFanSpeed is None and gcode.hasValue('M') and gcode.getValue('M') == "106" :
				
					# Get fan speed
					if gcode.hasValue('S') :
						self.detectedFanSpeed = int(gcode.getValue('S'))
					elif gcode.hasValue('P') :
						self.detectedFanSpeed = int(gcode.getValue('P'))
					else :
						self.detectedFanSpeed = 0
				
				# Otherwise check if command is a mid-print filament change
				elif not self.detectedMidPrintFilamentChange and gcode.hasValue('M') and gcode.getValue('M') == "600" :
				
					# Set mid-print filament change
					self.detectedMidPrintFilamentChange = True
			
				# Otherwise check if command is a G command
				elif gcode.hasValue('G') :
		
					# Check if command is G0 or G1
					if gcode.getValue('G') == "0" or gcode.getValue('G') == "1" :
		
						# Check if command has an X value
						if gcode.hasValue('X') :
			
							# Get X value of the command
							commandX = float(gcode.getValue('X'))
			
							# Set local X
							if relativeMode :
								if localX is None :
									localX = 54
								localX += commandX
							else :
								localX = commandX
			
						# Check if command has an Y value
						if gcode.hasValue('Y') :
			
							# Get Y value of the command
							commandY = float(gcode.getValue('Y'))
			
							# Set local Y
							if relativeMode :
								if localY is None :
									localY = 50
								localY += commandY
							else :
								localY = commandY
		
						# Check if command has an Z value
						if gcode.hasValue('Z') :
			
							# Get Z value of the command
							commandZ = float(gcode.getValue('Z'))
			
							# Set local Z
							if relativeMode :
								if localZ is None :
									localZ = 0.4
								localZ += commandZ
							else :
								localZ = commandZ
			
							# Check if not ignoring print dimension limitations, not printing a test border or backlash calibration cylinder, and Z is out of bounds
							if not self._settings.get_boolean(["IgnorePrintDimensionLimitations"]) and not self.printingTestBorder and not self.printingBacklashCalibrationCylinder and (localZ < self.bedLowMinZ or localZ > self.bedHighMaxZ) :
				
								# Return false
								return False
			
							# Set print tier
							if localZ < self.bedLowMaxZ :
								tier = "Low"
				
							elif localZ < self.bedMediumMaxZ :
								tier = "Medium"
				
							else :
								tier = "High"
				
						# Check if not ignoring print dimension limitations, not printing a test border or backlash calibration cylinder, and centering model pre-processor isn't used
						if not self._settings.get_boolean(["IgnorePrintDimensionLimitations"]) and not self.printingTestBorder and not self.printingBacklashCalibrationCylinder and not self._settings.get_boolean(["UseCenterModelPreprocessor"]) :
			
							# Return false if X or Y are out of bounds				
							if tier == "Low" and ((localX is not None and (localX < self.bedLowMinX or localX > self.bedLowMaxX)) or (localY is not None and (localY < self.bedLowMinY or localY > self.bedLowMaxY))) :
								return False
			
							elif tier == "Medium" and ((localX is not None and (localX < self.bedMediumMinX or localX > self.bedMediumMaxX)) or (localY is not None and (localY < self.bedMediumMinY or localY > self.bedMediumMaxY))) :
								return False

							elif tier == "High" and ((localX is not None and (localX < self.bedHighMinX or localX > self.bedHighMaxX)) or (localY is not None and (localY < self.bedHighMinY or localY > self.bedHighMaxY))) :
								return False
				
						# Update minimums and maximums dimensions of extruder
						if tier == "Low" :
							if localX is not None :
								self.minXExtruderLow = min(self.minXExtruderLow, localX)
								self.maxXExtruderLow = max(self.maxXExtruderLow, localX)
							if localY is not None :
								self.minYExtruderLow = min(self.minYExtruderLow, localY)
								self.maxYExtruderLow = max(self.maxYExtruderLow, localY)
						elif tier == "Medium" :
							if localX is not None :
								self.minXExtruderMedium = min(self.minXExtruderMedium, localX)
								self.maxXExtruderMedium = max(self.maxXExtruderMedium, localX)
							if localY is not None :
								self.minYExtruderMedium = min(self.minYExtruderMedium, localY)
								self.maxYExtruderMedium = max(self.maxYExtruderMedium, localY)
						else :
							if localX is not None :
								self.minXExtruderHigh = min(self.minXExtruderHigh, localX)
								self.maxXExtruderHigh = max(self.maxXExtruderHigh, localX)
							if localY is not None :
								self.minYExtruderHigh = min(self.minYExtruderHigh, localY)
								self.maxYExtruderHigh = max(self.maxYExtruderHigh, localY)
						if localZ is not None :
							self.minZExtruder = min(self.minZExtruder, localZ)
							self.maxZExtruder = max(self.maxZExtruder, localZ)
				
					# Otherwise check if command is G28
					elif gcode.getValue('G') == "28" :

						# Set X and Y to home
						localX = 54
						localY = 50
		
					# Otherwise check if command is G90
					elif gcode.getValue('G') == "90" :
		
						# Clear relative mode
						relativeMode = False
		
					# Otherwise check if command is G91
					elif gcode.getValue('G') == "91" :
		
						# Set relative mode
						relativeMode = True
	
		# Check if center model pre-processor is set and not printing a test border or backlash calibration cylinder
		if self._settings.get_boolean(["UseCenterModelPreprocessor"]) and not self.printingTestBorder and not self.printingBacklashCalibrationCylinder :
	
			# Calculate adjustments
			self.displacementX = (self.bedWidth - self.bedCenterOffsetX - max(self.maxXExtruderLow, max(self.maxXExtruderMedium, self.maxXExtruderHigh)) - min(self.minXExtruderLow, min(self.minXExtruderMedium, self.minXExtruderHigh)) - self.bedCenterOffsetX) / 2
			self.displacementY = (self.bedDepth - self.bedCenterOffsetY - max(self.maxYExtruderLow, max(self.maxYExtruderMedium, self.maxYExtruderHigh)) - min(self.minYExtruderLow, min(self.minYExtruderMedium, self.minYExtruderHigh)) - self.bedCenterOffsetY) / 2
			
			# Adjust print values
			if self.maxXExtruderLow != -sys.float_info.max :
				self.maxXExtruderLow += self.displacementX
			if self.maxXExtruderMedium != -sys.float_info.max :
				self.maxXExtruderMedium += self.displacementX
			if self.maxXExtruderHigh != -sys.float_info.max :
				self.maxXExtruderHigh += self.displacementX
			if self.maxYExtruderLow != -sys.float_info.max :
				self.maxYExtruderLow += self.displacementY
			if self.maxYExtruderMedium != -sys.float_info.max :
				self.maxYExtruderMedium += self.displacementY
			if self.maxYExtruderHigh != -sys.float_info.max :
				self.maxYExtruderHigh += self.displacementY
			if self.minXExtruderLow != sys.float_info.max :
				self.minXExtruderLow += self.displacementX
			if self.minXExtruderMedium != sys.float_info.max :
				self.minXExtruderMedium += self.displacementX
			if self.minXExtruderHigh != sys.float_info.max :
				self.minXExtruderHigh += self.displacementX
			if self.minYExtruderLow != sys.float_info.max :
				self.minYExtruderLow += self.displacementY
			if self.minYExtruderMedium != sys.float_info.max :
				self.minYExtruderMedium += self.displacementY
			if self.minYExtruderHigh != sys.float_info.max :
				self.minYExtruderHigh += self.displacementY
			
			# Get negative displacement X
			negativeDisplacementX = 0
			negativeDisplacementX = max(self.maxXExtruderLow - self.bedLowMaxX, negativeDisplacementX)
			negativeDisplacementX = max(self.maxXExtruderMedium - self.bedMediumMaxX, negativeDisplacementX)
			negativeDisplacementX = max(self.maxXExtruderHigh - self.bedHighMaxX, negativeDisplacementX)
			
			# Get positive displacement X
			positiveDisplacementX = 0
			positiveDisplacementX = max(self.bedLowMinX - self.minXExtruderLow, positiveDisplacementX)
			positiveDisplacementX = max(self.bedMediumMinX - self.minXExtruderMedium, positiveDisplacementX)
			positiveDisplacementX = max(self.bedHighMinX - self.minXExtruderHigh, positiveDisplacementX)
			
			# Check if a negative displacement X is possible
			additionalDisplacementX = 0
			if negativeDisplacementX > 0 and positiveDisplacementX <= 0 :
			
				# Set additional displacement X to negative displacement X
				additionalDisplacementX = -negativeDisplacementX
			
			# Otherwise check if a positive displacement X is possible
			elif positiveDisplacementX > 0 and negativeDisplacementX <= 0 :
			
				# Set additional displacement X to positive displacement X
				additionalDisplacementX = positiveDisplacementX
			
			# Get negative displacement Y
			negativeDisplacementY = 0
			negativeDisplacementY = max(self.maxYExtruderLow - self.bedLowMaxY, negativeDisplacementY)
			negativeDisplacementY = max(self.maxYExtruderMedium - self.bedMediumMaxY, negativeDisplacementY)
			negativeDisplacementY = max(self.maxYExtruderHigh - self.bedHighMaxY, negativeDisplacementY)
			
			# Get positive displacement Y
			positiveDisplacementY = 0
			positiveDisplacementY = max(self.bedLowMinY - self.minYExtruderLow, positiveDisplacementY)
			positiveDisplacementY = max(self.bedMediumMinY - self.minYExtruderMedium, positiveDisplacementY)
			positiveDisplacementY = max(self.bedHighMinY - self.minYExtruderHigh, positiveDisplacementY)
			
			# Check if a negative displacement Y is possible
			additionalDisplacementY = 0
			if negativeDisplacementY > 0 and positiveDisplacementY <= 0 :
			
				# Set additional displacement Y to negative displacement Y
				additionalDisplacementY = -negativeDisplacementY
			
			# Otherwise check if a positive displacement Y is possible
			elif positiveDisplacementY > 0 and negativeDisplacementY <= 0 :
			
				# Set additional displacement Y to positive displacement Y
				additionalDisplacementY = positiveDisplacementY
			
			# Check if an additional displacement is necessary
			if additionalDisplacementX != 0 or additionalDisplacementY != 0 :
			
				# Clear object successfully centered
				self.objectSuccessfullyCentered = False
			
				# Adjust print values
				self.displacementX += additionalDisplacementX
				self.displacementY += additionalDisplacementY
				if self.maxXExtruderLow != -sys.float_info.max :
					self.maxXExtruderLow += additionalDisplacementX
				if self.maxXExtruderMedium != -sys.float_info.max :
					self.maxXExtruderMedium += additionalDisplacementX
				if self.maxXExtruderHigh != -sys.float_info.max :
					self.maxXExtruderHigh += additionalDisplacementX
				if self.maxYExtruderLow != -sys.float_info.max :
					self.maxYExtruderLow += additionalDisplacementY
				if self.maxYExtruderMedium != -sys.float_info.max :
					self.maxYExtruderMedium += additionalDisplacementY
				if self.maxYExtruderHigh != -sys.float_info.max :
					self.maxYExtruderHigh += additionalDisplacementY
				if self.minXExtruderLow != sys.float_info.max :
					self.minXExtruderLow += additionalDisplacementX
				if self.minXExtruderMedium != sys.float_info.max :
					self.minXExtruderMedium += additionalDisplacementX
				if self.minXExtruderHigh != sys.float_info.max :
					self.minXExtruderHigh += additionalDisplacementX
				if self.minYExtruderLow != sys.float_info.max :
					self.minYExtruderLow += additionalDisplacementY
				if self.minYExtruderMedium != sys.float_info.max :
					self.minYExtruderMedium += additionalDisplacementY
				if self.minYExtruderHigh != sys.float_info.max :
					self.minYExtruderHigh += additionalDisplacementY
			
			# Check if not ignoring print dimension limitations and adjusted print values are out of bounds
			if not self._settings.get_boolean(["IgnorePrintDimensionLimitations"]) and (self.minZExtruder < self.bedLowMinZ or self.maxZExtruder > self.bedHighMaxZ or self.maxXExtruderLow > self.bedLowMaxX or self.maxXExtruderMedium > self.bedMediumMaxX or self.maxXExtruderHigh > self.bedHighMaxX or self.maxYExtruderLow > self.bedLowMaxY or self.maxYExtruderMedium > self.bedMediumMaxY or self.maxYExtruderHigh > self.bedHighMaxY or self.minXExtruderLow < self.bedLowMinX or self.minXExtruderMedium < self.bedMediumMinX or self.minXExtruderHigh < self.bedHighMinX or self.minYExtruderLow < self.bedLowMinY or self.minYExtruderMedium < self.bedMediumMinY or self.minYExtruderHigh < self.bedHighMinY) :
	
				# Return false
				return False
		
		# Check if all fan commands are being removed
		if self.detectedFanSpeed is None or self._settings.get_boolean(["RemoveFanCommands"]) :
		
			# Set detected fan speed
			self.detectedFanSpeed = 0
		
		# Check if using preparation pre-processor or printing a test border or backlash calibration cylinder
		if self._settings.get_boolean(["UsePreparationPreprocessor"]) or self.printingTestBorder or self.printingBacklashCalibrationCylinder :
		
			# Set detected fan speed
			if str(self._settings.get(["FilamentType"])) == "PLA" or str(self._settings.get(["FilamentType"])) == "FLX" or str(self._settings.get(["FilamentType"])) == "TGH" :
				self.detectedFanSpeed = 255
			else :
				self.detectedFanSpeed = 50
		
		# Get mid-print filament change layers
		self.midPrintFilamentChangeLayers = re.findall("\\d+", str(self._settings.get(["MidPrintFilamentChangeLayers"])))
		
		# Check if mid-print filament change layers exist
		if len(self.midPrintFilamentChangeLayers) :
		
			# Set mid-print filament change
			self.detectedMidPrintFilamentChange = True
		
		# Return true
		return True
	
	# Get bounded temperature
	def getBoundedTemperature(self, value) :
	
		# Return temperature in bounded range
		return min(max(value, 150), 315)
	
	# Get distance
	def getDistance(self, firstPoint, secondPoint) :

		# Get first point coordinates
		if firstPoint.hasValue('X') :
			firstX = float(firstPoint.getValue('X'))
		else :
			firstX = 0
		
		if firstPoint.hasValue('Y') :
			firstY = float(firstPoint.getValue('Y'))
		else :
			firstY = 0
		
		# Get second point coordinates
		if secondPoint.hasValue('X') :
			secondX = float(secondPoint.getValue('X'))
		else :
			secondX = 0
		
		if secondPoint.hasValue('Y') :
			secondY = float(secondPoint.getValue('Y'))
		else :
			secondY = 0
		
		# Return distance between the two values
		return math.sqrt(math.pow(firstX - secondX, 2) + math.pow(firstY - secondY, 2))
	
	# Create tack point
	def createTackPoint(self, point, refrence) :
	
		# Initialize variables
		gcode = Gcode()
		time = math.ceil(self.getDistance(point, refrence))
	
		# Check if time is greater than 5
		if time > 5 :
	
			# Set G-code to a delay command based on time
			gcode.setValue('G', '4')
			gcode.setValue('P', str(time))
	
		# Return G-code
		return gcode
	
	# Is sharp corner for thermal bonding
	def isSharpCornerForThermalBonding(self, point, refrence) :

		# Get point coordinates
		if point.hasValue('X') :
			currentX = float(point.getValue('X'))
		else :
			currentX = 0
		
		if point.hasValue('Y') :
			currentY = float(point.getValue('Y'))
		else :
			currentY = 0
		
		# Get refrence coordinates
		if refrence.hasValue('X') :
			previousX = float(refrence.getValue('X'))
		else :
			previousX = 0
		
		if refrence.hasValue('Y') :
			previousY = float(refrence.getValue('Y'))
		else :
			previousY = 0
		
		# Check if divide by zero
		denominator = math.pow(currentX * currentX + currentY * currentY, 2) * math.pow(previousX * previousX + previousY * previousY, 2)
		if denominator == 0 :
		
			# Return false
			return False
		
		# Otherwise
		else :
		
			# Calculate value
			try :
				value = math.acos((currentX * previousX + currentY * previousY) / denominator)
			
			# Check if value is not a number
			except ValueError :
			
				# Return false
				return False
		
		# Return if sharp corner
		return value > 0 and value < math.pi / 2
	
	# Is sharp corner for wave bonding
	def isSharpCornerForWaveBonding(self, point, refrence) :

		# Get point coordinates
		if point.hasValue('X') :
			currentX = float(point.getValue('X'))
		else :
			currentX = 0
		
		if point.hasValue('Y') :
			currentY = float(point.getValue('Y'))
		else :
			currentY = 0
		
		# Get refrence coordinates
		if refrence.hasValue('X') :
			previousX = float(refrence.getValue('X'))
		else :
			previousX = 0
		
		if refrence.hasValue('Y') :
			previousY = float(refrence.getValue('Y'))
		else :
			previousY = 0
		
		# Check if divide by zero
		denominator = math.pow(currentX * currentX + currentY + currentY, 2) * math.pow(previousX * previousX + previousY + previousY, 2)
		if denominator == 0 :
		
			# Return false
			return False
		
		# Otherwise
		else :
		
			# Calculate value
			try :
				value = math.acos((currentX * previousX + currentY + previousY) / denominator)
			
			# Check if value is not a number
			except ValueError :
			
				# Return false
				return False
		
		# Return if sharp corner
		return value > 0 and value < math.pi / 2
	
	# Get current adjustment Z
	def getCurrentAdjustmentZ(self) :

		# Set adjustment
		if self.waveStep == 0 :
			adjustment = 1
		elif self.waveStep == 2 :
			adjustment = -1.5
		else :
			adjustment = 0
	
		# Increment wave step
		self.waveStep = (self.waveStep + 1) % 4
		
		# Return adjustment
		return adjustment * self.waveSize
	
	# Caluclate plane normal
	def calculatePlaneNormalVector(self, v1, v2, v3) :
	
		# Initialize variables
		vector = v2 - v1
		vector2 = v3 - v1
		vector3 = Vector()
		
		# Return normal vector
		vector3[0] = vector[1] * vector2[2] - vector2[1] * vector[2]
		vector3[1] = vector[2] * vector2[0] - vector2[2] * vector[0]
		vector3[2] = vector[0] * vector2[1] - vector2[0] * vector[1]
		return vector3
	
	# Generate plane equation
	def generatePlaneEquation(self, v1, v2, v3) :
	
		# Initialize variables
		vector = Vector()
		vector2 = self.calculatePlaneNormalVector(v1, v2, v3)
		
		# Return plane equation
		vector[0] = vector2[0]
		vector[1] = vector2[1]
		vector[2] = vector2[2]
		vector[3] = -(vector[0] * v1[0] + vector[1] * v1[1] + vector[2] * v1[2])
		return vector
	
	# Get height adjustment required
	def getHeightAdjustmentRequired(self, x, y) :

		# Set corner vectors
		vector = Vector(99, 95, self._settings.get_float(["BackRightOrientation"]) + self._settings.get_float(["BackRightOffset"]))
		vector2 = Vector(9, 95, self._settings.get_float(["BackLeftOrientation"]) + self._settings.get_float(["BackLeftOffset"]))
		vector3 = Vector(9, 5, self._settings.get_float(["FrontLeftOrientation"]) + self._settings.get_float(["FrontLeftOffset"]))
		vector4 = Vector(99, 5, self._settings.get_float(["FrontRightOrientation"]) + self._settings.get_float(["FrontRightOffset"]))
		vector5 = Vector(54, 50, 0)
		
		# Calculate planes
		planeABC = self.generatePlaneEquation(vector2, vector, vector5)
		vector7 = self.generatePlaneEquation(vector2, vector3, vector5)
		vector8 = self.generatePlaneEquation(vector, vector4, vector5)
		vector9 = self.generatePlaneEquation(vector3, vector4, vector5)
		point = Vector(x, y, 0)
		
		# Return height adjustment
		if x <= vector3.x and y >= vector.y :
			return (self.getZFromXYAndPlane(point, planeABC) + self.getZFromXYAndPlane(point, vector7)) / 2
		
		elif x <= vector3.x and y <= vector3.y :
			return (self.getZFromXYAndPlane(point, vector9) + self.getZFromXYAndPlane(point, vector7)) / 2
		
		elif x >= vector4.x and y <= vector3.y :
			return (self.getZFromXYAndPlane(point, vector9) + self.getZFromXYAndPlane(point, vector8)) / 2
		
		elif x >= vector4.x and y >= vector.y :
			return (self.getZFromXYAndPlane(point, planeABC) + self.getZFromXYAndPlane(point, vector8)) / 2
		
		elif x <= vector3.x :
			return self.getZFromXYAndPlane(point, vector7)
		
		elif x >= vector4.x :
			return self.getZFromXYAndPlane(point, vector8)
		
		elif y >= vector.y :
			return self.getZFromXYAndPlane(point, planeABC)
		
		elif y <= vector3.y :
			return self.getZFromXYAndPlane(point, vector9)
		
		elif self.isPointInTriangle(point, vector5, vector3, vector2) :
			return self.getZFromXYAndPlane(point, vector7)
		
		elif self.isPointInTriangle(point, vector5, vector4, vector) :
			return self.getZFromXYAndPlane(point, vector8)
		
		elif self.isPointInTriangle(point, vector5, vector2, vector) :
			return self.getZFromXYAndPlane(point, planeABC)
		
		else :
			return self.getZFromXYAndPlane(point, vector9)
	
	# Get Z from X, Y, and plane
	def getZFromXYAndPlane(self, point, planeABC) :
	
		# Return Z
		return (planeABC[0] * point.x + planeABC[1] * point.y + planeABC[3]) / -planeABC[2]
	
	# Is point in triangle
	def isPointInTriangle(self, pt, v1, v2, v3) :
	
		# Initialize variables
		vector = v1 - v2 + v1 - v3
		vector.normalize()
		vector2 = v1 + vector * 0.01
		vector = v2 - v1 + v2 - v3
		vector.normalize()
		vector3 = v2 + vector * 0.01
		vector = v3 - v1 + v3 - v2
		vector.normalize()
		vector4 = v3 + vector * 0.01
		
		# Return if inside triangle
		flag = self.sign(pt, vector2, vector3) < 0
		flag2 = self.sign(pt, vector3, vector4) < 0
		flag3 = self.sign(pt, vector4, vector2) < 0
		return flag == flag2 and flag2 == flag3
	
	# Sign
	def sign(self, p1, p2, p3) :
	
		# Return sign
		return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y)
	
	# Pre-process
	def preprocess(self, input, output = None, lastCommand = False) :
	
		# Initialize variables
		commands = collections.deque()
		
		# Check if outputting to a file
		if output is not None :

			# Open input and output
			input = open(input, "rb")
			output = open(output, "wb")
		
		# Otherwise
		else :
		
			# Initialize variables
			processedCommand = False
			value = []
		
		# Loop forever
		while True:
		
			# Check if outputting to a file
			if output is not None :

				# Check if no more commands
				if len(commands) == 0 :
	
					# Check if not at end of file
					if input.tell() != os.fstat(input.fileno()).st_size :

						# Append line to commands
						line = input.readline()
						commands.append(Command(line, "INPUT", "NONE"))
		
					# Otherwise
					else :
	
						# Break
						break
				
				# Check if not printing test border or backlash calibration cylinder
				if not self.printingTestBorder and not self.printingBacklashCalibrationCylinder :
				
					# Set progress bar text
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Pre-processing … (" + str(input.tell() * 100 / os.fstat(input.fileno()).st_size) + "%)"))
			
			# Otherwise check if no more commands
			elif len(commands) == 0 :
				
				# Check if command hasn't been processed
				if not processedCommand :
		
					# Append input to commands
					commands.append(Command(input, "INPUT", "NONE"))
					
					# Set processed command
					processedCommand = True
				
				# Otherwise
				else :
				
					# Break
					break

			# Parse next line in commands
			gcode = Gcode()
			command = commands.pop()
			gcode.parseLine(command.line)
			
			# Check if command contains valid G-code
			if not gcode.isEmpty() :
			
				# Remove line number
				gcode.removeParameter('N')
				
				# Check if command is from the input file, hasn't been processed yet, and it contains a G value
				if command.origin == "INPUT" and command.skip == "NONE" and gcode.hasValue('G') :
				
					# Set new E
					newE = self.currentE
					
					# Check if command is G0 or G1
					if gcode.getValue('G') == "0" or gcode.getValue('G') == "1" :
					
						# Check if command changes Z
						if gcode.hasValue('Z') :
			
							# Set current Z
							if self.relativeMode :
								self.currentZ += float(gcode.getValue('Z'))
							else :
								self.currentZ = float(gcode.getValue('Z'))
						
						# Check if command contains an E value
						if gcode.hasValue('E') :
				
							# Set new E
							if self.relativeMode :
								newE += float(gcode.getValue('E'))
							else :
								newE = float(gcode.getValue('E'))
			
					# Otherwise check if command is G90
					elif gcode.getValue('G') == "90" :
				
						# Clear relative mode
						self.relativeMode = False
				
					# Otherwise check if command is G91
					elif gcode.getValue('G') == "91" :
				
						# Set relative mode
						self.relativeMode = True
				
					# Otherwise check if command is G92
					elif gcode.getValue('G') == "92" :
			
						# Set new E
						if gcode.hasValue('E') :
							newE = float(gcode.getValue('E'))
						else :
							newE = 0
				
					# Check if first time layer extrudes filament
					if newE > self.currentE and self.currentZ not in self.printedLayers :
					
						# Append layer to list
						self.printedLayers.append(self.currentZ)
						
						# Set on new printed layer
						self.onNewPrintedLayer = True
			
					# Set current E
					self.currentE = newE
			
			# Check if not printing test border or backlash calibration cylinder and using mid-print filament change pre-processor
			if not self.printingTestBorder and not self.printingBacklashCalibrationCylinder and len(self.midPrintFilamentChangeLayers) and "MID-PRINT" not in command.skip :
			
				# Set command skip
				command.skip += " MID-PRINT"
				
				# Check if command is on a new printed layer
				if self.onNewPrintedLayer :
					
					# Increment layer counter
					self.midPrintFilamentChangeLayerCounter += 1
					
					# Check if at the start of a specified layer
					if str(self.midPrintFilamentChangeLayerCounter) in self.midPrintFilamentChangeLayers :
					
						# Initialize new commands
						newCommands = []
						
						# Add mid-print filament change command to output
						newCommands.append(Command("M600", "MID-PRINT", "MID-PRINT"))
						
						# Finish processing command later
						if not gcode.isEmpty() :
							commands.append(Command(gcode.getAscii(), command.origin, command.skip))
						else :
							commands.append(Command(command.line, command.origin, command.skip))
		
						# Append new commands to commands
						while len(newCommands) :
							commands.append(newCommands.pop())
		
						# Process next command
						continue
			
			# Check if not printing test border or backlash calibration cylinder and using center model pre-processor
			if not self.printingTestBorder and not self.printingBacklashCalibrationCylinder and self._settings.get_boolean(["UseCenterModelPreprocessor"]) and "CENTER" not in command.skip :
			
				# Set command skip
				command.skip += " CENTER"
				
				# Check if command contains valid G-code
				if not gcode.isEmpty() :

					# Check if command is G0 or G1
					if gcode.hasValue('G') and (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") :

						# Check if line contains an X value
						if gcode.hasValue('X') :

							# Adjust X value
							gcode.setValue('X', "%f" % (float(gcode.getValue('X')) + self.displacementX))

						# Check if line contains a Y value
						if gcode.hasValue('Y') :

							# Adjust Y value
							gcode.setValue('Y', "%f" % (float(gcode.getValue('Y')) + self.displacementY))

			# Check if printing test border or backlash calibration cylinder or using validation pre-processor
			if (self.printingTestBorder or self.printingBacklashCalibrationCylinder or self._settings.get_boolean(["UseValidationPreprocessor"])) and "VALIDATION" not in command.skip :
			
				# Set command skip
				command.skip += " VALIDATION"
				
				# Check if command contains valid G-code
				if not gcode.isEmpty() :

					# Check if extruder absolute mode, extruder relative mode, stop idle hold, request temperature, or request coordinates command
					if gcode.hasValue('M') and (gcode.getValue('M') == "82" or gcode.getValue('M') == "83" or gcode.getValue('M') == "84" or gcode.getValue('M') == "105" or gcode.getValue('M') == "117") :

						# Get next line
						continue

					# Check if unit to millimeters or home command
					if gcode.hasValue('G') and (gcode.getValue('G') == "21" or gcode.getValue('G') == "28") :

						# Get next line
						continue

					# Check if command contains tool selection
					if gcode.hasParameter('T') :

						# Remove tool selection
						gcode.removeParameter('T')

						# Get next line if empty
						if gcode.isEmpty() :
							continue
					
					# Check if command is a fan command and set to remove fan commands
					if self._settings.get_boolean(["RemoveFanCommands"]) and gcode.hasValue('M') and (gcode.getValue('M') == "106" or gcode.getValue('M') == "107") :

						# Get next line
						continue
					
					# Check if command is a temperature command and set to remove temperature commands
					if self._settings.get_boolean(["RemoveTemperatureCommands"]) and gcode.hasValue('M') and (gcode.getValue('M') == "104" or gcode.getValue('M') == "109" or gcode.getValue('M') == "140" or gcode.getValue('M') == "190") :

						# Get next line
						continue
			
			# Check if printing test border or backlash calibration cylinder or using preparation pre-processor
			if (self.printingTestBorder or self.printingBacklashCalibrationCylinder or self._settings.get_boolean(["UsePreparationPreprocessor"])) and "PREPARATION" not in command.skip :

				# Set command skip
				command.skip += " PREPARATION"
				
				# Check if intro hasn't been added yet
				if not self.addedIntro :

					# Set added intro
					self.addedIntro = True
			
					# Initialize new commands
					newCommands = []
					
					# Check if not printing test border
					cornerX = cornerY = cornerZ = 0
					if not self.printingTestBorder :

						# Set corner X
						if self.minXExtruderLow > self.bedLowMinX :
							cornerX = -(self.bedLowMaxX - self.bedLowMinX) / 2
						elif self.maxXExtruderLow < self.bedLowMaxX :
							cornerX = (self.bedLowMaxX - self.bedLowMinX) / 2

						# Set corner Y
						if self.minYExtruderLow > self.bedLowMinY :
							cornerY = -(self.bedLowMaxY - self.bedLowMinY - 10) / 2
						elif self.maxYExtruderLow < self.bedLowMaxY :
							cornerY = (self.bedLowMaxY - self.bedLowMinY - 10) / 2
					
					# Check if both of the corners are set
					if cornerX != 0 and cornerY != 0 :
					
						# Set cornet Z
						if cornerX > 0 and cornerY > 0 :
							cornerZ = self._settings.get_float(["BackRightOrientation"]) + self._settings.get_float(["BackRightOffset"])
						elif cornerX < 0 and cornerY > 0 :
							cornerZ = self._settings.get_float(["BackLeftOrientation"]) + self._settings.get_float(["BackLeftOffset"])
						elif cornerX < 0 and cornerY < 0 :
							cornerZ = self._settings.get_float(["FrontLeftOrientation"]) + self._settings.get_float(["FrontLeftOffset"])
						elif cornerX > 0 and cornerY < 0 :
							cornerZ = self._settings.get_float(["FrontRightOrientation"]) + self._settings.get_float(["FrontRightOffset"])
					
					# Add intro to output
					newCommands.append(Command("G90", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("M420 T1", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					if self._settings.get_boolean(["CalibrateBeforePrint"]) :
						newCommands.append(Command("G30", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					if str(self._settings.get(["FilamentType"])) == "PLA" or str(self._settings.get(["FilamentType"])) == "FLX" or str(self._settings.get(["FilamentType"])) == "TGH" :
						newCommands.append(Command("M106 S255", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					else :
						newCommands.append(Command("M106 S50", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("M17", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G90", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("M104 S" + str(self._settings.get_int(["FilamentTemperature"])), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G0 Z5 F48", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G28", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))

					# Add heatbed command if using a heatbed
					if self.heatbedConnected :
						newCommands.append(Command("M190 S" + str(self._settings.get_int(["HeatbedTemperature"])), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))

					# Check if one of the corners wasn't set
					if cornerX == 0 or cornerY == 0 :

						# Prepare extruder the standard way
						newCommands.append(Command("M18", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M109 S" + str(self._settings.get_int(["FilamentTemperature"])), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G4 S2", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M17", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G92 E0", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G0 Z0.4 F48", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					
					# Otherwise
					else :

						# Prepare extruder by leaving excess at corner
						newCommands.append(Command("G0 X%f Y%f F1800" % (54 + cornerX, 50 + cornerY), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M18", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M109 S" + str(self._settings.get_int(["FilamentTemperature"])), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M17", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G0 Z%f F48" % (cornerZ + 3), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G92 E0", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G0 E10 F360", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G4 S3", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G0 X%f Y%f Z%f F400" % (54 + cornerX - cornerX * 0.1, 50 + cornerY - cornerY * 0.1, cornerZ + 0.5), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G92 E0", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					
					# Finish processing command later
					if not gcode.isEmpty() :
						commands.append(Command(gcode.getAscii(), command.origin, command.skip))
					else :
						commands.append(Command(command.line, command.origin, command.skip))
		
					# Append new commands to commands
					while len(newCommands) :
						commands.append(newCommands.pop())
		
					# Process next command
					continue

				# Check if outro hasn't been added, no more commands, and at end of file
				if not self.addedOutro and len(commands) == 0 and ((output is not None and input.tell() == os.fstat(input.fileno()).st_size) or lastCommand) :

					# Set added outro
					self.addedOutro = True
			
					# Initialize new commands
					newCommands = []
					
					# Set move Z
					moveZ = self.maxZExtruder + 10
					if moveZ > self.bedHighMaxZ :
						moveZ = self.bedHighMaxZ
					
					# Set move Y
					startingMoveY = self.maxYExtruderLow
					maxMoveY = self.bedLowMaxY
					
					if moveZ >= self.bedMediumMaxZ :
						
						if self.maxYExtruderMedium != -sys.float_info.max :
							startingMoveY = max(startingMoveY, self.maxYExtruderMedium)
						if self.maxYExtruderHigh != -sys.float_info.max :
							startingMoveY = max(startingMoveY, self.maxYExtruderHigh)
						
						maxMoveY = self.bedHighMaxY
					elif moveZ >= self.bedLowMaxZ :
					
						if self.maxYExtruderMedium != -sys.float_info.max :
							startingMoveY = max(startingMoveY, self.maxYExtruderMedium)
						
						maxMoveY = self.bedMediumMaxY
					
					moveY = startingMoveY + 20
					if moveY > maxMoveY :
						moveY = maxMoveY
					
					# Add outro to output
					newCommands.append(Command("G90", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G92 E0", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G0 Y%f Z%f E-8 F1800" % (moveY, moveZ), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("M104 S0", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))

					if self.heatbedConnected :
						newCommands.append(Command("M140 S0", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					
					if self._settings.get_boolean(["UseGpio"]) :
						newCommands.append(Command("M107 T1", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))

					newCommands.append(Command("M18", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("M107", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					
					if self.printerColor == "Clear" :
						newCommands.append(Command("M420 T20", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					else :
						newCommands.append(Command("M420 T100", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G4 P500", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("M420 T1", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G4 P500", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					if self.printerColor == "Clear" :
						newCommands.append(Command("M420 T20", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					else :
						newCommands.append(Command("M420 T100", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G4 P500", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("M420 T1", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G4 P500", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					if self.printerColor == "Clear" :
						newCommands.append(Command("M420 T20", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					else :
						newCommands.append(Command("M420 T100", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G4 P500", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("M420 T1", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G4 P500", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					if self.printerColor == "Clear" :
						newCommands.append(Command("M420 T20", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					else :
						newCommands.append(Command("M420 T100", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
			
					# Append new commands to commands
					while len(newCommands) :
						commands.append(newCommands.pop())
				
				# Otherwise check if command is on a new printed layer
				elif self.onNewPrintedLayer :
					
					# Increment layer counter
					self.preparationLayerCounter += 1
					
					# Check if using a GPIO pin
					if self._settings.get_boolean(["UseGpio"]) :
					
						# Get GPIO layer
						gpioLayer = self._settings.get_int(["GpioLayer"])
						
						# Check if at the start of the specified layer
						if gpioLayer is not None and self.preparationLayerCounter == gpioLayer :
					
							# Initialize new commands
							newCommands = []
						
							# Add command to set GPIO pin high
							newCommands.append(Command("M106 T1", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					
							# Finish processing command later
							if not gcode.isEmpty() :
								commands.append(Command(gcode.getAscii(), command.origin, command.skip))
							else :
								commands.append(Command(command.line, command.origin, command.skip))
	
							# Append new commands to commands
							while len(newCommands) :
								commands.append(newCommands.pop())
		
							# Get next command
							continue
			
			# Check if not printing test border or backlash calibration cylinder and using wave bonding pre-processor
			if not self.printingTestBorder and not self.printingBacklashCalibrationCylinder and self._settings.get_boolean(["UseWaveBondingPreprocessor"]) and "WAVE" not in command.skip :

				# Set command skip
				command.skip += " WAVE"
				
				# Initialize new commands
				newCommands = []

				# Check if command contains valid G-code
				if not gcode.isEmpty() :
				
					# Check if command is a G command
					if gcode.hasValue('G') :
					
						# Check if on a new printed layer
						if self.waveBondingLayerCounter < 2 and self.onNewPrintedLayer :
		
							# Increment layer counter
							self.waveBondingLayerCounter += 1

						# Check if on first counted layer
						if self.waveBondingLayerCounter == 1 :

							# Check if command is G0 or G1 and it's in absolute mode
							if (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") and not self.waveBondingRelativeMode :

								# Check if line contains an X or Y value
								if gcode.hasValue('X') or gcode.hasValue('Y') :

									# Set changes plane
									self.waveBondingChangesPlane = True

								# Set delta values
								if gcode.hasValue('X') :
									deltaX = float(gcode.getValue('X')) - self.waveBondingPositionRelativeX
								else :
									deltaX = 0

								if gcode.hasValue('Y') :
									deltaY = float(gcode.getValue('Y')) - self.waveBondingPositionRelativeY
								else :
									deltaY = 0

								if gcode.hasValue('Z') :
									deltaZ = float(gcode.getValue('Z')) - self.waveBondingPositionRelativeZ
								else :
									deltaZ = 0
	
								if gcode.hasValue('E') :
									deltaE = float(gcode.getValue('E')) - self.waveBondingPositionRelativeE
								else :
									deltaE = 0

								# Adjust relative values for the changes
								self.waveBondingPositionRelativeX += deltaX
								self.waveBondingPositionRelativeY += deltaY
								self.waveBondingPositionRelativeZ += deltaZ
								self.waveBondingPositionRelativeE += deltaE

								# Calculate distance of change
								distance = math.sqrt(deltaX * deltaX + deltaY * deltaY)

								# Set wave ratio
								if distance > self.wavePeriodQuarter :
									waveRatio = int(float(str(distance / self.wavePeriodQuarter)))
								else :
									waveRatio = 1

								# Set relative differences
								relativeDifferenceX = self.waveBondingPositionRelativeX - deltaX
								relativeDifferenceY = self.waveBondingPositionRelativeY - deltaY
								relativeDifferenceZ = self.waveBondingPositionRelativeZ - deltaZ
								relativeDifferenceE = self.waveBondingPositionRelativeE - deltaE

								# Set delta ratios
								if distance != 0 :
									deltaRatioX = deltaX / distance
									deltaRatioY = deltaY / distance
									deltaRatioZ = deltaZ / distance
									deltaRatioE = deltaE / distance
								else :
									deltaRatioX = 0
									deltaRatioY = 0
									deltaRatioZ = 0
									deltaRatioE = 0

								# Check if delta E is greater than zero 
								if deltaE > 0 :

									# Check if previous G-code is not empty
									if not self.waveBondingPreviousGcode.isEmpty() :

										# Check if first sharp corner
										if self.waveBondingCornerCounter < 1 and self.isSharpCornerForWaveBonding(gcode, self.waveBondingPreviousGcode) :
	
											# Check if refrence G-codes isn't set
											if self.waveBondingRefrenceGcode.isEmpty() :
		
												# Check if a tack point was created
												self.waveBondingTackPoint = self.createTackPoint(gcode, self.waveBondingPreviousGcode)
												if not self.waveBondingTackPoint.isEmpty() :
									
													# Add tack point to output
													newCommands.append(Command(self.waveBondingTackPoint.getAscii(), "WAVE", "MID-PRINT CENTER VALIDATION PREPARATION WAVE"))
		
											# Set refrence G-code
											self.waveBondingRefrenceGcode = copy.deepcopy(gcode)
		
											# Increment corner counter
											self.waveBondingCornerCounter += 1
	
										# Otherwise check if sharp corner
										elif self.isSharpCornerForWaveBonding(gcode, self.waveBondingRefrenceGcode) :
	
											# Check if a tack point was created
											self.waveBondingTackPoint = self.createTackPoint(gcode, self.waveBondingRefrenceGcode)
											if not self.waveBondingTackPoint.isEmpty() :
								
												# Add tack point to output
												newCommands.append(Command(self.waveBondingTackPoint.getAscii(), "WAVE", "MID-PRINT CENTER VALIDATION PREPARATION WAVE"))
		
											# Set refrence G-code
											self.waveBondingRefrenceGcode = copy.deepcopy(gcode)

									# Go through all of the wave
									index = 1
									while index <= waveRatio :

										# Check if at last component
										if index == waveRatio :
	
											# Set temp relative values
											tempRelativeX = self.waveBondingPositionRelativeX
											tempRelativeY = self.waveBondingPositionRelativeY
											tempRelativeZ = self.waveBondingPositionRelativeZ
											tempRelativeE = self.waveBondingPositionRelativeE
	
										# Otherwise
										else :
	
											# Set temp relative values
											tempRelativeX = relativeDifferenceX + index * self.wavePeriodQuarter * deltaRatioX
											tempRelativeY = relativeDifferenceY + index * self.wavePeriodQuarter * deltaRatioY
											tempRelativeZ = relativeDifferenceZ + index * self.wavePeriodQuarter * deltaRatioZ
											tempRelativeE = relativeDifferenceE + index * self.wavePeriodQuarter * deltaRatioE
	
										# Check if not at least component
										if index != waveRatio :
	
											# Set extra G-code G value
											self.waveBondingExtraGcode.clear()
											self.waveBondingExtraGcode.setValue('G', gcode.getValue('G'))
		
											# Set extra G-code X value
											if gcode.hasValue('X') :
												self.waveBondingExtraGcode.setValue('X', "%f" % (self.waveBondingPositionRelativeX - deltaX + tempRelativeX - relativeDifferenceX))
		
											# Set extra G-cdoe Y value
											if gcode.hasValue('Y') :
												self.waveBondingExtraGcode.setValue('Y', "%f" % (self.waveBondingPositionRelativeY - deltaY + tempRelativeY - relativeDifferenceY))
		
											# Set extra G-code F value if first element
											if gcode.hasValue('F') and index == 1 :
												self.waveBondingExtraGcode.setValue('F', gcode.getValue('F'))
		
											# Check if plane changed
											if self.waveBondingChangesPlane :
		
												# Set extra G-code Z value
												self.waveBondingExtraGcode.setValue('Z', "%f" % (self.waveBondingPositionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ + self.getCurrentAdjustmentZ()))
		
											# Otherwise check if command has a Z value and changes in Z are noticable
											elif gcode.hasValue('Z') and deltaZ != sys.float_info.epsilon :
		
												# Set extra G-code Z value
												self.waveBondingExtraGcode.setValue('Z', "%f" % (self.waveBondingPositionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ))
			
											# Set extra G-code E value
											self.waveBondingExtraGcode.setValue('E', "%f" % (self.waveBondingPositionRelativeE - deltaE + tempRelativeE - relativeDifferenceE))
								
											# Add extra G-code to output
											newCommands.append(Command(self.waveBondingExtraGcode.getAscii(), "WAVE", "MID-PRINT CENTER VALIDATION PREPARATION WAVE"))
	
										# Otherwise check if plane changed
										elif self.waveBondingChangesPlane :
	
											# Check if command has a Z value
											if gcode.hasValue('Z') :
		
												# Add to command's Z value
												gcode.setValue('Z', "%f" % (float(gcode.getValue('Z')) + self.getCurrentAdjustmentZ()))
		
											# Otherwise
											else :
		
												# Set command's Z value
												gcode.setValue('Z', "%f" % (relativeDifferenceZ + deltaZ + self.getCurrentAdjustmentZ()))
		
										# Increment index
										index += 1
							
								# Check if no corners have occured
								if self.waveBondingCornerCounter < 1 :

									# Set previous G-code
									self.waveBondingPreviousGcode = copy.deepcopy(gcode)
						
							# Otherwise check if command is G28
							elif gcode.getValue('G') == "28" :

								# Set X and Y to home
								self.waveBondingPositionRelativeX = 54
								self.waveBondingPositionRelativeY = 50

							# Otherwise check if command is G90
							elif gcode.getValue('G') == "90" :

								# Clear relative mode
								self.waveBondingRelativeMode = False

							# Otherwise check if command is G91
							elif gcode.getValue('G') == "91" :

								# Set relative mode
								self.waveBondingRelativeMode = True

							# Otherwise check if command is G92
							elif gcode.getValue('G') == "92" :

								# Check if command doesn't have an X, Y, Z, and E value
								if not gcode.hasValue('X') and not gcode.hasValue('Y') and not gcode.hasValue('Z') and not gcode.hasValue('E') :

									# Set command values to zero
									gcode.setValue('X', "0")
									gcode.setValue('Y', "0")
									gcode.setValue('Z', "0")
									gcode.setValue('E', "0")

								# Otherwise
								else :

									# Set relative positions
									if gcode.hasValue('X') :
										self.waveBondingPositionRelativeX = float(gcode.getValue('X'))
	
									if gcode.hasValue('Y') :
										self.waveBondingPositionRelativeY = float(gcode.getValue('Y'))
	
									if gcode.hasValue('Z') :
										self.waveBondingPositionRelativeZ = float(gcode.getValue('Z'))

									if gcode.hasValue('E') :
										self.waveBondingPositionRelativeE = float(gcode.getValue('E'))
				
				# Check if new commands exist
				if len(newCommands) :
		
					# Finish processing command later
					if not gcode.isEmpty() :
						commands.append(Command(gcode.getAscii(), command.origin, command.skip))
					else :
						commands.append(Command(command.line, command.origin, command.skip))
		
					# Append new commands to commands
					while len(newCommands) :
						commands.append(newCommands.pop())
			
					# Get next command
					continue

			# Check if printing test border or backlash calibration cylinder or using thermal bonding pre-processor
			if (self.printingTestBorder or self.printingBacklashCalibrationCylinder or self._settings.get_boolean(["UseThermalBondingPreprocessor"])) and "THERMAL" not in command.skip :

				# Set command skip
				command.skip += " THERMAL"
				
				# Initialize new commands
				newCommands = []

				# Check if command contains valid G-code
				if not gcode.isEmpty() :
				
					# Check if on a new printed layer
					if self.thermalBondingLayerCounter < 2 and self.onNewPrintedLayer :
					
						# Increment layer counter
						self.thermalBondingLayerCounter += 1
			
						# Check if on first counted layer
						if self.thermalBondingLayerCounter == 1 :
			
							# Check if filament type is PLA
							if str(self._settings.get(["FilamentType"])) == "PLA" :
			
								# Add temperature to output
								newCommands.append(Command("M109 S" + str(self.getBoundedTemperature(self._settings.get_int(["FilamentTemperature"]) + 10)), "THERMAL", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL"))
							
							# Otherwise check if filament type is TGH or FLX
							elif str(self._settings.get(["FilamentType"])) == "TGH" or str(self._settings.get(["FilamentType"])) == "FLX" :
			
								# Add temperature to output
								newCommands.append(Command("M109 S" + str(self.getBoundedTemperature(self._settings.get_int(["FilamentTemperature"]) - 15)), "THERMAL", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL"))
				
							# Otherwise
							else :
				
								# Add temperature to output
								newCommands.append(Command("M109 S" + str(self.getBoundedTemperature(self._settings.get_int(["FilamentTemperature"]) + 15)), "THERMAL", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL"))
						
						# Otherwise
						else :
						
							# Check if filament type is TGH
							if str(self._settings.get(["FilamentType"])) == "TGH" :
						
								# Add temperature to output
								newCommands.append(Command("M104 S" + str(self._settings.get_int(["FilamentTemperature"]) + 15), "THERMAL", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL"))
							
							# Otherwise
							else :
			
								# Add temperature to output
								newCommands.append(Command("M104 S" + str(self._settings.get_int(["FilamentTemperature"])), "THERMAL", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL"))

					# Check if on first counted layer
					if self.thermalBondingLayerCounter == 1 :

						# Check if printing test border or wave bonding isn't being used, and line is a G command
						if (self.printingTestBorder or not self._settings.get_boolean(["UseWaveBondingPreprocessor"])) and gcode.hasValue('G') :

							# Check if command is G0 or G1 and it's in absolute
							if (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") and not self.thermalBondingRelativeMode :

								# Check if previous command exists and filament is ABS, HIPS, PLA, TGH, or FLX
								if not self.thermalBondingPreviousGcode.isEmpty() and (str(self._settings.get(["FilamentType"])) == "ABS" or str(self._settings.get(["FilamentType"])) == "HIPS" or str(self._settings.get(["FilamentType"])) == "PLA" or str(self._settings.get(["FilamentType"])) == "FLX" or str(self._settings.get(["FilamentType"])) == "TGH" or str(self._settings.get(["FilamentType"])) == "CAM") :
	
									# Check if first sharp corner
									if self.thermalBondingCornerCounter < 1 and self.isSharpCornerForThermalBonding(gcode, self.thermalBondingPreviousGcode) :
			
										# Check if refrence G-codes isn't set
										if self.thermalBondingRefrenceGcode.isEmpty() :
			
											# Check if a tack point was created
											self.thermalBondingTackPoint = self.createTackPoint(gcode, self.thermalBondingPreviousGcode)
											if not self.thermalBondingTackPoint.isEmpty() :
									
												# Add tack point to output
												newCommands.append(Command(self.thermalBondingTackPoint.getAscii(), "THERMAL", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL"))
										
										# Set refrence G-code
										self.thermalBondingRefrenceGcode = copy.deepcopy(gcode)
			
										# Increment corner count
										self.thermalBondingCornerCounter += 1
		
									# Otherwise check if sharp corner
									elif self.isSharpCornerForThermalBonding(gcode, self.thermalBondingRefrenceGcode) :
		
										# Check if a tack point was created
										self.thermalBondingTackPoint = self.createTackPoint(gcode, self.thermalBondingRefrenceGcode)
										if not self.thermalBondingTackPoint.isEmpty() :
								
											# Add tack point to output
											newCommands.append(Command(self.thermalBondingTackPoint.getAscii(), "THERMAL", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL"))
									
										# Set refrence G-code
										self.thermalBondingRefrenceGcode = copy.deepcopy(gcode)
								
								# Check if no corners have occured
								if self.thermalBondingCornerCounter < 1 :

									# Set previous G-code
									self.thermalBondingPreviousGcode = copy.deepcopy(gcode)

							# Otherwise check if command is G90
							elif gcode.getValue('G') == "90" :

								# Clear relative mode
								self.thermalBondingRelativeMode = False

							# Otherwise check if command is G91
							elif gcode.getValue('G') == "91" :

								# Set relative mode
								self.thermalBondingRelativeMode = True
		
				# Check if new commands exist
				if len(newCommands) :
		
					# Finish processing command later
					if not gcode.isEmpty() :
						commands.append(Command(gcode.getAscii(), command.origin, command.skip))
					else :
						commands.append(Command(command.line, command.origin, command.skip))
		
					# Append new commands to commands
					while len(newCommands) :
						commands.append(newCommands.pop())
			
					# Get next command
					continue

			# Check if printing test border or backlash calibration cylinder or using bed compensation pre-processor
			if (self.printingTestBorder or self.printingBacklashCalibrationCylinder or self._settings.get_boolean(["UseBedCompensationPreprocessor"])) and "BED" not in command.skip :

				# Set command skip
				command.skip += " BED"
				
				# Initialize new commands
				newCommands = []

				# Check if command contains valid G-code
				if not gcode.isEmpty() :

					# Check if command is a G command
					if gcode.hasValue('G') :

						# Check if command is G0 or G1 and it's in absolute mode
						if (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") and not self.bedCompensationRelativeMode :

							# Check if command has an X or Y value
							if gcode.hasValue('X') or gcode.hasValue('Y') :

								# Set changes plane
								self.bedCompensationChangesPlane = True

							# Check if command contains a Z value
							if gcode.hasValue('Z') :

								# Add to command's Z value
								gcode.setValue('Z', "%f" % (float(gcode.getValue('Z')) + self._settings.get_float(["BedHeightOffset"])))
	
							# Set delta values
							if gcode.hasValue('X') :
								deltaX = float(gcode.getValue('X')) - self.bedCompensationPositionRelativeX
							else :
								deltaX = 0
	
							if gcode.hasValue('Y') :
								deltaY = float(gcode.getValue('Y')) - self.bedCompensationPositionRelativeY
							else :
								deltaY = 0
	
							if gcode.hasValue('Z') :
								deltaZ = float(gcode.getValue('Z')) - self.bedCompensationPositionRelativeZ
							else :
								deltaZ = 0
		
							if gcode.hasValue('E') :
								deltaE = float(gcode.getValue('E')) - self.bedCompensationPositionRelativeE
							else :
								deltaE = 0
	
							# Adjust position absolute and relative values for the changes
							self.bedCompensationPositionAbsoluteX += deltaX
							self.bedCompensationPositionAbsoluteY += deltaY
							self.bedCompensationPositionRelativeX += deltaX
							self.bedCompensationPositionRelativeY += deltaY
							self.bedCompensationPositionRelativeZ += deltaZ
							self.bedCompensationPositionRelativeE += deltaE
	
							# Calculate distance
							distance = math.sqrt(deltaX * deltaX + deltaY * deltaY)

							# Set segment counter
							if distance > self.segmentLength :
								segmentCounter = int(float(str(distance / self.segmentLength)))
							else :
								segmentCounter = 1
	
							# Set absolute and relative differences
							absoluteDifferenceX = self.bedCompensationPositionAbsoluteX - deltaX
							absoluteDifferenceY = self.bedCompensationPositionAbsoluteY - deltaY
							relativeDifferenceX = self.bedCompensationPositionRelativeX - deltaX
							relativeDifferenceY = self.bedCompensationPositionRelativeY - deltaY
							relativeDifferenceZ = self.bedCompensationPositionRelativeZ - deltaZ
							relativeDifferenceE = self.bedCompensationPositionRelativeE - deltaE

							# Set delta ratios
							if distance != 0 :
								deltaRatioX = deltaX / distance
								deltaRatioY = deltaY / distance
								deltaRatioZ = deltaZ / distance
								deltaRatioE = deltaE / distance
							else :
								deltaRatioX = 0
								deltaRatioY = 0
								deltaRatioZ = 0
								deltaRatioE = 0

							# Check if change in E is greater than zero
							if deltaE > 0 :

								# Go through all segments
								index = 1
								while index <= segmentCounter :
						
									# Check if at last segment
									if index == segmentCounter :

										# Set temp values
										tempAbsoluteX = self.bedCompensationPositionAbsoluteX
										tempAbsoluteY = self.bedCompensationPositionAbsoluteY
										tempRelativeX = self.bedCompensationPositionRelativeX
										tempRelativeY = self.bedCompensationPositionRelativeY
										tempRelativeZ = self.bedCompensationPositionRelativeZ
										tempRelativeE = self.bedCompensationPositionRelativeE
			
									# Otherwise
									else :

										# Set temp values
										tempAbsoluteX = absoluteDifferenceX + index * self.segmentLength * deltaRatioX
										tempAbsoluteY = absoluteDifferenceY + index * self.segmentLength * deltaRatioY
										tempRelativeX = relativeDifferenceX + index * self.segmentLength * deltaRatioX
										tempRelativeY = relativeDifferenceY + index * self.segmentLength * deltaRatioY
										tempRelativeZ = relativeDifferenceZ + index * self.segmentLength * deltaRatioZ
										tempRelativeE = relativeDifferenceE + index * self.segmentLength * deltaRatioE
			
									# Get height adjustment
									heightAdjustment = self.getHeightAdjustmentRequired(tempAbsoluteX, tempAbsoluteY)
	
									# Check if not at last segment
									if index != segmentCounter :
	
										# Set extra G-code
										self.bedCompensationExtraGcode.clear()
										self.bedCompensationExtraGcode.setValue('G', gcode.getValue('G'))
		
										# Check if command has an X value
										if gcode.hasValue('X') :
		
											# Set extra G-code X value
											self.bedCompensationExtraGcode.setValue('X', "%f" % (self.bedCompensationPositionRelativeX - deltaX + tempRelativeX - relativeDifferenceX))
			
										# Check if command has a Y value
										if gcode.hasValue('Y') :
		
											# Set extra G-code Y value
											self.bedCompensationExtraGcode.setValue('Y', "%f" % (self.bedCompensationPositionRelativeY - deltaY + tempRelativeY - relativeDifferenceY))
		
										# Check if command has F value and in first element
										if gcode.hasValue('F') and index == 1 :
		
											# Set extra G-code F value
											self.bedCompensationExtraGcode.setValue('F', gcode.getValue('F'))
		
										# Check if the plane changed
										if self.bedCompensationChangesPlane :
		
											# Set extra G-code Z value
											self.bedCompensationExtraGcode.setValue('Z', "%f" % (self.bedCompensationPositionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ + heightAdjustment))
		
										# Otherwise check if command has a Z value and the change in Z in noticable
										elif gcode.hasValue('Z') and deltaZ != sys.float_info.epsilon :
		
											# Set extra G-code Z value
											self.bedCompensationExtraGcode.setValue('Z', "%f" % (self.bedCompensationPositionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ))
		
										# Set extra G-gode E value
										self.bedCompensationExtraGcode.setValue('E', "%f" % (self.bedCompensationPositionRelativeE - deltaE + tempRelativeE - relativeDifferenceE))
								
										# Add extra G-code to output
										newCommands.append(Command(self.bedCompensationExtraGcode.getAscii(), "BED", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL BED"))
									
									# Otherwise check if the plane changed
									elif self.bedCompensationChangesPlane :
		
										# Check if command has a Z value
										if gcode.hasValue('Z') :
		
											# Add value to command Z value
											gcode.setValue('Z', "%f" % (float(gcode.getValue('Z')) + heightAdjustment))
		
										# Otherwise
										else :
		
											# Set command Z value
											gcode.setValue('Z', "%f" % (relativeDifferenceZ + deltaZ + heightAdjustment))
			
									# Increment index
									index += 1
							
							# Otherwise check if the plane changed
							elif self.bedCompensationChangesPlane :
		
								# Set height adjustment
								heightAdjustment = self.getHeightAdjustmentRequired(self.bedCompensationPositionAbsoluteX, self.bedCompensationPositionAbsoluteY)

								# Check if command has a Z value
								if gcode.hasValue('Z') :

									# Add value to command Z
									gcode.setValue('Z', "%f" % (float(gcode.getValue('Z')) + heightAdjustment))

								# Otherwise
								else :

									# Set command Z
									gcode.setValue('Z', "%f" % (self.bedCompensationPositionRelativeZ + heightAdjustment))

						# Otherwise check if command is G28
						elif gcode.getValue('G') == "28" :

							# Set X and Y to home
							self.bedCompensationPositionRelativeX = self.bedCompensationPositionAbsoluteX = 54
							self.bedCompensationPositionRelativeY = self.bedCompensationPositionAbsoluteY = 50

						# Otherwise check if command is G90
						elif gcode.getValue('G') == "90" :

							# Clear relative mode
							self.bedCompensationRelativeMode = False

						# Otherwise check if command is G91
						elif gcode.getValue('G') == "91" :

							# Set relative mode
							self.bedCompensationRelativeMode = True

						# Otherwise check if command is G92
						elif gcode.getValue('G') == "92" :

							# Check if command doesn't have an X, Y, Z, and E value
							if not gcode.hasValue('X') and not gcode.hasValue('Y') and not gcode.hasValue('Z') and not gcode.hasValue('E') :

								# Set command values to zero
								gcode.setValue('X', "0")
								gcode.setValue('Y', "0")
								gcode.setValue('Z', "0")
								gcode.setValue('E', "0")

							# Otherwise
							else :

								# Set relative positions
								if gcode.hasValue('X') :
									self.bedCompensationPositionRelativeX = float(gcode.getValue('X'))
		
								if gcode.hasValue('Y') :
									self.bedCompensationPositionRelativeY = float(gcode.getValue('Y'))
		
								if gcode.hasValue('Z') :
									self.bedCompensationPositionRelativeZ = float(gcode.getValue('Z'))
	
								if gcode.hasValue('E') :
									self.bedCompensationPositionRelativeE = float(gcode.getValue('E'))
				
				# Check if new commands exist
				if len(newCommands) :
		
					# Finish processing command later
					if not gcode.isEmpty() :
						commands.append(Command(gcode.getAscii(), command.origin, command.skip))
					else :
						commands.append(Command(command.line, command.origin, command.skip))
		
					# Append new commands to commands
					while len(newCommands) :
						commands.append(newCommands.pop())
			
					# Get next command
					continue

			# Check if printing test border or backlash calibration cylinder or using backlash compentation pre-processor
			if (self.printingTestBorder or self.printingBacklashCalibrationCylinder or self._settings.get_boolean(["UseBacklashCompensationPreprocessor"])) and "BACKLASH" not in command.skip :

				# Set command skip
				command.skip += " BACKLASH"
				
				# Initialize new commands
				newCommands = []

				# Check if command contains valid G-code
				if not gcode.isEmpty() :

					# Check if command is a G command
					if gcode.hasValue('G') :

						# Check if command is G0 or G1 and it's in absolute mode
						if (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") and not self.backlashCompensationRelativeMode :
	
							# Check if command has an F value
							if gcode.hasValue('F') :

								# Set value F
								self.valueF = gcode.getValue('F')
	
							# Set delta values
							if gcode.hasValue('X') :
								deltaX = float(gcode.getValue('X')) - self.backlashPositionRelativeX
							else :
								deltaX = 0
		
							if gcode.hasValue('Y') :
								deltaY = float(gcode.getValue('Y')) - self.backlashPositionRelativeY
							else :
								deltaY = 0
		
							if gcode.hasValue('Z') :
								deltaZ = float(gcode.getValue('Z')) - self.backlashPositionRelativeZ
							else :
								deltaZ = 0
			
							if gcode.hasValue('E') :
								deltaE = float(gcode.getValue('E')) - self.backlashPositionRelativeE
							else :
								deltaE = 0
	
							# Set directions
							if deltaX > sys.float_info.epsilon :
								directionX = "Positive"
							elif deltaX < -sys.float_info.epsilon :
								directionX = "Negative"
							else :
								directionX = self.previousDirectionX
		
							if deltaY > sys.float_info.epsilon :
								directionY = "Positive"
							elif deltaY < -sys.float_info.epsilon :
								directionY = "Negative"
							else :
								directionY = self.previousDirectionY
	
							# Check if direction has changed
							if (directionX != self.previousDirectionX and self.previousDirectionX != "Neither") or (directionY != self.previousDirectionY and self.previousDirectionY != "Neither") :
	
								# Set extra G-code G value
								self.backlashCompensationExtraGcode.clear()
								self.backlashCompensationExtraGcode.setValue('G', gcode.getValue('G'))
		
								# Check if X direction has changed
								if directionX != self.previousDirectionX and self.previousDirectionX != "Neither" :
		
									# Set X compensation
									if directionX == "Positive" :
										self.compensationX += self._settings.get_float(["BacklashX"])
									else :
										self.compensationX -= self._settings.get_float(["BacklashX"])
			
								# Check if Y direction has changed
								if directionY != self.previousDirectionY and self.previousDirectionY != "Neither" :
		
									# Set Y compensation
									if directionY == "Positive" :
										self.compensationY += self._settings.get_float(["BacklashY"])
									else :
										self.compensationY -= self._settings.get_float(["BacklashY"])
			
								# Set extra G-code X and Y values
								self.backlashCompensationExtraGcode.setValue('X', "%f" % (self.backlashPositionRelativeX + self.compensationX))
								self.backlashCompensationExtraGcode.setValue('Y', "%f" % (self.backlashPositionRelativeY + self.compensationY))
			
								# Set extra G-code F value
								self.backlashCompensationExtraGcode.setValue('F', "%f" % (self._settings.get_float(["BacklashSpeed"])))
						
								# Add extra G-code to output
								newCommands.append(Command(self.backlashCompensationExtraGcode.getAscii(), "BACKLASH", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL BED BACKLASH"))
						
								# Set command's F value
								gcode.setValue('F', self.valueF)
		
							# Check if command has an X value
							if gcode.hasValue('X') :
		
								# Add to command's X value
								gcode.setValue('X', "%f" % (float(gcode.getValue('X')) + self.compensationX))
		
							# Check if command has a Y value
							if gcode.hasValue('Y') :

								# Add to command's Y value
								gcode.setValue('Y', "%f" % (float(gcode.getValue('Y')) + self.compensationY))

							# Set relative values
							self.backlashPositionRelativeX += deltaX
							self.backlashPositionRelativeY += deltaY
							self.backlashPositionRelativeZ += deltaZ
							self.backlashPositionRelativeE += deltaE
	
							# Store directions
							self.previousDirectionX = directionX
							self.previousDirectionY = directionY
	
						# Otherwise check if command is G28
						elif gcode.getValue('G') == "28" :
	
							# Set relative values
							self.backlashPositionRelativeX = 54
							self.backlashPositionRelativeY = 50
		
							# Reset values
							self.valueF = "1000"
							self.previousDirectionX = "Neither"
							self.previousDirectionY = "Neither"
							self.compensationX = 0
							self.compensationY = 0
	
						# Otherwise check if command is G90
						elif gcode.getValue('G') == "90" :
	
							# Clear relative mode
							self.backlashCompensationRelativeMode = False
	
						# Otherwise check if command is G91
						elif gcode.getValue('G') == "91" :
	
							# Set relative mode
							self.backlashCompensationRelativeMode = True
	
						# Otherwise check if command is G92
						elif gcode.getValue('G') == "92" :
	
							# Check if command doesn't have an X, Y, Z, and E value
							if not gcode.hasValue('X') and not gcode.hasValue('Y') and not gcode.hasValue('Z') and not gcode.hasValue('E') :

								# Set command values to zero
								gcode.setValue('X', "0")
								gcode.setValue('Y', "0")
								gcode.setValue('Z', "0")
								gcode.setValue('E', "0")

							# Otherwise
							else :

								# Set relative positions
								if gcode.hasValue('X') :
									self.backlashPositionRelativeX = float(gcode.getValue('X'))
			
								if gcode.hasValue('Y') :
									self.backlashPositionRelativeY = float(gcode.getValue('Y'))
			
								if gcode.hasValue('Z') :
									self.backlashPositionRelativeZ = float(gcode.getValue('Z'))
		
								if gcode.hasValue('E') :
									self.backlashPositionRelativeE = float(gcode.getValue('E'))
				
				# Check if new commands exist
				if len(newCommands) :
		
					# Finish processing command later
					if not gcode.isEmpty() :
						commands.append(Command(gcode.getAscii(), command.origin, command.skip))
					else :
						commands.append(Command(command.line, command.origin, command.skip))
		
					# Append new commands to commands
					while len(newCommands) :
						commands.append(newCommands.pop())
			
					# Get next command
					continue
			
			# Check if command contains valid G-code
			if not gcode.isEmpty() :
	
				# Check if outputting to a file
				if output is not None :
				
					# Send ascii representation of the command to output
					output.write(gcode.getAscii() + '\n')
				
				# Otherwise
				else :
				
					# Append ascii representation of the command to list
					value += [gcode.getAscii() + '*']
			
			# Clear on new printed layer
			self.onNewPrintedLayer = False
		
		# Check if not outputting to a file
		if output is None :
		
			# Return list of commands
			return value
	
	# Increase upload size
	def increaseUploadSize(self, current_max_body_sizes, *args, **kwargs) :
	
		# Set a max upload size to 50MB
		return [("POST", r"/upload", 50 * 1024 * 1024)]
	
	# Upload event
	@octoprint.plugin.BlueprintPlugin.route("/upload", methods=["POST"])
	def upload(self) :
		
		# Check if uploading everything
		if "Slicer Profile Name" in flask.request.values and "Slicer Name" in flask.request.values and "Printer Profile Name" in flask.request.values and "Slicer Profile Content" in flask.request.values and "After Slicing Action" in flask.request.values :
		
			# Check if printing after slicing and a printer isn't connected
			if flask.request.values["After Slicing Action"] != "none" and self._printer.get_state_string() == "Offline" :
			
				# Return error
				return flask.jsonify(dict(value = "Error"))
			
			# Set if model was modified
			modelModified = "Model Name" in flask.request.values and "Model Location" in flask.request.values and "Model Path" in flask.request.values and "Model Center X" in flask.request.values and "Model Center Y" in flask.request.values
	
			# Check if slicer profile, model name, or model path contain path traversal
			if "../" in flask.request.values["Slicer Profile Name"] or (modelModified and ("../" in flask.request.values["Model Name"] or "../" in flask.request.values["Model Path"])) :
		
				# Return error
				return flask.jsonify(dict(value = "Error"))
			
			# Check if model location is invalid
			if modelModified and (flask.request.values["Model Location"] != "local" and flask.request.values["Model Location"] != "sdcard") :
			
				# Return error
				return flask.jsonify(dict(value = "Error"))
	
			# Set profile location
			profileLocation = self._slicing_manager.get_profile_path(flask.request.values["Slicer Name"], flask.request.values["Slicer Profile Name"])
			
			# Set model location
			if modelModified :
			
				if flask.request.values["Model Location"] == "local" :
					modelLocation = self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, flask.request.values["Model Path"] + flask.request.values["Model Name"]).replace('\\', '/')
				elif flask.request.values["Model Location"] == "sdcard" :
					modelLocation = self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.SDCARD, flask.request.values["Model Path"] + flask.request.values["Model Name"]).replace('\\', '/')
		
			# Check if slicer profile, model, or printer profile doesn't exist
			if not os.path.isfile(profileLocation) or (modelModified and not os.path.isfile(modelLocation)) or not self._printer_profile_manager.exists(flask.request.values["Printer Profile Name"]) :
		
				# Return error
				return flask.jsonify(dict(value = "Error"))
		
			# Move original slicer profile to temporary locations
			profileTemp = tempfile.mkstemp()[1]
			shutil.move(profileLocation, profileTemp)
			
			# Move original model to temporary location
			if modelModified :
				modelTemp = tempfile.mkstemp()[1]
				shutil.move(modelLocation, modelTemp)
		
			# Save slicer profile to original slicer profile's location
			temp = tempfile.mkstemp()[1]
		
			output = open(temp, "wb")
			for character in flask.request.values["Slicer Profile Content"] :
				output.write(chr(ord(character)))
			output.close()
			
			if flask.request.values["Slicer Name"] == "cura" :
				self.convertCuraToProfile(temp, profileLocation, '', '', '')
			else :
				shutil.move(temp, profileLocation)
			
			# Get printer profile
			printerProfile = self._printer_profile_manager.get(flask.request.values["Printer Profile Name"])
		
			# Save slicer changes
			self.slicerChanges = {
				u"Slicer Profile Location" : profileLocation,
				u"Slicer Profile Temporary" : profileTemp,
				u"Printer Profile Content" : copy.deepcopy(printerProfile)
			}
			
			# Check if slicer is Cura
			if flask.request.values["Slicer Name"] == "cura" :
			
				# Change printer profile
				search = re.findall("extruder_amount\s*?=\s*?(\d+)", flask.request.values["Slicer Profile Content"])
				if len(search) :
					printerProfile["extruder"]["count"] = int(search[0])
			
				search = re.findall("has_heated_bed\s*?=\s*?(\S+)", flask.request.values["Slicer Profile Content"])
				if len(search) :
					if str(search[0]).lower() == "true" :
						printerProfile["heatedBed"] = True
					else :
						printerProfile["heatedBed"] = False
			
				search = re.findall("machine_width\s*?=\s*?(\d+.?\d*)", flask.request.values["Slicer Profile Content"])
				if len(search) :
					printerProfile["volume"]["width"] = float(search[0])
			
				search = re.findall("machine_height\s*?=\s*?(\d+.?\d*)", flask.request.values["Slicer Profile Content"])
				if len(search) :
					printerProfile["volume"]["height"] = float(search[0])
			
				search = re.findall("machine_depth\s*?=\s*?(\d+.?\d*)", flask.request.values["Slicer Profile Content"])
				if len(search) :
					printerProfile["volume"]["depth"] = float(search[0])
			
				search = re.findall("machine_shape\s*?=\s*?(\S+)", flask.request.values["Slicer Profile Content"])
				if len(search) :
					if str(search[0]).lower() == "circular" :
						printerProfile["volume"]["formFactor"] = "circular"
					else :
						printerProfile["volume"]["formFactor"] = "rectangular"
			
				search = re.findall("nozzle_size\s*?=\s*?(\d+.?\d*)", flask.request.values["Slicer Profile Content"])
				if len(search) :
					printerProfile["extruder"]["nozzleDiameter"] = float(search[0])
			
				search = re.findall("machine_center_is_zero\s*?=\s*?(\S+)", flask.request.values["Slicer Profile Content"])
				if len(search) :
					if str(search[0]).lower() == "true" :
						printerProfile["volume"]["formFactor"] = "circular"
						printerProfile["volume"]["origin"] = "center"
					else :
						printerProfile["volume"]["formFactor"] = "rectangular"
						printerProfile["volume"]["origin"] = "lowerleft"
			
				search = re.findall("extruder_offset_(x|y)(\d)\s*?=\s*?(-?\d+.?\d*)", flask.request.values["Slicer Profile Content"])
				vectors = [Vector(0, 0)] * printerProfile["extruder"]["count"]
			
				for offset in search :
					if offset[0] == 'x' :
						vectors[int(offset[1]) - 1].x = float(offset[2])
					else :
						vectors[int(offset[1]) - 1].y = float(offset[2])
			
				index = 0
				while index < len(vectors) :
					value = (vectors[index].x, vectors[index].y)
					printerProfile["extruder"]["offsets"][index] = value
					index += 1
			
			# Check if modifying model
			if modelModified :
			
				# Save model locations
				self.slicerChanges[u"Model Location"] = modelLocation
				self.slicerChanges[u"Model Temporary"] = modelTemp
				
				# Adjust printer profile so that its center is equal to the model's center
				printerProfile["volume"]["width"] += float(flask.request.values["Model Center X"]) * 2
				printerProfile["volume"]["depth"] += float(flask.request.values["Model Center Y"]) * 2
			
			# Apply printer profile changes
			self._printer_profile_manager.save(printerProfile, True)
			
			# Return ok
			return flask.jsonify(dict(value = "OK"))
		
		# Otherwise check if verifying profile
		elif "Slicer Profile Content" in flask.request.values and "Slicer Name" in flask.request.values :
		
			# Check if slicer is Cura
			if flask.request.values["Slicer Name"] == "cura" :
			
				# Import profile manager
				profileManager = imp.load_source("Profile", self._slicing_manager.get_slicer("cura")._basefolder.replace('\\', '/') + "/profile.py")
					
				# Save profile to temporary file
				temp = tempfile.mkstemp()[1]
				
				output = open(temp, "wb")
				for character in flask.request.values["Slicer Profile Content"] :
					output.write(chr(ord(character)))
				output.close()
				
				# Attempt to convert profile
				try :
					profile = profileManager.Profile.from_cura_ini(temp)
				
				# Return error if conversion failed
				except Exception :
					return flask.jsonify(dict(value = "Error"))
				
				# Check if profile is invalid
				if profile is None :
				
					# Return error
					return flask.jsonify(dict(value = "Error"))
			
			# Return ok
			return flask.jsonify(dict(value = "OK"))
		
		# Return error
		return flask.jsonify(dict(value = "Error"))
	
	# Download event
	@octoprint.plugin.BlueprintPlugin.route("/download/<path:file>", methods=["GET"])
	def download(self, file) :
	
		# Check if file contains path traversal or file doesn't exist
		if "../" in file or not os.path.isfile(self.get_plugin_data_folder().replace('\\', '/') + '/' + file) :
		
			# Return file not found
			return flask.make_response(404)
	
		# Return file
		return flask.send_from_directory(self.get_plugin_data_folder().replace('\\', '/'), file)
	
	# Auto connect
	def autoConnect(self, comm_instance, port, baudrate, read_timeout, *args, **kwargs) :
	
		# Set baudrate if not specified
		if not baudrate or baudrate == 0 :
			baudrate = 115200
		
		# Check if port isn't specified
		if not port or port == "AUTO" :
			
			# Set state to detecting
			comm_instance._changeState(comm_instance.STATE_DETECT_SERIAL)
			
			# Check if printer isn't detected
			port = self.getPort()
			if port is None :
			
				# Set state to failed
				comm_instance._log("Failed to autodetect serial port")
				comm_instance._errorValue = "Failed to autodetect serial port."
				comm_instance._changeState(comm_instance.STATE_ERROR)
				
				# Send message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "No Micro 3D printer detected. Try cycling the printer's power and try again.", confirm = True))
				
				# Return none
				return None
		
		# Set state to connecting
		comm_instance._log("Connecting to: " + str(port))
		
		# Create a connection
		connection = None
		for i in xrange(5) :
			try :
				connection = serial.Serial(str(port), baudrate)
				break

			# If printer has just power-cycled it may not yet be ready
			except Exception :
				connection = None
				time.sleep(1)
		
		# Check if using OS X or Linux and the user lacks read/write access to the printer
		if (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(str(port), os.R_OK | os.W_OK) :
		
			# Send message
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "You don't have read/write access to " + str(port), confirm = True))
			
			# Clear connection
			connection = None
		
		# Otherwise check if connecting to printer failed
		elif connection is None :
		
			# Send message
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "No Micro 3D printer detected. Try cycling the printer's power and try again.", confirm = True))
		
		# Return connection
		return connection
	
	# Disable sleep
	def disableSleep(self) :
	
		# Check if using windows
		if platform.uname()[0].startswith("Windows") :
		
			# Set thread execution to a working state
			ES_CONTINUOUS = 0x80000000
			ES_SYSTEM_REQUIRED = 0x00000001
			ctypes.windll.kernel32.SetThreadExecutionState(ctypes.c_int(ES_CONTINUOUS | ES_SYSTEM_REQUIRED))
			
			# Return true
			return True
		
		# Otherwise check if using OS X and ObjC are usable
		elif platform.uname()[0].startswith("Darwin") and "objc" in sys.modules :
		
			# Created by jbenden
			def setUpIOFramework() :
			
				# Load the IOKit framework
				framework = ctypes.cdll.LoadLibrary("/System/Library/Frameworks/IOKit.framework/IOKit")

				# Declare IOPMLib parameters
				framework.IOPMAssertionCreateWithName.argtypes = [
					ctypes.c_void_p,
					ctypes.c_uint32,
					ctypes.c_void_p,
					ctypes.POINTER(ctypes.c_uint32)
				]
				
				framework.IOPMAssertionRelease.argtypes = [
					ctypes.c_uint32
				]
				
				# Return framework
				return framework
			
			def stringToCFString(string) :
			
				# Set encoding
				try :
					encoding = CoreFoundation.kCFStringEncodingASCII
				except AttributeError :
					encoding = 0x600
				
				# Convert string
				return objc.pyobjc_id(CoreFoundation.CFStringCreateWithCString(None, string, encoding).nsstring())
			
			def assertionCreateWithName(framework, assertionType, assertionLevel, assertionReason) :
			
				# Create assertion
				assertionId = ctypes.c_uint32(0)
				assertionType = stringToCFString(assertionType)
				assertionReason = stringToCFString(assertionReason)
				assertionError = framework.IOPMAssertionCreateWithName(assertionType, assertionLevel, assertionReason, ctypes.byref(assertionId))

				# Return error and id
				return assertionError, assertionId
			
			# Initialize IOKit framework
			if not hasattr(self, "osXSleepFramework") or self.osXSleepFramework is None :
				self.osXSleepFramework = setUpIOFramework()

			# Assert on sleep framework
			error, self.osXSleepPrevention = assertionCreateWithName(self.osXSleepFramework, "NoIdleSleepAssertion", 255, "Disabled by M3D Fio")
			
			# Return true if no errors occured
			if error == 0 :
				return True
		
		# Otherwise check if using Linux and DBus is usable
		elif platform.uname()[0].startswith("Linux") and "dbus" in sys.modules :
			
			# Check if sleep service doesn't exist
			if not hasattr(self, "linuxSleepService") or self.linuxSleepService is None :
			
				# Initialize DBus session
				try :
					bus = dbus.SessionBus()
				
				except dbus.DBusException :
					
					self.linuxSleepService = None
			
					# Return false
					return False
			
				# Inhibit sleep service
				try :
					self.linuxSleepService = dbus.Interface(bus.get_object("org.gnome.ScreenSaver", "/org/gnome/ScreenSaver"), "org.gnome.ScreenSaver")
					self.linuxSleepPrevention = self.linuxSleepService.Inhibit("M3D Fio", "Disabled by M3D Fio")
			
				except dbus.DBusException :
				
					try :
						self.linuxSleepService = dbus.Interface(bus.get_object("org.gnome.ScreenSaver", "/ScreenSaver"), "org.gnome.ScreenSaver")
						self.linuxSleepPrevention = self.linuxSleepService.Inhibit("M3D Fio", "Disabled by M3D Fio")
			
					except dbus.DBusException :
					
						try:
							self.linuxSleepService = dbus.Interface(bus.get_object("org.freedesktop.ScreenSaver", "/org/freedesktop/ScreenSaver"), "org.freedesktop.ScreenSaver")
							self.linuxSleepPrevention = self.linuxSleepService.Inhibit("M3D Fio", "Disabled by M3D Fio")
						
						except dbus.DBusException :
			
							try :
								self.linuxSleepService = dbus.Interface(bus.get_object("org.freedesktop.ScreenSaver", "/ScreenSaver"), "org.freedesktop.ScreenSaver")
								self.linuxSleepPrevention = self.linuxSleepService.Inhibit("M3D Fio", "Disabled by M3D Fio")
				
							except dbus.DBusException :
					
								self.linuxSleepService = None
						
								# Return false
								return False
			
			# Otherwise
			else :
			
				try :
					self.linuxSleepPrevention = self.linuxSleepService.Inhibit("M3D Fio", "Disabled by M3D Fio")
				
				except dbus.DBusException :
					
					self.linuxSleepService = None
			
					# Return false
					return False
			
			# Return true
			return True
		
		# Return false
		return False
	
	# Enable sleep
	def enableSleep(self) :
	
		# Check if using windows
		if platform.uname()[0].startswith("Windows") :
		
			# Set thread execution to an idle state
			ES_CONTINUOUS = 0x80000000
			ctypes.windll.kernel32.SetThreadExecutionState(ctypes.c_int(ES_CONTINUOUS))
		
		# Otherwise check if using OS X and ObjC are usable
		elif platform.uname()[0].startswith("Darwin") and "objc" in sys.modules :
		
			# Check if sleep framework exists
			if hasattr(self, "osXSleepFramework") and self.osXSleepFramework is not None :
			
				# Release assertion on sleep framework
				self.osXSleepFramework.IOPMAssertionRelease(self.osXSleepPrevention)
				self.osXSleepFramework = None
		
		# Otherwise check if using Linux and DBus is usable
		elif platform.uname()[0].startswith("Linux") and "dbus" in sys.modules :
		
			# Check if sleep service exists
			if hasattr(self, "linuxSleepService") and self.linuxSleepService is not None :
					
				# Uninhibit sleep service
				self.linuxSleepService.UnInhibit(self.linuxSleepPrevention)
				self.linuxSleepService = None
	
	# Set GPIO pin high
	def setGpioPinHigh(self) :
	
		# Check if GPIO pin is set
		gpioPin = self._settings.get_int(["GpioPin"])
		if gpioPin is not None :
	
			# Check if using Linux
			if platform.uname()[0].startswith("Linux") :
				
				# Set GPIO pin high
				# try gpio/wiringPi method
				try:
					subprocess.call(["gpio", "-g", "mode", str(gpioPin), "out"])
					subprocess.call(["gpio", "-g", "write", str(gpioPin), "1"])
				except OSError as e:
				    if e.errno == os.errno.ENOENT:
						# wiringPi not found
						os.system("echo \"" + str(gpioPin) + "\" > /sys/class/gpio/export")
						os.system("echo \"out\" > /sys/class/gpio/gpio" + str(gpioPin) + "/direction")
						os.system("echo \"1\" > /sys/class/gpio/gpio" + str(gpioPin) + "/value")
						os.system("echo \"" + str(gpioPin) + "\" > /sys/class/gpio/unexport")
				    else:
				        # Something else went wrong while trying to run `gpio`
				        raise
	
	# Set GPIO pin low
	def setGpioPinLow(self) :
	
		# Check if GPIO pin is set
		gpioPin = self._settings.get_int(["GpioPin"])
		if gpioPin is not None :
	
			# Check if using Linux
			if platform.uname()[0].startswith("Linux") :
				
				# Set GPIO pin low
				# try gpio/wiringPi method
				try:
					subprocess.call(["gpio", "-g", "mode", str(gpioPin), "out"])
					subprocess.call(["gpio", "-g", "write", str(gpioPin), "0"])
				except OSError as e:
					if e.errno == os.errno.ENOENT:
						# wiringPi not found
						os.system("echo \"" + str(gpioPin) + "\" > /sys/class/gpio/export")
						os.system("echo \"out\" > /sys/class/gpio/gpio" + str(gpioPin) + "/direction")
						os.system("echo \"0\" > /sys/class/gpio/gpio" + str(gpioPin) + "/value")
						os.system("echo \"" + str(gpioPin) + "\" > /sys/class/gpio/unexport")
					else:
						# Something else went wrong while trying to run `gpio`
						raise


# Plugin info
__plugin_name__ = "M3D Fio"


# Plugin load
def __plugin_load__() :

	# Obtain global variables
	global __plugin_implementation__
	global __plugin_hooks__

	# Define implementation
	__plugin_implementation__ = M3DFioPlugin()

	# Define hooks
	__plugin_hooks__ = {
		"octoprint.filemanager.preprocessor" : __plugin_implementation__.preprocessGcode,
		"octoprint.plugin.softwareupdate.check_config" : __plugin_implementation__.getUpdateInformation,
		"octoprint.server.http.bodysize": __plugin_implementation__.increaseUploadSize,
		"octoprint.comm.transport.serial.factory":  __plugin_implementation__.autoConnect
	}
