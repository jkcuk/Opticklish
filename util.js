import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';


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

export { edgesToCylinders };