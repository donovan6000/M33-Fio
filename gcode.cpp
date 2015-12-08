// Header files
#include <cstring>
#include <cmath>
#include "gcode.h"


// Definitions
#define ORDER "NMGXYZE FTSP    IJRD"


// Supporting function implementation
Gcode::Gcode() {

	// Set parameter value size
	parameterValue.resize(strlen(ORDER));
	
	// Set inital data type
	dataType = 0x1080;
}

Gcode::Gcode(Gcode &value) {

	// Copy data type
	value.dataType = this->dataType;
	
	// Copy host command
	value.hostCommand = this->hostCommand;
	
	// Copy parameter values
	value.parameterValue = this->parameterValue;
	
	// Copy original command
	value.originalCommand = this->originalCommand;
}

bool Gcode::parseLine(const char *line) {

	// Initialize variables
	string command = line, currentValue;
	size_t characterOffset;
	char parameterIdentifier = 0;
	const char *parameterOffset;
	
	// Reset data type
	dataType = 0x1080;
	
	// Reset parameter values
	parameterValue.clear();
	parameterValue.resize(strlen(ORDER));
	
	// Clear host command
	hostCommand.clear();
	
	// Check if command contains a checksum
	if((characterOffset = command.find('*')) != string::npos)
	
		// Remove checksum
		command = command.substr(0, characterOffset);
	
	// Remove leading and trailing whitespace
	if((characterOffset = command.find_first_not_of(" \t\n\r")) != string::npos)
		command = command.substr(characterOffset);
	if((characterOffset = command.find_last_not_of(" \t\n\r")) != string::npos)
		command = command.substr(0, characterOffset + 1);
	
	// Set original command
	originalCommand = command;
	
	// Check if command contains a comment
	if((characterOffset = command.find(';')) != string::npos)

		// Remove comment
		command = command.substr(0, characterOffset);
	
	// Check if command is empty
	if(!command.length())
	
		// Return false
		return false;
	
	// Check if command is a host command
	if(command[0] == '@') {
	
		// Set host command
		hostCommand = command;
		
		// Return true
		return true;
	}
	
	// Go through data
	for(uint8_t i = 0; i <= command.length(); i++) {
	
		// Check if a parameter is detected
		if(i == 0 || isupper(command[i]) || command[i] == ' ' || !command[i]) {
		
			// Check if valid value has been obtained for the parameter
			if(i && parameterIdentifier != ' ' && (parameterOffset = strchr(ORDER, parameterIdentifier))) {
			
				// Set data type
				dataType |= (1 << (parameterOffset - ORDER));
			
				// Store parameter value
				parameterValue[parameterOffset - ORDER] = currentValue;
			}
			
			// Reset current value
			currentValue.clear();
			
			// Check if a string is required
			if(parameterIdentifier == 'M' && (parameterValue[1] == "23" || parameterValue[1] == "28" || parameterValue[1] == "29" || parameterValue[1] == "30" || parameterValue[1] == "32" || parameterValue[1] == "117")) {
			
				// Get string data
				for(; i < command.length(); i++)
					currentValue.push_back(command[i]);
			
				// Remove leading and trailing whitespace
				if((characterOffset = currentValue.find_first_not_of(" \t\n\r")) != string::npos)
					currentValue = currentValue.substr(characterOffset);
				if((characterOffset = currentValue.find_last_not_of(" \t\n\r")) != string::npos)
					currentValue = currentValue.substr(0, characterOffset + 1);
				
				// Set string parameter
				parameterValue[15] = currentValue;
				
				// Check if string exists
				if(!parameterValue[15].empty())
					
					// Set data type
					dataType |= (1 << 15);
		
				// Stop parsing line
				break;
			}
			
			// Set parameter identifier
			parameterIdentifier = command[i];
		}
	
		// Otherwise check if value isn't whitespace
		else if(!isspace(command[i]))
	
			// Get current value
			currentValue.push_back(command[i]);
	}
	
	// Return if data wasn't empty
	return dataType != 0x1080;
}

bool Gcode::parseLine(const string &line) {

	// Return parse line
	return parseLine(line.c_str());
}

bool Gcode::parseBinary(const char *line) {

	// Initialize variables
	uint8_t index = 4;
	int32_t *tempPointer;
	float tempFloat;

	// Set data type
	dataType = (line[0] & 0xF0) + (line[0] & 0x0F) + (((line[1] & 0xF0) + (line[1] & 0x0F)) << 8) + (((line[2] & 0xF0) + (line[2] & 0x0F)) << 16) + (((line[3] & 0xF0) + (line[3] & 0x0F)) << 24);
	
	// Check if command contains no data
	if(!dataType || dataType == 0x1080)
	
		// Return false
		return false;
	
	// Reset parameter values
	parameterValue.clear();
	parameterValue.resize(strlen(ORDER));
	
	// Clear host command
	hostCommand.clear();
	
	// Check if command contains a string parameter
	if(dataType & (1 << 15))
	
		// Increment parameter location index
		index++;
	
	// Check if command contains an N value
	if(dataType & 1) {
	
		// Set parameter value
		parameterValue[0] = to_string((line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8));
		
		// Increment parameter location index
		index += 2;
	}
	
	// Check if command contains an M value
	if(dataType & (1 << 1)) {
	
		// Set parameter value
		parameterValue[1] = to_string((line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8));
		
		// Increment parameter location index
		index += 2;
	}
	
	// Check if command contains an G value
	if(dataType & (1 << 2)) {
	
		// Set parameter value
		parameterValue[2] = to_string((line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8));
		
		// Increment parameter location index
		index += 2;
	}
	
	// Check if command contains an X value
	if(dataType & (1 << 3)) {
	
		// Set parameter value
		tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
		*tempPointer = (line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) + (((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) + (((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24);
		parameterValue[3] = to_string(tempFloat);
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains a Y value
	if(dataType & (1 << 4)) {
	
		// Set parameter value
		tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
		*tempPointer = (line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) + (((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) + (((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24);
		parameterValue[4] = to_string(tempFloat);
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains a Z value
	if(dataType & (1 << 5)) {
	
		// Set parameter value
		tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
		*tempPointer = (line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) + (((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) + (((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24);
		parameterValue[5] = to_string(tempFloat);
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains an E value
	if(dataType & (1 << 6)) {
	
		// Set parameter value
		tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
		*tempPointer = (line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) + (((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) + (((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24);
		parameterValue[6] = to_string(tempFloat);
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains an F value
	if(dataType & (1 << 8)) {
	
		// Set parameter value
		tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
		*tempPointer = (line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) + (((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) + (((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24);
		parameterValue[8] = to_string(tempFloat);
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains a T value
	if(dataType & (1 << 9)) {
	
		// Set parameter value
		parameterValue[9] = to_string((line[index] & 0xF0) + (line[index] & 0x0F));
		
		// Increment parameter location index
		index++;
	}
	
	// Check if command contains an S value
	if(dataType & (1 << 10)) {
	
		// Set parameter value
		parameterValue[10] = to_string((line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) + (((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) + (((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24));
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains a P value
	if(dataType & (1 << 11)) {
	
		// Set parameter value
		parameterValue[11] = to_string((line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) + (((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) + (((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24));
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains an I value
	if(dataType & (1 << 16)) {
	
		// Set parameter value
		tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
		*tempPointer = (line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) + (((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) + (((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24);
		parameterValue[16] = to_string(tempFloat);
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains a J value
	if(dataType & (1 << 17)) {
	
		// Set parameter value
		tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
		*tempPointer = (line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) + (((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) + (((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24);
		parameterValue[17] = to_string(tempFloat);
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains an R value
	if(dataType & (1 << 18)) {
	
		// Set parameter value
		tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
		*tempPointer = (line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) + (((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) + (((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24);
		parameterValue[18] = to_string(tempFloat);
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains a D value
	if(dataType & (1 << 19)) {
	
		// Set parameter value
		tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
		*tempPointer = (line[index] & 0xF0) + (line[index] & 0x0F) + (((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) + (((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) + (((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24);
		parameterValue[19] = to_string(tempFloat);
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains a string parameter
	if(dataType & (1 << 15))
	
		// Set string parameter value
		for(uint8_t i = 0; i < (line[4] & 0xF0) + (line[4] & 0x0F); i++)
			parameterValue[15].push_back(line[index + i]);
	
	// Set original command
	originalCommand = getAscii();
	
	// Return true
	return true;
}

string Gcode::getOriginalCommand() const {

	// Return original command
	return originalCommand;
}

vector<uint8_t> Gcode::getBinary() const {

	// Initialize request
	vector<uint8_t> request;
	
	// Check if host command
	if(!hostCommand.empty())
	
		// Set request to host command
		for(uint8_t i = 0; i < hostCommand.length(); i++)
			request.push_back(hostCommand[i]);
	
	// Otherwise
	else {
	
		// Initialize variables
		uint16_t sum1 = 0, sum2 = 0;
		int32_t tempNumber, *tempPointer;
		float tempFloat;
		
		// Fill first four bytes of request to data type
		request.push_back(dataType);
		request.push_back(dataType >> 8);
		request.push_back(dataType >> 16);
		request.push_back(dataType >> 24);
	
		// Check if command contains a string parameter
		if(!parameterValue[15].empty())
	
			// Set fifth byte of request to string length
			request.push_back(parameterValue[15].length());
		
		// Check if command contains an N value
		if(!parameterValue[0].empty()) {
		
			// Set 2 byte integer parameter value
			tempNumber = stoi(parameterValue[0]);
			request.push_back(tempNumber & 0xFF);
			request.push_back((tempNumber >> 8) & 0xFF);
		}
		
		// Check if command contains an M value
		if(!parameterValue[1].empty()) {
		
			// Set 2 byte integer parameter value
			tempNumber = stoi(parameterValue[1]);
			request.push_back(tempNumber & 0xFF);
			request.push_back((tempNumber >> 8) & 0xFF);
		}
		
		// CCheck if command contains a G value
		if(!parameterValue[2].empty()) {
		
			// Set 2 byte integer parameter value
			tempNumber = stoi(parameterValue[2]);
			request.push_back(tempNumber & 0xFF);
			request.push_back((tempNumber >> 8) & 0xFF);
		}
		
		// Check if command contains an X value
		if(!parameterValue[3].empty()) {
			
			// Set 4 byte float parameter value
			tempFloat = stof(parameterValue[3]);
			tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
			request.push_back(*tempPointer & 0xFF);
			request.push_back((*tempPointer >> 8) & 0xFF);
			request.push_back((*tempPointer >> 16) & 0xFF);
			request.push_back((*tempPointer >> 24) & 0xFF);
		}
		
		// Check if command contains a Y value
		if(!parameterValue[4].empty()) {
			
			// Set 4 byte float parameter value
			tempFloat = stof(parameterValue[4]);
			tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
			request.push_back(*tempPointer & 0xFF);
			request.push_back((*tempPointer >> 8) & 0xFF);
			request.push_back((*tempPointer >> 16) & 0xFF);
			request.push_back((*tempPointer >> 24) & 0xFF);
		}
		
		// Check if command contains a Z value
		if(!parameterValue[5].empty()) {
			
			// Set 4 byte float parameter value
			tempFloat = stof(parameterValue[5]);
			tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
			request.push_back(*tempPointer & 0xFF);
			request.push_back((*tempPointer >> 8) & 0xFF);
			request.push_back((*tempPointer >> 16) & 0xFF);
			request.push_back((*tempPointer >> 24) & 0xFF);
		}
		
		// Check if command contains an E value
		if(!parameterValue[6].empty()) {
			
			// Set 4 byte float parameter value
			tempFloat = stof(parameterValue[6]);
			tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
			request.push_back(*tempPointer & 0xFF);
			request.push_back((*tempPointer >> 8) & 0xFF);
			request.push_back((*tempPointer >> 16) & 0xFF);
			request.push_back((*tempPointer >> 24) & 0xFF);
		}
		
		// Check if command contains an F value
		if(!parameterValue[8].empty()) {
			
			// Set 4 byte float parameter value
			tempFloat = stof(parameterValue[8]);
			tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
			request.push_back(*tempPointer & 0xFF);
			request.push_back((*tempPointer >> 8) & 0xFF);
			request.push_back((*tempPointer >> 16) & 0xFF);
			request.push_back((*tempPointer >> 24) & 0xFF);
		}
		
		// Check if command contains a T value
		if(!parameterValue[9].empty()) {
		
			// Set 1 byte integer parameter value
			tempNumber = stoi(parameterValue[9]);
			request.push_back(tempNumber & 0xFF);
		}
		
		// Check if command contains an S value
		if(!parameterValue[10].empty()) {
			
			// Set 4 byte integer parameter value
			tempNumber = static_cast<int>(round(stod(parameterValue[10])));
			request.push_back(tempNumber & 0xFF);
			request.push_back((tempNumber >> 8) & 0xFF);
			request.push_back((tempNumber >> 16) & 0xFF);
			request.push_back((tempNumber >> 24) & 0xFF);
		}
		
		// Check if command contains a P value
		if(!parameterValue[11].empty()) {
			
			// Set 4 byte integer parameter value
			tempNumber = static_cast<int>(round(stod(parameterValue[11])));
			request.push_back(tempNumber & 0xFF);
			request.push_back((tempNumber >> 8) & 0xFF);
			request.push_back((tempNumber >> 16) & 0xFF);
			request.push_back((tempNumber >> 24) & 0xFF);
		}
		
		// Check if command contains an I value
		if(!parameterValue[16].empty()) {
			
			// Set 4 byte float parameter value
			tempFloat = stof(parameterValue[16]);
			tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
			request.push_back(*tempPointer & 0xFF);
			request.push_back((*tempPointer >> 8) & 0xFF);
			request.push_back((*tempPointer >> 16) & 0xFF);
			request.push_back((*tempPointer >> 24) & 0xFF);
		}
		
		// Check if command contains a J value
		if(!parameterValue[17].empty()) {
			
			// Set 4 byte float parameter value
			tempFloat = stof(parameterValue[17]);
			tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
			request.push_back(*tempPointer & 0xFF);
			request.push_back((*tempPointer >> 8) & 0xFF);
			request.push_back((*tempPointer >> 16) & 0xFF);
			request.push_back((*tempPointer >> 24) & 0xFF);
		}
		
		// Check if command contains an R value
		if(!parameterValue[18].empty()) {
			
			// Set 4 byte float parameter value
			tempFloat = stof(parameterValue[18]);
			tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
			request.push_back(*tempPointer & 0xFF);
			request.push_back((*tempPointer >> 8) & 0xFF);
			request.push_back((*tempPointer >> 16) & 0xFF);
			request.push_back((*tempPointer >> 24) & 0xFF);
		}
		
		// Check if command contains a D value
		if(!parameterValue[19].empty()) {
			
			// Set 4 byte float parameter value
			tempFloat = stof(parameterValue[19]);
			tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
			request.push_back(*tempPointer & 0xFF);
			request.push_back((*tempPointer >> 8) & 0xFF);
			request.push_back((*tempPointer >> 16) & 0xFF);
			request.push_back((*tempPointer >> 24) & 0xFF);
		}
		
		// Check if command contains a string
		if(!parameterValue[15].empty())
		
			// Set string parameter value
			for(uint8_t i = 0; i < parameterValue[15].length(); i++)
				request.push_back(parameterValue[15][i]);
		
		// Go through all values
		for(uint8_t index = 0; index < request.size(); index++) {

			// Set sums
			sum1 = (sum1 + request[index]) % 0xFF;
			sum2 = (sum1 + sum2)  % 0xFF;
		}

		// Append Fletcher 16 checksum checksum to request
		request.push_back(sum1);
		request.push_back(sum2);
	}
	
	// Return request
	return request;
}

string Gcode::getAscii() const {
	
	// Check if host command
	if(!hostCommand.empty())
	
		// Return host command
		return hostCommand;
	
	// Initialize request
	string request;
	
	// Go through all values
	for(uint8_t i = 0; i < strlen(ORDER); i++)
		
		// Check if command contains value and value is valid
		if(dataType & (1 << i) && 0xF0F7F & (1 << i)) {
		
			// Append parameter identifier and value
			request += ORDER[i] + parameterValue[i] + ' ';
			
			// Check if M command contains a string
			if(i == 1 && dataType & (1 << 15))
	
				// Append string to request
				request += parameterValue[15] + ' ';
		}
	
	// Remove last space from request
	if(!request.empty())
		request.pop_back();
	
	// Return request
	return request;
}

uint32_t Gcode::getDataType() const {

	// Return data type
	return dataType;
}

bool Gcode::hasParameter(char parameter) const {

	// Check if parameter isn't a space
	if(parameter != ' ') {
	
		// Check if parameter is valid
		const char *parameterOffset = strchr(ORDER, parameter);
		if(parameterOffset)
	
			// Return if value is set
			return dataType & (1 << (parameterOffset - ORDER));
	}
	
	// Return false
	return false;
}

void Gcode::removeParameter(char parameter) {

	// Check if parameter isn't a space
	if(parameter != ' ') {
	
		// Check if parameter is valid
		const char *parameterOffset = strchr(ORDER, parameter);
		if(parameterOffset) {
		
			// Clear data type
			dataType &= ~(1 << (parameterOffset - ORDER));
			
			// Clear parameter value
			parameterValue[parameterOffset - ORDER].clear();
		
			// Check if command is now empty
			if(dataType == 0x1080)
		
				// Clear original command
				originalCommand = "";
		}
	}
}

bool Gcode::hasValue(char parameter) const {

	// Check if parameter isn't a space
	if(parameter != ' ') {
	
		// Check if parameter is valid
		const char *parameterOffset = strchr(ORDER, parameter);
		if(parameterOffset)
	
			// Return if parameter's value isn't empty
			return !parameterValue[parameterOffset - ORDER].empty();
	}
	
	// Return false
	return false;
}

string Gcode::getValue(char parameter) const {

	// Check if parameter isn't a space
	if(parameter != ' ') {
	
		// Check if parameter is valid
		const char *parameterOffset = strchr(ORDER, parameter);
		if(parameterOffset)
	
			// Return parameter's value
			return parameterValue[parameterOffset - ORDER];
	}
	
	// Return empty
	return "";
}

void Gcode::setValue(char parameter, const string &value) {

	// Check if parameter isn't a space
	if(parameter != ' ') {
	
		// Check if parameter is valid
		const char *parameterOffset = strchr(ORDER, parameter);
		if(parameterOffset) {
	
			// Set data type
			dataType |= (1 << (parameterOffset - ORDER));
	
			// Set parameter value
			parameterValue[parameterOffset - ORDER] = value;
		}
	}
}

bool Gcode::hasString() const {

	// Return if string is set
	return dataType & (1 << 15);
}

string Gcode::getString() const {

	// Return string
	return parameterValue[15];
}

void Gcode::setString(const string &value) {

	// Set data type
	dataType |= (1 << 15);

	// Set string value
	parameterValue[15] = value;
}

void Gcode::clear() {

	// Set inital data type
	dataType = 0x1080;

	// Set parameter value size
	parameterValue.clear();
	parameterValue.resize(strlen(ORDER));
	
	// Clear host command
	hostCommand.clear();
	
	// Clear original command
	originalCommand.clear();
}

bool Gcode::isHostCommand() const {

	// Return if host command is set
	return !hostCommand.empty();
}

bool Gcode::isEmpty() const {

	// Return if doesn't contain any values
	return dataType == 0x1080;
}

Gcode &Gcode::operator=(const Gcode &value) {

	// Return self if calling on self
	if(this == &value)
		return *this;
	
	// Copy data type
	dataType = value.dataType;
	
	// Copy host command
	hostCommand = value.hostCommand;
	
	// Copy parameter values
	parameterValue = value.parameterValue;
	
	// Copy original command
	originalCommand = value.originalCommand;
	
	// Return self
	return *this;
}

ostream &operator<<(ostream &output, const Gcode &gcode) {

	// Return command sent to output
	return output << (gcode.isEmpty() ? gcode.getOriginalCommand() : gcode.getAscii());
}
