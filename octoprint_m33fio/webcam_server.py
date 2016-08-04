#!/usr/bin/env python
# -*- coding: UTF-8 -*-


# Imports
import sys
import time
import platform
import threading
import BaseHTTPServer
import SocketServer
import socket

# Check if using Windows or Linux
if platform.uname()[0].startswith("Windows") or platform.uname()[0].startswith("Linux") :

	# Import webcam libraries
	import StringIO
	from PIL import Image
	import pygame.camera

# Otherwise check if using OS X
elif platform.uname()[0].startswith("Darwin") :

	# Import OS X frameworks
	from io import BytesIO
	from AppKit import *
	from PyObjCTools import AppHelper
	from Quartz import *
	import QTKit


# Check if asking for help
if len(sys.argv) == 2 and (sys.argv[1] == "-h" or sys.argv[1] == "--help") :

	# Display usage
	print "Webcam Server: Hosts a webcam's stream and snapshot at /stream.mjpg and /snapshot.jpg\nUsage: python webcam_server.py camera httpPort framesPerSecond width height"

# Otherwise
else :

	# Check if pygame camers is usable
	if "pygame.camera" in sys.modules :

		# Initialize pygame camera
		pygame.camera.init()
	
		# Check if no cameras are detected
		if not len(pygame.camera.list_cameras()) :
		
			# Display message
			print "No cameras detected"
	
			# Exit
			exit()
	
		# Set default camera port
		cameraPort = pygame.camera.list_cameras()[0]

	# Otherwise check if QTKit is usable
	elif "QTKit" in sys.modules :

		# Check if no cameras are detected
		if not len(QTKit.QTCaptureDevice.inputDevices()) :
		
			# Display message
			print "No cameras detected"
	
			# Exit
			exit()

		# Set default camera port
		cameraPort = str(QTKit.QTCaptureDevice.inputDevices()[0])

	# Initialize variables
	currentFrame = None
	
	# Set camera port
	if len(sys.argv) >= 2 :
		cameraPort = sys.argv[1]
	
	# Set HTTP port
	if len(sys.argv) >= 3 :
		httpPort = int(sys.argv[2])
	else :
		httpPort = 4999
	
	# Set camera frame delay
	if len(sys.argv) >= 4 :
		cameraFrameDelay = 1.0 / int(sys.argv[3])
	else :
		cameraFrameDelay = 1.0 / 20
	
	# Set camera width
	if len(sys.argv) >= 5 :
		cameraWidth = int(sys.argv[4])
	else :
		cameraWidth = 640
	
	# Set camera height
	if len(sys.argv) >= 6 :
		cameraHeight = int(sys.argv[5])
	else :
		cameraHeight = 480

	# Create request handler
	class requestHandler(BaseHTTPServer.BaseHTTPRequestHandler) :

		# GET request
		def do_GET(self) :

			# Wait until a frame has been obtained
			while currentFrame is None :
				time.sleep(0.1)
			
			# Check if requesting snapshot
			if self.path.split('?')[0] == "/snapshot.jpg" :
			
				# Send current frame header
				self.send_response(200)
				self.wfile.write("Content-Type: image/jpeg\r\n")
				self.wfile.write("Content-Length: " + str(len(currentFrame)))
				self.wfile.write("\r\n\r\n")
				
				# Send current frame
				self.wfile.write(currentFrame)
			
			# Otherwise check if requesting stream
			elif self.path.split('?')[0] == "/stream.mjpg" :
			
				# Send header
				self.send_response(200)
				self.wfile.write("Content-Type: multipart/x-mixed-replace;boundary=--frame")
				
				# Loop forever
				while True :
				
					try :
					
						# Send current frame header
						self.wfile.write("\r\n\r\n")
						self.wfile.write("--frame\r\n")
						self.wfile.write("Content-Type: image/jpeg\r\n")
						self.wfile.write("Content-Length: " + str(len(currentFrame)))
						self.wfile.write("\r\n\r\n")
						
						# Send current frame
						self.wfile.write(currentFrame)
						
						# Delay
						time.sleep(cameraFrameDelay)
					
					except :
						break
			
			# Otherwise
			else :
			
				# Respond with error 404
				self.send_response(404)
				self.wfile.write("\r\n\r\n")

	# Create threaded HTTP server
	class ThreadedHTTPServer(SocketServer.ThreadingMixIn, BaseHTTPServer.HTTPServer) :
		pass

	# Start server
	server = ThreadedHTTPServer(('', httpPort), requestHandler)
	serverThread = threading.Thread(target = server.serve_forever)
	serverThread.daemon = True
	serverThread.start()
	
	# Get IP address
	try :
		ipAddress = [l for l in ([ip for ip in socket.gethostbyname_ex(socket.gethostname())[2] if not ip.startswith("127.")][:1], [[(s.connect(("8.8.8.8", 53)), s.getsockname()[0], s.close()) for s in [socket.socket(socket.AF_INET, socket.SOCK_DGRAM)]][0][1]]) if l][0][0]
	except :
		ipAddress = socket.gethostbyname(socket.gethostname())
	
	# Display hosting information
	print "Using webcam device " + str(cameraPort) + " with a resolution of " + str(cameraWidth) + 'x' + str(cameraHeight) + " running at " + str(int(1.0 / cameraFrameDelay)) + " frames/second"
	print "Hosting webcam still image at http://" + ipAddress + ':' + str(httpPort) + "/snapshot.jpg"
	print "Hosting webcam video stream at http://" + ipAddress + ':' + str(httpPort) + "/stream.mjpg"

	# Check if pygame camera is usable
	if "pygame.camera" in sys.modules :
	
		# Check if camera isn't detected
		if platform.uname()[0].startswith("Windows") :
			cameraPort = int(cameraPort)
		if cameraPort not in pygame.camera.list_cameras() :
		
			# Display message
			print "Camera not detected"
			
			# Exit
			exit()
	
		# Start camera
		camera = pygame.camera.Camera(cameraPort, (cameraWidth, cameraHeight))
		camera.start()

		# Initialize variables
		cameraImage = pygame.Surface((cameraWidth, cameraHeight))
	
		# Stabilize lighting
		for i in xrange(30) :
			camera.get_image()

		# Loop forever
		while True :

			try :
	
				# Get image from camera
				camera.get_image(cameraImage)
	
				# Convert image to a JPEG
				rawImage = Image.frombytes("RGB", (cameraWidth, cameraHeight), pygame.image.tostring(cameraImage, "RGB", False))
				buffer = StringIO.StringIO()
				rawImage.save(buffer, "JPEG")
	
				# Update current frame
				currentFrame = buffer.getvalue()
		
				# Delay
				time.sleep(cameraFrameDelay)
	
			except :
				break

	# Otherwise check if QTKit is usable
	elif "QTKit" in sys.modules :
	
		# Camera class
		class Camera(NSObject) :

			# Loop
			def loop(self) :
				
				# Check if camera isn't detected
				cameras = []
				for camera in QTKit.QTCaptureDevice.inputDevices() :
					cameras += [str(camera)]
				if cameraPort not in cameras :
				
					# Display message
					print "Camera not detected"
				
					# Exit
					exit()
		
				# Initialize camera
				camera = QTKit.QTCaptureDevice.inputDevices()[cameras.index(cameraPort)]
				error = None
				if not camera.open_(error) :
					exit()

				# Create capture session
				captureSession = QTKit.QTCaptureSession.alloc().init()

				# Create input device from camera
				inputDevice = QTKit.QTCaptureDeviceInput.alloc().initWithDevice_(camera)
				if not captureSession.addInput_error_(inputDevice, error) :
					exit()

				# Create output device
				outputDevice = QTKit.QTCaptureDecompressedVideoOutput.alloc().init()

				# Set fames/second
				outputDevice.setMinimumVideoFrameInterval_(cameraFrameDelay)
				outputDevice.setAutomaticallyDropsLateVideoFrames_(True)

				# Set camera size
				outputDevice.setPixelBufferAttributes_({
					kCVPixelBufferWidthKey: cameraWidth,
					kCVPixelBufferHeightKey: cameraHeight
				})

				# Delegate frame task
				outputDevice.setDelegate_(self)
				if not captureSession.addOutput_error_(outputDevice, error) :
					exit()

				# Start the capture session
				captureSession.startRunning()

				# Start main loop
				AppHelper.runConsoleEventLoop(installInterrupt = True)

			# Capture video frame
			def captureOutput_didOutputVideoFrame_withSampleBuffer_fromConnection_(self, captureOutput, videoFrame, sampleBuffer, connection) :
		
				# Convert frame to a JPEG
				rawImage = CIImage.imageWithCVImageBuffer_(videoFrame)
				bitmapRepresentation = NSBitmapImageRep.alloc().initWithCIImage_(rawImage)
				bitmapData = bitmapRepresentation.representationUsingType_properties_(NSJPEGFileType, {
					NSImageCompressionFactor: 1.0
				})

				# Update current frame
				output = BytesIO(bitmapData.bytes())
				global currentFrame
				currentFrame = output.getvalue()
				output.close()

		# Camera loop
		Camera.alloc().loop()
