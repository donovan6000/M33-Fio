// On start
$(function() {

	// Create view model
	function M3DFioViewModel(parameters) {
	
		// Initialize variables
		var printerConnected = false;
		var currentZ;
	
		// Set self
		var self = this;
		self.printerState = parameters[0];
	
		// Add 0.01 movement control
		$("#control > div.jog-panel:first-of-type > div.distance > div").prepend("<button type=\"button\" id=\"control-distance001\" class=\"btn distance\" data-distance=\"0.01\" data-bind=\"enable: loginState.isUser()\">0.01</button>");
		$("#control > div.jog-panel:first-of-type > div.distance > div > button:nth-of-type(3)").click();
	
		// Change tool section text
		$("#control > div.jog-panel:nth-of-type(2) > h1").text("Extruder").after("<h1 class=\"microPass\">Extruder</h1>");

		// Create motor on control
		$("#control > div.jog-panel:nth-of-type(3) > div").prepend("<button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M17'}) }\">Motors on</button>");
	
		// Create absolute and relative controls
		$("#control > div.jog-panel:nth-of-type(3) > div").append("<button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'G90'}) }\">Absolute mode</button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'G91'}) }\">Relative mode</button>");
	
		// Add filament controls
		$("#control > div.jog-panel:nth-of-type(3)").after("<div class=\"jog-panel\" style=\"\" data-bind=\"visible: loginState.isUser\"><h1>Filament</h1><div><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Unload</button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Load</button></div></div>");
	
		// Add calibration controls
		$("#control > div.jog-panel:nth-of-type(4)").after("<div class=\"jog-panel\" style=\"\" data-bind=\"visible: loginState.isUser\"><h1>Calibration</h1><div><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Calibrate bed center Z0</button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Calibrate bed orientation</button><button disabled=\"\" class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-down\"></i></button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as front left Z0</button><button disabled=\"\" class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-down\"></i></button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as front right Z0</button><button disabled=\"\" class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-up\"></i></button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as back right Z0</button><button disabled=\"\" class=\"btn btn-block control-box arrow\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><i class=\"icon-arrow-up\"></i></button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as back left Z0</button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Save Z as bed center Z0</button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Print test border</button></div></div>");
	
		// Add advanced controls
		$("#control > div.jog-panel:nth-of-type(5)").after("<div class=\"jog-panel\" style=\"\" data-bind=\"visible: loginState.isUser\"><h1>Advanced</h1><div><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><img src=\"/plugin/m3dfio/static/img/HengLiXin.png\">HengLiXin fan</button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><img src=\"/plugin/m3dfio/static/img/Listener.png\">Listener fan</button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\"><img src=\"/plugin/m3dfio/static/img/Shenzhew.png\">Shenzhew fan</button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">500mA extruder current</button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">660mA extruder current</button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser()\">Update firmware</button><input type=\"file\" accept=\".rom, .bin, .hex\"></div></div>");
	
		// Add temperature controls
		$("#control > div.jog-panel:nth-of-type(2) > div > button:nth-of-type(3)").after("<div style=\"width: 114px;\" class=\"slider slider-horizontal\"><div class=\"slider-track\"><div style=\"left: 0%; width: 0%;\" class=\"slider-selection\"></div><div style=\"left: 0%;\" class=\"slider-handle round\"></div><div style=\"left: 0%;\" class=\"slider-handle round hide\"></div></div><div style=\"top: -24px; left: -19px;\" class=\"tooltip top hide\"><div class=\"tooltip-arrow\"></div><div class=\"tooltip-inner\"></div></div><input style=\"width: 100px;\" data-bind=\"slider: {min: 100, max: 235, step: 1, value: flowRate, tooltip: 'hide'}\" type=\"number\"></div><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && loginState.isUser()\">Temperature:<span data-bind=\"text: flowRate() + 50 + '°C'\"></span></button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M104 S0'}) }\">Heater off</button><div class=\"microPass\"><h1 class=\"microPass\">Heat Bed</h1><div style=\"width: 114px;\" class=\"slider slider-horizontal\"><div class=\"slider-track\"><div style=\"left: 0%; width: 0%;\" class=\"slider-selection\"></div><div style=\"left: 0%;\" class=\"slider-handle round\"></div><div style=\"left: 0%;\" class=\"slider-handle round hide\"></div></div><div style=\"top: -24px; left: -19px;\" class=\"tooltip top hide\"><div class=\"tooltip-arrow\"></div><div class=\"tooltip-inner\"></div></div><input style=\"width: 100px;\" data-bind=\"slider: {min: 100, max: 170, step: 1, value: feedRate, tooltip: 'hide'}\" type=\"number\"></div><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && loginState.isUser()\">Temperature:<span data-bind=\"text: feedRate() -60 + '°C'\"></span></button><button disabled=\"\" class=\"btn btn-block control-box\" data-bind=\"enable: isOperational() && !isPrinting() && loginState.isUser(), click: function() { $root.sendCustomCommand({type:'command',command:'M140 S0'}) }\">Heater off</button><div>");
		
		// Add printer status
		$("#control").append("<p class=\"status\">Status</p>");
	
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
		$("#control > div.jog-panel:nth-of-type(2) > div > button:first-of-type").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 E" + ($("#control > div.jog-panel:nth-of-type(2) > div > div:nth-of-type(2) >input").val().length ? $("#control > div.jog-panel:nth-of-type(2) > div > div:nth-of-type(2) >input").val() : '5' ) + " F450\n"
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
		$("#control > div.jog-panel:nth-of-type(2) > div > button:nth-of-type(2)").click(function(event) {
	
			// Stop default behavior
			event.stopImmediatePropagation();
		
			// Set commands
			var commands = [
				"G91\n",
				"G0 E-" + ($("#control > div.jog-panel:nth-of-type(2) > div > div:nth-of-type(2) >input").val().length ? $("#control > div.jog-panel:nth-of-type(2) > div > div:nth-of-type(2) >input").val() : '5' ) + " F450\n"
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
		$("#control > div.jog-panel:nth-of-type(2) > div > button:nth-of-type(4)").click(function(event) {
	
			// Hide status
			$("#control > p.status").removeClass("show");
		
			setTimeout(function() {
				
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Warming up");
			}, 400);
			
			// Set commands
			var commands = [
				"M109 S" + parseInt($(this).text().substr(12)) + '\n',
				"G4 S2\n"
			];
			
			// Add wait command if not printing
			if(self.printerState.isPrinting() !== true)
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
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						$("#control > p.status").removeClass("fail progress").addClass("succeed show").text("Done setting temperature");
					}, 400);
				}
			});
		});
		
		// Set heat bed temperature control
		$("#control > div.jog-panel:nth-of-type(2) > div > div.microPass > button:first-of-type").click(function(event) {
	
			// Hide status
			$("#control > p.status").removeClass("show");
		
			setTimeout(function() {
				
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Warming up");
			}, 400);
			
			// Set commands
			var commands = [
				"M190 S" + parseInt($(this).text().substr(12)) + '\n',
				"G4 S2\n"
			];
			
			// Add wait command if not printing
			if(self.printerState.isPrinting() !== true)
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
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						$("#control > p.status").removeClass("fail progress").addClass("succeed show").text("Done setting temperature");
					}, 400);
				}
			});
		});
	
		// Set unload filament control
		$("#control > div.jog-panel:nth-of-type(4) > div > button:nth-of-type(1)").click(function(event) {
	
			// Hide status
			$("#control > p.status").removeClass("show");
		
			setTimeout(function() {
				
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Warming up");
			}, 400);
		
			// Set commands
			var commands = [
				"M106\n",
				"M109 S250\n",
				"G4 S2\n",
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
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Remove filament");
					}, 400);
			
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
					
							// Hide status
							$("#control > p.status").removeClass("show");
		
							setTimeout(function() {
				
								// Set and show status
								$("#control > p.status").removeClass("fail progress").addClass("succeed show").text("Done unloading filament");
							}, 400);
					
						}
					});
				}
			});
		});
	
		// Set load filament control
		$("#control > div.jog-panel:nth-of-type(4) > div > button:nth-of-type(2)").click(function(event) {
	
			// Hide status
			$("#control > p.status").removeClass("show");
		
			setTimeout(function() {
				
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Warming up");
			}, 400);
		
			// Set commands
			var commands = [
				"M106\n",
				"M109 S250\n",
				"G4 S2\n",
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
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Insert filament");
					}, 400);
			
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
					
							// Hide status
							$("#control > p.status").removeClass("show");
		
							setTimeout(function() {
				
								// Set and show status
								$("#control > p.status").removeClass("fail progress").addClass("succeed show").text("Done loading filament");
							}, 400);
					
						}
					});
				}
			});
		});
	
		// Set calibrate bed center Z0 control
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(1)").click(function(event) {
	
			// Hide status
			$("#control > p.status").removeClass("show");
		
			setTimeout(function() {
				
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Calibrating bed center Z0");
			}, 400);
		
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
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Done calibrating bed center Z0");
					}, 400);
				}
			});
		});
	
		// Set calibrate bed orientation control
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(2)").click(function(event) {
	
			// Hide status
			$("#control > p.status").removeClass("show");
		
			setTimeout(function() {
				
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Calibrating bed orientation");
			}, 400);
		
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
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Done calibrating bed orientation");
					}, 400);
			
				}
			});
		});
	
		// Set go to front left
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(3)").click(function(event) {
		
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"G90\n",
				"G0 Z3 F100\n",
				"G28\n",
				"G0 X1 Y9.5 Z3 F100\n"
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
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(5)").click(function(event) {
		
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"G90\n",
				"G0 Z3 F100\n",
				"G28\n",
				"G0 X102.9 Y9.5 Z3 F100\n"
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
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(7)").click(function(event) {
		
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"G90\n",
				"G0 Z3 F100\n",
				"G28\n",
				"G0 X102.9 Y99 Z3 F100\n"
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
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(9)").click(function(event) {
		
			// Set commands
			var commands = [
				"G4 P100\n",
				"M65537;stop\n",
				"G90\n",
				"G0 Z3 F100\n",
				"G28\n",
				"G0 X1 Y99 Z3 F100\n"
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
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(4)").click(function(event) {
		
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
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Z saved as front left Z0");
					}, 400);
			
					// Set commands
					commands = [
						"M618 S19 P" + floatToBinary(currentZ) + '\n',
						"M619 S19\n"
					];
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: commands}),
						contentType: "application/json; charset=UTF-8"
					});
				}
			});
		});
	
		// Set save Z as front right Z0 control
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(6)").click(function(event) {
		
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
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Z saved as front right Z0");
					}, 400);
			
					// Set commands
					commands = [
						"M618 S18 P" + floatToBinary(currentZ) + '\n',
						"M619 S18\n"
					];
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: commands}),
						contentType: "application/json; charset=UTF-8"
					});
				}
			});
		});
	
		// Set save Z as back right Z0 control
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(8)").click(function(event) {
		
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
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Z saved as back right Z0");
					}, 400);
			
					// Set commands
					commands = [
						"M618 S17 P" + floatToBinary(currentZ) + '\n',
						"M619 S17\n"
					];
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: commands}),
						contentType: "application/json; charset=UTF-8"
					});
				}
			});
		});
	
		// Set save Z as back left Z0 control
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(10)").click(function(event) {
		
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
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Z saved as back left Z0");
					}, 400);
			
					// Set commands
					commands = [
						"M618 S16 P" + floatToBinary(currentZ) + '\n',
						"M619 S16\n"
					];
				
					// Send request
					$.ajax({
						url: API_BASEURL + "plugin/m3dfio",
						type: "POST",
						dataType: "json",
						data: JSON.stringify({command: "message", value: commands}),
						contentType: "application/json; charset=UTF-8"
					});
				}
			});
		});
		
		// Set save Z as bed center Z0 control
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(11)").click(function(event) {
		
			// Hide status
			$("#control > p.status").removeClass("show");

			setTimeout(function() {
		
				// Set and show status
				$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Z saved as bed center Z0");
			}, 400);
			
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
				contentType: "application/json; charset=UTF-8"
			});
		});
		
		// Set print test border control
		$("#control > div.jog-panel:nth-of-type(5) > div > button:nth-of-type(12)").click(function(event) {
		
			// Hide status
			$("#control > p.status").removeClass("show");

			setTimeout(function() {
		
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Preparing test border");
			}, 400);
		
			setTimeout(function() {
			
				// Send request
				$.ajax({
					url: API_BASEURL + "plugin/m3dfio",
					type: "POST",
					dataType: "json",
					data: JSON.stringify({command: "message", value: "Print test border"}),
					contentType: "application/json; charset=UTF-8"
				});
			}, 1000);
		});
	
		// Set HengLiXin fan control
		$("#control > div.jog-panel:nth-of-type(6) > div > button:nth-of-type(1)").click(function(event) {
	
			// Hide status
			$("#control > p.status").removeClass("show");

			setTimeout(function() {
		
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Setting fan to HengLiXin");
			}, 400);
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Set Fan: HengLiXin"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						if(data.value == "Ok")
							$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Fan successfully set to HengLiXin");
						else
							$("#control > p.status").removeClass("succeed inProgress").addClass("fail show").text("Fan failed to be set");
					}, 400);
				}
			});
		});
	
		// Set Listener fan control
		$("#control > div.jog-panel:nth-of-type(6) > div > button:nth-of-type(2)").click(function(event) {
	
			// Hide status
			$("#control > p.status").removeClass("show");

			setTimeout(function() {
		
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Setting fan to Listener");
			}, 400);
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Set Fan: Listener"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						if(data.value == "Ok")
							$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Fan successfully set to Listener");
						else
							$("#control > p.status").removeClass("succeed inProgress").addClass("fail show").text("Fan failed to be set");
					}, 400);
				}
			});
		});
	
		// Set Shenzhew fan control
		$("#control > div.jog-panel:nth-of-type(6) > div > button:nth-of-type(3)").click(function(event) {
	
			// Hide status
			$("#control > p.status").removeClass("show");

			setTimeout(function() {
		
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Setting fan to Shenzhew");
			}, 400);
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Set Fan: Shenzhew"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						if(data.value == "Ok")
							$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Fan successfully set to Shenzhew");
						else
							$("#control > p.status").removeClass("succeed inProgress").addClass("fail show").text("Fan failed to be set");
					}, 400);
				}
			});
		});
	
		// Set 500mA extruder current control
		$("#control > div.jog-panel:nth-of-type(6) > div > button:nth-of-type(4)").click(function(event) {
	
			// Hide status
			$("#control > p.status").removeClass("show");

			setTimeout(function() {
		
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Setting extruder current to 500mA");
			}, 400);
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Set Extruder Current: 500"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						if(data.value == "Ok")
							$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Extruder current successfully set to 500mA");
						else
							$("#control > p.status").removeClass("succeed inProgress").addClass("fail show").text("Extruder current failed to be set");
					}, 400);
				}
			});
		});
	
		// Set 660mA extruder current control
		$("#control > div.jog-panel:nth-of-type(6) > div > button:nth-of-type(5)").click(function(event) {
	
			// Hide status
			$("#control > p.status").removeClass("show");

			setTimeout(function() {
		
				// Set and show status
				$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Setting extruder current to 660mA");
			}, 400);
		
			// Send request
			$.ajax({
				url: API_BASEURL + "plugin/m3dfio",
				type: "POST",
				dataType: "json",
				data: JSON.stringify({command: "message", value: "Set Extruder Current: 660"}),
				contentType: "application/json; charset=UTF-8",
			
				// On success
				success: function(data) {
			
					// Hide status
					$("#control > p.status").removeClass("show");
		
					setTimeout(function() {
				
						// Set and show status
						if(data.value == "Ok")
							$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Extruder current successfully set to 660mA");
						else
							$("#control > p.status").removeClass("succeed inProgress").addClass("fail show").text("Extruder current failed to be set");
					}, 400);
				}
			});
		});
	
		// Set update firmware control
		$("#control > div.jog-panel:nth-of-type(6) > div > button:nth-of-type(6)").click(function(event) {
	
			// Open file input dialog
			$("#control > div.jog-panel:nth-of-type(6) > div > input").click();
		});
		
		// On update firmware input change
		$("#control > div.jog-panel:nth-of-type(6) > div > input").change(function(event) {
	
			// Initialize variables
			var file = this.files[0];
		
			// Clear input
			$(this).val('');
		
			// Hide status
			$("#control > p.status").removeClass("show");
		
			// Check if file has no name
			if(!file.name.length)
		
				setTimeout(function() {
		
					// Set and show status
					$("#control > p.status").removeClass("inProgress succeed").addClass("fail show").text("Invalid file name");
				}, 400);
		
			// Go through each character of the file's name
			for(index in file.name) {
		
				// Check if extension is occuring
				if(file.name[index] == '.') {
			
					// Break if file name beings with 10 numbers
					if(index == 10)
						break;
					
					setTimeout(function() {
		
						// Set and show status
						$("#control > p.status").removeClass("inProgress succeed").addClass("fail show").text("Invalid file name");
					}, 400);
				
					// Return
					return;
				}
			
				// Check if current character isn't a digit or length is invalid
				if(file.name[index] < '0' || file.name[index] > '9' || (index == file.name.length - 1 && index < 9)) {
			
					setTimeout(function() {
				
						// Set and show status
						$("#control > p.status").removeClass("inProgress succeed").addClass("fail show").text("Invalid file name");
					}, 400);
				
					// Return
					return;
				}
			}
		
			// Check if the file is too big
			if(file.size > 32768) {

				setTimeout(function() {
		
					// Set and show status
					$("#control > p.status").removeClass("inProgress succeed").addClass("fail show").text("Invalid file size");
				}, 400);
			}
		
			// Otherwise
			else {

				setTimeout(function() {
		
					// Set and show status
					$("#control > p.status").removeClass("fail succeed").addClass("inProgress show").text("Updating firmware");
				}, 400);
	
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
			
							// Hide status
							$("#control > p.status").removeClass("show");
		
							setTimeout(function() {
				
								// Set and show status
								if(data.value == "Ok")
									$("#control > p.status").removeClass("fail inProgress").addClass("succeed show").text("Firmware successfully updated");
								else
									$("#control > p.status").removeClass("succeed inProgress").addClass("fail show").text("Firmware failed to be updated");
							}, 400);
						}
					});
				};
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
			else if(data.value == "Micro 3D Not Connected" && printerConnected)
			
				// Clear printer connected
				printerConnected = false;
			
			// Otherwise check if data is that a Micro Pass is connected
			else if(data.value == "Micro Pass Connected" && printerConnected) {
			
				// Display heat bed controls
				$("#control .microPass").css("display", "block");
				$("#control > div.jog-panel:nth-of-type(2) > h1:not(.microPass)").text("Tools");
			}
			
			// Otherwise check if data is that a Micro Pass isn't connected
			else if(data.value == "Micro Pass Not Connected") {
			
				// Hide heat bed controls
				$("#control .microPass").css("display", "none");
				$("#control > div.jog-panel:nth-of-type(2) > h1:not(.microPass)").text("Extruder");
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
			
			// Otherwise check if data is a status error message
			else if(data.length > 7 && data.value.substr(0, 6) == "Error:" && printerConnected) {
			
				// Hide status
				$("#control > p.status").removeClass("show");
				
				setTimeout(function() {
				
					// Set and show status
					$("#control > p.status").removeClass("succeed inProgress").addClass("fail show").text(data.value.substr(6));
				}, 400);
			}
			
			// Otherwise check if data is to clear the status message
			else if(data.value == "Clear message")
			
				// Hide status
				$("#control > p.status").removeClass("show");
			
			// Otherwise check if data is to enable shared library options
			else if(data.value == "Enable Shared Library")
			
				// Enable shared library options
				$("#settings_plugin_m3dfio label.sharedLibrary").removeClass("disabled").children("input").prop("disabled", false);
			
			// Otherwise check if data is to disable shared library options
			else if(data.value == "Disable Shared Library")
			
				// Disable shared library options
				$("#settings_plugin_m3dfio label.sharedLibrary").addClass("disabled").children("input").prop("disabled", true);
		}
	}

	// Register plugin
	OCTOPRINT_VIEWMODELS.push([
	
		// Constructor
		M3DFioViewModel,
		["printerStateViewModel"]
	]);
});

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
