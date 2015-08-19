// Header files
#include <fstream>
#include <string>
#include <cmath>
#include <cfloat>
#include <cstring>
#include <unistd.h>
#include "preprocessors.h"
#include "gcode.h"

using namespace std;


// Definitions

// Printer bed size limits
#define BED_LOW_MAX_X 113.0
#define BED_LOW_MIN_X 0.0
#define BED_LOW_MAX_Y 107.0
#define BED_LOW_MIN_Y 0.0
#define BED_LOW_MAX_Z 5.0
#define BED_LOW_MIN_Z 0.0
#define BED_MEDIUM_MAX_X 110.2
#define BED_MEDIUM_MIN_X 2.8
#define BED_MEDIUM_MAX_Y 107.0
#define BED_MEDIUM_MIN_Y -6.6
#define BED_MEDIUM_MAX_Z 73.5
#define BED_MEDIUM_MIN_Z BED_LOW_MAX_Z
#define BED_HIGH_MAX_X 82.0
#define BED_HIGH_MIN_X 2.35
#define BED_HIGH_MAX_Y 92.95
#define BED_HIGH_MIN_Y 20.05
#define BED_HIGH_MAX_Z 112.0
#define BED_HIGH_MIN_Z BED_MEDIUM_MAX_Z

// Wave bonding settings
#define WAVE_PERIOD 5.0
#define WAVE_PERIOD_QUARTER (WAVE_PERIOD / 4.0)
#define WAVE_SIZE 0.15

// Bed compensation settings
#define LEVELLING_MOVE_X 104.9
#define LEVELLING_MOVE_Y 103.0
#define SEGMENT_LENGTH 2.0

// Feed rate conversion settings
#define MAX_FEED_RATE 60.0001


// Filament types
enum filamentTypes {NO_TYPE, ABS, PLA, HIPS, OTHER};

// Directions
enum directions {POSITIVE, NEGATIVE, NEITHER};

// Print tiers
enum printTiers {LOW, MEDIUM, HIGH};


// Global variables

// Settings
double backlashX;
double backlashY;
double backlashSpeed;
double backRightOrientation;
double backLeftOrientation;
double frontLeftOrientation;
double frontRightOrientation;
double bedHeightOffset;
double backRightOffset;
double backLeftOffset;
double frontLeftOffset;
double frontRightOffset;
uint16_t filamentTemperature;
filamentTypes filamentType;
bool useValidationPreprocessor;
bool usePreparationPreprocessor;
bool useWaveBondingPreprocessor;
bool useThermalBondingPreprocessor;
bool useBedCompensationPreprocessor;
bool useBacklashCompensationPreprocessor;
bool useFeedRateConversionPreprocessor;
bool useCenterModelPreprocessor;

// Print dimensions
double maxXExtruderLow;
double maxXExtruderMedium;
double maxXExtruderHigh;
double maxYExtruderLow;
double maxYExtruderMedium;
double maxYExtruderHigh;
double maxZExtruder;
double minXExtruderLow;
double minXExtruderMedium;
double minXExtruderHigh;
double minYExtruderLow;
double minYExtruderMedium;
double minYExtruderHigh;
double minZExtruder;


// Private function implementation
uint16_t getBoundedTemperature(uint16_t temperature) {

	// Return temperature bounded by range
	return temperature > 285 ? 285 : temperature < 150 ? 150 : temperature;
}

double getDistance(const Gcode &firstPoint, const Gcode &secondPoint) {

	// Get first point coordinates
	double firstX = firstPoint.hasValue('X') ? stod(firstPoint.getValue('X')) : 0;
	double firstY = firstPoint.hasValue('Y') ? stod(firstPoint.getValue('Y')) : 0;
	
	// Get second point coordinates
	double secondX = secondPoint.hasValue('X') ? stod(secondPoint.getValue('X')) : 0;
	double secondY = secondPoint.hasValue('Y') ? stod(secondPoint.getValue('Y')) : 0;

	// Return distance between the two values
	return sqrt(pow(firstX - secondX, 2) + pow(firstY - secondY, 2));
}

Gcode createTackPoint(const Gcode &point, const Gcode &refrence) {

	// Initialize variables
	Gcode gcode;
	uint16_t time = ceil(getDistance(point, refrence));
	
	// Check if time is greater than 5
	if(time > 5) {
	
		// Set g-code to a delay command based on time
		gcode.setValue('G', "4");
		gcode.setValue('P', to_string(time));
	}
	
	// Return gcode
	return gcode;
}

bool isSharpCorner(const Gcode &point, const Gcode &refrence) {

	// Initialize variables
	double value;
	
	// Get point coordinates
	double currentX = point.hasValue('X') ? stod(point.getValue('X')) : 0;
	double currentY = point.hasValue('Y') ? stod(point.getValue('Y')) : 0;
	
	// Get refrence coordinates
	double previousX = refrence.hasValue('X') ? stod(refrence.getValue('X')) : 0;
	double previousY = refrence.hasValue('Y') ? stod(refrence.getValue('Y')) : 0;
	
	// Calculate value
	if((!currentX && !currentY) || (!previousX && !previousY))
		value = acos(0);
	else
		value = acos((currentX * previousX + currentY * previousY) / (pow(currentX * currentX + currentY * currentY, 2) * pow(previousX * previousX + previousY * previousY, 2)));
	
	// Return if sharp corner
	return value > 0 && value < M_PI_2;
}

double getCurrentAdjustmentZ() {

	// Initialize variables
	static uint8_t waveStep = 0;

	// Set adjustment
	double adjustment = waveStep ? waveStep != 2 ? 0 : -1.5 : 1;
	
	// Increment wave step
	waveStep = (waveStep + 1) % 4;
	
	// Return adjustment
	return adjustment * WAVE_SIZE;
}

double getHeightAdjustmentRequired(double valueX, double valueY) {

	// Initialize variables
	double left = (backLeftOffset - frontLeftOffset) / LEVELLING_MOVE_Y;
	double right = (backRightOffset - frontRightOffset) / LEVELLING_MOVE_Y;
	
	// Return height adjustment
	return (right * valueY + frontRightOffset - (left * valueY + frontLeftOffset)) / LEVELLING_MOVE_X * valueX + (left * valueY + frontLeftOffset);
}


// Exported function implementation
void setValues(double backlashXSetting, double backlashYSetting, double backlashSpeedSetting, double backRightOrientationSetting, double backLeftOrientationSetting, double frontLeftOrientationSetting, double frontRightOrientationSetting, double bedHeightOffsetSetting, double backRightOffsetSetting, double backLeftOffsetSetting, double frontLeftOffsetSetting, double frontRightOffsetSetting, unsigned short filamentTemperatureSetting, const char *filamentTypeSetting, bool useValidationPreprocessorSetting, bool usePreparationPreprocessorSetting, bool useWaveBondingPreprocessorSetting, bool useThermalBondingPreprocessorSetting, bool useBedCompensationPreprocessorSetting, bool useBacklashCompensationPreprocessorSetting, bool useFeedRateConversionPreprocessorSetting, bool useCenterModelPreprocessorSetting) {

	// Set values
	backlashX = backlashXSetting;
	backlashY = backlashYSetting;
	backlashSpeed = backlashSpeedSetting;
	backRightOrientation = backRightOrientationSetting;
	backLeftOrientation = backLeftOrientationSetting;
	frontLeftOrientation = frontLeftOrientationSetting;
	frontRightOrientation = frontRightOrientationSetting;
	bedHeightOffset = bedHeightOffsetSetting;
	backRightOffset = backRightOffsetSetting;
	backLeftOffset = backLeftOffsetSetting;
	frontLeftOffset = frontLeftOffsetSetting;
	frontRightOffset = frontRightOffsetSetting;
	filamentTemperature = filamentTemperatureSetting;
	if(!strcmp(filamentTypeSetting, "ABS"))
		filamentType = ABS;
	else if(!strcmp(filamentTypeSetting, "PLA"))
		filamentType = PLA;
	else if(!strcmp(filamentTypeSetting, "HIPS"))
		filamentType = HIPS;
	else
		filamentType = OTHER;
	useValidationPreprocessor = useValidationPreprocessorSetting;
	usePreparationPreprocessor = usePreparationPreprocessorSetting;
	useWaveBondingPreprocessor = useWaveBondingPreprocessorSetting;
	useThermalBondingPreprocessor = useThermalBondingPreprocessorSetting;
	useBedCompensationPreprocessor = useBedCompensationPreprocessorSetting;
	useBacklashCompensationPreprocessor = useBacklashCompensationPreprocessorSetting;
	useFeedRateConversionPreprocessor = useFeedRateConversionPreprocessorSetting;
	useCenterModelPreprocessor = useCenterModelPreprocessorSetting;
}

bool getPrintInformation(const char *file, bool overrideCenterModelPreprocessor) {

	// Initialzie temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize variables
		string line;
		Gcode gcode;
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Process the line
				gcode.parseLine(line);
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Close output file
			output.close();
		
			// Remove input file
			unlink(tempName.c_str());
		
			// Return true
			return true;
		}
	}
	
	// Return false
	return false;
}

bool centerModelPreprocessor(const char *file) {

	// Initialzie temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize variables
		string line;
		Gcode gcode;
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Process the line
				gcode.parseLine(line);
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Close output file
			output.close();
		
			// Remove input file
			unlink(tempName.c_str());
		
			// Return true
			return true;
		}
	}
	
	// Return false
	return false;
}

bool validationPreprocessor(const char *file) {

	// Initialzie temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize variables
		string line;
		Gcode gcode;
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Process the line
				gcode.parseLine(line);
				
				// Check if command isn't valid for the printer
				if(gcode.hasValue('M') && (gcode.getValue('M') == "82" || gcode.getValue('M') == "83"))
			
					// Get next line
					continue;
			
				// Check if command contains tool selection
				if(gcode.hasParameter('T'))
			
					// Remove tool selection
					gcode.removeParameter('T');
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Close output file
			output.close();
		
			// Remove input file
			unlink(tempName.c_str());
		
			// Return true
			return true;
		}
	}
	
	// Return false
	return false;
}

bool preparationPreprocessor(const char *file, bool overrideCornerExcess) {

	// Initialzie temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize variables
		string line;
		Gcode gcode;
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
		double cornerX = 0, cornerY = 0;
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
		
			/*// Check if leaving excess at corner
			if(!overrideCornerExcess) {
		
				// Set corner X
				if(manXExtruder < BED_LOW_MAX_X)
					cornerX = (BED_LOW_MAX_X - BED_LOW_MIN_X) / 2
				else if(minXExtruder > BED_LOW_MIN_X)
					cornerX = -(BED_LOW_MAX_X - BED_LOW_MIN_X) / 2
		
				// Set corner Y
				if(manYExtruder < BED_LOW_MAX_Y)
					cornerY = (BED_LOW_MAX_Y - BED_LOW_MIN_Y - 10) / 2
				else if(minYExtruder > BED_LOW_MIN_Y)
					cornerY = -(BED_LOW_MAX_Y - BED_LOW_MIN_Y - 10) / 2*/
	
			// Add intro to output
			output << "M106 S" << (filamentType == PLA ? "255" : "50") << endl;
			output << "M17" << endl;
			output << "G90" << endl;
			output << "M104 S" << to_string(filamentTemperature) << endl;
			output << "G0 Z5 F2900" << endl;
			output << "G28" << endl;
		
			// Check if one of the corners wasn't set
			if(cornerX == 0 || cornerY == 0) {
		
				output << "M18" << endl;
				output << "M109 S" << to_string(filamentTemperature) << endl;
				output << "G4 S2" << endl;
				output << "M17" << endl;
				output << "G91" << endl;
			}
		
			// Otherwise
			else {
		
				// Prepare extruder by leaving excess at corner
				output << "G91" << endl;
				output << "G0 X" << to_string(-cornerX) << " Y" << to_string(-cornerY) << " F2900" << endl;
				output << "M18" << endl;
				output << "M109 S" << to_string(filamentTemperature) << endl;
				output << "M17" << endl;
				output << "G0 Z-4 F2900" << endl;
				output << "G0 E7.5 F2000" << endl;
				output << "G4 S3" << endl;
				output << "G0 X" << to_string(cornerX * 0.1) << " Y" << to_string(cornerY * 0.1) << " Z-0.999 F2900" << endl;
				output << "G0 X" << to_string(cornerX * 0.9) << " Y" << to_string(cornerY * 0.9) << " F1000" << endl;
			}
		
			output << "G92 E0" << endl;
			output << "G90" << endl;
			output << "G0 Z0.4 F2400" << endl;
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Process the line
				gcode.parseLine(line);
				
				// Check if command controls extruder temperature or fan speed
				if(gcode.hasValue('M') && (gcode.getValue('M') == "104" || gcode.getValue('M') == "106" || gcode.getValue('M') == "107" || gcode.getValue('M') == "109"))
			
					// Get next line
					continue;
				
				// Send line to output file
				output << gcode << endl;
			}
			
			// Add outro to output
			output << "G91" << endl;
			output << "G0 E-1 F2000" << endl;
			output << "G0 X5 Y5 F2000" << endl;
			output << "G0 E-8 F2000" << endl;
			output << "M104 S0" << endl;
			if(maxZExtruder > 60) {
				if(maxZExtruder < 110)
					output << "G0 Z3 F2900" << endl;
				output << "G90" << endl;
				output << "G0 X90 Y84" << endl;
			}
			else {
				output << "G0 Z3 F2900" << endl;
				output << "G90" << endl;
				output << "G0 X95 Y95" << endl;
			}
			output << "M18" << endl;
			output << "M107" << endl;
		
			// Close output file
			output.close();
		
			// Remove input file
			unlink(tempName.c_str());
		
			// Return true
			return true;
		}
	}
	
	// Return false
	return false;
}

bool waveBondingPreprocessor(const char *file) {

	// Initialzie temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize variables
		string line;
		Gcode gcode, previousGcode, refrenceGcode, tackPoint, extraGcode;
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
		bool relativeMode = false;
		bool firstLayer = true, changesPlane = false;
		int64_t layerNumber, baseLayer = 0;
		uint32_t cornerCounter = 0, waveRatio;
		double distance;
		double positionAbsoluteX = 0, positionAbsoluteY = 0, positionAbsoluteZ = 0, positionAbsoluteE = 0;
		double positionRelativeX = 0, positionRelativeY = 0, positionRelativeZ = 0, positionRelativeE = 0;
		double deltaX, deltaY, deltaZ, deltaE;
		double tempRelativeX, tempRelativeY, tempRelativeZ, tempRelativeE;
		double relativeDifferenceX, relativeDifferenceY, relativeDifferenceZ, relativeDifferenceE;
		double deltaRatioX, deltaRatioY, deltaRatioZ, deltaRatioE;
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line is a layer command
				if(line.find(";LAYER:") != string::npos) {
			
					// Set layer number
					layerNumber = stoi(line.substr(7));
				
					// Set base number is layer number is less than it
					if(layerNumber < baseLayer)
						baseLayer = layerNumber;
				
					// Set first layer
					firstLayer = layerNumber == baseLayer;
				}
			
				// Check is line was parsed, it contains G0 or G1, and it's not in relative mode
				if(gcode.parseLine(line) && gcode.hasValue('G') && (gcode.getValue('G') == "0" || gcode.getValue('G') == "1") && !relativeMode) {
			
					// Check if line contains an X or Y value
					if(gcode.hasValue('X') || gcode.hasValue('Y'))
				
						// Set changes plane
						changesPlane = true;
				
					// Check if line contains a Z value and is in the first layer
					if(gcode.hasValue('Z') && firstLayer)
				
						// Adjust Z value by height offset
						gcode.setValue('Z', to_string(stod(gcode.getValue('Z')) + BONDING_HEIGHT_OFFSET));
				
					// Set delta values
					deltaX = !gcode.hasValue('X') ? 0 : stod(gcode.getValue('X')) - positionRelativeX;
					deltaY = !gcode.hasValue('Y')? 0 : stod(gcode.getValue('Y')) - positionRelativeY;
					deltaZ = !gcode.hasValue('Z') ? 0 : stod(gcode.getValue('Z')) - positionRelativeZ;
					deltaE = !gcode.hasValue('E') ? 0 : stod(gcode.getValue('E')) - positionRelativeE;
				
					// Adjust position absolute and relative values for the changes
					positionAbsoluteX += deltaX;
					positionAbsoluteY += deltaY;
					positionAbsoluteZ += deltaZ;
					positionAbsoluteE += deltaE;
					positionRelativeX += deltaX;
					positionRelativeY += deltaY;
					positionRelativeZ += deltaZ;
					positionRelativeE += deltaE;
				
					// Calculate distance of change
					distance = sqrt(deltaX * deltaX + deltaY * deltaY);
				
					// Set wave ratio
					waveRatio = distance > WAVE_PERIOD_QUARTER ? distance / WAVE_PERIOD_QUARTER : 1;
				
					// Set relative differences
					relativeDifferenceX = positionRelativeX - deltaX;
					relativeDifferenceY = positionRelativeY - deltaY;
					relativeDifferenceZ = positionRelativeZ - deltaZ;
					relativeDifferenceE = positionRelativeE - deltaE;
				
					// Set delta ratios
					if(distance) {
						deltaRatioX = deltaX / distance;
						deltaRatioY = deltaY / distance;
						deltaRatioZ = deltaZ / distance;
						deltaRatioE = deltaE / distance;
					}
					else {
						deltaRatioX = 0;
						deltaRatioY = 0;
						deltaRatioZ = 0;
						deltaRatioE = 0;
					}
				
					// Check if in first dayer and delta E is greater than zero 
					if(firstLayer && deltaE > 0) {
				
						// Check if previous g-code is not empty
						if(!previousGcode.isEmpty()) {
					
							// Check if corner count is at most one and sharp corner
							if(cornerCounter <= 1 && isSharpCorner(gcode, previousGcode)) {
						
								// Check if refrence g-codes isn't set
								if(refrenceGcode.isEmpty()) {
							
									// Check if a tack point was created
									tackPoint = createTackPoint(gcode, previousGcode);
									if(!tackPoint.isEmpty())
								
										// Send tack point to output
										output << tackPoint << endl; 
								}
							
								// Set refrence g-code
								refrenceGcode = gcode;
							
								// Increment corner counter
								cornerCounter++;
							}
						
							// Otherwise check is corner count is at least one and sharp corner
							else if(cornerCounter >= 1 && isSharpCorner(gcode, refrenceGcode)) {
						
								// Check if a tack point was created
								tackPoint = createTackPoint(gcode, refrenceGcode);
								if(!tackPoint.isEmpty())
							
									// Send tack point to output
									output << tackPoint << endl; 
							
								// Set refrence g-code
								refrenceGcode = gcode;
							}
						}
					
						// Go through all of the wave
						for(uint32_t i = 1; i <= waveRatio; i++) {
					
							// Check if at last component
							if(i == waveRatio) {
						
								// Set temp relative values
								tempRelativeX = positionRelativeX;
								tempRelativeY = positionRelativeY;
								tempRelativeZ = positionRelativeZ;
								tempRelativeE = positionRelativeE;
							}
						
							// Otherwise
							else {
						
								// Set temp relative values
								tempRelativeX = relativeDifferenceX + i * WAVE_PERIOD_QUARTER * deltaRatioX;
								tempRelativeY = relativeDifferenceY + i * WAVE_PERIOD_QUARTER * deltaRatioY;
								tempRelativeZ = relativeDifferenceZ + i * WAVE_PERIOD_QUARTER * deltaRatioZ;
								tempRelativeE = relativeDifferenceE + i * WAVE_PERIOD_QUARTER * deltaRatioE;
							}
						
							// Check if not at least component
							if(i != waveRatio) {
						
								// Set extra g-code G value
								extraGcode.clear();
								extraGcode.setValue('G', gcode.getValue('G'));
							
								// Set extra g-code X value
								if(gcode.hasValue('X'))
									extraGcode.setValue('X', to_string(positionRelativeX - deltaX + tempRelativeX - relativeDifferenceX));
							
								// Set extra g-cdoe Y value
								if(gcode.hasValue('Y'))
									extraGcode.setValue('Y', to_string(positionRelativeY - deltaY + tempRelativeY - relativeDifferenceY));
							
								// Set extra g-code F value if first element
								if(gcode.hasValue('F') && i == 1)
									extraGcode.setValue('F', gcode.getValue('F'));
							
								// Check if plane changed
								if(changesPlane)
							
									// Set extra g-code Z value
									extraGcode.setValue('Z', to_string(positionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ + getCurrentAdjustmentZ()));
							
								// Otherwise check if command has a Z value and changes in Z are noticable
								else if(gcode.hasValue('Z') && deltaZ != DBL_EPSILON)
							
									// Set extra g-code Z value
									extraGcode.setValue('Z', to_string(positionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ));
								
								// Set extra g-code E value
								extraGcode.setValue('E', to_string(positionRelativeE - deltaE + tempRelativeE - relativeDifferenceE));
							
								// Send extra g-code to output
								output << extraGcode << endl;
							}
						
							// Otherwise check if plane changed
							else if(changesPlane) {
						
								// Check if command has a Z value
								if(gcode.hasValue('Z'))
							
									// Add to command's Z value
									gcode.setValue('Z', to_string(stod(gcode.getValue('Z')) + getCurrentAdjustmentZ()));
							
								// Otherwise
								else
							
									// Set command's Z value
									gcode.setValue('Z', to_string(relativeDifferenceZ + deltaZ + getCurrentAdjustmentZ()));
							}
						}
					}
				
					// Set previous gcode
					previousGcode = gcode;
				}
			
				// Otherwise check if command is G90
				else if(gcode.hasValue('G') && gcode.getValue('G') == "90")
				
					// Clear relative mode
					relativeMode = false;
			
				// Otherwise check if command is G91
				else if(gcode.hasValue('G') && gcode.getValue('G') == "91")
				
					// Set relative mode
					relativeMode = true;
			
				// Otherwise check if command is G92
				else if(gcode.hasValue('G') && gcode.getValue('G') == "92") {
			
					// Check if line doesn't contain an X, Y, Z, and E
					if(!gcode.hasValue('X') && !gcode.hasValue('Y') && !gcode.hasValue('Z') && !gcode.hasValue('E')) {
				
						// Set values to zero
						gcode.setValue('X', "0");
						gcode.setValue('Y', "0");
						gcode.setValue('Z', "0");
						gcode.setValue('E', "0");
					}
				
					// Otherwise
					else {
				
						// Set position relative values
						positionRelativeX = !gcode.hasValue('X') ? positionRelativeX : stod(gcode.getValue('X'));
						positionRelativeY = !gcode.hasValue('Y') ? positionRelativeY : stod(gcode.getValue('Y'));
						positionRelativeZ = !gcode.hasValue('Z') ? positionRelativeZ : stod(gcode.getValue('Z'));
						positionRelativeE = !gcode.hasValue('E') ? positionRelativeE : stod(gcode.getValue('E'));
					}
				}
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Close output file
			output.close();
		
			// Remove input file
			unlink(tempName.c_str());
		
			// Return true
			return true;
		}
	}
	
	// Return false
	return false;
}

bool thermalBondingPreprocessor(const char *file, bool overrideWaveBondingPreprocessor) {

	// Initialzie temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize variables
		string line;
		Gcode gcode, previousGcode, refrenceGcode, tackPoint;
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
		int layerCounter = 0, cornerCounter = 0;
		bool checkSharpCorner = false;
		bool relativeMode = false;
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line is a layer command
				if(line.find(";LAYER:") != string::npos) {
			
					// Check how many layers have been processed
					switch(layerCounter) {
			
						// Check if layer counter is zero
						case 0:
				
							// Send temperature command to output
							output << "M109 S" << to_string(getBoundedTemperature(filamentTemperature + (filamentType == PLA ? 10 : 15))) << endl;
							// Set check sharp corner
							checkSharpCorner = true;
						break;
				
						// Otherwise check if layer counter is one
						case 1:
				
							// Send temperature command to output
							output << "M109 S" << to_string(getBoundedTemperature(filamentTemperature + (filamentType == PLA ? 5 : 10))) << endl;
						break;
					}
				
					// Increment layer counter
					layerCounter++;
				}
			
				// Check if line is layer zero
				if(line.find(";LAYER:0") != string::npos) {
			
					// Send temperature command to output
					output << "M109 S" << to_string(filamentTemperature) << endl;
				
					// Clear check sharp corner
					checkSharpCorner = false;
				}
			
				// Check if line was parsed successfully and it's a G command and wave bonding is not being used
				if(gcode.parseLine(line) && gcode.hasValue('G') && !useWaveBonding) {
			
					// Check what parameter is associated with the command
					switch(stoi(gcode.getValue('G'))) {
				
						case 0:
						case 1:
					
							// Check if previous command exists, the check sharp corner is set, and filament is ABS, HIPS, or PLA
							if(!previousGcode.isEmpty() && checkSharpCorner && (filamentType == ABS || filamentType == HIPS || filamentType == PLA)) {
						
								// Check if both counters are less than or equal to one
								if(cornerCounter <= 1 && layerCounter <= 1) {
							
									// Check if sharp corner
									if(isSharpCorner(gcode, previousGcode)) {
								
										// Check if refrence g-codes isn't set
										if(refrenceGcode.isEmpty()) {
									
											// Check if a tack point was created
											tackPoint = createTackPoint(gcode, previousGcode);
											if(!tackPoint.isEmpty())
										
												// Send tack point to output
												output << tackPoint << endl;
										}
									
										// Set refrence g-code
										refrenceGcode = gcode;
									
										// Increment corner count
										cornerCounter++;
									}
								}
							
								// Otherwise check if corner counter is greater than one but layer counter isn't and sharp corner
								else if(cornerCounter >= 1 && layerCounter <= 1 && isSharpCorner(gcode, refrenceGcode)) {
							
									// Check if a tack point was created
									tackPoint = createTackPoint(gcode, refrenceGcode);
									if(!tackPoint.isEmpty())
								
										// Send tack point to output
										output << tackPoint << endl;
								
									// Set refrence g-code
									refrenceGcode = gcode;
								}
							}
						break;
					
						case 90:
					
							// Clear relative mode
							relativeMode = false;
						break;
				
						case 91:
					
							// Set relative mode
							relativeMode = true;
						break;
					}
				}
			
				// Set previous g-code
				previousGcode = gcode;
			
				// Check if not using wave bonding, filament is ABS, command contains G and Z, and in absolute mode
				if(!useWaveBonding && filamentType == ABS && gcode.hasValue('G') && gcode.hasValue('Z') && relativeMode)
				
					// Adjust g-code to have Z lower by height offset
					gcode.setValue('Z', to_string(stod(gcode.getValue('Z')) + BONDING_HEIGHT_OFFSET));
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Close output file
			output.close();
		
			// Remove input file
			unlink(tempName.c_str());
		
			// Return true
			return true;
		}
	}
	
	// Return false
	return false;
}

bool bedCompensationPreprocessor(const char *file) {

	// Initialzie temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize variables
		string line;
		Gcode gcode, extraGcode;
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
		bool relativeMode = false;
		bool changesPlane = false;
		bool hasExtruded = false;
		bool firstLayer = false;
		bool addCommand = false;
		double distance, storedE = 0, heightAdjustment, storedAdjustment, compensationE = 0;
		uint32_t layerNumber = 0, segmentCounter;
		double positionAbsoluteX = 0, positionAbsoluteY = 0, positionAbsoluteZ = 0, positionAbsoluteE = 0;
		double positionRelativeX = 0, positionRelativeY = 0, positionRelativeZ = 0, positionRelativeE = 0;
		double deltaX, deltaY, deltaZ, deltaE;
		double absoluteDifferenceX, absoluteDifferenceY, relativeDifferenceX, relativeDifferenceY, relativeDifferenceZ, relativeDifferenceE;
		double deltaRatioX, deltaRatioY, deltaRatioZ, deltaRatioE;
		double tempAbsoluteX, tempAbsoluteY, tempRelativeX, tempRelativeY, tempRelativeZ, tempRelativeE;
		double leftAdjustment, rightAdjustment;
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line was parsed successfully, it's G0 or G1, and it isn't in relative mode
				if(gcode.parseLine(line) && gcode.hasValue('G') && (gcode.getValue('G') == "0" || gcode.getValue('G') == "1") && !relativeMode) {
			
					// Check if command has an X or Y value
					if(gcode.hasValue('X') || gcode.hasValue('Y'))
				
						// Set changes plane
						changesPlane = true;
				
					// Check if command contains a Z value
					if(gcode.hasValue('Z'))
				
						// Add to command's Z value
						gcode.setValue('Z', to_string(stod(gcode.getValue('Z')) + bedHeightOffset));
				
					// Set delta values
					deltaX = !gcode.hasValue('X') ? 0 : stod(gcode.getValue('X')) - positionRelativeX;
					deltaY = !gcode.hasValue('Y')? 0 : stod(gcode.getValue('Y')) - positionRelativeY;
					deltaZ = !gcode.hasValue('Z') ? 0 : stod(gcode.getValue('Z')) - positionRelativeZ;
					deltaE = !gcode.hasValue('E') ? 0 : stod(gcode.getValue('E')) - positionRelativeE;
				
					// Adjust position absolute and relative values for the changes
					positionAbsoluteX += deltaX;
					positionAbsoluteY += deltaY;
					positionAbsoluteZ += deltaZ;
					positionAbsoluteE += deltaE;
					positionRelativeX += deltaX;
					positionRelativeY += deltaY;
					positionRelativeZ += deltaZ;
					positionRelativeE += deltaE;
				
					// Check if Z has a noticable change
					if(deltaZ != DBL_EPSILON) {
				
						// Set layer number
						layerNumber = hasExtruded ? layerNumber + 1 : 1;
					
						// Set first layer
						firstLayer = layerNumber == 0 || layerNumber == 1;
					}
				
					// Calculate distance
					distance = sqrt(deltaX * deltaX + deltaY * deltaY);
				
					// Set segment counter
					segmentCounter = distance > SEGMENT_LENGTH ? distance / SEGMENT_LENGTH : 1;
				
					// Set absolute and relative differences
					absoluteDifferenceX = positionAbsoluteX - deltaX;
					absoluteDifferenceY = positionAbsoluteY - deltaY;
					relativeDifferenceX = positionRelativeX - deltaX;
					relativeDifferenceY = positionRelativeY - deltaY;
					relativeDifferenceZ = positionRelativeZ - deltaZ;
					relativeDifferenceE = positionRelativeE - deltaE;
				
					// Set delta ratios
					if(distance) {
						deltaRatioX = deltaX / distance;
						deltaRatioY = deltaY / distance;
						deltaRatioZ = deltaZ / distance;
						deltaRatioE = deltaE / distance;
					}
					else {
						deltaRatioX = 0;
						deltaRatioY = 0;
						deltaRatioZ = 0;
						deltaRatioE = 0;
					}
				
					// Check if change in E is greater than 0
					if(deltaE > 0) {
				
						// Set add command
						addCommand = !hasExtruded;
					
						// Set has extruded
						hasExtruded = true;
					}
				
					// Check if add command
					if(addCommand) {
				
						// Set extra g-code
						extraGcode.clear();
						extraGcode.setValue('G', "0");
						extraGcode.setValue('E', "0");
					
						// Send extra g-code to output
						output << extraGcode << endl;
					}
				
					// Check if layer is targeted and change in E is greater than zero
					if((firstLayer || !FIRST_LAYER_ONLY) && deltaE > 0) {
				
						// Go through all segments
						for(uint32_t i = 1; i <= segmentCounter; i++) {
				
							// Check if at last segment
							if(i == segmentCounter) {
					
								// Set temp values
								tempAbsoluteX = positionAbsoluteX;
								tempAbsoluteY = positionAbsoluteY;
								tempRelativeX = positionRelativeX;
								tempRelativeY = positionRelativeY;
								tempRelativeZ = positionRelativeZ;
								tempRelativeE = positionRelativeE;
							}
				
							// Otherwise
							else {
					
								// Set temp values
								tempAbsoluteX = absoluteDifferenceX + i * SEGMENT_LENGTH * deltaRatioX;
								tempAbsoluteY = absoluteDifferenceY + i * SEGMENT_LENGTH * deltaRatioY;
								tempRelativeX = relativeDifferenceX + i * SEGMENT_LENGTH * deltaRatioX;
								tempRelativeY = relativeDifferenceY + i * SEGMENT_LENGTH * deltaRatioY;
								tempRelativeZ = relativeDifferenceZ + i * SEGMENT_LENGTH * deltaRatioZ;
								tempRelativeE = relativeDifferenceE + i * SEGMENT_LENGTH * deltaRatioE;
							}
						
							// Set height adjustment
							heightAdjustment = getHeightAdjustmentRequired(tempAbsoluteX, tempAbsoluteY);
						
							// Check if set extrusion to compensate
							if(CHANGE_EXTRUSION_TO_COMPENSATE)
						
								// Add value to compensation E
								compensationE += (-heightAdjustment / CHANGE_IN_HEIGHT_THAT_DOUBLES_EXTRUSION) * (tempRelativeE - storedE);
						
							// Store adjustment
							storedAdjustment = heightAdjustment;
						
							// Check if not at last segment
							if(i != segmentCounter) {
						
								// Set extra g-code
								extraGcode.clear();
								extraGcode.setValue('G', gcode.getValue('G'));
							
								// Check if command has an X value
								if(gcode.hasValue('X'))
							
									// Set extra g-code X value
									extraGcode.setValue('X', to_string(positionRelativeX - deltaX + tempRelativeX - relativeDifferenceX));
								
								// Check if command has a Y value
								if(gcode.hasValue('Y'))
							
									// Set extra g-code Y value
									extraGcode.setValue('Y', to_string(positionRelativeY - deltaY + tempRelativeY - relativeDifferenceY));
							
								// Check if command has F value and in first element
								if(gcode.hasValue('F') && i == 1)
							
									// Set extra g-code F value
									extraGcode.setValue('F', gcode.getValue('F'));
							
								// Check if set to compensate Z and the plane changed
								if(MOVE_Z_TO_COMPENSATE && changesPlane)
							
									// Set extra g-code Z value
									extraGcode.setValue('Z', to_string(positionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ + storedAdjustment));
							
								// Otherwise check if command has a Z value and the change in Z in noticable
								else if(gcode.hasValue('Z') && deltaZ != DBL_EPSILON)
							
									// Set extra g-code Z value
									extraGcode.setValue('Z', to_string(positionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ));
							
								// Set extra g-gode E value
								extraGcode.setValue('E', to_string(positionRelativeE - deltaE + tempRelativeE - relativeDifferenceE + compensationE));
							
								// Send extra g-code to output
								output << extraGcode << endl;
							}
						
							// Otherwise
							else {
						
								// Check if set to compensate Z and the plane changed
								if(MOVE_Z_TO_COMPENSATE && changesPlane) {
							
									// Check if command has a Z value
									if(gcode.hasValue('Z'))
								
										// Add value to command Z value
										gcode.setValue('Z', to_string(stod(gcode.getValue('Z')) + storedAdjustment));
								
									// Otherwise
									else
								
										// Set command Z value
										gcode.setValue('Z', to_string(relativeDifferenceZ + deltaZ + storedAdjustment));
								}
							
								// Check if command has an E value
								if(gcode.hasValue('E'))
							
									// Add value to command E value
									gcode.setValue('E', to_string(stod(gcode.getValue('E')) + compensationE));
							}
						
							// Store relative E
							storedE = tempRelativeE;
						}
					}
				
					// Otherwise
					else {
				
						// Check if set to compensate Z, the plane changed, and layer is targeted
						if(MOVE_Z_TO_COMPENSATE && changesPlane && (firstLayer || !FIRST_LAYER_ONLY)) {
					
							// Set left and right adjustment
							leftAdjustment = (backLeftOffset - frontLeftOffset) / LEVELLING_MOVE_Y * positionAbsoluteY + frontLeftOffset;
							rightAdjustment = (backRightOffset - frontRightOffset) / LEVELLING_MOVE_Y * positionAbsoluteY + frontRightOffset;
						
							// Set stored adjustment
							storedAdjustment = (rightAdjustment - leftAdjustment) / LEVELLING_MOVE_X * positionAbsoluteX + leftAdjustment;
						
							// Check if command has a Z value
							if(gcode.hasValue('Z'))
						
								// Add value to command Z
								gcode.setValue('Z', to_string(stod(gcode.getValue('Z')) + storedAdjustment));
						
							// Otherwise
							else
						
								// Set command Z
								gcode.setValue('Z', to_string(positionRelativeZ + storedAdjustment));
						}
					
						// Check if command has an E value
						if(gcode.hasValue('E'))
					
							// Add value to command E value
							gcode.setValue('E', to_string(stod(gcode.getValue('E')) + compensationE));
					
						// Store relative E
						storedE = positionRelativeE;
					}
				}
			
	      			// Otherwise check if command is G90
				else if(gcode.hasValue('G') && gcode.getValue('G') == "90")
				
					// Clear relative mode
					relativeMode = false;
			
				// Otherwise check if command is G91
				else if(gcode.hasValue('G') && gcode.getValue('G') == "91")
				
					// Set relative mode
					relativeMode = true;
			
				// Otherwise check if command is G92
				else if(gcode.hasValue('G') && gcode.getValue('G') == "92") {
			
					// Check if command doesn't have an X, Y, Z, and E value
					if(!gcode.hasValue('X') && !gcode.hasValue('Y') && !gcode.hasValue('Z') && !gcode.hasValue('E')) {
			
						// Set command values to zero
						gcode.setValue('X', "0");
						gcode.setValue('Y', "0");
						gcode.setValue('Z', "0");
						gcode.setValue('E', "0");
					}
			
					// Otherwise
					else {
			
						// Set relative positions
						positionRelativeX = !gcode.hasValue('X') ? positionRelativeX : stod(gcode.getValue('X'));
						positionRelativeY = !gcode.hasValue('Y') ? positionRelativeY : stod(gcode.getValue('Y'));
						positionRelativeZ = !gcode.hasValue('Z') ? positionRelativeZ : stod(gcode.getValue('Z'));
						positionRelativeE = !gcode.hasValue('E') ? positionRelativeE : stod(gcode.getValue('E'));
					}
				}
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Close output file
			output.close();
		
			// Remove input file
			unlink(tempName.c_str());
		
			// Return true
			return true;
		}
	}
	
	// Return false
	return false;
}

bool backlashCompensationPreprocessor(const char *file) {

	// Initialzie temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialzie variables
		string line;
		Gcode gcode, extraGcode;
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
		bool relativeMode = false;
		string valueF = "1000";
		directions directionX, directionY, previousDirectionX = NEITHER, previousDirectionY = NEITHER;
		double compensationX = 0, compensationY = 0;
		double positionRelativeX = 0, positionRelativeY = 0, positionRelativeZ = 0, positionRelativeE = 0;
		double deltaX, deltaY, deltaZ, deltaE;
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line was parsed successfully, it's G0 or G1, and it isn't in relative mode
				if(gcode.parseLine(line) && gcode.hasValue('G') && (gcode.getValue('G') == "0" || gcode.getValue('G') == "1") && !relativeMode) {
			
					// Check if command has an F value
					if(gcode.hasValue('F'))
			
						// Set value F
						valueF = gcode.getValue('F');
				
					// Set delta values
					deltaX = !gcode.hasValue('X') ? 0 : stod(gcode.getValue('X')) - positionRelativeX;
					deltaY = !gcode.hasValue('Y') ? 0 : stod(gcode.getValue('Y')) - positionRelativeY;
					deltaZ = !gcode.hasValue('Z') ? 0 : stod(gcode.getValue('Z')) - positionRelativeZ;
					deltaE = !gcode.hasValue('E') ? 0 : stod(gcode.getValue('E')) - positionRelativeE;
				
					// Set directions
					directionX = deltaX > DBL_EPSILON ? POSITIVE : deltaX < -DBL_EPSILON ? NEGATIVE : previousDirectionX;
					directionY = deltaY > DBL_EPSILON ? POSITIVE : deltaY < -DBL_EPSILON ? NEGATIVE : previousDirectionY;
				
					// Check if direction has changed
					if((directionX != previousDirectionX && previousDirectionX != NEITHER) || (directionY != previousDirectionY && previousDirectionY != NEITHER)) {
				
						// Set extra g-code G value
						extraGcode.clear();
						extraGcode.setValue('G', gcode.getValue('G'));
					
						// Check if X direction has changed
						if(directionX != previousDirectionX && previousDirectionX != NEITHER) {
					
							// Set X compensation
							compensationX += backlashX * (directionX == POSITIVE ? 1 : -1);
						
							// Set extra g-code X value
							extraGcode.setValue('X', to_string(positionRelativeX + compensationX));
						
							// Set extra g-code Y value if using legacy
							if(USE_LEGACY_BACKLASH)
								extraGcode.setValue('Y', to_string(positionRelativeY + compensationY));
						}
					
						// Check if Y direction has changed
						if(directionY != previousDirectionY && previousDirectionY != NEITHER) {
					
							// Set Y compensation
							compensationY += backlashY * (directionY == POSITIVE ? 1 : -1);
						
							// Set extra g-code Y value
							extraGcode.setValue('Y', to_string(positionRelativeY + compensationY));
						
							// Set extra g-code X value if using legacy
							if(USE_LEGACY_BACKLASH)
								extraGcode.setValue('X', to_string(positionRelativeX + compensationX));
						}
					
						// Set extra g-code F value
						extraGcode.setValue('F', to_string(backlashSpeed));
					
						// Send extra g-code to output
						output << extraGcode << endl;
					
						// Set command's F value
						gcode.setValue('F', valueF);
					}
			
					// Check if command has an X value
					if(gcode.hasValue('X'))
				
						// Add to command's X value
						gcode.setValue('X', to_string(stod(gcode.getValue('X')) + compensationX));
				
					// Check if command has a Y value
					if(gcode.hasValue('Y'))
				
						// Add to command's Y value
						gcode.setValue('Y', to_string(stod(gcode.getValue('Y')) + compensationY));
				
					// Set relative values
					positionRelativeX += deltaX;
					positionRelativeY += deltaY;
					positionRelativeZ += deltaZ;
					positionRelativeE += deltaE;
				
					// Store directions
					previousDirectionX = directionX;
					previousDirectionY = directionY;
				}
			
	      			// Otherwise check if command is G90
				else if(gcode.hasValue('G') && gcode.getValue('G') == "90")
				
					// Clear relative mode
					relativeMode = false;
			
				// Otherwise check if command is G91
				else if(gcode.hasValue('G') && gcode.getValue('G') == "91")
				
					// Set relative mode
					relativeMode = true;
			
				// Otherwise check if command is G92
				else if(gcode.hasValue('G') && gcode.getValue('G') == "92") {
			
					// Check if command doesn't have an X, Y, Z, and E value
					if(!gcode.hasValue('X') && !gcode.hasValue('Y') && !gcode.hasValue('Z') && !gcode.hasValue('E')) {
			
						// Set command values to zero
						gcode.setValue('X', "0");
						gcode.setValue('Y', "0");
						gcode.setValue('Z', "0");
						gcode.setValue('E', "0");
					}
			
					// Otherwise
					else {
			
						// Set relative positions
						positionRelativeX = !gcode.hasValue('X') ? positionRelativeX : stod(gcode.getValue('X'));
						positionRelativeY = !gcode.hasValue('Y') ? positionRelativeY : stod(gcode.getValue('Y'));
						positionRelativeZ = !gcode.hasValue('Z') ? positionRelativeZ : stod(gcode.getValue('Z'));
						positionRelativeE = !gcode.hasValue('E') ? positionRelativeE : stod(gcode.getValue('E'));
					}
				}
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Close output file
			output.close();
		
			// Remove input file
			unlink(tempName.c_str());
		
			// Return true
			return true;
		}
	}
	
	// Return false
	return false;
}

bool feedRateConversionPreprocessor(const char *file) {

	// Initialzie temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize variables
		string line;
		Gcode gcode;
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
		double commandFeedRate;
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line was parsed successfully and it contains G and F values
				if(gcode.parseLine(line) && gcode.hasValue('G') && gcode.hasValue('F')) {
			
					// Get command's feedrate
					commandFeedRate = stod(gcode.getValue('F')) / 60;
				
					// Force feed rate to adhere to limitations
					if(commandFeedRate > MAX_FEED_RATE)
		        			commandFeedRate = MAX_FEED_RATE;
		        		
					// Set new feed rate for the command
					gcode.setValue('F', to_string(30 + (1 - commandFeedRate / MAX_FEED_RATE) * 800));
				}
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Close output file
			output.close();
		
			// Remove input file
			unlink(tempName.c_str());
		
			// Return true
			return true;
		}
	}
	
	// Return false
	return false;
}
