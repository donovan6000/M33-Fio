# Target platform options: LINUX32, LINUX64, WINDOWS32, WINDOWS64, PI, PI2, ARM7, OSX32, OSX64
LIBRARY_NAME = preprocessor
TARGET_PLATFORM = LINUX64
VER = .1

ifeq ($(TARGET_PLATFORM), LINUX32)
	PROG = $(LIBRARY_NAME)_i386.so
	CC = g++
	CFLAGS = -fPIC -m32 -static-libgcc -O3 -Wl,-soname,$(PROG)$(VER) -static-libstdc++
endif

ifeq ($(TARGET_PLATFORM), LINUX64)
	PROG = $(LIBRARY_NAME)_x86-64.so
	CC = g++
	CFLAGS = -fPIC -m64 -static-libgcc -O3 -Wl,-soname,$(PROG)$(VER) -static-libstdc++
endif

ifeq ($(TARGET_PLATFORM), WINDOWS32)
	PROG = $(LIBRARY_NAME)_i386.dll
	CC = i686-w64-mingw32-g++
	CFLAGS = -static-libgcc -O3 -Wl,-soname,$(PROG)$(VER) -static-libstdc++
endif

ifeq ($(TARGET_PLATFORM), WINDOWS64)
	PROG = $(LIBRARY_NAME)_x86-64.dll
	CC = x86_64-w64-mingw32-g++
	CFLAGS = -static-libgcc -O3 -Wl,-soname,$(PROG)$(VER) -static-libstdc++
endif

ifeq ($(TARGET_PLATFORM), PI)
	PROG = $(LIBRARY_NAME)_arm1176jzf-s.so
	CC = ~/tools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/arm-linux-gnueabihf-g++
	CFLAGS = -fPIC -mcpu=arm1176jzf-s -mfpu=vfp -mfloat-abi=hard -static-libgcc -O3 -Wl,-soname,$(PROG)$(VER) -static-libstdc++
endif

ifeq ($(TARGET_PLATFORM), PI2)
	PROG = $(LIBRARY_NAME)_arm_cortex-a7.so
	CC = ~/tools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/arm-linux-gnueabihf-g++
	CFLAGS = -fPIC -mcpu=cortex-a7 -mfpu=neon-vfpv4 -mfloat-abi=hard -static-libgcc -O3 -Wl,-soname,$(PROG)$(VER) -static-libstdc++
endif

ifeq ($(TARGET_PLATFORM), ARM7)
	PROG = $(LIBRARY_NAME)_arm7.so
	CC = ~/tools/arm-bcm2708/gcc-linaro-arm-linux-gnueabihf-raspbian-x64/bin/arm-linux-gnueabihf-g++
	CFLAGS = -fPIC -mcpu=generic-armv7-a -mfpu=vfp -mfloat-abi=hard -static-libgcc -O3 -Wl,-soname,$(PROG)$(VER) -static-libstdc++
endif

ifeq ($(TARGET_PLATFORM), OSX32)
	PROG = $(LIBRARY_NAME)_i386.dylib
	CC = clang++
	CFLAGS = -fPIC -m32 -stdlib=libc++ -O3 -Wl,-install_name,$(PROG)$(VER)

endif

ifeq ($(TARGET_PLATFORM), OSX64)
	PROG = $(LIBRARY_NAME)_x86-64.dylib
	CC = clang++
	CFLAGS = -fPIC -m64 -stdlib=libc++ -O3 -Wl,-install_name,$(PROG)$(VER)
endif

SRCS = preprocessor.cpp gcode.cpp vector.cpp
CFLAGS += -Wall -std=c++11 -fvisibility=hidden -shared

all: $(PROG)

$(PROG):   $(SRCS)
	$(CC) $(CFLAGS) -o ../octoprint_m3dfio/static/libraries/$(PROG) $(SRCS)

clean:
	rm -f ../octoprint_m3dfio/static/libraries/$(PROG)
