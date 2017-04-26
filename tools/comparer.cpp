// Header files
#include <algorithm>
#include <fstream>
#include <iostream>
#include <unordered_map>
#include <unordered_set>

using namespace std;


// Function prototypes

// Trim
string trim(const string &text) noexcept;


// Main function
int main(int argc, char *argv[]) noexcept {

	// Check if parameters are missing
	if(argc < 3) {
	
		// Display usage
		cout << "Missing parameters. Usage: comparer \"base profile\" \"converted and processed profile\"" << endl;
	
		// Exit failure
		return EXIT_FAILURE;
	}

	// Initialize settings
	unordered_map<string, string> settings;
	
	// Check if opening base profile failed
	ifstream input(argv[1], ifstream::binary);
	if(!input) {
	
		// Display usage
		cout << "Base profile not found" << endl;
	
		// Exit failure
		return EXIT_FAILURE;
	}
	
	// Go through all lines in base profile
	while(input.peek() != ifstream::traits_type::eof()) {
	
		// Get line
		string line;
		getline(input, line);
		line = trim(line);
		
		// Check if line isn't empty or a comment
		if(!line.empty() && line.front() != '#') {
		
			// Extract name and value from line
			string name = trim(line.substr(0, line.find('=')));
			string value = trim(line.substr(line.find('=') + 1));
			
			// Check if value is multiline G-code
			if(value == "\"\"\"")
			
				// Get the rest of the value
				while(line != "\"\"\"") {
					getline(input, line);
					line = trim(line);
					value += line;
				}
			
			// Remove trailing zeros from decimal values
			string::size_type index = value.find_last_of('.');
			if(index != string::npos)
				if(stoi(value.substr(index)) == 0)
					value = value.substr(0, index);
			
			// Convert boolean values
			if(name == "coolHeadLift" || name == "supportEverywhere")
				value = to_string(stoi(value) ? 1 : 0);
			
			// set useless settings
			unordered_set<string> uselessSettings {
				"extruderOffset[1].X",
				"extruderOffset[2].X",
				"extruderOffset[3].X",
				"extruderOffset[1].Y",
				"extruderOffset[2].Y",
				"extruderOffset[3].Y",
				"simpleMode",
				"skirtMinLength",
				"wipeTowerSize",
				"infillPattern",
				"retractionAmountPrime",
				"spiralizeMode",
				"enableOozeShield",
				"autoCenter"
			};
			
			// Add setting to list if it's not useless
			if(uselessSettings.find(name) == uselessSettings.end())
				settings[name] = value;
		}
	}
	
	// Check if opening converted profile that's been processed by OctoPrint's Cura Engine plugin failed
	input.close();
	input.open(argv[2], ifstream::binary);
	if(!input) {
	
		// Display usage
		cout << "Converted and processed profile not found" << endl;
	
		// Exit failure
		return EXIT_FAILURE;
	}
	
	// Go through all lines in converted profile
	while(input.peek() != ifstream::traits_type::eof()) {
	
		// Get line
		string line;
		getline(input, line);
		line = trim(line);
		
		// Check if line isn't empty or a comment
		if(!line.empty() && line.front() != '#') {
		
			// Extract name and value from line
			string name = trim(line.substr(0, line.find('=')));
			string value = trim(line.substr(line.find('=') + 1));
			
			// Remove trailing zeros from decimal values
			string::size_type index = value.find_last_of('.');
			if(index != string::npos && value.front() != ';')
				if(stoi(value.substr(index + 1)) == 0)
					value = value.substr(0, index);
			
			// Check if setting is added by OctoPrint and doesn't affect the resulting G-code
			if(name == "perimeterBeforeInfill" || name == "raftFanSpeed" || name == "skinSpeed" || name == "skirtDistance") {
				
				// Remove setting from list
				if(settings.count(name))
					settings.erase(name);
				
				// Get next line
				continue;
			}
			
			// Set useless settings
			unordered_set<string> uselessSettings {
				"posx",
				"posy",
				"endCode",
				"startCode",
				"preSwitchExtruderCode",
				"postSwitchExtruderCode"
			};
			
			// Check if settings isn't useless
			if(uselessSettings.find(name) == uselessSettings.end()) {
		
				// Check if setting is new
				if(!settings.count(name))
				
					// Display new setting
					cout << "New: " << name << ' ' << value << endl;
				
				// Otherise check if setting isn't correct
				else if(settings[name] != value) {
				
					// Initialize wrong
					bool wrong = true;
					
					// Check if setting is down skin count and it's greater than expected value
					if(name == "downSkinCount" && stoi(value) > stoi(settings[name]))
					
						// Clear wrong
						wrong = false;
					
					// Otherwise check if setting is initial layer speed and it's less than expected value
					else if(name == "initialLayerSpeed" && stoi(value) < stoi(settings[name]))
					
						// Clear wrong
						wrong = false;
					
					// Otherwise check if setting is raft surface speed and it's less than expected value
					else if(name == "raftSurfaceSpeed" && stoi(value) < stoi(settings[name]))
					
						// Clear wrong
						wrong = false;
					
					// Check if setting is wrong
					if(wrong)
					
						// display wrong setting
						cout << "Wrong: " << name << ' ' << settings[name] << ' ' << value << endl;
				}
			}
			
			// Remove setting from list
			if(settings.count(name))
				settings.erase(name);
		}
	}
	
	// Display missing settings
	for(const decltype(settings)::value_type &setting : settings)
		cout << "Missing: " << setting.first << ' ' << setting.second << endl;
	
	// Return successfully
	return EXIT_SUCCESS;
}


// Supporting function implementation
string trim(const string &text) noexcept {
	
	// Get start and end of text without white space
	string::const_iterator begin = find_if_not(text.begin(), text.end(), [](char character) noexcept { 
		return isspace(character);
	});
	
	string::const_iterator end = find_if_not(text.rbegin(), text.rend(), [](char character) noexcept { 
		return isspace(character);
	}).base();
	
	// Check if text only contains whitespace
	if(end <= begin)
	
		// Return an empty string
		return "";
	
	// Return text without leading and trailing white space
	return string(begin, end);
}
