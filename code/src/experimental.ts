import * as THREE from 'three';
import { BoxGeometry } from 'three';
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver';
import { SkeletalModel } from './utils/skeletal_model';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';

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

    const riggedTree = await SkeletalModel.createSkeletalModel("models/external/rigged_pine/r/rigged_2.glb");
    // const riggedTree = await SkeletalModel.createSkeletalModel("models/custom/basic_humanoid/rigged_basic_targets.glb")
    scene.add(riggedTree.model);
    scene.add(riggedTree.skinned_mesh);
    scene.add(riggedTree.skeleton_helper);

    console.log({
        hierarchy: riggedTree.getSkeletonHierarchy(),
        bones: riggedTree.getBoneNames(),
        map: riggedTree.bone_map
    });

    const ikSolver = new CCDIKSolver(riggedTree.skinned_mesh, [
        {
            "effector": 3,
            "iteration": 10,
            // @ts-ignore
            "links": [{index: 2}, {index: 1}], 
            "maxAngle": 0.0001,
            "target": 4
        }
    ]);

    const target = new THREE.Vector3(1, 1, 0);
    const visualTarget = new THREE.Mesh(new BoxGeometry(0.2, 0.2, 0.2), traceMaterial);
    visualTarget.position.copy(target);
    scene.add(visualTarget);

    const clock = new THREE.Clock();

    return () => {
        riggedTree.getBone("BoneTarget").position.copy(new THREE.Vector3(1 * Math.sin(0.8 * clock.getElapsedTime()), 6, 0));
        visualTarget.position.copy(target);
        ikSolver.update();
    };
}

const animate = (updateScene: () => void) => {
    requestAnimationFrame(() => animate(updateScene));
    // controls.update();
    renderer.render(scene, camera)
    stats.update();
    updateStatsDisplay();
    updateScene();
}

constructScene(scene).then(updateScene => animate(updateScene));