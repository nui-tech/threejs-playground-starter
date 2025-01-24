import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

export async function init(container: HTMLElement) {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth , window.innerHeight);
  container.appendChild(renderer.domElement);

  // load GLTF modal and add to scene
  const loader = new GLTFLoader();
  const model =  await loader.loadAsync(
    `./assets/models/Turbine-853ft.gltf`
  );

  scene.add(model.scene);

  // Add ambient light in Three.js
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);



  camera.position.z = 5;
  camera.position.x = 1;

  function animate() {
    requestAnimationFrame( animate );

  
    renderer.render( scene, camera );
  }
  
  animate();
}
