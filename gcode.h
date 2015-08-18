// Header gaurd
#ifndef GCODE_H
#define GCODE_H


// Header files
#include <iostream>
#include <vector>

using namespace std;


// Gcode class
class Gcode {

	// Public
	public:
	
		/*
		Name: Constructor
		Purpose: Initializes the variable
		*/
		Gcode();
		
		/*
		Name: Copy Constructor
		Purpose: Initializes the variable if copied
		*/
		Gcode(Gcode &value);
		
		/*
		Name: Parse Line
		Purpose: Extracts G-code from the parameter
		*/
		bool parseLine(const char *line);
		bool parseLine(const string &line);
		
		/*
		Name: Get original command
		Purpose: Returns the orignal G-code command
		*/
		string getOriginalCommand() const ;
		
		/*
		Name: Get Binary
		Purpose: Returns binary representation of the G-code
		*/
		vector<uint8_t> getBinary() const;
		
		/*
		Name: Get Ascii
		Purpose: Returns Ascii representation of the G-code
		*/
		string getAscii() const;
		
		/*
		Name: Get Data Type
		Purpose: Returns the data type of the G-code
		*/
		uint32_t getDataType() const;
		
		/*
		Name: Has Parameter
		Purpose: Checks if the G-code has a specific parameter, but does not check if it has a value associated with it
		*/
		bool hasParameter(char parameter) const;
		
		/*
		Name: Remove Parameter
		Purpose: Removes a specified parameter from the G-cocdde
		*/
		void removeParameter(char parameter);
		
		/*
		Name: Has Value
		Purpose: Checks if the G-code has a value associated with a specific parameter, so it can't detect flags
		*/
		bool hasValue(char parameter) const;
		
		/*
		Name: Get Value
		Purpose: Retuns the value associated with a specific parameter
		*/
		string getValue(char parameter) const;
		
		/*
		Name: Set Value
		Purpose: Sets the value associated with a specific parameter
		*/
		void setValue(char parameter, const string &value);
		
		/*
		Name: Has String
		Purpose: Returns if the G-code contained a string as a value for a parameter
		*/
		bool hasString() const;
		
		/*
		Name: Get String
		Purpose: Returns the string value associated with a parameter
		*/
		string getString() const;
		
		/*
		Name: Set String
		Purpose: Sets the string value associated with a parameter
		*/
		void setString(const string &value);
		
		/*
		Name: Clear
		Purpose: Resets G-code to initial state
		*/
		void clear();
		
		/*
		Name: Is Host Command
		Purpose: Returns if the G-code is a host command
		*/
		bool isHostCommand() const;
		
		/*
		Name: Is Empty
		Purpose: Returns if no G-code has attempted to be parsed yet
		*/
		bool isEmpty() const;
		
		/*
		Name: Assignment Operator
		Purpose: Allows using the assignment operator
		*/
		Gcode &operator=(const Gcode &value);
		
		/*
		Name: Output Stream Operator
		Purpose: Allows using the output stream operator
		*/
		friend ostream &operator<<(ostream &output, const Gcode &value);
		
	// Private
	private:
	
		// Original command
		string originalCommand;
	
		// Parameter values
		vector<string> parameterValue;
		
		// Data type
		uint32_t dataType;
		
		// Host command
		string hostCommand;
};


#endif
