
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

#include <emscripten.h>
#include <emscripten/bind.h>
#include <math.h>

using namespace emscripten;

void generate_sound (unsigned int currentFrame, unsigned int sampleRate, int frequency, intptr_t channelPtr, unsigned int channel_length) {
   float *channel = (float *)channelPtr;
   for (unsigned int i=0; i<channel_length; i++) {
      channel[i] = sin(frequency*((float)(currentFrame+i)/sampleRate)*2.0*M_PI);
   }
}

EMSCRIPTEN_BINDINGS(sine_wave_sound_generator) {
    function("generate_sound", &generate_sound, allow_raw_pointers());
}