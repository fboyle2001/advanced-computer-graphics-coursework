import * as THREE from 'three';
import { scene, animate } from './utils/three_setup';
import { ProgressiveMeshModel } from './utils/progressive_mesh';
import chairModelData from './progressive_meshes/chair_50.json';
import { ModelLoader } from './utils/model_loader';
import { createLevelOfDetail } from './utils/level_of_detail';

/* CONFIGURATION */
// Config this to simulate network arrival
const updatesPerSecond = 1000;
const updateDelayMS = 1000 / updatesPerSecond;

/* BASIC MATERIALS */
const purpleMaterial = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
const brownMaterial = new THREE.MeshBasicMaterial({ color: 0x9e9378, side: THREE.DoubleSide });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x268cab, side: THREE.DoubleSide }); 

const eps = () => (Math.random() + 1e-7) / 1e6;

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