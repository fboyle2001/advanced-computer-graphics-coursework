import * as THREE from 'three';
import { scene, animate } from './utils/three_setup';

/* CONFIGURATION */
/** USER SETTINGS **/
// Config this to simulate network arrival
const networkUpdatesPerSecond = 1000;

/** DERIVED CONFIGURATION **/
const networkDelayMS = 1000 / networkUpdatesPerSecond;

/* BASIC MATERIALS */
const purpleMaterial = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
const brownMaterial = new THREE.MeshBasicMaterial({ color: 0x9e9378, side: THREE.DoubleSide });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x268cab, side: THREE.DoubleSide }); 

const constructScene = async (scene: THREE.Scene) => {
    // Setup the base plane
    const geometry = new THREE.PlaneGeometry(100, 100);
    const gravelTexture = new THREE.TextureLoader().load("/textures/gravel.jpg");
    gravelTexture.wrapS = gravelTexture.wrapT = THREE.RepeatWrapping;
    gravelTexture.repeat.set(16, 16);

    const gravelMaterial = new THREE.MeshPhongMaterial({ map: gravelTexture });
    const plane = new THREE.Mesh(geometry, gravelMaterial);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);
}

constructScene(scene);
animate();