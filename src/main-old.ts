import "./style.css";

import CameraControls from "camera-controls";
import * as THREE from "three";
// import Stats from "three/examples/jsm/libs/stats.module";

// import * as jsondata from "./point-data.min.json";
import * as jsondata from "./ERI Full Below Seismic BR_blockModel_Pivoted.min.json";
CameraControls.install({ THREE: THREE });

// expample of loading an image
// import typescriptLogo from './typescript.svg'

// import { init } from './engine.ts'

// const app = document.getElementById('app');
// if(app) {
//   init(app)
// }
// const app2 = document.getElementById('app2');
// if(app2) {
//   init(app2)
// }
// const app3 = document.getElementById('app3');
// if(app3) {
//   init(app3)
// }

// interface JSONData {
//   POINT_X: number;
//   POINT_Y: number;
//   Z_ft: number;
//   Res_Ohmm_: number;
//   logREs: number;
//   Line: string;
// }
interface JSONData {
  X: number;
  Y: number;
  Z: number;
  L: number;
}

let container: HTMLElement | null;
// let stats;

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;

let points: THREE.Points;
console.log(jsondata.default)
// cut array to 1000
let data = jsondata.default.slice(0, 1000) as JSONData[];
// let data = jsondata.default as JSONData[];
let cameraControls: CameraControls;
const clock = new THREE.Clock();


  // 1. Create geometry: Just a single point for each instance
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([0, 0, 0]); // A single point (vertex)
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

  // 2. Create the material with shaders that can read the color from the attribute
  const material = new THREE.ShaderMaterial({
    vertexShader: `
    attribute vec3 instanceColor;
    varying vec3 vColor;
    void main() {
      vColor = instanceColor;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    varying vec3 vColor;
    void main() {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `,
    side: THREE.DoubleSide,
  });

init();
animate();

function init() {
  container = document.getElementById("app");

  if (container === null) return;

  camera = new THREE.PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    5,
    7000
  );

  cameraControls = new CameraControls(camera, container);
  cameraControls.setPosition(0, 0, 2500);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x444444);

  // const particles = 500000;
  // 3. Create InstancedBufferGeometry for the instances
  const instancedGeometry = new THREE.InstancedBufferGeometry();
  instancedGeometry.copy(geometry); // Copy basic geometry to instanced geometry

  const positions = [];
  const colors = [];

  const color = new THREE.Color();

  const n = 1000,
    n2 = n / 2; // particles spread in the cube

  for (let i = 0; i < data.length; i++) {
    // positions

    const x = data[i].X;
    const y = data[i].Y;
    const z = data[i].Z;
    // const x = data[i].POINT_X;
    // const y = data[i].POINT_Y;
    // const z = data[i].Z_ft;

    // console.log(x, y, z);
    positions.push(x, y, z);
    // colors

    const vx = x / n + 0.5;
    const vy = y / n + 0.5;
    const vz = z / n + 0.5;

    color.setRGB(vx, vy, vz, THREE.SRGBColorSpace);

    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  geometry.computeBoundingSphere();

  //

  const material = new THREE.PointsMaterial({ size: 10, vertexColors: true });

  points = new THREE.Points(geometry, material);
  scene.add(points);

  // set cameraControl target to center of points
  const boundingSphere = geometry.boundingSphere;
  if (boundingSphere) {
    // cameraControls.setTarget(
    //   boundingSphere.center.x,
    //   boundingSphere.center.y,
    //   boundingSphere.center.z
    // );
    // cameraControls.lookInDirectionOf(
    //   boundingSphere.center.x,
    //   boundingSphere.center.y,
    //   boundingSphere.center.z
    // );
    cameraControls.setPosition(0, 0, 2500);
  }

  cameraControls.rotatePolarTo(250 * THREE.MathUtils.DEG2RAD, false);
  cameraControls.rotateAzimuthTo(90 * THREE.MathUtils.DEG2RAD, false);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);

  container.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  if (!points) return;
  if (!renderer) return;

  // snip
  const delta = clock.getDelta();
  const hasControlsUpdated = cameraControls.update(delta);

  // points.rotation.x = time * 0.25;
  // points.rotation.y = time * 0.5;

  requestAnimationFrame(animate);

  if (hasControlsUpdated) {
    renderer.render(scene, camera);
  }

  // stats.update();
}
