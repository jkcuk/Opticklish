import * as THREE from 'three';
import { TeapotGeometry } from 'three/addons/geometries/TeapotGeometry.js';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
// import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { edgesToCylinders } from './util.js';
import { TimeVaryingPatternMaterial } from './timeVaryingPatternMaterial.js';
import { JApp, render } from './JApp.js';


class Opticklish extends JApp {
    // parameters
    omega = 2*2*Math.PI;
    wavenumber = 0;
    m = 0;
    // var color = { r: 1, g: 1, b: 1 };

    /**
     * rotationX: 0, rotationY: 1, rotationZ: 2, translationX: 3, translationY: 4, translationZ: 5, scaling: 6
     */
    movementType = 1;   // rotationX: 0, rotationY: 1, rotationZ: 2, translationX: 3, translationY: 4, translationZ: 5, scaling: 6
    movementSpeed = .5;

    /**
     * faces: 0, edges: 1
     */
    meshType = 1;   // faces: 0, edges: 1

    /**
     * 0: single color, 1: rainbow
     */
    colorType = 0;  // 0: single color, 1: rainbow 

    /**
     * 0: torusKnot, 1: dodecahedron, 2: sphere, 3: cube
     */
    geometryType = 0;   // 0: cube, 1: dodecahedron, 2: sphere, 3: torusKnot

    edgeThickness = 0.005; // radius of the cylinders

    // internal variables
    material;
    mesh;
    scene;
    matrix1;
    matrix2;
    matrix3;
    deltaAngleMax = 1*Math.PI/180;
    deltaShiftMax = 0.01;
    deltaScaleMax = 0.01;

    /**
	 * Represents a color material.
	 * @constructor
	 * @param {string} appName - The app's name
	 * @param {string} appDescription - The app's (brief) description
	 */
	constructor(  ) {
        super( 'Opticklish', 'the premier interactive tool for this one particular optickle illusion' );

        this.createRendererEtc();

        this.addGUI();
    }

    createRendererEtc() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = 
            new THREE.Color( 0x888888 );
            // new THREE.Color( 0x0000ff );

        // Create camera
        this.camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;

        // Create lights
        // var lightAmb = new THREE.AmbientLight(0x777777);
        // this.scene.add(lightAmb);

        // add the object
        this.reDefineMaterial();

        this.mesh = new THREE.Mesh( new THREE.TorusGeometry(), this.material );
        this.reDefineMesh();
        this.scene.add(this.mesh);

        this.mesh.matrixAutoUpdate = false;
        this.reCalculateMatrices();
    
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });    // preserveDrawingBuffer is so that we can render several times without clearing
        this.renderer.autoClearColor = false;    
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.autoClear = false; // for rendering several times without clearing
        document.body.appendChild(this.renderer.domElement);

        let controls = new OrbitControls( this.camera, this.renderer.domElement );
    }

    // add the scene objects

    reDefineMaterial() {
        this.material = new TimeVaryingPatternMaterial( this.colorType, 9, 5*2*Math.PI*this.wavenumber, this.m, 0 );
    }

    reDefineMesh() {
        var geometry;
        switch(this.geometryType) {
            case 0:
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 1:
                geometry = new THREE.DodecahedronGeometry(1);
                break;
            case 2:
                geometry = new THREE.SphereGeometry(0.5, 16, 16);
                break;
            case 3:
                geometry = new THREE.TorusKnotGeometry( 0.4, 0.1, 200, 16 );
                break;  
            case 4:
                geometry = new TeapotGeometry(0.5, 10, true, true, true, true, true);
                break;
            case 5:
                geometry = this.getMorphingFace();
                break;
            // for future: https://github.com/mrdoob/three.js/blob/master/examples/webgl_morphtargets_face.html
        }

        switch(this.meshType) {
            case 0:
                this.mesh.geometry = geometry;
                break;
            case 1:
                this.mesh.geometry = edgesToCylinders( new THREE.EdgesGeometry(geometry), this.edgeThickness );
                break;
        }
    }

    // calculate the matrices

    reCalculateMatrices() {
        var forwardMatrix = new THREE.Matrix4();
        switch( this.movementType ) {
            case 0: // rotationX
            forwardMatrix.makeRotationX( this.movementSpeed*this.deltaAngleMax );
            break;
            case 1: // rotationY
            forwardMatrix.makeRotationY( this.movementSpeed*this.deltaAngleMax );
            break;
            case 2: // rotationZ
            forwardMatrix.makeRotationZ( this.movementSpeed*this.deltaAngleMax );
            break;
            case 3: // translationX
            forwardMatrix.makeTranslation(this.movementSpeed*this.deltaShiftMax, 0, 0);
            break;
            case 4: // translationY
            forwardMatrix.makeTranslation(0, this.movementSpeed*this.deltaShiftMax, 0);
            break;
            case 5: // translationZ
            forwardMatrix.makeTranslation(0, 0, this.movementSpeed*this.deltaShiftMax);
            break;
            case 6: // scaling
            let scale = 1 + this.movementSpeed*this.deltaScaleMax;
            forwardMatrix.makeScale(scale, scale, scale);
            break;
        }

        var backwardMatrix = forwardMatrix.clone().invert();
        this.matrix2 = this.mesh.matrix.clone();
        this.matrix1 = (new THREE.Matrix4()).multiplyMatrices(this.matrix2, forwardMatrix);
        this.matrix3 = (new THREE.Matrix4()).multiplyMatrices(this.matrix2, backwardMatrix);
    }

    // Rendering function

    clock = new THREE.Clock();
    omegaT = 0;
    phaseChangeForward = -0.2*2*Math.PI;

    render() {
        // calculate omega*t
        this.omegaT += this.omega*this.clock.getDelta();    // (now - this.lastDrawn);

        // if(!this.showingStoredPhoto) {
            this.renderer.clear();

            // render three copies at different phases
            
            this.material.uniforms.omegaT.value = this.omegaT + this.phaseChangeForward;
            this.mesh.matrix.copy(this.matrix1);
            this.renderer.render(this.scene, this.camera);

            this.material.uniforms.omegaT.value = this.omegaT - this.phaseChangeForward;
            this.mesh.matrix.copy(this.matrix3);
            this.renderer.render(this.scene, this.camera);

            this.material.uniforms.omegaT.value = this.omegaT;
            this.mesh.matrix.copy(this.matrix2);
            this.renderer.render(this.scene, this.camera);
        // }

        return !this.showingStoredPhoto;
    };

    // gui

    guiVariables = {
        frequency: this.omega/2/Math.PI,
        wavenumber: this.wavenumber,
        m: this.m,
        movementType: this.movementType,
        movementSpeed: this.movementSpeed,
        meshType: this.meshType,   // faces: 0, edges: 1
        colorType: this.colorType,  // 1: rainbow, 0: single color
        geometryType: this.geometryType, // 0: torusKnot, 1: dodecahedron
        edgeThickness: this.edgeThickness,
    };
    
    addGUI() {
        this.gui = new GUI();

        this.gui.add( this.guiVariables, 'frequency', -4, 4 )
            .name( 'frequency (Hz)' )
            .onChange( f => { 
                this.omega = 2*Math.PI*f; 
        } );

        this.gui.add( this.guiVariables, 'wavenumber', 0, 1 )
            .name( 'spottiness' )
            .onChange( k => {
                this.wavenumber = k;
                this.mesh.material.uniforms.k.value = 5*2*Math.PI*this.wavenumber;
        } );

        this.gui.add( this.guiVariables, 'm', -4, 4, 1 )
            .name( 'azimuthal index' )
            .onChange( m => {
                this.m = m;
                this.reDefineMaterial();
                this.mesh.material = this.material;
        } );


        this.gui.add( this.guiVariables, 'movementType', { 'x rotation': 0, 'y rotation': 1, 'z rotation': 2, 'x translation': 3, 'y translation': 4, 'z translation': 5, scaling: 6 } )
            .name( 'movement' )
            .onChange( t => {
                this.movementType = t;
                this.reCalculateMatrices();
        } );

        this.gui.add( this.guiVariables, 'movementSpeed', -1, 1 )
            .name( 'relative speed' )
            .onChange( a => { 
                this.movementSpeed = a;
                this.reCalculateMatrices();
        } );

        this.gui.add( this.guiVariables, 'meshType', { 'faces': 0, 'edges': 1 } )
            .name( 'show' )
            .onChange( t => {
                this.meshType = t;
                this.reDefineMesh();
        } );

        this.gui.add( this.guiVariables, 'colorType', { 'single color': 0, 'rainbow': 1 } )
            .name( 'colors' )
            .onChange( t => {
                this.colorType = t;
                this.reDefineMaterial();
                this.mesh.material = this.material;
        } );

        this.gui.add( this.guiVariables, 'geometryType', { 
            'cube': 0, 
            'dodecahedron': 1, 
            'sphere': 2, 
            'torus knot': 3, 
            'teapot': 4, 
            // 'face': 5 
        } )
            .name( 'geometry' )
            .onChange( t => {
                this.geometryType = t;
                this.reDefineMesh();
        } );

        this.gui.add( this.guiVariables, 'edgeThickness', 0.001, 0.02 )
            .name( 'edge thickness' )
            .onChange( t => {
                this.edgeThickness = t;
                this.reDefineMesh();
        } );
    }

    getInfoString() {
		return '' +
            `<center><img src="./assets/logo.png" alt="Logo"></center>\n` +
			// `<h4>${this.appName}</h4>\n` +
			`<b>${this.appName}</b> is ${this.appDescription}`
			;
	}

    // getMorphingFace() {
    //     // from https://github.com/mrdoob/three.js/blob/master/examples/webgl_morphtargets_face.html
    //     const ktx2Loader = new KTX2Loader()
    //         .setTranscoderPath( 'jsm/libs/basis/' )
    //         .detectSupport( this.renderer );

    //     new GLTFLoader()
    //         .setKTX2Loader( ktx2Loader )
    //         .setMeshoptDecoder( MeshoptDecoder )
    //         .load( 'https://github.com/mrdoob/three.js/blob/master/examples/models/gltf/facecap.glb', ( gltf ) => {

    //             const faceMesh = gltf.scene.children[ 0 ];

    //             // scene.add( mesh );

    //             mixer = new THREE.AnimationMixer( faceMesh );

    //             mixer.clipAction( gltf.animations[ 0 ] ).play();

    //             // GUI

    //             const head = faceMesh.getObjectByName( 'mesh_2' );
    //             const influences = head.morphTargetInfluences;

    //             const gui = new GUI();
    //             gui.close();

    //             for ( const [ key, value ] of Object.entries( head.morphTargetDictionary ) ) {

    //                 gui.add( influences, value, 0, 1, 0.01 )
    //                     .name( key.replace( 'blendShape1.', '' ) )
    //                     .listen();

    //             }

    //             return faceMesh.geometry;
    //         } );

    //     // const environment = new RoomEnvironment();
    //     // const pmremGenerator = new THREE.PMREMGenerator( this.renderer );

    //     // this.scene.background = new THREE.Color( 0x666666 );
    //     // this.scene.environment = pmremGenerator.fromScene( environment ).texture;
    // }
}

new Opticklish();

requestAnimationFrame( render );
