
/*
 * Copyright (c) 2021 Antonio-R1
 * License: MIT
 */

import {LowpassFilter} from './sound_generator.js';
import {Cylinder, Muffler} from './engine_sound_generator.js';
import Waveguide from './waveguide.js';

class EngineSoundGenerator extends AudioWorkletProcessor {

   constructor (options) {
      super ();

      // processorOptions contains the values passed to updateParameters.
      // The lengths of the waveguides are specified in samples.
      let processorOptions = options.processorOptions;

      this.secondsPerSample = 1.0/sampleRate;
      this.rpm = 0.0;
      this.currentRevolution = 0.0;
      this.intakeNoiseLowPassFilter = new LowpassFilter (11000.0);
      this.crankshaftLowPassFilter = new LowpassFilter (75.0);
      this.engineLowPassFilter = new LowpassFilter (125.0);

      this.updateParameters ({cylinderCount: processorOptions.cylinders,

                              intakeWaveguideLength: processorOptions.intakeWaveguideLength,
                              exhaustWaveguideLength: processorOptions.exhaustWaveguideLength,
                              extractorWaveguideLength: processorOptions.extractorWaveguideLength,

                              intakeOpenReflectionFactor: processorOptions.intakeOpenReflectionFactor,
                              intakeClosedReflectionFactor: processorOptions.intakeClosedReflectionFactor,

                              exhaustOpenReflectionFactor: processorOptions.exhaustOpenReflectionFactor,
                              exhaustClosedReflectionFactor: processorOptions.exhaustClosedReflectionFactor,
                              ignitionTime: processorOptions.ignitionTime,

                              straightPipeWaveguideLength: processorOptions.straightPipeWaveguideLength,
                              straightPipeReflectionFactor: processorOptions.straightPipeReflectionFactor,

                              mufflerElementsLength: processorOptions.mufflerElementsLength,
                              action: processorOptions.action,

                              outletWaveguideLength: processorOptions.outletWaveguideLength,
                              outletReflectionFactor: processorOptions.outletReflectionFactor});


      this.port.onmessage = (event) => {
         this.updateParameters (event.data)
      };
   }

   updateParameters ({cylinderCount,

                      intakeWaveguideLength, exhaustWaveguideLength,
                      extractorWaveguideLength,

                      intakeOpenReflectionFactor, intakeClosedReflectionFactor,

                      exhaustOpenReflectionFactor, exhaustClosedReflectionFactor, ignitionTime,

                      straightPipeWaveguideLength, straightPipeReflectionFactor,

                      mufflerElementsLength, action,

                      outletWaveguideLength, outletReflectionFactor}) {

      this.cylinders = [];
      this.cylindersCountInverse = 1.0/cylinderCount;
      for (let i=0; i<cylinderCount; i++) {
         this.cylinders.push(new Cylinder({index: i,
                                           intakeWaveguideLength: intakeWaveguideLength,
                                           exhaustWaveguideLength: exhaustWaveguideLength,
                                           extractorWaveguideLength: extractorWaveguideLength,

                                           intakeOpenReflectionFactor: intakeOpenReflectionFactor,
                                           intakeClosedReflectionFactor: intakeClosedReflectionFactor,

                                           exhaustOpenReflectionFactor: exhaustOpenReflectionFactor,
                                           exhaustClosedReflectionFactor: exhaustClosedReflectionFactor,
                                           ignitionTime: ignitionTime}));
      }
      this.straightPipe = new Waveguide (straightPipeWaveguideLength, straightPipeReflectionFactor,
                                                                      straightPipeReflectionFactor);
      this.muffler = new Muffler ({elementLengths: mufflerElementsLength, action: action});
      this.outlet = new Waveguide (outletWaveguideLength, outletReflectionFactor, outletReflectionFactor);

   }

   static get parameterDescriptors () {
      return [{
         name: 'throttle',
         defaultValue: 0.0,
         minValue: 0.0,
         maxValue: 1.0,
         automationRate: 'a-rate'
       }, {
         name: 'rpm',
         defaultValue: 0.0,
         minValue: 0.0,
         automationRate: 'a-rate'
       }];
    }

    _updateSample(index) {
       this.sound[index] = 0.0;

       let intakeNoise = this.intakeNoiseLowPassFilter.getFilteredValue(2.0*Math.random()-1.0);
       if (this.rpm < 25.0) {
          intakeNoise = 0;
       }

       let crankshaftValue = this.crankshaftLowPassFilter.getFilteredValue(0.25*Math.random());
       for (let i=0; i<this.cylinders.length; i++) {
          let x = this.currentRevolution+i*(this.cylindersCountInverse+crankshaftValue);
          this.cylinders[i].update(intakeNoise, this.straightPipe.outputLeft, x%1);
          this.sound[index] += this.cylinders[i].cylinderWaveguide.outputLeft;
       }
       this.currentRevolution += this.secondsPerSample*this.rpm/120.0;

       if (this.currentRevolution > 1.0) {
          this.currentRevolution -= 1.0;
       }

       this.intakeSound[index] = 0;
       for (let i=0; i<this.cylinders.length; i++) {
          this.intakeSound[index] += this.cylinders[i].intakeWaveguide.outputLeft;
       }

       let straightPipeInput = 0.0;

       for (let i=0; i<this.cylinders.length; i++) {
          straightPipeInput += this.cylinders[i].extractorWaveguide.outputRight;
       }

       this.straightPipe.add (straightPipeInput, this.muffler.outputLeft);
       this.outlet.add (this.muffler.outputRight, 0.0);
       this.outletSound[index] = this.outlet.outputRight;

       this.muffler.update(this.straightPipe.outputRight, this.outlet.outputLeft);
    }

   process (inputList, outputList, parameters) {
      this.chunkSize = outputList[0][0].length;
      let channelIntake = outputList[0][0];
      let channelEngineBlockVibrations = outputList[1][0];
      let channelOutlet = outputList[2][0];
      this.sound = channelEngineBlockVibrations;
      this.intakeSound = channelIntake;
      this.outletSound = channelOutlet;
      for (let i=0; i<this.chunkSize; i++) {
         this.throttle = parameters["throttle"].length > 1 ? parameters["throttle"][i] : parameters["throttle"][0];
         this.rpm = parameters["rpm"].length > 1 ? parameters["rpm"][i] : parameters["rpm"][0];

         this._updateSample(i);

      }

       for (let i=0; i<this.chunkSize; i++) {
          channelIntake[i] = this.intakeSound[i];
          channelEngineBlockVibrations[i] = this.engineLowPassFilter.getFilteredValue(this.sound[i]);
          channelOutlet[i] = this.outletSound[i];
       }
      return true;
   }

}

registerProcessor("engine-sound-processor", EngineSoundGenerator)