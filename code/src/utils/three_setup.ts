import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
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

// const controls = new PointerLockControls(camera, renderer.domElement);
// controls.isLocked = false;

// const controlMovement = () => {
//     let moveForward = false;
//     let moveBackward = false;
//     let moveLeft = false;
//     let moveRight = false;
//     let canJump = false;

//     const velocity = new THREE.Vector3();
// 	const direction = new THREE.Vector3();

//     const onKeyDown = function ( event: any ) {
//         switch ( event.code ) {
//             case 'ArrowUp':
//             case 'KeyW':
//                 controls.moveForward(1)
//                 moveForward = true;
//                 break;
//             case 'ArrowLeft':
//             case 'KeyA':
//                 controls.moveRight(-1)
//                 moveLeft = true;
//                 break;
//             case 'ArrowDown':
//             case 'KeyS':
//                 controls.moveForward(-1)
//                 moveBackward = true;
//                 break;
//             case 'ArrowRight':
//             case 'KeyD':
//                 controls.moveRight(1)
//                 moveRight = true;
//                 break;
//             case 'Space':
//                 if ( canJump === true ) velocity.y += 350;
//                 canJump = false;
//                 break;
//         }
//     };

//     const onKeyUp = function ( event: any ) {

//         switch ( event.code ) {
//             case 'ArrowUp':
//             case 'KeyW':
//                 moveForward = false;
//                 break;
//             case 'ArrowLeft':
//             case 'KeyA':
//                 moveLeft = false;
//                 break;
//             case 'ArrowDown':
//             case 'KeyS':
//                 moveBackward = false;
//                 break;
//             case 'ArrowRight':
//             case 'KeyD':
//                 moveRight = false;
//                 break;

//         }
//     };

//     document.addEventListener( 'keydown', onKeyDown );
// 	document.addEventListener( 'keyup', onKeyUp );
//     controls.isLocked = true;
// }

// controlMovement();

// const controls = new FlyControls(camera, renderer.domElement);
// controls.movementSpeed = 1;
// controls.autoForward = false;d
// controls.dragToLook = false;
// controls.rollSpeed = Math.PI;

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

    if(document.getElementById("calls_count") !== null) {
        (document.getElementById("calls_count") as HTMLElement).innerHTML = `${renderer.info.render.calls}`;
    }
}

export { renderer, scene, camera, controls, stats, updateStatsDisplay };