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
		var slicerName;
		var slicerProfileName;
		var slicerProfileContent;
		var printerProfileName;
		var modelCenter = [0, 0];
		var currentZ;
		var viewport = null;
		var convertedModel = null;
		var self = this;
		
		// Get state views
		self.printerState = parameters[0];
		self.temperature = parameters[1];
		self.settings = parameters[2];
		self.files = parameters[3];
		self.slicing = parameters[4];
		
		// Bed dimensions
		var bedLowMaxX = 113.0;
		var bedLowMinX = 0.0;
		var bedLowMaxY = 107.0;
		var bedLowMinY = 0.0;
		var bedLowMaxZ = 5.0;
		var bedLowMinZ = 0.0;
		var bedMediumMaxX = 110.2;
		var bedMediumMinX = 2.8;
		var bedMediumMaxY = 107.0;
		var bedMediumMinY = -6.6;
		var bedMediumMaxZ = 73.5;
		var bedMediumMinZ = bedLowMaxZ;
		var bedHighMaxX = 82.0;
		var bedHighMinX = 2.35;
		var bedHighMaxY = 92.95;
		var bedHighMinY = 20.05;
		var bedHighMaxZ = 112.0;
		var bedHighMinZ = bedMediumMaxZ
		
		// Set printer materials
		var printerMaterials = {
		
			Black: new THREE.MeshPhongMaterial({
				color: 0x000000,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			White: new THREE.MeshPhongMaterial({
				color: 0xFFFFFF,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			Blue: new THREE.MeshPhongMaterial({
				color: 0x2EBADD,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			Green: new THREE.MeshPhongMaterial({
				color: 0x7AE050,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			Orange: new THREE.MeshPhongMaterial({
				color: 0x000000,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			Clear: new THREE.MeshPhongMaterial({
				color: 0x000000,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			}),
			
			Silver: new THREE.MeshPhongMaterial({
				color: 0xB9B9B9,
				specular: 0x050505,
				shininess: 80,
				side: THREE.DoubleSide
			})
		};
		
		// Set filament materials
		var filamentMaterials = {
		
			Blue: new THREE.MeshLambertMaterial({
				color: 0x2EBADD,
				side: THREE.DoubleSide
			}),
		
			Orange: new THREE.MeshLambertMaterial({
				color: 0xEC9F3B,
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
			}
			
			// Otherwise show button area and hide loading
			else {
				$("body > div.page-container > div.message > div > div > div:not(.calibrate)").addClass("show");
				$("body > div.page-container > div.message > div > img").removeClass("show");
				
				// Check if preforming a complete calibration
				if(secondButton == "Done") {
					$("body > div.page-container > div.message > div > div > div.calibrate").addClass("show");
				}
			}
	
			// Show message
			message.addClass("show").css("z-index", "9999");
		}

		// Hide message
		function hideMessage() {

			// Hide message
			$("body > div.page-container > div.message").removeClass("show");
			
			setTimeout(function() {
				$("body > div.page-container > div.message").css("z-index", '');
			}, 300);
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
				glow: null,
				boundaries: [],
				showBoundaries: false,
				measurements: [],
				showMeasurements: false,
				removeSelectionTimeout: null,

				// Initialize
				init: function() {
	
					// Create scene
					for(var i = 0; i < 2; i++)
						this.scene[i] = new THREE.Scene();

					// Create camera
					var SCREEN_WIDTH = $("#slicing_configuration_dialog").width(), SCREEN_HEIGHT = $("#slicing_configuration_dialog").height() - 123;
					var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
					this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
					this.scene[0].add(this.camera);
					this.camera.position.set(0, 0, -340);
					this.camera.lookAt(new THREE.Vector3(0, 0, 0));

					// Create renderer
					this.renderer = new THREE.WebGLRenderer({
						antialias: true
					});
					this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
					this.renderer.autoClear = false;

					// Create controls
					this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
					this.orbitControls.target.set(0, 62, 0);
					this.orbitControls.minDistance = 200;
					this.orbitControls.maxDistance = 500;
					this.orbitControls.minPolarAngle = 0;
					this.orbitControls.maxPolarAngle = Math.PI / 2;
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
						color: 0xD0E0E6,
						side: THREE.BackSide
					});
					var skyBox = new THREE.Mesh(skyBoxGeometry, skyBoxMaterial);
					this.scene[0].add(skyBox);
		
					// Load printer model
					var printer = new THREE.STLLoader();
					printer.load("/plugin/m3dfio/static/files/printer.stl", function(geometry) {
		
						// Create printer's mesh
						var mesh = new THREE.Mesh(geometry, printerMaterials[self.settings.settings.plugins.m3dfio.PrinterColor()]);
			
						// Set printer's orientation
						mesh.rotation.set(3 * Math.PI / 2, 0, Math.PI);
						mesh.position.set(0, 60.7, 0);
						mesh.scale.set(1, 1, 1);
				
						// Append model to list
						viewport.models.push({mesh: mesh, type: "stl"});
			
						// Add printer to scene
						viewport.scene[0].add(mesh);
					
						// Render
						viewport.render();
						
						// Import model
						viewport.importModel(file, "stl");
					});
					
					// Create measurement material
					var measurementMaterial = new THREE.LineBasicMaterial({
						color: 0x0000ff,
						side: THREE.DoubleSide
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
						side: THREE.DoubleSide
					});
				
					// Low bottom boundary
					this.boundaries[0] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
					this.boundaries[0].geometry.vertices[0].set(-bedLowMinX, bedLowMinZ, bedLowMinY);
					this.boundaries[0].geometry.vertices[1].set(-bedLowMaxX, bedLowMinZ, bedLowMinY);
					this.boundaries[0].geometry.vertices[2].set(-bedLowMinX, bedLowMinZ, bedLowMaxY);
					this.boundaries[0].geometry.vertices[3].set(-bedLowMaxX, bedLowMinZ, bedLowMaxY);
				
					// Low front boundary
					this.boundaries[1] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
					this.boundaries[1].geometry.vertices[0].set(-bedLowMinX, bedLowMinZ, bedLowMinY);
					this.boundaries[1].geometry.vertices[1].set(-bedLowMaxX, bedLowMinZ, bedLowMinY);
					this.boundaries[1].geometry.vertices[2].set(-bedLowMinX, bedLowMaxZ, bedLowMinY);
					this.boundaries[1].geometry.vertices[3].set(-bedLowMaxX, bedLowMaxZ, bedLowMinY);
				
					// Low back boundary
					this.boundaries[2] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
					this.boundaries[2].geometry.vertices[0].set(-bedLowMinX, bedLowMinZ, bedLowMaxY);
					this.boundaries[2].geometry.vertices[1].set(-bedLowMaxX, bedLowMinZ, bedLowMaxY);
					this.boundaries[2].geometry.vertices[2].set(-bedLowMinX, bedLowMaxZ, bedLowMaxY);
					this.boundaries[2].geometry.vertices[3].set(-bedLowMaxX, bedLowMaxZ, bedLowMaxY);
				
					// Low right boundary
					this.boundaries[3] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
					this.boundaries[3].geometry.vertices[0].set(-bedLowMaxX, bedLowMinZ, bedLowMinY);
					this.boundaries[3].geometry.vertices[1].set(-bedLowMaxX, bedLowMinZ, bedLowMaxY);
					this.boundaries[3].geometry.vertices[2].set(-bedLowMaxX, bedLowMaxZ, bedLowMinY);
					this.boundaries[3].geometry.vertices[3].set(-bedLowMaxX, bedLowMaxZ, bedLowMaxY);
				
					// Low left boundary
					this.boundaries[4] = new THREE.Mesh(new THREE.PlaneGeometry(0, 0), boundaryMaterial.clone());
					this.boundaries[4].geometry.vertices[0].set(-bedLowMinX, bedLowMinZ, bedLowMinY);
					this.boundaries[4].geometry.vertices[1].set(-bedLowMinX, bedLowMinZ, bedLowMaxY);
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
						this.boundaries[i].position.x -= -(bedLowMaxX + bedLowMinX) / 2;
						this.boundaries[i].position.z -= (bedLowMaxY + bedLowMinY) / 2;
						this.boundaries[i].visible = false;
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
			
					// Blur input
					$("#slicing_configuration_dialog .modal-extra div.values input").blur();
			
					// Disable orbit controls
					viewport.orbitControls.enabled = false;
				},
			
				// End transform
				endTransform: function() {
			
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
						mesh.updateMatrix();
						mesh.geometry.applyMatrix(mesh.matrix);
						mesh.position.set(0, 0, 0);
						mesh.rotation.set(0, 0, 0);
						mesh.scale.set(1, 1, 1);
		
						// Add model to scene
						viewport.scene[0].add(mesh);
				
						// Append model to list
						viewport.models.push({mesh: mesh, type: type});
		
						// Select model
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
					if(!$("#slicing_configuration_dialog .modal-extra input:focus").length) {
	
						// Check what key was pressed
						switch(event.keyCode) {
			
							// Check if tab was pressed
							case 9 :
				
								// Prevent default action
								event.preventDefault();
			
								// Check if an object is selected
								if(viewport.transformControls.object) {
				
									// Go through all models
									for(var i = 1; i < viewport.models.length; i++)
					
										// Check if model is currently selected
										if(viewport.models[i].mesh == viewport.transformControls.object) {
						
											// Check if model is the last one
											if(i == viewport.models.length - 1)
							
												// Remove selection
												viewport.removeSelection();
							
											// Otherwise
											else
							
												// Select next model
												viewport.selectModel(viewport.models[i + 1].mesh);
							
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
							break;
			
							// Check if delete was pressed
							case 46 :
				
								// Check if an object is selected
								if(viewport.transformControls.object)
					
									// Delete model
									viewport.deleteModel();
							break;
					
				
							// Check if ctrl was pressed
							case 17 :
				
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
						}
					}
				},
		
				// Key up event
				keyUpEvent: function(event) {
	
					// Check what key was pressed
					switch(event.keyCode) {
				
						// Check if ctrl was released
						case 17 :
				
							// Disable grid and rotation snap
							viewport.disableSnap();
						break;
					}
				},
		
				// Mouse down event
				mouseDownEvent: function(event) {
		
					// Check if not clicking on a button or input
					if(!$(event.target).is("button, input")) {
		
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
						if(intersects.length > 0 && intersects[0].object != modelMeshes[0])
			
							// Select object
							viewport.selectModel(intersects[0].object);
			
						// Otherwise
						else {
					
							// Set remove selection interval
							viewport.removeSelectionTimeout = setTimeout(function() {
						
								// Remove selection
								viewport.removeSelection();
							
								// Render
								viewport.render();
							}, 70);
						
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
		
					// Initialize variables
					var centerX = 0;
					var centerZ = 0;
					var mergedGeometry = new THREE.Geometry();
				
					// Remove selection if an object is selected
					if(viewport.transformControls.object)
						viewport.removeSelection();
			
					// Go through all models
					for(var i = 1; i < viewport.models.length; i++) {
			
						// Get current model
						var model = viewport.models[i];
		
						// Sum model's center together
						centerX -= model.mesh.position.x;
						centerZ += model.mesh.position.z;
		
						// Save model's current matrix
						model.mesh.updateMatrix();
						var matrix = model.mesh.matrix;
		
						// Set model's orientation
						model.mesh.geometry.applyMatrix(model.mesh.matrix);
						model.mesh.position.set(0, 0, 0);
						if(model.type == "stl")
							model.mesh.rotation.set(3 * Math.PI / 2, 0, Math.PI);
						else if(model.type == "obj")
							model.mesh.rotation.set(Math.PI / 2, Math.PI, 0);
						model.mesh.scale.set(1, 1, 1);
						viewport.render();
			
						// Merge model's geometry together
						mergedGeometry.merge(model.mesh.geometry, model.mesh.matrix);
		
						// Apply model's previous matrix
						model.mesh.applyMatrix(matrix);
						model.mesh.updateMatrix();
						viewport.render();
					}
				
					// Get average center for models
					centerX /= (viewport.models.length - 1);
					centerZ /= (viewport.models.length - 1);
					
					// Save model's center
					modelCenter = [centerX, centerZ];
			
					// Create merged mesh from merged geometry
					var mergedMesh = new THREE.Mesh(mergedGeometry);
			
					// Return merged mesh as an STL
					var exporter = new THREE.STLBinaryExporter();
					return new Blob([exporter.parse(mergedMesh)], {type: "text/plain"});
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
		
					// Get currently selected model
					var model = viewport.transformControls.object;
	
					// Get model's boundary box
					var boundaryBox = new THREE.Box3().setFromObject(model);
					boundaryBox.min.sub(model.position);
					boundaryBox.max.sub(model.position);
		
					// Set model's lowest Y value to be at 0
					model.position.y -= model.position.y + boundaryBox.min.y;
					
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
			
					// Get currently selected model
					var model = viewport.transformControls.object;
		
					// Clone model
					var clonedModel = new THREE.Mesh(model.geometry.clone(), model.material.clone());
				
					// Copy original orientation
					clonedModel.applyMatrix(model.matrix);
				
					// Add cloned model to scene
					viewport.scene[0].add(clonedModel);
				
					for(var i = 0; i < viewport.models.length; i++)
						if(viewport.models[i].mesh == model) {
						
							// Append model to list
							viewport.models.push({mesh: clonedModel, type: viewport.models[i].type});
							break;
						}
					
					// Select model
					viewport.selectModel(clonedModel);

					// Fix model's Y
					viewport.fixModelY();
					
					// Remove selection
					viewport.removeSelection();
					
					// Render
					viewport.render();
					
					setTimeout(function() {
				
						// Select model
						viewport.selectModel(clonedModel);
						
						// Render
						viewport.render();
					}, 100);
					
					// Set model loaded
					viewport.modelLoaded = true;
				},
			
				// Reset model
				resetModel: function() {
			
					// Get currently selected model
					var model = viewport.transformControls.object;
				
					// Reset model's orientation
					model.position.set(0, 0, 0);
					model.rotation.set(0, 0, 0);
					model.scale.set(1, 1, 1);
				
					// Fix model's Y
					viewport.fixModelY();
				},
			
				// Delete model
				deleteModel: function() {
			
					// Remove object
					for(var i = 0; i < viewport.models.length; i++)
						if(viewport.models[i].mesh == viewport.transformControls.object) {
							viewport.models.splice(i, 1);
							break;
						}
					viewport.scene[0].remove(viewport.transformControls.object);
			
					// Remove selection
					viewport.removeSelection();
					
					// Update boundaries
					viewport.updateBoundaries();
					
					// Render
					viewport.render();
				},
			
				// Remove selection
				removeSelection: function() {
			
					// Check if an object is selected
					if(viewport.transformControls.object) {
			
						// Set model's material
						viewport.transformControls.object.material = filamentMaterials[$("#slicing_configuration_dialog .modal-extra div.filament button.disabled").data("color")];
				
						// Remove selection
						viewport.transformControls.detach();
				
						// Remove glow
						viewport.scene[1].remove(viewport.glow);
						viewport.glow = null;
						
						// Update model changes
						viewport.updateModelChanges();
					}
				},
			
				// Select model
				selectModel: function(model) {
			
					// Select model
					viewport.transformControls.attach(model);
				
					// Set model's material
					model.material = new THREE.MeshLambertMaterial({
						color: 0xEC9F3B,
						side: THREE.DoubleSide
					});
				
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
				
					// Remove previous glow
					if(viewport.glow)
						viewport.scene[1].remove(viewport.glow);
				
					// Create glow
					model.updateMatrix();
					viewport.glow = new THREE.Mesh(model.geometry.clone(), glowMaterial);
				    	viewport.glow.applyMatrix(model.matrix);
				    	
				    	// Add glow to scene
					viewport.scene[1].add(viewport.glow);
				
					// Update model changes
					viewport.updateModelChanges();
				},
				
				// Apply changes
				applyChanges: function(name, value) {
	
					// Get currently selected model
					var model = viewport.transformControls.object;

					// Check if in translate mode
					if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("translate")) {
	
						// Set model's position
						if(name == 'x')
							model.position.x = -parseFloat(value);
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
							model.scale.x = parseFloat(value);
						else if(name == 'y')
							model.scale.y = parseFloat(value);
						else if(name == 'z')
							model.scale.z = parseFloat(value);
					}
		
					// Fix model's Y
					viewport.fixModelY();
				},
			
				// Update model changes
				updateModelChanges: function() {
				
					// Get currently selected model
					var model = viewport.transformControls.object;
					
					// Check if a showing measurements and model is currently selected
					if(viewport.showMeasurements && model) {
				
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
					
						if(viewport.showMeasurements)
							$("#slicing_configuration_dialog .modal-extra div.measurements > p").addClass("show");
						else
							$("#slicing_configuration_dialog .modal-extra div.measurements > p").removeClass("show");
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
						$("#slicing_configuration_dialog .modal-extra div.values p").addClass("show");
						if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("translate"))
							$("#slicing_configuration_dialog .modal-extra div.values input[name=\"y\"").parent().removeClass("show");
		
						// Check if an input is not focused
						if(!$("#slicing_configuration_dialog .modal-extra input:focus").length) {
		
							// Check if in translate mode
							if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("translate")) {
	
								// Display position values
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"x\"").val((model.position.x.toFixed(3) == 0 ? 0 : -model.position.x).toFixed(3));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"z\"").val(model.position.z.toFixed(3));
							}
		
							// Otherwise check if in rotate mode
							else if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("rotate")) {

								// Display rotation values
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"x\"").val((model.rotation.x * 180 / Math.PI).toFixed(3));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"y\"").val((model.rotation.y * 180 / Math.PI).toFixed(3));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"z\"").val((model.rotation.z * 180 / Math.PI).toFixed(3));
							}
		
							// Otherwise check if in scale mode
							else if($("#slicing_configuration_dialog .modal-extra div.values").hasClass("scale")) {

								// Display scale values
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"x\"").val(model.scale.x.toFixed(3));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"y\"").val(model.scale.y.toFixed(3));
								$("#slicing_configuration_dialog .modal-extra div.values input[name=\"z\"").val(model.scale.z.toFixed(3));
							}
						}
					}
	
					// Otherwise
					else {
	
						// Disable delete, clone, and reset
						$("#slicing_configuration_dialog .modal-extra button.delete, #slicing_configuration_dialog .modal-extra button.clone, #slicing_configuration_dialog .modal-extra button.reset").addClass("disabled");
	
						// Hide values
						$("#slicing_configuration_dialog .modal-extra div.values p").removeClass("show");
		
						// Blur input
						$("#slicing_configuration_dialog .modal-extra div.values input").blur();
					}
				
					// Check if glow exists
					if(viewport.glow) {
			
						// Get currently selected model
						var model = viewport.transformControls.object;
			
						// Update glow's orientation
						viewport.glow.position.copy(model.position);
						viewport.glow.rotation.copy(model.rotation);
						viewport.glow.scale.copy(model.scale);
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
						viewport.boundaries[i].renderOrder = 1;
					}
				
					// Check if models goes out of bounds on low front
					if(minimums[0].z < bedLowMinY - (bedLowMaxY + bedLowMinY) / 2) {
				
						// Set boundary
						viewport.boundaries[1].material.color.setHex(0xFF0000);
						viewport.boundaries[1].material.opacity = 0.7;
						viewport.boundaries[1].visible = true;
						viewport.boundaries[1].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[1].visible = viewport.showBoundaries;
				
					// Check if models goes out of bounds on low back
					if(maximums[0].z > bedLowMaxY - (bedLowMaxY + bedLowMinY) / 2) {
				
						// Set boundary
						viewport.boundaries[2].material.color.setHex(0xFF0000);
						viewport.boundaries[2].material.opacity = 0.7;
						viewport.boundaries[2].visible = true;
						viewport.boundaries[2].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[2].visible = viewport.showBoundaries;
				
					// Check if models goes out of bounds on low right
					if(maximums[0].x > bedLowMaxX - (bedLowMaxX + bedLowMinX) / 2) {
				
						// Set boundary
						viewport.boundaries[3].material.color.setHex(0xFF0000);
						viewport.boundaries[3].material.opacity = 0.7;
						viewport.boundaries[3].visible = true;
						viewport.boundaries[3].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[3].visible = viewport.showBoundaries;
				
					// Check if models goes out of bounds on low left
					if(minimums[0].x < bedLowMinX - (bedLowMaxX + bedLowMinX) / 2) {
				
						// Set boundary
						viewport.boundaries[4].material.color.setHex(0xFF0000);
						viewport.boundaries[4].material.opacity = 0.7;
						viewport.boundaries[4].visible = true;
						viewport.boundaries[4].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[4].visible = viewport.showBoundaries;
				
					// Check if models goes out of bounds on medium front
					if(minimums[1].z < bedMediumMinY - (bedLowMaxY + bedLowMinY) / 2) {
				
						// Set boundary
						viewport.boundaries[5].material.color.setHex(0xFF0000);
						viewport.boundaries[5].material.opacity = 0.7;
						viewport.boundaries[5].visible = true;
						viewport.boundaries[5].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[5].visible = viewport.showBoundaries;
				
					// Check if models goes out of bounds on medium back
					if(maximums[1].z > bedMediumMaxY - (bedLowMaxY + bedLowMinY) / 2) {
				
						// Set boundary
						viewport.boundaries[6].material.color.setHex(0xFF0000);
						viewport.boundaries[6].material.opacity = 0.7;
						viewport.boundaries[6].visible = true;
						viewport.boundaries[6].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[6].visible = viewport.showBoundaries;
				
					// Check if models goes out of bounds on medium right
					if(maximums[1].x > bedMediumMaxX - (bedLowMaxX + bedLowMinX) / 2) {
				
						// Set boundary
						viewport.boundaries[7].material.color.setHex(0xFF0000);
						viewport.boundaries[7].material.opacity = 0.7;
						viewport.boundaries[7].visible = true;
						viewport.boundaries[7].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[7].visible = viewport.showBoundaries;
				
					// Check if models goes out of bounds on medium left
					if(minimums[1].x < bedMediumMinX - (bedLowMaxX + bedLowMinX) / 2) {
				
						// Set boundary
						viewport.boundaries[8].material.color.setHex(0xFF0000);
						viewport.boundaries[8].material.opacity = 0.7;
						viewport.boundaries[8].visible = true;
						viewport.boundaries[8].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[8].visible = viewport.showBoundaries;
				
					// Check if models goes out of bounds on high front
					if(minimums[2].z < bedHighMinY - (bedLowMaxY + bedLowMinY) / 2) {
				
						// Set boundary
						viewport.boundaries[9].material.color.setHex(0xFF0000);
						viewport.boundaries[9].material.opacity = 0.7;
						viewport.boundaries[9].visible = true;
						viewport.boundaries[9].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[9].visible = viewport.showBoundaries;
				
					// Check if models goes out of bounds on high back
					if(maximums[2].z > bedHighMaxY - (bedLowMaxY + bedLowMinY) / 2) {
				
						// Set boundary
						viewport.boundaries[10].material.color.setHex(0xFF0000);
						viewport.boundaries[10].material.opacity = 0.7;
						viewport.boundaries[10].visible = true;
						viewport.boundaries[10].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[10].visible = viewport.showBoundaries;
				
					// Check if models goes out of bounds on high right
					if(maximums[2].x > bedHighMaxX - (bedLowMaxX + bedLowMinX) / 2) {
				
						// Set boundary
						viewport.boundaries[11].material.color.setHex(0xFF0000);
						viewport.boundaries[11].material.opacity = 0.7;
						viewport.boundaries[11].visible = true;
						viewport.boundaries[11].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[11].visible = viewport.showBoundaries;
				
					// Check if models goes out of bounds on high left
					if(minimums[2].x < bedHighMinX - (bedLowMaxX + bedLowMinX) / 2) {
				
						// Set boundary
						viewport.boundaries[12].material.color.setHex(0xFF0000);
						viewport.boundaries[12].material.opacity = 0.7;
						viewport.boundaries[12].visible = true;
						viewport.boundaries[12].renderOrder = 0;
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
						viewport.boundaries[13].renderOrder = 0;
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
						viewport.boundaries[14].renderOrder = 0;
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
						viewport.boundaries[15].renderOrder = 0;
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
						viewport.boundaries[16].renderOrder = 0;
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
						viewport.boundaries[17].renderOrder = 0;
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
						viewport.boundaries[18].renderOrder = 0;
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
						viewport.boundaries[19].renderOrder = 0;
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
						viewport.boundaries[20].renderOrder = 0;
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
						viewport.boundaries[21].renderOrder = 0;
					}
				
					// Otherwise
					else
				
						// Set boundary's visibility
						viewport.boundaries[21].visible = viewport.showBoundaries;
				},

				// Render
				render: function() {
		
					// Update controls
					viewport.transformControls.update();
					viewport.orbitControls.update();
				
					// Check if glow exists
					if(viewport.glow) {
				
						// Get camera distance
						var distance = viewport.camera.position.distanceTo(viewport.orbitControls.target);
						if(distance < 200)
							distance = 200;
						else if(distance > 500)
							distance = 500;
				
						// Set measurement size
						$("#slicing_configuration_dialog .modal-extra div.measurements > p").css("font-size", 8 + ((500 / distance) - 1) / (2.5 - 1) * (12 - 8) + "px");
						
						// Set z index order for measurement values
						var order = [];
						for(var i = 0; i < 3; i++)
							order[i] = viewport.camera.position.distanceTo(viewport.measurements[i][1]);
						
						for(var i = 0; i < 3; i++) {
							var lowest = order.indexOf(Math.max.apply(Math, order));
							$("#slicing_configuration_dialog .modal-extra div.measurements > p").eq(lowest).css("z-index", i);
							order[lowest] = Number.NEGATIVE_INFINITY;
						}
						
						// Position measurement values
						for(var i = 0; i < 3; i++) {
							var position = viewport.get2dPosition(viewport.measurements[i][1]);
							$("#slicing_configuration_dialog .modal-extra div.measurements > p").eq(i).css({"top" : position.y - 3 + "px", "left" : position.x - $("#slicing_configuration_dialog .modal-extra div.measurements > p").eq(i).width() / 2 + "px"});
						}
						
						// Update glow's view vector
						viewport.glow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(viewport.camera.position, viewport.glow.position);
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
			else
				var loader = new THREE.STLLoader();
			
			// Load model
			return loader.load(file, function(geometry) {
			
				// Create model's mesh
				var mesh = new THREE.Mesh(geometry);
				
				// Set model's rotation
				if(type == "obj")
					mesh.rotation.set(Math.PI / 2, Math.PI, 0);
				else
					mesh.rotation.set(0, 0, 0);
				
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
		$("#control > div.jog-panel.controls").find("div.distance > div > button:nth-of-type(3)").click();
	
		// Change tool section text
		$("#control > div.jog-panel").eq(1).addClass("extruder").find("h1").text("Extruder").after(`
			<h1 class="microPass">Extruder</h1>
		`);

		// Create motor on control
		$("#control > div.jog-panel").eq(2).addClass("general").find("div").prepend(`
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M17'}) }">Motors on</button>
		`);
		
		// Change fan controls
		$("#control > div.jog-panel.general").find("button:nth-of-type(2)").after(`
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M106 S255 *'}) }">Fan on</button>
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M107 *'}) }">Fan off</button>
		`)
		$("#control > div.jog-panel.general").find("button:nth-of-type(5)").remove();
		$("#control > div.jog-panel.general").find("button:nth-of-type(5)").remove();
		
		// Create absolute and relative controls
		$("#control > div.jog-panel.general").find("div").append(`
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'G90'}) }">Absolute mode</button>
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'G91'}) }">Relative mode</button>
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
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Print test border</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Run complete bed calibration</button>
				</div>
			</div>
		`);
	
		// Add advanced controls
		$("#control > div.jog-panel.calibration").after(`
			<div class="jog-panel advanced" data-bind="visible: loginState.isUser">
				<h1>Advanced</h1>
				<div>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="/plugin/m3dfio/static/img/HengLiXin.png">HengLiXin fan</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="/plugin/m3dfio/static/img/Listener.png">Listener fan</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="/plugin/m3dfio/static/img/Shenzhew.png">Shenzhew fan</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()"><img src="/plugin/m3dfio/static/img/Xinyujie.png">Xinyujie fan</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">500mA extruder current</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">660mA extruder current</button>
					<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser()">Update firmware</button>
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
			<button class="btn btn-block control-box" data-bind="enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M104 S0'}) }">Heater off</button>
			<div class="microPass">
				<h1 class="microPass">Heat Bed</h1>
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
					<div>
						<button class="btn btn-block confirm"></button>
						<button class="btn btn-block confirm"></button>
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
		
		// Upload file event
		$("#gcode_upload, #gcode_upload_sd").change(function(event) {
		
			// Initialize variables
			var file = this.files[0];
			
			// Check if uploading a Wavefront OBJ
			var extension = file.name.lastIndexOf('.');
			if(extension != -1 && file.name.substr(extension + 1) == "obj") {
			
				// Stop default behavior
				event.stopImmediatePropagation();
				
				// Set new file name and location
				var newFileName = file.name.substr(0, extension) + ".stl";
				var location = $(this).attr("id") == "gcode_upload" ? "local" : "sdcard";
				
				// Display message
				showMessage("Conversion Status", "Converting " + file.name + " to " + newFileName);
				
				// Convert file to STL
				convertedModel = null;
				convertToStl(URL.createObjectURL(file), file.name.substr(extension + 1));
				
				function conversionDone() {
				
					// Check if conversion is done
					if(convertedModel !== null) {
					
						// Read in file
						var reader = new FileReader();
						reader.readAsBinaryString(convertedModel);

						// On file load
						reader.onload = function(event) {
				
							// Set parameter
							var parameter = [
								{
									name: "Model Name",
									value: newFileName
								},
								{
									name: "Model Content",
									value: event.target.result
								},
								{
									name: "Model Location",
									value: location
								}
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
					
									// Hide message
									hideMessage();
							
									// Show slicing dialog
									self.files.requestData(newFileName, location);
									self.slicing.show(location, newFileName);
								}
							});
						}
					}
					
					// Otherwise
					else
					
						// Check if conversion is done again
						setTimeout(conversionDone, 300);
				
				}
				setTimeout(conversionDone, 300);
			}
		});
		
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
						data: JSON.stringify({command: "message", value: "Remove temp"}),
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
					}, 300);
				}
			}
		}, 300);
		
		// Slicer next button click event
		$("#slicing_configuration_dialog > div.modal-footer > .btn-primary").text("Next").click(function(event) {
		
			// Initialize variables
			var button = $(this);
		
			// Check if button isn't disabled
			if(!button.hasClass("disabled")) {
			
				// Check if on slicer menu is not done
				if(slicerMenu != "Done") {
			
					// Stop default behavior
					event.stopImmediatePropagation();
				
					// Disable button
					button.addClass("disabled");
					
					// Get slicer, slicer profile, printer profile, and model name
					slicerName = $("#slicing_configuration_dialog").find(".control-group:nth-of-type(1) select").val();
					slicerProfileName = $("#slicing_configuration_dialog").find(".control-group:nth-of-type(2) select").val();
					printerProfileName = $("#slicing_configuration_dialog").find(".control-group:nth-of-type(3) select").val();
					modelName = $("#slicing_configuration_dialog").find("h3").text();
					modelName = modelName.substr(modelName.indexOf(' ') + 1);
					
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
									value: "View profile: " + JSON.stringify({
										slicerName: slicerName,
										slicerProfileName: slicerProfileName,
										printerProfileName: printerProfileName
									})
								}),
								contentType: "application/json; charset=UTF-8",

								// On success
								success: function(data) {
								
									// Get file
									$.get(data.path, function(data) {
								
										// Hide cover
										$("#slicing_configuration_dialog .modal-cover").addClass("noTransition").removeClass("show");
										setTimeout(function() {
											$("#slicing_configuration_dialog .modal-cover").css("z-index", '').removeClass("noTransition");
										}, 300);
										
										// Display profile
										$("#slicing_configuration_dialog").addClass("profile");
										$("#slicing_configuration_dialog p.currentMenu").text("Modify Profile");
										$("#slicing_configuration_dialog .modal-body").css("display", "none");
										$("#slicing_configuration_dialog .modal-body").after(`
											<div class="modal-extra">
											<div>
												<aside></aside>
												<textarea spellcheck="false"></textarea>
												</div>
											</div
										`);
										$("#slicing_configuration_dialog .modal-extra textarea").val(data);
									
							
										// Set slicer menu
										slicerMenu = "Modify Profile";
							
										// Set button
										button.removeClass("disabled");
										
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
													for(var i = 1; i <= numberOfLines + 100; i++)
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
							
										// Resize window
										$(window).resize();
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
								
									// Display cover
									$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").text("Loading model…");
						
									setTimeout(function() {
			
										// Send request
										$.ajax({
											url: API_BASEURL + "plugin/m3dfio",
											type: "POST",
											dataType: "json",
											data: JSON.stringify({command: "message", value: "View model: " + modelName}),
											contentType: "application/json; charset=UTF-8",

											// On success
											success: function(data) {
											
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
																}, 300);
											
																// Display model
																$("#slicing_configuration_dialog").addClass("noTransition").removeClass("profile");
																setTimeout(function() {
																	$("#slicing_configuration_dialog").removeClass("noTransition").addClass("model");
																	$("#slicing_configuration_dialog p.currentMenu").text("Modify Model");
																	
																	$("#slicing_configuration_dialog .modal-extra").empty().append(`
																		<div class="printer">
																			<button data-color="Black"><img src="black.png"></button>
																			<button data-color="White"><img src="white.png"></button>
																			<button data-color="Blue" class="disabled"><img src="blue.png"></button>
																			<button data-color="Green"><img src="green.png"></button>
																			<button data-color="Orange"><img src="orange.png"></button>
																			<button data-color="Clear"><img src="clear.png"></button>
																			<button data-color="Silver"><img src="silver.png"></button>
																		</div>
																		<div class="filament">
																			<button data-color="Blue"><img style="background-color: #00EEEE;" src="filament.png"></button>
																			<button data-color="Orange" class="disabled"><img style="background-color: #FE9800;" src="filament.png"></button>
																		</div>
																		<div class="model">
																			<input type="file" accept=".stl, .obj">
																			<button class="import">Import</button>
																			<button class="translate disabled">Translate</button>
																			<button class="rotate">Rotate</button>
																			<button class="scale">Scale</button>
																			<button class="snap">Snap</button>
																			<button class="delete disabled">Delete</button>
																			<button class="clone disabled">Clone</button>
																			<button class="reset disabled">Reset</button>
																			<button class="boundaries">Boundaries</button>
																			<button class="measurements">Measurements</button>
																		</div>
																		<div class="values translate">
																			<p>X<input type="number" step="any" name="x"></p>
																			<p>Y<input type="number" step="any" name="y"></p>
																			<p>Z<input type="number" step="any" name="z"></p>
																		</div>
																		<div class="measurements">
																			<p class="width"></p>
																			<p class="depth"></p>
																			<p class="height"></p>
																		</div>
																	`);
																	$("#slicing_configuration_dialog .modal-extra").append(viewport.renderer.domElement);
																	
																	// Input change event
																	$("#slicing_configuration_dialog .modal-extra input[type=\"file\"]").change(function(event) {

																		// Set file type
																		var extension = this.files[0].name.lastIndexOf('.');
																		var type = extension != -1 ? this.files[0].name.substr(extension + 1) : "stl";
																		var url = URL.createObjectURL(this.files[0]);
																		
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
																					$("#slicing_configuration_dialog .modal-cover").addClass("noTransition").removeClass("show");
																					setTimeout(function() {
																						$("#slicing_configuration_dialog .modal-cover").css("z-index", '').removeClass("noTransition");
																					}, 300);
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
																					$("#slicing_configuration_dialog .modal-cover").addClass("noTransition").removeClass("show");
																					setTimeout(function() {
																						$("#slicing_configuration_dialog .modal-cover").css("z-index", '').removeClass("noTransition");
																					}, 300);
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
	
																	// Printer color button click event
																	$("#slicing_configuration_dialog .modal-extra div.printer button").click(function() {
	
																		// Set printer color
																		viewport.models[0].mesh.material = printerMaterials[$(this).data("color")];
																		$(this).addClass("disabled").siblings(".disabled").removeClass("disabled");
		
																		// Render
																		viewport.render();
																	});
	
																	// Filament color button click event
																	$("#slicing_configuration_dialog .modal-extra div.filament button").click(function() {
	
																		// Set models' color
																		for(var i = 1; i < viewport.models.length; i++)
																			if(viewport.models[i].mesh !== viewport.transformControls.object)
																				viewport.models[i].mesh.material = filamentMaterials[$(this).data("color")];
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
												
												xhr.open('GET', data.path);
												xhr.responseType = "blob";
												xhr.setRequestHeader("X-Api-Key", $.ajaxSettings.headers["X-Api-Key"])
												xhr.send();
											}
										});
									}, 300);
								}
								
								// Otherwise
								else {
								
									// Ok click event
									$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
									
										// Enable button
										button.removeClass("disabled");
					
										// Hide message
										hideMessage();
									});
				
									// Show message
									showMessage("Slicer Status", "Invalid profile", "Ok");
								}
							}
						});
					}
					
					// Otherwise check if on modify model menu
					else if(slicerMenu == "Modify Model") {
						
						// Display cover
						$("#slicing_configuration_dialog .modal-cover").addClass("show").css("z-index", "9999").children("p").text("Applying changes…");
						
						setTimeout(function() {
			
							// Read in exported scene
							var reader = new FileReader();
							reader.readAsBinaryString(viewport.exportScene());

							// On file load
							reader.onload = function(event) {
							
								// Append model's center to slicer profile if slicer is Cura
								if(slicerName == "cura") 
									slicerProfileContent += "\nobject_center_x = " + modelCenter[0] + "\nobject_center_y = " + modelCenter[1] + '\n';
			
								// Set parameter
								var parameter = [
									{
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
										name: "Model Name",
										value: modelName
									},
									{
										name: "Model Content",
										value: event.target.result
									},
									{
										name: "Printer Profile Name",
										value: printerProfileName
									}
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
							
										// Set slicer menu to done
										slicerMenu = "Done";
										
										// Slice
										button.removeClass("disabled").click();
									}
								});
							};
						}, 300);
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
				"G91\n",
				"G0 Z" + ($(this).hasClass("down") ? '-' : '') + $("body > div.page-container > div.message").find("button.distance.active").text() + " F100\n"
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
		$("#control > div.jog-panel.extruder").find("div > button:first-of-type").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 E" + ($("#control > div.jog-panel.extruder").find("div > div:nth-of-type(2) >input").val().length ? $("#control > div.jog-panel.extruder").find("div > div:nth-of-type(2) >input").val() : '5' ) + " F450\n"
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
		$("#control > div.jog-panel.extruder").find("div > button:nth-of-type(2)").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 E-" + ($("#control > div.jog-panel.extruder").find("div > div:nth-of-type(2) >input").val().length ? $("#control > div.jog-panel.extruder").find("div > div:nth-of-type(2) >input").val() : '5' ) + " F450\n"
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
		$("#control > div.jog-panel.extruder").find("div > button:nth-of-type(4)").click(function(event) {
			
			// Check if not printing
			if(self.printerState.isPrinting() !== true) {
			
				// Set commands
				var commands = [
					"M109 S" + parseInt($(this).text().substr(12)) + ' *\n',
					"G4 S2\n"
				];
			
				// Show message
				showMessage("Temperature Status", "Warming up");
			
				// Add wait command
				commands.push("M65536;wait\n");
			
				// Display temperature
				var updateTemperature = setInterval(function() {
			
					// Show message
					showMessage("Temperature Status", "Warming up: " + self.temperature.temperatures.tool0.actual[self.temperature.temperatures.tool0.actual.length - 1][1] + "°C");
				}, 1000);
			}
			
			// Otherwise
			else
			
				// Set commands
				var commands = [
					"M104 S" + parseInt($(this).text().substr(12)) + ' *\n'
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
				
					// Check if not printing
					if(self.printerState.isPrinting() !== true) {
				
						// Stop displaying temperature
						clearInterval(updateTemperature);
					
						// Ok click event
						$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
							// Hide message
							hideMessage();
						});
				
						// Show message
						showMessage("Temperature Status", "Done", "Ok");
					}
				}
			});
		});
		
		// Set heat bed temperature control
		$("#control > div.jog-panel.extruder").find("div > div.microPass > button:first-of-type").click(function(event) {
			
			// Check if not printing
			if(self.printerState.isPrinting() !== true) {
			
				// Set commands
				var commands = [
					"M190 S" + parseInt($(this).text().substr(12)) + ' *\n',
					"G4 S2\n"
				];
			
				// Show message
				showMessage("Temperature Status", "Warming up");
			
				// Add wait command
				commands.push("M65536;wait\n");
			
				// Display temperature
				var updateTemperature = setInterval(function() {
			
					// Show message
					showMessage("Temperature Status", "Warming up: " + self.temperature.temperatures.bed.actual[self.temperature.temperatures.bed.actual.length - 1][1] + "°C");
				}, 1000);
			}
			
			// Otherwise
			else
			
				// Set commands
				var commands = [
					"M140 S" + parseInt($(this).text().substr(12)) + ' *\n'
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
				
					// Check if not printing
					if(self.printerState.isPrinting() !== true) {
			
						// Stop displaying temperature
						clearInterval(updateTemperature);
					
						// Ok click event
						$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
							// Hide message
							hideMessage();
						});
				
						// Show message
						showMessage("Temperature Status", "Done", "Ok");
					}
				}
			});
		});
	
		// Set unload filament control
		$("#control > div.jog-panel.filament").find("div > button:nth-of-type(1)").click(function(event) {
			
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
							$("body > div.page-container > div.message").find("button.confirm").eq(0).one("click", function() {
							
								// Unload filament again
								$("body > div.page-container > div.message").find("button.confirm").off("click");
								$("#control > div.jog-panel.filament").find("div > button:nth-of-type(1)").click();
							});
				
							// Yes click event
							$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
				
								// Hide message
								$("body > div.page-container > div.message").find("button.confirm").off("click");
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
		$("#control > div.jog-panel.filament").find("div > button:nth-of-type(2)").click(function(event) {
			
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
							$("body > div.page-container > div.message").find("button.confirm").eq(0).one("click", function() {
							
								// Load filament again
								$("body > div.page-container > div.message").find("button.confirm").off("click");
								$("#control > div.jog-panel.filament").find("div > button:nth-of-type(2)").click();
							});
				
							// Yes click event
							$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
				
								// Hide message
								$("body > div.page-container > div.message").find("button.confirm").off("click");
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(1)").click(function(event) {
			
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
				"M107\n",
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
						// Hide message
						hideMessage();
					});
				
					// Show message
					showMessage("Calibration Status", "Done", "Ok");
				}
			});
		});
	
		// Set calibrate bed orientation control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(2)").click(function(event) {
			
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
				"M107\n",
				"G32\n",
				"M619 S2\n",
				"M619 S3\n",
				"M619 S4\n",
				"M619 S5\n",
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
						// Hide message
						hideMessage();
					});
				
					// Show message
					showMessage("Calibration Status", "Done", "Ok");
				}
			});
		});
	
		// Set go to front left
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(3)").click(function(event) {
		
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(5)").click(function(event) {
		
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(7)").click(function(event) {
		
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(9)").click(function(event) {
		
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(4)").click(function(event) {
			
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
							$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(6)").click(function(event) {
			
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
							$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(8)").click(function(event) {
			
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
							$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(10)").click(function(event) {
			
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
							$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
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
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(11)").click(function(event) {
			
			// Show message
			showMessage("Saving Status", "Saving Z as bed center Z0");
			
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"G91\n",
				"G0 Z0.0999 F100\n",
				"G33\n",
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Saving Status", "Done", "Ok");
				}
			});
		});
		
		// Set print test border control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(12)").click(function(event) {
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Print test border"}),
				contentType: "application/json; charset=UTF-8",
			});
		});
		
		// Complete bed calibration control
		$("#control > div.jog-panel.calibration").find("div > button:nth-of-type(13)").click(function(event) {
			
			// No click event
			$("body > div.page-container > div.message").find("button.confirm").eq(0).one("click", function() {
			
				// Hide message
				$("body > div.page-container > div.message").find("button.confirm").off("click");
				hideMessage();
			});

			// Yes click event
			$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {

				// Disable clicking
				$("body > div.page-container > div.message").find("button.confirm").off("click");
				
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
					"M107\n",
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
							"M107\n",
							"G32\n",
							"M619 S2\n",
							"M619 S3\n",
							"M619 S4\n",
							"M619 S5\n",
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
							
								// Show message
								showMessage("Calibration Status", "Calibrating front left offset");
			
								// Set commands
								var commands = [
									"G4 P100\n",
									"M65537;stop\n",
									"G90\n",
									"G0 Z3 F100\n",
									"G28\n",
									"G0 X9 Y5 Z3 F100\n",
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
									
										// Done click event
										$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
		
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
			
															// Show message
															showMessage("Calibration Status", "Calibrating front right offset");
			
															// Set commands
															var commands = [
																"G4 P100\n",
																"M65537;stop\n",
																"G90\n",
																"G0 Z3 F100\n",
																"G28\n",
																"G0 X99 Y5 Z3 F100\n",
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
									
																	// Done click event
																	$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
		
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
			
																						// Show message
																						showMessage("Calibration Status", "Calibrating back right offset");
			
																						// Set commands
																						var commands = [
																							"G4 P100\n",
																							"M65537;stop\n",
																							"G90\n",
																							"G0 Z3 F100\n",
																							"G28\n",
																							"G0 X99 Y95 Z3 F100\n",
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
									
																								// Done click event
																								$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
		
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
			
																													// Show message
																													showMessage("Calibration Status", "Calibrating back left offset");
			
																													// Set commands
																													var commands = [
																														"G4 P100\n",
																														"M65537;stop\n",
																														"G90\n",
																														"G0 Z3 F100\n",
																														"G28\n",
																														"G0 X9 Y95 Z3 F100\n",
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
									
																															// Done click event
																															$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
		
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
			
																																				// Set commands
																																				commands = [
																																					"G4 P100\n",
																																					"M65537;stop\n",
																																					"G90\n",
																																					"G28\n",
																																					"M18\n",
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
																																						$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
																																							// Hide message
																																							hideMessage();
																																						});
				
																																						// Show message
																																						showMessage("Calibration Status", "Done", "Ok");
																																					}
																																				});
																																			}
																																		});
																																	}
																																});
																															});
		
																															// Show message
																															showMessage("Calibration Status", "Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved.", "Done");
																														}
																													});
																												}
																											});
																										}
																									});
																								});
		
																								// Show message
																								showMessage("Calibration Status", "Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved.", "Done");
																							}
																						});
																					}
																				});
																			}
																		});
																	});
		
																	// Show message
																	showMessage("Calibration Status", "Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved.", "Done");
																}
															});
														}
													});
												}
											});
										});
		
										// Show message
										showMessage("Calibration Status", "Lower the print head until it barely touches the bed. One way to get to that point is to place a single sheet of paper on the bed under the print head, and lower the print head until the paper can no longer be moved.", "Done");
									}
								});
							}
						});
					}
				});
			});
		
			// Show message
			showMessage("Calibration Status", "This process can take a while to complete and will require your input during some steps. Proceed?", "Yes", "No");
		});
		
		// Set HengLiXin fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(1)").click(function(event) {
			
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
	
		// Set Listener fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(2)").click(function(event) {
			
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
	
		// Set Shenzhew fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(3)").click(function(event) {
			
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
		
		// Set Xinyujie fan control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(4)").click(function(event) {
			
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Fan Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
	
		// Set 500mA extruder current control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(5)").click(function(event) {
			
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Extruder Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
	
		// Set 660mA extruder current control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(6)").click(function(event) {
			
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
			
						// Hide message
						hideMessage();
					});
		
					// Show message
					showMessage("Extruder Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
	
		// Set update firmware control
		$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(7)").click(function(event) {
	
			// Open file input dialog
			$("#control > div.jog-panel.advanced").find("div > input").click();
		});
		
		// On update firmware input change
		$("#control > div.jog-panel.advanced").find("div > input").change(function(event) {
	
			// Initialize variables
			var file = this.files[0];
		
			// Clear input
			$(this).val('');
		
			// Check if file has no name
			if(!file.name.length) {
		
				// Ok click event
				$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
		
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
		
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
		
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
				$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
		
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
						data: JSON.stringify({command: "file", name: file.name, content: event.target.result}),
						contentType: "application/json; charset=UTF-8",
			
						// On success
						success: function(data) {
			
							// Ok click event
							$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
			
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
		$("#control > div.jog-panel.eeprom").find("input[type=\"radio\"]").click(function() {
		
			// Update EEPROM table
			updateEepromTable();
			
			// Update EEPROM display type
			eepromDisplayType = $(this).val();
		});
		
		// Read EEPROM control
		$("#control > div.jog-panel.eeprom").find("div > button:nth-of-type(1)").click(function(event) {
			
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
	
						// Hide message
						hideMessage();
					});

					// Show message
					showMessage("EEPROM Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
				}
			});
		});
		
		// Write EEPROM control
		$("#control > div.jog-panel.eeprom").find("div > button:nth-of-type(2)").click(function(event) {
			
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
				$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
	
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
						$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
	
							// Hide message
							hideMessage();
						});

						// Show message
						showMessage("EEPROM Status", data.value == "Ok" ? "Done" : "Failed", "Ok");
					}
				});
			}
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
				$("#control > div.jog-panel.advanced").find("div > button").removeClass("current");
				$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(7)").text("Update firmware");
				$("#control > div.jog-panel.eeprom table input").val(eepromDisplayType == "ascii" ? "?" : (eepromDisplayType == "decimal" ? "???" : "??"));
			}
			
			// Otherwise check if data is that a Micro Pass is connected
			else if(data.value == "Micro Pass Connected" && printerConnected) {
			
				// Display heat bed controls
				$("#control .microPass").css("display", "block");
				$("#control > div.jog-panel.extruder").find("h1:not(.microPass)").text("Tools");
			}
			
			// Otherwise check if data is that a Micro Pass isn't connected
			else if(data.value == "Micro Pass Not Connected") {
			
				// Hide heat bed controls
				$("#control .microPass").css("display", "none");
				$("#control > div.jog-panel.extruder").find("h1:not(.microPass)").text("Extruder");
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
				    text: "<p>" + data.text + "</p><div class=\"pnotify_additional_info\"><div class=\"pnotify_more\"><a href=\"#\" onclick=\"$(this).children().toggleClass('icon-caret-right icon-caret-down').parent().parent().next().slideToggle('fast')\">More <i class=\"icon-caret-right\"></i></a></div><div class=\"pnotify_more_container hide\"><pre><!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 3.2 Final//EN\"><title>500 Internal Server Error</title><h1>Internal Server Error</h1><p>The server encountered an internal error and was unable to complete your request. Either the server is overloaded or there is an error in the application.</p></pre></div></div>",
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
				$("#control > div.jog-panel.advanced").find("div > button").removeClass("current");
				
				// Indicate current fan type
				var fanType = (parseInt(data.eeprom[0x2AB * 2], 16) << 4) | parseInt(data.eeprom[0x2AB * 2 + 1], 16);
				if(fanType >= 1 && fanType <= 4)
					$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(" + fanType + ")").addClass("current");
					
				// Indicate current extruder current
				var extruderCurrent = ((parseInt(data.eeprom[0x2E8 * 2], 16) << 4) | parseInt(data.eeprom[0x2E8 * 2 + 1], 16)) | (((parseInt(data.eeprom[0x2E9 * 2], 16) << 4) | parseInt(data.eeprom[0x2E9 * 2 + 1], 16)) << 8)
				if(extruderCurrent == 500)
					$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(5)").addClass("current");
				else if(extruderCurrent == 660)
					$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(6)").addClass("current");
				
				var firmwareVersion = ((parseInt(data.eeprom[0], 16) << 4) | parseInt(data.eeprom[1], 16)) | (((parseInt(data.eeprom[2], 16) << 4) | parseInt(data.eeprom[3], 16)) << 8) | (((parseInt(data.eeprom[4], 16) << 4) | parseInt(data.eeprom[5], 16)) << 16) | (((parseInt(data.eeprom[6], 16) << 4) | parseInt(data.eeprom[7], 16)) << 24);
				
				$("#control > div.jog-panel.advanced").find("div > button:nth-of-type(7)").html("Update firmware<span>Currently Using: " + firmwareVersion + "</span>");
			}
			
			// Otherwise check if data is invalid values
			else if(data.value == "Invalid" && typeof data.bedCenter !== "undefined" && typeof data.bedOrientation !== "undefined") {
			
				// Check if bed center is invalid
				if(data.bedCenter) {
				
					// No click event
					$("body > div.page-container > div.message").find("button.confirm").eq(0).one("click", function() {
					
						// Hide message
						$("body > div.page-container > div.message").find("button.confirm").off("click");
						hideMessage();
					});
		
					// Yes click event
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
		
						// Disable clicking
						$("body > div.page-container > div.message").find("button.confirm").off("click");
						
						// Show message
						showMessage("Error Status", "Calibrating bed center Z0");
		
						// Set commands
						var commands = [
							"G4 P100\n",
							"M65537;stop\n",
							"M104 S0\n",
							"G91\n",
							"G0 Y20 Z2 F150\n",
							"M109 S150\n",
							"M104 S0\n",
							"M107\n",
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
							
								// Check if bed orientation is invalid
								if(data.bedOrientation) {
				
									// No click event
									$("body > div.page-container > div.message").find("button.confirm").eq(0).one("click", function() {
					
										// Hide message
										$("body > div.page-container > div.message").find("button.confirm").off("click");
										hideMessage();
									});
		
									// Yes click event
									$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
		
										// Disable clicking
										$("body > div.page-container > div.message").find("button.confirm").off("click");
						
										// Show message
										showMessage("Error Status", "Calibrating bed orientation");
		
										// Set commands
										var commands = [
											"G4 P100\n",
											"M65537;stop\n",
											"M104 S0\n",
											"G91\n",
											"G0 Y20 Z2 F150\n",
											"M109 S150\n",
											"M104 S0\n",
											"M107\n",
											"G32\n",
											"M619 S2\n",
											"M619 S3\n",
											"M619 S4\n",
											"M619 S5\n",
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
												$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
													// Hide message
													hideMessage();
												});
				
												// Show message
												showMessage("Error Status", "Done", "Ok");
											}
										});
									});
					
									// Display message
									showMessage("Error Status", "Invalid bed orientation. Calibrate?", "Yes", "No");
								}
								
								// Otherwise
								else {
			
									// Ok click event
									$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
										// Hide message
										hideMessage();
									});
				
									// Show message
									showMessage("Error Status", "Done", "Ok");
								}
							}
						});
					});
					
					// Display message
					showMessage("Error Status", "Invalid bed center Z0. Calibrate?", "Yes", "No");
				}
				
				// Otherwise check if bed orientation is invalid
				else if(data.bedOrientation) {
				
					// No click event
					$("body > div.page-container > div.message").find("button.confirm").eq(0).one("click", function() {
					
						// Hide message
						$("body > div.page-container > div.message").find("button.confirm").off("click");
						hideMessage();
					});
					
					// Yes click event
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
		
						// Disable clicking
						$("body > div.page-container > div.message").find("button.confirm").off("click");
						
						// Show message
						showMessage("Error Status", "Calibrating bed orientation");
		
						// Set commands
						var commands = [
							"G4 P100\n",
							"M65537;stop\n",
							"M104 S0\n",
							"G91\n",
							"G0 Y20 Z2 F150\n",
							"M109 S150\n",
							"M104 S0\n",
							"M107\n",
							"G32\n",
							"M619 S2\n",
							"M619 S3\n",
							"M619 S4\n",
							"M619 S5\n",
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
								$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {
					
									// Hide message
									hideMessage();
								});
				
								// Show message
								showMessage("Error Status", "Done", "Ok");
							}
						});
					});
					
					// Display message
					showMessage("Error Status", "Invalid bed orientation. Calibrate?", "Yes", "No");
				}
			}
			
			// Otherwise check if data is to show message
			else if(data.value == "Show Message" && typeof data.message !== "undefined")
			
				// Display message
				showMessage("Printing Status", data.message);
			
			// Otherwise check if data is to hide message
			else if(data.value == "Hide Message")
			
				// Hide message
				hideMessage();
			
			// Otherwise check if data is a status error message
			else if(data.value == "Error" && typeof data.message !== "undefined") {

				// Check if a response is requested
				if(typeof data.response !== "undefined") {
				
					// Yes or no click event
					$("body > div.page-container > div.message").find("button.confirm").one("click", function() {
		
						// Disable clicking
						$("body > div.page-container > div.message").find("button.confirm").off("click");
						
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
					$("body > div.page-container > div.message").find("button.confirm").eq(1).one("click", function() {

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
		["printerStateViewModel", "temperatureViewModel", "settingsViewModel", "gcodeFilesViewModel", "slicingViewModel"]
	]);
});
