import * as THREE from 'three';
import { BoxGeometry, Clock, SkinnedMesh, Vector2, Vector3 } from 'three';
import { SkeletalModel, InverseAnimatedModel, ForwardAnimatedModel } from './utils/skeletal_model';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { createTreeMaker } from './utils/model_store';

/* CONFIGURATION */
// Config this to simulate network arrival
const updatesPerSecond = 20;
const updateDelayMS = 1000 / updatesPerSecond;

/* BASIC MATERIALS */
const purpleMaterial = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
const brownMaterial = new THREE.MeshBasicMaterial({ color: 0x9e9378, side: THREE.DoubleSide });
const traceMaterial = new THREE.MeshBasicMaterial({ color: 0x268cab, side: THREE.DoubleSide, depthTest: false });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x268cab, side: THREE.DoubleSide });

const constructScene = async (scene: THREE.Scene): Promise<() => void> => {
    const gridMap = new THREE.TextureLoader().load("https://threejs.org/examples/textures/uv_grid_opengl.jpg");
    gridMap.wrapS = gridMap.wrapT = THREE.RepeatWrapping;
    gridMap.anisotropy = 16;
    
    const gridMaterial = new THREE.MeshPhongMaterial({
        map: gridMap,
        side: THREE.DoubleSide
    });

    const billboardTexture = new THREE.TextureLoader().load("/textures/tree_billboard.png");
    billboardTexture.encoding = THREE.sRGBEncoding;
    const billboardMaterial = new THREE.MeshBasicMaterial({
        map: billboardTexture,
        transparent: true,
        depthTest: true,
        side: THREE.DoubleSide
    });

    const animationCurve = (t: number) => t % 2;

    
    // setTimeout(() => forwardKinematicModel.setAnimationLevel("high"), 5000);

    // console.log({b: riggedPerson.getBoneNames(), h: riggedPerson.getSkeletonHierarchy()})

    // // riggedPerson.getBone("shinL").position.add(new Vector3(0, 0, -0.2))
    // // riggedPerson.getBone("shinR").position.add(new Vector3(0, 0, -0.2))
    // // riggedPerson.getBone("spine").position.add(new Vector3(0, 0.4, 0.2))
    // riggedPerson.getBone("thighR").position.add(new Vector3(0, 0.4, 0.2))
    const clock = new THREE.Clock();

    return () => {
        // riggedPerson.getBone("spine001").rotation.set(0, Math.cos(clock.getElapsedTime()) * (Math.PI / 2 - 0.5), 0); // 'Stretch animation'
    };
}

const animate = (updateScene: () => void) => {
    requestAnimationFrame(() => animate(updateScene));
    controls.update();
    renderer.render(scene, camera)
    stats.update();
    updateStatsDisplay();
    updateScene();
}

constructScene(scene).then(updateScene => animate(updateScene));