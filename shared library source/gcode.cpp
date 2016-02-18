// Header files
#include <cstring>
#include <cmath>
#include "gcode.h"


// Definitions
// Offsets                      1111111111 
//                    0123456.8901....6789
const char ORDER[] = "NMGXYZE FTSP    IJRD";
const int ORDERlen = sizeof(ORDER)-1;
#define _NO 0xFF
unsigned char orderToOffset[] = {
  /*    0 nul */ _NO,/*    1 soh */ _NO,/*    2 stx */ _NO,/*    3 etx */ _NO,/*    4 eot */ _NO,/*    5 enq */ _NO,/*    6 ack */ _NO,/*    7 bel */ _NO,
  /*    8 bs  */ _NO,/*    9 ht  */ _NO,/*   10 nl  */ _NO,/*   11 vt  */ _NO,/*   12 np  */ _NO,/*   13 cr  */ _NO,/*   14 so  */ _NO,/*   15 si  */ _NO,
  /*   16 dle */ _NO,/*   17 dc1 */ _NO,/*   18 dc2 */ _NO,/*   19 dc3 */ _NO,/*   20 dc4 */ _NO,/*   21 nak */ _NO,/*   22 syn */ _NO,/*   23 etb */ _NO,
  /*   24 can */ _NO,/*   25 em  */ _NO,/*   26 sub */ _NO,/*   27 esc */ _NO,/*   28 fs  */ _NO,/*   29 gs  */ _NO,/*   30 rs  */ _NO,/*   31 us  */ _NO,
  /*   32 sp  */ _NO,/*   33  !  */ _NO,/*   34  "  */ _NO,/*   35  #  */ _NO,/*   36  $  */ _NO,/*   37  %  */ _NO,/*   38  &  */ _NO,/*   39  '  */ _NO,
  /*   40  (  */ _NO,/*   41  )  */ _NO,/*   42  *  */ _NO,/*   43  +  */ _NO,/*   44  ,  */ _NO,/*   45  -  */ _NO,/*   46  .  */ _NO,/*   47  /  */ _NO,
  /*   48  0  */ _NO,/*   49  1  */ _NO,/*   50  2  */ _NO,/*   51  3  */ _NO,/*   52  4  */ _NO,/*   53  5  */ _NO,/*   54  6  */ _NO,/*   55  7  */ _NO,
  /*   56  8  */ _NO,/*   57  9  */ _NO,/*   58  :  */ _NO,/*   59  ;  */ _NO,/*   60  <  */ _NO,/*   61  =  */ _NO,/*   62  >  */ _NO,/*   63  ?  */ _NO,
  /*   64  @  */ _NO,/*   65  A  */ _NO,/*   66  B  */ _NO,/*   67  C  */ _NO,/*   68  D  */  19,/*   69  E  */   6,/*   70  F  */   8,/*   71  G  */   2,
  /*   72  H  */ _NO,/*   73  I  */  16,/*   74  J  */  17,/*   75  K  */ _NO,/*   76  L  */ _NO,/*   77  M  */   1,/*   78  N  */   0,/*   79  O  */ _NO,
  /*   80  P  */  11,/*   81  Q  */ _NO,/*   82  R  */  18,/*   83  S  */  10,/*   84  T  */   9,/*   85  U  */ _NO,/*   86  V  */ _NO,/*   87  W  */ _NO,
  /*   88  X  */   3,/*   89  Y  */   4,/*   90  Z  */   5,/*   91  [  */ _NO,/*   92  \  */ _NO,/*   93  ]  */ _NO,/*   94  ^  */ _NO,/*   95  _  */ _NO,
  /*   96  `  */ _NO,/*   97  a  */ _NO,/*   98  b  */ _NO,/*   99  c  */ _NO,/*  100  d  */ _NO,/*  101  e  */ _NO,/*  102  f  */ _NO,/*  103  g  */ _NO,
  /*  104  h  */ _NO,/*  105  i  */ _NO,/*  106  j  */ _NO,/*  107  k  */ _NO,/*  108  l  */ _NO,/*  109  m  */ _NO,/*  110  n  */ _NO,/*  111  o  */ _NO,
  /*  112  p  */ _NO,/*  113  q  */ _NO,/*  114  r  */ _NO,/*  115  s  */ _NO,/*  116  t  */ _NO,/*  117  u  */ _NO,/*  118  v  */ _NO,/*  119  w  */ _NO,
  /*  120  x  */ _NO,/*  121  y  */ _NO,/*  122  z  */ _NO,/*  123  {  */ _NO,/*  124  |  */ _NO,/*  125  }  */ _NO,/*  126  ~  */ _NO,/*  127 del */ _NO,
  _NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,
  _NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,
  _NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,
  _NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,_NO,
};  


// Supporting function implementation
Gcode::Gcode() :
	// Set inital data type
	// TLH Initialization syntax is preferred for constructors.
	dataType(0x1080)
{
	// Set parameter value size
	parameterValue.resize(ORDERlen);
	
}

// TLH the assignment statements were all backwards.
// Also, initialization syntax is preferred for constructors.
Gcode::Gcode(const Gcode &value) :
	// Copy original command
	originalCommand(value.originalCommand),
	// Copy parameter values
	parameterValue(value.parameterValue),
	// Copy data type
	dataType(value.dataType),
	// Copy host command
	hostCommand(value.hostCommand)
{
}

// TLH repeated substrings are expensive
// TLH a linear search is okay once, but not repeatedly
//	if((characterOffset = command.find('*')) != string::npos)
//		// Remove checksum
//		command = command.substr(0, characterOffset);
//
//	// Remove leading and trailing whitespace
// TLH find_first_not_of is expensive compared to isspace()
//	if((characterOffset = command.find_first_not_of(" \t\n\r")) != string::npos)
//		command = command.substr(characterOffset);
// TLH find_last_not_of is expensive compared to isspace()
//	if((characterOffset = command.find_last_not_of(" \t\n\r")) != string::npos)
//		command = command.substr(0, characterOffset + 1);
//	// Check if command contains a comment
//	if((characterOffset = command.find(';')) != string::npos)
//		// Remove comment
//		command = command.substr(0, characterOffset);

bool Gcode::parseLine(const char *line) {

	// Reset data type
	dataType = 0x1080;
	
	// Reset parameter values
	parameterValue.clear();
	parameterValue.resize(ORDERlen);
	
	// Clear host command
	hostCommand.clear();
	
	// Check if command contains a checksum
	const char *line0 = line;

	// remove leading whitespace
	while (isspace(*line0))
		line0++;

	// Remove checksum
	// If no checksum, set lineStar to end of line
	const char *lineStar = line0;
	const char *comment = 0;
	while (*lineStar && (*lineStar != '*')) {
		if (*lineStar == ';')
			comment = lineStar;
		lineStar++;
	}

	// Remove leading and trailing whitespace
	while ((lineStar > line0) && isspace(lineStar[-1]))
		lineStar--;

	// Set original command
	originalCommand = string(line0, lineStar - line0);
	
	if (comment)
		lineStar = comment;
	
	// Check if command is empty
	//	if(!command.length())
	if (line0 == lineStar)	{

		// Return false
		return false;
	}
	
	// now(!) we can create the command string
	string command(line0, lineStar - line0);

	// Check if command is a host command
	if(command[0] == '@') {
	
		// Set host command
		hostCommand = command;
		
		// Return true
		return true;
	}
	
	// Otherwise check if command is a comment
	else if(command[0] == ';')
		
		// Return false
		return false;
	
	// Initialize variables used in parsing the line
	string currentValue;
	// size_t characterOffset;
	unsigned char parameterIdentifier = 0;
	int parameterOffset;
	
	// Go through data
	for(uint8_t i = 0; i <= command.length(); i++) {
	
		// Check if a parameter is detected
		if(i == 0 || isupper(command[i]) || command[i] == ' ' || !command[i]) {
		
			// Check if valid value has been obtained for the parameter
			if(i && (parameterOffset = orderToOffset[parameterIdentifier]) != _NO) {
			
				// Set data type
				dataType |= (1 << parameterOffset);
			
				// Store parameter value
				parameterValue[parameterOffset] = currentValue;
			}
			
			// Reset current value
			currentValue.clear();
			
			// Check if a string is required
			if(parameterIdentifier == 'M' && (parameterValue[1] == "23" || parameterValue[1] == "28" || parameterValue[1] == "29" || parameterValue[1] == "30" || parameterValue[1] == "32" || parameterValue[1] == "117")) {
			
				// Get string data
				for(; i < command.length(); i++)
					currentValue.push_back(command[i]);

				// Remove leading and trailing whitespace
				size_t characterOffset1 = currentValue.find_first_not_of(" \t\n\r");
				if (characterOffset1 == string::npos) characterOffset1 = 0;
				size_t characterOffset2 = currentValue.find_last_not_of(" \t\n\r");
				if (characterOffset2 == string::npos) characterOffset2 = currentValue.length();
				else characterOffset2++;
				currentValue = currentValue.substr(characterOffset1, characterOffset2 - characterOffset1);

				//				if((characterOffset = currentValue.find_first_not_of(" \t\n\r")) != string::npos)
				//					currentValue = currentValue.substr(characterOffset);
				//				if((characterOffset = currentValue.find_last_not_of(" \t\n\r")) != string::npos)
				//					currentValue = currentValue.substr(0, characterOffset + 1);

				// Set string parameter
				parameterValue[15] = currentValue;

				// Check if string exists
				if(!parameterValue[15].empty()) {

					// Set data type
					dataType |= (1 << 15);
				}

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

// convert a float from the binary line into its string value
static inline string grabBinaryFloat(const char *line, uint8_t &index) {
	// tempFloat is initialized below using bit-fiddling
	float tempFloat;
	int32_t *tempPointer = reinterpret_cast<int32_t *>(&tempFloat);

	// Set parameter value from the binary float value
	*tempPointer = (line[index] & 0xF0) +
		(line[index] & 0x0F) +
		(((line[index + 1] & 0xF0) + (line[index + 1] & 0x0F)) << 8) +
		(((line[index + 2] & 0xF0) + (line[index + 2] & 0x0F)) << 16) +
		(((line[index + 3] & 0xF0) + (line[index + 3] & 0x0F)) << 24);

	// Increment parameter location index
	index += 4;

	return to_string(tempFloat);
}

bool Gcode::parseBinary(const char *line) {

	// Set data type
	dataType = (line[0] & 0xFF) +
	  (((line[1] & 0xFF)) << 8) +
	  (((line[2] & 0xFF)) << 16) +
	  (((line[3] & 0xFF)) << 24);
	
	// Check if command contains no data
	if(!dataType || dataType == 0x1080)
	
		// Return false
		return false;
	
	// Reset parameter values
	parameterValue.clear();
	parameterValue.resize(ORDERlen);
	
	// Clear host command
	hostCommand.clear();
	
	// Initialize parameter location index
	uint8_t index = 4;

	// Check if command contains a string parameter
	if(dataType & (1 << 15))
	
		// Increment parameter location index
		index++;
	
	// Check if command contains an N value
	if(dataType & 1) {
	
		// Set parameter value
		parameterValue[0] = to_string((line[index] & 0xFF) + ((line[index + 1] & 0xFF) << 8));
		
		// Increment parameter location index
		index += 2;
	}
	
	// Check if command contains an M value
	if(dataType & (1 << 1)) {
	
		// Set parameter value
		parameterValue[1] = to_string((line[index] & 0xFF) + (((line[index + 1] & 0xFF)) << 8));
		
		// Increment parameter location index
		index += 2;
	}
	
	// Check if command contains an G value
	if(dataType & (1 << 2)) {
	
		// Set parameter value
		parameterValue[2] = to_string((line[index] & 0xFF) + ((line[index + 1] & 0xFF) << 8));
		
		// Increment parameter location index
		index += 2;
	}
	
	// Check if command contains an X value
	if(dataType & (1 << 3)) {
		parameterValue[3] = grabBinaryFloat(line, index);
	}
	
	// Check if command contains a Y value
	if(dataType & (1 << 4)) {
		parameterValue[4] = grabBinaryFloat(line, index);
	}
	
	// Check if command contains a Z value
	if(dataType & (1 << 5)) {
		parameterValue[5] = grabBinaryFloat(line, index);
	}
	
	// Check if command contains an E value
	if(dataType & (1 << 6)) {
		parameterValue[6] = grabBinaryFloat(line, index);
	}
	
	// Check if command contains an F value
	if(dataType & (1 << 8)) {
		parameterValue[8] = grabBinaryFloat(line, index);
	}
	
	// Check if command contains a T value
	if(dataType & (1 << 9)) {
	
		// Set parameter value
		parameterValue[9] = to_string(line[index] & 0xFF);
		
		// Increment parameter location index
		index++;
	}
	
	// Check if command contains an S value
	if(dataType & (1 << 10)) {
	
		// Set parameter value
		parameterValue[10] = to_string((line[index] & 0xFF) +
					       ((line[index + 1] & 0xFF) << 8) +
					       ((line[index + 2] & 0xFF) << 16) +
					       ((line[index + 3] & 0xFF) << 24));
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains a P value
	if(dataType & (1 << 11)) {
	
		// Set parameter value
		parameterValue[11] = to_string((line[index] & 0xFF) +
					       ((line[index + 1] & 0xFF) << 8) +
					       ((line[index + 2] & 0xFF) << 16) +
					       ((line[index + 3] & 0xFF) << 24));
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains an I value
	if(dataType & (1 << 16)) {
		parameterValue[16] = grabBinaryFloat(line, index);
	}
	
	// Check if command contains a J value
	if(dataType & (1 << 17)) {
		parameterValue[17] = grabBinaryFloat(line, index);
	}
	
	// Check if command contains an R value
	if(dataType & (1 << 18)) {
		parameterValue[18] = grabBinaryFloat(line, index);
	}
	
	// Check if command contains a D value
	if(dataType & (1 << 19)) {
		parameterValue[19] = grabBinaryFloat(line, index);
	}
	
	// Check if command contains a string parameter
	if(dataType & (1 << 15))
	
		// Set string parameter value
		for(uint8_t i = 0; i < (line[4] & 0xFF); i++)
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

// Set 2 byte integer parameter value
inline static void pushBackInt16(vector<uint8_t> &request, const string &value) {
	int32_t tempNumber = stoi(value);
	request.push_back(tempNumber & 0xFF);
	request.push_back((tempNumber >> 8) & 0xFF);
}

// Set 4 byte float parameter value
inline static void pushBackFloat(vector<uint8_t> &request, const string &value) {
	float tempFloat = stof(value);
	int32_t *tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
	request.push_back(*tempPointer & 0xFF);
	request.push_back((*tempPointer >> 8) & 0xFF);
	request.push_back((*tempPointer >> 16) & 0xFF);
	request.push_back((*tempPointer >> 24) & 0xFF);
}

// Set 4 byte integer parameter value
inline static void pushBackRoundedInt32(vector<uint8_t> &request, const string &value) {
	int32_t tempNumber = static_cast<int>(round(stod(value)));
	request.push_back(tempNumber & 0xFF);
	request.push_back((tempNumber >> 8) & 0xFF);
	request.push_back((tempNumber >> 16) & 0xFF);
	request.push_back((tempNumber >> 24) & 0xFF);
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
		// Fill first four bytes of request to data type
		request.push_back(dataType);
		request.push_back(dataType >> 8);
		request.push_back(dataType >> 16);
		request.push_back(dataType >> 24);
	
		// Check if command contains a string parameter
		if(!parameterValue[15].empty()) {	
			// Set fifth byte of request to string length
			request.push_back(parameterValue[15].length());
		}
		
		// Check if command contains an N value
		if(!parameterValue[0].empty()) {
			pushBackInt16(request, parameterValue[0]);
		}
		
		// Check if command contains an M value
		if(!parameterValue[1].empty()) {
			pushBackInt16(request, parameterValue[1]);
		}
		
		// Check if command contains a G value
		if(!parameterValue[2].empty()) {
			pushBackInt16(request, parameterValue[2]);
		}
		
		// Check if command contains an X value
		if(!parameterValue[3].empty()) {
			pushBackFloat(request, parameterValue[3]);
		}
		
		// Check if command contains a Y value
		if(!parameterValue[4].empty()) {
			pushBackFloat(request, parameterValue[4]);
		}
		
		// Check if command contains a Z value
		if(!parameterValue[5].empty()) {
			pushBackFloat(request, parameterValue[5]);
		}
		
		// Check if command contains an E value
		if(!parameterValue[6].empty()) {
			pushBackFloat(request, parameterValue[6]);
		}
		
		// Check if command contains an F value
		if(!parameterValue[8].empty()) {
			pushBackFloat(request, parameterValue[8]);
		}
		
		// Check if command contains a T value
		if(!parameterValue[9].empty()) {
			// Set 1 byte integer parameter value
			int32_t tempNumber = stoi(parameterValue[9]);
			request.push_back(tempNumber & 0xFF);
		}
		
		// Check if command contains an S value
		if(!parameterValue[10].empty()) {
			pushBackRoundedInt32(request, parameterValue[10]);
		}
		
		// Check if command contains a P value
		if(!parameterValue[11].empty()) {
			pushBackRoundedInt32(request, parameterValue[11]);
		}
		
		// Check if command contains an I value
		if(!parameterValue[16].empty()) {
			pushBackFloat(request, parameterValue[16]);
		}
		
		// Check if command contains a J value
		if(!parameterValue[17].empty()) {
			pushBackFloat(request, parameterValue[17]);
		}
		
		// Check if command contains an R value
		if(!parameterValue[18].empty()) {
			pushBackFloat(request, parameterValue[18]);
		}
		
		// Check if command contains a D value
		if(!parameterValue[19].empty()) {
			pushBackFloat(request, parameterValue[19]);
		}
		
		// Check if command contains a string
		if(!parameterValue[15].empty())
			// Set string parameter value
			for(uint8_t i = 0; i < parameterValue[15].length(); i++)
				request.push_back(parameterValue[15][i]);
		
		// Initialize sum variables
		uint16_t sum1 = 0, sum2 = 0;

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
	for(uint8_t i = 0; i < ORDERlen; i++) {
		
		// Check if command contains value and value is valid
		if(dataType & (1 << i) && 0xF0F7F & (1 << i)) {
		
			// Append parameter identifier and value
			request += ORDER[i] + parameterValue[i] + ' ';
			
			// Check if M command contains a string
			if(i == 1 && dataType & (1 << 15))
	
				// Append string to request
				request += parameterValue[15] + ' ';
		}
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

  // TLH checking twice
  //	// Check if parameter isn't a space
  //	if(parameter != ' ') {

	// Check if parameter is valid
	int parameterOffset = orderToOffset[(unsigned char)parameter];
	if(parameterOffset != _NO)
	
		// Return if value is set
		return dataType & (1 << parameterOffset);
  //	}
	
	// Return false
	return false;
}

void Gcode::removeParameter(char parameter) {

  // TLH checking twice
  //	// Check if parameter isn't a space
  //	if(parameter != ' ') {

		// Check if parameter is valid
		int parameterOffset = orderToOffset[(unsigned char) parameter];
		if(parameterOffset != _NO) {

			// Clear data type
			dataType &= ~(1 << parameterOffset);

			// Clear parameter value
			parameterValue[parameterOffset].clear();

			// Check if command is now empty
			if(dataType == 0x1080)

				// Clear original command
				originalCommand = "";
		}
  //	}
}

bool Gcode::hasValue(char parameter) const {

  // TLH checking twice
  //	// Check if parameter isn't a space
  //	if(parameter != ' ') {
	
		// Check if parameter is valid
		int parameterOffset = orderToOffset[(unsigned char)parameter];
		if(parameterOffset != _NO)
	
			// Return if parameter's value isn't empty
			return !parameterValue[parameterOffset].empty();
  //	}
	
	// Return false
	return false;
}

string Gcode::getValue(char parameter) const {

  // TLH checking twice
  //	// Check if parameter isn't a space
  //	if(parameter != ' ') {
	
		// Check if parameter is valid
		int parameterOffset = orderToOffset[(unsigned char)parameter];
		if(parameterOffset != _NO)
	
			// Return parameter's value
			return parameterValue[parameterOffset];
  //	}
	
	// Return empty
	return "";
}

void Gcode::setValue(char parameter, const string &value) {

  // TLH checking twice
  //	// Check if parameter isn't a space
  //	if(parameter != ' ') {
	
		// Check if parameter is valid
		int parameterOffset = orderToOffset[(unsigned char) parameter];
		if(parameterOffset != _NO) {
	
			// Set data type
			dataType |= (1 << parameterOffset);
	
			// Set parameter value
			parameterValue[parameterOffset] = value;
		}
  //	}
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
	parameterValue.resize(ORDERlen);
	
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
