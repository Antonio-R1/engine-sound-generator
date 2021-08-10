# Engine Sound Generator
an engine sound generator written in JavaScript using the Web Audio API

My attempts to implemente an engine sound generator based on the ideas from [this paper](https://www.researchgate.net/publication/280086598_Physically_informed_car_engine_sound_synthesis_for_virtual_and_augmented_environments) [[1]](#1)
and by using Three.js and the Web Audio API.

The Doppler effect is also implemented by using DelayNodes and setting the value of `delayTime`.

## First Attempt
<http://antonio-r1.github.io/engine-sound-generator/src/engine_sound_generator/sounds.htm>

The first attempt uses 'AudioBufferSourceNode.start(when)' for trying to generate the audio continuously.
However, this does not seem to work correctly in some browsers.

## Second Attempt
<http://antonio-r1.github.io/engine-sound-generator/src/engine_sound_generator/sounds_worklet.htm>

The second attempt uses an AudioWorklet for generating the audio. Now, the volume for the intake, engine block vibrations and outlet sound can be set seperately
and also the algorithm for the Doppler effect has been improved compared to the first attempt.

### Usage

First the module need to be loaded:

```javascript
   var loadingManager = new THREE.LoadingManager();
   loadingManager.onLoad = function () {
      moduleInit ();
   };

   listener = new SoundGeneratorAudioListener();
   EngineSoundGenerator.load (loadingManager, listener);
```

In the moduleInit function add the listener to the camera and then create an EngineSoundGenerator object.
The EngineSoundGenerator object then needs to be added for example to a THREE.Object3d and then started with `soundCarEngine.play()`.
The waveguide lengths are specified in samples.

```javascript
   soundCarEngine = new EngineSoundGenerator({listener: listener, parameters: {cylinders: 4,

                                    intakeWaveguideLength: 100,
                                    exhaustWaveguideLength: 100,
                                    extractorWaveguideLength: 100,

                                    intakeOpenReflectionFactor: 0.01,
                                    intakeClosedReflectionFactor: 0.95,

                                    exhaustOpenReflectionFactor: 0.01,
                                    exhaustClosedReflectionFactor: 0.95,
                                    ignitionTime: 0.016,

                                    straightPipeWaveguideLength: 128,
                                    straightPipeReflectionFactor: 0.01,

                                    mufflerElementsLength: [10, 15, 20, 25],
                                    action: 0.1,

                                    outletWaveguideLength: 5,
                                    outletReflectionFactor: 0.01}});
```

The value of the rpm paremeter can be set in the following way:

```javascript
      let rpmParam = soundCarEngine.worklet.parameters.get('rpm');
      rpmParam.value = someValue;
```

## Third party software used / References
- [Three.js](https://github.com/mrdoob/three.js)
- <a id="1">[1]</a>  Baldan, Stefano & Lachambre, Helene & Delle Monache, Stefano & Boussard, Patrick. (2015). Physically informed car engine sound synthesis for virtual and augmented environments. 10.1109/SIVE.2015.7361287. 