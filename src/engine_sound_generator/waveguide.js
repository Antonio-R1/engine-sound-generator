
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

class DelayLine {

   constructor(length) {
      if (length < 1) {
         throw new Error("The length of the delay line needs to be a positive value.");
      }
      this.data = new Float32Array(length);
      this.index = 0;
   }

   updateLeft (value) {
      this.data[this.index] = value;
      this.index++;
      if (this.index>=this.data.length) {
         this.index = 0;
      }
   }

   updateRight (value) {
      this.data[this.index] = value;
      this.index--;
      if (this.index<0) {
         this.index = this.data.length-1;
      }
   }

   getAtPosition (index) {
      index = this.index+index;
      while (index < 0) {
         index += this.data.length;
      }

      while (index >= this.data.length) {
         index -= this.data.length;
      }

      return this.data[index];
   }

}

class Waveguide {

   constructor (length, reflectionFactorLeft, reflectionFactorRight) {
      this.upper = new DelayLine(length);
      this.lower = new DelayLine(length);
      this.reflectionFactorLeft = reflectionFactorLeft;
      this.reflectionFactorRight = reflectionFactorRight;
      this.maxIndex = length-1;
      this.outputLeft = 0.0;
      this.outputRight = 0.0;
   }

   add (valueLeft, valueRight) {

      let reflectedValueLeft = this.lower.getAtPosition(0)*this.reflectionFactorLeft;
      this.outputLeft = this.lower.getAtPosition(0)*(1.0-this.reflectionFactorLeft);

      let reflectedValueRight = this.upper.getAtPosition(0)*this.reflectionFactorRight;
      this.outputRight = this.upper.getAtPosition(0)*(1.0-this.reflectionFactorRight);

      this.upper.updateRight(valueLeft+reflectedValueLeft);
      this.lower.updateLeft(valueRight+reflectedValueRight);
   }

}

export default Waveguide;