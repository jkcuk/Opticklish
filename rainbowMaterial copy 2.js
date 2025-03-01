import * as THREE from 'three';

function createRainbowMaterial( noOfSources, k, omegaT ) {
    // create an array of sources
    let sourcePositions = [];
    let sourceAmplitudes = [];	// (complex) amplitudes

    // fill in the elements of both arrays
    let i=0;
    let m=0;
    for(; i<noOfSources; i++) {
        let phi = 2.0*Math.PI*i/noOfSources;	// takes values between 0 and 2 pi
        sourcePositions.push(new THREE.Vector3(0.5*Math.cos(phi), 0.5*Math.sin(phi), 0));
        sourceAmplitudes.push(new THREE.Vector2(Math.cos(m*phi), Math.sin(m*phi)));
    }
    for(; i<10; i++) {
        sourcePositions.push(new THREE.Vector3(0, 0, 0));
        sourceAmplitudes.push(new THREE.Vector2(1, 0));
    }
    
    return new THREE.ShaderMaterial( {
        side: THREE.DoubleSide,
        uniforms: { 
            sourcePositions: { value: sourcePositions },
            sourceAmplitudes: { value: sourceAmplitudes },
            noOfSources: { value: noOfSources },
            k: { value: k },	// lambda = 0.1
            omegaT: { value: omegaT },
        },
        // wireframe: true,
        vertexShader: `
            varying vec3 v_position;
            void main()	{
                // projectionMatrix, modelViewMatrix, position -> passed in from Three.js
                gl_Position = projectionMatrix
                    * modelViewMatrix
                    * vec4(position, 1.0);
                v_position = (modelMatrix * vec4(position, 1.0)).xyz;	// set v_pos to the actual world position of the vertex
            }
        `,
        fragmentShader: `
            precision highp float;

            #define M_PI 3.1415926535897932384626433832795;

            varying vec3 v_position;

            uniform vec3 sourcePositions[10];
            uniform vec2 sourceAmplitudes[10];
            uniform int noOfSources;
            uniform float k;
            uniform float omegaT;

            // from https://gist.github.com/983/e170a24ae8eba2cd174f
            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }

            float calculatePhase(vec2 amplitude) {
                return atan(amplitude.y, amplitude.x);	// -pi .. pi
            }

            float calculateHue(vec2 amplitude) {
                return 0.5 + 0.5*calculatePhase(amplitude)/M_PI;	// 0 .. 1
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
                }

                // plot the phase only
                gl_FragColor = vec4(hsv2rgb(vec3(calculateHue(amplitude), 1.0, 1.0)), 1.0);
                // gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
                // float s = sin(omegaT);
                // float s2 = s*s;
                // gl_FragColor = vec4(s2, s2, s2, 1.0);
            }
        `
    } );
}

export { createRainbowMaterial };