import * as THREE from 'three';

let sourcePositions = [];
let sourceAmplitudes = [];	// (complex) amplitudes
let rainbowMaterial;
let noOfSources = 5;
let fieldType = 1;
let d = 1;
let m = 1;

function createSources() {
	// create an array of sources
	sourcePositions = [];
	sourceAmplitudes = [];	// (complex) amplitudes

	// fill in the elements of all three arrays
	// noOfSources = 100;	// no of elements
	let i=0;
	for(; i<noOfSources; i++) {
		let phi = 2.0*Math.PI*i/noOfSources;	// azimuthal angle
		switch( fieldType ) {
			case 0:	// line
				sourcePositions.push(new THREE.Vector3(d*(noOfSources == 1?0:(i/(noOfSources-1)-0.5)), 0, 0));
				sourceAmplitudes.push(new THREE.Vector2(Math.cos(m*phi), Math.sin(m*phi)));
				break;			
			case 1:	// ring
			default:
				sourcePositions.push(new THREE.Vector3(0.5*d*Math.cos(phi), 0.5*d*Math.sin(phi), 0));
				sourceAmplitudes.push(new THREE.Vector2(Math.cos(m*phi), Math.sin(m*phi)));
		}
	}
	for(; i<10; i++) {
		sourcePositions.push(new THREE.Vector3(0, 0, 0));
		sourceAmplitudes.push(new THREE.Vector2(1, 0));
	}

	if(rainbowMaterial) {
		rainbowMaterial.uniforms.sourcePositions.value = sourcePositions;
		rainbowMaterial.uniforms.sourceAmplitudes.value = sourceAmplitudes;
		rainbowMaterial.uniforms.noOfSources.value = noOfSources;
	}
}

function createRainbowMaterial() {
	createSources();

	return new THREE.ShaderMaterial({
		side: THREE.DoubleSide,
		uniforms: { 
			sourcePositions: { value: sourcePositions },
			sourceAmplitudes: { value: sourceAmplitudes },
			noOfSources: { value: noOfSources },
			maxAmplitude: { value: .5*noOfSources },
			maxIntensity: { value: .25*noOfSources*noOfSources },
			k: { value: 20*Math.PI },	// lambda = 0.1
			omegaT: { value: 0.0 },
			plotType: { value: 2 },	// 0 = intensity, 1 = intensity & phase, 2 = phase, 3 = real part only
			brightnessFactor: { value: 1.0 },
			// xPlaneMatrix: { value: xPlane.matrix },
		},
		// wireframe: true,
		vertexShader: `
			varying vec3 v_position;
			void main()	{
				// projectionMatrix, modelViewMatrix, position -> passed in from Three.js
  				gl_Position = projectionMatrix
					* modelViewMatrix
					* vec4(position, 1.0);
				// v_position = position;
				v_position = (modelMatrix * vec4(position, 1.0)).xyz;	// set v_pos to the actual world position of the vertex
				// v_position = gl_Position.xyz;
			}
		`,
		fragmentShader: `
			precision highp float;

			#define M_PI 3.1415926535897932384626433832795;

			varying vec3 v_position;

			uniform vec3 sourcePositions[10];
			uniform vec2 sourceAmplitudes[10];
			uniform int noOfSources;
			uniform float maxAmplitude;
			uniform float maxIntensity;
			uniform float k;
			uniform float omegaT;
			uniform int plotType;	// 0 = intensity, 1 = intensity & phase, 2 = phase, 3 = real part only
			uniform float brightnessFactor;

			// from https://gist.github.com/983/e170a24ae8eba2cd174f
			vec3 hsv2rgb(vec3 c) {
 				vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    			vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    			return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
			}

			float calculatePhase(vec2 amplitude) {
				return atan(amplitude.y, amplitude.x);	//  mod(atan(amplitude.y, amplitude.x) + omegaT, 2.0*pi);	// -pi .. pi
			}

			float calculateHue(vec2 amplitude) {
				return 0.5 + 0.5*calculatePhase(amplitude)/M_PI;	// 0 .. 1
			}

			float calculateIntensity(vec2 amplitude) {
				return dot(amplitude, amplitude)/maxIntensity;
			}

			void main() {
				// this is where the sum of the amplitudes of all individual sources goes
				vec2 amplitude = vec2(0, 0);
				for(int i=0; i<noOfSources; i++) {
					float d = distance(v_position, sourcePositions[i]);
					float kd = k*d - omegaT;
					float c = cos(kd);
					float s = sin(kd);
					// add to the sum of amplitudes the amplitude due to 
					amplitude += vec2(
						sourceAmplitudes[i].x*c - sourceAmplitudes[i].y*s,	// real part = r1 r2 - i1 i2
						sourceAmplitudes[i].x*s + sourceAmplitudes[i].y*c	// imaginary part = r1 i2 + r2 i1
					)/d;
					// amplitude += sourcePositions[i].xy;	// sourceAmplitudes[i]/d;
				}

				switch(plotType) {
					case 3:	// real part
					float a = brightnessFactor*amplitude.x/maxAmplitude;
						gl_FragColor = vec4(a, 0, -a, 1);
						break;
					case 2:	// phase only
						// float phase = atan(amplitude.y, amplitude.x);	//  mod(atan(amplitude.y, amplitude.x) + omegaT, 2.0*pi);	// -pi .. pi
						// float hue = 0.5 + 0.5*phase/M_PI;	// 0 .. 1
						gl_FragColor = vec4(hsv2rgb(vec3(calculateHue(amplitude), 1.0, 1.0)), 1.0);
						break;
					case 1:	// phase & intensity
						// float intensity = dot(amplitude, amplitude)/maxIntensity;
						// float phase = atan(amplitude.y, amplitude.x);	//  mod(atan(amplitude.y, amplitude.x) + omegaT, 2.0*pi);	// -pi .. pi
						// float hue = 0.5 + 0.5*phase/M_PI;	// 0 .. 1
						gl_FragColor = vec4(hsv2rgb(vec3(calculateHue(amplitude), 1.0, brightnessFactor*calculateIntensity(amplitude))), 1.0);
						break;
					case 0:	// intensity only
					default:
						// float intensity = dot(amplitude, amplitude)/maxIntensity;
						float intensity = brightnessFactor*calculateIntensity(amplitude);
						gl_FragColor = vec4(intensity, intensity, intensity, 1);
				}
				// amplitude.y = 0.0;
				// gl_FragColor = vec4(abs(v_pos), 1);
				// gl_FragColor = vec4(abs(sourcePositions[99]), 1.0);
				// gl_FragColor = vec4(amplitude/maxAmplitude, 0.0, 1.0);
				// float intensity = length(amplitude)/maxIntensity;
				// float pi = 3.14159265359;
				// float phase = atan(amplitude.y, amplitude.x);	//  mod(atan(amplitude.y, amplitude.x) + omegaT, 2.0*pi);	// -pi .. pi
				// float hue = 0.5 + 0.5*phase/pi;	// 0 .. 1
				// gl_FragColor = vec4(intensity, 0, 0, 1);
				// gl_FragColor = vec4(hsv2rgb(vec3(hue, 1.0, intensity)), 1.0);
				// gl_FragColor = vec4(amplitude.x/maxAmplitude, 0, 0, 1);
			}
		`
	});
}

export { createRainbowMaterial };