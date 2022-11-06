
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

#ifndef WAVEGUIDE_H
#define WAVEGUIDE_H

class DelayLine {
   private:
   float *data;
   int data_length;
   int index;
   
   public:
   DelayLine (int length);
   ~DelayLine ();
   void updateLeft (float value);
   void updateRight (float value);
   float getAtPosition (int index);
};

class Waveguide {
   private:
   DelayLine upper;
   DelayLine lower;
   unsigned int maxIndex;

   public:
   float reflectionFactorLeft;
   float reflectionFactorRight;
   float outputLeft;
   float outputRight;
   Waveguide();
   Waveguide(unsigned int length, float reflectionFactorLeft, float reflectionFactorRight);
   ~Waveguide();
   void add (float valueLeft, float valueRight);
};

#endif