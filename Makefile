LIBRARY_NAME = preprocessors
TARGET_PLATFORM = PC
VER = .1

ifeq ($(TARGET_PLATFORM), PC)
	PROG = $(LIBRARY_NAME)_x86-64.so
	CC = g++
	CFLAGS = -m64
endif
ifeq ($(TARGET_PLATFORM), PI)
	PROG = $(LIBRARY_NAME)_arm1176jzf-s.so
	CC = ~/tools/arm-bcm2708/gcc-linaro-arm-linux-gnueabihf-raspbian-x64/bin/arm-linux-gnueabihf-g++
	CFLAGS = -mcpu=arm1176jzf-s -mfpu=vfp -mfloat-abi=hard
endif

ifeq ($(TARGET_PLATFORM), PI2)
	PROG = $(LIBRARY_NAME)_arm_cortex-a7.so
	CC = ~/tools/arm-bcm2708/gcc-linaro-arm-linux-gnueabihf-raspbian-x64/bin/arm-linux-gnueabihf-g++
	CFLAGS = -mcpu=cortex-a7 -mfpu=neon-vfpv4 -mfloat-abi=hard -funsafe-math-optimizations
endif

SRCS = preprocessors.cpp gcode.cpp vector.cpp
CFLAGS += -Wall -std=c++11 -static-libgcc -static-libstdc++ -Ofast -fvisibility=hidden -shared -fPIC -Wl,-soname,$(PROG)$(VER)


all: $(PROG)

$(PROG):   $(SRCS)
	$(CC) $(CFLAGS) -o octoprint_m3dfio/static/libraries/$(PROG) $(SRCS)

clean:
	rm -f octoprint_m3dfio/static/libraries/$(PROG)
