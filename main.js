import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

var color = 0x000000;

// Create your main scene
var scene = new THREE.Scene();
scene.background = new THREE.Color( 0x0000ff );

// Create your main camera
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create lights
// var light = new THREE.PointLight(0xEEEEEE);
// light.position.set(20, 0, 20);
// scene.add(light);

var lightAmb = new THREE.AmbientLight(0x777777);
scene.add(lightAmb);

// Create your renderer
// var renderer = new THREE.WebGLRenderer();
var renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true }); renderer.autoClearColor = false;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

let controls = new OrbitControls( camera, renderer.domElement );

// Create a cube
var geometry = new THREE.BoxGeometry(1, 1, 1);
var material = new THREE.MeshLambertMaterial({
    color: 0xf0f0f0,
    // ambient: 0x121212,
    emissive: 0x121212
 });

var cube = new THREE.Mesh(geometry, material);
// scene.add(cube);

// Set up the main camera
camera.position.z = 5;

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

/** Convert an edges geometry to a set of cylinders w/ the given thickness. 
 * from https://stackoverflow.com/questions/44317902/how-to-render-edges-as-cylinders
*/
function edgesToCylinders(edgesGeometry, thickness) {
    const {position} = edgesGeometry.attributes;
    const {array, count} = position;
    const r = thickness / 2;
    const geoms = [];
    for (let i = 0; i < count * 3 - 1; i += 6) {
      const a = new THREE.Vector3(array[i], array[i + 1], array[i + 2]);
      const b = new THREE.Vector3(array[i + 3], array[i + 4], array[i + 5]);
  
      const vec = new THREE.Vector3().subVectors(b, a);
      const len = vec.length();
      const geom = new THREE.CylinderGeometry(r, r, len, 8);
      geom.translate(0, len / 2, 0);
      geom.rotateX(Math.PI / 2);
      geom.lookAt(vec);
      geom.translate(a.x, a.y, a.z);
      geoms.push(geom);
    }
    return BufferGeometryUtils.mergeGeometries(geoms);
  }

  var thickness = 0.015; // radius of a cylinder
  
  var geometry = new THREE.TorusKnotGeometry( 1.5, 0.5, 200, 16 );
  // var dodecahedronGeom = new THREE.DodecahedronGeometry(1);
  const edgesGeom = new THREE.EdgesGeometry(geometry);
const cylindersGeom = edgesToCylinders(edgesGeom, thickness);
const cylinders = new THREE.Mesh(
  cylindersGeom,
  new THREE.MeshLambertMaterial({color: "blue"})
);
scene.add(cylinders);

var lastDrawn = 0;
var omegaT = 0;
var omega = 2*2*Math.PI/1000;
var color = new THREE.Color(17, 17, 17);

cylinders.matrixAutoUpdate = false;
var matrix1, matrix2, matrix3;

var forwardMatrix = (new THREE.Matrix4()).makeRotationY(1*Math.PI/180);
var reverseMatrix = forwardMatrix.clone().invert();
matrix2 = cylinders.matrix.clone();
matrix1 = (new THREE.Matrix4()).multiplyMatrices(matrix2, reverseMatrix);
matrix3 = (new THREE.Matrix4()).multiplyMatrices(matrix2, forwardMatrix);

var phaseChangeForward = -0.2*2*Math.PI;

// Rendering function
var render = function () {
    
    // Update the color
    omegaT += omega*(Date.now() - lastDrawn);
	lastDrawn = Date.now();

    // Update the cube rotations
    // cylinders.rotation.x += 0.05;
    // cylinders.rotation.y += 0.02;

    renderer.clear();
    // renderer.render(backgroundScene , backgroundCamera );
    cylinders.material.color.set(color.clone().multiplyScalar(0.5 + 0.5*Math.cos(omegaT + phaseChangeForward)));
    cylinders.matrix.copy(matrix1);
    // scene.updateMatrixWorld();
    renderer.render(scene, camera);

    cylinders.material.color.set(color.clone().multiplyScalar(0.5 + 0.5*Math.cos(omegaT - phaseChangeForward)));
    cylinders.matrix.copy(matrix3);
    renderer.render(scene, camera);

    cylinders.material.color.set(color.clone().multiplyScalar(0.5 + 0.5*Math.cos(omegaT)));
    cylinders.matrix.copy(matrix2);
    renderer.render(scene, camera);

    requestAnimationFrame(render);
};

requestAnimationFrame(render);