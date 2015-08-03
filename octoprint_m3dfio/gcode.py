# coding=utf-8


# Imports
from __future__ import absolute_import
import struct


# Classes
class Gcode(object) :

	# Constructor
	def __init__(self, data = None) :

		# Initialize data members
		self.dataType = 0x1080
		self.hostCommand = ""
		self.originalCommand = ""
		self.parameterValue = []
		for i in xrange(16) :
			self.parameterValue.append(str(""))
		
		# Parse line if provided
		if data != None :
			self.parseLine(data)
	
	# Get original command
	def getOriginalCommand(self) :
	
		# Return original command
		return self.originalCommand
	
	# Parse line
	def parseLine(self, line) :
	
		# Initialize variables
		parameterIdentifier = None
	
		# Reset data type
		self.dataType = 0x1080
		
		# Clear parameter values
		for i in xrange(16) :
			self.parameterValue[i] = ""
		
		# Clear host command
		self.hostCommand = ""
		
		# Set original command
		self.originalCommand = line
		
		# Remove leading white space
		while len(line) > 0 and (line[0] == ' ' or line[0] == '\t' or line[0] == '\r' or line[0] == '\n') :
			line = line[1 :]
		
		# Check if line is a host command
		if len(line) > 0 and line[0] == '@' :
		
			# Remove trailing comment if it exists
			if line.find(";") != -1 :
				line = line[: line.find(";")]
			
			# Remove trailing white space
			while len(line) > 0 and (line[-1] == ' ' or line[-1] == '\t' or line[-1] == '\r' or line[-1] == '\n') :
				line = line[: -1]
		
			# Set host command
			self.hostCommand = line
			
			# Return true
			return True
		
		# Go through line
		index = 0
		while index <= len(line) :
		
			# Check if a parameter is detected
			if index == 0 or index == len(line) or (line[index] >= 'A' and line[index] <= 'Z') or line[index] == ';' or line[index] == '*' or line[index] == ' ' :
			
				# Check if a value has been obtained for the parameter
				if index > 0 :
					
					# Enforce parameter order as N, M, G, X, Y, Z, E, F, T, S, P, I, J, R, D then string
					if parameterIdentifier == 'N' :
					
						# Set data type
						self.dataType |= 1
						
						# Store parameter value
						self.parameterValue[0] = currentValue
					
					elif parameterIdentifier == 'M' :
					
						# Set data type
						self.dataType |= (1 << 1)
						
						# Store parameter value
						self.parameterValue[1] = currentValue
					
					elif parameterIdentifier == 'G' :
					
						# Set data type
						self.dataType |= (1 << 2)
						
						# Store parameter value
						self.parameterValue[2] = currentValue
					
					elif parameterIdentifier == 'X' :
					
						# Set data type
						self.dataType |= (1 << 3)
						
						# Store parameter value
						self.parameterValue[3] = currentValue
					
					elif parameterIdentifier == 'Y' :
					
						# Set data type
						self.dataType |= (1 << 4)
						
						# Store parameter value
						self.parameterValue[4] = currentValue
					
					elif parameterIdentifier == 'Z' :
					
						# Set data type
						self.dataType |= (1 << 5)
						
						# Store parameter value
						self.parameterValue[5] = currentValue
					
					elif parameterIdentifier == 'E' :
					
						# Set data type
						self.dataType |= (1 << 6)
						
						# Store parameter value
						self.parameterValue[6] = currentValue
					
					elif parameterIdentifier == 'F' :
					
						# Set data type
						self.dataType |= (1 << 8)
						
						# Store parameter value
						self.parameterValue[7] = currentValue
					
					elif parameterIdentifier == 'T' :
					
						# Set data type
						self.dataType |= (1 << 9)
						
						# Store parameter value
						self.parameterValue[8] = currentValue
					
					elif parameterIdentifier == 'S' :
					
						# Set data type
						self.dataType |= (1 << 10)
						
						# Store parameter value
						self.parameterValue[9] = currentValue
					
					elif parameterIdentifier == 'P' :
					
						# Set data type
						self.dataType |= (1 << 11)
						
						# Store parameter value
						self.parameterValue[10] = currentValue
					
					elif parameterIdentifier == 'I' :
					
						# Set data type
						self.dataType |= (1 << 16)
						
						# Store parameter value
						self.parameterValue[11] = currentValue
						
					
					elif parameterIdentifier == 'J' :
					
						# Set data type
						self.dataType |= (1 << 17)
						
						# Store parameter value
						self.parameterValue[12] = currentValue
					
					elif parameterIdentifier == 'R' :
					
						# Set data type
						self.dataType |= (1 << 18)
						
						# Store parameter value
						self.parameterValue[13] = currentValue
					
					elif parameterIdentifier == 'D' :
					
						# Set data type
						self.dataType |= (1 << 19)
						
						# Store parameter value
						self.parameterValue[14] = currentValue
				
				# Reset current value
				currentValue = ""
				
				# Check if a string is required
				if parameterIdentifier == 'M' and (self.parameterValue[1] == "23" or self.parameterValue[1] == "28" or self.parameterValue[1] == "29" or self.parameterValue[1] == "30" or self.parameterValue[1] == "32" or self.parameterValue[1] == "117") :
				
					# Get string data
					while index < len(line) and line[index] != ';' and line[index] != '\r' and line[index] != '\n' :
						currentValue += str(line[index])
						index += 1
				
					# Check if a string exists
					if currentValue != "" :
				
						# Set data type
						self.dataType |= (1 << 15)
				
						# Store parameter value
						self.parameterValue[15] = currentValue
				
				# Check if a comment or checksum is detected
				if index < len(line) and (line[index] == ';' or line[index] == '*') :
		
					# Stop parsing
					break
			
				# Set parameter identifier
				if index < len(line) :
					parameterIdentifier = line[index]
			
			# Otherwise check if value isn't whitespace
			elif line[index] != ' ' and line[index] != '\t' and line[index] != '\r' and line[index] != '\n' :
	
				# Get current value
				currentValue += str(line[index])
			
			# Increment index
			index += 1
		
		# Return if data wasn't empty
		return self.dataType != 0x1080
	
	# Get binary
	def getBinary(self) :
	
		# Initialize variables
		request = ""
	
		# Check if host command
		if self.hostCommand != "" :
	
			# Return host command
			return self.hostCommand
		
		# Fill first four bytes of request to data type
		request += chr(int(self.dataType & 0xFF))
		request += chr(int(self.dataType >> 8) & 0xFF)
		request += chr(int(self.dataType >> 16) & 0xFF)
		request += chr(int(self.dataType >> 24) & 0xFF)
		
		# Check if string parameter is set
		if self.dataType & (1 << 15) :
	
			# Set fifth byte of request to string length
			request += chr(len(self.parameterValue[15]))
		
		# Check if command contains N and a value
		if self.dataType & 1 and self.parameterValue[0] != "" :
		
			# Set 2 byte integer parameter value
			tempNumber = int(self.parameterValue[0])
			request += chr(tempNumber & 0xFF)
			request += chr((tempNumber >> 8) & 0xFF)
			
		# Check if command contains M and a value
		if self.dataType & (1 << 1) and self.parameterValue[1] != "" :
		
			# Set 2 byte integer parameter value
			tempNumber = int(self.parameterValue[1])
			request += chr(tempNumber & 0xFF)
			request += chr((tempNumber >> 8) & 0xFF)
		
		# Check if command contains G and a value
		if self.dataType & (1 << 2) and self.parameterValue[2] != "" :
		
			# Set 2 byte integer parameter value
			tempNumber = int(self.parameterValue[2])
			request += chr(tempNumber & 0xFF)
			request += chr((tempNumber >> 8) & 0xFF)
		
		# Check if command contains X and a value
		if self.dataType & (1 << 3) and self.parameterValue[3] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[3]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains Y and a value
		if self.dataType & (1 << 4) and self.parameterValue[4] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[4]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains Z and a value
		if self.dataType & (1 << 5) and self.parameterValue[5] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[5]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains E and a value
		if self.dataType & (1 << 6) and self.parameterValue[6] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[6]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains F and a value
		if self.dataType & (1 << 8) and self.parameterValue[7] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[7]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains T and a value
		if self.dataType & (1 << 9) and self.parameterValue[8] != "" :
		
			# Set 1 byte integer parameter value
			tempNumber = int(self.parameterValue[8])
			request += chr(tempNumber & 0xFF)
		
		# Check if command contains S and a value
		if self.dataType & (1 << 10) and self.parameterValue[9] != "" :
		
			# Set 4 byte integer parameter value
			tempNumber = int(round(float(self.parameterValue[9])))
			request += chr(tempNumber & 0xFF)
			request += chr((tempNumber >> 8) & 0xFF)
			request += chr((tempNumber >> 16) & 0xFF)
			request += chr((tempNumber >> 24) & 0xFF)
		
		# Check if command contains P and a value
		if self.dataType & (1 << 11) and self.parameterValue[10] != "" :
		
			# Set 4 byte integer parameter value
			tempNumber = int(round(float(self.parameterValue[10])))
			request += chr(tempNumber & 0xFF)
			request += chr((tempNumber >> 8) & 0xFF)
			request += chr((tempNumber >> 16) & 0xFF)
			request += chr((tempNumber >> 24) & 0xFF)
		
		# Check if command contains I and a value
		if self.dataType & (1 << 16) and self.parameterValue[11] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[11]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains J and a value
		if self.dataType & (1 << 17) and self.parameterValue[12] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[12]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains R and a value
		if self.dataType & (1 << 18) and self.parameterValue[13] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[13]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains D and a value
		if self.dataType & (1 << 19) and self.parameterValue[14] != "" :
		
			# Set 4 byte float parameter value
			tempNumber = struct.pack('f', float(self.parameterValue[14]))
			request += tempNumber[0]
			request += tempNumber[1]
			request += tempNumber[2]
			request += tempNumber[3]
		
		# Check if command contains a string
		if self.dataType & (1 << 15) :
		
			# Set string parameter value
			for character in self.parameterValue[15] :
				request += character
		
		# Go through all values
		sum1 = sum2 = 0
		for index in xrange(len(request)) :

			# Set sums
			sum1 = (sum1 + struct.unpack("B", request[index])[0]) % 0xFF
			sum2 = (sum1 + sum2)  % 0xFF
		
		# Append Fletcher 16 checksum checksum to request
		request += chr(sum1)
		request += chr(sum2)
		
		# Return request
		return request
	
	# Get Ascii
	def getAscii(self) :
	
		# Initialize variables
		request = ""
		
		# Check if host command
		if self.hostCommand != "" :
	
			# Return host command
			return self.hostCommand
	
		# Check if command contains N
		if self.dataType & 1 :
		
			# Append parameter identifier and value
			request += 'N' + self.parameterValue[0] + ' '
	
		# Check if command contains M
		if self.dataType & (1 << 1) :
		
			# Append parameter identifier and value
			request += 'M' + self.parameterValue[1] + ' '
		
			# Check if command contains a string
			if self.dataType & (1 << 15) :
		
				# Append string to request
				request += self.parameterValue[15] + ' '
	
		# Check if command contains G
		if self.dataType & (1 << 2) :
		
			# Append parameter identifier and value
			request += 'G' + self.parameterValue[2] + ' '
	
		# Check if command contains X
		if self.dataType & (1 << 3) :
		
			# Append parameter identifier and value
			request += 'X' + self.parameterValue[3] + ' '
	
		# Check if command contains Y
		if self.dataType & (1 << 4) :
		
			# Append parameter identifier and value
			request += 'Y' + self.parameterValue[4] + ' '
	
		# Check if command contains Z
		if self.dataType & (1 << 5) :
		
			# Append parameter identifier and value
			request += 'Z' + self.parameterValue[5] + ' '
	
		# Check if command contains E
		if self.dataType & (1 << 6) :
		
			# Append parameter identifier and value
			request += 'E' + self.parameterValue[6] + ' '
	
		# Check if command contains F
		if self.dataType & (1 << 8) :
		
			# Append parameter identifier and value
			request += 'F' + self.parameterValue[7] + ' '
	
		# Check if command contains T
		if self.dataType & (1 << 9) :
		
			# Append parameter identifier and value
			request += 'T' + self.parameterValue[8] + ' '
	
		# Check if command contains S
		if self.dataType & (1 << 10) :
		
			# Append parameter identifier and value
			request += 'S' + self.parameterValue[9] + ' '
	
		# Check if command contains P
		if self.dataType & (1 << 11) :
		
			# Append parameter identifier and value
			request += 'P' + self.parameterValue[10] + ' '
	
		# Check if command contains I
		if self.dataType & (1 << 16) :
		
			# Append parameter identifier and value
			request += 'I' + self.parameterValue[11] + ' '
	
		# Check if command contains J
		if self.dataType & (1 << 17) :
		
			# Append parameter identifier and value
			request += 'J' + self.parameterValue[12] + ' '
	
		# Check if command contains R
		if self.dataType & (1 << 18) :
		
			# Append parameter identifier and value
			request += 'R' + self.parameterValue[13] + ' '
	
		# Check if command contains D
		if self.dataType & (1 << 19) :
		
			# Append parameter identifier and value
			request += 'D' + self.parameterValue[14] + ' '

		# Remove last space from request
		if request != "" :
			request = request[:-1]
	
		# Return request
		return request
	
	# Get data type
	def getDataType(self) :
	
		# Return data type
		return self.dataType
	
	# Has parameter
	def hasParameter(self, parameter) :
	
		# Check if N is requested
		if parameter == 'N' :
		
			# Return if value is set
			return bool(self.dataType & 1)
		
		# Otherwise check if M is requested
		elif parameter == 'M' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 1))
		
		# Otherwise check if G is requested
		elif parameter == 'G' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 2))
		
		# Otherwise check if X is requested
		elif parameter == 'X' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 3))
		
		# Otherwise check if Y is requested
		elif parameter == 'Y' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 4))
		
		# Otherwise check if Z is requested
		elif parameter == 'Z' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 5))
		
		# Otherwise check if E is requested
		elif parameter == 'E' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 6))
		
		# Otherwise check if F is requested
		elif parameter == 'F' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 8))
		
		# Otherwise check if T is requested
		elif parameter == 'T' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 9))
		
		# Otherwise check if S is requested
		elif parameter == 'S' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 10))
		
		# Otherwise check if P is requested
		elif parameter == 'P' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 11))
		
		# Otherwise check if I is requested
		elif parameter == 'I' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 16))
		
		# Otherwise check if J is requested
		elif parameter == 'J' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 17))
		
		# Otherwise check if R is requested
		elif parameter == 'R' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 18))
		
		# Otherwise check if D is requested
		elif parameter == 'D' :
		
			# Return if value is set
			return bool(self.dataType & (1 << 19))
		
		# Otherwise
		else :
		
			# Return false
			return False
	
	# Remove parameter
	def removeParameter(self, parameter) :
	
		# Check if N is requested
		if parameter == 'N' :
		
			# Clear data type
			self.dataType &= ~1
		
			# Clear parameter value
			self.parameterValue[0] = ""
		
		# Otherwise check if M is requested
		elif parameter == 'M' :
		
			# Clear data type
			self.dataType &= ~(1 << 1)
		
			# Clear parameter value
			self.parameterValue[1] = ""
		
		# Otherwise check if G is requested
		elif parameter == 'G' :
		
			# Clear data type
			self.dataType &= ~(1 << 2)
		
			# Clear parameter value
			self.parameterValue[2] = ""
		
		# Otherwise check if X is requested
		elif parameter == 'X' :
		
			# Clear data type
			self.dataType &= ~(1 << 3)
		
			# Clear parameter value
			self.parameterValue[3] = ""
		
		# Otherwise check if Y is requested
		elif parameter == 'Y' :
		
			# Clear data type
			self.dataType &= ~(1 << 4)
		
			# Clear parameter value
			self.parameterValue[4] = ""
		
		# Otherwise check if Z is requested
		elif parameter == 'Z' :
		
			# Clear data type
			self.dataType &= ~(1 << 5)
		
			# Clear parameter value
			self.parameterValue[5] = ""
		
		# Otherwise check if E is requested
		elif parameter == 'E' :
		
			# Clear data type
			self.dataType &= ~(1 << 6)
		
			# Clear parameter value
			self.parameterValue[6] = ""
		
		# Otherwise check if F is requested
		elif parameter == 'F' :
		
			# Clear data type
			self.dataType &= ~(1 << 8)
		
			# Clear parameter value
			self.parameterValue[7] = ""
		
		# Otherwise check if T is requested
		elif parameter == 'T' :
		
			# Clear data type
			self.dataType &= ~(1 << 9)
		
			# Clear parameter value
			self.parameterValue[8] = ""
		
		# Otherwise check if S is requested
		elif parameter == 'S' :
		
			# Clear data type
			self.dataType &= ~(1 << 10)
		
			# Clear parameter value
			self.parameterValue[9] = ""
		
		# Otherwise check if P is requested
		elif parameter == 'P' :
		
			# Clear data type
			self.dataType &= ~(1 << 11)
		
			# Clear parameter value
			self.parameterValue[10] = ""
		
		# Otherwise check if I is requested
		elif parameter == 'I' :
		
			# Clear data type
			self.dataType &= ~(1 << 16)
		
			# Clear parameter value
			self.parameterValue[11] = ""
		
		# Otherwise check if J is requested
		elif parameter == 'J' :
		
			# Clear data type
			self.dataType &= ~(1 << 17)
		
			# Clear parameter value
			self.parameterValue[12] = ""
		
		# Otherwise check if R is requested
		elif parameter == 'R' :
		
			# Clear data type
			self.dataType &= ~(1 << 18)
		
			# Clear parameter value
			self.parameterValue[13] = ""
		
		# Otherwise check if D is requested
		elif parameter == 'D' :
		
			# Clear data type
			self.dataType &= ~(1 << 19)
		
			# Clear parameter value
			self.parameterValue[14] = ""
	
	# Has value
	def hasValue(self, parameter) :
	
		# Check if N is requested
		if parameter == 'N' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[0] != ""
		
		# Otherwise check if M is requested
		elif parameter == 'M' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[1] != ""
		
		# Otherwise check if G is requested
		elif parameter == 'G' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[2] != ""
		
		# Otherwise check if X is requested
		elif parameter == 'X' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[3] != ""
		
		# Otherwise check if Y is requested
		elif parameter == 'Y' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[4] != ""
		
		# Otherwise check if Z is requested
		elif parameter == 'Z' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[5] != ""
		
		# Otherwise check if E is requested
		elif parameter == 'E' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[6] != ""
		
		# Otherwise check if F is requested
		elif parameter == 'F' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[7] != ""
		
		# Otherwise check if T is requested
		elif parameter == 'T' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[8] != ""
		
		# Otherwise check if S is requested
		elif parameter == 'S' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[9] != ""
		
		# Otherwise check if P is requested
		elif parameter == 'P' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[10] != ""
		
		# Otherwise check if I is requested
		elif parameter == 'I' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[11] != ""
		
		# Otherwise check if J is requested
		elif parameter == 'J' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[12] != ""
		
		# Otherwise check if R is requested
		elif parameter == 'R' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[13] != ""
		
		# Otherwise check if D is requested
		elif parameter == 'D' :
		
			# Return if parameter's value isn't empty
			return self.parameterValue[14] != ""
		
		# Otherwise
		else :
		
			# Return false
			return False
	
	# Get value
	def getValue(self, parameter) :
	
		# Check if N is requested
		if parameter == 'N' :
		
			# Return parameter's value
			return self.parameterValue[0]
		
		# Otherwise check if M is requested
		elif parameter == 'M' :
		
			# Return parameter's value
			return self.parameterValue[1]
		
		# Otherwise check if G is requested
		elif parameter == 'G' :
		
			# Return parameter's value
			return self.parameterValue[2]
		
		# Otherwise check if X is requested
		elif parameter == 'X' :
		
			# Return parameter's value
			return self.parameterValue[3]
		
		# Otherwise check if Y is requested
		elif parameter == 'Y' :
		
			# Return parameter's value
			return self.parameterValue[4]
		
		# Otherwise check if Z is requested
		elif parameter == 'Z' :
		
			# Return parameter's value
			return self.parameterValue[5]
		
		# Otherwise check if E is requested
		elif parameter == 'E' :
		
			# Return parameter's value
			return self.parameterValue[6]
		
		# Otherwise check if F is requested
		elif parameter == 'F' :
		
			# Return parameter's value
			return self.parameterValue[7]
		
		# Otherwise check if T is requested
		elif parameter == 'T' :
		
			# Return parameter's value
			return self.parameterValue[8]
		
		# Otherwise check if S is requested
		elif parameter == 'S' :
		
			# Return parameter's value
			return self.parameterValue[9]
		
		# Otherwise check if P is requested
		elif parameter == 'P' :
		
			# Return parameter's value
			return self.parameterValue[10]
		
		# Otherwise check if I is requested
		elif parameter == 'I' :
		
			# Return parameter's value
			return self.parameterValue[11]
		
		# Otherwise check if J is requested
		elif parameter == 'J' :
		
			# Return parameter's value
			return self.parameterValue[12]
		
		# Otherwise check if R is requested
		elif parameter == 'R' :
		
			# Return parameter's value
			return self.parameterValue[13]
		
		# Otherwise check if D is requested
		elif parameter == 'D' :
		
			# Return parameter's value
			return self.parameterValue[14]
		
		# Otherwise
		else :
		
			# Return empty
			return ""
	
	# Set value
	def setValue(self, parameter, value) :
	
		# Check if N is requested
		if parameter == 'N' :
		
			# Set data type
			self.dataType |= 1
		
			# Set parameter value
			self.parameterValue[0] = value
		
		# Otherwise check if M is requested
		elif parameter == 'M' :
		
			# Set data type
			self.dataType |= (1 << 1)
		
			# Set parameter value
			self.parameterValue[1] = value
		
		# Otherwise check if G is requested
		elif parameter == 'G' :
		
			# Set data type
			self.dataType |= (1 << 2)
		
			# Set parameter value
			self.parameterValue[2] = value
		
		# Otherwise check if X is requested
		elif parameter == 'X' :
		
			# Set data type
			self.dataType |= (1 << 3)
		
			# Set parameter value
			self.parameterValue[3] = value
		
		# Otherwise check if Y is requested
		elif parameter == 'Y' :
		
			# Set data type
			self.dataType |= (1 << 4)
		
			# Set parameter value
			self.parameterValue[4] = value
		
		# Otherwise check if Z is requested
		elif parameter == 'Z' :
		
			# Set data type
			self.dataType |= (1 << 5)
		
			# Set parameter value
			self.parameterValue[5] = value
		
		# Otherwise check if E is requested
		elif parameter == 'E' :
		
			# Set data type
			self.dataType |= (1 << 6)
		
			# Set parameter value
			self.parameterValue[6] = value
		
		# Otherwise check if F is requested
		elif parameter == 'F' :
		
			# Set data type
			self.dataType |= (1 << 8)
		
			# Set parameter value
			self.parameterValue[7] = value
		
		# Otherwise check if T is requested
		elif parameter == 'T' :
		
			# Set data type
			self.dataType |= (1 << 9)
		
			# Set parameter value
			self.parameterValue[8] = value
		
		# Otherwise check if S is requested
		elif parameter == 'S' :
		
			# Set data type
			self.dataType |= (1 << 10)
		
			# Set parameter value
			self.parameterValue[9] = value
		
		# Otherwise check if P is requested
		elif parameter == 'P' :
		
			# Set data type
			self.dataType |= (1 << 11)
		
			# Set parameter value
			self.parameterValue[10] = value
		
		# Otherwise check if I is requested
		elif parameter == 'I' :
		
			# Set data type
			self.dataType |= (1 << 16)
		
			# Set parameter value
			self.parameterValue[11] = value
		
		# Otherwise check if J is requested
		elif parameter == 'J' :
		
			# Set data type
			self.dataType |= (1 << 17)
		
			# Set parameter value
			self.parameterValue[12] = value
		
		# Otherwise check if R is requested
		elif parameter == 'R' :
		
			# Set data type
			self.dataType |= (1 << 18)
		
			# Set parameter value
			self.parameterValue[13] = value
		
		# Otherwise check if D is requested
		elif parameter == 'D' :
		
			# Set data type
			self.dataType |= (1 << 19)
		
			# Set parameter value
			self.parameterValue[14] = value
	
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
		for i in xrange(16) :
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
