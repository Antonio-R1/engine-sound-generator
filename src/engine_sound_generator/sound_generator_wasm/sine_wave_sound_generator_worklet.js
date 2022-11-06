
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

var SoundGeneratorWasm = Module;

var soundGeneratorWasm = null;
/*
 * Only used for testing as there already is an OscillatorNode interface that
 * can be used to generate a sine wave.
 */
class SineWaveSoundGenerator extends AudioWorkletProcessor {

   constructor () {
      super ();
      this.channelPtr = null;
      this.channelLength = 0;
   }

   static get parameterDescriptors () {
      return [{
         name: 'frequency',
         defaultValue: 440,
         minValue: 20,
         maxValue: 20000,
         automationRate: 'a-rate'
       }];
   }

   process (inputList, outputList, parameters) {
      let channel = outputList[0][0];

      if (this.channelLength!=channel.length) {
         if (this.channelPtr) {
            SoundGeneratorWasm._free(this.channelPtr);
         }
         this.channelPtr = SoundGeneratorWasm._malloc(channel.length*channel.BYTES_PER_ELEMENT);
         this.channelLength = channel.length;
      }

      SoundGeneratorWasm.generate_sound(currentFrame, sampleRate, parameters["frequency"][0], this.channelPtr, channel.length);

      let output = SoundGeneratorWasm.HEAPF32.slice(this.channelPtr/SoundGeneratorWasm.HEAPF32.BYTES_PER_ELEMENT,
                               this.channelPtr/SoundGeneratorWasm.HEAPF32.BYTES_PER_ELEMENT+channel.length);
      channel.set(output);

      return true;
   }

}
SineWaveSoundGenerator.generateSound = null;

registerProcessor("sine-wave-audio-processor", SineWaveSoundGenerator)
