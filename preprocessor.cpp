// Header files
#include <fstream>
#include <string>
#include <list>
#include <stack>
#include <cmath>
#include <cfloat>
#include <cstring>
#include "preprocessor.h"

using namespace std;


// Definitions

// Bed dimensions
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

// Wave bonding pre-processor settings
#define WAVE_PERIOD 5.0
#define WAVE_PERIOD_QUARTER (WAVE_PERIOD / 4.0)
#define WAVE_SIZE 0.15

// Bed compensation pre-processor settings
#define SEGMENT_LENGTH 2.0

// Feed rate conversion pre-processor settings
#define MAX_FEED_RATE 60.001


// Enumerations

// Filament types
enum filamentTypes {NO_TYPE, ABS, PLA, HIPS, OTHER};

// Directions
enum directions {POSITIVE, NEGATIVE, NEITHER};

// Print tiers
enum printTiers {LOW, MEDIUM, HIGH};

// Pre-processor stages
enum preprocessorStages {NONE, INPUT, CENTER, VALIDATION, PREPARATION, WAVE, THERMAL, BED, BACKLASH, FEED};


// Classes

// Command class
class Command {

	// Public
	public:

		// Constructor
		Command(const string &line = "", preprocessorStages origin = INPUT, preprocessorStages skip = NONE) {
	
			// Set values
			set(line, origin, skip);
		}
		
		// Set
		void set(const string &line = "", preprocessorStages origin = INPUT, preprocessorStages skip = NONE) {
		
			// Set values
			this->line = line;
			this->origin = origin;
			this->skip = skip;
		}
		
		// Clear
		void clear() {
		
			// Set data members to default values
			line.clear();
			origin = INPUT;
			skip = NONE;
		}
		
		// Assignment operator
		Command &operator=(const Command &value) {

			// Return self if calling on self
			if(this == &value)
				return *this;
	
			// Copy values
			line = value.line;
			origin = value.origin;
			skip = value.skip;
	
			// Return self
			return *this;
		}
	
		// Data members
		string line;
		preprocessorStages origin;
		preprocessorStages skip;
};


// Global variables

// Configurable settings
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
bool printingTestBorder;
bool printingBacklashCalibrationCylinder;

// Return value
string returnValue;

// Center model pre-processor settings
double displacementX;
double displacementY;

// Preparation pre-processor settings
bool addedIntro;
bool addedOutro;

// Wave bonding pre-processor settings
uint8_t waveStep;
bool waveBondingRelativeMode;
uint8_t waveBondingLayerCounter;
bool waveBondingChangesPlane;
uint32_t waveBondingCornerCounter;
double waveBondingPositionRelativeX;
double waveBondingPositionRelativeY;
double waveBondingPositionRelativeZ;
double waveBondingPositionRelativeE;
Gcode waveBondingPreviousGcode;
Gcode waveBondingRefrenceGcode;
Gcode waveBondingTackPoint;
Gcode waveBondingExtraGcode;

// Thermal bonding pre-processor settings
bool thermalBondingRelativeMode;
uint8_t thermalBondingLayerCounter;
uint32_t thermalBondingCornerCounter;
Gcode thermalBondingPreviousGcode;
Gcode thermalBondingRefrenceGcode;
Gcode thermalBondingTackPoint;

// Bed compensation pre-processor settings
bool bedCompensationRelativeMode;
bool bedCompensationChangesPlane;
double bedCompensationPositionAbsoluteX;
double bedCompensationPositionAbsoluteY;
double bedCompensationPositionRelativeX;
double bedCompensationPositionRelativeY;
double bedCompensationPositionRelativeZ;
double bedCompensationPositionRelativeE;
Gcode bedCompensationExtraGcode;

// Backlash compensation pre-processor settings
bool backlashCompensationRelativeMode;
string valueF;
directions previousDirectionX;
directions previousDirectionY;
double compensationX;
double compensationY;
double backlashPositionRelativeX;
double backlashPositionRelativeY;
double backlashPositionRelativeZ;
double backlashPositionRelativeE;
Gcode backlashCompensationExtraGcode;

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
double min(double first, double second) {

	// Return smaller of the two
	return first < second ? first : second;
}

double max(double first, double second) {

	// Return larger of the two
	return first > second ? first : second;
}

uint16_t getBoundedTemperature(uint16_t temperature) {

	// Return temperature bounded by range
	return min(max(temperature, 150), 285);
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
	
		// Set G-code to a delay command based on time
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

EXPORT void setPrintingTestBorder(bool value) {

	// Set printing test border
	printingTestBorder = value;
}

EXPORT void setPrintingBacklashCalibrationCylinder(bool value) {

	// Set printing backlash calibration cylinder
	printingBacklashCalibrationCylinder = value;
}

EXPORT void resetPreprocessorSettings() {

	// General settings
	printingTestBorder = false;
	printingBacklashCalibrationCylinder = false;

	// Center model pre-processor settings
	displacementX = 0;
	displacementY = 0;

	// Preparation pre-processor settings
	addedIntro = false;
	addedOutro = false;

	// Wave bonding pre-processor settings
	waveStep = 0;
	waveBondingRelativeMode = false;
	waveBondingLayerCounter = 0;
	waveBondingChangesPlane = false;
	waveBondingCornerCounter = 0;
	waveBondingPositionRelativeX = 0;
	waveBondingPositionRelativeY = 0;
	waveBondingPositionRelativeZ = 0;
	waveBondingPositionRelativeE = 0;
	waveBondingPreviousGcode.clear();
	waveBondingRefrenceGcode.clear();
	waveBondingTackPoint.clear();
	waveBondingExtraGcode.clear();

	// Thermal bonding pre-processor settings
	thermalBondingRelativeMode = false;
	thermalBondingLayerCounter = 0;
	thermalBondingCornerCounter = 0;
	thermalBondingPreviousGcode.clear();
	thermalBondingRefrenceGcode.clear();
	thermalBondingTackPoint.clear();

	// Bed compensation pre-processor settings
	bedCompensationRelativeMode = false;
	bedCompensationChangesPlane = false;
	bedCompensationPositionAbsoluteX = 0;
	bedCompensationPositionAbsoluteY = 0;
	bedCompensationPositionRelativeX = 0;
	bedCompensationPositionRelativeY = 0;
	bedCompensationPositionRelativeZ = 0;
	bedCompensationPositionRelativeE = 0;
	bedCompensationExtraGcode.clear();

	// Backlash compensation pre-processor settings
	backlashCompensationRelativeMode = false;
	valueF = "1000";
	previousDirectionX = NEITHER;
	previousDirectionY = NEITHER;
	compensationX = 0;
	compensationY = 0;
	backlashPositionRelativeX = 0;
	backlashPositionRelativeY = 0;
	backlashPositionRelativeZ = 0;
	backlashPositionRelativeE = 0;
	backlashCompensationExtraGcode.clear();
}

EXPORT bool collectPrintInformation(const char *file) {

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
							double commandX = stod(gcode.getValue('X'));
						
							// Set local X
							localX = relativeMode ? localX + commandX : commandX;
						}
					
						// Check if command has a Y value
						if(gcode.hasValue('Y')) {
					
							// Get Y value of the command
							double commandY = stod(gcode.getValue('Y'));
						
							// Set local Y
							localY = relativeMode ? localY + commandY : commandY;
						}
					
						// Check if command has a X value
						if(gcode.hasValue('Z')) {
					
							// Get X value of the command
							double commandZ = stod(gcode.getValue('Z'));
						
							// Set local Z
							localZ = relativeMode ? localZ + commandZ : commandZ;
							
							// Check if not ignoring print dimension limitations, not printing a test border or backlash calibration cylinder, and Z is out of bounds
							if(!ignorePrintDimensionLimitations && !printingTestBorder && !printingBacklashCalibrationCylinder && (localZ < BED_LOW_MIN_Z || localZ > BED_HIGH_MAX_Z))
					
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
							
								// Check if not ignoring print dimension limitations, not printing a test border or backlash calibration cylinder, centering model pre-processor isn't used, and X or Y is out of bounds
								if(!ignorePrintDimensionLimitations && !printingTestBorder && !printingBacklashCalibrationCylinder && !useCenterModelPreprocessor && (localX < BED_LOW_MIN_X || localX > BED_LOW_MAX_X || localY < BED_LOW_MIN_Y || localY > BED_LOW_MAX_Y))
								
									// Return false
									return false;
						
								minXExtruderLow = min(minXExtruderLow, localX);
								maxXExtruderLow = max(maxXExtruderLow, localX);
								minYExtruderLow = min(minYExtruderLow, localY);
								maxYExtruderLow = max(maxYExtruderLow, localY);
							break;
						
							case MEDIUM:
							
								// Check if not ignoring print dimension limitations, not printing a test border or backlash calibration cylinder, centering model pre-processor isn't used, and X or Y is out of bounds
								if(!ignorePrintDimensionLimitations && !printingTestBorder && !printingBacklashCalibrationCylinder && !useCenterModelPreprocessor && (localX < BED_MEDIUM_MIN_X || localX > BED_MEDIUM_MAX_X || localY < BED_MEDIUM_MIN_Y || localY > BED_MEDIUM_MAX_Y))
								
									// Return false
									return false;
						
								minXExtruderMedium = min(minXExtruderMedium, localX);
								maxXExtruderMedium = max(maxXExtruderMedium, localX);
								minYExtruderMedium = min(minYExtruderMedium, localY);
								maxYExtruderMedium = max(maxYExtruderMedium, localY);
							break;

							case HIGH:
							
								// Check if not ignoring print dimension limitations, not printing a test border or backlash calibration cylinder, centering model pre-processor isn't used, and X or Y is out of bounds
								if(!ignorePrintDimensionLimitations && !printingTestBorder && !printingBacklashCalibrationCylinder && !useCenterModelPreprocessor && (localX < BED_HIGH_MIN_X || localX > BED_HIGH_MAX_X || localY < BED_HIGH_MIN_Y || localY > BED_HIGH_MAX_Y))
								
									// Return false
									return false;
						
								minXExtruderHigh = min(minXExtruderHigh, localX);
								maxXExtruderHigh = max(maxXExtruderHigh, localX);
								minYExtruderHigh = min(minYExtruderHigh, localY);
								maxYExtruderHigh = max(maxYExtruderHigh, localY);
							break;
						}
						
						minZExtruder = min(minZExtruder, localZ);
						maxZExtruder = max(maxZExtruder, localZ);
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
		
		// Check if center model pre-processor is set and not printing a test border or backlash calibration cylinder
		if(useCenterModelPreprocessor && !printingTestBorder && !printingBacklashCalibrationCylinder) {
	
			// Calculate adjustments
			displacementX = (BED_LOW_MAX_X - max(maxXExtruderLow, max(maxXExtruderMedium, maxXExtruderHigh)) - min(minXExtruderLow, min(minXExtruderMedium, minXExtruderHigh)) + BED_LOW_MIN_X) / 2;
			displacementY = (BED_LOW_MAX_Y - max(maxYExtruderLow, max(maxYExtruderMedium, maxYExtruderHigh)) - min(minYExtruderLow, min(minYExtruderMedium, minYExtruderHigh)) + BED_LOW_MIN_Y) / 2;
	
			//Adjust print values
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
			
			// Check if not ignoring print dimension limitations and adjusted print values are out of bounds
			if(!ignorePrintDimensionLimitations && (minZExtruder < BED_LOW_MIN_Z || maxZExtruder > BED_HIGH_MAX_Z || maxXExtruderLow > BED_LOW_MAX_X || maxXExtruderMedium > BED_MEDIUM_MAX_X || maxXExtruderHigh > BED_HIGH_MAX_X || maxYExtruderLow > BED_LOW_MAX_Y || maxYExtruderMedium > BED_MEDIUM_MAX_Y || maxYExtruderHigh > BED_HIGH_MAX_Y || minXExtruderLow < BED_LOW_MIN_X || minXExtruderMedium < BED_MEDIUM_MIN_X || minXExtruderHigh < BED_HIGH_MIN_X || minYExtruderLow < BED_LOW_MIN_Y || minYExtruderMedium < BED_MEDIUM_MIN_Y || minYExtruderHigh < BED_HIGH_MIN_Y))
			
				// Return false
				return false;
		}
	
		// Return true
		return true;
	}
	
	// Return false
	return false;
}

EXPORT const char *preprocess(const char *input, const char *output, bool lastCommand) {

	// Initialize variables
	string line;
	ifstream inputFile;
	ofstream outputFile;
	bool processedCommand = false;
	list<Command> commands;
	Command command;
	Gcode gcode;
	
	// Clear return value
	returnValue.clear();
	
	// Check if outputting to a file
	if(output != NULL) {

		// Open input and output
		inputFile.open(input, ios::in | ios::binary);
		outputFile.open(output, ios::out | ios::binary);
	}
	
	// Loop forever
	while(true) {
	
		// Check if outputting to a file
		if(output != NULL) {

			// Check if no more commands
			if(!commands.size()) {

				// Check if not at end of file
				if(inputFile.peek() != EOF) {

					// Append line to commands
					getline(inputFile, line);
					commands.push_front(Command(line, INPUT));
				}
	
				// Otherwise
				else

					// Break
					break;
			}
		}
		
		// Otherwise check if no more commands
		else if(!commands.size()) {
			
			// Check if command hasn't been processed
			if(!processedCommand) {
	
				// Append input to commands
				commands.push_front(Command(input, INPUT));
				
				// Set processed command
				processedCommand = true;
			}
			
			// Otherwise
			else
			
				// Break
				break;
		}

		// Parse next line in commands
		command = commands.front();
		commands.pop_front();
		gcode.parseLine(command.line);
		
		// Check if command contains valid G-code
		if(!gcode.isEmpty())
		
			// Remove line number
			gcode.removeParameter('N');

		// Check if printing test border or backlash calibration cylinder and using center model pre-processor
		if(!printingTestBorder && !printingBacklashCalibrationCylinder && useCenterModelPreprocessor && command.skip < CENTER) {

			// Check if command contains valid G-code
			if(!gcode.isEmpty()) 
			
				// Check if command is G0 or G1
				if(gcode.hasValue('G') && (gcode.getValue('G') == "0" or gcode.getValue('G') == "1")) {

					// Check if line contains an X value
					if(gcode.hasValue('X'))

						// Adjust X value
						gcode.setValue('X', to_string(stod(gcode.getValue('X')) + displacementX));

					// Check if line contains a Y value
					if(gcode.hasValue('Y'))

						// Adjust Y value
						gcode.setValue('Y', to_string(stod(gcode.getValue('Y')) + displacementY));
				}
		}

		// Check if not printing test border or backlash calibration cylinder and using validation pre-processor
		if(!printingTestBorder && !printingBacklashCalibrationCylinder && useValidationPreprocessor && command.skip < VALIDATION) {

			// Check if command contains valid G-code
			if(!gcode.isEmpty()) {

				// Check if extruder absolute mode, extruder relative mode, or stop idle hold command
				if(gcode.hasValue('M') && (gcode.getValue('M') == "82" || gcode.getValue('M') == "83" || gcode.getValue('M') == "84"))

					// Get next line
					continue;

				// Check if unit to millimeters command
				if(gcode.hasValue('G') && gcode.getValue('G') == "21")

					// Get next line
					continue;

				// Check if command contains tool selection
				if(gcode.hasParameter('T')) {

					// Remove tool selection
					gcode.removeParameter('T');

					// Get next line if empty
					if(gcode.isEmpty())
						continue;
				}
			}
		}

		// Check if printing test border or backlash calibration cylinder or using preparation pre-processor
		if((printingTestBorder || printingBacklashCalibrationCylinder || usePreparationPreprocessor) && command.skip < PREPARATION) {

			// Check if intro hasn't been added yet
			if(!addedIntro) {

				// Set added intro
				addedIntro = true;
		
				// Initialize new commands
				stack<Command> newCommands;
				
				// Check if printing backlash calibration cylinder
				if(printingBacklashCalibrationCylinder) {
				
					// Add intro to output
					newCommands.push(Command("G90\n", PREPARATION, PREPARATION));
					newCommands.push(Command("M104 S" + to_string(filamentTemperature) + '\n', PREPARATION, PREPARATION));
					newCommands.push(Command("G28\n", PREPARATION, PREPARATION));
					newCommands.push(Command("G0 Z2\n", PREPARATION, PREPARATION));
					newCommands.push(Command("M109 S" + to_string(filamentTemperature) + '\n', PREPARATION, PREPARATION));
					newCommands.push(Command("M106 S" + static_cast<string>(filamentType == PLA ? "255" : "1") + '\n', PREPARATION, PREPARATION));
				}
				
				// Otherwise
				else {
		
					// Check if not printing test border
					double cornerX = 0, cornerY = 0;
					if(!printingTestBorder) {

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
					newCommands.push(Command("M106 S" + static_cast<string>(filamentType == PLA ? "255" : "50") + '\n', PREPARATION, PREPARATION));
					newCommands.push(Command("M17\n", PREPARATION, PREPARATION));
					newCommands.push(Command("G90\n", PREPARATION, PREPARATION));
					newCommands.push(Command("M104 S" + to_string(filamentTemperature) + '\n', PREPARATION, PREPARATION));
					newCommands.push(Command("G0 Z5 F2900\n", PREPARATION, PREPARATION));
					newCommands.push(Command("G28\n", PREPARATION, PREPARATION));

					// Add heat bed command if using Micro Pass
					if(usingMicroPass)
						newCommands.push(Command("M190 S" + static_cast<string>(filamentType == PLA ? "70" : "80") + '\n', PREPARATION, PREPARATION));

					// Check if one of the corners wasn't set
					if(!cornerX || !cornerY) {

						// Prepare extruder the standard way
						newCommands.push(Command("M18\n", PREPARATION, PREPARATION));
						newCommands.push(Command("M109 S" + to_string(filamentTemperature) + '\n', PREPARATION, PREPARATION));
						newCommands.push(Command("G4 S2\n", PREPARATION, PREPARATION));
						newCommands.push(Command("M17\n", PREPARATION, PREPARATION));
						newCommands.push(Command("G91\n", PREPARATION, PREPARATION));
					}

					// Otherwise
					else {

						// Prepare extruder by leaving excess at corner
						newCommands.push(Command("G91\n", PREPARATION, PREPARATION));
						newCommands.push(Command("G0 X" + to_string(-cornerX) + " Y" + to_string(-cornerY) + " F2900\n", PREPARATION, PREPARATION));
						newCommands.push(Command("M18\n", PREPARATION, PREPARATION));
						newCommands.push(Command("M109 S" + to_string(filamentTemperature) + '\n', PREPARATION, PREPARATION));
						newCommands.push(Command("M17\n", PREPARATION, PREPARATION));
						newCommands.push(Command("G0 Z-4 F2900\n", PREPARATION, PREPARATION));
						newCommands.push(Command("G0 E7.5 F2000\n", PREPARATION, PREPARATION));
						newCommands.push(Command("G4 S3\n", PREPARATION, PREPARATION));
						newCommands.push(Command("G0 X" + to_string(cornerX * 0.1) + " Y" + to_string(cornerY * 0.1) + " Z-0.999 F2900\n", PREPARATION, PREPARATION));
						newCommands.push(Command("G0 X" + to_string(cornerX * 0.9) + " Y" + to_string(cornerY * 0.9) + " F1000\n", PREPARATION, PREPARATION));
					}

					newCommands.push(Command("G92 E0\n", PREPARATION, PREPARATION));
					newCommands.push(Command("G90\n", PREPARATION, PREPARATION));
					newCommands.push(Command("G0 Z0.4 F2400\n", PREPARATION, PREPARATION));
				}
		
				// Finish processing command later
				if(!gcode.isEmpty())
					commands.push_front(Command(gcode.getAscii() + '\n', command.origin, PREPARATION));
				else
					commands.push_front(Command(command.line, command.origin, PREPARATION));
	
				// Append new commands to commands
				while(newCommands.size()) {
					commands.push_front(newCommands.top());
					newCommands.pop();
				}
	
				// Process next command
				continue;
			}

			// Check if outro hasn't been added, no more commands, and at end of file
			if(!addedOutro && !commands.size() && ((output != NULL and inputFile.peek() == EOF) || lastCommand)) {

				// Set added outro
				addedOutro = true;
		
				// Initialize new commands
				stack<Command> newCommands;
				
				// Check if printing backlash calibration cylinder
				if(printingBacklashCalibrationCylinder)
				
					// Add outro to output
					newCommands.push(Command("M104 S0\n", PREPARATION, PREPARATION));
				
				// Otherwise
				else {

					// Add outro to output
					newCommands.push(Command("G91\n", PREPARATION, PREPARATION));
					newCommands.push(Command("G0 E-1 F2000\n", PREPARATION, PREPARATION));
					newCommands.push(Command("G0 X5 Y5 F2000\n", PREPARATION, PREPARATION));
					newCommands.push(Command("G0 E-18 F2000\n", PREPARATION, PREPARATION));
					newCommands.push(Command("M104 S0\n", PREPARATION, PREPARATION));

					if(usingMicroPass)
						newCommands.push(Command("M140 S0\n", PREPARATION, PREPARATION));

					if(maxZExtruder > 60) {
						if(maxZExtruder < 110)
							newCommands.push(Command("G0 Z3 F2900\n", PREPARATION, PREPARATION));
						newCommands.push(Command("G90\n", PREPARATION, PREPARATION));
						newCommands.push(Command("G0 X90 Y84\n", PREPARATION, PREPARATION));
					}
					else {
						newCommands.push(Command("G0 Z3 F2900\n", PREPARATION, PREPARATION));
						newCommands.push(Command("G90\n", PREPARATION, PREPARATION));
						newCommands.push(Command("G0 X95 Y95\n", PREPARATION, PREPARATION));
					}
				}

				newCommands.push(Command("M18\n", PREPARATION, PREPARATION));
				newCommands.push(Command("M107\n", PREPARATION, PREPARATION));
		
				// Append new commands to commands
				while(newCommands.size()) {
					commands.push_front(newCommands.top());
					newCommands.pop();
				}
			}
		}

		// Check if not printing test border or backlash calibration cylinder and using wave bonding pre-processor
		if(!printingTestBorder && !printingBacklashCalibrationCylinder && useWaveBondingPreprocessor && command.skip < WAVE) {
		
			// Initialize new commands
			stack<Command> newCommands;

			// Check if command contains valid G-code
			if(!gcode.isEmpty())
			
				// Check if command is a G command
				if(gcode.hasValue('G')) {
				
					// Check if at a new layer
					if(waveBondingLayerCounter < 2 && command.origin != PREPARATION && gcode.hasValue('Z'))
	
						// Increment layer counter
						waveBondingLayerCounter++;

					// Check if on first counted layer
					if(waveBondingLayerCounter == 1) {

						// Check if command is G0 or G1 and it's in absolute mode
						if((gcode.getValue('G') == "0" || gcode.getValue('G') == "1") && !waveBondingRelativeMode) {

							// Check if line contains an X or Y value
							if(gcode.hasValue('X') || gcode.hasValue('Y'))

								// Set changes plane
								waveBondingChangesPlane = true;

							// Set delta values
							double deltaX = !gcode.hasValue('X') ? 0 : stod(gcode.getValue('X')) - waveBondingPositionRelativeX;
							double deltaY = !gcode.hasValue('Y') ? 0 : stod(gcode.getValue('Y')) - waveBondingPositionRelativeY;
							double deltaZ = !gcode.hasValue('Z') ? 0 : stod(gcode.getValue('Z')) - waveBondingPositionRelativeZ;
							double deltaE = !gcode.hasValue('E') ? 0 : stod(gcode.getValue('E')) - waveBondingPositionRelativeE;

							// Adjust relative values for the changes
							waveBondingPositionRelativeX += deltaX;
							waveBondingPositionRelativeY += deltaY;
							waveBondingPositionRelativeZ += deltaZ;
							waveBondingPositionRelativeE += deltaE;

							// Calculate distance of change
							double distance = sqrt(deltaX * deltaX + deltaY * deltaY);

							// Set wave ratio
							uint32_t waveRatio = distance > WAVE_PERIOD_QUARTER ? stod(to_string(distance / WAVE_PERIOD_QUARTER)) : 1;

							// Set relative differences
							double relativeDifferenceX = waveBondingPositionRelativeX - deltaX;
							double relativeDifferenceY = waveBondingPositionRelativeY - deltaY;
							double relativeDifferenceZ = waveBondingPositionRelativeZ - deltaZ;
							double relativeDifferenceE = waveBondingPositionRelativeE - deltaE;

							// Set delta ratios
							double deltaRatioX, deltaRatioY, deltaRatioZ, deltaRatioE;
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

								// Check if previous G-code is not empty
								if(!waveBondingPreviousGcode.isEmpty()) {

									//Check if first sharp corner
									if(waveBondingCornerCounter < 1 && isSharpCorner(gcode, waveBondingPreviousGcode)) {

										// Check if refrence G-codes isn't set
										if(waveBondingRefrenceGcode.isEmpty()) {
	
											// Check if a tack point was created
											waveBondingTackPoint = createTackPoint(gcode, waveBondingPreviousGcode);
											if(!waveBondingTackPoint.isEmpty())
								
												// Add tack point to output
												newCommands.push(Command(waveBondingTackPoint.getAscii() + '\n', WAVE, WAVE));
										}
	
										// Set refrence G-code
										waveBondingRefrenceGcode = gcode;
	
										// Increment corner counter
										waveBondingCornerCounter++;
									}

									// Otherwise check if sharp corner
									else if(isSharpCorner(gcode, waveBondingRefrenceGcode)) {

										// Check if a tack point was created
										waveBondingTackPoint = createTackPoint(gcode, waveBondingRefrenceGcode);
										if(!waveBondingTackPoint.isEmpty())
							
											// Add tack point to output
											newCommands.push(Command(waveBondingTackPoint.getAscii() + '\n', WAVE, WAVE));
	
										// Set refrence G-code
										waveBondingRefrenceGcode = gcode;
									}
								}

								// Go through all of the wave
								for(uint32_t i = 1; i <= waveRatio; i++) {
					
									// Check if at last component
									double tempRelativeX, tempRelativeY, tempRelativeZ, tempRelativeE;
									if(i == waveRatio) {

										// Set temp relative values
										tempRelativeX = waveBondingPositionRelativeX;
										tempRelativeY = waveBondingPositionRelativeY;
										tempRelativeZ = waveBondingPositionRelativeZ;
										tempRelativeE = waveBondingPositionRelativeE;
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

										// Set extra G-code G value
										waveBondingExtraGcode.clear();
										waveBondingExtraGcode.setValue('G', gcode.getValue('G'));
	
										// Set extra G-code X value
										if(gcode.hasValue('X'))
											waveBondingExtraGcode.setValue('X', to_string(waveBondingPositionRelativeX - deltaX + tempRelativeX - relativeDifferenceX));
	
										// Set extra G-cdoe Y value
										if(gcode.hasValue('Y'))
											waveBondingExtraGcode.setValue('Y', to_string(waveBondingPositionRelativeY - deltaY + tempRelativeY - relativeDifferenceY));
	
										// Set extra G-code F value if first element
										if(gcode.hasValue('F') && i == 1)
											waveBondingExtraGcode.setValue('F', gcode.getValue('F'));
	
										// Check if plane changed
										if(waveBondingChangesPlane)
	
											// Set extra G-code Z value
											waveBondingExtraGcode.setValue('Z', to_string(waveBondingPositionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ + getCurrentAdjustmentZ()));
	
										// Otherwise check if command has a Z value and changes in Z are noticable
										else if(gcode.hasValue('Z') && deltaZ != DBL_EPSILON)
	
											// Set extra G-code Z value
											waveBondingExtraGcode.setValue('Z', to_string(waveBondingPositionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ));
		
										// Set extra G-code E value
										waveBondingExtraGcode.setValue('E', to_string(waveBondingPositionRelativeE - deltaE + tempRelativeE - relativeDifferenceE));
							
										// Add extra G-code to output
										newCommands.push(Command(waveBondingExtraGcode.getAscii() + '\n', WAVE, WAVE));
									}

									// Otherwise check if plane changed
									else if(waveBondingChangesPlane) {

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
							
							// Check if no corners have occured
							if(waveBondingCornerCounter < 1)
							
								// Set previous G-code
								waveBondingPreviousGcode = gcode;
						}

						// Otherwise check if command is G28
						else if(gcode.getValue('G') == "28") {

							// Set X and Y to home
							waveBondingPositionRelativeX = 54;
							waveBondingPositionRelativeY = 50;
						}

						// Otherwise check if command is G90
						else if(gcode.getValue('G') == "90")

							// Clear relative mode
							waveBondingRelativeMode = false;

						// Otherwise check if command is G91
						else if(gcode.getValue('G') == "91")

							// Set relative mode
							waveBondingRelativeMode = true;

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

								// Set relative positions
								if(gcode.hasValue('X'))
									waveBondingPositionRelativeX = stod(gcode.getValue('X'));

								if(gcode.hasValue('Y'))
									waveBondingPositionRelativeY = stod(gcode.getValue('Y'));

								if(gcode.hasValue('Z'))
									waveBondingPositionRelativeZ = stod(gcode.getValue('Z'));

								if(gcode.hasValue('E'))
									waveBondingPositionRelativeE = stod(gcode.getValue('E'));
							}
						}
					}
				}
									
			// Check if new commands exist
			if(newCommands.size()) {
			
				// Finish processing command later
				if(!gcode.isEmpty())
					commands.push_front(Command(gcode.getAscii() + '\n', command.origin, WAVE));
				else
					commands.push_front(Command(command.line, command.origin, WAVE));
	
				// Append new commands to commands
				while(newCommands.size()) {
					commands.push_front(newCommands.top());
					newCommands.pop();
				}
		
				// Get next command
				continue;
			}
		}

		// Check if not printing backlash calibration cylinder and printing test border or using thermal bonding pre-processor
		if(!printingBacklashCalibrationCylinder && (printingTestBorder || useThermalBondingPreprocessor) && command.skip < THERMAL) {

			// Initialize new commands
			stack<Command> newCommands;

			// Check if command contains valid G-code
			if(!gcode.isEmpty()) {
			
				// Check if at a new layer
				if(thermalBondingLayerCounter < 2 && command.origin != PREPARATION && gcode.hasValue('Z')) {
		
					// Check if on first counted layer
					if(thermalBondingLayerCounter == 0)
		
						// Add temperature to output
						newCommands.push(Command("M109 S" + to_string(getBoundedTemperature(filamentTemperature + (filamentType == PLA ? 10 : 15))) + '\n', THERMAL, THERMAL));
			
					// Otherwise
					else
		
						// Add temperature to output
						newCommands.push(Command("M104 S" + to_string(filamentTemperature) + '\n', THERMAL, THERMAL));
			
					// Increment layer counter
					thermalBondingLayerCounter++;
				}

				// Check if command contains temperature or fan controls outside of the intro and outro
				if(command.origin != PREPARATION && gcode.hasValue('M') && (gcode.getValue('M') == "104" || gcode.getValue('M') == "106" || gcode.getValue('M') == "107" || gcode.getValue('M') == "109" || gcode.getValue('M') == "140" || gcode.getValue('M') == "190"))

					// Get next line
					continue;

				// Otherwise check if on first counted layer
				else if(thermalBondingLayerCounter == 1) {

					// Check if printing test border or wave bonding isn't being used, and line is a G command
					if((printingTestBorder || !useWaveBondingPreprocessor) && gcode.hasValue('G')) {

						// Check if command is G0 or G1 and it's in absolute
						if((gcode.getValue('G') == "0" || gcode.getValue('G') == "1") && !thermalBondingRelativeMode) {

							// Check if previous command exists and filament is ABS, HIPS, or PLA
							if(!thermalBondingPreviousGcode.isEmpty() && (filamentType == ABS || filamentType == HIPS || filamentType == PLA)) {

								// Check if first sharp corner
								if(thermalBondingCornerCounter < 1 && isSharpCorner(gcode, thermalBondingPreviousGcode)) {
		
									// Check if refrence G-codes isn't set
									if(thermalBondingRefrenceGcode.isEmpty()) {
		
										// Check if a tack point was created
										thermalBondingTackPoint = createTackPoint(gcode, thermalBondingPreviousGcode);
										if(!thermalBondingTackPoint.isEmpty())
								
											// Add tack point to output
											newCommands.push(Command(thermalBondingTackPoint.getAscii() + '\n', THERMAL, THERMAL));
									}
									
									// Set refrence G-code
									thermalBondingRefrenceGcode = gcode;
		
									// Increment corner count
									thermalBondingCornerCounter++;
								}
	
								// Otherwise check if sharp corner
								else if(isSharpCorner(gcode, thermalBondingRefrenceGcode)) {
	
									// Check if a tack point was created
									thermalBondingTackPoint = createTackPoint(gcode, thermalBondingRefrenceGcode);
									if(!thermalBondingTackPoint.isEmpty())
							
										// Add tack point to output
										newCommands.push(Command(thermalBondingTackPoint.getAscii() + '\n', THERMAL, THERMAL));
								
									// Set refrence G-code
									thermalBondingRefrenceGcode = gcode;
								}
							}
							
							// Check if no corners have occured
							if(thermalBondingCornerCounter < 1)
							
								// Set previous G-code
								thermalBondingPreviousGcode = gcode;
						}

						// Otherwise check if command is G90
						else if(gcode.getValue('G') == "90")

							// Clear relative mode
							thermalBondingRelativeMode = false;

						// Otherwise check if command is G91
						else if(gcode.getValue('G') == "91")

							// Set relative mode
							thermalBondingRelativeMode = true;
					}
				}
			}
			
			// Check if new commands exist
			if(newCommands.size()) {
			
				// Finish processing command later
				if(!gcode.isEmpty())
					commands.push_front(Command(gcode.getAscii() + '\n', command.origin, THERMAL));
				else
					commands.push_front(Command(command.line, command.origin, THERMAL));
	
				// Append new commands to commands
				while(newCommands.size()) {
					commands.push_front(newCommands.top());
					newCommands.pop();
				}
		
				// Get next command
				continue;
			}
		}

		// Check if not printing backlash calibration cylinder and printing test border or using bed compensation pre-processor
		if(!printingBacklashCalibrationCylinder && (printingTestBorder|| useBedCompensationPreprocessor) && command.skip < BED) {
		
			// Initialize new commands
			stack<Command> newCommands;

			// Check if command contains valid G-code
			if(!gcode.isEmpty())
			
				// Check if command is a G command
				if(gcode.hasValue('G')) {
			
					// Check if command is G0 or G1 and it's in absolute mode
					if((gcode.getValue('G') == "0" || gcode.getValue('G') == "1") && !bedCompensationRelativeMode) {

						// Check if command has an X or Y value
						if(gcode.hasValue('X') || gcode.hasValue('Y'))

							// Set changes plane
							bedCompensationChangesPlane = true;

						// Check if command contains a Z value
						if(gcode.hasValue('Z'))

							// Add to command's Z value
							gcode.setValue('Z', to_string(stod(gcode.getValue('Z')) + bedHeightOffset));

						// Set delta values
						double deltaX = !gcode.hasValue('X') ? 0 : stod(gcode.getValue('X')) - bedCompensationPositionRelativeX;
						double deltaY = !gcode.hasValue('Y') ? 0 : stod(gcode.getValue('Y')) - bedCompensationPositionRelativeY;
						double deltaZ = !gcode.hasValue('Z') ? 0 : stod(gcode.getValue('Z')) - bedCompensationPositionRelativeZ;
						double deltaE = !gcode.hasValue('E') ? 0 : stod(gcode.getValue('E')) - bedCompensationPositionRelativeE;

						// Adjust position absolute and relative values for the changes
						bedCompensationPositionAbsoluteX += deltaX;
						bedCompensationPositionAbsoluteY += deltaY;
						bedCompensationPositionRelativeX += deltaX;
						bedCompensationPositionRelativeY += deltaY;
						bedCompensationPositionRelativeZ += deltaZ;
						bedCompensationPositionRelativeE += deltaE;

						// Calculate distance
						double distance = sqrt(deltaX * deltaX + deltaY * deltaY);

						// Set segment counter
						uint32_t segmentCounter = distance > SEGMENT_LENGTH ? stod(to_string(distance / SEGMENT_LENGTH)) : 1;

						// Set absolute and relative differences
						double absoluteDifferenceX = bedCompensationPositionAbsoluteX - deltaX;
						double absoluteDifferenceY = bedCompensationPositionAbsoluteY - deltaY;
						double relativeDifferenceX = bedCompensationPositionRelativeX - deltaX;
						double relativeDifferenceY = bedCompensationPositionRelativeY - deltaY;
						double relativeDifferenceZ = bedCompensationPositionRelativeZ - deltaZ;
						double relativeDifferenceE = bedCompensationPositionRelativeE - deltaE;

						// Set delta ratios
						double deltaRatioX, deltaRatioY, deltaRatioZ, deltaRatioE;
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
								double tempAbsoluteX, tempAbsoluteY, tempRelativeX, tempRelativeY, tempRelativeZ, tempRelativeE;
								if(i == segmentCounter) {

									// Set temp values
									tempAbsoluteX = bedCompensationPositionAbsoluteX;
									tempAbsoluteY = bedCompensationPositionAbsoluteY;
									tempRelativeX = bedCompensationPositionRelativeX;
									tempRelativeY = bedCompensationPositionRelativeY;
									tempRelativeZ = bedCompensationPositionRelativeZ;
									tempRelativeE = bedCompensationPositionRelativeE;
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
	
								// Get height adjustment
								double heightAdjustment = getHeightAdjustmentRequired(tempAbsoluteX, tempAbsoluteY);

								// Check if not at last segment
								if(i != segmentCounter) {

									// Set extra G-code
									bedCompensationExtraGcode.clear();
									bedCompensationExtraGcode.setValue('G', gcode.getValue('G'));

									// Check if command has an X value
									if(gcode.hasValue('X'))

										// Set extra G-code X value
										bedCompensationExtraGcode.setValue('X', to_string(bedCompensationPositionRelativeX - deltaX + tempRelativeX - relativeDifferenceX));
	
									// Check if command has a Y value
									if(gcode.hasValue('Y'))

										// Set extra G-code Y value
										bedCompensationExtraGcode.setValue('Y', to_string(bedCompensationPositionRelativeY - deltaY + tempRelativeY - relativeDifferenceY));

									// Check if command has F value and in first element
									if(gcode.hasValue('F') && i == 1)

										// Set extra G-code F value
										bedCompensationExtraGcode.setValue('F', gcode.getValue('F'));

									// Check if the plane changed
									if(bedCompensationChangesPlane)

										// Set extra G-code Z value
										bedCompensationExtraGcode.setValue('Z', to_string(bedCompensationPositionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ + heightAdjustment));

									// Otherwise check if command has a Z value and the change in Z in noticable
									else if(gcode.hasValue('Z') && deltaZ != DBL_EPSILON)

										// Set extra G-code Z value
										bedCompensationExtraGcode.setValue('Z', to_string(bedCompensationPositionRelativeZ - deltaZ + tempRelativeZ - relativeDifferenceZ));

									// Set extra G-gode E value
									bedCompensationExtraGcode.setValue('E', to_string(bedCompensationPositionRelativeE - deltaE + tempRelativeE - relativeDifferenceE));
						
									// Add extra G-code to output
									newCommands.push(Command(bedCompensationExtraGcode.getAscii() + '\n', BED, BED));
								}

								// Otherwise check if the plane changed
								else if(bedCompensationChangesPlane) {

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
					
						// Otherwise check if the plane changed
						else if(bedCompensationChangesPlane) {

							// Set height adjustment
							double heightAdjustment = getHeightAdjustmentRequired(bedCompensationPositionAbsoluteX, bedCompensationPositionAbsoluteY);

							// Check if command has a Z value
							if(gcode.hasValue('Z'))

								// Add value to command Z
								gcode.setValue('Z', to_string(stod(gcode.getValue('Z')) + heightAdjustment));

							// Otherwise
							else

								// Set command Z
								gcode.setValue('Z', to_string(bedCompensationPositionRelativeZ + heightAdjustment));
						}
					}

					// Otherwise check if command is G28
					else if(gcode.getValue('G') == "28") {

						// Set X and Y to home
						bedCompensationPositionRelativeX = bedCompensationPositionAbsoluteX = 54;
						bedCompensationPositionRelativeY = bedCompensationPositionAbsoluteY = 50;
					}

					// Otherwise check if command is G90
					else if(gcode.getValue('G') == "90")

						// Clear relative mode
						bedCompensationRelativeMode = false;

					// Otherwise check if command is G91
					else if(gcode.getValue('G') == "91")

						// Set relative mode
						bedCompensationRelativeMode = true;

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

							// Set relative positions
							if(gcode.hasValue('X'))
								bedCompensationPositionRelativeX = stod(gcode.getValue('X'));

							if(gcode.hasValue('Y'))
								bedCompensationPositionRelativeY = stod(gcode.getValue('Y'));

							if(gcode.hasValue('Z'))
								bedCompensationPositionRelativeZ = stod(gcode.getValue('Z'));

							if(gcode.hasValue('E'))
								bedCompensationPositionRelativeE = stod(gcode.getValue('E'));
						}
					}
				}
	
			// Check if new commands exist
			if(newCommands.size()) {
			
				// Finish processing command later
				if(!gcode.isEmpty())
					commands.push_front(Command(gcode.getAscii() + '\n', command.origin, BED));
				else
					commands.push_front(Command(command.line, command.origin, BED));
	
				// Append new commands to commands
				while(newCommands.size()) {
					commands.push_front(newCommands.top());
					newCommands.pop();
				}
		
				// Get next command
				continue;
			}
		}

		// Check if not printing backlash calibration cylinder and printing test border or using backlash compentation pre-processor
		if(!printingBacklashCalibrationCylinder && (printingTestBorder || useBacklashCompensationPreprocessor) && command.skip < BACKLASH) {

			// Initialize new commands
			stack<Command> newCommands;

			// Check if command contains valid G-code
			if(!gcode.isEmpty())
			
				// Check if command is a G command
				if(gcode.hasValue('G')) {

					// Check if command is G0 or G1 and it's in absolute mode
					if((gcode.getValue('G') == "0" || gcode.getValue('G') == "1") && !backlashCompensationRelativeMode) {

						// Check if command has an F value
						if(gcode.hasValue('F'))

							// Set value F
							valueF = gcode.getValue('F');

						// Set delta values
						double deltaX = !gcode.hasValue('X') ? 0 : stod(gcode.getValue('X')) - backlashPositionRelativeX;
						double deltaY = !gcode.hasValue('Y') ? 0 : stod(gcode.getValue('Y')) - backlashPositionRelativeY;
						double deltaZ = !gcode.hasValue('Z') ? 0 : stod(gcode.getValue('Z')) - backlashPositionRelativeZ;
						double deltaE = !gcode.hasValue('E') ? 0 : stod(gcode.getValue('E')) - backlashPositionRelativeE;

						// Set directions
						directions directionX = deltaX > DBL_EPSILON ? POSITIVE : deltaX < -DBL_EPSILON ? NEGATIVE : previousDirectionX;
						directions directionY = deltaY > DBL_EPSILON ? POSITIVE : deltaY < -DBL_EPSILON ? NEGATIVE : previousDirectionY;
					
						// Check if direction has changed
						if((directionX != previousDirectionX && previousDirectionX != NEITHER) || (directionY != previousDirectionY && previousDirectionY != NEITHER)) {

							// Set extra G-code G value
							backlashCompensationExtraGcode.clear();
							backlashCompensationExtraGcode.setValue('G', gcode.getValue('G'));

							// Check if X direction has changed
							if(directionX != previousDirectionX && previousDirectionX != NEITHER)

								// Set X compensation
								compensationX += backlashX * (directionX == POSITIVE ? 1 : -1);
	
							// Check if Y direction has changed
							if(directionY != previousDirectionY && previousDirectionY != NEITHER)

								// Set Y compensation
								compensationY += backlashY * (directionY == POSITIVE ? 1 : -1);
	
							// Set extra G-code X and Y values
							backlashCompensationExtraGcode.setValue('X', to_string(backlashPositionRelativeX + compensationX));
							backlashCompensationExtraGcode.setValue('Y', to_string(backlashPositionRelativeY + compensationY));
	
							// Set extra G-code F value
							backlashCompensationExtraGcode.setValue('F', to_string(backlashSpeed));
				
							// Add extra G-code to output
							newCommands.push(Command(backlashCompensationExtraGcode.getAscii() + '\n', BACKLASH, BACKLASH));
				
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
						backlashPositionRelativeX += deltaX;
						backlashPositionRelativeY += deltaY;
						backlashPositionRelativeZ += deltaZ;
						backlashPositionRelativeE += deltaE;

						// Store directions
						previousDirectionX = directionX;
						previousDirectionY = directionY;
					}

					// Otherwise check if command is G28
					else if(gcode.getValue('G') == "28") {

						// Set relative values
						backlashPositionRelativeX = 54;
						backlashPositionRelativeY = 50;

						// Reset values
						valueF = "1000";
						previousDirectionX = previousDirectionY = NEITHER;
						compensationX = compensationY = 0;
					}

					// Otherwise check if command is G90
					else if(gcode.getValue('G') == "90")

						// Clear relative mode
						backlashCompensationRelativeMode = false;

					// Otherwise check if command is G91
					else if(gcode.getValue('G') == "91")

						// Set relative mode
						backlashCompensationRelativeMode = true;

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

							// Set relative positions
							if(gcode.hasValue('X'))
								backlashPositionRelativeX = stod(gcode.getValue('X'));
	
							if(gcode.hasValue('Y'))
								backlashPositionRelativeY = stod(gcode.getValue('Y'));
	
							if(gcode.hasValue('Z'))
								backlashPositionRelativeZ = stod(gcode.getValue('Z'));

							if(gcode.hasValue('E'))
								backlashPositionRelativeE = stod(gcode.getValue('E'));
						}
					}
				}
	
			// Check if new commands exist
			if(newCommands.size()) {
			
				// Finish processing command later
				if(!gcode.isEmpty())
					commands.push_front(Command(gcode.getAscii() + '\n', command.origin, BACKLASH));
				else
					commands.push_front(Command(command.line, command.origin, BACKLASH));
	
				// Append new commands to commands
				while(newCommands.size()) {
					commands.push_front(newCommands.top());
					newCommands.pop();
				}
		
				// Get next command
				continue;
			}
		}

		// Check if not printing backlash calibration cylinder and printing test border or using feed rate conversion pre-processor
		if(!printingBacklashCalibrationCylinder && (printingTestBorder || useFeedRateConversionPreprocessor) && command.skip < FEED) {

			// Check if command contains valid G-code and it's a G command with an F value
			if(!gcode.isEmpty() && gcode.hasValue('G') && gcode.hasValue('F')) {

				// Get command's feedrate
				double commandFeedRate = stod(gcode.getValue('F')) / 60;

				// Force feed rate to adhere to limitations
				if(commandFeedRate > MAX_FEED_RATE)
					commandFeedRate = MAX_FEED_RATE;

				// Set new feed rate for the command
				gcode.setValue('F', to_string(30 + (1 - commandFeedRate / MAX_FEED_RATE) * 800));
			}
		}

		// Check if command contains valid G-code
		if(!gcode.isEmpty()) {

			// Check if outputting to a file
			if(output != NULL)
			
				// Send ascii representation of the command to output
				outputFile << gcode.getAscii() << '\n';
			
			// Otherwise
			else
			
				// Append ascii representation of the command to list
				returnValue += gcode.getAscii() + " *\n,";
		}
	}
	
	// Remove last comma from value
	if(!returnValue.empty())
		returnValue.pop_back();
	
	// Return list of commands
	return returnValue.c_str();
}
