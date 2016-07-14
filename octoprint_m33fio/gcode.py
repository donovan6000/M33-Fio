# coding=utf-8
from __future__ import absolute_import


# Imports
import struct
import re


# Gcode class
class Gcode(object) :

	# Constructor
	def __init__(self, data = None) :

		# Initialize data members
		self.order = "NMGXYZE FTSP    IJRD"
		self.dataType = 0x1080
		self.hostCommand = ""
		self.originalCommand = ""
		self.parameterValue = []
		for i in xrange(len(self.order)) :
			self.parameterValue.append(str(""))
		
		# Parse line if provided
		if data != None :
			self.parseLine(data)
	
	# Parse line
	def parseLine(self, line) :
	
		# Reset data type
		self.dataType = 0x1080
		
		# Clear parameter values
		for i in xrange(len(self.order)) :
			self.parameterValue[i] = ""
		
		# Clear host command
		self.hostCommand = ""
		
		# Check if line contains a checksum
		characterOffset = line.find('*')
		if characterOffset != -1 :
		
			# Remove checksum
			line = line[0 : characterOffset]
		
		# Remove leading and trailing whitespace
		line = line.strip()
		
		# Set original command
		self.originalCommand = line
		
		# Check if line contains a comment
		characterOffset = line.find(';')
		if characterOffset != -1 :
	
			# Remove comment
			line = line[0 : characterOffset]
		
		# Check if line is empty
		if not line :
		
			# Return false
			return False
		
		# Check if line is a host command
		if line[0] == '@' :
			
			# Set host command
			self.hostCommand = line
			
			# Return true
			return True
		
		# Parse line for parameters
		for match in re.compile("[" + self.order.replace(' ', '') + "][-+]?\d*(\.\d+)?").finditer(line) :
			
			# Set data type
			self.dataType |= (1 << self.order.find(match.group()[0]))
			
			# Store parameter value
			self.parameterValue[self.order.find(match.group()[0])] = match.group()[1 :]
			
			# Check if match is an M value
			if match.group()[0] == 'M' :
			
				# Check if M value contains a string
				value = match.group()[1 :]
				if value == "23" or value == "28" or value == "29" or value == "30" or value == "32" or value == "117" :
				
					# Set string parameter
					self.parameterValue[15] = line[match.start() + len(match.group()) :]
					
					# Remove leading and trailing whitespace
					self.parameterValue[15] = self.parameterValue[15].strip()
					
					# Check if string exists
					if self.parameterValue[15] :
					
						# Set data type
						self.dataType |= (1 << 15)
					
					# Stop parsing line
					break
		
		# Return if data wasn't empty
		return self.dataType != 0x1080
	
	# Get original command
	def getOriginalCommand(self) :
	
		# Return original command
		return self.originalCommand
	
	# Get binary
	def getBinary(self) :
	
		# Check if host command
		if self.hostCommand != "" :
	
			# Return host command
			return self.hostCommand
		
		# Initialize request
		request = ""
		
		# Fill first four bytes of request to data type
		request += chr(int(self.dataType & 0xFF))
		request += chr(int(self.dataType >> 8) & 0xFF)
		request += chr(int(self.dataType >> 16) & 0xFF)
		request += chr(int(self.dataType >> 24) & 0xFF)
		
		# Check if command contains a string
		if self.parameterValue[15] != "" :
	
			# Set fifth byte of request to string parameter length
			request += chr(len(self.parameterValue[15]))
		
		# Check if command contains an N value
		if self.parameterValue[0] != "" :
		
			# Set 2 byte integer parameter value
			tempNumber = int(self.parameterValue[0])
			request += chr(tempNumber & 0xFF)
			request += chr((tempNumber >> 8) & 0xFF)
			
		# Check if command contains an M value
		if self.parameterValue[1] != "" :
		
			# Set 2 byte integer parameter value
			tempNumber = int(self.parameterValue[1])
			request += chr(tempNumber & 0xFF)
			request += chr((tempNumber >> 8) & 0xFF)
		
		# Check if command contains a G value
		if self.parameterValue[2] != "" :
		
			# Set 2 byte integer parameter value
			tempNumber = int(self.parameterValue[2])
			request += chr(tempNumber & 0xFF)
			request += chr((tempNumber >> 8) & 0xFF)
		
		# Check if command contains an X value
		if self.parameterValue[3] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[3]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains a Y value
		if self.parameterValue[4] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[4]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains a Z value
		if self.parameterValue[5] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[5]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains an E value
		if self.parameterValue[6] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[6]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains an F value
		if self.parameterValue[8] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[8]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains a T value
		if self.parameterValue[9] != "" :
		
			# Set 1 byte integer parameter value
			tempNumber = int(self.parameterValue[9])
			request += chr(tempNumber & 0xFF)
		
		# Check if command contains an S value
		if self.parameterValue[10] != "" :
		
			# Set 4 byte integer parameter value
			tempNumber = int(round(float(self.parameterValue[10])))
			request += chr(tempNumber & 0xFF)
			request += chr((tempNumber >> 8) & 0xFF)
			request += chr((tempNumber >> 16) & 0xFF)
			request += chr((tempNumber >> 24) & 0xFF)
		
		# Check if command contains a P value
		if self.parameterValue[11] != "" :
		
			# Set 4 byte integer parameter value
			tempNumber = int(round(float(self.parameterValue[11])))
			request += chr(tempNumber & 0xFF)
			request += chr((tempNumber >> 8) & 0xFF)
			request += chr((tempNumber >> 16) & 0xFF)
			request += chr((tempNumber >> 24) & 0xFF)
		
		# Check if command contains an I value
		if self.parameterValue[16] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[16]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains a J value
		if self.parameterValue[17] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[17]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains an R value
		if self.parameterValue[18] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[18]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains a D value
		if self.parameterValue[19] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[19]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains a string
		if self.parameterValue[15] != "" :
		
			# Set string parameter value
			request += self.parameterValue[15]
		
		# Go through all values
		sum1 = sum2 = 0
		for index in xrange(len(request)) :

			# Set sums
			sum1 = (sum1 + struct.unpack("B", request[index])[0]) % 0xFF
			sum2 = (sum1 + sum2) % 0xFF
		
		# Append Fletcher 16 checksum checksum to request
		request += chr(sum1)
		request += chr(sum2)
		
		# Return request
		return request
	
	# Get Ascii
	def getAscii(self) :
		
		# Check if host command
		if self.hostCommand != "" :
	
			# Return host command
			return self.hostCommand
		
		# Initialize request
		request = ""
		
		# Go through all values
		for i in xrange(len(self.order)) :
			
			# Check if command contains value and value is valid
			if bool(self.dataType & (1 << i)) and bool(0xF0F7F & (1 << i)) :
			
				# Append parameter identifier and value
				request += self.order[i] + self.parameterValue[i] + ' '
				
				# Check if M command contains a string
				if i == 1 and bool(self.dataType & (1 << 15)) :
		
					# Append string to request
					request += self.parameterValue[15] + ' '
		
		# Remove last space from request
		if request != "" :
			request = request[: -1]
	
		# Return request
		return request
	
	# Get data type
	def getDataType(self) :
	
		# Return data type
		return self.dataType
	
	# Has parameter
	def hasParameter(self, parameter) :
	
		# Check if parameter isn't a space
		if parameter != ' ' :
		
			# Check if parameter is valid
			parameterOffset = self.order.find(parameter)
			if parameterOffset != -1 :
	
				# Return if value is set
				return bool(self.dataType & (1 << parameterOffset))
		
		# Return false
		return False
	
	# Remove parameter
	def removeParameter(self, parameter) :
	
		# Check if parameter isn't a space
		if parameter != ' ' :
		
			# Check if parameter is valid
			parameterOffset = self.order.find(parameter)
			if parameterOffset != -1 :
		
				# Clear data type
				self.dataType &= ~(1 << parameterOffset)
			
				# Clear parameter value
				self.parameterValue[parameterOffset] = ""
				
				# Check if command is now empty
				if self.dataType == 0x1080 :
		
					# Clear original command
					self.originalCommand = ""
	
	# Has value
	def hasValue(self, parameter) :
	
		# Check if parameter isn't a space
		if parameter != ' ' :
		
			# Check if parameter is valid
			parameterOffset = self.order.find(parameter)
			if parameterOffset != -1 :
		
				# Return if parameter's value isn't empty
				return self.parameterValue[parameterOffset] != ""
		
		# Return false
		return False
	
	# Get value
	def getValue(self, parameter) :
	
		# Check if parameter isn't a space
		if parameter != ' ' :
		
			# Check if parameter is valid
			parameterOffset = self.order.find(parameter)
			if parameterOffset != -1 :
		
				# Return parameter's value
				return self.parameterValue[parameterOffset]
		
		# Return empty
		return ""
	
	# Set value
	def setValue(self, parameter, value) :
	
		# Check if parameter isn't a space
		if parameter != ' ' :
		
			# Check if parameter is valid
			parameterOffset = self.order.find(parameter)
			if parameterOffset != -1 :
		
				# Set data type
				self.dataType |= (1 << parameterOffset)
		
				# Set parameter value
				self.parameterValue[parameterOffset] = value
	
	# Has string
	def hasString(self) :
	
		# Return if string is set
		return bool(self.dataType & (1 << 15))
	
	# Get string
	def getString(self) :
	
		# Return string
		return self.parameterValue[15]
	
	# Set string
	def setString(self, value) :

		# Set data type
		self.dataType |= (1 << 15)

		# Set string value
		self.parameterValue[15] = value
	
	# Clear
	def clear(self) :
	
		# Reset data type
		self.dataType = 0x1080
		
		# Clear parameter values
		for i in xrange(len(self.order)) :
			self.parameterValue[i] = ""
	
		# Clear host command
		self.hostCommand = ""
	
		# Clear original command
		self.originalCommand = ""
	
	# Is host command
	def isHostCommand(self) :

		# Return if host command is set
		return hostCommand != ""
	
	# Is empty
	def isEmpty(self) :

		# Return if doesn't contain any values
		return self.dataType == 0x1080
