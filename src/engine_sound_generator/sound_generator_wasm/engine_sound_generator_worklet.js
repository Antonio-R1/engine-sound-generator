
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

var SoundGeneratorWasm = Module;

class AllocatedArray {
   constructor (ptr = null, length = 0) {
      this.ptr = ptr;
      this.length = length;
   }
}

class EngineSoundGenerator extends AudioWorkletProcessor {

   constructor (options) {
      super ();

      this.throttleArray = new AllocatedArray();
      this.rpmArray = new AllocatedArray();

      this.channelIntakeArray = new AllocatedArray();
      this.channelEngineBlockVibrationsArray = new AllocatedArray();
      this.channelOutletArray = new AllocatedArray();

      // processorOptions contains the values passed to updateParameters.
      // The lengths of the waveguides are specified in samples.
      let processorOptions = options.processorOptions;

      this.mufflerElementsLengthPtr = SoundGeneratorWasm._malloc(processorOptions.mufflerElementsLength.length*4);
      SoundGeneratorWasm.HEAPU32.set(processorOptions.mufflerElementsLength, this.mufflerElementsLengthPtr/4);
      this.soundPtr = 0;
      this.intakeSoundPtr = 0;
      this.outletSoundPtr = 0;

      this.soundGenerator = new SoundGeneratorWasm.EngineSoundGenerator (sampleRate,
                        processorOptions.cylinders,

                        processorOptions.intakeWaveguideLength, processorOptions.exhaustWaveguideLength,
                        processorOptions.extractorWaveguideLength,

                        processorOptions.intakeOpenReflectionFactor,
                        processorOptions.intakeClosedReflectionFactor,

                        processorOptions.exhaustOpenReflectionFactor,
                        processorOptions.exhaustClosedReflectionFactor,
                        processorOptions.ignitionTime,

                        processorOptions.straightPipeWaveguideLength,
                        processorOptions.straightPipeReflectionFactor,

                        this.mufflerElementsLengthPtr, processorOptions.mufflerElementsLength.length, processorOptions.action,

                        processorOptions.outletWaveguideLength, processorOptions.outletReflectionFactor);

      this.port.onmessage = (event) => {
         let parameters = event.data;
         this.updateParameters (parameters["cylinder_count"],
                     parameters["intake_waveguide_length"], parameters["exhaust_waveguide_length"],
                     parameters["extractor_waveguide_length"],

                     parameters["intake_open_reflection_factor"], parameters["intake_closed_reflection_factor"],

                     parameters["exhaust_open_reflection_factor"], parameters["exhaust_closed_reflection_factor"], parameters["ignition_time"],

                     parameters["straight_pipe_waveguide_length"], parameters["straight_pipe_reflection_factor"],

                     parameters["muffler_elements_length"], parameters["action"],

                     parameters["outlet_waveguide_length"], parameters["outlet_reflection_factor"]);
      };
   }

   updateParameters (cylinderCount,

                     intakeWaveguideLength, exhaustWaveguideLength,
                     extractorWaveguideLength,

                     intakeOpenReflectionFactor, intakeClosedReflectionFactor,

                     exhaustOpenReflectionFactor, exhaustClosedReflectionFactor, ignitionTime,

                     straightPipeWaveguideLength, straightPipeReflectionFactor,

                     mufflerElementsLength, action,

                     outletWaveguideLength, outletReflectionFactor) {
      if (!mufflerElementsLength) {
         mufflerElementsLength = [10, 15, 20, 25];
      }
      SoundGeneratorWasm._free(this.mufflerElementsLengthPtr);
      this.mufflerElementsLengthPtr = SoundGeneratorWasm._malloc(mufflerElementsLength.length*4);
      SoundGeneratorWasm.HEAPU32.set(mufflerElementsLength, this.mufflerElementsLengthPtr/4);

      this.soundGenerator.updateParameters (cylinderCount,

                      intakeWaveguideLength, exhaustWaveguideLength,
                      extractorWaveguideLength,

                      intakeOpenReflectionFactor, intakeClosedReflectionFactor,

                      exhaustOpenReflectionFactor, exhaustClosedReflectionFactor, ignitionTime,

                      straightPipeWaveguideLength, straightPipeReflectionFactor,

                      this.mufflerElementsLengthPtr, mufflerElementsLength.length, action,

                      outletWaveguideLength, outletReflectionFactor);
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

   allocateArray (allocatedArray, typedArray) {
      if (allocatedArray.length<typedArray.length) {
         if (allocatedArray.ptr) {
            SoundGeneratorWasm._free(allocatedArray.ptr);
         }
         allocatedArray.ptr = SoundGeneratorWasm._malloc(typedArray.length*typedArray.BYTES_PER_ELEMENT);
         allocatedArray.length = typedArray.length;
      }
   }

   setArray (allocatedArray, typedArray) {
      this.allocateArray (allocatedArray, typedArray);
      SoundGeneratorWasm.HEAPF32.set (typedArray, allocatedArray.ptr/SoundGeneratorWasm.HEAPF32.BYTES_PER_ELEMENT);
   }

   setChannelOutput (channel, allocatedArray) {
      let output = SoundGeneratorWasm.HEAPF32.slice(allocatedArray.ptr/SoundGeneratorWasm.HEAPF32.BYTES_PER_ELEMENT,
                               allocatedArray.ptr/SoundGeneratorWasm.HEAPF32.BYTES_PER_ELEMENT+allocatedArray.length);
      channel.set(output);
   }

   process (inputList, outputList, parameters) {
      this.chunkSize = outputList[0][0].length;
      let channelIntake = outputList[0][0];
      let channelEngineBlockVibrations = outputList[1][0];
      let channelOutlet = outputList[2][0];
      this.sound = channelEngineBlockVibrations;

      this.intakeSound = channelIntake;
      this.outletSound = channelOutlet;

      this.setArray (this.throttleArray, parameters["throttle"]);
      this.setArray (this.rpmArray, parameters["rpm"]);
      this.allocateArray (this.channelIntakeArray, channelIntake);
      this.allocateArray (this.channelEngineBlockVibrationsArray, channelEngineBlockVibrations);
      this.allocateArray (this.channelOutletArray, channelOutlet);

      this.soundGenerator.generateSound (currentFrame, sampleRate,
                   this.rpmArray.ptr, parameters["rpm"].length,
                   this.throttleArray.ptr, parameters["throttle"].length,
                   this.channelIntakeArray.ptr, this.channelIntakeArray.length,
                   this.channelEngineBlockVibrationsArray.ptr, this.channelEngineBlockVibrationsArray.length,
                   this.channelOutletArray.ptr, this.channelOutletArray.length);

      this.setChannelOutput (channelIntake, this.channelIntakeArray);
      this.setChannelOutput (channelEngineBlockVibrations, this.channelEngineBlockVibrationsArray);
      this.setChannelOutput (channelOutlet, this.channelOutletArray);

      return true;
   }

}

registerProcessor("engine-sound-processor", EngineSoundGenerator)