
/*
 * Copyright (c) 2021-2022 Antonio-R1
 * License: https://github.com/Antonio-R1/engine-sound-generator/blob/main/LICENSE | MIT
 */

import SplineInterpolation from './spline_interpolation.js';

/*
 * simple class for simulating an engine for testing the sound generator
 */
class Engine {

   constructor ({xAxisPowerValues = null, yAxisPowerValues = null,
                 maxEngineBrakeTorque = 100, momentOfInertia = 1.0, engineFriction = 0.01, minRpm = 750.0, maxRpm = 7500.0} = {}) {
      this.rpm = 0.0;
      this.throttle = 0.0;
      this._currentThrottle = 0.0;

      if ((xAxisPowerValues==null) !== (yAxisPowerValues==null)) {
         throw new Error('"xAxisPowerValues" and "yAxisPowerValues" need both to be supplied.');
      }

      if (xAxisPowerValues===null) {
         xAxisPowerValues = [0,  1000,   2000,    3500,   7500,    8750,  10000];
         yAxisPowerValues = [0, 35000,  125000, 325000, 735000,  735000, 475000];
      }

      this.powerValues = new SplineInterpolation (xAxisPowerValues, yAxisPowerValues);

      this.maxEngineBrakeTorque = maxEngineBrakeTorque;
      this.momentOfInertia = momentOfInertia;

      this.engineFriction = engineFriction;
      this.minRpm = minRpm;
      this.maxRpm = maxRpm;
      this.starting = false;
      this.started = false;
   }

   start () {
      this.rpm = 0.0;
      this.starting = true;
   }

   update (dt) {
      let throttle = this.throttle;

      if (!this.started || this.rpm < 100.0) {
         throttle = 0.0;
         if (this.rpm < 75.0 && !this.starting) {
            this.rpm = 0.0;
            this.currentPower = 0.0;
            return;
         }
      }
      else if (this.rpm<this.minRpm) {
         throttle = 0.35;
      }

      if (this.starting) {
         this.started = true;
         if (this.rpm<100.0) {
            this.rpm += 200.0*dt;
            throttle = 1.0;
         }
         else {
            this.starting = false;
         }
      }

      if (this.rpm > this.maxRpm) {
         throttle = 0.0;
      }

      let exponent = 0.5+1.5*(this.rpm-this.minRpm)/(this.maxRpm-this.minRpm);
      let powerPercentage = Math.pow (throttle, exponent);
      let omega = this.rpm/60.0*2*Math.PI;
      let torqueEngine = powerPercentage*(this.powerValues.evaluate(this.rpm)/omega+this.maxEngineBrakeTorque)-
                         this.maxEngineBrakeTorque;

      /*
       * L: angular momentum
       * I: momentum of inertia
       * omega: angular velocity
       * P: power
       * M: torque
       * L = I*omega
       * L = M*dt
       * M = P/omega
       */
      let angularMomentum = omega*this.momentOfInertia;
      let torqueFriction = this.engineFriction;

      angularMomentum = angularMomentum+(torqueEngine-torqueFriction)*dt;
      this.rpm = angularMomentum/this.momentOfInertia*60.0/(2*Math.PI);
   }
}

export default Engine;