CC = emcc

all: sine_wave_sound_generator_webassembly.js engine_sound_generator_webassembly.js

engine_sound_generator_webassembly.js: engine_sound_generator.cpp waveguide.cpp extern_post.js
	$(CC) -O3 -Wall -Wextra $< waveguide.cpp -s ASSERTIONS -lembind -lm -s EXPORTED_RUNTIME_METHODS=cwrap -s SINGLE_FILE=1 -s ENVIRONMENT=shell --extern-post-js extern_post.js -o $@

sine_wave_sound_generator_webassembly.js: sine_wave_sound_generator.cpp extern_post.js
	$(CC) -O3 -Wall -Wextra -fsanitize=undefined -fsanitize=address $< -s ASSERTIONS -lembind -lm -s EXPORTED_RUNTIME_METHODS=cwrap -s SINGLE_FILE=1 -s ENVIRONMENT=shell --extern-post-js extern_post.js -o $@

clean:
	rm -f sine_wave_sound_generator_webassembly.js engine_sound_generator_webassembly.js