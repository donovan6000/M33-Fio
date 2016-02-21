# Imports
import sys
import os
import math

# Display intro
print "\nCura Engine parameters to Cura profile converter"
print "Usage: python ./EngineToProfile.py input.cfg output.ini\n"
print "M3D's Windows software generates new Cura Engine parameters whenever it prints a model, and it stores them in C:\\Users\\%Username%\\AppData\\Local\\M3D\\M3DSoftware\\Working\\default.cfg"
print "I haven't been able to run M3D's OS X software, so I don't know where it stores its Cura Engine parameters\n"

# Check if no input file is specified
if len(sys.argv) < 2 :

	# Display message
	print "No input file specified\n"
	exit()

# Check if input file doesn't exists
if not os.path.isfile(sys.argv[1]) :

	# Display message
	print "Input file not found\n"
	exit()

# Check if no output file is specified
if len(sys.argv) < 3 :

	# Display message
	print "No output file specified\n"
	exit()

# Display message
print "Converting '" + sys.argv[1] + "' into '" + sys.argv[2] + '\''
print "Some parameters will be skipped since they are redundant, useless, and/or not acknowledged by OctoPrint's Cura Engine plugin\n"

# Create output
output = open(sys.argv[2], "wb")
output.write("[profile]\n")

# Go through input file
inGcode = False
for line in open(sys.argv[1], "rb") :

	# Check if in Gcode
	if inGcode :
	
		# Check if last line in Gcode
		if line[0 : 3] == "\"\"\"" :
		
			# Clear in Gcode
			inGcode = False
	
	# Otherwise
	else :
	
		# Check if comment
		if '=' not in line :
		
			# Get next line
			continue
	
		# Get key
		key = line[0 : line.index('=')].strip()
		
		# Check if Gcode
		if key.endswith("Code") :
		
			# Set in Gcode
			inGcode = True
			
			# Get next line
			continue
		
		# Get value
		value = line[line.index('=') + 1 :].strip()
		
		# Obtain Cura settings from Cura Engine parameters
		if key == "layerThickness" :
			layerThickness = int(value)
			output.write("layer_height = " + str(float(value) / 1000) + '\n')
		
		elif key == "initialLayerThickness" :
			initialLayerThickness = int(value)
			output.write("bottom_thickness = " + str(float(value) / 1000) + '\n')
		
		elif key == "filamentDiameter" :
			output.write("filament_diameter = " + str(float(value) / 1000) + '\n')
		
		elif key == "filamentFlow" :
			output.write("filament_flow = " + str(int(value)) + '\n')
		
		elif key == "skirtDistance" :
			output.write("skirt_gap = " + str(float(value) / 1000) + '\n')
		
		elif key == "skirtLineCount" :
		
			if int(value) != 0 :
				output.write("platform_adhesion = Brim\n")
			
			output.write("skirt_line_count = " + str(int(value)) + '\n')
		
		elif key == "skirtMinLength" :
			output.write("skirt_minimal_length = " + str(float(value) / 1000) + '\n')
		
		elif key == "initialLayerSpeed" :
			output.write("bottom_layer_speed = " + str(int(value)) + '\n')
		
		elif key == "printSpeed" :
			printSpeed = int(value)
			output.write("print_speed = " + str(int(value)) + '\n')
		
		elif key == "moveSpeed" :
			output.write("travel_speed = " + str(int(value)) + '\n')
		
		elif key == "infillOverlap" :
			output.write("fill_overlap = " + str(int(value)) + '\n')
		
		elif key == "supportType" :
		
			if int(value) == 0 :
				output.write("support_type = Grid\n")
			else :
				output.write("support_type = Lines\n")
		
		elif key == "supportXYDistance" :
			output.write("support_xy_distance = " + str(float(value) / 1000) + '\n')
		
		elif key == "supportZDistance" :
			output.write("support_z_distance = " + str(float(value) / 1000) + '\n')
		
		elif key == "retractionSpeed" :
			output.write("retraction_speed = " + str(int(value)) + '\n')
		
		elif key == "retractionAmountExtruderSwitch" :
			output.write("retraction_dual_amount = " + str(float(value) / 1000) + '\n')
			
		elif key == "retractionMinimalDistance" :
			output.write("retraction_min_travel = " + str(float(value) / 1000) + '\n')
		
		elif key == "minimalExtrusionBeforeRetraction" :
			output.write("retraction_minimal_extrusion = " + str(float(value) / 1000) + '\n')
		
		elif key == "retractionZHop" :
			output.write("retraction_hop = " + str(float(value) / 1000) + '\n')
		
		elif key == "multiVolumeOverlap" :
			output.write("overlap_dual = " + str(float(value) / 1000) + '\n')
		
		elif key == "objectSink" :
			output.write("object_sink = " + str(int(value)) + '\n')
		
		elif key == "raftMargin" :
			output.write("raft_margin = " + str(float(value) / 1000) + '\n')
		
		elif key == "raftFanSpeed" :
			output.write("platform_adhesion = Raft\n")
		
		elif key == "raftLineSpacing" :
			output.write("raft_line_spacing = " + str(float(value) / 1000) + '\n')
		
		elif key == "raftBaseThickness" :
			output.write("raft_base_thickness = " + str(float(value) / 1000) + '\n')
		
		elif key == "raftBaseLinewidth" :
			output.write("raft_base_linewidth = " + str(float(value) / 1000) + '\n')
		
		elif key == "raftInterfaceThickness" :
			output.write("raft_interface_thickness = " + str(float(value) / 1000) + '\n')
		
		elif key == "raftInterfaceLinewidth" :
			output.write("raft_interface_linewidth = " + str(float(value) / 1000) + '\n')
			
		elif key == "raftInterfaceLineSpacing" :
			output.write("raft_interface_linewidth = " + str(float(value) / 2000) + '\n')
		
		elif key == "raftAirGapLayer0" :
			output.write("raft_airgap = " + str(float(value) / 1000) + '\n')
		
		elif key == "raftSurfaceLayers" :
			output.write("raft_surface_layers = " + str(int(value)) + '\n')
		
		elif key == "minimalLayerTime" :
			output.write("cool_min_layer_time = " + str(int(value)) + '\n')
		
		elif key == "minimalFeedrate" :
			output.write("cool_min_feedrate = " + str(int(value)) + '\n')
		
		elif key == "extrusionWidth" :
			extrusionWidth = int(value)
			edgeWidth = float(value) / 1000
		
		elif key == "insetCount" :
			lineCount = int(value)
		
		elif key == "layer0extrusionWidth" :
			layer0extrusionWidth = int(value)
		
		elif (key == "downSkinCount" or key == "upSkinCount") and int(value) != 0 :
		
			solidLayerCount = int(value)
			
			if key == "downSkinCount" :
				output.write("solid_bottom = True\n")
			else :
				output.write("solid_top = True\n")
		
		elif key == "inset0Speed" :
			inset0Speed = int(value)
		
		elif key == "insetXSpeed" :
			insetXSpeed = int(value)
		
		elif key == "sparseInfillLineDistance" :
			sparseInfillLineDistance = int(value)
		
		elif key == "infillSpeed" :
			infillSpeed = int(value)
		
		elif key == "supportAngle" :
		
			supportAngle = int(value)
			
			if int(value) != -1 :
				output.write("support_angle = " + str(int(value)) + '\n')
		elif key == "supportEverywhere" :
			supportEverywhere = int(value)
		
		elif key == "supportLineDistance" :
		
			if int(value) != -1 :
				output.write("support_fill_rate = " + str(100 * edgeWidth * 1000 / int(value)) + '\n')
		
		elif key == "supportExtruder" :
		
			if int(value) == 0 :
				output.write("support_dual_extrusion = First extruder\n")
			elif int(value) == 1 :
				output.write("support_dual_extrusion = Second extruder\n")
			else :
				output.write("support_dual_extrusion = Both\n")
		
		elif key == "retractionAmount" :
		
			if int(value) == 0 :
				output.write("retraction_enable = False\n")
			else :
			
				output.write("retraction_enable = True\n")
				output.write("retraction_amount = " + str(float(value) / 1000) + '\n')
		
		elif key == "enableCombing" :
		
			if int(value) == 0 :
				output.write("retraction_combing = False\n")
			else :
				output.write("retraction_combing = True\n")
		
		elif key == "enableOozeShield" :
		
			if int(value) == 0 :
				output.write("ooze_shield = False\n")
			else :
				output.write("ooze_shield = True\n")
		
		elif key == "wipeTowerSize" :
			wipeTowerSize = int(value)
		
		elif key == "coolHeadLift" :
		
			if int(value) == 0 :
				output.write("cool_head_lift = False\n")
			else :
				output.write("cool_head_lift = True\n")
		
		elif key == "fanFullOnLayerNr" :
			fanFullOnLayerNr = int(value)
		
		elif key == "simpleMode" :
		
			if int(value) == 0 :
				output.write("follow_surface = False\n")
			else :
				output.write("follow_surface = True\n")
		
		elif key == "spiralizeMode" :
		
			if int(value) == 0 :
				output.write("spiralize = False\n")
			else :
				output.write("spiralize = True\n")
		
		elif key == "fixHorrible" :
		
			if int(value) & 0x01 :
				output.write("fix_horrible_union_all_type_a = True\n")
			else :
				output.write("fix_horrible_union_all_type_a = False\n")
			
			if int(value) & 0x02 :
				output.write("fix_horrible_union_all_type_b = True\n")
			else :
				output.write("fix_horrible_union_all_type_b = False\n")
			
			if int(value) & 0x04 :
				output.write("fix_horrible_extensive_stitching = True\n")
			else :
				output.write("fix_horrible_extensive_stitching = False\n")
			
			if int(value) & 0x10 :
				output.write("fix_horrible_use_open_bits = True\n")
			else :
				output.write("fix_horrible_use_open_bits = False\n")
		
		elif key == "fanSpeedMin" :
			fanSpeedMin = int(value)
			output.write("fan_speed = " + str(int(value)) + '\n')
		
		elif key == "fanSpeedMax" :
			fanSpeedMax = int(value)
			output.write("fan_speed_max = " + str(int(value)) + '\n')
		
		else :
			print "skipping " + str(key)
	
# Obtain Cura settings from a combination of Cura Engine parameters
if fanSpeedMin != 0 or fanSpeedMax != 0 :
	output.write("fan_enabled = True\n")
else :
	output.write("fan_enabled = False\n")

output.write("fan_full_height = " + str(((fanFullOnLayerNr - 1) * layerThickness + initialLayerThickness + 1) / 1000.0) + '\n')

output.write("wipe_tower_volume = " + str(math.pow(wipeTowerSize, 2) * layerThickness / 1000 * 1000 * 1000) + '\n')

if supportEverywhere != 0 :
	output.write("support = Everywhere\n")
elif supportAngle != -1 :
	output.write("support = Touching buildplate\n")
else :
	output.write("support = None\n")

if infillSpeed != printSpeed :
	output.write("infill_speed = " + str(infillSpeed) + '\n')

if sparseInfillLineDistance == -1 :
	output.write("fill_density = 0\n")
elif sparseInfillLineDistance == extrusionWidth :
	output.write("fill_density = 100\n")
else :
	output.write("fill_density = " + str(100 * edgeWidth * 1000 / sparseInfillLineDistance) + '\n')

if inset0Speed != printSpeed :
	output.write("outer_shell_speed = " + str(inset0Speed) + '\n')

if insetXSpeed != printSpeed :
	output.write("inner_shell_speed = " + str(insetXSpeed) + '\n')

output.write("first_layer_width_factor = " + str(layer0extrusionWidth * 100 / (edgeWidth * 1000)) + '\n')
output.write("wall_thickness = " + str(extrusionWidth * lineCount / 1000.0) + '\n')
output.write("solid_layer_thickness = " + str(math.floor(solidLayerCount * (layerThickness - 0.0001)) / 1000) + '\n')

# Set default alterations
output.write("\n[alterations]\n")
output.write("start.gcode = ; Sliced at: {day} {date} {time}\n")
output.write("\t; Basic settings: Layer height: {layer_height} Walls: {wall_thickness} Fill: {fill_density}\n")
output.write("start.gcode2 = \n")
output.write("start.gcode3 = \n")
output.write("start.gcode4 = \n")
output.write("end.gcode = \n")
output.write("end.gcode2 = \n")
output.write("end.gcode3 = \n")
output.write("end.gcode4 = \n")
output.write("support_start.gcode = \n")
output.write("support_end.gcode = \n")
output.write("cool_start.gcode = \n")
output.write("cool_end.gcode = \n")
output.write("replace.csv = \n")
output.write("preswitchextruder.gcode = \n")
output.write("postswitchextruder.gcode = \n")

print "\nConversion finished\n"
