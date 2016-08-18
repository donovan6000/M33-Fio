// Header files
#include <cmath>
#include "vector.h"


// Supporting function implementation
Vector::Vector(double x, double y, double z, double e) {

	// Initialize vector components
	this->x = x;
	this->y = y;
	this->z = z;
	this->e = e;
}

Vector::Vector(Vector &value) {

	// Copy vector components
	x = value.x;
	y = value.y;
	z = value.z;
	e = value.e;
}

double Vector::getLength() const {

	// Return length
	return sqrt(x * x + y * y + z * z + e * e);
}

void Vector::normalize() {

	// Get length
	double length = getLength();
	
	// Normalize components
	x /= length;
	y /= length;
	z /= length;
	e /= length;
}

Vector Vector::operator+(const Vector &addend) const {

	// Initialize variables
	Vector vector;
	
	// Set vector components
	vector.x = x + addend.x;
	vector.y = y + addend.y;
	vector.z = z + addend.z;
	vector.e = e + addend.e;
	
	// Return vector
	return vector;
}

Vector &Vector::operator+=(const Vector &addend) {

	// Set vector components
	x += addend.x;
	y += addend.y;
	z += addend.z;
	e += addend.e;
	
	// Return self
	return *this;
}

Vector Vector::operator-(const Vector &subtrahend) const {

	// Initialize variables
	Vector vector;
	
	// Set vector components
	vector.x = x - subtrahend.x;
	vector.y = y - subtrahend.y;
	vector.z = z - subtrahend.z;
	vector.e = e - subtrahend.e;
	
	// Return vector
	return vector;
}

Vector &Vector::operator-=(const Vector &subtrahend) {

	// Set vector components
	x -= subtrahend.x;
	y -= subtrahend.y;
	z -= subtrahend.z;
	e -= subtrahend.e;
	
	// Return self
	return *this;
}

Vector Vector::operator*(double multiplier) const {

	// Initialize variables
	Vector vector;
	
	// Set vector components
	vector.x = x * multiplier;
	vector.y = y * multiplier;
	vector.z = z * multiplier;
	vector.e = e * multiplier;
	
	// Return vector
	return vector;
}

Vector &Vector::operator*=(double multiplier) {

	// Set vector components
	x *= multiplier;
	y *= multiplier;
	z *= multiplier;
	e *= multiplier;
	
	// Return self
	return *this;
}

Vector Vector::operator/(double divisor) const {

	// Initialize variables
	Vector vector;
	
	// Set vector components
	vector.x = x / divisor;
	vector.y = y / divisor;
	vector.z = z / divisor;
	vector.e = e / divisor;
	
	// Return vector
	return vector;
}

Vector &Vector::operator/=(double divisor) {

	// Set vector components
	x /= divisor;
	y /= divisor;
	z /= divisor;
	e /= divisor;
	
	// Return self
	return *this;
}

const double& Vector::operator[](int index) const {
	
	// Return indexed value
	switch(index) {
	
		case 0:
			return x;
		break;
		
		case 1:
			return y;
		break;
		
		case 2:
			return z;
		break;
		
		default:
			return e;
	}
}

double &Vector::operator[](int index) {
	
	// Return indexed value
	switch(index) {
	
		case 0:
			return x;
		break;
		
		case 1:
			return y;
		break;
		
		case 2:
			return z;
		break;
		
		default:
			return e;
	}
}

Vector &Vector::operator=(const Vector &vector) {

	// Return self if calling on self
	if(this == &vector)
		return *this;
	
	// Copy vector components
	x = vector.x;
	y = vector.y;
	z = vector.z;
	e = vector.e;
	
	// Return self
	return *this;
}
