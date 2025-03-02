import * as THREE from 'three';

class RainbowMaterial extends THREE.ShaderMaterial {
    /**
 * Represents a color material.
 * @constructor
 * @param {int} colorType - 0: single color, 1: rainbow
 * @param {int} noOfSources - The number of sources that interfere to create the colour
 * @param {float} k - The wave number
 * @param {float} omegaT - The phase
 */
constructor( colorType, noOfSources, k, omegaT ) {
        super( {
            side: THREE.DoubleSide,
            uniforms: { 
                colorType: { value: colorType },
                sourcePositions: { value: RainbowMaterial.createSourcePositions( noOfSources ) },
                sourceAmplitudes: { value: RainbowMaterial.createSourceAmplitudes( noOfSources ) },
                noOfSources: { value: noOfSources },
                k: { value: k },
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

                uniform int colorType;
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
                        // add to the sum of amplitudes 
                        amplitude += vec2(
                            sourceAmplitudes[i].x*c - sourceAmplitudes[i].y*s,	// real part = r1 r2 - i1 i2
                            sourceAmplitudes[i].x*s + sourceAmplitudes[i].y*c	// imaginary part = r1 i2 + r2 i1
                        )/d;
                    }

                    // plot the phase only
                    if(colorType == 0) {
                        float c = 0.5 + 0.5*cos(calculatePhase(amplitude));
                        gl_FragColor = vec4(c, c, c, 1.0);
                    } else if(colorType == 1) {
                        gl_FragColor = vec4(hsv2rgb(vec3(calculateHue(amplitude), 1.0, 1.0)), 1.0);
                    }
                }
            `
        } );
    }

    static createSourcePositions( noOfSources) {

        // create an array of sources
        let sourcePositions = [];

        // fill in the elements of all three arrays
        let i=0;
        let m=0;
        for(; i<noOfSources; i++) {
            let phi = 2.0*Math.PI*i/noOfSources;	// takes values between 0 and 2 pi
            sourcePositions.push(new THREE.Vector3(0.5*Math.cos(phi), 0.5*Math.sin(phi), 0));
        }
        for(; i<10; i++) {
            sourcePositions.push(new THREE.Vector3(0, 0, 0));
        }

        return sourcePositions;
    }

    static createSourceAmplitudes( noOfSources) {

        let sourceAmplitudes = [];	// (complex) amplitudes

        // fill in the elements of all three arrays
        let i=0;
        let m=0;
        for(; i<noOfSources; i++) {
            let phi = 2.0*Math.PI*i/noOfSources;	// azimuthal angle
            sourceAmplitudes.push(new THREE.Vector2(Math.cos(m*phi), Math.sin(m*phi)));
        }
        for(; i<10; i++) {
            sourceAmplitudes.push(new THREE.Vector2(1, 0));
        }

        return sourceAmplitudes;
    }

    updateOmegaT( omegaT ) {
        this.uniforms.omegaT.value = omegaT;
    }

}

export { RainbowMaterial };