PROG = preprocessors_x86_64.so
VER = .1
CC = g++
SRCS = preprocessors.cpp gcode.cpp
CFLAGS = -Wall -std=c++14 -O3 -shared -fpic -Wl,-soname,$(PROG)$(VER)


all: $(PROG)

$(PROG):   $(SRCS)
	$(CC) $(CFLAGS) -o octoprint_m3dfio/static/libraries/$(PROG) $(SRCS)

clean:
	rm -f octoprint_m3dfio/static/libraries/$(PROG)
