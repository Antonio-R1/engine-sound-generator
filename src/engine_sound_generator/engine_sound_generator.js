
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

import {GeneratedPositionalAudio, LowpassFilter} from './sound_generator.js';
import Waveguide from './waveguide.js';

class Cylinder {

   constructor ({index,

                intakeWaveguideLength,
                exhaustWaveguideLength,
                extractorWaveguideLength,

                intakeOpenReflectionFactor,
                intakeClosedReflectionFactor,

                exhaustOpenReflectionFactor,
                exhaustClosedReflectionFactor,

                ignitionTime}) {
      this.index = index;

      // For now, the change of the delay time of the waveguide representing a cylinder is not implemented.
      this.cylinderWaveguide = new Waveguide(10, 0.75, 0.75);

      this.intakeWaveguide = new Waveguide(intakeWaveguideLength, 0.01, intakeOpenReflectionFactor);
      this.exhaustWaveguide = new Waveguide(exhaustWaveguideLength, exhaustClosedReflectionFactor, 0.01);
      this.extractorWaveguide = new Waveguide(extractorWaveguideLength, 0.01, 0.01);

      this.intakeOpenReflectionFactor = intakeOpenReflectionFactor;
      this.intakeClosedReflectionFactor = intakeClosedReflectionFactor;

      this.exhaustOpenReflectionFactor = exhaustOpenReflectionFactor;
      this.exhaustClosedReflectionFactor = exhaustClosedReflectionFactor;

      this.ignitionTime = ignitionTime;

      this.intakeValve = null;
      this.exhaustValve = null;
      this.pistonMotion = null;
      this.fuelIgnition = null;

   }

   /*
    * used to update reflection factor of the open and closed valves
    */
   updateWaveguidesReflectionValues () {
      this.intakeWaveguide.reflectionFactorRight = this.intakeOpenReflectionFactor*this.intakeValve+
                                                   this.intakeClosedReflectionFactor*(1.0-this.intakeValve);
      this.cylinderWaveguide.reflectionFactorLeft = this.intakeOpenReflectionFactor*this.intakeValve+
                                                    this.intakeClosedReflectionFactor*(1.0-this.intakeValve);

      this.exhaustWaveguide.reflectionFactorLeft = this.exhaustOpenReflectionFactor*this.exhaustValve+
                                                   this.exhaustClosedReflectionFactor*(1.0-this.exhaustValve);
      this.cylinderWaveguide.reflectionFactorRight = this.exhaustOpenReflectionFactor*this.exhaustValve+
                                                     this.exhaustClosedReflectionFactor*(1.0-this.exhaustValve);
   }

   /*
    * updates the values of the intake, cylinder, extractor and exhaust waveguides
    * arguments:
    *    intake noise: low-pass-filtered white-noise
    *    straightPipeOutputLeft: the left output of the straight pipe waveguide
    *    x: the current phase
    */
   update (intakeNoise, straightPipeOutputLeft, x) {

      this.exhaustValue = this._exhaustValve(x);
      this.intakeValve = this._intakeValve (x);
      this.pistonMotion = this._pistonMotion (x);
      this.fuelIgnition = this._fuelIgnition(x, this.ignitionTime);

      this.updateWaveguidesReflectionValues ();

      intakeNoise = intakeNoise*this.intakeValve;
      let currentCylinderAmplitude = this.pistonMotion*1.5+this.fuelIgnition*5.0;

      this.currentCylinderAmplitude = currentCylinderAmplitude;
      this.exhaustOutputLeft = this.exhaustWaveguide.outputLeft;
      this.exhaustOutputRight = this.exhaustWaveguide.outputRight;
      let extractorOutputLeft = this.extractorWaveguide.outputLeft;
      let extractorOutputRight = this.extractorWaveguide.outputRight;
      let cylinderOutputLeft = this.cylinderWaveguide.outputLeft;
      let cylinderOutputRight = this.cylinderWaveguide.outputRight;
      let intakeOutputLeft = this.intakeWaveguide.outputLeft;
      let intakeOutputRight = this.intakeWaveguide.outputRight;

      this.extractorWaveguide.add (this.exhaustWaveguide.outputRight, straightPipeOutputLeft);
      this.exhaustWaveguide.add (cylinderOutputRight*(1.0-0*this.exhaustWaveguide.reflectionFactorLeft), extractorOutputLeft);
      this.cylinderWaveguide.add (currentCylinderAmplitude+intakeOutputRight*(1.0-this.intakeWaveguide.reflectionFactorRight), extractorOutputLeft*(1.0-this.exhaustWaveguide.reflectionFactorLeft));
      this.intakeWaveguide.add (intakeNoise, cylinderOutputLeft*(1.0-this.intakeWaveguide.reflectionFactorRight));
   }

    _exhaustValve (x) {
       if (0.75 < x && x < 1.0) {
          return -Math.sin(4.0*Math.PI*x);
       }
       return 0;
    }

    _intakeValve (x) {
       if (0 < x && x < 0.25) {
          return Math.sin(4.0*Math.PI*x);
       }
       return 0;
    }

    _pistonMotion (x) {
       return Math.cos(4.0*Math.PI*x);
    }

    // used a different function than the one in the paper
    _fuelIgnition (x, t) {

       if (0.0 < x && x < 0.5*t) {
          return Math.sin(2.0*Math.PI*(x/t));
       }

       return 0;
    }

}

/*
 * class for simulating a muffler by using some waveguided in parallel
 */
class Muffler {
   /*
    * arguments:
    *    elementLengths: the lengths of the elements in samples
    *    action: the action of the muffler, a value from 0 to 1
    */
   constructor ({elementLengths, action}) {
      this.elements = [];
      this.elementsCount = elementLengths.length;
      this.elementsCountInverse = 1.0/this.elementsCount;
      for (let i=0; i<elementLengths.length; i++) {
         this.elements[i] = new Waveguide (elementLengths[i], 0.0, action);
      }
      this.outputLeft = 0.0;
      this.outputRight = 0.0;
   }

   /*
    * stores the input for the outlet in this.outputRight
    * and the input for the straight pipe in this.outputRight
    */
   update (mufflerInput, outletValue) {
      mufflerInput = this.elementsCountInverse*mufflerInput;
      outletValue = this.elementsCountInverse*outletValue;
      this.outputLeft = 0.0;
      this.outputRight = 0.0;
      for (let i=0; i<this.elementsCount; i++) {
         this.outputLeft += this.elements[i].outputLeft;
         this.outputRight += this.elements[i].outputRight;
         this.elements[i].add(mufflerInput, outletValue);
      }
   }
}

/*
 * tries to continously generate a car engine sound without a worklet
 * by trying to schedule the sound correctly
 */
class SoundEngine extends GeneratedPositionalAudio {

    constructor ({listener, cylinderCount}) {
       super(listener);
       this.rpm = 0.0;
       this.currentRevolution = 0.0;
       this.intakeNoiseLowPassFilter = new LowpassFilter (11000.0);
       this.crankshaftLowPassFilter = new LowpassFilter (75.0);
       this.engineLowPassFilter = new LowpassFilter (125.0);
       this.sound = new Float32Array(this.chunkSize);
       this.intakeSound = new Float32Array(this.chunkSize);
       this.outletSound = new Float32Array(this.chunkSize);
       this.cylinders = [];
       this.cylindersCountInverse = 1.0/cylinderCount;
       for (let i=0; i<cylinderCount; i++) {
          this.cylinders.push(new Cylinder({index: i,
                                            intakeWaveguideLength: 100,
                                            exhaustWaveguideLength: 100,
                                            extractorWaveguideLength: 100,

                                            intakeOpenReflectionFactor: 0.25,
                                            intakeClosedReflectionFactor: 0.95,

                                            exhaustOpenReflectionFactor: 0.25,
                                            exhaustClosedReflectionFactor: 0.95,

                                            ignitionTime: 0.016}));
       }
       this.straightPipe = new Waveguide (128, 0.1, 0.1);
       this.muffler = new Muffler ({elementLengths: [10, 15, 20, 25], action: 0.25});
       this.outlet = new Waveguide (5, 0.01, 0.01);
    }

    /*
     * updates the value of the sample at the specified index
     */
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
          this.sound[index] += this.cylinders[i].cylinderWaveguide.outputRight;
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
          straightPipeInput += this.cylinders[i].cylinderWaveguide.outputRight;
       }

       this.straightPipe.add (straightPipeInput, this.muffler.outputLeft);
       this.outlet.add (this.muffler.outputRight, 0.0);
       this.outletSound[index] = this.outlet.outputRight;

       this.muffler.update(this.straightPipe.outputRight, this.outlet.outputLeft);
    }

    playSound () {
       if (this._startedAt>this.context.currentTime) {
          return;
       }

       for (let i=0; i<this.sound.length; i++) {
          this._updateSample(i);
       }

       for (let i=0; i<this.sound.length; i++) {
          this.sound[i] = this.engineLowPassFilter.getFilteredValue(this.sound[i]);
          this.sound[i] += this.intakeSound[i];
          this.sound[i] += this.outletSound[i];
       }

       this.buffer.copyToChannel(this.sound, 0);

       super.play();
    }

    play () {
        super.playSound ();
        this.playSound ();
    }

    stop () {
        this.started = false;
        super.stop();
    }

    update (listenerPosition, estimatedNewPositionListener, dt) {
       this.updateDelayAndDopplerEffect (listenerPosition, estimatedNewPositionListener, dt);
    }

}

export {SoundEngine, Cylinder, Muffler}