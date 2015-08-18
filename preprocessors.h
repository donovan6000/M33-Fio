// Header gaurd
#ifndef PREPROCESSORS_H
#define PREPROCESSORS_H


// C export
#ifdef __cplusplus
	extern "C" {
#endif


// Shared library localization
#ifdef _WIN32
	#define EXPORT __declspec(dllexport)
#else
	#define EXPORT __attribute__((visibility("default")))
#endif


// Exported functions

/*
Name: Set values
Purpose: Sets values to use in the pre-processors
*/
EXPORT void setValues(double backlashXSetting, double backlashYSetting, double backlashSpeedSetting, double bedHeightOffsetSetting, double backRightOffsetSetting, double backLeftOffsetSetting, double frontLeftOffsetSetting, double frontRightOffsetSetting, unsigned short filamentTemperatureSetting, const char *filamentTypeSetting, bool useValidationPreprocessorSetting, bool usePreparationPreprocessorSetting, bool useWaveBondingPreprocessorSetting, bool useThermalBondingPreprocessorSetting, bool useBedCompensationPreprocessorSetting, bool useBacklashCompensationPreprocessorSetting, bool useFeedRateConversionPreprocessorSetting, bool useCenterModelPreprocessorSetting);

/*
Name: Get print information
Purpose: Calculates the minimum and maximum dimensions of the file and returns if the file can successfully be printed
*/
EXPORT bool getPrintInformation(const char *file, bool overrideCenterModelPreprocessor = false);

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
