# coding=utf-8
from __future__ import absolute_import


# Plugin details
__author__ = "donovan6000 <donovan6000@exploitkings.com>"
__license__ = 'GNU General Public License http://www.gnu.org/licenses/gpl.txt'
__copyright__ = "Copyright (C) 2015 Exploit Kings. All rights reserved."


# Imports
import octoprint.plugin
import octoprint.events
import octoprint.filemanager
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
import binascii
import shutil
from .gcode import Gcode


# Plugin
class M3DFioPlugin(
		octoprint.plugin.StartupPlugin,
		octoprint.plugin.EventHandlerPlugin,
		octoprint.plugin.TemplatePlugin,
		octoprint.plugin.SettingsPlugin,
		octoprint.plugin.SimpleApiPlugin,
		octoprint.plugin.AssetPlugin,
		octoprint.printer.PrinterCallback
	) :

	# Constructor
	def __init__(self) :

		# Initialize data members
		self.originalWrite = None
		self.originalRead = None
		self.invalidPrinter = True
		self.numberWrapCounter = 0
		self.waitingResponse = None
		self.processingSlice = False
		
		# Set port if available
		if sys.platform.startswith("linux") == True :
			self.port = "/dev/micro_m3d"
		else :
			self.port = None
	
		# Bed dimensions
		self.bedLowMaxX = 112.95
		self.bedLowMinX = 0.05
		self.bedLowMaxY = 106.95
		self.bedLowMinY = 0.05
		self.bedLowMaxZ = 5.0
		self.bedLowMinZ = 0.0
		self.bedMediumMaxX = 110.15
		self.bedMediumMinX = 2.85
		self.bedMediumMaxY = 106.95
		self.bedMediumMinY = -6.55
		self.bedMediumMaxZ = 73.5
		self.bedMediumMinZ = self.bedLowMaxZ
		self.bedHighMaxX = 81.95
		self.bedHighMinX = 2.4
		self.bedHighMaxY = 92.89999
		self.bedHighMinY = 20.1
		self.bedHighMaxZ = 111.95
		self.bedHighMinZ = self.bedMediumMaxZ
		
		# Chip details
		self.chipName = "ATxmega32C4"
		self.chipPageSize = 0x80
		self.chipNrwwSize = 0x20
		self.chipNumberOfPages = 0x80
		self.chipTotalMemory = self.chipNumberOfPages * self.chipPageSize * 2
	
		# Wave bonding settings
		self.waveStep = 0
		self.wavePeriod = 5.0
		self.wavePeriodQuarter = self.wavePeriod / 4.0
		self.waveSize = 0.15

		# Backlash compensation settings
		self.useLegacyBacklash = False
	
		# Bed compensation settings
		self.levellingMoveX = 104.9
		self.levellingMoveY = 103.0
		self.segmentLength = 2.0
	
		# Feed rate conversion settings
		self.maxFeedRatePerSecond = 60.0001
		
		# Rom decryption and encryption tables
		self.romDecryptionTable = [0x26, 0xE2, 0x63, 0xAC, 0x27, 0xDE, 0x0D, 0x94, 0x79, 0xAB, 0x29, 0x87, 0x14, 0x95, 0x1F, 0xAE, 0x5F, 0xED, 0x47, 0xCE, 0x60, 0xBC, 0x11, 0xC3, 0x42, 0xE3, 0x03, 0x8E, 0x6D, 0x9D, 0x6E, 0xF2, 0x4D, 0x84, 0x25, 0xFF, 0x40, 0xC0, 0x44, 0xFD, 0x0F, 0x9B, 0x67, 0x90, 0x16, 0xB4, 0x07, 0x80, 0x39, 0xFB, 0x1D, 0xF9, 0x5A, 0xCA, 0x57, 0xA9, 0x5E, 0xEF, 0x6B, 0xB6, 0x2F, 0x83, 0x65, 0x8A, 0x13, 0xF5, 0x3C, 0xDC, 0x37, 0xD3, 0x0A, 0xF4, 0x77, 0xF3, 0x20, 0xE8, 0x73, 0xDB, 0x7B, 0xBB, 0x0B, 0xFA, 0x64, 0x8F, 0x08, 0xA3, 0x7D, 0xEB, 0x5C, 0x9C, 0x3E, 0x8C, 0x30, 0xB0, 0x7F, 0xBE, 0x2A, 0xD0, 0x68, 0xA2, 0x22, 0xF7, 0x1C, 0xC2, 0x17, 0xCD, 0x78, 0xC7, 0x21, 0x9E, 0x70, 0x99, 0x1A, 0xF8, 0x58, 0xEA, 0x36, 0xB1, 0x69, 0xC9, 0x04, 0xEE, 0x3B, 0xD6, 0x34, 0xFE, 0x55, 0xE7, 0x1B, 0xA6, 0x4A, 0x9A, 0x54, 0xE6, 0x51, 0xA0, 0x4E, 0xCF, 0x32, 0x88, 0x48, 0xA4, 0x33, 0xA5, 0x5B, 0xB9, 0x62, 0xD4, 0x6F, 0x98, 0x6C, 0xE1, 0x53, 0xCB, 0x46, 0xDD, 0x01, 0xE5, 0x7A, 0x86, 0x75, 0xDF, 0x31, 0xD2, 0x02, 0x97, 0x66, 0xE4, 0x38, 0xEC, 0x12, 0xB7, 0x00, 0x93, 0x15, 0x8B, 0x6A, 0xC5, 0x71, 0x92, 0x45, 0xA1, 0x59, 0xF0, 0x06, 0xA8, 0x5D, 0x82, 0x2C, 0xC4, 0x43, 0xCC, 0x2D, 0xD5, 0x35, 0xD7, 0x3D, 0xB2, 0x74, 0xB3, 0x09, 0xC6, 0x7C, 0xBF, 0x2E, 0xB8, 0x28, 0x9F, 0x41, 0xBA, 0x10, 0xAF, 0x0C, 0xFC, 0x23, 0xD9, 0x49, 0xF6, 0x7E, 0x8D, 0x18, 0x96, 0x56, 0xD1, 0x2B, 0xAD, 0x4B, 0xC1, 0x4F, 0xC8, 0x3A, 0xF1, 0x1E, 0xBD, 0x4C, 0xDA, 0x50, 0xA7, 0x52, 0xE9, 0x76, 0xD8, 0x19, 0x91, 0x72, 0x85, 0x3F, 0x81, 0x61, 0xAA, 0x05, 0x89, 0x0E, 0xB5, 0x24, 0xE0]

		self.romEncryptionTable = [0xAC, 0x9C, 0xA4, 0x1A, 0x78, 0xFA, 0xB8, 0x2E, 0x54, 0xC8, 0x46, 0x50, 0xD4, 0x06, 0xFC, 0x28, 0xD2, 0x16, 0xAA, 0x40, 0x0C, 0xAE, 0x2C, 0x68, 0xDC, 0xF2, 0x70, 0x80, 0x66, 0x32, 0xE8, 0x0E, 0x4A, 0x6C, 0x64, 0xD6, 0xFE, 0x22, 0x00, 0x04, 0xCE, 0x0A, 0x60, 0xE0, 0xBC, 0xC0, 0xCC, 0x3C, 0x5C, 0xA2, 0x8A, 0x8E, 0x7C, 0xC2, 0x74, 0x44, 0xA8, 0x30, 0xE6, 0x7A, 0x42, 0xC4, 0x5A, 0xF6, 0x24, 0xD0, 0x18, 0xBE, 0x26, 0xB4, 0x9A, 0x12, 0x8C, 0xD8, 0x82, 0xE2, 0xEA, 0x20, 0x88, 0xE4, 0xEC, 0x86, 0xEE, 0x98, 0x84, 0x7E, 0xDE, 0x36, 0x72, 0xB6, 0x34, 0x90, 0x58, 0xBA, 0x38, 0x10, 0x14, 0xF8, 0x92, 0x02, 0x52, 0x3E, 0xA6, 0x2A, 0x62, 0x76, 0xB0, 0x3A, 0x96, 0x1C, 0x1E, 0x94, 0x6E, 0xB2, 0xF4, 0x4C, 0xC6, 0xA0, 0xF0, 0x48, 0x6A, 0x08, 0x9E, 0x4E, 0xCA, 0x56, 0xDA, 0x5E, 0x2F, 0xF7, 0xBB, 0x3D, 0x21, 0xF5, 0x9F, 0x0B, 0x8B, 0xFB, 0x3F, 0xAF, 0x5B, 0xDB, 0x1B, 0x53, 0x2B, 0xF3, 0xB3, 0xAD, 0x07, 0x0D, 0xDD, 0xA5, 0x95, 0x6F, 0x83, 0x29, 0x59, 0x1D, 0x6D, 0xCF, 0x87, 0xB5, 0x63, 0x55, 0x8D, 0x8F, 0x81, 0xED, 0xB9, 0x37, 0xF9, 0x09, 0x03, 0xE1, 0x0F, 0xD3, 0x5D, 0x75, 0xC5, 0xC7, 0x2D, 0xFD, 0x3B, 0xAB, 0xCD, 0x91, 0xD1, 0x4F, 0x15, 0xE9, 0x5F, 0xCB, 0x25, 0xE3, 0x67, 0x17, 0xBD, 0xB1, 0xC9, 0x6B, 0xE5, 0x77, 0x35, 0x99, 0xBF, 0x69, 0x13, 0x89, 0x61, 0xDF, 0xA3, 0x45, 0x93, 0xC1, 0x7B, 0xC3, 0xF1, 0xD7, 0xEB, 0x4D, 0x43, 0x9B, 0x05, 0xA1, 0xFF, 0x97, 0x01, 0x19, 0xA7, 0x9D, 0x85, 0x7F, 0x4B, 0xEF, 0x73, 0x57, 0xA9, 0x11, 0x79, 0x39, 0xB7, 0xE7, 0x1F, 0x49, 0x47, 0x41, 0xD9, 0x65, 0x71, 0x33, 0x51, 0x31, 0xD5, 0x27, 0x7D, 0x23]
	
	# On start
	def on_after_startup(self) :
		
		# Enable printer callbacks
		self._printer.register_callback(self)
	
	# Get default settings
	def get_settings_defaults(self) :
	
		# Return default settings
		return dict(
			BacklashX = "0.3",
			BacklashY = "0.6",
			BacklashSpeed = "1500",
			BackLeftOffset = "0",
			BackRightOffset = "0",
			FrontRightOffset = "0",
			FrontLeftOffset = "0",
			BedHeightOffset = "0",
			FilamentTemperature = "215",
			FilamentType = "PLA",
			UseValidationPreprocessor = True,
			UsePreparationPreprocessor = True,
			UseThermalBondingPreprocessor = True,
			UseBedCompensationPreprocessor = True,
			UseBacklashCompensationPreprocessor = True,
			UseFeedRateConversionPreprocessor = True,
			AutomaticSettingsUpdate = True,
			UseCenterModelPreprocessor = True
		)
	
	# Template manager
	def get_template_configs(self) :
	
		# Return settings
		return [
			dict(
				type = "settings", custom_bindings = False
			)
		]
	
	# Asset manager
	def get_assets(self) :
	
		# Return asset
		return dict(
			js = ["js/m3dfio.js"],
			css = ["css/m3dfio.css"]
		)
	
	# Get update information
	def getUpdateInformation(self) :
	
		# Return update information
		return dict(
			updateplugindemo = dict(
			
				displayName = "M3D Fio",
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
			file = ["name", "contents"]
		)
	
	# On command
	def on_api_command(self, command, data):
	
		# Check if command is a message
		if command == "message" :
		
			# Check if parameter is a list of commands
			if isinstance(data["value"], list) == True :
			
				# Set waiting response
				if data["value"][-1] == "M65536;wait\n" :
					self.waitingResponse = True
			
				# Send commands to printer
				self._printer.commands(data["value"])
				
				# Check if waiting for a response
				if data["value"][-1] == "M65536;wait\n" :
				
					# Wait until all commands have been sent or interrupted
					while self.waitingResponse == True :
						time.sleep(0.01)
				
					# Send response
					if self.waitingResponse == False :
						return flask.jsonify(dict(value = "Error"))
					else :
						return flask.jsonify(dict(value = "Ok"))
			
			# Otherwise check if parameter is to set fan
			elif data["value"].startswith("Set Fan:") == True :
			
				# Initialize variables
				error = False
				
				# Disable printer callbacks
				self._printer.unregister_callback(self)
				
				# Get current printer connection state
				currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
				
				# Set current port
				if self.port != None :
					currentPort = self.port
				
				# Switch into bootloader mode
				self._printer.commands("M115 S628\n")
				time.sleep(1)
				
				# Connect to the printer
				connection = serial.Serial(currentPort, currentBaudrate)
				
				# Set fan type, offset, and scale
				if data["value"][9 :] == "HengLiXin" :
					fanType = 1
					fanOffset = 200
					fanScale = 0.2165354
				
				elif data["value"][9 :] == "Listener" :
					fanType = 2
					fanOffset = 145
					fanScale = 0.3333333
				
				elif data["value"][9 :] == "Shenzhew" :
					fanType = 3
					fanOffset = 82
					fanScale = 0.3843137
				
				else :
					error = True
				
				# Convert fan scale to binary
				packed = struct.pack('f', fanScale)
				fanScale = ord(packed[0]) | (ord(packed[1]) << 8) | (ord(packed[2]) << 16) | (ord(packed[3]) << 24)
				
				# Go through all fan scale values
				index = 0
				while index < 4 :
				
					# Check if saving fan scale failed
					if error == False and self.writeToEeprom(connection, 0x2AD + index, chr((fanScale >> 8 * index) & 0xFF)) == False :
				
						# Set error
						error = True
					
					# Increment index
					index += 1
				
				# Check if saving fan offset or fan type failed
				if error == False and (self.writeToEeprom(connection, 0x2AC, chr(fanOffset)) == False or self.writeToEeprom(connection, 0x2AB, chr(fanType)) == False) :
				
					# Set error
					error = True
				
				# Close connection
				connection.close()
				
				# Enable printer callbacks
				self._printer.register_callback(self)
			
				# Re-connect
				self._printer.connect(port = currentPort, baudrate = currentBaudrate, profile = currentProfile)
				
				# Send response
				if error == True :
					return flask.jsonify(dict(value = "Error"))
				else :
					return flask.jsonify(dict(value = "Ok"))
			
			# Otherwise check if parameter is to set extruder current
			elif data["value"].startswith("Set Extruder Current:") == True :
			
				# Initialize variables
				error = False
				current = int(data["value"][22 :])
				
				# Disable printer callbacks
				self._printer.unregister_callback(self)
				
				# Get current printer connection state
				currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
				
				# Set current port
				if self.port != None :
					currentPort = self.port
				
				# Switch into bootloader mode
				self._printer.commands("M115 S628\n")
				time.sleep(1)
				
				# Connect to the printer
				connection = serial.Serial(currentPort, currentBaudrate)
				
				# Check if saving extruder current failed
				if self.writeToEeprom(connection, 0x2E8, chr(current & 0xFF)) == False or self.writeToEeprom(connection, 0x2E9, chr((current >> 8) & 0xFF)) == False :
				
					# Set error
					error = True
				
				# Close connection
				connection.close()
				
				# Enable printer callbacks
				self._printer.register_callback(self)
				
				# Re-connect
				self._printer.connect(port = currentPort, baudrate = currentBaudrate, profile = currentProfile)
				
				# Send response
				if error == True :
					return flask.jsonify(dict(value = "Error"))
				else :
					return flask.jsonify(dict(value = "Ok"))
			
			# Otherwise check if parameter is to print test border
			elif data["value"].startswith("Print test border") == True :
			
				# Set test border file location
				location = os.path.dirname(os.path.realpath(__file__)) + "/static/files/test border.gcode"
				
				# Set test border file destination
				destination = self._file_manager.path_on_disk(octoprint.filemanager.destinations.FileDestinations.LOCAL, "test border")
				
				# Remove processed test border if it already exists
				if os.path.isfile(destination) == True :
					os.remove(destination)
					
				# Copy test border
				temp = tempfile.mkstemp()[1]
				shutil.copyfile(location, temp)
				
				# Set values
				self.backlashX = self._settings.get_float(["BacklashX"])
				self.backlashY = self._settings.get_float(["BacklashY"])
				self.backlashSpeed = self._settings.get_float(["BacklashSpeed"])
				self.bedHeightOffset = self._settings.get_float(["BedHeightOffset"])
				self.backRightOffset = self._settings.get_float(["BackRightOffset"])
				self.backLeftOffset = self._settings.get_float(["BackLeftOffset"])
				self.frontLeftOffset = self._settings.get_float(["FrontLeftOffset"])
				self.frontRightOffset = self._settings.get_float(["FrontRightOffset"])
				self.filamentTemperature = self._settings.get_int(["FilamentTemperature"])
				self.filamentType = str(self._settings.get(["FilamentType"]))
				
				# Process file
				self.getPrintInformation(temp)
				self.preparationPreprocessor(temp, False)
				self.thermalBondingPreprocessor(temp)
				self.bedCompensationPreprocessor(temp)
				self.backlashCompensationPreprocessor(temp)
				self.feedRateConversionPreprocessor(temp)
			
				# Send processed file to destination
				os.rename(temp, destination)
				
				# Clear message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Clear message"))
		
				# Print test border
				self._printer.select_file(destination, False, True)
		
		# Otherwise check if command is a file
		elif command == "file" :
		
			# Initialize variables
			error = False
			encryptedRom = ''
			decryptedRom = ''
			oldChipCrc = 0
			newChipCrc = 0
			eepromCrc = 0
			
			# Disable printer callbacks
			self._printer.unregister_callback(self)
			
			# Get current printer connection state
			currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
			
			# Set current port
			if self.port != None :
				currentPort = self.port
			
			# Switch into bootloader mode
			self._printer.commands("M115 S628\n")
			time.sleep(1)
			
			# Connect to the printer
			connection = serial.Serial(currentPort, currentBaudrate)
			
			# Get encrypted rom from unicode contents
			for character in data["contents"] :
				encryptedRom += chr(ord(character))
			
			# Set ROM version
			romVersion = int(data["name"][0 : 10])
			
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
			if connection.read(1) == '\r' :
			
				# Send address zero
				connection.write('A')
				connection.write('\x00')
				connection.write('\x00')

				# Check if address was acknowledged
				if connection.read(1) == '\r' :
				
					# Set pages to write
					pagesToWrite = len(encryptedRom) / 2 / self.chipPageSize
					if len(encryptedRom) / 2 % self.chipPageSize != 0 :
						pagesToWrite += 1

					#Go through all pages to write
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
						if connection.read(1) != '\r' :
						
							# Set error
							error = True
							break
				
						# Increment index
						index += 1
					
					# Check if chip was successfully flashed
					if error == False :
					
						# Send address zero
						connection.write('A')
						connection.write('\x00')
						connection.write('\x00')

						# Check if address was acknowledged
						if connection.read(1) == '\r' :
								
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
							
								# Request EEPROM
								connection.write('S')
		
								# Get response
								response = connection.read(0x301)
		
								# Check if EEPROM was read successfully
								if response[-1] == '\r' :
							
									# Get EEPROM CRC
									index = 0
									while index < 4 :
										eepromCrc <<= 8
										eepromCrc += int(ord(response[index + 4]))
										index += 1
								
									# Check if section needs to be zeroed out or previous firmware was corrupt
									if response[0x2E6] == '\x00' or oldChipCrc != eepromCrc :
									
										# Go through bytes of zero sections
										index = 0
										while index < 4 :

											# Check if zeroing out section in EEPROM failed
											if error == False and self.writeToEeprom(connection, 0x08 + index, '\x00') == False :
											
												# Set error
												error = True
										
											# Increment index
											index += 1
									
									# Go through bytes of zero sections
									index = 0
									while index < 16 :
									
										# Check if zeroing out section in EEPROM failed
										if error == False and self.writeToEeprom(connection, 0x2D6 + index, '\x00') == False :
										
											# Set error
											error = True
										
										# Increment index
										index += 1

									# Go through bytes of firmware version
									index = 0
									while index < 4 :
									
										# Check if updating firmware version in EEPROM failed
										if error == False and self.writeToEeprom(connection, index, chr((romVersion >> 8 * index) & 0xFF)) == False :
										
											# Set error
											error = True
										
										# Increment index
										index += 1

									# Go through bytes of firmware CRC
									index = 0
									while index < 4 :
									
										# Check if updating firmware CRC in EEPROM failed
										if error == False and self.writeToEeprom(connection, index + 4, chr((romCrc >> 8 * index) & 0xFF)) == False :
										
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
			
			# Close connection
			connection.close()
			
			# Enable printer callbacks
			self._printer.register_callback(self)
			
			# Re-connect
			self._printer.connect(port = currentPort, baudrate = currentBaudrate, profile = currentProfile)
			
			# Send response
			if error == True :
				return flask.jsonify(dict(value = "Error"))
			else :
				return flask.jsonify(dict(value = "Ok"))
	
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
		return connection.read(1) == '\r'
	
	# Process write
	def processWrite(self, data) :
	
		# Set write function back to original
		self._printer.get_transport().write = self.originalWrite
		
		# Check if request is emergency stop
		if "M65537" in data :
		
			# Set data
			data = "M0\n"
		
		# Check if request ends waiting
		if "M65536" in data :
			
			# Clear waiting response
			self.waitingResponse = None
			
			# Send fake acknowledgment
			self._printer.fake_ack()
		
		# Otherwise check if request is invalid
		elif data == "M110\n" or data == "M21\n" :
		
			# Send fake acknowledgment
			self._printer.fake_ack()
		
		# Send request
		else :
			
			# Check if command contains valid G-code
			gcode = Gcode()
			if gcode.parseLine(data) :
			
				# Get the command's binary representation
				data = gcode.getBinary()
		
				# Check if data contains a starting line number
				if gcode.getValue('N') == "0" and gcode.getValue('M') == "110" :
				
					# Reset number wrap counter
					self.numberWrapCounter = 0
			
			# Send command to printer
			self._printer.get_transport().write(data)
		
		# Set write function back to process write
		self._printer.get_transport().write = self.processWrite
	
	# Process read
	def processRead(self) :
	
		# Set read function back to original
		self._printer.get_transport().readline = self.originalRead
		
		# Get response
		response = self._printer.get_transport().readline()
		
		# Check if response was a processed value
		if response.startswith("ok ") == True and response[3].isdigit() == True :
			
			# Get line number
			lineNumber = int(response[3:])
		
			# Set response to contain correct line number
			response = "ok " + str(lineNumber + self.numberWrapCounter * 0x10000) + '\n'
			
			# Increment number wrap counter if applicable
			if lineNumber == 0xFFFF :
				self.numberWrapCounter += 1
		
		# Otherwise check if response was a skip value
		elif response.startswith("skip ") == True :
		
			# Get line number
			lineNumber = int(response[5:])
		
			# Set response to contain correct line number
			response = "ok " + str(lineNumber + self.numberWrapCounter * 0x10000) + '\n'
			
			# Increment number wrap counter if applicable
			if lineNumber == 0xFFFF :
				self.numberWrapCounter += 1
		
		# Otherwise check if response was a resend value
		elif response.startswith("Resend ") == True :
		
			# Set response to contain correct line number
			response = "Resend:" + str(int(response[7 :]) + self.numberWrapCounter * 0x10000) + '\n'
		
		# Otherwise check if response was an error code
		elif response.startswith("Error:") == True :
		
			# Set error response
			if response[6 : 10] == "1000" :
				response = "ok M110 without line number\n"
			elif response[6 : 10] == "1001" :
				response = "ok Cannot cold extrude\n"
			elif response[6 : 10] == "1002" :
				response = "ok Cannot calibrate in unknown state\n"
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
				response = "ok System has been inactive for to long, heater and motors have been turned off\n"
			elif response[6 : 10] == "1009" :
				response = "ok Target address out of range\n"
			else :
				response = "ok An error has occured\n"
			
			# Send error
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error:" + response[3 :]))
		
		# Set read function back to process read
		self._printer.get_transport().readline = self.processRead
		
		# Return response
		return response
	
	# Event monitor
	def on_event(self, event, payload):
		
		# Check if printer is disconnected
		if event == octoprint.events.Events.DISCONNECTED :
		
			# Clear invalid printer
			self.invalidPrinter = True
			
			# Clear original write and read
			self.originalWrite = None
			self.originalRead = None
			
			# Send printer status
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Micro 3D Not Connected"))
	
	# Receive data to log
	def on_printer_add_log(self, data) :
	
		# Check if connection was just established
		if data == "Send: M110" and self._printer.get_state_string() == "Connecting" :
		
			# Get current printer connection state
			currentState, currentPort, currentBaudrate, currentProfile = self._printer.get_current_connection()
			
			# Set current port
			if self.port != None :
				currentPort = self.port
			
			# Attempt to put printer into G-code processing mode
			self._printer.get_transport().write("Q")
			time.sleep(1)
			
			# Check if printer switched to G-code processing mode
			if self._printer.is_closed_or_error() :
			
				# Re-connect to printer
				self._printer.connect(port = currentPort, baudrate = currentBaudrate, profile = currentProfile)
		
		# Otherwise check if a Micro 3D is connected and it is in G-code processing mode but its read and write functions are not being intercepted
		elif data == "Recv: e1" and self.originalWrite == None :
		
			# Save original write and read functions
			self.originalWrite = self._printer.get_transport().write
			self.originalRead = self._printer.get_transport().readline
		
			# Overwrite write and read functions to process write and read functions
			self._printer.get_transport().write = self.processWrite
			self._printer.get_transport().readline = self.processRead
			
			# Clear invalid printer
			self.invalidPrinter = False
			
			# Request printer information
			self._printer.get_transport().write("M115\n")
		
		# Otherwise check if data contains printer information
		elif "MACHINE_TYPE:" in data :
		
			# Check if printer isn't a Micro 3D
			if "MACHINE_TYPE:The_Micro" not in data :
				
				# Set write and read functions back to original
				if self.originalWrite != None :
					self._printer.get_transport().write = self.originalWrite
					self._printer.get_transport().readline = self.originalRead
				
				# Set invalid printer
				self.invalidPrinter = True
			
			# Otherwise
			else :
				
				# Send printer status
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Micro 3D Connected"))
				
				# Get firmware version
				self.firmwareVersion = int(data[data.find("FIRMWARE_VERSION:") + 17 : data.find("FIRMWARE_VERSION:") + 27])
				
				# Check if firmware is incompatible
				if self.firmwareVersion < 2015071301 :
				
					# Send error
					self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error: Incompatible firmware"))
					# Return
					return
				
				# Request valid Z
				commandList = ["M117", "M114"]
				
				# Check if set to automatically collect printer settings
				if self._settings.get_boolean(["AutomaticSettingsUpdate"]) == True :
			
					# Request pre-processor dependant values
					commandList += ["M619 S0\n", "M619 S1\n", "M619 S7\n", "M619 S8\n", "M619 S16\n", "M619 S17\n", "M619 S18\n", "M619 S19\n", "M619 S22\n", "M619 S32\n"]
				
				# Send requests
				self._printer.commands(commandList)
		
		# Otherwise check if data contains valid Z information
		elif "ZV:" in data :
		
			# Send invalid Z
			if data[data.find("ZV:") + 3] == '0' :
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Error: Z is invalid"))
		
		# Otherwise check if data contains current Z
		elif "Z:" in data :
		
			# Send current Z
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Current Z", location = data[data.find("Z:") + 2 :]))
		
		# Otherwise check if data contains an EEPROM value
		elif "DT:" in data :
		
			# Check if data is for backlash X
			if "PT:0 " in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack('4B', *data)
				self._settings.set_float(["BacklashX"], round(struct.unpack('f', bytes)[0], 6))
			
			# Otherwise check if data is for backlash Y
			elif "PT:1 " in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack('4B', *data)
				self._settings.set_float(["BacklashY"], round(struct.unpack('f', bytes)[0], 6))
				
			# Otherwise check if data is for filament type
			elif "PT:7 " in data :
			
				# Convert data to value
				value = int(data[data.find("DT:") + 3 :])
				if value & 0x3F == 1 :
					filamentType = "ABS"
				elif value & 0x3F == 2 :
					filamentType = "PLA"
				elif value & 0x3F == 3 :
					filamentType = "HIPS"
				elif value & 0x3F == 4 :
					filamentType = "OTHER"
				else :
					filamentType = "NO_TYPE"
				self._settings.set(["FilamentType"], filamentType)
			
			# Otherwise check if data is for filament temperature
			elif "PT:8 " in data :
			
				# Convert data to value
				self._settings.set_int(["FilamentTemperature"], int(data[data.find("DT:") + 3 :]) + 100)
			
			# Otherwise check if data is for back left offset
			elif "PT:16 " in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack('4B', *data)
				self._settings.set_float(["BackLeftOffset"], round(struct.unpack('f', bytes)[0], 6))
			
			# Otherwise check if data is for back right offset
			elif "PT:17 " in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack('4B', *data)
				self._settings.set_float(["BackRightOffset"], round(struct.unpack('f', bytes)[0], 6))
			
			# Otherwise check if data is for front right offset
			elif "PT:18 " in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack('4B', *data)
				self._settings.set_float(["FrontRightOffset"], round(struct.unpack('f', bytes)[0], 6))
			
			# Otherwise check if data is for front left offset
			elif "PT:19 " in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack('4B', *data)
				self._settings.set_float(["FrontLeftOffset"], round(struct.unpack('f', bytes)[0], 6))
			
			# Otherwise check if data is for backlash speed
			elif "PT:22 " in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack('4B', *data)
				self._settings.set_float(["BacklashSpeed"], round(struct.unpack('f', bytes)[0], 6))
			
			# Otherwise check if data is for bed height offset
			elif "PT:32 " in data :
			
				# Convert data to float
				value = int(data[data.find("DT:") + 3 :])
				data = [value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF]
				bytes = struct.pack('4B', *data)
				self._settings.set_float(["BedHeightOffset"], round(struct.unpack('f', bytes)[0], 6))
	
	# Pre-process G-code
	def preprocessesGcode(self, path, file_object, links = None, printer_profile = None, allow_overwrite = True, *args, **kwargs) :
	
		# Check if file is not G-code
		if not octoprint.filemanager.valid_file_type(path, type = "gcode") :
		
			# Set processing slice
			if octoprint.filemanager.valid_file_type(path, type = "stl") :
				self.processingSlice = True

			# Return unmodified file
			return file_object
		
		# Create temporary file
		fd, temp = tempfile.mkstemp()
		
		# Copy file to temporary file
		for line in file_object.stream() :
			os.write(fd, line)
		os.close(fd)
		
		# Set progress bar percent
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "60"))
		
		# Use center model pre-processor if set
		if self._settings.get_boolean(["UseCenterModelPreprocessor"]) == True :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Centering model ..."))
			self.centerModelPreprocessor(temp)
		
		# Set progress bar percent
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "64"))
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Checking Dimensions ..."))
		
		# Check if print is out of bounds
		if self.getPrintInformation(temp) == False :
		
			# Check if processing a slice
			if self.processingSlice == True :
			
				# Clear processing slice
				self.processingSlice = False
			
				# Set progress bar percent and text
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "0"))
				
				# Create error message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Create error message", title = "Slicing failed", text = "Could not slice the file. The dimensions of the model go outside the bounds of the printer."))
			
			# Otherwise
			else :
		
				# Set error message
				self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Set error message", text = "Could not upload the file. The dimensions of the model go outside the bounds of the printer."))
			
			# Return false
			return False
		
		# Set values
		self.backlashX = self._settings.get_float(["BacklashX"])
		self.backlashY = self._settings.get_float(["BacklashY"])
		self.backlashSpeed = self._settings.get_float(["BacklashSpeed"])
		self.bedHeightOffset = self._settings.get_float(["BedHeightOffset"])
		self.backRightOffset = self._settings.get_float(["BackRightOffset"])
		self.backLeftOffset = self._settings.get_float(["BackLeftOffset"])
		self.frontLeftOffset = self._settings.get_float(["FrontLeftOffset"])
		self.frontRightOffset = self._settings.get_float(["FrontRightOffset"])
		self.filamentTemperature = self._settings.get_int(["FilamentTemperature"])
		self.filamentType = str(self._settings.get(["FilamentType"]))
		
		# Set progress bar percent
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "68"))
		
		# Use validation pre-processor if set
		if self._settings.get_boolean(["UseValidationPreprocessor"]) == True :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Validation ..."))
			self.validationPreprocessor(temp)
		
		# Set progress bar percent
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "72"))
		
		# Use preparation pre-processor if set
		if self._settings.get_boolean(["UsePreparationPreprocessor"]) == True :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Preparation ..."))
			self.preparationPreprocessor(temp)
		
		# Set progress bar percent
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "76"))
		
		# Use wave bonding pre-processor if set
		if self._settings.get_boolean(["UseWaveBondingPreprocessor"]) == True :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Wave Bonding ..."))
			self.waveBondingPreprocessor(temp)
		
		# Set progress bar percent
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "80"))
		
		# Use thermal bonding pre-processor if set
		if self._settings.get_boolean(["UseThermalBondingPreprocessor"]) == True :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Thermal Bonding ..."))
			self.thermalBondingPreprocessor(temp)
		
		# Set progress bar percent
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "85"))
		
		# Use bed compensation pre-processor if set
		if self._settings.get_boolean(["UseBedCompensationPreprocessor"]) == True :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Bed Compensation ..."))
			self.bedCompensationPreprocessor(temp)
		
		# Set progress bar percent
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "90"))
		
		# Use backlash compensation pre-processor if set
		if self._settings.get_boolean(["UseBacklashCompensationPreprocessor"]) == True :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Backlash Compensation ..."))
			self.backlashCompensationPreprocessor(temp)
		
		# Set progress bar percent
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "95"))
		
		# Use feed rate conversion pre-processor if set
		if self._settings.get_boolean(["UseFeedRateConversionPreprocessor"]) == True :
			self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar text", text = "Feed Rate Conversion ..."))
			self.feedRateConversionPreprocessor(temp)
		
		# Set progress bar percent
		self._plugin_manager.send_plugin_message(self._identifier, dict(value = "Progress bar percent", percent = "100"))
		
		# Return processed G-code
		return octoprint.filemanager.util.DiskFileWrapper(os.path.basename(temp), temp)
	
	# Center model pre-processor
	def centerModelPreprocessor(self, file) :
	
		# Initialize variables
		localX = 54
		localY = 60
		relativeMode = False
		gcode = Gcode()
		
		# Reset X and Y print values
		self.maxXExtruder = 0
		self.maxYExtruder = 0
		self.minXExtruder = sys.float_info.max
		self.minYExtruder = sys.float_info.max
		
		# Read in file
		for line in open(file) :

			# Check if line was parsed successfully and it's a G command
			gcode.clear()
			if gcode.parseLine(line) == True and gcode.hasValue('G') == True :
			
				# Check if command is G0 or G1
				if gcode.getValue('G') == "0" or gcode.getValue('G') == "1" :
				
					# Check if command has an X value
					if gcode.hasValue('X') == True :
					
						# Get X value of the command
						commandX = float(gcode.getValue('X'))
					
						# Set local X
						if relativeMode :
							localX += commandX
						else :
							localX = commandX
					
					# Check if command has an Y value
					if gcode.hasValue('Y') == True :
					
						# Get Y value of the command
						commandY = float(gcode.getValue('Y'))
					
						# Set local Y
						if relativeMode :
							localY += commandY
						else :
							localY = commandY
				
					# Update minimums and maximums X and Y dimensions of extruder
					self.minXExtruder = min(self.minXExtruder, localX)
					self.maxXExtruder = max(self.maxXExtruder, localX)
					self.minYExtruder = min(self.minYExtruder, localY)
					self.maxYExtruder = max(self.maxYExtruder, localY)
				
				# Otherwise check if command is G90
				elif gcode.getValue('G') == "90" :
				
					# Clear relative mode
					relativeMode = False
				
				# Otherwise check if command is G91
				elif gcode.getValue('G') == "91" :
				
					# Set relative mode
					relativeMode = True
	
		# Move the input file to a temporary file
		temp = tempfile.mkstemp()[1]
		os.rename(file, temp)
		
		# Create ouput file in place of the input file
		output = os.open(file, os.O_WRONLY | os.O_CREAT)
		
		# Calculate adjustments
		displacementX = (max(self.bedLowMaxX, max(self.bedMediumMaxX, self.bedHighMaxX)) - self.maxXExtruder - self.minXExtruder + min(self.bedLowMinX, min(self.bedMediumMinX, self.bedHighMinX))) / 2
		displacementY = (max(self.bedLowMaxY, max(self.bedMediumMaxY, self.bedHighMaxY)) - self.maxYExtruder - self.minYExtruder + min(self.bedLowMinY, min(self.bedMediumMinY, self.bedHighMinY))) / 2
		
		# Read in input file
		for line in open(temp) :
		
			# Check if line was parsed successfully and it's G0 or G1
			gcode.clear()
			if gcode.parseLine(line) == True and gcode.hasValue('G') == True and (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") :
				
				# Check if line contains an X value
				if gcode.hasValue('X') == True :
				
					# Adjust X value
					gcode.setValue('X', str(float(gcode.getValue('X')) + displacementX))
				
				# Check if line contains a Y value
				if gcode.hasValue('Y') == True :
				
					# Adjust Y value
					gcode.setValue('Y', str(float(gcode.getValue('Y')) + displacementY))
				
				# Set line to adjusted value
				line = gcode.getAscii() + '\n'
			
			# Send line to output
			os.write(output, line)
		
		# Close output file
		os.close(output)
		
		# Remove temporary file
		os.remove(temp)
	
	# Get print information
	def getPrintInformation(self, file) :
	
		# Initialize variables
		localX = 54
		localY = 60
		localZ = 0.4
		localE = 0
		relativeMode = False
		tier = "Low"
		gcode = Gcode()
		
		# Reset all print values
		self.maxXModel = 0
		self.maxYModel = 0
		self.maxZModel = 0
		self.maxXExtruder = 0
		self.maxYExtruder = 0
		self.maxZExtruder = 0
		self.maxFeedRate = 0
		self.minXModel = sys.float_info.max
		self.minYModel = sys.float_info.max
		self.minZModel = sys.float_info.max
		self.minXExtruder = sys.float_info.max
		self.minYExtruder = sys.float_info.max
		self.minZExtruder = sys.float_info.max
		self.minFeedRate = sys.float_info.max
		
		# Read in file
		for line in open(file) :

			# Check if line was parsed successfully and it's a G command
			gcode.clear()
			if gcode.parseLine(line) == True and gcode.hasValue('G') == True :
			
				# Check if command is G0 or G1
				if gcode.getValue('G') == "0" or gcode.getValue('G') == "1" :
				
					# Clear positive extruding
					positiveExtrusion = False
				
					# Check if command has an E value
					if gcode.hasValue('E') == True :
				
						# Get E value of the command
						commandE = float(gcode.getValue('E'))
					
						# Set positive extrusion based on adjusted E value
						if relativeMode == True :
							positiveExtrusion = commandE > 0
							localE += commandE
					
						else :
							positiveExtrusion = commandE > localE
							localE = commandE
				
					# Check if command has a F value
					if gcode.hasValue('F') == True :
				
						# Get F value of the command
						commandF = float(gcode.getValue('F'))
				
						# Update minimum and maximum feed rate values
						self.minFeedRate = min(self.minFeedRate, commandF)
						self.maxFeedRate = max(self.maxFeedRate, commandF)
				
					# Check if command has an X value
					if gcode.hasValue('X') == True :
					
						# Get X value of the command
						commandX = float(gcode.getValue('X'))
					
						# Set local X
						if relativeMode :
							localX += commandX
						else :
							localX = commandX
					
					# Check if command has an Y value
					if gcode.hasValue('Y') == True :
					
						# Get Y value of the command
						commandY = float(gcode.getValue('Y'))
					
						# Set local Y
						if relativeMode :
							localY += commandY
						else :
							localY = commandY
				
					# Check if command has an Z value
					if gcode.hasValue('Z') == True :
					
						# Get Z value of the command
						commandZ = float(gcode.getValue('Z'))
					
						# Set local Z
						if relativeMode :
							localZ += commandZ
						else :
							localZ = commandZ
					
						# Check if Z is out of bounds
						if localZ < self.bedLowMinZ or localZ > self.bedHighMaxZ :
						
							# Return false
							return False
					
						# Set print tier
						if localZ >= self.bedLowMinZ and localZ < self.bedLowMaxZ :
							tier = "Low"
						
						elif localZ >= self.bedMediumMinZ and localZ < self.bedMediumMaxZ :
							tier = "Medium"
						
						elif localZ >= self.bedHighMinZ and localZ <= self.bedHighMaxZ :
							tier = "High"
					
					# Return false if X or Y are out of bounds				
					if tier == "Low" and (localX < self.bedLowMinX or localX > self.bedLowMaxX or localY < self.bedLowMinY or localY > self.bedLowMaxY) :
						return False
					
					elif tier == "Medium" and (localX < self.bedMediumMinX or localX > self.bedMediumMaxX or localY < self.bedMediumMinY or localY > self.bedMediumMaxY) :
						return False

					elif tier == "High" and (localX < self.bedHighMinX or localX > self.bedHighMaxX or localY < self.bedHighMinY or localY > self.bedHighMaxY) :
						return False
					
					# Check if positive extruding
					if positiveExtrusion :
				
						# Update minimums and maximums dimensions of the model
						self.minXModel = min(self.minXModel, localX)
						self.maxXModel = max(self.maxXModel, localX)
						self.minYModel = min(self.minYModel, localY)
						self.maxYModel = max(self.maxYModel, localY)
						self.minZModel = min(self.minZModel, localZ)
						self.maxZModel = max(self.maxZModel, localZ)
				
					# Update minimums and maximums dimensions of extruder
					self.minXExtruder = min(self.minXExtruder, localX)
					self.maxXExtruder = max(self.maxXExtruder, localX)
					self.minYExtruder = min(self.minYExtruder, localY)
					self.maxYExtruder = max(self.maxYExtruder, localY)
					self.minZExtruder = min(self.minZExtruder, localZ)
					self.maxZExtruder = max(self.maxZExtruder, localZ)
				
				# Otherwise check if command is G90
				elif gcode.getValue('G') == "90" :
				
					# Clear relative mode
					relativeMode = False
				
				# Otherwise check if command is G91
				elif gcode.getValue('G') == "91" :
				
					# Set relative mode
					relativeMode = True
		
		# Return true
		return True
	
	# Get bounded temperature
	def getBoundedTemperature(self, value) :
	
		# Return temperature in bounded range
		return min(max(value, 150), 285)
	
	# Get distance
	def getDistance(self, firstPoint, secondPoint) :

		# Get first point coordinates
		if firstPoint.hasValue('X') == True :
			firstX = float(firstPoint.getValue('X'))
		else :
			firstX = 0
		
		if firstPoint.hasValue('Y') == True :
			firstY = float(firstPoint.getValue('Y'))
		else :
			firstY = 0
		
		# Get second point coordinates
		if secondPoint.hasValue('X') == True :
			secondX = float(secondPoint.getValue('X'))
		else :
			secondX = 0
		
		if secondPoint.hasValue('Y') == True :
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
			gcode.setValue('G', "4")
			gcode.setValue('P', str(time))
	
		# Return G-code
		return gcode
	
	# Is sharp corner
	def isSharpCorner(self, point, refrence) :

		# Get point coordinates
		if point.hasValue('X') == True :
			currentX = float(point.getValue('X'))
		else :
			currentX = 0
		
		if point.hasValue('Y') == True :
			currentY = float(point.getValue('Y'))
		else :
			currentY = 0
		
		# Get refrence coordinates
		if refrence.hasValue('X') == True :
			previousX = float(refrence.getValue('X'))
		else :
			previousX = 0
		
		if refrence.hasValue('Y') == True :
			previousY = float(refrence.getValue('Y'))
		else :
			previousY = 0
		
		# Calculate value
		if (currentX == 0 and currentY == 0) or (previousX == 0 and previousY == 0) :
			value = math.acos(0)
		else :
			value = math.acos((currentX * previousX + currentY * previousY) / (math.pow(currentX * currentX + currentY * currentY, 2) * math.pow(previousX * previousX + previousY * previousY, 2)))
		
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
	
	# Get height adjustment required
	def getHeightAdjustmentRequired(self, valueX, valueY) :

		# Initialize variables
		left = (self.backLeftOffset - self.frontLeftOffset) / self.levellingMoveY
		right = (self.backRightOffset - self.frontRightOffset) / self.levellingMoveY
	
		# Return height adjustment
		return (right * valueY + self.frontRightOffset - (left * valueY + self.frontLeftOffset)) / self.levellingMoveX * valueX + (left * valueY + self.frontLeftOffset)
	
	# Validation pre-processor
	def validationPreprocessor(self, file) :
	
		# Initialize variables
		gcode = Gcode()
	
		# Move the input file to a temporary file
		temp = tempfile.mkstemp()[1]
		os.rename(file, temp)
		
		# Create ouput file in place of the input file
		output = os.open(file, os.O_WRONLY | os.O_CREAT)
		
		# Read in input file
		for line in open(temp) :
			
			# Check if line contains valid G-code
			gcode.clear()
			if gcode.parseLine(line) == True :
			
				# Check if command isn't valid for the printer
				if gcode.hasValue('M') == True and (gcode.getValue('M') == "82" or gcode.getValue('M') == "83") :
			
					# Get next line
					continue
			
				# Check if command contains tool selection
				if gcode.hasParameter('T') == True :
			
					# Remove tool selection
					gcode.removeParameter('T')
				
				# Set line to adjusted value
				line = gcode.getAscii() + '\n'
			
			# Send line to output
			os.write(output, line)
		
		# Close output file
		os.close(output)
		
		# Remove temporary file
		os.remove(temp)
	
	# Preparation pre-processor
	def preparationPreprocessor(self, file, cornerExcess = True) :
	
		# Initialize variables
		gcode = Gcode()
		cornerX = 0
		cornerY = 0
	
		# Move the input file to a temporary file
		temp = tempfile.mkstemp()[1]
		os.rename(file, temp)
		
		# Create ouput file in place of the input file
		output = os.open(file, os.O_WRONLY | os.O_CREAT)
		
		# Check if leaving excess at corner
		if cornerExcess == True :
		
			# Set corner X
			if self.maxXExtruder < self.bedLowMaxX :
				cornerX = (self.bedLowMaxX - self.bedLowMinX) / 2
			elif self.minXExtruder > self.bedLowMinX :
				cornerX = -(self.bedLowMaxX - self.bedLowMinX) / 2
		
			# Set corner Y
			if self.maxYExtruder < self.bedLowMaxY :
				cornerY = (self.bedLowMaxY - self.bedLowMinY - 10) / 2
			elif self.minYExtruder > self.bedLowMinY :
				cornerY = -(self.bedLowMaxY - self.bedLowMinY - 10) / 2
		
		# Add intro to output
		if self.filamentType == "PLA" :
			os.write(output, "M106 S255\n")
		else :
			os.write(output, "M106 S50\n")
		os.write(output, "M17\n")
		os.write(output, "G90\n")
		os.write(output, "M104 S" + str(self.filamentTemperature) + '\n')
		os.write(output, "G0 Z5 F2900\n")
		os.write(output, "G28\n")
		
		# Check if one of the corners wasn't set
		if cornerX == 0 or cornerY == 0 :
		
			# Prepare extruder the standard way
			os.write(output, "M18\n")
			os.write(output, "M109 S" + str(self.filamentTemperature) + '\n')
			os.write(output, "G4 S2\n")
			os.write(output, "M17\n")
			os.write(output, "G91\n")
		
		# Otherwise
		else :
		
			# Prepare extruder by leaving excess at corner
			os.write(output, "G91\n")
			os.write(output, "G0 X" + str(-cornerX) + " Y" + str(-cornerY) + " F2900\n")
			os.write(output, "M18\n")
			os.write(output, "M109 S" + str(self.filamentTemperature) + '\n')
			os.write(output, "M17\n")
			os.write(output, "G0 Z-4 F2900\n")
			os.write(output, "G0 E7.5 F2000\n")
			os.write(output, "G4 S3\n")
			os.write(output, "G0 X" + str(cornerX * 0.1) + " Y" + str(cornerY * 0.1) +" Z-0.999 F2900\n")
			os.write(output, "G0 X" + str(cornerX * 0.9) + " Y" + str(cornerY * 0.9) +" F1000\n")
		os.write(output, "G92 E0\n")
		os.write(output, "G90\n")
		os.write(output, "G0 Z0.4 F2400\n")
		
		# Read in input file
		for line in open(temp) :
			
			# Send line to output
			os.write(output, line)
		
		# Add outro to output
		os.write(output, "G91\n")
		os.write(output, "G0 E-1 F2000\n")
		os.write(output, "G0 X5 Y5 F2000\n")
		os.write(output, "G0 E-8 F2000\n")
		os.write(output, "M104 S0\n")
		if self.maxZExtruder > 60 :
			if self.maxZExtruder < 110 :
				os.write(output, "G0 Z3 F2900\n")
			os.write(output, "G90\n")
			os.write(output, "G0 X90 Y84\n")
		else :
			os.write(output, "G0 Z3 F2900\n")
			os.write(output, "G90\n")
			os.write(output, "G0 X95 Y95\n")
		os.write(output, "M18\n")
		os.write(output, "M107\n")
		
		# Close output file
		os.close(output)
		
		# Remove temporary file
		os.remove(temp)
	
	# Wave bonding pre-processor
	def waveBondingPreprocessor(self, file) :
	
		# Initialize variables
		relativeMode = False
		firstLayer = True
		changesPlane = False
		cornerCounter = 0
		baseLayer = 0
		positionRelativeX = 0
		positionRelativeY = 0
		positionRelativeZ = 0
		positionRelativeE = 0
		gcode = Gcode()
		previousGcode = Gcode()
		refrenceGcode = Gcode()
		tackPoint = Gcode()
		extraGcode = Gcode()
	
		# Move the input file to a temporary file
		temp = tempfile.mkstemp()[1]
		os.rename(file, temp)
		
		# Create ouput file in place of the input file
		output = os.open(file, os.O_WRONLY | os.O_CREAT)
		
		# Read in input file
		for line in open(temp) :
		
			# Check if line is a layer command
			if line.find(";LAYER:") != -1 :
			
				# Set layer number
				layerNumber = int(line[7 :])
				
				# Set base number is layer number is less than it
				if layerNumber < baseLayer :
					baseLayer = layerNumber
				
				# Set first layer
				firstLayer = layerNumber == baseLayer
			
			# Check if line was parsed successfully and it's a G command
			gcode.clear()
			if gcode.parseLine(line) == True and gcode.hasValue('G') == True :
			
				# Check if command is G0 or G1 and it's in absolute mode
				if (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") and relativeMode == False :
				
					# Check if line contains an X or Y value
					if gcode.hasValue('X') == True or gcode.hasValue('Y') == True :
				
						# Set changes plane
						changesPlane = True
					
					# Set delta values
					if gcode.hasValue('X') == True :
						deltaX = float(gcode.getValue('X')) - positionRelativeX
					else :
						deltaX = 0
					
					if gcode.hasValue('Y') == True :
						deltaY = float(gcode.getValue('Y')) - positionRelativeY
					else :
						deltaY = 0
					
					if gcode.hasValue('Z') == True :
						deltaZ = float(gcode.getValue('Z')) - positionRelativeZ
					else :
						deltaZ = 0
						
					if gcode.hasValue('E') == True :
						deltaE = float(gcode.getValue('E')) - positionRelativeE
					else :
						deltaE = 0
				
					# Adjust relative values for the changes
					positionRelativeX += deltaX
					positionRelativeY += deltaY
					positionRelativeZ += deltaZ
					positionRelativeE += deltaE
				
					# Calculate distance of change
					distance = math.sqrt(deltaX * deltaX + deltaY * deltaY)
					
					# Set wave ratio
					if distance > self.wavePeriodQuarter :
						waveRatio = int(distance / self.wavePeriodQuarter)
					else :
						waveRatio = 1
					
					# Set relative differences
					relativeDifferenceX = positionRelativeX - deltaX
					relativeDifferenceY = positionRelativeY - deltaY
					relativeDifferenceZ = positionRelativeZ - deltaZ
					relativeDifferenceE = positionRelativeE - deltaE
				
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
					
					# Check if in first layer and delta E is greater than zero 
					if firstLayer == True and deltaE > 0 :
				
						# Check if previous G-code is not empty
						if previousGcode.isEmpty() == False :
					
							# Check if corner count is at most one and sharp corner
							if cornerCounter <= 1 and self.isSharpCorner(gcode, previousGcode) == True :
						
								# Check if refrence G-codes isn't set
								if refrenceGcode.isEmpty() == True :
							
									# Check if a tack point was created
									tackPoint.clear()
									tackPoint = self.createTackPoint(gcode, previousGcode)
									if tackPoint.isEmpty() == False :
								
										# Send tack point to output
										os.write(output, tackPoint.getAscii() + '\n')
							
								# Set refrence G-code
								refrenceGcode = copy.deepcopy(gcode)
							
								# Increment corner counter
								cornerCounter += 1
						
							# Otherwise check is corner count is at least one and sharp corner
							elif cornerCounter >= 1 and self.isSharpCorner(gcode, refrenceGcode) == True :
						
								# Check if a tack point was created
								tackPoint.clear()
								tackPoint = self.createTackPoint(gcode, refrenceGcode)
								if tackPoint.isEmpty() == False :
							
									# Send tack point to output
									os.write(output, tackPoint.getAscii() + '\n')
							
								# Set refrence G-code
								refrenceGcode = copy.deepcopy(gcode)
					
						# Go through all of the wave
						index = 1
						while index <= waveRatio :
					
							# Check if at last component
							if index == waveRatio :
						
								# Set temp relative values
								tempRelativeX = positionRelativeX
								tempRelativeY = positionRelativeY
								tempRelativeZ = positionRelativeZ
								tempRelativeE = positionRelativeE
						
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
								extraGcode.clear()
								extraGcode.setValue('G', gcode.getValue('G'))
							
								# Set extra G-code X value
								if gcode.hasValue('X') == True :
									extraGcode.setValue('X', str(positionRelativeX - deltaX + tempRelativeX - relativeDifferenceX))
							
								# Set extra G-cdoe Y value
								if gcode.hasValue('Y') == True :
									extraGcode.setValue('Y', str(positionRelativeY - deltaY + tempRelativeY - relativeDifferenceY))
							
								# Set extra G-code F value if first element
								if gcode.hasValue('F') == True and index == 1 :
									extraGcode.setValue('F', gcode.getValue('F'))
							
								# Check if plane changed
								if changesPlane == True :
							
									# Set extra G-code Z value
									extraGcode.setValue('Z', str(positionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ + self.getCurrentAdjustmentZ()))
							
								# Otherwise check if command has a Z value and changes in Z are noticable
								elif gcode.hasValue('Z') == True and deltaZ != sys.float_info.epsilon :
							
									# Set extra G-code Z value
									extraGcode.setValue('Z', str(positionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ))
								
								# Set extra G-code E value
								extraGcode.setValue('E', str(positionRelativeE - deltaE + tempRelativeE - relativeDifferenceE))
								
								# Send extra G-code to output
								os.write(output, extraGcode.getAscii() + '\n')
						
							# Otherwise check if plane changed
							elif changesPlane == True :
						
								# Check if command has a Z value
								if gcode.hasValue('Z') == True :
							
									# Add to command's Z value
									gcode.setValue('Z', str(float(gcode.getValue('Z')) + self.getCurrentAdjustmentZ()))
							
								# Otherwise
								else :
							
									# Set command's Z value
									gcode.setValue('Z', str(relativeDifferenceZ + deltaZ + self.getCurrentAdjustmentZ()))
							
							# Increment index
							index += 1
				
					# Set previous G-code
					previousGcode = copy.deepcopy(gcode)
				
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
					if gcode.hasValue('X') == False and gcode.hasValue('Y')  == False and gcode.hasValue('Z') == False and gcode.hasValue('E') == False :
			
						# Set command values to zero
						gcode.setValue('X', "0")
						gcode.setValue('Y', "0")
						gcode.setValue('Z', "0")
						gcode.setValue('E', "0")
			
					# Otherwise
					else :
			
						# Set relative positions
						if gcode.hasValue('X') == True :
							positionRelativeX = float(gcode.getValue('X'))
						
						if gcode.hasValue('Y') == True :
							positionRelativeY = float(gcode.getValue('Y'))
						
						if gcode.hasValue('Z') == True :
							positionRelativeZ = float(gcode.getValue('Z'))
					
						if gcode.hasValue('E') == True :
							positionRelativeE = float(gcode.getValue('E'))
				
				# Set line to adjusted value
				line = gcode.getAscii() + '\n'
			
			# Send line to output
			os.write(output, line)
		
		# Close output file
		os.close(output)
		
		# Remove temporary file
		os.remove(temp)
	
	# Thermal bonding pre-processor
	def thermalBondingPreprocessor(self, file) :
	
		# Initialize variables
		layerCounter = 0
		cornerCounter = 0
		addingTemperatureCommands = False
		relativeMode = False
		gcode = Gcode()
		previousGcode = Gcode()
		refrenceGcode = Gcode()
		tackPoint = Gcode()
		
		# Move the input file to a temporary file
		temp = tempfile.mkstemp()[1]
		os.rename(file, temp)
		
		# Create ouput file in place of the input file
		output = os.open(file, os.O_WRONLY | os.O_CREAT)
		
		# Read in input file
		for line in open(temp) :
		
			# Check if line is a layer command
			if line.find(";LAYER:") != -1 :
			
				# Set layer number
				layerNumber = int(line[7 :])
			
				# Check if on first counted layer
				if layerCounter == 0 :
				
					# Check if filament type is PLA
					if self.filamentType == "PLA" :
				
						# Send temperature command to output
						os.write(output, "M109 S" + str(self.getBoundedTemperature(self.filamentTemperature + 10)) + '\n')
					
					# Otherwise
					else :
					
						# Send temperature command to output
						os.write(output, "M109 S" + str(self.getBoundedTemperature(self.filamentTemperature + 15)) + '\n')
					
					# Set adding temperature commands
					addingTemperatureCommands = True
			
				# Otherwise check if on second counted layer
				elif layerCounter == 1 :
			
					# Check if filament type is PLA
					if self.filamentType == "PLA" :
				
						# Send temperature command to output
						os.write(output, "M109 S" + str(self.getBoundedTemperature(self.filamentTemperature + 5)) + '\n')
					
					# Otherwise
					else :
					
						# Send temperature command to output
						os.write(output, "M109 S" + str(self.getBoundedTemperature(self.filamentTemperature + 10)) + '\n')
				
				# Otherwise check if past the second counted layer, layer number is at least zero, and adding temperature commands
				elif layerCounter > 1 and layerNumber >= 0 and addingTemperatureCommands == True :
				
					# Send temperature command to output
					os.write(output, "M109 S" + str(self.filamentTemperature) + '\n')
				
					# Clear adding temperature commands
					addingTemperatureCommands = False
				
				# Increment layer counter
				layerCounter += 1
			
			# Check if line was parsed successfully
			gcode.clear()
			if gcode.parseLine(line) == True :
			
				# Check if command contains temperature or fan controls past the first layer
				if layerCounter > 0 and gcode.hasValue('M') == True and (gcode.getValue('M') == "104" or gcode.getValue('M') == "105" or gcode.getValue('M') == "106" or gcode.getValue('M') == "107" or gcode.getValue('M') == "109") :
			
					# Get next line
					continue
			
				# Check if line is a G command and wave bonding isn't being used
				if gcode.hasValue('G') == True and self._settings.get_boolean(["UseWaveBondingPreprocessor"]) != True :
			
					# Check if command is G0 or G1 and and it's in absolute
					if (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") and relativeMode == False :
				
						# Check if previous command exists, adding temperature commands, and filament is ABS, HIPS, or PLA
						if previousGcode.isEmpty() == False and addingTemperatureCommands == True and (self.filamentType == "ABS" or self.filamentType == "HIPS" or self.filamentType == "PLA") :
					
							# Check if both counters are less than or equal to one
							if cornerCounter <= 1 and layerCounter <= 1 :
						
								# Check if sharp corner
								if self.isSharpCorner(gcode, previousGcode) == True :
							
									# Check if refrence G-codes isn't set
									if refrenceGcode.isEmpty() == True :
								
										# Check if a tack point was created
										tackPoint.clear()
										tackPoint = self.createTackPoint(gcode, previousGcode)
										if tackPoint.isEmpty() == False :
									
											# Send tack point to output
											os.write(output, tackPoint.getAscii() + '\n')
								
									# Set refrence G-code
									refrenceGcode = copy.deepcopy(gcode)
								
									# Increment corner count
									cornerCounter += 1
						
							# Otherwise check if corner counter is greater than one but layer counter isn't and sharp corner
							elif cornerCounter >= 1 and layerCounter <= 1 and self.isSharpCorner(gcode, refrenceGcode) == True :
						
								# Check if a tack point was created
								tackPoint.clear()
								tackPoint = self.createTackPoint(gcode, refrenceGcode)
								if tackPoint.isEmpty() == False :
							
									# Send tack point to output
									os.write(output, tackPoint.getAscii() + '\n')
							
								# Set refrence G-code
								refrenceGcode = copy.deepcopy(gcode)
				
					# Otherwise check if command is G90
					elif gcode.getValue('G') == "90" :
				
						# Clear relative mode
						relativeMode = False
				
					# Otherwise check if command is G91
					elif gcode.getValue('G') == "91" :
				
						# Set relative mode
						relativeMode = True
				
					# Set line to adjusted value
					line = gcode.getAscii() + '\n'
			
				# Set previous G-code
				previousGcode = copy.deepcopy(gcode)
			
			# Send line to output
			os.write(output, line)
		
		# Close output file
		os.close(output)
		
		# Remove temporary file
		os.remove(temp)
	
	# Bed compensation pre-processor
	def bedCompensationPreprocessor(self, file) :
	
		# Initialize variables
		relativeMode = False
		changesPlane = False
		hasExtruded = False
		addCommand = False
		positionAbsoluteX = 0
		positionAbsoluteY = 0
		positionRelativeX = 0
		positionRelativeY = 0
		positionRelativeZ = 0
		positionRelativeE = 0
		gcode = Gcode()
		extraGcode = Gcode()
	
		# Move the input file to a temporary file
		temp = tempfile.mkstemp()[1]
		os.rename(file, temp)
		
		# Create ouput file in place of the input file
		output = os.open(file, os.O_WRONLY | os.O_CREAT)
		
		# Read in input file
		for line in open(temp) :
			
			# Check if line was parsed successfully and it's a G command
			gcode.clear()
			if gcode.parseLine(line) == True and gcode.hasValue('G') == True :
			
				# Check if command is G0 or G1 and it's in absolute mode
				if (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") and relativeMode == False :
				
					# Check if command has an X or Y value
					if gcode.hasValue('X') == True or gcode.hasValue('Y') == True :
			
						# Set changes plane
						changesPlane = True
			
					# Check if command contains a Z value
					if gcode.hasValue('Z') == True :
			
						# Add to command's Z value
						gcode.setValue('Z', str(float(gcode.getValue('Z')) + self.bedHeightOffset))
					
					# Set delta values
					if gcode.hasValue('X') == True :
						deltaX = float(gcode.getValue('X')) - positionRelativeX
					else :
						deltaX = 0
					
					if gcode.hasValue('Y') == True :
						deltaY = float(gcode.getValue('Y')) - positionRelativeY
					else :
						deltaY = 0
					
					if gcode.hasValue('Z') == True :
						deltaZ = float(gcode.getValue('Z')) - positionRelativeZ
					else :
						deltaZ = 0
						
					if gcode.hasValue('E') == True :
						deltaE = float(gcode.getValue('E')) - positionRelativeE
					else :
						deltaE = 0
					
					# Adjust position absolute and relative values for the changes
					positionAbsoluteX += deltaX
					positionAbsoluteY += deltaY
					positionRelativeX += deltaX
					positionRelativeY += deltaY
					positionRelativeZ += deltaZ
					positionRelativeE += deltaE
					
					# Calculate distance
					distance = math.sqrt(deltaX * deltaX + deltaY * deltaY)
			
					# Set segment counter
					if distance > self.segmentLength :
						segmentCounter = int(distance / self.segmentLength)
					else :
						segmentCounter = 1
					
					# Set absolute and relative differences
					absoluteDifferenceX = positionAbsoluteX - deltaX
					absoluteDifferenceY = positionAbsoluteY - deltaY
					relativeDifferenceX = positionRelativeX - deltaX
					relativeDifferenceY = positionRelativeY - deltaY
					relativeDifferenceZ = positionRelativeZ - deltaZ
					relativeDifferenceE = positionRelativeE - deltaE
			
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
			
					# Check if change in E is greater than 0
					if deltaE > 0 :
			
						# Set add command
						addCommand = hasExtruded == False
				
						# Set has extruded
						hasExtruded = True
			
					# Check if add command
					if addCommand :
			
						# Set extra G-code
						extraGcode.clear()
						extraGcode.setValue('G', "0")
						extraGcode.setValue('E', "0")
				
						# Send extra G-code to output
						os.write(output, extraGcode.getAscii() + '\n')
			
					# Check if change in E is greater than zero
					if deltaE > 0 :
			
						# Go through all segments
						index = 1
						while index <= segmentCounter :
			
							# Check if at last segment
							if index == segmentCounter :
				
								# Set temp values
								tempAbsoluteX = positionAbsoluteX
								tempAbsoluteY = positionAbsoluteY
								tempRelativeX = positionRelativeX
								tempRelativeY = positionRelativeY
								tempRelativeZ = positionRelativeZ
								tempRelativeE = positionRelativeE
							
							# Otherwise
							else :
				
								# Set temp values
								tempAbsoluteX = absoluteDifferenceX + index * self.segmentLength * deltaRatioX
								tempAbsoluteY = absoluteDifferenceY + index * self.segmentLength * deltaRatioY
								tempRelativeX = relativeDifferenceX + index * self.segmentLength * deltaRatioX
								tempRelativeY = relativeDifferenceY + index * self.segmentLength * deltaRatioY
								tempRelativeZ = relativeDifferenceZ + index * self.segmentLength * deltaRatioZ
								tempRelativeE = relativeDifferenceE + index * self.segmentLength * deltaRatioE
					
							# Set height adjustment
							heightAdjustment = self.getHeightAdjustmentRequired(tempAbsoluteX, tempAbsoluteY)
							
							# Store adjustment
							storedAdjustment = heightAdjustment
					
							# Check if not at last segment
							if index != segmentCounter :
					
								# Set extra G-code
								extraGcode.clear()
								extraGcode.setValue('G', gcode.getValue('G'))
						
								# Check if command has an X value
								if gcode.hasValue('X') == True :
						
									# Set extra G-code X value
									extraGcode.setValue('X', str(positionRelativeX - deltaX + tempRelativeX - relativeDifferenceX))
							
								# Check if command has a Y value
								if gcode.hasValue('Y') == True :
						
									# Set extra G-code Y value
									extraGcode.setValue('Y', str(positionRelativeY - deltaY + tempRelativeY - relativeDifferenceY))
						
								# Check if command has F value and in first element
								if gcode.hasValue('F') == True and index == 1 :
						
									# Set extra G-code F value
									extraGcode.setValue('F', gcode.getValue('F'))
						
								# Check if the plane changed
								if changesPlane == True :
						
									# Set extra G-code Z value
									extraGcode.setValue('Z', str(positionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ + storedAdjustment))
						
								# Otherwise check if command has a Z value and the change in Z in noticable
								elif gcode.hasValue('Z') == True and deltaZ != sys.float_info.epsilon :
						
									# Set extra G-code Z value
									extraGcode.setValue('Z', str(positionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ))
						
								# Set extra G-gode E value
								extraGcode.setValue('E', str(positionRelativeE - deltaE + tempRelativeE - relativeDifferenceE))
								
								# Send extra G-code to output
								os.write(output, extraGcode.getAscii() + '\n')
					
							# Otherwise
							else :
					
								# Check if the plane changed
								if changesPlane == True :
						
									# Check if command has a Z value
									if gcode.hasValue('Z') == True :
							
										# Add value to command Z value
										gcode.setValue('Z', str(float(gcode.getValue('Z')) + storedAdjustment))
							
									# Otherwise
									else :
							
										# Set command Z value
										gcode.setValue('Z', str(relativeDifferenceZ + deltaZ + storedAdjustment))
							
							# Increment index
							index += 1
			
					# Otherwise
					else :
			
						# Check if the plane changed
						if changesPlane == True :
						
							# Set stored adjustment
							storedAdjustment = self.getHeightAdjustmentRequired(positionAbsoluteX, positionAbsoluteY)
					
							# Check if command has a Z value
							if gcode.hasValue('Z') == True :
					
								# Add value to command Z
								gcode.setValue('Z', str(float(gcode.getValue('Z')) + storedAdjustment))
					
							# Otherwise
							else :
					
								# Set command Z
								gcode.setValue('Z', str(positionRelativeZ + storedAdjustment))
				
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
					if gcode.hasValue('X') == False and gcode.hasValue('Y')  == False and gcode.hasValue('Z') == False and gcode.hasValue('E') == False :
			
						# Set command values to zero
						gcode.setValue('X', "0")
						gcode.setValue('Y', "0")
						gcode.setValue('Z', "0")
						gcode.setValue('E', "0")
			
					# Otherwise
					else :
			
						# Set relative positions
						if gcode.hasValue('X') == True :
							positionRelativeX = float(gcode.getValue('X'))
						
						if gcode.hasValue('Y') == True :
							positionRelativeY = float(gcode.getValue('Y'))
						
						if gcode.hasValue('Z') == True :
							positionRelativeZ = float(gcode.getValue('Z'))
					
						if gcode.hasValue('E') == True :
							positionRelativeE = float(gcode.getValue('E'))
				
				# Set line to adjusted value
				line = gcode.getAscii() + '\n'
			
			# Send line to output
			os.write(output, line)
		
		# Close output file
		os.close(output)
		
		# Remove temporary file
		os.remove(temp)
	
	# Backlash compensation pre-processor
	def backlashCompensationPreprocessor(self, file) :
	
		# Initialize variables
		relativeMode = False
		valueF = "1000"
		previousDirectionX = "Neither"
		previousDirectionY = "Neither"
		compensationX = 0
		compensationY = 0
		positionRelativeX = 0
		positionRelativeY = 0
		positionRelativeZ = 0
		positionRelativeE = 0
		gcode = Gcode()
		extraGcode = Gcode()
	
		# Move the input file to a temporary file
		temp = tempfile.mkstemp()[1]
		os.rename(file, temp)
		
		# Create ouput file in place of the input file
		output = os.open(file, os.O_WRONLY | os.O_CREAT)
		
		# Read in input file
		for line in open(temp) :
			
			# Check if line was parsed successfully and it's a G command
			gcode.clear()
			if gcode.parseLine(line) == True and gcode.hasValue('G') == True :
			
				# Check if command is G0 or G1 and it's in absolute mode
				if (gcode.getValue('G') == "0" or gcode.getValue('G') == "1") and relativeMode == False :
				
					# Check if command has an F value
					if gcode.hasValue('F') == True :
			
						# Set value F
						valueF = gcode.getValue('F')
				
					# Set delta values
					if gcode.hasValue('X') == True :
						deltaX = float(gcode.getValue('X')) - positionRelativeX
					else :
						deltaX = 0
					
					if gcode.hasValue('Y') == True :
						deltaY = float(gcode.getValue('Y')) - positionRelativeY
					else :
						deltaY = 0
					
					if gcode.hasValue('Z') == True :
						deltaZ = float(gcode.getValue('Z')) - positionRelativeZ
					else :
						deltaZ = 0
						
					if gcode.hasValue('E') == True :
						deltaE = float(gcode.getValue('E')) - positionRelativeE
					else :
						deltaE = 0
				
					# Set directions
					if deltaX > sys.float_info.epsilon :
						directionX = "Positive"
					elif deltaX < -sys.float_info.epsilon :
						directionX = "Negative"
					else :
						directionX = previousDirectionX
					
					if deltaY > sys.float_info.epsilon :
						directionY = "Positive"
					elif deltaY < -sys.float_info.epsilon :
						directionY = "Negative"
					else :
						directionY = previousDirectionY
				
					# Check if direction has changed
					if (directionX != previousDirectionX and previousDirectionX != "Neither") or (directionY != previousDirectionY and previousDirectionY != "Neither") :
				
						# Set extra G-code G value
						extraGcode.clear()
						extraGcode.setValue('G', gcode.getValue('G'))
					
						# Check if X direction has changed
						if directionX != previousDirectionX and previousDirectionX != "Neither" :
					
							# Set X compensation
							if directionX == "Positive" :
								compensationX += self.backlashX
							else :
								compensationX += -self.backlashX
							
							# Set extra G-code X value
							extraGcode.setValue('X', str(positionRelativeX + compensationX))
						
							# Set extra G-code Y value if using legacy
							if self.useLegacyBacklash :
								extraGcode.setValue('Y', str(positionRelativeY + compensationY))
					
						# Check if Y direction has changed
						if directionY != previousDirectionY and previousDirectionY != "Neither" :
					
							# Set Y compensation
							if directionY == "Positive" :
								compensationY += self.backlashY
							else :
								compensationY += -self.backlashY
						
							# Set extra G-code Y value
							extraGcode.setValue('Y', str(positionRelativeY + compensationY))
						
							# Set extra G-code X value if using legacy
							if self.useLegacyBacklash :
								extraGcode.setValue('X', str(positionRelativeX + compensationX))
					
						# Set extra G-code F value
						extraGcode.setValue('F', str(self.backlashSpeed))
					
						# Send extra G-code to output
						os.write(output, extraGcode.getAscii() + '\n')
					
						# Set command's F value
						gcode.setValue('F', valueF)
					
					# Check if command has an X value
					if gcode.hasValue('X') == True :
					
						# Add to command's X value
						gcode.setValue('X', str(float(gcode.getValue('X')) + compensationX))
					
					# Check if command has a Y value
					if gcode.hasValue('Y') == True :
			
						# Add to command's Y value
						gcode.setValue('Y', str(float(gcode.getValue('Y')) + compensationY))
			
					# Set relative values
					positionRelativeX += deltaX
					positionRelativeY += deltaY
					positionRelativeZ += deltaZ
					positionRelativeE += deltaE
				
					# Store directions
					previousDirectionX = directionX
					previousDirectionY = directionY
				
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
					if gcode.hasValue('X') == False and gcode.hasValue('Y') == False and gcode.hasValue('Z') == False and gcode.hasValue('E') == False :
			
						# Set command values to zero
						gcode.setValue('X', "0")
						gcode.setValue('Y', "0")
						gcode.setValue('Z', "0")
						gcode.setValue('E', "0")
			
					# Otherwise
					else :
			
						# Set relative positions
						if gcode.hasValue('X') == True :
							positionRelativeX = float(gcode.getValue('X'))
						
						if gcode.hasValue('Y') == True :
							positionRelativeY = float(gcode.getValue('Y'))
						
						if gcode.hasValue('Z') == True :
							positionRelativeZ = float(gcode.getValue('Z'))
					
						if gcode.hasValue('E') == True :
							positionRelativeE = float(gcode.getValue('E'))
				
				# Set line to adjusted value
				line = gcode.getAscii() + '\n'
			
			# Send line to output
			os.write(output, line)
		
		# Close output file
		os.close(output)
		
		# Remove temporary file
		os.remove(temp)
	
	# Feed rate conversion pre-processor
	def feedRateConversionPreprocessor(self, file) :
	
		# Initialize variables
		gcode = Gcode()
	
		# Move the input file to a temporary file
		temp = tempfile.mkstemp()[1]
		os.rename(file, temp)
		
		# Create ouput file in place of the input file
		output = os.open(file, os.O_WRONLY | os.O_CREAT)
		
		# Read in input file
		for line in open(temp) :
			
			# Check if line was parsed successfully and it contains G and F values
			gcode.clear()
			if gcode.parseLine(line) == True and gcode.hasValue('G') == True and gcode.hasValue('F') == True :
			
				# Get command's feedrate
				commandFeedRate = float(gcode.getValue('F')) / 60
				
				# Force feed rate to adhere to limitations
				if commandFeedRate > self.maxFeedRatePerSecond :
                			commandFeedRate = self.maxFeedRatePerSecond
                		
                		# Calculate adjusted feed rate
                		adjustedFeedRate = 30 + (1 - commandFeedRate / self.maxFeedRatePerSecond) * 800
                		
				# Set new feed rate for the command
				gcode.setValue('F', str(adjustedFeedRate))
				
				# Set line to adjusted value
				line = gcode.getAscii() + '\n'
			
			# Send line to output
			os.write(output, line)
		
		# Close output file
		os.close(output)
		
		# Remove temporary file
		os.remove(temp)

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
		"octoprint.filemanager.preprocessor" : __plugin_implementation__.preprocessesGcode,
		"octoprint.plugin.softwareupdate.check_config" : __plugin_implementation__.getUpdateInformation
	}
