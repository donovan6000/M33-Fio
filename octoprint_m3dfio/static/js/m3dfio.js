// On start
$(function() {

	// Create view model
	function M3DFioViewModel(parameters) {
		
		// Initialize variables
		var printerConnected = false;
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
		var gCodeFileName;
		var modelCenter = [0, 0];
		var currentZ;
		var viewport = null;
		var convertedModel = null;
		var messages = [];
		var skippedMessages = 0;
		var continueWithPrint = false;
		var waitingCallback = null;
		var usingHeatbed = false;
		var self = this;
		
		// Get state views
		self.printerState = parameters[0];
		self.temperature = parameters[1];
		self.settings = parameters[2];
		self.files = parameters[3];
		self.slicing = parameters[4];
		self.terminal = parameters[5];
		
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
		var bedHighMinZ = bedMediumMaxZ
		var extruderCenterX = (bedLowMaxX + bedLowMinX) / 2;
		var extruderCenterY = (bedLowMaxY + bedLowMinY + 14.0) / 2;
		var modelCenterOffsetX = -2.0;
		var modelCenterOffsetY = -2.0;
		var heatbedHeight = 10.0
		
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
		
		// Set vertex and fragment shader
		var vertexShader = `
			uniform vec3 viewVector;
			uniform float c;
			uniform float p;
			varying float intensity;
			void main() {
				vec3 vNormal = normalize(normalMatrix * normal);
				vec3 vNormel = normalize(normalMatrix * viewVector);
				intensity = pow(c - dot(vNormal, vNormel), p);

				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`;
	
		var fragmentShader = `
			uniform vec3 glowColor;
			varying float intensity;
			void main() {
				vec3 glow = glowColor * intensity;
				gl_FragColor = vec4(glow, 1.0);
			}
		`;
		
		// EEPROM offsets
		var eepromOffsets = {
			firmwareVersion : {
				name: "Firmware Version",
				offset: 0x00,
				bytes: 4,
				color: "rgb(245, 160, 245)"
			},
			firmwareCrc : {
				name: "Firmware CRC",
				offset: 0x04,
				bytes: 4,
				color: "rgb(245, 245, 160)"
			},
			lastRecordedZValue : {
				name: "Last Recorded Z Value",
				offset: 0x08,
				bytes: 4,
				color: "rgb(230, 210, 230)"
			},
			backlashX : {
				name: "Backlash X",
				offset: 0x0C,
				bytes: 4,
				color: "rgb(200, 150, 150)"
			},
			backlashY : {
				name: "Backlash Y",
				offset: 0x10,
				bytes: 4,
				color: "rgb(150, 200, 150)"
			},
			bedOrientationBackRight : {
				name: "Bed Orientation Back Right",
				offset: 0x14,
				bytes: 4,
				color: "rgb(200, 200, 150)"
			},
			bedOrientationBackLeft : {
				name: "Bed Orientation Back Left",
				offset: 0x18,
				bytes: 4,
				color: "rgb(150, 150, 200)"
			},
			bedOrientationFrontLeft : {
				name: "Bed Orientation Front Left",
				offset: 0x1C,
				bytes: 4,
				color: "rgb(200, 150, 200)"
			},
			bedOrientationFrontRight : {
				name: "Bed Orientation Front Right",
				offset: 0x20,
				bytes: 4,
				color: "rgb(150, 200, 200)"
			},
			filamentColor : {
				name: "Filament Color",
				offset: 0x24,
				bytes: 4,
				color: "rgb(250, 210, 230)"
			},
			filamentTypeAndLocation : {
				name: "Filament Type And Location",
				offset: 0x28,
				bytes: 1,
				color: "rgb(160, 160, 245)"
			},
			filamentTemperature : {
				name: "Filament Temperature",
				offset: 0x29,
				bytes: 1,
				color: "rgb(160, 245, 160)"
			},
			filamentAmount : {
				name: "Filament Amount",
				offset: 0x2A,
				bytes: 4,
				color: "rgb(245, 160, 160)"
			},
			backlashExpansionXPositive : {
				name: "Backlash Expansion X+",
				offset: 0x2E,
				bytes: 4,
				color: "rgb(200, 255, 200)"
			},
			backlashExpansionYLPositive : {
				name: "Backlash Expansion  YL+",
				offset: 0x32,
				bytes: 4,
				color: "rgb(200, 200, 255)"
			},
			backlashExpansionYRPositive : {
				name: "Backlash Expansion YR+",
				offset: 0x36,
				bytes: 4,
				color: "rgb(255, 200, 255)"
			},
			backlashExpansionYRNegative : {
				name: "Backlash Expansion YR-",
				offset: 0x3A,
				bytes: 4,
				color: "rgb(255, 255, 200)"
			},
			backlashExpansionZ : {
				name: "Backlash Expansion Z",
				offset: 0x3E,
				bytes: 4,
				color: "rgb(200, 255, 255)"
			},
			backlashExpansionE : {
				name: "Backlash Expansion E",
				offset: 0x42,
				bytes: 4,
				color: "rgb(255, 200, 200)"
			},
			bedOffsetBackLeft : {
				name: "Bed Offset Back Left",
				offset: 0x46,
				bytes: 4,
				color: "rgb(170, 220, 220)"
			},
			bedOffsetBackRight : {
				name: "Bed Offset Back Right",
				offset: 0x4A,
				bytes: 4,
				color: "rgb(190, 165, 165)"
			},
			bedOffsetFrontRight : {
				name: "Bed Offset Front Right",
				offset: 0x4E,
				bytes: 4,
				color: "rgb(165, 165, 190)"
			},
			bedOffsetFrontLeft : {
				name: "Bed Offset Front Left",
				offset: 0x52,
				bytes: 4,
				color: "rgb(165, 190, 165)"
			},
			bedHeightOffset : {
				name: "Bed Height Offset",
				offset: 0x56,
				bytes: 4,
				color: "rgb(190, 190, 165)"
			},
			reserved : {
				name: "Reserved",
				offset: 0x5A,
				bytes: 4,
				color: "rgb(250, 190, 165)"
			},
			backlashSpeed : {
				name: "Backlash Speed",
				offset: 0x5E,
				bytes: 4,
				color: "rgb(200, 200, 200)"
			},
			bedOrientationVersion : {
				name: "Bed Orientation Version",
				offset: 0x62,
				bytes: 1,
				color: "rgb(230, 180, 180)"
			},
			speedLimitX : {
				name: "Speed Limit X",
				offset: 0x66,
				bytes: 4,
				color: "rgb(240, 160, 160)"
			},
			speedLimitY : {
				name: "Speed Limit Y",
				offset: 0x6A,
				bytes: 4,
				color: "rgb(160, 240, 160)"
			},
			speedLimitZ : {
				name: "Speed Limit Z",
				offset: 0x6E,
				bytes: 4,
				color: "rgb(160, 160, 240)"
			},
			speedLimitEPositive : {
				name: "Speed Limit E Positive",
				offset: 0x72,
				bytes: 4,
				color: "rgb(240, 240, 160)"
			},
			speedLimitENegative : {
				name: "Speed Limit E Negative",
				offset: 0x76,
				bytes: 4,
				color: "rgb(240, 160, 240)"
			},
			bedOrientationFirstSample : {
				name: "Bed Orientation First Sample",
				offset: 0x106,
				bytes: 4,
				color: "rgb(200, 200, 200)"
			},
			fanType : {
				name: "Fan Type",
				offset: 0x2AB,
				bytes: 1,
				color: "rgb(180, 230, 230)"
			},
			fanOffset : {
				name: "Fan Offset",
				offset: 0x2AC,
				bytes: 1,
				color: "rgb(230, 230, 180)"
			},
			fanScale : {
				name: "Fan Scale",
				offset: 0x2AD,
				bytes: 4,
				color: "rgb(230, 180, 230)"
			},
			heaterCalibrationMode : {
				name: "Heater Calibration Mode",
				offset: 0x2B1,
				bytes: 1,
				color: "rgb(160, 240, 240)"
			},
			xMotorCurrent : {
				name: "X Motor Current",
				offset: 0x2B2,
				bytes: 2,
				color: "rgb(170, 220, 170)"
			},
			yMotorCurrent : {
				name: "Y Motor Current",
				offset: 0x2B4,
				bytes: 2,
				color: "rgb(220, 220, 170)"
			},
			zMotorCurrent : {
				name: "Z Motor Current",
				offset: 0x2B6,
				bytes: 2,
				color: "rgb(190, 165, 190)"
			},
			hardwareStatus : {
				name: "Hardware Status",
				offset: 0x2B8,
				bytes: 2,
				color: "rgb(160, 245, 245)"
			},
			heaterTemperatureMeasurementB : {
				name: "Heater Temperature Measurement B",
				offset: 0x2BA,
				bytes: 4,
				color: "rgb(210, 210, 230)"
			},
			hoursCounter : {
				name: "Hours Counter",
				offset: 0x2C0,
				bytes: 4,
				color: "rgb(230, 230, 110)"
			},
			xAxisStepsPerMm : {
				name: "X Axis Steps Per MM",
				offset: 0x2D6,
				bytes: 4,
				color: "rgb(220, 170, 170)"
			},
			yAxisStepsPerMm : {
				name: "Y Axis Steps Per MM",
				offset: 0x2DA,
				bytes: 4,
				color: "rgb(170, 170, 220)"
			},
			zAxisStepsPerMm : {
				name: "Z Axis Steps Per MM",
				offset: 0x2DE,
				bytes: 4,
				color: "rgb(220, 170, 220)"
			},
			eAxisStepsPerMm : {
				name: "E Axis Steps Per MM",
				offset: 0x2E2,
				bytes: 4,
				color: "rgb(180, 230, 180)"
			},
			savedZState : {
				name: "Saved Z State",
				offset: 0x2E6,
				bytes: 2,
				color: "rgb(210, 230, 230)"
			},
			extruderCurrent : {
				name: "Extruder Current",
				offset: 0x2E8,
				bytes: 2,
				color: "rgb(180, 180, 230)"
			},
			heaterResistanceM : {
				name: "Heater Resistance M",
				offset: 0x2EA,
				bytes: 4,
				color: "rgb(210, 230, 210)"
			},
			serialNumber : {
				name: "Serial Number",
				offset: 0x2EF,
				bytes: 17,
				color: "rgb(230, 210, 250)"
			}
		};
		
		// Encode html entities
		function htmlEncode(value) {

			// Return encoded html
			return $("<div>").text(value).html();
		}

		// Show message
		function showMessage(header, text, secondButton, secondButtonCallback, firstButton, firstButtonCallback) {
		
			// Get message
			var message = $("body > div.page-container > div.message");
		
			// Check if message is already being shown that needs confirmation
			if(message.css("z-index") == "9999" && message.find("button.confirm").eq(1).hasClass("show")) {
			
				// Append message to list
				messages.push({
					header: header,
					text: text,
					secondButton: secondButton,
					firstButton: firstButton,
					secondButtonCallback: secondButtonCallback,
					firstButtonCallback: firstButtonCallback
				});
			}
		
			// Otherwise
			else {
			
				// Skip message
				if(skippedMessages)
					skippedMessages--;
				
				// Otherwise
				else {
		
					// Blur focused element
					$("*:focus").blur();
		
					// Set header and text
					message.find("h4").text(header);
					message.find("p").html(text);

					// Set first button if specified
					var buttons = message.find("button.confirm");
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
						$("body > div.page-container > div.message > div > div > span").addClass("show");
					}
		
					// Otherwise show button area and hide loading
					else {
						$("body > div.page-container > div.message > div > div > div:not(.calibrate)").addClass("show");
						$("body > div.page-container > div.message > div > img").removeClass("show");
						$("body > div.page-container > div.message > div > div > span").removeClass("show");
			
						// Show calibration menu or print settings if applicable
						$("body > div.page-container > div.message > div > div > div.calibrate, body > div.page-container > div.message > div > div > div.printSettings").removeClass("show");
						if(secondButton == "Done")
							$("body > div.page-container > div.message > div > div > div.calibrate").addClass("show");
						else if(secondButton == "Print") {
							$("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(self.settings.settings.plugins.m3dfio.FilamentTemperature());
							$("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(self.settings.settings.plugins.m3dfio.HeatbedTemperature());
							$("body > div.page-container > div.message > div > div > div.printSettings select").val(self.settings.settings.plugins.m3dfio.FilamentType());
							$("body > div.page-container > div.message > div > div > div.printSettings").addClass("show");
						}
					}
			
					// Attach function callbacks
					if(typeof firstButtonCallback === "function")
						buttons.eq(0).one("click", firstButtonCallback);
					else
						buttons.eq(0).off("click");
					if(typeof secondButtonCallback === "function")
						buttons.eq(1).one("click", secondButtonCallback);
					else
						buttons.eq(1).off("click");
			
					// Show message
					message.addClass("show").css("z-index", "9999");
				}
			}
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
			
					message.css("z-index", '')
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
		
			// Check if a messages need to be skipped and a message is being displayed that doesn't need confirmation
			if(skippedMessages && message.hasClass("show") && !message.find("button.confirm").eq(1).hasClass("show")) {
			
				// Hide message
				skippedMessages--;
				hideMessage();
			}
		
			// Check if more messages exist and they can be displayed
			if(messages.length && message.css("z-index") != "9999") {
			
				// Skip messages
				while(skippedMessages && messages.length) {
					skippedMessages--;
					messages.shift();
				}
				
				// Show next message
				if(messages.length) {
					var message = messages.shift();
					showMessage(message.header, message.text, message.secondButton, message.secondButtonCallback, message.firstButton, message.firstButtonCallback);
				}
			}
		}, 500);
		
		// Capitalize
		function capitalize(string) {
		
			// Return capitalized string
			return string.toLowerCase().replace(/\b./g, function(character) {
				return character.toUpperCase();
			});
		}
		
		// Save file
		function saveFile(blob, name) {
		
			// Download file
			var anchor = $("#slicing_configuration_dialog .modal-footer a.link")[0];
			anchor.href = URL.createObjectURL(blob);
			anchor.download = name;
			anchor.click();
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
		
		// Load model
		function loadModel(file) {

			// View port
			viewport = {

				// Data members
				scene: [],
				camera: null,
				renderer: null,
				orbitControls: null,
				transformControls: null,
				models: [],
				modelLoaded: false,
				sceneExported: false,
				boundaries: [],
				showBoundaries: false,
				measurements: [],
				showMeasurements: false,
				removeSelectionTimeout: null,
				savedMatrix: null,
				cutShape: null,
				cutShapeOutline: null,

				// Initialize
				init: function() {
				
					// Check if using a heatbed
					if(usingHeatbed) {
					
						// Adjust bed Z values
						bedLowMaxZ = 5.0 + heatbedHeight;
						bedLowMinZ = 0.0 + heatbedHeight;
						bedMediumMinZ = bedLowMaxZ;
					}
					
					// otherwise
					else {
					
						// Set bed Z values to defaults
						bedLowMaxZ = 5.0;
						bedLowMinZ = 0.0;
						bedMediumMinZ = bedLowMaxZ;
					}

					// Create scene
					for(var i = 0; i < 2; i++)
						this.scene[i] = new THREE.Scene();

					// Create camera
					var SCREEN_WIDTH = $("#slicing_configuration_dialog").width(), SCREEN_HEIGHT = $("#slicing_configuration_dialog").height() - 123;
					var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
					this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
					this.scene[0].add(this.camera);
					this.camera.position.set(0, 50, -340);
					this.camera.lookAt(new THREE.Vector3(0, 0, 0));

					// Create renderer
					this.renderer = new THREE.WebGLRenderer({
						antialias: true
					});
					this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
					this.renderer.autoClear = false;

					// Create controls
					this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
					this.orbitControls.target.set(0, 54.9, 0);
					this.orbitControls.minDistance = 200;
					this.orbitControls.maxDistance = 500;
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
					var dirLight = new THREE.DirectionalLight(0xFFFFFF);
					dirLight.position.set(200, 200, 1000).normalize();
					this.camera.add(dirLight);
					this.camera.add(dirLight.target);
		
					// Create sky box
					var skyBoxGeometry = new THREE.CubeGeometry(10000, 10000, 10000);
					var skyBoxMaterial = new THREE.MeshBasicMaterial({
						color: 0xFCFCFC,
						side: THREE.BackSide
					});
					var skyBox = new THREE.Mesh(skyBoxGeometry, skyBoxMaterial);
					this.scene[0].add(skyBox);
				
					// Create print bed
					var mesh = new THREE.Mesh(new THREE.CubeGeometry(121, 121, bedLowMinZ), new THREE.MeshBasicMaterial({
						color: 0x000000,
						side: THREE.DoubleSide
					}));
					mesh.position.set(0, -0.25 + bedLowMinZ / 2, 0);
					mesh.rotation.set(Math.PI / 2, 0, 0);
					mesh.renderOrder = 4;
				
					// Add print bed to scene
					viewport.scene[0].add(mesh);

					// Load printer model
					var loader = new THREE.STLLoader();
					loader.load("/plugin/m3dfio/static/files/printer.stl", function(geometry) {

						// Create printer's mesh
						var mesh = new THREE.Mesh(geometry, printerMaterials[self.settings.settings.plugins.m3dfio.PrinterColor()]);
	
						// Set printer's orientation
						mesh.rotation.set(3 * Math.PI / 2, 0, Math.PI);
						mesh.position.set(0, 53.35, 0);
						mesh.scale.set(1.233792, 1.236112, 1.233333);
						mesh.renderOrder = 3;
		
						// Append model to list
						viewport.models.push({mesh: mesh, type: "stl", glow: null});
	
						// Add printer to scene
						viewport.scene[0].add(mesh);
					
						// Load logo
						var loader = new THREE.TextureLoader();
						loader.load("/plugin/m3dfio/static/img/logo.png", function (map) {
					
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
							viewport.scene[0].add(mesh);
			
							// Render
							viewport.render();
				
							// Import model
							viewport.importModel(file, "stl");
						});
					});
			
					// Create measurement material
					var measurementMaterial = new THREE.LineBasicMaterial({
						color: 0x0000ff,
						side: THREE.FrontSide
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
		
					// Go through all boundaries
					for(var i = 0; i < this.boundaries.length; i++) {
		
						// Add boundaries to scene
						this.boundaries[i].geometry.computeFaceNormals();
						this.boundaries[i].geometry.computeVertexNormals();
						this.boundaries[i].position.x += extruderCenterX;
						this.boundaries[i].position.z -= extruderCenterY;
						this.boundaries[i].visible = false;
						
						// Don't add bottom boundary to scene
						if(i)
							this.scene[0].add(this.boundaries[i]);
					}
		
					// Render
					viewport.render();
		
					// Enable events
					this.transformControls.addEventListener("mouseDown", this.startTransform);
					this.transformControls.addEventListener("mouseUp", this.endTransform);
					this.transformControls.addEventListener("mouseUp", this.fixModelY);
					this.transformControls.addEventListener("change", this.updateModelChanges);
					this.transformControls.addEventListener("change", this.render);
					this.orbitControls.addEventListener("change", this.render);
					$(document).on("mousedown.viewport", this.mouseDownEvent);
					$(window).on("resize.viewport", this.resizeEvent);
					$(window).on("keydown.viewport", this.keyDownEvent);
					$(window).on("keyup.viewport", this.keyUpEvent);
				},
	
				// Start transform
				startTransform: function() {
		
					// Save matrix
					viewport.savedMatrix = viewport.transformControls.object.matrix.clone();
	
					// Blur input
					$("#slicing_configuration_dialog .modal-extra div.values input").blur();
	
					// Disable orbit controls
					viewport.orbitControls.enabled = false;
				},
	
				// End transform
				endTransform: function() {
		
					// Clear saved matrix
					viewport.savedMatrix = null;
	
					// Enable orbit controls
					viewport.orbitControls.enabled = true;
				},

				// Import model
				importModel: function(file, type) {

					// Clear model loaded
					viewport.modelLoaded = false;
	
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
					else {
						viewport.modelLoaded = true;
						return;
					}

					// Load model
					loader.load(file, function(geometry) {

						// Center model
						geometry.center();

						// Create model's mesh
						var mesh = new THREE.Mesh(geometry, filamentMaterials[self.settings.settings.plugins.m3dfio.FilamentColor()]);

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
						mesh.updateMatrix();
						mesh.geometry.applyMatrix(mesh.matrix);
						mesh.position.set(0, 0, 0);
						mesh.rotation.set(0, 0, 0);
						mesh.scale.set(1, 1, 1);
						mesh.renderOrder = 0;

						// Add model to scene
						viewport.scene[0].add(mesh);
		
						// Append model to list
						viewport.models.push({mesh: mesh, type: type, glow: null});
					
						// Select model
						viewport.removeSelection();
						viewport.selectModel(mesh);

						// Fix model's Y
						viewport.fixModelY();
			
						// Set model loaded
						viewport.modelLoaded = true;
					});
				},

				// Key down event
				keyDownEvent: function(event) {
	
					// Check if an input is not focused
					if(!$("input:focus").length) {

						// Check what key was pressed
						switch(event.keyCode) {
					
							// Check if A is pressed
							case 65 :
				
								// Check if ctrl is pressed
								if(event.ctrlKey) {
						
									// Prevent default action
									event.preventDefault();
							
									// Get currently selected model
									var current = viewport.transformControls.object;
							
									// Go through all models
									for(var i = 1; i < viewport.models.length; i++)
							
										// Check if not currently selected model
										if(viewport.models[i].mesh !== current)
							
											// Select first model
											viewport.selectModel(viewport.models[i].mesh);
							
									// Select currently selected model
									if(current)
										viewport.selectModel(current);
							
									// Render
									viewport.render();
								}
							break;
	
							// Check if tab was pressed
							case 9 :
		
								// Prevent default action
								event.preventDefault();
								
								// Check if not cutting models
								if(viewport.cutShape === null) {
	
									// Check if an object is selected
									if(viewport.transformControls.object) {
		
										// Go through all models
										for(var i = 1; i < viewport.models.length; i++)
			
											// Check if model is currently selected
											if(viewport.models[i].mesh == viewport.transformControls.object) {
								
												// Check if shift isn't pressed
												if(!event.shiftKey)
									
													// Remove selection
													viewport.removeSelection();
								
												// Check if model isn't the last one
												if(i != viewport.models.length - 1)
									
													// Select next model
													viewport.selectModel(viewport.models[i + 1].mesh);
									
												// Otherwise
												else
									
													// Select first model
													viewport.selectModel(viewport.models[1].mesh);
					
												// Break
												break;
											}
									}
				
									// Otherwise check if a model exists
									else if(viewport.models.length > 1)
			
										// Select first model
										viewport.selectModel(viewport.models[1].mesh);
									
									// Render
									viewport.render();
								}
								
								// Otherwise
								else {
								
									// Check if cut chape is a cube
									if(viewport.cutShape.geometry.type == "BoxGeometry")
									
										// Change cut shape to a sphere
										viewport.setCutShape("sphere");
									
									// Otherwise check if cut shape is a sphere
									else if(viewport.cutShape.geometry.type == "SphereGeometry")
									
										// Change cut shape to a sube
										viewport.setCutShape("cube");
								}
							break;
	
							// Check if delete was pressed
							case 46 :
		
								// Check if an object is selected
								if(viewport.transformControls.object)
			
									// Delete model
									viewport.deleteModel();
							break;
			
		
							// Check if shift was pressed
							case 16 :
		
								// Enable grid and rotation snap
								viewport.enableSnap();
							break;

							// Check if W was pressed
							case 87 :
	
								// Set selection mode to translate
								viewport.setMode("translate");
							break;
	
							// Check if E was pressed
							case 69 :
	
								// Set selection mode to rotate
								viewport.setMode("rotate");
							break;
	
							// Check if R was pressed
							case 82 :
	
								// Set selection mode to scale
								viewport.setMode("scale");
							break;
						
							// Check if enter was pressed
							case 13 :
						
								// Check if cutting models
								if(viewport.cutShape !== null)
							
									// Apply cut
									viewport.applyCut();
							break;
						}
					}
				},

				// Key up event
				keyUpEvent: function(event) {

					// Check what key was pressed
					switch(event.keyCode) {
		
						// Check if shift was released
						case 16 :
		
							// Disable grid and rotation snap
							viewport.disableSnap();
						break;
					}
				},

				// Mouse down event
				mouseDownEvent: function(event) {

					// Check if not in cutting models and not clicking on a button or input
					if(viewport.cutShape === null && !$(event.target).is("button, img, input")) {

						// Initialize variables
						var raycaster = new THREE.Raycaster();
						var mouse = new THREE.Vector2();
						var offset = $(viewport.renderer.domElement).offset();
	
						// Set mouse coordinates
						mouse.x = ((event.clientX - offset.left) / viewport.renderer.domElement.clientWidth) * 2 - 1;
						mouse.y = - ((event.clientY - offset.top) / viewport.renderer.domElement.clientHeight) * 2 + 1;
	
						// Set ray caster's perspective
						raycaster.setFromCamera(mouse, viewport.camera);
	
						// Get models' meshes
						var modelMeshes = []
						for(var i = 0; i < viewport.models.length; i++)
							modelMeshes.push(viewport.models[i].mesh);
	
						// Get objects that intersect ray caster
						var intersects = raycaster.intersectObjects(modelMeshes); 
	
						// Check if an object intersects and it's not the printer
						if(intersects.length > 0 && intersects[0].object != modelMeshes[0]) {
				
							// Check if ctrl is pressed
							if(event.ctrlKey) {
					
								// Go through all models
								for(var i = 0; i < viewport.models.length; i++)
						
									// Check if model was selected
									if(viewport.models[i].mesh == intersects[0].object) {
							
										// Set model's material
										viewport.models[i].mesh.material = filamentMaterials[self.settings.settings.plugins.m3dfio.FilamentColor()];
		
										// Remove glow
										viewport.scene[1].remove(viewport.models[i].glow);
										viewport.models[i].glow = null;
			
										// Remove selection
										if(viewport.models[i].mesh == viewport.transformControls.object) {
											viewport.transformControls.detach();
											for(var j = 0; j < viewport.models.length; j++)
												if(viewport.models[j].glow && j != i)
													viewport.selectModel(viewport.models[j].mesh)
										}
								
										// Update model changes
										viewport.updateModelChanges();
								
										// Break;
										break;
									}
							}
					
							// Otherwise
							else {
				
								// Check if shift isn't pressed
								if(!event.shiftKey)
				
									// Remove selection
									viewport.removeSelection();
				
								// Select object
								viewport.selectModel(intersects[0].object);
							}
						}
	
						// Otherwise
						else {
			
							// Set remove selection interval
							viewport.removeSelectionTimeout = setTimeout(function() {
				
								// Remove selection
								viewport.removeSelection();
					
								// Render
								viewport.render();
							}, 80);
				
							$(document).on("mousemove.viewport", viewport.stopRemoveSelectionTimeout);
						}
			
						// Render
						viewport.render();
					}
				},
		
				// Stop remove selection timeout
				stopRemoveSelectionTimeout: function() {
	
					// Clear remove selection timeout
					clearTimeout(viewport.removeSelectionTimeout);
				},
	
				// Enable snap
				enableSnap: function() {
	
					// Enable grid and rotation snap
					viewport.transformControls.setTranslationSnap(5);
					viewport.transformControls.setScaleSnap(0.05);
					viewport.transformControls.setRotationSnap(THREE.Math.degToRad(15));
					$("#slicing_configuration_dialog .modal-extra button.snap").addClass("disabled");
				},
	
				// Disable snap
				disableSnap: function() {
	
					// Disable grid and rotation snap
					viewport.transformControls.setTranslationSnap(null);
					viewport.transformControls.setScaleSnap(null);
					viewport.transformControls.setRotationSnap(null);
					$("#slicing_configuration_dialog .modal-extra button.snap").removeClass("disabled");
				},
	
				// Set mode
				setMode: function(mode) {
	
					switch(mode) {
		
						// Check if translate mode
						case "translate" :
			
							// Set selection mode to translate
							viewport.transformControls.setMode("translate");
							viewport.transformControls.space = "world";
						break;
			
						// Check if rotate mode
						case "rotate" :
			
							// Set selection mode to rotate
							viewport.transformControls.setMode("rotate");
							viewport.transformControls.space = "local";
						break;
			
						// Check if scale mode
						case "scale" :
			
							// Set selection mode to scale
							viewport.transformControls.setMode("scale");
							viewport.transformControls.space = "local";
						break;
					}
		
					// Render
					viewport.render();
				},

				// Resize event
				resizeEvent: function() {

					// Update camera
					viewport.camera.aspect = $("#slicing_configuration_dialog").width() / ($("#slicing_configuration_dialog").height() - 123);
					viewport.camera.updateProjectionMatrix();
					viewport.renderer.setSize($("#slicing_configuration_dialog").width(), $("#slicing_configuration_dialog").height() - 123);
		
					// Render
					viewport.render();
				},

				// Export scene
				exportScene: function() {
			
					// Clear scene exported
					viewport.sceneExported = false;

					// Initialize variables
					var centerX = -(extruderCenterX - (bedLowMaxX + bedLowMinX) / 2) + modelCenterOffsetX;
					var centerZ = extruderCenterY - (bedLowMaxY + bedLowMinY) / 2 + modelCenterOffsetY;
					var mergedGeometry = new THREE.Geometry();
				
					// Go through all models
					for(var i = 1; i < viewport.models.length; i++) {
	
						// Get current model
						var model = viewport.models[i];

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
					centerX /= (viewport.models.length - 1);
					centerZ /= (viewport.models.length - 1);
			
					// Save model's center
					modelCenter = [centerX, centerZ];
	
					// Create merged mesh from merged geometry
					var mergedMesh = new THREE.Mesh(mergedGeometry);
	
					// Get merged mesh as an STL
					var exporter = new THREE.STLBinaryExporter();
					var stl = new Blob([exporter.parse(mergedMesh)], {type: "text/plain"});
				
					// Set scene exported
					viewport.sceneExported = true;
				
					// Return STL
					return stl;
				},

				// Destroy
				destroy: function() {

					// Disable events
					$(document).off("mousedown.viewport mousemove.viewport");
					$(window).off("resize.viewport keydown.viewport keyup.viewport");

					// Clear viewport
					viewport = null;
				},

				// Fix model Y
				fixModelY: function() {
			
					// Go through all models
					for(var i = 1; i < viewport.models.length; i++)

						// Check if model is selected
						if(viewport.models[i].glow) {

							// Get model's boundary box
							var boundaryBox = new THREE.Box3().setFromObject(viewport.models[i].mesh);
							boundaryBox.min.sub(viewport.models[i].mesh.position);
							boundaryBox.max.sub(viewport.models[i].mesh.position);

							// Set model's lowest Y value to be on the bed
							viewport.models[i].mesh.position.y -= viewport.models[i].mesh.position.y + boundaryBox.min.y - bedLowMinZ;
						}
				
					// Check if cutting models
					if(viewport.cutShape !== null) {

						// Select cut shape
						viewport.removeSelection();
						viewport.transformControls.attach(viewport.cutShape);
					}
			
					// Update boundaries
					viewport.updateBoundaries();
			
					// Upate measurements
					viewport.updateModelChanges();
			
					// Render
					viewport.render();
				},
	
				// Clone model
				cloneModel: function() {
		
					// Clear model loaded
					viewport.modelLoaded = false;
			
					// Initialize clones models
					var clonedModels = [];
			
					// Go through all models
					for(var i = 1; i < viewport.models.length; i++)

						// Check if model is selected
						if(viewport.models[i].glow) {

							// Clone model
							var clonedModel = new THREE.Mesh(viewport.models[i].mesh.geometry.clone(), viewport.models[i].mesh.material.clone());
		
							// Copy original orientation
							clonedModel.applyMatrix(viewport.models[i].mesh.matrix);
		
							// Add cloned model to scene
							viewport.scene[0].add(clonedModel);
		
							// Append model to list
							viewport.models.push({mesh: clonedModel, type: viewport.models[i].type, glow: null});
					
							// Append cloned model to list
							if(viewport.models[i].mesh == viewport.transformControls.object)
								clonedModels.unshift(clonedModel);
							else
								clonedModels.push(clonedModel);
						}
			
					// Go through all cloned models
					for(var i = clonedModels.length - 1; i >= 0; i--)
			
						// Select model
						viewport.selectModel(clonedModels[i]);

					// Fix model's Y
					viewport.fixModelY();
				
					// Remove current selection
					viewport.removeSelection();
				
					// Render
					viewport.render();
				
					setTimeout(function() {
				
						// Go through all cloned models
						for(var i = clonedModels.length - 1; i >= 0; i--)
			
							// Select model
							viewport.selectModel(clonedModels[i]);
			
						// Render
						viewport.render();
			
						// Set model loaded
						viewport.modelLoaded = true;
					}, 200);
				},
	
				// Reset model
				resetModel: function() {
			
					// Check if cutting models
					if(viewport.cutShape !== null) {
				
						// Reset cut shape's orientation
						viewport.cutShape.position.set(0, bedHighMaxZ - bedLowMinZ - viewport.models[0].mesh.position.y, 0);
						viewport.cutShape.rotation.set(0, 0, 0);
						viewport.cutShape.scale.set(1, 1, 1);
					}
				
					// Otherwise
					else
			
						// Go through all models
						for(var i = 1; i < viewport.models.length; i++)

							// Check if model is selected
							if(viewport.models[i].glow) {
				
								// Reset model's orientation
								viewport.models[i].mesh.position.set(0, 0, 0);
								viewport.models[i].mesh.rotation.set(0, 0, 0);
								viewport.models[i].mesh.scale.set(1, 1, 1);
							}
					
					// Fix model's Y
					viewport.fixModelY();
				},
	
				// Delete model
				deleteModel: function() {
			
					// Check if cutting models
					if(viewport.cutShape !== null) {
				
						// Remove cut shape
						viewport.scene[0].remove(viewport.cutShape);
						viewport.scene[0].remove(viewport.cutShapeOutline);
						viewport.cutShape = null;
						viewport.cutShapeOutline = null;
					
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
						for(var i = 1; i < viewport.models.length; i++)

							// Check if model is selected
							if(viewport.models[i].glow) {
				
								// Remove model
								viewport.scene[0].remove(viewport.models[i].mesh);
								viewport.scene[1].remove(viewport.models[i].glow);
								viewport.models.splice(i--, 1);
							}
	
					// Remove selection
					viewport.transformControls.setAllowedTranslation("XZ");
					viewport.transformControls.detach();
	
					// Update model changes
					viewport.updateModelChanges();
			
					// Update boundaries
					viewport.updateBoundaries();
			
					// Render
					viewport.render();
				},
	
				// Remove selection
				removeSelection: function() {
		
					// Check if an object is selected
					if(viewport.transformControls.object) {
	
						// Go through all models
						for(var i = 1; i < viewport.models.length; i++)
		
							// Check if glow exists
							if(viewport.models[i].glow) {
	
								// Set model's material
								viewport.models[i].mesh.material = filamentMaterials[self.settings.settings.plugins.m3dfio.FilamentColor()];
		
								// Remove glow
								viewport.scene[1].remove(viewport.models[i].glow);
								viewport.models[i].glow = null;
							}
			
						// Remove selection
						viewport.transformControls.detach();
		
						// Update model changes
						viewport.updateModelChanges();
					}
				},
	
				// Select model
				selectModel: function(model) {
		
					// Create glow material
					var glowMaterial = new THREE.ShaderMaterial({
						uniforms: { 
							"c": {
								type: 'f',
								value: 1.0
							},

							"p":   {
								type: 'f',
								value: 1.4
							},

							glowColor: {
								type: 'c',
								value: new THREE.Color(0xffff00)
							},

							viewVector: {
								type: "v3",
								value: viewport.camera.position
							}
						},
						vertexShader: vertexShader,
						fragmentShader: fragmentShader,
						side: THREE.FrontSide,
						blending: THREE.AdditiveBlending,
						transparent: true
					});
			
					// Go through all models
					for(var i = 1; i < viewport.models.length; i++)
			
						// Check if model is being selected
						if(viewport.models[i].mesh == model) {
				
							// Select model
							viewport.transformControls.attach(model);
		
							// Set model's material
							model.material = new THREE.MeshLambertMaterial({
								color: 0xEC9F3B,
								side: THREE.DoubleSide
							});
					
							// Remove existing glow
							if(viewport.models[i].glow !== null)
								viewport.scene[1].remove(viewport.models[i].glow);
					
							// Create glow
							model.updateMatrix();
							viewport.models[i].glow = new THREE.Mesh(model.geometry.clone(), glowMaterial);
						   	viewport.models[i].glow.applyMatrix(model.matrix);
						    	
						    	// Add glow to scene
							viewport.scene[1].add(viewport.models[i].glow);
		
							// Update model changes
							viewport.updateModelChanges();
						}
				
						// Otherwise check if model is selected
						else if(viewport.models[i].glow !== null)
				
							// Set model's glow color
							viewport.models[i].glow.material.uniforms.glowColor.value.setHex(0xFFFFB3);
				},
		
				// Apply changes
				applyChanges: function(name, value) {

					// Get currently selected model
					var model = viewport.transformControls.object;
			
					// Save matrix
					viewport.savedMatrix = model.matrix.clone();

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
						if(name == 'x')
							model.scale.x = parseFloat(value) == 0 ? 0.000000000001 : parseFloat(value);
						else if(name == 'y')
							model.scale.y = parseFloat(value) == 0 ? 0.000000000001 : parseFloat(value);
						else if(name == 'z')
							model.scale.z = parseFloat(value == 0 ? 0.000000000001 : parseFloat(value));
					}
			
					// Apply group transformation
					viewport.applyGroupTransformation();
			
					// Clear saved matrix
					viewport.savedMatrix = null;

					// Fix model's Y
					viewport.fixModelY();
				},
	
				// Update model changes
				updateModelChanges: function() {
		
					// Get currently selected model
					var model = viewport.transformControls.object;
				
					// Check if a showing measurements, a model is currently selected, and not cutting models
					if(viewport.showMeasurements && model && viewport.cutShape === null) {
		
						// Get model's boundary box
						var boundaryBox = new THREE.Box3().setFromObject(model);
			
						// Set width measurement
						viewport.measurements[0][0].geometry.vertices[0].set(boundaryBox.max.x + 1, boundaryBox.min.y - 1, boundaryBox.min.z - 1);
						viewport.measurements[0][0].geometry.vertices[1].set(boundaryBox.min.x - 1, boundaryBox.min.y - 1, boundaryBox.min.z - 1);
						viewport.measurements[0][1].set(boundaryBox.max.x + (boundaryBox.min.x - boundaryBox.max.x) / 2, boundaryBox.min.y, boundaryBox.min.z);
						$("#slicing_configuration_dialog .modal-extra div.measurements > p.width").text((boundaryBox.max.x - boundaryBox.min.x).toFixed(3) + "mm");
		
						// Set depth measurement
						viewport.measurements[1][0].geometry.vertices[0].set(boundaryBox.min.x - 1, boundaryBox.min.y - 1, boundaryBox.min.z - 1);
						viewport.measurements[1][0].geometry.vertices[1].set(boundaryBox.min.x - 1, boundaryBox.min.y - 1, boundaryBox.max.z + 1);
						viewport.measurements[1][1].set(boundaryBox.min.x, boundaryBox.min.y, boundaryBox.min.z + (boundaryBox.max.z - boundaryBox.min.z) / 2);
						$("#slicing_configuration_dialog .modal-extra div.measurements > p.depth").text((boundaryBox.max.z - boundaryBox.min.z).toFixed(3) + "mm");
			
						// Set height measurement
						viewport.measurements[2][0].geometry.vertices[0].set(boundaryBox.min.x - 1, boundaryBox.min.y - 1, boundaryBox.max.z + 1);
						viewport.measurements[2][0].geometry.vertices[1].set(boundaryBox.min.x - 1, boundaryBox.max.y + 1, boundaryBox.max.z + 1);
						viewport.measurements[2][1].set(boundaryBox.min.x, boundaryBox.min.y + (boundaryBox.max.y - boundaryBox.min.y) / 2, boundaryBox.max.z);
						$("#slicing_configuration_dialog .modal-extra div.measurements > p.height").text((boundaryBox.max.y - boundaryBox.min.y).toFixed(3) + "mm");
			
						// Show measurements
						for(var i = 0; i < viewport.measurements.length; i++) {
							viewport.measurements[i][0].geometry.verticesNeedUpdate = true;
							viewport.measurements[i][0].visible = viewport.showMeasurements;
						}
			
						$("#slicing_configuration_dialog .modal-extra div.measurements > p").addClass("show");
					}
		
					// Otherwise
					else {
		
						// Hide measurements
						for(var i = 0; i < viewport.measurements.length; i++)
							viewport.measurements[i][0].visible = false;
			
						$("#slicing_configuration_dialog .modal-extra div.measurements > p").removeClass("show");
					}
		
					// Set currently active buttons
					$("#slicing_configuration_dialog .modal-extra button.translate, #slicing_configuration_dialog .modal-extra button.rotate, #slicing_configuration_dialog .modal-extra button.scale").removeClass("disabled");
					$("#slicing_configuration_dialog .modal-extra div.values").removeClass("translate rotate scale").addClass(viewport.transformControls.getMode());
					$("#slicing_configuration_dialog .modal-extra button." + viewport.transformControls.getMode()).addClass("disabled");

					// Check if a model is currently selected
					if(model) {
				
						// Enable delete, clone, and reset
						$("#slicing_configuration_dialog .modal-extra button.delete, #slicing_configuration_dialog .modal-extra button.clone, #slicing_configuration_dialog .modal-extra button.reset").removeClass("disabled");

						// Show values
						$("#slicing_configuration_dialog .modal-extra div.values div").addClass("show").children('p').addClass("show");
						if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("translate") && viewport.cutShape === null)
							$("#slicing_configuration_dialog .modal-extra div.values input[name=\"y\"]").parent().removeClass("show");

						// Check if an input is not focused
						if(!$("#slicing_configuration_dialog .modal-extra input:focus").length) {

							// Check if in translate mode
							if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("translate")) {

								// Display position values
								$("#slicing_configuration_dialog .modal-extra div.values p span").text("mm");
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"x\"]").val((model.position.x.toFixed(3) == 0 ? 0 : -model.position.x).toFixed(3));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"y\"]").val(model.position.y.toFixed(3));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"z\"]").val(model.position.z.toFixed(3));
							}

							// Otherwise check if in rotate mode
							else if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("rotate")) {

								// Display rotation values
								$("#slicing_configuration_dialog .modal-extra div.values p span").text('°');
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"x\"]").val((model.rotation.x * 180 / Math.PI).toFixed(3));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"y\"]").val((model.rotation.y * 180 / Math.PI).toFixed(3));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"z\"]").val((model.rotation.z * 180 / Math.PI).toFixed(3));
							}

							// Otherwise check if in scale mode
							else if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("scale")) {

								// Display scale values
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"x\"]").val(model.scale.x.toFixed(3));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"y\"]").val(model.scale.y.toFixed(3));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"z\"]").val(model.scale.z.toFixed(3));
							}
						}
			
						// Apply group transformation
						viewport.applyGroupTransformation();
					
						// Go through all models
						var numberOfModelsSelected = 0;
						for(var i = 1; i < viewport.models.length; i++)
		
							// Check if glow exists
							if(viewport.models[i].glow) {
						
								// Increment number of models selected
								numberOfModelsSelected++;
	
								// Update glow's orientation
								viewport.models[i].glow.position.copy(viewport.models[i].mesh.position);
								viewport.models[i].glow.rotation.copy(viewport.models[i].mesh.rotation);
								viewport.models[i].glow.scale.copy(viewport.models[i].mesh.scale);
							}
					
						// Enable or disable merge button
						if(numberOfModelsSelected >= 2)
							$("#slicing_configuration_dialog .modal-extra button.merge").removeClass("disabled");
						else
							$("#slicing_configuration_dialog .modal-extra button.merge").addClass("disabled");
						
						// Check if cutting models
						if(viewport.cutShape !== null) {
						
							// Update cut shape's outline's orientation
							viewport.cutShapeOutline.position.copy(viewport.cutShape.position);
							viewport.cutShapeOutline.rotation.copy(viewport.cutShape.rotation);
							viewport.cutShapeOutline.scale.copy(viewport.cutShape.scale);
						}
					}

					// Otherwise check if not cutting models
					else if(viewport.cutShape === null) {

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
				},
		
				// Apply group transformation
				applyGroupTransformation: function() {
		
					// Check if a matrix was saved
					if(viewport.savedMatrix) {
			
						// Get new matrix
						viewport.transformControls.object.updateMatrix();
						var newMatrix = viewport.transformControls.object.matrix;
				
						// Check current mode
						switch(viewport.transformControls.getMode()) {
				
							// Check if in translate mode
							case "translate" :
					
								// Get saved position
								var savedValue = new THREE.Vector3();
								savedValue.setFromMatrixPosition(viewport.savedMatrix);
				
								// Get new position
								var newValue = new THREE.Vector3();
								newValue.setFromMatrixPosition(newMatrix);
							break;
					
							// Check if in rotate mode
							case "rotate" :
					
								// Get saved position
								var savedRotation = new THREE.Euler();
								savedRotation.setFromRotationMatrix(viewport.savedMatrix);
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
								savedValue.setFromMatrixScale(viewport.savedMatrix);
				
								// Get new position
								var newValue = new THREE.Vector3();
								newValue.setFromMatrixScale(newMatrix);
							break;
						}
				
						// Get changes
						var changes = savedValue.sub(newValue);
		
						// Go through all models
						for(var i = 1; i < viewport.models.length; i++)

							// Check if glow exists
							if(viewport.models[i].glow && viewport.models[i].mesh != viewport.transformControls.object)
					
								// Check current mode
								switch(viewport.transformControls.getMode()) {
						
									// Check if in translate mode
									case "translate" :
							
										// Update model's position
										viewport.models[i].mesh.position.sub(changes);
									break;
							
									// Check if in rotate mode
									case "rotate" :
							
										// Update model's rotation
										viewport.models[i].mesh.rotation.setFromVector3(viewport.models[i].mesh.rotation.toVector3().sub(changes));
									break;
							
									// Check if in scale mode
									case "scale" :
							
										// Update model's size
										viewport.models[i].mesh.scale.sub(changes);
									break;
								}
				
						// Save new matrix
						viewport.savedMatrix = newMatrix.clone();
					}
				},
	
				// Get 2D position
				get2dPosition: function(vector) {
	
					// Initialize variables
					var clonedVector = vector.clone();
					var position = new THREE.Vector2();
		
					// Normalized device coordinate
					clonedVector.project(viewport.camera);

					// Get 2D position
					position.x = Math.round((clonedVector.x + 1) * viewport.renderer.domElement.width  / 2);
					position.y = Math.round((-clonedVector.y + 1) * viewport.renderer.domElement.height / 2);
		
					// Return position
					return position;
				},
		
				// Update boundaries
				updateBoundaries: function() {
	
					// Create maximums and minimums for bed tiers
					var maximums = [];
					var minimums = [];
					for(var i = 0; i < 3; i++) {
						maximums[i] = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
						minimums[i] = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
					}
	
					// Go through all models
					for(var i = 1; i < viewport.models.length; i++) {
	
						// Get current model
						var model = viewport.models[i].mesh;
		
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
		
					// Go through all boundaries
					for(var i = 0; i < viewport.boundaries.length; i++) {
		
						// Reset boundary
						viewport.boundaries[i].material.color.setHex(0x00FF00);
						viewport.boundaries[i].material.opacity = 0.2;
						viewport.boundaries[i].visible = viewport.showBoundaries;
						viewport.boundaries[i].renderOrder = 2;
					}
		
					// Check if models goes out of bounds on low front
					if(minimums[0].z < bedLowMinY - extruderCenterY) {
		
						// Set boundary
						viewport.boundaries[1].material.color.setHex(0xFF0000);
						viewport.boundaries[1].material.opacity = 0.7;
						viewport.boundaries[1].visible = true;
						viewport.boundaries[1].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[1].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on low back
					if(maximums[0].z > bedLowMaxY - extruderCenterY) {
		
						// Set boundary
						viewport.boundaries[2].material.color.setHex(0xFF0000);
						viewport.boundaries[2].material.opacity = 0.7;
						viewport.boundaries[2].visible = true;
						viewport.boundaries[2].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[2].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on low right
					if(maximums[0].x > bedLowMaxX - extruderCenterX) {
		
						// Set boundary
						viewport.boundaries[3].material.color.setHex(0xFF0000);
						viewport.boundaries[3].material.opacity = 0.7;
						viewport.boundaries[3].visible = true;
						viewport.boundaries[3].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[3].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on low left
					if(minimums[0].x < bedLowMinX - extruderCenterX) {
		
						// Set boundary
						viewport.boundaries[4].material.color.setHex(0xFF0000);
						viewport.boundaries[4].material.opacity = 0.7;
						viewport.boundaries[4].visible = true;
						viewport.boundaries[4].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[4].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on medium front
					if(minimums[1].z < bedMediumMinY - extruderCenterY) {
		
						// Set boundary
						viewport.boundaries[5].material.color.setHex(0xFF0000);
						viewport.boundaries[5].material.opacity = 0.7;
						viewport.boundaries[5].visible = true;
						viewport.boundaries[5].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[5].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on medium back
					if(maximums[1].z > bedMediumMaxY - extruderCenterY) {
		
						// Set boundary
						viewport.boundaries[6].material.color.setHex(0xFF0000);
						viewport.boundaries[6].material.opacity = 0.7;
						viewport.boundaries[6].visible = true;
						viewport.boundaries[6].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[6].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on medium right
					if(maximums[1].x > bedMediumMaxX - extruderCenterX) {
		
						// Set boundary
						viewport.boundaries[7].material.color.setHex(0xFF0000);
						viewport.boundaries[7].material.opacity = 0.7;
						viewport.boundaries[7].visible = true;
						viewport.boundaries[7].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[7].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on medium left
					if(minimums[1].x < bedMediumMinX - extruderCenterX) {
		
						// Set boundary
						viewport.boundaries[8].material.color.setHex(0xFF0000);
						viewport.boundaries[8].material.opacity = 0.7;
						viewport.boundaries[8].visible = true;
						viewport.boundaries[8].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[8].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on high front
					if(minimums[2].z < bedHighMinY - extruderCenterY) {
		
						// Set boundary
						viewport.boundaries[9].material.color.setHex(0xFF0000);
						viewport.boundaries[9].material.opacity = 0.7;
						viewport.boundaries[9].visible = true;
						viewport.boundaries[9].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[9].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on high back
					if(maximums[2].z > bedHighMaxY - extruderCenterY) {
		
						// Set boundary
						viewport.boundaries[10].material.color.setHex(0xFF0000);
						viewport.boundaries[10].material.opacity = 0.7;
						viewport.boundaries[10].visible = true;
						viewport.boundaries[10].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[10].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on high right
					if(maximums[2].x > bedHighMaxX - extruderCenterX) {
		
						// Set boundary
						viewport.boundaries[11].material.color.setHex(0xFF0000);
						viewport.boundaries[11].material.opacity = 0.7;
						viewport.boundaries[11].visible = true;
						viewport.boundaries[11].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[11].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on high left
					if(minimums[2].x < bedHighMinX - extruderCenterX) {
		
						// Set boundary
						viewport.boundaries[12].material.color.setHex(0xFF0000);
						viewport.boundaries[12].material.opacity = 0.7;
						viewport.boundaries[12].visible = true;
						viewport.boundaries[12].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[12].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on high top
					if(maximums[2].y > bedHighMaxZ) {
		
						// Set boundary
						viewport.boundaries[13].material.color.setHex(0xFF0000);
						viewport.boundaries[13].material.opacity = 0.7;
						viewport.boundaries[13].visible = true;
						viewport.boundaries[13].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[13].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on connector between low and medium front
					if((bedMediumMinY < bedLowMinY && viewport.boundaries[1].material.color.getHex() == 0xFF0000) || viewport.boundaries[5].material.color.getHex() == 0xFF0000) {
		
						// Set boundary
						viewport.boundaries[14].material.color.setHex(0xFF0000);
						viewport.boundaries[14].material.opacity = 0.7;
						viewport.boundaries[14].visible = true;
						viewport.boundaries[14].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[14].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on connector between low and medium back
					if((bedMediumMaxY > bedLowMaxY && viewport.boundaries[2].material.color.getHex() == 0xFF0000) || viewport.boundaries[6].material.color.getHex() == 0xFF0000) {
		
						// Set boundary
						viewport.boundaries[15].material.color.setHex(0xFF0000);
						viewport.boundaries[15].material.opacity = 0.7;
						viewport.boundaries[15].visible = true;
						viewport.boundaries[15].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[15].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on connector between low and medium right
					if((bedMediumMaxX > bedLowMaxX && viewport.boundaries[3].material.color.getHex() == 0xFF0000) || viewport.boundaries[7].material.color.getHex() == 0xFF0000) {
		
						// Set boundary
						viewport.boundaries[16].material.color.setHex(0xFF0000);
						viewport.boundaries[16].material.opacity = 0.7;
						viewport.boundaries[16].visible = true;
						viewport.boundaries[16].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[16].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on connector between low and medium left
					if((bedMediumMinX < bedLowMinX && viewport.boundaries[4].material.color.getHex() == 0xFF0000) || viewport.boundaries[8].material.color.getHex() == 0xFF0000) {
		
						// Set boundary
						viewport.boundaries[17].material.color.setHex(0xFF0000);
						viewport.boundaries[17].material.opacity = 0.7;
						viewport.boundaries[17].visible = true;
						viewport.boundaries[17].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[17].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on connector between medium and high front
					if((bedHighMinY < bedMediumMinY && viewport.boundaries[5].material.color.getHex() == 0xFF0000) || viewport.boundaries[9].material.color.getHex() == 0xFF0000) {
		
						// Set boundary
						viewport.boundaries[18].material.color.setHex(0xFF0000);
						viewport.boundaries[18].material.opacity = 0.7;
						viewport.boundaries[18].visible = true;
						viewport.boundaries[18].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[18].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on connector between medium and high back
					if((bedHighMaxY > bedMediumMaxY && viewport.boundaries[6].material.color.getHex() == 0xFF0000) || viewport.boundaries[10].material.color.getHex() == 0xFF0000) {
		
						// Set boundary
						viewport.boundaries[19].material.color.setHex(0xFF0000);
						viewport.boundaries[19].material.opacity = 0.7;
						viewport.boundaries[19].visible = true;
						viewport.boundaries[19].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[19].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on connector between medium and high right
					if((bedHighMaxX > bedMediumMaxX && viewport.boundaries[7].material.color.getHex() == 0xFF0000) || viewport.boundaries[11].material.color.getHex() == 0xFF0000) {
		
						// Set boundary
						viewport.boundaries[20].material.color.setHex(0xFF0000);
						viewport.boundaries[20].material.opacity = 0.7;
						viewport.boundaries[20].visible = true;
						viewport.boundaries[20].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[20].visible = viewport.showBoundaries;
		
					// Check if models goes out of bounds on connector between medium and high left
					if((bedHighMinX < bedMediumMinX && viewport.boundaries[8].material.color.getHex() == 0xFF0000) || viewport.boundaries[12].material.color.getHex() == 0xFF0000) {
		
						// Set boundary
						viewport.boundaries[21].material.color.setHex(0xFF0000);
						viewport.boundaries[21].material.opacity = 0.7;
						viewport.boundaries[21].visible = true;
						viewport.boundaries[21].renderOrder = 1;
					}
		
					// Otherwise
					else
		
						// Set boundary's visibility
						viewport.boundaries[21].visible = viewport.showBoundaries;
				},
			
				// Apply cut
				applyCut: function() {
				
					// Display cover
					$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").text("Applying cut…");

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
						if(viewport.cutShape.geometry.type == "SphereGeometry")
							viewport.cutShape.geometry = new THREE.SphereGeometry(25, 25, 25);
				
						// Update cut shape's geometry
						viewport.cutShape.geometry.applyMatrix(viewport.cutShape.matrix);
						viewport.cutShape.position.set(0, 0, 0);
						viewport.cutShape.rotation.set(0, 0, 0);
						viewport.cutShape.scale.set(1, 1, 1);
			
						// Go through all models
						for(var i = 1; i < viewport.models.length; i++) {
				
							// Update model's geometry
							viewport.models[i].mesh.geometry.applyMatrix(viewport.models[i].mesh.matrix);
							viewport.models[i].mesh.position.set(0, 0, 0);
							viewport.models[i].mesh.rotation.set(0, 0, 0);
							viewport.models[i].mesh.scale.set(1, 1, 1);
				
							// Create difference and intersection meshes
							var cutShapeBsp = new ThreeBSP(viewport.cutShape);
							var modelBsp = new ThreeBSP(viewport.models[i].mesh);
							var meshDifference = modelBsp.subtract(cutShapeBsp).toMesh(new THREE.MeshLambertMaterial(filamentMaterials[self.settings.settings.plugins.m3dfio.FilamentColor()]));
							var meshIntersection = modelBsp.intersect(cutShapeBsp).toMesh(new THREE.MeshLambertMaterial(filamentMaterials[self.settings.settings.plugins.m3dfio.FilamentColor()]));
				
							// Delete model
							viewport.scene[0].remove(viewport.models[i].mesh);
							var type = viewport.models[i].type;
							viewport.models.splice(i--, 1);
				
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
								differences.push({mesh: meshDifference, type: type, glow: null});
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
								intersections.push({mesh: meshIntersection, type: type, glow: null});
							}
						}
				
						// Remove cut shape
						viewport.scene[0].remove(viewport.cutShape);
						viewport.scene[0].remove(viewport.cutShapeOutline);
						viewport.cutShape = null;
						viewport.cutShapeOutline = null;
						viewport.transformControls.detach();
						viewport.transformControls.setAllowedTranslation("XZ");
				
						// Go through all intersections
						for(var i = 0; i < intersections.length; i++) {
				
							// Add intersection mesh to scene
							viewport.scene[0].add(intersections[i].mesh);
				
							// Add intersection mesh to list
							viewport.models.push({mesh: intersections[i].mesh, type: intersections[i].type, glow: null});
				
							// Select intersection mesh
							viewport.selectModel(intersections[i].mesh);
						}
				
						// Go through all differences
						for(var i = 0; i < differences.length; i++) {
				
							// Add difference mesh to scene
							viewport.scene[0].add(differences[i].mesh);
				
							// Add difference mesh to list
							viewport.models.push({mesh: differences[i].mesh, type: differences[i].type, glow: null});
				
							// Select difference mesh
							viewport.selectModel(differences[i].mesh);
						}
			
						// Fix model's Y
						viewport.fixModelY();
				
						// Remove selection
						viewport.removeSelection();
				
						// Go through all intersections
						for(var i = 0; i < intersections.length; i++)
				
							// Select intersection mesh
							viewport.selectModel(intersections[i].mesh);
				
						// Upate measurements
						viewport.updateModelChanges();
	
						// Render
						viewport.render();
						
						// Hide cover
						$("#slicing_configuration_dialog .modal-cover").removeClass("show");
						setTimeout(function() {
							$("#slicing_configuration_dialog .modal-cover").css("z-index", '');
						}, 200);
					}, 300);
				},
				
				// Set cut shape
				setCutShape: function(shape) {
				
					// Initialize variables
					var changed = false;
					
					// Select button
					$("#slicing_configuration_dialog .modal-extra div.cutShape button." + shape).addClass("disabled").siblings("button").removeClass("disabled");
				
					// Check if cut shape is a sphere
					if(shape == "cube" && viewport.cutShape.geometry.type == "SphereGeometry") {
					
						// Change cut shape to a cube
						viewport.cutShape.geometry = new THREE.CubeGeometry(50, 50, 50);
						changed = true;
					}
				
					// Otherwise check if cut chape is a cube
					else if(shape == "sphere" && viewport.cutShape.geometry.type == "BoxGeometry") {
					
						// Change cut shape to a sphere
						viewport.cutShape.geometry = new THREE.SphereGeometry(25, 10, 10);
						changed = true;
					}
					
					// Check if cut shape changed
					if(changed) {
					
						// Update cut shape outline
						viewport.cutShapeOutline.geometry = viewport.lineGeometry(viewport.cutShape.geometry);

						// Render
						viewport.render();
					}
				},
			
				// Apply merge
				applyMerge: function() {
				
					// Display cover
					$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").text("Applying merge…");

					setTimeout(function() {

						// Initialize variables
						var meshUnion = viewport.transformControls.object;
				
						// Update currently selected model's geometry
						meshUnion.geometry.applyMatrix(meshUnion.matrix);
						meshUnion.position.set(0, 0, 0);
						meshUnion.rotation.set(0, 0, 0);
						meshUnion.scale.set(1, 1, 1);
			
						// Go through all models
						for(var i = 1; i < viewport.models.length; i++)
	
							// Check if glow exists and it's not the currently selected model
							if(viewport.models[i].glow && viewport.models[i].mesh != viewport.transformControls.object) {
					
								// Update model's geometry
								viewport.models[i].mesh.geometry.applyMatrix(viewport.models[i].mesh.matrix);
								viewport.models[i].mesh.position.set(0, 0, 0);
								viewport.models[i].mesh.rotation.set(0, 0, 0);
								viewport.models[i].mesh.scale.set(1, 1, 1);
					
								// Create union mesh
								var unionBsp = new ThreeBSP(meshUnion);
								var modelBsp = new ThreeBSP(viewport.models[i].mesh);
								meshUnion = unionBsp.union(modelBsp).toMesh(new THREE.MeshLambertMaterial(filamentMaterials[self.settings.settings.plugins.m3dfio.FilamentColor()]));
				
								// Delete model
								viewport.scene[0].remove(viewport.models[i].mesh);
								viewport.scene[1].remove(viewport.models[i].glow);
								viewport.models.splice(i--, 1);
				
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
						for(var i = 1; i < viewport.models.length; i++)
				
							// Check if currently selected model
							if(viewport.models[i].mesh == viewport.transformControls.object) {
					
								// Delete model
								viewport.scene[0].remove(viewport.models[i].mesh);
								viewport.scene[1].remove(viewport.models[i].glow);
								var type = viewport.models[i].type;
								viewport.models.splice(i--, 1);
						
								// Break
								break;
							}
				
						// Add union mesh to scene
						viewport.scene[0].add(meshUnion);
			
						// Add union mesh to list
						viewport.models.push({mesh: meshUnion, type: type, glow: null});
			
						// Select union mesh
						viewport.selectModel(meshUnion);
				
						// Fix model's Y
						viewport.fixModelY();
					
						// Hide cover
						$("#slicing_configuration_dialog .modal-cover").removeClass("show");
						setTimeout(function() {
							$("#slicing_configuration_dialog .modal-cover").css("z-index", '');
						}, 200);
					}, 300);
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
					viewport.transformControls.update();
					viewport.orbitControls.update();
			
					// Check if a model is currently selected
					if(viewport.transformControls.object) {
			
						// Get camera distance to model
						var distance = viewport.camera.position.distanceTo(viewport.transformControls.object.position);
						if(distance < 200)
							distance = 200;
						else if(distance > 500)
							distance = 500;

						// Set measurement size
						$("#slicing_configuration_dialog .modal-extra div.measurements > p").css("font-size", 8 + ((500 / distance) - 1) / (2.5 - 1) * (13 - 8) + "px");
	
						// Set z index order for measurement values
						var order = [];
						for(var j = 0; j < 3; j++)
							order[j] = viewport.camera.position.distanceTo(viewport.measurements[j][1]);
	
						for(var j = 0; j < 3; j++) {
							var lowest = order.indexOf(Math.max.apply(Math, order));
							$("#slicing_configuration_dialog .modal-extra div.measurements > p").eq(lowest).css("z-index", j);
							order[lowest] = Number.NEGATIVE_INFINITY;
						}
	
						// Position measurement values
						for(var j = 0; j < 3; j++) {
							var position = viewport.get2dPosition(viewport.measurements[j][1]);
							$("#slicing_configuration_dialog .modal-extra div.measurements > p").eq(j).css({"top" : position.y - 3 + "px", "left" : position.x - $("#slicing_configuration_dialog .modal-extra div.measurements > p").eq(j).width() / 2 + "px"});
						}
		
						// Go through all models
						for(var i = 1; i < viewport.models.length; i++)
		
							// Check if model is selected
							if(viewport.models[i].glow)
					
								// Update glow's view vector
								viewport.models[i].glow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(viewport.camera.position, viewport.models[i].glow.position);
					}

					// Render scene
					viewport.renderer.clear();
					viewport.renderer.render(viewport.scene[0], viewport.camera);
					viewport.renderer.clearDepth();
					viewport.renderer.render(viewport.scene[1], viewport.camera);
				}
			};

			// Create viewport
			viewport.init();
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
			
				// Set model's orientation
				mesh.position.set(0, 0, 0);
				mesh.scale.set(1, 1, 1);
				mesh.updateMatrix();
				mesh.geometry.applyMatrix(mesh.matrix);
			
				// Get mesh as an STL
				var exporter = new THREE.STLBinaryExporter();
				convertedModel = new Blob([exporter.parse(mesh)], {type: "text/plain"});
			});
		}
		
		// Add 0.01 movement control
		$("#control > div.jog-panel").eq(0).addClass("controls").find("div.distance > div").prepend(`
			<button type="button" id="control-distance001" class="btn distance" data-distance="0.01" data-bind="enable: loginState.isUser()">0.01</button>
		`);
		$("#control-distance001").attr("title", "Sets extruder's position adjustment to 0.01mm");
		$("#control-distance01").attr("title", "Sets extruder's position adjustment to 0.1mm");
		$("#control-distance1").attr("title", "Sets extruder's position adjustment to 1mm");
		$("#control-distance10").attr("title", "Sets extruder's position adjustment to 10mm");
		$("#control-distance100").attr("title", "Sets extruder's position adjustment to 100mm");
		$("#control > div.jog-panel.controls").find("div.distance > div > button:nth-of-type(3)").click();
	
		// Change tool section text
		$("#control > div.jog-panel").eq(1).addClass("extruder").find("h1").text("Extruder").after(`
			<h1 class="heatbed">Extruder</h1>
		`);

		// Create motor on control
		$("#control > div.jog-panel").eq(2).addClass("general").find("div").prepend(`
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M17'}) }" title="Turns on extruder's motor">Motors on</button>
		`);
		$("#control > div.jog-panel.general").find("button:nth-of-type(2)").attr("title", "Turns off extruder's motor");
		
		// Change fan controls
		$("#control > div.jog-panel.general").find("button:nth-of-type(2)").after(`
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M106 S255*'}) }" title="Turns on extruder's fan">Fan on</button>
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M107*'}) }" title="Turns off extruder's fan">Fan off</button>
		`);
		$("#control > div.jog-panel.general").find("button:nth-of-type(5)").remove();
		$("#control > div.jog-panel.general").find("button:nth-of-type(5)").remove();
		
		// Create absolute and relative controls, print settings, and emergency stop
		$("#control > div.jog-panel.general").find("div").append(`
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'G90'}) }" title="Sets extruder to use absolute positioning">Absolute mode</button>
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'G91'}) }" title="Sets extruder to use relative positioning">Relative mode</button>
			<button class="btn btn-block control-box" data-bind="enable: loginState.isUser()">Print settings</button>
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && loginState.isUser()">Emergency stop</button>
		`);
	
		// Add filament controls
		$("#control > div.jog-panel.general").after(`
			<div class="jog-panel filament" data-bind="visible: loginState.isUser">
				<h1>Filament</h1>
				<div>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Unload</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Load</button>
				</div>
			</div>
		`);
	
		// Add calibration controls
		$("#control > div.jog-panel.filament").after(`
			<div class="jog-panel calibration" data-bind="visible: loginState.isUser">
				<h1>Calibration</h1>
				<div>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Calibrate bed center Z0</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Calibrate bed orientation</button>
					<button class="btn btn-block control-box arrow" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-down"></i></button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Save Z as front left Z0</button>
					<button class="btn btn-block control-box arrow" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-down"></i></button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Save Z as front right Z0</button>
					<button class="btn btn-block control-box arrow" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-up"></i></button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Save Z as back right Z0</button>
					<button class="btn btn-block control-box arrow" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><i class="icon-arrow-up"></i></button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Save Z as back left Z0</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Save Z as bed center Z0</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Print 0.4mm test border</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Print backlash calibration cylinder</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Run complete bed calibration</button>
				</div>
			</div>
		`);
	
		// Add advanced controls
		$("#control > div.jog-panel.calibration").after(`
			<div class="jog-panel advanced" data-bind="visible: loginState.isUser">
				<h1>Advanced</h1>
				<div>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="/plugin/m3dfio/static/img/hengLiXin.png">HengLiXin fan</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="/plugin/m3dfio/static/img/listener.png">Listener fan</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="/plugin/m3dfio/static/img/shenzhew.png">Shenzhew fan</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="/plugin/m3dfio/static/img/xinyujie.png">Xinyujie fan</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">500mA extruder current</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">660mA extruder current</button>
					<button class="btn btn-block control-box placeHolder" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"></button>
					<button class="btn btn-block control-box placeHolder" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"></button>
					<button class="btn btn-block control-box placeHolder" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"></button>
					<p></p>
					<input type="file" accept=".rom, .bin, .hex">
				</div>
			</div>
		`);
		
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
			for(var key in eepromOffsets)
				for(var j = 0; j < eepromOffsets[key].bytes; j++)
				
					if(eepromOffsets[key].offset + j == i) {
					
						table += " style=\"background-color: " + eepromOffsets[key].color + ";\" class=\"" + key + "\" title=\"" + eepromOffsets[key].name + '"';
						j = eepromOffsets.length;
						break;
					}
			
			table += "></td>";
		}
		table += "</tr>";
		
		// Add EEPROM controls
		$("#control > div.jog-panel.advanced").after(`
			<div class="jog-panel eeprom" data-bind="visible: loginState.isUser">
				<h1>EEPROM</h1>
				<div>
					<table><tbody>` + table + `</tbody></table>
					<input data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()" type="radio" name="display" value="hexadecimal" checked><label>Hexadecimal</label>
					<input data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()" type="radio" name="display" value="decimal"><label>Decimal</label>
					<input data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()" type="radio" name="display" value="ascii"><label>ASCII</label><br>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Read EEPROM</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Write EEPROM</button>
				</div>
			</div>
		`);
	
		// Add temperature controls
		$("#control > div.jog-panel.extruder").find("div > button:nth-of-type(3)").after(`
			<div style="width: 114px;" class="slider slider-horizontal">
				<div class="slider-track">
					<div style="left: 0%; width: 0%;" class="slider-selection"></div>
					<div style="left: 0%;" class="slider-handle round"></div>
					<div style="left: 0%;" class="slider-handle round hide"></div>
				</div>
				<div style="top: -24px; left: -19px;" class="tooltip top hide">
					<div class="tooltip-arrow"></div>
					<div class="tooltip-inner"></div>
				</div>
				<input style="width: 100px;" data-bind="slider: {min: 100, max: 235, step: 1, value: flowRate, tooltip: 'hide'}" type="number">
			</div>
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && loginState.isUser()">Temperature:<span data-bind="text: flowRate() + 50 + '°C'"></span></button>
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M104 S0'}) }" title="Turns off extruder's heater">Heater off</button>
			<div class="heatbed">
				<h1 class="heatbed">Heatbed</h1>
				<div style="width: 114px;" class="slider slider-horizontal">
					<div class="slider-track">
						<div style="left: 0%; width: 0%;" class="slider-selection"></div>
						<div style="left: 0%;" class="slider-handle round"></div>
						<div style="left: 0%;" class="slider-handle round hide"></div>
					</div>
					<div style="top: -24px; left: -19px;" class="tooltip top hide">
						<div class="tooltip-arrow"></div>
						<div class="tooltip-inner"></div>
					</div>
					<input style="width: 100px;" data-bind="slider: {min: 100, max: 170, step: 1, value: feedRate, tooltip: 'hide'}" type="number">
				</div>
				<button class="btn btn-block control-box" data-bind="enable: isOperational() && loginState.isUser()">Temperature:<span data-bind="text: feedRate() -60 + '°C'"></span></button>
				<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M140 S0'}) }">Heater off</button>
			<div>
		`);
		
		// Add message
		$("body > div.page-container").append(`
			<div class="message">
				<div>
					<h4></h4>
					<img src="/plugin/m3dfio/static/img/loading.gif">
					<div>
						<p></p>
						<div class="calibrate">
							<div class="arrows">
								<button class="btn btn-block control-box arrow up"><i class="icon-arrow-up"></i></button>
								<button class="btn btn-block control-box arrow down"><i class="icon-arrow-down"></i></button>
							</div>
							<div class="distance">
								<button type="button" class="btn distance">0.01</button>
								<button type="button" class="btn distance active">0.1</button>
								<button type="button" class="btn distance">1</button>
							</div>
						</div>
						<div class="printSettings">
							<h3>Print settings</h3>
							<div class="control-group">
								<label class="control-label">Filament Temperature</label>
								<div class="controls">
									<div class="input-append degreesCelsius">
										<input type="number" step="1" min="150" max="285" class="input-block-level">
										<span class="add-on">°C</span>
									</div>
								</div>
							</div>
							<div class="control-group heatbed">
								<label class="control-label">Heatbed Temperature</label>
								<div class="controls">
									<div class="input-append degreesCelsius">
										<input type="number" step="1" min="40" max="110" class="input-block-level" data-bind="value: settings.plugins.m3dfio.HeatbedTemperature">
										<span class="add-on">°C</span>
									</div>
								</div>
							</div>
							<div class="control-group">
								<label class="control-label">Filament Type</label>
								<div class="controls">
									<select class="input-block-level" data-bind="value: settings.plugins.m3dfio.FilamentType">
										<option value="ABS">ABS (Recommended 275°C)</option>
										<option value="PLA">PLA (Recommended 215°C)</option>
										<option value="HIPS">HIPS (Recommended 265°C)</option>
										<option value="FLX">FLX (Recommended 245°C)</option>
										<option value="TGH">TGH (Recommended 245°C)</option>
										<option value="CAM">CAM (Recommended 200°C)</option>
										<option value="OTHER">Other</option>
									</select> 
								</div>
							</div>
						</div>
						<div>
							<button class="btn btn-block confirm"></button>
							<button class="btn btn-block confirm"></button>
						</div>
						<span>Do not refresh this page or disconnect from the server at this time</span>
					</div>
				</div>
			</div>
		`);
		
		// Add cover to slicer
		$("#slicing_configuration_dialog").append(`
			<div class="modal-cover">
				<img src="/plugin/m3dfio/static/img/loading.gif">
				<p></p>
			</div>
		`);
		
		// Change slicer text
		$("#slicing_configuration_dialog").find("h3").before(`
			<p class="currentMenu">Select Profile</p>
		`);
		$("#slicing_configuration_dialog").find(".control-group:nth-of-type(2) > label").text("Base Slicing Profile");
		
		// Add save button
		$("#slicing_configuration_dialog .modal-footer").append("<a href=\"#\" class=\"btn save\" data-dismiss=\"modal\" aria-hidden=\"true\">Save</a><a class=\"link\"></a>");
		
		// Allow positioning OctoPrint instance manager
		$("div.navbar-inner div.container").css("position", "relative");
		$("div.navbar-inner ul.nav.pull-right").css("position", "static");
		
		// Replace load file function
		var originalLoadFile = self.files.loadFile;
		self.files.loadFile = function(file, printAfterLoad) {
		
			// Check if using on the fly pre-processing and changing settings before print
			if(self.settings.settings.plugins.m3dfio.PreprocessOnTheFly() && self.settings.settings.plugins.m3dfio.ChangeSettingsBeforePrint()) {
			
				// Show message
				showMessage("Message", '', "Print", function() {
			
					// Hide message
					hideMessage();
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({
							command: "message",
							value: "Print Settings: " + JSON.stringify({
								filamentTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(),
								heatbedTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(),
								filamentType: $("body > div.page-container > div.message > div > div > div.printSettings select").val()
							})
						}),
						contentType: "application/json; charset=UTF-8",
					
						// On success										
						success: function() {
					
							// Print file
							function printFile() {
							
								// Save software settings
								self.settings.saveData();
								
								// Load file and print
								originalLoadFile(file, printAfterLoad);
							}
						
							// Update settings
							if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
								self.settings.requestData(printFile);
							else
								self.settings.requestData().done(printFile);
						}
					});
				}, "Cancel", function() {
			
					// Hide message
					hideMessage();
				});
			}
			
			// Otherwise
			else
			
				// Print file
				originalLoadFile(file, printAfterLoad);
		}
		
		// Print button click event
		$("#job_print").click(function(event) {
		
			// Initialize variables
			var button = $(this);
			
			// Check if not continuing with print 
			if(!continueWithPrint) {
			
				// Check if using on the fly pre-processing and changing settings before print
				if(self.settings.settings.plugins.m3dfio.PreprocessOnTheFly() && self.settings.settings.plugins.m3dfio.ChangeSettingsBeforePrint()) {
				
					// Stop default behavior
					event.stopImmediatePropagation();
			
					// Show message
					showMessage("Message", '', "Print", function() {
			
						// Hide message
						hideMessage();
				
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m3dfio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Print Settings: " + JSON.stringify({
									filamentTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(),
									heatbedTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(),
									filamentType: $("body > div.page-container > div.message > div > div > div.printSettings select").val()
								})
							}),
							contentType: "application/json; charset=UTF-8",
					
							// On success										
							success: function() {
					
								// Print file
								function printFile() {
							
									// Save software settings
									self.settings.saveData();
								
									// Continue with print
									continueWithPrint= true;
									button.click();
								}
						
								// Update settings
								if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
									self.settings.requestData(printFile);
								else
									self.settings.requestData().done(printFile);
							}
						});
					}, "Cancel", function() {
			
						// Hide message
						hideMessage();
					});
				}
			
				// Otherwise
				else {
			
					// Continue with print
					continueWithPrint= true;
					button.click();
				}
			}
			
			// Otherwise
			else
			
				// Clear continue with print
				continueWithPrint = false;
		});
		
		// Cancel print button click event
		$("#job_cancel").click(function(event) {
		
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"M65537;stop"
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
		
		// Save button click event
		$("#slicing_configuration_dialog .modal-footer a.save").click(function(event) {
		
			// Stop default behavior
			event.stopImmediatePropagation();
			
			// Blur self
			$(this).blur();
			
			// Check if saving profile
			if($("#slicing_configuration_dialog").hasClass("profile")) {
			
				// Display cover
				$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").text("Saving profile…");
				
				setTimeout(function() {
			
					// Remove comments from text
					var text = '';
					var lines = $("#slicing_configuration_dialog .modal-extra textarea").val().split('\n');
				
					for(var i = 0; i < lines.length; i++)
						if(lines[i].indexOf(';') != -1 && lines[i].indexOf(".gcode") == -1 && lines[i][0] != '\t')
							text += lines[i].substr(0, lines[i].indexOf(';')) + '\n';
						else
							text += lines[i] + '\n';
			
					// Download profile
					var blob = new Blob([text], {type: 'text/plain'});
					saveFile(blob, slicerProfileName + ".ini");
					
					// Hide cover
					$("#slicing_configuration_dialog .modal-cover").removeClass("show");
					setTimeout(function() {
						$("#slicing_configuration_dialog .modal-cover").css("z-index", '');
					}, 200);
				}, 300);
			}
			
			// Otherwise assume saving model
			else {
			
				// Display cover
				$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").text("Saving model…");
				
				setTimeout(function() {

					// Download model
					saveFile(viewport.exportScene(), modelName);

					// Wait until model is loaded
					function isSceneExported() {

						// Check if scene is exported
						if(viewport.sceneExported) {

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
					setTimeout(isSceneExported, 100);
				}, 300);
			}
		});
		
		// Disable settings
		function disableSettings() {
			
			// Go through all settings that aren't dependant
			$("#settings_plugin_m3dfio div.control-group:not(.dependant)").each(function() {
		
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
		}
		
		if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
			self.settings.requestData(disableSettings);
		else
			self.settings.requestData().done(disableSettings);
		
		// Settings checkbox change event
		$("#settings_plugin_m3dfio input[type=\"checkbox\"]").change(function() {
		
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
		});
		
		// Upload with expanded file support
		function uploadWithExpandedFileSupport(event, file, location) {
			
			// Check if uploading a OBJ, M3D, AMF, VRML, or COLLADA file
			var extension = file.name.lastIndexOf('.');
			if(extension != -1 && (file.name.substr(extension + 1).toLowerCase() == "obj" || file.name.substr(extension + 1).toLowerCase() == "m3d" || file.name.substr(extension + 1).toLowerCase() == "amf" || file.name.substr(extension + 1).toLowerCase() == "wrl" || file.name.substr(extension + 1).toLowerCase() == "dae")) {
			
				// Stop default behavior
				event.preventDefault();
				event.stopImmediatePropagation();
				
				// Set new file name
				var newFileName = file.name.substr(0, extension) + ".stl";
				
				// Display message
				showMessage("Conversion Status", htmlEncode("Converting " + file.name + " to " + newFileName));
				
				// Convert file to STL
				convertedModel = null;
				convertToStl(URL.createObjectURL(file), file.name.substr(extension + 1).toLowerCase());
				
				// Clear value
				$(event.target).val('');
				
				function conversionDone() {
				
					// Check if conversion is done
					if(convertedModel !== null) {
					
						// Create request
						var form = new FormData();
						
						// Set path to file
						if(typeof self.files.currentPath === "undefined")
							var path = newFileName;
						else if(self.files.currentPath().length)
							var path = '/' + self.files.currentPath() + '/' + newFileName;
						else
							var path = '/' + newFileName;
						form.append("file", convertedModel, path);
						
						if(typeof self.files.currentPath !== "undefined")
							path = path.substr(1);
					
						// Send request
						$.ajax({
							url: "/api/files/" + location,
							type: "POST",
							data: form,
							processData: false,
							contentType: false,

							// On success
							success: function(data) {
				
								// Hide message
								hideMessage();
						
								// Show slicing dialog
								self.files.requestData(path, location);
								self.slicing.show(location, path);
							}
						});
					}
					
					// Otherwise
					else
					
						// Check if conversion is done again
						setTimeout(conversionDone, 300);
				
				}
				setTimeout(conversionDone, 300);
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
					$("div.modal-scrollable").off("click.modal");
				}
			}
			
			// Otherwise
			else {
			
				// Check is slicer was open
				if(slicerOpen) {
				
					// Clear slicer open
					slicerOpen = false;
					
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: "Remove Temp"}),
						contentType: "application/json; charset=UTF-8"
					});
					
					setTimeout(function() {
		
						// Reset slicer menu
						slicerMenu = "Select Profile";
	
						// Set text back to next
						$("#slicing_configuration_dialog > div.modal-footer > .btn-primary").text("Next");
						
						// Destroy viewport
						if(viewport)
							viewport.destroy();
		
						// Restore slicer
						$("#slicing_configuration_dialog").removeClass("profile model");
						$("#slicing_configuration_dialog p.currentMenu").text("Select Profile");
						$("#slicing_configuration_dialog .modal-extra").remove();
						$("#slicing_configuration_dialog .modal-body").css("display", '');
						$("#slicing_configuration_dialog .modal-cover").removeClass("show").css("z-index", '');
						
						// Save software settings
						self.settings.saveData();
					}, 300);
				}
			}
		}, 300);
		
		// Slicer next button click event
		$("#slicing_configuration_dialog > div.modal-footer > .btn-primary").text("Next").click(function(event) {
		
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
					
					// Get slicer, slicer profile, printer profile, model name, model location, model path, and after slicing action
					slicerName = $("#slicing_configuration_dialog").find(".control-group:nth-of-type(1) select").val();
					slicerProfileName = $("#slicing_configuration_dialog").find(".control-group:nth-of-type(2) select").val();
					printerProfileName = $("#slicing_configuration_dialog").find(".control-group:nth-of-type(3) select").val();
					gCodeFileName = $("#slicing_configuration_dialog").find(".control-group:nth-of-type(4) input").val() + ".gco";
					
					modelLocation = self.slicing.target;
					
					if(typeof self.slicing.path !== "undefined" && self.slicing.path.length)
						modelPath = '/' + self.slicing.path + '/';
					else
						modelPath = '/'
					
					if(modelPath.length > 1)
						modelName = self.slicing.file.substr(modelPath.length - 1);
					else
						modelName = self.slicing.file
					
					afterSlicingAction = $("#slicing_configuration_dialog").find(".control-group:nth-of-type(5) select").val();
					
					// Check if slicer menu is select profile
					if(slicerMenu == "Select Profile") {
					
						// Display cover
						$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").text("Loading profile…");
						
						setTimeout(function() {
			
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m3dfio",
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

								// On success
								success: function(data) {
								
									// Send request
									$.ajax({
										url: data.path,
										type: "GET",
										contentType: "application/x-www-form-urlencoded; charset=UTF-8",

										// On success
										success: function(data) {
											
											// Hide cover
											$("#slicing_configuration_dialog .modal-cover").addClass("noTransition").removeClass("show");
											setTimeout(function() {
												$("#slicing_configuration_dialog .modal-cover").css("z-index", '').removeClass("noTransition");
											}, 200);
										
											// Display profile
											$("#slicing_configuration_dialog").addClass("profile");
											$("#slicing_configuration_dialog p.currentMenu").text("Modify Profile");
											$("#slicing_configuration_dialog .modal-body").css("display", "none");
											$("#slicing_configuration_dialog .modal-body").after(`
												<div class="modal-extra">
													<div class="templates">
														<p class="quality">Medium Quality</p>
														<div class="quality">
															<button title="Extra low quality"><img src="/plugin/m3dfio/static/img/extra%20low%20quality.png"></button>
															<button title="Low quality"><img src="/plugin/m3dfio/static/img/low%20quality.png"></button>
															<button title="Medium quality" class="disabled"><img src="/plugin/m3dfio/static/img/medium%20quality.png"></button>
															<button title="High quality"><img src="/plugin/m3dfio/static/img/high%20quality.png"></button>
															<button title="Extra high quality"><img src="/plugin/m3dfio/static/img/extra%20high%20quality.png"></button>
														</div>
														<p class="fill">Medium Fill</p>
														<div class="fill">
															<button title="Hollow thin fill"><img src="/plugin/m3dfio/static/img/hollow%20thin%20fill.png"></button>
															<button title="Hollow thick fill"><img src="/plugin/m3dfio/static/img/hollow%20thick%20fill.png"></button>
															<button title="Low fill"><img src="/plugin/m3dfio/static/img/low%20fill.png"></button>
															<button title="Medium fill" class="disabled"><img src="/plugin/m3dfio/static/img/medium%20fill.png"></button>
															<button title="High fill"><img src="/plugin/m3dfio/static/img/high%20fill.png"></button>
															<button title="Extra high fill"><img src="/plugin/m3dfio/static/img/extra%20high%20fill.png"></button>
														</div>
														<div class="settings">
															<label title="Prints a breakaway support underneath overhanging parts of the model"><input type="checkbox" checked>Use support material</label>
															<label title="Allows support material to be created on top of models"><input type="checkbox" checked>Use model on model support</label>
															<label title="Prints a raft underneath the model"><input type="checkbox" checked>Use raft</label>
														</div>
													</div>
													<div>
														<aside></aside>
														<textarea spellcheck="false"></textarea>
													</div>
													<span></span>
												</div
											`);
											$("#slicing_configuration_dialog .modal-extra textarea").val(data);
											
											// Check if using one of the provided profiles
											if(slicerName == "cura" && (slicerProfileName == "m3d_pla" || slicerProfileName == "m3d_abs" || slicerProfileName == "m3d_hips" || slicerProfileName == "m3d_flx" || slicerProfileName == "m3d_tgh"))
											
												// Show templates
												$("#slicing_configuration_dialog .modal-extra div.templates").addClass("show");
											
											// Otherwise
											else
											
												// Grow text area
												$("#slicing_configuration_dialog.profile .modal-extra div").addClass("fullSpace");
											
											// Set slicer menu
											slicerMenu = "Modify Profile";
							
											// Set button
											button.removeClass("disabled");
											
											// Skip model editor it WebGL isn't supported
											if(!Detector.webgl)
												button.text("Slice");
										
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
												
													// Get line number area
													var lineNumberArea = textArea.siblings("aside");
												
													// Check if number of lines has changes
													if(previousLineCount != numberOfLines) {
												
														// Clear existing line numbers
														lineNumberArea.empty();
												
														// Create new line numbers
														for(var i = 1; i <= numberOfLines; i++)
															lineNumberArea.append(i + "<br>");
														lineNumberArea.append("<br>");
													
														// Update previous line count
														previousLineCount = numberOfLines;
													}
												
													// Update line numbers again
													setTimeout(updateLineNumbers, 500);
												}
											}
											updateLineNumbers();
										
											// Text area scroll event
											$("#slicing_configuration_dialog .modal-extra textarea").scroll(function() {
										
												// Scroll line numbers to match text area
												$(this).siblings("aside").scrollTop($(this).scrollTop());
											});
											
											// Template checkbox change event
											$("#slicing_configuration_dialog .modal-extra div.templates > div input[type=\"checkbox\"]").change(function() {
											
												// Initialize changed settings
												var changedSettings = [];
											
												// Set if checked
												var checked = $(this).is(":checked");
												
												// Set changed settings if changing use support material
												if($(this).parent().text() == "Use support material") {
												
													if(checked)
														changedSettings.push({
															support: $("#slicing_configuration_dialog .modal-extra div.templates > div input").eq(1).is(":checked") ? "Everywhere; None, Touching buildplate, Everywhere" : "Touching buildplate; None, Touching buildplate, Everywhere"
														});
													else {
														$("#slicing_configuration_dialog .modal-extra div.templates > div input").eq(1).prop("checked", false);
														changedSettings.push({
															support: "None; None, Touching buildplate, Everywhere"
														});
													}
												}
												
												// Otherwise set changed settings if changing use model on model support
												else if($(this).parent().text() == "Use model on model support") {
												
													if(checked) {
														$("#slicing_configuration_dialog .modal-extra div.templates > div input").eq(0).prop("checked", true);
														changedSettings.push({
															support: "Everywhere; None, Touching buildplate, Everywhere"
														});
													}
													else
														changedSettings.push({
															support: $("#slicing_configuration_dialog .modal-extra div.templates > div input").eq(0).is(":checked") ? "Touching buildplate; None, Touching buildplate, Everywhere" : "None; None, Touching buildplate, Everywhere"
														});
												}
												
												// Otherwise set changed settings if changing use raft
												else if($(this).parent().text() == "Use raft") {
												
													if(checked)
														changedSettings.push({
															platform_adhesion: "Raft; None, Brim, Raft"
														});
													else
														changedSettings.push({
															platform_adhesion: "None; None, Brim, Raft"
														});
												}
												
												// Get current profile contents
												slicerProfileContent = $("#slicing_configuration_dialog .modal-extra textarea").val();
												
												// Go through all changes settings
												for(var setting in changedSettings[0]) {
												
													// Remove setting
													var expression = new RegExp("(^|\n)" + setting + ".*\n?", 'g');
													slicerProfileContent = slicerProfileContent.replace(expression, "$1");
													
													// Check if setting exists
													if(changedSettings[0][setting] !== null) {
													
														// Add setting
														if(slicerProfileContent.match(/(^|\n)\[profile\].*\n?/) === null)
															slicerProfileContent = "[profile]\n" + setting + " = " + changedSettings[0][setting] + '\n';
														else
															slicerProfileContent = slicerProfileContent.replace(/(^|\n)\[profile\].*\n?/, "$1[profile]\n" + setting + " = " + changedSettings[0][setting] + '\n');
													}
												}
												
												// Update profile contents
												$("#slicing_configuration_dialog .modal-extra textarea").val(slicerProfileContent);
											});
											
											// Template drag image event
											$("#slicing_configuration_dialog .modal-extra div.templates > div button img").on("dragstart", function(event) {

												// Prevent default
												event.preventDefault();
											});
											
											// Template button click event
											$("#slicing_configuration_dialog .modal-extra div.templates > div button").click(function() {
											
												// Select button
												$(this).blur();
												$(this).addClass("disabled").siblings("button").removeClass("disabled");
												
												// Initialize changed settings
												var changedSettings = [];
												
												// Check if changing quality
												if($(this).parent().hasClass("quality")) {
												
													// Set text
													$("#slicing_configuration_dialog .modal-extra div.templates > p.quality").text(capitalize($(this).attr("title")));
												
													// Set changed settings if extra low quality
													if($(this).attr("title") == "Extra low quality") {
													
														changedSettings.push({
															layer_height: 0.35,
															bottom_thickness: 0.3,
															fan_full_height: 0.301,
															solid_layer_thickness: 2.799
														});
														
														if(slicerProfileName == "m3d_abs" || slicerProfileName == "m3d_hips")
															changedSettings[0]["fan_full_height"] = 0.651;
													}
													
													// Otherwise set changed settings if low quality
													else if($(this).attr("title") == "Low quality") {
													
														changedSettings.push({
															layer_height: 0.25,
															bottom_thickness: 0.3,
															fan_full_height: 0.301,
															solid_layer_thickness: 1.999
														});
														
														if(slicerProfileName == "m3d_abs" || slicerProfileName == "m3d_hips")
															changedSettings[0]["fan_full_height"] = 0.551;
													}
													
													// Otherwise set changed settings if medium quality
													else if($(this).attr("title") == "Medium quality") {
													
														changedSettings.push({
															layer_height: 0.15,
															bottom_thickness: 0.3,
															fan_full_height: 0.301,
															solid_layer_thickness: 1.199
														});
														
														if(slicerProfileName == "m3d_abs" || slicerProfileName == "m3d_hips")
															changedSettings[0]["fan_full_height"] = 0.451;
													}
													
													// Otherwise set changed settings if high quality
													else if($(this).attr("title") == "High quality") {
													
														changedSettings.push({
															layer_height: 0.1,
															bottom_thickness: 0.3,
															fan_full_height: 0.301,
															solid_layer_thickness: 0.799
														});
														
														if(slicerProfileName == "m3d_abs" || slicerProfileName == "m3d_hips")
															changedSettings[0]["fan_full_height"] = 0.401;
													}
													
													// Otherwise set changed settings if extra high quality
													else if($(this).attr("title") == "Extra high quality") {
													
														changedSettings.push({
															layer_height: 0.05,
															bottom_thickness: 0.1,
															fan_full_height: 0.101,
															solid_layer_thickness: 0.399
														});
														
														if(slicerProfileName == "m3d_abs" || slicerProfileName == "m3d_hips")
															changedSettings[0]["fan_full_height"] = 0.151;
													}
												}
												
												// Otherwise assume changing fill
												else {
												
													// Set text
													$("#slicing_configuration_dialog .modal-extra div.templates > p.fill").text(capitalize($(this).attr("title")));
												
													// Set changed settings if hollow thin fill
													if($(this).attr("title") == "Hollow thin fill")
													
														changedSettings.push({
															fill_density: 0,
															solid_layer_thickness: 0.149,
															infill_speed: 15
														});
													
													// Otherwise set changed settings if hollow thick fill
													else if($(this).attr("title") == "Hollow thick fill")
													
														changedSettings.push({
															fill_density: 0,
															solid_layer_thickness: 0.249,
															infill_speed: 15
														});
													
													// Otherwise set changed settings if low fill
													else if($(this).attr("title") == "Low fill")
													
														changedSettings.push({
															fill_density: 6.36363636364,
															solid_layer_thickness: 0.299,
															infill_speed: null
														});
													
													// Otherwise set changed settings if medium fill
													else if($(this).attr("title") == "Medium fill")
													
														changedSettings.push({
															fill_density: 8.75,
															solid_layer_thickness: 0.399,
															infill_speed: null
														});
													
													// Otherwise set changed settings if high fill
													else if($(this).attr("title") == "High fill")
													
														changedSettings.push({
															fill_density: 14.0,
															solid_layer_thickness: 0.399,
															infill_speed: null
														});
													
													// Otherwise set changed settings if extra high fill
													else if($(this).attr("title") == "Extra high fill")
													
														changedSettings.push({
															fill_density: 23.3333333333,
															solid_layer_thickness: 0.399,
															infill_speed: null
														});
												}
												
												// Get current profile contents
												slicerProfileContent = $("#slicing_configuration_dialog .modal-extra textarea").val();
												
												// Go through all changes settings
												for(var setting in changedSettings[0]) {
												
													// Remove setting
													var expression = new RegExp("(^|\n)" + setting + ".*\n?", 'g');
													slicerProfileContent = slicerProfileContent.replace(expression, "$1");
													
													// Check if setting exists
													if(changedSettings[0][setting] !== null) {
													
														// Add setting
														if(slicerProfileContent.match(/(^|\n)\[profile\].*\n?/) === null)
															slicerProfileContent = "[profile]\n" + setting + " = " + changedSettings[0][setting] + '\n';
														else
															slicerProfileContent = slicerProfileContent.replace(/(^|\n)\[profile\].*\n?/, "$1[profile]\n" + setting + " = " + changedSettings[0][setting] + '\n');
													}
												}
												
												// Update profile contents
												$("#slicing_configuration_dialog .modal-extra textarea").val(slicerProfileContent);
											});
							
											// Resize window
											$(window).resize();
										}
									});
								}
							});
						}, 300);
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
							url: "/plugin/m3dfio/upload",
							type: "POST",
							data: $.param(parameter),
							dataType: "json",
							contentType: "application/x-www-form-urlencoded; charset=UTF-8",

							// On success
							success: function(data) {
							
								// Check if modified profile is valid
								if(data.value == "Ok") {
								
									// Check if WebGL isn't supported
									if(!Detector.webgl) {
									
										// Set slicer menu
										slicerMenu = "Modify Model";
										
										// Apply changes
										button.removeClass("disabled").click();
									}
									
									// Otherwise
									else {
								
										// Display cover
										$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").text("Loading model…");
									
										setTimeout(function() {
									
											// Download model
											var xhr = new XMLHttpRequest();
											xhr.onreadystatechange = function() {
						
												// Check if model has loaded
												if(this.readyState == 4 && this.status == 200) {
							
													// Load model from blob
													loadModel(URL.createObjectURL(this.response));
			
													// Wait until model is loaded
													function isModelLoaded() {

														// Check if model is loaded
														if(viewport.modelLoaded) {

															// Hide cover
															$("#slicing_configuration_dialog .modal-cover").addClass("noTransition").removeClass("show");
															setTimeout(function() {
																$("#slicing_configuration_dialog .modal-cover").css("z-index", '').removeClass("noTransition");
															}, 200);

															// Display model
															$("#slicing_configuration_dialog").addClass("noTransition").removeClass("profile");
															setTimeout(function() {
																$("#slicing_configuration_dialog").removeClass("noTransition").addClass("model");
																$("#slicing_configuration_dialog p.currentMenu").text("Modify Model");

																$("#slicing_configuration_dialog .modal-extra").empty().append(`
																	<div class="printer">
																		<button data-color="Black" title="Black"><img src="/plugin/m3dfio/static/img/black.png"></button>
																		<button data-color="White" title="White"><img src="/plugin/m3dfio/static/img/white.png"></button>
																		<button data-color="Blue" title="Blue"><img src="/plugin/m3dfio/static/img/blue.png"></button>
																		<button data-color="Green" title="Green"><img src="/plugin/m3dfio/static/img/green.png"></button>
																		<button data-color="Orange" title="Orange"><img src="/plugin/m3dfio/static/img/orange.png"></button>
																		<button data-color="Clear" title="Clear"><img src="/plugin/m3dfio/static/img/clear.png"></button>
																		<button data-color="Silver" title="Silver"><img src="/plugin/m3dfio/static/img/silver.png"></button>
																	</div>
																	<div class="filament">
																		<button data-color="White" title="White"><span style="background-color: #F4F3E9;"></span><img src="/plugin/m3dfio/static/img/filament.png"></button>
																		<button data-color="Pink" title="Pink"><span style="background-color: #FF006B;"></span><img src="/plugin/m3dfio/static/img/filament.png"></button>
																		<button data-color="Red" title="Red"><span style="background-color: #EE0000;"></span><img src="/plugin/m3dfio/static/img/filament.png"></button>
																		<button data-color="Orange" title="Orange"><span style="background-color: #FE9800;"></span><img src="/plugin/m3dfio/static/img/filament.png"></button>
																		<button data-color="Yellow" title="Yellow"><span style="background-color: #FFEA00;"></span><img src="/plugin/m3dfio/static/img/filament.png"></button>
																		<button data-color="Green" title="Green"><span style="background-color: #009E60;"></span><img src="/plugin/m3dfio/static/img/filament.png"></button>
																		<button data-color="Light Blue" title="Light Blue"><span style="background-color: #00EEEE;"></span><img src="/plugin/m3dfio/static/img/filament.png"></button>
																		<button data-color="Blue" title="Blue"><span style="background-color: #236B8E;"></span><img src="/plugin/m3dfio/static/img/filament.png"></button>
																		<button data-color="Purple" title="Purple"><span style="background-color: #9A009A;"></span><img src="/plugin/m3dfio/static/img/filament.png"></button>
																		<button data-color="Black" title="Black"><span style="background-color: #404040;"></span><img src="/plugin/m3dfio/static/img/filament.png"></button>
																	</div>
																	<div class="model">
																		<input type="file" accept=".stl, .obj, .m3d, .amf, .wrl, .dae">
																		<button class="import" title="Import"><img src="/plugin/m3dfio/static/img/import.png"></button>
																		<button class="translate disabled" title="Translate"><img src="/plugin/m3dfio/static/img/translate.png"></button>
																		<button class="rotate" title="Rotate"><img src="/plugin/m3dfio/static/img/rotate.png"></button>
																		<button class="scale" title="Scale"><img src="/plugin/m3dfio/static/img/scale.png"></button>
																		<button class="snap" title="Snap"><img src="/plugin/m3dfio/static/img/snap.png"></button>
																		<button class="delete disabled" title="Delete"><img src="/plugin/m3dfio/static/img/delete.png"></button>
																		<button class="clone disabled" title="Clone"><img src="/plugin/m3dfio/static/img/clone.png"></button>
																		<button class="reset disabled" title="Reset"><img src="/plugin/m3dfio/static/img/reset.png"></button>
																		<button class="cut" title="Cut"><img src="/plugin/m3dfio/static/img/cut.png"></button>
																		<button class="merge" title="Merge"><img src="/plugin/m3dfio/static/img/merge.png"></button>
																	</div>
																	<div class="display">
																		<button class="boundaries" title="Boundaries"><img src="/plugin/m3dfio/static/img/boundaries.png"></button>
																		<button class="measurements" title="Measurements"><img src="/plugin/m3dfio/static/img/measurements.png"></button>
																	</div>
																	<div class="values translate">
																		<div>
																			<p>X<input type="number" step="any" name="x"><span></span></p>
																			<p>Y<input type="number" step="any" name="y"><span></span></p>
																			<p>Z<input type="number" step="any" name="z"><span></span></p>
																			<span></span>
																		</div>
																	</div>
																	<div class="cutShape">
																		<div>
																			<button class="cube disabled" title="Cube"><img src="/plugin/m3dfio/static/img/cube.png"></button>
																			<button class="sphere" title="Sphere"><img src="/plugin/m3dfio/static/img/sphere.png"></button>
																			<span></span>
																		</div>
																	</div>
																	<div class="measurements">
																		<p class="width"></p>
																		<p class="depth"></p>
																		<p class="height"></p>
																	</div>
																`);

																$("#slicing_configuration_dialog .modal-extra div.printer button[data-color=\"" + self.settings.settings.plugins.m3dfio.PrinterColor() + "\"]").addClass("disabled");
																$("#slicing_configuration_dialog .modal-extra div.filament button[data-color=\"" + self.settings.settings.plugins.m3dfio.FilamentColor() + "\"]").addClass("disabled");
																$("#slicing_configuration_dialog .modal-extra").append(viewport.renderer.domElement);

																// Image drag event
																$("#slicing_configuration_dialog .modal-extra img").on("dragstart", function(event) {

																	// Prevent default
																	event.preventDefault();
																});

																// Input change event
																$("#slicing_configuration_dialog .modal-extra input[type=\"file\"]").change(function(event) {

																	// Set file type
																	var extension = this.files[0].name.lastIndexOf('.');
																	var type = extension != -1 ? this.files[0].name.substr(extension + 1).toLowerCase() : "stl";
																	var url = URL.createObjectURL(this.files[0]);
																
																	// Clear value
																	$(this).val('');

																	// Display cover
																	$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").text("Loading model…");

																	setTimeout(function() {

																		// Import model
																		viewport.importModel(url, type);

																		// Wait until model is loaded
																		function isModelLoaded() {

																			// Check if model is loaded
																			if(viewport.modelLoaded) {

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
																		setTimeout(isModelLoaded, 100);
																	}, 300);
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
																	viewport.setMode("translate");
																});

																// Rotate button click event
																$("#slicing_configuration_dialog .modal-extra button.rotate").click(function() {

																	// Set selection mode to rotate
																	viewport.setMode("rotate");
																});

																// Scale button click event
																$("#slicing_configuration_dialog .modal-extra button.scale").click(function() {

																	// Set selection mode to scale
																	viewport.setMode("scale");
																});

																// Snap button click event
																$("#slicing_configuration_dialog .modal-extra button.snap").click(function() {

																	// Check if snap controls are currently enabled
																	if(viewport.transformControls.translationSnap)

																		// Disable grid and rotation snap
																		viewport.disableSnap();

																	// Otherwise
																	else

																		// Enable grid and rotation snap
																		viewport.enableSnap();
																});

																// Delete button click event
																$("#slicing_configuration_dialog .modal-extra button.delete").click(function() {

																	// Delete model
																	viewport.deleteModel();
																});

																// Clone button click event
																$("#slicing_configuration_dialog .modal-extra button.clone").click(function() {

																	// Display cover
																	$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").text("Cloning model…");

																	setTimeout(function() {

																		// Clone model
																		viewport.cloneModel();

																		// Wait until model is loaded
																		function isModelLoaded() {

																			// Check if model is loaded
																			if(viewport.modelLoaded) {

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
																		setTimeout(isModelLoaded, 100);
																	}, 300);
																});

																// Reset button click event
																$("#slicing_configuration_dialog .modal-extra button.reset").click(function() {

																	// Reset model
																	viewport.resetModel();
																});

																// Boundaries button click event
																$("#slicing_configuration_dialog .modal-extra button.boundaries").click(function() {

																	// Set show boundaries
																	viewport.showBoundaries = !viewport.showBoundaries;

																	// Go through all boundaries
																	for(var i = 0; i < viewport.boundaries.length; i++)

																		// Check if boundary isn't set
																		if(viewport.boundaries[i].material.color.getHex() != 0xFF0000)

																			// Toggle visibility
																			viewport.boundaries[i].visible = viewport.showBoundaries;

																	// Select button
																	if(viewport.showBoundaries)
																		$(this).addClass("disabled");
																	else
																		$(this).removeClass("disabled");

																	// Render
																	viewport.render();
																});

																// Measurements button click event
																$("#slicing_configuration_dialog .modal-extra button.measurements").click(function() {

																	// Set show measurements
																	viewport.showMeasurements = !viewport.showMeasurements;

																	// Check if a model is currently selected
																	if(viewport.transformControls.object) {

																		// Go through all boundaries
																		for(var i = 0; i < viewport.measurements.length; i++)

																			// Toggle visibility
																			viewport.measurements[i][0].visible = viewport.showMeasurements;

																		if(viewport.showMeasurements)
																			$("div.measurements > p").addClass("show");
																		else
																			$("div.measurements > p").removeClass("show");

																		// Update model changes
																		viewport.updateModelChanges();

																		// Render
																		viewport.render();
																	}

																	// Select button
																	if(viewport.showMeasurements)
																		$(this).addClass("disabled");
																	else
																		$(this).removeClass("disabled");
																});

																// Cut button click event
																$("#slicing_configuration_dialog .modal-extra button.cut").click(function() {

																	// Check if not cutting models
																	if(viewport.cutShape === null) {

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
																		viewport.cutShape = new THREE.Mesh(cutShapeGeometry, new THREE.MeshBasicMaterial({
																			color: 0xCCCCCC,
																			transparent: true,
																			opacity: 0.1,
																			side: THREE.DoubleSide,
																			depthWrite: false
																		}));
																		viewport.cutShape.position.set(0, bedHighMaxZ - bedLowMinZ - viewport.models[0].mesh.position.y, 0);
																		viewport.cutShape.rotation.set(0, 0, 0);
													
																		// Create cut shape outline
																		viewport.cutShapeOutline = new THREE.LineSegments(viewport.lineGeometry(cutShapeGeometry), new THREE.LineDashedMaterial({
																			color: 0xffaa00,
																			dashSize: 3,
																			gapSize: 1,
																			linewidth: 2
																		}));
													
																		// Add cut shape and outline to scene
																		viewport.scene[0].add(viewport.cutShape);
																		viewport.scene[0].add(viewport.cutShapeOutline);

																		// Select cut shape
																		viewport.removeSelection();
																		viewport.transformControls.setAllowedTranslation("XYZ");
																		viewport.transformControls.attach(viewport.cutShape);

																		// Update model changes
																		viewport.updateModelChanges();

																		// Render
																		viewport.render();
																	}

																	// Otherwise
																	else
												
																		// Apply cut
																		viewport.applyCut();
																});
											
																// Cut shape click event
																$("#slicing_configuration_dialog .modal-extra div.cutShape button").click(function() {
												
																	// Check if button is cube
																	if($(this).hasClass("cube"))
			
																		// Change cut shape to a sube
																		viewport.setCutShape("cube");
												
																	// Otherwise check if button is sphere
																	else if($(this).hasClass("sphere"))
			
																		// Change cut shape to a sphere
																		viewport.setCutShape("sphere");
																});

																// Merge button click event
																$("#slicing_configuration_dialog .modal-extra button.merge").click(function() {

																	// Apply merge
																	viewport.applyMerge();
																});

																// Printer color button click event
																$("#slicing_configuration_dialog .modal-extra div.printer button").click(function() {
															
																	// Send request
																	$.ajax({
																		url: API_BASEURL + "plugin/m3dfio",
																		type: "POST",
																		dataType: "json",
																		data: JSON.stringify({command: "message", value: "Set Printer Color: " + $(this).data("color")}),
																		contentType: "application/json; charset=UTF-8",
																	
																		success: function() {
																	
																			// Update settings
																			self.settings.requestData();
																		}
																	});

																	// Set printer color
																	viewport.models[0].mesh.material = printerMaterials[$(this).data("color")];
																	$(this).addClass("disabled").siblings(".disabled").removeClass("disabled");

																	// Render
																	viewport.render();
																});

																// Filament color button click event
																$("#slicing_configuration_dialog .modal-extra div.filament button").click(function() {
															
																	// Send request
																	$.ajax({
																		url: API_BASEURL + "plugin/m3dfio",
																		type: "POST",
																		dataType: "json",
																		data: JSON.stringify({command: "message", value: "Set Filament Color: " + $(this).data("color")}),
																		contentType: "application/json; charset=UTF-8",
																	
																		success: function() {
																	
																			// Update settings
																			self.settings.requestData();
																		}
																	});

																	// Go through all models
																	for(var i = 1; i < viewport.models.length; i++)

																		// Check if model isn't currently selected
																		if(viewport.models[i].glow === null)

																			// Set models' color
																			viewport.models[i].mesh.material = filamentMaterials[$(this).data("color")];

																	// Select button
																	$(this).addClass("disabled").siblings(".disabled").removeClass("disabled");

																	// Render
																	viewport.render();
																});

																// Value change event
																$("#slicing_configuration_dialog .modal-extra div.values input").change(function() {

																	// Blur self
																	$(this).blur();

																	// Check if value is a number
																	if(!isNaN(parseFloat($(this).val()))) {

																		// Fix value
																		$(this).val(parseFloat($(this).val()).toFixed(3));

																		// Apply changes
																		viewport.applyChanges($(this).attr("name"), $(this).val());
																	}

																	// Otherwise
																	else

																		// Update model changes
																		viewport.updateModelChanges();
																});

																// Value change event
																$("#slicing_configuration_dialog .modal-extra div.values input").keyup(function() {

																	// Check if value is a number
																	if(!isNaN(parseFloat($(this).val())))

																		// Apply changes
																		viewport.applyChanges($(this).attr("name"), $(this).val());
																});

																// Update model changes
																viewport.updateModelChanges();

																// Set slicer menu
																slicerMenu = "Modify Model";

																// Set button
																button.text("Slice").removeClass("disabled");

																// Resize viewport and window
																viewport.resizeEvent();
																$(window).resize();
															}, 10);
														}

														// Otherwise
														else

															// Check if model is loaded again
															setTimeout(isModelLoaded, 100);
													}
													setTimeout(isModelLoaded, 100);
												}
											}
						
											xhr.open("GET", "/downloads/files/" + modelLocation + modelPath + modelName);
											xhr.responseType = "blob";
											xhr.setRequestHeader("X-Api-Key", $.ajaxSettings.headers["X-Api-Key"])
											xhr.send();
										}, 300);
									}
								}
								
								// Otherwise
								else {
								
									// Show message
									showMessage("Slicer Status", "Invalid profile", "Ok", function() {
									
										// Enable button
										button.removeClass("disabled");
					
										// Hide message
										hideMessage();
									});
								}
							}
						});
					}
					
					// Otherwise check if on modify model menu
					else if(slicerMenu == "Modify Model") {
					
						// Apply changes
						function applyChanges() {
						
							// Display cover
							$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").text("Applying changes…");
						
							setTimeout(function() {
							
								// Set parameter
								var parameter = [];
								
								// Check if WebGL is supported
								if(Detector.webgl) {
								
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
								
									// Export scene as an STL
									var scene = viewport.exportScene();
			
									// Append model's center to slicer profile if slicer is Cura
									if(slicerName == "cura")
										slicerProfileContent += "\nobject_center_x = " + modelCenter[0] + "\nobject_center_y = " + modelCenter[1] + '\n';
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
									value: afterSlicingAction
								});
								
								// Send request
								$.ajax({
									url: "/plugin/m3dfio/upload",
									type: "POST",
									data: $.param(parameter),
									dataType: "json",
									contentType: "application/x-www-form-urlencoded; charset=UTF-8",

									// On success
									success: function() {
									
										// Check if WebGL is supported
										if(Detector.webgl) {
								
											// Create request
											var form = new FormData();
											if(typeof self.files.currentPath === "undefined")
												form.append("file", scene, modelPath.substr(1) + modelName);
											else
												form.append("file", scene, modelPath + modelName);
				
											// Send request
											$.ajax({
												url: "/api/files/" + modelLocation,
												type: "POST",
												data: form,
												processData: false,
												contentType: false,

												// On success
												success: function(data) {
										
													// Set slicer menu to done
													slicerMenu = "Done";
										
													// Slice file
													button.removeClass("disabled").click();
												}
											});
										}
										
										// Otherwise
										else {
										
											// Set slicer menu to done
											slicerMenu = "Done";
								
											// Slice file
											button.removeClass("disabled").click();
										}
									}
								});
							}, 300);
						}
					
						// Check if printing after slicing, using on the fly pre-processing, changing settings before print, and a printer is connected
						if(afterSlicingAction == "print" && self.settings.settings.plugins.m3dfio.PreprocessOnTheFly() && self.settings.settings.plugins.m3dfio.ChangeSettingsBeforePrint() && self.printerState.stateString() !== "Offline") {

							// Show message
							showMessage("Message", '', "Print", function() {

								// Hide message
								hideMessage();

								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m3dfio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({
										command: "message",
										value: "Print Settings: " + JSON.stringify({
											filamentTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(),
											heatbedTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(),
											filamentType: $("body > div.page-container > div.message > div > div > div.printSettings select").val()
										})
									}),
									contentType: "application/json; charset=UTF-8",

									// On success										
									success: function() {
									
										// Slice file
										function sliceFile() {
							
											// Save software settings
											if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") == -1)
												self.settings.saveData();
								
											// Apply changes
											applyChanges();
										}
						
										// Update settings
										if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
											self.settings.requestData(sliceFile);
										else
											self.settings.requestData().done(sliceFile);
									}
								});
							}, "Cancel", function() {

								// Hide message
								hideMessage();
								
								// Don't slice file
								button.prev('a').click();
							});
						}

						// Otherwise
						else

							// Apply changes
							applyChanges();
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
			if(event.keyCode == 9) {
	
				// Prevent default action
				event.preventDefault();
		
				// Insert tab
				document.execCommand("insertText", false, "\t");
			}
		});
		
		// Message distance buttons click event
		$("body > div.page-container > div.message").find("button.distance").click(function() {
		
			// Blur self
			$(this).blur();
		
			// Set active button
			$(this).siblings().removeClass("active");
			$(this).addClass("active");
		});
		
		// Message arrow buttons click event
		$("body > div.page-container > div.message").find("button.arrow").click(function() {
		
			// Blur self
			$(this).blur();
		
			// Set commands
			var commands = [
				"G91",
				"G0 Z" + ($(this).hasClass("down") ? '-' : '') + $("body > div.page-container > div.message").find("button.distance.active").text() + " F90"
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
		
		// Save settings button event
		$("#settings_dialog > div.modal-footer > button.btn-primary").click(function() {
		
			// Save printer settings
			function savePrinterSettings() {
			
				// Check if settings were saved
				if(!$("#settings_dialog").hasClass("in")) {
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: "Save Printer Settings"}),
						contentType: "application/json; charset=UTF-8"
					});
				}
				
				// Otherwise
				else
				
					// Check if settings were saved again
					setTimeout(savePrinterSettings, 100);
			}
			setTimeout(savePrinterSettings, 100);
		});
	
		// Override X increment control
		$("#control #control-xinc").attr("title", "Increases extruder's X position by the specified amount").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91",
				"G0 X" + $("#control #jog_distance > button.active").text() + " F3000"
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
		$("#control #control-xdec").attr("title", "Decreases extruder's X position by the specified amount").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91",
				"G0 X-" + $("#control #jog_distance > button.active").text() + " F3000"
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
		$("#control #control-yinc").attr("title", "Increases extruder's Y position by the specified amount").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91",
				"G0 Y" + $("#control #jog_distance > button.active").text() + " F3000"
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
		$("#control #control-ydec").attr("title", "Decreases extruder's Y position by the specified amount").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91",
				"G0 Y-" + $("#control #jog_distance > button.active").text() + " F3000"
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
		$("#control #control-zinc").attr("title", "Increases extruder's Z position by the specified amount").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91",
				"G0 Z" + $("#control #jog_distance > button.active").text() + " F90"
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
		$("#control #control-zdec").attr("title", "Decreases extruder's Z position by the specified amount").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91",
				"G0 Z-" + $("#control #jog_distance > button.active").text() + " F90"
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
		$("#control #control-xyhome").attr("title", "Set extruder's X position to 54 and Y position to 50").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G90",
				"G28"
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
		$("#control #control-zhome").attr("title", "Set extruder's Z position to 5").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G90",
				"G0 Z5 F90"
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
		$("#control > div.jog-panel.extruder").find("div > button:first-of-type").attr("title", "Extrudes the specified amount of filament").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91",
				"G0 E" + ($("#control > div.jog-panel.extruder").find("div > div:nth-of-type(2) >input").val().length ? $("#control > div.jog-panel.extruder").find("div > div:nth-of-type(2) >input").val() : '5' ) + " F345"
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
		$("#control > div.jog-panel.extruder").find("div > button:nth-of-type(2)").attr("title", "Retracts the specified amount of filament").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91",
				"G0 E-" + ($("#control > div.jog-panel.extruder").find("div > div:nth-of-type(2) >input").val().length ? $("#control > div.jog-panel.extruder").find("div > div:nth-of-type(2) >input").val() : '5' ) + " F345"
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
		$("#control > div.jog-panel.extruder").find("div > button:nth-of-type(4)").attr("title", "Sets extruder's temperature to the specified amount").click(function(event) {
			
			// Check if not printing
			if(self.printerState.isPrinting() !== true) {
				
				// Set commands
				var commands = [
					"M109 S" + parseInt($(this).text().substr(12)),
					"M65536;wait"
				];
			
				// Show message
				showMessage("Temperature Status", "Warming up");
			
				// Display temperature
				var updateTemperature = setInterval(function() {
				
					// Show message
					if(self.temperature.temperatures.tool0.actual.length) {
				
						var temperature = self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1];
					
						if(temperature != 0)
							showMessage("Filament Status", "Warming up: " + temperature + "°C");
					}
				}, 1000);
				
				// Set waiting callback
				waitingCallback = function() {
				
					// Stop displaying temperature
					clearInterval(updateTemperature);
				
					// Show message
					showMessage("Temperature Status", "Done", "Ok", function() {
				
						// Hide message
						hideMessage();
					});
				}
			}
			
			// Otherwise
			else
			
				// Set commands
				var commands = [
					"M104 S" + parseInt($(this).text().substr(12)) + '*'
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
		
		// Set heatbed temperature control
		$("#control > div.jog-panel.extruder").find("div > div.heatbed > button:first-of-type").attr("title", "Sets heatbed's temperature to the specified amount").click(function(event) {
			
			// Check if not printing
			if(self.printerState.isPrinting() !== true) {
			
				// Set commands
				var commands = [
					"M190 S" + parseInt($(this).text().substr(12)),
					"M65536;wait"
				];
			
				// Show message
				showMessage("Temperature Status", "Warming up");
			
				// Display temperature
				var updateTemperature = setInterval(function() {
				
					// Show message
					if(self.temperature.temperatures.bed.actual.length) {
					
						var temperature = self.temperature.temperatures.bed.actual[self.temperature.temperatures.bed.actual.length - 1][1];
					
						if(temperature != 0)
							showMessage("Filament Status", "Warming up: " + temperature + "°C");
					}		
				}, 1000);
				
				// Set waiting callback
				waitingCallback = function() {
				
					// Stop displaying temperature
					clearInterval(updateTemperature);
				
					// Show message
					showMessage("Temperature Status", "Done", "Ok", function() {
				
						// Hide message
						hideMessage();
					});
				}
			}
			
			// Otherwise
			else
			
				// Set commands
				var commands = [
					"M140 S" + parseInt($(this).text().substr(12)) + '*'
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
		
		// Print settings control
		$("#control > div.jog-panel.general").find("button:nth-of-type(7)").attr("title", "Opens print settings").click(function() {
		
			// Open M3D Fio settings
			$("#navbar_show_settings").click();
			$("#settings_plugin_m3dfio").addClass("active").siblings(".active").removeClass("active");
			$("#settings_plugin_m3dfio_link").addClass("active").siblings(".active").removeClass("active");
		});
		
		// Emergency stop control
		$("#control > div.jog-panel.general").find("button:nth-of-type(8)").attr("title", "Stop current operation").click(function() {
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Emergency Stop"}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set unload filament control
		$("#control > div.jog-panel.filament").find("div > button:nth-of-type(1)").attr("title", "Unloads filament").click(function(event) {
			
			// Show message
			showMessage("Filament Status", "Warming up");
		
			// Set commands
			var commands = [
				"M106",
				"M109 S250",
				"M65536;wait"
			];
			
			// Display temperature
			var updateTemperature = setInterval(function() {
			
				// Show message
				if(self.temperature.temperatures.tool0.actual.length) {
				
					var temperature = self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1];
					
					if(temperature != 0)
						showMessage("Filament Status", "Warming up: " + temperature + "°C");
				}
			}, 1000);
			
			// Set waiting callback
			waitingCallback = function() {
			
				// Stop displaying temperature
				clearInterval(updateTemperature);
		
				// Show message
				showMessage("Filament Status", "Remove filament");
	
				// Set commands
				commands = [
					"G90",
					"G92"
				];
		
				for(var i = 2; i <= 40; i += 2)
					commands.push("G0 E-" + i + " F345");

				commands.push("M104 S0");
				commands.push("M107");
				commands.push("M65536;wait");
				
				// Set waiting callback
				waitingCallback = function() {
				
					// Show message
					showMessage("Filament Status", "Was filament removed?", "Yes", function() {
		
						// Hide message
						hideMessage();
					}, "No", function() {
					
						// Hide message
						hideMessage();
					
						// Unload filament again
						$("#control > div.jog-panel.filament").find("div > button:nth-of-type(1)").click();
					});
				}
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: commands}),
					contentType: "application/json; charset=UTF-8"
				});
			}
			
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set load filament control
		$("#control > div.jog-panel.filament").find("div > button:nth-of-type(2)").attr("title", "Loads filament").click(function(event) {
			
			// Show message
			showMessage("Filament Status", "Warming up");
		
			// Set commands
			var commands = [
				"M106",
				"M109 S250",
				"M65536;wait"
			];
			
			// Display temperature
			var updateTemperature = setInterval(function() {
			
				// Show message
				if(self.temperature.temperatures.tool0.actual.length) {
			
					var temperature = self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1];
				
					if(temperature != 0)
						showMessage("Filament Status", "Warming up: " + temperature + "°C");
				}
			}, 1000);
			
			// Set waiting callback
			waitingCallback = function() {
			
				// Stop displaying temperature
				clearInterval(updateTemperature);
	
				// Show message
				showMessage("Filament Status", "Insert filament");
	
				// Set commands
				commands = [
					"G90",
					"G92"
				];
		
				for(var i = 2; i <= 40; i += 2)
					commands.push("G0 E" + i + " F345");

				commands.push("M104 S0");
				commands.push("M107");
				commands.push("M65536;wait");
				
				// Set waiting callback
				waitingCallback = function() {
				
					// Show message
					showMessage("Filament Status", "Was filament inserted?", "Yes", function() {
				
						// Hide message
						hideMessage();
					}, "No", function() {
				
						// Hide message
						hideMessage();
				
						// Load filament again
						$("#control > div.jog-panel.filament").find("div > button:nth-of-type(2)").click();
					});
				}
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: commands}),
					contentType: "application/json; charset=UTF-8"
				});
			}
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set calibrate bed center Z0 control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(1)").attr("title", "Automatically calibrates the bed's center's Z0").click(function(event) {
			
			// Show message
			showMessage("Calibration Status", "Calibrating bed center Z0");
		
			// Set commands
			var commands = [
				"G90",
				"M109 S150",
				"M104 S0",
				"M107",
				"G30",
				"M117",
				"M65536;wait"
			];
			
			// Set waiting callback
			waitingCallback = function() {
			
				// Show message
				showMessage("Calibration Status", "Done", "Ok", function() {
				
					// Hide message
					hideMessage();
				});
			}
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set calibrate bed orientation control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(2)").attr("title", "Automatically calibrates the bed's orientation").click(function(event) {
			
			// Show message
			showMessage("Calibration Status", "Calibrating bed orientation");
		
			// Set commands
			var commands = [
				"M104 S0",
				"G90",
				"G0 Z3 F90",
				"M109 S150",
				"M104 S0",
				"M107",
				"G32",
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
					showMessage("Calibration Status", "Done", "Ok", function() {
				
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
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set go to front left
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(3)").attr("title", "Positions extruder above the bed's front left corner").click(function(event) {
		
			// Set commands
			var commands = [
				"G90",
				"G0 Z3 F90",
				"G28",
				"G0 X9 Y5 Z3 F3000"
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(5)").attr("title", "Positions extruder above the bed's front right corner").click(function(event) {
		
			// Set commands
			var commands = [
				"G90",
				"G0 Z3 F90",
				"G28",
				"G0 X99 Y5 Z3 F3000"
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(7)").attr("title", "Positions extruder above the bed's back right corner").click(function(event) {
		
			// Set commands
			var commands = [
				"G90",
				"G0 Z3 F90",
				"G28",
				"G0 X99 Y95 Z3 F3000"
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(9)").attr("title", "Positions extruder above the bed's back left corner").click(function(event) {
		
			// Set commands
			var commands = [
				"G90",
				"G0 Z3 F90",
				"G28",
				"G0 X9 Y95 Z3 F3000"
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(4)").attr("title", "Saves the extruder's current Z value as the bed's front left corner's Z0").click(function(event) {
			
			// Show message
			showMessage("Saving Status", "Saving Z as front left Z0");
			
			// Set commands
			var commands = [
				"M114",
				"M65536;wait"
			];
			
			// Set waiting callback
			waitingCallback = function() {
			
				// Set commands
				commands = [
					"M618 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"] + " P" + floatToBinary(currentZ - self.settings.settings.plugins.m3dfio.FrontLeftOrientation()),
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
						showMessage("Saving Status", "Done", "Ok", function() {
				
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
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: commands}),
					contentType: "application/json; charset=UTF-8"
				});
			}
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set save Z as front right Z0 control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(6)").attr("title", "Saves the extruder's current Z value as the bed's front right corner's Z0").click(function(event) {
			
			// Show message
			showMessage("Saving Status", "Saving Z as front right Z0");
		
			// Set commands
			var commands = [
				"M114",
				"M65536;wait"
			];
			
			// Set waiting callback
			waitingCallback = function() {
			
				// Set commands
				commands = [
					"M618 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"] + " P" + floatToBinary(currentZ - self.settings.settings.plugins.m3dfio.FrontRightOrientation()),
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
						showMessage("Saving Status", "Done", "Ok", function() {
				
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
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: commands}),
					contentType: "application/json; charset=UTF-8"
				});
			}
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set save Z as back right Z0 control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(8)").attr("title", "Saves the extruder's current Z value as the bed's back right corner's Z0").click(function(event) {
			
			// Show message
			showMessage("Saving Status", "Saving Z as back right Z0");
		
			// Set commands
			var commands = [
				"M114",
				"M65536;wait"
			];
			
			// Set waiting callback
			waitingCallback = function() {
			
				// Set commands
				commands = [
					"M618 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"] + " P" + floatToBinary(currentZ - self.settings.settings.plugins.m3dfio.BackRightOrientation()),
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
						showMessage("Saving Status", "Done", "Ok", function() {
				
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
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: commands}),
					contentType: "application/json; charset=UTF-8"
				});
			}
			
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
	
		// Set save Z as back left Z0 control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(10)").attr("title", "Saves the extruder's current Z value as the bed's back left corner's Z0").click(function(event) {
			
			// Show message
			showMessage("Saving Status", "Saving Z as back left Z0");
		
			// Set commands
			var commands = [
				"M114",
				"M65536;wait"
			];
			
			// Set waiting callback
			waitingCallback = function() {
			
				// Set commands
				commands = [
					"M618 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"] + " P" + floatToBinary(currentZ - self.settings.settings.plugins.m3dfio.BackLeftOrientation()),
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
						showMessage("Saving Status", "Done", "Ok", function() {
				
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
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: commands}),
					contentType: "application/json; charset=UTF-8"
				});
			}
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
		
		// Set save Z as bed center Z0 control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(11)").attr("title", "Saves the extruder's current Z value as the bed center's Z0").click(function(event) {
			
			// Show message
			showMessage("Saving Status", "Saving Z as bed center Z0");
			
			// Set commands
			var commands = [
				"G91",
				"G0 Z0.0999 F90",
				"G33",
				"M117",
				"M65536;wait"
			];
			
			// Set waiting callback
			waitingCallback = function() {
			
				// Show message
				showMessage("Saving Status", "Done", "Ok", function() {
		
					// Hide message
					hideMessage();
				});
			}
			
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: commands}),
				contentType: "application/json; charset=UTF-8"
			});
		});
		
		// Set print test border control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(12)").attr("title", "Prints 0.4mm test border").click(function(event) {
		
			// Show message
			showMessage("Calibration Status", "It's recommended to print this test border after completely calibrating the bed to ensure that the calibration is accurate.<br><br>The test border should print as a solid, even extruded border, and the 'Back Left Offset', 'Back Right Offset', 'Front Right Offset', and 'Front Left Offset' values can be adjusted to correct any issues with it. If the test border contains squiggly ripples, then it is too high. If the test border contains missing gaps, then it is too low.<br><br>It's also recommended to print a model with a raft after this is done to see if the 'Bed Height Offset' value needs to be adjusted. If the raft does not securely stick to the bed, then it is too high. If the model isn't easily removed from the raft, then it is too low.<br><br>All the referenced values can be found by clicking the 'Print settings' button in the 'General' section. Proceed?", "Yes", function() {
			
				// Hide message
				hideMessage();
				
				// Check if using on the fly pre-processing and changing settings before print
				if(self.settings.settings.plugins.m3dfio.PreprocessOnTheFly() && self.settings.settings.plugins.m3dfio.ChangeSettingsBeforePrint()) {
				
					// Show message
					showMessage("Message", '', "Print", function() {
			
						// Hide message
						hideMessage();
				
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m3dfio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Print Settings: " + JSON.stringify({
									filamentTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(),
									heatbedTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(),
									filamentType: $("body > div.page-container > div.message > div > div > div.printSettings select").val()
								})
							}),
							contentType: "application/json; charset=UTF-8",
					
							// On success										
							success: function() {
					
								// Print file
								function printFile() {
							
									// Save software settings
									self.settings.saveData();
								
									// Send request
									$.ajax({
										url: API_BASEURL + "plugin/m3dfio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({command: "message", value: "Print Test Border"}),
										contentType: "application/json; charset=UTF-8"
									});
								}
						
								// Update settings
								if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
									self.settings.requestData(printFile);
								else
									self.settings.requestData().done(printFile);
							}
						});
					}, "Cancel", function() {
			
						// Hide message
						hideMessage();
					});
				}
				
				// Otherwise
				else
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: "Print Test Border"}),
						contentType: "application/json; charset=UTF-8"
					});
				
			}, "No", function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set print backlash calibration cylinder control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(13)").attr("title", "Prints backlash calibration cylinder").click(function(event) {
		
			// Show message
			showMessage("Calibration Status", "It's recommended to print this backlash calibration cylinder after the print bed has been accurately calibrated.<br><br>To start this procedure, the 'Backlash X' and 'Backlash Y' values should be set to 0 so that an uncompensated cylinder can be printed. The cylinder's X backlash signature gaps are located at 2 and 8 o'clock and Y backlash signature gaps are located at 5 and 11 o'clock. The front left corner of the cylinder's base is cut off to make identifying the cylinder's orientation easier.<br><br>After printing an initial cylinder, adjust the 'Backlash X' value to close the X signature gaps, print, and repeat if necessary to ensure the accuracy. 'Backlash X' values typically range within 0.2mm to 0.6mm.<br><br>After the 'Backlash X' value has been calibrated, adjust the 'Backlash Y' value to close the Y signature gaps, print, and repeat if necessary to ensure the accuracy. 'Backlash Y' values typically range within 0.4mm to 1.3mm. You may need fine tune the 'Backlash X' vale again after 'Backlash Y' value has been calibrated.<br><br>All the referenced values can be found by clicking the 'Print settings' button in the 'General' section. Proceed?", "Yes", function() {
			
				// Hide message
				hideMessage();
				
				// Check if using on the fly pre-processing and changing settings before print
				if(self.settings.settings.plugins.m3dfio.PreprocessOnTheFly() && self.settings.settings.plugins.m3dfio.ChangeSettingsBeforePrint()) {
				
					// Show message
					showMessage("Message", '', "Print", function() {
			
						// Hide message
						hideMessage();
				
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m3dfio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({
								command: "message",
								value: "Print Settings: " + JSON.stringify({
									filamentTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(0).val(),
									heatbedTemperature: $("body > div.page-container > div.message > div > div > div.printSettings input").eq(1).val(),
									filamentType: $("body > div.page-container > div.message > div > div > div.printSettings select").val()
								})
							}),
							contentType: "application/json; charset=UTF-8",
					
							// On success										
							success: function() {
					
								// Print file
								function printFile() {
							
									// Save software settings
									self.settings.saveData();
								
									// Send request
									$.ajax({
										url: API_BASEURL + "plugin/m3dfio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({command: "message", value: "Print Backlash Calibration Cylinder"}),
										contentType: "application/json; charset=UTF-8"
									});
								}
						
								// Update settings
								if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
									self.settings.requestData(printFile);
								else
									self.settings.requestData().done(printFile);
							}
						});
					}, "Cancel", function() {
			
						// Hide message
						hideMessage();
					});
				}
				
				// Otherwise
				else
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: "Print Backlash Calibration Cylinder"}),
						contentType: "application/json; charset=UTF-8"
					});
			
			}, "No", function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Run complete bed calibration control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(14)").attr("title", "Automatically calibrates the bed's center's Z0, automatically calibrates the bed's orientation, and manually calibrates the Z0 values for the bed's four corners").click(function(event) {
			
			// Show message
			showMessage("Calibration Status", "This process can take a while to complete and will require your input during some steps. Proceed?", "Yes", function() {
			
				// Hide message
				hideMessage();
				
				// Show message
				showMessage("Calibration Status", "Calibrating bed center Z0");
		
				// Set commands
				var commands = [
					"G90",
					"M109 S150",
					"M104 S0",
					"M107",
					"G30",
					"M117",
					"M65536;wait"
				];
				
				// Set waiting callback
				waitingCallback = function() {
				
					// Show message
					showMessage("Calibration Status", "Calibrating bed orientation");
	
					// Set commands
					var commands = [
						"M104 S0",
						"G90",
						"G0 Z3 F90",
						"M109 S150",
						"M104 S0",
						"M107",
						"G32",
						"M619 S" + eepromOffsets["bedOrientationBackRight"]["offset"] + " T" + eepromOffsets["bedOrientationBackRight"]["bytes"],
						"M619 S" + eepromOffsets["bedOrientationBackLeft"]["offset"] + " T" + eepromOffsets["bedOrientationBackLeft"]["bytes"],
						"M619 S" + eepromOffsets["bedOrientationFrontLeft"]["offset"] + " T" + eepromOffsets["bedOrientationFrontLeft"]["bytes"],
						"M619 S" + eepromOffsets["bedOrientationFrontRight"]["offset"] + " T" + eepromOffsets["bedOrientationFrontRight"]["bytes"],
						"M65536;wait"
					];
					
					// Set waiting callback
					waitingCallback = function() {
					
						// Show message
						showMessage("Calibration Status", "Calibrating front left offset");
	
						// Set commands
						var commands = [
							"G90",
							"G0 Z3 F90",
							"G28",
							"G0 X9 Y5 Z3 F3000",
							"M65536;wait"
						];
						
						// Set waiting callback
						waitingCallback = function() {
						
							// Show message
							showMessage("Calibration Status", "Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved.", "Done", function() {

								// Hide message
								hideMessage();
								
								// Show message
								showMessage("Calibration Status", "Saving front left offset");
								
								// Set commands
								var commands = [
									"M114",
									"M65536;wait"
								];
								
								// Set waiting callback
								waitingCallback = function() {
								
									// Set commands
									commands = [
										"M618 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"] + " P" + floatToBinary(currentZ - self.settings.settings.plugins.m3dfio.FrontLeftOrientation()),
										"M619 S" + eepromOffsets["bedOffsetFrontLeft"]["offset"] + " T" + eepromOffsets["bedOffsetFrontLeft"]["bytes"],
										"M65536;wait"
									];
									
									// Set waiting callback
									waitingCallback = function() {
									
										// Show message
										showMessage("Calibration Status", "Calibrating front right offset");

										// Set commands
										var commands = [
											"G90",
											"G0 Z3 F90",
											"G28",
											"G0 X99 Y5 Z3 F3000",
											"M65536;wait"
										];
										
										// Set waiting callback
										waitingCallback = function() {
										
											// Show message
											showMessage("Calibration Status", "Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved.", "Done", function() {

												// Hide message
												hideMessage();
												
												// Show message
												showMessage("Calibration Status", "Saving front right offset");
												
												// Set commands
												var commands = [
													"M114",
													"M65536;wait"
												];
												
												// Set waiting callback
												waitingCallback = function() {
												
													// Set commands
													commands = [
														"M618 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"] + " P" + floatToBinary(currentZ - self.settings.settings.plugins.m3dfio.FrontRightOrientation()),
														"M619 S" + eepromOffsets["bedOffsetFrontRight"]["offset"] + " T" + eepromOffsets["bedOffsetFrontRight"]["bytes"],
														"M65536;wait"
													];
													
													// Set waiting callback
													waitingCallback = function() {
													
														// Show message
														showMessage("Calibration Status", "Calibrating back right offset");

														// Set commands
														var commands = [
															"G90",
															"G0 Z3 F90",
															"G28",
															"G0 X99 Y95 Z3 F3000",
															"M65536;wait"
														];
														
														// Set waiting callback
														waitingCallback = function() {
														
															// Show message
															showMessage("Calibration Status", "Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved.", "Done", function() {

																// Hide message
																hideMessage();
																
																// Show message
																showMessage("Calibration Status", "Saving back right offset");
																
																// Set commands
																var commands = [
																	"M114",
																	"M65536;wait"
																];
																
																// Set waiting callback
																waitingCallback = function() {
																
																	// Set commands
																	commands = [
																		"M618 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"] + " P" + floatToBinary(currentZ - self.settings.settings.plugins.m3dfio.BackRightOrientation()),
																		"M619 S" + eepromOffsets["bedOffsetBackRight"]["offset"] + " T" + eepromOffsets["bedOffsetBackRight"]["bytes"],
																		"M65536;wait"
																	];
																	
																	// Set waiting callback
																	waitingCallback = function() {
																	
																		// Show message
																		showMessage("Calibration Status", "Calibrating back left offset");

																		// Set commands
																		var commands = [
																			"G90",
																			"G0 Z3 F90",
																			"G28",
																			"G0 X9 Y95 Z3 F3000",
																			"M65536;wait"
																		];
																		
																		// Set waiting callback
																		waitingCallback = function() {
																		
																			// Show message
																			showMessage("Calibration Status", "Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved.", "Done", function() {

																				// Hide message
																				hideMessage();
																				
																				// Show message
																				showMessage("Calibration Status", "Saving back left offset");
																				
																				// Set commands
																				var commands = [
																					"M114",
																					"M65536;wait"
																				];
																				
																				// Set waiting callback
																				waitingCallback = function() {
																				
																					// Set commands
																					commands = [
																						"M618 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"] + " P" + floatToBinary(currentZ - self.settings.settings.plugins.m3dfio.BackLeftOrientation()),
																						"M619 S" + eepromOffsets["bedOffsetBackLeft"]["offset"] + " T" + eepromOffsets["bedOffsetBackLeft"]["bytes"],
																						"M65536;wait"
																					];
																					
																					// Set waiting callback
																					waitingCallback = function() {
																					
																						// Show message
																					showMessage("Calibration Status", "Finishing calibration");
																					
																						// Set commands
																						commands = [
																							"G90",
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
																								showMessage("Calibration Status", "Done", "Ok", function() {
				
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
																							url: API_BASEURL + "plugin/m3dfio",
																							type: "POST",
																							dataType: "json",
																							data: JSON.stringify({command: "message", value: commands}),
																							contentType: "application/json; charset=UTF-8"
																						});
																					}

																					// Send request
																					$.ajax({
																						url: API_BASEURL + "plugin/m3dfio",
																						type: "POST",
																						dataType: "json",
																						data: JSON.stringify({command: "message", value: commands}),
																						contentType: "application/json; charset=UTF-8"
																					});
																				}

																				// Send request
																				$.ajax({
																					url: API_BASEURL + "plugin/m3dfio",
																					type: "POST",
																					dataType: "json",
																					data: JSON.stringify({command: "message", value: commands}),
																					contentType: "application/json; charset=UTF-8"
																				});
																			});
																		}

																		// Send request
																		$.ajax({
																			url: API_BASEURL + "plugin/m3dfio",
																			type: "POST",
																			dataType: "json",
																			data: JSON.stringify({command: "message", value: commands}),
																			contentType: "application/json; charset=UTF-8"
																		});
																	}

																	// Send request
																	$.ajax({
																		url: API_BASEURL + "plugin/m3dfio",
																		type: "POST",
																		dataType: "json",
																		data: JSON.stringify({command: "message", value: commands}),
																		contentType: "application/json; charset=UTF-8"
																	});
																}

																// Send request
																$.ajax({
																	url: API_BASEURL + "plugin/m3dfio",
																	type: "POST",
																	dataType: "json",
																	data: JSON.stringify({command: "message", value: commands}),
																	contentType: "application/json; charset=UTF-8"
																});
															});
														}

														// Send request
														$.ajax({
															url: API_BASEURL + "plugin/m3dfio",
															type: "POST",
															dataType: "json",
															data: JSON.stringify({command: "message", value: commands}),
															contentType: "application/json; charset=UTF-8"
														});
													}

													// Send request
													$.ajax({
														url: API_BASEURL + "plugin/m3dfio",
														type: "POST",
														dataType: "json",
														data: JSON.stringify({command: "message", value: commands}),
														contentType: "application/json; charset=UTF-8"
													});
												}

												// Send request
												$.ajax({
													url: API_BASEURL + "plugin/m3dfio",
													type: "POST",
													dataType: "json",
													data: JSON.stringify({command: "message", value: commands}),
													contentType: "application/json; charset=UTF-8"
												});
											});
										}

										// Send request
										$.ajax({
											url: API_BASEURL + "plugin/m3dfio",
											type: "POST",
											dataType: "json",
											data: JSON.stringify({command: "message", value: commands}),
											contentType: "application/json; charset=UTF-8"
										});
									}

									// Send request
									$.ajax({
										url: API_BASEURL + "plugin/m3dfio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({command: "message", value: commands}),
										contentType: "application/json; charset=UTF-8"
									});
								}

								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m3dfio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({command: "message", value: commands}),
									contentType: "application/json; charset=UTF-8"
								});
							});
						}

						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m3dfio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({command: "message", value: commands}),
							contentType: "application/json; charset=UTF-8"
						});
					}
	
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: commands}),
						contentType: "application/json; charset=UTF-8"
					});
				}
		
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: commands}),
					contentType: "application/json; charset=UTF-8"
				});
			}, "No", function() {
			
				// Hide message
				hideMessage();
			});
		});
		
		// Set HengLiXin fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(1)").attr("title", "Sets fan to HengLiXin fan").click(function(event) {
			
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
				
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok", function() {
			
						// Hide message
						hideMessage();
					});
				}
			});
		});
	
		// Set Listener fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(2)").attr("title", "Sets fan to Listener fan").click(function(event) {
			
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
				
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok", function() {
			
						// Hide message
						hideMessage();
					});
				}
			});
		});
	
		// Set Shenzhew fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(3)").attr("title", "Sets fan to Shenzhew fan").click(function(event) {
			
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
			
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok", function() {
			
						// Hide message
						hideMessage();
					});
				}
			});
		});
		
		// Set Xinyujie fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(4)").attr("title", "Sets fan to Xinyujie fan").click(function(event) {
			
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
			
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok", function() {
			
						// Hide message
						hideMessage();
					});
				}
			});
		});
	
		// Set 500mA extruder current control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(5)").attr("title", "Sets extruder's current to 500mA").click(function(event) {
			
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
			
					// Show message
					showMessage("Extruder Status", data.value == "Ok" ? "Done" : "Failed", "Ok", function() {
			
						// Hide message
						hideMessage();
					});
				}
			});
		});
	
		// Set 660mA extruder current control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(6)").attr("title", "Sets extruder's current to 660mA").click(function(event) {
			
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
			
					// Show message
					showMessage("Extruder Status", data.value == "Ok" ? "Done" : "Failed", "Ok", function() {
			
						// Hide message
						hideMessage();
					});
				}
			});
		});
		
		// Change EEPROM display control
		$("#control > div.jog-panel.eeprom").find("input[type=\"radio\"]").eq(0).attr("title", "Displays EEPROM as hexadecimal values");
		$("#control > div.jog-panel.eeprom").find("input[type=\"radio\"]").eq(1).attr("title", "Displays EEPROM as decimal values");
		$("#control > div.jog-panel.eeprom").find("input[type=\"radio\"]").eq(2).attr("title", "Displays EEPROM as ASCII values");
		$("#control > div.jog-panel.eeprom").find("input[type=\"radio\"]").click(function() {
		
			// Update EEPROM table
			updateEepromTable();
			
			// Update EEPROM display type
			eepromDisplayType = $(this).val();
		});
		
		// Read EEPROM control
		$("#control > div.jog-panel.eeprom").find("div > button:nth-of-type(1)").attr("title", "Reads EEPROM from the printer").click(function(event) {
			
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
			
					// Show message
					showMessage("EEPROM Status", data.value == "Ok" ? "Done" : "Failed", "Ok", function() {
	
						// Hide message
						hideMessage();
					});
				}
			});
		});
		
		// Write EEPROM control
		$("#control > div.jog-panel.eeprom").find("div > button:nth-of-type(2)").attr("title", "Writes changes to the printer's EEPROM").click(function(event) {
			
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
				
				// Make sure value is 2 digits
				if(value.length == 1)
					value = '0' + value;
				
				// Check if value is invalid
				if(!value.length || value.length > 2 || !/^[0-9a-fA-F]+$/.test(value)) {
				
					// Clear EEPROM and return false
					eeprom = '';
					return false;
				}
				
				// Append value to EEPROM
				eeprom += value.toUpperCase();
			});
			
			// Check if a value was invalid
			if(!eeprom.length) {
			
				// Show message
				showMessage("EEPROM Status", "Invalid EEPROM value", "Ok", function() {
				
					// Hide message
					hideMessage();
				});
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
			
						// Show message
						showMessage("EEPROM Status", data.value == "Ok" ? "Done" : "Failed", "Ok", function() {
						
							// Hide message
							hideMessage();
							
							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m3dfio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({command: "message", value: "Reconnect"}),
								contentType: "application/json; charset=UTF-8"
							});
						});
					}
				});
			}
		});
		
		// OctoPrint instance manager change event
		$("#navbar_plugin_m3dfio > select").change(function() {
		
			// Check if creating a new instance
			if($(this).val() == "new") {
			
				// Show message
				showMessage("Message", "Creating OctoPrint instance");
			
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: "Create OctoPrint Instance"}),
					contentType: "application/json; charset=UTF-8",
					
					// On success
					success: function(data) {
					
						// Check if an error occured
						if(data.value == "Error") {
						
							// Show message
							showMessage("Message", "Failed to create OctoPrint instance", "Ok", function() {
							
								// Hide message
								hideMessage();
							});
						}
						
						// Otherwise
						else
						
							setTimeout(function() {
						
								// Go to OctoPrint instance
								window.location.port = data.port;
							}, 1000);
					}
				});
			}
			
			// Check if closing an instance
			else if($(this).val() == "close") {
			
				// Show message
				showMessage("Message", "Closing OctoPrint instance");
			
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: "Close OctoPrint Instance: " + window.location.port}),
					contentType: "application/json; charset=UTF-8",
					
					// On success
					success: function(data) {
					
						// Go through all options
						$("#navbar_plugin_m3dfio > select > option").each(function() {
						
							// Check if another OctoPrint instance exists
							if($(this).attr("value") != "new" && $(this).attr("value") != "close" && $(this).attr("value") != window.location.port) {
							
								var port = $(this).attr("value")
								setTimeout(function() {
				
									// Go to OctoPrint instance
									window.location.port = port;
								}, 1000);
							
								return false;
							}
						});
					}
				});
			}
			
			// Otherwise
			else
			
				// Go to OctoPrint instance
				window.location.port = $(this).val();
		});
		
		// On update firmware with file input change
		$("#control > div.jog-panel.advanced").find("div > input").change(function(event) {

			// Initialize variables
			var file = this.files[0];

			// Clear input
			$(this).val('');

			// Check if file has no name
			if(!file.name.length) {

				// Show message
				showMessage("Firmware Status", "Invalid file name", "Ok", function() {
		
					// Hide message
					hideMessage();
				});
			}

			// Go through each character of the file's name
			for(var index = (file.name.indexOf(' ') != -1 ? file.name.indexOf(' ') + 1 : 0); index < file.name.length; index++) {

				// Check if extension is occuring
				if(file.name[index] == '.') {
	
					// Break if file name contaisn version
					if(file.name.indexOf(' ') != -1 && index - file.name.indexOf(' ') - 1 == 10)
						break;
			
					if(index == 10)
						break;
			
					// Show message
					showMessage("Firmware Status", "Invalid file name", "Ok", function() {

						// Hide message
						hideMessage();
					});
		
					// Return
					return;
				}
	
				// Check if current character isn't a digit or length is invalid
				if(file.name[index] < '0' || file.name[index] > '9' || (index == file.name.length - 1 && index < 9)) {
	
					// Show message
					showMessage("Firmware Status", "Invalid file name", "Ok", function() {

						// Hide message
						hideMessage();
					});
		
					// Return
					return;
				}
			}

			// Check if the file is too big
			if(file.size > 32768) {

				// Show message
				showMessage("Firmware Status", "Invalid file size", "Ok", function() {
		
					// Hide message
					hideMessage();
				});
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
						data: JSON.stringify({command: "file", name: file.name, content: event.target.result}),
						contentType: "application/json; charset=UTF-8",
	
						// On success
						success: function(data) {
	
							// Show message
							showMessage("Firmware Status", data.value == "Ok" ? "Done" : "Failed", "Ok", function() {
	
								// Hide message
								hideMessage();
								
								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m3dfio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({command: "message", value: "Reconnect"}),
									contentType: "application/json; charset=UTF-8"
								});
							});
						}
					});
				};
			}
		});
		
		// Ping
		function ping() {
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Ping"}),
				contentType: "application/json; charset=UTF-8",
				
				// Complete
				complete: function() {
					
					// Ping again
					setTimeout(ping, 180 * 1000);
				}
			});
		}
		setTimeout(ping, 180 * 1000);
		
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
			
			// Check if data is current firmware
			else if(data.value == "Current Firmware" && typeof data.name !== "undefined" && typeof data.release !== "undefined") {
			
				// Set name to unknown if not specified
				if(data.name == null)
					data.name = "an unknown"
			
				// Set firmware text
				$("#control div.jog-panel.advanced p").text("Currently using " + data.name + " firmware V" + data.release);
			}
				
			// Check if data is printer details
			else if(data.value == "Printer Details" && typeof data.serialNumber !== "undefined" && typeof data.serialPort !== "undefined")
			
				// Update connected printer details
				$("#navbar_plugin_m3dfio > a").text(data.serialNumber + " at " + data.serialPort);
			
			// Otherwise check if data is that a Micro 3D isn't connected
			else if(data.value == "Micro 3D Not Connected" && printerConnected) {
			
				// Clear printer connected
				printerConnected = false;
				$("#control > div.jog-panel.advanced").find("div > button").removeClass("current");
				$("#control > div.jog-panel.eeprom table input").val(eepromDisplayType == "ascii" ? "?" : (eepromDisplayType == "decimal" ? "???" : "??"));
				$("#control div.jog-panel.advanced p").text('');
				$("#navbar_plugin_m3dfio > a").text('');
			}
			
			// Otherwise check if data is that a heatbed is detected
			else if(data.value == "Heatbed Detected") {
			
				// Display heatbed controls
				$("#control .heatbed, #settings_plugin_m3dfio .heatbed, body > div.page-container > div.message .heatbed").css("display", "block");
				$("#control > div.jog-panel.extruder").find("h1:not(.heatbed)").text("Tools");
				
				// Set using heatbed
				usingHeatbed = true;
			}
			
			// Otherwise check if data is that a heatbed is not detected
			else if(data.value == "Heatbed Not Detected") {
			
				// Hide heatbed controls
				$("#control .heatbed, #settings_plugin_m3dfio .heatbed, body > div.page-container > div.message .heatbed").css("display", "none");
				$("#control > div.jog-panel.extruder").find("h1:not(.heatbed)").text("Extruder");
				
				// Clear using heatbed
				usingHeatbed = false;
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
					$("#gcode_upload_progress > div.bar").text('');
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
			
			// Otherwise check if data is to change last message
			else if(data.value == "Change last message" && typeof data.text !== "undefined")
			
				// Set error message text
				setTimeout(function() {
					$("div.ui-pnotify:last-of-type > div > div.ui-pnotify-text > p").text(data.text);
				}, 100);
			
			// Otherwise check if data is to create a message
			else if(data.value == "Create message" && typeof data.type !== "undefined" && typeof data.title !== "undefined" && typeof data.text !== "undefined")
			
				// Display error message
				new PNotify({
					title: htmlEncode(data.title),
					text: "<p>" + htmlEncode(data.text) + "</p>",
					type: data.type,
					hide: false
				});
			
			// Otherwise check if data is to enable shared library options
			else if(data.value == "Enable Shared Library")
			
				// Enable shared library options
				$("#settings_plugin_m3dfio label.sharedLibrary").removeClass("disabled").children("input").prop("disabled", false);
			
			// Otherwise check if data is to disable shared library options
			else if(data.value == "Disable Shared Library")
			
				// Disable shared library options
				$("#settings_plugin_m3dfio label.sharedLibrary").addClass("disabled").children("input").prop("disabled", true);
			
			// Otherwise check if data is that Cura isn't installed
			else if(data.value == "Cura Not Installed") {
			
				// Show message
				showMessage("Message", "It's recommended that you install the <a href=\"https://ultimaker.com/en/products/cura-software/list\" target=\"_blank\">latest Cura 15.04 release</a> on this server to fully utilize M3D Fio's capabilities", "Ok", function() {
					
					// Hide message
					hideMessage();
					
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: "Disable Reminder: Cura"}),
						contentType: "application/json; charset=UTF-8"
					});
				});
			}
			
			// Otherwise check if data is that sleep wont disable
			else if(data.value == "Sleep Wont Disable") {
			
				// Show message
				showMessage("Message", "It's recommended that you disable this server's sleep functionality while printing if it's not already disabled", "Ok", function() {
				
					// Hide message
					hideMessage();
					
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: "Disable Reminder: Sleep"}),
						contentType: "application/json; charset=UTF-8"
					});
				});
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
			
			// Otherwise check if data is to cycle power
			else if(data.value == "Cycle Power") {
			
				// Get message
				var message = $("body > div.page-container > div.message");
	
				// Check if message is already being shown that doesn't need confirmation
				if(message.css("z-index") != "9999" || !message.find("button.confirm").eq(1).hasClass("show"))
			
					// Show message
					showMessage("Message", "No Micro 3D printer detected. Try cycling the printer's power and try again.", "Ok", function() {
				
						// Hide message
						hideMessage();
					});
			}
			
			// Otherwise check if data is process details
			else if(data.value == "Process Details" && typeof data.processes !== "undefined") {
			
				// Reset process details
				$("#navbar_plugin_m3dfio > select > option:not([value=\"new\"]):not([value=\"close\"])").remove();
				
				// Go through all processes
				var currentPort;
				for(var i = 0; i < data.processes.length; i++)
			
					// Go through all options
					$("#navbar_plugin_m3dfio > select > option").each(function() {
				
						// Check if at end of options or at ordered position
						if($(this).attr("value") == "new" || parseInt($(this).attr("value")) > parseInt(data.processes[i][0])) {
			
							// Insert option
							$(this).before("<option value = \"" + data.processes[i][0] + "\">Port " + data.processes[i][0] + "</option>");
							
							// Set current port
							if(data.processes[i][1] == true)
								currentPort = i;
							
							// Return false
							return false;
						}
					});
				
				// Go through all options
				$("#navbar_plugin_m3dfio > select > option").each(function() {
				
					// Check if current port
					if(parseInt($(this).attr("value")) == parseInt(data.processes[currentPort][0])) {
				
						// Select current port
						$(this).attr("selected", "true");
						
						// Return false
						return false;
					}
				});	
			}
			
			// Otherwise check if data is provided firmware versions
			else if(data.value == "Provided Firmwares" && typeof data.firmwares !== "undefined") {
			
				// Go to place holder buttons
				var currentPosition = $("#control > div.jog-panel.advanced").find("div > button:nth-of-type(7)");
				
				// Go through all provided firmwares
				for(firmware in data.firmwares) {
				
					// Add update firmware to provided button
					currentPosition.removeClass("placeHolder").addClass("firmware").data("name", firmware).attr("title", "Updates printer's firmware to " + firmware + " V" + data.firmwares[firmware]["Release"]).text("Update firmware to " + firmware + " V" + data.firmwares[firmware]["Release"]).off("click").click(function() {
					
						// Set firmware name
						var firmwareName = $(this).data("name");
						
						// Check if updating to functional firmware
						if(firmwareName == "M3D") {
						
							// Show message
							showMessage("Firmware Status", "Updating firmware");

							// Send request
							$.ajax({
								url: API_BASEURL + "plugin/m3dfio",
								type: "POST",
								dataType: "json",
								data: JSON.stringify({command: "message", value: "Update Firmware To Provided: " + firmwareName}),
								contentType: "application/json; charset=UTF-8",

								// On success
								success: function(data) {

									// Show message
									showMessage("Firmware Status", data.value == "Ok" ? "Done" : "Failed", "Ok", function() {
	
										// Hide message
										hideMessage();
										
										// Send request
										$.ajax({
											url: API_BASEURL + "plugin/m3dfio",
											type: "POST",
											dataType: "json",
											data: JSON.stringify({command: "message", value: "Reconnect"}),
											contentType: "application/json; charset=UTF-8"
										});
									});
								}
							});
						}
						
						// Otherwise
						else {
		
							// Show message
							showMessage("Firmware Status", htmlEncode(firmwareName) + " is not a fully functional firmware. It's currently only intended to be used by developers. Continue?", "Yes", function() {
			
								// Hide message
								hideMessage();
				
								// Show message
								showMessage("Firmware Status", "Updating firmware");

								// Send request
								$.ajax({
									url: API_BASEURL + "plugin/m3dfio",
									type: "POST",
									dataType: "json",
									data: JSON.stringify({command: "message", value: "Update Firmware To Provided: " + firmwareName}),
									contentType: "application/json; charset=UTF-8",

									// On success
									success: function(data) {

										// Show message
										showMessage("Firmware Status", data.value == "Ok" ? "Done" : "Failed", "Ok", function() {
		
											// Hide message
											hideMessage();
											
											// Send request
											$.ajax({
												url: API_BASEURL + "plugin/m3dfio",
												type: "POST",
												dataType: "json",
												data: JSON.stringify({command: "message", value: "Reconnect"}),
												contentType: "application/json; charset=UTF-8"
											});
										});
									}
								});
							}, "No", function() {
			
								// Hide message
								hideMessage();
							});
						}
					});
					
					// Go to next place holder
					currentPosition = currentPosition.next("button");
				}
				
				// Add update firmware with file button
				currentPosition.removeClass("placeHolder").attr("title", "Updates printer's firmware with a provided file").text("Update firmware with file").off("click").click(function() {
				
					// Open file input dialog
					$("#control > div.jog-panel.advanced").find("div > input").click();
				});
			}
			
			// Otherwise check if data is to save software settings
			else if(data.value == "Save Software Settings") {
			
				// Save software settings
				function saveSoftwareSettings() {
					self.settings.saveData();
				}
				
				// Update settings
				if(self.settings.requestData.toString().split('\n')[0].indexOf("callback") != -1)
					self.settings.requestData(saveSoftwareSettings);
				else
					self.settings.requestData().done(saveSoftwareSettings);
			}
			
			// Otherwise check if data is EEPROM
			else if(data.value == "EEPROM" && typeof data.eeprom !== "undefined") {
			
				// Update EEPROM table
				updateEepromTable(data.eeprom);
				
				// Remove current indicators from buttons
				$("#control > div.jog-panel.advanced").find("div > button").removeClass("current");
				
				// Indicate current fan type
				var fanType = (parseInt(data.eeprom[eepromOffsets["fanType"].offset * 2], 16) << 4) | parseInt(data.eeprom[eepromOffsets["fanType"].offset * 2 + 1], 16);
				if(fanType >= 1 && fanType <= 4)
					$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(" + fanType + ")").addClass("current");
					
				// Indicate current extruder current
				var extruderCurrent = ((parseInt(data.eeprom[eepromOffsets["extruderCurrent"].offset * 2], 16) << 4) | parseInt(data.eeprom[eepromOffsets["extruderCurrent"].offset * 2 + 1], 16)) | (((parseInt(data.eeprom[(eepromOffsets["extruderCurrent"].offset + 1) * 2], 16) << 4) | parseInt(data.eeprom[(eepromOffsets["extruderCurrent"].offset + 1) * 2 + 1], 16)) << 8)
				if(extruderCurrent == 500)
					$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(5)").addClass("current");
				else if(extruderCurrent == 660)
					$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(6)").addClass("current");
			}
			
			// Otherwise check if data is invalid values
			else if(data.value == "Invalid" && typeof data.bedCenter !== "undefined" && typeof data.bedOrientation !== "undefined") {
			
				// Check if bed center is invalid
				if(data.bedCenter) {
				
					// Display message
					showMessage("Error Status", "Invalid bed center Z0. Calibrate?", "Yes", function() {
					
						// Hide message
						hideMessage();
						
						// Show message
						showMessage("Error Status", "Calibrating bed center Z0");
		
						// Set commands
						var commands = [
							"G90",
							"M109 S150",
							"M104 S0",
							"M107",
							"G30",
							"M117",
							"M65536;wait"
						];
						
						// Set waiting callback
						waitingCallback = function() {
						
							// Check if bed orientation is invalid
							if(data.bedOrientation) {
			
								// Display message
								showMessage("Error Status", "Invalid bed orientation. Calibrate?", "Yes", function() {
								
									// Hide message
									hideMessage();
					
									// Show message
									showMessage("Error Status", "Calibrating bed orientation");
	
									// Set commands
									var commands = [
										"M104 S0",
										"G90",
										"G0 Z3 F90",
										"M109 S150",
										"M104 S0",
										"M107",
										"G32",
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
											showMessage("Error Status", "Done", "Ok", function() {

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
										url: API_BASEURL + "plugin/m3dfio",
										type: "POST",
										dataType: "json",
										data: JSON.stringify({command: "message", value: commands}),
										contentType: "application/json; charset=UTF-8"
									});
								}, "No", function() {
				
									// Hide message
									hideMessage();
								});
							}
							
							// Otherwise
							else {
		
								// Show message
								showMessage("Error Status", "Done", "Ok", function() {
				
									// Hide message
									hideMessage();
								});
							}
						
						}
		
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m3dfio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({command: "message", value: commands}),
							contentType: "application/json; charset=UTF-8"
						});
					}, "No", function() {
					
						// Hide message
						hideMessage();
					});
				}
				
				// Otherwise check if bed orientation is invalid
				else if(data.bedOrientation) {
				
					// Display message
					showMessage("Error Status", "Invalid bed orientation. Calibrate?", "Yes", function() {
					
						// Hide message
						hideMessage();
						
						// Show message
						showMessage("Error Status", "Calibrating bed orientation");
		
						// Set commands
						var commands = [
							"M104 S0",
							"G90",
							"G0 Z3 F90",
							"M109 S150",
							"M104 S0",
							"M107",
							"G32",
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
								showMessage("Error Status", "Done", "Ok", function() {

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
							url: API_BASEURL + "plugin/m3dfio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({command: "message", value: commands}),
							contentType: "application/json; charset=UTF-8"
						});
					}, "No", function() {
					
						// Hide message
						hideMessage();
					});
				}
			}
			
			// Otherwise check if data is to show message
			else if(data.value == "Show Message" && typeof data.message !== "undefined")
			
				// Display message
				showMessage("Printing Status", htmlEncode(data.message));
			
			// Otherwise check if data is to hide message
			else if(data.value == "Hide Message")
			
				// Hide message
				hideMessage();
			
			// Otherwise check if data is a status error message
			else if(data.value == "Error" && typeof data.message !== "undefined") {

				// Check if a response is requested
				if(typeof data.response !== "undefined") {
				
					// Display message
					showMessage("Error Status", htmlEncode(data.message), "Yes", function() {
		
						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m3dfio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({command: "message", value: "Yes"}),
							contentType: "application/json; charset=UTF-8"
						});
					}, "No", function() {
					
						// Hide message
						hideMessage();
						
						// Send request
						$.ajax({
							url: API_BASEURL + "plugin/m3dfio",
							type: "POST",
							dataType: "json",
							data: JSON.stringify({command: "message", value: "No"}),
							contentType: "application/json; charset=UTF-8"
						});
					});
				}
				
				// Otherwise check if a confirmation is requested
				else if(typeof data.confirm !== "undefined") {
				
					// Display message
					showMessage("Error Status", htmlEncode(data.message), "Ok", function() {
					
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
				}
				
				// Otherwise
				else
				
					// Display message
					showMessage("Error Status", htmlEncode(data.message));
			}
			
			// Otherwise check if data is doen waiting
			else if(data.value == "Done Waiting" && typeof waitingCallback === "function") {
			
				// Clear waiting callback
				var temp = waitingCallback;
				waitingCallback = null;
			
				// Call waiting callback
				temp();
			}
		}
		
		// User log in event
		self.onUserLoggedIn = function() {
		
			// Enable managing OctoPrint instances
			$("#navbar_plugin_m3dfio > select > option").last().prop("disabled", false).prev().prop("disabled", false);
			
			// Disable closing initial OctoPrint instance
			if(window.location.port == 5000)
				$("#navbar_plugin_m3dfio > select > option").last().prop("disabled", true)
		}
		
		// User log out event
		self.onUserLoggedOut = function() {
		
			// Disable managing OctoPrint instances
			$("#navbar_plugin_m3dfio > select > option").last().prop("disabled", true).prev().prop("disabled", true);
		}
		
		// On server disconnect event
		self.onServerDisconnect = function() {
		
			// Get message
			var message = $("body > div.page-container > div.message");
		
			// Check if a progress message is being shown
			if(message.hasClass("show") && !message.find("button.confirm").eq(1).hasClass("show")) {
			
				// Reset message system
				messages = [];
				skippedMessages = 0;
		
				// Show message
				showMessage("Server Status", "You've been disconnected from the server which has most likely caused the printer's current operation to fail. This page will now be refreshed to prevent further problems.", "Ok", function() {

					// Hide message
					hideMessage();
					
					// Refresh the page
					location.reload();
				});
			}
			
			// Otherwise
			else {
			
				// Check if a message is shown
				if(message.hasClass("show"))
				
					// Hide message
					hideMessage();
			
				// Show message
				showMessage("Server Status", "You've been disconnected from the server. This page will now be refreshed to prevent any problems.", "Ok", function() {

					// Hide message
					hideMessage();
					
					// Refresh the page
					location.reload();
				});
			}
		}
	}

	// Register plugin
	OCTOPRINT_VIEWMODELS.push([
	
		// Constructor
		M3DFioViewModel,
		["printerStateViewModel", "temperatureViewModel", "settingsViewModel", "gcodeFilesViewModel", "slicingViewModel", "terminalViewModel"]
	]);
});
