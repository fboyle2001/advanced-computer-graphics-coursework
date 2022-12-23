import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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

camera.position.y = 5;
camera.position.z = 2;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const skyboxLoader = new THREE.TextureLoader();
const texture = skyboxLoader.load(
    "/textures/skybox.png", () => {
        const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
        rt.fromEquirectangularTexture(renderer, texture);
        scene.background = rt.texture;
    }
);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
}, false);

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
}

const animate = () => {
    requestAnimationFrame(animate)
    controls.update();
    renderer.render(scene, camera)
    stats.update();
    updateStatsDisplay()
}

export { renderer, scene, camera, animate, controls, stats, updateStatsDisplay };