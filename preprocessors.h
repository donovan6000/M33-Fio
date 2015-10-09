// Header gaurd
#ifndef PREPROCESSORS_H
#define PREPROCESSORS_H


// Header files
#include "gcode.h"
#include "vector.h"


// Shared library localization
#ifdef _WIN32
	#define EXPORT __declspec(dllexport)
#else
	#define EXPORT __attribute__((visibility("default")))
#endif


// C export
extern "C" {


// Private function prototypes
/*
Name: Max
Purpose: Returns the larger of two numbers
*/
double max(double first, double second);

/*
Name: Get bounded temperature
Purpose: Gets temperature bounded within a range
*/
uint16_t getBoundedTemperature(uint16_t temperature);

/*
Name: Get distance
Purpose: Returns the distance between two points
*/
double getDistance(const Gcode &firstPoint, const Gcode &secondPoint);

/*
Name: Create tack point
Purpose: Creates a delay G-code command if necessary
*/
Gcode createTackPoint(const Gcode &point, const Gcode &refrence);

/*
Name: Is sharp corner
Purpose: Returns if two points make a sharp corner
*/
bool isSharpCorner(const Gcode &point, const Gcode &refrence);

/*
Name: Get current adjustment Z
Purpose: Returns the current Z adjustment for wave bonding
*/
double getCurrentAdjustmentZ();

/*
Name: Calculate plane normal vector
Purpose: Calculates the plane normal vector formed between three vectors
*/
Vector calculatePlaneNormalVector(const Vector &v1, const Vector &v2, const Vector &v3);

/*
Name: Generate plane equation
Purpose: Generates the equation for the plane formed between three vectors
*/
Vector generatePlaneEquation(const Vector &v1, const Vector &v2, const Vector &v3);

/*
Name: Get height adjustment required
Purpose: Gets the required height adjustment for bed compensation
*/
double getHeightAdjustmentRequired(double x, double y);

/*
Name: Get Z from XY plane
Purpose: Return the Z value of the plane formed between two vectors
*/
double getZFromXYAndPlane(const Vector &point, const Vector &planeABC);

/*
Name: Is point in triangle
Purpose: Returns if the point is inside the triangle formed by three vectors
*/
bool isPointInTriangle(const Vector &pt, const Vector &v1, const Vector &v2, const Vector &v3);

/*
Name: Sign
Purpose: Returns the sign formed by three vectors
*/
double sign(const Vector &p1, const Vector &p2, const Vector &p3);


// Exported function prototypes

/*
Name: Set values
Purpose: Sets values to use in the pre-processors
*/
EXPORT void setBacklashX(double value);
EXPORT void setBacklashY(double value);
EXPORT void setBacklashSpeed(double value);
EXPORT void setBackRightOrientation(double value);
EXPORT void setBackLeftOrientation(double value);
EXPORT void setFrontLeftOrientation(double value);
EXPORT void setFrontRightOrientation(double value);
EXPORT void setBedHeightOffset(double value);
EXPORT void setBackRightOffset(double value);
EXPORT void setBackLeftOffset(double value);
EXPORT void setFrontLeftOffset(double value);
EXPORT void setFrontRightOffset(double value);
EXPORT void setFilamentTemperature(unsigned short value);
EXPORT void setFilamentType(const char *value);
EXPORT void setUseValidationPreprocessor(bool value);
EXPORT void setUsePreparationPreprocessor(bool value);
EXPORT void setUseWaveBondingPreprocessor(bool value);
EXPORT void setUseThermalBondingPreprocessor(bool value);
EXPORT void setUseBedCompensationPreprocessor(bool value);
EXPORT void setUseBacklashCompensationPreprocessor(bool value);
EXPORT void setUseFeedRateConversionPreprocessor(bool value);
EXPORT void setUseCenterModelPreprocessor(bool value);
EXPORT void setIgnorePrintDimensionLimitations(bool value);
EXPORT void setIgnorePrintDimensionLimitations(bool value);
EXPORT void setUsingMicroPass(bool value);

/*
EXPORT void setBacklashX(double value);
Name: Check print dimensions
Purpose: Calculates the minimum and maximum dimensions of the file and returns if the file can successfully be printed
*/
EXPORT bool checkPrintDimensions(const char *file, bool overrideCenterModelPreprocessor = false);

/*
Name: Center model pre-processor
Purpose: Centers the file to print in the middle of the bed
*/
EXPORT bool centerModelPreprocessor(const char *file);

/*
Name: Validation pre-processor
Purpose: Removed invalid commands from the file
*/
EXPORT bool validationPreprocessor(const char *file);

/*
Name: Preparation pre-processor
Purpose: Adds in intro and outro to the file
*/
EXPORT bool preparationPreprocessor(const char *file, bool overrideCornerExcess = false);

/*
Name: Wave bonding pre-processor
Purpose: Smooths out bottom layer
*/
EXPORT bool waveBondingPreprocessor(const char *file);

/*
Name: Thermal bonding pre-processor
Purpose: Removes all temperature related commands and causes first few layers to use a higher temperature
*/
EXPORT bool thermalBondingPreprocessor(const char *file, bool overrideWaveBondingPreprocessor = false);

/*
Name: Bed compensation pre-processor
Purpose: Compensated the file for differences in height of the bed corners
*/
EXPORT bool bedCompensationPreprocessor(const char *file);

/*
Name: Backlash compensation pre-processor
Purpose: Compensated the file for the backlash that occurs when changing directions
*/
EXPORT bool backlashCompensationPreprocessor(const char *file);

/*
Name: Feed rate conversion pre-processor
Purpose: Converts the feed rate values in the file to work with the printer
*/
EXPORT bool feedRateConversionPreprocessor(const char *file);


}


#endif
