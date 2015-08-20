LIBRARY_NAME = preprocessors
TARGET_PLATFORM = ARM
VER = .1

ifeq ($(TARGET_PLATFORM), LINUX)
	PROG = $(LIBRARY_NAME)_x86_64.so
	CC = g++
	CFLAGS = -m64
endif
ifeq ($(TARGET_PLATFORM), ARM)
	PROG = $(LIBRARY_NAME)_arm.so
	CC = arm-linux-gnueabihf-g++
	CFLAGS =
endif

SRCS = preprocessors.cpp gcode.cpp vector.cpp
CFLAGS += -Wall -std=c++11 -static-libgcc -static-libstdc++ -nodefaultlibs -Ofast -fvisibility=hidden -shared -fPIC -Wl,-soname,$(PROG)$(VER)


all: $(PROG)

$(PROG):   $(SRCS)
	$(CC) $(CFLAGS) -o octoprint_m3dfio/static/libraries/$(PROG) $(SRCS)

clean:
	rm -f octoprint_m3dfio/static/libraries/$(PROG)
