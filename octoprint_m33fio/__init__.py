# coding=utf-8
from __future__ import absolute_import


# Plugin details
__author__ = "donovan6000 <donovan6000@exploitkings.com>"
__license__ = "GNU General Public License http://www.gnu.org/licenses/gpl.txt"
__copyright__ = "Copyright (C) 2015-2016 Exploit Kings. All rights reserved."


# Imports
import octoprint.plugin
import octoprint.events
import octoprint.filemanager
import octoprint.printer
import octoprint.settings
import octoprint.slicing
import tempfile
import os
import time
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
import _ctypes
import platform
import subprocess
import psutil
import socket
import threading
import yaml
import logging
import logging.handlers
from .gcode import Gcode
from .vector import Vector

# Check if using Windows or Linux
if platform.uname()[0].startswith("Windows") or platform.uname()[0].startswith("Linux") :

	# Import webcam libraries
	try :
		import StringIO
		from PIL import Image
		import pygame.camera
	
	except :
		pass
	
	# Check if using Linux
	if platform.uname()[0].startswith("Linux") :

		# Import DBus
		try :
			import dbus
	
		except :
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
	
	except :
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
class M33FioPlugin(
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
	
		# Set logger
		self._m33fio_logger = logging.getLogger("octoprint.plugins.m33fio.debug")

		# Initialize data members
		self.originalWrite = None
		self.originalRead = None
		self.invalidPrinter = True
		self.processingSlice = False
		self.heatbedConnection = None
		self.heatbedConnected = False
		self.showHeatbedTemperature = False
		self.settingHeatbedTemperature = False
		self.eeprom = None
		self.messageResponse = None
		self.invalidBedCenter = False
		self.invalidBedPlane = False
		self.invalidBedOrientation = False
		self.slicerChanges = None
		self.sharedLibrary = None
		self.lastCommandSent = None
		self.lastResponseWasWait = False
		self.allSerialPorts = []
		self.currentSerialPort = None
		self.providedFirmwares = {}
		self.printerColor = "Black"
		self.lastLineNumberSent = None
		self.initializingPrinterConnection = False
		self.startingMidPrintFilamentChange = False
		self.showMidPrintFilamentChange = False
		self.reconnectingToPrinter = False
		self.performCancelPrintMovement = False
		self.performFinishPrintMovement = False
		self.currentFirmwareType = None
		self.sharedLibraryIsUsable = False
		self.cancelingPrint = False
		self.slicerReminder = False
		self.sleepReminder = False
		self.webcamProcess = None
		self.serialPortsList = []
		
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
			calibrateZ0Correction = dict(
				offset = 0x299,
				bytes = 4
			),
			xJerkSensitivity = dict(
				offset = 0x29D,
				bytes = 1
			),
			yJerkSensitivity = dict(
				offset = 0x29E,
				bytes = 1
			),
			lastRecordedXValue = dict(
				offset = 0x29F,
				bytes = 4
			),
			lastRecordedYValue = dict(
				offset = 0x2A3,
				bytes = 4
			),
			lastRecordedXDirection = dict(
				offset = 0x2A7,
				bytes = 1
			),
			lastRecordedYDirection = dict(
				offset = 0x2A8,
				bytes = 1
			),
			savedXState = dict(
				offset = 0x2A9,
				bytes = 1
			),
			savedYState = dict(
				offset = 0x2AA,
				bytes = 1
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
			xMotorStepsPerMm = dict(
				offset = 0x2D6,
				bytes = 4
			),
			yMotorStepsPerMm = dict(
				offset = 0x2DA,
				bytes = 4
			),
			zMotorStepsPerMm = dict(
				offset = 0x2DE,
				bytes = 4
			),
			eMotorStepsPerMm = dict(
				offset = 0x2E2,
				bytes = 4
			),
			savedZState = dict(
				offset = 0x2E6,
				bytes = 2
			),
			eMotorCurrent = dict(
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
		self.bedCenterOffsetX = 8.5005
		self.bedCenterOffsetY = 2.0005
		
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
		self.printingBacklashCalibration = False
		self.sentCommands = {}
		self.resetLineNumberCommandSent = False
		self.numberWrapCounter = 0
	
	# Reset pre-processor settings
	def resetPreprocessorSettings(self) :
	
		# General settings
		self.readyToPrint = False
		self.currentE = 0
		self.currentF = None
		self.currentZ = 0
		self.layerDetectionRelativeMode = False
		self.printedLayers = []
		self.onNewPrintedLayer = False
		self.tackPointAngle = 0.0
		self.tackPointTime = 0.0
		self.temperatureStabalizationDelay = 0
		self.fanSpeed = 0
		self.firstLayerTemperatureChange = 0
		
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
		while True :
		
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
	
		# Check if available serial ports have changed
		newestSerialPortsList = list(serial.tools.list_ports.comports())
		if cmp(self.serialPortsList, newestSerialPortsList) != 0 :
	
			# Update all serial ports
			self.serialPortsList = newestSerialPortsList
	
			# Check if not currently connected to a printer
			if self._printer.is_closed_or_error() :
	
				# Update serial ports
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Update Serial Ports"))
	
		# Go through all connected serial ports
		for port in newestSerialPortsList :
		
			# Get device
			device = port[2].upper()
			
			# Check if port contains the correct VID and PID
			if device.startswith("USB VID:PID=1A86:7523") :
			
				# Return serial port
				return port[0]
		
		# Return none
		return None
	
	# Keep printer active
	def keepPrinterActive(self) :
	
		# Loop forever
		while True :
		
			# Check if paused and using a Micro 3D printer
			if self._printer.is_paused() and not self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
		
				# Send command to keep printer from being inactive for too long
				self._printer.commands("G4")
		
			# Delay 10 minutes
			time.sleep(10 * 60)
	
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
					self._printer_profile_manager.save(printerProfile, True, not self._settings.get_boolean(["NotUsingAMicro3DPrinter"]))
			
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
					
					# check if using OS X or Linux and the user lacks read/write access to the heatbed
					if (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(heatbedPort, os.R_OK | os.W_OK) :
					
						# Set error
						error = True
					
					# Otherwise
					else :
					
						# Set connection timeout
						if int(serial.VERSION.split('.', 1)[0]) < 3 :
							self.heatbedConnection.writeTimeout = 1
						else :
							self.heatbedConnection.write_timeout = 1
				except :
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
						except :
							error = True
							break
					
					# Check if no errors occured
					if not error :
				
						# Put heatbed into temperature mode
						try :
							if int(serial.VERSION.split('.', 1)[0]) < 3 :
								self.heatbedConnection.flushInput()
								self.heatbedConnection.flushOutput()
							else :
								self.heatbedConnection.reset_input_buffer()
								self.heatbedConnection.reset_output_buffer()
							
							self.heatbedConnection.write("i\r")
							
							time.sleep(0.5)
							
							if int(serial.VERSION.split('.', 1)[0]) < 3 :
								self.heatbedConnection.flushInput()
								self.heatbedConnection.flushOutput()
							else :
								self.heatbedConnection.reset_input_buffer()
								self.heatbedConnection.reset_output_buffer()
							
						except :
							error = True
					
						# Check if no errors occured
						if not error :
				
							# Set heated bed to true in printer profile
							if self._printer_profile_manager.exists("micro_3d") :
								printerProfile = self._printer_profile_manager.get("micro_3d")
								printerProfile["heatedBed"] = True
								self._printer_profile_manager.save(printerProfile, True, not self._settings.get_boolean(["NotUsingAMicro3DPrinter"]))
							
							# Set heatbed connected
							self.heatbedConnected = True
				
							# Send message
							self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Heatbed Detected"))
													
							# Create message
							self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "success", title = "Heatbed detected", text = "Heatbed has been connected"))
				
				# Check if an error has occured
				if error :
				
					# Check if connection to heatbed was established
					if self.heatbedConnection is not None :
					
						# Close connection
						self.heatbedConnection.close()
						self.heatbedConnection = None
				
					# check if an error occured and it hasn't been show yet
					if previousHeatbedPort != heatbedPort :
				
						# Create message
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "error", title = "Heatbed error", text = "Failed to connect to heatbed"))
			
			# Set previous heatbed port
			previousHeatbedPort = heatbedPort
			
			# Delay
			time.sleep(0.5)
	
	# Save printer profile
	def savePrinterProfile(self) :
	
		# Create and overwrite Micro 3D printer profile
		printerProfile = dict(
			id = "micro_3d",
			name = "Micro 3D",
			model = "Micro 3D",
			color = "default",
			volume = dict(
				width = self.bedLowMaxX - self.bedLowMinX,
				depth = self.bedLowMaxY - self.bedLowMinY,
				height = self.bedHighMaxZ - self.bedLowMinZ,
				formFactor = "rectangular",
				origin = "lowerleft"
			),
			heatedBed = False,
			extruder = dict(
				count = 1,
				offsets = [
					(0, 0)
				],
				nozzleDiameter = 0.35
			),
			axes = dict(
				x = dict(
					speed = 4800,
					inverted = False
				),
				y = dict(
					speed = 4800,
					inverted = False
				),
				z = dict(
					speed = 90,
					inverted = False
				),
				e = dict(
					speed = 600,
					inverted = False
				)
			)
		)
		
		if self.heatbedConnected :
			printerProfile["heatedBed"] = True
		
		self._printer_profile_manager.save(printerProfile, True, not self._settings.get_boolean(["NotUsingAMicro3DPrinter"]))
		
		# Check if using a Micro 3D printer
		if not self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
	
			# Select Micro 3D printer profile
			self._printer_profile_manager.select("micro_3d")
	
	# On startup
	def on_startup(self, host, port) :
	
		# Setup custom logger
		m33fio_logging_handler = logging.handlers.RotatingFileHandler(self._settings.get_plugin_logfile_path(postfix = "debug"), maxBytes = 500 * 1024 * 1024)
		m33fio_logging_handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
		m33fio_logging_handler.setLevel(logging.DEBUG)
		
		self._m33fio_logger.addHandler(m33fio_logging_handler)
		self._m33fio_logger.setLevel(logging.DEBUG if self._settings.get_boolean(["UseDebugLogging"]) else logging.CRITICAL)
		self._m33fio_logger.propagate = False
	
	# On after startup
	def on_after_startup(self) :
	
		# Make sure webcam stream is set so that HTML is added to web page
		if not octoprint.settings.settings().get(["webcam", "stream"]) :
			octoprint.settings.settings().set(["webcam", "stream"], "None", True)
	
		# Guarantee settings are valid
		self.guaranteeSettingsAreValid()
		
		# Check if shared library is usable
		if self.loadSharedLibrary(True) :
	
			# Set that shared library is usable
			self.sharedLibraryIsUsable = True
			
			# Unload shared library
			self.unloadSharedLibrary()
		
		# Otherwise
		else :
		
			# Turn off using shared library setting
			self._settings.set_boolean(["UseSharedLibrary"], False)
		
		# Check if not using Linux
		if not platform.uname()[0].startswith("Linux") :
		
			# Turn off use GPIO setting
			self._settings.set_boolean(["UseGpio"], False)
		
		# Save settings
		octoprint.settings.settings().save()
	
		# Set reminders on initial OctoPrint instance
		currentPort = self.getListenPort(psutil.Process(os.getpid()))
		if currentPort is not None and self.getListenPort(psutil.Process(os.getpid())) == 5000 :
			self.slicerReminder = True
			self.sleepReminder = True
		else :
			self.slicerReminder = False
			self.sleepReminder = False
		
		# Adjust bed bounds to account for external bed
		self.bedMediumMaxZ = 73.5 - self._settings.get_float(["ExternalBedHeight"])
		self.bedHighMaxZ = 112.0 - self._settings.get_float(["ExternalBedHeight"])
		self.bedHighMinZ = self.bedMediumMaxZ
		if self._settings.get_boolean(["ExpandPrintableRegion"]) :
			self.bedLowMinY = self.bedMediumMinY
		else :
			self.bedLowMinY = -2.0

		# Save printer profile
		self.savePrinterProfile()
		
		# Find provided firmwares
		for file in os.listdir(self._basefolder.replace('\\', '/') + "/static/files/") :
			if file.endswith(".hex") :
			
				# Get version number
				versionMatch = re.search(" \\d{10}\\.", file)
				version = versionMatch.group(0)[1 : -1]
				type = file[0 : versionMatch.start()]
				
				# Set release
				if type == "M3D" or type == "M3D Mod" :
					release = version
					if type == "M3D Mod" :
						release = str(int(release) - 100000000)
				else :
					release = version[2 : 4] + '.' + version[4 : 6] + '.' + version[6 : 8] + '.' + version[8 : 10]
				
				# Append provided firmware to list
				self.providedFirmwares[file[0 : file.find('.')]] = {
					"Type": type,
					"Version": version,
					"Release": release,
					"File": file
				}
		
		# Set file locations
		self.setFileLocations()
		
		# Check if not using a Micro 3D printer
		if self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
		
			# Disable printer callbacks
			while self in self._printer._callbacks :
				self._printer.unregister_callback(self)
		
		# Otherwise
		else :
		
			# Enable printer callbacks
			if self not in self._printer._callbacks :
				self._printer.register_callback(self)
		
		# Keep printer active
		keepPrinterActiveThread = threading.Thread(target = self.keepPrinterActive)
		keepPrinterActiveThread.daemon = True
		keepPrinterActiveThread.start()
		
		# Monitor heatbed
		monitorHeatbedThread = threading.Thread(target = self.monitorHeatbed)
		monitorHeatbedThread.daemon = True
		monitorHeatbedThread.start()
		
		# Start webcam process
		self.startWebcamProcess()
	
	# Start webcam process
	def startWebcamProcess(self) :
		
		# Check if pygame camera or QTKit is usable and hosting camera
		if ("pygame.camera" in sys.modules or "QTKit" in sys.modules) and self._settings.get_boolean(["HostCamera"]) :
		
			# Check if camera port is set
			cameraPort = self._settings.get(["CameraPort"])
			if cameraPort is not None :
			
				# Check if port is open
				if self.isPortOpen(4999) :
			
					# Start webcam server
					self.webcamProcess = subprocess.Popen([sys.executable.replace('\\', '/'), self._basefolder.replace('\\', '/') + "/webcam_server.py", str(cameraPort), "4999", str(self._settings.get_int(["CameraFramesPerSecond"])), str(self._settings.get_int(["CameraWidth"])), str(self._settings.get_int(["CameraHeight"]))])
				
				# otherwise
				else :
				
					# Clear webcam process
					self.webcamProcess = None
					
					# Clear host camera
					self._settings.set_boolean(["HostCamera"], False)
					
					# Clear webcam stream
					octoprint.settings.settings().set(["webcam", "stream"], "None", True)
					
					# Save settings
					octoprint.settings.settings().save()
					
					# Send message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Hosting camera failed", header = "Camera Host Status", confirm = True))
	
	# Load shared library
	def loadSharedLibrary(self, isUsable = False) :
	
		# Unload shared library if it was already loaded
		self.unloadSharedLibrary()
	
		# Check if using shared library or checking if it is usable
		if self._settings.get_boolean(["UseSharedLibrary"]) or isUsable :
	
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
				
				# Return true
				return True
		 
		# Return false
		return False
	
	# Unload shared library
	def unloadSharedLibrary(self) :
	
		# Check if shared library is loaded
		if self.sharedLibrary :
		
			# Check if running on Linux or OS X
			if platform.uname()[0].startswith("Linux") or platform.uname()[0].startswith("Darwin") :
		
				# Close shared library
				_ctypes.dlclose(self.sharedLibrary._handle)
			
			# Check if running on Windows
			elif platform.uname()[0].startswith("Windows") :
			
				# Close shared library
				_ctypes.FreeLibrary(self.sharedLibrary._handle)
			
			# Clear shared library
			self.sharedLibrary = None
	
	# Set shared library settings
	def setSharedLibrarySettings(self) :
	
		# Reset pre-processor settings
		self.sharedLibrary.resetPreprocessorSettings()

		# Set settings
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
		self.sharedLibrary.setPrintingBacklashCalibration(ctypes.c_bool(self.printingBacklashCalibration))
		self.sharedLibrary.setPrinterColor(ctypes.c_char_p(self.printerColor))
		self.sharedLibrary.setCalibrateBeforePrint(ctypes.c_bool(self._settings.get_boolean(["CalibrateBeforePrint"])))
		self.sharedLibrary.setRemoveFanCommands(ctypes.c_bool(self._settings.get_boolean(["RemoveFanCommands"])))
		self.sharedLibrary.setRemoveTemperatureCommands(ctypes.c_bool(self._settings.get_boolean(["RemoveTemperatureCommands"])))
		if self._settings.get_int(["GpioLayer"]) is not None :
			self.sharedLibrary.setUseGpio(ctypes.c_bool(self._settings.get_boolean(["UseGpio"])))
			self.sharedLibrary.setGpioLayer(ctypes.c_ushort(self._settings.get_int(["GpioLayer"])))
		else :
			self.sharedLibrary.setUseGpio(ctypes.c_bool(False))
		self.sharedLibrary.setHeatbedTemperature(ctypes.c_ushort(self._settings.get_int(["HeatbedTemperature"])))
		self.sharedLibrary.setExternalBedHeight(ctypes.c_double(self._settings.get_float(["ExternalBedHeight"])))
		self.sharedLibrary.setExpandPrintableRegion(ctypes.c_bool(self._settings.get_boolean(["ExpandPrintableRegion"])))
		self.sharedLibrary.setMidPrintFilamentChangeLayers(ctypes.c_char_p(' '.join(re.findall("\\d+", str(self._settings.get(["MidPrintFilamentChangeLayers"]))))))
		self.sharedLibrary.setChangeLedBrightness(ctypes.c_bool(self._settings.get_boolean(["ChangeLedBrightness"])))
		if self.currentFirmwareType is None :
			self.sharedLibrary.setFirmwareType(ctypes.c_char_p(""))
		else :
			self.sharedLibrary.setFirmwareType(ctypes.c_char_p(self.currentFirmwareType))
	
	# Get newest firmware name
	def getNewestFirmwareName(self, firmwareType) :
	
		# Initialize variables
		newestFirmwareName = None
		
		# Go through all firmwares
		for firmware in self.providedFirmwares :
	
			# Check if current firmware is the type specified
			if self.providedFirmwares[firmware]["Type"] == firmwareType :
		
				# Check if current firmware has a newer version than newest firmware
				if newestFirmwareName is None or int(self.providedFirmwares[newestFirmwareName]["Version"]) < int(self.providedFirmwares[firmware]["Version"]) :
			
					# Set newest firmware name to current firmware name
					newestFirmwareName = firmware
		
		# Return newest firmware name
		return newestFirmwareName
	
	# Get firmware details
	def getFirmwareDetails(self) :
	
		# Check if EEPROM was read
		if self.eeprom is not None :
		
			# Get firmware version from EEPROM
			firmwareVersion = self.eepromGetInt("firmwareVersion")
		
			# Get firmware type
			firmwareType = None
			firmwareRelease = None
			for firmware in self.providedFirmwares :
				if int(self.providedFirmwares[firmware]["Version"]) / 100000000 == firmwareVersion / 100000000 :
					firmwareType = self.providedFirmwares[firmware]["Type"]
					break
		
			# Get firmware release
			firmwareRelease = format(firmwareVersion, "010")
			if firmwareType != "M3D" and firmwareType != "M3D Mod" :
				firmwareRelease = firmwareRelease[2 : 4] + '.' + firmwareRelease[4 : 6] + '.' + firmwareRelease[6 : 8] + '.' + firmwareRelease[8 : 10]
			elif firmwareType == "M3D Mod" :
				firmwareRelease= str(int(firmwareRelease) - 100000000)
			
			# Return values
			return firmwareType, firmwareVersion, firmwareRelease
		
		# Return none
		return None, None, None
	
	# Covert Cura to profile
	def convertCuraToProfile(self, input, output, name, displayName, description) :
	
		# Cura Engine plugin doesn't support solidarea_speed, perimeter_before_infill, raft_airgap_all, raft_surface_thickness, raft_surface_linewidth, plugin_config, object_center_x, and object_center_y
	
		# Clean up input
		fd, curaProfile = tempfile.mkstemp()
		os.close(fd)
		self.curaProfileCleanUp(input, curaProfile)
		
		# Import profile manager
		profileManager = imp.load_source("Profile", self._slicing_manager.get_slicer("cura")._basefolder.replace('\\', '/') + "/profile.py")
		
		# Create profile
		profile = octoprint.slicing.SlicingProfile("cura", name, profileManager.Profile.from_cura_ini(curaProfile), displayName, description)
		
		# Remove temporary file
		os.remove(curaProfile)
		
		# Save profile
		self._slicing_manager.get_slicer("cura").save_slicer_profile(output, profile)
	
	# Covert Slic3r to profile
	def convertSlic3rToProfile(self, input, output, name, displayName, description) :
	
		# Clean up input
		fd, slic3rProfile = tempfile.mkstemp()
		os.close(fd)
		self.slic3rProfileCleanUp(input, slic3rProfile)
		
		# Import profile manager
		profileManager = imp.load_source("Profile", self._slicing_manager.get_slicer("slic3r")._basefolder.replace('\\', '/') + "/profile.py")
		
		# Create profile
		profile = octoprint.slicing.SlicingProfile("slic3r", name, profileManager.Profile.from_slic3r_ini(slic3rProfile)[0], displayName, description)
		
		# Remove temporary file
		os.remove(slic3rProfile)
		
		# Save profile
		self._slicing_manager.get_slicer("slic3r").save_slicer_profile(output, profile)
	
	# Cura profile cleanup
	def curaProfileCleanUp(self, input, output) :
	
		# Create output
		output = open(output, "wb")
	
		# Go through all lines in input
		for line in open(input) :
		
			try :
			
				# Check if using OctoPrint < 1.3.x
				if tuple(map(int, (octoprint.__version__.split(".", 2)[: 2]))) < tuple(map(int, ("1.3".split(".")))) :
		
					# Fix G-code lines
					match = re.findall("^(.+)(\d+)\.gcode", line)
					if len(match) :
						line = match[0][0] + ".gcode" + match[0][1] + line[len(match[0][0]) + len(match[0][1]) + 6 :]
			except :
				pass
			
			# Remove comments from input
			if ';' in line and ".gcode" not in line and line[0] != '\t' :
				output.write(line[0 : line.index(';')] + '\n')
			else :
				output.write(line)
		
		# Close output
		output.close()
	
	# Slic3r profile cleanup
	def slic3rProfileCleanUp(self, input, output) :
	
		# Create output
		output = open(output, "wb")
	
		# Go through all lines in input
		for line in open(input) :
		
			# Remove comments from input
			if ';' in line and "_gcode" not in line and line[0] != '\t' :
				output.write(line[0 : line.index(';')] + '\n')
			else :
				output.write(line)
		
		# Close output
		output.close()
	
	# Covert Profile to Cura
	def convertProfileToCura(self, input, output, printerProfile) :
	
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
		
		# Set boolean settings
		booleanSettings = [
			"wipe_tower",
			"ooze_shield",
			"cool_head_lift",
			"fix_horrible_union_all_type_b",
			"fix_horrible_use_open_bits",
			"fix_horrible_extensive_stitching",
			"spiralize",
			"follow_surface",
			"machine_center_is_zero",
			"has_heated_bed",
			"solid_top",
			"solid_bottom",
			"retraction_enable",
			"fan_enabled",
			"fix_horrible_union_all_type_a"
		]
		
		# Go through all profile values
		values = profile.profile()
		for key in values.keys() :
		
			# Get current value
			currentValue = str(key)
			
			# Fix incorrect boolean settings
			if str(values[key]) == "False" and currentValue not in booleanSettings :
				values[key] = 0
				
			elif str(values[key]) == "True" and currentValue not in booleanSettings :
				values[key] = 1
			
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
			if currentValue.endswith(".gcode") :
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
			output.write(str(key) + " = " + str(machine[key]) + '\n')
		
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
					
						if key == "print_temperature" :
							settingValue = str(int(settings[key][index]))
						else :
							settingValue = str(float(settings[key][index]))
					
						# Write setting part to output
						if index == 0 :
							output.write(str(key) + " = " + settingValue + '\n')
						else :
							output.write(str(key) + str(index + 1) + " = " + settingValue + '\n')
						index += 1
			
			# Otherwise
			else :
			
				# Write setting to output
				output.write(str(key) + " = " + str(settings[key]) + '\n')
		
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
					output.write(str(key)[0 : str(key).find('.')] + str(index + 1) + str(key)[str(key).find('.') : ] + " = " + str(alterations[key][index]).replace("\n\n", '\n').replace('\n', "\n\t").rstrip() + '\n')
				index += 1
	
	# Covert Profile to Slic3r
	def convertProfileToSlic3r(self, input, output, printerProfile) :
		
		# Get printer profile
		printerProfile = self._printer_profile_manager.get(printerProfile)
		
		# Import profile manager
		profileManager = imp.load_source("Profile", self._slicing_manager.get_slicer("slic3r")._basefolder.replace('\\', '/') + "/profile.py")
		
		# Create profile
		profile = profileManager.Profile(self._slicing_manager.get_slicer("slic3r")._load_profile(input), printerProfile, None, None)
		
		# Go through all settings
		for key in profile._profile[0] :
		
			# Fix incorrect settings
			if (str(key).endswith("_gcode") or str(key).endswith("_processing") or str(key).endswith("_process")) and str(profile._profile[0][key]) == "None" :
				profile._profile[0][key] = ''
			
			# slic3r post_processing option not found workaround
			elif str(key) == "post_processing":
				profile._profile[0]["post_process"] = profile._profile[0][key]
				del profile._profile[0][key]
			
		# Set settings in profile
		profile._profile[0]["bed_shape"] = "0x0,%.1fx0,%.1fx%.1f,0x%.1f" % (printerProfile["volume"]["width"], printerProfile["volume"]["width"], printerProfile["volume"]["depth"], printerProfile["volume"]["depth"])
		profile._profile[0]["bed_size"] = "%.1f,%.1f" % (printerProfile["volume"]["width"], printerProfile["volume"]["depth"])
		profile._profile[0]["nozzle_diameter"] = printerProfile["extruder"]["nozzleDiameter"]
		profile._profile[0]["perimeter_extrusion_width"] = printerProfile["extruder"]["nozzleDiameter"]
		
		# Create profile
		profileManager.Profile.to_slic3r_ini(profile._profile[0], output)
	
	# On shutdown
	def on_shutdown(self) :
	
		# Remove temporary files
		self.removeTemporaryFiles()
		
		# Restore files
		self.restoreFiles()
		
		# Remove config file
		configFile = self._settings.global_get_basefolder("base").replace('\\', '/') + "/config.yaml" + str(self.getListenPort(psutil.Process(os.getpid())))
		if os.path.isfile(configFile) :
			os.remove(configFile)
		
		# Unload shared library if it's loaded
		self.unloadSharedLibrary()
		
		# Stop webcam process
		if self.webcamProcess is not None :
			self.webcamProcess.kill()
			self.webcamProcess = None
		
		# Enable sleep
		self.enableSleep()
	
	# Remove temporary files
	def removeTemporaryFiles(self) :
	
		# Delete all temporary files
		path = self.get_plugin_data_folder().replace('\\', '/') + '/'
		for file in os.listdir(path) :
			os.remove(path + file)
	
	# Guarantee settings are valid
	def guaranteeSettingsAreValid(self) :
	
		# Make sure backlash X is valid
		if self._settings.get_float(["BacklashX"]) is None :
			self._settings.set_float(["BacklashX"], self.get_settings_defaults()["BacklashX"])
		
		# Make sure backlash Y is valid
		if self._settings.get_float(["BacklashY"]) is None :
			self._settings.set_float(["BacklashY"], self.get_settings_defaults()["BacklashY"])
		
		# Make sure back left orientation is valid
		if self._settings.get_float(["BackLeftOrientation"]) is None :
			self._settings.set_float(["BackLeftOrientation"], self.get_settings_defaults()["BackLeftOrientation"])
		
		# Make sure back right orientation is valid
		if self._settings.get_float(["BackRightOrientation"]) is None :
			self._settings.set_float(["BackRightOrientation"], self.get_settings_defaults()["BackRightOrientation"])
		
		# Make sure front right orientation is valid
		if self._settings.get_float(["FrontRightOrientation"]) is None :
			self._settings.set_float(["FrontRightOrientation"], self.get_settings_defaults()["FrontRightOrientation"])
		
		# Make sure front left orientation is valid
		if self._settings.get_float(["FrontLeftOrientation"]) is None :
			self._settings.set_float(["FrontLeftOrientation"], self.get_settings_defaults()["FrontLeftOrientation"])
		
		# Make sure backlash speed is valid
		if self._settings.get_float(["BacklashSpeed"]) is None :
			self._settings.set_float(["BacklashSpeed"], self.get_settings_defaults()["BacklashSpeed"])
		
		# Make sure back left offset is valid
		if self._settings.get_float(["BackLeftOffset"]) is None :
			self._settings.set_float(["BackLeftOffset"], self.get_settings_defaults()["BackLeftOffset"])
		
		# Make sure back right offset is valid
		if self._settings.get_float(["BackRightOffset"]) is None :
			self._settings.set_float(["BackRightOffset"], self.get_settings_defaults()["BackRightOffset"])
		
		# Make sure front right offset is valid
		if self._settings.get_float(["FrontRightOffset"]) is None :
			self._settings.set_float(["FrontRightOffset"], self.get_settings_defaults()["FrontRightOffset"])
		
		# Make sure front left offset is valid
		if self._settings.get_float(["FrontLeftOffset"]) is None :
			self._settings.set_float(["FrontLeftOffset"], self.get_settings_defaults()["FrontLeftOffset"])
		
		# Make sure bed height offset is valid
		if self._settings.get_float(["BedHeightOffset"]) is None :
			self._settings.set_float(["BedHeightOffset"], self.get_settings_defaults()["BedHeightOffset"])
		
		# Make sure filament temperature is valid
		if self._settings.get_int(["FilamentTemperature"]) is None :
			self._settings.set_int(["FilamentTemperature"], self.get_settings_defaults()["FilamentTemperature"])
		
		# Make sure filament type is valid
		if self._settings.get(["FilamentType"]) is None :
			self._settings.set(["FilamentType"], self.get_settings_defaults()["FilamentType"])
		
		# Make sure use validation preprocessor is valid
		if self._settings.get_boolean(["UseValidationPreprocessor"]) is None :
			self._settings.set_boolean(["UseValidationPreprocessor"], self.get_settings_defaults()["UseValidationPreprocessor"])
		
		# Make sure use preparation preprocessor is valid
		if self._settings.get_boolean(["UsePreparationPreprocessor"]) is None :
			self._settings.set_boolean(["UsePreparationPreprocessor"], self.get_settings_defaults()["UsePreparationPreprocessor"])
		
		# Make sure use thermal bonding preprocessor is valid
		if self._settings.get_boolean(["UseThermalBondingPreprocessor"]) is None :
			self._settings.set_boolean(["UseThermalBondingPreprocessor"], self.get_settings_defaults()["UseThermalBondingPreprocessor"])
		
		# Make sure use wave bonding preprocessor is valid
		if self._settings.get_boolean(["UseWaveBondingPreprocessor"]) is None :
			self._settings.set_boolean(["UseWaveBondingPreprocessor"], self.get_settings_defaults()["UseWaveBondingPreprocessor"])
		
		# Make sure use bed compensation preprocessor is valid
		if self._settings.get_boolean(["UseBedCompensationPreprocessor"]) is None :
			self._settings.set_boolean(["UseBedCompensationPreprocessor"], self.get_settings_defaults()["UseBedCompensationPreprocessor"])
		
		# Make sure use backlash compensation preprocessor is valid
		if self._settings.get_boolean(["UseBacklashCompensationPreprocessor"]) is None :
			self._settings.set_boolean(["UseBacklashCompensationPreprocessor"], self.get_settings_defaults()["UseBacklashCompensationPreprocessor"])
		
		# Make sure automatically obtain settings is valid
		if self._settings.get_boolean(["AutomaticallyObtainSettings"]) is None :
			self._settings.set_boolean(["AutomaticallyObtainSettings"], self.get_settings_defaults()["AutomaticallyObtainSettings"])
		
		# Make sure use center model preprocessor is valid
		if self._settings.get_boolean(["UseCenterModelPreprocessor"]) is None :
			self._settings.set_boolean(["UseCenterModelPreprocessor"], self.get_settings_defaults()["UseCenterModelPreprocessor"])
		
		# Make sure ignore print dimension limitations is valid
		if self._settings.get_boolean(["IgnorePrintDimensionLimitations"]) is None :
			self._settings.set_boolean(["IgnorePrintDimensionLimitations"], self.get_settings_defaults()["IgnorePrintDimensionLimitations"])

		# Make sure preprocess on the fly is valid
		if self._settings.get_boolean(["PreprocessOnTheFly"]) is None :
			self._settings.set_boolean(["PreprocessOnTheFly"], self.get_settings_defaults()["PreprocessOnTheFly"])
		
		# Make sure use shared library is valid
		if self._settings.get_boolean(["UseSharedLibrary"]) is None :
			self._settings.set_boolean(["UseSharedLibrary"], self.get_settings_defaults()["UseSharedLibrary"])
		
		# Make sure speed limit X is valid
		if self._settings.get_float(["SpeedLimitX"]) is None :
			self._settings.set_float(["SpeedLimitX"], self.get_settings_defaults()["SpeedLimitX"])
		
		# Make sure speed limit Y is valid
		if self._settings.get_float(["SpeedLimitY"]) is None :
			self._settings.set_float(["SpeedLimitY"], self.get_settings_defaults()["SpeedLimitY"])
		
		# Make sure speed limit Z is valid
		if self._settings.get_float(["SpeedLimitZ"]) is None :
			self._settings.set_float(["SpeedLimitZ"], self.get_settings_defaults()["SpeedLimitZ"])
		
		# Make sure speed limit E positive is valid
		if self._settings.get_float(["SpeedLimitEPositive"]) is None :
			self._settings.set_float(["SpeedLimitEPositive"], self.get_settings_defaults()["SpeedLimitEPositive"])
		
		# Make sure speed limit E negative is valid
		if self._settings.get_float(["SpeedLimitENegative"]) is None :
			self._settings.set_float(["SpeedLimitENegative"], self.get_settings_defaults()["SpeedLimitENegative"])
		
		# Make sure X motor steps/mm is valid
		if self._settings.get_float(["XMotorStepsPerMm"]) is None :
			self._settings.set_float(["XMotorStepsPerMm"], self.get_settings_defaults()["XMotorStepsPerMm"])
		
		# Make sure Y motor steps/mm is valid
		if self._settings.get_float(["YMotorStepsPerMm"]) is None :
			self._settings.set_float(["YMotorStepsPerMm"], self.get_settings_defaults()["YMotorStepsPerMm"])
		
		# Make sure Z motor steps/mm is valid
		if self._settings.get_float(["ZMotorStepsPerMm"]) is None :
			self._settings.set_float(["ZMotorStepsPerMm"], self.get_settings_defaults()["ZMotorStepsPerMm"])
		
		# Make sure E motor steps/mm is valid
		if self._settings.get_float(["EMotorStepsPerMm"]) is None :
			self._settings.set_float(["EMotorStepsPerMm"], self.get_settings_defaults()["EMotorStepsPerMm"])
		
		# Make sure X jerk sensitivity is valid
		if self._settings.get_int(["XJerkSensitivity"]) is None :
			self._settings.set_int(["XJerkSensitivity"], self.get_settings_defaults()["XJerkSensitivity"])
		
		# Make sure Y jerk sensitivity is valid
		if self._settings.get_int(["YJerkSensitivity"]) is None :
			self._settings.set_int(["YJerkSensitivity"], self.get_settings_defaults()["YJerkSensitivity"])
		
		# Make sure calibrate Z0 correction is valid
		if self._settings.get_float(["CalibrateZ0Correction"]) is None :
			self._settings.set_float(["CalibrateZ0Correction"], self.get_settings_defaults()["CalibrateZ0Correction"])
		
		# Make sure change settings before print is valid
		if self._settings.get_boolean(["ChangeSettingsBeforePrint"]) is None :
			self._settings.set_boolean(["ChangeSettingsBeforePrint"], self.get_settings_defaults()["ChangeSettingsBeforePrint"])
		
		# Make sure not using a Micro 3D printer is valid
		if self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) is None :
			self._settings.set_boolean(["NotUsingAMicro3DPrinter"], self.get_settings_defaults()["NotUsingAMicro3DPrinter"])
		
		# Make sure calibrate before print is valid
		if self._settings.get_boolean(["CalibrateBeforePrint"]) is None :
			self._settings.set_boolean(["CalibrateBeforePrint"], self.get_settings_defaults()["CalibrateBeforePrint"])
		
		# Make sure remove fan commands is valid
		if self._settings.get_boolean(["RemoveFanCommands"]) is None :
			self._settings.set_boolean(["RemoveFanCommands"], self.get_settings_defaults()["RemoveFanCommands"])
		
		# Make sure remove temperature commands is valid
		if self._settings.get_boolean(["RemoveTemperatureCommands"]) is None :
			self._settings.set_boolean(["RemoveTemperatureCommands"], self.get_settings_defaults()["RemoveTemperatureCommands"])
		
		# Make sure use GPIO is valid
		if self._settings.get_boolean(["UseGpio"]) is None :
			self._settings.set_boolean(["UseGpio"], self.get_settings_defaults()["UseGpio"])

		# Make sure heatbed temperature is valid
		if self._settings.get_int(["HeatbedTemperature"]) is None :
			self._settings.set_int(["HeatbedTemperature"], self.get_settings_defaults()["HeatbedTemperature"])
		
		# Make sure external bed height is valid
		if self._settings.get_float(["ExternalBedHeight"]) is None :
			self._settings.set_float(["ExternalBedHeight"], self.get_settings_defaults()["ExternalBedHeight"])
		
		# Make sure expand printable region is valid
		if self._settings.get_boolean(["ExpandPrintableRegion"]) is None :
			self._settings.set_boolean(["ExpandPrintableRegion"], self.get_settings_defaults()["ExpandPrintableRegion"])
		
		# Make sure host camera is valid
		if self._settings.get_boolean(["HostCamera"]) is None :
			self._settings.set_boolean(["HostCamera"], self.get_settings_defaults()["HostCamera"])
		
		# Make sure camera width is valid
		if self._settings.get_int(["CameraWidth"]) is None :
			self._settings.set_int(["CameraWidth"], self.get_settings_defaults()["CameraWidth"])
		
		# Make sure camera height is valid
		if self._settings.get_int(["CameraHeight"]) is None :
			self._settings.set_int(["CameraHeight"], self.get_settings_defaults()["CameraHeight"])
		
		# Make sure camera frames/second is valid
		if self._settings.get_int(["CameraFramesPerSecond"]) is None :
			self._settings.set_int(["CameraFramesPerSecond"], self.get_settings_defaults()["CameraFramesPerSecond"])
		
		# Make sure mid print filament change layers is valid
		if self._settings.get(["MidPrintFilamentChangeLayers"]) is None :
			self._settings.set(["MidPrintFilamentChangeLayers"], self.get_settings_defaults()["MidPrintFilamentChangeLayers"])
		
		# Make sure change led brightness is valid
		if self._settings.get_boolean(["ChangeLedBrightness"]) is None :
			self._settings.set_boolean(["ChangeLedBrightness"], self.get_settings_defaults()["ChangeLedBrightness"])
		
		# Make sure use debug logging is valid
		if self._settings.get_boolean(["UseDebugLogging"]) is None :
			self._settings.set_boolean(["UseDebugLogging"], self.get_settings_defaults()["UseDebugLogging"])
		
		# Make sure slicer never remind is valid
		if self._settings.get_boolean(["SlicerNeverRemind"]) is None :
			self._settings.set_boolean(["SlicerNeverRemind"], self.get_settings_defaults()["SlicerNeverRemind"])
		
		# Make sure sleep never remind is valid
		if self._settings.get_boolean(["SleepNeverRemind"]) is None :
			self._settings.set_boolean(["SleepNeverRemind"], self.get_settings_defaults()["SleepNeverRemind"])
	
	# Get default settings
	def get_settings_defaults(self) :
	
		# Return default settings
		return dict(
			BacklashX = 0.3,
			BacklashY = 0.6,
			BackLeftOrientation = 0.0,
			BackRightOrientation = 0.0,
			FrontRightOrientation = 0.0,
			FrontLeftOrientation = 0.0,
			BacklashSpeed = 1500.0,
			BackLeftOffset = 0.0,
			BackRightOffset = 0.0,
			FrontRightOffset = 0.0,
			FrontLeftOffset = 0.0,
			BedHeightOffset = 0.0,
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
			UseSharedLibrary = True,
			SpeedLimitX = 1500.0,
			SpeedLimitY = 1500.0,
			SpeedLimitZ = 60.0,
			SpeedLimitEPositive = 102.0,
			SpeedLimitENegative = 360.0,
			XMotorStepsPerMm = 19.3067875,
			YMotorStepsPerMm = 18.00885,
			ZMotorStepsPerMm = 646.3295,
			EMotorStepsPerMm = 128.451375,
			XJerkSensitivity = 195,
			YJerkSensitivity = 195,
			CalibrateZ0Correction = 0.0,
			ChangeSettingsBeforePrint = True,
			NotUsingAMicro3DPrinter = False,
			CalibrateBeforePrint = False,
			RemoveFanCommands = True,
			RemoveTemperatureCommands = True,
			UseGpio = False,
			GpioPin = None,
			GpioLayer = None,
			HeatbedTemperature = 70,
			ExternalBedHeight = 0.0,
			ExpandPrintableRegion = False,
			HostCamera = False,
			CameraPort = None,
			CameraWidth = 640,
			CameraHeight = 480,
			CameraFramesPerSecond = 20,
			MidPrintFilamentChangeLayers = '',
			ChangeLedBrightness = True,
			UseDebugLogging = False,
			SlicerNeverRemind = False,
			SleepNeverRemind = False
		)
	
	# Get IP address
	def getIpAddress(self) :
	
		# Return IP address
		try :
			return [l for l in ([ip for ip in socket.gethostbyname_ex(socket.gethostname())[2] if not ip.startswith("127.")][:1], [[(s.connect(("8.8.8.8", 53)), s.getsockname()[0], s.close()) for s in [socket.socket(socket.AF_INET, socket.SOCK_DGRAM)]][0][1]]) if l][0][0]
		except :
			return socket.gethostbyname(socket.gethostname())
	
	# On settings save
	def on_settings_save(self, data) :
	
		# Get old external bed height
		oldExternalBedHeight = self._settings.get_float(["ExternalBedHeight"])
	
		# Get old expand printable region setting
		oldExpandPrintableRegion = self._settings.get_boolean(["ExpandPrintableRegion"])
	
		# Get old host camera settings
		oldHostCamera = self._settings.get_boolean(["HostCamera"])
		oldCameraPort = self._settings.get(["CameraPort"])
		oldCameraWidth = self._settings.get_int(["CameraWidth"])
		oldCameraHeight = self._settings.get_int(["CameraHeight"])
		oldCameraFramesPerSecond = self._settings.get_int(["CameraFramesPerSecond"])
		
		# Get old not using a Micro 3D printer
		oldNotUsingAMicro3DPrinter = self._settings.get_boolean(["NotUsingAMicro3DPrinter"])
		
		# Save settings
		octoprint.plugin.SettingsPlugin.on_settings_save(self, data)
		
		# Send message for enabling/disabling GPIO buttons
		if self._settings.get_boolean(["UseGpio"]) and self._settings.get_int(["GpioPin"]) is not None and self._settings.get_int(["GpioLayer"]) is not None :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Enable GPIO Buttons"))
		else :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Disable GPIO Buttons"))
		
		# Check if Micro 3D printer profile exists
		if self._printer_profile_manager.exists("micro_3d") :
		
			# Clear profile changed
			profileChanged = not self._settings.get_boolean(["NotUsingAMicro3DPrinter"])
		
			# Check if external bed height setting changes
			if oldExternalBedHeight != self._settings.get_float(["ExternalBedHeight"]) :
		
				# Set bounds
				self.bedMediumMaxZ = 73.5 - self._settings.get_float(["ExternalBedHeight"])
				self.bedHighMaxZ = 112.0 - self._settings.get_float(["ExternalBedHeight"])
				self.bedHighMinZ = self.bedMediumMaxZ
				
				# Set profile changed
				profileChanged = True
		
			# Check if expand printable region setting changed
			if oldExpandPrintableRegion != self._settings.get_boolean(["ExpandPrintableRegion"]) :
			
				# Set bounds
				if self._settings.get_boolean(["ExpandPrintableRegion"]) :
					self.bedLowMinY = self.bedMediumMinY
				else :
					self.bedLowMinY = -2.0
		
				# Set profile changed
				profileChanged = True
		
			# Save printer profile if profile changed
			if profileChanged :
				self.savePrinterProfile()
			
			# Otherwise check if using a Micro 3D printer
			elif not self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
			
				# Select Micro 3D printer profile
				self._printer_profile_manager.select("micro_3d")
		
		# Check if host camera setting changed
		if oldHostCamera != self._settings.get_boolean(["HostCamera"]) :
		
			# Check if now hosting camera
			if self._settings.get_boolean(["HostCamera"]) :
			
				# Set camera URLs
				octoprint.settings.settings().set(["webcam", "stream"], "http://" + self.getIpAddress() + ":4999/stream.mjpg", True)
				octoprint.settings.settings().set(["webcam", "snapshot"], "http://" + self.getIpAddress() + ":4999/snapshot.jpg", True)
				
			# Otherwise assume now not hosting camera
			else :
			
				# Clear camera URLs
				octoprint.settings.settings().set(["webcam", "stream"], None, True)
				octoprint.settings.settings().set(["webcam", "snapshot"], None, True)
			
			# Save settings
			octoprint.settings.settings().save()
		
		# Check if hosting camera
		if self._settings.get_boolean(["HostCamera"]) :
		
			# Check if camera settings have changed
			if self.webcamProcess is None or (oldCameraPort != self._settings.get(["CameraPort"]) or oldCameraWidth != self._settings.get_int(["CameraWidth"]) or oldCameraHeight != self._settings.get_int(["CameraHeight"]) or oldCameraFramesPerSecond != self._settings.get_int(["CameraFramesPerSecond"])) :
		
				# Stop webcam process
				if self.webcamProcess is not None :
					self.webcamProcess.kill()
					self.webcamProcess = None
			
				# Start webcam process
				self.startWebcamProcess()
		
		# Otherwise
		else :
		
			# Stop webcam process
			if self.webcamProcess is not None :
				self.webcamProcess.kill()
				self.webcamProcess = None
		
		# Update debug level
		if self._settings.get_boolean(["UseDebugLogging"]) :
			self._m33fio_logger.setLevel(logging.DEBUG)
		else:
			self._m33fio_logger.setLevel(logging.CRITICAL)
		
		# Check if not using a Micro 3D printer setting changed
		if oldNotUsingAMicro3DPrinter != self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
		
			# Check if not using a Micro 3D printer
			if self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
		
				# Disable printer callbacks
				while self in self._printer._callbacks :
					self._printer.unregister_callback(self)
			
			# Otherwise
			else :
			
				# Enable printer callbacks
				if self not in self._printer._callbacks :
					self._printer.register_callback(self)
			
			# Check if not printing or paused
			if not self._printer.is_printing() and not self._printer.is_paused() :
			
				# Close connection
				if self._printer._comm is not None :
	
					try :
						self._printer._comm.close(False, False)
					except :
						pass
	
				self._printer.disconnect()
	
		# Check if a Micro 3D is connected and not printing
		if not self.invalidPrinter and not self._printer.is_printing() :
	
			# Save settings to the printer
			self.sendCommandsWithLineNumbers(self.getSaveCommands())
		
		# Set file locations
		self.setFileLocations()
	
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
			js = ["js/m33fio.js", "js/three.min.js", "js/OrbitControls.js", "js/STLLoader.js", "js/OBJLoader.js", "js/M3DLoader.js", "js/STLBinaryExporter.js", "js/TransformControls.js", "js/ThreeCSG.js", "js/AMFLoader.js", "js/VRMLLoader.js", "js/ColladaLoader.js", "js/Detector.js", "js/3MFLoader.js", "js/jszip.min.js"],
			css = ["css/m33fio.css"]
		)
	
	# Get update information
	def getUpdateInformation(self, *args, **kwargs) :
	
		# Return update information
		return dict(
			m33fio = dict(
				displayName = self._plugin_name,
				displayVersion = self._plugin_version,
				type = "github_release",
				current = self._plugin_version,
				user = "donovan6000",
				repo = "M33-Fio",
				pip = "https://github.com/donovan6000/M33-Fio/archive/{target_version}.zip"
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
			
				# Check if commands are provided
				if len(data["value"]) :
			
					# Check if not using a Micro 3D printer
					if self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
				
						# Send commands to printer
						self._printer.commands(data["value"])
				
					# Otherwise
					else :
			
						# Set no line numbers if first command is to remove line numbers
						if data["value"][0] == "M65538;no line numbers" :
							noLineNumber = True
							data["value"].pop(0)
				
						# Otherwise clear no line numbers
						else :
							noLineNumber = False
					
						# Check if waiting for commands to be sent
						if data["value"][-1] == "M65536;wait" :
					
							# Append a command that receives a confirmation to the end of list
							data["value"].insert(len(data["value"]) - 1, "G4")
					
						# Check if not using line numbers or printing
						if noLineNumber or self._printer.is_printing() :
				
							# Send commands to printer
							self.sendCommands(data["value"])
				
						# Otherwise
						else :
				
							# Send commands with line numbers
							self.sendCommandsWithLineNumbers(data["value"])
			
			# Otherwise check if parameter is to set fan
			elif data["value"].startswith("Set Fan:") :
			
				# Initialize variables
				error = False
				
				# Disable printer callbacks
				while self in self._printer._callbacks :
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
				
				# Return error if printer was found
				if currentPort is not None :
				
					# Re-connect; wait for the device to be available
					for i in xrange(5) :
						try :
							connection = serial.Serial(currentPort, currentBaudrate)
							break
			
						except :
							connection = None
							time.sleep(1)
				
					# Check if failed to connect to the printer
					if connection is None :
						
						# Set error
						error = True
					
					# Otherwise check if using OS X or Linux and the user lacks read/write access to the printer
					elif (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
					
						# Set error
						error = True
						
						# Close connection
						connection.close()
					
					# Check if an error hasn't occured
					if not error :
						
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
			
						# Save connection
						self.savedCurrentPort = currentPort
						self.savedCurrentBaudrate = currentBaudrate
						self.savedCurrentProfile = currentProfile
				
				# Otherwise
				else :
				
					# Set error
					error = True
				
				# Check if an error occured
				if error :
				
					# Clear EEPROM
					self.eeprom = None
				
				# Enable printer callbacks
				if self not in self._printer._callbacks :
					self._printer.register_callback(self)
				
				# Send response
				if error :
					return flask.jsonify(dict(value = "Error"))
				else :
					return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to set fan calibration
			elif data["value"].startswith("Set Fan Calibration:") :
			
				# Initialize variables
				error = False
				
				# Disable printer callbacks
				while self in self._printer._callbacks :
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
				
				# Return error if printer was found
				if currentPort is not None :
				
					# Re-connect; wait for the device to be available
					for i in xrange(5) :
						try :
							connection = serial.Serial(currentPort, currentBaudrate)
							break
			
						except :
							connection = None
							time.sleep(1)
				
					# Check if failed to connect to the printer
					if connection is None :
						
						# Set error
						error = True
					
					# Otherwise check if using OS X or Linux and the user lacks read/write access to the printer
					elif (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
					
						# Set error
						error = True
						
						# Close connection
						connection.close()
					
					# Check if an error hasn't occured
					if not error :
						
						# Check if getting EEPROM failed
						if not self.getEeprom(connection) :
				
							# Set error
							error = True
				
						# Otherwise
						else :
					
							# Set fan offset and scale
							fanOffset = int(data["value"][21 :])
							fanScale = float(255 - fanOffset) / 255
				
							# Check if setting fan failed
							if not self.setFan(connection, "Custom", fanOffset, fanScale) :
				
								# Set error
								error = True
					
							# Otherwise
							else :
				
								# Send new EEPROM
								self.getEeprom(connection, True)
				
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
				
				# Check if an error occured
				if error :
				
					# Clear EEPROM
					self.eeprom = None
				
				# Enable printer callbacks
				if self not in self._printer._callbacks :
					self._printer.register_callback(self)
				
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
				while self in self._printer._callbacks :
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
				
				# Return error if printer was found
				if currentPort is not None :
				
					# Re-connect; wait for the device to be available
					for i in xrange(5) :
						try :
							connection = serial.Serial(currentPort, currentBaudrate)
							break
			
						except :
							connection = None
							time.sleep(1)
				
					# Check if failed to connect to the printer
					if connection is None :
						
						# Set error
						error = True
					
					# Otherwise check if using OS X or Linux and the user lacks read/write access to the printer
					elif (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
					
						# Set error
						error = True
						
						# Close connection
						connection.close()
					
					# Check if an error hasn't occured
					if not error :
				
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
				
						# Save connection
						self.savedCurrentPort = currentPort
						self.savedCurrentBaudrate = currentBaudrate
						self.savedCurrentProfile = currentProfile
				
				# Otherwise
				else :
				
					# Set error
					error = True
				
				# Check if an error occured
				if error :
				
					# Clear EEPROM
					self.eeprom = None
				
				# Enable printer callbacks
				if self not in self._printer._callbacks :
					self._printer.register_callback(self)
				
				# Send response
				if error :
					return flask.jsonify(dict(value = "Error"))
				else :
					return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to print test border or print backlash calibration
			elif data["value"] == "Print Test Border" or data["value"] == "Print Backlash Calibration X 0.0-0.99" or data["value"] == "Print Backlash Calibration X 0.70-1.69" or data["value"] == "Print Backlash Calibration Y 0.0-0.99" or data["value"] == "Print Backlash Calibration Y 0.70-1.69" :
			
				# Set file location and destination
				if data["value"] == "Print Test Border" :
					location = self._basefolder.replace('\\', '/') + "/static/files/test border.gcode"
					destination = self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "test border.gcode").replace('\\', '/')
				elif data["value"] == "Print Backlash Calibration X 0.0-0.99" :
					location = self._basefolder.replace('\\', '/') + "/static/files/QuickBacklash_X_0.0-0.99.gcode"
					destination = self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "QuickBacklash_X_0.0-0.99.gcode").replace('\\', '/')
				elif data["value"] == "Print Backlash Calibration X 0.70-1.69" :
					location = self._basefolder.replace('\\', '/') + "/static/files/QuickBacklash_X_0.70-1.69.gcode"
					destination = self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "QuickBacklash_X_0.70-1.69.gcode").replace('\\', '/')
				elif data["value"] == "Print Backlash Calibration Y 0.0-0.99" :
					location = self._basefolder.replace('\\', '/') + "/static/files/QuickBacklash_Y_0.0-0.99.gcode"
					destination = self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "QuickBacklash_Y_0.0-0.99.gcode").replace('\\', '/')
				elif data["value"] == "Print Backlash Calibration Y 0.70-1.69" :
					location = self._basefolder.replace('\\', '/') + "/static/files/QuickBacklash_Y_0.70-1.69.gcode"
					destination = self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "QuickBacklash_Y_0.70-1.69.gcode").replace('\\', '/')
				
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
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Preparing test border print", header = "Printing Status"))
					else :
						self.printingBacklashCalibration = True
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Preparing backlash calibration print", header = "Printing Status"))
					
					# Check if shared library was loaded
					if self.loadSharedLibrary() :
					
						# Set shared library settings
						self.setSharedLibrarySettings()
									
						# Collect print information
						self.sharedLibrary.collectPrintInformation(ctypes.c_char_p(location), ctypes.c_bool(True))
						
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
						
						# Unload shared library
						self.unloadSharedLibrary()
					
					# Otherwise
					else :
					
						# Collect print information
						self.collectPrintInformation(location, True)
			
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
			
				# Initialize variables
				error = False
			
				# Disable printer callbacks
				while self in self._printer._callbacks :
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
				
				# Return error if printer was found
				if currentPort is not None :
				
					# Re-connect; wait for the device to be available
					for i in xrange(5) :
						try :
							connection = serial.Serial(currentPort, currentBaudrate)
							break
			
						except :
							connection = None
							time.sleep(1)
				
					# Check if failed to connect to the printer
					if connection is None :
						
						# Set error
						error = True
					
					# Otherwise check if using OS X or Linux and the user lacks read/write access to the printer
					elif (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
					
						# Set error
						error = True
						
						# Close connection
						connection.close()
					
					# Check if an error hasn't occured
					if not error :
				
						# Get EEPROM and send it
						self.getEeprom(connection, True)
				
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
				
				# Check if an error occured
				if error :
				
					# Clear EEPROM
					self.eeprom = None
				
				# Enable printer callbacks
				if self not in self._printer._callbacks :
					self._printer.register_callback(self)
				
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
					while self in self._printer._callbacks :
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
					
					# Return error if printer was found
					if currentPort is not None :
				
						# Re-connect; wait for the device to be available
						for i in xrange(5) :
							try :
								connection = serial.Serial(currentPort, currentBaudrate)
								break
			
							except :
								connection = None
								time.sleep(1)
				
						# Check if failed to connect to the printer
						if connection is None :
						
							# Set error
							error = True
						
						# Otherwise check if using OS X or Linux and the user lacks read/write access to the printer
						elif (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
					
							# Set error
							error = True
						
							# Close connection
							connection.close()
					
						# Check if an error hasn't occured
						if not error :
					
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
					
					# Otherwise
					else :
					
						# Set error
						error = True
					
					# Check if an error occured
					if error :
				
						# Clear EEPROM
						self.eeprom = None
					
					# Enable printer callbacks
					if self not in self._printer._callbacks :
						self._printer.register_callback(self)
				
				# Send response
				if error :
					return flask.jsonify(dict(value = "Error"))
				else :
					return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is a response to a message
			elif data["value"] == "OK" or data["value"] == "Yes" or data["value"] == "No" :
			
				# Check if waiting for a response
				if self.messageResponse is None :
			
					# Set response
					if data["value"] == "No" :
						self.messageResponse = False
					else :
						self.messageResponse = True
			
			# Otherwise check if parameter is to temporarily disable reminder
			elif data["value"].startswith("Temporarily Disable Reminder:") :
			
				# Get value
				value = data["value"][30 :]
				
				# Temporarily disable slicer reminder
				if value == "Slicer" :
					self.slicerReminder = False
					
					# Set file locations
					self.setFileLocations()
				
				# Temporarily disable sleep reminder
				elif value == "Sleep" :
					self.sleepReminder = False
			
			# Otherwise check if parameter is to permanently disable reminder
			elif data["value"].startswith("Permanently Disable Reminder:") :
			
				# Get value
				value = data["value"][30 :]
				
				# Permanently disable slicer reminder
				if value == "Slicer" :
					self._settings.set_boolean(["SlicerNeverRemind"], True)
					
					# Set file locations
					self.setFileLocations()
				
				# Permanently disable sleep reminder
				elif value == "Sleep" :
					self._settings.set_boolean(["SleepNeverRemind"], True)
				
				# Save settings
				octoprint.settings.settings().save()
			
			# Otherwise check if parameter is to view a profile
			elif data["value"].startswith("View Profile:") :
			
				# Get values
				values = json.loads(data["value"][14 :])
				
				# Check if slicer name or slicer profile name is invalid
				if values["slicerName"] is None or values["slicerProfileName"] is None :
				
					# Return error
					return flask.jsonify(dict(value = "Error"))
				
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
				if values["slicerName"] == "cura" :
					self.convertProfileToCura(fileLocation, fileDestination, values["printerProfileName"])
				elif values["slicerName"] == "slic3r" :
					self.convertProfileToSlic3r(fileLocation, fileDestination, values["printerProfileName"])
				else :
					shutil.copyfile(fileLocation, fileDestination)
				
				# Return location
				return flask.jsonify(dict(value = "OK", path = "m33fio/download/" + destinationName))
			
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
					SpeedLimitX = self._settings.get_float(["SpeedLimitX"]),
					SpeedLimitY = self._settings.get_float(["SpeedLimitY"]),
					SpeedLimitZ = self._settings.get_float(["SpeedLimitZ"]),
					SpeedLimitEPositive = self._settings.get_float(["SpeedLimitEPositive"]),
					SpeedLimitENegative = self._settings.get_float(["SpeedLimitENegative"]),
					ExternalBedHeight = self._settings.get_float(["ExternalBedHeight"]),
					ExpandPrintableRegion = self._settings.get_boolean(["ExpandPrintableRegion"]),
					XMotorStepsPerMm = self._settings.get_float(["XMotorStepsPerMm"]),
					YMotorStepsPerMm = self._settings.get_float(["YMotorStepsPerMm"]),
					ZMotorStepsPerMm = self._settings.get_float(["ZMotorStepsPerMm"]),
					EMotorStepsPerMm = self._settings.get_float(["EMotorStepsPerMm"]),
					XJerkSensitivity = self._settings.get_int(["XJerkSensitivity"]),
					YJerkSensitivity = self._settings.get_int(["YJerkSensitivity"]),
					CalibrateZ0Correction = self._settings.get_float(["CalibrateZ0Correction"])
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
				return flask.jsonify(dict(value = "OK", path = "m33fio/download/" + destinationName))
			
			# Otherwise check if parameter is to set printer settings
			elif data["value"].startswith("Set Printer Settings:") :
			
				# Get printer settings
				try :
					printerSettings = yaml.load(data["value"][21 :])
				except :
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
				
				if "ExpandPrintableRegion" in printerSettings :
					self._settings.set_boolean(["ExpandPrintableRegion"], bool(printerSettings["ExpandPrintableRegion"]))
				
				if "XMotorStepsPerMm" in printerSettings :
					self._settings.set_float(["XMotorStepsPerMm"], float(printerSettings["XMotorStepsPerMm"]))
				
				if "YMotorStepsPerMm" in printerSettings :
					self._settings.set_float(["YMotorStepsPerMm"], float(printerSettings["YMotorStepsPerMm"]))
				
				if "ZMotorStepsPerMm" in printerSettings :
					self._settings.set_float(["ZMotorStepsPerMm"], float(printerSettings["ZMotorStepsPerMm"]))
				
				if "EMotorStepsPerMm" in printerSettings :
					self._settings.set_float(["EMotorStepsPerMm"], float(printerSettings["EMotorStepsPerMm"]))
				
				if "XJerkSensitivity" in printerSettings :
					self._settings.set_int(["XJerkSensitivity"], int(printerSettings["XJerkSensitivity"]))
				
				if "YJerkSensitivity" in printerSettings :
					self._settings.set_int(["YJerkSensitivity"], int(printerSettings["YJerkSensitivity"]))
				
				if "CalibrateZ0Correction" in printerSettings :
					self._settings.set_float(["CalibrateZ0Correction"], float(printerSettings["CalibrateZ0Correction"]))
				
				# Check if a Micro 3D is connected and not printing
				if not self.invalidPrinter and not self._printer.is_printing() :
				
					# Save settings to the printer
					self.sendCommandsWithLineNumbers(self.getSaveCommands())
				
				# Save software settings
				octoprint.settings.settings().save()
				
				# Send response
				return flask.jsonify(dict(value = "OK"))
			
			# Otherwise check if parameter is to set external bed height
			elif data["value"].startswith("Set External Bed Height:") :
			
				# Set external bed height
				self._settings.set_float(["ExternalBedHeight"], float(data["value"][25 :]))
			
				# Save software settings
				octoprint.settings.settings().save()
			
			# Otherwise check if parameter is to set expand printable region
			elif data["value"].startswith("Set Expand Printable Region:") :
			
				# Set value
				if data["value"][29 :] == "True" :
					value = True
				else :
					value = False
			
				# Set expand printable region
				self._settings.set_boolean(["ExpandPrintableRegion"], value)
			
				# Save software settings
				octoprint.settings.settings().save()
			
			# Otherwise check if parameter is to remove temporary files
			elif data["value"] == "Remove Temp" :
			
				# Remove temporary files
				self.removeTemporaryFiles()
			
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
				while self in self._printer._callbacks :
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
				
				# Return error if printer was found
				if currentPort is not None :
		
					# Re-connect; wait for the device to be available
					for i in xrange(5) :
						try :
							connection = serial.Serial(currentPort, currentBaudrate)
							break
			
						except :
							connection = None
							time.sleep(1)
				
					# Check if failed to connect to the printer
					if connection is None :
						
						# Set error
						error = True
					
					# Otherwise check if using OS X or Linux and the user lacks read/write access to the printer
					elif (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
					
						# Set error
						error = True
						
						# Close connection
						connection.close()
					
					# Check if an error hasn't occured
					if not error :
				
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
				
				# Otherwise
				else :
				
					# Set error
					error = True
				
				# Check if an error occured
				if error :
				
					# Clear EEPROM
					self.eeprom = None
			
				# Enable printer callbacks
				if self not in self._printer._callbacks :
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
				
				# Check if not attempting to close initial OctoPrint instance
				if port != 5000 :
				
					# Find all OctoPrint instances
					for process in psutil.process_iter() :
						if process.name().lower().startswith("octoprint") or process.name().lower().startswith("python") :
						
							# Check if process has the specified port
							processDetails = psutil.Process(process.pid)
							processPort = self.getListenPort(processDetails)
							if processPort is not None and port == processPort :
						
								# Terminate process
								processDetails.terminate()
							
								# Return response
								return flask.jsonify(dict(value = "OK"))
				
				# Return error
				return flask.jsonify(dict(value = "Error"))
			
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
				configFile = self._settings.global_get_basefolder("base").replace('\\', '/') + "/config.yaml" + str(port)
				shutil.copyfile(self._settings.global_get_basefolder("base").replace('\\', '/') + "/config.yaml", configFile)
				
				# Create instance
				octoprintProcess = subprocess.Popen([sys.executable.replace('\\', '/'), "-c", "import octoprint;octoprint.main()", "--port", str(port), "--config", self._settings.global_get_basefolder("base").replace('\\', '/') + "/config.yaml" + str(port)])
				
				# Wait until new instance is ready
				while self.isPortOpen(port) :
					time.sleep(0.5)
					
					# Check if creating instance failed
					if octoprintProcess.poll() is not None :
					
						# Remove config file
						if os.path.isfile(configFile) :
							os.remove(configFile)
						
						# Send response
						return flask.jsonify(dict(value = "Error"))
				
				# Send response
				return flask.jsonify(dict(value = "OK", port = port))
			
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
			
			# Otherwise check if parameter is to set mid-print filament change layers
			elif data["value"].startswith("Mid-Print Filament Change Layers:") :
				
				# Set mid-print filament change layers
				self._settings.set(["MidPrintFilamentChangeLayers"], data["value"][33 :])
				
				# Save settings
				octoprint.settings.settings().save()
			
			# Otherwise check if parameter is cancel print
			elif data["value"] == "Cancel Print" :
				
				# Send soft emergency stop immediately to the printer
				if isinstance(self._printer.get_transport(), serial.Serial) :
					self._printer.get_transport().write("M65537;stop")
			
			# Otherwise check if parameter is emergency stop
			elif data["value"] == "Emergency Stop" :
			
				# Send hard emergency stop immediately to the printer
				if isinstance(self._printer.get_transport(), serial.Serial) :
					self._printer.get_transport().write("M0")
			
			# Otherwise check if parameter is to reconnect to printer
			elif data["value"] == "Reconnect To Printer" :
			
				# Check if connection was saved
				if hasattr(self, "savedCurrentPort") and self.savedCurrentPort is not None and hasattr(self, "savedCurrentBaudrate") and self.savedCurrentBaudrate is not None and hasattr(self, "savedCurrentProfile") and self.savedCurrentProfile is not None :
				
					# Set reconnecting to printer
					self.reconnectingToPrinter = True
					
					# Re-connect
					self._printer.connect(self.savedCurrentPort, self.savedCurrentBaudrate, self.savedCurrentProfile)
					
					# Remove saved connection
					self.savedCurrentPort = None
					self.savedCurrentBaudrate = None
					self.savedCurrentProfile = None
			
			# Otherwise check if parameter is to pause
			elif data["value"] == "Pause" :
			
				# Send pause command
				self._printer.commands("M25")
			
			# Otherwise check if parameter is to resume
			elif data["value"] == "Resume" :
			
				# Send resume command
				self._printer.commands("M24")
			
			# Otherwise check if parameter is to resume after mid-print filament change
			elif data["value"] == "Resume After Mid-Print Filament Change" and hasattr(self, "savedX") and self.savedX is not None and hasattr(self, "savedY") and self.savedY is not None and hasattr(self, "savedZ") and self.savedZ is not None and hasattr(self, "savedE") and self.savedE is not None :
			
				# Set commands
				commands = [
					"G90",
					"G92 E%f" % self.savedE,
					"G0 E%f F345" % (self.savedE - 0.3),
					"G0 X%f Y%f F2000" % (self.savedX, self.savedY),
					"G0 Z%f F90" % self.savedZ,
					"G4",
					"M65539;hide message",
					"M24"
				]
				
				# Clear saved values
				self.savedX = None
				self.savedY = None
				self.savedZ = None
				self.savedE = None
			
				# Send commands with line numbers
				self.sendCommandsWithLineNumbers(commands)
			
			# Otherwise check if parameter is to get print information
			elif data["value"] == "Print Information" and hasattr(self, "maxXExtruderLow") and hasattr(self, "maxXExtruderMedium") and hasattr(self, "maxXExtruderHigh") and hasattr(self, "maxYExtruderLow") and hasattr(self, "maxYExtruderMedium") and hasattr(self, "maxYExtruderHigh") and hasattr(self, "maxZExtruder") and hasattr(self, "minXExtruderLow") and hasattr(self, "minXExtruderMedium") and hasattr(self, "minXExtruderHigh") and hasattr(self, "minYExtruderLow") and hasattr(self, "minYExtruderMedium") and hasattr(self, "minYExtruderHigh") and hasattr(self, "minZExtruder") :
			 
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
				
				# Clear ready to print
				self.readyToPrint = False
			
			# Otherwise check if parameter is to not show mid-print filament change
			elif data["value"] == "Don't Show Mid-Print Filament Change" :
			
				# Show mid-print filament change
				self.showMidPrintFilamentChange = False
		
		# Otherwise check if command is a file
		elif command == "file" :
		
			# Initialize variables
			error = False
			encryptedRom = ''
			
			# Check if firmware version is valid
			firmwareVersion = re.search("(^| )\\d{10}(?=\\.|$)", data["name"])
			if firmwareVersion is not None :
			
				# Disable printer callbacks
				while self in self._printer._callbacks :
					self._printer.unregister_callback(self)
			
				# Get current printer connection state
				currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
			
				# Set baudrate if invalid
				if not currentBaudrate or currentBaudrate == 0 :
					currentBaudrate = 115200
			
				# Set firmware version
				firmwareVersion = firmwareVersion.group(0).strip()
			
				# Save ports
				self.savePorts(currentPort)
				
				# Switch into bootloader mode
				self.sendCommands("M115 S628")
				time.sleep(1)
				
				# Set updated port
				currentPort = self.getPort()
				
				# Return error if printer was found
				if currentPort is not None :
			
					# Re-connect; wait for the device to be available
					for i in xrange(5) :
						try :
							connection = serial.Serial(currentPort, currentBaudrate)
							break
			
						except :
							connection = None
							time.sleep(1)
				
					# Check if failed to connect to the printer
					if connection is None :
						
						# Set error
						error = True
					
					# Otherwise check if using OS X or Linux and the user lacks read/write access to the printer
					elif (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
					
						# Set error
						error = True
						
						# Close connection
						connection.close()
					
					# Check if an error hasn't occured
					if not error :
				
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
							if not self.updateFirmware(connection, encryptedRom, int(firmwareVersion)) :
				
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
				
				# Check if an error occured
				if error :
			
					# Clear EEPROM
					self.eeprom = None
			
				# Enable printer callbacks
				if self not in self._printer._callbacks :
					self._printer.register_callback(self)
			
			# Otherwise
			else :
		
				# Set error
				error = True
			
			# Send response
			if error :
				return flask.jsonify(dict(value = "Error"))
			else :
				return flask.jsonify(dict(value = "OK"))
	
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
		try :
			self.eeprom = connection.read(0x301)
		
		# Check if an error occured
		except :
	
			# Don't save response
			self.eeprom = None
	
			# Return false
			return False
	
		# Check if EEPROM wasn't read successfully
		if len(self.eeprom) != 0x301 or self.eeprom[-1] != '\r' :
		
			# Don't save response
			self.eeprom = None
	
			# Return false
			return False
		
		# Remove newline character from end of EEPROM
		self.eeprom = self.eeprom[: -1]
		
		# Check if sending
		if send :
		
			# Send EEPROM
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "EEPROM", eeprom = self.eeprom.encode("hex").upper()))
			
			# Get firmware details
			firmwareType, firmwareVersion, firmwareRelease = self.getFirmwareDetails()
			
			# Send firmware details
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Current Firmware", type = firmwareType, release = firmwareRelease))
		
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
		newChipCrc = 0
		
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
							index = 3
							while index >= 0 :
								newChipCrc <<= 8
								newChipCrc += int(ord(response[index]))
								index -= 1
						
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
							if newChipCrc == romCrc :
							
								# Check if Z state wasn't saved
								if self.eepromGetInt("savedZState") == 0 :
						
									# Set error to if zeroing out last recorded Z value in EEPROM failed
									error = self.eepromSetInt(connection, "lastRecordedZValue", 0)
								
								# Check if an error hasn't occured
								if not error :
					
									# Get firmware version from EEPROM
									eepromFirmwareVersion = self.eepromGetInt("firmwareVersion")
								
									# Get old firmware type
									oldFirmwareType = None
									for firmware in self.providedFirmwares :
										if int(self.providedFirmwares[firmware]["Version"]) / 100000000 == eepromFirmwareVersion / 100000000 :
											oldFirmwareType = self.providedFirmwares[firmware]["Type"]
											break
								
									# Get new firmware type
									newFirmwareType = None
									for firmware in self.providedFirmwares :
										if int(self.providedFirmwares[firmware]["Version"]) / 100000000 == romVersion / 100000000 :
											newFirmwareType = self.providedFirmwares[firmware]["Type"]
											break
								
									# Check if going from M3D or M3D Mod firmware to a different firmware
									if (oldFirmwareType == "M3D" or oldFirmwareType == "M3D Mod") and (newFirmwareType != "M3D" and newFirmwareType != "M3D Mod") :
								
										# Check if Z state was saved
										if self.eepromGetInt("savedZState") != 0 :
								
											# Get current Z value from EEPROM
											currentValueZ = self.eepromGetInt("lastRecordedZValue")
									
											# Convert current Z to single-precision floating-point format used by other firmwares
											currentValueZ /= 5170.635833481
									
											# Set error to if setting current Z in EEPROM failed
											error = self.eepromSetFloat(connection, "lastRecordedZValue", currentValueZ)
								
									# Otherwise check if going from a different firmware to M3D or M3D Mod firmware
									elif (oldFirmwareType != "M3D" and oldFirmwareType != "M3D Mod") and (newFirmwareType == "M3D" or newFirmwareType == "M3D Mod") :
								
										# Check if Z state was saved
										if self.eepromGetInt("savedZState") != 0 :
								
											# Get current Z value from EEPROM
											currentValueZ = self.eepromGetFloat("lastRecordedZValue")
									
											# Convert current Z to unsigned 32-bit integer format used by M3D and M3D Mod firmwares
											currentValueZ = int(round(currentValueZ * 5170.635833481))
									
											# Set error to if saving current Z in EEPROM failed
											error = self.eepromSetInt(connection, "lastRecordedZValue", currentValueZ)
									
										# Check if an error hasn't occured
										if not error :
									
											# Set error to if clearing calibrate Z0 correction and X and Y sensitivity, value, direction, and validity in EEPROM failed
											error = self.eepromSetInt(connection, "calibrateZ0Correction", 0, self.eepromOffsets["savedYState"]["offset"] + self.eepromOffsets["savedYState"]["bytes"] - self.eepromOffsets["calibrateZ0Correction"]["offset"])
										
										# Check if an error hasn't occured
										if not error :
						
											# Set error to if zeroing out steps/mm in EEPROM failed
											error = self.eepromSetInt(connection, "xMotorStepsPerMm", 0, self.eepromOffsets["eMotorStepsPerMm"]["offset"] + self.eepromOffsets["eMotorStepsPerMm"]["bytes"] - self.eepromOffsets["xMotorStepsPerMm"]["offset"])
								
								# Check if an error hasn't occured
								if not error :
							
									# Set error to if updating firmware version in EEPROM failed
									error = self.eepromSetInt(connection, "firmwareVersion", romVersion)
								
								# Check if an error hasn't occured
								if not error :
						
									# Set error to if updating firmware version in EEPROM failed
									error = self.eepromSetInt(connection, "firmwareCrc", romCrc)
					
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
		
		# Return if an error didn't occur
		return not error
	
	# Set fan
	def setFan(self, connection, name, newFanOffset = None, newFanScale = None) :
	
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
		
		elif name == "Custom" :
			fanType = 254
			if newFanOffset is None :
				fanOffset = 0
			else :
				fanOffset = newFanOffset
			if newFanScale is None :
				fanScale = 1
			else :
				fanScale = newFanScale
		
		else :
			return False
		
		# Get current fan type, offset, and scale from EEPROM
		currentFanType = self.eepromGetInt("fanType")
		currentFanOffset = self.eepromGetInt("fanOffset")
		currentFanScale = self.eepromGetFloat("fanScale")
		
		# Check if fan scales differ
		if currentFanScale != round(fanScale, 6) :
		
			# Set error to if setting fan scale in EEPROM failed
			error = self.eepromSetFloat(connection, "fanScale", fanScale)
		
		# Check if fan offsets differ
		if not error and currentFanOffset != fanOffset :
		
			# Set error to if saving fan offset in EEPROM failed
			error = self.eepromSetInt(connection, "fanOffset", fanOffset)
		
		# Check if fan types differ
		if not error and currentFanType != fanType :
		
			# Set error to if saving fan offset in EEPROM failed
			error = self.eepromSetInt(connection, "fanType", fanType)
	
		# Return if an error didn't occur
		return not error
	
	# Set extruder current
	def setExtruderCurrent(self, connection, value) :
	
		# Clear error
		error = False
	
		# Check if extruder current values differ
		if self.eepromGetInt("eMotorCurrent") != value :
		
			# Set error to if saving extruder current in EEPROM was successful
			error = self.eepromSetInt(connection, "eMotorCurrent", value)
		
		# Return if an error didn't occur
		return not error
	
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
			
			# Check if deprecated queue name is valid
			if hasattr(self._printer._comm, "_commandQueue") :
			
				# Append all currently queued commands to list
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
			
				# Append all currently queued commands to list
				while not self._printer._comm._command_queue.empty() :
					command = self._printer._comm._command_queue.get()
					commands += [(command[0], command[1])]
			
				# Insert list into queue
				for command in commands :
					if isinstance(command, tuple) :
						self._printer._comm._command_queue.put(command)
					else :
						self._printer._comm._command_queue.put((command, None))
		
		# Otherwise
		else :
		
			# Send commands to printer
			self._printer.commands(commands)
	
	# Send commands with line numbers
	def sendCommandsWithLineNumbers(self, commands) :
	
		# Initialize line number
		lineNumber = 1
		command = "N0 M110"
		self.sendCommands(command + self.calculateChecksum(command))
	
		# Go through all commands
		for command in commands :
	
			# Check if command only provides feedback when it doesn't have a line number
			if (self.currentFirmwareType == "M3D" or self.currentFirmwareType == "M3D Mod") and (command == "M114" or command == "M117" or command.startswith("M618 ") or command.startswith("M619 ")) :
		
				# Send command to printer
				self.sendCommands(command)
		
			# Otherwise
			else :
		
				# Send command with line number to printer
				command = 'N' + str(lineNumber) + ' ' + command
				self.sendCommands(command + self.calculateChecksum(command))
		
				# Increment line number
				lineNumber += 1
	
	# Calculate checksum
	def calculateChecksum(self, command) :
	
		# Calculate checksum
		checksum = 0
		for character in command :
			if character == '*' :
				return str(checksum)
			checksum ^= ord(character)
		
		# Return checksum
		return '*' + str(checksum)
	
	# Empty command queue
	def emptyCommandQueue(self) :
	
		# Check if communication layer has been established
		if self._printer._comm is not None :
		
			# Empty command queues
			while not self._printer._comm._send_queue.empty() :
				self._printer._comm._send_queue.get()
			
			# Check if deprecated queue name is valid
			if hasattr(self._printer._comm, "_commandQueue") :
			
				# Empty command queues
				while not self._printer._comm._commandQueue.empty() :
					self._printer._comm._commandQueue.get()
			
			# Otherwise
			else :
			
				# Empty command queues
				while not self._printer._comm._command_queue.empty() :
					self._printer._comm._command_queue.get()
	
	# Process write
	def processWrite(self, data) :
	
		# Set return value
		returnValue = len(data)
	
		# Log sent data
		self._m33fio_logger.debug("Original Sent: " + data)
		
		# Check if canceling print
		if self.cancelingPrint :
		
			# Fake confirmation
			self._printer.fake_ack()
			
			# Return
			return returnValue
	
		# Check if printing
		if self._printer.is_printing() :
			
			# Wait until ready to print or print is canceled
			while not self.readyToPrint and self._printer.is_printing() :
			
				# Update communication timeout to prevent other commands from being sent
				if self._printer._comm is not None :
					self._printer._comm._gcode_G4_sent("G4 P10")
				
				time.sleep(0.01)
			
			# Check if print was invalid
			if not self._printer.is_printing() :
			
				# Set command to hard emergency stop
				data = "M0\n"
				
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
		
		# Check if request is invalid
		if (not self._printer.is_printing() and (data.startswith("N0 M110 N0") or data.startswith("M110"))) or data == "M21\n" or data == "M84\n" :
		
			# Send fake acknowledgment
			self._printer.fake_ack()
		
		# Otherwise
		else :
			
			# Check if request is hard emergency stop
			if "M0" in data :
	
				# Check if printing or paused
				if self._printer.is_printing() or self._printer.is_paused() :
				
					# Set canceling print
					self.cancelingPrint = True
	
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
					
					# Clear canceling print
					self.cancelingPrint = False
					
					# Set commands
					commands = [
						"M104 S0"
					]

					if self.heatbedConnected :
						commands += ["M140 S0"]
			
					if self._settings.get_boolean(["UseGpio"]) :
						commands += ["M107 T1"]

					commands += ["M18"]
					commands += ["M107"]
			
					if self._settings.get_boolean(["ChangeLedBrightness"]) :
						if self.printerColor == "Clear" :
							commands += ["M420 T20"]
						else :
							commands += ["M420 T100"]
			
					# Append print done to command list
					commands += ["M65541;print done"]
				
					# Send commands with line numbers
					self.sendCommandsWithLineNumbers(commands)
	
			# Otherwise check if request is soft emergency stop
			elif "M65537" in data :
	
				# Check if printing or paused
				if self._printer.is_printing() or self._printer.is_paused() :
				
					# Set canceling print
					self.cancelingPrint = True
			
					# Wait until all sent commands have been processed
					while len(self.sentCommands) :
				
						# Update communication timeout to prevent other commands from being sent
						if self._printer._comm is not None :
							self._printer._comm._long_running_command = True
							self._printer._comm._gcode_G4_sent("G4 P10")
		
						time.sleep(0.01)
	
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
					
					# Clear canceling print
					self.cancelingPrint = False
					
					# Set perform cancel print movement
					self.performCancelPrintMovement = True
					
					# Set commands
					commands = [
						"M114",
						"G4"
					]
					
					# Set long running command
					if self._printer._comm is not None :
						self._printer._comm._long_running_command = True
		
					# Send commands with line numbers
					self.sendCommandsWithLineNumbers(commands)
			
				# Return
				return returnValue
		
			# Initialize variables
			endWaitingAfterSend = False
			hideMessageAfterSend = False
			showMidPrintFilamentChangeAfterSend = False
			sendCommandMultipleTimes = False
		
			# Check if pre-processing on the fly and command is not a starting line number and wasn't added on the fly
			if self._printer.is_printing() and self._settings.get_boolean(["PreprocessOnTheFly"]) and not data.startswith("N0 M110") and "**" not in data :
			
				# Check if command contains a line number
				lineNumberLocation = re.findall("^N(\d+)", data)
				if len(lineNumberLocation) :
			
					# Get line number
					lineNumber = int(lineNumberLocation[0])
				
					# Check if shared library was loaded
					if self.sharedLibrary :
				
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
						
						except :
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
						
						except :
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
							while readingTemperature and self._printer._comm is not None :
							
								# Read heatbed temperature
								heatbedTemperature = ''
								while len(heatbedTemperature) == 0 :
								
									# Read heatbed temperature until it stops
									try :
										heatbedTemperature = self.heatbedConnection.readline().strip()
										
										if heatbedTemperature == "ok" :
											readingTemperature = False
									except :
										readingTemperature = False
										break
								
								# Check it not done
								if readingTemperature :
								
									# Display heatbed temperature
									if len(self._printer._comm.getTemp()) and self._printer._comm.getTemp()[0][0] is not None :
										command = "T:%.4f B:%s" % (self._printer._comm.getTemp()[0][0], heatbedTemperature)
									else :
										command = "T:0.0 B:" + heatbedTemperature
								
									self._printer._comm._processTemperatures(command)
									self._printer._comm._callback.on_comm_temperature_update(self._printer._comm.getTemp(), self._printer._comm.getBedTemp())
									self._printer._addLog("Recv: " + command)
								
									# Update communication timeout to prevent other commands from being sent
									if self._printer._comm is not None :
										self._printer._comm._gcode_G4_sent("G4 S1")
								
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
								self._printer._comm._long_running_command = True
								self._printer._comm._gcode_G4_sent("G4 P10")
				
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
				
					# Check if printing
					if self._printer.is_printing() :
					
						# Send message
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Starting Mid-Print Filament Change"))
					
						# Wait until all sent commands have been processed
						while len(self.sentCommands) :
						
							# Update communication timeout to prevent other commands from being sent
							if self._printer._comm is not None :
								self._printer._comm._long_running_command = True
								self._printer._comm._gcode_G4_sent("G4 P10")
				
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
					
						# Set starting mid-print filament change
						self.startingMidPrintFilamentChange = True
						
						# Set commands
						commands = [
							"M114",
							"G4"
						]
						
						# Set long running command
						if self._printer._comm is not None :
							self._printer._comm._long_running_command = True
			
						# Send commands with line numbers
						self.sendCommandsWithLineNumbers(commands)
						
						# Return
						return returnValue
					
					# Otherwise
					else :
					
						# Set command to nothing
						gcode.removeParameter('M')
						gcode.setValue('G', '4')
				
				# Otherwise check if request ends waiting for commands sent
				elif gcode.getValue('M') == "65536" :
				
					# Set end waiting after send
					endWaitingAfterSend = True
					
					# Set command to nothing
					gcode.removeParameter('M')
					gcode.setValue('G', '4')
					
				# Otherwise check if hide message command
				elif gcode.getValue('M') == "65539" :
		
					# Set hide message after send
					hideMessageAfterSend = True
					
					# Set command to nothing
					gcode.removeParameter('M')
					gcode.setValue('G', '4')
				
				# Otherwise check if show mid-print filament change command
				elif gcode.getValue('M') == "65540" :
		
					# Set show mid-print filament change after send
					showMidPrintFilamentChangeAfterSend = True
					
					# Set command to nothing
					gcode.removeParameter('M')
					gcode.setValue('G', '4')
				
				# Otherwise check if print is done
				elif gcode.getValue('M') == "65541" :
				
					# Wait until all sent commands have been processed
					while len(self.sentCommands) :
					
						# Update communication timeout to prevent other commands from being sent
						if self._printer._comm is not None :
							self._printer._comm._long_running_command = True
							self._printer._comm._gcode_G4_sent("G4 P10")
			
						time.sleep(0.01)
					
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
					
					# Reset print settings
					self.resetPrintSettings()
					
					# Unload shared library if it's loaded
					self.unloadSharedLibrary()
			
					# Enable sleep
					self.enableSleep()
					
					# Return
					return returnValue
				
				# Check if using M3D or M3D Mod firmware
				if self.currentFirmwareType == "M3D" or self.currentFirmwareType == "M3D Mod" :
				
					# Get the command's binary representation
					data = gcode.getBinary()
				
				# Otherwise
				else :
				
					# Get the command's ASCII representation with checksum
					data = gcode.getAscii()
					data += self.calculateChecksum(data)
				
				# Log sent data
				self._m33fio_logger.debug("Processed Sent: " + gcode.getAscii())
				
				# Check if command has a line number
				if gcode.hasValue('N') :
					
					# Limit the amount of commands that can simultaneous be sent to the printer
					while len(self.sentCommands) :
				
						# Update communication timeout to prevent other commands from being sent
						if self._printer._comm is not None :
							self._printer._comm._gcode_G4_sent("G4 P10")
					
						time.sleep(0.01)
					
					# Get line number
					lineNumber = int(gcode.getValue('N'))
					
					# Set last line number sent
					self.lastLineNumberSent = lineNumber
		
					# Check if command contains a starting line number
					if lineNumber == 0 and gcode.getValue('M') == "110" :
				
						# Set reset line number command sent
						self.resetLineNumberCommandSent = True
						
						# Set send commands multiple times
						sendCommandMultipleTimes = True
					
					# Store command
					self.sentCommands[lineNumber % 0x10000] = data
			
			# Check if command doesn't have a line number
			if not gcode.hasValue('N') :
			
				# Set last command sent
				self.lastCommandSent = data
			
			# Send command to printer
			self.originalWrite(data)
			
			# Send command multiple times if set
			if sendCommandMultipleTimes :
				for i in xrange(4) :
					self.originalWrite(data)
			
			# Check if end waiting after send
			if endWaitingAfterSend :
			
				# End waiting
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Done Waiting"))
			
			# Otherwise check if hide message after send
			elif hideMessageAfterSend :
			
				# Hide message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Hide Message"))
			
			# Otherwise check if show mid-print filament change after send
			elif showMidPrintFilamentChangeAfterSend :
			
				# Set show mid-print filament change
				self.showMidPrintFilamentChange = True
		
				# Send message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Mid-Print Filament Change"))
		
		# Return
		return returnValue
	
	# Process read
	def processRead(self) :
	
		# Get response
		response = self.originalRead()
		
		# Reset consecutive timeouts
		if self._printer._comm is not None and hasattr(self._printer._comm, "_consecutive_timeouts") and response is not None and response.strip() is not '' :
			self._printer._comm._consecutive_timeouts = 0
		
		# Log received data
		self._m33fio_logger.debug("Original Response: " + response)
		
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
			
			# Check if waiting for a command to be processed
			if self.lastLineNumberSent is not None and self.lastLineNumberSent % 0x10000 in self.sentCommands :
			
				# Set response to resending command
				response = "rs " + str(self.lastLineNumberSent) + '\n'
		
		# Otherwise
		else :
		
			# Clear last response was wait
			self.lastResponseWasWait = False
		
		# Check if response is a temperature reading
		if response.startswith("T:") or " T:" in response :
		
			# Isolate temperature
			if response.startswith("T:") :
				response = response.split(' ', 2)[0] + '\n'
			
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
		
						except :
							heatbedTemperature = "0"
				
				# Append heatbed temperature to to response
				response = response.strip() + " B:" + heatbedTemperature + '\n'
		
		# Check if response was a processed or skipped value
		if (response.startswith("ok ") and response[3].isdigit()) or response.startswith("skip ") :
	
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
				
				# Check if response contains extra information
				responseSections = response.split(' ', 3)
				if len(responseSections) == 3 :
				
					# Set extra information
					extraInformation = ' ' + responseSections[2].strip()
				
				# Otherwise
				else :
				
					# Clear extra information
					extraInformation = ''
				
				# Set response to contain adjusted line number
				response = "ok " + str(lineNumber + self.numberWrapCounter * 0x10000) + extraInformation + '\n'
	
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
			
				# Check if a reset line number command was sent
				if self.resetLineNumberCommandSent :
				
					# Set line number
					lineNumber = 0
				
				# Otherwise
				else :
	
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
				response = "ok Printer has been inactive for too long, heater and motors have been turned off\n"
			elif response[6 : 10] == "1009" :
				response = "ok Target address out of range\n"
			elif response[6 : 10] == "1010" :
				response = "ok Command cannot run because micro motion chip encountered an error\n"
			elif response[6 : 10].isdigit() :
				response = "ok An error has occured\n"
			else :
				response = "ok " + response[6 :].strip()
			
			# Check if waiting for a command to be processed
			if self.lastLineNumberSent is not None and self.lastLineNumberSent % 0x10000 in self.sentCommands :
			
				# Remove stored command
				self.sentCommands.pop(self.lastLineNumberSent)
			
			# Send message
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = response[3 :].strip(), header = "Error Status", confirm = True))
		
		# Log received data
		self._m33fio_logger.debug("Processed Response: " + response)
		
		# Return response
		return response
	
	# Restore files
	def restoreFiles(self) :
	
		# Check if slicer was changed
		if self.slicerChanges is not None :
		
			# Move original files back
			os.remove(self.slicerChanges["Slicer Profile Location"])
			shutil.move(self.slicerChanges["Slicer Profile Temporary"], self.slicerChanges["Slicer Profile Location"])
			
			if "Model Temporary" in self.slicerChanges :
				os.remove(self.slicerChanges["Model Location"])
				shutil.move(self.slicerChanges["Model Temporary"], self.slicerChanges["Model Location"])
		
			# Restore printer profile
			self._printer_profile_manager.save(self.slicerChanges["Printer Profile Content"], True)
			
			# Clear slicer changes
			self.slicerChanges = None
	
	# Set file locations
	def setFileLocations(self) :
	
		# Check if not running in a virtual environment
		if not hasattr(sys, "real_prefix") :
		
			# Initialize variables
			enableSave = False
		
			# Check if Pip isn't set
			if (octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._pip_caller is None or not octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._pip_caller.available) and (octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._settings.get(["pip"]) is None or not len(octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._settings.get(["pip"]))) :
	
				# Set Pip locations
				pipLocations = []
				if platform.uname()[0].startswith("Windows") :
	
					pipLocations = [
						os.environ["SYSTEMDRIVE"] + "/python/Scripts/pip.exe"
					]
	
				elif platform.uname()[0].startswith("Darwin") :
	
					pipLocations = [
						"/Library/Frameworks/Python.framework/Versions/2.7/bin/pip"
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
							octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._settings.set(["pip"], location, True)
							enableSave = True
							break
			
			# Check if pip is set
			if (octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._pip_caller is not None and octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._pip_caller.available) or (octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._settings.get(["pip"]) is not None and len(octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._settings.get(["pip"]))) :
			
				# Set Pip parameter
				octoprint.plugin.plugin_manager().plugin_implementations["pluginmanager"]._settings.set(["pip_args"], "--user", True)
				enableSave = True
		
			# Check if checkout folder isn't set
			if octoprint.plugin.plugin_manager().plugin_implementations["softwareupdate"]._settings.get(["checks", "octoprint", "checkout_folder"]) is None or not len(octoprint.plugin.plugin_manager().plugin_implementations["softwareupdate"]._settings.get(["checks", "octoprint", "checkout_folder"])) :
	
				# Set checkout folder locations
				checkoutFolderLocations = []
				if platform.uname()[0].startswith("Windows") :
	
					checkoutFolderLocations = [
						os.environ["SYSTEMDRIVE"] + "/Users/" + os.environ["USERNAME"] + "/AppData/Roaming/OctoPrint/checkout"
					]
	
				elif platform.uname()[0].startswith("Darwin") :
	
					checkoutFolderLocations = [
						"/Users/" + os.environ["USER"] + "/Library/Application Support/OctoPrint/checkout"
					]
	
				elif platform.uname()[0].startswith("Linux") :
	
					checkoutFolderLocations = [
						"/home/" + os.environ["USER"] + "/.octoprint/checkout"
					]
			
				# Go through all checkout folder location
				for locations in checkoutFolderLocations :
					for location in glob.glob(locations) :
				
						# Check if location is a folder
						if os.path.isdir(location) :
						
							# Set checkout folder location and type
							octoprint.plugin.plugin_manager().plugin_implementations["softwareupdate"]._settings.set(["checks", "octoprint", "checkout_folder"], location, True)
							octoprint.plugin.plugin_manager().plugin_implementations["softwareupdate"]._settings.set(["checks", "octoprint", "type"], "github_release", True)
							enableSave = True
							break
		
			# Check if Cura is a registered slicer
			if "cura" in self._slicing_manager.registered_slicers :
	
				# Check if Cura is not configured
				if "cura" not in self._slicing_manager.configured_slicers :
			
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
								self._slicing_manager.get_slicer("cura", False)._settings.set(["cura_engine"], location, True)
								enableSave = True
								break
		
			# Check if Slic3r is a registered slicer
			if "slic3r" in self._slicing_manager.registered_slicers :
	
				# Check if Slic3r is not configured
				if "slic3r" not in self._slicing_manager.configured_slicers :
			
					# Set Slic3r locations
					slic3rLocations = []
					if platform.uname()[0].startswith("Windows") :
				
						slic3rLocations = [
							os.environ["SYSTEMDRIVE"] + "/Program Files*/Slic3r/slic3r-console.exe"
						]
				
					elif platform.uname()[0].startswith("Darwin") :
				
						slic3rLocations = [
							"/Applications/Slic3r.app/Contents/MacOS/slic3r"
						]
				
					elif platform.uname()[0].startswith("Linux") :
				
						slic3rLocations = [
							"/usr/bin/slic3r",
							"/opt/Slic3r/bin/slic3r"
						]
				
					# Go through all slic3r location
					for locations in slic3rLocations :
						for location in glob.glob(locations) :
			
							# Check if location is a file
							if os.path.isfile(location) :
					
								# Set slic3r location
								self._slicing_manager.get_slicer("slic3r", False)._settings.set(["slic3r_engine"], location, True)
								enableSave = True
								break
		
			# Check if saving
			if enableSave :
		
				# Save software settings
				octoprint.settings.settings().save()
		
		# Check if Cura is configured
		if "cura" in self._slicing_manager.configured_slicers :

			# Set Cura profile location and destination
			profileLocation = self._basefolder.replace('\\', '/') + "/static/profiles/Cura/"
			profileDestination = self._slicing_manager.get_slicer_profile_path("cura").replace('\\', '/') + '/'
			
			# Remove deprecated profiles
			for profile in glob.glob(profileDestination + "m3d_*.profile") :
				os.remove(profile)

			# Go through all Cura profiles
			for profile in os.listdir(profileLocation) :
	
				# Set profile version, identifier, and name
				profileIdentifier = profile[0 : profile.find('.')]
				profileName = self._slicing_manager.get_profile_path("cura", profileIdentifier)[len(profileDestination) :].lower()
				
				# Check if not using a Micro 3D printer
				if self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
				
					# Remove Cura profile
					if os.path.isfile(profileDestination + profileName) :
						os.remove(profileDestination + profileName)
				
				# Otherwise
				else :
	
					# Import Cura profile
					self.convertCuraToProfile(profileLocation + profile, profileDestination + profileName, profileName, profileIdentifier, "Imported by M33 Fio on " + time.strftime("%Y-%m-%d %H:%M"))
		
		# Check if Slic3r is configured
		if "slic3r" in self._slicing_manager.configured_slicers :

			# Set Slic3r profile location and destination
			profileLocation = self._basefolder.replace('\\', '/') + "/static/profiles/Slic3r/"
			profileDestination = self._slicing_manager.get_slicer_profile_path("slic3r").replace('\\', '/') + '/'
			
			# Remove deprecated profiles
			for profile in glob.glob(profileDestination + "m3d_*.profile") :
				os.remove(profile)

			# Go through all Slic3r profiles
			for profile in os.listdir(profileLocation) :
	
				# Set profile version, identifier, and name
				profileIdentifier = profile[0 : profile.find('.')]
				profileName = self._slicing_manager.get_profile_path("slic3r", profileIdentifier)[len(profileDestination) :].lower()
				
				# Check if not using a Micro 3D printer
				if self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
				
					# Remove Slic3r profile
					if os.path.isfile(profileDestination + profileName) :
						os.remove(profileDestination + profileName)
				
				# Otherwise
				else :
				
					# Import Slic3r profile
					self.convertSlic3rToProfile(profileLocation + profile, profileDestination + profileName, profileName, profileIdentifier, "Imported by M33 Fio on " + time.strftime("%Y-%m-%d %H:%M"))
		
		# Check if not using a Micro 3D printer
		if self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
		
			# Check if Micro 3D printer profile exists
			if self._printer_profile_manager.exists("micro_3d") :
			
				# Deselect the Micro 3D printer profile if it's selected
				if self._printer_profile_manager.get_current() is not None and self._printer_profile_manager.get_current()["id"] == "micro_3d" :
					self._printer_profile_manager.deselect()
				
				# Remove Micro 3D printer profile
				self._printer_profile_manager.remove("micro_3d")
		
		# Otherwise
		else :
		
			# Save printer profile
			self.savePrinterProfile()
	
	# Event monitor
	def on_event(self, event, payload) :
	
		# Check if an error occured
		if event == octoprint.events.Events.ERROR :
			
			# Close connection
			if self._printer._comm is not None :
			
				try :
					self._printer._comm.close(False, False)
				except :
					pass
			
			self._printer.disconnect()
	
		# Check if printer is disconnected
		elif event == octoprint.events.Events.DISCONNECTED :
		
			# Check if a Micro 3D is connected
			if not self.invalidPrinter :
		
				# Clear invalid printer
				self.invalidPrinter = True
				
				# Clear EEPROM
				self.eeprom = None
				
				# Clear current firmware type
				self.currentFirmwareType = None
			
				# Clear original write and read
				self.originalWrite = None
				self.originalRead = None
			
				# Send printer status
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Micro 3D Not Connected"))
			
			# Check if using a Micro 3D printer
			if not self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
				
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
		
		# Otherwise check if client connects
		elif event == octoprint.events.Events.CLIENT_OPENED :
		
			# Send OctoPrint process details
			self.sendOctoPrintProcessDetails()
		
			# Send provided firmware versions
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Provided Firmwares", firmwares = self.providedFirmwares))
			
			# Check if shared library is usable
			if self.sharedLibraryIsUsable :
		
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
				firmwareType, firmwareVersion, firmwareRelease = self.getFirmwareDetails()
				
				# Send firmware details
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Current Firmware", type = firmwareType, release = firmwareRelease))
				
				# Send printer details
				self.sendPrinterDetails()
			
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
					
			except :
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Camera Not Hostable"))
			
			# Set file locations
			self.setFileLocations()
			
			# Send message for enabling/disabling GPIO settings
			if platform.uname()[0].startswith("Linux") :
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Enable GPIO Settings"))
			else :
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Disable GPIO Settings"))
			
			# Send message for enabling/disabling GPIO buttons
			if self._settings.get_boolean(["UseGpio"]) and self._settings.get_int(["GpioPin"]) is not None and self._settings.get_int(["GpioLayer"]) is not None :
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Enable GPIO Buttons"))
			else :
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Disable GPIO Buttons"))
			
			# Check if sending slicer reminder and Cura or Slic3r are registered slicers
			if self.slicerReminder and not self._settings.get_boolean(["SlicerNeverRemind"]) and ("cura" in self._slicing_manager.registered_slicers or "slic3r" in self._slicing_manager.registered_slicers) :
			
				# Check if Cura and Slic3r are not configured
				if "cura" not in self._slicing_manager.configured_slicers and "slic3r" not in self._slicing_manager.configured_slicers :
		
					# Send message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Reminder", type = "Slicer", cura = "cura" in self._slicing_manager.registered_slicers and "cura" not in self._slicing_manager.configured_slicers, slic3r = "slic3r" in self._slicing_manager.registered_slicers and "slic3r" not in self._slicing_manager.configured_slicers))
			
			# Check if sending sleep reminder
			if not self._printer.is_printing() and not self._printer.is_paused() and self.sleepReminder and not self._settings.get_boolean(["SleepNeverRemind"]) :
			
				# Check if disabling sleep doesn't works
				if not self.disableSleep() :
				
					# Send message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Reminder", type = "Sleep"))
				
				# Enable sleep
				self.enableSleep()
			
			# Check if showing mid-print filament change
			if self.showMidPrintFilamentChange :
		
				# Send message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Mid-Print Filament Change"))
		
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
			
			# Check if using a Micro 3D printer
			if not self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
		
				# Reset pre-processor settings
				self.resetPreprocessorSettings()
			
				# Check if printing test border
				if payload["filename"] == os.path.basename(self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "test border.gcode").replace('\\', '/')) :
	
					# Set printing test border
					self.printingTestBorder = True
	
				# Otherwise check if printing backlash calibration
				elif payload["filename"] == os.path.basename(self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "QuickBacklash_X_0.0-0.99.gcode").replace('\\', '/')) or payload["filename"] == os.path.basename(self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "QuickBacklash_X_0.70-1.69.gcode").replace('\\', '/')) or payload["filename"] == os.path.basename(self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "QuickBacklash_Y_0.0-0.99.gcode").replace('\\', '/')) or payload["filename"] == os.path.basename(self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "QuickBacklash_Y_0.70-1.69.gcode").replace('\\', '/')) :
				
					# Set printing backlash calibration
					self.printingBacklashCalibration = True
		
				# Display message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Collecting print information", header = "Printing Status"))
	
				# Check if shared library was loaded
				if self.loadSharedLibrary() :
	
					# Set shared library settings
					self.setSharedLibrarySettings()
				
					# Collect print information
					printIsValid = self.sharedLibrary.collectPrintInformation(ctypes.c_char_p(payload["file"]), ctypes.c_bool(self._settings.get_boolean(["PreprocessOnTheFly"])))
				
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
					
					# Check if not pre-processing on the fly
					if not self._settings.get_boolean(["PreprocessOnTheFly"]) :
					
						# Unload shared library
						self.unloadSharedLibrary()

				# Otherwise
				else :
	
					# Collect print information
					printIsValid = self.collectPrintInformation(payload["file"], self._settings.get_boolean(["PreprocessOnTheFly"]))
			
				# Check if pre-processing on the fly
				if self._settings.get_boolean(["PreprocessOnTheFly"]) :

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
							self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "notice", title = "Print warning", text = "This file uses mid-print filament change commands"))
				
						# Check if objected couldn't be centered
						if self._settings.get_boolean(["UseCenterModelPreprocessor"]) and not self.objectSuccessfullyCentered :
		
							# Create message
							self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "notice", title = "Print warning", text = "Object too large to center on print bed"))
				
				# Set ready to print
				self.readyToPrint = True
			
				# Hide message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Hide Message"))
		
		# Otherwise check if a print is done
		elif event == octoprint.events.Events.PRINT_DONE :
		
			# Check if using a Micro 3D printer
			if not self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
			
				# Wait until all sent commands have been processed
				while len(self.sentCommands) :
			
					# Update communication timeout to prevent other commands from being sent
					if self._printer._comm is not None :
						self._printer._comm._long_running_command = True
						self._printer._comm._gcode_G4_sent("G4 P10")
	
					time.sleep(0.01)

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
				
				# Set perform finish print movement
				self.performFinishPrintMovement = True
				
				# Set commands
				commands = [
					"M114",
					"G4"
				]
				
				# Set long running command
				if self._printer._comm is not None :
					self._printer._comm._long_running_command = True
	
				# Send commands with line numbers
				self.sendCommandsWithLineNumbers(commands)
			
			# Otherwise
			else :
			
				# Unload shared library
				self.unloadSharedLibrary()
			
				# Enable sleep
				self.enableSleep()
		
		# Otherwise check if a print failed
		elif event == octoprint.events.Events.PRINT_FAILED :
		
			# Unload shared library
			self.unloadSharedLibrary()
		
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
		except :
			return False
	
		# Return true
		return True
	
	# Get listen port
	def getListenPort(self, process) :
	
		# Attempt to get process's connections
		try :
			connections = process.connections()
		
		# Return none if process doesn't exist
		except :
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
	
	# Send printer details
	def sendPrinterDetails(self) :
	
		# Send printer details
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Printer Details", serialNumber = self.eepromGetString("serialNumber"), serialPort = self._printer.get_transport().port))
	
	# Float to int
	def floatToInt(self, value) :
	
		# Return int representation of float value
		packed = struct.pack('f', value)
		return ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
	
	# Int to float
	def intToFloat(self, value) :
		
		# Return float representation of int value
		data = [int(ord(chr(value & 0xFF))), int(ord(chr((value >> 8) & 0xFF))), int(ord(chr((value >> 16) & 0xFF))), int(ord(chr((value >> 24) & 0xFF)))]
		bytes = struct.pack("4B", *data)
		return round(struct.unpack('f', bytes)[0], 6)
	
	# EEPROM set int
	def eepromSetInt(self, connection, eepromName, value, length = 0) :
	
		# Set error
		error = False
		
		# Set length if not provided
		if length == 0 :
			length = self.eepromOffsets[eepromName]["bytes"]

		# Go through bytes of EEPROM value
		index = 0
		while index < length :

			# Check if saving EEPROM value failed
			if not error and not self.writeToEeprom(connection, self.eepromOffsets[eepromName]["offset"] + index, chr((value >> 8 * index) & 0xFF)) :

				# Set error
				error = True

			# Increment index
			index += 1
		
		# Return error
		return error
	
	# EEPROM set float
	def eepromSetFloat(self, connection, eepromName, value) :
	
		# Return if saving EEPROM value was successful
		return self.eepromSetInt(connection, eepromName, self.floatToInt(value))
	
	# EEPROM get int
	def eepromGetInt(self, eepromName) :
	
		# Initialize value
		value = 0
		
		# Get int from EEPROM
		index = self.eepromOffsets[eepromName]["bytes"] - 1
		while index >= 0 :
			value <<= 8
			value += int(ord(self.eeprom[self.eepromOffsets[eepromName]["offset"] + index]))
			index -= 1
		
		# Return value
		return value
	
	# EEPROM get float
	def eepromGetFloat(self, eepromName) :
	
		# Get float from EEPROM
		return self.intToFloat(self.eepromGetInt(eepromName))
	
	# EEPROM get string
	def eepromGetString(self, eepromName) :
	
		# Get string from EEPROM
		return self.eeprom[self.eepromOffsets[eepromName]["offset"] : self.eepromOffsets[eepromName]["offset"] + self.eepromOffsets[eepromName]["bytes"] - 1]
	
	# EEPROM keep int within range
	def eepromKeepIntWithinRange(self, connection, eepromName, minValue, maxValue, defaultValue) :
	
		# Set error
		error = False
		
		# Get EEROM value in an unsigned integer format
		intValue = self.eepromGetInt(eepromName)

		# Check if EEPROM value is invalid
		if not isinstance(intValue, int) or intValue < minValue or intValue > maxValue :
		
			# Set error to if setting default value in EEPROM failed
			error = self.eepromSetInt(connection, eepromName, defaultValue)
		
		# Return error
		return error
	
	# EEPROM keep float within range
	def eepromKeepFloatWithinRange(self, connection, eepromName, minValue, maxValue, defaultValue) :
	
		# Set error
		error = False
		
		# Get EEROM value in single-precision floating-point format 
		floatValue = self.eepromGetFloat(eepromName)

		# Check if EEPROM value is invalid
		if not isinstance(floatValue, float) or math.isnan(floatValue) or round(floatValue, 6) < minValue or round(floatValue, 6) > maxValue :
		
			# Set error to if setting default value in EEPROM failed
			error = self.eepromSetFloat(connection, eepromName, defaultValue)
		
		# Return error
		return error
	
	# Receive data to log
	def on_printer_add_log(self, data) :
	
		# Check if connection was just established
		if data.startswith("Send: ") and "M110" in data and (self._printer.get_state_string() == "Connecting" or self._printer.get_state_string() == "Detecting baudrate") and not self.initializingPrinterConnection :
		
			# Set initializing printer connection
			self.initializingPrinterConnection = True
			
			# Clear error
			error = False
			
			# Clear invalid printer
			self.invalidPrinter = True
			
			# Clear EEPROM
			self.eeprom = None
		
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
				except :
					pass
			
			self._printer.disconnect()
			
			# Check if printer wasn't found
			if currentPort is None :
				
				# Send message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "No Micro 3D printer detected. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
			
			# Otherwise
			else :
			
				# Attempt to connect to the printer
				try :
					connection = serial.Serial(currentPort, currentBaudrate)
				
				# Check if an error occured
				except :
				
					# Set connection to none
					connection = None
			
					# Set error
					error = True
					
					# Send message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
				
				# Check if no errors occured
				if not error :
				
					# Otherwise check if using OS X or Linux and the user lacks read/write access to the printer
					if (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
					
						# Set error
						error = True
						
						# Send message
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "You don't have read/write access to " + str(port), header = "Connection Status", confirm = True))
					
					# Check if no errors occured
					if not error :
				
						# Attempt to get current printer mode
						try :
					
							connection.write("M110")
							bootloaderVersion = connection.read()
				
							if int(serial.VERSION.split('.', 1)[0]) < 3 :
								bootloaderVersion += connection.read(connection.inWaiting())
							else :
								bootloaderVersion += connection.read(connection.in_waiting)
			
						# Check if an error occured
						except :
			
							# Set error
							error = True
					
							# Send message
							self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
			
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
								except :	
									pass
					
								time.sleep(1)
					
								# Close connection
								connection.close()
								connection = None
					
								# Set updated port
								currentPort = self.getPort()
					
								# Check if printer wasn't found
								if currentPort is None :
						
									# Set error
									error = True
							
									# Send message
									self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
					
								# Otherwise
								else :
				
									# Re-connect; wait for the device to be available
									for i in xrange(5) :
										try :
											connection = serial.Serial(currentPort, currentBaudrate)
											break
						
										except :
											connection = None
											time.sleep(1)
								
									# Check if connecting to printer failed
									if connection is None :
							
										# Set error
										error = True
								
										# Send message
										self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
								
									# Otherwise check if using OS X or Linux and the user lacks read/write access to the printer
									elif (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
	
										# Set error
										error = True
								
										# Send message
										self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "You don't have read/write access to " + str(port), header = "Connection Status", confirm = True))
			
							# Check if an error hasn't occured
							if not error :
								
								# Attempt to get current printer mode
								try :
					
									connection.write("M110")
									bootloaderVersion = connection.read()
				
									if int(serial.VERSION.split('.', 1)[0]) < 3 :
										bootloaderVersion += connection.read(connection.inWaiting())
									else :
										bootloaderVersion += connection.read(connection.in_waiting)
									
									# Check if not in bootloader mode
									if not bootloaderVersion.startswith('B') :
									
										# Set error
										error = True
										
										# Send message
										self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
			
								# Check if an error occured
								except :
			
									# Set error
									error = True
					
									# Send message
									self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
								
								# Check if an error hasn't occured
								if not error :
								
									# Check if getting EEPROM was successful
									if self.getEeprom(connection) :
					
										# Get firmware CRC from EEPROM
										eepromCrc = self.eepromGetInt("firmwareCrc")
				
										# Request firmware CRC from chip
										connection.write('C')
										connection.write('A')

										# Get response
										response = connection.read(4)

										# Get chip CRC
										chipCrc = 0
										index = 3
										while index >= 0 :
											chipCrc <<= 8
											chipCrc += int(ord(response[index]))
											index -= 1
					
										# Get firmware details
										firmwareType, firmwareVersion, firmwareRelease = self.getFirmwareDetails()
					
										# Get serial number from EEPROM
										serialNumber = self.eepromGetString("serialNumber")
				
										# Set printer color
										color = serialNumber[0 : 2]
										if color == "BK" :
											self.printerColor = "Black"
										elif color == "WH" :
											self.printerColor = "White"
										elif color == "BL" :
											self.printerColor = "Blue"
										elif color == "GR" :
											self.printerColor = "Green"
										elif color == "OR" :
											self.printerColor = "Orange"
										elif color == "CL" :
											self.printerColor = "Clear"
										elif color == "SL" :
											self.printerColor = "Silver"
										elif color == "PL" :
											self.printerColor = "Purple"
				
										# Get fan type from EEPROM
										fanType = self.eepromGetInt("fanType")
				
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
												self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Setting fan failed", header = "Error Status", confirm = True))
				
										# Otherwise
										else :
				
											# Set fan name
											fanName = None
											if fanType == 1 :
												fanName = "HengLiXin"
											elif fanType == 2 :
												fanName = "Listener"
											elif fanType == 3 :
												fanName = "Shenzhew"
											elif fanType == 4 :
												fanName = "Xinyujie"
					
											# Check if updating fan failed
											if fanName is not None and not self.setFan(connection, fanName) :
					
												# Set error
												error = True
					
												# Display error
												self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Updating fan settings failed", header = "Error Status", confirm = True))
				
										# Check if printer uses 500mA extruder current
										shortSerialNumber = serialNumber[0 : 13]
										if not error and (shortSerialNumber == "BK15033001100" or shortSerialNumber == "BK15040201050" or shortSerialNumber == "BK15040301050" or shortSerialNumber == "BK15040602050" or shortSerialNumber == "BK15040801050" or shortSerialNumber == "BK15040802100" or shortSerialNumber == "GR15032702100" or shortSerialNumber == "GR15033101100" or shortSerialNumber == "GR15040601100" or shortSerialNumber == "GR15040701100" or shortSerialNumber == "OR15032701100" or shortSerialNumber == "SL15032601050") :
				
											# Check if setting extruder current failed
											if not self.setExtruderCurrent(connection, 500) :
					
												# Set error
												error = True
					
												# Display error
												self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Updating extruder current failed", header = "Error Status", confirm = True))
				
										# Check if using M3D or M3D Mod firmware and it's from before new bed orientation and adjustable backlash speed
										if not error and ((firmwareType == "M3D" and firmwareVersion < 2015080402) or (firmwareType == "M3D Mod" and firmwareVersion < 2115080402)) :
							
											# Set error to if zeroing out all bed offets in EEPROM failed
											error = self.eepromSetInt(connection, "bedOffsetBackLeft", 0, self.eepromOffsets["bedHeightOffset"]["offset"] + self.eepromOffsets["bedHeightOffset"]["bytes"] - self.eepromOffsets["bedOffsetBackLeft"]["offset"])
					
											# Check if an error hasn't occured
											if not error :
								
												# Set error to if setting default backlash speed failed
												error = self.eepromSetFloat(connection, "backlashSpeed", 1500)
						
											# Check if an error has occured
											if error :
					
												# Display error
												self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Updating version changes failed", header = "Error Status", confirm = True))
							
										# Check if an error hasn't occured
										if not error :
							
											# Set error to if limiting backlash X failed
											error = self.eepromKeepFloatWithinRange(connection, "backlashX", 0, 2, self.get_settings_defaults()["BacklashX"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting backlash Y failed
												error = self.eepromKeepFloatWithinRange(connection, "backlashY", 0, 2, self.get_settings_defaults()["BacklashY"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting backlash speed failed
												error = self.eepromKeepFloatWithinRange(connection, "backlashSpeed", 1, 5000, self.get_settings_defaults()["BacklashSpeed"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting back left orientation failed
												error = self.eepromKeepFloatWithinRange(connection, "bedOrientationBackLeft", -3, 3, self.get_settings_defaults()["BackLeftOrientation"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting back right orientation failed
												error = self.eepromKeepFloatWithinRange(connection, "bedOrientationBackRight", -3, 3, self.get_settings_defaults()["BackRightOrientation"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting front right orientation failed
												error = self.eepromKeepFloatWithinRange(connection, "bedOrientationFrontRight", -3, 3, self.get_settings_defaults()["FrontRightOrientation"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting front left orientation failed
												error = self.eepromKeepFloatWithinRange(connection, "bedOrientationFrontLeft", -3, 3, self.get_settings_defaults()["FrontLeftOrientation"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting back left offset failed
												error = self.eepromKeepFloatWithinRange(connection, "bedOffsetBackLeft", -sys.float_info.max, sys.float_info.max, self.get_settings_defaults()["BackLeftOffset"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting back right offset failed
												error = self.eepromKeepFloatWithinRange(connection, "bedOffsetBackRight", -sys.float_info.max, sys.float_info.max, self.get_settings_defaults()["BackRightOffset"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting front right offset failed
												error = self.eepromKeepFloatWithinRange(connection, "bedOffsetFrontRight", -sys.float_info.max, sys.float_info.max, self.get_settings_defaults()["FrontRightOffset"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting front left offset failed
												error = self.eepromKeepFloatWithinRange(connection, "bedOffsetFrontLeft", -sys.float_info.max, sys.float_info.max, self.get_settings_defaults()["FrontLeftOffset"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting bed height offset failed
												error = self.eepromKeepFloatWithinRange(connection, "bedHeightOffset", -sys.float_info.max, sys.float_info.max, self.get_settings_defaults()["BedHeightOffset"])
								
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting speed limit X failed
												error = self.eepromKeepFloatWithinRange(connection, "speedLimitX", 120, 4800, self.get_settings_defaults()["SpeedLimitX"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting speed limit Y failed
												error = self.eepromKeepFloatWithinRange(connection, "speedLimitY", 120, 4800, self.get_settings_defaults()["SpeedLimitY"])
				
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting speed limit Z failed
												error = self.eepromKeepFloatWithinRange(connection, "speedLimitZ", 30, 60, self.get_settings_defaults()["SpeedLimitZ"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting speed limit E positive failed
												error = self.eepromKeepFloatWithinRange(connection, "speedLimitEPositive", 60, 600, self.get_settings_defaults()["SpeedLimitEPositive"])
							
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting speed limit E negative failed
												error = self.eepromKeepFloatWithinRange(connection, "speedLimitENegative", 60, 720, self.get_settings_defaults()["SpeedLimitENegative"])
								
											# Check if not using M3D or M3D Mod firmware
											if firmwareType != "M3D" and firmwareType != "M3D Mod" :
								
												# Check if an error hasn't occured
												if not error :
							
													# Set error to if limiting last recorded X value failed
													error = self.eepromKeepFloatWithinRange(connection, "lastRecordedXValue", -sys.float_info.max, sys.float_info.max, 54)
							
												# Check if an error hasn't occured
												if not error :
							
													# Set error to if limiting last recorded Y value failed
													error = self.eepromKeepFloatWithinRange(connection, "lastRecordedYValue", -sys.float_info.max, sys.float_info.max, 50)
									
												# Check if an error hasn't occured
												if not error :
							
													# Set error to if limiting X motor steps/mm failed
													error = self.eepromKeepFloatWithinRange(connection, "xMotorStepsPerMm", sys.float_info.min, sys.float_info.max, self.get_settings_defaults()["XMotorStepsPerMm"])
									
												# Check if an error hasn't occured
												if not error :
							
													# Set error to if limiting Y motor steps/mm failed
													error = self.eepromKeepFloatWithinRange(connection, "yMotorStepsPerMm", sys.float_info.min, sys.float_info.max, self.get_settings_defaults()["YMotorStepsPerMm"])
									
												# Check if an error hasn't occured
												if not error :
							
													# Set error to if limiting Z motor steps/mm failed
													error = self.eepromKeepFloatWithinRange(connection, "zMotorStepsPerMm", sys.float_info.min, sys.float_info.max, self.get_settings_defaults()["ZMotorStepsPerMm"])
									
												# Check if an error hasn't occured
												if not error :
							
													# Set error to if limiting E motor steps/mm failed
													error = self.eepromKeepFloatWithinRange(connection, "eMotorStepsPerMm", sys.float_info.min, sys.float_info.max, self.get_settings_defaults()["EMotorStepsPerMm"])
											
												# Check if an error hasn't occured
												if not error :
							
													# Set error to if limiting X jerk sensitivity failed
													error = self.eepromKeepIntWithinRange(connection, "xJerkSensitivity", 1, 255, self.get_settings_defaults()["XJerkSensitivity"])
											
												# Check if an error hasn't occured
												if not error :
							
													# Set error to if limiting Y jerk sensitivity failed
													error = self.eepromKeepIntWithinRange(connection, "yJerkSensitivity", 1, 255, self.get_settings_defaults()["YJerkSensitivity"])
											
												# Check if an error hasn't occured
												if not error :
							
													# Set error to if limiting calibrate Z0 correction failed
													error = self.eepromKeepFloatWithinRange(connection, "calibrateZ0Correction", -sys.float_info.max, sys.float_info.max, self.get_settings_defaults()["CalibrateZ0Correction"])
										
											# Check if an error hasn't occured
											if not error :
							
												# Set error to if limiting last recorded Z value failed
												error = self.eepromKeepFloatWithinRange(connection, "lastRecordedZValue", -sys.float_info.max, sys.float_info.max, 5)
								
											# Check if an error has occured
											if error :
					
												# Display error
												self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Updating EEPROM values failed", header = "Error Status", confirm = True))
								
										# Check if firmware is corrupt
										if not error and eepromCrc != chipCrc :
					
											# Set current firmware type
											if firmwareType is None :
												currentFirmwareType = "iMe"
											else :
												currentFirmwareType = firmwareType
				
											# Display message
											self.messageResponse = None
											self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Question", message = "Firmware is corrupt. Update to " + currentFirmwareType + " firmware version " + self.providedFirmwares[self.getNewestFirmwareName(currentFirmwareType)]["Release"] + '?', header = "Firmware Status", response = True))
					
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
												self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Updating firmware", header = "Firmware Status"))
					
												# Check if updating firmware failed
												if not self.updateToProvidedFirmware(connection, self.getNewestFirmwareName(currentFirmwareType)) :
					
													# Set error
													error = True
										
													# Send message
													self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Updating firmware failed", header = "Firmware Status", confirm = True))
						
												# Otherwise
												else :
					
													# Send message
													self.messageResponse = None
													self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Question", message = "Updating firmware was successful", header = "Firmware Status", confirm = True))
					
													# Wait until response is obtained
													while self.messageResponse is None :
														time.sleep(0.01)
					
										# Otherwise check if firmware is outdated or incompatible
										elif not error and (firmwareType is None or firmwareVersion < int(self.providedFirmwares[self.getNewestFirmwareName(firmwareType)]["Version"])) :
				
											# Set if firmware is incompatible
											if firmwareType is None :
												incompatible = True
												firmwareType = "iMe"
											elif firmwareType == "M3D" :
												incompatible = firmwareVersion < 2015122112
											elif firmwareType == "M3D Mod" :
												incompatible = firmwareVersion < 2115122112
											elif firmwareType == "iMe" :
												incompatible = firmwareVersion < 1900000123
								
											# Check if printer is incompatible or not reconnecting to printer
											if incompatible or not self.reconnectingToPrinter :
						
												# Display message
												self.messageResponse = None
												if incompatible :
													self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Question", message = "Firmware is incompatible. Update to " + firmwareType + " firmware version " + self.providedFirmwares[self.getNewestFirmwareName(firmwareType)]["Release"] + '?', header = "Firmware Status", response = True))
												else :
													self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Question", message = "Newer firmware available. Update to " + firmwareType + " firmware version " + self.providedFirmwares[self.getNewestFirmwareName(firmwareType)]["Release"] + '?', header = "Firmware Status", response = True))
					
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
													self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Updating firmware", header = "Firmware Status"))
							
													# Check if updating firmware failed
													if not self.updateToProvidedFirmware(connection, self.getNewestFirmwareName(firmwareType)) :
					
														# Set error
														error = True
										
														# Send message
														self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Updating firmware failed", header = "Firmware Status", confirm = True))
						
													# Otherwise
													else :
					
														# Send message
														self.messageResponse = None
														self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Question", message = "Updating firmware was successful", header = "Firmware Status", confirm = True))
					
														# Wait until response is obtained
														while self.messageResponse is None :
															time.sleep(0.01)
				
										# Check if no errors occured and getting EEPROM failed
										if not error and not self.getEeprom(connection, True) :
							
											# Set error
											error = True
						
											# Send message
											self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
			
									# Otherwise
									else :
			
										# Set error
										error = True
						
										# Send message
										self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
			
				# Check if connected to the printer
				if connection is not None :
				
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
						except :
							pass
				
					self._printer.disconnect()
			
				# Otherwise
				else :

					# Attempt to connect to the printer
					try :
						connection = serial.Serial(currentPort, currentBaudrate)
					
					# Otherwise
					except :
						
						# Set error
						error = True
						
						# Clear EEPROM
						self.eeprom = None
						
						# Send message
						self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
					
					# Check if an error hasn't occured
					if not error :
					
						# Check if using OS X or Linux and the user lacks read/write access to the printer
						if (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
						
							# Set error
							error = True
							
							# Clear EEPROM
							self.eeprom = None
							
							# Close connection
							connection.close()
							
							# Send message
							self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "You don't have read/write access to " + str(port), header = "Connection Status", confirm = True))
						
						# Check if an error hasn't occured
						if not error :
						
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
					
								# Clear EEPROM
								self.eeprom = None

								# Send message
								self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
				
							# Otherwise
							else :
	
								# Re-connect to printer
								self._printer.connect(currentPort, currentBaudrate, currentProfile)
				
								# Wait until connection is established
								while not isinstance(self._printer.get_transport(), serial.Serial) :
									if self._printer.is_closed_or_error() :
										break
									time.sleep(0.01)
								
								# Check if failed to connect to the printer
								if self._printer.is_closed_or_error() :
								
									# Clear EEPROM
									self.eeprom = None
				
									# Close connection
									if self._printer._comm is not None :
	
										try :
											self._printer._comm.close(False, False)
										except :
											pass
	
									self._printer.disconnect()
								
								# Otherwise
								else :
								
									# Check if using OS X or Linux and the user lacks read/write access to the printer
									if (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(currentPort, os.R_OK | os.W_OK) :
									
										# Clear EEPROM
										self.eeprom = None
				
										# Close connection
										if self._printer._comm is not None :
	
											try :
												self._printer._comm.close(False, False)
											except :
												pass
	
										self._printer.disconnect()
					
										# Send message
										self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "You don't have read/write access to " + str(port), header = "Connection Status", confirm = True))
								
									# Otherwise
									else :
									
										# Remove serial timeout
										self._printer.get_transport().timeout = None
										if int(serial.VERSION.split('.', 1)[0]) < 3 :
											self._printer.get_transport().writeTimeout = None
										else :
											self._printer.get_transport().write_timeout = None
						
										# Check if communication layer has been established
										if self._printer._comm is not None :
						
											# Set current firmware type
											self.currentFirmwareType = self.getFirmwareDetails()[0]
							
											# Save original write and read functions
											self.originalWrite = self._printer.get_transport().write
											self.originalRead = self._printer.get_transport().readline
	
											# Overwrite write functions to process write function
											self._printer.get_transport().write = self.processWrite
							
											# Delay
											time.sleep(1)
							
											# Clear invalid printer
											self.invalidPrinter = False
							
											try :
							
												# Request printer information
												self._printer.get_transport().write("M115")
								
												# Overwrite read functions to process read function
												self._printer.get_transport().readline = self.processRead
								
												# Send printer details
												self.sendPrinterDetails()
								
												# Set printer state to operational
												self._printer._comm._changeState(self._printer._comm.STATE_OPERATIONAL)
								
												# Send message
												self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Connected To Printer"))
									
											except :
											
												# Clear EEPROM
												self.eeprom = None
				
												# Close connection
												if self._printer._comm is not None :
				
													try :
														self._printer._comm.close(False, False)
													except :
														pass
				
												self._printer.disconnect()
								
												# Send message
												self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
					
										# Otherwise
										else :
						
											# Clear EEPROM
											self.eeprom = None
					
											# Close connection
											if self._printer._comm is not None :
		
												try :
													self._printer._comm.close(False, False)
												except :
													pass
		
											self._printer.disconnect()
							
											# Send message
											self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
			
			# Clear reconnecting to printer
			self.reconnectingToPrinter = False
			
			# Clear initializing printer connection
			self.initializingPrinterConnection = False
			
			# Enable printer connect button
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Allow Connecting"))
		
		# Otherwise check if data contains printer information
		elif "MACHINE_TYPE:" in data :
			
			# Check if printer isn't a Micro 3D
			if "MACHINE_TYPE:The_Micro" not in data and "MACHINE_TYPE:Micro_3D" not in data :
				
				# Set write and read functions back to original
				if self.originalWrite is not None and isinstance(self._printer.get_transport(), serial.Serial) :
					self._printer.get_transport().write = self.originalWrite
					self._printer.get_transport().readline = self.originalRead
				
				# Set invalid printer
				self.invalidPrinter = True
			
			# Otherwise
			else :
			
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
					"M619 S" + str(self.eepromOffsets["speedLimitENegative"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitENegative"]["bytes"])
				]
				
				# Check if not using M3D or M3D Mod firmware
				if self.currentFirmwareType != "M3D" and self.currentFirmwareType != "M3D Mod" :
				
					# Request motor's steps/mm and homing sensitivity
					commands += [
						"M619 S" + str(self.eepromOffsets["xMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["xMotorStepsPerMm"]["bytes"]),
						"M619 S" + str(self.eepromOffsets["yMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["yMotorStepsPerMm"]["bytes"]),
						"M619 S" + str(self.eepromOffsets["zMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["zMotorStepsPerMm"]["bytes"]),
						"M619 S" + str(self.eepromOffsets["eMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["eMotorStepsPerMm"]["bytes"]),
						"M619 S" + str(self.eepromOffsets["xJerkSensitivity"]["offset"]) + " T" + str(self.eepromOffsets["xJerkSensitivity"]["bytes"]),
						"M619 S" + str(self.eepromOffsets["yJerkSensitivity"]["offset"]) + " T" + str(self.eepromOffsets["yJerkSensitivity"]["bytes"]),
						"M619 S" + str(self.eepromOffsets["calibrateZ0Correction"]["offset"]) + " T" + str(self.eepromOffsets["calibrateZ0Correction"]["bytes"])
					]
				
				# Lower LED brightness for clear color printers
				if self.printerColor == "Clear" :
					commands += ["M420 T20"]
				else :
					commands += ["M420 T100"]
				
				# Request bed orientation version
				commands += ["M619 S" + str(self.eepromOffsets["bedOrientationVersion"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationVersion"]["bytes"])]
				
				# Send commands
				self.sendCommandsWithLineNumbers(commands)
		
		# Otherwise check if data contains valid Z information
		elif "ZV:" in data :
		
			# Check if X is invalid
			if "XV:" in data :
			
				# Set invalid bed plane
				self.invalidBedPlane = data[data.find("XV:") + 3] == '0'
			
			# Otherwise
			else :
			
				# Clear invalid bed plane
				self.invalidBedPlane = False
			
			# Check if bed plane is valid
			if not self.invalidBedPlane :
			
				# Check if Y is invalid
				if "YV:" in data :
			
					# Set invalid bed plane
					self.invalidBedPlane = data[data.find("YV:") + 3] == '0'
			
				# Otherwise
				else :
			
					# Clear invalid bed plane
					self.invalidBedPlane = False
		
			# Set invalid bed center
			self.invalidBedCenter = data[data.find("ZV:") + 3] == '0'
		
		# Otherwise check if data contains current Z
		elif "Z:" in data :
		
			# Set location X
			if "X:" in data :
				start = data.find("X:") + 2
				if data[start :].find(' ') == -1 :
					locationX = data[start :]
				else :
					locationX = data[start : data[start :].find(' ') + start]
			else :
				locationX = None
			
			# Set location Y
			if "Y:" in data :
				start = data.find("Y:") + 2
				if data[start :].find(' ') == -1 :
					locationY = data[start :]
				else :
					locationY = data[start : data[start :].find(' ') + start]
			else :
				locationY = None
				
			# Set location E
			if "E:" in data :
				start = data.find("E:") + 2
				if data[start :].find(' ') == -1 :
					locationE = data[start :]
				else :
					locationE = data[start : data[start :].find(' ') + start]
			else :
				locationE = None
			
			# Set location Z
			start = data.find("Z:") + 2
			if data[start :].find(' ') == -1 :
				locationZ = data[start :]
			else :
				locationZ = data[start : data[start :].find(' ') + start]
			
			# Check if performing finish print movement
			if self.performFinishPrintMovement :
			
				# Clear perform finish print movement
				self.performFinishPrintMovement = False
				
				# Check if pre-processing on the fly
				if self._settings.get_boolean(["PreprocessOnTheFly"]) :
				
					# Check if shared library was loaded
					if self.sharedLibrary :
				
						# Pre-process command
						commands = self.sharedLibrary.preprocess(ctypes.c_char_p("G4"), ctypes.c_char_p(None), ctypes.c_bool(True)).split(',')
				
					# Otherwise
					else :
				
						# Pre-process command
						commands = self.preprocess("G4", None, True)
				
				# Otherwise
				else :
				
					# Set commands to nothing
					commands = []
					
				# Append print done to command list
				commands += ["M65541;print done"]
			
				# Send commands with line numbers
				self.sendCommandsWithLineNumbers(commands)
			
			# Otherwise check if performing cancel print movement
			elif self.performCancelPrintMovement :
			
				# Clear perform cancel print movement
				self.performCancelPrintMovement = False
			
				# Set move Z
				moveZ = float(locationZ) + 10
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
			
				# Set commands
				commands = [
					"M104 S0",
					"G90",
					"G0 Y%f Z%f F1800" % (moveY, moveZ)
				]

				if self.heatbedConnected :
					commands += ["M140 S0"]
			
				if self._settings.get_boolean(["UseGpio"]) :
					commands += ["M107 T1"]

				commands += ["M18"]
				commands += ["M107"]
				
				if self._settings.get_boolean(["ChangeLedBrightness"]) :
					if self.printerColor == "Clear" :
						commands += ["M420 T20"]
					else :
						commands += ["M420 T100"]
				
				commands += ["G4"]
				commands += ["M65539;hide message"]
				
				# Append print done to command list
				commands += ["M65541;print done"]
			
				# Send commands with line numbers
				self.sendCommandsWithLineNumbers(commands)
			
			# Otherwise check if starting a mid-print filament change
			elif self.startingMidPrintFilamentChange :
			
				# Clear starting mid-print filament change
				self.startingMidPrintFilamentChange = False
				
				# Check if X, Y, and E locations weren't specified
				if locationX is None and locationY is None and locationE is None :
				
					# Set default values
					locationX = 54
					locationY = 50
					locationE = 0
				
				# Save values
				self.savedX = float(locationX)
				self.savedY = float(locationY)
				self.savedZ = float(locationZ)
				self.savedE = float(locationE)
				
				# Set move Z
				moveZ = self.savedZ + 3
				if moveZ < 15 :
					moveZ = 15
				
				if self.savedZ <= self.bedMediumMaxZ and moveZ >= self.bedHighMinZ :
					moveZ = self.bedMediumMaxZ
				elif moveZ > self.bedHighMaxZ :
					moveZ = self.bedHighMaxZ
		
				# Check if moving into upper region
				if moveZ >= self.bedHighMinZ :
				
					# Get min and max X and Y values
					minModelX = min(self.minXExtruderLow, self.minXExtruderMedium, self.minXExtruderHigh)
					maxModelX = max(self.maxXExtruderLow, self.maxXExtruderMedium, self.maxXExtruderHigh)
					minMoveX = self.bedHighMinX
					maxMoveX = self.bedHighMaxX
			
					minModelY = min(self.minYExtruderLow, self.minYExtruderMedium, self.minYExtruderHigh)
					maxModelY = max(self.maxYExtruderLow, self.maxYExtruderMedium, self.maxYExtruderHigh)
					minMoveY = self.bedHighMinY
					maxMoveY = self.bedHighMaxY
				
				# Otherwise check if moving into middle region
				elif moveZ >= self.bedMediumMinZ :
				
					# Get min and max X and Y values
					minModelX = min(self.minXExtruderLow, self.minXExtruderMedium)
					maxModelX = max(self.maxXExtruderLow, self.maxXExtruderMedium)
					minMoveX = self.bedMediumMinX
					maxMoveX = self.bedMediumMaxX
			
					minModelY = min(self.minYExtruderLow, self.minYExtruderMedium)
					maxModelY = max(self.maxYExtruderLow, self.maxYExtruderMedium)
					minMoveY = self.bedMediumMinY
					maxMoveY = self.bedMediumMaxY
				
				# Otherwise assume moving into lower region
				else :
				
					# Get min and max X and Y values
					minModelX = self.minXExtruderLow
					maxModelX = self.maxXExtruderLow
					minMoveX = self.bedLowMinX
					maxMoveX = self.bedLowMaxX
			
					minModelY = self.minYExtruderLow
					maxModelY = self.maxYExtruderLow
					minMoveY = self.bedLowMinY
					maxMoveY = self.bedLowMaxY
				
				# Prevent extruding filament on printer's frame
				if minMoveY < self.bedLowMinY :
					minMoveY = self.bedLowMinY
				
				# Set move X
				moveX = None
				if minModelX > minMoveX :
					moveX = minModelX - 20
					if moveX < minMoveX :
						moveX = minMoveX
				
				elif maxModelX < maxMoveX :
					moveX = maxModelX + 20
					if moveX > maxMoveX :
						moveX = maxMoveX
				
				# Set move Y
				moveY = None
				if minModelY > minMoveY :
					moveY = minModelY - 20
					if moveY < minMoveY :
						moveY = minMoveY
				
				elif maxModelY < maxMoveY :
					moveY = maxModelY + 20
					if moveY > maxMoveY :
						moveY = maxMoveY
				
				# Check if an X or Y movement isn't possible
				if moveX is None or moveY is None :
		
					# Send message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Failed Mid-Print Filament Change"))
					
					# Clear saved values
					self.savedX = None
					self.savedY = None
					self.savedZ = None
					self.savedE = None
					
					# Set commands
					commands = [
						"M24"
					]
		
				# Otherwise
				else :
		
					# Set commands
					commands = [
						"G90",
						"G0 Z%f E%f F345" % (moveZ, self.savedE - 5),
						"G0 X%f Y%f F2000" % (moveX, moveY),
						"G4",
						"M65540;show mid-print filament change"
					]
				
				# Send commands with line numbers
				self.sendCommandsWithLineNumbers(commands)
			
			# Otherwise
			else :
			
				# Send current location
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Current Location", locationX = locationX, locationY = locationY, locationZ = locationZ, locationE = locationE))
		
		# Otherwise check if data contains an EEPROM value
		elif "DT:" in data :
		
			# Check if data is for backlash X
			if "PT:" + str(self.eepromOffsets["backlashX"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerBacklashX = self.get_settings_defaults()["BacklashX"]
				else :
					self.printerBacklashX = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BacklashX"], self.printerBacklashX)
			
			# Otherwise check if data is for backlash Y
			elif "PT:" + str(self.eepromOffsets["backlashY"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerBacklashY = self.get_settings_defaults()["BacklashY"]
				else :
					self.printerBacklashY = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BacklashY"], self.printerBacklashY)
			
			# Otherwise check if data is for back right orientation
			elif "PT:" + str(self.eepromOffsets["bedOrientationBackRight"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerBackRightOrientation = self.get_settings_defaults()["BackRightOrientation"]
				else :
					self.printerBackRightOrientation = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BackRightOrientation"], self.printerBackRightOrientation)
			
			# Otherwise check if data is for back left orientation
			elif "PT:" + str(self.eepromOffsets["bedOrientationBackLeft"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerBackLeftOrientation = self.get_settings_defaults()["BackLeftOrientation"]
				else :
					self.printerBackLeftOrientation = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BackLeftOrientation"], self.printerBackLeftOrientation)
			
			# Otherwise check if data is for front left orientation
			elif "PT:" + str(self.eepromOffsets["bedOrientationFrontLeft"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerFrontLeftOrientation = self.get_settings_defaults()["FrontLeftOrientation"]
				else :
					self.printerFrontLeftOrientation = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["FrontLeftOrientation"], self.printerFrontLeftOrientation)
			
			# Otherwise check if data is for front right orientation
			elif "PT:" + str(self.eepromOffsets["bedOrientationFrontRight"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerFrontRightOrientation = self.get_settings_defaults()["FrontRightOrientation"]
				else :
					self.printerFrontRightOrientation = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["FrontRightOrientation"], self.printerFrontRightOrientation)
				
					# Set invalid bed orientation
					self.invalidBedOrientation = self.printerBackRightOrientation == 0 and self.printerBackLeftOrientation == 0 and self.printerFrontLeftOrientation == 0 and self.printerFrontRightOrientation == 0
				
			# Otherwise check if data is for filament type and location
			elif "PT:" + str(self.eepromOffsets["filamentTypeAndLocation"]["offset"]) + ' ' in data :
			
				# Convert data to value
				value = int(data[data.find("DT:") + 3 :])
				if value & 0x3F == 0x01 :
					filamentType = "ABS"
				elif value & 0x3F == 0x02 :
					filamentType = "PLA"
				elif value & 0x3F == 0x03 :
					filamentType = "HIPS"
				elif value & 0x3F == 0x05 :
					filamentType = "FLX"
				elif value & 0x3F == 0x06 :
					filamentType = "TGH"
				elif value & 0x3F == 0x07 :
					filamentType = "CAM"
				elif value & 0x3F == 0x08 :
					filamentType = "ABS-R"
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
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerBackLeftOffset = self.get_settings_defaults()["BackLeftOffset"]
				else :
					self.printerBackLeftOffset = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BackLeftOffset"], self.printerBackLeftOffset)
			
			# Otherwise check if data is for back right offset
			elif "PT:" + str(self.eepromOffsets["bedOffsetBackRight"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerBackRightOffset = self.get_settings_defaults()["BackRightOffset"]
				else :
					self.printerBackRightOffset = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BackRightOffset"], self.printerBackRightOffset)
			
			# Otherwise check if data is for front right offset
			elif "PT:" + str(self.eepromOffsets["bedOffsetFrontRight"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerFrontRightOffset = self.get_settings_defaults()["FrontRightOffset"]
				else :
					self.printerFrontRightOffset = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["FrontRightOffset"], self.printerFrontRightOffset)
			
			# Otherwise check if data is for front left offset
			elif "PT:" + str(self.eepromOffsets["bedOffsetFrontLeft"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerFrontLeftOffset = self.get_settings_defaults()["FrontLeftOffset"]
				else :
					self.printerFrontLeftOffset = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["FrontLeftOffset"], self.printerFrontLeftOffset)
			
			# Otherwise check if data is for bed height offset
			elif "PT:" + str(self.eepromOffsets["bedHeightOffset"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerBedHeightOffset = self.get_settings_defaults()["BedHeightOffset"]
				else :
					self.printerBedHeightOffset = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BedHeightOffset"], self.printerBedHeightOffset)
			
			# Otherwise check if data is for backlash speed
			elif "PT:" + str(self.eepromOffsets["backlashSpeed"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerBacklashSpeed = self.get_settings_defaults()["BacklashSpeed"]
				else :
					self.printerBacklashSpeed = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["BacklashSpeed"], self.printerBacklashSpeed)
			
			# Otherwise check if data is for speed limit X
			elif "PT:" + str(self.eepromOffsets["speedLimitX"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerSpeedLimitX = self.get_settings_defaults()["SpeedLimitX"]
				else :
					self.printerSpeedLimitX = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["SpeedLimitX"], self.printerSpeedLimitX)
			
			# Otherwise check if data is for speed limit Y
			elif "PT:" + str(self.eepromOffsets["speedLimitY"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerSpeedLimitY = self.get_settings_defaults()["SpeedLimitY"]
				else :
					self.printerSpeedLimitY = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["SpeedLimitY"], self.printerSpeedLimitY)
			
			# Otherwise check if data is for speed limit Z
			elif "PT:" + str(self.eepromOffsets["speedLimitZ"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerSpeedLimitZ = self.get_settings_defaults()["SpeedLimitZ"]
				else :
					self.printerSpeedLimitZ = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["SpeedLimitZ"], self.printerSpeedLimitZ)
			
			# Otherwise check if data is for speed limit E positive
			elif "PT:" + str(self.eepromOffsets["speedLimitEPositive"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerSpeedLimitEPositive = self.get_settings_defaults()["SpeedLimitEPositive"]
				else :
					self.printerSpeedLimitEPositive = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["SpeedLimitEPositive"], self.printerSpeedLimitEPositive)
			
			# Otherwise check if data is for speed limit E negative
			elif "PT:" + str(self.eepromOffsets["speedLimitENegative"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerSpeedLimitENegative = self.get_settings_defaults()["SpeedLimitENegative"]
				else :
					self.printerSpeedLimitENegative = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["SpeedLimitENegative"], self.printerSpeedLimitENegative)
			
			# Otherwise check if data is for X motor steps/mm
			elif "PT:" + str(self.eepromOffsets["xMotorStepsPerMm"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerXMotorStepsPerMm = self.get_settings_defaults()["XMotorStepsPerMm"]
				else :
					self.printerXMotorStepsPerMm = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["XMotorStepsPerMm"], self.printerXMotorStepsPerMm)
			
			# Otherwise check if data is for Y motor steps/mm
			elif "PT:" + str(self.eepromOffsets["yMotorStepsPerMm"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerYMotorStepsPerMm = self.get_settings_defaults()["YMotorStepsPerMm"]
				else :
					self.printerYMotorStepsPerMm = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["YMotorStepsPerMm"], self.printerYMotorStepsPerMm)
			
			# Otherwise check if data is for Z motor steps/mm
			elif "PT:" + str(self.eepromOffsets["zMotorStepsPerMm"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerZMotorStepsPerMm = self.get_settings_defaults()["ZMotorStepsPerMm"]
				else :
					self.printerZMotorStepsPerMm = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["ZMotorStepsPerMm"], self.printerZMotorStepsPerMm)
			
			# Otherwise check if data is for E motor steps/mm
			elif "PT:" + str(self.eepromOffsets["eMotorStepsPerMm"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerEMotorStepsPerMm = self.get_settings_defaults()["EMotorStepsPerMm"]
				else :
					self.printerEMotorStepsPerMm = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["EMotorStepsPerMm"], self.printerEMotorStepsPerMm)
			
			# Otherwise check if data is for X jerk sensitivity
			elif "PT:" + str(self.eepromOffsets["xJerkSensitivity"]["offset"]) + ' ' in data :
			
				# Convert data to value
				self.printerXJerkSensitivity = int(data[data.find("DT:") + 3 :])
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_int(["XJerkSensitivity"], self.printerXJerkSensitivity)
			
			# Otherwise check if data is for Y jerk sensitivity
			elif "PT:" + str(self.eepromOffsets["yJerkSensitivity"]["offset"]) + ' ' in data :
			
				# Convert data to value
				self.printerYJerkSensitivity = int(data[data.find("DT:") + 3 :])
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_int(["YJerkSensitivity"], self.printerYJerkSensitivity)
			
			# Otherwise check if data is for calibrate Z0 correction
			elif "PT:" + str(self.eepromOffsets["calibrateZ0Correction"]["offset"]) + ' ' in data :
			
				# Convert data to float
				value = self.intToFloat(int(data[data.find("DT:") + 3 :]))
				
				if not isinstance(value, float) or math.isnan(value) :
					self.printerCalibrateZ0Correction = self.get_settings_defaults()["CalibrateZ0Correction"]
				else :
					self.printerCalibrateZ0Correction = round(value, 6)
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
					self._settings.set_float(["CalibrateZ0Correction"], self.printerCalibrateZ0Correction)
			
			# Otherwise check if data is for bed orientation version
			elif "PT:" + str(self.eepromOffsets["bedOrientationVersion"]["offset"]) + ' ' in data :
			
				# Set invalid bed orientation
				self.invalidBedOrientation = data[data.find("DT:") + 3 :] == '0' or self.invalidBedOrientation
				
				# Check if not automatically collecting settings from printer
				if not self._settings.get_boolean(["AutomaticallyObtainSettings"]) :
				
					# Save settings to the printer
					self.sendCommandsWithLineNumbers(self.getSaveCommands())
				
				# Otherwise
				else :
					
					# Save software settings
					octoprint.settings.settings().save()
				
				# Send invalid values
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Invalid", bedCenter = self.invalidBedCenter, bedPlane = self.invalidBedPlane, bedOrientation = self.invalidBedOrientation))
	
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
		
		softwareXMotorStepsPerMm = self._settings.get_float(["XMotorStepsPerMm"])
		if not isinstance(softwareXMotorStepsPerMm, float) :
			softwareXMotorStepsPerMm = self.get_settings_defaults()["XMotorStepsPerMm"]
		
		softwareYMotorStepsPerMm = self._settings.get_float(["YMotorStepsPerMm"])
		if not isinstance(softwareYMotorStepsPerMm, float) :
			softwareYMotorStepsPerMm = self.get_settings_defaults()["YMotorStepsPerMm"]
		
		softwareZMotorStepsPerMm = self._settings.get_float(["ZMotorStepsPerMm"])
		if not isinstance(softwareZMotorStepsPerMm, float) :
			softwareZMotorStepsPerMm = self.get_settings_defaults()["ZMotorStepsPerMm"]
		
		softwareEMotorStepsPerMm = self._settings.get_float(["EMotorStepsPerMm"])
		if not isinstance(softwareEMotorStepsPerMm, float) :
			softwareEMotorStepsPerMm = self.get_settings_defaults()["EMotorStepsPerMm"]
		
		softwareXJerkSensitivity = self._settings.get_int(["XJerkSensitivity"])
		if not isinstance(softwareXJerkSensitivity, int) :
			softwareXJerkSensitivity = self.get_settings_defaults()["XJerkSensitivity"]
		
		softwareYJerkSensitivity = self._settings.get_int(["YJerkSensitivity"])
		if not isinstance(softwareYJerkSensitivity, int) :
			softwareYJerkSensitivity = self.get_settings_defaults()["YJerkSensitivity"]
		
		softwareCalibrateZ0Correction = self._settings.get_float(["CalibrateZ0Correction"])
		if not isinstance(softwareCalibrateZ0Correction, float) :
			softwareCalibrateZ0Correction = self.get_settings_defaults()["CalibrateZ0Correction"]
		
		# Check if backlash Xs differ
		commandList = []
		if hasattr(self, "printerBacklashX") and self.printerBacklashX != softwareBacklashX :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["backlashX"]["offset"]) + " T" + str(self.eepromOffsets["backlashX"]["bytes"]) + " P" + str(self.floatToInt(softwareBacklashX)), "M619 S" + str(self.eepromOffsets["backlashX"]["offset"]) + " T" + str(self.eepromOffsets["backlashX"]["bytes"])]

		# Check if backlash Ys differ
		if hasattr(self, "printerBacklashY") and self.printerBacklashY != softwareBacklashY :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["backlashY"]["offset"]) + " T" + str(self.eepromOffsets["backlashY"]["bytes"]) + " P" + str(self.floatToInt(softwareBacklashY)), "M619 S" + str(self.eepromOffsets["backlashY"]["offset"]) + " T" + str(self.eepromOffsets["backlashY"]["bytes"])]

		# Check if back right orientations differ
		if hasattr(self, "printerBackRightOrientation") and self.printerBackRightOrientation != softwareBackRightOrientation :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["bedOrientationBackRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationBackRight"]["bytes"]) + " P" + str(self.floatToInt(softwareBackRightOrientation)), "M619 S" + str(self.eepromOffsets["bedOrientationBackRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationBackRight"]["bytes"])]

		# Check if back left orientations differ
		if hasattr(self, "printerBackLeftOrientation") and self.printerBackLeftOrientation != softwareBackLeftOrientation :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["bedOrientationBackLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationBackLeft"]["bytes"]) + " P" + str(self.floatToInt(softwareBackLeftOrientation)), "M619 S" + str(self.eepromOffsets["bedOrientationBackLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationBackLeft"]["bytes"])]

		# Check if front left orientations differ
		if hasattr(self, "printerFrontLeftOrientation") and self.printerFrontLeftOrientation != softwareFrontLeftOrientation :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["bedOrientationFrontLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationFrontLeft"]["bytes"]) + " P" + str(self.floatToInt(softwareFrontLeftOrientation)), "M619 S" + str(self.eepromOffsets["bedOrientationFrontLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationFrontLeft"]["bytes"])]

		# Check if front right orientations differ
		if hasattr(self, "printerFrontRightOrientation") and self.printerFrontRightOrientation != softwareFrontRightOrientation :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["bedOrientationFrontRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationFrontRight"]["bytes"]) + " P" + str(self.floatToInt(softwareFrontRightOrientation)), "M619 S" + str(self.eepromOffsets["bedOrientationFrontRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOrientationFrontRight"]["bytes"])]

		# Check if backlash speeds differ
		if hasattr(self, "printerBacklashSpeed") and self.printerBacklashSpeed != softwareBacklashSpeed :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["backlashSpeed"]["offset"]) + " T" + str(self.eepromOffsets["backlashSpeed"]["bytes"]) + " P" + str(self.floatToInt(softwareBacklashSpeed)), "M619 S" + str(self.eepromOffsets["backlashSpeed"]["offset"]) + " T" + str(self.eepromOffsets["backlashSpeed"]["bytes"])]

		# Check if back left offsets differ
		if hasattr(self, "printerBackLeftOffset") and self.printerBackLeftOffset != softwareBackLeftOffset :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["bedOffsetBackLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetBackLeft"]["bytes"]) + " P" + str(self.floatToInt(softwareBackLeftOffset)), "M619 S" + str(self.eepromOffsets["bedOffsetBackLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetBackLeft"]["bytes"])]

		# Check if back right offsets differ
		if hasattr(self, "printerBackRightOffset") and self.printerBackRightOffset != softwareBackRightOffset :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["bedOffsetBackRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetBackRight"]["bytes"]) + " P" + str(self.floatToInt(softwareBackRightOffset)), "M619 S" + str(self.eepromOffsets["bedOffsetBackRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetBackRight"]["bytes"])]

		# Check if front right offsets differ
		if hasattr(self, "printerFrontRightOffset") and self.printerFrontRightOffset != softwareFrontRightOffset :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["bedOffsetFrontRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetFrontRight"]["bytes"]) + " P" + str(self.floatToInt(softwareFrontRightOffset)), "M619 S" + str(self.eepromOffsets["bedOffsetFrontRight"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetFrontRight"]["bytes"])]

		# Check if front left offsets differ
		if hasattr(self, "printerFrontLeftOffset") and self.printerFrontLeftOffset != softwareFrontLeftOffset :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["bedOffsetFrontLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetFrontLeft"]["bytes"]) + " P" + str(self.floatToInt(softwareFrontLeftOffset)), "M619 S" + str(self.eepromOffsets["bedOffsetFrontLeft"]["offset"]) + " T" + str(self.eepromOffsets["bedOffsetFrontLeft"]["bytes"])]

		# Check if bed height offsets differ
		if hasattr(self, "printerBedHeightOffset") and self.printerBedHeightOffset != softwareBedHeightOffset :

			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["bedHeightOffset"]["offset"]) + " T" + str(self.eepromOffsets["bedHeightOffset"]["bytes"]) + " P" + str(self.floatToInt(softwareBedHeightOffset)), "M619 S" + str(self.eepromOffsets["bedHeightOffset"]["offset"]) + " T" + str(self.eepromOffsets["bedHeightOffset"]["bytes"])]

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
			elif softwareFilamentType == "ABS-R" :
				newValue |= 0x08
			
			commandList += ["M618 S" + str(self.eepromOffsets["filamentTypeAndLocation"]["offset"]) + " T" + str(self.eepromOffsets["filamentTypeAndLocation"]["bytes"]) + " P" + str(newValue), "M619 S" + str(self.eepromOffsets["filamentTypeAndLocation"]["offset"]) + " T" + str(self.eepromOffsets["filamentTypeAndLocation"]["bytes"])]
		
		# Check if speed limit Xs differ
		if hasattr(self, "printerSpeedLimitX") and self.printerSpeedLimitX != softwareSpeedLimitX :
		
			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["speedLimitX"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitX"]["bytes"]) + " P" + str(self.floatToInt(softwareSpeedLimitX)), "M619 S" + str(self.eepromOffsets["speedLimitX"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitX"]["bytes"])]
		
		# Check if speed limit Ys differ
		if hasattr(self, "printerSpeedLimitY") and self.printerSpeedLimitY != softwareSpeedLimitY :
		
			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["speedLimitY"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitY"]["bytes"]) + " P" + str(self.floatToInt(softwareSpeedLimitY)), "M619 S" + str(self.eepromOffsets["speedLimitY"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitY"]["bytes"])]
		
		# Check if speed limit Zs differ
		if hasattr(self, "printerSpeedLimitZ") and self.printerSpeedLimitZ != softwareSpeedLimitZ :
		
			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["speedLimitZ"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitZ"]["bytes"]) + " P" + str(self.floatToInt(softwareSpeedLimitZ)), "M619 S" + str(self.eepromOffsets["speedLimitZ"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitZ"]["bytes"])]
		
		# Check if speed limit E positives differ
		if hasattr(self, "printerSpeedLimitEPositive") and self.printerSpeedLimitEPositive != softwareSpeedLimitEPositive :
		
			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["speedLimitEPositive"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitEPositive"]["bytes"]) + " P" + str(self.floatToInt(softwareSpeedLimitEPositive)), "M619 S" + str(self.eepromOffsets["speedLimitEPositive"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitEPositive"]["bytes"])]
		
		# Check if speed limit E negatives differ
		if hasattr(self, "printerSpeedLimitENegative") and self.printerSpeedLimitENegative != softwareSpeedLimitENegative :
		
			# Add new value to list
			commandList += ["M618 S" + str(self.eepromOffsets["speedLimitENegative"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitENegative"]["bytes"]) + " P" + str(self.floatToInt(softwareSpeedLimitENegative)), "M619 S" + str(self.eepromOffsets["speedLimitENegative"]["offset"]) + " T" + str(self.eepromOffsets["speedLimitENegative"]["bytes"])]
		
		# Check if not using M3D or M3D Mod firmware
		if self.currentFirmwareType != "M3D" and self.currentFirmwareType != "M3D Mod" :
		
			# Check if X motor steps/mms differ
			if hasattr(self, "printerXMotorStepsPerMm") and self.printerXMotorStepsPerMm != softwareXMotorStepsPerMm :

				# Add new value to list
				commandList += ["M618 S" + str(self.eepromOffsets["xMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["xMotorStepsPerMm"]["bytes"]) + " P" + str(self.floatToInt(softwareXMotorStepsPerMm)), "M619 S" + str(self.eepromOffsets["xMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["xMotorStepsPerMm"]["bytes"])]
		
			# Check if Y motor steps/mms differ
			if hasattr(self, "printerYMotorStepsPerMm") and self.printerYMotorStepsPerMm != softwareYMotorStepsPerMm :

				# Add new value to list
				commandList += ["M618 S" + str(self.eepromOffsets["yMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["yMotorStepsPerMm"]["bytes"]) + " P" + str(self.floatToInt(softwareYMotorStepsPerMm)), "M619 S" + str(self.eepromOffsets["yMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["yMotorStepsPerMm"]["bytes"])]
		
			# Check if Z motor steps/mms differ
			if hasattr(self, "printerZMotorStepsPerMm") and self.printerZMotorStepsPerMm != softwareZMotorStepsPerMm :

				# Add new value to list
				commandList += ["M618 S" + str(self.eepromOffsets["zMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["zMotorStepsPerMm"]["bytes"]) + " P" + str(self.floatToInt(softwareZMotorStepsPerMm)), "M619 S" + str(self.eepromOffsets["zMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["zMotorStepsPerMm"]["bytes"])]
		
			# Check if E motor steps/mms differ
			if hasattr(self, "printerEMotorStepsPerMm") and self.printerEMotorStepsPerMm != softwareEMotorStepsPerMm :

				# Add new value to list
				commandList += ["M618 S" + str(self.eepromOffsets["eMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["eMotorStepsPerMm"]["bytes"]) + " P" + str(self.floatToInt(softwareEMotorStepsPerMm)), "M619 S" + str(self.eepromOffsets["eMotorStepsPerMm"]["offset"]) + " T" + str(self.eepromOffsets["eMotorStepsPerMm"]["bytes"])]
			
			# Check if X jerk sensitivities differ
			if hasattr(self, "printerXJerkSensitivity") and self.printerXJerkSensitivity != softwareXJerkSensitivity :

				# Add new value to list
				commandList += ["M618 S" + str(self.eepromOffsets["xJerkSensitivity"]["offset"]) + " T" + str(self.eepromOffsets["xJerkSensitivity"]["bytes"]) + " P" + str(softwareXJerkSensitivity), "M619 S" + str(self.eepromOffsets["xJerkSensitivity"]["offset"]) + " T" + str(self.eepromOffsets["xJerkSensitivity"]["bytes"])]
			
			# Check if Y jerk sensitivities differ
			if hasattr(self, "printerYJerkSensitivity") and self.printerYJerkSensitivity != softwareYJerkSensitivity :

				# Add new value to list
				commandList += ["M618 S" + str(self.eepromOffsets["yJerkSensitivity"]["offset"]) + " T" + str(self.eepromOffsets["yJerkSensitivity"]["bytes"]) + " P" + str(softwareYJerkSensitivity), "M619 S" + str(self.eepromOffsets["yJerkSensitivity"]["offset"]) + " T" + str(self.eepromOffsets["yJerkSensitivity"]["bytes"])]
			
			# Check if calibrate Z0 corrections differ
			if hasattr(self, "printerCalibrateZ0Correction") and self.printerCalibrateZ0Correction != softwareCalibrateZ0Correction :

				# Add new value to list
				commandList += ["M618 S" + str(self.eepromOffsets["calibrateZ0Correction"]["offset"]) + " T" + str(self.eepromOffsets["calibrateZ0Correction"]["bytes"]) + " P" + str(self.floatToInt(softwareCalibrateZ0Correction)), "M619 S" + str(self.eepromOffsets["calibrateZ0Correction"]["offset"]) + " T" + str(self.eepromOffsets["calibrateZ0Correction"]["bytes"])]
			
		# Return command list
		return commandList
	
	# Pre-process G-code
	def preprocessGcode(self, path, file_object, links = None, printer_profile = None, allow_overwrite = True, *args, **kwargs) :
	
		# Check if file is not G-code or not using a Micro 3D printer
		if not octoprint.filemanager.valid_file_type(path, "gcode") or self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
		
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
			
			# Check if not processing a slice
			if not self.processingSlice :
			
				# Display message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Pre-processing file"))
			
			# Check if shared library was loaded
			if self.loadSharedLibrary() :
			
				# Set shared library settings
				self.setSharedLibrarySettings()
				
				# Collect print information
				printIsValid = self.sharedLibrary.collectPrintInformation(ctypes.c_char_p(input), ctypes.c_bool(True))
				
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
				printIsValid = self.collectPrintInformation(input, True)
		
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
				
				# Unload shared library
				self.unloadSharedLibrary()
				
				# Remove temporary file
				os.remove(input)
				
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
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "notice", title = "Print warning", text = "This file uses mid-print filament change commands"))
				
				# Check if objected couldn't be centered
				if self._settings.get_boolean(["UseCenterModelPreprocessor"]) and not self.objectSuccessfullyCentered :
			
					# Create message
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create message", type = "notice", title = "Print warning", text = "Object too large to center on print bed"))
			
			# Move the input file to a temporary file
			fd, temp = tempfile.mkstemp()
			os.close(fd)
			shutil.move(input, temp)
			
			# Check if shared library was loaded
			if self.sharedLibrary :
			
				# Set progress bar text
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Pre-processing …"))
			
				# Pre-process file
				self.sharedLibrary.preprocess(ctypes.c_char_p(temp), ctypes.c_char_p(input), ctypes.c_bool(False))
				
				# Set progress bar percent
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "0"))
				
				# Unload shared library
				self.unloadSharedLibrary()
			
			# Otherwise
			else :
			
				# Pre-process file
				self.preprocess(temp, input)
			
			# Remove temporary file
			os.remove(temp)
		
		# Return processed G-code
		return octoprint.filemanager.util.DiskFileWrapper(os.path.basename(input), input)
	
	# Collect print information
	def collectPrintInformation(self, file, applyPreprocessors) :
	
		# Initialize variables
		localX = None
		localY = None
		localZ = None
		relativeMode = False
		tier = "Low"
		gcode = Gcode()
		
		# Adjust bed bounds to account for external bed
		self.bedMediumMaxZ = 73.5 - self._settings.get_float(["ExternalBedHeight"])
		self.bedHighMaxZ = 112.0 - self._settings.get_float(["ExternalBedHeight"])
		self.bedHighMinZ = self.bedMediumMaxZ
		if self._settings.get_boolean(["ExpandPrintableRegion"]) :
			self.bedLowMinY = self.bedMediumMinY
		else :
			self.bedLowMinY = -2.0
		
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
						self.detectedFanSpeed = max(int(gcode.getValue('S')), 255)
					elif gcode.hasValue('P') :
						self.detectedFanSpeed = max(int(gcode.getValue('P')), 255)
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
			
							# Check if applying pre-processors, not ignoring print dimension limitations, not printing a test border or backlash calibration, and Z is out of bounds
							if applyPreprocessors and not self._settings.get_boolean(["IgnorePrintDimensionLimitations"]) and not self.printingTestBorder and not self.printingBacklashCalibration and (localZ < self.bedLowMinZ or localZ > self.bedHighMaxZ) :
				
								# Return false
								return False
			
							# Set print tier
							if localZ < self.bedLowMaxZ :
								tier = "Low"
				
							elif localZ < self.bedMediumMaxZ :
								tier = "Medium"
				
							else :
								tier = "High"
				
						# Check if applying pre-processors, not ignoring print dimension limitations, not printing a test border or backlash calibration, and centering model pre-processor isn't used
						if applyPreprocessors and not self._settings.get_boolean(["IgnorePrintDimensionLimitations"]) and not self.printingTestBorder and not self.printingBacklashCalibration and not self._settings.get_boolean(["UseCenterModelPreprocessor"]) :
			
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
					
					# Otherwise check if command is G92
					elif gcode.getValue('G') == "92" :

						# Check if command doesn't have an X, Y, Z, and E value
						if not gcode.hasValue('X') and not gcode.hasValue('Y') and not gcode.hasValue('Z') and not gcode.hasValue('E') :

							# Set command values to zero
							gcode.setValue('X', "0")
							gcode.setValue('Y', "0")
							gcode.setValue('Z', "0")
							gcode.setValue('E', "0")

						# Check if not using M3D or M3D Mod firmware
						if self.currentFirmwareType != "M3D" and self.currentFirmwareType != "M3D Mod" :

							# Set local values
							if gcode.hasValue('X') :
								localX = float(gcode.getValue('X'))

							if gcode.hasValue('Y') :
								localY = float(gcode.getValue('Y'))

							if gcode.hasValue('Z') :
								localZ = float(gcode.getValue('Z'))
	
		# Check if applying pre-processors, center model pre-processor is set, and not printing a test border or backlash calibration
		if applyPreprocessors and self._settings.get_boolean(["UseCenterModelPreprocessor"]) and not self.printingTestBorder and not self.printingBacklashCalibration :
	
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
		
		# Check if filement type is PLA, CAM, ABS, HIPS, FLX, TGH, or ABS-R
		if str(self._settings.get(["FilamentType"])) == "PLA" or str(self._settings.get(["FilamentType"])) == "CAM" or str(self._settings.get(["FilamentType"])) == "ABS" or str(self._settings.get(["FilamentType"])) == "HIPS" or str(self._settings.get(["FilamentType"])) == "FLX" or str(self._settings.get(["FilamentType"])) == "TGH" or str(self._settings.get(["FilamentType"])) == "ABS-R" :
		
			# Set tack point angle and time
			self.tackPointAngle = 90.0
			self.tackPointTime = 0.01
		
			# Set temperature stabalization delay
			if str(self._settings.get(["FilamentType"])) == "PLA" or str(self._settings.get(["FilamentType"])) == "CAM" or str(self._settings.get(["FilamentType"])) == "FLX" or str(self._settings.get(["FilamentType"])) == "TGH" :
				self.temperatureStabalizationDelay = 15
			else :
				self.temperatureStabalizationDelay = 10
		
			# Set fan speed
			if str(self._settings.get(["FilamentType"])) == "PLA" or str(self._settings.get(["FilamentType"])) == "CAM" or str(self._settings.get(["FilamentType"])) == "FLX" or str(self._settings.get(["FilamentType"])) == "TGH" :
				self.fanSpeed = 255
			else :
				self.fanSpeed = 50
			
			# Set first layer temperature change
			if str(self._settings.get(["FilamentType"])) == "PLA" or str(self._settings.get(["FilamentType"])) == "CAM" :
				self.firstLayerTemperatureChange = 10
			elif str(self._settings.get(["FilamentType"])) == "FLX" or str(self._settings.get(["FilamentType"])) == "TGH" :
				self.firstLayerTemperatureChange = -5
			elif str(self._settings.get(["FilamentType"])) == "ABS" or str(self._settings.get(["FilamentType"])) == "HIPS" or str(self._settings.get(["FilamentType"])) == "ABS-R" :
				self.firstLayerTemperatureChange = 15
		
		# Check if all fan commands are being removed
		if self.detectedFanSpeed is None or self._settings.get_boolean(["RemoveFanCommands"]) :
		
			# Set detected fan speed
			self.detectedFanSpeed = 0
		
		# Check if using preparation pre-processor or printing a test border or backlash calibration
		if self._settings.get_boolean(["UsePreparationPreprocessor"]) or self.printingTestBorder or self.printingBacklashCalibration :
		
			# Set detected fan speed
			self.detectedFanSpeed = self.fanSpeed
		
		# Get mid-print filament change layers
		self.midPrintFilamentChangeLayers = re.findall("\\d+", str(self._settings.get(["MidPrintFilamentChangeLayers"])))
		
		# Check if mid-print filament change layers exist
		if len(self.midPrintFilamentChangeLayers) :
		
			# Set mid-print filament change
			self.detectedMidPrintFilamentChange = True
		
		# Return true
		return True
	
	# Get bounded temperature
	def getBoundedTemperature(self, value, maxTemperature) :
	
		# Return temperature in bounded range
		return min(max(value, 150), maxTemperature)
	
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
	
	# Create tack point for thermal bonding
	def createTackPointForThermalBonding(self, point, refrence, time) :
	
		# Initialize variables
		gcode = Gcode()
		distance = math.ceil(self.getDistance(point, refrence))
	
		# Check if distance is applicable
		if distance > time / 1000 :
		
			# Get seconds and milliseconds
			seconds = int(time)
			milliseconds = int((time - seconds) * 1000)
		
			# Set G-code to dwell G-code
			gcode.setValue('G', '4')
			gcode.setValue('S', str(seconds))
			gcode.setValue('P', str(milliseconds))
	
		# Return G-code
		return gcode
	
	# Create tack point for wave bonding
	def createTackPointForWaveBonding(self, point, refrence) :
	
		# Initialize variables
		gcode = Gcode()
		distance = math.ceil(self.getDistance(point, refrence))
	
		# Check if distance is applicable
		if distance > 5 :
	
			# Set G-code to a delay command based on time
			gcode.setValue('G', '4')
			gcode.setValue('P', "%u" % distance)
	
		# Return G-code
		return gcode
	
	# Is sharp corner for thermal bonding
	def isSharpCornerForThermalBonding(self, point, refrence, angle) :

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
			except :
			
				# Return false
				return False
		
		# Return if sharp corner
		return value > 0 and value < angle / 180 * math.pi
	
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
			except :
			
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
	
		# Check if divide by zero
		if planeABC[2] == 0 :
		
			# Return zero
			return 0
	
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
		while True :
		
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
					
						# Check if not printing test border or backlash calibration
						if not self.printingTestBorder and not self.printingBacklashCalibration :
				
							# Set progress bar percent
							self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "0"))
	
						# Break
						break
				
				# Check if not printing test border or backlash calibration
				if not self.printingTestBorder and not self.printingBacklashCalibration :
				
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
							if self.layerDetectionRelativeMode :
								self.currentZ += float(gcode.getValue('Z'))
							else :
								self.currentZ = float(gcode.getValue('Z'))
						
						# Check if command contains an E value
						if gcode.hasValue('E') :
				
							# Set new E
							if self.layerDetectionRelativeMode :
								newE += float(gcode.getValue('E'))
							else :
								newE = float(gcode.getValue('E'))
						
						# Check if first time layer extrudes filament
						if newE > self.currentE and self.currentZ not in self.printedLayers :
					
							# Append layer to list
							self.printedLayers.append(self.currentZ)
						
							# Set on new printed layer
							self.onNewPrintedLayer = True
			
					# Otherwise check if command is G90
					elif gcode.getValue('G') == "90" :
				
						# Clear relative mode
						self.layerDetectionRelativeMode = False
				
					# Otherwise check if command is G91
					elif gcode.getValue('G') == "91" :
				
						# Set relative mode
						self.layerDetectionRelativeMode = True
				
					# Otherwise check if command is G92
					elif gcode.getValue('G') == "92" :
					
						# Check if command doesn't have an X, Y, Z, and E value
						if not gcode.hasValue('X') and not gcode.hasValue('Y') and not gcode.hasValue('Z') and not gcode.hasValue('E') :

							# Set command values to zero
							gcode.setValue('X', "0")
							gcode.setValue('Y', "0")
							gcode.setValue('Z', "0")
							gcode.setValue('E', "0")
						
						# Check if a Z value is provided
						if gcode.hasValue('Z') :
						
							# Set current Z
							self.currentZ = float(gcode.getValue('Z'))
			
						# Check if an E value is provided
						if gcode.hasValue('E') :
						
							# Set new E to value
							newE = float(gcode.getValue('E'))
					
					# Set current E
					self.currentE = newE
			
			# Check if not printing test border or backlash calibration and using mid-print filament change pre-processor
			if not self.printingTestBorder and not self.printingBacklashCalibration and len(self.midPrintFilamentChangeLayers) and "MID-PRINT" not in command.skip :
			
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
			
			# Check if not printing test border or backlash calibration and using center model pre-processor
			if not self.printingTestBorder and not self.printingBacklashCalibration and self._settings.get_boolean(["UseCenterModelPreprocessor"]) and "CENTER" not in command.skip :
			
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

			# Check if printing test border or backlash calibration or using validation pre-processor
			if (self.printingTestBorder or self.printingBacklashCalibration or self._settings.get_boolean(["UseValidationPreprocessor"])) and "VALIDATION" not in command.skip :
			
				# Set command skip
				command.skip += " VALIDATION"
				
				# Check if command contains valid G-code
				if not gcode.isEmpty() :

					# Check if extruder absolute mode, extruder relative mode, stop idle hold, request coordinates, or using M3D or M3D Mod firmware and request temperature command
					if gcode.hasValue('M') and (gcode.getValue('M') == "82" or gcode.getValue('M') == "83" or gcode.getValue('M') == "84" or gcode.getValue('M') == "117" or ((self.currentFirmwareType == "M3D" or self.currentFirmwareType == "M3D Mod") and gcode.getValue('M') == "105")) :

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
			
			# Check if printing test border or backlash calibration or using preparation pre-processor
			if (self.printingTestBorder or self.printingBacklashCalibration or self._settings.get_boolean(["UsePreparationPreprocessor"])) and "PREPARATION" not in command.skip :

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
					
					# Check if using M3D or M3D Mod firmware and both of the corners are set
					if (self.currentFirmwareType == "M3D" or self.currentFirmwareType == "M3D Mod") and cornerX != 0 and cornerY != 0 :
					
						# Set corner Z
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
					if self._settings.get_boolean(["ChangeLedBrightness"]) :
						newCommands.append(Command("M420 T1", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					if self._settings.get_boolean(["CalibrateBeforePrint"]) :
						newCommands.append(Command("M618 S" + str(self.eepromOffsets["bedHeightOffset"]["offset"]) + " T" + str(self.eepromOffsets["bedHeightOffset"]["bytes"]) + " P" + str(self.floatToInt(0)), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M619 S" + str(self.eepromOffsets["bedHeightOffset"]["offset"]) + " T" + str(self.eepromOffsets["bedHeightOffset"]["bytes"]), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						self._settings.set_float(["BedHeightOffset"], 0)
						newCommands.append(Command("G91", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G0 Z3 F90", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G90", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M109 S150", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M104 S0", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M107", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G30", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("M106 S1", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("M17", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G90", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("M104 S" + str(self._settings.get_int(["FilamentTemperature"])), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					newCommands.append(Command("G0 Z5 F48", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					
					# Check if using M3D or M3D Mod firmware
					if self.currentFirmwareType == "M3D" or self.currentFirmwareType == "M3D Mod" :
					
						# Home extruder
						newCommands.append(Command("G28", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))

					# Add heatbed command if using a heatbed
					if self.heatbedConnected :
						newCommands.append(Command("M190 S" + str(self._settings.get_int(["HeatbedTemperature"])), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))

					# Check if one of the corners wasn't set
					if cornerX == 0 or cornerY == 0 :

						# Prepare extruder the standard way
						newCommands.append(Command("M18", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M109 S" + str(self._settings.get_int(["FilamentTemperature"])), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						if self.temperatureStabalizationDelay != 0 :
							newCommands.append(Command("G4 S" + str(self.temperatureStabalizationDelay), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M106 S" + str(self.fanSpeed), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M17", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G92 E0", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("G0 Z0.4 F48", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
					
					# Otherwise
					else :

						# Prepare extruder by leaving excess at corner
						newCommands.append(Command("G0 X%f Y%f F1800" % (54 + cornerX, 50 + cornerY), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M18", "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M109 S" + str(self._settings.get_int(["FilamentTemperature"])), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						if self.temperatureStabalizationDelay != 0 :
							newCommands.append(Command("G4 S" + str(self.temperatureStabalizationDelay), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
						newCommands.append(Command("M106 S" + str(self.fanSpeed), "PREPARATION", "MID-PRINT CENTER VALIDATION PREPARATION"))
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
					
					if self._settings.get_boolean(["ChangeLedBrightness"]) :
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
			
			# Check if not printing test border or backlash calibration and using wave bonding pre-processor
			if not self.printingTestBorder and not self.printingBacklashCalibration and self._settings.get_boolean(["UseWaveBondingPreprocessor"]) and "WAVE" not in command.skip :

				# Set command skip
				command.skip += " WAVE"
				
				# Initialize new commands
				newCommands = []
				
				# Check if on a new printed layer
				if self.waveBondingLayerCounter < 2 and self.onNewPrintedLayer :

					# Increment layer counter
					self.waveBondingLayerCounter += 1
				
				# Check if on first counted layer
				if self.waveBondingLayerCounter == 1 :

					# Check if command contains valid G-code
					if not gcode.isEmpty() :
				
						# Check if command is a G command
						if gcode.hasValue('G') :

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

									# Check if at a sharp corner
									if not self.waveBondingPreviousGcode.isEmpty() and self.isSharpCornerForWaveBonding(gcode, self.waveBondingPreviousGcode) :

										# Check if a tack point was created
										self.waveBondingTackPoint = self.createTackPointForWaveBonding(gcode, self.waveBondingRefrenceGcode)
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
							
								# Set previous G-code
								self.waveBondingPreviousGcode = copy.deepcopy(gcode)
								
								# Set refrence G-codes if it isn't set
								if self.waveBondingRefrenceGcode.isEmpty() :
									self.waveBondingRefrenceGcode = copy.deepcopy(gcode)
						
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

								# Check if not using M3D or M3D Mod firmware
								if self.currentFirmwareType != "M3D" and self.currentFirmwareType != "M3D Mod" :

									# Set relative positions
									if gcode.hasValue('X') :
										self.waveBondingPositionRelativeX = float(gcode.getValue('X'))
	
									if gcode.hasValue('Y') :
										self.waveBondingPositionRelativeY = float(gcode.getValue('Y'))
	
									if gcode.hasValue('Z') :
										self.waveBondingPositionRelativeZ = float(gcode.getValue('Z'))
								
								# Set relative positions
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

			# Check if printing test border or backlash calibration or using thermal bonding pre-processor
			if (self.printingTestBorder or self.printingBacklashCalibration or self._settings.get_boolean(["UseThermalBondingPreprocessor"])) and "THERMAL" not in command.skip :

				# Set command skip
				command.skip += " THERMAL"
				
				# Initialize new commands
				newCommands = []
				
				# Check if on a new printed layer
				if self.thermalBondingLayerCounter < 2 and self.onNewPrintedLayer :
				
					# Increment layer counter
					self.thermalBondingLayerCounter += 1
		
					# Check if on first counted layer
					if self.thermalBondingLayerCounter == 1 :
		
						# Add temperature to output
						if self.currentFirmwareType == "M3D Mod" :
							newCommands.append(Command("M109 S" + str(self.getBoundedTemperature(self._settings.get_int(["FilamentTemperature"]) + self.firstLayerTemperatureChange, 315)), "THERMAL", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL"))
						else :
							newCommands.append(Command("M109 S" + str(self.getBoundedTemperature(self._settings.get_int(["FilamentTemperature"]) + self.firstLayerTemperatureChange, 285)), "THERMAL", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL"))
					
					# Otherwise
					else :
					
						# Add temperature to output
						newCommands.append(Command("M104 S" + str(self._settings.get_int(["FilamentTemperature"])), "THERMAL", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL"))
				
				# Check if on first counted layer
				if self.thermalBondingLayerCounter == 1 :
				
					# Check if command contains valid G-code
					if not gcode.isEmpty() :
					
						# Check if printing test border or wave bonding isn't being used, and command is a G command
						if (self.printingTestBorder or not self._settings.get_boolean(["UseWaveBondingPreprocessor"])) and gcode.hasValue('G') :

							# Check if command is G0 or G1 and it's in absolute
							if (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") and not self.thermalBondingRelativeMode :
							
								# Check if tack points can be created
								if self.tackPointAngle != 0 and self.tackPointTime >= 0.001 :

									# Check if at a sharp corner
									if not self.thermalBondingPreviousGcode.isEmpty() and self.isSharpCornerForThermalBonding(gcode, self.thermalBondingPreviousGcode, self.tackPointAngle) :
		
										# Check if a tack point was created
										self.thermalBondingTackPoint = self.createTackPointForThermalBonding(gcode, self.thermalBondingRefrenceGcode, self.tackPointTime)
										if not self.thermalBondingTackPoint.isEmpty() :
							
											# Add tack point to output
											newCommands.append(Command(self.thermalBondingTackPoint.getAscii(), "THERMAL", "MID-PRINT CENTER VALIDATION PREPARATION WAVE THERMAL"))
								
										# Set refrence G-code
										self.thermalBondingRefrenceGcode = copy.deepcopy(gcode)
								
									# Set previous G-code
									self.thermalBondingPreviousGcode = copy.deepcopy(gcode)
									
									# Set refrence G-codes if it isn't set
									if self.thermalBondingRefrenceGcode.isEmpty() :
										self.thermalBondingRefrenceGcode = copy.deepcopy(gcode)

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

			# Check if using M3D or M3D Mod firmware and printing test border or backlash calibration or using bed compensation pre-processor
			if (self.currentFirmwareType == "M3D" or self.currentFirmwareType == "M3D Mod") and (self.printingTestBorder or self.printingBacklashCalibration or self._settings.get_boolean(["UseBedCompensationPreprocessor"])) and "BED" not in command.skip :

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

							# Check if not using M3D or M3D Mod firmware
							if self.currentFirmwareType != "M3D" and self.currentFirmwareType != "M3D Mod" :

								# Set relative and absolute positions
								if gcode.hasValue('X') :
									self.bedCompensationPositionRelativeX = self.bedCompensationPositionAbsoluteX = float(gcode.getValue('X'))
		
								if gcode.hasValue('Y') :
									self.bedCompensationPositionRelativeY = self.bedCompensationPositionAbsoluteY = float(gcode.getValue('Y'))
		
								if gcode.hasValue('Z') :
									self.bedCompensationPositionRelativeZ = float(gcode.getValue('Z'))
							
							# Set relative and absolute positions
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

			# Check if using M3D or M3D Mod and printing test border or backlash calibration or using backlash compentation pre-processor
			if (self.currentFirmwareType == "M3D" or self.currentFirmwareType == "M3D Mod") and (self.printingTestBorder or self.printingBacklashCalibration or self._settings.get_boolean(["UseBacklashCompensationPreprocessor"])) and "BACKLASH" not in command.skip :

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

							# Check if not using M3D or M3D Mod firmware
							if self.currentFirmwareType != "M3D" and self.currentFirmwareType != "M3D Mod" :

								# Set relative positions
								if gcode.hasValue('X') :
									self.backlashPositionRelativeX = float(gcode.getValue('X'))
			
								if gcode.hasValue('Y') :
									self.backlashPositionRelativeY = float(gcode.getValue('Y'))
			
								if gcode.hasValue('Z') :
									self.backlashPositionRelativeZ = float(gcode.getValue('Z'))
							
							# Set relative positions
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
			
				# Check if command is a G0 or G1 command
				if gcode.hasValue('G') and (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") :
				
					# Check if command contains an F value
					if gcode.hasValue('F') :
					
						# Set current F
						self.currentF = gcode.getValue('F')
					
					# Otherwise check if current F is set
					elif self.currentF is not None :
					
						# Set command's F value to current F
						gcode.setValue('F', self.currentF)
				
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
			if flask.request.values["After Slicing Action"] != "none" and self._printer.is_closed_or_error() :
			
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
			fd, profileTemp = tempfile.mkstemp()
			os.close(fd)
			shutil.move(profileLocation, profileTemp)
			
			# Move original model to temporary location
			if modelModified :
				fd, modelTemp = tempfile.mkstemp()
				os.close(fd)
				shutil.move(modelLocation, modelTemp)
		
			# Save slicer profile to original slicer profile's location
			fd, temp = tempfile.mkstemp()
			os.close(fd)
		
			output = open(temp, "wb")
			for character in flask.request.values["Slicer Profile Content"] :
				output.write(chr(ord(character)))
			output.close()
			
			if flask.request.values["Slicer Name"] == "cura" :
				self.convertCuraToProfile(temp, profileLocation, '', '', '')
			elif flask.request.values["Slicer Name"] == "slic3r" :
				self.convertSlic3rToProfile(temp, profileLocation, '', '', '')
			else :
				shutil.copyfile(temp, profileLocation)
			
			# Remove temporary file
			os.remove(temp)
			
			# Get printer profile
			printerProfile = self._printer_profile_manager.get(flask.request.values["Printer Profile Name"])
		
			# Save slicer changes
			self.slicerChanges = {
				"Slicer Profile Location": profileLocation,
				"Slicer Profile Temporary": profileTemp,
				"Printer Profile Content": copy.deepcopy(printerProfile)
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
			
			# Otherwise check if slicer is Slic3r
			elif flask.request.values["Slicer Name"] == "slic3r" :
			
				# Change printer profile
				search = re.findall("bed_size\s*?=\s*?(\d+.?\d*)\s*?,\s*?(\d+.?\d*)", flask.request.values["Slicer Profile Content"])
				if len(search) :
					printerProfile["volume"]["width"] = float(search[0][0])
					printerProfile["volume"]["depth"] = float(search[0][1])
				
				search = re.findall("nozzle_diameter\s*?=\s*?(\d+.?\d*)", flask.request.values["Slicer Profile Content"])
				if len(search) :
					printerProfile["extruder"]["nozzleDiameter"] = float(search[0])
			
			# Check if modifying model
			if modelModified :
			
				# Save model locations
				self.slicerChanges["Model Location"] = modelLocation
				self.slicerChanges["Model Temporary"] = modelTemp
				
				# Adjust printer profile so that its center is equal to the model's center
				printerProfile["volume"]["width"] += float(flask.request.values["Model Center X"]) * 2
				printerProfile["volume"]["depth"] += float(flask.request.values["Model Center Y"]) * 2
			
			# Otherwise check if using a Micro 3D printer
			elif not self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
			
				# Set extruder center
				extruderCenterX = (self.bedLowMaxX + self.bedLowMinX) / 2
				extruderCenterY = (self.bedLowMaxY + self.bedLowMinY + 14.0) / 2
				
				# Adjust printer profile so that its center is equal to the model's center
				printerProfile["volume"]["width"] += (-(extruderCenterX - (self.bedLowMaxX + self.bedLowMinX) / 2) + self.bedLowMinX) * 2
				printerProfile["volume"]["depth"] += (extruderCenterY - (self.bedLowMaxY + self.bedLowMinY) / 2 + self.bedLowMinY) * 2
			
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
				fd, temp = tempfile.mkstemp()
				os.close(fd)
				
				output = open(temp, "wb")
				for character in flask.request.values["Slicer Profile Content"] :
					output.write(chr(ord(character)))
				output.close()
				
				# Clean up input
				fd, curaProfile = tempfile.mkstemp()
				os.close(fd)
				self.curaProfileCleanUp(temp, curaProfile)
				
				# Attempt to convert profile
				try :
					profile = profileManager.Profile.from_cura_ini(curaProfile)
				
				# Set profile to none if conversion failed
				except :
					profile = None
				
				# Remove temporary files
				os.remove(temp)
				os.remove(curaProfile)
				
				# Check if profile is invalid
				if profile is None :
				
					# Return error
					return flask.jsonify(dict(value = "Error"))
			
			# Otherwise check if slicer is Slic3r
			elif flask.request.values["Slicer Name"] == "slic3r" :
			
				# Import profile manager
				profileManager = imp.load_source("Profile", self._slicing_manager.get_slicer("slic3r")._basefolder.replace('\\', '/') + "/profile.py")
					
				# Save profile to temporary file
				fd, temp = tempfile.mkstemp()
				os.close(fd)
				
				output = open(temp, "wb")
				for character in flask.request.values["Slicer Profile Content"] :
					output.write(chr(ord(character)))
				output.close()
				
				# Clean up input
				fd, slic3rProfile = tempfile.mkstemp()
				os.close(fd)
				self.slic3rProfileCleanUp(temp, slic3rProfile)
				
				# Attempt to convert profile
				try :
					profile = profileManager.Profile.from_slic3r_ini(slic3rProfile)
				
				# Set profile to none if conversion failed
				except :
					profile = None
				
				# Remove temporary files
				os.remove(temp)
				os.remove(slic3rProfile)
				
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
	
		# Check if not using a Micro 3D printer
		if self._settings.get_boolean(["NotUsingAMicro3DPrinter"]) :
		
			# Return
			return
		
		# Set baudrate if not specified
		if not baudrate or baudrate == 0 :
			baudrate = 115200
		
		# Check if port isn't specified
		if not port or port == "AUTO" :
			
			# Set state to detecting
			try :
				comm_instance._changeState(comm_instance.STATE_DETECT_SERIAL)
			except :
				pass
			
			# Detect port
			port = self.getPort()
			
			# Check if printer isn't detected
			if port is None :
			
				# Set state to failed
				comm_instance._log("Failed to autodetect serial port")
				comm_instance._errorValue = "Failed to autodetect serial port."
				try :
					comm_instance._changeState(comm_instance.STATE_ERROR)
				except :
					pass
				
				# Send message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "No Micro 3D printer detected. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
				
				# Enable printer connect button
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Allow Connecting"))
				
				# Return none
				return None
		
		# Replace baudrate list
		comm_instance._baudrateDetectList = [baudrate]
		
		# Set state to connecting
		comm_instance._log("Connecting to: " + str(port))
		
		# Create a connection
		for i in xrange(5) :
			try :
				connection = serial.Serial(str(port), baudrate)
				break

			# If printer has just power-cycled it may not yet be ready
			except :
				connection = None
				time.sleep(1)
		
		# Check if connecting to printer failed
		if connection is None :
		
			# Send message
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "Unable to connect to the printer. If your not using a Micro 3D printer then make sure to enable the 'Not using a Micro 3D printer' setting in the M33 Fio tab in OctoPrint's settings. Otherwise try cycling the printer's power and try again.", header = "Connection Status", confirm = True))
			
			# Enable printer connect button
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Allow Connecting"))
		
		# Otherwise check if using OS X or Linux and the user lacks read/write access to the printer
		elif (platform.uname()[0].startswith("Darwin") or platform.uname()[0].startswith("Linux")) and not os.access(str(port), os.R_OK | os.W_OK) :
		
			# Close connection
			connection.close()
			
			# Clear connection
			connection = None
		
			# Send message
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Show Message", message = "You don't have read/write access to " + str(port), header = "Connection Status", confirm = True))
			
			# Enable printer connect button
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Allow Connecting"))
		
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
				except :
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
			error, self.osXSleepPrevention = assertionCreateWithName(self.osXSleepFramework, "NoIdleSleepAssertion", 255, "Disabled by M33 Fio")
			
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
				
				except :
					
					self.linuxSleepService = None
			
					# Return false
					return False
			
				# Inhibit sleep service
				try :
					self.linuxSleepService = dbus.Interface(bus.get_object("org.gnome.ScreenSaver", "/org/gnome/ScreenSaver"), "org.gnome.ScreenSaver")
					self.linuxSleepPrevention = self.linuxSleepService.Inhibit("M33 Fio", "Disabled by M33 Fio")
			
				except :
				
					try :
						self.linuxSleepService = dbus.Interface(bus.get_object("org.gnome.ScreenSaver", "/ScreenSaver"), "org.gnome.ScreenSaver")
						self.linuxSleepPrevention = self.linuxSleepService.Inhibit("M33 Fio", "Disabled by M33 Fio")
			
					except :
					
						try:
							self.linuxSleepService = dbus.Interface(bus.get_object("org.freedesktop.ScreenSaver", "/org/freedesktop/ScreenSaver"), "org.freedesktop.ScreenSaver")
							self.linuxSleepPrevention = self.linuxSleepService.Inhibit("M33 Fio", "Disabled by M33 Fio")
						
						except :
			
							try :
								self.linuxSleepService = dbus.Interface(bus.get_object("org.freedesktop.ScreenSaver", "/ScreenSaver"), "org.freedesktop.ScreenSaver")
								self.linuxSleepPrevention = self.linuxSleepService.Inhibit("M33 Fio", "Disabled by M33 Fio")
				
							except :
					
								self.linuxSleepService = None
						
								# Return false
								return False
			
			# Otherwise
			else :
			
				try :
					self.linuxSleepPrevention = self.linuxSleepService.Inhibit("M33 Fio", "Disabled by M33 Fio")
				
				except :
					
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
				
				# Try using WiringPi to access the port
				try :
					subprocess.call(["gpio", "-g", "mode", str(gpioPin), "out"])
					subprocess.call(["gpio", "-g", "write", str(gpioPin), '1'])
				
				# Check if WiringPi isn't installed
				except OSError as exception :
					if exception.errno == os.errno.ENOENT :
				
						# Try using file system to access the port
						os.system("echo \"" + str(gpioPin) + "\" > /sys/class/gpio/export")
						os.system("echo \"out\" > /sys/class/gpio/gpio" + str(gpioPin) + "/direction")
						os.system("echo \"1\" > /sys/class/gpio/gpio" + str(gpioPin) + "/value")
						os.system("echo \"" + str(gpioPin) + "\" > /sys/class/gpio/unexport")
	
	# Set GPIO pin low
	def setGpioPinLow(self) :
	
		# Check if GPIO pin is set
		gpioPin = self._settings.get_int(["GpioPin"])
		if gpioPin is not None :
	
			# Check if using Linux
			if platform.uname()[0].startswith("Linux") :
				
				# Try using WiringPi to access the port
				try:
					subprocess.call(["gpio", "-g", "mode", str(gpioPin), "out"])
					subprocess.call(["gpio", "-g", "write", str(gpioPin), '0'])
				
				# Check if WiringPi isn't installed
				except OSError as exception :
					if exception.errno == os.errno.ENOENT :
						
						# Try using file system to access the port
						os.system("echo \"" + str(gpioPin) + "\" > /sys/class/gpio/export")
						os.system("echo \"out\" > /sys/class/gpio/gpio" + str(gpioPin) + "/direction")
						os.system("echo \"0\" > /sys/class/gpio/gpio" + str(gpioPin) + "/value")
						os.system("echo \"" + str(gpioPin) + "\" > /sys/class/gpio/unexport")


# Plugin info
__plugin_name__ = "M33 Fio"


# Plugin load
def __plugin_load__() :

	# Obtain global variables
	global __plugin_implementation__
	global __plugin_hooks__

	# Define implementation
	__plugin_implementation__ = M33FioPlugin()

	# Define hooks
	__plugin_hooks__ = {
		"octoprint.filemanager.preprocessor": __plugin_implementation__.preprocessGcode,
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.getUpdateInformation,
		"octoprint.server.http.bodysize": __plugin_implementation__.increaseUploadSize,
		"octoprint.comm.transport.serial.factory": __plugin_implementation__.autoConnect
	}
