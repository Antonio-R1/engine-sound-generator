
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

#include <emscripten.h>
#include <emscripten/bind.h>
#include <math.h>
#include <stdlib.h>
#include <time.h>

#include "waveguide.h"

const unsigned int SAMPLING_RATE = 44100;

using namespace emscripten;

float get_random_value () {
   return rand()/(float)(RAND_MAX);
}

/*
 * a lowpass filter based on https://en.wikipedia.org/wiki/Low-pass_filter#Simple_infinite_impulse_response_filter
 */
class LowpassFilter {
   private:
   float frequency;
   float alpha;
   float lastValue;

   public:
   LowpassFilter (float frequency, float samplingRate = SAMPLING_RATE, float lastValue = 0.0) {
      this->frequency = frequency;
      float samplingRateInverse = 1.0/samplingRate;
      this->alpha = 2.0*M_PI*samplingRateInverse*frequency/(2.0*M_PI*samplingRateInverse*frequency+1.0);
      this->lastValue = lastValue;
   }

   float getFilteredValue(float value) {
      float filteredValue = this->lastValue+this->alpha*(value-this->lastValue);
      this->lastValue = filteredValue;
      return filteredValue;
   }
};

class Cylinder {
   private:
   unsigned int index;
   float intakeOpenReflectionFactor;
   float intakeClosedReflectionFactor;
   float exhaustOpenReflectionFactor;
   float exhaustClosedReflectionFactor;
   float ignitionTime;

   float intakeValve;
   float exhaustValve;
   float pistonMotion;
   float fuelIgnition;

   public:
   Waveguide cylinderWaveguide;
   Waveguide intakeWaveguide;
   Waveguide exhaustWaveguide;
   Waveguide extractorWaveguide;
   Cylinder () : cylinderWaveguide(10, 0.75, 0.75),
                intakeWaveguide(0, 0.01, 0),
                exhaustWaveguide(0, 0, 0.01),
                extractorWaveguide(0, 0.01, 0.01) {
   }

   Cylinder (unsigned int index,
             unsigned int intakeWaveguideLength,
             unsigned int exhaustWaveguideLength,
             unsigned int extractorWaveguideLength,

             float intakeOpenReflectionFactor,
             float intakeClosedReflectionFactor,

             float exhaustOpenReflectionFactor,
             float exhaustClosedReflectionFactor,

             float ignitionTime): cylinderWaveguide(10, 0.75, 0.75),
                intakeWaveguide(intakeWaveguideLength, 0.01, intakeOpenReflectionFactor),
                exhaustWaveguide(exhaustWaveguideLength, exhaustClosedReflectionFactor, 0.01),
                extractorWaveguide(extractorWaveguideLength, 0.01, 0.01) {

      this->index = index;
      this->intakeOpenReflectionFactor = intakeOpenReflectionFactor;
      this->intakeClosedReflectionFactor = intakeClosedReflectionFactor;

      this->exhaustOpenReflectionFactor = exhaustOpenReflectionFactor;
      this->exhaustClosedReflectionFactor = exhaustClosedReflectionFactor;
      this->ignitionTime = ignitionTime;

   }

   void updateWaveguidesReflectionValues () {
      this->intakeWaveguide.reflectionFactorRight = this->intakeOpenReflectionFactor*this->intakeValve+
                                                    this->intakeClosedReflectionFactor*(1.0-this->intakeValve);
      this->cylinderWaveguide.reflectionFactorLeft = this->intakeOpenReflectionFactor*this->intakeValve+
                                                     this->intakeClosedReflectionFactor*(1.0-this->intakeValve);

      this->exhaustWaveguide.reflectionFactorLeft = this->exhaustOpenReflectionFactor*this->exhaustValve+
                                                     this->exhaustClosedReflectionFactor*(1.0-this->exhaustValve);
      this->cylinderWaveguide.reflectionFactorRight = this->exhaustOpenReflectionFactor*this->exhaustValve+
                                                      this->exhaustClosedReflectionFactor*(1.0-this->exhaustValve);
   }

   void update (float intakeNoise, float straightPipeOutputLeft, float x) {

      this->exhaustValve = this->_exhaustValve(x);
      this->intakeValve = this->_intakeValve (x);
      this->pistonMotion = this->_pistonMotion (x);
      this->fuelIgnition = this->_fuelIgnition(x, this->ignitionTime);

      this->updateWaveguidesReflectionValues ();

      intakeNoise = intakeNoise*this->intakeValve;
      float currentCylinderAmplitude = this->pistonMotion*1.5+this->fuelIgnition*5.0;

      float extractorOutputLeft = this->extractorWaveguide.outputLeft;
      float cylinderOutputLeft = this->cylinderWaveguide.outputLeft;
      float cylinderOutputRight = this->cylinderWaveguide.outputRight;
      float intakeOutputRight = this->intakeWaveguide.outputRight;

      this->extractorWaveguide.add (this->exhaustWaveguide.outputRight, straightPipeOutputLeft);
      this->exhaustWaveguide.add (cylinderOutputRight*(1.0-0*this->exhaustWaveguide.reflectionFactorLeft), extractorOutputLeft);
      this->cylinderWaveguide.add (currentCylinderAmplitude+intakeOutputRight*(1.0-this->intakeWaveguide.reflectionFactorRight), extractorOutputLeft*(1.0-this->exhaustWaveguide.reflectionFactorLeft));
      this->intakeWaveguide.add (intakeNoise, cylinderOutputLeft*(1.0-this->intakeWaveguide.reflectionFactorRight));
   }

    float _exhaustValve (float x) {
       if (0.75 < x && x < 1.0) {
          return -sin(4.0*M_PI*x);
       }
       return 0;
    }

    float _intakeValve (float x) {
       if (0 < x && x < 0.25) {
          return sin(4.0*M_PI*x);
       }
       return 0;
    }

    float _pistonMotion (float x) {
       return cos(4.0*M_PI*x);
    }

    float _fuelIgnition (float x, float t) {

       if (0.0 < x && x < 0.5*t) {
          return sin(2.0*M_PI*(x/t));
       }

       return 0;
    }
};

class Muffler {
   private:
   Waveguide *elements;
   unsigned int elementsCount;
   float elementsCountInverse;
   public:
   float outputLeft;
   float outputRight;
   Muffler () {
   }

   Muffler (unsigned int *elementLengths, unsigned int elementsCount, float action) {
      this->elements = new Waveguide[elementsCount];
      this->elementsCount = elementsCount;
      this->elementsCountInverse = 1.0/elementsCount;
      for (unsigned int i=0; i<elementsCount; i++) {
         this->elements[i] = Waveguide (elementLengths[i], 0.0, action);
      }
      this->outputLeft = 0.0;
      this->outputRight = 0.0;
   }

   void update (float mufflerInput, float outletValue) {
      mufflerInput = this->elementsCountInverse*mufflerInput;
      outletValue = this->elementsCountInverse*outletValue;
      this->outputLeft = 0.0;
      this->outputRight = 0.0;
      for (unsigned int i=0; i<this->elementsCount; i++) {
         this->outputLeft += this->elements[i].outputLeft;
         this->outputRight += this->elements[i].outputRight;
         this->elements[i].add(mufflerInput, outletValue);
      }
   }

   ~Muffler() {
   }
};

class EngineSoundGenerator {
   private:
   float secondsPerSample;
   float rpm;
   float throttle;
   float currentRevolution;
   LowpassFilter intakeNoiseLowPassFilter;
   LowpassFilter crankshaftLowPassFilter;
   LowpassFilter engineLowPassFilter;
   float *sound;
   float *intakeSound;
   float *outletSound;
   std::vector<Cylinder> cylinders;
   unsigned int cylinderCount;
   float cylindersCountInverse;
   float cylindersFactor;
   Waveguide straightPipe;
   Muffler muffler;
   Waveguide outlet;
   public:
   EngineSoundGenerator (unsigned int sampleRate,
                         unsigned int cylinderCount,

                         unsigned int intakeWaveguideLength, unsigned int exhaustWaveguideLength,
                         unsigned int extractorWaveguideLength,

                         float intakeOpenReflectionFactor, float intakeClosedReflectionFactor,

                         float exhaustOpenReflectionFactor, float exhaustClosedReflectionFactor,
                         float ignitionTime,

                         unsigned int straightPipeWaveguideLength, float straightPipeReflectionFactor,

                         intptr_t mufflerElementsLengthPtr , unsigned int mufflerElementsCount, float action,

                         unsigned int outletWaveguideLength, float outletReflectionFactor) : intakeNoiseLowPassFilter(11000.0, sampleRate),
                             crankshaftLowPassFilter(75.0, sampleRate),
                             engineLowPassFilter(125.0, sampleRate) {
      srand(time(NULL));
      this->secondsPerSample = 1.0/sampleRate;

      unsigned int *mufflerElementsLength = (unsigned int *)mufflerElementsLengthPtr;

      this->updateParameters(cylinderCount,

                      intakeWaveguideLength, exhaustWaveguideLength,
                      extractorWaveguideLength,

                      intakeOpenReflectionFactor, intakeClosedReflectionFactor,

                      exhaustOpenReflectionFactor, exhaustClosedReflectionFactor, ignitionTime,

                      straightPipeWaveguideLength, straightPipeReflectionFactor,

                      (intptr_t)mufflerElementsLength, mufflerElementsCount, action,

                      outletWaveguideLength, outletReflectionFactor);
   }

   ~EngineSoundGenerator () {
   }

   void updateParameters (unsigned int cylinderCount,

                      unsigned int intakeWaveguideLength, unsigned int exhaustWaveguideLength,
                      unsigned int extractorWaveguideLength,

                      float intakeOpenReflectionFactor, float intakeClosedReflectionFactor,

                      float exhaustOpenReflectionFactor, float exhaustClosedReflectionFactor, float ignitionTime,

                      unsigned int straightPipeWaveguideLength, float straightPipeReflectionFactor,

                      intptr_t mufflerElementsLengthPtr, unsigned int mufflerElementsCount, float action,

                      unsigned int outletWaveguideLength, float outletReflectionFactor) {

      unsigned int *mufflerElementsLength = (unsigned int *)mufflerElementsLengthPtr;
      this->cylinders.clear();
      this->cylinderCount = cylinderCount;
      this->cylindersCountInverse = 1.0/cylinderCount;
      this->cylindersFactor = 4.0*this->cylindersCountInverse;

      for  (unsigned int i=0; i<cylinderCount; i++) {
         Cylinder cylinder = Cylinder(i,
                  intakeWaveguideLength, exhaustWaveguideLength, extractorWaveguideLength,
                  intakeOpenReflectionFactor, intakeClosedReflectionFactor,
                  exhaustOpenReflectionFactor, exhaustClosedReflectionFactor, ignitionTime);
         this->cylinders.push_back(cylinder);
      }

      this->straightPipe = Waveguide (straightPipeWaveguideLength, straightPipeReflectionFactor,
                                                                      straightPipeReflectionFactor);
      this->muffler = Muffler (mufflerElementsLength, mufflerElementsCount, action);
      this->outlet = Waveguide (outletWaveguideLength, outletReflectionFactor, outletReflectionFactor);
   }

   void _updateSample(unsigned int index) {
      this->sound[index] = 0.0;

      float intakeNoise = this->intakeNoiseLowPassFilter.getFilteredValue(2.0*get_random_value()-1.0);
      if (this->rpm<25.0) {
         intakeNoise = 0;
      }

      float crankshaftValue = this->crankshaftLowPassFilter.getFilteredValue(0.25*get_random_value());
      for (unsigned int i=0; i<this->cylinderCount; i++) {
         float x = this->currentRevolution+i*(this->cylindersCountInverse+crankshaftValue);
         this->cylinders[i].update(intakeNoise, this->straightPipe.outputLeft, x-(long long)x);
         if (this->cylinderCount<=4) {
            this->sound[index] += this->cylinders[i].cylinderWaveguide.outputLeft;
         }
         else {
            this->sound[index] += this->cylindersFactor*this->cylinders[i].cylinderWaveguide.outputLeft;
         }
      }
      this->currentRevolution += this->secondsPerSample*this->rpm/120.0;
      if (this->currentRevolution > 1.0) {
         this->currentRevolution -= 1.0;
      }

      this->intakeSound[index] = 0;
      for (unsigned int i=0; i<this->cylinderCount; i++) {
         if (this->cylinderCount<=4) {
            this->intakeSound[index] += this->cylinders[i].intakeWaveguide.outputLeft;
         }
         else {
            this->intakeSound[index] += this->cylindersFactor*this->cylinders[i].intakeWaveguide.outputLeft;
         }
      }

      float straightPipeInput = 0.0;

      for (unsigned int i=0; i<this->cylinderCount; i++) {
         if (this->cylinderCount<=4) {
            straightPipeInput += this->cylinders[i].extractorWaveguide.outputRight;
         }
         else {
            straightPipeInput += this->cylindersFactor*this->cylinders[i].extractorWaveguide.outputRight;
         }
      }

      this->straightPipe.add (straightPipeInput, this->muffler.outputLeft);
      this->outlet.add (this->muffler.outputRight, 0.0);
      this->outletSound[index] = this->outlet.outputRight;

      this->muffler.update(this->straightPipe.outputRight, this->outlet.outputLeft);
   }

   void generateSound (unsigned int currentFrame, unsigned int sampleRate, 
                 intptr_t rpmPtr, unsigned int rpmLength,
                 intptr_t throttlePtr, unsigned int throttleLength,
                 intptr_t channelIntakePtr, unsigned int channelIntakeLength,
                 intptr_t channelEngineBlockVibrationsPtr, unsigned int channelEngineBlockVibrationsLength,
                 intptr_t channelOutletPtr, unsigned int channelOutletLength) {
      float *rpm = (float *)rpmPtr;
      float *throttle = (float *)throttlePtr;

      float *channelIntake = (float *)channelIntakePtr;
      float *channelEngineBlockVibrations = (float *)channelEngineBlockVibrationsPtr;
      float *channelOutlet = (float *)channelOutletPtr;

      this->sound = channelEngineBlockVibrations;
      this->intakeSound = channelIntake;
      this->outletSound = channelOutlet;

      unsigned int chunkSize = channelIntakeLength;
      for (unsigned int i=0; i<chunkSize; i++) {
         this->rpm = rpmLength>1 ? rpm[i] : rpm[0];
         this->throttle = throttleLength>1 ? throttle[i] : throttle[0];
         this->_updateSample(i);
      }

      for (unsigned int i=0; i<chunkSize; i++) {
         channelEngineBlockVibrations[i] = this->engineLowPassFilter.getFilteredValue(this->sound[i]);
      }

   }

};

EMSCRIPTEN_BINDINGS(engine_sound_generator) {
  class_<EngineSoundGenerator>("EngineSoundGenerator")
    .constructor<unsigned int,
                 unsigned int,
                 unsigned int, unsigned int,
                 unsigned int,
                 float, float,
                 float, float, float,
                 unsigned int, float,
                 intptr_t, unsigned int, float,
                 unsigned int, float>()
    .function("generateSound", &EngineSoundGenerator::generateSound)
    .function("updateParameters", &EngineSoundGenerator::updateParameters)
    ;
}
