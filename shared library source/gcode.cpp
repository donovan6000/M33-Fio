// Header files
#include "gcode.h"


// Definitions
#define INVALID 0xFF


// Global constants
const char ORDER[] = "NMGXYZE FTSP    IJRD";
const uint8_t ORDER_LENGTH = sizeof(ORDER) - 1;
const uint8_t orderToOffset[] = {
	/*    0 nul */ INVALID, /*    1 soh */ INVALID, /*    2 stx */ INVALID, /*    3 etx */ INVALID, /*    4 eot */ INVALID, /*    5 enq */ INVALID, /*    6 ack */ INVALID, /*    7 bel */ INVALID,
	/*    8 bs  */ INVALID, /*    9 ht  */ INVALID, /*   10 nl  */ INVALID, /*   11 vt  */ INVALID, /*   12 np  */ INVALID, /*   13 cr  */ INVALID, /*   14 so  */ INVALID, /*   15 si  */ INVALID,
	/*   16 dle */ INVALID, /*   17 dc1 */ INVALID, /*   18 dc2 */ INVALID, /*   19 dc3 */ INVALID, /*   20 dc4 */ INVALID, /*   21 nak */ INVALID, /*   22 syn */ INVALID, /*   23 etb */ INVALID,
	/*   24 can */ INVALID, /*   25 em  */ INVALID, /*   26 sub */ INVALID, /*   27 esc */ INVALID, /*   28 fs  */ INVALID, /*   29 gs  */ INVALID, /*   30 rs  */ INVALID, /*   31 us  */ INVALID,
	/*   32 sp  */ INVALID, /*   33  !  */ INVALID, /*   34  "  */ INVALID, /*   35  #  */ INVALID, /*   36  $  */ INVALID, /*   37  %  */ INVALID, /*   38  &  */ INVALID, /*   39  '  */ INVALID,
	/*   40  (  */ INVALID, /*   41  )  */ INVALID, /*   42  *  */ INVALID, /*   43  +  */ INVALID, /*   44  ,  */ INVALID, /*   45  -  */ INVALID, /*   46  .  */ INVALID, /*   47  /  */ INVALID,
	/*   48  0  */ INVALID, /*   49  1  */ INVALID, /*   50  2  */ INVALID, /*   51  3  */ INVALID, /*   52  4  */ INVALID, /*   53  5  */ INVALID, /*   54  6  */ INVALID, /*   55  7  */ INVALID,
	/*   56  8  */ INVALID, /*   57  9  */ INVALID, /*   58  :  */ INVALID, /*   59  ;  */ INVALID, /*   60  <  */ INVALID, /*   61  =  */ INVALID, /*   62  >  */ INVALID, /*   63  ?  */ INVALID,
	/*   64  @  */ INVALID, /*   65  A  */ INVALID, /*   66  B  */ INVALID, /*   67  C  */ INVALID, /*   68  D  */   19,    /*   69  E  */    6,    /*   70  F  */    8,    /*   71  G  */    2,
	/*   72  H  */ INVALID, /*   73  I  */   16,    /*   74  J  */   17,    /*   75  K  */ INVALID, /*   76  L  */ INVALID, /*   77  M  */    1,    /*   78  N  */    0,    /*   79  O  */ INVALID,
	/*   80  P  */   11,    /*   81  Q  */ INVALID, /*   82  R  */   18,    /*   83  S  */   10,    /*   84  T  */    9,    /*   85  U  */ INVALID, /*   86  V  */ INVALID, /*   87  W  */ INVALID,
	/*   88  X  */    3,    /*   89  Y  */    4,    /*   90  Z  */    5,    /*   91  [  */ INVALID, /*   92  \  */ INVALID, /*   93  ]  */ INVALID, /*   94  ^  */ INVALID, /*   95  _  */ INVALID,
	/*   96  `  */ INVALID, /*   97  a  */ INVALID, /*   98  b  */ INVALID, /*   99  c  */ INVALID, /*  100  d  */ INVALID, /*  101  e  */ INVALID, /*  102  f  */ INVALID, /*  103  g  */ INVALID,
	/*  104  h  */ INVALID, /*  105  i  */ INVALID, /*  106  j  */ INVALID, /*  107  k  */ INVALID, /*  108  l  */ INVALID, /*  109  m  */ INVALID, /*  110  n  */ INVALID, /*  111  o  */ INVALID,
	/*  112  p  */ INVALID, /*  113  q  */ INVALID, /*  114  r  */ INVALID, /*  115  s  */ INVALID, /*  116  t  */ INVALID, /*  117  u  */ INVALID, /*  118  v  */ INVALID, /*  119  w  */ INVALID,
	/*  120  x  */ INVALID, /*  121  y  */ INVALID, /*  122  z  */ INVALID, /*  123  {  */ INVALID, /*  124  |  */ INVALID, /*  125  }  */ INVALID, /*  126  ~  */ INVALID, /*  127 del */ INVALID,
	/*  128     */ INVALID, /*  129     */ INVALID, /*  130     */ INVALID, /*  131     */ INVALID, /*  132     */ INVALID, /*  133     */ INVALID, /*  134     */ INVALID, /*  135     */ INVALID,
	/*  136     */ INVALID, /*  137     */ INVALID, /*  138     */ INVALID, /*  139     */ INVALID, /*  140     */ INVALID, /*  141     */ INVALID, /*  142     */ INVALID, /*  143     */ INVALID,
	/*  144     */ INVALID, /*  145     */ INVALID, /*  146     */ INVALID, /*  147     */ INVALID, /*  148     */ INVALID, /*  149     */ INVALID, /*  150     */ INVALID, /*  151     */ INVALID,
	/*  152     */ INVALID, /*  153     */ INVALID, /*  154     */ INVALID, /*  155     */ INVALID, /*  156     */ INVALID, /*  157     */ INVALID, /*  158     */ INVALID, /*  159     */ INVALID,
	/*  160     */ INVALID, /*  161     */ INVALID, /*  162     */ INVALID, /*  163     */ INVALID, /*  164     */ INVALID, /*  165     */ INVALID, /*  166     */ INVALID, /*  167     */ INVALID,
	/*  168     */ INVALID, /*  169     */ INVALID, /*  170     */ INVALID, /*  171     */ INVALID, /*  172     */ INVALID, /*  173     */ INVALID, /*  174     */ INVALID, /*  175     */ INVALID,
	/*  176     */ INVALID, /*  177     */ INVALID, /*  178     */ INVALID, /*  179     */ INVALID, /*  180     */ INVALID, /*  181     */ INVALID, /*  182     */ INVALID, /*  183     */ INVALID,
	/*  184     */ INVALID, /*  185     */ INVALID, /*  186     */ INVALID, /*  187     */ INVALID, /*  188     */ INVALID, /*  189     */ INVALID, /*  190     */ INVALID, /*  191     */ INVALID,
	/*  192     */ INVALID, /*  193     */ INVALID, /*  194     */ INVALID, /*  195     */ INVALID, /*  196     */ INVALID, /*  197     */ INVALID, /*  198     */ INVALID, /*  199     */ INVALID,
	/*  200     */ INVALID, /*  201     */ INVALID, /*  202     */ INVALID, /*  203     */ INVALID, /*  204     */ INVALID, /*  205     */ INVALID, /*  206     */ INVALID, /*  207     */ INVALID,
	/*  208     */ INVALID, /*  209     */ INVALID, /*  210     */ INVALID, /*  211     */ INVALID, /*  212     */ INVALID, /*  213     */ INVALID, /*  214     */ INVALID, /*  215     */ INVALID,
	/*  216     */ INVALID, /*  217     */ INVALID, /*  218     */ INVALID, /*  219     */ INVALID, /*  220     */ INVALID, /*  221     */ INVALID, /*  222     */ INVALID, /*  223     */ INVALID,
	/*  224     */ INVALID, /*  225     */ INVALID, /*  226     */ INVALID, /*  227     */ INVALID, /*  228     */ INVALID, /*  229     */ INVALID, /*  230     */ INVALID, /*  231     */ INVALID,
	/*  232     */ INVALID, /*  233     */ INVALID, /*  234     */ INVALID, /*  235     */ INVALID, /*  236     */ INVALID, /*  237     */ INVALID, /*  238     */ INVALID, /*  239     */ INVALID,
	/*  240     */ INVALID, /*  241     */ INVALID, /*  242     */ INVALID, /*  243     */ INVALID, /*  244     */ INVALID, /*  245     */ INVALID, /*  246     */ INVALID, /*  247     */ INVALID,
	/*  248     */ INVALID, /*  249     */ INVALID, /*  250     */ INVALID, /*  251     */ INVALID, /*  252     */ INVALID, /*  253     */ INVALID, /*  254     */ INVALID, /*  255     */ INVALID
};


// Supporting function implementation
Gcode::Gcode() :

	// Set inital data type
	dataType(0x1080)
{

	// Set parameter value size
	parameterValue.resize(ORDER_LENGTH);
}

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

bool Gcode::parseLine(const char *line) {

	// Reset data type
	dataType = 0x1080;
	
	// Reset parameter values
	parameterValue.clear();
	parameterValue.resize(ORDER_LENGTH);
	
	// Clear host command
	hostCommand.clear();
	
	// Initialize line start and end
	const char *lineStart = line, *lineEnd;

	// Remove leading whitespace from line
	while(isspace(*lineStart))
		lineStart++;
	
	// Remove comment and checksum from line
	for(lineEnd = lineStart; *lineEnd && *lineEnd != ';' && *lineEnd != '*'; lineEnd++);
	lineEnd--;

	// Remove trailing whitespace from line
	while((lineEnd >= lineStart) && isspace(*lineEnd))
		lineEnd--;
	
	// Check if command is empty
	if(++lineEnd == lineStart) {
	
		// Clear original command
		originalCommand.clear();

		// Return false
		return false;
	}
	
	// Set command string
	string command(lineStart, lineEnd - lineStart);

	// Set original command
	originalCommand = command;

	// Check if command is a host command
	if(command[0] == '@') {
	
		// Set host command
		hostCommand = command;
		
		// Return true
		return true;
	}
	
	// Initialize variables used in parsing the line
	string currentValue;
	unsigned char parameterIdentifier = 0;
	uint8_t parameterOffset;
	
	// Go through data
	for(uint8_t i = 0; i <= command.length(); i++)
	
		// Check if a parameter is detected
		if(i == 0 || isupper(command[i]) || command[i] == ' ' || !command[i]) {
		
			// Check if valid value has been obtained for the parameter
			if(i && (parameterOffset = orderToOffset[parameterIdentifier]) != INVALID) {
			
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

				// Remove leading whitespace from string
				size_t characterOffset;
				if((characterOffset = currentValue.find_first_not_of(" \t\n\r")) != string::npos)
					currentValue = currentValue.substr(characterOffset);
				
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
	
	// Return if data wasn't empty
	return dataType != 0x1080;
}

bool Gcode::parseLine(const string &line) {

	// Return parse line
	return parseLine(line.c_str());
}

inline string intToFloat(const char *line, uint8_t &index) {

	// Initialize variables
	float tempFloat;
	int32_t *tempPointer = reinterpret_cast<int32_t *>(&tempFloat);

	// Set parameter value from the binary float value
	*tempPointer = (line[index] & 0xFF) + ((line[index + 1] & 0xFF) << 8) + ((line[index + 2] & 0xFF) << 16) + ((line[index + 3] & 0xFF) << 24);

	// Increment parameter location index
	index += 4;
	
	// Return values float representation
	return to_string(tempFloat);
}

bool Gcode::parseBinary(const char *line) {

	// Set data type
	dataType = (line[0] & 0xFF) + ((line[1] & 0xFF) << 8) + ((line[2] & 0xFF) << 16) + ((line[3] & 0xFF) << 24);
	
	// Check if command contains no data
	if(!dataType || dataType == 0x1080)
	
		// Return false
		return false;
	
	// Reset parameter values
	parameterValue.clear();
	parameterValue.resize(ORDER_LENGTH);
	
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
	if(dataType & (1 << 3))
	
		// Set parameter value
		parameterValue[3] = intToFloat(line, index);
	
	// Check if command contains a Y value
	if(dataType & (1 << 4))
	
		// Set parameter value
		parameterValue[4] = intToFloat(line, index);
	
	// Check if command contains a Z value
	if(dataType & (1 << 5))
	
		// Set parameter value
		parameterValue[5] = intToFloat(line, index);
	
	// Check if command contains an E value
	if(dataType & (1 << 6))
	
		// Set parameter value
		parameterValue[6] = intToFloat(line, index);
	
	// Check if command contains an F value
	if(dataType & (1 << 8))
	
		// Set parameter value
		parameterValue[8] = intToFloat(line, index);
	
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
		parameterValue[10] = to_string((line[index] & 0xFF) + ((line[index + 1] & 0xFF) << 8) + ((line[index + 2] & 0xFF) << 16) + ((line[index + 3] & 0xFF) << 24));
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains a P value
	if(dataType & (1 << 11)) {
	
		// Set parameter value
		parameterValue[11] = to_string((line[index] & 0xFF) + ((line[index + 1] & 0xFF) << 8) + ((line[index + 2] & 0xFF) << 16) + ((line[index + 3] & 0xFF) << 24));
		
		// Increment parameter location index
		index += 4;
	}
	
	// Check if command contains an I value
	if(dataType & (1 << 16))
	
		// Set parameter value
		parameterValue[16] = intToFloat(line, index);
	
	// Check if command contains a J value
	if(dataType & (1 << 17))
	
		// Set parameter value
		parameterValue[17] = intToFloat(line, index);
	
	// Check if command contains an R value
	if(dataType & (1 << 18))
	
		// Set parameter value
		parameterValue[18] = intToFloat(line, index);
	
	// Check if command contains a D value
	if(dataType & (1 << 19))
	
		// Set parameter value
		parameterValue[19] = intToFloat(line, index);
	
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

inline void pushBackInt8(vector<uint8_t> &request, const string &value) {

	// Append 1 byte integer to request
	request.push_back(stoi(value) & 0xFF);
}

inline void pushBackInt16(vector<uint8_t> &request, const string &value) {

	// Append 2 byte integer to request
	int32_t tempNumber = stoi(value);
	request.push_back(tempNumber & 0xFF);
	request.push_back((tempNumber >> 8) & 0xFF);
}

inline void pushBackInt32(vector<uint8_t> &request, const string &value) {

	// Append 4 byte integer to request
	int32_t tempNumber = stoi(value);
	request.push_back(tempNumber & 0xFF);
	request.push_back((tempNumber >> 8) & 0xFF);
	request.push_back((tempNumber >> 16) & 0xFF);
	request.push_back((tempNumber >> 24) & 0xFF);
}

inline void pushBackFloat(vector<uint8_t> &request, const string &value) {

	// Append 4 byte float to request
	float tempFloat = stof(value);
	int32_t *tempPointer = reinterpret_cast<int32_t *>(&tempFloat);
	request.push_back(*tempPointer & 0xFF);
	request.push_back((*tempPointer >> 8) & 0xFF);
	request.push_back((*tempPointer >> 16) & 0xFF);
	request.push_back((*tempPointer >> 24) & 0xFF);
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
		if(!parameterValue[15].empty())
		
			// Set fifth byte of request to string length
			request.push_back(parameterValue[15].length());
		
		// Check if command contains an N value
		if(!parameterValue[0].empty())
		
			// Set 2 byte integer parameter value
			pushBackInt16(request, parameterValue[0]);
		
		// Check if command contains an M value
		if(!parameterValue[1].empty())
		
			// Set 2 byte integer parameter value
			pushBackInt16(request, parameterValue[1]);
		
		// Check if command contains a G value
		if(!parameterValue[2].empty())
		
			// Set 2 byte integer parameter value
			pushBackInt16(request, parameterValue[2]);
		
		// Check if command contains an X value
		if(!parameterValue[3].empty())
		
			// Set 4 byte float parameter value
			pushBackFloat(request, parameterValue[3]);
		
		// Check if command contains a Y value
		if(!parameterValue[4].empty())
		
			// Set 4 byte float parameter value
			pushBackFloat(request, parameterValue[4]);
		
		// Check if command contains a Z value
		if(!parameterValue[5].empty())
		
			// Set 4 byte float parameter value
			pushBackFloat(request, parameterValue[5]);
		
		// Check if command contains an E value
		if(!parameterValue[6].empty())
		
			// Set 4 byte float parameter value
			pushBackFloat(request, parameterValue[6]);
		
		// Check if command contains an F value
		if(!parameterValue[8].empty())
		
			// Set 4 byte float parameter value
			pushBackFloat(request, parameterValue[8]);
		
		// Check if command contains a T value
		if(!parameterValue[9].empty())
			
			// Set 1 byte integer parameter value
			pushBackInt8(request, parameterValue[9]);
		
		// Check if command contains an S value
		if(!parameterValue[10].empty())
		
			// Set 4 byte integer parameter value
			pushBackInt32(request, parameterValue[10]);
		
		// Check if command contains a P value
		if(!parameterValue[11].empty())
		
			// Set 4 byte integer parameter value
			pushBackInt32(request, parameterValue[11]);
		
		// Check if command contains an I value
		if(!parameterValue[16].empty())
		
			// Set 4 byte float parameter value
			pushBackFloat(request, parameterValue[16]);
		
		// Check if command contains a J value
		if(!parameterValue[17].empty())
		
			// Set 4 byte float parameter value
			pushBackFloat(request, parameterValue[17]);
		
		// Check if command contains an R value
		if(!parameterValue[18].empty())
		
			// Set 4 byte float parameter value
			pushBackFloat(request, parameterValue[18]);
		
		// Check if command contains a D value
		if(!parameterValue[19].empty())
		
			// Set 4 byte float parameter value
			pushBackFloat(request, parameterValue[19]);
		
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
			sum2 = (sum1 + sum2) % 0xFF;
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
	for(uint8_t i = 0; i < ORDER_LENGTH; i++)
	
		// Check value index
		switch(i) {
		
			// Check if value index is invalid
			case 7:
			case 12:
			case 13:
			case 14:
			case 15:
			break;
			
			// Otherwise
			default:
		
				// Check if command contains value
				if(dataType & (1 << i)) {
		
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

	// Check if parameter is valid
	uint8_t parameterOffset = orderToOffset[static_cast<unsigned char>(parameter)];
	if(parameterOffset != INVALID)
	
		// Return if value is set
		return dataType & (1 << parameterOffset);
	
	// Return false
	return false;
}

void Gcode::removeParameter(char parameter) {

	// Check if parameter is valid
	uint8_t parameterOffset = orderToOffset[static_cast<unsigned char>(parameter)];
	if(parameterOffset != INVALID) {

		// Clear data type
		dataType &= ~(1 << parameterOffset);

		// Clear parameter value
		parameterValue[parameterOffset].clear();

		// Check if command is now empty
		if(dataType == 0x1080)

			// Clear original command
			originalCommand = "";
	}
}

bool Gcode::hasValue(char parameter) const {

	// Check if parameter is valid
	uint8_t parameterOffset = orderToOffset[static_cast<unsigned char>(parameter)];
	if(parameterOffset != INVALID)
	
		// Return if parameter's value isn't empty
		return !parameterValue[parameterOffset].empty();
	
	// Return false
	return false;
}

string Gcode::getValue(char parameter) const {

	// Check if parameter is valid
	uint8_t parameterOffset = orderToOffset[static_cast<unsigned char>(parameter)];
	if(parameterOffset != INVALID)
	
		// Return parameter's value
		return parameterValue[parameterOffset];
	
	// Return empty
	return "";
}

void Gcode::setValue(char parameter, const string &value) {

	// Check if parameter is valid
	uint8_t parameterOffset = orderToOffset[static_cast<unsigned char>(parameter)];
	if(parameterOffset != INVALID) {
	
		// Set data type
		dataType |= (1 << parameterOffset);

		// Set parameter value
		parameterValue[parameterOffset] = value;
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
	parameterValue.resize(ORDER_LENGTH);
	
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
