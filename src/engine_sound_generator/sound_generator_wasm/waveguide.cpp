
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

#include "waveguide.h"

#include <emscripten.h>

DelayLine::DelayLine(int length) {
   if (length<1) {
      EM_ASM ({
         throw new Error("The length of the delay line needs to be a positive value.");
      });
   }
   this->data = new float[length];
   this->data_length = length;
   this->index = 0;
}

DelayLine::~DelayLine() {
}

void DelayLine::updateLeft (float value) {
   this->data[this->index] = value;
   this->index++;
   if (this->index>=this->data_length) {
      this->index = 0;
   }
}

void DelayLine::updateRight (float value) {
   this->data[this->index] = value;
   this->index--;
   if (this->index<0) {
      this->index = this->data_length-1;
   }
}

float DelayLine::getAtPosition (int index) {
   index = this->index+index;
   while (index < 0) {
      index += this->data_length;
   }

   while (index >= this->data_length) {
      index -= this->data_length;
   }

   return this->data[index];
}


Waveguide::Waveguide() : upper(1), lower(1) {
}

Waveguide::Waveguide(unsigned int length, float reflectionFactorLeft, float reflectionFactorRight) : upper(length), lower(length) {
   this->reflectionFactorLeft = reflectionFactorLeft;
   this->reflectionFactorRight = reflectionFactorRight;
   this->maxIndex = length-1;
   this->outputLeft = 0.0;
   this->outputRight = 0.0;
}

Waveguide::~Waveguide() {
}

void Waveguide::add (float valueLeft, float valueRight) {
   float reflectedValueLeft = this->lower.getAtPosition(0)*this->reflectionFactorLeft;
   this->outputLeft = this->lower.getAtPosition(0)*(1.0-this->reflectionFactorLeft);

   float reflectedValueRight = this->upper.getAtPosition(0)*this->reflectionFactorRight;
   this->outputRight = this->upper.getAtPosition(0)*(1.0-this->reflectionFactorRight);

   this->upper.updateRight(valueLeft+reflectedValueLeft);
   this->lower.updateLeft(valueRight+reflectedValueRight);
}
