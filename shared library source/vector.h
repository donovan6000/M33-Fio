// Header gaurd
#ifndef VECTOR_H
#define VECTOR_H


// Vector class
class Vector {

	// Public
	public:
	
		/*
		Name: Constructor
		Purpose: Allows setting vector components upon creation
		*/
		Vector(double x = 0, double y = 0, double z = 0, double e = 0);
		
		/*
		Name: Copy Constructor
		Purpose: Initializes a copy of a vector
		*/
		Vector(Vector &value);
		
		/*
		Name: Get Length
		Purpose: Returns length of vector
		*/
		double getLength() const;
		
		/*
		Name: Normalize
		Purpose: Normalizes vector components
		*/
		void normalize();
		
		/*
		Name: Addition operator
		Purpose: Allows adding vectors
		*/
		Vector operator+(const Vector &addend) const;
		Vector &operator+=(const Vector &addend);
		
		/*
		Name: Subtraction operator
		Purpose: Allows subtracting vectors
		*/
		Vector operator-(const Vector &subtrahend) const;
		Vector &operator-=(const Vector &subtrahend);
		
		/*
		Name: Multiplication operator
		Purpose: Allows scaling a vector
		*/
		Vector operator*(double multiplier) const;
		Vector &operator*=(double multiplier);
		
		/*
		Name: Division operator
		Purpose: Allows shrinking a vector
		*/
		Vector operator/(double divisor) const;
		Vector &operator/=(double divisor);
		
		/*
		Name: Subscript operator
		Purpose: Allows addressing vector components
		*/
		const double& operator[](int index) const;
		double& operator[](int index);
		
		/*
		Name: Assignment operator
		Purpose: Allows copying a vector
		*/
		Vector &operator=(const Vector &vector);
	
		// Vector components
		double x;
		double y;
		double z;
		double e;
};


#endif
