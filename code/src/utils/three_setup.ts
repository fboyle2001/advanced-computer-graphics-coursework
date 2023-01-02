import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import Stats from 'three/examples/jsm/libs/stats.module';

// Anti-aliasing is applied by post-processing instead
const renderer = new THREE.WebGLRenderer({ powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Initialise stats
const stats = Stats();
document.body.appendChild(stats.dom);

const scene = new THREE.Scene();

const light = new THREE.AmbientLight(0xFFFFFF, 1);
scene.add(light);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.x = -8
camera.position.y = 5;
camera.position.z = 0;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Load the skybox
const skyboxLoader = new THREE.TextureLoader();
const texture = skyboxLoader.load(
    "/textures/skybox.png", () => {
        const skybox = new THREE.WebGLCubeRenderTarget(texture.image.height);
        skybox.fromEquirectangularTexture(renderer, texture);
        scene.background = skybox.texture;
    }
);

// Respond to resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
}, false);

// More precise, low-level stats for debugging
const updateStatsDisplay = () => {
    if(document.getElementById("polygon_count") !== null) {
        (document.getElementById("polygon_count") as HTMLElement).innerHTML = `${renderer.info.render.triangles}`;
    }

    if(document.getElementById("texture_count") !== null) {
        (document.getElementById("texture_count") as HTMLElement).innerHTML = `${renderer.info.memory.textures}`;
    }

    if(document.getElementById("geometry_count") !== null) {
        (document.getElementById("geometry_count") as HTMLElement).innerHTML = `${renderer.info.memory.geometries}`;
    }

    if(document.getElementById("calls_count") !== null) {
        (document.getElementById("calls_count") as HTMLElement).innerHTML = `${renderer.info.render.calls}`;
    }
}

export { renderer, scene, camera, controls, stats, updateStatsDisplay };