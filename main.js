import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { edgesToCylinders } from './util.js';
import { TimeVaryingPatternMaterial } from './timeVaryingPatternMaterial.js';
import { JApp, render } from './JApp.js';


class Opticklish extends JApp {
    // parameters
    omega = 2*2*Math.PI/1000;
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
    geometryType = 3;   // 0: torusKnot, 1: dodecahedron, 2: sphere, 3: cube

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
        super( 'Opticklish', 'the premier tool for optickle illusions' );

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
                geometry = new THREE.TorusKnotGeometry( 0.7, 0.2, 200, 16 );
                break;
            case 1:
                geometry = new THREE.DodecahedronGeometry(1);
                break;
            case 2:
                geometry = new THREE.SphereGeometry(1, 32, 32);
                break;
            case 3:
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;  
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

    lastDrawn = Date.now();
    omegaT = 0;
    phaseChangeForward = -0.2*2*Math.PI;

    render() {
        // calculate omega*t
        let now = Date.now();
        this.omegaT += this.omega*(now - this.lastDrawn);
        this.lastDrawn = now;

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
        frequency: this.omega*1000/2/Math.PI,
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
                this.omega = 2*Math.PI*f/1000; 
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

        this.gui.add( this.guiVariables, 'geometryType', { 'torus knot': 0, 'dodecahedron': 1, 'sphere': 2, 'cube': 3 } )
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
}

new Opticklish();

requestAnimationFrame( render );
