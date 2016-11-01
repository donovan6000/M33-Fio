// On start
$(function() {

	// Create view model
	function M33FioViewModel(parameters) {
	
		// Set self
		var self = this;
	
		// Initialize variables
		var eepromDisplayType = "hexadecimal";
		var slicerOpen = false;
		var slicerMenu = "Select Profile";
		var modelName;
		var modelLocation;
		var modelPath;
		var slicerName;
		var slicerProfileName;
		var slicerProfileContent;
		var printerProfileName;
		var afterSlicingAction;
		self.modelCenter = [null, null];
		var currentX = null, currentY = null, currentZ = null, currentE = null;
		var modelEditor = null;
		var convertedModel = null;
		var messages = [];
		var skippedMessages = 0;
		var continueWithPrint = false;
		var waitingCallback = null;
		var locationCallback = null;
		var connectCallback = null;
		var failedToConnectCallback = null;
		var skipModelEditor = false;
		var currentFirmwareType = null;
		var printerColor = "Black"
		var modelViewer = null;
		var preventUpdatingFiles = false;
		var heatbedAttached = false;
		
		// Set model editor printer and filament color
		var modelEditorPrinterColor;
		if(typeof localStorage.modelEditorPrinterColor !== "undefined")
			modelEditorPrinterColor = localStorage.modelEditorPrinterColor;
		else
			modelEditorPrinterColor = "Black";
		
		var modelEditorFilamentColor;
		if(typeof localStorage.modelEditorFilamentColor !== "undefined")
			modelEditorFilamentColor = localStorage.modelEditorFilamentColor;
		else
			modelEditorFilamentColor = "White";
		
		// Get state views
		self.printerState = parameters[0];
		self.temperature = parameters[1];
		self.settings = parameters[2];
		self.slicing = parameters[3];
		self.terminal = parameters[4];
		self.loginState = parameters[5];
		self.printerProfile = parameters[6];
		self.control = parameters[7];
		self.connection = parameters[8];
		self.gcode = parameters[9];
		self.files = null;
		
		// Modify slicing view model's slice function to use position parameter
		globalSlicingViewModel = self.slicing;
		globalM33FioViewModel = self;
		var newSliceFunction = self.slicing.slice.toString().replace("slicer: self.slicer()", "\
			slicer: self.slicer(),\
			position: {\
				x: m33fio.modelCenter[0],\
				y: m33fio.modelCenter[1]\
			}\
		");
		self.slicing.slice = new Function("\
			var self = globalSlicingViewModel;\
			var m33fio = globalM33FioViewModel;\
			" + newSliceFunction.substring(newSliceFunction.indexOf("{") + 1, newSliceFunction.lastIndexOf("}"))
		);
		
		// Bed dimensions
		var bedLowMaxX = 106.0;
		var bedLowMinX = -2.0;
		var bedLowMaxY = 105.0;
		var bedLowMinY = -2.0;
		var bedLowMaxZ = 5.0;
		var bedLowMinZ = 0.0;
		var bedMediumMaxX = 106.0;
		var bedMediumMinX = -2.0;
		var bedMediumMaxY = 105.0;
		var bedMediumMinY = -9.0;
		var bedMediumMaxZ = 73.5;
		var bedMediumMinZ = bedLowMaxZ;
		var bedHighMaxX = 97.0;
		var bedHighMinX = 7.0;
		var bedHighMaxY = 85.0;
		var bedHighMinY = 9.0;
		var bedHighMaxZ = 112.0;
		var bedHighMinZ = bedMediumMaxZ;
		var printBedWidth = 121;
		var printBedDepth = 119 - bedLowMinY;
		var externalBedHeight = 0.0;
		var extruderCenterX = (bedLowMaxX + bedLowMinX) / 2;
		var extruderCenterY = (bedLowMaxY + bedLowMinY + 14.0) / 2;
		var printBedOffsetX = 0.0;
		var printBedOffsetY = 2.0;
		
		// Set printer materials
		var printerMaterials = {
		
			Black: new THREE.MeshPhongMaterial({
				color: 0x2A2A2A,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			White: new THREE.MeshPhongMaterial({
				color: 0xFBFBFB,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			Blue: new THREE.MeshPhongMaterial({
				color: 0x4783C1,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			Green: new THREE.MeshPhongMaterial({
				color: 0x00D700,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			Orange: new THREE.MeshPhongMaterial({
				color: 0xED2600,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			Clear: new THREE.MeshPhongMaterial({
				color: 0xE2E2E3,
				specular: 0xFFFFFF,
				shininess: 100,
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.4
			}),
			
			Silver: new THREE.MeshPhongMaterial({
				color: 0xB7B8B9,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			Purple: new THREE.MeshPhongMaterial({
				color: 0x580085,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			})
		};
		
		// Set filament materials
		var filamentMaterials = {
		
			White: new THREE.MeshLambertMaterial({
				color: 0xF4F3E9,
				side: THREE.DoubleSide
			}),
			
			Pink: new THREE.MeshLambertMaterial({
				color: 0xFF006B,
				side: THREE.DoubleSide
			}),
			
			Red: new THREE.MeshLambertMaterial({
				color: 0xEE0000,
				side: THREE.DoubleSide
			}),
			
			Orange: new THREE.MeshLambertMaterial({
				color: 0xFE9800,
				side: THREE.DoubleSide
			}),

			Yellow: new THREE.MeshLambertMaterial({
				color: 0xFFEA00,
				side: THREE.DoubleSide
			}),
			
			Green: new THREE.MeshLambertMaterial({
				color: 0x009E60,
				side: THREE.DoubleSide
			}),

			"Light Blue": new THREE.MeshLambertMaterial({
				color: 0x00EEEE,
				side: THREE.DoubleSide
			}),

			Blue: new THREE.MeshLambertMaterial({
				color: 0x236B8E,
				side: THREE.DoubleSide
			}),

			Purple: new THREE.MeshLambertMaterial({
				color: 0x9A009A,
				side: THREE.DoubleSide
			}),

			Black: new THREE.MeshLambertMaterial({
				color: 0x404040,
				side: THREE.DoubleSide
			})
		};
		
		// Set glow shader
		var glowVertexShader = '\
			uniform vec3 viewVector;\
			uniform float c;\
			uniform float p;\
			varying float intensity;\
			void main() {\
				vec3 vNormal = normalize(normalMatrix * normal);\
				vec3 vNormel = normalize(normalMatrix * viewVector);\
				intensity = pow(c - dot(vNormal, vNormel), p);\
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\
			}\
		';
	
		var glowFragmentShader = '\
			uniform vec3 color;\
			varying float intensity;\
			uniform float alpha;\
			void main() {\
				vec3 glow = color * intensity;\
				gl_FragColor = vec4(glow, alpha);\
			}\
		';
		
		// Set outline shader
		var outlineVertexShader = '\
			uniform float offset;\
			void main() {\
				vec4 pos = modelViewMatrix * vec4(position + normal * offset, 1.0);\
				gl_Position = projectionMatrix * pos;\
			}\
		';

		var outlineFragmentShader = '\
			uniform vec3 color;\
			uniform float alpha;\
			void main() {\
				gl_FragColor = vec4(color, alpha);\
			}\
		';
		
		// EEPROM offsets
		var eepromOffsets = {
			firmwareVersion: {
				name: gettext("Firmware Version"),
				offset: 0x00,
				bytes: 4,
				color: "rgb(245, 160, 245)"
			},
			firmwareCrc: {
				name: gettext("Firmware CRC"),
				offset: 0x04,
				bytes: 4,
				color: "rgb(245, 245, 160)"
			},
			lastRecordedZValue: {
				name: gettext("Last Recorded Z Value"),
				offset: 0x08,
				bytes: 4,
				color: "rgb(230, 210, 230)"
			},
			backlashX: {
				name: gettext("Backlash X"),
				offset: 0x0C,
				bytes: 4,
				color: "rgb(200, 150, 150)"
			},
			backlashY: {
				name: gettext("Backlash Y"),
				offset: 0x10,
				bytes: 4,
				color: "rgb(150, 200, 150)"
			},
			bedOrientationBackRight: {
				name: gettext("Bed Orientation Back Right"),
				offset: 0x14,
				bytes: 4,
				color: "rgb(200, 200, 150)"
			},
			bedOrientationBackLeft: {
				name: gettext("Bed Orientation Back Left"),
				offset: 0x18,
				bytes: 4,
				color: "rgb(150, 150, 200)"
			},
			bedOrientationFrontLeft: {
				name: gettext("Bed Orientation Front Left"),
				offset: 0x1C,
				bytes: 4,
				color: "rgb(200, 150, 200)"
			},
			bedOrientationFrontRight: {
				name: gettext("Bed Orientation Front Right"),
				offset: 0x20,
				bytes: 4,
				color: "rgb(150, 200, 200)"
			},
			filamentColor: {
				name: gettext("Filament Color"),
				offset: 0x24,
				bytes: 4,
				color: "rgb(250, 210, 230)"
			},
			filamentTypeAndLocation: {
				name: gettext("Filament Type And Location"),
				offset: 0x28,
				bytes: 1,
				color: "rgb(160, 160, 245)"
			},
			filamentTemperature: {
				name: gettext("Filament Temperature"),
				offset: 0x29,
				bytes: 1,
				color: "rgb(160, 245, 160)"
			},
			filamentAmount: {
				name: gettext("Filament Amount"),
				offset: 0x2A,
				bytes: 4,
				color: "rgb(245, 160, 160)"
			},
			backlashExpansionXPositive: {
				name: gettext("Backlash Expansion X+"),
				offset: 0x2E,
				bytes: 4,
				color: "rgb(200, 255, 200)"
			},
			backlashExpansionYLPositive: {
				name: gettext("Backlash Expansion YL+"),
				offset: 0x32,
				bytes: 4,
				color: "rgb(200, 200, 255)"
			},
			backlashExpansionYRPositive: {
				name: gettext("Backlash Expansion YR+"),
				offset: 0x36,
				bytes: 4,
				color: "rgb(255, 200, 255)"
			},
			backlashExpansionYRNegative: {
				name: gettext("Backlash Expansion YR-"),
				offset: 0x3A,
				bytes: 4,
				color: "rgb(255, 255, 200)"
			},
			backlashExpansionZ: {
				name: gettext("Backlash Expansion Z"),
				offset: 0x3E,
				bytes: 4,
				color: "rgb(200, 255, 255)"
			},
			backlashExpansionE: {
				name: gettext("Backlash Expansion E"),
				offset: 0x42,
				bytes: 4,
				color: "rgb(255, 200, 200)"
			},
			bedOffsetBackLeft: {
				name: gettext("Bed Offset Back Left"),
				offset: 0x46,
				bytes: 4,
				color: "rgb(170, 220, 220)"
			},
			bedOffsetBackRight: {
				name: gettext("Bed Offset Back Right"),
				offset: 0x4A,
				bytes: 4,
				color: "rgb(190, 165, 165)"
			},
			bedOffsetFrontRight: {
				name: gettext("Bed Offset Front Right"),
				offset: 0x4E,
				bytes: 4,
				color: "rgb(165, 165, 190)"
			},
			bedOffsetFrontLeft: {
				name: gettext("Bed Offset Front Left"),
				offset: 0x52,
				bytes: 4,
				color: "rgb(165, 190, 165)"
			},
			bedHeightOffset: {
				name: gettext("Bed Height Offset"),
				offset: 0x56,
				bytes: 4,
				color: "rgb(190, 190, 165)"
			},
			reserved: {
				name: gettext("Reserved"),
				offset: 0x5A,
				bytes: 4,
				color: "rgb(250, 190, 165)"
			},
			backlashSpeed: {
				name: gettext("Backlash Speed"),
				offset: 0x5E,
				bytes: 4,
				color: "rgb(200, 200, 200)"
			},
			bedOrientationVersion: {
				name: gettext("Bed Orientation Version"),
				offset: 0x62,
				bytes: 1,
				color: "rgb(230, 180, 180)"
			},
			speedLimitX: {
				name: gettext("Speed Limit X"),
				offset: 0x66,
				bytes: 4,
				color: "rgb(240, 160, 160)"
			},
			speedLimitY: {
				name: gettext("Speed Limit Y"),
				offset: 0x6A,
				bytes: 4,
				color: "rgb(160, 240, 160)"
			},
			speedLimitZ: {
				name: gettext("Speed Limit Z"),
				offset: 0x6E,
				bytes: 4,
				color: "rgb(160, 160, 240)"
			},
			speedLimitEPositive: {
				name: gettext("Speed Limit E Positive"),
				offset: 0x72,
				bytes: 4,
				color: "rgb(240, 240, 160)"
			},
			speedLimitENegative: {
				name: gettext("Speed Limit E Negative"),
				offset: 0x76,
				bytes: 4,
				color: "rgb(240, 160, 240)"
			},
			bedOrientationFirstSample: {
				name: gettext("Bed Orientation First Sample"),
				offset: 0x106,
				bytes: 4,
				color: "rgb(200, 200, 200)"
			},
			calibrateZ0Correction: {
				name: gettext("Calibrate Z0 Correction"),
				offset: 0x299,
				bytes: 4,
				color: "rgb(140, 140, 220)"
			},
			xJerkSensitivity: {
				name: gettext("X Jerk Sensitivity"),
				offset: 0x29D,
				bytes: 1,
				color: "rgb(220, 140, 140)"
			},
			yJerkSensitivity: {
				name: gettext("Y Jerk Sensitivity"),
				offset: 0x29E,
				bytes: 1,
				color: "rgb(140, 220, 140)"
			},
			lastRecordedXValue: {
				name: gettext("Last Recorded X Value"),
				offset: 0x29F,
				bytes: 4,
				color: "rgb(170, 200, 220)"
			},
			lastRecordedYValue: {
				name: gettext("Last Recorded Y Value"),
				offset: 0x2A3,
				bytes: 4,
				color: "rgb(170, 220, 200)"
			},
			lastRecordedXDirection: {
				name: gettext("Last Recorded X Direction"),
				offset: 0x2A7,
				bytes: 1,
				color: "rgb(200, 170, 220)"
			},
			lastRecordedYDirection: {
				name: gettext("Last Recorded Y Direction"),
				offset: 0x2A8,
				bytes: 1,
				color: "rgb(200, 220, 170)"
			},
			savedXState: {
				name: gettext("Saved X State"),
				offset: 0x2A9,
				bytes: 1,
				color: "rgb(220, 170, 200)"
			},
			savedYState: {
				name: gettext("Saved Y State"),
				offset: 0x2AA,
				bytes: 1,
				color: "rgb(220, 200, 170)"
			},
			fanType: {
				name: gettext("Fan Type"),
				offset: 0x2AB,
				bytes: 1,
				color: "rgb(180, 230, 230)"
			},
			fanOffset: {
				name: gettext("Fan Offset"),
				offset: 0x2AC,
				bytes: 1,
				color: "rgb(230, 230, 180)"
			},
			fanScale: {
				name: gettext("Fan Scale"),
				offset: 0x2AD,
				bytes: 4,
				color: "rgb(230, 180, 230)"
			},
			heaterCalibrationMode: {
				name: gettext("Heater Calibration Mode"),
				offset: 0x2B1,
				bytes: 1,
				color: "rgb(160, 240, 240)"
			},
			xMotorCurrent: {
				name: gettext("X Motor Current"),
				offset: 0x2B2,
				bytes: 2,
				color: "rgb(170, 220, 170)"
			},
			yMotorCurrent: {
				name: gettext("Y Motor Current"),
				offset: 0x2B4,
				bytes: 2,
				color: "rgb(220, 220, 170)"
			},
			zMotorCurrent: {
				name: gettext("Z Motor Current"),
				offset: 0x2B6,
				bytes: 2,
				color: "rgb(190, 165, 190)"
			},
			hardwareStatus: {
				name: gettext("Hardware Status"),
				offset: 0x2B8,
				bytes: 2,
				color: "rgb(160, 245, 245)"
			},
			heaterTemperatureMeasurementB: {
				name: gettext("Heater Temperature Measurement B"),
				offset: 0x2BA,
				bytes: 4,
				color: "rgb(210, 210, 230)"
			},
			hoursCounter: {
				name: gettext("Hours Counter"),
				offset: 0x2C0,
				bytes: 4,
				color: "rgb(230, 230, 110)"
			},
			xMotorStepsPerMm: {
				name: gettext("X Motor Steps/mm"),
				offset: 0x2D6,
				bytes: 4,
				color: "rgb(220, 170, 170)"
			},
			yMotorStepsPerMm: {
				name: gettext("Y Motor Steps/mm"),
				offset: 0x2DA,
				bytes: 4,
				color: "rgb(170, 170, 220)"
			},
			zMotorStepsPerMm: {
				name: gettext("Z Motor Steps/mm"),
				offset: 0x2DE,
				bytes: 4,
				color: "rgb(220, 170, 220)"
			},
			eMotorStepsPerMm: {
				name: gettext("E Motor Steps/mm"),
				offset: 0x2E2,
				bytes: 4,
				color: "rgb(180, 230, 180)"
			},
			savedZState: {
				name: gettext("Saved Z State"),
				offset: 0x2E6,
				bytes: 2,
				color: "rgb(210, 230, 230)"
			},
			eMotorCurrent: {
				name: gettext("E Motor Current"),
				offset: 0x2E8,
				bytes: 2,
				color: "rgb(180, 180, 230)"
			},
			heaterResistanceM: {
				name: gettext("Heater Resistance M"),
				offset: 0x2EA,
				bytes: 4,
				color: "rgb(210, 230, 210)"
			},
			serialNumber: {
				name: gettext("Serial Number"),
				offset: 0x2EF,
				bytes: 17,
				color: "rgb(230, 210, 250)"
			}
		};
		
		// Encode quotes
		function encodeQuotes(text) {
			
			// Return text with encoded quotes
			return String(text).replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/`/g, "&#96;");
		}
		
		// Encode html entities
		function htmlEncode(value) {

			// Return encoded html
			return $("<div>").text(value).html().replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/`/g, "&#96;");
		}
		
		// Decode html entities
		function htmlDecode(value) {

			// Return decoded html
			return $("<div>").html(value).text();
		}

		// Get already translated text
		function getAlreadyTranslatedText(text) {
		
			// Return text
			return gettext(text);
		}
		
		// Show message
		function showMessage(header, text, thirdButton, thirdButtonCallback, secondButton, secondButtonCallback, firstButton, firstButtonCallback) {
		
			// Append message to list
			messages.push({
				header: header,
				text: text,
				thirdButton: thirdButton,
				secondButton: secondButton,
				firstButton: firstButton,
				thirdButtonCallback: thirdButtonCallback,
				secondButtonCallback: secondButtonCallback,
				firstButtonCallback: firstButtonCallback
			});
		}

		// Hide message
		function hideMessage() {
		
			// Get message
			var message = $("body > div.page-container > div.message");
			
			// Check if a message is shown
			if(message.hasClass("show")) {
			
				// Hide message
				message.removeClass("show").find("button.confirm").off("click");
			
				setTimeout(function() {
			
					message.css("z-index", '');
				}, 300);
			}
		
			// Otherwise
			else
			
				// Increment skipped messages
				skippedMessages++;
		}
		
		// Show stored messages
		setInterval(function() {
		
			// Get message
			var message = $("body > div.page-container > div.message");
			
			// Check if the current displayed message doesn't need confirmation
			if(message.hasClass("show") && !message.find("button.confirm").eq(2).hasClass("show")) {
			
				// Check if skipping a message
				if(skippedMessages) {
			
					// Decrement skipped messages
					skippedMessages--;
				
					// Hide message
					hideMessage();
				}
			
				// Otherwise check if using waiting or location callback, but the printer isn't connected
				else if((typeof waitingCallback === "function" || typeof locationCallback === "function") && self.printerState.isErrorOrClosed() === true) {
			
					// Clear waiting and location callbacks
					waitingCallback = locationCallback = null;
				
					// Hide message
					hideMessage();
				
					// Show message
					showMessage(message.find("h4").html(), gettext("Operation couldn't be completed because the printer was disconnected"), gettext("OK"), function() {

						// Hide message
						hideMessage();
					});
				}
			}
		
			// Check if more messages exist
			if(messages.length) {
			
				// Skip messages
				while(skippedMessages && messages.length) {
					skippedMessages--;
					messages.shift();
				}
				
				// Check if a message can be displayed
				if(messages.length && self.loginState.loggedIn() && ((message.hasClass("show") && !message.find("button.confirm").eq(2).hasClass("show")) || message.css("z-index") != "9999")) {
				
					// Get current message
					var currentMessage = messages.shift();
					
					// Blur focused element
					$("*:focus").blur();
		
					// Set header and text
					message.find("h4").html(currentMessage.header);
					message.find("p").eq(0).html(currentMessage.text).addClass("show").scrollTop(0);
					
					// Set first button if specified
					var buttons = message.find("button.confirm");
					if(typeof currentMessage.firstButton === "undefined")
						buttons.eq(0).removeClass("show");
					else
						buttons.eq(0).html(currentMessage.firstButton).addClass("show");

					// Set second button if specified
					if(typeof currentMessage.secondButton === "undefined")
						buttons.eq(1).removeClass("show");
					else
						buttons.eq(1).html(currentMessage.secondButton).addClass("show");
					
					// Set third button if specified
					if(typeof currentMessage.thirdButton === "undefined")
						buttons.eq(2).removeClass("show");
					else
						buttons.eq(2).html(currentMessage.thirdButton).addClass("show");

					// Hide button area and show loading if no buttons are specified
					if(typeof currentMessage.thirdButton === "undefined" && typeof currentMessage.secondButton === "undefined" && typeof currentMessage.firstButton === "undefined") {
						$("body > div.page-container > div.message > div > div").addClass("loading");
						$("body > div.page-container > div.message > div > div > div").removeClass("show");
						$("body > div.page-container > div.message > div > img").addClass("show");
						$("body > div.page-container > div.message > div > div > span").addClass("show");
					}
		
					// Otherwise show button area and hide loading
					else {
						$("body > div.page-container > div.message > div > div").removeClass("loading");
						$("body > div.page-container > div.message > div > div > div:not(.calibrate)").addClass("show");
						$("body > div.page-container > div.message > div > img").removeClass("show");
						$("body > div.page-container > div.message > div > div > span").removeClass("show");
			
						// Show calibration menu or print settings if applicable
						$("body > div.page-container > div.message > div > div > div.calibrate, body > div.page-container > div.message > div > div > div.printSettings, body > div.page-container > div.message > div > div > div.filamentSettings").removeClass("show");
						
						if(currentMessage.thirdButton == gettext("Done") && !message.find("p").eq(0).find(".customInput").length)
							$("body > div.page-container > div.message > div > div > div.calibrate").addClass("show");
						
						else if(currentMessage.thirdButton == gettext("Print")) {
							$("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(self.settings.settings.plugins.m33fio.FilamentTemperature());
							$("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(self.settings.settings.plugins.m33fio.HeatbedTemperature());
							$("body > div.page-container > div.message > div > div > div.printSettings select").val(self.settings.settings.plugins.m33fio.FilamentType());
							$("body > div.page-container > div.message > div > div > div.printSettings input[type=\"checkbox\"]").prop("checked", self.settings.settings.plugins.m33fio.UseWaveBondingPreprocessor());
							$("body > div.page-container > div.message > div > div > div.printSettings").addClass("show");
							message.find("p").eq(0).removeClass("show")
						}
						
						else if(currentMessage.thirdButton == gettext("Unload") || currentMessage.thirdButton == gettext("Load") || currentMessage.thirdButton == gettext("Set")) {
							$("body > div.page-container > div.message > div > div > div.filamentSettings input").eq(0).val(self.settings.settings.plugins.m33fio.FilamentTemperature());
							$("body > div.page-container > div.message > div > div > div.filamentSettings label").html(currentMessage.thirdButton == gettext("Unload") ? gettext("Unload Temperature") : currentMessage.thirdButton == gettext("Load") ? gettext("Load Temperature") : gettext("New Temperature"));
							$("body > div.page-container > div.message > div > div > div.filamentSettings p").html(gettext("Recommended") + "<ul>" + (currentMessage.thirdButton == gettext("Unload") ? "<li>" + _.sprintf(gettext("%(temperature)d°C for ABS"), {temperature: 285}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for PLA"), {temperature: 225}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for HIPS"), {temperature: 275}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for FLX"), {temperature: 230}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for TGH"), {temperature: 230}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for CAM"), {temperature: 225}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for ABS-R"), {temperature: 250}) + "</li>" : "<li>" + _.sprintf(gettext("%(temperature)d°C for ABS"), {temperature: 275}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for PLA"), {temperature: 215}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for HIPS"), {temperature: 265}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for FLX"), {temperature: 220}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for TGH"), {temperature: 220}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for CAM"), {temperature: 215}) + "</li><li>" + _.sprintf(gettext("%(temperature)d°C for ABS-R"), {temperature: 240}) + "</li>") + "</ul>");
							$("body > div.page-container > div.message > div > div > div.filamentSettings").addClass("show");
							message.find("p").eq(0).removeClass("show")
						}
					}
			
					// Attach function callbacks
					if(typeof currentMessage.firstButtonCallback === "function")
						buttons.eq(0).one("click", currentMessage.firstButtonCallback);
					else
						buttons.eq(0).off("click");
					
					if(typeof currentMessage.secondButtonCallback === "function")
						buttons.eq(1).one("click", currentMessage.secondButtonCallback);
					else
						buttons.eq(1).off("click");
					
					if(typeof currentMessage.thirdButtonCallback === "function")
						buttons.eq(2).one("click", currentMessage.thirdButtonCallback);
					else
						buttons.eq(2).off("click");
			
					// Show message
					message.addClass("show").css("z-index", "9999");
				}
			}
		}, 300);
		
		// Message button click event
		$(document).on("click", "body > div.page-container > div.message button", function() {
		
			// Blur self
			$(this).blur();
		});
		
		// Create grid
		function createGrid(width, depth, formFactor, origin) {
		
			// Set grid parameters
			var parameters = {
				width: width,
				depth: formFactor == "circular" ? width : depth,
				spacing: 10,
				color: 0xAFAFAF
			};

			// Create grid geometry
			var gridGeometry = new THREE.Geometry();
			
			// Calculate width line offset
			var numberOfLines = Math.ceil(parameters.width / parameters.spacing);
			if(numberOfLines % 2 == 0)
				numberOfLines++;
			var offset = origin == "center" ? -parameters.width / 2 + parameters.spacing * parseInt(numberOfLines / 2) : 0;
			
			// Go through all width lines	
			for(var i = 0; i < numberOfLines; i++) {
			
				// Check if line location is valid
				var location = -parameters.width / 2 + parameters.spacing * i - offset;
				if(location > -parameters.width / 2 && location < parameters.width / 2) {
				
					// Set line radius
					var radius = formFactor == "circular" ? Math.sqrt(Math.pow(parameters.width / 2, 2) - Math.pow(location, 2)) : -parameters.depth / 2;
					
					// Add line to grid geometry
					gridGeometry.vertices.push(new THREE.Vector3(-radius, 0, location));
					gridGeometry.vertices.push(new THREE.Vector3(radius, 0, location));
				}
			}
			
			// Calculate depth line offset
			numberOfLines = Math.ceil(parameters.depth / parameters.spacing);
			if(numberOfLines % 2 == 0)
				numberOfLines++;
			offset = origin == "center" ? -parameters.depth / 2 + parameters.spacing * parseInt(numberOfLines / 2) : 0;
			
			// Go through all depth lines	
			for(var i = 0; i < numberOfLines; i++) {
			
				// Check if line location is valid
				var location = -parameters.depth / 2 + parameters.spacing * i - offset;
				if(location > -parameters.depth / 2 && location < parameters.depth / 2) {
				
					// Set line radius
					var radius = formFactor == "circular" ? Math.sqrt(Math.pow(parameters.width / 2, 2) - Math.pow(location, 2)) : -parameters.width / 2;
				
					// Add line to grid geometry
					gridGeometry.vertices.push(new THREE.Vector3(location, 0, -radius));
					gridGeometry.vertices.push(new THREE.Vector3(location, 0, radius));
				}
			}
			
			// Create lines
			var lines = new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({
				color: parameters.color
			}));
			
			// Check if using a circular bed
			if(formFactor == "circular") {
			
				// Create outline geometry
				var outlineGeometry = new THREE.CircleGeometry(parameters.width / 2, 200);
				outlineGeometry.vertices.shift();
				
				// Create outline
				var outline = new THREE.Line(outlineGeometry, new THREE.LineBasicMaterial({
					color: parameters.color,
					linewidth: 2
				}));
				
				outline.rotation.set(-Math.PI / 2, 0, 0);
			}
			
			// Otherwise
			else {
			
				// Create outline geometry
				var outlineGeometry = new THREE.Geometry();
			
				// Add width outline
				for(var i = -parameters.width / 2; i <= parameters.width / 2; i += parameters.width) {
					outlineGeometry.vertices.push(new THREE.Vector3(-parameters.depth / 2, 0, i));
					outlineGeometry.vertices.push(new THREE.Vector3(parameters.depth / 2, 0, i));
				}
			
				// Add depth outline
				for(var i = -parameters.depth / 2; i <= parameters.depth / 2; i += parameters.depth) {
					outlineGeometry.vertices.push(new THREE.Vector3(i, 0, -parameters.width / 2));
					outlineGeometry.vertices.push(new THREE.Vector3(i, 0, parameters.width / 2));
				}
				
				// Create outline
				var outline = new THREE.LineSegments(outlineGeometry, new THREE.LineBasicMaterial({
					color: parameters.color,
					linewidth: 2
				}));
			}
			
			// Add lines and outline to grid
			var grid = new THREE.Object3D();
			grid.add(lines);
			grid.add(outline);
			
			// Check if bed's origin is center
			if(origin == "center") {
			
				// Create center geometry
				var centerGeometry = new THREE.Geometry();
				centerGeometry.vertices.push(new THREE.Vector3(-parameters.depth / 2, 0, 0));
				centerGeometry.vertices.push(new THREE.Vector3(parameters.depth / 2, 0, 0));
				centerGeometry.vertices.push(new THREE.Vector3(0, 0, -parameters.width / 2));
				centerGeometry.vertices.push(new THREE.Vector3(0, 0, parameters.width / 2));
			
				// Create center
				var center = new THREE.LineSegments(centerGeometry, new THREE.LineBasicMaterial({
					color: parameters.color,
					linewidth: 2
				}));
				
				// Add center to grid
				grid.add(center);
			}
			
			// Position grid
			grid.rotation.set(0, -Math.PI / 2, 0);
			
			// Return grid
			return grid;
		}
		
		// Update printer differences
		function updatePrinterDifferences() {
		
			// Enable/disable Micro 3D printer specific features
			if(self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
				$(".micro3d").addClass("notUsingAMicro3DPrinter");
				$("#temperature-graph").removeClass("micro3dImage");
				$(".notMicro3DApplicable").addClass("show");
				$("#control > div.jog-panel.extruder").find("h1:not(.heatbed)").html(gettext("Tools"));
				
				$("#control #control-xyhome").attr("title", htmlDecode(gettext("Homes extruder on the X and Y axis")));
				$("#control #control-zhome").attr("title", htmlDecode(gettext("Homes extruder on the Z axis")));
				
				if($("#control-distance001").hasClass("active"))
					$("#control-distance01").click();
				
			}
			else {
				$(".micro3d").removeClass("notUsingAMicro3DPrinter");
				$("#temperature-graph").addClass("micro3dImage");
				$(".notMicro3DApplicable").removeClass("show");
				$("#control > div.jog-panel.extruder").find("h1:not(.heatbed)").html(heatbedAttached ? gettext("Tools") : gettext("Extruder"));
				
				$("#control #control-xyhome").attr("title", htmlDecode(gettext("Set extruder's X position to 54 and Y position to 50")));
				$("#control #control-zhome").attr("title", htmlDecode(gettext("Set extruder's Z position to 5")));
			}
		}
		
		// Get slicer profile value
		function getSlicerProfileValue(setting) {
		
			// Get first match
			var expression = new RegExp("(?:^|\n)" + setting + "\\s*?=(.*)\n?");
			var matches = expression.exec($("#slicing_configuration_dialog .modal-extra textarea").length ? $("#slicing_configuration_dialog .modal-extra textarea").val() : slicerProfileContent);
			
			// Return setting's value if it exists
			return matches !== null && matches.length == 2 ? (matches[1].indexOf(';') != -1 ? matches[1].substr(0, matches[1].indexOf(';')).trim() : matches[1].trim()) : '';
		}
		
		// Preload
		function preload() {

			// Go through all images
			var images = new Array();
			for(var i = 0; i < preload.arguments.length; i++) {
	
				// Load images
				images[i] = new Image();
				images[i].src = preload.arguments[i];
			}
		}
		
		// Save file
		function saveFile(blob, name) {
		
			// Download file
			if(typeof window.navigator.msSaveBlob === "function")

				window.navigator.msSaveBlob(blob, name);

			else {

				var anchor = $("#slicing_configuration_dialog .modal-footer a.link")[0];
				anchor.href = URL.createObjectURL(blob);
				anchor.download = name;
				anchor.click();
			}
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
				
						// Check if value is invalid
						if(!value.length || value.length > 2 || !/^[0-9a-fA-F]+$/.test(value))
						
							// Restore valid value
							value = $(this).data("validValue");
						
						// Otherwise
						else
						
							// Save original value
							$(this).data("validValue", value);
						
						if(value.length == 1)
							value = '0' + value;
						value = value.toUpperCase();
				
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
					
					// Save original value
					$(this).data("validValue", value)
			
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
		
		// EEPROM get int
		function eepromGetInt(eeprom, eepromName) {
		
			// Initialize value
			var value = 0;
		
			// Get int from EEPROM
			for(var i = eepromOffsets[eepromName].bytes - 1; i >= 0; i--) {
				value <<= 8;
				value += (parseInt(eeprom[(eepromOffsets[eepromName].offset + i) * 2], 16) << 4) | parseInt(eeprom[(eepromOffsets[eepromName].offset + i) * 2 + 1], 16);
			}
		
			// Return value
			return value;
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
					bytes = 0x00000000;
				break;

				// Negative zero case
				case -0.0:
					bytes = 0x80000000;
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
		
		// Update webcam
		function updateWebcam() {
		
			// Update webcam stream
			CONFIG_WEBCAM_STREAM = self.settings.settings.webcam.streamUrl();
			if(CONFIG_WEBCAM_STREAM === null)
				CONFIG_WEBCAM_STREAM = "None"
			
			// Hide hint text if stream doesn't exist
			if(CONFIG_WEBCAM_STREAM == "None" || /^None\?/.test(CONFIG_WEBCAM_STREAM))
				$("#webcam_container + div .muted").css("display", "none");
			else
				$("#webcam_container + div .muted").css("display", "");
		
			// Update webcam display
			if($("#control_link").hasClass("active")) {
				$("#webcam_image").attr("src", "");
				self.control.onTabChange("#control", "");
			}
		}
		
		// Get model upload date
		function getModelUploadDate(entry, modelUrl) {
	
			// Check if entry is a folder
			if(entry && entry.hasOwnProperty("children"))
		
				// Go through each entry in the folder
				for(var child in entry.children)
			
					// Check if current child is the specified model
					getModelUploadDate(entry.children[child], modelUrl);
		
			// Otherwise check if entry is the specified model
			else if(entry && entry.date && entry.refs && entry.refs.hasOwnProperty("download") && entry["refs"]["download"] === modelUrl)
			
				// Return upload date
				return entry.date;
		}
		
		// Add view buttons to models
		function addViewButtonsToModels() {
		
			// Remove all view buttons
			$("#files div.gcode_files div.entry .action-buttons div.btn-mini.viewModel").remove();
			
			// Go through all file entries
			$("#files div.gcode_files div.entry .action-buttons").each(function() {
				
				// Check if file is a model
				if($(this).children().children("i.icon-magic").length)
				
					// Add view button
					$(this).children("a.btn-mini").after('\
						<div class="btn btn-mini viewModel' + ($(this).children("a.btn-mini").attr("href") === modelViewer.modelUrl ? " disabled" : "") + '" title="' + encodeQuotes(gettext("View")) + '">\
							<i class="icon-view"></i>\
						</div>\
					');
			});
			
			// Check if WebGL isn't supported
			if(!Detector.webgl)
			
				// Disable view buttons
				$("#files div.gcode_files div.entry .action-buttons div.btn-mini.viewModel").addClass("disabled");
			
			// View button click event
			$("#files div.gcode_files div.entry .action-buttons div.btn-mini.viewModel").click(function() {
			
				// Initialize variables
				var button = $(this);
			
				// Check if button is not disabled and a model isn't currently being loaded
				if(!button.hasClass("disabled") && modelViewer.modelLoaded) {
					
					// Get model URL
					var modelUrl = button.parent().children("a.btn-mini").attr("href");
					
					// Go through all uploaded entries
					for(var entry in self.files.listHelper.allItems) {
					
						// Check if model's upload date was found
						var uploadDate = getModelUploadDate(self.files.listHelper.allItems[entry], modelUrl);
						if(typeof uploadDate !== "undefined") {
						
							// Enable other view buttons
							$("#files div.gcode_files div.entry .action-buttons div.btn-mini.viewModel").removeClass("disabled");
							
							// Set icon to spinning animation
							button.addClass("disabled").children("i").removeClass("icon-view").addClass("icon-spinner icon-spin");
							
							// Load model into model viewer
							modelViewer.loadModel(modelUrl, uploadDate);
							
							// Go to model viewer tab
							$("#model_link > a").tab("show");
							
							// Wait until model is loaded
							function isModelLoaded() {

								// Check if model is loaded
								if(modelViewer.modelLoaded)
								
									// Restore view icon
									button.children("i").removeClass("icon-spinner icon-spin").addClass("icon-view");

								// Otherwise
								else

									// Check if model is loaded again
									setTimeout(isModelLoaded, 100);
							}
							isModelLoaded();
					
							// Break
							break;
						}	
					}
				}
			});
		}
		
		// Create model viewer
		function createModelViewer() {

			// Model viewer
			modelViewer = {

				// Data members
				modelUrl: null,
				modelUploadDate: null,
				scene: null,
				camera: null,
				renderer: null,
				orbitControls: null,
				model: null,
				modelLoaded: true,
				grid: null,
				
				// Initialize
				init: function() {
				
					// Check if WebGL isn't supported
					if(!Detector.webgl)
					
						// Show error
						$("#model .cover > p").html(gettext("Model viewer is disabled since your web browser doesn't support WebGL")).parent().addClass("show noLoading");
					
					// Otherwise
					else {
					
						// Create scene
						this.scene = new THREE.Scene();
						
						// Create camera
						var SCREEN_WIDTH = $("#model > div > div").width(), SCREEN_HEIGHT = $("#model > div > div").height();
						var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
						this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
						this.scene.add(this.camera);
						this.camera.position.set(0, 70, -200);
						
						// Create renderer
						this.renderer = new THREE.WebGLRenderer({
							antialias: true
						});
						this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
						this.renderer.setClearColor(0xFCFCFC, 1);

						// Create controls
						this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
						this.orbitControls.target.set(0, 0, 0);
						this.orbitControls.enablePan = false;
						this.orbitControls.autoRotate = true;
						this.orbitControls.autoRotateSpeed = 1.5;

						// Create lights
						this.scene.add(new THREE.AmbientLight(0x444444));
						var dirLight = new THREE.DirectionalLight(0xFFFFFF);
						dirLight.position.set(200, 200, 1000).normalize();
						this.camera.add(dirLight);
						this.camera.add(dirLight.target);
		
						// Enable events
						$(window).on("resize.modelViewer", this.resizeEvent);
						
						// Append model viewer to model viewer tab
						$("#model > div > div").append(this.renderer.domElement);
						
						// Resize window
						$(window).resize();
						
						// Start animating model viewer
						this.animate();
					}
				},
				
				// Update grid
				updateGrid: function() {
				
					// Check if grid already exists
					if(modelViewer.grid !== null) {
					
						// Remove grid from scene
						modelViewer.scene.remove(modelViewer.grid);
						modelViewer.grid = null;
					}
					
					// Create grid
					modelViewer.grid = createGrid(self.printerProfile.currentProfileData().volume.width(), self.printerProfile.currentProfileData().volume.depth(), self.printerProfile.currentProfileData().volume.formFactor(), self.printerProfile.currentProfileData().volume.origin());
				
					// Add grid to scene
					modelViewer.scene.add(modelViewer.grid);
				},
				
				// Load model
				loadModel: function(file, date) {
				
					// Check if a model is already loaded
					if(modelViewer.modelUrl !== null) {
					
						// Remove model from scene
						modelViewer.scene.remove(modelViewer.model);
						
						// Clear model
						modelViewer.model = null;
					}
				
					// Set model URL
					modelViewer.modelUrl = file;
					modelViewer.modelUploadDate = date;
					
					// Show message
					$("#model .cover > p").html(gettext("Loading model…")).parent().addClass("show");
					
					// Clear model loaded
					modelViewer.modelLoaded = false;
					
					setTimeout(function() {
					
						// Set file type
						var extension = typeof modelViewer.modelUrl !== "undefined" && modelViewer.modelUrl !== null ? modelViewer.modelUrl.lastIndexOf('.') : -1;
						var type = extension != -1 ? modelViewer.modelUrl.substr(extension + 1).toLowerCase() : "";
	
						// Set loader
						if(type == "stl")
							var loader = new THREE.STLLoader();
						else if(type == "obj")
							var loader = new THREE.OBJLoader();
						else if(type == "m3d")
							var loader = new THREE.M3DLoader();
						else if(type == "amf")
							var loader = new THREE.AMFLoader();
						else if(type == "wrl")
							var loader = new THREE.VRMLLoader();
						else if(type == "dae")
							var loader = new THREE.ColladaLoader();
						else if(type == "3mf")
							var loader = new THREE.ThreeMFLoader();
						else {
							
							// Clear model URL
							modelViewer.modelUrl = null;
							modelViewer.modelUploadDate = null;
							
							// Set model loaded
							modelViewer.modelLoaded = true;
							
							// Hide message
							$("#model .cover").removeClass("show");
							
							// Return
							return;
						}

						// Load model
						loader.load(modelViewer.modelUrl, function(geometry) {

							// Center model
							geometry.center();

							// Create model's mesh
							modelViewer.model = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
								color: 0x2C9BE0,
								side: THREE.DoubleSide
							}));

							// Set model's orientation
							if(type == "stl")
								modelViewer.model.rotation.set(3 * Math.PI / 2, 0, Math.PI);
							else if(type == "obj")
								modelViewer.model.rotation.set(0, 0, 0);
							else if(type == "m3d")
								modelViewer.model.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
							else if(type == "amf")
								modelViewer.model.rotation.set(0, 0, 0);
							else if(type == "wrl")
								modelViewer.model.rotation.set(0, 0, 0);
							else if(type == "dae")
								modelViewer.model.rotation.set(0, 0, 0);
							else if(type == "3mf")
								modelViewer.model.rotation.set(-Math.PI / 2, 0, Math.PI);

							// Add model to scene
							modelViewer.scene.add(modelViewer.model);
						
							// Get model's boundary box
							var boundaryBox = new THREE.Box3().setFromObject(modelViewer.model);

							// Set model's lowest Y value to be on the grid
							modelViewer.model.position.y = -boundaryBox.min.y;
					
							// Set camera to focus on model
							modelViewer.orbitControls.target.set(0, modelViewer.model.position.y, 0);
					
							// Set model loaded
							modelViewer.modelLoaded = true;
						
							// Hide message
							$("#model .cover").removeClass("show");
						});
					}, 600);
				},
				
				// Unload model
				unloadModel: function() {
				
					// Check if a model is loaded
					if(modelViewer.modelUrl !== null) {
					
						// Clear model URL
						modelViewer.modelUrl = null;
						modelViewer.modelUploadDate = null;
					
						// Remove model from scene
						modelViewer.scene.remove(modelViewer.model);
				
						// Clear model
						modelViewer.model = null;
						
						// Reset camera focus
						modelViewer.orbitControls.target.set(0, 0, 0);
					}
				},
				
				// Resize event
				resizeEvent: function() {

					// Update camera
					modelViewer.camera.aspect = $("#model > div > div").width() / $("#model > div > div").height();
					modelViewer.camera.updateProjectionMatrix();
					modelViewer.renderer.setSize($("#model > div > div").width(), $("#model > div > div").height());
				},
				
				// Animate
				animate: function() {
				
					// Update controls
					modelViewer.orbitControls.update();

					// Render scene
					modelViewer.renderer.render(modelViewer.scene, modelViewer.camera);
				
					// Animate when repainting window
					requestAnimationFrame(modelViewer.animate);
				}
			};
			
			// Create model viewer
			modelViewer.init();
		}
		
		// Create model editor
		function createModelEditor(file) {

			// Model editor
			modelEditor = {

				// Data members
				scene: [],
				camera: null,
				renderer: null,
				orbitControls: null,
				transformControls: null,
				models: [],
				modelLoaded: true,
				sceneExported: false,
				boundaries: [],
				showBoundaries: typeof localStorage.modelEditorShowBoundaries !== "undefined" && localStorage.modelEditorShowBoundaries == "true",
				measurements: [],
				showMeasurements: typeof localStorage.modelEditorShowMeasurements !== "undefined" && localStorage.modelEditorShowMeasurements == "true",
				removeSelectionTimeout: null,
				savedMatrix: null,
				cutShape: null,
				cutShapeOutline: null,
				platformAdhesion: null,
				adhesionSize: null,
				scaleLock: [],
				printerModel: null,
				axes: [],
				showAxes: typeof localStorage.modelEditorShowAxes === "undefined" || localStorage.modelEditorShowAxes == "true",
				allowTab: true,
				bedShape: null,
				bedOrigin: null,
				grid: null,
				showGrid: typeof localStorage.modelEditorShowGrid !== "undefined" && localStorage.modelEditorShowGrid == "true",
				
				// Initialize
				init: function() {
				
					// Check if using a Micro 3D printer
					if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
					
						// Set printer model
						this.printerModel = "micro-3d.stl";
						
						// Set bed dimensions
						bedLowMaxX = 106.0;
						bedLowMinX = -2.0;
						bedLowMaxY = 105.0;
						bedLowMinY = -2.0;
						bedLowMaxZ = 5.0;
						bedLowMinZ = 0.0;
						bedMediumMaxX = 106.0;
						bedMediumMinX = -2.0;
						bedMediumMaxY = 105.0;
						bedMediumMinY = -9.0;
						bedMediumMaxZ = 73.5;
						bedMediumMinZ = bedLowMaxZ;
						bedHighMaxX = 97.0;
						bedHighMinX = 7.0;
						bedHighMaxY = 85.0;
						bedHighMinY = 9.0;
						bedHighMaxZ = 112.0;
						bedHighMinZ = bedMediumMaxZ;
						
						// Set print bed size
						printBedWidth = 121;
						printBedDepth = 119 - bedLowMinY;
						
						// Set bed shape and origin
						this.bedShape = "rectangular";
						this.bedOrigin = "lowerleft";
						
						// Set external bed height
						externalBedHeight = parseFloat(self.settings.settings.plugins.m33fio.ExternalBedHeight());
				
						// Adjust bed bounds to account for external bed
						bedLowMaxZ = 5.0 + externalBedHeight;
						bedLowMinZ = 0.0 + externalBedHeight;
						bedMediumMinZ = bedLowMaxZ;
						bedLowMinY = self.settings.settings.plugins.m33fio.ExpandPrintableRegion() ? bedMediumMinY : -2.0;
						
						// Set extruder center
						extruderCenterX = (bedLowMaxX + bedLowMinX) / 2;
						extruderCenterY = (bedLowMaxY + bedLowMinY + 14.0) / 2;
						
						// Set print bed offset
						printBedOffsetX = 0.0;
						printBedOffsetY = 2.0;
					}
					
					// Otherwise
					else {
					
						// Initialize width, depth, and height
						var width = '';
						var height = '';
						var depth = '';
						var shape = '';
						var origin = '';
					
						// Check if using Cura
						if(slicerName == "cura") {
					
							// Set width, depth, and height
							width = getSlicerProfileValue("machine_width");
							depth = getSlicerProfileValue("machine_depth");
							height = getSlicerProfileValue("machine_height");
							
							// Set shape and origin
							shape = getSlicerProfileValue("machine_shape");
							var machineCenterIsZero = getSlicerProfileValue("machine_center_is_zero");
							if(machineCenterIsZero.length) {
								if(machineCenterIsZero.toLowerCase() == "true")
									origin = "center";
								else {
									shape = "rectangular";
									origin = "lowerleft";
								}
							}
						}
						
						// Otherwise check if using Slic3r
						else if(slicerName == "slic3r") {
						
							// Check if bed size is valid
							var bedSize = getSlicerProfileValue("bed_size");
							var matches = bedSize.match(/(\d+.?\d*)\s*?,\s*?(\d+.?\d*)/);
							if(matches.length == 3) {
							
								// Set width and depth
								width = matches[1];
								depth = matches[2];
							}
						}
						
						// Set default width, depth, and height if not set
						if(!width.length)
							width = self.printerProfile.currentProfileData().volume.width();
						width = parseFloat(width);
						
						if(!depth.length)
							depth = self.printerProfile.currentProfileData().volume.depth();
						depth = parseFloat(depth);
						
						if(!height.length)
							height = self.printerProfile.currentProfileData().volume.height();
						height = parseFloat(height);
						
						// Set default shape and origin if not set
						if(!shape.length)
							shape = self.printerProfile.currentProfileData().volume.formFactor();
						if(shape.toLowerCase() == "circular")
							shape = "circular";
						else
							shape = "rectangular";
						
						if(!origin.length)
							origin = self.printerProfile.currentProfileData().volume.origin();
						if(origin.toLowerCase() == "center")
							origin = "center";
						else {
							shape = "rectangular";
							origin = "lowerleft";
						}
						
						// Make dimensions circular if shape is circular
						if(shape == "circular")
							depth = width;
					
						// Set bed dimensions
						bedLowMaxX = width;
						bedLowMinX = 0.0;
						bedLowMaxY = depth;
						bedLowMinY = 0.0;
						bedLowMaxZ = height;
						bedLowMinZ = 0.0;
						bedMediumMaxX = width;
						bedMediumMinX = 0.0;
						bedMediumMaxY = depth;
						bedMediumMinY = 0.0;
						bedMediumMaxZ = height;
						bedMediumMinZ = bedLowMaxZ;
						bedHighMaxX = width;
						bedHighMinX = 0.0;
						bedHighMaxY = depth;
						bedHighMinY = 0.0;
						bedHighMaxZ = height;
						bedHighMinZ = bedMediumMaxZ;
						
						// Set print bed size
						printBedWidth = width;
						printBedDepth = depth;
						
						// Set bed shape and origin
						this.bedShape = shape;
						this.bedOrigin = origin;
						
						// Set external bed height
						externalBedHeight = 0.0;
						
						//Set extruder center
						extruderCenterX = width / 2;
						extruderCenterY = depth / 2;
						
						// Set print bed offset
						printBedOffsetX = 0.0;
						printBedOffsetY = 0.0;
					}
					
					// Check if using Cura
					if(slicerName == "cura") {
					
						// Set platform adhesion
						this.platformAdhesion = getSlicerProfileValue("platform_adhesion");
						
						// Check if platform adhesion isn't set
						if(!this.platformAdhesion.length || this.platformAdhesion == "None") {
						
							// Check if using a skirt
							var skirtLineCount = getSlicerProfileValue("skirt_line_count");
							if(skirtLineCount.length && parseInt(skirtLineCount) > 0)
								this.adhesionSize = getSlicerProfileValue("skirt_gap");
							
							// Set default platform adhesion
							if(this.adhesionSize === null || !this.adhesionSize.length) {
								this.adhesionSize = 0;
								this.platformAdhesion = "None";
							}
							
							// Otherwise set skirt platform adhesion
							else {
								this.adhesionSize = parseFloat(this.adhesionSize);
								this.platformAdhesion = "Skirt";
							}
						}
					
						// Otherwise
						else {
					
							// Check if platform adhesion is raft
							if(this.platformAdhesion == "Raft") {
						
								// Set adhesion size to raft margin
								this.adhesionSize = getSlicerProfileValue("raft_margin");
								if(!this.adhesionSize.length)
									this.adhesionSize = 5.0;
								else
									this.adhesionSize = parseFloat(this.adhesionSize);
							}
						
							// Otherwise check if platform adhesion is brim
							else if(this.platformAdhesion == "Brim") {
						
								// Set adhesion size to the product of brim line count and bottom thickness
								this.adhesionSize = getSlicerProfileValue("brim_line_count");
								if(!this.adhesionSize.length)
									this.adhesionSize = 20;
								else
									this.adhesionSize = parseFloat(this.adhesionSize);
								
								var bottomThickness = getSlicerProfileValue("bottom_thickness");
								if(!bottomThickness.length)
									this.adhesionSize *= 0.3;
								else
									this.adhesionSize *= parseFloat(bottomThickness);
							}
						}
					}
					
					// Otherwise check if using Slic3r
					else if(slicerName == "slic3r") {
						
						// Check if using a raft
						var raftLayers = getSlicerProfileValue("raft_layers");
						if(raftLayers.length && parseInt(raftLayers) != 0) {
						
							// Set platform adhesion to raft
							this.platformAdhesion = "Raft"
							
							// Set adhesion size
							this.adhesionSize = 5;
						}
						
						// Otherwise
						else {
						
							// Check if using a brim
							var brimWidth = getSlicerProfileValue("brim_width");
							if(brimWidth.length && parseFloat(brimWidth) != 0) {
						
								// Set platform adhesion to skirt
								this.platformAdhesion = "Brim"
								
								// Set adhesion size to brim width
								this.adhesionSize = getSlicerProfileValue("brim_width");
								if(!this.adhesionSize.length)
									this.adhesionSize = 0;
								else
									this.adhesionSize = parseFloat(this.adhesionSize);
							}
							
							// Otherwise
							else {
						
								// Check if using a skirt
								var skirts = getSlicerProfileValue("skirts");
								if(!skirts.length || parseInt(skirts) != 0) {
						
									// Set platform adhesion to skirt
									this.platformAdhesion = "Skirt"
									
									// Set adhesion size to skirt distance
									this.adhesionSize = getSlicerProfileValue("skirt_distance");
									if(!this.adhesionSize.length)
										this.adhesionSize = 6.0;
									else
										this.adhesionSize = parseFloat(this.adhesionSize);
								}
							
								// Otherwise
								else {
							
									// Set default platform adhesion
									this.platformAdhesion = "None";
									this.adhesionSize = 0;
								}
							}
						}
					}
					
					// Otherwise
					else {
					
						// Set default platform adhesion
						this.platformAdhesion = "None";
						this.adhesionSize = 0;
					}
					
					// Set scale lock
					for(var i = 0; i < 3; i++)
						this.scaleLock[i] = false;

					// Create scene
					for(var i = 0; i < 2; i++)
						this.scene[i] = new THREE.Scene();

					// Create camera
					var SCREEN_WIDTH = $("#slicing_configuration_dialog").width(), SCREEN_HEIGHT = $("#slicing_configuration_dialog").height() - 123;
					var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
					this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
					this.scene[0].add(this.camera);
					this.camera.position.set(0, 200, -280);

					// Create renderer
					this.renderer = new THREE.WebGLRenderer({
						antialias: true
					});
					this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
					this.renderer.setClearColor(0xFCFCFC, 1);
					this.renderer.autoClear = false;

					// Create controls
					this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
					this.orbitControls.target.set(0, bedHighMaxZ / 2 + externalBedHeight, 0);
					this.orbitControls.minDistance = (bedHighMaxZ - bedLowMinZ) * 1.43;
					this.orbitControls.maxDistance = (bedHighMaxZ - bedLowMinZ) * 5.35;
					this.orbitControls.minPolarAngle = 0;
					this.orbitControls.maxPolarAngle = THREE.Math.degToRad(100);
					this.orbitControls.enablePan = false;
	
					this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement);
					this.transformControls.space = "world";
					this.transformControls.setAllowedTranslation("XZ");
					this.transformControls.setRotationDisableE(true);
					this.scene[0].add(this.transformControls);

					// Create lights
					this.scene[0].add(new THREE.AmbientLight(0x444444));
					this.scene[1].add(new THREE.AmbientLight(0x444444));
					var dirLight = new THREE.DirectionalLight(0xFFFFFF);
					dirLight.position.set(200, 200, 1000).normalize();
					this.camera.add(dirLight);
					this.camera.add(dirLight.target);
					
					// Check if a printer model is available
					if(this.printerModel !== null) {
					
						// Set camera focus
						this.camera.position.set(0, 50, -380);
					
						// Check if bed shape is rectangular
						if(this.bedShape == "rectangular") {
					
							// Create print bed
							var mesh = new THREE.Mesh(new THREE.CubeGeometry(printBedWidth, printBedDepth, bedLowMinZ), new THREE.MeshBasicMaterial({
								color: 0x000000,
								side: THREE.DoubleSide
							}));
						
							mesh.rotation.set(Math.PI / 2, 0, 0);
						}
					
						// Otherwise
						else
					
							// Create print bed
							var mesh = new THREE.Mesh(new THREE.CylinderGeometry(printBedWidth / 2, printBedWidth / 2, bedLowMinZ, 200), new THREE.MeshBasicMaterial({
								color: 0x000000,
								side: THREE.DoubleSide
							}));
					
						// Position print bed
						mesh.position.set(printBedOffsetX, -0.50 + bedLowMinZ / 2, (bedLowMinY + printBedOffsetY) / 2);
						mesh.renderOrder = 4;
				
						// Add print bed to scene
						modelEditor.scene[0].add(mesh);
					}
					
					// Create grid
					this.grid = createGrid(bedLowMaxX - bedLowMinX, bedLowMaxY - bedLowMinY, this.bedShape, this.bedOrigin);
					this.grid.position.set(extruderCenterX - (bedLowMaxX + bedLowMinX) / 2 + bedLowMinX, -0.25 + bedLowMinZ, -(extruderCenterY - (bedLowMaxY + bedLowMinY) / 2 + bedLowMinY));
					this.grid.renderOrder = 4;
					this.grid.visible = this.printerModel !== null ? this.showGrid : true;
					
					// Add grid to scene
					modelEditor.scene[0].add(this.grid);
					
					// Create axis material
					var axisMaterial = new THREE.LineBasicMaterial({
						side: THREE.FrontSide,
						linewidth: 2
					});
				
					// Create axis geometry
					var axisGeometry = new THREE.Geometry();
					axisGeometry.vertices.push(new THREE.Vector3(printBedWidth / 2 - 0.05, 0.05, -printBedDepth / 2 + 0.05));
					axisGeometry.vertices.push(new THREE.Vector3(printBedWidth / 2 - 0.05, 0.05, -printBedDepth / 2 + 0.05));
				
					// Create X axis
					this.axes[0] = new THREE.Line(axisGeometry.clone(), axisMaterial.clone());
					this.axes[0].geometry.vertices[1].x -= 20;
					this.axes[0].position.set(printBedOffsetX, -0.35 + bedLowMinZ, (bedLowMinY + printBedOffsetY) / 2);
					this.axes[0].material.color.setHex(0xFF0000);
					
					// Create Y axis
					this.axes[1] = new THREE.Line(axisGeometry.clone(), axisMaterial.clone());
					this.axes[1].geometry.vertices[1].y += 20;
					this.axes[1].position.set(printBedOffsetX, -0.35 + bedLowMinZ, (bedLowMinY + printBedOffsetY) / 2);
					this.axes[1].material.color.setHex(0x00FF00);
					
					// Create Z axis
					this.axes[2] = new THREE.Line(axisGeometry.clone(), axisMaterial.clone());
					this.axes[2].geometry.vertices[1].z += 20;
					this.axes[2].position.set(printBedOffsetX, -0.35 + bedLowMinZ, (bedLowMinY + printBedOffsetY) / 2);
					this.axes[2].material.color.setHex(0x0000FF);
					
					// Go through all axes
					for(var i = 0; i < this.axes.length; i++) {
				
						// Add axis to scene
						this.axes[i].visible = this.showAxes;
						this.scene[1].add(this.axes[i]);
					}
					
					// Check if a printer model is available
					if(this.printerModel !== null) {

						// Load printer model
						var loader = new THREE.STLLoader();
						loader.load(PLUGIN_BASEURL + "m33fio/static/models/" + this.printerModel, function(geometry) {
					
							// Create printer's mesh
							var mesh = new THREE.Mesh(geometry, printerMaterials[modelEditorPrinterColor]);
	
							// Set printer's orientation
							mesh.rotation.set(3 * Math.PI / 2, 0, Math.PI);
							mesh.position.set(0, 53.35, 0);
							mesh.scale.set(1.233792, 1.236112, 1.233333);
							mesh.renderOrder = 3;
		
							// Append model to list
							modelEditor.models.push({
								mesh: mesh,
								type: "stl",
								glow: null,
								adhesion: null
							});
	
							// Add printer to scene
							modelEditor.scene[0].add(mesh);
					
							// Load logo
							var loader = new THREE.TextureLoader();
							loader.load(PLUGIN_BASEURL + "m33fio/static/img/logo.png", function(map) {
					
								// Create logo
								var mesh = new THREE.Mesh(new THREE.PlaneGeometry(51.5, 12), new THREE.MeshBasicMaterial({
									map: map,
									color: 0xFFFFFF,
									side: THREE.FrontSide,
									transparent: true
								}));
								mesh.position.set(0, -22.85, -92.8);
								mesh.rotation.set(0, -Math.PI, 0);
								mesh.renderOrder = 4;
						
								// Add logo to scene
								modelEditor.scene[0].add(mesh);
			
								// Render
								modelEditor.render();
				
								// Import model
								modelEditor.importModel(file, "stl");
							});
						});
					}
					
					// Otherwise
					else {
					
						// Append empty model to list
						modelEditor.models.push({
							mesh: null,
							type: null,
							glow: null,
							adhesion: null
						});
					
						// Import model
						modelEditor.importModel(file, "stl");
					}
			
					// Create measurement material
					var measurementMaterial = new THREE.LineBasicMaterial({
						color: 0xFF00FF,
						side: THREE.FrontSide,
						linewidth: 2
					});
		
					// Create measurement geometry
					var measurementGeometry = new THREE.Geometry();
					measurementGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
					measurementGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
		
					// Create measurements
					for(var i = 0; i < 3; i++)
						this.measurements[i] = [];
		
					// Width measurement
					this.measurements[0][0] = new THREE.Line(measurementGeometry.clone(), measurementMaterial);
					this.measurements[0][1] = new THREE.Vector3();
		
					// Depth measurement
					this.measurements[1][0] = new THREE.Line(measurementGeometry.clone(), measurementMaterial);
					this.measurements[1][1] = new THREE.Vector3();
		
					// Height measurement
					this.measurements[2][0] = new THREE.Line(measurementGeometry.clone(), measurementMaterial);
					this.measurements[2][1] = new THREE.Vector3();
		
					// Go through all measurements
					for(var i = 0; i < this.measurements.length; i++) {
		
						// Add measurements to scene
						this.measurements[i][0].visible = false;
						this.scene[1].add(this.measurements[i][0]);
					}
					
					// Create boundary material
					var boundaryMaterial = new THREE.MeshLambertMaterial({
						color: 0x00FF00,
						transparent: true,
						opacity: 0.2,
						side: THREE.DoubleSide,
						depthWrite: false
					});
					
					// Check if bed shape is rectangular
					if(this.bedShape == "rectangular") {
		
						// Low bottom boundary
						this.boundaries[0] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[0].geometry.vertices[0].set(-bedLowMinX, bedLowMinZ - 0.25, bedLowMinY);
						this.boundaries[0].geometry.vertices[1].set(-bedLowMaxX, bedLowMinZ - 0.25, bedLowMinY);
						this.boundaries[0].geometry.vertices[2].set(-bedLowMinX, bedLowMinZ - 0.25, bedLowMaxY);
						this.boundaries[0].geometry.vertices[3].set(-bedLowMaxX, bedLowMinZ - 0.25, bedLowMaxY);
		
						// Low front boundary
						this.boundaries[1] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[1].geometry.vertices[0].set(-bedLowMinX, bedLowMinZ - 0.25, bedLowMinY);
						this.boundaries[1].geometry.vertices[1].set(-bedLowMaxX, bedLowMinZ - 0.25, bedLowMinY);
						this.boundaries[1].geometry.vertices[2].set(-bedLowMinX, bedLowMaxZ, bedLowMinY);
						this.boundaries[1].geometry.vertices[3].set(-bedLowMaxX, bedLowMaxZ, bedLowMinY);
		
						// Low back boundary
						this.boundaries[2] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[2].geometry.vertices[0].set(-bedLowMinX, bedLowMinZ - 0.25, bedLowMaxY);
						this.boundaries[2].geometry.vertices[1].set(-bedLowMaxX, bedLowMinZ - 0.25, bedLowMaxY);
						this.boundaries[2].geometry.vertices[2].set(-bedLowMinX, bedLowMaxZ, bedLowMaxY);
						this.boundaries[2].geometry.vertices[3].set(-bedLowMaxX, bedLowMaxZ, bedLowMaxY);
		
						// Low right boundary
						this.boundaries[3] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[3].geometry.vertices[0].set(-bedLowMaxX, bedLowMinZ - 0.25, bedLowMinY);
						this.boundaries[3].geometry.vertices[1].set(-bedLowMaxX, bedLowMinZ - 0.25, bedLowMaxY);
						this.boundaries[3].geometry.vertices[2].set(-bedLowMaxX, bedLowMaxZ, bedLowMinY);
						this.boundaries[3].geometry.vertices[3].set(-bedLowMaxX, bedLowMaxZ, bedLowMaxY);
		
						// Low left boundary
						this.boundaries[4] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[4].geometry.vertices[0].set(-bedLowMinX, bedLowMinZ - 0.25, bedLowMinY);
						this.boundaries[4].geometry.vertices[1].set(-bedLowMinX, bedLowMinZ - 0.25, bedLowMaxY);
						this.boundaries[4].geometry.vertices[2].set(-bedLowMinX, bedLowMaxZ, bedLowMinY);
						this.boundaries[4].geometry.vertices[3].set(-bedLowMinX, bedLowMaxZ, bedLowMaxY);
		
						// Medium front boundary
						this.boundaries[5] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[5].geometry.vertices[0].set(-bedMediumMinX, bedMediumMinZ, bedMediumMinY);
						this.boundaries[5].geometry.vertices[1].set(-bedMediumMaxX, bedMediumMinZ, bedMediumMinY);
						this.boundaries[5].geometry.vertices[2].set(-bedMediumMinX, bedMediumMaxZ, bedMediumMinY);
						this.boundaries[5].geometry.vertices[3].set(-bedMediumMaxX, bedMediumMaxZ, bedMediumMinY);
		
						// Medium back boundary
						this.boundaries[6] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[6].geometry.vertices[0].set(-bedMediumMinX, bedMediumMinZ, bedMediumMaxY);
						this.boundaries[6].geometry.vertices[1].set(-bedMediumMaxX, bedMediumMinZ, bedMediumMaxY);
						this.boundaries[6].geometry.vertices[2].set(-bedMediumMinX, bedMediumMaxZ, bedMediumMaxY);
						this.boundaries[6].geometry.vertices[3].set(-bedMediumMaxX, bedMediumMaxZ, bedMediumMaxY);
		
						// Medium right boundary
						this.boundaries[7] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[7].geometry.vertices[0].set(-bedMediumMaxX, bedMediumMinZ, bedMediumMinY);
						this.boundaries[7].geometry.vertices[1].set(-bedMediumMaxX, bedMediumMinZ, bedMediumMaxY);
						this.boundaries[7].geometry.vertices[2].set(-bedMediumMaxX, bedMediumMaxZ, bedMediumMinY);
						this.boundaries[7].geometry.vertices[3].set(-bedMediumMaxX, bedMediumMaxZ, bedMediumMaxY);
		
						// Medium left boundary
						this.boundaries[8] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[8].geometry.vertices[0].set(-bedMediumMinX, bedMediumMinZ, bedMediumMinY);
						this.boundaries[8].geometry.vertices[1].set(-bedMediumMinX, bedMediumMinZ, bedMediumMaxY);
						this.boundaries[8].geometry.vertices[2].set(-bedMediumMinX, bedMediumMaxZ, bedMediumMinY);
						this.boundaries[8].geometry.vertices[3].set(-bedMediumMinX, bedMediumMaxZ, bedMediumMaxY);
		
						// High front boundary
						this.boundaries[9] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[9].geometry.vertices[0].set(-bedHighMinX, bedHighMinZ, bedHighMinY);
						this.boundaries[9].geometry.vertices[1].set(-bedHighMaxX, bedHighMinZ, bedHighMinY);
						this.boundaries[9].geometry.vertices[2].set(-bedHighMinX, bedHighMaxZ, bedHighMinY);
						this.boundaries[9].geometry.vertices[3].set(-bedHighMaxX, bedHighMaxZ, bedHighMinY);
		
						// High back boundary
						this.boundaries[10] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[10].geometry.vertices[0].set(-bedHighMinX, bedHighMinZ, bedHighMaxY);
						this.boundaries[10].geometry.vertices[1].set(-bedHighMaxX, bedHighMinZ, bedHighMaxY);
						this.boundaries[10].geometry.vertices[2].set(-bedHighMinX, bedHighMaxZ, bedHighMaxY);
						this.boundaries[10].geometry.vertices[3].set(-bedHighMaxX, bedHighMaxZ, bedHighMaxY);
		
						// High right boundary
						this.boundaries[11] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[11].geometry.vertices[0].set(-bedHighMaxX, bedHighMinZ, bedHighMinY);
						this.boundaries[11].geometry.vertices[1].set(-bedHighMaxX, bedHighMinZ, bedHighMaxY);
						this.boundaries[11].geometry.vertices[2].set(-bedHighMaxX, bedHighMaxZ, bedHighMinY);
						this.boundaries[11].geometry.vertices[3].set(-bedHighMaxX, bedHighMaxZ, bedHighMaxY);
		
						// High left boundary
						this.boundaries[12] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[12].geometry.vertices[0].set(-bedHighMinX, bedHighMinZ, bedHighMinY);
						this.boundaries[12].geometry.vertices[1].set(-bedHighMinX, bedHighMinZ, bedHighMaxY);
						this.boundaries[12].geometry.vertices[2].set(-bedHighMinX, bedHighMaxZ, bedHighMinY);
						this.boundaries[12].geometry.vertices[3].set(-bedHighMinX, bedHighMaxZ, bedHighMaxY);
		
						// High top boundary
						this.boundaries[13] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[13].geometry.vertices[0].set(-bedHighMinX, bedHighMaxZ, bedHighMinY);
						this.boundaries[13].geometry.vertices[1].set(-bedHighMaxX, bedHighMaxZ, bedHighMinY);
						this.boundaries[13].geometry.vertices[2].set(-bedHighMinX, bedHighMaxZ, bedHighMaxY);
						this.boundaries[13].geometry.vertices[3].set(-bedHighMaxX, bedHighMaxZ, bedHighMaxY);
		
						// Low front to medium front connector boundary
						this.boundaries[14] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[14].geometry.vertices[0].set(-bedLowMinX, bedLowMaxZ, bedLowMinY);
						this.boundaries[14].geometry.vertices[1].set(-bedLowMaxX, bedLowMaxZ, bedLowMinY);
						this.boundaries[14].geometry.vertices[2].set(-bedMediumMinX, bedMediumMinZ, bedMediumMinY);
						this.boundaries[14].geometry.vertices[3].set(-bedMediumMaxX, bedMediumMinZ, bedMediumMinY);
		
						// Low back to medium back connector boundary
						this.boundaries[15] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[15].geometry.vertices[0].set(-bedLowMinX, bedLowMaxZ, bedLowMaxY);
						this.boundaries[15].geometry.vertices[1].set(-bedLowMaxX, bedLowMaxZ, bedLowMaxY);
						this.boundaries[15].geometry.vertices[2].set(-bedMediumMinX, bedMediumMinZ, bedMediumMaxY);
						this.boundaries[15].geometry.vertices[3].set(-bedMediumMaxX, bedMediumMinZ, bedMediumMaxY);
		
						// Low right to medium right connector boundary
						this.boundaries[16] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[16].geometry.vertices[0].set(-bedLowMaxX, bedLowMaxZ, bedLowMinY);
						this.boundaries[16].geometry.vertices[1].set(-bedLowMaxX, bedLowMaxZ, bedLowMaxY);
						this.boundaries[16].geometry.vertices[2].set(-bedMediumMaxX, bedMediumMinZ, bedMediumMinY);
						this.boundaries[16].geometry.vertices[3].set(-bedMediumMaxX, bedMediumMinZ, bedMediumMaxY);
		
						// Low left to medium left connector boundary
						this.boundaries[17] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[17].geometry.vertices[0].set(-bedLowMinX, bedLowMaxZ, bedLowMinY);
						this.boundaries[17].geometry.vertices[1].set(-bedLowMinX, bedLowMaxZ, bedLowMaxY);
						this.boundaries[17].geometry.vertices[2].set(-bedMediumMinX, bedMediumMinZ, bedMediumMinY);
						this.boundaries[17].geometry.vertices[3].set(-bedMediumMinX, bedMediumMinZ, bedMediumMaxY);
		
						// Medium front to high front connector boundary
						this.boundaries[18] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[18].geometry.vertices[0].set(-bedMediumMinX, bedMediumMaxZ, bedMediumMinY);
						this.boundaries[18].geometry.vertices[1].set(-bedMediumMaxX, bedMediumMaxZ, bedMediumMinY);
						this.boundaries[18].geometry.vertices[2].set(-bedHighMinX, bedHighMinZ, bedHighMinY);
						this.boundaries[18].geometry.vertices[3].set(-bedHighMaxX, bedHighMinZ, bedHighMinY);
		
						// Medium back to high back connector boundary
						this.boundaries[19] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[19].geometry.vertices[0].set(-bedMediumMinX, bedMediumMaxZ, bedMediumMaxY);
						this.boundaries[19].geometry.vertices[1].set(-bedMediumMaxX, bedMediumMaxZ, bedMediumMaxY);
						this.boundaries[19].geometry.vertices[2].set(-bedHighMinX, bedHighMinZ, bedHighMaxY);
						this.boundaries[19].geometry.vertices[3].set(-bedHighMaxX, bedHighMinZ, bedHighMaxY);
		
						// Medium right to high right connector boundary
						this.boundaries[20] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[20].geometry.vertices[0].set(-bedMediumMaxX, bedMediumMaxZ, bedMediumMinY);
						this.boundaries[20].geometry.vertices[1].set(-bedMediumMaxX, bedMediumMaxZ, bedMediumMaxY);
						this.boundaries[20].geometry.vertices[2].set(-bedHighMaxX, bedHighMinZ, bedHighMinY);
						this.boundaries[20].geometry.vertices[3].set(-bedHighMaxX, bedHighMinZ, bedHighMaxY);
		
						// Medium left to high left connector boundary
						this.boundaries[21] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
						this.boundaries[21].geometry.vertices[0].set(-bedMediumMinX, bedMediumMaxZ, bedMediumMinY);
						this.boundaries[21].geometry.vertices[1].set(-bedMediumMinX, bedMediumMaxZ, bedMediumMaxY);
						this.boundaries[21].geometry.vertices[2].set(-bedHighMinX, bedHighMinZ, bedHighMinY);
						this.boundaries[21].geometry.vertices[3].set(-bedHighMinX, bedHighMinZ, bedHighMaxY);
					}
					
					// Otherwise
					else {
					
						// Bottom boundary
						this.boundaries[0] = new THREE.Mesh(new THREE.CircleGeometry(printBedWidth / 2, 200), boundaryMaterial.clone());
						this.boundaries[0].position.set(-printBedWidth / 2, bedLowMinZ - 0.25, printBedDepth / 2);
						this.boundaries[0].rotation.set(-Math.PI / 2, 0, 0);
					
						// Side boundary
						this.boundaries[1] = new THREE.Mesh(new THREE.CylinderGeometry(printBedWidth / 2, printBedWidth / 2, bedHighMaxZ - bedLowMinZ + 0.50, 200, 1, true), boundaryMaterial.clone());
						this.boundaries[1].position.set(-printBedWidth / 2, (bedHighMaxZ - bedLowMinZ) / 2 - 0.25, printBedDepth / 2);
						
						// Top boundary
						this.boundaries[2] = new THREE.Mesh(new THREE.CircleGeometry(printBedWidth / 2, 200), boundaryMaterial.clone());
						this.boundaries[2].position.set(-printBedWidth / 2, bedHighMaxZ, printBedDepth / 2);
						this.boundaries[2].rotation.set(-Math.PI / 2, 0, 0);
					}
		
					// Go through all boundaries
					for(var i = 0; i < this.boundaries.length; i++) {
		
						// Add boundaries to scene
						this.boundaries[i].geometry.computeFaceNormals();
						this.boundaries[i].geometry.computeVertexNormals();
						this.boundaries[i].position.x += extruderCenterX;
						this.boundaries[i].position.z -= extruderCenterY;
						this.boundaries[i].visible = this.showBoundaries;
						
						// Don't add bottom boundary to scene
						if(i)
							this.scene[0].add(this.boundaries[i]);
					}
		
					// Render
					modelEditor.render();
		
					// Enable events
					this.transformControls.addEventListener("mouseDown", this.startTransform);
					this.transformControls.addEventListener("mouseUp", this.endTransform);
					this.transformControls.addEventListener("mouseUp", this.fixModelY);
					this.transformControls.addEventListener("change", this.updateModelChanges);
					this.transformControls.addEventListener("change", this.render);
					this.orbitControls.addEventListener("change", this.render);
					$(document).on("mousedown.modelEditor", this.mouseDownEvent);
					$(window).on("resize.modelEditor", this.resizeEvent);
					$(window).on("keydown.modelEditor", this.keyDownEvent);
					$(window).on("keyup.modelEditor", this.keyUpEvent);
				},
	
				// Start transform
				startTransform: function() {
		
					// Save matrix
					modelEditor.savedMatrix = modelEditor.transformControls.object.matrix.clone();
	
					// Blur input
					$("#slicing_configuration_dialog .modal-extra div.values input").blur();
	
					// Disable orbit controls
					modelEditor.orbitControls.enabled = false;
				},
	
				// End transform
				endTransform: function() {
		
					// Clear saved matrix
					modelEditor.savedMatrix = null;
	
					// Enable orbit controls
					modelEditor.orbitControls.enabled = true;
				},

				// Import model
				importModel: function(file, type) {

					// Clear model loaded
					modelEditor.modelLoaded = false;
	
					// Set loader
					if(type == "stl")
						var loader = new THREE.STLLoader();
					else if(type == "obj")
						var loader = new THREE.OBJLoader();
					else if(type == "m3d")
						var loader = new THREE.M3DLoader();
					else if(type == "amf")
						var loader = new THREE.AMFLoader();
					else if(type == "wrl")
						var loader = new THREE.VRMLLoader();
					else if(type == "dae")
						var loader = new THREE.ColladaLoader();
					else if(type == "3mf")
						var loader = new THREE.ThreeMFLoader();
					else {
						modelEditor.modelLoaded = true;
						return;
					}

					// Load model
					loader.load(file, function(geometry) {

						// Center model
						geometry.center();

						// Create model's mesh
						var mesh = new THREE.Mesh(geometry, filamentMaterials[modelEditorFilamentColor]);

						// Set model's orientation
						if(type == "stl")
							mesh.rotation.set(3 * Math.PI / 2, 0, Math.PI);
						else if(type == "obj")
							mesh.rotation.set(0, 0, 0);
						else if(type == "m3d")
							mesh.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
						else if(type == "amf")
							mesh.rotation.set(0, 0, 0);
						else if(type == "wrl")
							mesh.rotation.set(0, 0, 0);
						else if(type == "dae")
							mesh.rotation.set(0, 0, 0);
						else if(type == "3mf")
							mesh.rotation.set(-Math.PI / 2, 0, Math.PI);
						mesh.updateMatrix();
						mesh.geometry.applyMatrix(mesh.matrix);
						mesh.position.set(0, 0, 0);
						mesh.rotation.set(0, 0, 0);
						mesh.scale.set(1, 1, 1);
						mesh.renderOrder = 0;

						// Add model to scene
						modelEditor.scene[0].add(mesh);
		
						// Append model to list
						modelEditor.models.push({
							mesh: mesh,
							type: type,
							glow: null,
							adhesion: modelEditor.createPlatformAdhesion(mesh)
						});
					
						// Select model
						modelEditor.removeSelection();
						modelEditor.selectModel(mesh);

						// Fix model's Y
						modelEditor.fixModelY();
			
						// Set model loaded
						modelEditor.modelLoaded = true;
					});
				},
				
				// Create platform adhesion
				createPlatformAdhesion: function(mesh) {
				
					// Check if using platform adhesion
					if(modelEditor.platformAdhesion != "None") {
					
						// Create adhesion mesh
						var adhesionMesh = new THREE.Mesh(mesh.geometry.clone(), filamentMaterials[modelEditorFilamentColor]);

						// Add adhesion to scene
						modelEditor.scene[0].add(adhesionMesh);
						
						// Return adhesion mesh
						return {mesh: adhesionMesh, glow: null, geometry: adhesionMesh.geometry.clone()};
					}
					
					// Return null
					return null;
				},

				// Key down event
				keyDownEvent: function(event) {
	
					// Check if an input is not focused
					if(!$("input:focus").length) {

						// Check what key was pressed
						switch(event.which) {
					
							// Check if A is pressed
							case "A".charCodeAt(0) :
				
								// Check if ctrl is pressed
								if(event.ctrlKey) {
						
									// Prevent default action
									event.preventDefault();
									
									// Check if not cutting models
									if(modelEditor.cutShape === null) {
							
										// Get currently selected model
										var current = modelEditor.transformControls.object;
							
										// Go through all models
										for(var i = 1; i < modelEditor.models.length; i++)
							
											// Check if not currently selected model
											if(modelEditor.models[i].mesh !== current)
							
												// Select first model
												modelEditor.selectModel(modelEditor.models[i].mesh);
							
										// Select currently selected model
										if(current)
											modelEditor.selectModel(current);
							
										// Render
										modelEditor.render();
									}
								}
							break;
	
							// Check if tab was pressed
							case "\t".charCodeAt(0) :
		
								// Prevent default action
								event.preventDefault();
								
								// Check if tab isn't already pressed
								if(modelEditor.allowTab) {
								
									// Clear allow tab
									modelEditor.allowTab = false;
								
									// Check if not cutting models
									if(modelEditor.cutShape === null) {
	
										// Check if an object is selected
										if(modelEditor.transformControls.object) {
		
											// Go through all models
											for(var i = 1; i < modelEditor.models.length; i++)
			
												// Check if model is currently selected
												if(modelEditor.models[i].mesh == modelEditor.transformControls.object) {
								
													// Check if shift isn't pressed
													if(!event.shiftKey)
									
														// Remove selection
														modelEditor.removeSelection();
								
													// Check if model isn't the last one
													if(i != modelEditor.models.length - 1)
									
														// Select next model
														modelEditor.selectModel(modelEditor.models[i + 1].mesh);
									
													// Otherwise
													else
									
														// Select first model
														modelEditor.selectModel(modelEditor.models[1].mesh);
					
													// Break
													break;
												}
										}
				
										// Otherwise check if a model exists
										else if(modelEditor.models.length > 1)
			
											// Select first model
											modelEditor.selectModel(modelEditor.models[1].mesh);
									
										// Render
										modelEditor.render();
									}
								
									// Otherwise
									else {
								
										// Check if cut chape is a cube
										if(modelEditor.cutShape.geometry.type == "BoxGeometry")
									
											// Change cut shape to a sphere
											modelEditor.setCutShape("sphere");
									
										// Otherwise check if cut shape is a sphere
										else if(modelEditor.cutShape.geometry.type == "SphereGeometry")
									
											// Change cut shape to a sube
											modelEditor.setCutShape("cube");
									}
								}
							break;
	
							// Check if delete was pressed
							case "\x2E".charCodeAt(0) :
		
								// Check if an object is selected
								if(modelEditor.transformControls.object)
			
									// Delete model
									modelEditor.deleteModel();
							break;
			
		
							// Check if shift was pressed
							case "\x10".charCodeAt(0) :
		
								// Enable grid and rotation snap
								modelEditor.enableSnap();
							break;

							// Check if W was pressed
							case "W".charCodeAt(0) :
	
								// Set selection mode to translate
								modelEditor.setMode("translate");
							break;
	
							// Check if E was pressed
							case "E".charCodeAt(0) :
	
								// Set selection mode to rotate
								modelEditor.setMode("rotate");
							break;
	
							// Check if R was pressed
							case "R".charCodeAt(0) :
	
								// Set selection mode to scale
								modelEditor.setMode("scale");
							break;
						
							// Check if enter was pressed
							case "\r".charCodeAt(0) :
						
								// Check if cutting models
								if(modelEditor.cutShape !== null)
							
									// Apply cut
									modelEditor.applyCut();
							break;
						}
					}
				},

				// Key up event
				keyUpEvent: function(event) {

					// Check what key was pressed
					switch(event.which) {
					
						// Check if tab was released
						case "\t".charCodeAt(0) :
						
							// Set allow tab
							modelEditor.allowTab = true;
						break;
		
						// Check if shift was released
						case "\x10".charCodeAt(0) :
		
							// Disable grid and rotation snap
							modelEditor.disableSnap();
						break;
					}
				},

				// Mouse down event
				mouseDownEvent: function(event) {

					// Check if not in cutting models, clicking inside the model editor, and not clicking on a button or input
					if(modelEditor.cutShape === null && $(event.target).closest(".modal-extra").length && !$(event.target).is("button, img, input")) {

						// Initialize variables
						var raycaster = new THREE.Raycaster();
						var mouse = new THREE.Vector2();
						var offset = $(modelEditor.renderer.domElement).offset();
	
						// Set mouse coordinates
						mouse.x = ((event.clientX - offset.left) / modelEditor.renderer.domElement.clientWidth) * 2 - 1;
						mouse.y = - ((event.clientY - offset.top) / modelEditor.renderer.domElement.clientHeight) * 2 + 1;
	
						// Set ray caster's perspective
						raycaster.setFromCamera(mouse, modelEditor.camera);
	
						// Get models' meshes
						var modelMeshes = []
						for(var i = 0; i < modelEditor.models.length; i++) {
							if(modelEditor.models[i].mesh !== null)
								modelMeshes.push(modelEditor.models[i].mesh);
							if(modelEditor.models[i].adhesion !== null)
								modelMeshes.push(modelEditor.models[i].adhesion.mesh);
						}
	
						// Get objects that intersect ray caster
						var intersects = raycaster.intersectObjects(modelMeshes); 
	
						// Check if an object intersects and it's not the printer
						if(intersects.length > 0 && intersects[0].object != modelEditor.models[0].mesh) {
				
							// Check if ctrl is pressed
							if(event.ctrlKey) {
					
								// Go through all models
								for(var i = 0; i < modelEditor.models.length; i++)
						
									// Check if model was selected
									if(modelEditor.models[i].mesh == intersects[0].object || (modelEditor.models[i].adhesion !== null && modelEditor.models[i].adhesion.mesh == intersects[0].object)) {
							
										// Set model's color
										modelEditor.models[i].mesh.material = filamentMaterials[modelEditorFilamentColor];
										
										// Set adhesion's color
										if(modelEditor.models[i].adhesion !== null) {
											modelEditor.models[i].adhesion.mesh.material = filamentMaterials[modelEditorFilamentColor];
											modelEditor.scene[1].remove(modelEditor.models[i].adhesion.glow);
											modelEditor.models[i].adhesion.glow = null;
										}
		
										// Remove glow
										modelEditor.scene[1].remove(modelEditor.models[i].glow);
										modelEditor.models[i].glow = null;
			
										// Remove selection and select new model
										if(modelEditor.models[i].mesh == modelEditor.transformControls.object) {
											modelEditor.transformControls.detach();
											for(var j = 0; j < modelEditor.models.length; j++)
												if(modelEditor.models[j].glow && j != i)
													modelEditor.selectModel(modelEditor.models[j].mesh)
										}
								
										// Update model changes
										modelEditor.updateModelChanges();
								
										// Break;
										break;
									}
							}
					
							// Otherwise
							else {
				
								// Check if shift isn't pressed
								if(!event.shiftKey)
				
									// Remove selection
									modelEditor.removeSelection();
								
								// Go through all models
								for(var i = 0; i < modelEditor.models.length; i++)
						
									// Check if model was selected
									if(modelEditor.models[i].mesh == intersects[0].object || (modelEditor.models[i].adhesion !== null && modelEditor.models[i].adhesion.mesh == intersects[0].object))
				
										// Select object
										modelEditor.selectModel(modelEditor.models[i].mesh);
							}
						}
	
						// Otherwise
						else {
			
							// Set remove selection interval
							modelEditor.removeSelectionTimeout = setTimeout(function() {
							
								// Disable event
								$(document).off("mousemove.modelEditor");
				
								// Remove selection
								modelEditor.removeSelection();
					
								// Render
								modelEditor.render();
							}, 125);
							
							// Enable event
							$(document).off("mousemove.modelEditor").on("mousemove.modelEditor", modelEditor.stopRemoveSelectionTimeout);
						}
			
						// Render
						modelEditor.render();
					}
				},
		
				// Stop remove selection timeout
				stopRemoveSelectionTimeout: function() {
				
					// Disable event
					$(document).off("mousemove.modelEditor");
	
					// Clear remove selection timeout
					clearTimeout(modelEditor.removeSelectionTimeout);
				},
	
				// Enable snap
				enableSnap: function() {
	
					// Enable grid and rotation snap
					modelEditor.transformControls.setTranslationSnap(5);
					modelEditor.transformControls.setScaleSnap(0.05);
					modelEditor.transformControls.setRotationSnap(THREE.Math.degToRad(15));
					$("#slicing_configuration_dialog .modal-extra button.snap").addClass("disabled");
				},
	
				// Disable snap
				disableSnap: function() {
	
					// Disable grid and rotation snap
					modelEditor.transformControls.setTranslationSnap(null);
					modelEditor.transformControls.setScaleSnap(null);
					modelEditor.transformControls.setRotationSnap(null);
					$("#slicing_configuration_dialog .modal-extra button.snap").removeClass("disabled");
				},
	
				// Set mode
				setMode: function(mode) {
	
					switch(mode) {
		
						// Check if translate mode
						case "translate" :
			
							// Set selection mode to translate
							modelEditor.transformControls.setMode("translate");
							modelEditor.transformControls.space = "world";
						break;
			
						// Check if rotate mode
						case "rotate" :
			
							// Set selection mode to rotate
							modelEditor.transformControls.setMode("rotate");
							modelEditor.transformControls.space = "local";
						break;
			
						// Check if scale mode
						case "scale" :
			
							// Set selection mode to scale
							modelEditor.transformControls.setMode("scale");
							modelEditor.transformControls.space = "local";
						break;
					}
		
					// Render
					modelEditor.render();
				},

				// Resize event
				resizeEvent: function() {

					// Update camera
					modelEditor.camera.aspect = $("#slicing_configuration_dialog").width() / ($("#slicing_configuration_dialog").height() - 123);
					modelEditor.camera.updateProjectionMatrix();
					modelEditor.renderer.setSize($("#slicing_configuration_dialog").width(), $("#slicing_configuration_dialog").height() - 123);
		
					// Render
					modelEditor.render();
				},

				// Export scene
				exportScene: function() {
			
					// Clear scene exported
					modelEditor.sceneExported = false;

					// Initialize variables
					var centerX = ((modelEditor.bedOrigin == "lowerleft" ? bedLowMaxX - bedLowMinX : 0) + (-(extruderCenterX - (bedLowMaxX + bedLowMinX) / 2) + bedLowMinX) * 2) / 2;
					var centerZ = ((modelEditor.bedOrigin == "lowerleft" ? bedLowMaxY - bedLowMinY : 0) + (extruderCenterY - (bedLowMaxY + bedLowMinY) / 2 + bedLowMinY) * 2) / 2;
					var mergedGeometry = new THREE.Geometry();
				
					// Go through all models
					for(var i = 1; i < modelEditor.models.length; i++) {
	
						// Get current model
						var model = modelEditor.models[i];

						// Sum model's center together
						centerX -= model.mesh.position.x;
						centerZ += model.mesh.position.z;

						// Save model's current matrix and geometry
						model.mesh.updateMatrix();
						var matrix = model.mesh.matrix.clone();
						var geometry = model.mesh.geometry.clone();
					
						// Set model's orientation
						geometry.applyMatrix(matrix);
						model.mesh.position.set(0, 0, 0);
						if(model.type == "stl")
							model.mesh.rotation.set(3 * Math.PI / 2, 0, Math.PI);
						else if(model.type == "obj")
							model.mesh.rotation.set(Math.PI / 2, Math.PI, 0);
						else if(model.type == "m3d")
							model.mesh.rotation.set(Math.PI / 2, Math.PI, 0);
						else if(model.type == "amf")
							model.mesh.rotation.set(-Math.PI / 2, 0, Math.PI);
						else if(model.type == "wrl")
							model.mesh.rotation.set(-Math.PI / 2, 0, Math.PI);
						else if(model.type == "dae")
							model.mesh.rotation.set(-Math.PI / 2, 0, Math.PI);
						else if(model.type == "3mf")
							model.mesh.rotation.set(-Math.PI / 2, 0, Math.PI);
						model.mesh.scale.set(1, 1, 1);
						model.mesh.updateMatrix();

						// Merge model's geometry together
						mergedGeometry.merge(geometry, model.mesh.matrix);

						// Apply model's previous matrix
						model.mesh.rotation.set(0, 0, 0);
						model.mesh.updateMatrix();
						model.mesh.applyMatrix(matrix);
					}
		
					// Get average center for models
					centerX /= (modelEditor.models.length - 1);
					centerZ /= (modelEditor.models.length - 1);
			
					// Save model's center
					self.modelCenter = [centerX ? centerX : Number.MIN_VALUE, centerZ ? centerZ : Number.MIN_VALUE];
	
					// Create merged mesh from merged geometry
					var mergedMesh = new THREE.Mesh(mergedGeometry);
	
					// Get merged mesh as an STL
					var exporter = new THREE.STLBinaryExporter();
					var stl = new Blob([exporter.parse(mergedMesh).buffer], {type: "text/plain"});
				
					// Set scene exported
					modelEditor.sceneExported = true;
				
					// Return STL
					return stl;
				},

				// Destroy
				destroy: function() {

					// Disable events
					$(document).off("mousedown.modelEditor mousemove.modelEditor");
					$(window).off("resize.modelEditor keydown.modelEditor keyup.modelEditor");

					// Clear model editor
					modelEditor = null;
				},

				// Fix model Y
				fixModelY: function() {
			
					// Go through all models
					for(var i = 1; i < modelEditor.models.length; i++)

						// Check if model is selected
						if(modelEditor.models[i].glow !== null) {

							// Get model's boundary box
							var boundaryBox = new THREE.Box3().setFromObject(modelEditor.models[i].mesh);
							boundaryBox.min.sub(modelEditor.models[i].mesh.position);
							boundaryBox.max.sub(modelEditor.models[i].mesh.position);

							// Set model's lowest Y value to be on the bed
							modelEditor.models[i].mesh.position.y -= modelEditor.models[i].mesh.position.y + boundaryBox.min.y - bedLowMinZ;
						}
				
					// Check if cutting models
					if(modelEditor.cutShape !== null) {

						// Select cut shape
						modelEditor.removeSelection();
						modelEditor.transformControls.attach(modelEditor.cutShape);
					}
					
					// Upate measurements
					modelEditor.updateModelChanges();
			
					// Update boundaries
					modelEditor.updateBoundaries();
			
					// Render
					modelEditor.render();
				},
	
				// Clone model
				cloneModel: function() {
		
					// Clear model loaded
					modelEditor.modelLoaded = false;
			
					// Initialize clones models
					var clonedModels = [];
			
					// Go through all models
					for(var i = 1; i < modelEditor.models.length; i++)

						// Check if model is selected
						if(modelEditor.models[i].glow !== null) {

							// Clone model
							var clonedModel = new THREE.Mesh(modelEditor.models[i].mesh.geometry.clone(), modelEditor.models[i].mesh.material.clone());
		
							// Copy original orientation
							clonedModel.applyMatrix(modelEditor.models[i].mesh.matrix);
		
							// Add cloned model to scene
							modelEditor.scene[0].add(clonedModel);
		
							// Append model to list
							modelEditor.models.push({
								mesh: clonedModel,
								type: modelEditor.models[i].type,
								glow: null,
								adhesion: modelEditor.createPlatformAdhesion(clonedModel)
							});
					
							// Append cloned model to list
							if(modelEditor.models[i].mesh == modelEditor.transformControls.object)
								clonedModels.unshift(clonedModel);
							else
								clonedModels.push(clonedModel);
						}
			
					// Go through all cloned models
					for(var i = clonedModels.length - 1; i >= 0; i--)
			
						// Select model
						modelEditor.selectModel(clonedModels[i]);

					// Fix model's Y
					modelEditor.fixModelY();
				
					// Remove current selection
					modelEditor.removeSelection();
				
					// Render
					modelEditor.render();
				
					setTimeout(function() {
				
						// Go through all cloned models
						for(var i = clonedModels.length - 1; i >= 0; i--)
			
							// Select model
							modelEditor.selectModel(clonedModels[i]);
			
						// Render
						modelEditor.render();
			
						// Set model loaded
						modelEditor.modelLoaded = true;
					}, 200);
				},
	
				// Reset model
				resetModel: function() {
			
					// Check if cutting models
					if(modelEditor.cutShape !== null) {
				
						// Reset cut shape's orientation
						modelEditor.cutShape.position.set(0, (bedHighMaxZ - bedLowMinZ) / 2 + externalBedHeight, 0);
						modelEditor.cutShape.rotation.set(0, 0, 0);
						modelEditor.cutShape.scale.set(1, 1, 1);
					}
				
					// Otherwise
					else
			
						// Go through all models
						for(var i = 1; i < modelEditor.models.length; i++)

							// Check if model is selected
							if(modelEditor.models[i].glow !== null) {
				
								// Reset model's orientation
								modelEditor.models[i].mesh.position.set(0, 0, 0);
								modelEditor.models[i].mesh.rotation.set(0, 0, 0);
								modelEditor.models[i].mesh.scale.set(1, 1, 1);
							}
					
					// Fix model's Y
					modelEditor.fixModelY();
				},
	
				// Delete model
				deleteModel: function() {
			
					// Check if cutting models
					if(modelEditor.cutShape !== null) {
				
						// Remove cut shape
						modelEditor.scene[0].remove(modelEditor.cutShape);
						modelEditor.scene[0].remove(modelEditor.cutShapeOutline);
						modelEditor.cutShape = null;
						modelEditor.cutShapeOutline = null;
					
						// Deselect button
						$("#slicing_configuration_dialog .modal-extra button.cut").removeClass("disabled");
					
						// Enable import and clone buttons
						$("#slicing_configuration_dialog .modal-extra button.import, #slicing_configuration_dialog .modal-extra button.clone").prop("disabled", false);
						
						// Hide cut shape options
						$("#slicing_configuration_dialog .modal-extra div.cutShape").removeClass("show");
					}
				
					// Otherwise
					else
		
						// Go through all models
						for(var i = 1; i < modelEditor.models.length; i++)

							// Check if model is selected
							if(modelEditor.models[i].glow !== null) {
				
								// Remove model
								modelEditor.scene[0].remove(modelEditor.models[i].mesh);
								modelEditor.scene[1].remove(modelEditor.models[i].glow);
								if(modelEditor.models[i].adhesion !== null) {
									modelEditor.scene[0].remove(modelEditor.models[i].adhesion.mesh);
									modelEditor.scene[1].remove(modelEditor.models[i].adhesion.glow);
								}
								modelEditor.models.splice(i--, 1);
							}
	
					// Remove selection
					modelEditor.transformControls.setAllowedTranslation("XZ");
					modelEditor.transformControls.detach();
	
					// Update model changes
					modelEditor.updateModelChanges();
			
					// Update boundaries
					modelEditor.updateBoundaries();
			
					// Render
					modelEditor.render();
				},
	
				// Remove selection
				removeSelection: function() {
		
					// Check if an object is selected
					if(modelEditor.transformControls.object) {
	
						// Go through all models
						for(var i = 1; i < modelEditor.models.length; i++)
		
							// Check if glow exists
							if(modelEditor.models[i].glow !== null) {
	
								// Set model's color
								modelEditor.models[i].mesh.material = filamentMaterials[modelEditorFilamentColor];
								
								// Set adhesion's color
								if(modelEditor.models[i].adhesion !== null) {
									modelEditor.models[i].adhesion.mesh.material = filamentMaterials[modelEditorFilamentColor];
									modelEditor.scene[1].remove(modelEditor.models[i].adhesion.glow);
									modelEditor.models[i].adhesion.glow = null;
								}
		
								// Remove glow
								modelEditor.scene[1].remove(modelEditor.models[i].glow);
								modelEditor.models[i].glow = null;
							}
			
						// Remove selection
						modelEditor.transformControls.detach();
		
						// Update model changes
						modelEditor.updateModelChanges();
					}
				},
	
				// Select model
				selectModel: function(model) {
		
					// Create glow material
					var glowMaterial = new THREE.ShaderMaterial({
						uniforms: { 
							c: {
								type: 'f',
								value: 1.0
							},
							p: {
								type: 'f',
								value: 1.4
							},
							color: {
								type: 'c',
								value: new THREE.Color(0xFFFF00)
							},
							viewVector: {
								type: "v3",
								value: modelEditor.camera.position
							},
							alpha: {
								type: 'f',
								value: 0.9
							},
						},
						vertexShader: glowVertexShader,
						fragmentShader: glowFragmentShader,
						side: THREE.FrontSide,
						blending: THREE.AdditiveBlending,
						transparent: true,
						depthWrite: false
					});
					
					// Create outline material
					var outlineMaterial = new THREE.ShaderMaterial({
						uniforms: { 
							alpha: {
								type: 'f',
								value: 0.3
							},
							color: {
								type: 'c',
								value: new THREE.Color(0xFFFF00)
							}
						},
						vertexShader: outlineVertexShader,
						fragmentShader: outlineFragmentShader,
						side: THREE.FrontSide,
						blending: THREE.AdditiveBlending,
						transparent: true,
						depthWrite: false
					});
			
					// Go through all models
					for(var i = 1; i < modelEditor.models.length; i++)
			
						// Check if model is being selected
						if(modelEditor.models[i].mesh == model) {
				
							// Select model
							modelEditor.transformControls.attach(model);
							
							// Set select material
							var selectMaterial = new THREE.MeshLambertMaterial({
								color: 0xEC9F3B,
								side: THREE.DoubleSide
							});
		
							// Set model's color
							model.material = selectMaterial;
							
							// Set adhesion's color
							if(modelEditor.models[i].adhesion !== null) {
								modelEditor.models[i].adhesion.mesh.material = selectMaterial;
								if(modelEditor.models[i].adhesion.glow !== null)
									modelEditor.scene[1].remove(modelEditor.models[i].adhesion.glow);
							}
					
							// Remove existing glow
							if(modelEditor.models[i].glow !== null)
								modelEditor.scene[1].remove(modelEditor.models[i].glow);
					
							// Create glow
							model.updateMatrix();
							modelEditor.models[i].glow = new THREE.Mesh(model.geometry, glowMaterial.clone());
						 	modelEditor.models[i].glow.applyMatrix(model.matrix);
						 	modelEditor.models[i].glow.renderOrder = 1;
							
							// Add glow to scene
							modelEditor.scene[1].add(modelEditor.models[i].glow);
							
							// Check if adhesion exists
							if(modelEditor.models[i].adhesion !== null) {
							
								// Create adhesion glow
								modelEditor.models[i].adhesion.mesh.updateMatrix();
								modelEditor.models[i].adhesion.glow = new THREE.Mesh(modelEditor.models[i].adhesion.mesh.geometry, outlineMaterial.clone());
							 	modelEditor.models[i].adhesion.glow.applyMatrix(modelEditor.models[i].adhesion.mesh.matrix);
								modelEditor.models[i].adhesion.glow.renderOrder = 0;
								
								// Add glow to scene
								modelEditor.scene[1].add(modelEditor.models[i].adhesion.glow);
							}
		
							// Update model changes
							modelEditor.updateModelChanges();
						}
				
						// Otherwise check if model is selected
						else if(modelEditor.models[i].glow !== null) {
				
							// Set model's glow color
							modelEditor.models[i].glow.material.uniforms.color.value.setHex(0xFFFFB3);
							
							// Set adhesion's glow color
							if(modelEditor.models[i].adhesion !== null)
								modelEditor.models[i].adhesion.glow.material.uniforms.color.value.setHex(0xFFFFB3);
						}
				},
		
				// Apply changes
				applyChanges: function(name, value) {

					// Get currently selected model
					var model = modelEditor.transformControls.object;
					if(typeof model !== "undefined") {
			
						// Save matrix
						modelEditor.savedMatrix = model.matrix.clone();

						// Check if in translate mode
						if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("translate")) {

							// Set model's position
							if(name == 'x')
								model.position.x = -parseFloat(value);
							else if(name == 'y')
								model.position.y = parseFloat(value);
							else if(name == 'z')
								model.position.z = parseFloat(value);
						}

						// Otherwise check if in rotate mode
						else if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("rotate")) {

							// Set model's rotation
							if(name == 'x')
								model.rotation.x = THREE.Math.degToRad(parseFloat(value));
							else if(name == 'y')
								model.rotation.y = THREE.Math.degToRad(parseFloat(value));
							else if(name == 'z')
								model.rotation.z = THREE.Math.degToRad(parseFloat(value));
						}

						// Otherwise check if in scale mode
						else if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("scale")) {

							// Set model's scale
							if(name == 'x' || modelEditor.scaleLock[0])
								model.scale.x = parseFloat(value) == 0 ? 0.000000000001 : parseFloat(value);
							if(name == 'y' || modelEditor.scaleLock[1])
								model.scale.y = parseFloat(value) == 0 ? 0.000000000001 : parseFloat(value);
							if(name == 'z' || modelEditor.scaleLock[2])
								model.scale.z = parseFloat(value == 0 ? 0.000000000001 : parseFloat(value));
						}
					}
			
					// Apply group transformation
					modelEditor.applyGroupTransformation();
		
					// Clear saved matrix
					modelEditor.savedMatrix = null;

					// Fix model's Y
					modelEditor.fixModelY();
				},
	
				// Update model changes
				updateModelChanges: function() {
		
					// Get currently selected model
					var model = modelEditor.transformControls.object;
				
					// Check if a showing measurements, a model is currently selected, and not cutting models
					if(modelEditor.showMeasurements && model && modelEditor.cutShape === null) {
		
						// Get model's boundary box
						var boundaryBox = new THREE.Box3().setFromObject(model);
			
						// Set width measurement
						modelEditor.measurements[0][0].geometry.vertices[0].set(boundaryBox.max.x + 1, boundaryBox.min.y - 1, boundaryBox.min.z - 1);
						modelEditor.measurements[0][0].geometry.vertices[1].set(boundaryBox.min.x - 1, boundaryBox.min.y - 1, boundaryBox.min.z - 1);
						modelEditor.measurements[0][1].set(boundaryBox.max.x + (boundaryBox.min.x - boundaryBox.max.x) / 2, boundaryBox.min.y, boundaryBox.min.z);
						var value = boundaryBox.max.x - boundaryBox.min.x;
						$("#slicing_configuration_dialog .modal-extra div.measurements > p.width").text(value.toFixed(3) + "mm / " + (value / 25.4).toFixed(3) + "in");
		
						// Set depth measurement
						modelEditor.measurements[1][0].geometry.vertices[0].set(boundaryBox.min.x - 1, boundaryBox.min.y - 1, boundaryBox.min.z - 1);
						modelEditor.measurements[1][0].geometry.vertices[1].set(boundaryBox.min.x - 1, boundaryBox.min.y - 1, boundaryBox.max.z + 1);
						modelEditor.measurements[1][1].set(boundaryBox.min.x, boundaryBox.min.y, boundaryBox.min.z + (boundaryBox.max.z - boundaryBox.min.z) / 2);
						value = boundaryBox.max.z - boundaryBox.min.z;
						$("#slicing_configuration_dialog .modal-extra div.measurements > p.depth").text(value.toFixed(3) + "mm / " + (value / 25.4).toFixed(3) + "in");
			
						// Set height measurement
						modelEditor.measurements[2][0].geometry.vertices[0].set(boundaryBox.min.x - 1, boundaryBox.min.y - 1, boundaryBox.max.z + 1);
						modelEditor.measurements[2][0].geometry.vertices[1].set(boundaryBox.min.x - 1, boundaryBox.max.y + 1, boundaryBox.max.z + 1);
						modelEditor.measurements[2][1].set(boundaryBox.min.x, boundaryBox.min.y + (boundaryBox.max.y - boundaryBox.min.y) / 2, boundaryBox.max.z);
						value = boundaryBox.max.y - boundaryBox.min.y;
						$("#slicing_configuration_dialog .modal-extra div.measurements > p.height").text(value.toFixed(3) + "mm / " + (value / 25.4).toFixed(3) + "in");
			
						// Show measurements
						for(var i = 0; i < modelEditor.measurements.length; i++) {
							modelEditor.measurements[i][0].geometry.verticesNeedUpdate = true;
							modelEditor.measurements[i][0].visible = modelEditor.showMeasurements;
						}
			
						$("#slicing_configuration_dialog .modal-extra div.measurements > p").addClass("show");
					}
		
					// Otherwise
					else {
		
						// Hide measurements
						for(var i = 0; i < modelEditor.measurements.length; i++)
							modelEditor.measurements[i][0].visible = false;
			
						$("#slicing_configuration_dialog .modal-extra div.measurements > p").removeClass("show");
					}
		
					// Set currently active buttons
					$("#slicing_configuration_dialog .modal-extra button.translate, #slicing_configuration_dialog .modal-extra button.rotate, #slicing_configuration_dialog .modal-extra button.scale").removeClass("disabled");
					$("#slicing_configuration_dialog .modal-extra div.values").removeClass("translate rotate scale").addClass(modelEditor.transformControls.getMode());
					$("#slicing_configuration_dialog .modal-extra button." + modelEditor.transformControls.getMode()).addClass("disabled");

					// Check if a model is currently selected
					if(model) {
				
						// Enable delete, clone, and reset
						$("#slicing_configuration_dialog .modal-extra button.delete, #slicing_configuration_dialog .modal-extra button.clone, #slicing_configuration_dialog .modal-extra button.reset").removeClass("disabled");

						// Show values
						$("#slicing_configuration_dialog .modal-extra div.values div").addClass("show").children('p').addClass("show");
						if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("translate") && modelEditor.cutShape === null)
							$("#slicing_configuration_dialog .modal-extra div.values input[name=\"y\"]").parent().removeClass("show");

						// Check if an input is not focused
						if(!$("#slicing_configuration_dialog .modal-extra input:focus").length) {

							// Check if in translate mode
							if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("translate")) {

								// Display position values
								$("#slicing_configuration_dialog .modal-extra div.values p span:not(.axis)").text("mm").attr("title", '');
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"x\"]").val((model.position.x.toFixed(3) == 0 ? 0 : -model.position.x).toFixed(3)).attr("min", '');
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"y\"]").val(model.position.y.toFixed(3)).attr("min", '');
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"z\"]").val(model.position.z.toFixed(3)).attr("min", '');
							}

							// Otherwise check if in rotate mode
							else if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("rotate")) {

								// Display rotation values
								$("#slicing_configuration_dialog .modal-extra div.values p span:not(.axis)").text('°').attr("title", '');
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"x\"]").val((model.rotation.x * 180 / Math.PI).toFixed(3)).attr("min", '');
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"y\"]").val((model.rotation.y * 180 / Math.PI).toFixed(3)).attr("min", '');
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"z\"]").val((model.rotation.z * 180 / Math.PI).toFixed(3)).attr("min", '');
							}

							// Otherwise check if in scale mode
							else if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("scale")) {

								// Display scale values
								for(var i = 0; i < 3; i++)
									$("#slicing_configuration_dialog .modal-extra div.values p span:not(.axis)").eq(i).text(modelEditor.scaleLock[i] ? '\uF023' : '\uF13E').attr("title", modelEditor.scaleLock[i] ? htmlDecode(gettext("Unlock")) : htmlDecode(gettext("Lock")));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"x\"]").val(model.scale.x.toFixed(3)).attr("min", '0');
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"y\"]").val(model.scale.y.toFixed(3)).attr("min", '0');
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"z\"]").val(model.scale.z.toFixed(3)).attr("min", '0');
							}
						}
			
						// Apply group transformation
						modelEditor.applyGroupTransformation();
					
						// Go through all models
						var numberOfModelsSelected = 0;
						for(var i = 1; i < modelEditor.models.length; i++)
		
							// Check if glow exists
							if(modelEditor.models[i].glow !== null) {
						
								// Increment number of models selected
								numberOfModelsSelected++;
	
								// Update glow's orientation
								modelEditor.models[i].glow.position.copy(modelEditor.models[i].mesh.position);
								modelEditor.models[i].glow.rotation.copy(modelEditor.models[i].mesh.rotation);
								modelEditor.models[i].glow.scale.copy(modelEditor.models[i].mesh.scale);
								
								// Check if adhesion exists
								if(modelEditor.models[i].adhesion !== null) {
								
									// Restore original geometry
									modelEditor.models[i].adhesion.mesh.geometry = modelEditor.models[i].adhesion.geometry.clone();
								
									// Update adhesion's orientation
									modelEditor.models[i].adhesion.mesh.rotation.copy(modelEditor.models[i].mesh.rotation);
									modelEditor.models[i].adhesion.mesh.scale.copy(modelEditor.models[i].mesh.scale);
									
									// Apply transformation to adhesion's geometry
									modelEditor.models[i].adhesion.mesh.updateMatrix();
									modelEditor.models[i].adhesion.mesh.geometry.applyMatrix(modelEditor.models[i].adhesion.mesh.matrix);
									modelEditor.models[i].adhesion.mesh.geometry.center();
									
									// Set adhesion's orientation
									modelEditor.models[i].adhesion.mesh.position.set(modelEditor.models[i].mesh.position.x, bedLowMinZ, modelEditor.models[i].mesh.position.z);
									modelEditor.models[i].adhesion.mesh.rotation.set(0, 0, 0);
									var boundaryBox = new THREE.Box3().setFromObject(modelEditor.models[i].mesh);
									modelEditor.models[i].adhesion.mesh.scale.set((boundaryBox.max.x - boundaryBox.min.x + modelEditor.adhesionSize * 2) / (boundaryBox.max.x - boundaryBox.min.x), 0.000000000001, (boundaryBox.max.z - boundaryBox.min.z + modelEditor.adhesionSize * 2) / (boundaryBox.max.z - boundaryBox.min.z));
									
									// Update adhesion glow's orientation
									modelEditor.models[i].adhesion.glow.geometry = modelEditor.models[i].adhesion.mesh.geometry;
									modelEditor.models[i].adhesion.glow.position.copy(modelEditor.models[i].adhesion.mesh.position);
									modelEditor.models[i].adhesion.glow.rotation.copy(modelEditor.models[i].adhesion.mesh.rotation);
									modelEditor.models[i].adhesion.glow.scale.copy(modelEditor.models[i].adhesion.mesh.scale);
								}
							}
					
						// Enable or disable merge button
						if(numberOfModelsSelected >= 2)
							$("#slicing_configuration_dialog .modal-extra button.merge").removeClass("disabled");
						else
							$("#slicing_configuration_dialog .modal-extra button.merge").addClass("disabled");
						
						// Check if cutting models
						if(modelEditor.cutShape !== null) {
						
							// Update cut shape's outline's orientation
							modelEditor.cutShapeOutline.position.copy(modelEditor.cutShape.position);
							modelEditor.cutShapeOutline.rotation.copy(modelEditor.cutShape.rotation);
							modelEditor.cutShapeOutline.scale.copy(modelEditor.cutShape.scale);
						}
					}

					// Otherwise check if not cutting models
					else if(modelEditor.cutShape === null) {

						// Disable delete, clone, and reset
						$("#slicing_configuration_dialog .modal-extra button.delete, #slicing_configuration_dialog .modal-extra button.clone, #slicing_configuration_dialog .modal-extra button.reset").addClass("disabled");

						// Hide values
						$("#slicing_configuration_dialog .modal-extra div.values div").removeClass("show").children('p').removeClass("show");

						// Blur input
						$("#slicing_configuration_dialog .modal-extra div.values input").blur();
					}
				
					// Check if no model is selected
					if(!model)
				
						// Disable merge button
						$("#slicing_configuration_dialog .modal-extra button.merge").addClass("disabled");
					
					// Check if no models exist
					if(modelEditor.models.length == 1)
					
						// Disable cut button
						$("#slicing_configuration_dialog .modal-extra button.cut").addClass("off");
					
					// Otherwise
					else
					
						// Enable cut button
						$("#slicing_configuration_dialog .modal-extra button.cut").removeClass("off");
				},
		
				// Apply group transformation
				applyGroupTransformation: function() {
		
					// Check if a matrix was saved
					if(modelEditor.savedMatrix) {
			
						// Get new matrix
						modelEditor.transformControls.object.updateMatrix();
						var newMatrix = modelEditor.transformControls.object.matrix;
				
						// Check current mode
						switch(modelEditor.transformControls.getMode()) {
				
							// Check if in translate mode
							case "translate" :
					
								// Get saved position
								var savedValue = new THREE.Vector3();
								savedValue.setFromMatrixPosition(modelEditor.savedMatrix);
				
								// Get new position
								var newValue = new THREE.Vector3();
								newValue.setFromMatrixPosition(newMatrix);
							break;
					
							// Check if in rotate mode
							case "rotate" :
					
								// Get saved position
								var savedRotation = new THREE.Euler();
								savedRotation.setFromRotationMatrix(modelEditor.savedMatrix);
								var savedValue = savedRotation.toVector3();
						
								// Get new position
								var newRotation = new THREE.Euler();
								newRotation.setFromRotationMatrix(newMatrix);
								var newValue = newRotation.toVector3();
							break;
					
							// Check if in scale mode
							case "scale" :
					
								// Get saved position
								var savedValue = new THREE.Vector3();
								savedValue.setFromMatrixScale(modelEditor.savedMatrix);
				
								// Get new position
								var newValue = new THREE.Vector3();
								newValue.setFromMatrixScale(newMatrix);
							break;
						}
				
						// Get changes
						var changes = savedValue.sub(newValue);
		
						// Go through all models
						for(var i = 1; i < modelEditor.models.length; i++)

							// Check if model is selected
							if(modelEditor.models[i].glow && modelEditor.models[i].mesh != modelEditor.transformControls.object)
					
								// Check current mode
								switch(modelEditor.transformControls.getMode()) {
						
									// Check if in translate mode
									case "translate" :
							
										// Update model's position
										modelEditor.models[i].mesh.position.sub(changes);
									break;
							
									// Check if in rotate mode
									case "rotate" :
							
										// Update model's rotation
										modelEditor.models[i].mesh.rotation.setFromVector3(modelEditor.models[i].mesh.rotation.toVector3().sub(changes));
									break;
							
									// Check if in scale mode
									case "scale" :
							
										// Update model's size
										modelEditor.models[i].mesh.scale.sub(changes);
										
										// Prevent scaling less than zero
										if(modelEditor.models[i].mesh.scale.x <= 0)
											modelEditor.models[i].mesh.scale.x = 0.000000000001;
										if(modelEditor.models[i].mesh.scale.y <= 0)
											modelEditor.models[i].mesh.scale.y = 0.000000000001;
										if(modelEditor.models[i].mesh.scale.z <= 0)
											modelEditor.models[i].mesh.scale.z = 0.000000000001;
									break;
								}
				
						// Save new matrix
						modelEditor.savedMatrix = newMatrix.clone();
					}
				},
	
				// Get 2D position
				get2dPosition: function(vector) {
	
					// Initialize variables
					var clonedVector = vector.clone();
					var position = new THREE.Vector2();
		
					// Normalized device coordinate
					clonedVector.project(modelEditor.camera);

					// Get 2D position
					position.x = Math.round((clonedVector.x + 1) * modelEditor.renderer.domElement.width / 2);
					position.y = Math.round((-clonedVector.y + 1) * modelEditor.renderer.domElement.height / 2);
		
					// Return position
					return position;
				},
		
				// Update boundaries
				updateBoundaries: function() {
		
					// Go through all boundaries
					for(var i = 0; i < modelEditor.boundaries.length; i++) {
		
						// Reset boundary
						modelEditor.boundaries[i].material.color.setHex(0x00FF00);
						modelEditor.boundaries[i].material.opacity = 0.2;
						modelEditor.boundaries[i].visible = modelEditor.showBoundaries;
						modelEditor.boundaries[i].renderOrder = 2;
					}
					
					// Check if bed shape is rectangular
					if(this.bedShape == "rectangular") {
					
						// Create maximums and minimums for bed tiers
						var maximums = [];
						var minimums = [];
						for(var i = 0; i < 3; i++) {
							maximums[i] = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
							minimums[i] = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
						}
	
						// Go through all models
						for(var i = 1; i < modelEditor.models.length; i++) {
	
							// Get current model
							var model = modelEditor.models[i].mesh;
		
							// Update model's matrix
							model.updateMatrixWorld();
		
							// Go through all model's vertices
							for(var j = 0; j < model.geometry.vertices.length; j++) {
		
								// Get absolute position of vertex
								var vector = model.geometry.vertices[j].clone();
								vector.applyMatrix4(model.matrixWorld);
								vector.x *= -1;
			
								// Get maximum and minimum for each bed tier
								if(vector.y < bedLowMaxZ) {
									maximums[0].max(vector);
									minimums[0].min(vector);
								}
	
								else if(vector.y < bedMediumMaxZ) {
									maximums[1].max(vector);
									minimums[1].min(vector);
								}
	
								else {
									maximums[2].max(vector);
									minimums[2].min(vector);
								}
							}
						}
		
						// Check if models goes out of bounds on low front
						if((modelEditor.platformAdhesion != "None" && (minimums[0].z - modelEditor.adhesionSize < bedLowMinY - extruderCenterY || minimums[1].z - modelEditor.adhesionSize < bedLowMinY - extruderCenterY || minimums[2].z - modelEditor.adhesionSize < bedLowMinY - extruderCenterY)) || (modelEditor.platformAdhesion == "None" && minimums[0].z < bedLowMinY - extruderCenterY)) {
		
							// Set boundary
							modelEditor.boundaries[1].material.color.setHex(0xFF0000);
							modelEditor.boundaries[1].material.opacity = 0.7;
							modelEditor.boundaries[1].visible = true;
							modelEditor.boundaries[1].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[1].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on low back
						if((modelEditor.platformAdhesion != "None" && (maximums[0].z + modelEditor.adhesionSize > bedLowMaxY - extruderCenterY || maximums[1].z + modelEditor.adhesionSize > bedLowMaxY - extruderCenterY || maximums[2].z + modelEditor.adhesionSize > bedLowMaxY - extruderCenterY)) || (modelEditor.platformAdhesion == "None" && maximums[0].z > bedLowMaxY - extruderCenterY)) {
		
							// Set boundary
							modelEditor.boundaries[2].material.color.setHex(0xFF0000);
							modelEditor.boundaries[2].material.opacity = 0.7;
							modelEditor.boundaries[2].visible = true;
							modelEditor.boundaries[2].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[2].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on low right
						if((modelEditor.platformAdhesion != "None" && (maximums[0].x + modelEditor.adhesionSize > bedLowMaxX - extruderCenterX || maximums[1].x + modelEditor.adhesionSize > bedLowMaxX - extruderCenterX || maximums[2].x + modelEditor.adhesionSize > bedLowMaxX - extruderCenterX)) || (modelEditor.platformAdhesion == "None" && maximums[0].x > bedLowMaxX - extruderCenterX)) {
		
							// Set boundary
							modelEditor.boundaries[3].material.color.setHex(0xFF0000);
							modelEditor.boundaries[3].material.opacity = 0.7;
							modelEditor.boundaries[3].visible = true;
							modelEditor.boundaries[3].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[3].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on low left
						if((modelEditor.platformAdhesion != "None" && (minimums[0].x - modelEditor.adhesionSize < bedLowMinX - extruderCenterX || minimums[1].x - modelEditor.adhesionSize < bedLowMinX - extruderCenterX || minimums[2].x - modelEditor.adhesionSize < bedLowMinX - extruderCenterX)) || (modelEditor.platformAdhesion == "None" && minimums[0].x < bedLowMinX - extruderCenterX)) {
		
							// Set boundary
							modelEditor.boundaries[4].material.color.setHex(0xFF0000);
							modelEditor.boundaries[4].material.opacity = 0.7;
							modelEditor.boundaries[4].visible = true;
							modelEditor.boundaries[4].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[4].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on medium front
						if(minimums[1].z < bedMediumMinY - extruderCenterY) {
		
							// Set boundary
							modelEditor.boundaries[5].material.color.setHex(0xFF0000);
							modelEditor.boundaries[5].material.opacity = 0.7;
							modelEditor.boundaries[5].visible = true;
							modelEditor.boundaries[5].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[5].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on medium back
						if(maximums[1].z > bedMediumMaxY - extruderCenterY) {
		
							// Set boundary
							modelEditor.boundaries[6].material.color.setHex(0xFF0000);
							modelEditor.boundaries[6].material.opacity = 0.7;
							modelEditor.boundaries[6].visible = true;
							modelEditor.boundaries[6].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[6].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on medium right
						if(maximums[1].x > bedMediumMaxX - extruderCenterX) {
		
							// Set boundary
							modelEditor.boundaries[7].material.color.setHex(0xFF0000);
							modelEditor.boundaries[7].material.opacity = 0.7;
							modelEditor.boundaries[7].visible = true;
							modelEditor.boundaries[7].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[7].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on medium left
						if(minimums[1].x < bedMediumMinX - extruderCenterX) {
		
							// Set boundary
							modelEditor.boundaries[8].material.color.setHex(0xFF0000);
							modelEditor.boundaries[8].material.opacity = 0.7;
							modelEditor.boundaries[8].visible = true;
							modelEditor.boundaries[8].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[8].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on high front
						if(minimums[2].z < bedHighMinY - extruderCenterY) {
		
							// Set boundary
							modelEditor.boundaries[9].material.color.setHex(0xFF0000);
							modelEditor.boundaries[9].material.opacity = 0.7;
							modelEditor.boundaries[9].visible = true;
							modelEditor.boundaries[9].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[9].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on high back
						if(maximums[2].z > bedHighMaxY - extruderCenterY) {
		
							// Set boundary
							modelEditor.boundaries[10].material.color.setHex(0xFF0000);
							modelEditor.boundaries[10].material.opacity = 0.7;
							modelEditor.boundaries[10].visible = true;
							modelEditor.boundaries[10].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[10].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on high right
						if(maximums[2].x > bedHighMaxX - extruderCenterX) {
		
							// Set boundary
							modelEditor.boundaries[11].material.color.setHex(0xFF0000);
							modelEditor.boundaries[11].material.opacity = 0.7;
							modelEditor.boundaries[11].visible = true;
							modelEditor.boundaries[11].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[11].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on high left
						if(minimums[2].x < bedHighMinX - extruderCenterX) {
		
							// Set boundary
							modelEditor.boundaries[12].material.color.setHex(0xFF0000);
							modelEditor.boundaries[12].material.opacity = 0.7;
							modelEditor.boundaries[12].visible = true;
							modelEditor.boundaries[12].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[12].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on high top
						if(maximums[2].y > bedHighMaxZ) {
		
							// Set boundary
							modelEditor.boundaries[13].material.color.setHex(0xFF0000);
							modelEditor.boundaries[13].material.opacity = 0.7;
							modelEditor.boundaries[13].visible = true;
							modelEditor.boundaries[13].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[13].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on connector between low and medium front
						if((bedMediumMinY < bedLowMinY && modelEditor.boundaries[1].material.color.getHex() == 0xFF0000) || modelEditor.boundaries[5].material.color.getHex() == 0xFF0000) {
		
							// Set boundary
							modelEditor.boundaries[14].material.color.setHex(0xFF0000);
							modelEditor.boundaries[14].material.opacity = 0.7;
							modelEditor.boundaries[14].visible = true;
							modelEditor.boundaries[14].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[14].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on connector between low and medium back
						if((bedMediumMaxY > bedLowMaxY && modelEditor.boundaries[2].material.color.getHex() == 0xFF0000) || modelEditor.boundaries[6].material.color.getHex() == 0xFF0000) {
		
							// Set boundary
							modelEditor.boundaries[15].material.color.setHex(0xFF0000);
							modelEditor.boundaries[15].material.opacity = 0.7;
							modelEditor.boundaries[15].visible = true;
							modelEditor.boundaries[15].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[15].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on connector between low and medium right
						if((bedMediumMaxX > bedLowMaxX && modelEditor.boundaries[3].material.color.getHex() == 0xFF0000) || modelEditor.boundaries[7].material.color.getHex() == 0xFF0000) {
		
							// Set boundary
							modelEditor.boundaries[16].material.color.setHex(0xFF0000);
							modelEditor.boundaries[16].material.opacity = 0.7;
							modelEditor.boundaries[16].visible = true;
							modelEditor.boundaries[16].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[16].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on connector between low and medium left
						if((bedMediumMinX < bedLowMinX && modelEditor.boundaries[4].material.color.getHex() == 0xFF0000) || modelEditor.boundaries[8].material.color.getHex() == 0xFF0000) {
		
							// Set boundary
							modelEditor.boundaries[17].material.color.setHex(0xFF0000);
							modelEditor.boundaries[17].material.opacity = 0.7;
							modelEditor.boundaries[17].visible = true;
							modelEditor.boundaries[17].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[17].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on connector between medium and high front
						if((bedHighMinY < bedMediumMinY && modelEditor.boundaries[5].material.color.getHex() == 0xFF0000) || modelEditor.boundaries[9].material.color.getHex() == 0xFF0000) {
		
							// Set boundary
							modelEditor.boundaries[18].material.color.setHex(0xFF0000);
							modelEditor.boundaries[18].material.opacity = 0.7;
							modelEditor.boundaries[18].visible = true;
							modelEditor.boundaries[18].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[18].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on connector between medium and high back
						if((bedHighMaxY > bedMediumMaxY && modelEditor.boundaries[6].material.color.getHex() == 0xFF0000) || modelEditor.boundaries[10].material.color.getHex() == 0xFF0000) {
		
							// Set boundary
							modelEditor.boundaries[19].material.color.setHex(0xFF0000);
							modelEditor.boundaries[19].material.opacity = 0.7;
							modelEditor.boundaries[19].visible = true;
							modelEditor.boundaries[19].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[19].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on connector between medium and high right
						if((bedHighMaxX > bedMediumMaxX && modelEditor.boundaries[7].material.color.getHex() == 0xFF0000) || modelEditor.boundaries[11].material.color.getHex() == 0xFF0000) {
		
							// Set boundary
							modelEditor.boundaries[20].material.color.setHex(0xFF0000);
							modelEditor.boundaries[20].material.opacity = 0.7;
							modelEditor.boundaries[20].visible = true;
							modelEditor.boundaries[20].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[20].visible = modelEditor.showBoundaries;
		
						// Check if models goes out of bounds on connector between medium and high left
						if((bedHighMinX < bedMediumMinX && modelEditor.boundaries[8].material.color.getHex() == 0xFF0000) || modelEditor.boundaries[12].material.color.getHex() == 0xFF0000) {
		
							// Set boundary
							modelEditor.boundaries[21].material.color.setHex(0xFF0000);
							modelEditor.boundaries[21].material.opacity = 0.7;
							modelEditor.boundaries[21].visible = true;
							modelEditor.boundaries[21].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[21].visible = modelEditor.showBoundaries;
					}
					
					// Otherwise
					else {
					
						// Initialize furthest distance and highest point
						var furthestDistance = 0;
						var highestPoint = 0;
					
						// Go through all models
						for(var i = 1; i < modelEditor.models.length; i++) {
						
							// Get current model
							var model = modelEditor.models[i].mesh;
	
							// Update model's matrix
							model.updateMatrixWorld();
	
							// Go through all model's vertices
							for(var j = 0; j < model.geometry.vertices.length; j++) {
	
								// Get absolute position of vertex
								var vector = model.geometry.vertices[j].clone();
								vector.applyMatrix4(model.matrixWorld);
								vector.x *= -1;
							
								// Update furthest distance and highest point
								furthestDistance = Math.max(Math.sqrt(Math.pow(vector.x + extruderCenterX - printBedWidth / 2, 2) + Math.pow(vector.z + extruderCenterY - printBedDepth / 2, 2)), furthestDistance);
								highestPoint = Math.max(vector.y, highestPoint);
							}
						
							// Check if using platform adhesion
							if(modelEditor.platformAdhesion != "None") {
	
								// Get current model's adhesion
								var model = modelEditor.models[i].adhesion.mesh;
		
								// Update model's matrix
								model.updateMatrixWorld();
		
								// Go through all model's vertices
								for(var j = 0; j < model.geometry.vertices.length; j++) {
		
									// Get absolute position of vertex
									var vector = model.geometry.vertices[j].clone();
									vector.applyMatrix4(model.matrixWorld);
									vector.x *= -1;
								
									// Update furthest distance and highest point
									furthestDistance = Math.max(Math.sqrt(Math.pow(vector.x + extruderCenterX - printBedWidth / 2, 2) + Math.pow(vector.z + extruderCenterY - printBedDepth / 2, 2)), furthestDistance);
									highestPoint = Math.max(vector.y, highestPoint);
								}
							}
						}
						
						// Check if models goes out of bounds on side
						if(furthestDistance > printBedWidth / 2) {
						
							// Set boundary
							modelEditor.boundaries[1].material.color.setHex(0xFF0000);
							modelEditor.boundaries[1].material.opacity = 0.7;
							modelEditor.boundaries[1].visible = true;
							modelEditor.boundaries[1].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[1].visible = modelEditor.showBoundaries;
						
						// Check if models goes out of bounds on top
						if(highestPoint > bedHighMaxZ) {
		
							// Set boundary
							modelEditor.boundaries[2].material.color.setHex(0xFF0000);
							modelEditor.boundaries[2].material.opacity = 0.7;
							modelEditor.boundaries[2].visible = true;
							modelEditor.boundaries[2].renderOrder = 1;
						}
		
						// Otherwise
						else
		
							// Set boundary's visibility
							modelEditor.boundaries[2].visible = modelEditor.showBoundaries;
					}
				},
			
				// Apply cut
				applyCut: function() {
				
					// Display cover
					$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").html(gettext("Applying cut…"));

					setTimeout(function() {

						// Deselect button
						$("#slicing_configuration_dialog .modal-extra button.cut").removeClass("disabled");
				
						// Enable import and clone buttons
						$("#slicing_configuration_dialog .modal-extra button.import, #slicing_configuration_dialog .modal-extra button.clone").prop("disabled", false);
						
						// Hide cut shape options
						$("#slicing_configuration_dialog .modal-extra div.cutShape").removeClass("show");
			
						// Initialize variables
						var intersections = [];
						var differences = [];
						
						// Increase sphere detail if cut shape is a sphere
						if(modelEditor.cutShape.geometry.type == "SphereGeometry")
							modelEditor.cutShape.geometry = new THREE.SphereGeometry(25, 25, 25);
				
						// Update cut shape's geometry
						modelEditor.cutShape.geometry.applyMatrix(modelEditor.cutShape.matrix);
						modelEditor.cutShape.position.set(0, 0, 0);
						modelEditor.cutShape.rotation.set(0, 0, 0);
						modelEditor.cutShape.scale.set(1, 1, 1);
			
						// Go through all models
						for(var i = 1; i < modelEditor.models.length; i++) {
				
							// Update model's geometry
							modelEditor.models[i].mesh.geometry.applyMatrix(modelEditor.models[i].mesh.matrix);
							modelEditor.models[i].mesh.position.set(0, 0, 0);
							modelEditor.models[i].mesh.rotation.set(0, 0, 0);
							modelEditor.models[i].mesh.scale.set(1, 1, 1);
				
							// Create difference and intersection meshes
							var cutShapeBsp = new ThreeBSP(modelEditor.cutShape);
							var modelBsp = new ThreeBSP(modelEditor.models[i].mesh);
							var meshDifference = modelBsp.subtract(cutShapeBsp).toMesh(new THREE.MeshLambertMaterial(filamentMaterials[modelEditorFilamentColor]));
							var meshIntersection = modelBsp.intersect(cutShapeBsp).toMesh(new THREE.MeshLambertMaterial(filamentMaterials[modelEditorFilamentColor]));
				
							// Delete model
							modelEditor.scene[0].remove(modelEditor.models[i].mesh);
							if(modelEditor.models[i].adhesion !== null)
								modelEditor.scene[0].remove(modelEditor.models[i].adhesion.mesh);
							var type = modelEditor.models[i].type;
							modelEditor.models.splice(i--, 1);
				
							// Check if difference mesh exists
							if(meshDifference.geometry.vertices.length) {
				
								// Center difference mesh's geometry
								meshDifference.updateMatrixWorld();
								var positionBefore = meshDifference.geometry.vertices[0].clone();
								positionBefore.applyMatrix4(meshDifference.matrixWorld);
			
								meshDifference.geometry.center();
								meshDifference.geometry.computeFaceNormals();
			
								var positionAfter = meshDifference.geometry.vertices[0].clone();
								positionAfter.applyMatrix4(meshDifference.matrixWorld);
								meshDifference.position.set(meshDifference.position.x + positionBefore.x - positionAfter.x, meshDifference.position.y + positionBefore.y - positionAfter.y, meshDifference.position.z + positionBefore.z - positionAfter.z);
						
								// Add difference mesh to list
								differences.push({
									mesh: meshDifference,
									type: type,
									glow: null
								});
							}
				
							// Check if intersection mesh exists
							if(meshIntersection.geometry.vertices.length) {
			
								// Center intersection mesh's geometry
								meshIntersection.updateMatrixWorld();
								var positionBefore = meshIntersection.geometry.vertices[0].clone();
								positionBefore.applyMatrix4(meshIntersection.matrixWorld);
			
								meshIntersection.geometry.center();
								meshIntersection.geometry.computeFaceNormals();
			
								var positionAfter = meshIntersection.geometry.vertices[0].clone();
								positionAfter.applyMatrix4(meshIntersection.matrixWorld);
								meshIntersection.position.set(meshIntersection.position.x + positionBefore.x - positionAfter.x, meshIntersection.position.y + positionBefore.y - positionAfter.y, meshIntersection.position.z + positionBefore.z - positionAfter.z);
						
								// Add intersection mesh to list
								intersections.push({
									mesh: meshIntersection,
									type: type,
									glow: null
								});
							}
						}
				
						// Remove cut shape
						modelEditor.scene[0].remove(modelEditor.cutShape);
						modelEditor.scene[0].remove(modelEditor.cutShapeOutline);
						modelEditor.cutShape = null;
						modelEditor.cutShapeOutline = null;
						modelEditor.transformControls.detach();
						modelEditor.transformControls.setAllowedTranslation("XZ");
				
						// Go through all intersections
						for(var i = 0; i < intersections.length; i++) {
				
							// Add intersection mesh to scene
							modelEditor.scene[0].add(intersections[i].mesh);
				
							// Add intersection mesh to list
							modelEditor.models.push({
								mesh: intersections[i].mesh,
								type: intersections[i].type,
								glow: null,
								adhesion: modelEditor.createPlatformAdhesion(intersections[i].mesh)
							});
				
							// Select intersection mesh
							modelEditor.selectModel(intersections[i].mesh);
						}
				
						// Go through all differences
						for(var i = 0; i < differences.length; i++) {
				
							// Add difference mesh to scene
							modelEditor.scene[0].add(differences[i].mesh);
				
							// Add difference mesh to list
							modelEditor.models.push({
								mesh: differences[i].mesh,
								type: differences[i].type,
								glow: null,
								adhesion: modelEditor.createPlatformAdhesion(differences[i].mesh)
							});
				
							// Select difference mesh
							modelEditor.selectModel(differences[i].mesh);
						}
			
						// Fix model's Y
						modelEditor.fixModelY();
				
						// Remove selection
						modelEditor.removeSelection();
				
						// Go through all intersections
						for(var i = 0; i < intersections.length; i++)
				
							// Select intersection mesh
							modelEditor.selectModel(intersections[i].mesh);
				
						// Upate measurements
						modelEditor.updateModelChanges();
	
						// Render
						modelEditor.render();
						
						// Hide cover
						$("#slicing_configuration_dialog .modal-cover").removeClass("show");
						setTimeout(function() {
							$("#slicing_configuration_dialog .modal-cover").css("z-index", '');
						}, 200);
					}, 600);
				},
				
				// Set cut shape
				setCutShape: function(shape) {
				
					// Initialize variables
					var changed = false;
					
					// Select button
					$("#slicing_configuration_dialog .modal-extra div.cutShape button." + shape).addClass("disabled").siblings("button").removeClass("disabled");
				
					// Check if cut shape is a sphere
					if(shape == "cube" && modelEditor.cutShape.geometry.type == "SphereGeometry") {
					
						// Change cut shape to a cube
						modelEditor.cutShape.geometry = new THREE.CubeGeometry(50, 50, 50);
						changed = true;
					}
				
					// Otherwise check if cut chape is a cube
					else if(shape == "sphere" && modelEditor.cutShape.geometry.type == "BoxGeometry") {
					
						// Change cut shape to a sphere
						modelEditor.cutShape.geometry = new THREE.SphereGeometry(25, 10, 10);
						changed = true;
					}
					
					// Check if cut shape changed
					if(changed) {
					
						// Update cut shape outline
						modelEditor.cutShapeOutline.geometry = modelEditor.lineGeometry(modelEditor.cutShape.geometry);

						// Render
						modelEditor.render();
					}
				},
			
				// Apply merge
				applyMerge: function() {
				
					// Display cover
					$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").html(gettext("Applying merge…"));

					setTimeout(function() {

						// Initialize variables
						var meshUnion = modelEditor.transformControls.object;
				
						// Update currently selected model's geometry
						meshUnion.geometry.applyMatrix(meshUnion.matrix);
						meshUnion.position.set(0, 0, 0);
						meshUnion.rotation.set(0, 0, 0);
						meshUnion.scale.set(1, 1, 1);
			
						// Go through all models
						for(var i = 1; i < modelEditor.models.length; i++)
	
							// Check if model is selected and it's not the newest selected model
							if(modelEditor.models[i].glow && modelEditor.models[i].mesh != modelEditor.transformControls.object) {
					
								// Update model's geometry
								modelEditor.models[i].mesh.geometry.applyMatrix(modelEditor.models[i].mesh.matrix);
								modelEditor.models[i].mesh.position.set(0, 0, 0);
								modelEditor.models[i].mesh.rotation.set(0, 0, 0);
								modelEditor.models[i].mesh.scale.set(1, 1, 1);
					
								// Create union mesh
								var unionBsp = new ThreeBSP(meshUnion);
								var modelBsp = new ThreeBSP(modelEditor.models[i].mesh);
								meshUnion = unionBsp.union(modelBsp).toMesh(new THREE.MeshLambertMaterial(filamentMaterials[modelEditorFilamentColor]));
				
								// Delete model
								modelEditor.scene[0].remove(modelEditor.models[i].mesh);
								modelEditor.scene[1].remove(modelEditor.models[i].glow);
								if(modelEditor.models[i].adhesion !== null) {
									modelEditor.scene[0].remove(modelEditor.models[i].adhesion.mesh);
									modelEditor.scene[1].remove(modelEditor.models[i].adhesion.glow);
								}
								modelEditor.models.splice(i--, 1);
				
								// Center union mesh's geometry
								meshUnion.updateMatrixWorld();
								var positionBefore = meshUnion.geometry.vertices[0].clone();
								positionBefore.applyMatrix4(meshUnion.matrixWorld);
		
								meshUnion.geometry.center();
								meshUnion.geometry.computeFaceNormals();
		
								var positionAfter = meshUnion.geometry.vertices[0].clone();
								positionAfter.applyMatrix4(meshUnion.matrixWorld);
								meshUnion.position.set(meshUnion.position.x + positionBefore.x - positionAfter.x, meshUnion.position.y + positionBefore.y - positionAfter.y, meshUnion.position.z + positionBefore.z - positionAfter.z);
							}
				
						// Go through all models
						for(var i = 1; i < modelEditor.models.length; i++)
				
							// Check if currently selected model
							if(modelEditor.models[i].mesh == modelEditor.transformControls.object) {
					
								// Delete model
								modelEditor.scene[0].remove(modelEditor.models[i].mesh);
								modelEditor.scene[1].remove(modelEditor.models[i].glow);
								if(modelEditor.models[i].adhesion !== null) {
									modelEditor.scene[0].remove(modelEditor.models[i].adhesion.mesh);
									modelEditor.scene[1].remove(modelEditor.models[i].adhesion.glow);
								}
								var type = modelEditor.models[i].type;
								modelEditor.models.splice(i--, 1);
						
								// Break
								break;
							}
				
						// Add union mesh to scene
						modelEditor.scene[0].add(meshUnion);
			
						// Add union mesh to list
						modelEditor.models.push({
							mesh: meshUnion,
							type: type,
							glow: null,
							adhesion: modelEditor.createPlatformAdhesion(meshUnion)
						});
			
						// Select union mesh
						modelEditor.selectModel(meshUnion);
				
						// Fix model's Y
						modelEditor.fixModelY();
					
						// Hide cover
						$("#slicing_configuration_dialog .modal-cover").removeClass("show");
						setTimeout(function() {
							$("#slicing_configuration_dialog .modal-cover").css("z-index", '');
						}, 200);
					}, 600);
				},
				
				// Line geometry
				lineGeometry: function(geometry) {
			
					// Create line geometry
					var lineGeometry = new THREE.Geometry();
				
					// Go through all geometry's quads
					for(var i = 0; i < geometry.faces.length - 1; i += 2) {
				
						// Get quad's vertices
						var quadVertices = [];
						quadVertices[0] = geometry.vertices[geometry.faces[i].a].clone();
						quadVertices[1] = geometry.vertices[geometry.faces[i].b].clone();
						quadVertices[2] = geometry.vertices[geometry.faces[i + 1].b].clone();
						quadVertices[3] = geometry.vertices[geometry.faces[i + 1].c].clone();
						quadVertices[4] = quadVertices[0];
					
						// Check if first quad
						if(!lineGeometry.vertices.length) {
					
							// Append quad's vertices to line geometry
							for(var j = 0; j < 4; j++)
								lineGeometry.vertices.push(quadVertices[j], quadVertices[j + 1]);
						}
					
						// Otherwise
						else {
					
							// Go through all quad's vertecies
							for(var j = 0; j < 4; j++)
					
								// Go through all line geometry's vertecies
								for(var k = 0; k < lineGeometry.vertices.length - 1; k += 2) {
							
									// Check if line exists
									if((lineGeometry.vertices[k].equals(quadVertices[j]) && lineGeometry.vertices[k + 1].equals(quadVertices[j + 1])) || (lineGeometry.vertices[k].equals(quadVertices[j + 1]) && lineGeometry.vertices[k + 1].equals(quadVertices[j])))
								
										// Break
										break;
								
									// Check if line doesn't exists
									if(k == lineGeometry.vertices.length - 2) {
								
										// Append quad's vertices to line geometry
										lineGeometry.vertices.push(quadVertices[j], quadVertices[j + 1]);
										break;
									}
								}
						}
					}
				
					// Compute line distance
					lineGeometry.computeLineDistances();
				
					// Return line geometry
					return lineGeometry;
				},

				// Render
				render: function() {

					// Update controls
					modelEditor.transformControls.update();
					modelEditor.orbitControls.update();
			
					// Check if a model is currently selected
					if(modelEditor.transformControls.object) {
			
						// Get camera distance to model
						var distance = modelEditor.camera.position.distanceTo(modelEditor.transformControls.object.position);
						if(distance < 200)
							distance = 200;
						else if(distance > 500)
							distance = 500;

						// Set measurement size
						$("#slicing_configuration_dialog .modal-extra div.measurements > p").css("font-size", 8 + ((500 / distance) - 1) / (2.5 - 1) * (13 - 8) + "px");
	
						// Set z index order for measurement values
						var order = [];
						for(var j = 0; j < 3; j++)
							order[j] = modelEditor.camera.position.distanceTo(modelEditor.measurements[j][1]);
	
						for(var j = 0; j < 3; j++) {
							var lowest = order.indexOf(Math.max.apply(Math, order));
							$("#slicing_configuration_dialog .modal-extra div.measurements > p").eq(lowest).css("z-index", j);
							order[lowest] = Number.NEGATIVE_INFINITY;
						}
	
						// Position measurement values
						for(var j = 0; j < 3; j++) {
							var position = modelEditor.get2dPosition(modelEditor.measurements[j][1]);
							$("#slicing_configuration_dialog .modal-extra div.measurements > p").eq(j).css({
								"top": position.y - 3 + "px",
								"left": position.x - $("#slicing_configuration_dialog .modal-extra div.measurements > p").eq(j).width() / 2 + "px"
							});
						}
		
						// Go through all models
						for(var i = 1; i < modelEditor.models.length; i++)
		
							// Check if model is selected
							if(modelEditor.models[i].glow !== null)
					
								// Update glow's view vector
								modelEditor.models[i].glow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(modelEditor.camera.position, modelEditor.models[i].glow.position);
					}

					// Render scene
					modelEditor.renderer.clear();
					modelEditor.renderer.render(modelEditor.scene[0], modelEditor.camera);
					modelEditor.renderer.clearDepth();
					modelEditor.renderer.render(modelEditor.scene[1], modelEditor.camera);
				}
			};

			// Create model editor
			modelEditor.init();
		}
	
		// Convert to STL
		function convertToStl(file, type) {
	
			// Set loader
			if(type == "obj")
				var loader = new THREE.OBJLoader();
			else if(type == "m3d")
				var loader = new THREE.M3DLoader();
			else if(type == "amf")
				var loader = new THREE.AMFLoader();
			else if(type == "wrl")
				var loader = new THREE.VRMLLoader();
			else if(type == "dae")
				var loader = new THREE.ColladaLoader();
			else if(type == "3mf")
				var loader = new THREE.ThreeMFLoader();
		
			// Load model
			return loader.load(file, function(geometry) {
				
				// Create model's mesh
				var mesh = new THREE.Mesh(geometry);
			
				// Set model's rotation
				if(type == "obj")
					mesh.rotation.set(Math.PI / 2, Math.PI, 0);
				else if(type == "m3d")
					mesh.rotation.set(0, 0, Math.PI / 2);
				else if(type == "amf")
					mesh.rotation.set(-Math.PI / 2, 0, Math.PI);
				else if(type == "wrl")
					mesh.rotation.set(-Math.PI / 2, 0, Math.PI);
				else if(type == "dae")
					mesh.rotation.set(-Math.PI / 2, 0, Math.PI);
				else if(type == "3mf")
					mesh.rotation.set(0, 0, 0);
			
				// Set model's orientation
				mesh.position.set(0, 0, 0);
				mesh.scale.set(1, 1, 1);
				mesh.updateMatrix();
				mesh.geometry.applyMatrix(mesh.matrix);
			
				// Get mesh as an STL
				var exporter = new THREE.STLBinaryExporter();
				convertedModel = new Blob([exporter.parse(mesh).buffer], {type: "text/plain"});
			});
		}
		
		// Preload all images
		preload(
			PLUGIN_BASEURL + "m33fio/static/img/logo.png",
			PLUGIN_BASEURL + "m33fio/static/img/hengLiXin.png",
			PLUGIN_BASEURL + "m33fio/static/img/listener.png",
			PLUGIN_BASEURL + "m33fio/static/img/shenzhew.png",
			PLUGIN_BASEURL + "m33fio/static/img/xinyujie.png",
			PLUGIN_BASEURL + "m33fio/static/img/custom.png",
			PLUGIN_BASEURL + "m33fio/static/img/loading.gif",
			PLUGIN_BASEURL + "m33fio/static/img/black.png",
			PLUGIN_BASEURL + "m33fio/static/img/white.png",
			PLUGIN_BASEURL + "m33fio/static/img/blue.png",
			PLUGIN_BASEURL + "m33fio/static/img/green.png",
			PLUGIN_BASEURL + "m33fio/static/img/orange.png",
			PLUGIN_BASEURL + "m33fio/static/img/clear.png",
			PLUGIN_BASEURL + "m33fio/static/img/silver.png",
			PLUGIN_BASEURL + "m33fio/static/img/purple.png",
			PLUGIN_BASEURL + "m33fio/static/img/filament.png",
			PLUGIN_BASEURL + "m33fio/static/img/import.png",
			PLUGIN_BASEURL + "m33fio/static/img/translate.png",
			PLUGIN_BASEURL + "m33fio/static/img/rotate.png",
			PLUGIN_BASEURL + "m33fio/static/img/scale.png",
			PLUGIN_BASEURL + "m33fio/static/img/snap.png",
			PLUGIN_BASEURL + "m33fio/static/img/delete.png",
			PLUGIN_BASEURL + "m33fio/static/img/clone.png",
			PLUGIN_BASEURL + "m33fio/static/img/reset.png",
			PLUGIN_BASEURL + "m33fio/static/img/cut.png",
			PLUGIN_BASEURL + "m33fio/static/img/merge.png",
			PLUGIN_BASEURL + "m33fio/static/img/axes.png",
			PLUGIN_BASEURL + "m33fio/static/img/boundaries.png",
			PLUGIN_BASEURL + "m33fio/static/img/measurements.png",
			PLUGIN_BASEURL + "m33fio/static/img/grid.png",
			PLUGIN_BASEURL + "m33fio/static/img/cube.png",
			PLUGIN_BASEURL + "m33fio/static/img/sphere.png",
			PLUGIN_BASEURL + "m33fio/static/img/test-border-good.png",
			PLUGIN_BASEURL + "m33fio/static/img/test-border-high.png",
			PLUGIN_BASEURL + "m33fio/static/img/test-border-low.png",
			PLUGIN_BASEURL + "m33fio/static/img/backlash.png",
			PLUGIN_BASEURL + "m33fio/static/img/graph-background.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-density_extra-high.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-density_full.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-density_high.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-density_low.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-density_medium.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-density_thick.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-density_thin.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-pattern_3dhoneycomb.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-pattern_archimedeanchords.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-pattern_concentric.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-pattern_hilbertcurve.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-pattern_honeycomb.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-pattern_line.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-pattern_octagramspiral.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-pattern_rectilinear.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-quality_extra-high.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-quality_extra-low.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-quality_high.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-quality_highest.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-quality_low.png",
			PLUGIN_BASEURL + "m33fio/static/img/fill-quality_medium.png"
		);
		
		// Create model viewer tab
		$("#control_link").after('\
			<li id="model_link">\
				<a href="#model" data-toggle="tab">' + gettext("Model Viewer") + '</a>\
			</li>\
		');
		
		$("#tabs + div.tab-content").append('\
			<div id="model" class="tab-pane">\
				<div>\
					<div>\
						<div class="cover">\
							<img src="' + PLUGIN_BASEURL + 'm33fio/static/img/loading.gif">\
							<p></p>\
						</div>\
					</div>\
				</div>\
			</div>\
		');
		
		// Create model viewer
		createModelViewer();
		
		// Subscribe to printer profile changes
		self.settings.printerProfiles.currentProfileData.subscribe(function() {
				
			// Update model viewer's grid
			modelViewer.updateGrid();
		});
		
		// Add mid-print filament change settings
		$("#gcode div.progress").after('\
			<div class="midPrintFilamentChange notUsingAMicro3DPrinter micro3d">\
				<h1>' + gettext("Mid-print filament change") + '</h1>\
				<label title="' + encodeQuotes(gettext("Mid-print filament change commands will be added at the start of each specified layer. Layer numbers should be seperated by a space.")) + '">' + gettext("Layers") + '<input type="text" pattern="[\\d\\s]*" class="input-block-level"></label>\
				<button class="btn btn-block control-box" data-bind="enable: loginState.isUser() && enableReload">' + gettext("Add current layer") + '</button>\
				<button class="btn btn-block control-box" data-bind="enable: loginState.isUser()">' + gettext("Clear all layers") + '</button>\
				<button class="btn btn-block control-box" data-bind="enable: loginState.isUser()">' + gettext("Save") + '</button>\
			</div>\
		');
		
		// Add 0.01 movement control
		$("#control > div.jog-panel").eq(0).addClass("controls").find("div.distance > div").prepend('\
			<button type="button" id="control-distance001" class="btn distance micro3d" data-distance="0.01" data-bind="enable: loginState.isUser()">0.01</button>\
		');
		$("#control > div.jog-panel.controls").find("div.distance > div > button:nth-of-type(3)").click();
	
		// Change tool section text
		$("#control > div.jog-panel").eq(1).addClass("extruder").find("h1").html(gettext("Extruder")).next("div").prepend('\
			<h1 class="heatbed micro3d">' + gettext("Extruder") + '</h1>\
		');

		// Create motor on control
		$("#control > div.jog-panel").eq(2).addClass("general").find("div").prepend('\
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() {\
				$root.sendCustomCommand({\
					type: \'command\',\
					command: \'M17\'\
				})\
			}" title="' + encodeQuotes(gettext("Turns on printer's motors")) + '">' + gettext("Motors on") + '</button>\
		');
		$("#control > div.jog-panel.general").find("button:nth-of-type(2)").attr("title", htmlDecode(gettext("Turns off printer's motors")));
		
		// Change fan controls
		$("#control > div.jog-panel.general").find("button:nth-of-type(2)").after('\
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && loginState.isUser()">' + gettext("Fan on") + '</button>\
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && loginState.isUser()">' + gettext("Fan off") + '</button>\
		');
		$("#control > div.jog-panel.general").find("button:nth-of-type(5)").remove();
		$("#control > div.jog-panel.general").find("button:nth-of-type(5)").remove();
		
		// Create absolute and relative controls, print settings, and emergency stop
		$("#control > div.jog-panel.general").find("div").append('\
			<button class="btn btn-block control-box micro3d" data-bind="enable: isOperational() && loginState.isUser()">' + gettext("LED on") + '</button>\
			<button class="btn btn-block control-box micro3d" data-bind="enable: isOperational() && loginState.isUser(), click: function() {\
				$root.sendCustomCommand({\
					type: \'command\',\
					command: \'M420 T0*\'\
				})\
			}" title="' + encodeQuotes(gettext("Turns off front LED")) + '">' + gettext("LED off") + '</button>\
			<button class="btn btn-block control-box gpio micro3d" data-bind="enable: isOperational() && loginState.isUser(), click: function() {\
				$root.sendCustomCommand({\
					type: \'command\',\
					command: \'M106 T1*\'\
				})\
			}" title="' + encodeQuotes(gettext("Sets GPIO pin high")) + '">' + gettext("GPIO high") + '</button>\
			<button class="btn btn-block control-box gpio micro3d" data-bind="enable: isOperational() && loginState.isUser(), click: function() {\
				$root.sendCustomCommand({\
					type: \'command\',\
					command: \'M107 T1*\'\
				})\
			}" title="' + encodeQuotes(gettext("Sets GPIO pin low")) + '">' + gettext("GPIO low") + '</button>\
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() {\
				$root.sendCustomCommand({\
					type: \'command\',\
					command: \'G90\'\
				})\
			}" title="' + encodeQuotes(gettext("Sets extruder to use absolute positioning")) + '">' + gettext("Absolute mode") + '</button>\
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() {\
				$root.sendCustomCommand({\
					type: \'command\',\
					command: \'G91\'\
				})\
			}" title="' + encodeQuotes(gettext("Sets extruder to use relative positioning")) + '">' + gettext("Relative mode") + '</button>\
			<button class="btn btn-block control-box micro3d" data-bind="enable: loginState.isUser()">' + gettext("Print settings") + '</button>\
			<button class="btn btn-block control-box micro3d" data-bind="enable: isOperational() && loginState.isUser()">' + gettext("Emergency stop") + '</button>\
		');
	
		// Add filament controls
		$("#control > div.jog-panel.general").after('\
			<div class="jog-panel filament micro3d" data-bind="visible: loginState.isUser">\
				<h1>' + gettext("Filament") + '</h1>\
				<div>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Unload") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Load") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && isPrinting() && loginState.isUser()">' + gettext("Mid-print change") + '</button>\
				</div>\
			</div>\
		');
	
		// Add calibration controls
		$("#control > div.jog-panel.filament").after('\
			<div class="jog-panel calibration micro3d" data-bind="visible: loginState.isUser">\
				<h1>' + gettext("Calibration") + '</h1>\
				<div>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Calibrate bed center Z0") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Calibrate bed orientation") + '</button>\
					<button class="btn btn-block control-box arrow" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-down"></i></button>\
					<button class="btn btn-block control-box arrow point" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-down"></i></button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Save Z as front left Z0") + '</button>\
					<button class="btn btn-block control-box arrow" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-down"></i></button>\
					<button class="btn btn-block control-box arrow point" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-down"></i></button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Save Z as front right Z0") + '</button>\
					<button class="btn btn-block control-box arrow" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-up"></i></button>\
					<button class="btn btn-block control-box arrow point" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-down"></i></button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Save Z as back right Z0") + '</button>\
					<button class="btn btn-block control-box arrow" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-up"></i></button>\
					<button class="btn btn-block control-box arrow point" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-down"></i></button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Save Z as back left Z0") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Save Z as bed center Z0") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Save Z as external bed height") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Print 0.4mm test border") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Print backlash calibration") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Run complete bed calibration") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: loginState.isUser() && !isPrinting()">' + gettext("Save printer settings to file") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: loginState.isUser() && !isPrinting()">' + gettext("Restore printer settings from file") + '</button>\
					<input type="file" accept=".yaml">\
				</div>\
			</div>\
		');
	
		// Add advanced controls
		$("#control > div.jog-panel.calibration").after('\
			<div class="jog-panel advanced micro3d" data-bind="visible: loginState.isUser">\
				<h1>' + gettext("Advanced") + '</h1>\
				<div>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/hengLiXin.png">' + gettext("HengLiXin fan") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/listener.png">' + gettext("Listener fan") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/shenzhew.png">' + gettext("Shenzhew fan") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/xinyujie.png">' + gettext("Xinyujie fan") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/custom.png">' + gettext("Custom fan") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("500mA extruder current") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("660mA extruder current") + '</button>\
					<button class="btn btn-block control-box placeHolder" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"></button>\
					<button class="btn btn-block control-box placeHolder" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"></button>\
					<button class="btn btn-block control-box placeHolder" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"></button>\
					<button class="btn btn-block control-box placeHolder" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"></button>\
					<button class="btn btn-block control-box placeHolder" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"></button>\
					<button class="btn btn-block control-box placeHolder" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"></button>\
					<p></p>\
					<input type="file" accept=".rom, .bin, .hex">\
				</div>\
			</div>\
		');
		
		// Create EEPROM table
		var table = "<tr><td></td>";
		for(var i = 0; i < 0x10; i++)
			table += "<td>0x" + i.toString(16).toUpperCase() + "</td>";
		
		for(var i = 0; i < 0x300; i++) {
		
			if(i % 0x10 == 0)
				table += "</tr><tr><td>0x" + (i / 0x10).toString(16).toUpperCase() + "</td>";
			
			table += "<td><input data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\" type=\"text\" maxlength=\"2\" autocomplete=\"off\" value=\"??\"";
			
			// Mark offsets
			for(var key in eepromOffsets)
				for(var j = 0; j < eepromOffsets[key].bytes; j++)
				
					if(eepromOffsets[key].offset + j == i) {
					
						table += " style=\"background-color: " + eepromOffsets[key].color + ";\" class=\"" + key + "\" title=\"" + encodeQuotes(eepromOffsets[key].name) + '"';
						j = eepromOffsets.length;
						break;
					}
			
			table += "></td>";
		}
		table += "</tr>";
		
		// Add EEPROM controls
		$("#control > div.jog-panel.advanced").after('\
			<div class="jog-panel eeprom micro3d" data-bind="visible: loginState.isUser">\
				<h1>' + gettext("EEPROM") + '</h1>\
				<div>\
					<table><tbody>' + table + '</tbody></table>\
					<input data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()" type="radio" name="display" value="hexadecimal" checked><label>' + gettext("Hexadecimal") + '</label>\
					<input data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()" type="radio" name="display" value="decimal"><label>' + gettext("Decimal") + '</label>\
					<input data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()" type="radio" name="display" value="ascii"><label>' + gettext("ASCII") + '</label><br>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Read EEPROM") + '</button>\
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">' + gettext("Write EEPROM") + '</button>\
				</div>\
			</div>\
		');
	
		// Add temperature controls
		$("#control > div.jog-panel.extruder").find("div > button:nth-of-type(3)").after('\
			<div style="width: 114px;" class="slider slider-horizontal micro3d">\
				<div class="slider-track">\
					<div style="left: 0%; width: 0%;" class="slider-selection"></div>\
					<div style="left: 0%;" class="slider-handle round"></div>\
					<div style="left: 0%;" class="slider-handle round hide"></div>\
				</div>\
				<div style="top: -24px; left: -19px;" class="tooltip top hide">\
					<div class="tooltip-arrow"></div>\
					<div class="tooltip-inner"></div>\
				</div>\
				<input style="width: 100px;" data-bind="slider: {\
					min: 100,\
					max: 265,\
					step: 1,\
					value: flowRate,\
					tooltip: \'hide\'\
				}" type="number">\
			</div>\
			<button class="btn btn-block control-box micro3d" data-bind="enable: isOperational() && loginState.isUser()">' + gettext("Temperature") + ':<span data-bind="text: flowRate() + 50 + \'°C\'"></span></button>\
			<button class="btn btn-block control-box micro3d" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() {\
				$root.sendCustomCommand({\
					type: \'command\',\
					command: \'M104 S0\'\
				})\
			}" title="' + encodeQuotes(gettext("Turns off extruder's heater")) + '">' + gettext("Heater off") + '</button>\
			<div class="heatbed micro3d">\
				<h1 class="heatbed">' + gettext("Heatbed") + '</h1>\
				<div style="width: 114px;" class="slider slider-horizontal">\
					<div class="slider-track">\
						<div style="left: 0%; width: 0%;" class="slider-selection"></div>\
						<div style="left: 0%;" class="slider-handle round"></div>\
						<div style="left: 0%;" class="slider-handle round hide"></div>\
					</div>\
					<div style="top: -24px; left: -19px;" class="tooltip top hide">\
						<div class="tooltip-arrow"></div>\
						<div class="tooltip-inner"></div>\
					</div>\
					<input style="width: 100px;" data-bind="slider: {\
						min: 100,\
						max: 170,\
						step: 1,\
						value: feedRate,\
						tooltip: \'hide\'\
					}" type="number">\
				</div>\
				<button class="btn btn-block control-box" data-bind="enable: isOperational() && loginState.isUser()">' + gettext("Temperature") + ':<span data-bind="text: feedRate() -60 + \'°C\'"></span></button>\
				<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() {\
					$root.sendCustomCommand({\
						type: \'command\',\
						command: \'M140 S0\'\
					})\
				}" title="' + encodeQuotes(gettext("Turns off heatbed's heater")) + '">' + gettext("Heater off") + '</button>\
			<div>\
		');
		
		// Add message
		$("body > div.page-container").append('\
			<div class="message">\
				<div>\
					<h4></h4>\
					<img src="' + PLUGIN_BASEURL + 'm33fio/static/img/loading.gif">\
					<div>\
						<p></p>\
						<div class="calibrate">\
							<div class="arrows">\
								<button class="btn btn-block control-box arrow up" title="' + encodeQuotes(gettext("Applies extruder's position adjustment in the positive direction")) + '"><i class="icon-arrow-up"></i></button>\
								<button class="btn btn-block control-box arrow down" title="' + encodeQuotes(gettext("Applies extruder's position adjustment in the negative direction")) + '"><i class="icon-arrow-down"></i></button>\
							</div>\
							<div class="distance">\
								<button type="button" class="btn distance" title="' + encodeQuotes(gettext("Sets extruder's position adjustment to 0.01mm")) + '" data-distance="0.01">0.01</button>\
								<button type="button" class="btn distance" title="' + encodeQuotes(gettext("Sets extruder's position adjustment to 0.1mm")) + '" data-distance="0.1">0.1</button>\
								<button type="button" class="btn distance active" title="' + encodeQuotes(gettext("Sets extruder's position adjustment to 1mm")) + '" data-distance="1">1</button>\
								<button type="button" class="btn distance" title="' + encodeQuotes(gettext("Sets extruder's position adjustment to 10mm")) + '" data-distance="10">10</button>\
							</div>\
						</div>\
						<div class="printSettings">\
							<h3>' + gettext("Print settings") + '</h3>\
							<div class="control-group">\
								<label class="control-label">' + gettext("Filament Temperature") + '</label>\
								<div class="controls">\
									<div class="input-append degreesCelsius">\
										<input type="number" step="1" min="150" max="315" class="input-block-level">\
										<span class="add-on">°C</span>\
									</div>\
								</div>\
							</div>\
							<div class="control-group heatbed">\
								<label class="control-label">' + gettext("Heatbed Temperature") + '</label>\
								<div class="controls">\
									<div class="input-append degreesCelsius">\
										<input type="number" step="1" min="0" max="110" class="input-block-level">\
										<span class="add-on">°C</span>\
									</div>\
								</div>\
							</div>\
							<div class="control-group">\
								<label class="control-label">' + gettext("Filament Type") + '</label>\
								<div class="controls">\
									<select class="input-block-level">\
										<option value="ABS">' + _.sprintf(gettext("ABS (Recommended %(temperature)d°C)"), {temperature: 275}) + '</option>\
										<option value="PLA">' + _.sprintf(gettext("PLA (Recommended %(temperature)d°C)"), {temperature: 215}) + '</option>\
										<option value="HIPS">' + _.sprintf(gettext("HIPS (Recommended %(temperature)d°C)"), {temperature: 265}) + '</option>\
										<option value="FLX">' + _.sprintf(gettext("FLX (Recommended %(temperature)d°C)"), {temperature: 220}) + '</option>\
										<option value="TGH">' + _.sprintf(gettext("TGH (Recommended %(temperature)d°C)"), {temperature: 220}) + '</option>\
										<option value="CAM">' + _.sprintf(gettext("CAM (Recommended %(temperature)d°C)"), {temperature: 215}) + '</option>\
										<option value="ABS-R">' + _.sprintf(gettext("ABS-R (Recommended %(temperature)d°C)"), {temperature: 240}) + '</option>\
										<option value="OTHER">' + gettext("Other") + '</option>\
									</select>\
								</div>\
							</div>\
							<div class="control-group">\
								<div class="controls">\
									<label class="checkbox" title="' + encodeQuotes(gettext("Smooths out the bottom layer")) + '">\
										<input type="checkbox" class="input-block-level" data-bind="checked: settings.plugins.m33fio.UseWaveBondingPreprocessor"><span>' + gettext("Use Wave Bonding") + '</span>\
									</label>\
								</div>\
							</div>\
						</div>\
						<div class="filamentSettings">\
							<h3>' + gettext("Filament settings") + '</h3>\
							<div class="control-group">\
								<label class="control-label"></label>\
								<div class="controls">\
									<div class="input-append degreesCelsius">\
										<input type="number" step="1" min="150" max="315" class="input-block-level">\
										<span class="add-on">°C</span>\
									</div>\
								</div>\
							</div>\
							<p></p>\
						</div>\
						<div>\
							<button class="btn btn-block confirm"></button>\
							<button class="btn btn-block confirm"></button>\
							<button class="btn btn-block confirm"></button>\
						</div>\
						<span>' + gettext("Do not refresh this page or disconnect from the server at this time") + '</span>\
					</div>\
				</div>\
			</div>\
		');
		
		// Add covers to slicer
		$("#slicing_configuration_dialog").append('\
			<div class="modal-cover">\
				<img src="' + PLUGIN_BASEURL + 'm33fio/static/img/loading.gif">\
				<p></p>\
			</div>\
			<div class="modal-drag-and-drop"></div>\
		');
		
		// Change slicer text
		$("#slicing_configuration_dialog").find("h3").before('\
			<p class="currentMenu">' + gettext("Select Profile") + '</p>\
		');
		
		// Add save button and warning
		$("#slicing_configuration_dialog .modal-footer").append("<a href=\"#\" class=\"btn save\" data-dismiss=\"modal\">" + gettext("Save") + "</a><a class=\"link\"></a><p class=\"warning\"></p>");
		
		// Add skip model editor button
		$("#slicing_configuration_dialog > div.modal-footer > .btn-primary").before("<a href=\"#\" class=\"btn skip\" data-dismiss=\"modal\">" + gettext("Skip Model Editor") + "</a>");
		
		// Wrap movement controls in section
		$("#control > div.jog-panel.controls > *").wrapAll("<div></div>");
		
		// Add section control arrows
		$("#control > div.jog-panel").append('\
			<i></i>\
		');
		
		// Add header to movement controls
		$("#control > div.jog-panel.controls").prepend('\
			<h1>' + gettext("Movement") + '</h1>\
		');
		
		// Hide heatbed controls
		$("#control .heatbed, #settings_plugin_m33fio .heatbed, body > div.page-container > div.message .heatbed").css("display", "none");
		
		// Open and close control sections
		if(typeof localStorage.movementControlsOpen === "undefined" || localStorage.movementControlsOpen == "true")
			$("#control > div.jog-panel.controls").removeClass("closed");
		else
			$("#control > div.jog-panel.controls").addClass("closed");
			
		if(typeof localStorage.extruderControlsOpen === "undefined" || localStorage.extruderControlsOpen == "true")
			$("#control > div.jog-panel.extruder").removeClass("closed");
		else
			$("#control > div.jog-panel.extruder").addClass("closed");
		
		if(typeof localStorage.generalControlsOpen === "undefined" || localStorage.generalControlsOpen == "true")
			$("#control > div.jog-panel.general").removeClass("closed");
		else
			$("#control > div.jog-panel.general").addClass("closed");
		
		if(typeof localStorage.filamentControlsOpen === "undefined" || localStorage.filamentControlsOpen == "false")
			$("#control > div.jog-panel.filament").addClass("closed");
		else
			$("#control > div.jog-panel.filament").removeClass("closed");
			
		if(typeof localStorage.calibrationControlsOpen === "undefined" || localStorage.calibrationControlsOpen == "false")
			$("#control > div.jog-panel.calibration").addClass("closed");
		else
			$("#control > div.jog-panel.calibration").removeClass("closed");
			
		if(typeof localStorage.advancedControlsOpen === "undefined" || localStorage.advancedControlsOpen == "false")
			$("#control > div.jog-panel.advanced").addClass("closed");
		else
			$("#control > div.jog-panel.advanced").removeClass("closed");
			
		if(typeof localStorage.eepromControlsOpen === "undefined" || localStorage.eepromControlsOpen == "false")
			$("#control > div.jog-panel.eeprom").addClass("closed");
		else
			$("#control > div.jog-panel.eeprom").removeClass("closed");
		
		// Set section control arrow images
		$("#control > div.jog-panel > i").each(function() {
		
			if($(this).parent().hasClass("closed"))
				$(this).removeClass("icon-caret-up").addClass("icon-caret-down");
			else
				$(this).removeClass("icon-caret-down").addClass("icon-caret-up");
		});
		
		// Mouse enter control arrow event
		$("#control > div.jog-panel > i").mouseenter(function() {

			// Set tooltip
			$(this).attr("title", $(this).parent().hasClass("closed") ? htmlDecode(gettext("Open")) : htmlDecode(gettext("Close")));
		
		// Mouse control arrow event
		}).click(function() {
		
			// Open or close section
			if($(this).parent().hasClass("closed")) {
				
				// Get full height
				var location = $(this).siblings("div");
				var height = location.height() + "px";
				$(this).parent().removeClass("closed");
				var newHeight = location.height() + "px";
				location.css("height", height);
			
				setTimeout(function() {
			
					// Transition into full height
					location.css("height", newHeight);
				
					setTimeout(function() {
		
						// Update currently shown posts
						location.css("height", '');
					}, 300);
					
					// Save that section is open
					if(location.parent().hasClass("controls"))
						localStorage.movementControlsOpen = "true";
					else if(location.parent().hasClass("extruder"))
						localStorage.extruderControlsOpen = "true";
					else if(location.parent().hasClass("general"))
						localStorage.generalControlsOpen = "true";
					else if(location.parent().hasClass("filament"))
						localStorage.filamentControlsOpen = "true";
					else if(location.parent().hasClass("calibration"))
						localStorage.calibrationControlsOpen = "true";
					else if(location.parent().hasClass("advanced"))
						localStorage.advancedControlsOpen = "true";
					else if(location.parent().hasClass("eeprom"))
						localStorage.eepromControlsOpen = "true";
				}, 0);
				
				// Change arrow image
				$(this).removeClass("icon-caret-down").addClass("icon-caret-up");
			}
			else {
			
				// Get current height
				var location = $(this).siblings("div");
				var height = location.height() + "px";
				location.css("height", height);
				var image = $(this);
				
				setTimeout(function() {
				
					// Change arrow image
					$(this).removeClass("icon-caret-up").addClass("icon-caret-down");
			
					// Transition into no height
					location.parent().addClass("closed");
					location.css("height", '');
					
					// Save that section is closed
					if(location.parent().hasClass("controls"))
						localStorage.movementControlsOpen = "false";
					else if(location.parent().hasClass("extruder"))
						localStorage.extruderControlsOpen = "false";
					else if(location.parent().hasClass("general"))
						localStorage.generalControlsOpen = "false";
					else if(location.parent().hasClass("filament"))
						localStorage.filamentControlsOpen = "false";
					else if(location.parent().hasClass("calibration"))
						localStorage.calibrationControlsOpen = "false";
					else if(location.parent().hasClass("advanced"))
						localStorage.advancedControlsOpen = "false";
					else if(location.parent().hasClass("eeprom"))
						localStorage.eepromControlsOpen = "false";
				}, 50);
				
				// Change arrow image
				$(this).removeClass("icon-caret-up").addClass("icon-caret-down");
			}
			
			// Update title
			$(this).mouseenter();
		});
		
		// Control button click event
		$(document).on("click", "#control button", function() {

			// Blur self
			$(this).blur();
		});
		
		// Add mid-print filament change layer event
		$("#gcode div.midPrintFilamentChange button").eq(0).attr("title", htmlDecode(gettext("Appends current layer to mid-print filament change layers"))).click(function() {
		
			// Blue self
			$(this).blur();
			
			// Initialzie variables
			var currentLayer = (self.gcode.currentLayer + 1).toString();
			var currentValue = $("#gcode div.midPrintFilamentChange input").val();
			var index = (' ' + currentValue + ' ').indexOf(' ' + currentLayer + ' ');
			
			// Update layers input
			if(!$("#gcode div.midPrintFilamentChange input").val().length)
				$("#gcode div.midPrintFilamentChange input").val(currentLayer);
			else if(index === -1)
				$("#gcode div.midPrintFilamentChange input").val(($("#gcode div.midPrintFilamentChange input").val().length ? $("#gcode div.midPrintFilamentChange input").val() + ' ' : '') + currentLayer);
			else
				$("#gcode div.midPrintFilamentChange input").val(((currentValue.substr(0, index) + currentValue.substr(index + currentLayer.length)).trim() + ' ' + currentLayer).trim().replace(/\s+/g, ' '));			
		});
		
		// Clear all mid-print filament change layers event
		$("#gcode div.midPrintFilamentChange button").eq(1).attr("title", htmlDecode(gettext("Clears all mid-print filament change layers"))).click(function() {
		
			// Blue self
			$(this).blur();
		
			// Clear value
			$("#gcode div.midPrintFilamentChange input").val('');
		});
		
		// Save mid-print filament change layer event
		$("#gcode div.midPrintFilamentChange button").eq(2).attr("title", htmlDecode(gettext("Saves current mid-print filament change layers"))).click(function() {
		
			// Blue self
			$(this).blur();
		
			// Show message
			showMessage(gettext("Saving Status"), gettext("Saving changes"));
			
			setTimeout(function() {
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Mid-Print Filament Change Layers:" + $("#gcode div.midPrintFilamentChange input").val()
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				
				// Done
				}).done(function() {
				
					// Hide message
					hideMessage();
			
					// Update settings
					self.settings.requestData();
				});
			}, 500);
		});
		
		// Print button click event
		$("#job_print").click(function(event) {
		
			// Initialize variables
			var button = $(this);
			
			// Check if not continuing with print, using a Micro 3D printer, and starting a print
			if(!continueWithPrint && !self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter() && button.children("span").html() == getAlreadyTranslatedText("Print")) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
			
				// Check if using on the fly pre-processing and changing settings before print
				if(self.settings.settings.plugins.m33fio.PreprocessOnTheFly() && self.settings.settings.plugins.m33fio.ChangeSettingsBeforePrint()) {
			
					// Show message
					showMessage(gettext("Printing Status"), '', gettext("Print"), function() {
			
						// Hide message
						hideMessage();
				
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Print Settings: " + JSON.stringify({
									filamentTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(),
									heatbedTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(),
									filamentType: $("body > div.page-container > div.message > div > div > div.printSettings select").val(),
									useWaveBondingPreprocessor: $("body > div.page-container > div.message > div > div > div.printSettings input[type=\"checkbox\"]").is(":checked")
								})
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
				
						// Done
						}).done(function() {
					
							// Print file
							function printFile() {
						
								// Save software settings
								self.settings.saveData();
							
								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m33fio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({
										command: "message",
										value: "Starting Print"
									}),
									contentType: "application/json; charset=UTF-8",
									traditional: true,
									processData: true
			
								// Done
								}).done(function() {
		
									// Continue with print
									continueWithPrint = true;
									button.click();
								});
							}
					
							// Update settings
							if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
								self.settings.requestData(printFile);
							else
								self.settings.requestData().done(printFile);
						});
					}, gettext("Cancel"), function() {
			
						// Hide message
						hideMessage();
					});
				}
			
				// Otherwise
				else {
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Starting Print"
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
			
					// Done
					}).done(function() {
		
						// Continue with print
						continueWithPrint = true;
						button.click();
					});
				}
			}
			
			// Otherwise check if using a Micro 3D printer and restarting a print
			else if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter() && button.children("span").html() == getAlreadyTranslatedText("Restart")) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
				
				// Check if using new dialog system
				if(typeof OctoPrint !== "undefined" && typeof OctoPrint.job !== "undefined" && typeof OctoPrint.job.restart === "function")
				
					// Show confirmation dialog
					showConfirmationDialog({
						message: getAlreadyTranslatedText("This will restart the print job from the beginning."),
						onproceed: function() {
							
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: "Restarting Print"
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
			
							// Done
							}).done(function() {
							
								// Restart print
								OctoPrint.job.restart();
							});
						}
					});
				
				// Otherwise
				else {
				
					// Show confirmation dialog
					$("#confirmation_dialog .confirmation_dialog_message").html(getAlreadyTranslatedText("This will restart the print job from the beginning."));
					$("#confirmation_dialog .confirmation_dialog_acknowledge").unbind("click").click(function(event) {
				
						// Stop default behavior
						event.preventDefault();
					
						// Hide dialog
						$("#confirmation_dialog").modal("hide");
					
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Restarting Print"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
				
						// Done
						}).done(function() {
		
							// Restart print
							self.printerState._jobCommand("restart");
						});
					});
					$("#confirmation_dialog").modal("show");
				}
			}
			
			// Otherwise
			else
			
				// Clear continue with print
				continueWithPrint = false;
		});
		
		// Set temperature target or offset button event
		$(document).on("click", "#temp button[type=\"submit\"]", function(event) {
		
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
		
				// Get temperature
				var temperature = 0;
			
				$(this).closest("tr").find("input").each(function() {
			
					if(!isNaN(parseInt($(this).val())))
						temperature += parseInt($(this).val());
					else if(!isNaN(parseInt($(this).attr("placeholder"))))
						temperature += parseInt($(this).attr("placeholder"));
				});
			
				// Check if setting extruder temperature
				if($(this).closest("tr").children("th").html() == getAlreadyTranslatedText("Hotend"))
				
					// Set commands
					var commands = [
						"M104 S" + temperature + '*'
					];
			
				// Otherwise check if setting heatbed temperature
				else if($(this).closest("tr").children("th").html() == getAlreadyTranslatedText("Bed"))
			
					// Set commands
					var commands = [
						"M140 S" + temperature + '*'
					];
			
				// Otherwise
				else
			
					// Return
					return;
			
				// Stop default behavior
				event.stopImmediatePropagation();
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
		
		// Set temperature target to preset button event
		$(document).on("click", "#temp ul.dropdown-menu a", function() {
		
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
		
				// Get temperature
				var temperature = 0;
			
				// Check if not turning off
				if($(this).html() != getAlreadyTranslatedText("Off"))
			
					// Set temperature
					temperature = $(this).html().match(/\((\d*)°.+?\)/)[1]
				
				// Check if setting extruder temperature
				if($(this).closest("tr").children("th").html() == getAlreadyTranslatedText("Hotend"))
			
					// Set commands
					var commands = [
						"M104 S" + temperature + '*'
					];
		
				// Otherwise check if setting heatbed temperature
				else if($(this).closest("tr").children("th").html() == getAlreadyTranslatedText("Bed"))
		
					// Set commands
					var commands = [
						"M140 S" + temperature + '*'
					];
		
				// Otherwise
				else
		
					// Return
					return;
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
		
		// Pause print button click event
		$("#job_pause").click(function(event) {
		
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
		
				// Stop default behavior
				event.stopImmediatePropagation();
			
				// Check if not paused
				if(self.printerState.isPaused() !== true) {
			
					// Show message
					showMessage(gettext("Printing Status"), gettext("Pausing print"));
				
					// Wait until paused
					function waitUntilPaused() {
			
						// Check if paused
						if(self.printerState.isPaused() === true)
					
							// Hide message
							hideMessage();
				
						// Otherwise
						else
					
							// Check if paused again
							setTimeout(waitUntilPaused, 100);
					}
					waitUntilPaused();
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Pause"
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				}
			
				// Otherwise
				else {
			
					// Show message
					showMessage(gettext("Printing Status"), gettext("Resuming print"));
				
					// Wait until resumed
					function waitUntilResumed() {
			
						// Check if printing
						if(self.printerState.isPrinting() === true)
					
							// Hide message
							hideMessage();
				
						// Otherwise
						else
						
							// Check if resumed again
							setTimeout(waitUntilResumed, 100);
					}
					waitUntilResumed();
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Resume"
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				}
			}
		});
		
		// Setting label click event
		$("#settings_plugin_m33fio label.control-label").click(function() {
		
			// Focus on input
			$(this).siblings("div.controls").find("input").focus();
		});
		
		// Printer connect button click event
		$("#printer_connect").click(function() {
		
			// Blur self
			$(this).blur();
		
			// Check if using a Micro 3D printer and connecting to it
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter() && $(this).html() == getAlreadyTranslatedText("Connect"))
		
				// Disable printer connect button
				$(this).prop("disabled", true);
		});
		
		// Cancel print button click event
		$("#job_cancel").click(function(event) {
		
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
		
				// Stop default behavior
				event.stopImmediatePropagation();
				
				// Check if using new dialog system
				if(typeof OctoPrint !== "undefined" && typeof OctoPrint.job !== "undefined" && typeof OctoPrint.job.cancel === "function")
				
					// Show confirmation dialog
					showConfirmationDialog({
						message: getAlreadyTranslatedText("This will cancel your print."),
						onproceed: function() {
							
							// Show message
							showMessage(gettext("Printing Status"), gettext("Canceling print"));
	
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: "Cancel Print"
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
							});
						}
					});
				
				// Otherwise
				else {
				
					// Show confirmation dialog
					$("#confirmation_dialog .confirmation_dialog_message").html(getAlreadyTranslatedText("This will cancel your print."));
					$("#confirmation_dialog .confirmation_dialog_acknowledge").unbind("click").click(function(event) {
				
						// Stop default behavior
						event.preventDefault();
					
						// Hide dialog
						$("#confirmation_dialog").modal("hide");
					
						// Show message
						showMessage(gettext("Printing Status"), gettext("Canceling print"));
	
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Cancel Print"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					});
					$("#confirmation_dialog").modal("show");
				}
			}
		});
		
		// Save button click event
		$("#slicing_configuration_dialog .modal-footer a.save").click(function(event) {
		
			// Stop default behavior
			event.stopImmediatePropagation();
			
			// Blur self
			$(this).blur();
			
			// Check if saving profile
			if($("#slicing_configuration_dialog").hasClass("profile")) {
			
				// Display cover
				$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").html(gettext("Saving profile…"));
				
				setTimeout(function() {
			
					// Remove comments from text
					var text = '';
					var lines = $("#slicing_configuration_dialog .modal-extra textarea").val().split('\n');
				
					for(var i = 0; i < lines.length; i++) {
					
						if(slicerName == "cura") {
						
							if(lines[i].indexOf(';') != -1 && lines[i].indexOf(".gcode") == -1 && lines[i][0] != '\t')
								lines[i] = lines[i].substr(0, lines[i].indexOf(';'));
						}
						else if(slicerName == "slic3r") {
						
							if(lines[i].indexOf(';') != -1 && lines[i].indexOf("_gcode") == -1 && lines[i][0] != '\t')
								lines[i] = lines[i].substr(0, lines[i].indexOf(';'));
						}
						
						text += (i ? '\n' : '') + lines[i];
					}
					
					// Set file name
					var fileName = slicerProfileName;
					if(slicerName == "cura")
						fileName += ".ini";
					else if(slicerName == "slic3r")
						fileName += ".ini";
			
					// Download profile
					var blob = new Blob([text.slice(-1) == '\n' ? text.slice(0, -1) : text], {type: "text/plain"});
					saveFile(blob, fileName);
					
					// Hide cover
					$("#slicing_configuration_dialog .modal-cover").removeClass("show");
					setTimeout(function() {
						$("#slicing_configuration_dialog .modal-cover").css("z-index", '');
					}, 200);
				}, 600);
			}
			
			// Otherwise assume saving model
			else {
			
				// Display cover
				$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").html(gettext("Saving model…"));
				
				setTimeout(function() {

					// Download model
					saveFile(modelEditor.exportScene(), modelName);

					// Wait until model is loaded
					function isSceneExported() {

						// Check if scene is exported
						if(modelEditor.sceneExported) {

							// Hide cover
							$("#slicing_configuration_dialog .modal-cover").removeClass("show");
							setTimeout(function() {
								$("#slicing_configuration_dialog .modal-cover").css("z-index", '');
							}, 200);
						}

						// Otherwise
						else

							// Check if scene is exported again
							setTimeout(isSceneExported, 100);
					}
					isSceneExported();
				}, 600);
			}
		});
		
		// Settings checkbox change event
		$("#settings_plugin_m33fio input[type=\"checkbox\"]").change(function() {
		
			// Initialize variables
			var parent = $(this).closest("div.control-group");
			var checked = $(this).is(":checked");
			
			// Check if parent isn't dependant
			if(!parent.hasClass("dependant")) {
			
				// Go through all dependant values
				while(parent.next().length && parent.next().hasClass("dependant")) {
			
					parent = parent.next();
				
					// Check if value is enabled
					if(checked)
				
						// Allow setting dependant value
						parent.removeClass("disabled");
				
					// Otherwise
					else {
				
						// Disable setting dependant value
						parent.addClass("disabled");
					
						if(parent.find("input[type=\"checkbox\"]").is(":checked"))
							parent.find("input[type=\"checkbox\"]").trigger("click");
					}
				}
			}
		});
		
		// Drag and drop upload file event
		$("#drop_locally, #drop, #drop_sd").on("drop", function(event) {
		
			// Upload file with expanded file support
			uploadWithExpandedFileSupport(event, event.originalEvent.dataTransfer.files[0], $(this).attr("id") == "drop_sd" ? "sdcard" : "local");
		});
				
		// Upload file event
		$("#gcode_upload, #gcode_upload_sd").change(function(event) {
		
			// Upload file with expanded file support
			uploadWithExpandedFileSupport(event, this.files[0], $(this).attr("id") == "gcode_upload" ? "local" : "sdcard");
		}).attr("accept", ".stl, .obj, .m3d, .amf, .wrl, .dae, .3mf, .gcode, .gco, .g");
		
		// Upload with expanded file support
		function uploadWithExpandedFileSupport(event, file, location) {
		
			// Set file type
			var extension = typeof file !== "undefined" ? file.name.lastIndexOf('.') : -1;
			var type = extension != -1 ? file.name.substr(extension + 1).toLowerCase() : "";
		
			// Check if uploading a OBJ, M3D, AMF, VRML, COLLADA, or 3MF file
			if(type == "obj" || type == "m3d" || type == "amf" || type == "wrl" || type == "dae" || type == "3mf") {
			
				// Stop default behavior
				event.preventDefault();
				event.stopImmediatePropagation();
				
				// Set new file name
				var newFileName = file.name.substr(0, extension) + ".stl";
				
				// Display message
				showMessage(gettext("Conversion Status"), _.sprintf(gettext("Converting %(oldFileName)s to %(newFileName)s"), {oldFileName: htmlEncode(file.name), newFileName: htmlEncode(newFileName)}));
				
				// Set URL
				var url = URL.createObjectURL(file);
			
				// Clear value
				$(event.target).val('');
				
				setTimeout(function() {
				
					// Convert file to STL
					convertedModel = null;
					convertToStl(url, file.name.substr(extension + 1).toLowerCase());
				
					function conversionDone() {
				
						// Check if conversion is done
						if(convertedModel !== null) {
					
							// Create request
							var form = new FormData();
						
							// Set path to file
							if(typeof self.files.currentPath === "undefined")
								var path = '';
							else if(self.files.currentPath().length)
								var path = '/' + self.files.currentPath() + '/';
							else
								var path = '/';
							form.append("file", convertedModel, path + newFileName);
						
							if(typeof self.files.currentPath !== "undefined")
								path = path.substr(1);
					
							// Send request
							$.ajax({
								url: API_BASEURL + "files/" + location,
								type: "POST",
								dataType: "json",
								data: form,
								contentType: false,
								traditional: false,
								processData: false
							
							// Done
							}).done(function(data) {
							
								// Update path
								if(location == "local")
									path += data.files.local.name;
								else
									path += data.files.sdcard.name;
							
								// Hide message
								hideMessage();
					
								// Show slicing dialog
								if(self.files.requestData.toString().split('\n')[0].indexOf("params") != -1)
									self.files.requestData({
										focus: {
											location: location,
											path: path
										}
									});
								else
									self.files.requestData(path, location);
								self.slicing.show(location, path);
							});
						}
					
						// Otherwise
						else
					
							// Check if conversion is done again
							setTimeout(conversionDone, 100);
				
					}
					conversionDone();
				}, 600);
			}
		}
		
		// Manage if slicer is opened or closed
		setInterval(function() {
		
			// Check if slicer is open
			if($("#slicing_configuration_dialog").css("display") == "block") {
			
				// Set slicer open is not already set
				if(!slicerOpen) {
					slicerOpen = true;
					
					// Prevent closing slicer by clicking outside
					$("div.modal-scrollable").off("click.modal").addClass("hideOverflow");
					
					// Disable uploading file by drag and drop
					$("#drop_overlay").css("display", "none");
				}
			}
			
			// Otherwise
			else {
			
				// Check is slicer was open
				if(slicerOpen) {
				
					// Clear slicer open
					slicerOpen = false;
					
					// Enable uploading file by drag and drop
					$("#drop_overlay").css("display", "");
					
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Remove Temp"
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
					
					setTimeout(function() {
		
						// Reset slicer menu
						slicerMenu = "Select Profile";
	
						// Set text back to next
						$("#slicing_configuration_dialog > div.modal-footer > .btn-primary").html(gettext("Next"));
						
						// Destroy modelEditor
						if(modelEditor)
							modelEditor.destroy();
		
						// Restore slicer dialog
						$("#slicing_configuration_dialog").off("drop dragenter dragleave").removeClass("profile model").css("height", '');
						$("#slicing_configuration_dialog p.currentMenu").html(gettext("Select Profile"));
						$("#slicing_configuration_dialog .modal-extra").remove();
						$("#slicing_configuration_dialog .modal-body").css("display", '');
						$("#slicing_configuration_dialog .modal-cover").removeClass("show").css("z-index", '');
						$("#slicing_configuration_dialog .modal-footer p.warning").html('');
						$("#slicing_configuration_dialog .modal-footer a.skip").css("display", '');
						skipModelEditor = false;
						
						// Save software settings
						self.settings.saveData();
					}, 300);
				}
			}
		}, 300);
		
		// Skip model editor button click event
		$("#slicing_configuration_dialog > div.modal-footer > a.skip").click(function(event) {
		
			// Stop default behavior
			event.stopImmediatePropagation();
			
			// Set skip model editor
			skipModelEditor = true;
			
			// Skip model editor
			$("#slicing_configuration_dialog > div.modal-footer > .btn-primary").click();
		});
		
		// Resize event
		$(window).resize(function() {
		
			// Position OctoPrint instance manager
			$("#navbar_plugin_m33fio").addClass("show").css("left", $("#state_wrapper").offset().left - $("#navbar a.brand").offset().left + "px");
		
			// Check if profile editor is showing
			var dialog = $("#slicing_configuration_dialog");
			if(dialog.length && dialog.hasClass("profile")) {
		
				// Save current scroll
				var currentScroll = $("#slicing_configuration_dialog.profile .modal-extra").scrollTop();
				dialog.css("height", '');
			
				// Set dialogs's height
				dialog[0].style.setProperty("height", dialog.height() + "px", "important");
			
				// Restore current scroll
				$("#slicing_configuration_dialog.profile .modal-extra").scrollTop(currentScroll);
			}
		});
		
		// Slicer next button click event
		$("#slicing_configuration_dialog > div.modal-footer > .btn-primary").html(gettext("Next")).click(function(event) {
		
			// Initialize variables
			var button = $(this);
			
			// Blur self
			button.blur();
		
			// Check if button isn't disabled
			if(!button.hasClass("disabled")) {
			
				// Check if on slicer menu is not done
				if(slicerMenu != "Done") {
			
					// Stop default behavior
					event.stopImmediatePropagation();
				
					// Disable button
					button.addClass("disabled");
					
					// Get slicer, slicer profile, printer profile, and after slicing action
					slicerName = self.slicing.slicer();
					slicerProfileName = self.slicing.profile();
					printerProfileName = self.slicing.printerProfile();
					afterSlicingAction = self.slicing.afterSlicing();
					
					// Set model location, path, and name
					modelLocation = self.slicing.target;
					
					if(typeof self.slicing.path !== "undefined" && self.slicing.path.length)
						modelPath = '/' + self.slicing.path + '/';
					else
						modelPath = '/';
					
					if(typeof self.slicing.file === "function")
						fullModelName = self.slicing.file();
					else
						fullModelName = self.slicing.file;
					
					if(modelPath.length > 1)
						modelName = fullModelName.substr(modelPath.length - 1);
					else
						modelName = fullModelName;
					
					// Check if slicer menu is select profile
					if(slicerMenu == "Select Profile") {
					
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "View Profile: " + JSON.stringify({
									slicerName: slicerName,
									slicerProfileName: slicerProfileName,
									printerProfileName: printerProfileName
								})
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
				
						// Done
						}).done(function(data) {

							// Check if profile is available
							if(data.value == "OK") {
							
								// Display cover
								$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").html(gettext("Loading profile…"));
					
								setTimeout(function() {
						
									// Send request
									$.ajax({
										url: PLUGIN_BASEURL + data.path + '?' + Date.now(),
										type: "GET",
										dataType: "text",
										data: null,
										contentType: "application/x-www-form-urlencoded; charset=UTF-8",
										traditional: true,
										processData: true

									// Done
									}).done(function(data) {
								
										// Set using provided profile
										var usingProvidedProfile = (slicerName == "cura" || slicerName == "slic3r") && (slicerProfileName == "micro_3d_pla" || slicerProfileName == "micro_3d_abs" || slicerProfileName == "micro_3d_hips" || slicerProfileName == "micro_3d_flx" || slicerProfileName == "micro_3d_tgh" || slicerProfileName == "micro_3d_abs-r" || slicerProfileName == "micro_3d_cam");
										
										// Hide dialog
										$("#slicing_configuration_dialog").removeClass("in");
							
										setTimeout(function() {
								
											// Hide cover
											$("#slicing_configuration_dialog .modal-cover").addClass("noTransition").removeClass("show");
											setTimeout(function() {
												$("#slicing_configuration_dialog .modal-cover").css("z-index", '').removeClass("noTransition");
											}, 200);
								
											// Display profile editor
											$("#slicing_configuration_dialog").addClass("profile in");
											$("#slicing_configuration_dialog p.currentMenu").html(gettext("Modify Profile"));
											$("#slicing_configuration_dialog .modal-body").css("display", "none").after('\
												<div class="modal-extra">\
													<div class="groups">\
														<div class="group basic">\
															<i></i>\
															<h3>' + gettext("Basic Settings") + '</h3>\
															<p class="quality"></p>\
															<div class="quality">\
																<button title="' + encodeQuotes(gettext("Extra Low Quality")) + '" data-target="quality" data-value="0.35"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-quality_extra-low.png"></button>\
																<button title="' + encodeQuotes(gettext("Low Quality")) + '" data-target="quality" data-value="0.30"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-quality_low.png"></button>\
																<button title="' + encodeQuotes(gettext("Medium Quality")) + '" data-target="quality" data-value="0.25"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-quality_medium.png"></button>\
																<button title="' + encodeQuotes(gettext("High Quality")) + '" data-target="quality" data-value="0.20"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-quality_high.png"></button>\
																<button title="' + encodeQuotes(gettext("Extra High Quality")) + '" data-target="quality" data-value="0.15"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-quality_extra-high.png"></button>\
																<button title="' + encodeQuotes(gettext("Highest Quality")) + '" data-target="quality" data-value="0.05"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-quality_highest.png"></button>\
															</div>\
															<p class="fill"></p>\
															<div class="fill">\
																<button title="' + encodeQuotes(gettext("Hollow Thin Fill")) + '" data-target="fill" data-value="thin"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-density_thin.png"></button>\
																<button title="' + encodeQuotes(gettext("Hollow Thick Fill")) + '" data-target="fill" data-value="thick"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-density_thick.png"></button>\
																<button title="' + encodeQuotes(gettext("Low Fill")) + '" data-target="fill" data-value="low"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-density_low.png"></button>\
																<button title="' + encodeQuotes(gettext("Medium Fill")) + '" data-target="fill" data-value="medium"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-density_medium.png"></button>\
																<button title="' + encodeQuotes(gettext("High Fill")) + '" data-target="fill" data-value="high"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-density_high.png"></button>\
																<button title="' + encodeQuotes(gettext("Extra High Fill")) + '" data-target="fill" data-value="extra-high"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-density_extra-high.png"></button>\
																<button title="' + encodeQuotes(gettext("Full Fill")) + '" data-target="fill" data-value="full"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-density_full.png"></button>\
															</div>\
															<p class="pattern slic3r-only"></p>\
															<div class="pattern slic3r-only">\
																<button title="' + encodeQuotes(gettext("Line Fill Pattern")) + '" data-target="pattern" data-value="line"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_line.png"></button>\
																<button title="' + encodeQuotes(gettext("Rectilinear Fill Pattern")) + '" data-target="pattern" data-value="rectilinear"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_rectilinear.png"></button>\
																<button title="' + encodeQuotes(gettext("Honeycomb Fill Pattern")) + '" data-target="pattern" data-value="honeycomb"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_honeycomb.png"></button>\
																<button title="' + encodeQuotes(gettext("3D Honeycomb Fill Pattern")) + '" data-target="pattern" data-value="3dhoneycomb"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_3dhoneycomb.png"></button>\
																<button title="' + encodeQuotes(gettext("Concentric Fill Pattern")) + '" data-target="pattern" data-value="concentric"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_concentric.png"></button>\
																<button title="' + encodeQuotes(gettext("Hilbert Curve Fill Pattern")) + '" data-target="pattern" data-value="hilbertcurve"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_hilbertcurve.png"></button>\
																<button title="' + encodeQuotes(gettext("Octagram Spiral Fill Pattern")) + '" data-target="pattern" data-value="octagramspiral"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_octagramspiral.png"></button>\
																<button title="' + encodeQuotes(gettext("Archimedean Chords Fill Pattern")) + '" data-target="pattern" data-value="archimedeanchords"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_archimedeanchords.png"></button>\
															</div>\
															<p class="solid_pattern slic3r-only"></p>\
															<div class="solid_pattern slic3r-only">\
																<button title="' + encodeQuotes(gettext("Rectilinear Top/Bottom Fill Pattern")) + '" data-target="solid_pattern" data-value="rectilinear"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_rectilinear.png"></button>\
																<button title="' + encodeQuotes(gettext("Concentric Top/Bottom Fill Pattern")) + '" data-target="solid_pattern" data-value="concentric"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_concentric.png"></button>\
																<button title="' + encodeQuotes(gettext("Hilbert Curve Top/Bottom Fill Pattern")) + '" data-target="solid_pattern" data-value="hilbertcurve"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_hilbertcurve.png"></button>\
																<button title="' + encodeQuotes(gettext("Archimedean Chords Top/Bottom Fill Pattern")) + '" data-target="solid_pattern" data-value="archimedeanchords"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_archimedeanchords.png"></button>\
																<button title="' + encodeQuotes(gettext("Octagram Spiral Top/Bottom Fill Pattern")) + '" data-target="solid_pattern" data-value="octagramspiral"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/fill-pattern_octagramspiral.png"></button>\
															</div>\
															<div class="settings">\
																<label title="' + encodeQuotes(gettext("Prints a breakaway support underneath overhanging parts of the model")) + '"><input class="useSupportMaterial" type="checkbox" tabindex="-1">' + gettext("Use support material") + '</label>\
																<label title="' + encodeQuotes(gettext("Allows support material to be created on top of models")) + '" class="cura-only"><input class="useModelOnModelSupport" type="checkbox" tabindex="-1">' + gettext("Use model on model support") + '</label>\
																<label title="' + encodeQuotes(gettext("Experimental option for preventing support material from being generated under bridged areas")) + '" class="slic3r-only"><input class="dontSupportBridges" type="checkbox" tabindex="-1">' + gettext("Don't support bridges") + '</label>\
																<label title="' + encodeQuotes(gettext("Prints a raft underneath the model")) + '"><input class="useRaft" type="checkbox" tabindex="-1">' + gettext("Use raft") + '</label>\
																<label title="' + encodeQuotes(gettext("Prints a brim connected to the first layer of the model")) + '"><input class="useBrim" type="checkbox" tabindex="-1">' + gettext("Use brim") + '</label>\
																<label title="' + encodeQuotes(gettext("Prints an outline around the model")) + '"><input class="useSkirt" type="checkbox" tabindex="-1">' + gettext("Use skirt") + '</label>\
																<label title="' + encodeQuotes(gettext("Retracts the filament when moving over gaps")) + '"><input class="useRetraction" type="checkbox" tabindex="-1">' + gettext("Use retraction") + '</label>\
															</div>\
														</div>\
														<div class="group manual">\
															<i></i>\
															<h3>' + gettext("Manual Settings") + '</h3>\
															<div class="wrapper">\
																<div title="' + encodeQuotes(gettext("Printing temperature")) + '" class="option notMicro3d">\
																	<label>' + gettext("Printing temperature") + '</label>\
																	<div class="input-append">\
																		<input class="printingTemperature" type="number" tabindex="-1" min="150" max="315" step="1">\
																		<span class="add-on">°C</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Heatbed temperature")) + '" class="option notMicro3d requiresHeatbed">\
																	<label>' + gettext("Heatbed temperature") + '</label>\
																	<div class="input-append">\
																		<input class="heatbedTemperature" type="number" tabindex="-1" min="0" max="110" step="1">\
																		<span class="add-on">°C</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Height of each layer")) + '" class="option">\
																	<label>' + gettext("Layer height") + '</label>\
																	<div class="input-append">\
																		<input class="layerHeight" type="number" tabindex="-1" min="0.01" max="0.35" step="0.01">\
																		<span class="add-on">mm</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Percentage of the model that is filled in")) + '" class="option">\
																	<label>' + gettext("Fill density") + '</label>\
																	<div class="input-append">\
																		<input class="fillDensity" type="number" tabindex="-1" min="0" max="100" step="0.01">\
																		<span class="add-on">%</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Thickness of the model")) + '" class="option">\
																	<label>' + gettext("Thickness") + '</label>\
																	<div class="input-append">\
																		<input class="thickness" type="number" tabindex="-1" min="1" max="25" step="1">\
																		<span class="add-on">' + gettext("wall(s)") + '</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Speed of the extruder's movements while printing")) + '" class="option">\
																	<label>' + gettext("Print speed") + '</label>\
																	<div class="input-append">\
																		<input class="printSpeed" type="number" tabindex="-1" min="2" max="80" step="0.01">\
																		<span class="add-on">mm/s</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Number of layers that the top and bottom each consist of")) + '" class="cura-only option">\
																	<label>' + gettext("Top/bottom") + '</label>\
																	<div class="input-append">\
																		<input class="topBottomLayers" type="number" tabindex="-1" min="1" max="25" step="1">\
																		<span class="add-on">' + gettext("layer(s)") + '</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Number of layers that the top consist of")) + '" class="slic3r-only option">\
																	<label>' + gettext("Top") + '</label>\
																	<div class="input-append">\
																		<input class="topLayers" type="number" tabindex="-1" min="1" max="25" step="1">\
																		<span class="add-on">' + gettext("layer(s)") + '</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Number of layers that the bottom consist of")) + '" class="slic3r-only option">\
																	<label>' + gettext("Bottom") + '</label>\
																	<div class="input-append">\
																		<input class="bottomLayers" type="number" tabindex="-1" min="1" max="25" step="1">\
																		<span class="add-on">' + gettext("layer(s)") + '</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Distance between the raft and the model")) + '" class="cura-only option">\
																	<label>' + gettext("Raft airgap") + '</label>\
																	<div class="input-append">\
																		<input class="raftAirgap" type="number" tabindex="-1" min="0" max="4" step="0.01">\
																		<span class="add-on">mm</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("The amount of lines used for the brim")) + '" class="cura-only option">\
																	<label>' + gettext("Brim line count") + '</label>\
																	<div class="input-append">\
																		<input class="brimLineCount" type="number" tabindex="-1" min="0" max="50" step="1">\
																		<span class="add-on">' + gettext("line(s)") + '</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Raft height in number of layers")) + '" class="slic3r-only option">\
																	<label>' + gettext("Raft") + '</label>\
																	<div class="input-append">\
																		<input class="raftLayers" type="number" tabindex="-1" min="0" max="16" step="1">\
																		<span class="add-on">' + gettext("layer(s)") + '</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Width of brim around perimeters")) + '" class="slic3r-only option">\
																	<label>' + gettext("Brim width") + '</label>\
																	<div class="input-append">\
																		<input class="brimWidth" type="number" tabindex="-1" min="0" max="20" step="0.01">\
																		<span class="add-on">mm</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("How far away the skirt is from the model")) + '" class="option">\
																	<label>' + gettext("Skirt gap") + '</label>\
																	<div class="input-append">\
																		<input class="skirtGap" type="number" tabindex="-1" min="0" max="100" step="0.01">\
																		<span class="add-on">mm</span>\
																	</div>\
																</div>\
																<div title="' + encodeQuotes(gettext("Number of loops for the skirt. If the Minimum Extrusion Length option is set, the number of loops might be greater than the one configured here. Set this to zero to disable skirt completely.")) + '" class="slic3r-only option">\
																	<label>' + gettext("Skirts") + '</label>\
																	<div class="input-append">\
																		<input class="skirts" type="number" tabindex="-1" min="0" max="40" step="1">\
																		<span class="add-on">' + gettext("line(s)") + '</span>\
																	</div>\
																</div>\
															</div>\
														</div>\
														<div class="group advanced">\
															<i></i>\
															<h3>' + gettext("Advanced Settings") + '</h3>\
															<div>\
																<aside></aside>\
																<textarea tabindex="-1" spellcheck="false"></textarea>\
															</div>\
															<span></span>\
														</div>\
													</div>\
												</div>\
											');
											
											// Add comments to text
											function addCommentsToText(uncommentedText) {
											
												// Add comments to text
												var commentedText = '';
												var lines = uncommentedText.split('\n');
		
												for(var i = 0; i < lines.length; i++) {
			
													if(slicerName == "cura") {
				
														if(lines[i].indexOf(".gcode") == -1 && lines[i][0] != '\t') {
														
															if(/^machine_shape[\s=]/.test(lines[i]))
																lines[i] += "; Square, Circular";
															else if(/^retraction_combing[\s=]/.test(lines[i]))
																lines[i] += "; Off, All, No Skin";
															else if(/^support[\s=]/.test(lines[i]))
																lines[i] += "; None, Touching buildplate, Everywhere";
															else if(/^platform_adhesion[\s=]/.test(lines[i]))
																lines[i] += "; None, Brim, Raft";
															else if(/^support_dual_extrusion[\s=]/.test(lines[i]))
																lines[i] += "; Both, First extruder, Second extruder";
															else if(/^support_type[\s=]/.test(lines[i]))
																lines[i] += "; Grid, Lines";
														}
													}
													else if(slicerName == "slic3r") {
				
														if(lines[i].indexOf("_gcode") == -1 && lines[i][0] != '\t') {
														
															if(/^external_fill_pattern[\s=]/.test(lines[i]))
																lines[i] += "; rectilinear, concentric, hilbertcurve, archimedeanchords, octagramspiral";
															else if(/^extrusion_axis[\s=]/.test(lines[i]))
																lines[i] += "; X, Y, Z, E";
															else if(/^fill_pattern[\s=]/.test(lines[i]))
																lines[i] += "; rectilinear, grid, line, concentric, honeycomb, 3dhoneycomb, hilbertcurve, archimedeanchords, octagramspiral";
															else if(/^gcode_flavor[\s=]/.test(lines[i]))
																lines[i] += "; reprap, teacup, makerware, sailfish, mach3, no-extrusion";
															else if(/^seam_position[\s=]/.test(lines[i]))
																lines[i] += "; random, aligned, nearest";
															else if(/^solid_fill_pattern[\s=]/.test(lines[i]))
																lines[i] += "; archimedeanchords, rectilinear, octagramspiral, hilbertcurve, concentric";
															else if(/^support_material_pattern[\s=]/.test(lines[i]))
																lines[i] += "; honeycomb, rectilinear, rectilinear-grid";
														}
													}
													
													commentedText += (i ? '\n' : '') + lines[i];
												}
												
												// Return commented text
												return commentedText.slice(-1) == '\n' ? commentedText.slice(0, -1) : commentedText;
											}
											
											$("#slicing_configuration_dialog .modal-extra textarea").val(addCommentsToText(data));
											$("#slicing_configuration_dialog").addClass(slicerName);
											
											// Check if using Edge
											if(navigator.userAgent.toLowerCase().indexOf("edge") != -1)

												// Fix Edge specific CSS issues
												$("#slicing_configuration_dialog .group > i").addClass("edge");
											
											// Otherwise check if using Firefox
											else if(navigator.userAgent.toLowerCase().indexOf("firefox") != -1)

												// Fix Firefox specific CSS issues
												$("#slicing_configuration_dialog .group.advanced > span, #slicing_configuration_dialog .group.advanced textarea").addClass("firefox");
											
											// Check if using Windows
											if(navigator.platform.indexOf("Win") != -1)

												// Fix Windows specific CSS issues
												$("#slicing_configuration_dialog .group h3").addClass("windows");

											// Otherwise check if using OS X
											else if(navigator.platform.indexOf("Mac") != -1)

												// Fix OS X specific CSS issues
												$("#slicing_configuration_dialog .group h3").addClass("osx");
											
											// Update settings from profile
											function updateSettingsFromProfile() {
											
												// Set basic setting values
												if(slicerName == "cura") {
												
													// Quality
													$("#slicing_configuration_dialog div.quality button.disabled").removeClass("disabled");
													
													var layerHeight = parseFloat(getSlicerProfileValue("layer_height"));
													var bottomThickness = parseFloat(getSlicerProfileValue("bottom_thickness"));
													var fanFullHeight = parseFloat(getSlicerProfileValue("fan_full_height")).toFixed(3);
													var solidLayerThickness = parseFloat(getSlicerProfileValue("solid_layer_thickness")).toFixed(3);
													
													if(layerHeight == 0.35 && bottomThickness == 0.3 && (fanFullHeight == parseFloat((1 - 1) * 0.35 + 0.3 + 0.001).toFixed(3) || parseFloat((2 - 1) * 0.35 + 0.3 + 0.001).toFixed(3)) && solidLayerThickness == parseFloat(8 * (0.35 - 0.0000001)).toFixed(3)) {
														$("#slicing_configuration_dialog p.quality").html(gettext("Extra Low Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.35\"]").addClass("disabled");
													}
													else if(layerHeight == 0.30 && bottomThickness == 0.3 && (fanFullHeight == parseFloat((1 - 1) * 0.30 + 0.3 + 0.001).toFixed(3) || parseFloat((2 - 1) * 0.30 + 0.3 + 0.001).toFixed(3)) && solidLayerThickness == parseFloat(8 * (0.30 - 0.0000001)).toFixed(3)) {
														$("#slicing_configuration_dialog p.quality").html(gettext("Low Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.30\"]").addClass("disabled");
													}
													else if(layerHeight == 0.25 && bottomThickness == 0.3 && (fanFullHeight == parseFloat((1 - 1) * 0.25 + 0.3 + 0.001).toFixed(3) || parseFloat((2 - 1) * 0.25 + 0.3 + 0.001).toFixed(3)) && solidLayerThickness == parseFloat(8 * (0.25 - 0.0000001)).toFixed(3)) {
														$("#slicing_configuration_dialog p.quality").html(gettext("Medium Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.25\"]").addClass("disabled");
													}
													else if(layerHeight == 0.20 && bottomThickness == 0.3 && (fanFullHeight == parseFloat((1 - 1) * 0.20 + 0.3 + 0.001).toFixed(3) || parseFloat((2 - 1) * 0.20 + 0.3 + 0.001).toFixed(3)) && solidLayerThickness == parseFloat(8 * (0.20 - 0.0000001)).toFixed(3)) {
														$("#slicing_configuration_dialog p.quality").html(gettext("High Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.20\"]").addClass("disabled");
													}
													else if(layerHeight == 0.15 && bottomThickness == 0.3 && (fanFullHeight == parseFloat((1 - 1) * 0.15 + 0.3 + 0.001).toFixed(3) || parseFloat((2 - 1) * 0.15 + 0.3 + 0.001).toFixed(3)) && solidLayerThickness == parseFloat(8 * (0.15 - 0.0000001)).toFixed(3)) {
														$("#slicing_configuration_dialog p.quality").html(gettext("Extra High Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.15\"]").addClass("disabled");
													}
													else if(layerHeight == 0.05 && bottomThickness == 0.3 && (fanFullHeight == parseFloat((1 - 1) * 0.05 + 0.3 + 0.001).toFixed(3) || parseFloat((2 - 1) * 0.05 + 0.3 + 0.001).toFixed(3)) && solidLayerThickness == parseFloat(8 * (0.05 - 0.0000001)).toFixed(3)) {
														$("#slicing_configuration_dialog p.quality").html(gettext("Highest Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.05\"]").addClass("disabled");
													}
													else
														$("#slicing_configuration_dialog p.quality").html(gettext("Unknown Quality"));
													
													// Fill
													$("#slicing_configuration_dialog div.fill button.disabled").removeClass("disabled");
													
													var fillDensity = parseFloat(getSlicerProfileValue("fill_density")).toFixed(3);
													var wallThickness = parseFloat(getSlicerProfileValue("wall_thickness")).toFixed(3);
													var nozzleSize = parseFloat(getSlicerProfileValue("nozzle_size"));
													
													if(fillDensity == 0 && wallThickness == parseFloat(1 * nozzleSize).toFixed(3)) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Hollow Thin Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"thin\"]").addClass("disabled");
													}
													else if(fillDensity == 0 && wallThickness == parseFloat(3 * nozzleSize).toFixed(3)) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Hollow Thick Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"thick\"]").addClass("disabled");
													}
													else if(fillDensity == parseFloat(nozzleSize / 5500 * 100000).toFixed(3) && wallThickness == parseFloat(3 * nozzleSize).toFixed(3)) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Low Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"low\"]").addClass("disabled");
													}
													else if(fillDensity == parseFloat(nozzleSize / 4000 * 100000).toFixed(3) && wallThickness == parseFloat(4 * nozzleSize).toFixed(3)) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Medium Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"medium\"]").addClass("disabled");
													}
													else if(fillDensity == parseFloat(nozzleSize / 2500 * 100000).toFixed(3) && wallThickness == parseFloat(4 * nozzleSize).toFixed(3)) {
														$("#slicing_configuration_dialog p.fill").html(gettext("High Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"high\"]").addClass("disabled");
													}
													else if(fillDensity == parseFloat(nozzleSize / 1500 * 100000).toFixed(3) && wallThickness == parseFloat(4 * nozzleSize).toFixed(3)) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Extra High Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"extra-high\"]").addClass("disabled");
													}
													else if(fillDensity == 100 && wallThickness == parseFloat(4 * nozzleSize).toFixed(3)) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Full Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"full\"]").addClass("disabled");
													}
													else
														$("#slicing_configuration_dialog p.fill").html(gettext("Unknown Fill"));
												}
												else if(slicerName == "slic3r") {
												
													// Quality
													$("#slicing_configuration_dialog div.quality button.disabled").removeClass("disabled");
													
													var layerHeight = parseFloat(getSlicerProfileValue("layer_height"));
													var firstLayerHeight = getSlicerProfileValue("first_layer_height");
													var topSolidLayers = parseInt(getSlicerProfileValue("top_solid_layers"));
													var bottomSolidLayers = parseInt(getSlicerProfileValue("bottom_solid_layers"));
													
													if(layerHeight == 0.35 && firstLayerHeight == Math.round(0.3 / 0.35 * 100) + "%" && topSolidLayers == 8 && bottomSolidLayers == 8) {
														$("#slicing_configuration_dialog p.quality").html(gettext("Extra Low Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.35\"]").addClass("disabled");
													}
													else if(layerHeight == 0.30 && firstLayerHeight == Math.round(0.3 / 0.30 * 100) + "%" && topSolidLayers == 8 && bottomSolidLayers == 8) {
														$("#slicing_configuration_dialog p.quality").html(gettext("Low Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.30\"]").addClass("disabled");
													}
													else if(layerHeight == 0.25 && firstLayerHeight == Math.round(0.3 / 0.25 * 100) + "%" && topSolidLayers == 8 && bottomSolidLayers == 8) {
														$("#slicing_configuration_dialog p.quality").html(gettext("Medium Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.25\"]").addClass("disabled");
													}
													else if(layerHeight == 0.20 && firstLayerHeight == Math.round(0.3 / 0.20 * 100) + "%" && topSolidLayers == 8 && bottomSolidLayers == 8) {
														$("#slicing_configuration_dialog p.quality").html(gettext("High Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.20\"]").addClass("disabled");
													}
													else if(layerHeight == 0.15 && firstLayerHeight == Math.round(0.3 / 0.15 * 100) + "%" && topSolidLayers == 8 && bottomSolidLayers == 8) {
														$("#slicing_configuration_dialog p.quality").html(gettext("Extra High Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.15\"]").addClass("disabled");
													}
													else if(layerHeight == 0.05 && firstLayerHeight == Math.round(0.3 / 0.05 * 100) + "%" && topSolidLayers == 8 && bottomSolidLayers == 8) {
														$("#slicing_configuration_dialog p.quality").html(gettext("Highest Quality"));
														$("#slicing_configuration_dialog div.quality button[data-value=\"0.05\"]").addClass("disabled");
													}
													else
														$("#slicing_configuration_dialog p.quality").html(gettext("Unknown Quality"));
													
													// Fill
													$("#slicing_configuration_dialog div.fill button.disabled").removeClass("disabled");
													
													var fillDensity = parseFloat(getSlicerProfileValue("fill_density")).toFixed(3);
													var perimeters = parseInt(getSlicerProfileValue("perimeters"));
													var nozzleDiameter = parseFloat(getSlicerProfileValue("nozzle_diameter"));
													
													if(fillDensity == 0 && perimeters == 1) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Hollow Thin Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"thin\"]").addClass("disabled");
													}
													else if(fillDensity == 0 && perimeters == 3) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Hollow Thick Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"thick\"]").addClass("disabled");
													}
													else if(fillDensity == parseFloat(nozzleDiameter / 5500 * 100000).toFixed(3) && perimeters == 3) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Low Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"low\"]").addClass("disabled");
													}
													else if(fillDensity == parseFloat(nozzleDiameter / 4000 * 100000).toFixed(3) && perimeters == 4) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Medium Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"medium\"]").addClass("disabled");
													}
													else if(fillDensity == parseFloat(nozzleDiameter / 2500 * 100000).toFixed(3) && perimeters == 4) {
														$("#slicing_configuration_dialog p.fill").html(gettext("High Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"high\"]").addClass("disabled");
													}
													else if(fillDensity == parseFloat(nozzleDiameter / 1500 * 100000).toFixed(3) && perimeters == 4) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Extra High Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"extra-high\"]").addClass("disabled");
													}
													else if(fillDensity == 100 && perimeters == 4) {
														$("#slicing_configuration_dialog p.fill").html(gettext("Full Fill"));
														$("#slicing_configuration_dialog div.fill button[data-value=\"full\"]").addClass("disabled");
													}
													else
														$("#slicing_configuration_dialog p.fill").html(gettext("Unknown Fill"));
													
													// Fill pattern
													$("#slicing_configuration_dialog div.pattern button.disabled").removeClass("disabled");
													
													var fillPattern = getSlicerProfileValue("fill_pattern");
													
													if(fillPattern == "archimedeanchords") {
														$("#slicing_configuration_dialog p.pattern").html(gettext("Archimedean Chords Fill Pattern"));
														$("#slicing_configuration_dialog div.pattern button[data-value=\"archimedeanchords\"]").addClass("disabled");
													}
													else if(fillPattern == "rectilinear") {
														$("#slicing_configuration_dialog p.pattern").html(gettext("Rectilinear Fill Pattern"));
														$("#slicing_configuration_dialog div.pattern button[data-value=\"rectilinear\"]").addClass("disabled");
													}
													else if(fillPattern == "octagramspiral") {
														$("#slicing_configuration_dialog p.pattern").html(gettext("Octagram Spiral Fill Pattern"));
														$("#slicing_configuration_dialog div.pattern button[data-value=\"octagramspiral\"]").addClass("disabled");
													}
													else if(fillPattern == "hilbertcurve") {
														$("#slicing_configuration_dialog p.pattern").html(gettext("Hilbert Curve Fill Pattern"));
														$("#slicing_configuration_dialog div.pattern button[data-value=\"hilbertcurve\"]").addClass("disabled");
													}
													else if(fillPattern == "line") {
														$("#slicing_configuration_dialog p.pattern").html(gettext("Line Fill Pattern"));
														$("#slicing_configuration_dialog div.pattern button[data-value=\"line\"]").addClass("disabled");
													}
													else if(fillPattern == "concentric") {
														$("#slicing_configuration_dialog p.pattern").html(gettext("Concentric Fill Pattern"));
														$("#slicing_configuration_dialog div.pattern button[data-value=\"concentric\"]").addClass("disabled");
													}
													else if(fillPattern == "honeycomb") {
														$("#slicing_configuration_dialog p.pattern").html(gettext("Honeycomb Fill Pattern"));
														$("#slicing_configuration_dialog div.pattern button[data-value=\"honeycomb\"]").addClass("disabled");
													}
													else if(fillPattern == "3dhoneycomb") {
														$("#slicing_configuration_dialog p.pattern").html(gettext("3D Honeycomb Fill Pattern"));
														$("#slicing_configuration_dialog div.pattern button[data-value=\"3dhoneycomb\"]").addClass("disabled");
													}
													else
														$("#slicing_configuration_dialog p.pattern").html(gettext("Unknown Fill Pattern"));
													
													// Top/bottom fill pattern
													$("#slicing_configuration_dialog div.solid_pattern button.disabled").removeClass("disabled");
													
													var solidFillPattern = getSlicerProfileValue("solid_fill_pattern");
													
													if(solidFillPattern == "archimedeanchords") {
														$("#slicing_configuration_dialog p.solid_pattern").html(gettext("Archimedean Chords Top/Bottom Fill Pattern"));
														$("#slicing_configuration_dialog div.solid_pattern button[data-value=\"archimedeanchords\"]").addClass("disabled");
													}
													else if(solidFillPattern == "rectilinear") {
														$("#slicing_configuration_dialog p.solid_pattern").html(gettext("Rectilinear Top/Bottom Fill Pattern"));
														$("#slicing_configuration_dialog div.solid_pattern button[data-value=\"rectilinear\"]").addClass("disabled");
													}
													else if(solidFillPattern == "octagramspiral") {
														$("#slicing_configuration_dialog p.solid_pattern").html(gettext("Octagram Spiral Top/Bottom Fill Pattern"));
														$("#slicing_configuration_dialog div.solid_pattern button[data-value=\"octagramspiral\"]").addClass("disabled");
													}
													else if(solidFillPattern == "hilbertcurve") {
														$("#slicing_configuration_dialog p.solid_pattern").html(gettext("Hilbert Curve Top/Bottom Fill Pattern"));
														$("#slicing_configuration_dialog div.solid_pattern button[data-value=\"hilbertcurve\"]").addClass("disabled");
													}
													else if(solidFillPattern == "concentric") {
														$("#slicing_configuration_dialog p.solid_pattern").html(gettext("Concentric Top/Bottom Fill Pattern"));
														$("#slicing_configuration_dialog div.solid_pattern button[data-value=\"concentric\"]").addClass("disabled");
													}
													else
														$("#slicing_configuration_dialog p.solid_pattern").html(gettext("Unknown Top/Bottom Fill Pattern"));
												}
												
												if(slicerName == "cura") {
													$("#slicing_configuration_dialog .useSupportMaterial").prop("checked", getSlicerProfileValue("support") == "Everywhere" || getSlicerProfileValue("support") == "Touching buildplate");
													$("#slicing_configuration_dialog .useModelOnModelSupport").prop("checked", getSlicerProfileValue("support") == "Everywhere");
													$("#slicing_configuration_dialog .useRaft").prop("checked", getSlicerProfileValue("platform_adhesion") == "Raft");
													$("#slicing_configuration_dialog .useBrim").prop("checked", getSlicerProfileValue("platform_adhesion") == "Brim");
													$("#slicing_configuration_dialog .useSkirt").prop("checked", parseInt(getSlicerProfileValue("skirt_line_count")) > 0);
													$("#slicing_configuration_dialog .useRetraction").prop("checked", getSlicerProfileValue("retraction_enable") == "True");
													$("#slicing_configuration_dialog").removeClass("slic3r");
												}
												else if(slicerName == "slic3r") {
													$("#slicing_configuration_dialog .useSupportMaterial").prop("checked", parseInt(getSlicerProfileValue("support_material")) === 1);
													$("#slicing_configuration_dialog .dontSupportBridges").prop("checked", parseInt(getSlicerProfileValue("dont_support_bridges")) === 1);
													$("#slicing_configuration_dialog .useRaft").prop("checked", false);
													$("#slicing_configuration_dialog .useBrim").prop("checked", false);
													$("#slicing_configuration_dialog .useSkirt").prop("checked", false);
												
													if(parseInt(getSlicerProfileValue("raft_layers")) > 0)
														$("#slicing_configuration_dialog .useRaft").prop("checked", true);
													else if(parseFloat(getSlicerProfileValue("brim_width")) > 0)
														$("#slicing_configuration_dialog .useBrim").prop("checked", true);
													else if(parseInt(getSlicerProfileValue("skirts")) > 0)
														$("#slicing_configuration_dialog .useSkirt").prop("checked", true);
												
													$("#slicing_configuration_dialog .useRetraction").prop("checked", parseFloat(getSlicerProfileValue("retract_speed")) > 0);
													$("#slicing_configuration_dialog").removeClass("cura");
												}
								
												// Set manual setting values
												if(slicerName == "cura") {
													$("#slicing_configuration_dialog .printingTemperature").val(parseInt(getSlicerProfileValue("print_temperature")));
													$("#slicing_configuration_dialog .heatbedTemperature").val(parseInt(getSlicerProfileValue("print_bed_temperature")));
													$("#slicing_configuration_dialog .layerHeight").val(parseFloat(getSlicerProfileValue("layer_height")).toFixed(2));
													$("#slicing_configuration_dialog .fillDensity").val(parseFloat(getSlicerProfileValue("fill_density")).toFixed(2));
													$("#slicing_configuration_dialog .thickness").val(Math.round(parseFloat(getSlicerProfileValue("wall_thickness")) / parseFloat(getSlicerProfileValue("nozzle_size"))));
													$("#slicing_configuration_dialog .printSpeed").val(parseFloat(getSlicerProfileValue("print_speed")).toFixed(2));
													$("#slicing_configuration_dialog .raftAirgap").val(parseFloat(getSlicerProfileValue("raft_airgap")).toFixed(2));
													$("#slicing_configuration_dialog .brimLineCount").val(parseInt(getSlicerProfileValue("brim_line_count")));
												}
												else if(slicerName == "slic3r") {
													$("#slicing_configuration_dialog .printingTemperature").val(parseInt(getSlicerProfileValue("temperature")));
													$("#slicing_configuration_dialog .heatbedTemperature").val(parseInt(getSlicerProfileValue("bed_temperature")));
													$("#slicing_configuration_dialog .layerHeight").val(parseFloat(getSlicerProfileValue("layer_height")).toFixed(2));
													$("#slicing_configuration_dialog .fillDensity").val(parseFloat(getSlicerProfileValue("fill_density")).toFixed(2));
													$("#slicing_configuration_dialog .thickness").val(parseInt(getSlicerProfileValue("perimeters")));
													$("#slicing_configuration_dialog .printSpeed").val(parseFloat(parseInt(getSlicerProfileValue("max_print_speed")) / 2).toFixed(2));
													$("#slicing_configuration_dialog .raftLayers").val(parseInt(getSlicerProfileValue("raft_layers")));
													$("#slicing_configuration_dialog .brimWidth").val(parseFloat(getSlicerProfileValue("brim_width")).toFixed(2));
												}
									
												if(slicerName == "cura") {
											
													if(!$("#slicing_configuration_dialog .brimLineCount").val().length)
														$("#slicing_configuration_dialog .brimLineCount").val(20);
												
													$("#slicing_configuration_dialog .skirtGap").val(parseFloat(getSlicerProfileValue("skirt_gap")).toFixed(2));
												}
												else if(slicerName == "slic3r") {
											
													if(!$("#slicing_configuration_dialog .brimWidth").val().length || $("#slicing_configuration_dialog .brimWidth").val() == 0)
														$("#slicing_configuration_dialog .brimWidth").val(5);
												
													$("#slicing_configuration_dialog .skirtGap").val(parseFloat(getSlicerProfileValue("skirt_distance")).toFixed(2));
													$("#slicing_configuration_dialog .skirts").val(parseInt(getSlicerProfileValue("skirts")));
												
													if(!$("#slicing_configuration_dialog .brimWidth").val().length || $("#slicing_configuration_dialog .brimWidth").val() == 0)
														$("#slicing_configuration_dialog .skirts").val(1);
												}
									
												if(!$("#slicing_configuration_dialog .skirtGap").val().length)
													$("#slicing_configuration_dialog .skirtGap").val(3);
									
												if(slicerName == "cura") {
													$("#slicing_configuration_dialog .topBottomLayers").val(Math.round(parseFloat(getSlicerProfileValue("solid_layer_thickness")) / (parseFloat(getSlicerProfileValue("layer_height")) - 0.0000001)));
												
													if(getSlicerProfileValue("platform_adhesion") != "Raft")
														$("#slicing_configuration_dialog .raftAirgap").parent("div").parent("div").addClass("disabled");
													else
														$("#slicing_configuration_dialog .raftAirgap").parent("div").parent("div").removeClass("disabled");
												
													if(getSlicerProfileValue("platform_adhesion") != "Brim")
														$("#slicing_configuration_dialog .brimLineCount").parent("div").parent("div").addClass("disabled");
													else
														$("#slicing_configuration_dialog .brimLineCount").parent("div").parent("div").removeClass("disabled");
												
													if(getSlicerProfileValue("platform_adhesion") != "None" || !$("#slicing_configuration_dialog .useSkirt").prop("checked"))
														$("#slicing_configuration_dialog .skirtGap").parent("div").parent("div").addClass("disabled");
													else
														$("#slicing_configuration_dialog .skirtGap").parent("div").parent("div").removeClass("disabled");
												}
												else if(slicerName == "slic3r") {
													$("#slicing_configuration_dialog .topLayers").val(parseInt(getSlicerProfileValue("top_solid_layers")));
													$("#slicing_configuration_dialog .bottomLayers").val(parseInt(getSlicerProfileValue("bottom_solid_layers")));
													$("#slicing_configuration_dialog .raftLayers").parent("div").parent("div").addClass("disabled");
													$("#slicing_configuration_dialog .brimWidth").parent("div").parent("div").addClass("disabled");
													$("#slicing_configuration_dialog .skirtGap").parent("div").parent("div").addClass("disabled");
													$("#slicing_configuration_dialog .skirts").parent("div").parent("div").addClass("disabled");
												
													if(parseInt(getSlicerProfileValue("raft_layers")) > 0)
														$("#slicing_configuration_dialog .raftLayers").parent("div").parent("div").removeClass("disabled");
													else if(parseFloat(getSlicerProfileValue("brim_width")) > 0)
														$("#slicing_configuration_dialog .brimWidth").parent("div").parent("div").removeClass("disabled");
													else if(parseInt(getSlicerProfileValue("skirts")) > 0 || $("#slicing_configuration_dialog .useSkirt").prop("checked")) {
														$("#slicing_configuration_dialog .skirtGap").parent("div").parent("div").removeClass("disabled");
														$("#slicing_configuration_dialog .skirts").parent("div").parent("div").removeClass("disabled");
													}
												}
											}
											updateSettingsFromProfile();
											
											// Hide non Micro 3D options if using a Micro 3D printer
											if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter())
												$("#slicing_configuration_dialog .notMicro3d").addClass("usingAMicro3DPrinter");
											
											// Otherwise hide heatbed options if not using a heatbed
											else if(!self.printerProfile.currentProfileData().heatedBed())
												$("#slicing_configuration_dialog .requiresHeatbed").addClass("notUsingAHeatbed");
								
											// Check if not using a Cura or Slic3r profile
											if(slicerName != "cura" && slicerName != "slic3r") {
								
												// Hide basic and manual settings
												$("#slicing_configuration_dialog .basic, #slicing_configuration_dialog .manual").addClass("dontShow");
												
												// Grow text area
												$("#slicing_configuration_dialog .advanced").addClass("fullSpace");
											}
											
											// Initialize drag leave counter
											var dragLeaveCounter = 0;
											
											// Slicing configuration dialog drop event
											$("#slicing_configuration_dialog").on("drop", function(event) {
											
												// Prevent default
												event.preventDefault();
												
												// Clear drag leave counter
												dragLeaveCounter = 0;
												
												// Check if loading profile is applicable
												if($("#slicing_configuration_dialog .modal-drag-and-drop").hasClass("show")) {
												
													// Hide drag and drop cover
													$("#slicing_configuration_dialog .modal-drag-and-drop").removeClass("show");
											
													// Set file type
													var file = event.originalEvent.dataTransfer.files[0];
													var extension = typeof file !== "undefined" ? file.name.lastIndexOf('.'): -1;
													var type = extension != -1 ? file.name.substr(extension + 1).toLowerCase() : "";
												
													// Check if file has the correct extension
													if((slicerName != "cura" && slicerName != "slic3r") || (slicerName == "cura" && type == "ini") || (slicerName == "slic3r" && type == "ini")) {
												
														// Display cover
														$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").html(gettext("Loading profile…"));

														setTimeout(function() {
												
															// On file load
															var reader = new FileReader();
															reader.onload = function(event) {

																// Convert array buffer to a binary string
																var binary = "";
																var bytes = new Uint8Array(event.target.result);
																var length = bytes.byteLength;

																for(var i = 0; i < length; i++) 
																	binary += String.fromCharCode(bytes[i]);

																// Clear using provided profile
																var usingProvidedProfile = false;
															
																// Set new profile
																$("#slicing_configuration_dialog .modal-extra textarea").val(addCommentsToText(binary));
														
																// Update line numbers
																updateLineNumbers();
															
																// Update settings from profile
																updateSettingsFromProfile();

																// Hide cover
																$("#slicing_configuration_dialog .modal-cover").removeClass("show");
																setTimeout(function() {
																	$("#slicing_configuration_dialog .modal-cover").css("z-index", '');
																}, 200);
															}
															
															// Read in file
															reader.readAsArrayBuffer(file);
														}, 600);
													}
												}
											
											// Slicing configuration dialog drag enter event
											}).on("dragenter", function(event) {
											
												// Prevent default
												event.preventDefault();
												
												// Increment drag leave counter
												dragLeaveCounter++;
											
												// Show drag and drop cover if cover isn't showing
												if(!$("#slicing_configuration_dialog .modal-cover").hasClass("show"))
													$("#slicing_configuration_dialog .modal-drag-and-drop").addClass("show");
											
											// Slicing configuration dialog drag leave event
											}).on("dragleave", function(event) {
											
												// Prevent default
												event.preventDefault();
												
												// Decrement drag leave counter
												if(dragLeaveCounter > 0)
													dragLeaveCounter--;
											
												// Hide drag and drop cover if not dragging anymore
												if(dragLeaveCounter === 0)
													$("#slicing_configuration_dialog .modal-drag-and-drop").removeClass("show");
											});
								
											// Set slicer menu
											slicerMenu = "Modify Profile";
				
											// Set button
											button.removeClass("disabled");
								
											// Skip model editor and show warning if WebGL isn't supported
											if(!Detector.webgl) {
												button.html(gettext("Slice"));
												$("#slicing_configuration_dialog .modal-footer p.warning").html(gettext("Model editor will be skipped since your web browser doesn't support WebGL"));
												$("#slicing_configuration_dialog .modal-footer a.skip").css("display", "none");
											}
							
											// Update line numbers
											var previousLineCount = 0;
											function updateLineNumbers() {
							
												// Check if text area exists
												var textArea = $("#slicing_configuration_dialog .modal-extra textarea");
												if(textArea.length) {

													// Get number of lines
													var numberOfLines = textArea.val().match(/\n/g);
									
													// Fix line count if no newlines were found
													if(numberOfLines === null)
														numberOfLines = 1;
													else
														numberOfLines = numberOfLines.length + 1;
									
													// Check if number of lines has changes
													if(previousLineCount != numberOfLines) {
											
														// Get line number area
														var lineNumberArea = textArea.siblings("aside");
									
														// Clear existing line numbers
														lineNumberArea.empty();
									
														// Create new line numbers
														for(var i = 1; i <= numberOfLines; i++)
															lineNumberArea.append(i + "<br>");
												
														for(var i = 0; i < 3; i++)
															lineNumberArea.append("<br>");
										
														// Update previous line count
														previousLineCount = numberOfLines;
												
														// Match line numbers scrolling
														textArea.scroll();
													}
												}
											}
											updateLineNumbers();
								
											// Update profile settings
											function updateProfileSettings(settings) {
								
												// Get current profile contents
												var profile = $("#slicing_configuration_dialog .modal-extra textarea").val();
									
												// Go through all changes settings
												for(var setting in settings) {
									
													// Remove setting
													var expression = new RegExp("(^|\n)" + setting + "(?: |=|\n|$).*?(?:\n|$)", 'g');
													profile = profile.replace(expression, "$1");
										
													// Check if setting exists
													if(settings[setting] !== null) {
										
														// Add setting
														if(slicerName == "cura") {
															if(profile.match(/(?:^|\n)\[profile\].*\n?/) === null)
																profile += "\n[profile]\n" + setting + " = " + settings[setting] + '\n';
															else
																profile = profile.replace(/(^|\n)\[profile\].*\n?/, "$1[profile]\n" + setting + " = " + settings[setting] + '\n');
														}
														else if(slicerName == "slic3r")
															profile = setting + " = " + settings[setting] + '\n' + profile;
												
														// Remove leading and trailing whitespace
														profile = profile.trim();
													}
												}
									
												// Update profile contents and line numbers
												$("#slicing_configuration_dialog .modal-extra textarea").val(profile).trigger("input");
											}
								
											// Open and close setting groups
											if(typeof localStorage.basicSettingsOpen === "undefined" || localStorage.basicSettingsOpen == "true")
												$("#slicing_configuration_dialog.profile .modal-extra div.group.basic").addClass("noTransition").removeClass("closed").children("i").removeClass("icon-caret-down").addClass("icon-caret-up").attr("title", htmlDecode(gettext("Close")));
											else
												$("#slicing_configuration_dialog.profile .modal-extra div.group.basic").addClass("noTransition closed").children("i").removeClass("icon-caret-up").addClass("icon-caret-down").attr("title", htmlDecode(gettext("Open")));

											if(typeof localStorage.manualSettingsOpen === "undefined" || localStorage.manualSettingsOpen == "false")
												$("#slicing_configuration_dialog.profile .modal-extra div.group.manual").addClass("noTransition closed").children("i").removeClass("icon-caret-up").addClass("icon-caret-down").attr("title", htmlDecode(gettext("Open")));
											else
												$("#slicing_configuration_dialog.profile .modal-extra div.group.manual").addClass("noTransition").removeClass("closed").children("i").removeClass("icon-caret-down").addClass("icon-caret-up").attr("title", htmlDecode(gettext("Close")));
								
											if(typeof localStorage.advancedSettingsOpen === "undefined" || localStorage.advancedSettingsOpen == "false")
												$("#slicing_configuration_dialog.profile .modal-extra div.group.advanced").addClass("noTransition closed").children("i").removeClass("icon-caret-up").addClass("icon-caret-down").attr("title", htmlDecode(gettext("Open")));
											else {
												$("#slicing_configuration_dialog.profile .modal-extra div.group.advanced").addClass("noTransition").removeClass("closed").children("i").removeClass("icon-caret-down").addClass("icon-caret-up").attr("title", htmlDecode(gettext("Close")));
												$("#slicing_configuration_dialog.profile .modal-extra div.group.advanced > span").css("display", "block");
											}
											
											setTimeout(function() {
											
												// Allow opening and closing group transitions
												$("#slicing_configuration_dialog.profile .modal-extra div.group").removeClass("noTransition");
												
												// Set dialogs's height
												$("#slicing_configuration_dialog.profile")[0].style.setProperty("height", $("#slicing_configuration_dialog.profile").height() + "px", "important");
											}, 0);
											
											// Open and close group
											function openAndCloseGroup(group) {
											
												// Disable opening and closing groups
												$("#slicing_configuration_dialog.profile .modal-extra div.group > i").off("click");
												
												// Save current height and scroll
												var currentHeight = $("#slicing_configuration_dialog.profile").css("height");
												var currentScroll = $("#slicing_configuration_dialog.profile .modal-extra").scrollTop();
												$("#slicing_configuration_dialog.profile").css("height", '');
												
												// Get new height
												group.addClass("noTransition");
												if(group.hasClass("closed"))
													group.removeClass("closed");
												else
													group.addClass("closed");
											
												var newHeight = $("#slicing_configuration_dialog.profile").height();
												if(group.hasClass("closed"))
													group.removeClass("closed");
												else
													group.addClass("closed");
												
												// Restore current height and scroll
												$("#slicing_configuration_dialog.profile")[0].style.setProperty("height", currentHeight, "important");
												$("#slicing_configuration_dialog.profile .modal-extra").scrollTop(currentScroll);
											
												setTimeout(function() {
												
													group.removeClass("noTransition");
													
													// Open or close group
													if(group.hasClass("closed")) {
														group.removeClass("closed").children("i").removeClass("icon-caret-down").addClass("icon-caret-up").attr("title", htmlDecode(gettext("Close")));
				
														 if(group.hasClass("advanced"))
															setTimeout(function() {
																$("#slicing_configuration_dialog.profile .modal-extra div.group.advanced > span").css("display", "block");
															}, 100);
				
														// Save that group is open
														if(group.hasClass("basic"))
															localStorage.basicSettingsOpen = "true";
														else if(group.hasClass("manual"))
															localStorage.manualSettingsOpen = "true";
														else if(group.hasClass("advanced"))
															localStorage.advancedSettingsOpen = "true";
													}
													else {
														group.addClass("closed").children("i").removeClass("icon-caret-up").addClass("icon-caret-down").attr("title", htmlDecode(gettext("Open")));
				
														if(group.hasClass("advanced"))
															setTimeout(function() {
																$("#slicing_configuration_dialog.profile .modal-extra div.group.advanced > span").css("display", "none");
															}, 100);
				
														// Save that group is closed
														if(group.hasClass("basic"))
															localStorage.basicSettingsOpen = "false";
														else if(group.hasClass("manual"))
															localStorage.manualSettingsOpen = "false";
														else if(group.hasClass("advanced"))
															localStorage.advancedSettingsOpen = "false";
													}
			
													// Update title
													group.children("i").mouseenter();
													
													// Set dialogs's height
													$("#slicing_configuration_dialog.profile").addClass("transitionHeight")[0].style.setProperty("height", newHeight + "px", "important");
													setTimeout(function() {
														$("#slicing_configuration_dialog.profile").removeClass("transitionHeight");
														
														// Enable opening and closing groups
														$("#slicing_configuration_dialog.profile .modal-extra div.group > i").click(function() {
							
															// Open and close group
															openAndCloseGroup($(this).parent());
														});
													}, 300);
												}, 0);
											}
											
											// Expand/collapse group
											$("#slicing_configuration_dialog.profile .modal-extra div.group > i").click(function() {
								
												// Open and close group
												openAndCloseGroup($(this).parent());
											});
							
											// Text area scroll event
											$("#slicing_configuration_dialog .modal-extra textarea").scroll(function() {
							
												// Scroll line numbers to match text area
												$(this).siblings("aside").scrollTop($(this).scrollTop());
									
											// Text area input event
											}).on("input", function() {
												
												// Update line numbers
												updateLineNumbers();
											});
								
											// Settings checkbox change event
											$("#slicing_configuration_dialog .modal-extra div.groups div input[type=\"checkbox\"]").change(function() {
								
												// Initialize changed settings
												var changedSettings = [];
								
												// Set if checked
												var checked = $(this).is(":checked");
									
												// Set changed settings if changing use support material
												if($(this).hasClass("useSupportMaterial")) {
												
													// Check if enabling option
													if(checked) {
												
														if(slicerName == "cura")
															changedSettings.push({
																support: $("#slicing_configuration_dialog .useModelOnModelSupport").is(":checked") ? "Everywhere; None, Touching buildplate, Everywhere" : "Touching buildplate; None, Touching buildplate, Everywhere"
															});
														else if(slicerName == "slic3r")
															changedSettings.push({
																support_material: 1
															});
													}
													
													// Otherwise
													else {
												
														if(slicerName == "cura") {
															changedSettings.push({
																support: "None; None, Touching buildplate, Everywhere"
															});
															
															// Uncheck model on model support basic setting
															$("#slicing_configuration_dialog .useModelOnModelSupport").prop("checked", false);
														}
														else if(slicerName == "slic3r") {
															changedSettings.push({
																support_material: 0
															});
															
															// Uncheck dont support bridges basic setting
															$("#slicing_configuration_dialog .dontSupportBridges").prop("checked", false);
														}
													}
												}
									
												// Otherwise set changed settings if changing use model on model support (Cura only)
												else if($(this).hasClass("useModelOnModelSupport")) {
												
													// Check if enabling option
													if(checked) {
														changedSettings.push({
															support: "Everywhere; None, Touching buildplate, Everywhere"
														});
											
														// Check use support material
														$("#slicing_configuration_dialog .useSupportMaterial").prop("checked", true);
													}
													
													// Otherwise
													else
														changedSettings.push({
															support: $("#slicing_configuration_dialog .useSupportMaterial").is(":checked") ? "Touching buildplate; None, Touching buildplate, Everywhere" : "None; None, Touching buildplate, Everywhere"
														});
												}
												
												// Otherwise set changed settings if changing dont support bridges (Slic3r only)
												else if($(this).hasClass("dontSupportBridges")) {
									
													// Check if enabling option
													if(checked)
														changedSettings.push({
															dont_support_bridges: 1
														});
													
													// Otherwise
													else {
														changedSettings.push({
															support_material: 1,
															dont_support_bridges: 0
														});

														// Check use support material
														$("#slicing_configuration_dialog .useSupportMaterial").prop("checked", true);
													}
												}
									
												// Otherwise set changed settings if changing use raft
												else if($(this).hasClass("useRaft")) {
									
													// Check if enabling option
													if(checked) {
											
														if(slicerName == "cura")
															changedSettings.push({
																platform_adhesion: "Raft; None, Brim, Raft",
																bottom_layer_speed: 8,
																raft_airgap: $("#slicing_configuration_dialog.profile .raftAirgap").val()
															});
														else if(slicerName == "slic3r") {
														
															// Set raft layers to be at least one
															if($("#slicing_configuration_dialog .raftLayers").val() == 0)
																$("#slicing_configuration_dialog .raftLayers").val(1);
															
															changedSettings.push({
																raft_layers: $("#slicing_configuration_dialog.profile .raftLayers").val(),
																first_layer_speed: "50%",
																skirts: 0,
																brim_width: 0
															});
														}
											
														if(usingProvidedProfile && (slicerProfileName == "micro_3d_abs" || slicerProfileName == "micro_3d_hips")) {
												
															if(slicerName == "cura")
																changedSettings[0]["bottom_layer_speed"] = 10;
															else if(slicerName == "slic3r")
																changedSettings[0]["first_layer_speed"] = "50%";
														}
											
														// Uncheck use brim and use skirt basic setting, disable brim line count and skirt gap manual setting, and enable raft airgap manual setting
														$("#slicing_configuration_dialog .useBrim, #slicing_configuration_dialog .useSkirt").prop("checked", false);
														$("#slicing_configuration_dialog .skirtGap").parent("div").parent("div").addClass("disabled");
														
														if(slicerName == "cura") {
															$("#slicing_configuration_dialog .brimLineCount").parent("div").parent("div").addClass("disabled");
															$("#slicing_configuration_dialog .raftAirgap").parent("div").parent("div").removeClass("disabled");
														}
														else if (slicerName == "slic3r") {
															$("#slicing_configuration_dialog .brimWidth").parent("div").parent("div").addClass("disabled");
															$("#slicing_configuration_dialog .skirts").parent("div").parent("div").addClass("disabled");
															$("#slicing_configuration_dialog .raftLayers").parent("div").parent("div").removeClass("disabled");
														}
													}
													
													// Otherwise
													else {
											
														if(slicerName == "cura") {
															changedSettings.push({
																platform_adhesion: "None; None, Brim, Raft",
																bottom_layer_speed: 4,
																skirt_line_count: 0
															});
															
															// Disable raft airgap manual setting
															$("#slicing_configuration_dialog.profile .raftAirgap").parent("div").parent("div").addClass("disabled");
														}
														else if(slicerName == "slic3r") {
															changedSettings.push({
																raft_layers: 0,
																first_layer_speed: "25%",
																skirts: 0,
																brim_width: 0
															});
															
															// Disable raft layers manual setting
															$("#slicing_configuration_dialog.profile .raftLayers").parent("div").parent("div").addClass("disabled");
														}
														
														if(usingProvidedProfile && (slicerProfileName == "micro_3d_abs" || slicerProfileName == "micro_3d_hips")) {
												
															if(slicerName == "cura")
																changedSettings[0]["bottom_layer_speed"] = 5;
															else if(slicerName == "slic3r")
																changedSettings[0]["first_layer_speed"] = "25%";
														}
													}
												}
									
												// Otherwise set changed settings if changing use brim
												else if($(this).hasClass("useBrim")) {
												
													// Check if enabling option
													if(checked) {
											
														if(slicerName == "cura") {
														
															// Set brim line count to be at least one
															if($("#slicing_configuration_dialog .brimLineCount").val() == 0)
																$("#slicing_configuration_dialog .brimLineCount").val(1);
															
															changedSettings.push({
																platform_adhesion: "Brim; None, Brim, Raft",
																bottom_layer_speed: 8,
																brim_line_count: $("#slicing_configuration_dialog.profile .brimLineCount").val()
															});
														}
														else if(slicerName == "slic3r")
															changedSettings.push({
																raft_layers: 0,
																first_layer_speed: "50%",
																skirts: 0,
																brim_width: $("#slicing_configuration_dialog.profile .brimWidth").val()
															});
											
														if(usingProvidedProfile && (slicerProfileName == "micro_3d_abs" || slicerProfileName == "micro_3d_hips")) {
												
															if(slicerName == "cura")
																changedSettings[0]["bottom_layer_speed"] = 10;
															else if(slicerName == "slic3r")
																changedSettings[0]["first_layer_speed"] = "50%";
														}
											
														// Uncheck use raft and skirt basic setting, enable brim line count manual setting, and disable raft airgap and skirt gap manual setting
														$("#slicing_configuration_dialog .useRaft, #slicing_configuration_dialog .useSkirt").prop("checked", false);
														$("#slicing_configuration_dialog .skirtGap").parent("div").parent("div").addClass("disabled");
														
														if(slicerName == "cura") {
															$("#slicing_configuration_dialog .brimLineCount").parent("div").parent("div").removeClass("disabled");
															$("#slicing_configuration_dialog .raftAirgap").parent("div").parent("div").addClass("disabled");
														}
														else if (slicerName == "slic3r") {
															$("#slicing_configuration_dialog .brimWidth").parent("div").parent("div").removeClass("disabled");
															$("#slicing_configuration_dialog .raftLayers").parent("div").parent("div").addClass("disabled");
															$("#slicing_configuration_dialog .skirts").parent("div").parent("div").addClass("disabled");
														}
													}
													
													// Otherwise
													else {
											
														if(slicerName == "cura") {
															changedSettings.push({
																platform_adhesion: "None; None, Brim, Raft",
																bottom_layer_speed: 4,
																skirt_line_count: 0
															});
															
															// Disable brim line count manual setting
															$("#slicing_configuration_dialog .brimLineCount").parent("div").parent("div").addClass("disabled");
														}
														else if(slicerName == "slic3r") {
															changedSettings.push({
																raft_layers: 0,
																first_layer_speed: "25%",
																skirts: 0,
																brim_width: 0
															});
															
															// Disable brim width manual setting
															$("#slicing_configuration_dialog .brimWidth").parent("div").parent("div").addClass("disabled");
														}
														
														if(usingProvidedProfile && (slicerProfileName == "micro_3d_abs" || slicerProfileName == "micro_3d_hips")) {
												
															if(slicerName == "cura")
																changedSettings[0]["bottom_layer_speed"] = 5;
															else if(slicerName == "slic3r")
																changedSettings[0]["first_layer_speed"] = "25%";
														}
													}
												}
										
												// Otherwise set changed settings if changing use skirt
												else if($(this).hasClass("useSkirt")) {
												
													// Check if enabling option
													if(checked) {
											
														if(slicerName == "cura")
															changedSettings.push({
																platform_adhesion: "None; None, Brim, Raft",
																bottom_layer_speed: 4,
																skirt_line_count: 1,
																skirt_gap: $("#slicing_configuration_dialog .skirtGap").val()
															});
														
														else if(slicerName == "slic3r") {
															
															// Make skirts 
															if($("#slicing_configuration_dialog .skirts").val() == 0)
																$("#slicing_configuration_dialog .skirts").val(1);
															
															changedSettings.push({
																raft_layers: 0,
																first_layer_speed: "25%",
																skirts: $("#slicing_configuration_dialog .skirts").val(),
																skirt_distance: $("#slicing_configuration_dialog .skirtGap").val(),
																brim_width: 0
															});
														}
														
														if(usingProvidedProfile && (slicerProfileName == "micro_3d_abs" || slicerProfileName == "micro_3d_hips")) {
												
															if(slicerName == "cura")
																changedSettings[0]["bottom_layer_speed"] = 5;
															else if(slicerName == "slic3r")
																changedSettings[0]["first_layer_speed"] = "25%";
														}
											
														// Uncheck use raft and brim basic setting, enable skirt gap manual setting, and disable raft airgap and brim line count manual setting
														$("#slicing_configuration_dialog .useRaft, #slicing_configuration_dialog .useBrim").prop("checked", false);
														$("#slicing_configuration_dialog .skirtGap").parent("div").parent("div").removeClass("disabled");
														
														if(slicerName == "cura") {
															$("#slicing_configuration_dialog .raftAirgap").parent("div").parent("div").addClass("disabled");
															$("#slicing_configuration_dialog .brimLineCount").parent("div").parent("div").addClass("disabled");
														}
														else if (slicerName == "slic3r") {
															$("#slicing_configuration_dialog .skirts").parent("div").parent("div").removeClass("disabled");
															$("#slicing_configuration_dialog .raftLayers").parent("div").parent("div").addClass("disabled");
															$("#slicing_configuration_dialog .brimWidth").parent("div").parent("div").addClass("disabled");
														}
													}
													
													// Otherwise
													else {
											
														if(slicerName == "cura")
															changedSettings.push({
																platform_adhesion: "None; None, Brim, Raft",
																bottom_layer_speed: 4,
																skirt_line_count: 0
															});
														else if(slicerName == "slic3r") {
															changedSettings.push({
																raft_layers: 0,
																first_layer_speed: "25%",
																skirts: 0,
																brim_width: 0
															});
															
															// Disable skirt count
															$("#slicing_configuration_dialog.profile .skirts").parent("div").parent("div").addClass("disabled");
														}
														
														if(usingProvidedProfile && (slicerProfileName == "micro_3d_abs" || slicerProfileName == "micro_3d_hips")) {
												
															if(slicerName == "cura")
																changedSettings[0]["bottom_layer_speed"] = 5;
															else if(slicerName == "slic3r")
																changedSettings[0]["first_layer_speed"] = "25%";
														}
											
														// Disable skirt gap manual setting
														$("#slicing_configuration_dialog.profile .skirtGap").parent("div").parent("div").addClass("disabled");
													}
												}
									
												// Otherwise set changed settings if changing use retraction
												else if($(this).hasClass("useRetraction")) {
												
													// Check if enabling option
													if(checked) {
											
														if(slicerName == "cura")
															changedSettings.push({
																retraction_enable: "True"
															});
														else if(slicerName == "slic3r")
															changedSettings.push({
																retract_speed: 20
															});
														
														if(usingProvidedProfile && (slicerProfileName == "micro_3d_abs" || slicerProfileName == "micro_3d_hips")) {
															if(slicerName == "slic3r")
																changedSettings[0]["retract_speed"] = 25;
														}
													}
													
													// Otherwise
													else {
											
														if(slicerName == "cura")
															changedSettings.push({
																retraction_enable: "False"
															});
														else if(slicerName == "slic3r")
															changedSettings.push({
																retract_speed: 0
															});
													}
												}
									
												// Update profile settings
												updateProfileSettings(changedSettings[0]);
											});
								
											// Settings drag image event
											$("#slicing_configuration_dialog .groups button img").on("dragstart", function(event) {

												// Prevent default
												event.preventDefault();
											});
								
											// Settings label click event
											$("#slicing_configuration_dialog.profile .group.manual label").click(function() {
								
												// Focus on input
												var input = $(this).next("div").children("input");
												input.focus().val(input.val());
											});
								
											// Settings change event
											$("#slicing_configuration_dialog.profile .group.manual input").change(function() {
								
												// Initialize changed settings
												var changedSettings = [];
												
												// Set changed settings if changing printing temperature
												if($(this).hasClass("printingTemperature")) {
										
													if(slicerName == "cura")
														changedSettings.push({
															print_temperature: $(this).val()
														});
													else if(slicerName == "slic3r")
														changedSettings.push({
															temperature: $(this).val()
														});
												}
												
												// Otherwise set changed settings if changing heatbed temperature
												else if($(this).hasClass("heatbedTemperature")) {
												
													if(slicerName == "cura")
														changedSettings.push({
															print_bed_temperature: $(this).val()
														});
													else if(slicerName == "slic3r")
														changedSettings.push({
															bed_temperature: $(this).val()
														});
												}
												
												// Otherwise set changed settings if changing layer height
												else if($(this).hasClass("layerHeight")) {
										
													if(slicerName == "cura")
														changedSettings.push({
															layer_height: $(this).val(),
															solid_layer_thickness: parseFloat(parseInt($("#slicing_configuration_dialog.profile .topBottomLayers").val()) * (parseFloat($(this).val()) - 0.0000001)).toFixed(3)
														});
													else if(slicerName == "slic3r")
														changedSettings.push({
															layer_height: $(this).val(),
															bottom_solid_layers: parseInt($("#slicing_configuration_dialog.profile .bottomLayers").val()),
															top_solid_layers: parseInt($("#slicing_configuration_dialog.profile .topLayers").val())
														});
										
													// Clear basic quality settings
													$("#slicing_configuration_dialog p.quality").html(gettext("Unknown Quality"));
													$("#slicing_configuration_dialog div.quality button.disabled").removeClass("disabled");
												}
									
												// Otherwise set changed settings if changing fill density
												else if($(this).hasClass("fillDensity")) {
										
													if(slicerName == "cura")
														changedSettings.push({
															fill_density: $(this).val()
														});
													else if(slicerName == "slic3r")
														changedSettings.push({
															fill_density: $(this).val()
														});
										
													// Clear basic fill settings
													$("#slicing_configuration_dialog p.fill").html(gettext("Unknown Fill"));
													$("#slicing_configuration_dialog div.fill button.disabled").removeClass("disabled");
												}
									
												// Otherwise set changed settings if changing thickness
												else if($(this).hasClass("thickness")) {
									
													// Get nozzle size
													var nozzleSize;
													if(slicerName == "cura")
														nozzleSize = getSlicerProfileValue("nozzle_size");
													else if(slicerName == "slic3r")
														nozzleSize = getSlicerProfileValue("nozzle_diameter");
													
													if(nozzleSize == '')
														nozzleSize = self.printerProfile.currentProfileData().extruder.nozzleDiameter();
											
													if(slicerName == "cura")
														changedSettings.push({
															wall_thickness: parseFloat(parseInt($(this).val()) * parseFloat(nozzleSize)).toFixed(3),
															nozzle_size : nozzleSize
														});
													else if(slicerName == "slic3r")
														changedSettings.push({
															perimeters: parseInt($(this).val()),
															nozzle_diameter: nozzleSize
														});
										
													// Clear basic fill settings
													$("#slicing_configuration_dialog p.fill").html(gettext("Unknown Fill"));
													$("#slicing_configuration_dialog div.fill button.disabled").removeClass("disabled");
												}
									
												// Otherwise set changed settings if changing print speed
												else if($(this).hasClass("printSpeed")) {
												
													if(slicerName == "cura")
														changedSettings.push({
															print_speed: $(this).val(),
															travel_speed: parseFloat($(this).val()) + 4 <= 80 ? parseFloat(parseFloat($(this).val()) + 4).toFixed(3) : 80,
															inset0_speed: parseFloat($(this).val()) - 4 >= 1 ? parseFloat(parseFloat($(this).val()) - 4).toFixed(3) : 1,
															insetx_speed: parseFloat($(this).val()) - 2 >= 1 ? parseFloat(parseFloat($(this).val()) - 2).toFixed(3) : 1
														});
													else if(slicerName == "slic3r") {
														var speed = $(this).val();
														changedSettings.push({
															max_print_speed: speed * 2,
															min_print_speed: parseInt(speed / 2),
															travel_speed: parseFloat(speed) + 4 <= 80 ? parseFloat(parseFloat(speed) + 4).toFixed(3) : 80,
															perimeter_speed: speed,
															infill_speed: parseFloat(speed) - 4 >= 1 ? parseFloat(parseFloat(speed) - 4).toFixed(3) : 1,
															solid_infill_speed: parseFloat(speed) - 2 >= 1 ? parseFloat(parseFloat(speed) - 2).toFixed(3) : 1,
															support_material_speed: parseFloat(speed) + 4 <= 80 ? parseFloat(parseFloat(speed) + 4).toFixed(3) : 80,
															top_solid_infill_speed: parseFloat(speed) - 4 >= 1 ? parseFloat(parseFloat(speed) - 4).toFixed(3) : 1,
															bridge_speed: parseFloat(speed) - 4 >= 1 ? parseFloat(parseFloat(speed) - 4).toFixed(3) : 1,
															gap_fill_speed: parseFloat(speed) - 4 >= 1 ? parseFloat(parseFloat(speed) - 4).toFixed(3) : 1
														});
													}
										
													if(usingProvidedProfile && (slicerProfileName == "micro_3d_abs" || slicerProfileName == "micro_3d_hips")) {
											
														if(slicerName == "cura") {
															changedSettings[0]["travel_speed"] = $(this).val();
															changedSettings[0]["insetx_speed"] = parseFloat($(this).val()) - 3 >= 1 ? parseFloat(parseFloat($(this).val()) - 3).toFixed(3) : 1;
														}
														else if(slicerName == "slic3r") {
															changedSettings[0]["travel_speed"] = $(this).val();
															changedSettings[0]["solid_infill_speed"] = parseFloat($(this).val()) - 3 >= 1 ? parseFloat(parseFloat($(this).val()) - 3).toFixed(3) : 1;
														}
													}
												}
									
												// Otherwise set changed settings if changing top/bottom layers (Cura only)
												else if($(this).hasClass("topBottomLayers")) {
									
													// Get layer height
													var layerHeight = getSlicerProfileValue("layer_height");
													
													changedSettings.push({
														solid_layer_thickness: parseFloat(parseInt($(this).val()) * (parseFloat(layerHeight == '' ? 0.1 : layerHeight) - 0.0000001)).toFixed(3)
													});
										
													if(layerHeight == '')
														changedSettings[0]["layer_height"] = 0.1;
										
													// Clear basic quality settings
													$("#slicing_configuration_dialog p.quality").html(gettext("Unknown Quality"));
													$("#slicing_configuration_dialog div.quality button.disabled").removeClass("disabled");
												}
									
												// Otherwise set changed settings if changing raft airgap (Cura only)
												else if($(this).hasClass("raftAirgap"))
										
													changedSettings.push({
														raft_airgap: $(this).val()
													});
												
												// Otherwise set changed settings if changing raft layers (Slic3r only)
												else if($(this).hasClass("raftLayers"))
										
													changedSettings.push({
														raft_layers: $(this).val()
													});
									
												// Otherwise set changed settings if changing brim line count (Cura only)
												else if($(this).hasClass("brimLineCount"))
										
													changedSettings.push({
														brim_line_count: $(this).val()
													});
												
												// Otherwise set changed settings if changing brim width (Slic3r only)
												else if($(this).hasClass("brimWidth"))
										
													changedSettings.push({
														brim_width: $(this).val()
													});
										
												// Otherwise set changed settings if changing skirt gap
												else if($(this).hasClass("skirtGap")) {
										
													if(slicerName == "cura")
														changedSettings.push({
															skirt_gap: $(this).val()
														});
													else if(slicerName == "slic3r")
														changedSettings.push({
															skirt_distance: $(this).val()
														});
												}
												
												// Otherwise set changed settings if changing skirts count (Slic3r only)
												else if($(this).hasClass("skirts"))
										
													changedSettings.push({
														skirts: $(this).val()
													});
												
												// Otherwise set changed settings if changing bottom layers (Slic3r only)
												else if($(this).hasClass("bottomLayers")) {
												
													changedSettings.push({
														bottom_solid_layers: $(this).val()
													});
													
													// Clear basic quality settings
													$("#slicing_configuration_dialog p.quality").html(gettext("Unknown Quality"));
													$("#slicing_configuration_dialog div.quality button.disabled").removeClass("disabled");
												}
												
												// Otherwise set changed settings if changing top layers (Slic3r only)
												else if($(this).hasClass("topLayers")) {
												
													changedSettings.push({
														top_solid_layers: $(this).val()
													});
													
													// Clear basic quality settings
													$("#slicing_configuration_dialog p.quality").html(gettext("Unknown Quality"));
													$("#slicing_configuration_dialog div.quality button.disabled").removeClass("disabled");
												}
									
												// Update profile settings
												updateProfileSettings(changedSettings[0]);
											});
								
											// Settings button click event
											$("#slicing_configuration_dialog .groups div button").click(function() {
								
												// Select button
												$(this).blur();
												$(this).addClass("disabled").siblings("button").removeClass("disabled");
									
												// Initialize changed settings
												var changedSettings = [];
												var target = $(this).attr("data-target");
												
												// Set setting's text
												$("#slicing_configuration_dialog .groups p." + target).text($(this).attr("title"));
												
												// Check which setting was changes
												switch(target) {
												
													// Quality
													case "quality":
													
														// Initialize fan full height
														var fan_full_height = 0;
														
														// Check new quality setting
														switch(parseFloat($(this).attr("data-value"))) {
														
															// Extra low quality
															case 0.35:
															
																if(slicerName == "cura")
																	changedSettings.push({
																		layer_height: 0.35,
																		bottom_thickness: 0.3,
																		fan_full_height: parseFloat((1 - 1) * 0.35 + 0.3 + 0.001).toFixed(3),
																		solid_layer_thickness: parseFloat(8 * (0.35 - 0.0000001)).toFixed(3)
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		layer_height: 0.35,
																		first_layer_height: Math.round(0.3 / 0.35 * 100) + "%",
																		top_solid_layers: 8,
																		bottom_solid_layers: 8
																	});
																
																fan_full_height = (2 - 1) * 0.35 + 0.3 + 0.001;
																break;
															
															// Low quality
															case 0.30:
															
																if(slicerName == "cura")
																	changedSettings.push({
																		layer_height: 0.30,
																		bottom_thickness: 0.3,
																		fan_full_height: parseFloat((1 - 1) * 0.30 + 0.3 + 0.001).toFixed(3),
																		solid_layer_thickness: parseFloat(8 * (0.30 - 0.0000001)).toFixed(3)
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		layer_height: 0.30,
																		first_layer_height: Math.round(0.3 / 0.30 * 100) + "%",
																		top_solid_layers: 8,
																		bottom_solid_layers: 8
																	});
																
																fan_full_height = (2 - 1) * 0.30 + 0.3 + 0.001;
																break;
															
															// Medium quality
															case 0.25:
															
																if(slicerName == "cura")
																	changedSettings.push({
																		layer_height: 0.25,
																		bottom_thickness: 0.3,
																		fan_full_height: parseFloat((1 - 1) * 0.25 + 0.3 + 0.001).toFixed(3),
																		solid_layer_thickness: parseFloat(8 * (0.25 - 0.0000001)).toFixed(3)
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		layer_height: 0.25,
																		first_layer_height: Math.round(0.3 / 0.25 * 100) + "%",
																		top_solid_layers: 8,
																		bottom_solid_layers: 8
																	});
																
																fan_full_height = (2 - 1) * 0.25 + 0.3 + 0.001;
																break;
															
															// High quality
															case 0.20:
															
																if(slicerName == "cura")
																	changedSettings.push({
																		layer_height: 0.20,
																		bottom_thickness: 0.3,
																		fan_full_height: parseFloat((1 - 1) * 0.20 + 0.3 + 0.001).toFixed(3),
																		solid_layer_thickness: parseFloat(8 * (0.20 - 0.0000001)).toFixed(3)
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		layer_height: 0.20,
																		first_layer_height: Math.round(0.3 / 0.2 * 100) + "%",
																		top_solid_layers: 8,
																		bottom_solid_layers: 8
																	});
																
																fan_full_height = (2 - 1) * 0.20 + 0.3 + 0.001;
																break;
															
															// Extra high quality
															case 0.15:
															
																if(slicerName == "cura")
																	changedSettings.push({
																		layer_height: 0.15,
																		bottom_thickness: 0.3,
																		fan_full_height: parseFloat((1 - 1) * 0.15 + 0.3 + 0.001).toFixed(3),
																		solid_layer_thickness: parseFloat(8 * (0.15 - 0.0000001)).toFixed(3)
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		layer_height: 0.15,
																		first_layer_height: Math.round(0.3 / 0.15 * 100) + "%",
																		top_solid_layers: 8,
																		bottom_solid_layers: 8
																	});
																
																fan_full_height = (2 - 1) * 0.15 + 0.3 + 0.001;
																break;
															
															// Highest quality
															case 0.05:
															
																if(slicerName == "cura")
																	changedSettings.push({
																		layer_height: 0.05,
																		bottom_thickness: 0.3,
																		fan_full_height: parseFloat((1 - 1) * 0.05 + 0.3 + 0.001).toFixed(3),
																		solid_layer_thickness: parseFloat(8 * (0.05 - 0.0000001)).toFixed(3)
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		layer_height: 0.05,
																		first_layer_height: Math.round(0.3 / 0.05 * 100) + "%",
																		top_solid_layers: 8,
																		bottom_solid_layers: 8
																	});
																
																fan_full_height = (2 - 1) * 0.05 + 0.3 + 0.001;
																break;
														}
														
														if(usingProvidedProfile && (slicerProfileName == "micro_3d_abs" || slicerProfileName == "micro_3d_hips" || slicerProfileName == "micro_3d_abs-r" || slicerProfileName == "micro_3d_cam")) {
															if(slicerName == "cura")
																changedSettings[0]["fan_full_height"] = parseFloat(fan_full_height).toFixed(3);
														}
														
														// Set layer height and top/bottom layers manual settings
														if(slicerName == "cura") {
															$("#slicing_configuration_dialog .layerHeight").val(parseFloat(changedSettings[0]["layer_height"]).toFixed(2));
															$("#slicing_configuration_dialog .topBottomLayers").val(Math.round(parseFloat(changedSettings[0]["solid_layer_thickness"]) / (parseFloat(changedSettings[0]["layer_height"]) - 0.0000001)));
														}
														else if(slicerName == "slic3r") {
															$("#slicing_configuration_dialog .layerHeight").val(parseFloat(changedSettings[0]["layer_height"]).toFixed(2));
															$("#slicing_configuration_dialog .topLayers").val(parseInt(changedSettings[0]["top_solid_layers"]));
															$("#slicing_configuration_dialog .bottomLayers").val(parseInt(changedSettings[0]["bottom_solid_layers"]));
														}
														
														break;
													
													// Fill
													case "fill":
													
														// Get nozzle size
														var nozzleSize;
														if(slicerName == "cura")
															nozzleSize = getSlicerProfileValue("nozzle_size");
														else if(slicerName == "slic3r")
															nozzleSize = getSlicerProfileValue("nozzle_diameter");
														
														if(nozzleSize == '')
															nozzleSize = self.printerProfile.currentProfileData().extruder.nozzleDiameter();
													
														// Check new fill setting
														switch($(this).attr("data-value")) {
														
															// Hollow thin fill
															case "thin":
															
																if(slicerName == "cura")
																	changedSettings.push({
																		fill_density: 0,
																		wall_thickness: parseFloat(1 * nozzleSize).toFixed(3),
																		nozzle_size: nozzleSize
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		fill_density: 0 + "%",
																		perimeters: 1,
																		nozzle_diameter: nozzleSize
																	});
																
																break;
															
															// Hollow thick fill
															case "thick":
															
																if(slicerName == "cura")
																	changedSettings.push({
																		fill_density: 0,
																		wall_thickness: parseFloat(3 * nozzleSize).toFixed(3),
																		nozzle_size: nozzleSize
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		fill_density: 0 + "%",
																		perimeters: 3,
																		nozzle_diameter: nozzleSize
																	});
																
																break;
															
															// Low fill
															case "low":
															
																if(slicerName == "cura")
																	changedSettings.push({
																		fill_density: parseFloat(nozzleSize / 5500 * 100000).toFixed(3),
																		wall_thickness: parseFloat(3 * nozzleSize).toFixed(3),
																		nozzle_size: nozzleSize
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		fill_density: parseFloat(nozzleSize / 5500 * 100000).toFixed(3) + "%",
																		perimeters: 3,
																		nozzle_diameter: nozzleSize
																	});
																
																break;
															
															// Medium fill
															case "medium":
															
																if(slicerName == "cura")
																	changedSettings.push({
																		fill_density: parseFloat(nozzleSize / 4000 * 100000).toFixed(3),
																		wall_thickness: parseFloat(4 * nozzleSize).toFixed(3),
																		nozzle_size: nozzleSize
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		fill_density: parseFloat(nozzleSize / 4000 * 100000).toFixed(3) + "%",
																		perimeters: 4,
																		nozzle_diameter: nozzleSize
																	});
																
																break;
															
															// High fill
															case "high":
															
																if(slicerName == "cura")
																	changedSettings.push({
																		fill_density: parseFloat(nozzleSize / 2500 * 100000).toFixed(3),
																		wall_thickness: parseFloat(4 * nozzleSize).toFixed(3),
																		nozzle_size: nozzleSize
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		fill_density: parseFloat(nozzleSize / 2500 * 100000).toFixed(3) + "%",
																		perimeters: 4,
																		nozzle_diameter: nozzleSize
																	});
																
																break;
															
															// Extra high fill
															case "extra-high":
															
																if(slicerName == "cura")
																	changedSettings.push({
																		fill_density: parseFloat(nozzleSize / 1500 * 100000).toFixed(3),
																		wall_thickness: parseFloat(4 * nozzleSize).toFixed(3),
																		nozzle_size: nozzleSize
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		fill_density: parseFloat(nozzleSize / 1500 * 100000).toFixed(3) + "%",
																		perimeters: 4,
																		nozzle_diameter: nozzleSize
																	});
																
																break;
															
															// Full fill
															case "full":
															
																if(slicerName == "cura")
																	changedSettings.push({
																		fill_density: 100,
																		wall_thickness: parseFloat(4 * nozzleSize).toFixed(3),
																		nozzle_size: nozzleSize
																	});
																else if(slicerName == "slic3r")
																	changedSettings.push({
																		fill_density: 100 + "%",
																		perimeters: 4,
																		nozzle_diameter: nozzleSize
																	});
																
																break;
														}
														
														// Set fill density and wall thickness manual setting
														if(slicerName == "cura") {
															$("#slicing_configuration_dialog .fillDensity").val(parseFloat(changedSettings[0]["fill_density"]).toFixed(2));
															$("#slicing_configuration_dialog .thickness").val(Math.round(parseFloat(changedSettings[0]["wall_thickness"]) / parseFloat(changedSettings[0]["nozzle_size"])));
														}
														else if(slicerName == "slic3r") {
															$("#slicing_configuration_dialog .fillDensity").val(parseFloat(changedSettings[0]["fill_density"]).toFixed(2));
															$("#slicing_configuration_dialog .thickness").val(parseInt(changedSettings[0]["perimeters"]));
														}
														
														break;
													
													// Fill pattern
													case "pattern":
													
														changedSettings.push({
															fill_pattern: $(this).attr("data-value") + "; archimedeanchords, rectilinear, octagramspiral, hilbertcurve, line, concentric, honeycomb, 3dhoneycomb"
														});
														
														break;
													
													// Top/Bottom Fill pattern
													case "solid_pattern":
													
														changedSettings.push({
															solid_fill_pattern: $(this).attr("data-value") + "; archimedeanchords, rectilinear, octagramspiral, hilbertcurve, concentric"
														});
														
														break;
												}

												// Update profile settings
												updateProfileSettings(changedSettings[0]);
											});

											// Resize window
											$(window).resize();
										}, 200);
									});
								}, 600);
							}
							
							// Otherwise
							else {
							
								// Show message
								showMessage(gettext("Slicer Status"), gettext("Profile isn't available"), gettext("OK"), function() {
							
									// Enable button
									button.removeClass("disabled");
			
									// Hide message
									hideMessage();
								});
							
							}
						});
					}
					
					// Otherwise check if slicer menu is modify profile
					else if(slicerMenu == "Modify Profile") {
					
						// Get slicer profile content
						slicerProfileContent = $("#slicing_configuration_dialog .modal-extra textarea").val();
					
						// Set parameter
						var parameter = [
							{
								name: "Slicer Name",
								value: slicerName
							},
							{
								name: "Slicer Profile Content",
								value: slicerProfileContent
							},
						];

						// Send request
						$.ajax({
							url: PLUGIN_BASEURL + "m33fio/upload",
							type: "POST",
							dataType: "json",
							data: $.param(parameter),
							contentType: "application/x-www-form-urlencoded; charset=UTF-8",
							traditional: true,
							processData: true

						// Done
						}).done(function(data) {
							
							// Check if modified profile is valid
							if(data.value == "OK") {
							
								// Check if WebGL isn't supported or skipping model editor
								if(!Detector.webgl || skipModelEditor) {
								
									// Set slicer menu
									slicerMenu = "Modify Model";
									
									// Apply changes
									button.removeClass("disabled").click();
								}
								
								// Otherwise
								else {
							
									// Display cover
									$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").html(gettext("Loading model…"));
								
									setTimeout(function() {
								
										// Download model
										var xhr = new XMLHttpRequest();
										xhr.onreadystatechange = function() {
					
											// Check if model has loaded
											if(this.readyState == 4 && this.status == 200) {
						
												// Create model editor and load model from blob
												createModelEditor(URL.createObjectURL(this.response));
		
												// Wait until model is loaded
												function isModelLoaded() {

													// Check if model is loaded
													if(modelEditor.modelLoaded) {
													
														// Display model
														$("#slicing_configuration_dialog").removeClass("in");
														
														setTimeout(function() {
														
															// Reset dialog's height
															$("#slicing_configuration_dialog").css("height", '');
														
															// Hide cover
															$("#slicing_configuration_dialog .modal-cover").addClass("noTransition").removeClass("show");
															setTimeout(function() {
																$("#slicing_configuration_dialog .modal-cover").css("z-index", '').removeClass("noTransition");
															}, 200);
														
															// Display model editor
															$("#slicing_configuration_dialog").removeClass("profile").addClass("model in");
															$("#slicing_configuration_dialog p.currentMenu").html(gettext("Modify Model"));
															$("#slicing_configuration_dialog .modal-extra").empty().append('\
																<div class="printer">\
																	<button class="micro3d" data-color="Black" title="' + encodeQuotes(gettext("Black")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/black.png"></button>\
																	<button class="micro3d" data-color="White" title="' + encodeQuotes(gettext("White")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/white.png"></button>\
																	<button class="micro3d" data-color="Blue" title="' + encodeQuotes(gettext("Blue")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/blue.png"></button>\
																	<button class="micro3d" data-color="Green" title="' + encodeQuotes(gettext("Green")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/green.png"></button>\
																	<button class="micro3d" data-color="Orange" title="' + encodeQuotes(gettext("Orange")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/orange.png"></button>\
																	<button class="micro3d" data-color="Clear" title="' + encodeQuotes(gettext("Clear")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/clear.png"></button>\
																	<button class="micro3d" data-color="Silver" title="' + encodeQuotes(gettext("Silver")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/silver.png"></button>\
																	<button class="micro3d" data-color="Purple" title="' + encodeQuotes(gettext("Purple")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/purple.png"></button>\
																</div>\
																<div class="filament">\
																	<button data-color="White" title="' + encodeQuotes(gettext("White")) + '"><span style="background-color: #F4F3E9;"></span><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/filament.png"></button>\
																	<button data-color="Pink" title="' + encodeQuotes(gettext("Pink")) + '"><span style="background-color: #FF006B;"></span><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/filament.png"></button>\
																	<button data-color="Red" title="' + encodeQuotes(gettext("Red")) + '"><span style="background-color: #EE0000;"></span><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/filament.png"></button>\
																	<button data-color="Orange" title="' + encodeQuotes(gettext("Orange")) + '"><span style="background-color: #FE9800;"></span><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/filament.png"></button>\
																	<button data-color="Yellow" title="' + encodeQuotes(gettext("Yellow")) + '"><span style="background-color: #FFEA00;"></span><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/filament.png"></button>\
																	<button data-color="Green" title="' + encodeQuotes(gettext("Green")) + '"><span style="background-color: #009E60;"></span><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/filament.png"></button>\
																	<button data-color="Light Blue" title="' + encodeQuotes(gettext("Light Blue")) + '"><span style="background-color: #00EEEE;"></span><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/filament.png"></button>\
																	<button data-color="Blue" title="' + encodeQuotes(gettext("Blue")) + '"><span style="background-color: #236B8E;"></span><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/filament.png"></button>\
																	<button data-color="Purple" title="' + encodeQuotes(gettext("Purple")) + '"><span style="background-color: #9A009A;"></span><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/filament.png"></button>\
																	<button data-color="Black" title="' + encodeQuotes(gettext("Black")) + '"><span style="background-color: #404040;"></span><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/filament.png"></button>\
																</div>\
																<div class="model">\
																	<input type="file" accept=".stl, .obj, .m3d, .amf, .wrl, .dae, .3mf">\
																	<button class="import" title="' + encodeQuotes(gettext("Import")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/import.png"></button>\
																	<button class="translate disabled" title="' + encodeQuotes(gettext("Translate")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/translate.png"></button>\
																	<button class="rotate" title="' + encodeQuotes(gettext("Rotate")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/rotate.png"></button>\
																	<button class="scale" title="' + encodeQuotes(gettext("Scale")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/scale.png"></button>\
																	<button class="snap" title="' + encodeQuotes(gettext("Snap")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/snap.png"></button>\
																	<button class="delete disabled" title="' + encodeQuotes(gettext("Delete")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/delete.png"></button>\
																	<button class="clone disabled" title="' + encodeQuotes(gettext("Clone")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/clone.png"></button>\
																	<button class="reset disabled" title="' + encodeQuotes(gettext("Reset")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/reset.png"></button>\
																	<button class="cut" title="' + encodeQuotes(gettext("Cut")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/cut.png"></button>\
																	<button class="merge" title="' + encodeQuotes(gettext("Merge")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/merge.png"></button>\
																</div>\
																<div class="display">\
																	<button class="axes' + (modelEditor.showAxes ? " disabled" : '') + '" title="' + encodeQuotes(gettext("Axes")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/axes.png"></button>\
																	<button class="boundaries' + (modelEditor.showBoundaries ? " disabled" : '') + '" title="' + encodeQuotes(gettext("Boundaries")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/boundaries.png"></button>\
																	<button class="measurements' + (modelEditor.showMeasurements ? " disabled" : '') + '" title="' + encodeQuotes(gettext("Measurements")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/measurements.png"></button>\
																	<button class="grid' + (modelEditor.showGrid ? " disabled" : '') + ' printerModel" title="' + encodeQuotes(gettext("Grid")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/grid.png"></button>\
																</div>\
																<div class="values translate">\
																	<div>\
																		<p><span class="axis x">X</span><input type="number" step="any" name="x"><span></span></p>\
																		<p><span class="axis y">Y</span><input type="number" step="any" name="y"><span></span></p>\
																		<p><span class="axis z">Z</span><input type="number" step="any" name="z"><span></span></p>\
																		<span></span>\
																	</div>\
																</div>\
																<div class="cutShape">\
																	<div>\
																		<button class="cube disabled" title="' + encodeQuotes(gettext("Cube")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/cube.png"></button>\
																		<button class="sphere" title="' + encodeQuotes(gettext("Sphere")) + '"><img src="' + PLUGIN_BASEURL + 'm33fio/static/img/sphere.png"></button>\
																		<span></span>\
																	</div>\
																</div>\
																<div class="measurements">\
																	<p class="width"></p>\
																	<p class="depth"></p>\
																	<p class="height"></p>\
																</div>\
															');

															$("#slicing_configuration_dialog .modal-extra div.printer button[data-color=\"" + modelEditorPrinterColor + "\"]").addClass("disabled");
															$("#slicing_configuration_dialog .modal-extra div.filament button[data-color=\"" + modelEditorFilamentColor + "\"]").addClass("disabled");
															$("#slicing_configuration_dialog .modal-extra").append(modelEditor.renderer.domElement);
															
															// Hide Micro 3D specific features
															if(self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter())
																$("#slicing_configuration_dialog .modal-extra .micro3d").addClass("notUsingAMicro3DPrinter");
															
															// Hide features that require having a printer model
															if(modelEditor.printerModel === null)
																$("#slicing_configuration_dialog .modal-extra .printerModel").addClass("noPrinterModel");
															
															// Image drag event
															$("#slicing_configuration_dialog .modal-extra img").on("dragstart", function(event) {

																// Prevent default
																event.preventDefault();
															});
															
															// Import model from file
															function importModelFromFile(file) {
															
																// Set file type
																var extension = typeof file !== "undefined" ? file.name.lastIndexOf('.') : -1;
																var type = extension != -1 ? file.name.substr(extension + 1).toLowerCase() : "";
																var url = URL.createObjectURL(file);
																
																// Clear value
																$("#slicing_configuration_dialog .modal-extra input[type=\"file\"]").val('');
																
																// Check if file has the correct extension
																if(type == "stl" || type == "obj" || type == "m3d" || type == "amf" || type == "wrl" || type == "dae" || type == "3mf") {

																	// Display cover
																	$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").html(gettext("Loading model…"));

																	setTimeout(function() {

																		// Import model
																		modelEditor.importModel(url, type);

																		// Wait until model is loaded
																		function isModelLoaded() {

																			// Check if model is loaded
																			if(modelEditor.modelLoaded) {

																				// Hide cover
																				$("#slicing_configuration_dialog .modal-cover").removeClass("show");
																				setTimeout(function() {
																					$("#slicing_configuration_dialog .modal-cover").css("z-index", '');
																				}, 200);
																			}

																			// Otherwise
																			else

																				// Check if model is loaded again
																				setTimeout(isModelLoaded, 100);
																		}
																		isModelLoaded();
																	}, 600);
																}
															}

															// Input change event
															$("#slicing_configuration_dialog .modal-extra input[type=\"file\"]").change(function() {
																
																// Check if not cutting models
																if(modelEditor.cutShape === null)
																
																	// Import model from file
																	importModelFromFile(this.files[0]);
																
																// Clear value
																$(this).val('');
															});

															// Button click event
															$("#slicing_configuration_dialog .modal-extra button").click(function() {

																// Blur self
																$(this).blur();
															});

															// Import model button click event
															$("#slicing_configuration_dialog .modal-extra button.import").click(function() {

																// Show file dialog box
																$("#slicing_configuration_dialog .modal-extra input[type=\"file\"]").click();
															});

															// Translate button click event
															$("#slicing_configuration_dialog .modal-extra button.translate").click(function(event) {

																// Set selection mode to translate
																modelEditor.setMode("translate");
															});

															// Rotate button click event
															$("#slicing_configuration_dialog .modal-extra button.rotate").click(function() {

																// Set selection mode to rotate
																modelEditor.setMode("rotate");
															});

															// Scale button click event
															$("#slicing_configuration_dialog .modal-extra button.scale").click(function() {

																// Set selection mode to scale
																modelEditor.setMode("scale");
															});

															// Snap button click event
															$("#slicing_configuration_dialog .modal-extra button.snap").click(function() {

																// Check if snap controls are currently enabled
																if(modelEditor.transformControls.translationSnap)

																	// Disable grid and rotation snap
																	modelEditor.disableSnap();

																// Otherwise
																else

																	// Enable grid and rotation snap
																	modelEditor.enableSnap();
															});

															// Delete button click event
															$("#slicing_configuration_dialog .modal-extra button.delete").click(function() {

																// Delete model
																modelEditor.deleteModel();
															});

															// Clone button click event
															$("#slicing_configuration_dialog .modal-extra button.clone").click(function() {

																// Display cover
																$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").html(gettext("Cloning model…"));

																setTimeout(function() {

																	// Clone model
																	modelEditor.cloneModel();

																	// Wait until model is loaded
																	function isModelLoaded() {

																		// Check if model is loaded
																		if(modelEditor.modelLoaded) {

																			// Hide cover
																			$("#slicing_configuration_dialog .modal-cover").removeClass("show");
																			setTimeout(function() {
																				$("#slicing_configuration_dialog .modal-cover").css("z-index", '');
																			}, 200);
																		}

																		// Otherwise
																		else

																			// Check if model is loaded again
																			setTimeout(isModelLoaded, 100);
																	}
																	isModelLoaded();
																}, 600);
															});

															// Reset button click event
															$("#slicing_configuration_dialog .modal-extra button.reset").click(function() {

																// Reset model
																modelEditor.resetModel();
															});
															
															// Axes button click event
															$("#slicing_configuration_dialog .modal-extra button.axes").click(function() {

																// Set show axes
																modelEditor.showAxes = !modelEditor.showAxes;
																
																// Save model editor show axes
																localStorage.modelEditorShowAxes = modelEditor.showAxes;

																// Go through all axes
																for(var i = 0; i < modelEditor.axes.length; i++)
																
																	// Toggle visibility
																	modelEditor.axes[i].visible = modelEditor.showAxes;

																// Select button
																if(modelEditor.showAxes)
																	$(this).addClass("disabled");
																else
																	$(this).removeClass("disabled");

																// Render
																modelEditor.render();
															});

															// Boundaries button click event
															$("#slicing_configuration_dialog .modal-extra button.boundaries").click(function() {

																// Set show boundaries
																modelEditor.showBoundaries = !modelEditor.showBoundaries;
																
																// Save model editor show boundaries
																localStorage.modelEditorShowBoundaries = modelEditor.showBoundaries;

																// Go through all boundaries
																for(var i = 0; i < modelEditor.boundaries.length; i++)

																	// Check if boundary isn't set
																	if(modelEditor.boundaries[i].material.color.getHex() != 0xFF0000)

																		// Toggle visibility
																		modelEditor.boundaries[i].visible = modelEditor.showBoundaries;

																// Select button
																if(modelEditor.showBoundaries)
																	$(this).addClass("disabled");
																else
																	$(this).removeClass("disabled");

																// Render
																modelEditor.render();
															});

															// Measurements button click event
															$("#slicing_configuration_dialog .modal-extra button.measurements").click(function() {

																// Set show measurements
																modelEditor.showMeasurements = !modelEditor.showMeasurements;
																
																// Save model editor show measurements
																localStorage.modelEditorShowMeasurements = modelEditor.showMeasurements;

																// Check if a model is currently selected
																if(modelEditor.transformControls.object) {

																	// Go through all measurements
																	for(var i = 0; i < modelEditor.measurements.length; i++)

																		// Toggle visibility
																		modelEditor.measurements[i][0].visible = modelEditor.showMeasurements;

																	if(modelEditor.showMeasurements)
																		$("div.measurements > p").addClass("show");
																	else
																		$("div.measurements > p").removeClass("show");

																	// Update model changes
																	modelEditor.updateModelChanges();

																	// Render
																	modelEditor.render();
																}

																// Select button
																if(modelEditor.showMeasurements)
																	$(this).addClass("disabled");
																else
																	$(this).removeClass("disabled");
															});
															
															// Grid button click event
															$("#slicing_configuration_dialog .modal-extra button.grid").click(function() {

																// Set show grid
																modelEditor.showGrid = !modelEditor.showGrid;
																
																// Save model editor show grid
																localStorage.modelEditorShowGrid = modelEditor.showGrid;

																// Toggle visibility
																modelEditor.grid.visible = modelEditor.showGrid;

																// Select button
																if(modelEditor.showGrid)
																	$(this).addClass("disabled");
																else
																	$(this).removeClass("disabled");
																
																// Render
																modelEditor.render();
															});

															// Cut button click event
															$("#slicing_configuration_dialog .modal-extra button.cut").click(function() {

																// Check if not cutting models
																if(modelEditor.cutShape === null) {

																	// Select button
																	$(this).addClass("disabled");

																	// Disable import and clone buttons
																	$("#slicing_configuration_dialog .modal-extra button.import, #slicing_configuration_dialog .modal-extra button.clone").prop("disabled", true);
												
																	// Show cut shape options
																	$("#slicing_configuration_dialog .modal-extra div.cutShape").addClass("show");
												
																	// Create cut shape geometry
																	if($("#slicing_configuration_dialog .modal-extra div.cutShape > div > button.disabled").hasClass("cube"))
																		var cutShapeGeometry = new THREE.CubeGeometry(50, 50, 50);
																	else if($("#slicing_configuration_dialog .modal-extra div.cutShape > div > button.disabled").hasClass("sphere"))
																		var cutShapeGeometry = new THREE.SphereGeometry(25, 10, 10);
												
																	// Create cut shape
																	modelEditor.cutShape = new THREE.Mesh(cutShapeGeometry, new THREE.MeshBasicMaterial({
																		color: 0xCCCCCC,
																		transparent: true,
																		opacity: 0.1,
																		side: THREE.DoubleSide,
																		depthWrite: false
																	}));
																	modelEditor.cutShape.position.set(0, (bedHighMaxZ - bedLowMinZ) / 2 + externalBedHeight, 0);
																	modelEditor.cutShape.rotation.set(0, 0, 0);
												
																	// Create cut shape outline
																	modelEditor.cutShapeOutline = new THREE.LineSegments(modelEditor.lineGeometry(cutShapeGeometry), new THREE.LineDashedMaterial({
																		color: 0xFFAA00,
																		dashSize: 3,
																		gapSize: 1,
																		linewidth: 2
																	}));
												
																	// Add cut shape and outline to scene
																	modelEditor.scene[0].add(modelEditor.cutShape);
																	modelEditor.scene[0].add(modelEditor.cutShapeOutline);

																	// Select cut shape
																	modelEditor.removeSelection();
																	modelEditor.transformControls.setAllowedTranslation("XYZ");
																	modelEditor.transformControls.attach(modelEditor.cutShape);

																	// Update model changes
																	modelEditor.updateModelChanges();

																	// Render
																	modelEditor.render();
																}

																// Otherwise
																else
											
																	// Apply cut
																	modelEditor.applyCut();
															});
										
															// Cut shape click event
															$("#slicing_configuration_dialog .modal-extra div.cutShape button").click(function() {
											
																// Check if button is cube
																if($(this).hasClass("cube"))
		
																	// Change cut shape to a sube
																	modelEditor.setCutShape("cube");
											
																// Otherwise check if button is sphere
																else if($(this).hasClass("sphere"))
		
																	// Change cut shape to a sphere
																	modelEditor.setCutShape("sphere");
															});

															// Merge button click event
															$("#slicing_configuration_dialog .modal-extra button.merge").click(function() {

																// Apply merge
																modelEditor.applyMerge();
															});

															// Printer color button click event
															$("#slicing_configuration_dialog .modal-extra div.printer button").click(function() {
															
																// Set model editor printer color
																modelEditorPrinterColor = $(this).data("color");
																
																// Save model editor printer color
																localStorage.modelEditorPrinterColor = modelEditorPrinterColor;

																// Set printer color
																modelEditor.models[0].mesh.material = printerMaterials[modelEditorPrinterColor];
																$(this).addClass("disabled").siblings(".disabled").removeClass("disabled");

																// Render
																modelEditor.render();
															});

															// Filament color button click event
															$("#slicing_configuration_dialog .modal-extra div.filament button").click(function() {
														
																// Set model editor filament color
																modelEditorFilamentColor = $(this).data("color");
																
																// Save model editor filament color
																localStorage.modelEditorFilamentColor = modelEditorFilamentColor;

																// Go through all models
																for(var i = 1; i < modelEditor.models.length; i++)

																	// Check if model isn't currently selected
																	if(modelEditor.models[i].glow === null) {

																		// Set model's color
																		modelEditor.models[i].mesh.material = filamentMaterials[modelEditorFilamentColor];
																		
																		// Set adhesion's color
																		if(modelEditor.models[i].adhesion !== null)
																			modelEditor.models[i].adhesion.mesh.material = filamentMaterials[modelEditorFilamentColor];
																	}

																// Select button
																$(this).addClass("disabled").siblings(".disabled").removeClass("disabled");

																// Render
																modelEditor.render();
															});

															// Value change event
															$("#slicing_configuration_dialog .modal-extra div.values input").change(function() {

																// Blur self
																$(this).blur();

																// Check if value is a number
																if(!isNaN(parseFloat($(this).val()))) {

																	// Fix value
																	$(this).val(parseFloat($(this).val()).toFixed(3));
																	
																	// Check if changing scale and value is less than zero
																	if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("scale") && $(this).val() < 0)
																	
																		// Set value to zero
																		$(this).val(0);

																	// Apply changes
																	modelEditor.applyChanges($(this).attr("name"), $(this).val());
																}

																// Otherwise
																else

																	// Update model changes
																	modelEditor.updateModelChanges();
															});

															// Value change event
															$("#slicing_configuration_dialog .modal-extra div.values input").keyup(function() {

																// Check if value is a number
																if(!isNaN(parseFloat($(this).val()))) {
																
																	// Check if changing scale
																	if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("scale")) {
																	
																		// Go through all inputs
																		for(var i = 0; i < 3; i++)
																		
																			// Check if not current input and is locked
																			if(!$(this).is($("#slicing_configuration_dialog .modal-extra div.values input").eq(i)) && modelEditor.scaleLock[i])
																			
																				// Match input value
																				$("#slicing_configuration_dialog .modal-extra div.values input").eq(i).val($(this).val());
																		
																		// Check if value is less than zero
																		if($(this).val() < 0)
																		
																			// Return
																			return;	
																	}
																	
																	// Apply changes
																	modelEditor.applyChanges($(this).attr("name"), $(this).val());
																}
															});
															
															// Initialize drag leave counter
															var dragLeaveCounter = 0;
															
															// Slicing configuration dialog drop event
															$("#slicing_configuration_dialog").off("drop dragenter dragleave").on("drop", function(event) {
															
																// Prevent default
																event.preventDefault();
																
																// Clear drag leave counter
																dragLeaveCounter = 0;
																
																// Check if importing model is applicable
																if($("#slicing_configuration_dialog .modal-drag-and-drop").hasClass("show")) {
																
																	// Hide drag and drop cover
																	$("#slicing_configuration_dialog .modal-drag-and-drop").removeClass("show");
															
																	// Import model from file
																	importModelFromFile(event.originalEvent.dataTransfer.files[0]);
																}
															
															// Slicing configuration dialog drag enter event
															}).on("dragenter", function(event) {
															
																// Prevent default
																event.preventDefault();
																
																// Increment drag leave counter
																dragLeaveCounter++;
																
																// Check if not cutting models
																if(modelEditor.cutShape === null)
															
																	// Show drag and drop cover if cover isn't showing
																	if(!$("#slicing_configuration_dialog .modal-cover").hasClass("show"))
																		$("#slicing_configuration_dialog .modal-drag-and-drop").addClass("show");
															
															// Slicing configuration dialog drag leave event
															}).on("dragleave", function(event) {
												
																// Prevent default
																event.preventDefault();
													
																// Decrement drag leave counter
																if(dragLeaveCounter > 0)
																	dragLeaveCounter--;
												
																// Hide drag and drop cover if not dragging anymore
																if(dragLeaveCounter === 0)
																	$("#slicing_configuration_dialog .modal-drag-and-drop").removeClass("show");
															});

															// Update model changes
															modelEditor.updateModelChanges();

															// Set slicer menu
															slicerMenu = "Modify Model";

															// Set button
															button.html(gettext("Slice")).removeClass("disabled");

															// Resize window
															$(window).resize();
														}, 200);
													}

													// Otherwise
													else

														// Check if model is loaded again
														setTimeout(isModelLoaded, 100);
												}
												isModelLoaded();
											}
										}
					
										xhr.open("GET", BASEURL + "downloads/files/" + modelLocation + modelPath + modelName);
										xhr.responseType = "blob";
										xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
										xhr.setRequestHeader("X-Api-Key", UI_API_KEY);
										xhr.send();
									}, 600);
								}
							}
							
							// Otherwise
							else {
							
								// Clear skip model editor
								skipModelEditor = false;
							
								// Show message
								showMessage(gettext("Slicer Status"), gettext("Profile is invalid"), gettext("OK"), function() {
								
									// Enable button
									button.removeClass("disabled");
				
									// Hide message
									hideMessage();
								});
							}
						});
					}
					
					// Otherwise check if on modify model menu
					else if(slicerMenu == "Modify Model") {
					
						// Check if WebGL isn't supported, model editor is being skipped, or scene isn't empty
						if(!Detector.webgl || skipModelEditor || modelEditor.models.length > 1) {
					
							// Apply changes
							function applyChanges() {
						
								// Display cover
								$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").html(gettext("Applying changes…"));
						
								setTimeout(function() {
								
									// Set parameter
									var parameter = [];
								
									// Check if WebGL is supported and not skipping model editor
									if(Detector.webgl && !skipModelEditor) {
								
										// Export scene as an STL
										var scene = modelEditor.exportScene();
								
										// Append parameters
										parameter.push({
											name: "Model Name",
											value: modelName
										},
										{
											name: "Model Location",
											value: modelLocation
										},
										{
											name: "Model Path",
											value: modelPath
										});
									}
							
									// Append parameters
									parameter.push({
										name: "Slicer Name",
										value: slicerName
									},
									{
										name: "Slicer Profile Name",
										value: slicerProfileName
									},
									{
										name: "Slicer Profile Content",
										value: slicerProfileContent
									},
									{
										name: "Printer Profile Name",
										value: printerProfileName
									},
									{
										name: "After Slicing Action",
										value: self.printerState.isErrorOrClosed() === true ? "none" : afterSlicingAction
									});
								
									// Send request
									$.ajax({
										url: PLUGIN_BASEURL + "m33fio/upload",
										type: "POST",
										dataType: "json",
										data: $.param(parameter),
										contentType: "application/x-www-form-urlencoded; charset=UTF-8",
										traditional: true,
										processData: true

									// Done
									}).done(function() {
									
										// Check if WebGL is supported and not skipping model editor
										if(Detector.webgl && !skipModelEditor) {
							
											// Create request
											var form = new FormData();
											if(typeof self.files.currentPath === "undefined")
												form.append("file", scene, modelPath.substr(1) + modelName);
											else
												form.append("file", scene, modelPath + modelName);
											
											// Prevent updating files
											preventUpdatingFiles = true;
			
											// Send request
											$.ajax({
												url: API_BASEURL + "files/" + modelLocation,
												type: "POST",
												dataType: "json",
												data: form,
												contentType: false,
												traditional: false,
												processData: false

											// Done
											}).done(function() {
									
												// Set slicer menu to done
												slicerMenu = "Done";
												
												// Clear after slicing action if printer isn't connected
												if(self.printerState.isErrorOrClosed() === true)
													self.slicing.afterSlicing("none");
								
												// Slice file
												button.removeClass("disabled").click();
											});
										}
									
										// Otherwise
										else {
										
											// Check if using a Micro 3D printer
											if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
											
												// Set bed dimensions
												bedLowMaxX = 106.0;
												bedLowMinX = -2.0;
												bedLowMaxY = 105.0;
												bedMediumMinY = -9.0;
												bedLowMinY = self.settings.settings.plugins.m33fio.ExpandPrintableRegion() ? bedMediumMinY : -2.0;

												// Set extruder center
												extruderCenterX = (bedLowMaxX + bedLowMinX) / 2;
												extruderCenterY = (bedLowMaxY + bedLowMinY + 14.0) / 2;
											
												// Set model center
												self.modelCenter = [((bedLowMaxX - bedLowMinX) + (-(extruderCenterX - (bedLowMaxX + bedLowMinX) / 2) + bedLowMinX) * 2) / 2, ((bedLowMaxY - bedLowMinY) + (extruderCenterY - (bedLowMaxY + bedLowMinY) / 2 + bedLowMinY) * 2) / 2];
											}
											
											// Otherwise
											else
											
												// Reset model center
												self.modelCenter = [null, null];
									
											// Set slicer menu to done
											slicerMenu = "Done";
											
											// Clear after slicing action if printer isn't connected
											if(self.printerState.isErrorOrClosed() === true)
												self.slicing.afterSlicing("none");
							
											// Slice file
											button.removeClass("disabled").click();
										}
									});
								}, 600);
							}
							
							// Check if printing after slicing, a printer is connected, and using a Micro 3D printer
							if(afterSlicingAction == "print" && self.printerState.isErrorOrClosed() !== true && !self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
								
								// Check if using on the fly pre-processing and changing settings before print
								if(self.settings.settings.plugins.m33fio.PreprocessOnTheFly() && self.settings.settings.plugins.m33fio.ChangeSettingsBeforePrint()) {

									// Show message
									showMessage(gettext("Printing Status"), '', gettext("Print"), function() {

										// Hide message
										hideMessage();

										// Send request
										$.ajax({
											url: API_BASEURL + "plugin/m33fio",
											type: "POST",
											dataType: "json",
											data: JSON.stringify({
												command: "message",
												value: "Print Settings: " + JSON.stringify({
													filamentTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(),
													heatbedTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(),
													filamentType: $("body > div.page-container > div.message > div > div > div.printSettings select").val(),
													useWaveBondingPreprocessor: $("body > div.page-container > div.message > div > div > div.printSettings input[type=\"checkbox\"]").is(":checked")
												})
											}),
											contentType: "application/json; charset=UTF-8",
											traditional: true,
											processData: true
				
										// Done
										}).done(function() {

											// Slice file
											function sliceFile() {
						
												// Save software settings
												if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") == -1)
													self.settings.saveData();
							
												// Send request
												$.ajax({
													url: API_BASEURL + "plugin/m33fio",
													type: "POST",
													dataType: "json",
													data: JSON.stringify({
														command: "message",
														value: "Starting Print"
													}),
													contentType: "application/json; charset=UTF-8",
													traditional: true,
													processData: true
				
												// Done
												}).done(function() {
			
													// Apply changes
													applyChanges();
												});
											}
					
											// Update settings
											if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
												self.settings.requestData(sliceFile);
											else
												self.settings.requestData().done(sliceFile);
										});
									}, gettext("Cancel"), function() {

										// Hide message
										hideMessage();
										
										// Clear skip model editor
										skipModelEditor = false;
										
										// Set slicer menu back to modifying profile if it's currently there
										if($("#slicing_configuration_dialog").hasClass("profile"))
											slicerMenu = "Modify Profile";
								
										// Enable button
										button.removeClass("disabled");
									});
								}
							
								// Otherwise
								else {
							
									// Send request
									$.ajax({
										url: API_BASEURL + "plugin/m33fio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({
											command: "message",
											value: "Starting Print"
										}),
										contentType: "application/json; charset=UTF-8",
										traditional: true,
										processData: true
		
									// Done
									}).done(function() {
			
										// Apply changes
										applyChanges();
									});
								}
							}

							// Otherwise
							else

								// Apply changes
								applyChanges();
						}
						
						// Otherwise
						else {
						
							// Show message
							showMessage(gettext("Slicer Status"), gettext("Scene is invalid"), gettext("OK"), function() {
							
								// Enable button
								button.removeClass("disabled");
			
								// Hide message
								hideMessage();
							});
						}
					}
				}
			}
			
			// Otherwise
			else
			
				// Stop default behavior
				event.stopImmediatePropagation();
		});
		
		// Key down when editing profile event
		$(document).on("keydown", "#slicing_configuration_dialog .modal-extra textarea", function(event) {
		
			// Check if tab is pressed
			if(event.which === "\t".charCodeAt(0)) {
	
				// Prevent default action
				event.preventDefault();
		
				// Insert tab
				document.execCommand("insertText", false, "\t");
			}
		});
		
		// Lock/unlock scale mousedown
		$(document).on("mousedown", "#slicing_configuration_dialog.model .modal-extra > div.values.scale > div > p > span:not(.axis)", function(event) {
			
			// Stop default behavior
			event.stopImmediatePropagation();
			
			// Check if locking
			if($(this).text() == '\uF13E') {
			
				// Update image and title
				$(this).text('\uF023').attr("title", htmlDecode(gettext("Unlock")));
				
				// Update scale lock
				for(var i = 0; i < 3; i++)
					if($(this).is($("#slicing_configuration_dialog .modal-extra div.values p span:not(.axis)").eq(i))) {
						modelEditor.scaleLock[i] = true;
						break;
					}
			}
			
			// Otherwise assume unlocking
			else {
			
				// Update image and title
				$(this).text('\uF13E').attr("title", htmlDecode(gettext("Lock")));
				
				// Update scale lock
				for(var i = 0; i < 3; i++)
					if($(this).is($("#slicing_configuration_dialog .modal-extra div.values p span:not(.axis)").eq(i))) {
						modelEditor.scaleLock[i] = false;
						break;
					}
			}
		});
		
		// Message distance buttons click event
		$("body > div.page-container > div.message").find("button.distance").click(function() {
		
			// Set active button
			$(this).siblings().removeClass("active");
			$(this).addClass("active");
		});
		
		// Message arrow buttons click event
		$("body > div.page-container > div.message").find("button.arrow").click(function() {
			
			// Set commands
			var commands = [
				"G91",
				"G0 Z" + ($(this).hasClass("down") ? '-' : '') + $("body > div.page-container > div.message").find("button.distance.active").data("distance") + " F90"
			];
			
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
		
		// Terminal send command key up event
		$("#terminal-command").keyup(function(event) {
		
			// Check if key is enter
			if(event.which === "\r".charCodeAt(0)) {
			
				// Send command
				sendCommand(event);
				
				// Refocus on input
				$(this).blur().focus();
			}
		});
		
		// Terminal send command click event
		$("#terminal-send").click(function(event) {
		
			// Send command
			sendCommand(event);
			
			// Blur self
			$(this).blur();
		});
		
		// Send command
		function sendCommand(event) {
		
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
		
				// Check if command is reserved
				if($("#terminal-command").val().trim()[0] == 'M' && parseInt($("#terminal-command").val().trim().substr(1)) > 65535) {
				
					// Stop default behavior
					event.stopImmediatePropagation();
			
					// Display message
					showMessage(gettext("Command Status"), gettext("Can't manually send reserved commands"), gettext("OK"), function() {
		
						// Hide message
						hideMessage();
					});
				}
			
				// Otherwise check if printing
				else if(self.printerState.isPrinting() === true) {
		
					// Stop default behavior
					event.stopImmediatePropagation();
			
					// Set commands
					var commands = [
						$("#terminal-command").val().trim() + '*'
					];
		
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: commands
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
			
					// Clear value
					$("#terminal-command").val('');
				}
			}
		}
		
		// Override X increment control
		$("#control #control-xinc").attr("title", htmlDecode(gettext("Increases extruder's X position by the specified amount"))).click(function(event) {
	
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
				
				// Set distance
				var distance = $("#control #jog_distance > button.active").attr("id").substr(16);
				if(distance[0] == '0')
					distance = "0." + distance.substr(1);
		
				// Set commands
				var commands = [
					"G91",
					"G0 X" + distance + " F3000"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
	
		// Override X decrement control
		$("#control #control-xdec").attr("title", htmlDecode(gettext("Decreases extruder's X position by the specified amount"))).click(function(event) {
	
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
				
				// Set distance
				var distance = $("#control #jog_distance > button.active").attr("id").substr(16);
				if(distance[0] == '0')
					distance = "0." + distance.substr(1);
		
				// Set commands
				var commands = [
					"G91",
					"G0 X-" + distance + " F3000"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
	
		// Override Y increment control
		$("#control #control-yinc").attr("title", htmlDecode(gettext("Increases extruder's Y position by the specified amount"))).click(function(event) {
		
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
				
				// Set distance
				var distance = $("#control #jog_distance > button.active").attr("id").substr(16);
				if(distance[0] == '0')
					distance = "0." + distance.substr(1);
		
				// Set commands
				var commands = [
					"G91",
					"G0 Y" + distance + " F3000"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
	
		// Override Y decrement control
		$("#control #control-ydec").attr("title", htmlDecode(gettext("Decreases extruder's Y position by the specified amount"))).click(function(event) {
			
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
				
				// Set distance
				var distance = $("#control #jog_distance > button.active").attr("id").substr(16);
				if(distance[0] == '0')
					distance = "0." + distance.substr(1);
		
				// Set commands
				var commands = [
					"G91",
					"G0 Y-" + distance + " F3000"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
	
		// Override Z increment control
		$("#control #control-zinc").attr("title", htmlDecode(gettext("Increases extruder's Z position by the specified amount"))).click(function(event) {
		
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
				
				// Set distance
				var distance = $("#control #jog_distance > button.active").attr("id").substr(16);
				if(distance[0] == '0')
					distance = "0." + distance.substr(1);
		
				// Set commands
				var commands = [
					"G91",
					"G0 Z" + distance + " F90"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
	
		// Override Z decrement control
		$("#control #control-zdec").attr("title", htmlDecode(gettext("Decreases extruder's Z position by the specified amount"))).click(function(event) {
		
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
				
				// Set distance
				var distance = $("#control #jog_distance > button.active").attr("id").substr(16);
				if(distance[0] == '0')
					distance = "0." + distance.substr(1);
		
				// Set commands
				var commands = [
					"G91",
					"G0 Z-" + distance + " F90"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
	
		// Override X Y home control
		$("#control #control-xyhome").attr("title", htmlDecode(gettext("Set extruder's X position to 54 and Y position to 50"))).click(function(event) {
		
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
			
				// Set commands
				var commands = [
					"M114",
					"G4"
				];
			
				// Set location callback
				locationCallback = function() {
			
					// Check if extruder is too high to successfully home
					if(currentZ >= bedMediumMaxZ - parseFloat(self.settings.settings.plugins.m33fio.ExternalBedHeight()))
				
						// Show message
						showMessage(gettext("Movement Status"), gettext("Extruder is too high to home without running into the printer's frame"), gettext("OK"), function() {
					
							// Hide message
							hideMessage();
						});
				
					// Otherwise
					else {
		
						// Set commands
						var commands = [
							"G90",
							"G28"
						];
		
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: commands
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}
				}
						
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
	
		// Override Z home control
		$("#control #control-zhome").attr("title", htmlDecode(gettext("Set extruder's Z position to 5"))).click(function(event) {
			
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
		
				// Set commands
				var commands = [
					"G90",
					"G0 Z5 F90"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
	
		// Override extrude control
		$("#control > div.jog-panel.extruder > div > button:first-of-type").attr("title", htmlDecode(gettext("Extrudes the specified amount of filament"))).click(function(event) {
		
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
		
				// Set commands
				var commands = [
					"G91",
					"G0 E" + ($("#control > div.jog-panel.extruder > div > div:nth-of-type(2) > input").val().length ? $("#control > div.jog-panel.extruder > div > div:nth-of-type(2) > input").val() : '5' ) + " F345"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
	
		// Override retract control
		$("#control > div.jog-panel.extruder > div > button:nth-of-type(2)").attr("title", htmlDecode(gettext("Retracts the specified amount of filament"))).click(function(event) {
		
			// Check if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
			
				// Stop default behavior
				event.stopImmediatePropagation();
		
				// Set commands
				var commands = [
					"G91",
					"G0 E-" + ($("#control > div.jog-panel.extruder > div > div:nth-of-type(2) > input").val().length ? $("#control > div.jog-panel.extruder > div > div:nth-of-type(2) > input").val() : '5' ) + " F345"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
		});
	
		// Set extruder temperature control
		$("#control > div.jog-panel.extruder > div > button:nth-of-type(4)").attr("title", htmlDecode(gettext("Sets extruder's temperature to the specified amount"))).click(function() {
			
			// Check if not printing
			if(self.printerState.isPrinting() !== true) {
				
				// Set commands
				var commands = [
					"M109 S" + parseInt($(this).children("span").text()),
					"M65536;wait"
				];
			
				// Show message
				showMessage(gettext("Temperature Status"), gettext("Warming up"));
			
				// Display temperature
				var updateTemperature = setInterval(function() {
				
					// Show message
					if(self.temperature.temperatures.tool0.actual.length) {
				
						var temperature = self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1];
					
						if(temperature != 0)
							showMessage(gettext("Temperature Status"), gettext("Warming up") + ": " + temperature + "°C");
					}
				}, 1000);
				
				// Set waiting callback
				waitingCallback = function() {
				
					// Stop displaying temperature
					clearInterval(updateTemperature);
				
					// Show message
					showMessage(gettext("Temperature Status"), gettext("Done"), gettext("OK"), function() {
				
						// Hide message
						hideMessage();
					});
				}
			}
			
			// Otherwise
			else
			
				// Set commands
				var commands = [
					"M104 S" + parseInt($(this).children("span").text()) + '*'
				];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
		
		// Set heatbed temperature control
		$("#control > div.jog-panel.extruder").find("div > div.heatbed > button:first-of-type").attr("title", htmlDecode(gettext("Sets heatbed's temperature to the specified amount"))).click(function() {
			
			// Check if not printing
			if(self.printerState.isPrinting() !== true) {
			
				// Set commands
				var commands = [
					"M190 S" + parseInt($(this).children("span").text()),
					"M65536;wait"
				];
			
				// Show message
				showMessage(gettext("Temperature Status"), gettext("Warming up"));
			
				// Display temperature
				var updateTemperature = setInterval(function() {
				
					// Show message
					if(self.temperature.temperatures.bed.actual.length) {
					
						var temperature = self.temperature.temperatures.bed.actual[self.temperature.temperatures.bed.actual.length - 1][1];
					
						if(temperature != 0)
							showMessage(gettext("Temperature Status"), gettext("Warming up") + ": " + temperature + "°C");
					}		
				}, 1000);
				
				// Set waiting callback
				waitingCallback = function() {
				
					// Stop displaying temperature
					clearInterval(updateTemperature);
				
					// Show message
					showMessage(gettext("Temperature Status"), gettext("Done"), gettext("OK"), function() {
				
						// Hide message
						hideMessage();
					});
				}
			}
			
			// Otherwise
			else
			
				// Set commands
				var commands = [
					"M140 S" + parseInt($(this).children("span").text()) + '*'
				];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
		
		// Fan on control
		$("#control > div.jog-panel.general").find("button:nth-of-type(3)").attr("title", htmlDecode(gettext("Turns on extruder's fan"))).click(function() {
			
			// Set commands
			var commands = [
				"M106 S255" + (!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter() ? '*' : '')
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
		
		// Fan off control
		$("#control > div.jog-panel.general").find("button:nth-of-type(4)").attr("title", htmlDecode(gettext("Turns off extruder's fan"))).click(function() {
			
			// Set commands
			var commands = [
				"M107" + (!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter() ? '*' : '')
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
		
		// LED on control
		$("#control > div.jog-panel.general").find("button:nth-of-type(5)").attr("title", htmlDecode(gettext("Turns on front LED"))).click(function() {
			
			// Set commands
			var commands = [
				"M420 T" + (printerColor == "Clear" ? "20" : "100") + '*'
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
		
		// Print settings control
		$("#control > div.jog-panel.general").find("button:nth-of-type(11)").attr("title", htmlDecode(gettext("Opens print settings"))).click(function() {
		
			// Open M33 Fio settings
			$("#navbar_show_settings").click();
			$("#settings_plugin_m33fio").addClass("active").siblings(".active").removeClass("active");
			$("#settings_plugin_m33fio_link").addClass("active").siblings(".active").removeClass("active");
		});
		
		// Emergency stop control
		$("#control > div.jog-panel.general").find("button:nth-of-type(12)").attr("title", htmlDecode(gettext("Stops current operation"))).click(function() {
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: "Emergency Stop"
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
	
		// Set unload filament control
		$("#control > div.jog-panel.filament").find("div > button:nth-of-type(1)").attr("title", htmlDecode(gettext("Unloads filament"))).click(function() {
		
			// Show message
			showMessage(gettext("Filament Status"), '', gettext("Unload"), function() {
		
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Filament Status"), gettext("Positioning extruder"));
				
				// Set commands
				var commands = [
					"G90",
					"G0 Z15 F90",
					"G28",
					"M65536;wait"
				];
				
				// Set waiting callback
				waitingCallback = function() {
				
					// Unload filament
					function unloadFilament() {
			
						// Show message
						showMessage(gettext("Filament Status"), gettext("Warming up"));
		
						// Set commands
						var commands = [
							"M106",
							"M109 S" + parseInt($("body > div.page-container > div.message > div > div > div.filamentSettings input").eq(0).val()),
							"M65536;wait"
						];
			
						// Display temperature
						var updateTemperature = setInterval(function() {
			
							// Show message
							if(self.temperature.temperatures.tool0.actual.length) {
				
								var temperature = self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1];
					
								if(temperature != 0)
									showMessage(gettext("Filament Status"), gettext("Warming up") + ": " + temperature + "°C");
							}
						}, 1000);
			
						// Set waiting callback
						waitingCallback = function() {
			
							// Stop displaying temperature
							clearInterval(updateTemperature);
		
							// Show message
							showMessage(gettext("Filament Status"), gettext("Remove filament"));
	
							// Set commands
							commands = [
								"G90",
								"G92 E0"
							];
		
							for(var i = 2; i <= 50; i += 2)
								commands.push("G0 E-" + i + " F345");
				
							commands.push("M65536;wait");
				
							// Set waiting callback
							waitingCallback = function() {
				
								// Show message
								showMessage(gettext("Filament Status"), gettext("Was filament removed?"), gettext("Yes"), function() {
		
									// Hide message
									hideMessage();
						
									// Set commands
									commands = [
										"M18",
										"M104 S0",
										"M107",
									];
						
									// Send request
									$.ajax({
										url: API_BASEURL + "plugin/m33fio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({
											command: "message",
											value: commands
										}),
										contentType: "application/json; charset=UTF-8",
										traditional: true,
										processData: true
									});
						
								}, gettext("No"), function() {
					
									// Hide message
									hideMessage();
					
									// Unload filament again
									unloadFilament();
								});
							}
		
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: commands
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
							});
						}
			
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: commands
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}
					unloadFilament();
				}
				
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("Cancel"), function() {
			
				// Hide message
				hideMessage();
			});
		});
	
		// Set load filament control
		$("#control > div.jog-panel.filament").find("div > button:nth-of-type(2)").attr("title", htmlDecode(gettext("Loads filament"))).click(function() {
			
			// Show message
			showMessage(gettext("Filament Status"), '', gettext("Load"), function() {
		
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Filament Status"), gettext("Positioning extruder"));
				
				// Set commands
				var commands = [
					"G90",
					"G0 Z15 F90",
					"G28",
					"M65536;wait"
				];
				
				// Set waiting callback
				waitingCallback = function() {
				
					// Load filament
					function loadFilament() {
			
						// Show message
						showMessage(gettext("Filament Status"), gettext("Warming up"));
		
						// Set commands
						var commands = [
							"M106",
							"M109 S" + parseInt($("body > div.page-container > div.message > div > div > div.filamentSettings input").eq(0).val()),
							"M65536;wait"
						];
			
						// Display temperature
						var updateTemperature = setInterval(function() {
			
							// Show message
							if(self.temperature.temperatures.tool0.actual.length) {
			
								var temperature = self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1];
				
								if(temperature != 0)
									showMessage(gettext("Filament Status"), gettext("Warming up") + ": " + temperature + "°C");
							}
						}, 1000);
			
						// Set waiting callback
						waitingCallback = function() {
			
							// Stop displaying temperature
							clearInterval(updateTemperature);
	
							// Show message
							showMessage(gettext("Filament Status"), gettext("Insert filament"));
	
							// Set commands
							commands = [
								"G90",
								"G92 E0"
							];
		
							for(var i = 2; i <= 50; i += 2)
								commands.push("G0 E" + i + " F345");
				
							commands.push("M65536;wait");
				
							// Set waiting callback
							waitingCallback = function() {
				
								// Show message
								showMessage(gettext("Filament Status"), gettext("Was filament inserted?"), gettext("Yes"), function() {
				
									// Hide message
									hideMessage();
						
									// Set commands
									commands = [
										"M18",
										"M104 S0",
										"M107"
									];
						
									// Send request
									$.ajax({
										url: API_BASEURL + "plugin/m33fio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({
											command: "message",
											value: commands
										}),
										contentType: "application/json; charset=UTF-8",
										traditional: true,
										processData: true
									});
								}, gettext("No"), function() {
				
									// Hide message
									hideMessage();
				
									// Load filament again
									loadFilament();
								});
							}
		
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: commands
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
							});
						}
		
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: commands
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}
					loadFilament();
				}
				
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("Cancel"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set mid-print change filament control
		$("#control > div.jog-panel.filament").find("div > button:nth-of-type(3)").attr("title", htmlDecode(gettext("Changes filament during a print"))).click(function() {
		
			// Show message
			showMessage(gettext("Filament Status"), gettext("Starting mid-print filament change"));
			
			// Set commands
			var commands = [
				"M600"
			];
			
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
		
		// Set calibrate bed center Z0 control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(1)").attr("title", htmlDecode(gettext("Automatically calibrates the bed's center's Z0"))).click(function() {
		
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This process can take a while to complete. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Calibration Status"), gettext("Calibrating bed center Z0"));
				
				// Set commands
				var commands = [
					"M618 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"] + " P" + floatToBinary(0),
					"M619 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"],
					"M65536;wait"
				];
	
				// Set waiting callback
				waitingCallback = function() {
		
					// Set commands
					commands = [
						"G91",
						"G0 Z3 F90",
						"G90",
						"M109 S150",
						"M104 S0",
						"M107",
						"G30",
						"M65536;wait"
					];
			
					// Set waiting callback
					waitingCallback = function() {
			
						// Set commands
						commands = [
							"M117",
							"M65536;wait"
						];
				
						// Set waiting callback
						waitingCallback = function() {
			
							// Save settings
							function saveSettings() {
			
								// Save software settings
								self.settings.saveData();
				
								// Show message
								showMessage(gettext("Calibration Status"), gettext("Done"), gettext("OK"), function() {
			
									// Hide message
									hideMessage();
								});
							}
		
							// Update settings
							if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
								self.settings.requestData(saveSettings);
							else
								self.settings.requestData().done(saveSettings);
						}
				
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: commands
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}
		
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: commands
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				}
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
	
		// Set calibrate bed orientation control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(2)").attr("title", htmlDecode(gettext("Automatically calibrates the bed's orientation"))).click(function() {
			
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This process can take a while to complete. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Calibration Status"), gettext("Calibrating bed orientation"));
				
				// Set commands
				var commands = [
					"G90",
					"G0 Z3 F90",
					"M65536;wait"
				];
				
				// Set waiting callback
				waitingCallback = function() {
				
					// Set commands
					commands = [
						"M618 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"] + " P" + floatToBinary(0),
						"M619 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"],
						"M618 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"] + " P" + floatToBinary(0),
						"M619 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"],
						"M618 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"] + " P" + floatToBinary(0),
						"M619 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"],
						"M618 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"] + " P" + floatToBinary(0),
						"M619 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"],
						"M618 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"] + " P" + floatToBinary(0),
						"M619 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"],
						"M65536;wait"
					];
				
					// Set waiting callback
					waitingCallback = function() {
		
						// Set commands
						commands = [
							"M109 S150",
							"M104 S0",
							"M107",
							"G32",
							"M65536;wait"
						];
			
						// Set waiting callback
						waitingCallback = function() {
			
							// Set commands
							commands = [
								"M619 S" + eepromOffsets["bedOrientationBackRight"]["offset"] + " T" + eepromOffsets["bedOrientationBackRight"]["bytes"],
								"M619 S" + eepromOffsets["bedOrientationBackLeft"]["offset"] + " T" + eepromOffsets["bedOrientationBackLeft"]["bytes"],
								"M619 S" + eepromOffsets["bedOrientationFrontLeft"]["offset"] + " T" + eepromOffsets["bedOrientationFrontLeft"]["bytes"],
								"M619 S" + eepromOffsets["bedOrientationFrontRight"]["offset"] + " T" + eepromOffsets["bedOrientationFrontRight"]["bytes"],
								"M65536;wait"
							];
			
							// Set waiting callback
							waitingCallback = function() {
			
								// Save settings
								function saveSettings() {
				
									// Save software settings
									self.settings.saveData();
					
									// Show message
									showMessage(gettext("Calibration Status"), gettext("Done"), gettext("OK"), function() {
				
										// Hide message
										hideMessage();
									});
								}
			
								// Update settings
								if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
									self.settings.requestData(saveSettings);
								else
									self.settings.requestData().done(saveSettings);
							}
				
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: commands
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
							});
						}
		
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: commands
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}
		
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: commands
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				}
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
	
		// Set go to front left
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(3)").attr("title", htmlDecode(gettext("Positions extruder above the bed's front left corner"))).click(function() {
		
			// Set commands
			var commands = [
				"G90",
				"G0 Z3 F90",
				"G28",
				"G0 X9 Y5 Z3 F3000"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
	
		// Set go to front right
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(6)").attr("title", htmlDecode(gettext("Positions extruder above the bed's front right corner"))).click(function() {
		
			// Set commands
			var commands = [
				"G90",
				"G0 Z3 F90",
				"G28",
				"G0 X99 Y5 Z3 F3000"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
	
		// Set go to back right
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(9)").attr("title", htmlDecode(gettext("Positions extruder above the bed's back right corner"))).click(function() {
		
			// Set commands
			var commands = [
				"G90",
				"G0 Z3 F90",
				"G28",
				"G0 X99 Y95 Z3 F3000"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
	
		// Set go to back left
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(12)").attr("title", htmlDecode(gettext("Positions extruder above the bed's back left corner"))).click(function() {
		
			// Set commands
			var commands = [
				"G90",
				"G0 Z3 F90",
				"G28",
				"G0 X9 Y95 Z3 F3000"
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
		
		// Set go to front left Z0
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(4)").attr("title", htmlDecode(gettext("Vertically positions the extruder to be at the bed's front left corner's Z0"))).click(function() {
		
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This will vertically position the extruder to be at the bed's front left corner's Z0. The extruder can dig into the bed if the front left corner isn't correctly calibrated. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Set commands
				var commands = [
					"G90",
					"G0 Z" + (currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (parseFloat(self.settings.settings.plugins.m33fio.FrontLeftOrientation()) + parseFloat(self.settings.settings.plugins.m33fio.FrontLeftOffset())) : 0) + " F90"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set go to front right Z0
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(7)").attr("title", htmlDecode(gettext("Vertically positions the extruder to be at the bed's front right corner's Z0"))).click(function() {
		
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This will vertically position the extruder to be at the bed's front right corner's Z0. The extruder can dig into the bed if the front right corner isn't correctly calibrated. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Set commands
				var commands = [
					"G90",
					"G0 Z" + (currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (parseFloat(self.settings.settings.plugins.m33fio.FrontRightOrientation()) + parseFloat(self.settings.settings.plugins.m33fio.FrontRightOffset())) : 0) + " F90"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set go to back right Z0
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(10)").attr("title", htmlDecode(gettext("Vertically positions the extruder to be at the bed's back right corner's Z0"))).click(function() {
		
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This will vertically position the extruder to be at the bed's back right corner's Z0. The extruder can dig into the bed if the back right corner isn't correctly calibrated. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Set commands
				var commands = [
					"G90",
					"G0 Z" + (currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (parseFloat(self.settings.settings.plugins.m33fio.BackRightOrientation()) + parseFloat(self.settings.settings.plugins.m33fio.BackRightOffset())) : 0) + " F90"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set go to back left Z0
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(13)").attr("title", htmlDecode(gettext("Vertically positions the extruder to be at the bed's back left corner's Z0"))).click(function() {
		
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This will vertically position the extruder to be at the bed's back left corner's Z0. The extruder can dig into the bed if the back left corner isn't correctly calibrated. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Set commands
				var commands = [
					"G90",
					"G0 Z" + (currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (parseFloat(self.settings.settings.plugins.m33fio.BackLeftOrientation()) + parseFloat(self.settings.settings.plugins.m33fio.BackLeftOffset())) : 0) + " F90"
				];
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
	
		// Set save Z as front left Z0 control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(5)").attr("title", htmlDecode(gettext("Saves the extruder's current Z value as the bed's front left corner's Z0"))).click(function() {
			
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This will overwrite the existing front left offset. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Calibration Status"), gettext("Saving Z as front left Z0"));
			
				// Set commands
				var commands = [
					"M114",
					"G4"
				];
				
				// Set location callback
				locationCallback = function() {
				
					// Set commands
					commands = [
						"M618 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"] + " P" + floatToBinary(currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (currentZ - parseFloat(self.settings.settings.plugins.m33fio.FrontLeftOrientation())) : (currentZ + parseFloat(self.settings.settings.plugins.m33fio.FrontLeftOffset()))),
						"M619 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"],
						"M65536;wait"
					];
			
					// Set waiting callback
					waitingCallback = function() {
			
						// Save settings
						function saveSettings() {
			
							// Save software settings
							self.settings.saveData();
				
							// Show message
							showMessage(gettext("Calibration Status"), gettext("Done"), gettext("OK"), function() {
			
								// Hide message
								hideMessage();
							});
						}
		
						// Update settings
						if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
							self.settings.requestData(saveSettings);
						else
							self.settings.requestData().done(saveSettings);
					}
		
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: commands
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				}
						
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
	
		// Set save Z as front right Z0 control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(8)").attr("title", htmlDecode(gettext("Saves the extruder's current Z value as the bed's front right corner's Z0"))).click(function() {
			
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This will overwrite the existing front right offset. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Calibration Status"), gettext("Saving Z as front right Z0"));
		
				// Set commands
				var commands = [
					"M114",
					"G4"
				];
				
				// Set location callback
				locationCallback = function() {
			
					// Set commands
					commands = [
						"M618 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"] + " P" + floatToBinary(currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (currentZ - parseFloat(self.settings.settings.plugins.m33fio.FrontRightOrientation())) : (currentZ + parseFloat(self.settings.settings.plugins.m33fio.FrontRightOffset()))),
						"M619 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"],
						"M65536;wait"
					];
			
					// Set waiting callback
					waitingCallback = function() {
			
						// Save settings
						function saveSettings() {
			
							// Save software settings
							self.settings.saveData();
				
							// Show message
							showMessage(gettext("Calibration Status"), gettext("Done"), gettext("OK"), function() {
			
								// Hide message
								hideMessage();
							});
						}
		
						// Update settings
						if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
							self.settings.requestData(saveSettings);
						else
							self.settings.requestData().done(saveSettings);
					}
		
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: commands
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				}
				
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
	
		// Set save Z as back right Z0 control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(11)").attr("title", htmlDecode(gettext("Saves the extruder's current Z value as the bed's back right corner's Z0"))).click(function() {
			
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This will overwrite the existing back right offset. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Calibration Status"), gettext("Saving Z as back right Z0"));
		
				// Set commands
				var commands = [
					"M114",
					"G4"
				];
				
				// Set location callback
				locationCallback = function() {
			
					// Set commands
					commands = [
						"M618 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"] + " P" + floatToBinary(currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (currentZ - parseFloat(self.settings.settings.plugins.m33fio.BackRightOrientation())) : (currentZ + parseFloat(self.settings.settings.plugins.m33fio.BackRightOffset()))),
						"M619 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"],
						"M65536;wait"
					];
			
					// Set waiting callback
					waitingCallback = function() {
			
						// Save settings
						function saveSettings() {
			
							// Save software settings
							self.settings.saveData();
				
							// Show message
							showMessage(gettext("Calibration Status"), gettext("Done"), gettext("OK"), function() {
			
								// Hide message
								hideMessage();
							});
						}
		
						// Update settings
						if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
							self.settings.requestData(saveSettings);
						else
							self.settings.requestData().done(saveSettings);
					}
		
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: commands
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				}
				
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
	
		// Set save Z as back left Z0 control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(14)").attr("title", htmlDecode(gettext("Saves the extruder's current Z value as the bed's back left corner's Z0"))).click(function() {
			
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This will overwrite the existing back left offset. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Calibration Status"), gettext("Saving Z as back left Z0"));
		
				// Set commands
				var commands = [
					"M114",
					"G4"
				];
				
				// Set location callback
				locationCallback = function() {
			
					// Set commands
					commands = [
						"M618 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"] + " P" + floatToBinary(currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (currentZ - parseFloat(self.settings.settings.plugins.m33fio.BackLeftOrientation())) : (currentZ + parseFloat(self.settings.settings.plugins.m33fio.BackLeftOffset()))),
						"M619 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"],
						"M65536;wait"
					];
			
					// Set waiting callback
					waitingCallback = function() {
			
						// Save settings
						function saveSettings() {
			
							// Save software settings
							self.settings.saveData();
				
							// Show message
							showMessage(gettext("Calibration Status"), gettext("Done"), gettext("OK"), function() {
			
								// Hide message
								hideMessage();
							});
						}
		
						// Update settings
						if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
							self.settings.requestData(saveSettings);
						else
							self.settings.requestData().done(saveSettings);
					}
		
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: commands
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				}
				
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set save Z as bed center Z0 control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(15)").attr("title", htmlDecode(gettext("Saves the extruder's current Z value as the bed center's Z0"))).click(function() {
			
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This will overwrite the existing bed center calibration. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Calibration Status"), gettext("Saving Z as bed center Z0"));
				
				// Set commands
				var commands = [
					"M618 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"] + " P" + floatToBinary(0),
					"M619 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"],
					"M65536;wait"
				];
	
				// Set waiting callback
				waitingCallback = function() {
			
					// Set commands
					commands = currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? [
						"G91",
						"G0 Z0.1 F90"
					] : [];
				
					commands.push("G33");
					commands.push("M65536;wait");
			
					// Set waiting callback
					waitingCallback = function() {
			
						// Set commands
						commands = [
							"M117",
							"M65536;wait"
						];
				
						// Set waiting callback
						waitingCallback = function() {
			
							// Save settings
							function saveSettings() {
			
								// Save software settings
								self.settings.saveData();
				
								// Show message
								showMessage(gettext("Calibration Status"), gettext("Done"), gettext("OK"), function() {
			
									// Hide message
									hideMessage();
								});
							}
		
							// Update settings
							if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
								self.settings.requestData(saveSettings);
							else
								self.settings.requestData().done(saveSettings);
						}
				
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: commands
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}
			
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: commands
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				}
			
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set save Z as external bed height control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(16)").attr("title", htmlDecode(gettext("Saves the extruder's current Z value as the external bed's height"))).click(function() {
			
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This will overwrite the existing external bed height. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Calibration Status"), gettext("Saving Z as external bed height"));
		
				// Set commands
				var commands = [
					"M114",
					"G4"
				];
				
				// Set location callback
				locationCallback = function() {
			
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Set External Bed Height: " + currentZ
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
						
					// Done
					}).done(function() {
						
						// Show message
						showMessage(gettext("Calibration Status"), gettext("Done"), gettext("OK"), function() {
		
							// Hide message
							hideMessage();
							
							// Update settings
							self.settings.requestData();
						});
					});
				}
				
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set print test border control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(17)").attr("title", htmlDecode(gettext("Prints 0.4mm test border"))).click(function() {
		
			// Show message
			showMessage(gettext("Calibration Status"), gettext("It's recommended to print this test border after completely calibrating the bed to ensure that the calibration is accurate. The test border should print as a solid, even extruded border") + "<img src=\"" + PLUGIN_BASEURL + "m33fio/static/img/test-border-good.png\">" + gettext("The 'Back Left Offset', 'Back Right Offset', 'Front Right Offset', and 'Front Left Offset' values can be adjusted to correct any issues with it. If the test border contains squiggly ripples, then it is too high.") + "<img src=\"" + PLUGIN_BASEURL + "m33fio/static/img/test-border-high.png\">" + gettext("If the test border contains missing gaps, then it is too low.") + "<img src=\"" + PLUGIN_BASEURL + "m33fio/static/img/test-border-low.png\">" + gettext("It's also recommended to print a model with a raft after this is done to see if the 'Bed Height Offset' value needs to be adjusted. If the raft does not securely stick to the bed, then it is too high. If the model isn't easily removed from the raft, then it is too low.<br><br>All the referenced values can be found by clicking the 'Print settings' button in the 'General' section. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Check if using on the fly pre-processing and changing settings before print
				if(self.settings.settings.plugins.m33fio.PreprocessOnTheFly() && self.settings.settings.plugins.m33fio.ChangeSettingsBeforePrint()) {
				
					// Show message
					showMessage(gettext("Printing Status"), '', gettext("Print"), function() {
			
						// Hide message
						hideMessage();
				
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Print Settings: " + JSON.stringify({
									filamentTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(),
									heatbedTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(),
									filamentType: $("body > div.page-container > div.message > div > div > div.printSettings select").val(),
									useWaveBondingPreprocessor: $("body > div.page-container > div.message > div > div > div.printSettings input[type=\"checkbox\"]").is(":checked")
								})
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
					
						// Done
						}).done(function() {
					
							// Print file
							function printFile() {
						
								// Save software settings
								self.settings.saveData();
							
								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m33fio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({
										command: "message",
										value: "Print Test Border"
									}),
									contentType: "application/json; charset=UTF-8",
									traditional: true,
									processData: true
								});
							}
					
							// Update settings
							if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
								self.settings.requestData(printFile);
							else
								self.settings.requestData().done(printFile);
						});
					}, gettext("Cancel"), function() {
			
						// Hide message
						hideMessage();
					});
				}
				
				// Otherwise
				else
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Print Test Border"
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set print backlash calibration control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(18)").attr("title", htmlDecode(gettext("Prints a specified backlash calibration"))).click(function() {
		
			// Show message
			showMessage(gettext("Calibration Status"), gettext("It's recommended to print the backlash calibration prints after the print bed has been accurately calibrated. Make sure to set the 'Backlash X' and 'Backlash Y' values to 0 before printing a backlash calibration print which will print the model without any backlash compensation applied to it. The X backlash calibration prints and Y backlash calibration prints each assist in determining the X and Y backlash respecitvley.<br><br>The backlash values can be detemined by finding the sample with the highest possible value that doesn't curve.") + "<img src=\"" + PLUGIN_BASEURL + "m33fio/static/img/backlash.png\">" + gettext("If none of the samples curve when using the 0.0‑0.99 prints then use the 0.70‑1.69 prints. For more information check out <a target=\"_blank\" href=\"http://www.thingiverse.com/thing:1435828\">Muele's quick backlash calibration method</a>.<br><br>All the referenced values can be found by clicking the 'Print settings' button in the 'General' section.<br><br>Choose a backlash calibration print to continue.") + "<span class=\"backlash\"><button class=\"btn btn-block\">X 0.0‑0.99</button><button class=\"btn btn-block\">X 0.70‑1.69</button><button class=\"btn btn-block\">Y 0.0‑0.99</button><button class=\"btn btn-block\">Y 0.70‑1.69</button></span>", gettext("Cancel"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Backlash calibration print click event
		$(document).on("click", "body > div.page-container > div.message > div > div > p span.backlash > button", function() {
		
			// Hide message
			hideMessage();
			
			// Set command
			var command;
			switch($(this).index()) {
			
				case 0:
					command = "Print Backlash Calibration X 0.0-0.99";
				break;
				
				case 1:
					command = "Print Backlash Calibration X 0.70-1.69";
				break;
				
				case 2:
					command = "Print Backlash Calibration Y 0.0-0.99";
				break;
				
				case 3:
					command = "Print Backlash Calibration Y 0.70-1.69";
				break;
			}
			
			// Check if using on the fly pre-processing and changing settings before print
			if(self.settings.settings.plugins.m33fio.PreprocessOnTheFly() && self.settings.settings.plugins.m33fio.ChangeSettingsBeforePrint()) {
			
				// Show message
				showMessage(gettext("Printing Status"), '', gettext("Print"), function() {
		
					// Hide message
					hideMessage();
			
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Print Settings: " + JSON.stringify({
								filamentTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(),
								heatbedTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(),
								filamentType: $("body > div.page-container > div.message > div > div > div.printSettings select").val(),
								useWaveBondingPreprocessor: $("body > div.page-container > div.message > div > div > div.printSettings input[type=\"checkbox\"]").is(":checked")
							})
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
				
					// Done
					}).done(function() {
				
						// Print file
						function printFile() {
					
							// Save software settings
							self.settings.saveData();
						
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: command
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
							});
						}
				
						// Update settings
						if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
							self.settings.requestData(printFile);
						else
							self.settings.requestData().done(printFile);
					});
				}, gettext("Cancel"), function() {
		
					// Hide message
					hideMessage();
				});
			}
			
			// Otherwise
			else
			
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: command
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
		});
		
		// Run complete bed calibration control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(19)").attr("title", htmlDecode(gettext("Manually calibrates an external bed's height, automatically calibrates the bed's center's Z0, automatically calibrates the bed's orientation, and manually calibrates the Z0 values for the bed's four corners"))).click(function() {
		
			// Continue calibration
			function continueCalibration() {
				
				// Show message
				showMessage(gettext("Calibration Status"), gettext("Calibrating bed center Z0"));
				
				// Set commands
				var commands = [
					"M618 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"] + " P" + floatToBinary(0),
					"M619 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"],
					"M65536;wait"
				];
	
				// Set waiting callback
				waitingCallback = function() {
		
					// Set commands
					commands = [
						"G91",
						"G0 Z3 F90",
						"G90",
						"M109 S150",
						"M104 S0",
						"M107",
						"G30",
						"M65536;wait"
					];
				
					// Set waiting callback
					waitingCallback = function() {
				
						// Set commands
						commands = [
							"M117",
							"M65536;wait"
						];
				
						// Set waiting callback
						waitingCallback = function() {
				
							// Show message
							showMessage(gettext("Calibration Status"), gettext("Calibrating bed orientation"));
						
							// Set commands
							commands = [
								"G90",
								"G0 Z3 F90",
								"M65536;wait"
							];
						
							// Set waiting callback
							waitingCallback = function() {
						
								// Set commands
								commands = [
									"M618 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"] + " P" + floatToBinary(0),
									"M619 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"],
									"M618 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"] + " P" + floatToBinary(0),
									"M619 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"],
									"M618 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"] + " P" + floatToBinary(0),
									"M619 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"],
									"M618 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"] + " P" + floatToBinary(0),
									"M619 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"],
									"M618 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"] + " P" + floatToBinary(0),
									"M619 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"],
									"M65536;wait"
								];
						
								// Set waiting callback
								waitingCallback = function() {
	
									// Set commands
									commands = [
										"M109 S150",
										"M104 S0",
										"M107",
										"G32",
										"M65536;wait"
									];
					
									// Set waiting callback
									waitingCallback = function() {
					
										// Set commands
										commands = [
											"M619 S" + eepromOffsets["bedOrientationBackRight"]["offset"] + " T" + eepromOffsets["bedOrientationBackRight"]["bytes"],
											"M619 S" + eepromOffsets["bedOrientationBackLeft"]["offset"] + " T" + eepromOffsets["bedOrientationBackLeft"]["bytes"],
											"M619 S" + eepromOffsets["bedOrientationFrontLeft"]["offset"] + " T" + eepromOffsets["bedOrientationFrontLeft"]["bytes"],
											"M619 S" + eepromOffsets["bedOrientationFrontRight"]["offset"] + " T" + eepromOffsets["bedOrientationFrontRight"]["bytes"],
											"M65536;wait"
										];
			
										// Set waiting callback
										waitingCallback = function() {
					
											// Calibrate bed offsets
											function calibrateBedOffsets() {
				
												// Show message
												showMessage(gettext("Calibration Status"), gettext("Calibrating front left offset"));
	
												// Set commands
												commands = [
													"G90",
													"G0 Z3 F90",
													"G28",
													"G0 X9 Y5 Z3 F3000",
													"M65536;wait"
												];
						
												// Set waiting callback
												waitingCallback = function() {
						
													// Show message
													showMessage(gettext("Calibration Status"), gettext("Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved."), gettext("Done"), function() {

														// Hide message
														hideMessage();
								
														// Show message
														showMessage(gettext("Calibration Status"), gettext("Saving front left offset"));
								
														// Set commands
														commands = [
															"M114",
															"G4"
														];
			
														// Set location callback
														locationCallback = function() {
								
															// Set commands
															commands = [
																"M618 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"] + " P" + floatToBinary(currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (currentZ - parseFloat(self.settings.settings.plugins.m33fio.FrontLeftOrientation())) : (currentZ + parseFloat(self.settings.settings.plugins.m33fio.FrontLeftOffset()))),
																"M619 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"],
																"M65536;wait"
															];
								
															// Set waiting callback
															waitingCallback = function() {
								
																// Show message
																showMessage(gettext("Calibration Status"), gettext("Calibrating front right offset"));

																// Set commands
																commands = [
																	"G90",
																	"G0 Z3 F90",
																	"G28",
																	"G0 X99 Y5 Z3 F3000",
																	"M65536;wait"
																];
									
																// Set waiting callback
																waitingCallback = function() {
									
																	// Show message
																	showMessage(gettext("Calibration Status"), gettext("Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved."), gettext("Done"), function() {

																		// Hide message
																		hideMessage();
											
																		// Show message
																		showMessage(gettext("Calibration Status"), gettext("Saving front right offset"));
											
																		// Set commands
																		commands = [
																			"M114",
																			"G4"
																		];
		
																		// Set location callback
																		locationCallback = function() {
											
																			// Set commands
																			commands = [
																				"M618 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"] + " P" + floatToBinary(currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (currentZ - parseFloat(self.settings.settings.plugins.m33fio.FrontRightOrientation())) : (currentZ + parseFloat(self.settings.settings.plugins.m33fio.FrontRightOffset()))),
																				"M619 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"],
																				"M65536;wait"
																			];
											
																			// Set waiting callback
																			waitingCallback = function() {
											
																				// Show message
																				showMessage(gettext("Calibration Status"), gettext("Calibrating back right offset"));

																				// Set commands
																				commands = [
																					"G90",
																					"G0 Z3 F90",
																					"G28",
																					"G0 X99 Y95 Z3 F3000",
																					"M65536;wait"
																				];
												
																				// Set waiting callback
																				waitingCallback = function() {
												
																					// Show message
																					showMessage(gettext("Calibration Status"), gettext("Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved."), gettext("Done"), function() {

																						// Hide message
																						hideMessage();
														
																						// Show message
																						showMessage(gettext("Calibration Status"), gettext("Saving back right offset"));
														
																						// Set commands
																						commands = [
																							"M114",
																							"G4"
																						];
	
																						// Set location callback
																						locationCallback = function() {
													
																							// Set commands
																							commands = [
																								"M618 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"] + " P" + floatToBinary(currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (currentZ - parseFloat(self.settings.settings.plugins.m33fio.BackRightOrientation())) : (currentZ + parseFloat(self.settings.settings.plugins.m33fio.BackRightOffset()))),
																								"M619 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"],
																								"M65536;wait"
																							];
														
																							// Set waiting callback
																							waitingCallback = function() {
														
																								// Show message
																								showMessage(gettext("Calibration Status"), gettext("Calibrating back left offset"));

																								// Set commands
																								commands = [
																									"G90",
																									"G0 Z3 F90",
																									"G28",
																									"G0 X9 Y95 Z3 F3000",
																									"M65536;wait"
																								];
															
																								// Set waiting callback
																								waitingCallback = function() {
															
																									// Show message
																									showMessage(gettext("Calibration Status"), gettext("Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved."), gettext("Done"), function() {

																										// Hide message
																										hideMessage();
																	
																										// Show message
																										showMessage(gettext("Calibration Status"), gettext("Saving back left offset"));
																	
																										// Set commands
																										commands = [
																											"M114",
																											"G4"
																										];

																										// Set location callback
																										locationCallback = function() {
																	
																											// Set commands
																											commands = [
																												"M618 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"] + " P" + floatToBinary(currentFirmwareType === "M3D" || currentFirmwareType === "M3D Mod" ? (currentZ - parseFloat(self.settings.settings.plugins.m33fio.BackLeftOrientation())) : (currentZ + parseFloat(self.settings.settings.plugins.m33fio.BackLeftOffset()))),
																												"M619 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"],
																												"M65536;wait"
																											];
																	
																											// Set waiting callback
																											waitingCallback = function() {
																	
																												// Show message
																												showMessage(gettext("Calibration Status"), gettext("Finishing calibration"));
																
																												// Set commands
																												commands = [
																													"G90",
																													"G0 Z3 F90",
																													"G28",
																													"M18",
																													"M65536;wait"
																												];
																	
																												// Set waiting callback
																												waitingCallback = function() {
																	
																													// Save settings
																													function saveSettings() {

																														// Save software settings
																														self.settings.saveData();

																														// Show message
																														showMessage(gettext("Calibration Status"), gettext("Done"), gettext("OK"), function() {

																															// Hide message
																															hideMessage();
																														});
																													}

																													// Update settings
																													if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
																														self.settings.requestData(saveSettings);
																													else
																														self.settings.requestData().done(saveSettings);
																												}
																									
																												// Send request
																												$.ajax({
																													url: API_BASEURL + "plugin/m33fio",
																													type: "POST",
																													dataType: "json",
																													data: JSON.stringify({
																														command: "message",
																														value: commands
																													}),
																													contentType: "application/json; charset=UTF-8",
																													traditional: true,
																													processData: true
																												});
																											}

																											// Send request
																											$.ajax({
																												url: API_BASEURL + "plugin/m33fio",
																												type: "POST",
																												dataType: "json",
																												data: JSON.stringify({
																													command: "message",
																													value: commands
																												}),
																												contentType: "application/json; charset=UTF-8",
																												traditional: true,
																												processData: true
																											});
																										}
																							
																										// Send request
																										$.ajax({
																											url: API_BASEURL + "plugin/m33fio",
																											type: "POST",
																											dataType: "json",
																											data: JSON.stringify({
																												command: "message",
																												value: commands
																											}),
																											contentType: "application/json; charset=UTF-8",
																											traditional: true,
																											processData: true
																										});
																									});
																								}

																								// Send request
																								$.ajax({
																									url: API_BASEURL + "plugin/m33fio",
																									type: "POST",
																									dataType: "json",
																									data: JSON.stringify({
																										command: "message",
																										value: commands
																									}),
																									contentType: "application/json; charset=UTF-8",
																									traditional: true,
																									processData: true
																								});
																							}

																							// Send request
																							$.ajax({
																								url: API_BASEURL + "plugin/m33fio",
																								type: "POST",
																								dataType: "json",
																								data: JSON.stringify({
																									command: "message",
																									value: commands
																								}),
																								contentType: "application/json; charset=UTF-8",
																								traditional: true,
																								processData: true
																							});
																						}
																			
																						// Send request
																						$.ajax({
																							url: API_BASEURL + "plugin/m33fio",
																							type: "POST",
																							dataType: "json",
																							data: JSON.stringify({
																								command: "message",
																								value: commands
																							}),
																							contentType: "application/json; charset=UTF-8",
																							traditional: true,
																							processData: true
																						});
																					});
																				}

																				// Send request
																				$.ajax({
																					url: API_BASEURL + "plugin/m33fio",
																					type: "POST",
																					dataType: "json",
																					data: JSON.stringify({
																						command: "message",
																						value: commands
																					}),
																					contentType: "application/json; charset=UTF-8",
																					traditional: true,
																					processData: true
																				});
																			}

																			// Send request
																			$.ajax({
																				url: API_BASEURL + "plugin/m33fio",
																				type: "POST",
																				dataType: "json",
																				data: JSON.stringify({
																					command: "message",
																					value: commands
																				}),
																				contentType: "application/json; charset=UTF-8",
																				traditional: true,
																				processData: true
																			});
																		}
															
																		// Send request
																		$.ajax({
																			url: API_BASEURL + "plugin/m33fio",
																			type: "POST",
																			dataType: "json",
																			data: JSON.stringify({
																				command: "message",
																				value: commands
																			}),
																			contentType: "application/json; charset=UTF-8",
																			traditional: true,
																			processData: true
																		});
																	});
																}

																// Send request
																$.ajax({
																	url: API_BASEURL + "plugin/m33fio",
																	type: "POST",
																	dataType: "json",
																	data: JSON.stringify({
																		command: "message",
																		value: commands
																	}),
																	contentType: "application/json; charset=UTF-8",
																	traditional: true,
																	processData: true
																});
															}

															// Send request
															$.ajax({
																url: API_BASEURL + "plugin/m33fio",
																type: "POST",
																dataType: "json",
																data: JSON.stringify({
																	command: "message",
																	value: commands
																}),
																contentType: "application/json; charset=UTF-8",
																traditional: true,
																processData: true
															});
														}
											
														// Send request
														$.ajax({
															url: API_BASEURL + "plugin/m33fio",
															type: "POST",
															dataType: "json",
															data: JSON.stringify({
																command: "message",
																value: commands
															}),
															contentType: "application/json; charset=UTF-8",
															traditional: true,
															processData: true
														});
													});
												}

												// Send request
												$.ajax({
													url: API_BASEURL + "plugin/m33fio",
													type: "POST",
													dataType: "json",
													data: JSON.stringify({
														command: "message",
														value: commands
													}),
													contentType: "application/json; charset=UTF-8",
													traditional: true,
													processData: true
												});
											}
			
											// Update settings
											if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
												self.settings.requestData(calibrateBedOffsets);
											else
												self.settings.requestData().done(calibrateBedOffsets);
										}
						
										// Send request
										$.ajax({
											url: API_BASEURL + "plugin/m33fio",
											type: "POST",
											dataType: "json",
											data: JSON.stringify({
												command: "message",
												value: commands
											}),
											contentType: "application/json; charset=UTF-8",
											traditional: true,
											processData: true
										});
									}
						
									// Send request
									$.ajax({
										url: API_BASEURL + "plugin/m33fio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({
											command: "message",
											value: commands
										}),
										contentType: "application/json; charset=UTF-8",
										traditional: true,
										processData: true
									});
								}
						
								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m33fio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({
										command: "message",
										value: commands
									}),
									contentType: "application/json; charset=UTF-8",
									traditional: true,
									processData: true
								});
							}
						
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: commands
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
							});
						}
	
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: commands
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}
		
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: commands
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				}
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: commands
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				});
			}
			
			// Continue external bed calibration
			function continueExternalBedCalibration() {
			
				// Show message
				showMessage(gettext("Calibration Status"), gettext("Does the external bed extend the printable region to its max?"), gettext("Yes"), function() {

					// Hide message
					hideMessage();

					// Show message
					showMessage(gettext("Calibration Status"), gettext("Setting expand printable region"));
	
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Set Expand Printable Region: True"
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true

					// Done
					}).done(function() {
	
						// Continue calibration
						continueCalibration();
					});
				}, gettext("No"), function() {

					// Hide message
					hideMessage();

					// Show message
					showMessage(gettext("Calibration Status"), gettext("Clearing expand printable region"));
	
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Set Expand Printable Region: False"
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true

					// Done
					}).done(function() {
	
						// Continue calibration
						continueCalibration();
					});
				});
			}
			
			// Show message
			showMessage(gettext("Calibration Status"), gettext("This process can take a while to complete and will require your input during some steps. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Calibration Status"), gettext("Are you using an external bed, such as a heatbed or a sheet of glass?"), gettext("Yes"), function() {
				
					// Hide message
					hideMessage();
					
					// Show message
					showMessage(gettext("Calibration Status"), _.sprintf(gettext("Your external bed is currently set to be %(externalBedHeight)0.2fmm taller than the bed that came with the printer. If you wish to recalibrate the external bed height, please remove the external bed now, attached the bed that came with the printer, and click \"Next\". Click \"Cancel\" to change the setting manually. Or click \"Skip\" to leave the setting as it is."), {externalBedHeight: self.settings.settings.plugins.m33fio.ExternalBedHeight()}), gettext("Next"), function() {
		
						// Hide message
						hideMessage();
					
						// Show message
						showMessage(gettext("Calibration Status"), gettext("Calibrating bed center Z0"));
					
						// Set commands
						var commands = [
							"M618 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"] + " P" + floatToBinary(0),
							"M619 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"],
							"M65536;wait"
						];

						// Set waiting callback
						waitingCallback = function() {
	
							// Set commands
							commands = [
								"G91",
								"G0 Z3 F90",
								"G90",
								"M109 S150",
								"M104 S0",
								"M107",
								"G30",
								"M65536;wait"
							];
			
							// Set waiting callback
							waitingCallback = function() {
						
								// Set commands
								commands = [
									"M117",
									"M65536;wait"
								];
			
								// Set waiting callback
								waitingCallback = function() {
					
									// Show message
									showMessage(gettext("Calibration Status"), gettext("Now raise the print head so that you can attach the external bed, and then lower the print head until it barely touches the external bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved."), gettext("Done"), function() {

										// Hide message
										hideMessage();
		
										// Show message
										showMessage(gettext("Calibration Status"), gettext("Saving Z as external bed height"));

										// Set commands
										commands = [
											"M114",
											"G4"
										];
		
										// Set location callback
										locationCallback = function() {
	
											// Send request
											$.ajax({
												url: API_BASEURL + "plugin/m33fio",
												type: "POST",
												dataType: "json",
												data: JSON.stringify({
													command: "message",
													value: "Set External Bed Height: " + currentZ
												}),
												contentType: "application/json; charset=UTF-8",
												traditional: true,
												processData: true
				
											// Done
											}).done(function() {
				
												// Continue external bed calibration
												continueExternalBedCalibration();
											});
										}
		
										// Send request
										$.ajax({
											url: API_BASEURL + "plugin/m33fio",
											type: "POST",
											dataType: "json",
											data: JSON.stringify({
												command: "message",
												value: commands
											}),
											contentType: "application/json; charset=UTF-8",
											traditional: true,
											processData: true
										});
									});
								}
					
								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m33fio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({
										command: "message",
										value: commands
									}),
									contentType: "application/json; charset=UTF-8",
									traditional: true,
									processData: true
								});
							}
					
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: commands
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
							});
						}
					
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: commands
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}, gettext("Cancel"), function() {
		
						// Hide message
						hideMessage();
						
						// Show message
						showMessage(gettext("Calibration Status"), gettext("Enter the new external bed height") + '\
							<div class="input-append customInput">\
								<input type="number" step="0.000001" min="0" max="50" class="input-block-level externalBedHeight" value="' + self.settings.settings.plugins.m33fio.ExternalBedHeight() + '">\
								<span class="add-on">mm</span>\
							</div>\
						', gettext("Done"), function() {

							// Set external bed height
							var externalBedHeight = $("body > div.page-container > div.message .customInput input").val();
							
							// Hide message
							hideMessage();

							// Show message
							showMessage(gettext("Calibration Status"), gettext("Saving value as external bed height"));
							
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: "Set External Bed Height: " + externalBedHeight
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true

							// Done
							}).done(function() {

								// Continue external bed calibration
								continueExternalBedCalibration();
							});
						});
					}, gettext("Skip"), function() {
		
						// Hide message
						hideMessage();
						
						// Continue external bed calibration
						continueExternalBedCalibration();
					});
				}, gettext("No"), function() {
			
					// Hide message
					hideMessage();
					
					// Show message
					showMessage(gettext("Calibration Status"), gettext("Clearing external bed settings"));
					
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Set External Bed Height: 0"
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
						
					// Done
					}).done(function() {
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Set Expand Printable Region: False"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true

						// Done
						}).done(function() {
						
							// Continue calibration
							continueCalibration();
						});
					});
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Save printer settings to file calibration control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(20)").attr("title", htmlDecode(gettext("Saves printer settings to a file"))).click(function() {
			
			// Show message
			showMessage(gettext("Settings Status"), gettext("Obtaining printer settings"));
			
			setTimeout(function() {
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Get Printer Settings"
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true

				// Done
				}).done(function(data) {
				
					// Send request
					$.ajax({
						url: PLUGIN_BASEURL + data.path + '?' + Date.now(),
						type: "GET",
						dataType: "text",
						data: null,
						contentType: "application/x-www-form-urlencoded; charset=UTF-8",
						traditional: true,
						processData: true

					// Done
					}).done(function(data) {
					
						// Hide message
						hideMessage();
				
						// Download profile
						var blob = new Blob([data], {type: "text/plain"});
						saveFile(blob, "printer settings.yaml");
					});
				});
			}, 500);
		});
		
		// Restore printer settings from file calibration control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(21)").attr("title", htmlDecode(gettext("Restores printer settings from a file"))).click(function() {
		
			// Open file input dialog
			$("#control > div.jog-panel.calibration").find("div > input").click();
		});
		
		// Restore printer settings from file input change
		$("#control > div.jog-panel.calibration").find("div > input").change(function() {
		
			// Get file
			var file = this.files[0];
			
			// Clear input
			$(this).val('');
		
			// Check if file is valid
			if(typeof file !== "undefined") {
			
				// Show message
				showMessage(gettext("Settings Status"), gettext("Restoring printer settings"));
		
				setTimeout(function() {

					// On file load
					var reader = new FileReader();
					reader.onload = function(event) {

						// Convert array buffer to a binary string
						var binary = "";
						var bytes = new Uint8Array(event.target.result);
						var length = bytes.byteLength;

						for(var i = 0; i < length; i++) 
							binary += String.fromCharCode(bytes[i]);

						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Set Printer Settings:" + binary
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true

						// Done
						}).done(function(data) {

							// Show message
							showMessage(gettext("Settings Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {

								// Hide message
								hideMessage();
					
								// Update settings
								self.settings.requestData();
							});
						});
					}
					
					// Read in file
					reader.readAsArrayBuffer(file);
				}, 500);
			}
		});
		
		// Set HengLiXin fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(1)").attr("title", htmlDecode(gettext("Sets fan to HengLiXin fan"))).click(function() {
			
			// Show message
			showMessage(gettext("Fan Status"), gettext("This will overwrite the existing fan settings. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Fan Status"), gettext("Setting fan to HengLiXin"));
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Set Fan: HengLiXin"
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
			
				// Done
				}).done(function(data) {
				
					// Show message
					showMessage(gettext("Fan Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {
		
						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Reconnect To Printer"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					});
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
	
		// Set Listener fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(2)").attr("title", htmlDecode(gettext("Sets fan to Listener fan"))).click(function() {
			
			// Show message
			showMessage(gettext("Fan Status"), gettext("This will overwrite the existing fan settings. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Fan Status"), gettext("Setting fan to Listener"));
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Set Fan: Listener"
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
			
				// Done
				}).done(function(data) {
				
					// Show message
					showMessage(gettext("Fan Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {
		
						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Reconnect To Printer"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					});
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
	
		// Set Shenzhew fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(3)").attr("title", htmlDecode(gettext("Sets fan to Shenzhew fan"))).click(function() {
			
			// Show message
			showMessage(gettext("Fan Status"), gettext("This will overwrite the existing fan settings. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Fan Status"), gettext("Setting fan to Shenzhew"));
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Set Fan: Shenzhew"
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
			
				// Done
				}).done(function(data) {
			
					// Show message
					showMessage(gettext("Fan Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {
		
						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Reconnect To Printer"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					});
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set Xinyujie fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(4)").attr("title", htmlDecode(gettext("Sets fan to Xinyujie fan"))).click(function() {
			
			// Show message
			showMessage(gettext("Fan Status"), gettext("This will overwrite the existing fan settings. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Fan Status"), gettext("Setting fan to Xinyujie"));
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Set Fan: Xinyujie"
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
			
				// Done
				}).done(function(data) {
			
					// Show message
					showMessage(gettext("Fan Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {
		
						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Reconnect To Printer"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					});
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set custom fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(5)").attr("title", htmlDecode(gettext("Sets fan to a manually calibrated custom fan"))).click(function() {
			
			// Show message
			showMessage(gettext("Fan Status"), gettext("This will overwrite the existing fan settings. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Fan Status"), gettext("Setting fan to custom"));
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Set Fan: Custom"
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
			
				// Done
				}).done(function(data) {
					
					// Check if setting fan failed
					if(data.value != "OK")
					
						// Show message
						showMessage(gettext("Fan Status"), gettext("Failed"), gettext("OK"), function() {
	
							// Hide message
							hideMessage();
						});
					
					// Otherwise
					else {
				
						// Set connect callback
						connectCallback = function() {
						
							// Show message
							showMessage(gettext("Fan Status"), gettext("Increase this value until the fan starts spinning") + '\
								<div class="input-append ratio255 customInput">\
									<input type="number" step="1" min="0" max="255" class="input-block-level fanOffset" value="0">\
									<span class="add-on">/ 255</span>\
								</div>\
							', gettext("Done"), function() {

								// Set fan offset
								var fanOffset = $("body > div.page-container > div.message .customInput input").val();
								
								// Hide message
								hideMessage();
			
								// Show message
								showMessage(gettext("Fan Status"), gettext("Setting custom fan calibration"));
	
								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m33fio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({
										command: "message",
										value: "Set Fan Calibration: " + fanOffset
									}),
									contentType: "application/json; charset=UTF-8",
									traditional: true,
									processData: true
		
								// Done
								}).done(function(data) {
									
									// Show message
									showMessage(gettext("Fan Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {
	
										// Hide message
										hideMessage();
					
										// Send request
										$.ajax({
											url: API_BASEURL + "plugin/m33fio",
											type: "POST",
											dataType: "json",
											data: JSON.stringify({
												command: "message",
												value: "Reconnect To Printer"
											}),
											contentType: "application/json; charset=UTF-8",
											traditional: true,
											processData: true
										});
									});
								});
							});
						}
						
						// Set failed to connect callback
						failedToConnectCallback = function() {
						
							// Show message
							showMessage(gettext("Fan Status"), gettext("Failed"), gettext("OK"), function() {

								// Hide message
								hideMessage();
							});
						}
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Reconnect To Printer"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Custom fan calibration change event
		$(document).on("change", "body > div.page-container > div.message .customInput input.fanOffset", function() {
		
			// Set commands
			var commands = [
				"M106 S" + $(this).val()
			];
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: commands
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			});
		});
	
		// Set 500mA extruder current control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(6)").attr("title", htmlDecode(gettext("Sets extruder's current to 500mA"))).click(function() {
			
			// Show message
			showMessage(gettext("Extruder Current Status"), gettext("This will overwrite the existing extruder current settings. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Extruder Current Status"), gettext("Setting extruder current to 500mA"));
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Set Extruder Current: 500"
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
			
				// Done
				}).done(function(data) {
			
					// Show message
					showMessage(gettext("Extruder Current Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {
		
						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Reconnect To Printer"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					});
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
	
		// Set 660mA extruder current control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(7)").attr("title", htmlDecode(gettext("Sets extruder's current to 660mA"))).click(function() {
			
			// Show message
			showMessage(gettext("Extruder Current Status"), gettext("This will overwrite the existing extruder current settings. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage(gettext("Extruder Current Status"), gettext("Setting extruder current to 660mA"));
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Set Extruder Current: 660"
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
			
				// Done
				}).done(function(data) {
			
					// Show message
					showMessage(gettext("Extruder Current Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {
		
						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Reconnect To Printer"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					});
				});
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Change EEPROM display control
		$("#control > div.jog-panel.eeprom").find("input[type=\"radio\"]").eq(0).attr("title", htmlDecode(gettext("Displays EEPROM as hexadecimal values"))).next("label").attr("title", htmlDecode(gettext("Displays EEPROM as hexadecimal values")));
		$("#control > div.jog-panel.eeprom").find("input[type=\"radio\"]").eq(1).attr("title", htmlDecode(gettext("Displays EEPROM as decimal values"))).next("label").attr("title", htmlDecode(gettext("Displays EEPROM as decimal values")));
		$("#control > div.jog-panel.eeprom").find("input[type=\"radio\"]").eq(2).attr("title", htmlDecode(gettext("Displays EEPROM as ASCII values"))).next("label").attr("title", htmlDecode(gettext("Displays EEPROM as ASCII values")));
		$("#control > div.jog-panel.eeprom").find("input[type=\"radio\"]").click(function() {
		
			// Update EEPROM table
			updateEepromTable();
			
			// Update EEPROM display type
			eepromDisplayType = $(this).val();
		});
		
		$("#control > div.jog-panel.eeprom").find("input[type=\"radio\"]").next("label").click(function() {
		
			// Set checkbox
			var checkbox = $(this).prev("input[type=\"radio\"]");
			
			// Check if checkbox is enabled
			if(checkbox.prop("disabled") === false) {
			
				// Check checkbox
				checkbox.prop("checked", true);
		
				// Update EEPROM table
				updateEepromTable();
			
				// Update EEPROM display type
				eepromDisplayType = checkbox.val();
			}
		});
		
		// Read EEPROM control
		$("#control > div.jog-panel.eeprom").find("div > button:nth-of-type(1)").attr("title", htmlDecode(gettext("Reads EEPROM from the printer"))).click(function() {
			
			// Show message
			showMessage(gettext("EEPROM Status"), gettext("Reading EEPROM"));
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m33fio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({
					command: "message",
					value: "Read EEPROM"
				}),
				contentType: "application/json; charset=UTF-8",
				traditional: true,
				processData: true
			
			// Done
			}).done(function(data) {
			
				// Show message
				showMessage(gettext("EEPROM Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {

					// Hide message
					hideMessage();
					
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Reconnect To Printer"
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
					});
				});
			});
		});
		
		// Write EEPROM control
		$("#control > div.jog-panel.eeprom").find("div > button:nth-of-type(2)").attr("title", htmlDecode(gettext("Writes changes to the printer's EEPROM"))).click(function() {
			
			// Show message
			showMessage(gettext("EEPROM Status"), gettext("This will overwrite the existing EEPROM. Proceed?"), gettext("Yes"), function() {
			
				// Hide message
				hideMessage();
				
				// Initialzie EEPROM
				var eeprom = '';
			
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
				
					// Check if value is invalid
					if(!value.length || value.length > 2 || !/^[0-9a-fA-F]+$/.test(value))
						
						// Restore valid value
						value = $(this).data("validValue");
					
					// Make sure value is 2 digits
					if(value.length == 1)
						value = '0' + value;
				
					// Append value to EEPROM
					eeprom += value.toUpperCase();
				});
			
				// Check if a value was invalid
				if(!eeprom.length) {
			
					// Show message
					showMessage(gettext("EEPROM Status"), gettext("Invalid EEPROM value"), gettext("OK"), function() {
				
						// Hide message
						hideMessage();
					});
				}
			
				// Otherwise
				else {
			
					// Show message
					showMessage(gettext("EEPROM Status"), gettext("Writing EEPROM"));
			
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Write EEPROM:" + eeprom
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
			
					// Done
					}).done(function(data) {
			
						// Show message
						showMessage(gettext("EEPROM Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {
					
							// Hide message
							hideMessage();
						
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: "Reconnect To Printer"
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
							});
						});
					});
				}
			}, gettext("No"), function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// OctoPrint instance manager change event
		$("#navbar_plugin_m33fio > select").change(function() {
		
			// Set select
			var select = $(this);
		
			// Check if creating a new instance
			if(select.val() == "new") {
			
				// Show message
				showMessage(gettext("OctoPrint Status"), gettext("Creating OctoPrint instance"));
			
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Create OctoPrint Instance"
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
					
				// Done
				}).done(function(data) {
					
					// Check if an error occured
					if(data.value == "Error") {
					
						// Set current port
						select.val(window.location.port);
					
						// Show message
						showMessage(gettext("OctoPrint Status"), gettext("Failed to create OctoPrint instance"), gettext("OK"), function() {
						
							// Hide message
							hideMessage();
						});
					}
					
					// Otherwise
					else
					
						// Go to OctoPrint instance
						window.location.port = data.port;
				});
			}
			
			// Check if closing an instance
			else if(select.val() == "close") {
			
				// Show message
				showMessage(gettext("OctoPrint Status"), gettext("Closing OctoPrint instance"));
			
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Close OctoPrint Instance: " + window.location.port
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
					
				// Done
				}).done(function(data) {
					
					// Check if OctoPrint instance was closed
					if(data.value == "OK") {
					
						// Clear found port
						var foundPort = false;
				
						// Go through all options
						$("#navbar_plugin_m33fio > select > option").each(function() {
					
							// Check if another OctoPrint instance exists
							if($(this).attr("value") != "new" && $(this).attr("value") != "close" && $(this).attr("value") != window.location.port) {
						
								// Set found port
								foundPort = true;
								
								var port = $(this).attr("value")
								setTimeout(function() {
			
									// Go to OctoPrint instance
									window.location.port = port;
								}, 1000);
						
								return false;
							}
						});
						
						// Check if port wasn't found
						if(!foundPort)
						
							// Set current port
							select.val(window.location.port);
					}
					
					// Otherwise
					else {
					
						// Set current port
						select.val(window.location.port);
					
						// Show message
						showMessage(gettext("OctoPrint Status"), gettext("Unable to close the OctoPrint instance"), gettext("OK"), function() {
						
							// Hide message
							hideMessage();
						});
					}
					
				// Fail
				}).fail(function() {
					
					// Clear found port
					var foundPort = false;
				
					// Go through all options
					$("#navbar_plugin_m33fio > select > option").each(function() {
				
						// Check if another OctoPrint instance exists
						if($(this).attr("value") != "new" && $(this).attr("value") != "close" && $(this).attr("value") != window.location.port) {
						
							// Set found port
							foundPort = true;
							
							var port = $(this).attr("value")
							setTimeout(function() {
		
								// Go to OctoPrint instance
								window.location.port = port;
							}, 1000);
					
							return false;
						}
					});
					
					// Check if port wasn't found
					if(!foundPort)
					
						// Set current port
						select.val(window.location.port);
				});
			}
			
			// Otherwise
			else
			
				// Go to OctoPrint instance
				window.location.port = select.val();
		});
		
		// On update firmware with file input change
		$("#control > div.jog-panel.advanced").find("div > input").change(function() {
		
			// Initialize variables
			var file = this.files[0];

			// Clear input
			$(this).val('');
			
			// Check if file is valid
			if(typeof file !== "undefined") {
			
				// Check if printer is still connected
				if(self.printerState.isErrorOrClosed() !== true) {
			
					// Check if file is invalid
					if(typeof file === "undefined") {
			
						// Show message
						showMessage(gettext("Firmware Status"), gettext("Invalid file"), gettext("OK"), function() {

							// Hide message
							hideMessage();
						});
	
						// Return
						return;
					}
			
					// Check if file has no name or name doesn't contain a version number
					if(!file.name.length || file.name.search(/(^| )\d{10}(\.|$)/) == -1) {
			
						// Show message
						showMessage(gettext("Firmware Status"), gettext("Invalid file name"), gettext("OK"), function() {

							// Hide message
							hideMessage();
						});
	
						// Return
						return;
					}

					// Check if the file is too big
					if(file.size > 32768) {

						// Show message
						showMessage(gettext("Firmware Status"), gettext("Invalid file size"), gettext("OK"), function() {
		
							// Hide message
							hideMessage();
						});
					}

					// Otherwise
					else {

						// Show message
						showMessage(gettext("Firmware Status"), gettext("Updating firmware"));

						// On file load
						var reader = new FileReader();
						reader.onload = function(event) {

							// Convert array buffer to a binary string
							var binary = "";
							var bytes = new Uint8Array(event.target.result);
							var length = bytes.byteLength;

							for(var i = 0; i < length; i++) 
								binary += String.fromCharCode(bytes[i]);
			
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "file",
									name: file.name,
									content: binary
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
	
							// Done
							}).done(function(data) {
	
								// Show message
								showMessage(gettext("Firmware Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {

									// Hide message
									hideMessage();
							
									// Send request
									$.ajax({
										url: API_BASEURL + "plugin/m33fio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({
											command: "message",
											value: "Reconnect To Printer"
										}),
										contentType: "application/json; charset=UTF-8",
										traditional: true,
										processData: true
									});
								});
							});
						};
						
						// Read in file
						reader.readAsArrayBuffer(file);
					}
				}
			}
		});
		
		// Ping
		function ping() {
		
			// Check if logged in
			if(self.loginState.loggedIn())
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m33fio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({
						command: "message",
						value: "Ping"
					}),
					contentType: "application/json; charset=UTF-8",
					traditional: true,
					processData: true
				
				// Always
				}).always(function() {
					
					// Ping again
					setTimeout(ping, 180 * 1000);
				});
			
			// Otherwise
			else
			
				// Ping again
				setTimeout(ping, 180 * 1000);
		}
		setTimeout(ping, 180 * 1000);
		
		// On data update message
		self.onDataUpdaterPluginMessage = function(plugin, data) {
		
			// Check if message is not from M33 Fio
			if(plugin != "m33fio")
			
				// Return
				return;
			
			// Check if data is current firmware
			if(data.value == "Current Firmware" && typeof data.type !== "undefined" && typeof data.release !== "undefined") {
			
				// Set current firmware type
				currentFirmwareType = data.type;
			
				// Set text
				if(data.type === null)
					var text = _.sprintf(gettext("Currently using an unknown firmware V%(firmwareVersion)s"), {firmwareVersion: htmlEncode(data.release)});
				else
					var text = _.sprintf(gettext("Currently using %(firmwareType)s firmware V%(firmwareVersion)s"), {firmwareType: htmlEncode(data.type), firmwareVersion: htmlEncode(data.release)});
			
				// Set firmware text
				$("#control div.jog-panel.advanced p").html(text);
			}
				
			// Check if data is printer details
			else if(data.value == "Printer Details" && typeof data.serialNumber !== "undefined" && typeof data.serialPort !== "undefined") {
			
				// Set printer color
				switch(data.serialNumber.substr(0, 2)) {
					case "BK":
						printerColor = "Black"
						break;
					case "WH":
						printerColor = "White"
						break;
					case "BL":
						printerColor = "Blue"
						break;
					case "GR":
						printerColor = "Green"
						break;
					case "OR":
						printerColor = "Orange"
						break;
					case "CL":
						printerColor = "Clear"
						break;
					case "SL":
						printerColor = "Silver"
						break;
					case "PL":
						printerColor = "Purple"
						break;
				}
				
				// Set model editor printer color
				modelEditorPrinterColor = printerColor;
				
				// Save model editor printer color
				localStorage.modelEditorPrinterColor = modelEditorPrinterColor;
			
				// Set text
				if(data.serialNumber.match(/^[0-9a-z]+$/i)) {
					var formattedSerialNumber = data.serialNumber.slice(0, 2) + '-' + data.serialNumber.slice(2, 4) + '-' + data.serialNumber.slice(4, 6) + '-' + data.serialNumber.slice(6, 8) + '-' + data.serialNumber.slice(8, 10) + '-' + data.serialNumber.slice(10, 13) + '-' + data.serialNumber.slice(13, 16);
					var text = _.sprintf(gettext("%(formattedSerialNumber)s at %(currentPort)s"), {formattedSerialNumber: htmlEncode(formattedSerialNumber), currentPort: htmlEncode(data.serialPort)});
				}
				else
					var text = _.sprintf(gettext("Printer at %(currentPort)s"), {currentPort: htmlEncode(data.serialPort)});
				
				// Update connected printer details
				$("#navbar_plugin_m33fio > a").html(text);
			}
			
			// Otherwise check if data is that a Micro 3D isn't connected
			else if(data.value == "Micro 3D Not Connected") {
			
				// Clear printer connected
				$("#control > div.jog-panel.advanced").find("div > button").removeClass("current");
				$("#control > div.jog-panel.eeprom table input").val(eepromDisplayType == "ascii" ? "?" : eepromDisplayType == "decimal" ? "???" : "??");
				$("#control div.jog-panel.advanced p").html('');
				$("#navbar_plugin_m33fio > a").html('');
			}
			
			// Otherwise check if data is that a heatbed is detected
			else if(data.value == "Heatbed Detected") {
			
				// Check if heatbed isn't attached
				if(!heatbedAttached) {
			
					// Set that heatbed is attached
					heatbedAttached = true;
			
					// Display heatbed controls
					$("#control .heatbed, #settings_plugin_m33fio .heatbed, body > div.page-container > div.message .heatbed").css("display", "block");
					$("#control > div.jog-panel.extruder").find("h1:not(.heatbed)").html(gettext("Tools"));
				}
			}
			
			// Otherwise check if data is that a heatbed is not detected
			else if(data.value == "Heatbed Not Detected") {
			
				// Check if heatbed is attached
				if(heatbedAttached) {
			
					// Set that heatbed isn't attached
					heatbedAttached = false;
			
					// Hide heatbed controls
					$("#control .heatbed, #settings_plugin_m33fio .heatbed, body > div.page-container > div.message .heatbed").css("display", "none");
					$("#control > div.jog-panel.extruder").find("h1:not(.heatbed)").html(self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter() ? gettext("Tools") : gettext("Extruder"));
				}
			}
			
			// Otherwise check if data is that camera is hostable
			else if(data.value == "Camera Hostable" && typeof data.cameras !== "undefined") {
			
				// Display camera server settings
				$("#settings_plugin_m33fio .camera").css("display", "block");
				
				// Reset cameras
				$("#settings_plugin_m33fio .camera select > option").remove();
				
				// Go through all cameras
				for(var i = 0; i < data.cameras.length; i++)
			
					// Insert option
					$("#settings_plugin_m33fio .camera select").append("<option" + (typeof self.settings.settings !== "undefined" && data.cameras[i] == self.settings.settings.plugins.m33fio.CameraPort ? " selected=\"true\"" : "") + " value = \"" + encodeQuotes(data.cameras[i]) + "\">" + _.sprintf(gettext("Device %(cameraPort)s"), {cameraPort: htmlEncode(data.cameras[i])}) + "</option>");
				
				// Refresh selection	
				$("#settings_plugin_m33fio .camera select").html($("#settings_plugin_m33fio .camera select").html());
			}
			
			// Otherwise check if data is that camera is not hostable
			else if(data.value == "Camera Not Hostable")
			
				// Display camera server settings
				$("#settings_plugin_m33fio .camera").css("display", "none");
			
			// Otherwise check if data is current location
			else if(data.value == "Current Location" && typeof locationCallback === "function" && typeof data.locationX !== "undefined" && typeof data.locationY !== "undefined" && typeof data.locationZ !== "undefined" && typeof data.locationE !== "undefined") {
			
				// Set current values
				currentX = data.locationX === null ? null : parseFloat(data.locationX);
				currentY = data.locationY === null ? null : parseFloat(data.locationY);
				currentZ = parseFloat(data.locationZ);
				currentE = data.locationE === null ? null : parseFloat(data.locationE);
				
				// Clear location callback
				var temp = locationCallback;
				locationCallback = null;
			
				// Call location callback
				temp();
			}
			
			// Otherwise check if data is to change progress bar percent
			else if(data.value == "Progress bar percent" && typeof data.percent !== "undefined") {
			
				// Check if percent is 0
				if(data.percent == '0') {
				
					// Reset progress bar				
					$("#gcode_upload_progress > div.bar").css("width", "0%");
					$("#gcode_upload_progress").removeClass("progress-striped active");
					$("#gcode_upload_progress > span").html('');
					
					if($("#gcode_upload_progress > div.bar > span").length)
						$("#gcode_upload_progress > div.bar > span").html('');
					else
						$("#gcode_upload_progress > div.bar").html('');
				}
				
				// Otherwise
				else {
			
					// Set progress bar percent
					$("#gcode_upload_progress").addClass("progress-striped active");
					$("#gcode_upload_progress > span").html('');
					$("#gcode_upload_progress > div.bar").width(data.percent + '%');
					
					if($("#gcode_upload_progress > div.bar > span").length)
						$("#gcode_upload_progress > div.bar > span").html(gettext("Uploading …"));
					else
						$("#gcode_upload_progress > div.bar").html(gettext("Uploading …"));
				}
			}
			
			// Otherwise check if data is to change progress text
			else if(data.value == "Progress bar text" && typeof data.text !== "undefined") {
			
				// Set text
				var text = gettext(data.text);
				
				// Set percent in text if provided
				if(typeof data.percent !== "undefined")
					text = _.sprintf(text, {percent: data.percent});
			
				// Set progress bar text
				$("#gcode_upload_progress > span").html('');
				
				if($("#gcode_upload_progress > div.bar > span").length)
					$("#gcode_upload_progress > div.bar > span").html(text);
				else
					$("#gcode_upload_progress > div.bar").html(text);
				
				// Update message header
				$("body > div.page-container > div.message").find("h4").html(gettext("Pre-processing Status"));
			}
			
			// Otherwise check if data is pre-processing file
			else if(data.value == "Pre-processing file") {
			
				// Show message
				showMessage(gettext("Pre-processing Status"), gettext("Collecting Print Information …"));
			
				// Update pre-processing status
				function updatePreprocessingStatus() {
			
					// Check if not done slicing
					if($("#gcode_upload_progress").hasClass("active")) {
					
						// Update message
						$("body > div.page-container > div.message").find("p").eq(0).html($("#gcode_upload_progress > div.bar > span").length ? $("#gcode_upload_progress > div.bar > span").html() : $("#gcode_upload_progress > div.bar").html());
					
						// Update pre-processing status again
						setTimeout(updatePreprocessingStatus, 300);
					}
				
					// Otherwise
					else
				
						// Hide message
						hideMessage();
				}
				setTimeout(updatePreprocessingStatus, 300);
			}
			
			// Otherwise check if data is to change last message
			else if(data.value == "Change last message" && typeof data.text !== "undefined")
			
				// Set error message text
				setTimeout(function() {
					var lastMessage = $("div.ui-pnotify:last-of-type > div > div.ui-pnotify-text");
					lastMessage.children("p").html(gettext(data.text));
					lastMessage.children("div.pnotify_additional_info").remove();
				}, 100);
			
			// Otherwise check if data is to create a message
			else if(data.value == "Create message" && typeof data.type !== "undefined" && typeof data.title !== "undefined" && typeof data.text !== "undefined")
			
				// Display error message
				new PNotify({
					title: gettext(data.title),
					text: "<p>" + gettext(data.text) + "</p>",
					type: data.type,
					hide: false
				});
			
			// Otherwise check if data is using shared library
			else if(data.value == "Using Shared Library")
			
				// Display shared library settings
				$("#settings_plugin_m33fio .sharedLibrary").css("display", "block");
			
			// Otherwise check if data is not using shared library
			else if(data.value == "Not Using Shared Library")
			
				// Hide shared library settings
				$("#settings_plugin_m33fio .sharedLibrary").css("display", "none");
			
			// Otherwise check if data is a reminder
			else if(data.value == "Reminder" && typeof data.type !== "undefined") {
			
				// Check if reminding about installing a slicer
				if(data.type == "Slicer" && typeof data.cura !== "undefined" && typeof data.slic3r !== "undefined") {
				
					// Set text
					if(!data.cura && !data.slic3r)
						var text = gettext("It's recommended that you install a slicer on this server to allow slicing from within OctoPrint");
					else if(data.cura && data.slic3r)
						var text = gettext("It's recommended that you install the latest <a href=\"https://ultimaker.com/en/products/cura-software/list\" target=\"_blank\">Cura 15.04</a> release or the latest <a href=\"http://slic3r.org/download\" target=\"_blank\">Slic3r</a> release on this server to allow slicing from within OctoPrint");
					else if(data.cura)
						var text = gettext("It's recommended that you install the latest <a href=\"https://ultimaker.com/en/products/cura-software/list\" target=\"_blank\">Cura 15.04</a> release on this server to allow slicing from within OctoPrint");
					else if(data.slic3r)
						var text = gettext("It's recommended that you install the latest <a href=\"http://slic3r.org/download\" target=\"_blank\">Slic3r</a> release on this server to allow slicing from within OctoPrint");
					
					// Check if same text is currently being displayed
					if($("body > div.page-container > div.message").hasClass("show") && $("body > div.page-container > div.message").find("p").eq(0).html() == text)
				
						// Return
						return;
				
					// Go through all messages
					for(var i = 0; i < messages.length; i++)
				
						// Check if a message waiting to be displayed has same text
						if(messages[i].text == text)
					
							// Return
							return;
			
					// Show message
					showMessage(gettext("Slicer Status"), text, gettext("OK"), function() {
					
						// Hide message
						hideMessage();
					
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Temporarily Disable Reminder: Slicer"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
	
						// Done
						}).done(function() {
							
							// Update values
							function updateValues() {
			
								// Update printer profile
								self.printerProfile.requestData();
			
								// Update slicers
								self.slicing.requestData();
							}

							// Update settings
							if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
								self.settings.requestData(updateValues);
							else
								self.settings.requestData().done(updateValues);
						});
					}, gettext("Disable Reminder"), function() {
					
						// Hide message
						hideMessage();
					
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Permanently Disable Reminder: Slicer"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
	
						// Done
						}).done(function() {
							
							// Update values
							function updateValues() {
			
								// Update printer profile
								self.printerProfile.requestData();
			
								// Update slicers
								self.slicing.requestData();
							}

							// Update settings
							if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
								self.settings.requestData(updateValues);
							else
								self.settings.requestData().done(updateValues);
						});
					});
				}
				
				// Otherwise check if reminding about sleep
				else if(data.type == "Sleep") {
				
					// Set text
					var text = gettext("It's recommended that you disable this server's sleep functionality while printing if it's not already disabled");
				
					// Check if same text is currently being displayed
					if($("body > div.page-container > div.message").hasClass("show") && $("body > div.page-container > div.message").find("p").eq(0).html() == text)
				
						// Return
						return;
				
					// Go through all messages
					for(var i = 0; i < messages.length; i++)
				
						// Check if a message waiting to be displayed has same text
						if(messages[i].text == text)
					
							// Return
							return;
			
					// Show message
					showMessage(gettext("Sleep Status"), text, gettext("OK"), function() {
				
						// Hide message
						hideMessage();
					
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Temporarily Disable Reminder: Sleep"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}, gettext("Disable Reminder"), function() {
				
						// Hide message
						hideMessage();
					
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Permanently Disable Reminder: Sleep"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					});
				}
			}
			
			// Otherwise check if data is that a duplicate wait was received
			else if(data.value == "Duplicate Wait") {
			
				// Remove empty response if it exists
				if(self.terminal.log()[self.terminal.log().length - 1].line == "Recv: ")
					self.terminal.log.pop();
				
				// Append part of ellipse to logged wait
				var command = self.terminal.log.pop();
				if(command.line.indexOf("wait ") == -1)
					command.line += ' ';
				
				command.line += '.';
				
				// Update response
				self.terminal.log.push(command);
			}
			
			// Otherwise check if data is process details
			else if(data.value == "Process Details" && typeof data.processes !== "undefined") {
			
				// Reset process details
				$("#navbar_plugin_m33fio > select > option:not([value=\"new\"]):not([value=\"close\"])").remove();
				$("#navbar_plugin_m33fio > select > option").removeAttr("selected");
				
				// Go through all processes
				for(var i = 0; i < data.processes.length; i++)
			
					// Go through all options
					$("#navbar_plugin_m33fio > select > option").each(function() {
				
						// Check if at end of options or at ordered position
						if($(this).attr("value") == "new" || parseInt($(this).attr("value")) > parseInt(data.processes[i][0])) {
			
							// Insert option
							$(this).before("<option" + (data.processes[i][1] == true ? " selected=\"true\"" : "") + " value = \"" + encodeQuotes(data.processes[i][0]) + "\">" + _.sprintf(gettext("Port %(processPort)d"), {processPort: data.processes[i][0]}) + "</option>");
							
							// Return false
							return false;
						}
					});
				
				// Refresh selection	
				$("#navbar_plugin_m33fio > select").html($("#navbar_plugin_m33fio > select").html());
			}
			
			// Otherwise check if data is provided firmware versions
			else if(data.value == "Provided Firmwares" && typeof data.firmwares !== "undefined") {
			
				// Go to place holder buttons
				var currentPosition = $("#control > div.jog-panel.advanced").find("div > button:nth-of-type(8)");
				
				// Sort firmwares
				var firmwares = Object.keys(data.firmwares).sort(function(a, b) {
					return a.toUpperCase() > b.toUpperCase();
				});
				
				// Go through all provided firmwares
				for(var i = 0; i < firmwares.length; i++) {
					
					// Add update firmware to provided button
					currentPosition.removeClass("placeHolder").addClass("firmware").data("name", firmwares[i]).attr("title", htmlDecode(_.sprintf(gettext("Updates printer's firmware to %(firmwareType)s V%(firmwareVersion)s"), {firmwareType: htmlEncode(data.firmwares[firmwares[i]]["Type"]), firmwareVersion: htmlEncode(data.firmwares[firmwares[i]]["Release"])}))).html(_.sprintf(gettext("Update firmware to %(firmwareType)s V%(firmwareVersion)s"), {firmwareType: htmlEncode(data.firmwares[firmwares[i]]["Type"]), firmwareVersion: htmlEncode(data.firmwares[firmwares[i]]["Release"])})).off("click").click(function() {
					
						// Set firmware name and type
						var firmwareName = $(this).data("name");
						var firmwareType = firmwareName.substr(0, firmwareName.search(/ \d{10}$/));
						
						// Show message
						showMessage(gettext("Firmware Status"), firmwareType == "M3D Mod" ? gettext("M3D Mod is a modified version of M3D firmware that increases the max temperature from 285°C to 315°C. Proceed?") : gettext("This will update the printer's current firmware. Proceed?"), gettext("Yes"), function() {
		
							// Hide message
							hideMessage();
					
							// Show message
							showMessage(gettext("Firmware Status"), gettext("Updating firmware"));

							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: "Update Firmware To Provided: " + firmwareName
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true

							// Done
							}).done(function(data) {

								// Show message
								showMessage(gettext("Firmware Status"), data.value == "OK" ? gettext("Done") : gettext("Failed"), gettext("OK"), function() {

									// Hide message
									hideMessage();
								
									// Send request
									$.ajax({
										url: API_BASEURL + "plugin/m33fio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({
											command: "message",
											value: "Reconnect To Printer"
										}),
										contentType: "application/json; charset=UTF-8",
										traditional: true,
										processData: true
									});
								});
							});
						}, gettext("No"), function() {
		
							// Hide message
							hideMessage();
						});
					});
					
					// Go to next place holder
					currentPosition = currentPosition.next("button");
				}
				
				// Add update firmware with file button
				currentPosition.removeClass("placeHolder").attr("title", htmlDecode(gettext("Updates printer's firmware with a provided file"))).html(gettext("Update firmware with file")).off("click").click(function() {
				
					// Open file input dialog
					$("#control > div.jog-panel.advanced").find("div > input").click();
				});
			}
			
			// Otherwise check if data is EEPROM
			else if(data.value == "EEPROM" && typeof data.eeprom !== "undefined") {
			
				// Update EEPROM table
				updateEepromTable(data.eeprom);
				
				// Remove current indicators from buttons
				$("#control > div.jog-panel.advanced").find("div > button").removeClass("current");
				
				// Indicate current fan type
				var fanType = eepromGetInt(data.eeprom, "fanType");
				if(fanType >= 1 && fanType <= 4)
					$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(" + fanType + ")").addClass("current");
				else if(fanType == 254)
					$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(5)").addClass("current");
					
				// Indicate current extruder current
				var extruderCurrent = eepromGetInt(data.eeprom, "eMotorCurrent");
				if(extruderCurrent == 500)
					$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(6)").addClass("current");
				else if(extruderCurrent == 660)
					$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(7)").addClass("current");
			}
			
			// Otherwise check if data is invalid values
			else if(data.value == "Invalid" && typeof data.bedCenter !== "undefined" && typeof data.bedPlane !== "undefined" && typeof data.bedOrientation !== "undefined") {
				
				// Calibrate bed orientation
				function calibrateBedOrientation() {
				
					// Set text
					var text = gettext("Invalid bed orientation. Calibrate?");
		
					// Check if same text is currently being displayed
					if($("body > div.page-container > div.message").hasClass("show") && $("body > div.page-container > div.message").find("p").eq(0).html() == text)
		
						// Return
						return;
		
					// Go through all messages
					for(var i = 0; i < messages.length; i++)
		
						// Check if a message waiting to be displayed has same text
						if(messages[i].text == text)
			
							// Return
							return;
		
					// Display message
					showMessage(gettext("Calibration Status"), text, gettext("Yes"), function() {
			
						// Hide message
						hideMessage();
				
						// Show message
						showMessage(gettext("Calibration Status"), gettext("Calibrating bed orientation"));

						// Set commands
						var commands = [
							"G90",
							"G0 Z3 F90",
							"M65536;wait"
						];
				
						// Set waiting callback
						waitingCallback = function() {
				
							// Set commands
							commands = [
								"M618 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"] + " P" + floatToBinary(0),
								"M619 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"],
								"M618 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"] + " P" + floatToBinary(0),
								"M619 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"],
								"M618 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"] + " P" + floatToBinary(0),
								"M619 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"],
								"M618 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"] + " P" + floatToBinary(0),
								"M619 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"],
								"M618 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"] + " P" + floatToBinary(0),
								"M619 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"],
								"M65536;wait"
							];
				
							// Set waiting callback
							waitingCallback = function() {
							
								// Set commands
								commands = [
									"M109 S150",
									"M104 S0",
									"M107",
									"G32",
									"M65536;wait"
								];
				
								// Set waiting callback
								waitingCallback = function() {
				
									// Set commands
									commands = [
										"M619 S" + eepromOffsets["bedOrientationBackRight"]["offset"] + " T" + eepromOffsets["bedOrientationBackRight"]["bytes"],
										"M619 S" + eepromOffsets["bedOrientationBackLeft"]["offset"] + " T" + eepromOffsets["bedOrientationBackLeft"]["bytes"],
										"M619 S" + eepromOffsets["bedOrientationFrontLeft"]["offset"] + " T" + eepromOffsets["bedOrientationFrontLeft"]["bytes"],
										"M619 S" + eepromOffsets["bedOrientationFrontRight"]["offset"] + " T" + eepromOffsets["bedOrientationFrontRight"]["bytes"],
										"M65536;wait"
									];

									// Set waiting callback
									waitingCallback = function() {
				
										// Save settings
										function saveSettings() {

											// Save software settings
											self.settings.saveData();

											// Show message
											showMessage(gettext("Calibration Status"), gettext("Done"), gettext("OK"), function() {

												// Hide message
												hideMessage();
											});
										}

										// Update settings
										if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
											self.settings.requestData(saveSettings);
										else
											self.settings.requestData().done(saveSettings);
									}
					
									// Send request
									$.ajax({
										url: API_BASEURL + "plugin/m33fio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({
											command: "message",
											value: commands
										}),
										contentType: "application/json; charset=UTF-8",
										traditional: true,
										processData: true
									});
								}

								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m33fio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({
										command: "message",
										value: commands
									}),
									contentType: "application/json; charset=UTF-8",
									traditional: true,
									processData: true
								});
							}

							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: commands
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
							});
						}

						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: commands
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}, gettext("No"), function() {
			
						// Hide message
						hideMessage();
					});
				}
				
				// Check if invalid bed center or bed plane
				if(data.bedCenter || data.bedPlane) {
				
					// Set text
					if(data.bedPlane)
						var text = gettext("Invalid bed plane. Calibrate?");
					else
						var text = gettext("Invalid bed center Z0. Calibrate?");
			
					// Check if same text is currently being displayed
					if($("body > div.page-container > div.message").hasClass("show") && $("body > div.page-container > div.message").find("p").eq(0).html() == text)
			
						// Return
						return;
			
					// Go through all messages
					for(var i = 0; i < messages.length; i++)
			
						// Check if a message waiting to be displayed has same text
						if(messages[i].text == text)
				
							// Return
							return;
			
					// Display message
					showMessage(gettext("Calibration Status"), text, gettext("Yes"), function() {
				
						// Hide message
						hideMessage();
					
						// Show message
						showMessage(gettext("Calibration Status"), data.bedPlane ? gettext("Calibrating bed plane") : gettext("Calibrating bed center Z0"));
						
						// Set commands
						var commands = [
							"M618 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"] + " P" + floatToBinary(0),
							"M619 S" + eepromOffsets["bedHeightOffset"]["offset"] + " T" + eepromOffsets["bedHeightOffset"]["bytes"],
							"M65536;wait"
						];
	
						// Set waiting callback
						waitingCallback = function() {
						
							// Set commands
							commands = [
								"G91",
								"G0 Z3 F90",
								"G90",
								"M109 S150",
								"M104 S0",
								"M107",
								"G30",
								"M65536;wait"
							];
					
							// Set waiting callback
							waitingCallback = function() {
					
								// Set commands
								commands = [
									"M117",
									"M65536;wait"
								];
			
								// Set waiting callback
								waitingCallback = function() {
							
									// Check if invalid bed orientation
									if(data.bedOrientation)
				
										// Calibrate bed orientation
										calibrateBedOrientation();
								
									// Otherwise
									else {
					
										// Save settings
										function saveSettings() {
				
											// Save software settings
											self.settings.saveData();
					
											// Show message
											showMessage(gettext("Calibration Status"), gettext("Done"), gettext("OK"), function() {
				
												// Hide message
												hideMessage();
											});
										}
			
										// Update settings
										if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
											self.settings.requestData(saveSettings);
										else
											self.settings.requestData().done(saveSettings);
									}
								}
						
								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m33fio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({
										command: "message",
										value: commands
									}),
									contentType: "application/json; charset=UTF-8",
									traditional: true,
									processData: true
								});
							}
	
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: commands
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
							});
						}
	
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: commands
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}, gettext("No"), function() {
				
						// Hide message
						hideMessage();
						
						// Check if invalid bed orientation
						if(data.bedOrientation)
				
							// Calibrate bed orientation
							calibrateBedOrientation();
					});
				}
				
				// Otherwise check if invalid bed orientation
				else if(data.bedOrientation)
				
					// Calibrate bed orientation
					calibrateBedOrientation();
			}
			
			// Otherwise check if data is to show message
			else if((data.value == "Show Message" && typeof data.message !== "undefined" && typeof data.header !== "undefined") || (data.value == "Show Port Access Denied Message" && typeof data.port !== "undefined" && typeof data.header !== "undefined")) {
				
				// Set text
				if(data.value == "Show Port Access Denied Message")
					var text = _.sprintf(gettext("You don't have read/write access to %(port)s"), {port: htmlEncode(data.port)});
				else
					var text = gettext(data.message);
				
				// Check if failed to connect and callback is set
				if(data.header == "Connection Status" && typeof failedToConnectCallback === "function") {
			
					// Clear connect callback
					connectCallback = null;
			
					// Clear failed to connect callback
					var temp = failedToConnectCallback;
					failedToConnectCallback = null;
			
					// Call failed to connect callback
					temp();
				}
				
				// Otherwise
				else {
			
					// Check if same text is currently being displayed
					if($("body > div.page-container > div.message").hasClass("show") && $("body > div.page-container > div.message").find("p").eq(0).html() == text)
			
						// Return
						return;
			
					// Go through all messages
					for(var i = 0; i < messages.length; i++)
			
						// Check if a message waiting to be displayed has same text
						if(messages[i].text == text)
				
							// Return
							return;
				
					// Check if a confirmation is requested
					if(typeof data.confirm !== "undefined") {
				
						// Display message
						showMessage(gettext(data.header), text, gettext("OK"), function() {
					
							// Hide message
							hideMessage();
						});
					}
				
					// Otherwise
					else
				
						// Display message
						showMessage(gettext(data.header), text);
				}
			}
			
			
			// Otherwise check if data is to show a question
			else if((data.value == "Show Question" && typeof data.message !== "undefined" && typeof data.header !== "undefined") || (data.value == "Show Firmware Update Question" && typeof data.reason !== "undefined" && typeof data.firmwareType !== "undefined" && typeof data.firmwareVersion !== "undefined" && typeof data.header !== "undefined")) {

				// Set text
				if(data.value == "Show Firmware Update Question") {
					if(data.reason == "Corrupt")
						var text = _.sprintf(gettext("Firmware is corrupt. Update to %(firmwareType)s firmware version %(firmwareVersion)s?"), {firmwareType: htmlEncode(data.firmwareType), firmwareVersion: htmlEncode(data.firmwareVersion)});
					else if(data.reason == "Incompatible")
						var text = _.sprintf(gettext("Firmware is incompatible. Update to %(firmwareType)s firmware version %(firmwareVersion)s?"), {firmwareType: htmlEncode(data.firmwareType), firmwareVersion: htmlEncode(data.firmwareVersion)});
					else if(data.reason == "Outdated")
						var text = _.sprintf(gettext("Newer firmware available. Update to %(firmwareType)s firmware version %(firmwareVersion)s?"), {firmwareType: htmlEncode(data.firmwareType), firmwareVersion: htmlEncode(data.firmwareVersion)});
				}
				else
					var text = gettext(data.message);
				
				// Check if a response is requested
				if(typeof data.response !== "undefined") {
				
					// Display message
					showMessage(gettext(data.header), text, gettext("Yes"), function() {
		
						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Yes"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					}, gettext("No"), function() {
					
						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "No"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					});
				}
				
				// Otherwise check if a confirmation is requested
				else if(typeof data.confirm !== "undefined") {
				
					// Display message
					showMessage(gettext(data.header), text, gettext("OK"), function() {
					
						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m33fio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "OK"
							}),
							contentType: "application/json; charset=UTF-8",
							traditional: true,
							processData: true
						});
					});
				}
			}
			
			// Otherwise check if data is to hide message
			else if(data.value == "Hide Message")
			
				// Hide message
				hideMessage();
			
			// Otherwise check if data is to allow connecting
			else if(data.value == "Allow Connecting")
			
				// Enable printer connect button
				$("#printer_connect").prop("disabled", false);
			
			// Otherwise check if data is done waiting
			else if(data.value == "Done Waiting" && typeof waitingCallback === "function") {
			
				// Clear waiting callback
				var temp = waitingCallback;
				waitingCallback = null;
			
				// Call waiting callback
				temp();
			}
			
			// Otherwise check if data is connected to printer
			else if(data.value == "Connected To Printer" && typeof connectCallback === "function") {
			
				// Clear failed to connect callback
				failedToConnectCallback = null;
			
				// Clear connect callback
				var temp = connectCallback;
				connectCallback = null;
			
				// Call connect callback
				temp();
			}
			
			// Otherwise check if data is to enable GPIO settings
			else if(data.value == "Enable GPIO Settings")
			
				// Show GPIO buttons
				$("#settings_plugin_m33fio .gpio").css("display", "block");
			
			// Otherwise check if data is to disable GPIO settings
			else if(data.value == "Disable GPIO Settings")
			
				// Hide GPIO buttons
				$("#settings_plugin_m33fio .gpio").css("display", "none");
			
			// Otherwise check if data is to enable GPIO buttons
			else if(data.value == "Enable GPIO Buttons")
			
				// Show GPIO buttons
				$("#control > div.jog-panel.general button.gpio").css("display", "block");
			
			// Otherwise check if data is to disable GPIO buttons
			else if(data.value == "Disable GPIO Buttons")
			
				// Hide GPIO buttons
				$("#control > div.jog-panel.general button.gpio").css("display", "none");
			
			// Otherwise check if data is starting change filament mid-print
			else if(data.value == "Starting Mid-Print Filament Change")
			
				// Show message
				showMessage(gettext("Filament Status"), gettext("Starting mid-print filament change"));
			
			// Otherwise check if data is failed to change filament mid-print
			else if(data.value == "Failed Mid-Print Filament Change")
			
				// Show message
				showMessage(gettext("Filament Status"), gettext("The filament can't be changed since the extruder can't be moved away from the print"), gettext("OK"), function() {
			
					// Hide message
					hideMessage();
				});
			
			// Otherwise check if data is to show mid-print filament change
			else if(data.value == "Show Mid-Print Filament Change") {
			
				// Set text
				var text = gettext("Mid-print filament change");
				
				// Check if same text is currently being displayed
				if($("body > div.page-container > div.message").hasClass("show") && $("body > div.page-container > div.message").find("p").eq(0).html() == text)
				
					// Return
					return;
				
				// Go through all messages
				for(var i = 0; i < messages.length; i++)
				
					// Check if a message waiting to be displayed has same text
					if(messages[i].text == text)
					
						// Return
						return;
				
				// Show message
				showMessage(gettext("Filament Status"), text, gettext("Unload"), function() {

					// Hide message
					hideMessage();
					
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m33fio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Don't Show Mid-Print Filament Change"
						}),
						contentType: "application/json; charset=UTF-8",
						traditional: true,
						processData: true
						
					// Done
					}).done(function() {
						
						// Unload filament
						function unloadFilament() {

							// Show message
							showMessage(gettext("Filament Status"), gettext("Warming up"));

							// Set commands
							commands = [
								"M109 S" + parseInt($("body > div.page-container > div.message > div > div > div.filamentSettings input").eq(0).val()),
								"M65536;wait"
							];

							// Display temperature
							var updateTemperature = setInterval(function() {

								// Show message
								if(self.temperature.temperatures.tool0.actual.length) {

									var temperature = self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1];

									if(temperature != 0)
										showMessage(gettext("Filament Status"), gettext("Warming up") + ": " + temperature + "°C");
								}
							}, 1000);

							// Set waiting callback
							waitingCallback = function() {

								// Stop displaying temperature
								clearInterval(updateTemperature);

								// Show message
								showMessage(gettext("Filament Status"), gettext("Remove filament"));

								// Set commands
								commands = [
									"G90",
									"G92 E0"
								];
	
								for(var i = 2; i <= 50; i += 2)
									commands.push("G0 E-" + i + " F345");
			
								commands.push("M65536;wait");

								// Set waiting callback
								waitingCallback = function() {

									// Show message
									showMessage(gettext("Filament Status"), gettext("Was filament removed?"), gettext("Yes"), function() {

										// Hide message
										hideMessage();
				
										// Show message
										showMessage(gettext("Filament Status"), '', gettext("Load"), function() {

											// Hide message
											hideMessage();

											// Load filament
											function loadFilament() {

												// Show message
												showMessage(gettext("Filament Status"), gettext("Warming up"));

												// Set commands
												commands = [
													"M109 S" + parseInt($("body > div.page-container > div.message > div > div > div.filamentSettings input").eq(0).val()),
													"M65536;wait"
												];

												// Display temperature
												updateTemperature = setInterval(function() {

													// Show message
													if(self.temperature.temperatures.tool0.actual.length) {

														var temperature = self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1];

														if(temperature != 0)
															showMessage(gettext("Filament Status"), gettext("Warming up") + ": " + temperature + "°C");
													}
												}, 1000);

												// Set waiting callback
												waitingCallback = function() {

													// Stop displaying temperature
													clearInterval(updateTemperature);

													// Show message
													showMessage(gettext("Filament Status"), gettext("Insert filament"));

													// Set commands
													commands = [
														"G90",
														"G92 E0"
													];

													for(var i = 2; i <= 50; i += 2)
														commands.push("G0 E" + i + " F345");
		
													commands.push("M65536;wait");

													// Set waiting callback
													waitingCallback = function() {

														// Show message
														showMessage(gettext("Filament Status"), gettext("Was filament inserted?"), gettext("Yes"), function() {

															// Hide message
															hideMessage();
									
															// Show message
															showMessage(gettext("Filament Status"), '', gettext("Set"), function() {

																// Hide message
																hideMessage();

																// Show message
																showMessage(gettext("Filament Status"), gettext("Warming up"));

																// Set commands
																commands = [
																	"M109 S" + parseInt($("body > div.page-container > div.message > div > div > div.filamentSettings input").eq(0).val()),
																	"M65536;wait"
																];

																// Display temperature
																updateTemperature = setInterval(function() {

																	// Show message
																	if(self.temperature.temperatures.tool0.actual.length) {

																		var temperature = self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1];

																		if(temperature != 0)
																			showMessage(gettext("Filament Status"), gettext("Warming up") + ": " + temperature + "°C");
																	}
																}, 1000);

																// Set waiting callback
																waitingCallback = function() {

																	// Stop displaying temperature
																	clearInterval(updateTemperature);
	
																	// Show message
																	showMessage(gettext("Filament Status"), gettext("Make sure the nozzle is clean before continuing. It will be hot, so be careful."), gettext("OK"), function() {
		
																		// Hide message
																		hideMessage();

																		// Show message
																		showMessage(gettext("Filament Status"), gettext("Resuming print"));

																		// Send request
																		$.ajax({
																			url: API_BASEURL + "plugin/m33fio",
																			type: "POST",
																			dataType: "json",
																			data: JSON.stringify({
																				command: "message",
																				value: "Resume After Mid-Print Filament Change"
																			}),
																			contentType: "application/json; charset=UTF-8",
																			traditional: true,
																			processData: true
																		});
																	});
																}
	
																// Send request
																$.ajax({
																	url: API_BASEURL + "plugin/m33fio",
																	type: "POST",
																	dataType: "json",
																	data: JSON.stringify({
																		command: "message",
																		value: commands
																	}),
																	contentType: "application/json; charset=UTF-8",
																	traditional: true,
																	processData: true
																});
															});
														}, gettext("No"), function() {

															// Hide message
															hideMessage();

															// Load filament again
															loadFilament()
														});
													}

													// Send request
													$.ajax({
														url: API_BASEURL + "plugin/m33fio",
														type: "POST",
														dataType: "json",
														data: JSON.stringify({
															command: "message",
															value: commands
														}),
														contentType: "application/json; charset=UTF-8",
														traditional: true,
														processData: true
													});
												}

												// Send request
												$.ajax({
													url: API_BASEURL + "plugin/m33fio",
													type: "POST",
													dataType: "json",
													data: JSON.stringify({
														command: "message",
														value: commands
													}),
													contentType: "application/json; charset=UTF-8",
													traditional: true,
													processData: true
												});
											}
											loadFilament();
										});
									}, gettext("No"), function() {

										// Hide message
										hideMessage();

										// Unload filament again
										unloadFilament()
									});
								}

								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m33fio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({
										command: "message",
										value: commands
									}),
									contentType: "application/json; charset=UTF-8",
									traditional: true,
									processData: true
								});
							}

							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m33fio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({
									command: "message",
									value: commands
								}),
								contentType: "application/json; charset=UTF-8",
								traditional: true,
								processData: true
							});
						}
						unloadFilament();
					});
				});
			}
			
			// Otherwise check if data is to update serial ports
			else if(data.value == "Update Serial Ports") {
			
				// Update serial ports
				self.connection.requestData();
				$("#connection_ports").blur();
			}
		}
		
		// User log in event
		self.onUserLoggedIn = function() {
		
			// Enable managing OctoPrint instances
			$("#navbar_plugin_m33fio > select > option").last().prop("disabled", false).prev().prop("disabled", false);
			
			// Disable closing initial OctoPrint instance
			if(window.location.port == 5000)
				$("#navbar_plugin_m33fio > select > option").last().prop("disabled", true)
			
			// Show mid-print filament change settings if using a Micro 3D printer
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter())
				$("div.midPrintFilamentChange").removeClass("notUsingAMicro3DPrinter");
			
			// Set mid-print filament change layer input
			$("#gcode div.midPrintFilamentChange input").val(self.settings.settings.plugins.m33fio.MidPrintFilamentChangeLayers());
			
			// Check if printing or paused
			if(self.printerState.isPrinting() === true || self.printerState.isPaused() === true)
		
				// Disable changing mid-print filement change layers
				$("#gcode div.midPrintFilamentChange button").eq(2).addClass("disabled");
		
			// Otherwise
			else
		
				// Enable changing mid-print filement change layers
				$("#gcode div.midPrintFilamentChange button").eq(2).removeClass("disabled");
		}
		
		// User log out event
		self.onUserLoggedOut = function() {
		
			// Disable managing OctoPrint instances
			$("#navbar_plugin_m33fio > select > option").last().prop("disabled", true).prev().prop("disabled", true);
			
			// Hide mid-print filament change settings
			$("div.midPrintFilamentChange").addClass("notUsingAMicro3DPrinter");
		}
		
		// On after tab change
		self.onAfterTabChange = function() {
		
			// Resize windows
			$(window).resize();
		}
		
		// All view models bound event
		self.onAllBound = function(payload) {
		
			// Go through all view models
			for(var viewModel in payload)
			
				// Check if view model is files view model
				if(payload[viewModel].constructor.name == "GcodeFilesViewModel" || payload[viewModel].constructor.name == "FilesViewModel") {
					
					// Set files
					self.files = payload[viewModel];
					
					// Unload viewed model if changed
					function unloadViewedModelIfChanged(entry) {
				
						// Check if entry is a folder
						if(entry && entry.hasOwnProperty("children"))
					
							// Go through each entry in the folder
							for(var child in entry.children)
						
								// Check if current child is the currently viewed model
								unloadViewedModelIfChanged(entry.children[child]);
					
						// Otherwise check if entry is the currently viewed model and its upload date was changed
						else if(entry && entry.refs && entry.date && entry.refs.hasOwnProperty("download") && entry["refs"]["download"] === modelViewer.modelUrl && entry.date !== modelViewer.modelUploadDate)
						
							// Unload model from viewer
							modelViewer.unloadModel();
					}
					
					// Replace list helper update items
					var originalUpdateItems = self.files.listHelper._updateItems;
					self.files.listHelper._updateItems = function() {
					
						// Check if updating files is allowed
						if(!preventUpdatingFiles) {
					
							// Update items
							originalUpdateItems();
						
							// Go through all uploaded entries
							for(var entry in self.files.listHelper.allItems)
					
								// Unload model if changed
								unloadViewedModelIfChanged(self.files.listHelper.allItems[entry]);
						
							// Add view buttons to models
							addViewButtonsToModels();
						}
						
						// Otherwise
						else
							
							// Allow updating files
							preventUpdatingFiles = false;
					}
					
					// Unload viewed model if deleted
					function unloadViewedModelIfDeleted(entry) {
				
						// Check if entry is a folder
						if(entry && entry.hasOwnProperty("children"))
					
							// Go through each entry in the folder
							for(var child in entry.children)
						
								// Check if current child is the currently viewed model
								unloadViewedModelIfDeleted(entry.children[child]);
					
						// Otherwise check if entry is the currently viewed model
						else if(entry && entry.refs && entry.refs.hasOwnProperty("download") && entry["refs"]["download"] === modelViewer.modelUrl)
						
							// Unload model from viewer
							modelViewer.unloadModel();
					}
					
					// Check if files view model supports removing files and folders
					if(typeof self.files._removeEntry === "function") {
					
						// Replace remove entry function
						var originalRemoveEntry = self.files._removeEntry;
						self.files._removeEntry = function(entry, event) {
					
							// Remove entry
							originalRemoveEntry(entry, event);
						
							// Unload viewed model if deleted
							unloadViewedModelIfDeleted(entry);
						}
					}
					
					// Otherwise
					else {
					
						// Replace remove file function
						var originalRemoveFile = self.files.removeFile;
						self.files.removeFile = function(file) {
					
							// Remove file
							originalRemoveFile(file);
						
							// Unload viewed model if deleted
							unloadViewedModelIfDeleted(file);
						}
					}
					
					// Replace load file function
					var originalLoadFile = self.files.loadFile;
					self.files.loadFile = function(file, printAfterLoad) {
		
						// Check if printing after load and using a Micro 3D printer
						if(printAfterLoad && !self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
			
							// Check if using on the fly pre-processing and changing settings before print
							if(self.settings.settings.plugins.m33fio.PreprocessOnTheFly() && self.settings.settings.plugins.m33fio.ChangeSettingsBeforePrint()) {
			
								// Show message
								showMessage(gettext("Printing Status"), '', gettext("Print"), function() {
			
									// Hide message
									hideMessage();
				
									// Send request
									$.ajax({
										url: API_BASEURL + "plugin/m33fio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({
											command: "message",
											value: "Print Settings: " + JSON.stringify({
												filamentTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(),
												heatbedTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(),
												filamentType: $("body > div.page-container > div.message > div > div > div.printSettings select").val(),
												useWaveBondingPreprocessor: $("body > div.page-container > div.message > div > div > div.printSettings input[type=\"checkbox\"]").is(":checked")
											})
										}),
										contentType: "application/json; charset=UTF-8",
										traditional: true,
										processData: true
					
									// Done
									}).done(function() {
					
										// Print file
										function printFile() {
					
											// Save software settings
											self.settings.saveData();
						
											// Send request
											$.ajax({
												url: API_BASEURL + "plugin/m33fio",
												type: "POST",
												dataType: "json",
												data: JSON.stringify({
													command: "message",
													value: "Starting Print"
												}),
												contentType: "application/json; charset=UTF-8",
												traditional: true,
												processData: true
		
											// Done
											}).done(function() {
	
												// Load file and print
												originalLoadFile(file, printAfterLoad);
											});
										}
				
										// Update settings
										if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
											self.settings.requestData(printFile);
										else
											self.settings.requestData().done(printFile);
									});
								}, gettext("Cancel"), function() {
			
									// Hide message
									hideMessage();
								});
							}
				
							// Otherwise
							else {
				
								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m33fio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({
										command: "message",
										value: "Starting Print"
									}),
									contentType: "application/json; charset=UTF-8",
									traditional: true,
									processData: true
				
								// Done
								}).done(function() {
			
									// Load file and print
									originalLoadFile(file, printAfterLoad);
								});
							}
						}
			
						// Otherwise
						else
			
							// Print file
							originalLoadFile(file, printAfterLoad);
					}
					
					// Break
					break;
				}
		}
		
		// On startup complete
		self.onStartupComplete = function() {
			
			// Add titles to buttons that weren't loaded before
			$("#control div.jog-panel.controls > div > button:first-of-type, #control div.jog-panel.controls #control-jog-feedrate > button:first-of-type").attr("title", htmlDecode(gettext("Sets feed rate to the specified amount")));
			$("#control div.jog-panel.extruder > div > button:nth-of-type(3)").attr("title", htmlDecode(gettext("Sets flow rate to the specified amount")));
			$("#control-distance001").attr("title", htmlDecode(gettext("Sets extruder's position adjustment to 0.01mm")));
			$("#control-distance01").attr("title", htmlDecode(gettext("Sets extruder's position adjustment to 0.1mm")));
			$("#control-distance1").attr("title", htmlDecode(gettext("Sets extruder's position adjustment to 1mm")));
			$("#control-distance10").attr("title", htmlDecode(gettext("Sets extruder's position adjustment to 10mm")));
			$("#control-distance100").attr("title", htmlDecode(gettext("Sets extruder's position adjustment to 100mm")));
			$("#control div.jog-panel.extruder > div > div:first-of-type").attr("title", htmlDecode(gettext("Sets tool to specified value")));
		
			// Make controls not Micro 3D applicable
			$("#control div.jog-panel.extruder > div > div:first-of-type, #control div.jog-panel.extruder > div > div:nth-of-type(3), #control div.jog-panel.extruder > div > button:nth-of-type(3), #control div.jog-panel.controls > div > div:nth-of-type(4), #control div.jog-panel.controls > div > button:first-of-type, #control div.jog-panel.controls #control-jog-feedrate > button:first-of-type, #control > div.jog-panel.controls div.distance > div").addClass("notMicro3DApplicable");
			
			// Update webcam
			updateWebcam();
			
			// Add view buttons to models
			addViewButtonsToModels();
			
			// Update model viewer's grid
			modelViewer.updateGrid();
		
			// Resize window
			setTimeout(function() {
				$(window).resize();
			}, 0);
			
			// Update printer differences
			updatePrinterDifferences();
		
			// On server disconnect event
			self.onServerDisconnect = function() {
			
				// Reset message system
				messages = [];
				skippedMessages = 0;
		
				// Get message
				var message = $("body > div.page-container > div.message");
		
				// Check if a progress message is being shown
				if(message.hasClass("show") && !message.find("button.confirm").eq(2).hasClass("show")) {
		
					// Show message
					showMessage(gettext("Server Status"), gettext("You've been disconnected from the server which has most likely caused the printer's current operation to fail. It's recommended that you refresh this page to prevent further problems. Refresh now?"), gettext("Yes"), function() {

						// Hide message
						hideMessage();
					
						// Refresh the page
						location.reload();
					}, gettext("No"), function() {

						// Hide message
						hideMessage();
					});
				}
			
				// Otherwise
				else {
			
					// Check if a message is shown
					if(message.hasClass("show"))
				
						// Hide message
						hideMessage();
			
					// Show message
					showMessage(gettext("Server Status"), gettext("You've been disconnected from the server. It's recommended that you refresh this page to prevent further problems. Refresh now?"), gettext("Yes"), function() {

						// Hide message
						hideMessage();
					
						// Refresh the page
						location.reload();
					}, gettext("No"), function() {

						// Hide message
						hideMessage();
					});
				}
			}
		}
		
		// On settings shown
		self.onSettingsShown = function() {
		
			// Go through all settings that aren't dependant
			$("#settings_plugin_m33fio div.control-group:not(.dependant)").each(function() {

				// Initialize variables
				var parent = $(this)
				var checked = $(this).find("input[type=\"checkbox\"]").is(":checked");

				// Go through all dependant values
				while(parent.next().length && parent.next().hasClass("dependant")) {
	
					parent = parent.next();
		
					// Check if value is enabled
					if(checked)
		
						// Allow setting dependant value
						parent.removeClass("disabled");
		
					// Otherwise
					else
		
						// Disable setting dependant value
						parent.addClass("disabled");
				}
			});
		
			// Resize window
			$(window).resize();
		}
		
		// On settings hidden
		self.onSettingsHidden = function() {
		
			// Update values
			function updateValues() {

				// Update mid-print filament change layer input
				$("#gcode div.midPrintFilamentChange input").val(self.settings.settings.plugins.m33fio.MidPrintFilamentChangeLayers());
				
				// Update printer differences
				updatePrinterDifferences();
				
				// Check if using a Micro 3D printer
				if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter()) {
					
					// Set bed dimensions
					bedLowMaxX = 106.0;
					bedLowMinX = -2.0;
					bedLowMaxY = 105.0;
					bedLowMinY = -2.0;
					bedLowMaxZ = 5.0;
					bedLowMinZ = 0.0;
					bedMediumMaxX = 106.0;
					bedMediumMinX = -2.0;
					bedMediumMaxY = 105.0;
					bedMediumMinY = -9.0;
					bedMediumMaxZ = 73.5;
					bedMediumMinZ = bedLowMaxZ;
					bedHighMaxX = 97.0;
					bedHighMinX = 7.0;
					bedHighMaxY = 85.0;
					bedHighMinY = 9.0;
					bedHighMaxZ = 112.0;
					bedHighMinZ = bedMediumMaxZ;
					
					// Set print bed size
					printBedWidth = 121;
					printBedDepth = 119 - bedLowMinY;
					
					// Set external bed height
					externalBedHeight = parseFloat(self.settings.settings.plugins.m33fio.ExternalBedHeight());
		
					// Adjust bed bounds to account for external bed
					bedLowMaxZ = 5.0 + externalBedHeight;
					bedLowMinZ = 0.0 + externalBedHeight;
					bedMediumMinZ = bedLowMaxZ;
					bedLowMinY = self.settings.settings.plugins.m33fio.ExpandPrintableRegion() ? bedMediumMinY : -2.0;
				
					// Set extruder center
					extruderCenterX = (bedLowMaxX + bedLowMinX) / 2;
					extruderCenterY = (bedLowMaxY + bedLowMinY + 14.0) / 2;
				
					// Set print bed offset
					printBedOffsetX = 0.0;
					printBedOffsetY = 2.0;
				}
				
				// Update printer profile
				self.printerProfile.requestData();
				
				// Update slicers
				self.slicing.requestData();
				
				// Update webcam
				updateWebcam();
			}

			// Update settings
			if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
				self.settings.requestData(updateValues);
			else
				self.settings.requestData().done(updateValues);
		}
		
		// On error event
		self.onEventError = function() {
		
			// Check if using an Micro 3D printer and error is an unhandled firmware or communication error
			if(!self.settings.settings.plugins.m33fio.NotUsingAMicro3DPrinter() && ($("div.ui-pnotify:last-of-type h4.ui-pnotify-title").html() == getAlreadyTranslatedText("Unhandled firmware error") || $("div.ui-pnotify:last-of-type h4.ui-pnotify-title").html() == getAlreadyTranslatedText("Unhandled communication error")))
			
				// Remove error
				$("div.ui-pnotify:last-of-type").remove();
			
			// Update serial ports
			self.connection.requestData();
			$("#connection_ports").blur();
		}
		
		// On printer connected event
		self.onEventConnected = function() {
		
			// Update serial ports
			self.connection.requestData();
			$("#connection_ports").blur();
		}
		
		// On printer disconnected event
		self.onEventDisconnected = function() {
		
			// Update serial ports
			self.connection.requestData();
			$("#connection_ports").blur();
		}
		
		// On print started event
		self.onEventPrintStarted = function() {
		
			// Disable changing mid-print filement change layers
			$("#gcode div.midPrintFilamentChange button").eq(2).addClass("disabled");
		}
		
		// On print started event
		self.onEventPrintFailed = function() {
		
			// Enable changing mid-print filement change layers
			$("#gcode div.midPrintFilamentChange button").eq(2).removeClass("disabled");
		}
		
		// On print done event
		self.onEventPrintDone = function() {
		
			// Enable changing mid-print filement change layers
			$("#gcode div.midPrintFilamentChange button").eq(2).removeClass("disabled");
		}
		
		// On slicing started event
		self.onEventSlicingStarted = function() {
		
			// Show message
			showMessage(gettext("Slicing Status"), gettext("Slicing …"));
			
			// Update slicing status
			function updateSlicingStatus() {
			
				// Check if not done slicing
				if($("#gcode_upload_progress").hasClass("active")) {
					
					// Update message
					var text = $("#gcode_upload_progress > div.bar > span").length ? $("#gcode_upload_progress > div.bar > span").html() : $("#gcode_upload_progress > div.bar").html();
					if(text.length)
						$("body > div.page-container > div.message").find("p").eq(0).html(text);
					
					// Update slicing status again
					setTimeout(updateSlicingStatus, 300);
				}
				
				// Otherwise
				else
				
					// Hide message
					hideMessage();
			}
			setTimeout(updateSlicingStatus, 300);
		}
		
		// Check if using Windows
		if(navigator.platform.indexOf("Win") != -1)
		
			// Fix Windows specific CSS issues
			$("#settings_plugin_m33fio select.short").addClass("windows");
		
		// Otherwise check if using OS X
		else if(navigator.platform.indexOf("Mac") != -1)
		
			// Fix OS X specific CSS issues
			$("#settings_plugin_m33fio label.checkbox > span, #control div.jog-panel.eeprom input, #control div.jog-panel.eeprom input[type=\"radio\"], #settings_plugin_m33fio select.short").addClass("osx");	
	}

	// Register plugin
	OCTOPRINT_VIEWMODELS.push([
	
		// Constructor
		M33FioViewModel,
		["printerStateViewModel", "temperatureViewModel", "settingsViewModel", "slicingViewModel", "terminalViewModel", "loginStateViewModel", "printerProfilesViewModel", "controlViewModel", "connectionViewModel", "gcodeViewModel"]
	]);
});
