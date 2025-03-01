import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { edgesToCylinders } from './util.js';
import { RainbowMaterial } from './rainbowMaterial.js';


// parameters
var omega = 2*2*Math.PI/1000;
var color = { r: 1, g: 1, b: 1 };

/**
 * rotationX: 0, rotationY: 1, rotationZ: 2, translationX: 3, translationY: 4, translationZ: 5, scaling: 6
 */
var movementType = 1;   // rotationX: 0, rotationY: 1, rotationZ: 2, translationX: 3, translationY: 4, translationZ: 5, scaling: 6
var movementSpeed = 1;

/**
 * faces: 0, edges: 1
 */
var meshType = 1;   // faces: 0, edges: 1

/**
 * 0: single color, 1: rainbow
 */
var colorType = 0;  // 0: single color, 1: rainbow 

/**
 * 0: torusKnot, 1: dodecahedron, 2: sphere, 3: cube
 */
var geometryType = 0;   // 0: torusKnot, 1: dodecahedron, 2: sphere, 3: cube

var edgeThickness = 0.005; // radius of the cylinders

// Create scene
var scene = new THREE.Scene();
scene.background = 
    new THREE.Color( 0x888888 );
    // new THREE.Color( 0x0000ff );

// Create camera
var camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Create lights
var lightAmb = new THREE.AmbientLight(0x777777);
scene.add(lightAmb);

// Create renderer
var renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });    // preserveDrawingBuffer is so that we can render several times without clearing
renderer.autoClearColor = false;    
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false; // for rendering several times without clearing
document.body.appendChild(renderer.domElement);

let controls = new OrbitControls( camera, renderer.domElement );

// add the scene objects

var material;
function reDefineMaterial() {
    switch(colorType) {
        case 0:
            material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
            break;
        case 1:
            material = new RainbowMaterial( 1, 1*2*Math.PI, .1 );
            break;
    }
    // new THREE.MeshLambertMaterial({
    //     color: 0xf0f0f0,
    //     // ambient: 0x121212,
    //     emissive: 0xf121212
    // });
}
reDefineMaterial();

var mesh = new THREE.Mesh( new THREE.TorusGeometry(), material );
function reDefineMesh() {
    var geometry;
    switch(geometryType) {
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

    switch(meshType) {
        case 0:
            mesh.geometry = geometry;
            break;
        case 1:
            mesh.geometry = edgesToCylinders( new THREE.EdgesGeometry(geometry), edgeThickness );
            break;
    }
}
reDefineMesh();
scene.add(mesh);

// calculate the matrices

var matrix1, matrix2, matrix3;
var deltaAngleMax = 1*Math.PI/180;
var deltaShiftMax = 0.01;
var deltaScaleMax = 0.01;
function reCalculateMatrices() {
    var forwardMatrix = new THREE.Matrix4();
    switch( movementType ) {
        case 0: // rotationX
        forwardMatrix.makeRotationX( movementSpeed*deltaAngleMax );
        break;
        case 1: // rotationY
        forwardMatrix.makeRotationY( movementSpeed*deltaAngleMax );
        break;
        case 2: // rotationZ
        forwardMatrix.makeRotationZ( movementSpeed*deltaAngleMax );
        break;
        case 3: // translationX
        forwardMatrix.makeTranslation(movementSpeed*deltaShiftMax, 0, 0);
        break;
        case 4: // translationY
        forwardMatrix.makeTranslation(0, movementSpeed*deltaShiftMax, 0);
        break;
        case 5: // translationZ
        forwardMatrix.makeTranslation(0, 0, movementSpeed*deltaShiftMax);
        break;
        case 6: // scaling
        let scale = 1 + movementSpeed*deltaScaleMax;
        forwardMatrix.makeScale(scale, scale, scale);
        break;
    }

    var backwardMatrix = forwardMatrix.clone().invert();
    matrix2 = mesh.matrix.clone();
    matrix1 = (new THREE.Matrix4()).multiplyMatrices(matrix2, forwardMatrix);
    matrix3 = (new THREE.Matrix4()).multiplyMatrices(matrix2, backwardMatrix);
}
mesh.matrixAutoUpdate = false;
reCalculateMatrices();

// Rendering function

var lastDrawn = Date.now();
var omegaT = 0;
var phaseChangeForward = -0.2*2*Math.PI;

var render = function () {
    // calculate omega*t
    let now = Date.now();
    omegaT += omega*(now - lastDrawn);
	lastDrawn = now;

    renderer.clear();

    let f;
    switch(colorType) {
        case 0:
            f = 0.5 + 0.5*Math.cos(omegaT + phaseChangeForward);
            material.color.setRGB( color.r*f, color.g*f, color.b*f );
            break;
        case 1:
            material.uniforms.omegaT.value = omegaT + phaseChangeForward;
            break;
        }
    mesh.matrix.copy(matrix1);
    renderer.render(scene, camera);

    switch(colorType) {
        case 0:
            f = 0.5 + 0.5*Math.cos(omegaT - phaseChangeForward);
            material.color.setRGB( color.r*f, color.g*f, color.b*f );
            break;
        case 1:
            material.uniforms.omegaT.value = omegaT - phaseChangeForward;
            break;
    }
    mesh.matrix.copy(matrix3);
    renderer.render(scene, camera);

    switch(colorType) {
        case 0:
            f = 0.5 + 0.5*Math.cos(omegaT);
            material.color.setRGB( color.r*f, color.g*f, color.b*f );
            break;
        case 1:
            material.uniforms.omegaT.value = omegaT;
            break;
    }
    mesh.matrix.copy(matrix2);
    renderer.render(scene, camera);

    requestAnimationFrame( render );
};

requestAnimationFrame( render );

// gui

const guiVariables = {
	frequency: omega*1000/2/Math.PI,
	movementType: movementType,
    movementSpeed: movementSpeed,
    meshType: meshType,   // faces: 0, edges: 1
    colorType: colorType,  // 1: rainbow, 0: single color
    geometryType: geometryType, // 0: torusKnot, 1: dodecahedron
    edgeThickness: edgeThickness,
};
	
const gui = new GUI();

gui.add( guiVariables, 'frequency', -4, 4 )
	.name( 'frequency (Hz)' )
	.onChange( f => { 
        omega = 2*Math.PI*f/1000; 
} );

gui.add( guiVariables, 'movementType', { 'x rotation': 0, 'y rotation': 1, 'z rotation': 2, 'x translation': 3, 'y translation': 4, 'z translation': 5, scaling: 6 } )
	.name( 'movement' )
    .onChange( t => {
	    movementType = t;
	    reCalculateMatrices();
} );

gui.add( guiVariables, 'movementSpeed', -1, 1 )
	.name( 'relative speed' )
	.onChange( a => { 
        movementSpeed = a;
        reCalculateMatrices();
} );

gui.add( guiVariables, 'meshType', { 'faces': 0, 'edges': 1 } )
	.name( 'show' )
    .onChange( t => {
	    meshType = t;
        reDefineMesh();
} );

gui.add( guiVariables, 'colorType', { 'single color': 0, 'rainbow': 1 } )
	.name( 'colors' )
    .onChange( t => {
	    colorType = t;
        reDefineMaterial();
        mesh.material = material;
} );

gui.add( guiVariables, 'geometryType', { 'torus knot': 0, 'dodecahedron': 1, 'sphere': 2, 'cube': 3 } )
    .name( 'geometry' )
    .onChange( t => {
        geometryType = t;
        reDefineMesh();
} );

gui.add( guiVariables, 'edgeThickness', 0.001, 0.02 )
    .name( 'edge thickness' )
    .onChange( t => {
        edgeThickness = t;
        reDefineMesh();
} );


// window resizing

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
	// in case the screen size has changed
	if(renderer) renderer.setSize(window.innerWidth, window.innerHeight);

	// if the screen orientation changes, width and height swap places, so the aspect ratio changes
	let windowAspectRatio = window.innerWidth / window.innerHeight;
	camera.aspect = windowAspectRatio;

    // make sure the camera changes take effect
	camera.updateProjectionMatrix();
}