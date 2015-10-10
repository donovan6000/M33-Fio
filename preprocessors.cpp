// Header files
#include <fstream>
#include <string>
#include <cmath>
#include <cfloat>
#include <cstring>
#include <unistd.h>
#include "preprocessors.h"

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
bool ignorePrintDimensionLimitations;
bool usingMicroPass;

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
double max(double first, double second) {

	// Return larger of the two
	return first > second ? first : second;
}

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

Vector calculatePlaneNormalVector(const Vector &v1, const Vector &v2, const Vector &v3) {

	// Initialize variables
	Vector vector, vector2, vector3;
	vector = v2 - v1;
	vector2 = v3 - v1;
	
	// Return normal vector
	vector3[0] = vector[1] * vector2[2] - vector2[1] * vector[2];
	vector3[1] = vector[2] * vector2[0] - vector2[2] * vector[0];
	vector3[2] = vector[0] * vector2[1] - vector2[0] * vector[1];
	return vector3;
}

Vector generatePlaneEquation(const Vector &v1, const Vector &v2, const Vector &v3) {

	// Initialize variables
	Vector vector, vector2;
	vector2 = calculatePlaneNormalVector(v1, v2, v3);
	
	// Return plane equation
	vector[0] = vector2[0];
	vector[1] = vector2[1];
	vector[2] = vector2[2];
	vector[3] = -(vector[0] * v1[0] + vector[1] * v1[1] + vector[2] * v1[2]);
	return vector;
}

double getHeightAdjustmentRequired(double x, double y) {

	// Set corner vectors
	Vector vector(99, 95, backRightOrientation + backRightOffset);
	Vector vector2(9, 95, backLeftOrientation + backLeftOffset);
	Vector vector3(9, 5, frontLeftOrientation + frontLeftOffset);
	Vector vector4(99, 5, frontRightOrientation + frontRightOffset);
	Vector vector5(54, 50, 0);
	
	// Calculate planes
	Vector planeABC, vector7, vector8, vector9;
	planeABC = generatePlaneEquation(vector2, vector, vector5);
	vector7 = generatePlaneEquation(vector2, vector3, vector5);
	vector8 = generatePlaneEquation(vector, vector4, vector5);
	vector9 = generatePlaneEquation(vector3, vector4, vector5);
	Vector point(x, y, 0);
	
	// Return height adjustment
	if(x <= vector3.x && y >= vector.y)
		return (getZFromXYAndPlane(point, planeABC) + getZFromXYAndPlane(point, vector7)) / 2;
	
	else if(x <= vector3.x && y <= vector3.y)
		return (getZFromXYAndPlane(point, vector9) + getZFromXYAndPlane(point, vector7)) / 2;
	
	else if(x >= vector4.x && y <= vector3.y)
		return (getZFromXYAndPlane(point, vector9) + getZFromXYAndPlane(point, vector8)) / 2;
	
	else if(x >= vector4.x && y >= vector.y)
		return (getZFromXYAndPlane(point, planeABC) + getZFromXYAndPlane(point, vector8)) / 2;
	
	else if(x <= vector3.x)
		return getZFromXYAndPlane(point, vector7);
	
	else if(x >= vector4.x)
		return getZFromXYAndPlane(point, vector8);
	
	else if(y >= vector.y)
		return getZFromXYAndPlane(point, planeABC);
	
	else if(y <= vector3.y)
		return getZFromXYAndPlane(point, vector9);
	
	else if(isPointInTriangle(point, vector5, vector3, vector2))
		return getZFromXYAndPlane(point, vector7);
	
	else if(isPointInTriangle(point, vector5, vector4, vector))
		return getZFromXYAndPlane(point, vector8);
	
	else if(isPointInTriangle(point, vector5, vector2, vector))
		return getZFromXYAndPlane(point, planeABC);
	
	else
		return getZFromXYAndPlane(point, vector9);
}

double getZFromXYAndPlane(const Vector &point, const Vector &planeABC) {

	// Return Z
	return (planeABC[0] * point.x + planeABC[1] * point.y + planeABC[3]) / -planeABC[2];
}

bool isPointInTriangle(const Vector &pt, const Vector &v1, const Vector &v2, const Vector &v3) {

	// Initialize variables
	Vector vector, vector2, vector3, vector4;
	vector = v1 - v2 + v1 - v3;
	vector.normalize();
	vector2 = v1 + vector * 0.01;
	vector = v2 - v1 + v2 - v3;
	vector.normalize();
	vector3 = v2 + vector * 0.01;
	vector = v3 - v1 + v3 - v2;
	vector.normalize();
	vector4 = v3 + vector * 0.01;
	
	// Return if inside triangle
	bool flag = sign(pt, vector2, vector3) < 0;
	bool flag2 = sign(pt, vector3, vector4) < 0;
	bool flag3 = sign(pt, vector4, vector2) < 0;
	return flag == flag2 && flag2 == flag3;
}

double sign(const Vector &p1, const Vector &p2, const Vector &p3) {

	// Return sign
	return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

// Exported function implementation
EXPORT void setBacklashX(double value) {

	// Set backlash X
	backlashX = value;
}

EXPORT void setBacklashY(double value) {

	// Set backlash Y
	backlashY = value;
}

EXPORT void setBacklashSpeed(double value) {

	// Set backlash speed
	backlashSpeed = value;
}

EXPORT void setBackRightOrientation(double value) {

	// Set back right orientation
	backRightOrientation = value;
}

EXPORT void setBackLeftOrientation(double value) {

	// Set back left orientation
	backLeftOrientation = value;
}

EXPORT void setFrontLeftOrientation(double value) {

	// Set front left orientation
	frontLeftOrientation = value;
}

EXPORT void setFrontRightOrientation(double value) {

	// Set front right orientation
	frontRightOrientation = value;
}

EXPORT void setBedHeightOffset(double value) {

	// Set bed height offset
	bedHeightOffset = value;
}

EXPORT void setBackRightOffset(double value) {

	// Set back right offset
	backRightOffset = value;
}

EXPORT void setBackLeftOffset(double value) {

	// Set back left offset
	backLeftOffset = value;
}

EXPORT void setFrontLeftOffset(double value) {

	// Set front left offset
	frontLeftOffset = value;
}

EXPORT void setFrontRightOffset(double value) {

	// Set front right offset
	frontRightOffset = value;
}

EXPORT void setFilamentTemperature(unsigned short value) {

	// Set filament temperature
	filamentTemperature = value;
}

EXPORT void setFilamentType(const char *value) {

	// Set filament type
	if(!strcmp(value, "ABS"))
		filamentType = ABS;
	else if(!strcmp(value, "PLA"))
		filamentType = PLA;
	else if(!strcmp(value, "HIPS"))
		filamentType = HIPS;
	else
		filamentType = OTHER;
}

EXPORT void setUseValidationPreprocessor(bool value) {

	// Set use validation pre-processor
	useValidationPreprocessor = value;
}

EXPORT void setUsePreparationPreprocessor(bool value) {

	// Set use preparation pre-processor
	usePreparationPreprocessor = value;
}

EXPORT void setUseWaveBondingPreprocessor(bool value) {

	// Set use wave bonding pre-processor
	useWaveBondingPreprocessor = value;
}

EXPORT void setUseThermalBondingPreprocessor(bool value) {

	// Set use thermal bonding pre-processor
	useThermalBondingPreprocessor = value;
}

EXPORT void setUseBedCompensationPreprocessor(bool value) {

	// Set use bed compensation pre-processor
	useBedCompensationPreprocessor = value;
}

EXPORT void setUseBacklashCompensationPreprocessor(bool value) {

	// Set use backlash compensation pre-processor
	useBacklashCompensationPreprocessor = value;
}

EXPORT void setUseFeedRateConversionPreprocessor(bool value) {

	// Set use feed rate conversion pre-processor
	useFeedRateConversionPreprocessor = value;
}

EXPORT void setUseCenterModelPreprocessor(bool value) {

	// Set use center model pre-processor
	useCenterModelPreprocessor = value;
}

EXPORT void setIgnorePrintDimensionLimitations(bool value) {

	// Set ignore print dimension limitations
	ignorePrintDimensionLimitations = value;
}

EXPORT void setUsingMicroPass(bool value) {

	// Set using Micro Pass
	usingMicroPass = value;
}

bool checkPrintDimensions(const char *file, bool overrideCenterModelPreprocessor) {

	// Check if using center model pre-processor
	if(!overrideCenterModelPreprocessor && useCenterModelPreprocessor)
	
		// Return if adjusted print values are within bounds
		return minZExtruder >= BED_LOW_MIN_Z && maxZExtruder <= BED_HIGH_MAX_Z && maxXExtruderLow <= BED_LOW_MAX_X && maxXExtruderMedium <= BED_MEDIUM_MAX_X && maxXExtruderHigh <= BED_HIGH_MAX_X && maxYExtruderLow <= BED_LOW_MAX_Y && maxYExtruderMedium <= BED_MEDIUM_MAX_Y && maxYExtruderHigh <= BED_HIGH_MAX_Y && minXExtruderLow >= BED_LOW_MIN_X && minXExtruderMedium >= BED_MEDIUM_MIN_X && minXExtruderHigh >= BED_HIGH_MIN_X && minYExtruderLow >= BED_LOW_MIN_Y && minYExtruderMedium >= BED_MEDIUM_MIN_Y && minYExtruderHigh >= BED_HIGH_MIN_Y;
		
	// Initialize file
	ifstream input(file, ios::in | ios::binary);

	// Check if input file was opened successfully
	if(input.good()) {

		// Initialize variables
		string line;
		Gcode gcode;
		printTiers tier = LOW;
		bool relativeMode = false;
		double localX = 54, localY = 50, localZ = 0.4;
		double commandX, commandY, commandZ;
	
		// Reset all print values
		maxXExtruderLow = 0;
		maxXExtruderMedium = 0;
		maxXExtruderHigh = 0;
		maxYExtruderLow = 0;
		maxYExtruderMedium = 0;
		maxYExtruderHigh = 0;
		maxZExtruder = 0;
		minXExtruderLow = DBL_MAX;
		minXExtruderMedium = DBL_MAX;
		minXExtruderHigh = DBL_MAX;
		minYExtruderLow = DBL_MAX;
		minYExtruderMedium = DBL_MAX;
		minYExtruderHigh = DBL_MAX;
		minZExtruder = DBL_MAX;

		// Go through input file
		while(input.peek() != EOF) {
		
			// Read in a line
			getline(input, line);
			
			// Check if line was parsed successfully and it's a G command
			if(gcode.parseLine(line) && gcode.hasValue('G')) {
		
				// Check what parameter is associated with the command
				switch(stoi(gcode.getValue('G'))) {
				
					// G0 or G1
					case 0:
					case 1:
					
						// Check if command has an X value
						if(gcode.hasValue('X')) {
					
							// Get X value of the command
							commandX = stod(gcode.getValue('X'));
						
							// Set local X
							localX = relativeMode ? localX + commandX : commandX;
						}
					
						// Check if command has a Y value
						if(gcode.hasValue('Y')) {
					
							// Get Y value of the command
							commandY = stod(gcode.getValue('Y'));
						
							// Set local Y
							localY = relativeMode ? localY + commandY : commandY;
						}
					
						// Check if command has a X value
						if(gcode.hasValue('Z')) {
					
							// Get X value of the command
							commandZ = stod(gcode.getValue('Z'));
						
							// Set local Z
							localZ = relativeMode ? localZ + commandZ : commandZ;
							
							// Check if not ignoring print dimension limitations and Z is out of bounds
							if(!ignorePrintDimensionLimitations && (localZ < BED_LOW_MIN_Z || localZ > BED_HIGH_MAX_Z))
					
								// Return false
								return false;
						
							// Set print tier
							if(localZ < BED_LOW_MAX_Z)
								tier = LOW;
							
							else if(localZ < BED_MEDIUM_MAX_Z)
								tier = MEDIUM;
							
							else
								tier = HIGH;
						}
					
						// Update minimums and maximums dimensions of extruder			
						switch(tier) {
					
							case LOW:
							
								// Check if not ignoring print dimension limitations and X or Y is out of bounds
								if(!ignorePrintDimensionLimitations && (localX < BED_LOW_MIN_X || localX > BED_LOW_MAX_X || localY < BED_LOW_MIN_Y || localY > BED_LOW_MAX_Y))
								
									// Return false
									return false;
						
								minXExtruderLow = minXExtruderLow < localX ? minXExtruderLow : localX;
								maxXExtruderLow = maxXExtruderLow > localX ? maxXExtruderLow : localX;
								minYExtruderLow = minYExtruderLow < localY ? minYExtruderLow : localY;
								maxYExtruderLow = maxYExtruderLow > localY ? maxYExtruderLow : localY;
							break;
						
							case MEDIUM:
							
								// Check if not ignoring print dimension limitations and X or Y is out of bounds
								if(!ignorePrintDimensionLimitations && (localX < BED_MEDIUM_MIN_X || localX > BED_MEDIUM_MAX_X || localY < BED_MEDIUM_MIN_Y || localY > BED_MEDIUM_MAX_Y))
								
									// Return false
									return false;
						
								minXExtruderMedium = minXExtruderMedium < localX ? minXExtruderMedium : localX;
								maxXExtruderMedium = maxXExtruderMedium > localX ? maxXExtruderMedium : localX;
								minYExtruderMedium = minYExtruderMedium < localY ? minYExtruderMedium : localY;
								maxYExtruderMedium = maxYExtruderMedium > localY ? maxYExtruderMedium : localY;
							break;

							case HIGH:
							
								// Check if not ignoring print dimension limitations and X or Y is out of bounds
								if(!ignorePrintDimensionLimitations && (localX < BED_HIGH_MIN_X || localX > BED_HIGH_MAX_X || localY < BED_HIGH_MIN_Y || localY > BED_HIGH_MAX_Y))
								
									// Return false
									return false;
						
								minXExtruderHigh = minXExtruderHigh < localX ? minXExtruderHigh : localX;
								maxXExtruderHigh = maxXExtruderHigh > localX ? maxXExtruderHigh : localX;
								minYExtruderHigh = minYExtruderHigh < localY ? minYExtruderHigh : localY;
								maxYExtruderHigh = maxYExtruderHigh > localY ? maxYExtruderHigh : localY;
							break;
						}
						
						minZExtruder = minZExtruder < localZ ? minZExtruder : localZ;
						maxZExtruder = maxZExtruder > localZ ? maxZExtruder : localZ;
					break;
					
					// G90
					case 90:
				
						// Clear relative mode
						relativeMode = false;
					break;
					
					// G91
					case 91:
				
						// Set relative mode
						relativeMode = true;
					break;
				}
			}
		}
	
		// Return true
		return true;
	}
	
	// Return false
	return false;
}

bool centerModelPreprocessor(const char *file) {

	// Initialize temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize files
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
		
			// Initialize variables
			string line;
			Gcode gcode;
			printTiers tier = LOW;
			bool relativeMode = false;
			double localX = 54, localY = 50, localZ = 0.4;
			double commandX, commandY, commandZ;
			double displacementX, displacementY;
		
			// Reset all print values
			maxXExtruderLow = 0;
			maxXExtruderMedium = 0;
			maxXExtruderHigh = 0;
			maxYExtruderLow = 0;
			maxYExtruderMedium = 0;
			maxYExtruderHigh = 0;
			maxZExtruder = 0;
			minXExtruderLow = DBL_MAX;
			minXExtruderMedium = DBL_MAX;
			minXExtruderHigh = DBL_MAX;
			minYExtruderLow = DBL_MAX;
			minYExtruderMedium = DBL_MAX;
			minYExtruderHigh = DBL_MAX;
			minZExtruder = DBL_MAX;
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line was parsed successfully and it's a G command
				if(gcode.parseLine(line) && gcode.hasValue('G')) {
			
					// Check what parameter is associated with the command
					switch(stoi(gcode.getValue('G'))) {
					
						// G0 or G1
						case 0:
						case 1:
						
							// Check if command has an X value
							if(gcode.hasValue('X')) {
						
								// Get X value of the command
								commandX = stod(gcode.getValue('X'));
							
								// Set local X
								localX = relativeMode ? localX + commandX : commandX;
							}
						
							// Check if command has a Y value
							if(gcode.hasValue('Y')) {
						
								// Get Y value of the command
								commandY = stod(gcode.getValue('Y'));
							
								// Set local Y
								localY = relativeMode ? localY + commandY : commandY;
							}
						
							// Check if command has a X value
							if(gcode.hasValue('Z')) {
						
								// Get X value of the command
								commandZ = stod(gcode.getValue('Z'));
							
								// Set local Z
								localZ = relativeMode ? localZ + commandZ : commandZ;
							
								// Set print tier
								if(localZ < BED_LOW_MAX_Z)
									tier = LOW;
								
								else if(localZ < BED_MEDIUM_MAX_Z)
									tier = MEDIUM;
								
								else
									tier = HIGH;
							}
						
							// Update minimums and maximums dimensions of extruder			
							switch(tier) {
						
								case LOW:
							
									minXExtruderLow = minXExtruderLow  < localX ? minXExtruderLow  : localX;
									maxXExtruderLow  = maxXExtruderLow  > localX ? maxXExtruderLow  : localX;
									minYExtruderLow  = minYExtruderLow  < localY ? minYExtruderLow  : localY;
									maxYExtruderLow  = maxYExtruderLow  > localY ? maxYExtruderLow  : localY;
								break;
							
								case MEDIUM:
							
									minXExtruderMedium = minXExtruderMedium  < localX ? minXExtruderMedium  : localX;
									maxXExtruderMedium  = maxXExtruderMedium  > localX ? maxXExtruderMedium  : localX;
									minYExtruderMedium  = minYExtruderMedium  < localY ? minYExtruderMedium  : localY;
									maxYExtruderMedium  = maxYExtruderMedium  > localY ? maxYExtruderMedium  : localY;
								break;

								case HIGH:
							
									minXExtruderHigh = minXExtruderHigh  < localX ? minXExtruderHigh  : localX;
									maxXExtruderHigh  = maxXExtruderHigh  > localX ? maxXExtruderHigh  : localX;
									minYExtruderHigh  = minYExtruderHigh  < localY ? minYExtruderHigh  : localY;
									maxYExtruderHigh  = maxYExtruderHigh  > localY ? maxYExtruderHigh  : localY;
								break;
							}
							
							minZExtruder = minZExtruder < localZ ? minZExtruder : localZ;
							maxZExtruder = maxZExtruder > localZ ? maxZExtruder : localZ;
						break;
						
						// G90
						case 90:
					
							// Clear relative mode
							relativeMode = false;
						break;
						
						// G91
						case 91:
					
							// Set relative mode
							relativeMode = true;
						break;
					}
				}
			}
			
			// Calculate adjustments
			displacementX = (BED_LOW_MAX_X - max(maxXExtruderLow, max(maxXExtruderMedium, maxXExtruderHigh)) - min(minXExtruderLow, min(minXExtruderMedium, minXExtruderHigh)) + BED_LOW_MIN_X) / 2;
			displacementY = (BED_LOW_MAX_Y - max(maxYExtruderLow, max(maxYExtruderMedium, maxYExtruderHigh)) - min(minYExtruderLow, min(minYExtruderMedium, minYExtruderHigh)) + BED_LOW_MIN_Y) / 2;
		
			// Adjust print values
			maxXExtruderLow += displacementX;
			maxXExtruderMedium += displacementX;
			maxXExtruderHigh += displacementX;
			maxYExtruderLow += displacementY;
			maxYExtruderMedium += displacementY;
			maxYExtruderHigh += displacementY;
			minXExtruderLow += displacementX;
			minXExtruderMedium += displacementX;
			minXExtruderHigh += displacementX;
			minYExtruderLow += displacementY;
			minYExtruderMedium += displacementY;
			minYExtruderHigh += displacementY;
			
			// Go back to the beginning of the input file
			input.clear();
			input.seekg(0, ios::beg);
			
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line was parsed successfully and it's a G command
				if(gcode.parseLine(line) && gcode.hasValue('G')) {
				
					// Check if line contains an X value
					if(gcode.hasValue('X'))
					
						// Adjust X value
						gcode.setValue('X', to_string(stod(gcode.getValue('X')) + displacementX));
				
					// Check if line contains a Y value
					if(gcode.hasValue('Y'))
					
						// Adjust Y value
						gcode.setValue('Y', to_string(stod(gcode.getValue('Y')) + displacementY));
				}
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Return if input file was successfully removed
			return !unlink(tempName.c_str());
		}
	}
	
	// Return false
	return false;
}

bool validationPreprocessor(const char *file) {

	// Initialize temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize files
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
		
			// Initialize variables
			string line;
			Gcode gcode;
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line contains valid G-code
				if(gcode.parseLine(line)) {
				
					// Check if extruder absolute and relative mode command
					if(gcode.hasValue('M') && (gcode.getValue('M') == "82" || gcode.getValue('M') == "83"))
					
						// Get next line
						continue;
					
					// Check if not using Micro Pass and it's a bed temperature commands
					if(!usingMicroPass && gcode.hasValue('M') && (gcode.getValue('M') == "140" || gcode.getValue('M') == "190"))
					
						// Get next line
						continue;
					
					// Check if Stop idle hold command
					if(gcode.hasValue('M') && gcode.getValue('M') == "84")
						
						// Get next line
						continue;
						
					// Check if unit to millimeters command
					if(gcode.hasValue('G') && gcode.getValue('G') == "21")
					
						// Get next line
						continue;
			
					// Check if command contains tool selection
					if(gcode.hasParameter('T'))
			
						// Remove tool selection
						gcode.removeParameter('T');
				}
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Return if input file was successfully removed
			return !unlink(tempName.c_str());
		}
	}
	
	// Return false
	return false;
}

bool preparationPreprocessor(const char *file, bool overrideCornerExcess) {

	// Initialize temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize files
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
		
			// Initialize variables
			string line;
			Gcode gcode;
			double cornerX = 0, cornerY = 0;
			
			// Check if leaving excess at corner
			if(!overrideCornerExcess) {
			
				// Set corner X
				if(maxXExtruderLow < BED_LOW_MAX_X)
					cornerX = (BED_LOW_MAX_X - BED_LOW_MIN_X) / 2;
				else if(minXExtruderLow > BED_LOW_MIN_X)
					cornerX = -(BED_LOW_MAX_X - BED_LOW_MIN_X) / 2;
		
				// Set corner Y
				if(maxYExtruderLow < BED_LOW_MAX_Y)
					cornerY = (BED_LOW_MAX_Y - BED_LOW_MIN_Y - 10) / 2;
				else if(minYExtruderLow > BED_LOW_MIN_Y)
					cornerY = -(BED_LOW_MAX_Y - BED_LOW_MIN_Y - 10) / 2;
			}
			
			// Add intro to output
			output << "M106 S" << (filamentType == PLA ? "255" : "50") << endl;
			output << "M17" << endl;
			output << "G90" << endl;
			output << "M104 S" << to_string(filamentTemperature) << endl;
			output << "G0 Z5 F2900" << endl;
			output << "G28" << endl;
		
			// Check if one of the corners wasn't set
			if(cornerX == 0 || cornerY == 0) {
			
				// Prepare extruder the standard way
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
			
			// Send input to output
			output << input.rdbuf();
			
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
		
			// Return if input file was successfully removed
			return !unlink(tempName.c_str());
		}
	}
	
	// Return false
	return false;
}

bool waveBondingPreprocessor(const char *file) {

	// Initialize temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize files
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
		
			// Initialize variables
			string line;
			Gcode gcode, previousGcode, refrenceGcode, tackPoint, extraGcode;
			bool relativeMode = false, changesPlane = false;
			uint32_t cornerCounter = 0, layerCounter = 0, waveRatio;
			double distance;
			double positionRelativeX = 0, positionRelativeY = 0, positionRelativeZ = 0, positionRelativeE = 0;
			double deltaX, deltaY, deltaZ, deltaE;
			double tempRelativeX, tempRelativeY, tempRelativeZ, tempRelativeE;
			double relativeDifferenceX, relativeDifferenceY, relativeDifferenceZ, relativeDifferenceE;
			double deltaRatioX, deltaRatioY, deltaRatioZ, deltaRatioE;
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line is a layer command
				if(line.find(";LAYER:") != string::npos)
				
					// Increment layer counter
					layerCounter++;
			
				// Check if line was parsed successfully, it's on the first layer, and it's a G command
				if(gcode.parseLine(line) && layerCounter == 1 && gcode.hasValue('G')) {
				
					// Check if command is G0 or G1 and it's in absolute mode
					if((gcode.getValue('G') == "0" || gcode.getValue('G') == "1") && !relativeMode) {
			
						// Check if line contains an X or Y value
						if(gcode.hasValue('X') || gcode.hasValue('Y'))
				
							// Set changes plane
							changesPlane = true;
					
						// Set delta values
						deltaX = !gcode.hasValue('X') ? 0 : stod(gcode.getValue('X')) - positionRelativeX;
						deltaY = !gcode.hasValue('Y')? 0 : stod(gcode.getValue('Y')) - positionRelativeY;
						deltaZ = !gcode.hasValue('Z') ? 0 : stod(gcode.getValue('Z')) - positionRelativeZ;
						deltaE = !gcode.hasValue('E') ? 0 : stod(gcode.getValue('E')) - positionRelativeE;
				
						// Adjust relative values for the changes
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
				
						// Check if delta E is greater than zero
						if(deltaE > 0) {
				
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
					
					// Otherwise check if command is G28
					else if(gcode.getValue('G') == "28") {
				
						// Set relative values
						positionRelativeX = 54;
						positionRelativeY = 50;
					}
			
					// Otherwise check if command is G90
					else if(gcode.getValue('G') == "90")
				
						// Clear relative mode
						relativeMode = false;
			
					// Otherwise check if command is G91
					else if(gcode.getValue('G') == "91")
				
						// Set relative mode
						relativeMode = true;
			
					// Otherwise check if command is G92
					else if(gcode.getValue('G') == "92") {
			
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
							if(gcode.hasValue('X'))
								positionRelativeX = stod(gcode.getValue('X'));
							if(gcode.hasValue('Y'))
								positionRelativeY = stod(gcode.getValue('Y'));
							if(gcode.hasValue('Z'))
								positionRelativeZ = stod(gcode.getValue('Z'));
							if(gcode.hasValue('E'))
								positionRelativeE = stod(gcode.getValue('E'));
						}
					}
				}
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Return if input file was successfully removed
			return !unlink(tempName.c_str());
		}
	}
	
	// Return false
	return false;
}

bool thermalBondingPreprocessor(const char *file, bool overrideWaveBondingPreprocessor) {

	// Initialize temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize files
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
		
			// Initialize variables
			string line;
			Gcode gcode, previousGcode, refrenceGcode, tackPoint;
			uint32_t layerCounter = 0, cornerCounter = 0;
			bool relativeMode = false;
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line is a layer command
				if(layerCounter < 2 && line.find(";LAYER:") != string::npos) {
			
					// Check if on first counted layer
					if(layerCounter == 0)
					
						// Send temperature command to output
						output << "M109 S" << to_string(getBoundedTemperature(filamentTemperature + (filamentType == PLA ? 10 : 15))) << endl;
					
					// Otherwise
					else
						// Send temperature command to output
						output << "M104 S" << to_string(filamentTemperature) << endl;
				
					// Increment layer counter
					layerCounter++;
				}
			
				// Check if line was parsed successfully
				if(gcode.parseLine(line)) {
				
					// Check if command contains temperature or fan controls past the first layer that doesn't turn them off
					if(layerCounter > 0 && gcode.hasValue('M') && gcode.hasValue('S') && gcode.getValue('S') != "0" && (gcode.getValue('M') == "104" || gcode.getValue('M') == "105" || gcode.getValue('M') == "106" || gcode.getValue('M') == "107" || gcode.getValue('M') == "109"))
			
						// Get next line
						continue;
					
					// Otherwise check if on first counted layer
					else if(layerCounter == 1) {
			
						// Check if wave bonding isn't being used and line is a G command
						if(!overrideWaveBondingPreprocessor && !useWaveBondingPreprocessor && gcode.hasValue('G')) {
						
							// Check if command is G0 or G1 and it's in absolute
							if((gcode.getValue('G') == "0" || gcode.getValue('G') == "1") && !relativeMode) {
					
								// Check if previous command exists and filament is ABS, HIPS, or PLA
								if(!previousGcode.isEmpty() && (filamentType == ABS || filamentType == HIPS || filamentType == PLA)) {
						
									// Check if corner counter is less than or equal to one
									if(cornerCounter <= 1) {
							
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
							
									// Otherwise check if corner counter is greater than one and sharp corner
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
							}
					
							// Otherwise check if command is G90
							else if(gcode.getValue('G') == "90")
				
								// Clear relative mode
								relativeMode = false;
				
							// Otherwise check if command is G91
							else if(gcode.getValue('G') == "91")
				
								// Set relative mode
								relativeMode = true;
						}
					
						// Set previous g-code
						previousGcode = gcode;
					}
				}
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Return if input file was successfully removed
			return !unlink(tempName.c_str());
		}
	}
	
	// Return false
	return false;
}

bool bedCompensationPreprocessor(const char *file) {

	// Initialize temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize files
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
		
			// Initialize variables
			string line;
			Gcode gcode, extraGcode;
			bool relativeMode = false;
			bool changesPlane = false;
			double distance, heightAdjustment;
			uint32_t segmentCounter;
			double positionAbsoluteX = 0, positionAbsoluteY = 0;
			double positionRelativeX = 0, positionRelativeY = 0, positionRelativeZ = 0, positionRelativeE = 0;
			double deltaX, deltaY, deltaZ, deltaE;
			double absoluteDifferenceX, absoluteDifferenceY, relativeDifferenceX, relativeDifferenceY, relativeDifferenceZ, relativeDifferenceE;
			double deltaRatioX, deltaRatioY, deltaRatioZ, deltaRatioE;
			double tempAbsoluteX, tempAbsoluteY, tempRelativeX, tempRelativeY, tempRelativeZ, tempRelativeE;
			
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line was parsed successfully and it's a G command
				if(gcode.parseLine(line) && gcode.hasValue('G')) {
			
					// Check if command is G0 or G1 and it's in absolute mode
					if((gcode.getValue('G') == "0" || gcode.getValue('G') == "1") && !relativeMode) {
		
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
						positionRelativeX += deltaX;
						positionRelativeY += deltaY;
						positionRelativeZ += deltaZ;
						positionRelativeE += deltaE;
				
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
				
						// Check if change in E is greater than zero
						if(deltaE > 0) {
				
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
							
									// Check if plane changed
									if(changesPlane)
							
										// Set extra g-code Z value
										extraGcode.setValue('Z', to_string(positionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ + heightAdjustment));
							
									// Otherwise check if command has a Z value and the change in Z in noticable
									else if(gcode.hasValue('Z') && deltaZ != DBL_EPSILON)
							
										// Set extra g-code Z value
										extraGcode.setValue('Z', to_string(positionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ));
							
									// Set extra g-gode E value
									extraGcode.setValue('E', to_string(positionRelativeE - deltaE + tempRelativeE - relativeDifferenceE));
							
									// Send extra g-code to output
									output << extraGcode << endl;
								}
						
								// Otherwise
								else {
						
									// Check if plane changed
									if(changesPlane) {
							
										// Check if command has a Z value
										if(gcode.hasValue('Z'))
								
											// Add value to command Z value
											gcode.setValue('Z', to_string(stod(gcode.getValue('Z')) + heightAdjustment));
								
										// Otherwise
										else
								
											// Set command Z value
											gcode.setValue('Z', to_string(relativeDifferenceZ + deltaZ + heightAdjustment));
									}
								}
							}
						}
				
						// Otherwise
						else {
				
							// Check if the plane changed
							if(changesPlane) {
							
								// Set height adjustment
								heightAdjustment = getHeightAdjustmentRequired(positionAbsoluteX, positionAbsoluteY);
						
								// Check if command has a Z value
								if(gcode.hasValue('Z'))
						
									// Add value to command Z
									gcode.setValue('Z', to_string(stod(gcode.getValue('Z')) + heightAdjustment));
						
								// Otherwise
								else
						
									// Set command Z
									gcode.setValue('Z', to_string(positionRelativeZ + heightAdjustment));
							}
						}
					}
					
					// Otherwise check if command is G28
					else if(gcode.getValue('G') == "28") {
				
						// Set X and Y to home
						positionRelativeX = positionAbsoluteX = 54;
						positionRelativeY = positionAbsoluteY = 50;
					}
			
		      			// Otherwise check if command is G90
					else if(gcode.getValue('G') == "90")
				
						// Clear relative mode
						relativeMode = false;
			
					// Otherwise check if command is G91
					else if(gcode.getValue('G') == "91")
				
						// Set relative mode
						relativeMode = true;
			
					// Otherwise check if command is G92
					else if(gcode.getValue('G') == "92") {
			
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
			
							// Set position relative values
							if(gcode.hasValue('X'))
								positionRelativeX = stod(gcode.getValue('X'));
							if(gcode.hasValue('Y'))
								positionRelativeY = stod(gcode.getValue('Y'));
							if(gcode.hasValue('Z'))
								positionRelativeZ = stod(gcode.getValue('Z'));
							if(gcode.hasValue('E'))
								positionRelativeE = stod(gcode.getValue('E'));
						}
					}
				}
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Return if input file was successfully removed
			return !unlink(tempName.c_str());
		}
	}
	
	// Return false
	return false;
}

bool backlashCompensationPreprocessor(const char *file) {

	// Initialize temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize files
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
		
			// Initialize variables
			string line;
			Gcode gcode, extraGcode;
			bool relativeMode = false;
			string valueF = "1000";
			directions directionX, directionY, previousDirectionX = NEITHER, previousDirectionY = NEITHER;
			double compensationX = 0, compensationY = 0;
			double positionRelativeX = 0, positionRelativeY = 0, positionRelativeZ = 0, positionRelativeE = 0;
			double deltaX, deltaY, deltaZ, deltaE;
	
			// Go through input file
			while(input.peek() != EOF) {
			
				// Read in a line
				getline(input, line);
				
				// Check if line was parsed successfully and it's a G command
				if(gcode.parseLine(line) && gcode.hasValue('G')) {
				
					// Check if command is G0 or G1 and it's in absolute mode
					if((gcode.getValue('G') == "0" || gcode.getValue('G') == "1") && !relativeMode) {
			
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
							if(directionX != previousDirectionX && previousDirectionX != NEITHER)
					
								// Set X compensation
								compensationX += backlashX * (directionX == POSITIVE ? 1 : -1);
					
							// Check if Y direction has changed
							if(directionY != previousDirectionY && previousDirectionY != NEITHER)
					
								// Set Y compensation
								compensationY += backlashY * (directionY == POSITIVE ? 1 : -1);
							
							// Set extra g-code X and Y value
							extraGcode.setValue('X', to_string(positionRelativeX + compensationX));
							extraGcode.setValue('Y', to_string(positionRelativeY + compensationY));
					
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
					
					// Otherwise check if command is G28
					else if(gcode.getValue('G') == "28") {
				
						// Set relative values
						positionRelativeX = 54;
						positionRelativeY = 50;
					}
			
		      			// Otherwise check if command is G90
					else if(gcode.getValue('G') == "90")
				
						// Clear relative mode
						relativeMode = false;
			
					// Otherwise check if command is G91
					else if(gcode.getValue('G') == "91")
				
						// Set relative mode
						relativeMode = true;
			
					// Otherwise check if command is G92
					else if(gcode.getValue('G') == "92") {
			
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
			
							// Set position relative values
							if(gcode.hasValue('X'))
								positionRelativeX = stod(gcode.getValue('X'));
							if(gcode.hasValue('Y'))
								positionRelativeY = stod(gcode.getValue('Y'));
							if(gcode.hasValue('Z'))
								positionRelativeZ = stod(gcode.getValue('Z'));
							if(gcode.hasValue('E'))
								positionRelativeE = stod(gcode.getValue('E'));
						}
					}
				}
				
				// Send line to output file
				output << gcode << endl;
			}
		
			// Return if input file was successfully removed
			return !unlink(tempName.c_str());
		}
	}
	
	// Return false
	return false;
}

bool feedRateConversionPreprocessor(const char *file) {

	// Initialize temporary name
	string tempName = tmpnam(NULL);
	
	// Check if moving the input file to a temporary file was successful
	if(!rename(file, tempName.c_str())) {
		
		// Initialize files
		ifstream input(tempName, ios::in | ios::binary);
		ofstream output(file, ios::out | ios::binary);
	
		// Check if input and output files were opened successfully
		if(input.good() && output.good()) {
		
			// Initialize variables
			string line;
			Gcode gcode;
			double commandFeedRate;
	
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
		
			// Return if input file was successfully removed
			return !unlink(tempName.c_str());
		}
	}
	
	// Return false
	return false;
}
