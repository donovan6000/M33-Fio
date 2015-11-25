// On start
$(function() {

	// Create view model
	function M3DFioViewModel(parameters) {
		
		// Initialize variables
		var printerConnected = false;
		var eepromDisplayType = "hexadecimal";
		var currentZ;
		var self = this;
		
		// Get state views
		self.printerState = parameters[0];
		self.temperature = parameters[1];
		
		// Set EEPROM offsets
		var eepromOffsets = [
			{
				name: "Backlash Expansion E",
				offset: 0x42,
				bytes: 4,
				color: "rgb(255, 200, 200)"
			},
			{
				name: "Backlash Expansion X Plus",
				offset: 0x2E,
				bytes: 4,
				color: "rgb(200, 255, 200)"
			},
			{
				name: "Backlash Expansion YL Plus",
				offset: 0x32,
				bytes: 4,
				color: "rgb(200, 200, 255)"
			},
			{
				name: "Backlash Expansion YR Minus",
				offset: 0x3A,
				bytes: 4,
				color: "rgb(255, 255, 200)"
			},
			{
				name: "Backlash Expansion YR Plus",
				offset: 0x36,
				bytes: 4,
				color: "rgb(255, 200, 255)"
			},
			{
				name: "Backlash Expansion Z",
				offset: 0x3E,
				bytes: 4,
				color: "rgb(200, 255, 255)"
			},
			{
				name: "Backlash Speed",
				offset: 0x5E,
				bytes: 4,
				color: "rgb(200, 200, 200)"
			},
			{
				name: "Backlash X",
				offset: 0x0C,
				bytes: 4,
				color: "rgb(200, 150, 150)"
			},
			{
				name: "Backlash Y",
				offset: 0x10,
				bytes: 4,
				color: "rgb(150, 200, 150)"
			},
			{
				name: "Bed Orientation Back Left",
				offset: 0x18,
				bytes: 4,
				color: "rgb(150, 150, 200)"
			},
			{
				name: "Bed Orientation Back Right",
				offset: 0x14,
				bytes: 4,
				color: "rgb(200, 200, 150)"
			},
			{
				name: "Bed Orientation Front Left",
				offset: 0x1C,
				bytes: 4,
				color: "rgb(200, 150, 200)"
			},
			{
				name: "Bed Orientation Front Right",
				offset: 0x20,
				bytes: 4,
				color: "rgb(150, 200, 200)"
			},
			{
				name: "G32 Version",
				offset: 0x62,
				bytes: 1,
				color: "rgb(230, 180, 180)"
			},
			{
				name: "E Axis Steps Per MM",
				offset: 0x2E2,
				bytes: 4,
				color: "rgb(180, 230, 180)"
			},
			{
				name: "Extruder Current",
				offset: 0x2E8,
				bytes: 2,
				color: "rgb(180, 180, 230)"
			},
			{
				name: "Fan Offset",
				offset: 0x2AC,
				bytes: 1,
				color: "rgb(230, 230, 180)"
			},
			{
				name: "Fan Scale",
				offset: 0x2AD,
				bytes: 4,
				color: "rgb(230, 180, 230)"
			},
			{
				name: "Fan Type",
				offset: 0x2AB,
				bytes: 1,
				color: "rgb(180, 230, 230)"
			},
			{
				name: "Filament Amount",
				offset: 0x2A,
				bytes: 4,
				color: "rgb(245, 160, 160)"
			},
			{
				name: "Filament Temperature",
				offset: 0x29,
				bytes: 1,
				color: "rgb(160, 245, 160)"
			},
			{
				name: "Filament Location And Type",
				offset: 0x28,
				bytes: 1,
				color: "rgb(160, 160, 245)"
			},
			{
				name: "Firmware CRC",
				offset: 0x04,
				bytes: 4,
				color: "rgb(245, 245, 160)"
			},
			{
				name: "Firmware Version",
				offset: 0x00,
				bytes: 4,
				color: "rgb(245, 160, 245)"
			},
			{
				name: "Hardware Status",
				offset: 0x2B8,
				bytes: 4,
				color: "rgb(160, 245, 245)"
			},
			{
				name: "Heater Calibration Mode",
				offset: 0x2B1,
				bytes: 1,
				color: "rgb(230, 210, 210)"
			},
			{
				name: "Heater Resistance M",
				offset: 0x2EA,
				bytes: 4,
				color: "rgb(210, 230, 210)"
			},
			{
				name: "Heater Temperature Measurement B",
				offset: 0x2BA,
				bytes: 6,
				color: "rgb(210, 210, 230)"
			},
			{
				name: "Hours Counter",
				offset: 0x2C0,
				bytes: 4,
				color: "rgb(230, 230, 110)"
			},
			{
				name: "Last Recorded Z Value",
				offset: 0x08,
				bytes: 4,
				color: "rgb(230, 210, 230)"
			},
			{
				name: "Saved Z State",
				offset: 0x2E6,
				bytes: 1,
				color: "rgb(210, 230, 230)"
			},
			{
				name: "Serial Number",
				offset: 0x2EF,
				bytes: 17,
				color: "rgb(230, 210, 250)"
			},
			{
				name: "Spooler Record ID",
				offset: 0x24,
				bytes: 4,
				color: "rgb(250, 210, 230)"
			},
			{
				name: "X Axis Steps Per MM",
				offset: 0x2D6,
				bytes: 4,
				color: "rgb(220, 170, 170)"
			},
			{
				name: "X Motor Current",
				offset: 0x2B2,
				bytes: 2,
				color: "rgb(170, 220, 170)"
			},
			{
				name: "Y Axis Steps Per MM",
				offset: 0x2DA,
				bytes: 4,
				color: "rgb(170, 170, 220)"
			},
			{
				name: "Y Motor Current",
				offset: 0x2B4,
				bytes: 2,
				color: "rgb(220, 220, 170)"
			},
			{
				name: "Z Axis Steps Per MM",
				offset: 0x2DE,
				bytes: 4,
				color: "rgb(220, 170, 220)"
			},
			{
				name: "Bed Offset Back Left",
				offset: 0x46,
				bytes: 4,
				color: "rgb(170, 220, 220)"
			},
			{
				name: "Bed Offset Back Right",
				offset: 0x4A,
				bytes: 4,
				color: "rgb(190, 165, 165)"
			},
			{
				name: "Bed Offset Front Left",
				offset: 0x52,
				bytes: 4,
				color: "rgb(165, 190, 165)"
			},
			{
				name: "Bed Offset Front Right",
				offset: 0x4E,
				bytes: 4,
				color: "rgb(165, 165, 190)"
			},
			{
				name: "Bed Height Offset",
				offset: 0x56,
				bytes: 4,
				color: "rgb(190, 190, 165)"
			},
			{
				name: "Z Motor Current",
				offset: 0x2B6,
				bytes: 2,
				color: "rgb(190, 165, 190)"
			}
		];

		// Show message
		function showMessage(header, text, secondButton, firstButton) {
		
			// Blur focused element
			$("*:focus").blur();

			// Get message
			var message = $("body > div.page-container > div.message");
	
			// Set header and text
			message.find("h4").text(header);
			message.find("p").text(text);
	
			// Set first button if specified
			var buttons = message.find("button");
			if(typeof firstButton === "undefined")
				buttons.eq(0).removeClass("show");
			else
				buttons.eq(0).text(firstButton).addClass("show");
	
			// Set second button if specified
			if(typeof secondButton === "undefined")
				buttons.eq(1).removeClass("show");
			else
				buttons.eq(1).text(secondButton).addClass("show");
	
			// Hide button area and show loading if no buttons are specified
			if(typeof secondButton === "undefined" && typeof firstButton === "undefined") {
				$("body > div.page-container > div.message > div > div > div").removeClass("show");
				$("body > div.page-container > div.message > div > img").addClass("show");
			}
	
			// Otherwise show button area and hide loading
			else {
				$("body > div.page-container > div.message > div > div > div").addClass("show");
				$("body > div.page-container > div.message > div > img").removeClass("show");
			}
	
			// Show message
			message.addClass("show");
		}

		// Hide message
		function hideMessage() {

			// Hide message
			$("body > div.page-container > div.message").removeClass("show");
		}

		// Update EEPROM table
		function updateEepromTable(eeprom) {

			// Get eeprom type
			var type = $("#control div.jog-panel.eeprom input[type=\"radio\"]:checked").val();

			// Go through all EEPROM inputs
			var index = 0;
			$("#control > div.jog-panel.eeprom table input").each(function() {
		
				// Check if EEPROM hasn't been provided
				if(typeof eeprom === "undefined") {
		
					// Check if display type has changed
					if(eepromDisplayType != type) {
			
						// Get current value
						var value = $(this).val();
				
						// Convert current value to hexadecimal
						if(eepromDisplayType == "ascii")
							value = value.charCodeAt(0).toString(16);
						else if(eepromDisplayType == "decimal")
							value = parseInt(value).toString(16);
				
						if(value.length == 1)
							value = '0' + value;
						value = value.toUpperCase();
				
						// Check if value is invalid
						if(!value.length || value.length > 2 || !/^[0-9a-fA-F]+$/.test(value))
				
							// Clear value
							value = "00";
				
						// Convert hexadecimal value to type and set max length
						if(type == "ascii") {
							$(this).attr("maxlength", '1');
							value = String.fromCharCode(parseInt(value, 16));
						}
						else if(type == "decimal") {
							$(this).attr("maxlength", '3');
							value = parseInt(value, 16).toString();
						}
						else
							$(this).attr("maxlength", '2');
				
						// Update value
						$(this).val(value);
					}
				}
		
				// Otherwise
				else {
		
					// Get value
					var value = eeprom.substr(index * 2, 2).toUpperCase();
			
					// Convert hexadecimal value to type
					if(type == "ascii")
						value = String.fromCharCode(parseInt(value, 16));
					else if(type == "decimal")
						value = parseInt(value, 16).toString();
		
					// Set value to EEPROM
					$(this).val(value);
				}
		
				// Increment index
				index++;
			});
		}

		// Camelcases string
		function camelCase(value) {

			// Convert value to be camelcase
			return value.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
				return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
			}).replace(/\s+/g, "");
		}

		// Float To Binary
		function floatToBinary(value) {

			// Initialize variables
			var bytes = 0;

			// Check value cases
			switch(value) {

				// Positive infinity case
				case Number.POSITIVE_INFINITY:
					bytes = 0x7F800000;
				break;

				// Negative infinity case
				case Number.NEGATIVE_INFINITY:
					bytes = 0xFF800000;
				break;

				// Positive zero case
				case +0.0:
					bytes = 0x40000000;
				break;

				// Negative zero case
				case -0.0:
					bytes = 0xC0000000;
				break;

				// Default case
				default:

					// Not a number case
					if(Number.isNaN(value)) {
						bytes = 0x7FC00000;
						break;
					}

					// Negative number case
					if(value <= -0.0) {
						bytes = 0x80000000;
						value = -value;
					}

					// Set exponent
					var exponent = Math.floor(Math.log(value) / Math.log(2));

					// Set mantissa
					var mantissa = (value / Math.pow(2, exponent)) * 0x00800000;

					// Set exponent
					exponent += 127;
					if(exponent >= 0xFF) {
						exponent = 0xFF;
						mantissa = 0;
					}
					else if(exponent < 0)
						exponent = 0;

					// Set bytes
					bytes |= exponent << 23;
					bytes |= mantissa & ~(-1 << 23);
				break;
			}

			// Return bytes
			return bytes;
		}

		// Save printer settings
		function savePrinterSettings() {
	
			setTimeout(function() {
			
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: "Save Printer Settings"}),
					contentType: "application/json; charset=UTF-8"
				});
			}, 1000);
		}
	
		// Save software settings
		function saveSoftwareSettings() {
	
			setTimeout(function() {
			
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: "Save Software Settings"}),
					contentType: "application/json; charset=UTF-8"
				});
			}, 1000);
		}
		
		// Add message
		$("body > div.page-container").append("<div class=\"message\"><div><h4></h4><img src=\"/plugin/m3dfio/static/img/loading.gif\"><div><p></p><div><button class=\"btn btn-block\"></button><button class=\"btn btn-block\"></button></div></div></div></div>");
		
		// Add 0.01 movement control
		$("#control > div.jog-panel").eq(0).addClass("controls").find("div.distance > div").prepend("<button type=\"button\" id=\"control-distance001\" class=\"btn distance\" data-distance=\"0.01\" data-bind=\"enable: loginState.isUser()\">0.01</button>");
		$("#control > div.jog-panel").eq(0).find("div.distance > div > button:nth-of-type(3)").click();
	
		// Change tool section text
		$("#control > div.jog-panel").eq(1).addClass("extruder").find("h1").text("Extruder").after("<h1 class=\"microPass\">Extruder</h1>");

		// Create motor on control
		$("#control > div.jog-panel").eq(2).addClass("general").find("div").prepend("<button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M17'}) }\">Motors on</button>");
	
		// Create absolute and relative controls
		$("#control > div.jog-panel").eq(2).find("div").append("<button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'G90'}) }\">Absolute mode</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'G91'}) }\">Relative mode</button>");
	
		// Add filament controls
		$("#control > div.jog-panel").eq(2).after("<div class=\"jog-panel filament\" style=\"\" data-bind=\"visible: loginState.isUser\"><h1>Filament</h1><div><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Unload</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Load</button></div></div>");
	
		// Add calibration controls
		$("#control > div.jog-panel").eq(3).after("<div class=\"jog-panel calibration\" style=\"\" data-bind=\"visible: loginState.isUser\"><h1>Calibration</h1><div><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Calibrate bed center Z0</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Calibrate bed orientation</button><button  class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-down\"></i></button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as front left Z0</button><button  class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-down\"></i></button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as front right Z0</button><button  class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-up\"></i></button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as back right Z0</button><button  class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-up\"></i></button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as back left Z0</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as bed center Z0</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Print test border</button></div></div>");
	
		// Add advanced controls
		$("#control > div.jog-panel").eq(4).after("<div class=\"jog-panel advanced\" style=\"\" data-bind=\"visible: loginState.isUser\"><h1>Advanced</h1><div><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><img src=\"/plugin/m3dfio/static/img/HengLiXin.png\">HengLiXin fan</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><img src=\"/plugin/m3dfio/static/img/Listener.png\">Listener fan</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><img src=\"/plugin/m3dfio/static/img/Shenzhew.png\">Shenzhew fan</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><img src=\"/plugin/m3dfio/static/img/Xinyujie.png\">Xinyujie fan</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">500mA extruder current</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">660mA extruder current</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Update firmware</button><input type=\"file\" accept=\".rom, .bin, .hex\"></div></div>");
		
		
		// Create EEPROM table
		var table = "<tr><td></td>";
		for(var i = 0; i < 0x10; i++)
			table += "<td>0x" + i.toString(16).toUpperCase() + "</td>";
		table += "</tr><tr><td>0x00</td>";
	
		for(var i = 0; i < 0x300; i++) {
			if(i && i % 0x10 == 0)
				table += "</tr><tr><td>0x" + i.toString(16).toUpperCase() + "</td>";
			
			table += "<td><input data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\" type=\"text\" maxlength=\"2\" autocomplete=\"off\" value=\"??\"";
			
			// Mark offsets
			for(var j = 0; j < eepromOffsets.length; j++)
				for(var k = 0; k < eepromOffsets[j].bytes; k++)
				
					if(eepromOffsets[j].offset + k == i) {
					
						table += " style=\"background-color: " + eepromOffsets[j].color + ";\" class=\"" + camelCase(eepromOffsets[j].name) + "\" title=\"" + eepromOffsets[j].name + '"';
						j = eepromOffsets.length;
						break;
					}
			
			table += "></td>";
		}
		table += "</tr>";
		
		// Add EEPROM controls
		$("#control > div.jog-panel").eq(5).after("<div class=\"jog-panel eeprom\" style=\"\" data-bind=\"visible: loginState.isUser\"><h1>EEPROM</h1><div><table><tbody>" + table + "</tbody></table><input data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\" type=\"radio\" name=\"display\" value=\"hexadecimal\" checked><label>Hexadecimal</label><input data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\" type=\"radio\" name=\"display\" value=\"decimal\"><label>Decimal</label><input data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\" type=\"radio\" name=\"display\" value=\"ascii\"><label>ASCII</label><br><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Read EEPROM</button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Write EEPROM</button></div></div>");
	
		// Add temperature controls
		$("#control > div.jog-panel").eq(1).find("div > button:nth-of-type(3)").after("<div style=\"width: 114px;\" class=\"slider slider-horizontal\"><div class=\"slider-track\"><div style=\"left: 0%; width: 0%;\" class=\"slider-selection\"></div><div style=\"left: 0%;\" class=\"slider-handle round\"></div><div style=\"left: 0%;\" class=\"slider-handle round hide\"></div></div><div style=\"top: -24px; left: -19px;\" class=\"tooltip top hide\"><div class=\"tooltip-arrow\"></div><div class=\"tooltip-inner\"></div></div><input style=\"width: 100px;\" data-bind=\"slider: {min: 100, max: 235, step: 1, value: flowRate, tooltip: 'hide'}\" type=\"number\"></div><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && loginState.isUser()\">Temperature:<span data-bind=\"text: flowRate() + 50 + '°C'\"></span></button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M104 S0'}) }\">Heater off</button><div class=\"microPass\"><h1 class=\"microPass\">Heat Bed</h1><div style=\"width: 114px;\" class=\"slider slider-horizontal\"><div class=\"slider-track\"><div style=\"left: 0%; width: 0%;\" class=\"slider-selection\"></div><div style=\"left: 0%;\" class=\"slider-handle round\"></div><div style=\"left: 0%;\" class=\"slider-handle round hide\"></div></div><div style=\"top: -24px; left: -19px;\" class=\"tooltip top hide\"><div class=\"tooltip-arrow\"></div><div class=\"tooltip-inner\"></div></div><input style=\"width: 100px;\" data-bind=\"slider: {min: 100, max: 170, step: 1, value: feedRate, tooltip: 'hide'}\" type=\"number\"></div><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && loginState.isUser()\">Temperature:<span data-bind=\"text: feedRate() -60 + '°C'\"></span></button><button  class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M140 S0'}) }\">Heater off</button><div>");
		
		// Save settings button event
		$("#settings_dialog > div.modal-footer > button.btn-primary").click(function() {
		
			// Save printer settings
			savePrinterSettings();
		});
	
		// Override X increment control
		$("#control #control-xinc").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 X" + $("#control #jog_distance > button.active").text() + " F100\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Override X decrement control
		$("#control #control-xdec").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 X-" + $("#control #jog_distance > button.active").text() + " F100\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Override Y increment control
		$("#control #control-yinc").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 Y" + $("#control #jog_distance > button.active").text() + " F100\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Override Y decrement control
		$("#control #control-ydec").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 Y-" + $("#control #jog_distance > button.active").text() + " F100\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Override Z increment control
		$("#control #control-zinc").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 Z" + $("#control #jog_distance > button.active").text() + " F100\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Override Z decrement control
		$("#control #control-zdec").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 Z-" + $("#control #jog_distance > button.active").text() + " F100\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Override X Y home control
		$("#control #control-xyhome").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G90\n",
				"G28\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Override Z home control
		$("#control #control-zhome").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G90\n",
				"G0 Z5 F100\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Override extrude control
		$("#control > div.jog-panel").eq(1).find("div > button:first-of-type").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 E" + ($("#control > div.jog-panel").eq(1).find("div > div:nth-of-type(2) >input").val().length ? $("#control > div.jog-panel").eq(1).find("div > div:nth-of-type(2) >input").val() : '5' ) + " F450\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Override retract control
		$("#control > div.jog-panel").eq(1).find("div > button:nth-of-type(2)").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 E-" + ($("#control > div.jog-panel").eq(1).find("div > div:nth-of-type(2) >input").val().length ? $("#control > div.jog-panel").eq(1).find("div > div:nth-of-type(2) >input").val() : '5' ) + " F450\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set extruder temperature control
		$("#control > div.jog-panel").eq(1).find("div > button:nth-of-type(4)").click(function(event) {
			
			// Show message
			showMessage("Temperature Status", "Warming up");
			
			// Set commands
			var commands = [
				"M109 S" + parseInt($(this).text().substr(12)) + '\n',
				"G4 S2\n"
			];
			
			// Add wait command if not printing
			if(self.printerState.isPrinting() !== true)
				commands.push("M65536;wait\n");
			
			// Display temperature
			var updateTemperature = setInterval(function() {
			
				// Show message
				showMessage("Temperature Status", "Warming up: " + self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1] + "°C");
			}, 1000);
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
				
					// Stop displaying temperature
					clearInterval(updateTemperature);
					
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
					
						// Hide message
						hideMessage();
					});
				
					// Show message
					showMessage("Temperature Status", "Done", "Ok");
				}
			});
		});
		
		// Set heat bed temperature control
		$("#control > div.jog-panel").eq(1).find("div > div.microPass > button:first-of-type").click(function(event) {
			
			// Show message
			showMessage("Temperature Status", "Warming up");
			
			// Set commands
			var commands = [
				"M190 S" + parseInt($(this).text().substr(12)) + '\n',
				"G4 S2\n"
			];
			
			// Add wait command if not printing
			if(self.printerState.isPrinting() !== true)
				commands.push("M65536;wait\n");
			
			// Display temperature
			var updateTemperature = setInterval(function() {
			
				// Show message
				showMessage("Temperature Status", "Warming up: " + self.temperature.temperatures.bed.actual[self.temperature.temperatures.bed.actual.length - 1][1] + "°C");
			}, 1000);
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Stop displaying temperature
					clearInterval(updateTemperature);
					
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
					
						// Hide message
						hideMessage();
					});
				
					// Show message
					showMessage("Temperature Status", "Done", "Ok");
				}
			});
		});
	
		// Set unload filament control
		$("#control > div.jog-panel").eq(3).find("div > button:nth-of-type(1)").click(function(event) {
			
			// Show message
			showMessage("Filament Status", "Warming up");
		
			// Set commands
			var commands = [
				"M106\n",
				"M109 S250\n",
				"G4 S2\n",
				"M65536;wait\n"
			];
			
			// Display temperature
			var updateTemperature = setInterval(function() {
			
				// Show message
				showMessage("Filament Status", "Warming up: " + self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1] + "°C");
			}, 1000);
			
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8",
		
				// On success
				success: function(data) {
		
					// Stop displaying temperature
					clearInterval(updateTemperature);
			
					// Show message
					showMessage("Filament Status", "Remove filament");
		
					// Set commands
					commands = [
						"G90\n",
						"G92\n"
					];
			
					for(var i = 2; i <= 60; i += 2)
						commands.push("G0 E-" + i + " F450\n");
	
					commands.push("M104 S0\n");
					commands.push("M107\n");
					commands.push("M65536;wait\n");
			
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: commands}),
						contentType: "application/json; charset=UTF-8",
				
						// On success
						success: function(data) {
							
							// No click event
							$("body > div.page-container > div.message").find("button").eq(0).one("click", function() {
							
								// Unload filament again
								$("body > div.page-container > div.message").find("button").off("click");
								$("#control > div.jog-panel").eq(3).find("div > button:nth-of-type(1)").click();
							});
				
							// Yes click event
							$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
				
								// Hide message
								$("body > div.page-container > div.message").find("button").off("click");
								hideMessage();
							});
						
							// Show message
							showMessage("Filament Status", "Was filament removed?", "Yes", "No");
						}
					});
				}
			});
		});
	
		// Set load filament control
		$("#control > div.jog-panel").eq(3).find("div > button:nth-of-type(2)").click(function(event) {
			
			// Show message
			showMessage("Filament Status", "Warming up");
		
			// Set commands
			var commands = [
				"M106\n",
				"M109 S250\n",
				"G4 S2\n",
				"M65536;wait\n"
			];
			
			// Display temperature
			var updateTemperature = setInterval(function() {
			
				// Show message
				showMessage("Filament Status", "Warming up: " + self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1] + "°C");
			}, 1000);
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Stop displaying temperature
					clearInterval(updateTemperature);
			
					// Show message
					showMessage("Filament Status", "Insert filament");
			
					// Set commands
					commands = [
						"G90\n",
						"G92\n"
					];
				
					for(var i = 2; i <= 60; i += 2)
						commands.push("G0 E" + i + " F450\n");
		
					commands.push("M104 S0\n");
					commands.push("M107\n");
					commands.push("M65536;wait\n");
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: commands}),
						contentType: "application/json; charset=UTF-8",
					
						// On success
						success: function(data) {
					
							// No click event
							$("body > div.page-container > div.message").find("button").eq(0).one("click", function() {
							
								// Load filament again
								$("body > div.page-container > div.message").find("button").off("click");
								$("#control > div.jog-panel").eq(3).find("div > button:nth-of-type(2)").click();
							});
				
							// Yes click event
							$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
				
								// Hide message
								$("body > div.page-container > div.message").find("button").off("click");
								hideMessage();
							});
						
							// Show message
							showMessage("Filament Status", "Was filament inserted?", "Yes", "No");
						}
					});
				}
			});
		});
	
		// Set calibrate bed center Z0 control
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(1)").click(function(event) {
			
			// Show message
			showMessage("Calibration Status", "Calibrating bed center Z0");
		
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"M104 S0\n",
				"G91\n",
				"G0 Y20 Z2 F150\n",
				"M109 S150\n",
				"M104 S0\n",
				"M106 S0\n",
				"G30\n",
				"M117\n",
				"M65536;wait\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
					
						// Hide message
						hideMessage();
					});
				
					// Show message
					showMessage("Calibration Status", "Done", "Ok");
				}
			});
		});
	
		// Set calibrate bed orientation control
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(2)").click(function(event) {
			
			// Show message
			showMessage("Calibration Status", "Calibrating bed orientation");
		
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"M104 S0\n",
				"G91\n",
				"G0 Y20 Z2 F150\n",
				"M109 S150\n",
				"M104 S0\n",
				"M106 S0\n",
				"G32\n",
				"M65536;wait\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
					
						// Hide message
						hideMessage();
					});
				
					// Show message
					showMessage("Calibration Status", "Done", "Ok");
				}
			});
		});
	
		// Set go to front left
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(3)").click(function(event) {
		
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"G90\n",
				"G0 Z3 F100\n",
				"G28\n",
				"G0 X9 Y5 Z3 F100\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set go to front right
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(5)").click(function(event) {
		
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"G90\n",
				"G0 Z3 F100\n",
				"G28\n",
				"G0 X99 Y5 Z3 F100\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set go to back right
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(7)").click(function(event) {
		
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"G90\n",
				"G0 Z3 F100\n",
				"G28\n",
				"G0 X99 Y95 Z3 F100\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set go to back left
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(9)").click(function(event) {
		
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"G90\n",
				"G0 Z3 F100\n",
				"G28\n",
				"G0 X9 Y95 Z3 F100\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set save Z as front left Z0 control
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(4)").click(function(event) {
			
			// Show message
			showMessage("Saving Status", "Saving Z as front left Z0");
		
			// Set commands
			var commands = [
				"M114\n",
				"M65536;wait\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Set commands
					commands = [
						"M618 S19 P" + floatToBinary(currentZ) + '\n',
						"M619 S19\n",
						"M65536;wait\n"
					];
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: commands}),
						contentType: "application/json; charset=UTF-8",
						
						// On success
						success: function(data) {
						
							// Save software settings
							saveSoftwareSettings();
			
							// Ok click event
							$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
					
								// Hide message
								hideMessage();
							});
				
							// Show message
							showMessage("Saving Status", "Done", "Ok");
						}
					});
				}
			});
		});
	
		// Set save Z as front right Z0 control
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(6)").click(function(event) {
			
			// Show message
			showMessage("Saving Status", "Saving Z as front right Z0");
		
			// Set commands
			var commands = [
				"M114\n",
				"M65536;wait\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Set commands
					commands = [
						"M618 S18 P" + floatToBinary(currentZ) + '\n',
						"M619 S18\n",
						"M65536;wait\n"
					];
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: commands}),
						contentType: "application/json; charset=UTF-8",
						
						// On success
						success: function(data) {
						
							// Save software settings
							saveSoftwareSettings();
			
							// Ok click event
							$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
					
								// Hide message
								hideMessage();
							});
				
							// Show message
							showMessage("Saving Status", "Done", "Ok");
						}
					});
				}
			});
		});
	
		// Set save Z as back right Z0 control
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(8)").click(function(event) {
			
			// Show message
			showMessage("Saving Status", "Saving Z as back right Z0");
		
			// Set commands
			var commands = [
				"M114\n",
				"M65536;wait\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Set commands
					commands = [
						"M618 S17 P" + floatToBinary(currentZ) + '\n',
						"M619 S17\n",
						"M65536;wait\n"
					];
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: commands}),
						contentType: "application/json; charset=UTF-8",
						
						// On success
						success: function(data) {
						
							// Save software settings
							saveSoftwareSettings();
			
							// Ok click event
							$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
					
								// Hide message
								hideMessage();
							});
				
							// Show message
							showMessage("Saving Status", "Done", "Ok");
						}
					});
				}
			});
		});
	
		// Set save Z as back left Z0 control
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(10)").click(function(event) {
			
			// Show message
			showMessage("Saving Status", "Saving Z as back left Z0");
		
			// Set commands
			var commands = [
				"M114\n",
				"M65536;wait\n"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Set commands
					commands = [
						"M618 S16 P" + floatToBinary(currentZ) + '\n',
						"M619 S16\n",
						"M65536;wait\n"
					];
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: commands}),
						contentType: "application/json; charset=UTF-8",
						
						// On success
						success: function(data) {
						
							// Save software settings
							saveSoftwareSettings();
			
							// Ok click event
							$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
					
								// Hide message
								hideMessage();
							});
				
							// Show message
							showMessage("Saving Status", "Done", "Ok");
						}
					});
				}
			});
		});
		
		// Set save Z as bed center Z0 control
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(11)").click(function(event) {
			
			// Show message
			showMessage("Saving Status", "Saving Z as bed center Z0");
			
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"G91\n",
				"G0 Z0.0999 F100\n",
				"G33\n"
			];
			
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8",
						
				// On success
				success: function(data) {
	
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Saving Status", "Done", "Ok");
				}
			});
		});
		
		// Set print test border control
		$("#control > div.jog-panel").eq(4).find("div > button:nth-of-type(12)").click(function(event) {
			
			// Show message
			showMessage("Printing Status", "Preparing test border");
		
			setTimeout(function() {
			
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: "Print test border"}),
					contentType: "application/json; charset=UTF-8",
						
					// On success
					success: function(data) {
	
						// Hide message
						hideMessage();
					}
				});
			}, 1000);
		});
	
		// Set HengLiXin fan control
		$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(1)").click(function(event) {
			
			// Show message
			showMessage("Fan Status", "Setting fan to HengLiXin");
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Set Fan: HengLiXin"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
	
		// Set Listener fan control
		$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(2)").click(function(event) {
			
			// Show message
			showMessage("Fan Status", "Setting fan to Listener");
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Set Fan: Listener"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
				
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
	
		// Set Shenzhew fan control
		$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(3)").click(function(event) {
			
			// Show message
			showMessage("Fan Status", "Setting fan to Shenzhew");

		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Set Fan: Shenzhew"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
		
		// Set Xinyujie fan control
		$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(4)").click(function(event) {
			
			// Show message
			showMessage("Fan Status", "Setting fan to Xinyujie");
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Set Fan: Xinyujie"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
	
		// Set 500mA extruder current control
		$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(5)").click(function(event) {
			
			// Show message
			showMessage("Extruder Status", "Setting extruder current to 500mA");
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Set Extruder Current: 500"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Extruder Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
	
		// Set 660mA extruder current control
		$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(6)").click(function(event) {
			
			// Show message
			showMessage("Extruder Status", "Setting extruder current to 660mA");
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Set Extruder Current: 660"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Extruder Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
	
		// Set update firmware control
		$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(7)").click(function(event) {
	
			// Open file input dialog
			$("#control > div.jog-panel").eq(5).find("div > input").click();
		});
		
		// On update firmware input change
		$("#control > div.jog-panel").eq(5).find("div > input").change(function(event) {
	
			// Initialize variables
			var file = this.files[0];
		
			// Clear input
			$(this).val('');
		
			// Check if file has no name
			if(!file.name.length) {
		
				// Ok click event
				$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
		
					// Hide message
					hideMessage();
				});
	
				// Show message
				showMessage("Firmware Status", "Invalid file name", "Ok");
			}
		
			// Go through each character of the file's name
			for(index in file.name) {
		
				// Check if extension is occuring
				if(file.name[index] == '.') {
			
					// Break if file name beings with 10 numbers
					if(index == 10)
						break;
					
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
		
						// Hide message
						hideMessage();
					});
	
					// Show message
					showMessage("Firmware Status", "Invalid file name", "Ok");
				
					// Return
					return;
				}
			
				// Check if current character isn't a digit or length is invalid
				if(file.name[index] < '0' || file.name[index] > '9' || (index == file.name.length - 1 && index < 9)) {
			
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
		
						// Hide message
						hideMessage();
					});
	
					// Show message
					showMessage("Firmware Status", "Invalid file name", "Ok");
				
					// Return
					return;
				}
			}
		
			// Check if the file is too big
			if(file.size > 32768) {

				// Ok click event
				$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
		
					// Hide message
					hideMessage();
				});
	
				// Show message
				showMessage("Firmware Status", "Invalid file size", "Ok");
			}
		
			// Otherwise
			else {
	
				// Show message
				showMessage("Firmware Status", "Updating firmware");
	
				// Read in file
				var reader = new FileReader();
				reader.readAsBinaryString(file);
		
				// On file load
				reader.onload = function(event) {
		
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "file", name: file.name, contents: event.target.result}),
						contentType: "application/json; charset=UTF-8",
			
						// On success
						success: function(data) {
			
							// Ok click event
							$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
			
								// Hide message
								hideMessage();
							});
		
							// Show message
							showMessage("Firmware Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
						}
					});
				};
			}
		});
		
		// Change EEPROM display control
		$("#control > div.jog-panel").eq(6).find("input[type=\"radio\"]").click(function() {
		
			// Update EEPROM table
			updateEepromTable();
			
			// Update EEPROM display type
			eepromDisplayType = $(this).val();
		});
		
		// Read EEPROM control
		$("#control > div.jog-panel").eq(6).find("div > button:nth-of-type(1)").click(function(event) {
			
			// Show message
			showMessage("EEPROM Status", "Reading EEPROM");
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Read EEPROM"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
	
						// Hide message
						hideMessage();
					});

					// Show message
					showMessage("EEPROM Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
		
		// Write EEPROM control
		$("#control > div.jog-panel").eq(6).find("div > button:nth-of-type(2)").click(function(event) {
			
			// Initialzie EEPROM
			var eeprom = "";
			
			// Go through all EEPROM inputs
			$("#control > div.jog-panel.eeprom table input").each(function() {
			
				// Get value with 2 digits
				var value = $(this).val();
				
				// Get EEPROM type
				var type = $("#control div.jog-panel.eeprom input[type=\"radio\"]:checked").val();
				
				// Convert value to hexadecimal
				if(type == "decimal")
					value = parseInt(value).toString(16);
				else if(type == "ascii")
					value = value.charCodeAt(0).toString(16);
				
				// Make sure value is 2 digits
				if(value.length == 1)
					value = '0' + value;
				
				// Check if value is invalid
				if(!value.length || value.length > 2 || !/^[0-9a-fA-F]+$/.test(value)) {
				
					// Clear EEPROM and return false
					eeprom = "";
					return false;
				}
				
				// Append value to EEPROM
				eeprom += value.toUpperCase();
			});
			
			// Check if a value was invalid
			if(!eeprom.length) {
			
				// Ok click event
				$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
	
					// Hide message
					hideMessage();
				});

				// Show message
				showMessage("EEPROM Status", "Invalid EEPROM value", "Ok");
			}
			
			// Otherwise
			else {
			
				// Show message
				showMessage("EEPROM Status", "Writing EEPROM");
			
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: "Write EEPROM:" + eeprom}),
					contentType: "application/json; charset=UTF-8",
			
					// On success
					success: function(data) {
			
						// Ok click event
						$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {
	
							// Hide message
							hideMessage();
						});

						// Show message
						showMessage("EEPROM Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
					}
				});
			}
		});
	
		// Cancel print button click
		$("#job_cancel").click(function() {
	
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"M106 S0\n",
				"M104 S0\n",
				"M18\n",
			];
		
			setTimeout(function() {
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: commands}),
					contentType: "application/json; charset=UTF-8"
				});
			}, 1000);
		});
		
		// On data update message
		self.onDataUpdaterPluginMessage = function(plugin, data) {
		
			// Check if message is not from M3D Fio
			if(plugin != "m3dfio")
			
				// Return
				return;
			
			// Check if data is that a Micro 3D is connected
			if(data.value == "Micro 3D Connected" && !printerConnected)
			
				// Set printer connected
				printerConnected = true;
			
			// Otherwise check if data is that a Micro 3D isn't connected
			else if(data.value == "Micro 3D Not Connected" && printerConnected) {
			
				// Clear printer connected
				printerConnected = false;
				$("#control > div.jog-panel").eq(5).find("div > button").removeClass("current");
				$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(7)").text("Update firmware");
				$("#control > div.jog-panel.eeprom table input").val(eepromDisplayType == "ascii" ? "?" : (eepromDisplayType == "decimal" ? "???" : "??"));
			}
			
			// Otherwise check if data is that a Micro Pass is connected
			else if(data.value == "Micro Pass Connected" && printerConnected) {
			
				// Display heat bed controls
				$("#control .microPass").css("display", "block");
				$("#control > div.jog-panel").eq(1).find("h1:not(.microPass)").text("Tools");
			}
			
			// Otherwise check if data is that a Micro Pass isn't connected
			else if(data.value == "Micro Pass Not Connected") {
			
				// Hide heat bed controls
				$("#control .microPass").css("display", "none");
				$("#control > div.jog-panel").eq(1).find("h1:not(.microPass)").text("Extruder");
			}
			
			// Otherwise check if data is current Z
			else if(data.value == "Current Z" && printerConnected && typeof data.location !== "undefined")
			
				// Set current Z
				currentZ = parseFloat(data.location);
			
			// Otherwise check if data is to change progress bar percent
			else if(data.value == "Progress bar percent" && typeof data.percent !== "undefined")
			
				// Check if percent is 0
				if(data.percent == '0') {
				
					// Reset progress bar				
					$("#gcode_upload_progress > div.bar").css("width", "0%");
					$("#gcode_upload_progress").removeClass("progress-striped active");
					$("#gcode_upload_progress > div.bar").text("");
				}
				else {
			
					// Set progress bar percent
					$("#gcode_upload_progress").addClass("progress-striped active");
					$("#gcode_upload_progress > div.bar").width(data.percent + '%').text("Uploading ...");
				}
			
			// Otherwise check if data is to change progress text
			else if(data.value == "Progress bar text" && typeof data.text !== "undefined")
			
				// Set progress bar text
				$("#gcode_upload_progress > div.bar").text(data.text);
			
			// Otherwise check if data is to set popup error message
			else if(data.value == "Set error message" && typeof data.text !== "undefined")
			
				// Set error message text
				setTimeout(function() {
					$("div.ui-pnotify:last-of-type > div > div.ui-pnotify-text > p").text(data.text);
				}, 100);
			
			// Otherwise check if data is to create an error message
			else if(data.value == "Create error message" && typeof data.title !== "undefined" && typeof data.text !== "undefined") {
			
				// Display error message
				new PNotify({
				    title: data.title,
				    text: "<p>" + data.text + "</p><div class=\"pnotify_additional_info\"><div class=\"pnotify_more\"><a href=\"#\" onclick=\"$(this).children().toggleClass('icon-caret-right icon-caret-down').parent().parent().next().slideToggle('fast')\">More <i class=\"icon-caret-right\"></i></a></div><div class=\"pnotify_more_container hide\"><pre><!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 3.2 Final//EN\"><title>500 Internal Server Error</title><h1>Internal Server Error</h1><p>The server encountered an internal error and was unable to complete your request.  Either the server is overloaded or there is an error in the application.</p></pre></div></div>",
				    type: "error",
				    hide: false
				});
			}
			
			// Otherwise check if data is to enable shared library options
			else if(data.value == "Enable Shared Library")
			
				// Enable shared library options
				$("#settings_plugin_m3dfio label.sharedLibrary").removeClass("disabled").children("input").prop("disabled", false);
			
			// Otherwise check if data is to disable shared library options
			else if(data.value == "Disable Shared Library")
			
				// Disable shared library options
				$("#settings_plugin_m3dfio label.sharedLibrary").addClass("disabled").children("input").prop("disabled", true);
			
			// Otherwise check if data is EEPROM
			else if(data.value == "EEPROM" && typeof data.eeprom !== "undefined") {
			
				// Update EEPROM table
				updateEepromTable(data.eeprom);
				
				// Remove current indicators from buttons
				$("#control > div.jog-panel").eq(5).find("div > button").removeClass("current");
				
				// Indicate current fan type
				var fanType = (parseInt(data.eeprom[0x2AB * 2], 16) << 4) | parseInt(data.eeprom[0x2AB * 2 + 1], 16);
				if(fanType >= 1 && fanType <= 4)
					$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(" + fanType + ")").addClass("current");
					
				// Indicate current extruder current
				var extruderCurrent = ((parseInt(data.eeprom[0x2E8 * 2], 16) << 4) | parseInt(data.eeprom[0x2E8 * 2 + 1], 16)) | (((parseInt(data.eeprom[0x2E9 * 2], 16) << 4) | parseInt(data.eeprom[0x2E9 * 2 + 1], 16)) << 8)
				if(extruderCurrent == 500)
					$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(5)").addClass("current");
				else if(extruderCurrent == 660)
					$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(6)").addClass("current");
				
				var firmwareVersion = ((parseInt(data.eeprom[0], 16) << 4) | parseInt(data.eeprom[1], 16)) | (((parseInt(data.eeprom[2], 16) << 4) | parseInt(data.eeprom[3], 16)) << 8) | (((parseInt(data.eeprom[4], 16) << 4) | parseInt(data.eeprom[5], 16)) << 16) | (((parseInt(data.eeprom[6], 16) << 4) | parseInt(data.eeprom[7], 16)) << 24);
				
				$("#control > div.jog-panel").eq(5).find("div > button:nth-of-type(7)").html("Update firmware<span>Currently Using: " + firmwareVersion + "</span>");
			}
			
			// Otherwise check if data is a status error message
			else if(data.value == "Error" && typeof data.message !== "undefined") {

				// Check if a response is requested
				if(typeof data.response !== "undefined") {
				
					// Yes or no click event
					$("body > div.page-container > div.message").find("button").one("click", function() {
		
						// Disable clicking
						$("body > div.page-container > div.message").find("button").off("click");
						
						// Hide message is no was clicked
						if($(this).text() == "No")
							hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m3dfio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({command: "message", value: $(this).text()}),
							contentType: "application/json; charset=UTF-8"
						});
					});
					
					// Display message
					showMessage("Error Status", data.message, "Yes", "No");
				}
				
				// Otherwise check if a confirmation is requested
				else if(typeof data.confirm !== "undefined") {
				
					// Ok click event
					$("body > div.page-container > div.message").find("button").eq(1).one("click", function() {

						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m3dfio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({command: "message", value: $(this).text()}),
							contentType: "application/json; charset=UTF-8"
						});
					});
					
					// Display message
					showMessage("Error Status", data.message, "Ok");
				}
				
				// Otherwise
				else
				
					// Display message
					showMessage("Error Status", data.message);
			}
		}
	}

	// Register plugin
	OCTOPRINT_VIEWMODELS.push([
	
		// Constructor
		M3DFioViewModel,
		["printerStateViewModel", "temperatureViewModel"]
	]);
});
