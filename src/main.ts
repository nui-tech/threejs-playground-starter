import "./style.css";

import CameraControls from "camera-controls";
import * as THREE from "three";
// @ts-ignore
import Stats from "three/addons/libs/stats.module.js";
// @ts-ignore
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

CameraControls.install({ THREE: THREE });

interface JSONData {
  X: number;
  Y: number;
  Z: number;
  L: number;
}

import * as JsonData from "../data/ERI Full Below Seismic BR_blockModel_Pivoted.min.json";
import * as JsonData2 from "../data/ERI High Below Seismic BR_blockModel_Pivoted.min.json";
import * as JsonData3 from "../data/ERI Low Below Seismic BR_blockModel_Pivoted.min.json";
import * as JsonData4 from "../data/ERI_Transect_Point_Pivoted.min.json";
import * as JsonData5 from "../data/MASW_Full_Pivoted.min.json";
const data = (JsonData as { default: JSONData[] }).default;
const data2 = (JsonData2 as { default: JSONData[] }).default;
const data3 = (JsonData3 as { default: JSONData[] }).default;
const data4 = (JsonData4 as { default: JSONData[] }).default;
const data5 = (JsonData5 as { default: JSONData[] }).default;

const width = window.innerWidth;
const height = window.innerHeight;
const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 7000);
camera.position.set(0, 0, 0);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

const cameraControls = new CameraControls(camera, renderer.domElement);
cameraControls.mouseButtons.right = CameraControls.ACTION.OFFSET;
cameraControls.dollyTo(1000);

// add atmosphere light
const light = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(light);

const box = new THREE.Mesh(
  new THREE.BoxGeometry(),
  new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    opacity: 0.8,
    transparent: true,
    side: THREE.DoubleSide,
  })
);
scene.add(box);

renderer.render(scene, camera);

/**
 *
 * **************  Debugger ******************
 *
 * */
const stats = Stats();
const guiStatsEl = document.createElement("div");
const sliderContainer = document.createElement("div");

function addDebugger() {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  scene.add(sphere);

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  const gridHelper = new THREE.GridHelper(5000, 100);
  scene.add(gridHelper);

  document.body.appendChild(stats.dom);

  guiStatsEl.style.position = "absolute";
  guiStatsEl.style.top = "0";
  guiStatsEl.style.right = "50px";

  
  sliderContainer.id = "sliderContainer";
  sliderContainer.style.position = "absolute";
  sliderContainer.style.top = "250px";
  sliderContainer.style.display = "flex";
  sliderContainer.style.flexDirection = "column";
  document.body.appendChild(sliderContainer);
}

function getGeometryByteLength(geometry: any) {
  let total = 0;

  if (geometry.index) total += geometry.index.array.byteLength;

  for (const name in geometry.attributes) {
    total += geometry.attributes[name].array.byteLength;
  }

  return total;
}

function formatBytes(bytes: any, decimals: any) {
  if (bytes === 0) return "0 bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["bytes", "KB", "MB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 *
 * **************  Experiment code goes here ******************
 *
 * */

const Y_OFFSET = 750;
const X_ROTATION_OFFSET = 270;
const OPACITY = 0.1;

function initInstancedMesh(
  name: string,
  myData: JSONData[] = [],
  color: string = "red",
  opacity: number = OPACITY
) {
  // return if scene already has the mesh with the same name
  if (scene.children.find((child) => child.name === name)) {
    console.log("nlog: mesh already exists");
    return;
  }

  const matrix = new THREE.Matrix4();

  const geometry = new THREE.SphereGeometry(1, 4, 4);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    opacity: opacity,
    transparent: true,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, myData.length);

  for (let i = 0; i < myData.length; i++) {
    matrix.setPosition(myData[i].X, myData[i].Y, myData[i].Z - Y_OFFSET);
    mesh.setMatrixAt(i, matrix);
  }

  // rotate the mesh 240 degrees
  mesh.rotation.x = THREE.MathUtils.degToRad(X_ROTATION_OFFSET);
  mesh.name = name;

  scene.add(mesh);

  console.log("nlog: add instancedMesh", scene.children);

  renderer.render(scene, camera);

  const geometryByteLength = getGeometryByteLength(geometry);
  guiStatsEl.innerHTML = [
    "<i>GPU draw calls</i>: " + myData.length,
    "<i>GPU memory</i>: " +
      formatBytes(myData.length * 16 + geometryByteLength, 2),
  ].join("<br/>");
}

function sbSolution() {
  // 1. Create geometry: Just a single point for each instance
  const geometry = new THREE.InstancedBufferGeometry();
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

  // 3. Create InstancedBufferGeometry for the instances
  const instancedGeometry = new THREE.InstancedBufferGeometry();
  instancedGeometry.copy(geometry); // Copy basic geometry to instanced geometry

  // 4. Create random positions and colors for each instance (for millions of points)
  const numInstances = data.length;
  const positions = new Float32Array(numInstances * 3); // 3 coords per point
  const colors = new Float32Array(numInstances * 3); // RGB per point

  for (let i = 0; i < data.length; i++) {
    // Position from data
    positions[i * 3] = data[i].X;
    positions[i * 3 + 1] = data[i].Y;
    positions[i * 3 + 2] = data[i].Z;

    // red color
    colors[i * 3] = 1;
    colors[i * 3 + 1] = 0;
    colors[i * 3 + 2] = 0;
  }

  // Add positions and colors to InstancedBufferGeometry
  instancedGeometry.setAttribute(
    "instancePosition",
    new THREE.InstancedBufferAttribute(positions, 3)
  );
  instancedGeometry.setAttribute(
    "instanceColor",
    new THREE.InstancedBufferAttribute(colors, 3)
  );

  // 5. Create InstancedMesh with the geometry and material
  const instancedMesh = new THREE.InstancedMesh(
    instancedGeometry,
    material,
    numInstances
  );
  scene.add(instancedMesh);

  console.log("nlog: added");
}

function loadGltf() {
  const MODEL_SCALE = 1;
  const y_offset = -225;
  const loader = new GLTFLoader();
  loader.load(
    "../public/terrains/All.gltf",
    (gltf) => {
      gltf.scene.position.set(0, y_offset, 0);
      gltf.scene.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
      scene.add(gltf.scene);
      renderer.render(scene, camera);
      console.log("nlog: loaded gltf");
    },
    undefined,
    (error) => {
      console.error(error);
    }
  );

  loader.load(
    "../public/terrains/Cones and text.gltf",
    (gltf) => {
      gltf.scene.position.set(0, y_offset, 0);
      gltf.scene.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
      scene.add(gltf.scene);
      renderer.render(scene, camera);
      console.log("nlog: loaded gltf");
    },
    undefined,
    (error) => {
      console.error(error);
    }
  );
}

function addButtons() {
  const buttonContainer = document.createElement("div");
  buttonContainer.style.position = "absolute";
  buttonContainer.style.top = "70px";
  buttonContainer.style.display = "flex";
  buttonContainer.style.flexDirection = "column";
  document.body.appendChild(buttonContainer);

  const button1 = document.createElement("button");
  button1.innerHTML =
    "BLUE - ERI Full Below Seismic BR_blockModel_Pivoted.min.json";
  button1.onclick = () => {
    initInstancedMesh("mesh1", data, "blue");
  };

  const button2 = document.createElement("button");
  button2.innerHTML =
    "GREEN - ERI High Below Seismic BR_blockModel_Pivoted.min.json";
  button2.onclick = () => {
    initInstancedMesh("mesh2", data2, "green");
  };
  addSliders("mesh2");

  const button3 = document.createElement("button");
  button3.innerHTML =
    "YELLOW - ERI Low Below Seismic BR_blockModel_Pivoted.min.json";
  button3.onclick = () => {
    initInstancedMesh("mesh3", data3, "yellow");
  };
  addSliders("mesh3");

  const button4 = document.createElement("button");
  button4.innerHTML = "ORANGE - ERI_Transect_Point_Pivoted.min.json";
  button4.onclick = () => {
    initInstancedMesh("mesh4", data4, "orange");
  };
  addSliders("mesh4");

  const button5 = document.createElement("button");
  button5.innerHTML = "PURPLE - MASW_Full_Pivoted.min.json";
  button5.onclick = () => {
    initInstancedMesh("mesh5", data5, "purple");
  };

  const clearButton = document.createElement("button");
  clearButton.innerHTML = "Clear";
  clearButton.onclick = () => {
    // remove all instancedMesh in the scene
    scene.children = scene.children.filter(
      (child) => !(child instanceof THREE.InstancedMesh)
    );
    renderer.render(scene, camera);
    console.log(scene.children);
  };

  buttonContainer.appendChild(button1);
  buttonContainer.appendChild(addSliders("mesh1"));
  buttonContainer.appendChild(button2);
  buttonContainer.appendChild(addSliders("mesh2"));
  buttonContainer.appendChild(button3);
  buttonContainer.appendChild(addSliders("mesh3"));
  buttonContainer.appendChild(button4);
  buttonContainer.appendChild(addSliders("mesh4"));
  buttonContainer.appendChild(button5);
  buttonContainer.appendChild(addSliders("mesh5"));
  buttonContainer.appendChild(clearButton);
  const totalPoints = document.createElement("div");
  totalPoints.innerText = `Total Points: ${
    data.length + data2.length + data3.length + data4.length + data5.length
  }`;
  buttonContainer.appendChild(totalPoints);
}

function addSliders(meshName: string) {
  // five sliders to change the opacity of the meshes

  const slider = document.createElement("input");
  slider.id = "slider_"+meshName;
  slider.type = "range";
  slider.min = "0";
  slider.max = "1";
  slider.step = "0.01";
  slider.value = ''+OPACITY;
  slider.oninput = (e) => {
    const opacity = e.target.value;
    const mesh = scene.children.find((child) => child.name === meshName);
    if (mesh) {
      (mesh as THREE.InstancedMesh).material.opacity = Number(opacity);
      (mesh as THREE.InstancedMesh).material.transparent = true;
      renderer.render(scene, camera);
    }
  };
  return slider;
}

function preAddInstancedMesh() {
  initInstancedMesh("mesh1", data, "blue");
  initInstancedMesh("mesh2", data2, "green");
  initInstancedMesh("mesh3", data3, "yellow");
  initInstancedMesh("mesh4", data4, "orange");
  initInstancedMesh("mesh5", data5, "purple");
}


addButtons();
addDebugger();
loadGltf();
preAddInstancedMesh();
// sbSolution();



/**
 *
 * **************  Animation ******************
 *
 * */
(function anim() {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  const updated = cameraControls.update(delta);

  requestAnimationFrame(anim);
  updated && renderer.render(scene, camera);
  stats.update();
})();
