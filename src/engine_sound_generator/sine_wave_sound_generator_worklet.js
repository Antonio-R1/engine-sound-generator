
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

/*
 * Only used for testing as there already is an OscillatorNode interface that
 * can be used to generate a sine wave.
 */
class SineWaveSoundGenerator extends AudioWorkletProcessor {

   constructor () {
      super ();
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
      for (let i=0; i<channel.length; i++) {
         let frequency = parameters["frequency"].length > 1 ? parameters["frequency"][i] : parameters["frequency"][0];
         channel[i] = Math.sin(frequency*((currentFrame+i)/sampleRate)*2.0*Math.PI);
      }
      return true;
   }

}

registerProcessor("sine-wave-audio-processor", SineWaveSoundGenerator)