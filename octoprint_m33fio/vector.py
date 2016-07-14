# coding=utf-8
from __future__ import absolute_import


# Imports
import math


# Vector class
class Vector(object) :

	# Constructor
	def __init__(self, x = 0, y = 0, z = 0, e = 0) :
		
		# Initialize data members
		self.x = x
		self.y = y
		self.z = z
		self.e = e
	
	# Get length
	def getLength(self) :
	
		# Return length
		return math.sqrt(self.x * self.x + self.y * self.y + self.z * self.z + self.e * self.e)
	
	# Normalize
	def normalize(self) :
	
		# Get length
		length = self.getLength()
		
		# Normalize components
		self.x /= length
		self.y /= length
		self.z /= length
		self.e /= length
	
	# Addition operator
	def __add__(self, other) :
	
		# Add components
		x = self.x + other.x
		y = self.y + other.y
		z = self.z + other.z
		e = self.e + other.e
		
		# Return vector
		return Vector(x, y, z, e)
	
	# Subtraction operator
	def __sub__(self, other) :
	
		# Subtract components
		x = self.x - other.x
		y = self.y - other.y
		z = self.z - other.z
		e = self.e - other.e
		
		# Return vector
		return Vector(x, y, z, e)
	
	# Multiplication operator
	def __mul__(self, other) :
	
		# Multiply components
		x = self.x * other
		y = self.y * other
		z = self.z * other
		e = self.e * other
		
		# Return vector
		return Vector(x, y, z, e)
	
	# Division operator
	def __div__(self, other) :
	
		# Divide components
		x = self.x / float(other)
		y = self.y / float(other)
		z = self.z / float(other)
		e = self.e / float(other)
		
		# Return vector
		return Vector(x, y, z, e)
	
	# Get item operator
	def __getitem__(self, key) :
		
		# Return component
		return {
			0 : self.x,
			1 : self.y,
			2 : self.z,
			3 : self.e,
		}[key]
	
	# Set item operator
	def __setitem__(self, key, value) :
	
		# Set component
		if key == 0 :
			self.x = value
		elif key == 1 :
			self.y = value
		elif key == 2 :
			self.z = value
		elif key == 3 :
			self.e = value
