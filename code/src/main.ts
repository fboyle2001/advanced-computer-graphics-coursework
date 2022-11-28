import * as THREE from 'three';
import { scene, animate } from './utils/three_setup';

const constructScene = (scene: THREE.Scene) => {
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshPhongMaterial({ color: 0xEEEADE, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);
}

constructScene(scene);
animate();