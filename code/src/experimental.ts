import * as THREE from 'three';
import { BoxGeometry, Clock, SkinnedMesh, Vector2, Vector3 } from 'three';
import { SkeletalModel, SharedInverseAnimatedModel, ForwardAnimatedModel } from './utils/skeletal_model';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { createCubicBezierCurve } from './utils/parametric_surfaces';
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

    const [treeMaker, spawnNewTreeLOD] = await createTreeMaker(billboardMaterial);

    const riggedPerson = await SkeletalModel.createSkeletalModel("models/custom/basic_humanoid/rigged_basic_targets.glb");
    const forwardKinematicModel = new ForwardAnimatedModel(riggedPerson, {low: {}}, "low");

    console.log({h: riggedPerson.getSkeletonHierarchy()})

    forwardKinematicModel.addAnimation(
        "stretch-1", 
        (skinnedMesh: SkinnedMesh, skeletal: SkeletalModel) => {},
        (skinnedMesh: SkinnedMesh, skeletal: SkeletalModel, clock: Clock) => {
            skinnedMesh.skeleton.bones[skeletal.bone_map["spine001"]].rotation.set(0, Math.cos(clock.getElapsedTime()) * (Math.PI / 2 - 0.5), 0);
        }
    );

    forwardKinematicModel.addAnimation(
        "bounce", 
        (skinnedMesh: SkinnedMesh, skeletal: SkeletalModel) => {
            skinnedMesh.skeleton.bones[skeletal.bone_map["upper_armL"]].rotateZ(- Math.PI / 4);
            skinnedMesh.skeleton.bones[skeletal.bone_map["forearmL"]].rotateZ(- Math.PI / 8);
            skinnedMesh.skeleton.bones[skeletal.bone_map["forearmL"]].rotateX(Math.PI / 4);

            skinnedMesh.skeleton.bones[skeletal.bone_map["upper_armR"]].rotateZ(Math.PI / 4);
            skinnedMesh.skeleton.bones[skeletal.bone_map["forearmR"]].rotateZ(Math.PI / 8);
            skinnedMesh.skeleton.bones[skeletal.bone_map["forearmR"]].rotateX(Math.PI / 4);
        },
        (skinnedMesh: SkinnedMesh, skeletal: SkeletalModel, clock: Clock) => {
            skinnedMesh.skeleton.bones[skeletal.bone_map["thighL"]].scale.set(1, 1 - 0.3 * Math.abs(Math.cos(0.5 * clock.getElapsedTime())), 1);
            skinnedMesh.skeleton.bones[skeletal.bone_map["thighR"]].scale.set(1, 1 - 0.3 * Math.abs(Math.cos(0.5 * clock.getElapsedTime())), 1);
            const spineRotationX = Math.PI / 16 + (3 * Math.PI / 16) * Math.cos(clock.getElapsedTime())
            skinnedMesh.skeleton.bones[skeletal.bone_map["spine001"]].rotation.setFromVector3(new Vector3(spineRotationX, 0, 0))
        }
    );

    for(let i = 0; i < 5; i++) {
        const dupe = forwardKinematicModel.spawnObject();
        dupe.position.set(2 * i, 0, 0);
        scene.add(dupe);
    }

    forwardKinematicModel.selectAnimation(0, "bounce");
    forwardKinematicModel.selectAnimation(1, "stretch-1");

    // console.log({b: riggedPerson.getBoneNames(), h: riggedPerson.getSkeletonHierarchy()})

    // // riggedPerson.getBone("shinL").position.add(new Vector3(0, 0, -0.2))
    // // riggedPerson.getBone("shinR").position.add(new Vector3(0, 0, -0.2))
    // // riggedPerson.getBone("spine").position.add(new Vector3(0, 0.4, 0.2))
    // riggedPerson.getBone("thighR").position.add(new Vector3(0, 0.4, 0.2))
    const clock = new THREE.Clock();

    return () => {
        forwardKinematicModel.updateAll(clock);
        // riggedPerson.getBone("spine001").rotation.set(0, Math.cos(clock.getElapsedTime()) * (Math.PI / 2 - 0.5), 0); // 'Stretch animation'
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