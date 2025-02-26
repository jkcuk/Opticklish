import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { edgesToCylinders } from './util.js';


// parameters
var omega = 2*2*Math.PI/1000;
var color = { r: 1, g: 1, b: 1 };
var movementType = 1;   // rotationX: 0, rotationY: 1, rotationZ: 2, translationX: 3, translationY: 4, translationZ: 5, scaling: 6
var movementSpeed = 1;

// Create scene
var scene = new THREE.Scene();
scene.background = new THREE.Color( 0x0000ff );

// Create camera
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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

// I can't work out how to use the MeshBasicMaterial
var material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
new THREE.MeshLambertMaterial({
    color: 0xf0f0f0,
    // ambient: 0x121212,
    emissive: 0xf121212
 });

var thickness = 0.015; // radius of the cylinders
  
var geometry = new THREE.TorusKnotGeometry( 1.5, 0.5, 200, 16 );
// var dodecahedronGeom = new THREE.DodecahedronGeometry(1);
const cylinders = new THREE.Mesh(
    edgesToCylinders( new THREE.EdgesGeometry(geometry), thickness ),
    material
);
scene.add(cylinders);

// calculate the matrices

var matrix1, matrix2, matrix3;
var deltaAngleMax = 1*Math.PI/180;
var deltaShiftMax = 0.025;
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
    matrix2 = cylinders.matrix.clone();
    matrix1 = (new THREE.Matrix4()).multiplyMatrices(matrix2, forwardMatrix);
    matrix3 = (new THREE.Matrix4()).multiplyMatrices(matrix2, backwardMatrix);
}
cylinders.matrixAutoUpdate = false;
reCalculateMatrices();

// Rendering function

var lastDrawn = 0;
var omegaT = 0;
var phaseChangeForward = -0.2*2*Math.PI;

var render = function () {
    // calculate omega*t
    let now = Date.now();
    omegaT += omega*(now - lastDrawn);
	lastDrawn = now;

    renderer.clear();

    let f;
    f = 0.5 + 0.5*Math.cos(omegaT + phaseChangeForward);
    cylinders.material.color.setRGB( color.r*f, color.g*f, color.b*f );
    cylinders.matrix.copy(matrix1);
    renderer.render(scene, camera);

    f = 0.5 + 0.5*Math.cos(omegaT - phaseChangeForward);
    cylinders.material.color.setRGB( color.r*f, color.g*f, color.b*f );
    cylinders.matrix.copy(matrix3);
    renderer.render(scene, camera);

    f = 0.5 + 0.5*Math.cos(omegaT);
    cylinders.material.color.setRGB( color.r*f, color.g*f, color.b*f );
    cylinders.matrix.copy(matrix2);
    renderer.render(scene, camera);

    requestAnimationFrame( render );
};

requestAnimationFrame( render );

// gui

const guiVariables = {
	frequency: omega*1000/2/Math.PI,
	movementType: movementType,
    movementSpeed: movementSpeed,
};
	
const gui = new GUI();

gui.add( guiVariables, 'frequency', 1, 4 )
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