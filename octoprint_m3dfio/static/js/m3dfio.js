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
				scene: null,
				camera: null,
				renderer: null,
				orbitControls: null,
				transformControls: null,
				model: null,
				loaded: false,
				animationFrame: null,
	
				// Initialize
				init: function() {
				
					// Create scene
					this.scene = new THREE.Scene();

					// Create camera
					var SCREEN_WIDTH = $("#slicing_configuration_dialog").width(), SCREEN_HEIGHT = $(window).height() - 200;
					var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 1, FAR = 1000;
					this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
					this.scene.add(this.camera);
					this.camera.position.set(0, 0, -300);
					this.camera.lookAt(new THREE.Vector3(0, 0, 0));

					// Create renderer
					this.renderer = new THREE.WebGLRenderer({
						antialias: true
					});
					this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
					this.renderer.setClearColor(0xFFFFFF);

					// Create controls
					this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
					this.orbitControls.target.set(0, 62, 0);
					this.orbitControls.minDistance = 200;
					this.orbitControls.maxDistance = 500;
					this.orbitControls.minPolarAngle = 0;
					this.orbitControls.maxPolarAngle = Math.PI / 2;
					this.orbitControls.enablePan = false;
					
					this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement );
					this.transformControls.space = "world";
					this.transformControls.setAllowedTranslation("XZ");
					this.scene.add(this.transformControls);

					// Create lights
					this.scene.add(new THREE.AmbientLight(0x444444));
					var dirLight = new THREE.DirectionalLight(0xFFFFFF);
					dirLight.position.set(200, 200, 1000).normalize();
					this.camera.add(dirLight);
					this.camera.add(dirLight.target);
					
					// Load models
					this.loadModels();
					
					// Enable events
					this.transformControls.addEventListener("mouseUp", this.fixModelY);
					$(window).on("resize.viewport", this.resizeEvent);
					$(window).on("keydown.viewport", this.keyDownEvent);
				},
				
				// Load models
				loadModels: function() {
		
					// Load printer model
					var printer = new THREE.STLLoader();
					printer.load("/plugin/m3dfio/static/files/printer.stl", function(geometry) {
					
						// Create printer's mesh
						var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
							color: 0xB9B9B9, // Silver
							color: 0x7AE050, // Green
							color: 0x2EBADD, // Blue
							specular: 0x050505,
							shininess: 80,
							side: THREE.DoubleSide
						}));
						
						// Set printer's orientation
						mesh.rotation.set(3 * Math.PI / 2, 0, Math.PI);
						mesh.position.set(0, 61, 0);
						mesh.scale.set(1, 1, 1);
						
						// Add printer to scene
						viewport.scene.add(mesh);
						
						// Load model
						var model = new THREE.STLLoader();
						model.load(file, function(geometry) {
						
							// Center model
							geometry.center();
		
							// Create model's mesh
							var mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
								color: 0xEC9F3B,
								side: THREE.DoubleSide
							}));
							
							// Rotate model, but keep initial orientation
							mesh.rotation.set(3 * Math.PI / 2, 0, Math.PI);
							mesh.updateMatrix();
							mesh.geometry.applyMatrix(mesh.matrix);
							mesh.position.set(0, 0, 0);
							mesh.rotation.set(0, 0, 0);
							mesh.scale.set(1, 1, 1);
							
							// Add model to scene
							viewport.scene.add(mesh);
							
							// Attach model to transform controls
							viewport.model = mesh
							viewport.transformControls.attach(mesh);
							
							// Fix model's Y
							viewport.fixModelY();
						
							// Set loaded
							viewport.loaded = true;
						});
					});
				},
				
				// Key down event
				keyDownEvent: function(event) {
				
					// Check what key was pressed
					switch(event.keyCode) {
					
						// Check if W was pressed
						case 87:
						
							// Set control mode to translate
							viewport.transformControls.setMode("translate");
							viewport.transformControls.space = "world";
							viewport.transformControls.update();
						break;
						
						// Check if E was pressed
						case 69:
						
							// Set control mode to rotate
							viewport.transformControls.setMode("rotate");
							viewport.transformControls.space = "local";
							viewport.transformControls.update();
						break;
						
						// Check if R was pressed
						case 82:
						
							// Set control mode to scale
							viewport.transformControls.setMode("scale");
							viewport.transformControls.space = "local";
							viewport.transformControls.update();
						break;
					}
				},
				
				// Resize event
				resizeEvent: function() {
				
					// Update camera
					viewport.camera.aspect = $("#slicing_configuration_dialog").width() / ($(window).height() - 200);
					viewport.camera.updateProjectionMatrix();
					viewport.renderer.setSize($("#slicing_configuration_dialog").width(), $(window).height() - 200);
				},
				
				// Get model
				getModel: function() {
				
					// Get model's mesh
					var mesh = viewport.model;
					
					// Save model's center
					modelCenter = [-mesh.position.x, mesh.position.z];
					
					// Save mesh's current matrix
					mesh.updateMatrix();
					var matrix = mesh.matrix;
					
					// Undo initial rotation
					mesh.geometry.applyMatrix(mesh.matrix);
					mesh.position.set(0, 0, 0);
					mesh.rotation.set(3 * Math.PI / 2, 0, Math.PI);
					mesh.scale.set(1, 1, 1);
					render();
					
					// Get mesh as an STL
					var exporter = new THREE.STLBinaryExporter();
					var stl = new Blob([exporter.parse(mesh)], {type: "text/plain"});
					
					// Apply mesh's previous matrix
					mesh.applyMatrix(matrix);
					mesh.updateMatrix();
					render();
					
					// Stop rendering
					cancelAnimationFrame(viewport.animationFrame);
					
					// Return STL
					return stl;
				},
				
				// Destroy
				destroy: function() {
				
					// Stop rendering
					cancelAnimationFrame(viewport.animationFrame);
					
					// Disable events
					$(window).off("resize.viewport");
					$(window).off("keydown.viewport");
					
					// Reset values
					scene = null;
					camera = null;
					renderer = null;
					orbitControls = null;
					transformControls = null;
					model = null;
					loaded = false;
					animationFrame = null;
					viewport = null;
				},
				
				// Fix model Y
				fixModelY: function() {
					
					// Check if model exists
					if(viewport.model) {
				
						// Get model's boundary box
						var boundaryBox = new THREE.Box3().setFromObject(viewport.model);
						boundaryBox.min.sub(viewport.model.position);
						boundaryBox.max.sub(viewport.model.position);
						
						// Set model's lowest Y value to be at 0
						viewport.model.position.y -= viewport.model.position.y + boundaryBox.min.y;
					}
				
				}
			};

			// Animate scene
			function animate() {
			
				// Animate frame
				viewport.animationFrame = requestAnimationFrame(animate);
				
				// Render scene
				render();
				
				// Update
				update();
			}

			// Update
			function update() {
			
				// Update transform controls if set
				if(viewport.transformControls)
					viewport.transformControls.update();
			
				// Update orbit controls if set
				if(viewport.orbitControls)
					viewport.orbitControls.update();
			}

			// Render
			function render() {
			
				// Render scene if set
				if(viewport.renderer)
					viewport.renderer.render(viewport.scene, viewport.camera);
			}
			
			// Create viewport
			viewport.init();
			animate();
		}
		
		// Add 0.01 movement control
		$("#control > div.jog-panel").eq(0).addClass("controls").find("div.distance > div").prepend("<button type=\"button\" id=\"control-distance001\" class=\"btn distance\" data-distance=\"0.01\" data-bind=\"enable: loginState.isUser()\">0.01</button>");
		$("#control > div.jog-panel.controls").find("div.distance > div > button:nth-of-type(3)").click();
	
		// Change tool section text
		$("#control > div.jog-panel").eq(1).addClass("extruder").find("h1").text("Extruder").after("<h1 class=\"microPass\">Extruder</h1>");

		// Create motor on control
		$("#control > div.jog-panel").eq(2).addClass("general").find("div").prepend("<button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M17'}) }\">Motors on</button>");
		
		// Change fan controls
		$("#control > div.jog-panel.general").find("button:nth-of-type(2)").after("<button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M106 S255 *'}) }\">Fan on</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M107 *'}) }\">Fan off</button>")
		$("#control > div.jog-panel.general").find("button:nth-of-type(5)").remove();
		$("#control > div.jog-panel.general").find("button:nth-of-type(5)").remove();
		
		// Create absolute and relative controls
		$("#control > div.jog-panel.general").find("div").append("<button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'G90'}) }\">Absolute mode</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'G91'}) }\">Relative mode</button>");
	
		// Add filament controls
		$("#control > div.jog-panel.general").after("<div class=\"jog-panel filament\" data-bind=\"visible: loginState.isUser\"><h1>Filament</h1><div><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Unload</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Load</button></div></div>");
	
		// Add calibration controls
		$("#control > div.jog-panel.filament").after("<div class=\"jog-panel calibration\" data-bind=\"visible: loginState.isUser\"><h1>Calibration</h1><div><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Calibrate bed center Z0</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Calibrate bed orientation</button><button class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-down\"></i></button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as front left Z0</button><button class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-down\"></i></button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as front right Z0</button><button class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-up\"></i></button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as back right Z0</button><button class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-up\"></i></button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as back left Z0</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as bed center Z0</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Print test border</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Complete bed calibration</button></div></div>");
	
		// Add advanced controls
		$("#control > div.jog-panel.calibration").after("<div class=\"jog-panel advanced\" data-bind=\"visible: loginState.isUser\"><h1>Advanced</h1><div><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><img src=\"/plugin/m3dfio/static/img/HengLiXin.png\">HengLiXin fan</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><img src=\"/plugin/m3dfio/static/img/Listener.png\">Listener fan</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><img src=\"/plugin/m3dfio/static/img/Shenzhew.png\">Shenzhew fan</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><img src=\"/plugin/m3dfio/static/img/Xinyujie.png\">Xinyujie fan</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">500mA extruder current</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">660mA extruder current</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Update firmware</button><input type=\"file\" accept=\".rom, .bin, .hex\"></div></div>");
		
		
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
		$("#control > div.jog-panel.advanced").after("<div class=\"jog-panel eeprom\" data-bind=\"visible: loginState.isUser\"><h1>EEPROM</h1><div><table><tbody>" + table + "</tbody></table><input data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\" type=\"radio\" name=\"display\" value=\"hexadecimal\" checked><label>Hexadecimal</label><input data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\" type=\"radio\" name=\"display\" value=\"decimal\"><label>Decimal</label><input data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\" type=\"radio\" name=\"display\" value=\"ascii\"><label>ASCII</label><br><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Read EEPROM</button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Write EEPROM</button></div></div>");
	
		// Add temperature controls
		$("#control > div.jog-panel.extruder").find("div > button:nth-of-type(3)").after("<div style=\"width: 114px;\" class=\"slider slider-horizontal\"><div class=\"slider-track\"><div style=\"left: 0%; width: 0%;\" class=\"slider-selection\"></div><div style=\"left: 0%;\" class=\"slider-handle round\"></div><div style=\"left: 0%;\" class=\"slider-handle round hide\"></div></div><div style=\"top: -24px; left: -19px;\" class=\"tooltip top hide\"><div class=\"tooltip-arrow\"></div><div class=\"tooltip-inner\"></div></div><input style=\"width: 100px;\" data-bind=\"slider: {min: 100, max: 235, step: 1, value: flowRate, tooltip: 'hide'}\" type=\"number\"></div><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && loginState.isUser()\">Temperature:<span data-bind=\"text: flowRate() + 50 + '°C'\"></span></button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M104 S0'}) }\">Heater off</button><div class=\"microPass\"><h1 class=\"microPass\">Heat Bed</h1><div style=\"width: 114px;\" class=\"slider slider-horizontal\"><div class=\"slider-track\"><div style=\"left: 0%; width: 0%;\" class=\"slider-selection\"></div><div style=\"left: 0%;\" class=\"slider-handle round\"></div><div style=\"left: 0%;\" class=\"slider-handle round hide\"></div></div><div style=\"top: -24px; left: -19px;\" class=\"tooltip top hide\"><div class=\"tooltip-arrow\"></div><div class=\"tooltip-inner\"></div></div><input style=\"width: 100px;\" data-bind=\"slider: {min: 100, max: 170, step: 1, value: feedRate, tooltip: 'hide'}\" type=\"number\"></div><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && loginState.isUser()\">Temperature:<span data-bind=\"text: feedRate() -60 + '°C'\"></span></button><button class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M140 S0'}) }\">Heater off</button><div>");
		
		// Add message
		$("body > div.page-container").append("<div class=\"message\"><div><h4></h4><img src=\"/plugin/m3dfio/static/img/loading.gif\"><div><p></p><div class=\"calibrate\"><div class=\"arrows\"><button class=\"btn btn-block control-box arrow up\"><i class=\"icon-arrow-up\"></i></button><button class=\"btn btn-block control-box arrow down\"><i class=\"icon-arrow-down\"></i></button></div><div class=\"distance\"><button type=\"button\" class=\"btn distance\">0.01</button><button type=\"button\" class=\"btn distance active\">0.1</button><button type=\"button\" class=\"btn distance\">1</button></div></div><div><button class=\"btn btn-block confirm\"></button><button class=\"btn btn-block confirm\"></button></div></div></div>");
		
		// Add cover to slicer
		$("#slicing_configuration_dialog").append("<div class=\"modal-cover\"><img src=\"/plugin/m3dfio/static/img/loading.gif\"><p></p></div>");
		
		// Change slicer text
		$("#slicing_configuration_dialog").find("h3").before("<p class=\"currentMenu\">Select Profile</p>");
		$("#slicing_configuration_dialog").find(".control-group:nth-of-type(2) > label").text("Base Slicing Profile");
		
		// Manage if slicer is opened or closed
		setInterval(function() {
		
			// Check if slicer is open
			if($("#slicing_configuration_dialog").css("display") == "block") {
			
				// Set slicer open is not already set
				if(!slicerOpen)
					slicerOpen = true;
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
					modelName = $("#slicing_configuration_dialog").find("h3").text().substr(8);
					
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
										$("#slicing_configuration_dialog .modal-body").after("<div class=\"modal-extra\"><div><aside></aside><textarea spellcheck=\"false\"></textarea></div></div");
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
															if(viewport.loaded) {
								
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
																	$("#slicing_configuration_dialog .modal-extra").empty().append(viewport.renderer.domElement);
								
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
			
							// Read in file
							var reader = new FileReader();
							reader.readAsBinaryString(viewport.getModel());

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
		["printerStateViewModel", "temperatureViewModel"]
	]);
});
