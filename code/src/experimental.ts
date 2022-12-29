import * as THREE from 'three';
import { BoxGeometry, Vector2, Vector3 } from 'three';
import { SkeletalModel } from './utils/skeletal_model';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { createCubicBezierCurve } from './utils/parametric_surfaces';
import { SharedInverseAnimatedModel } from './utils/animated_tree';

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
    
    const group = new THREE.Group();

    for(let i = 0; i < 2; i++) {
        const otherFace = new THREE.Mesh(new THREE.PlaneGeometry(4, 4 * 417/216), billboardMaterial);
        otherFace.rotateY(i * Math.PI / 2)
        group.add(otherFace);
    }

    const riggedTree = await SkeletalModel.createSkeletalModel("models/external/rigged_pine/r/rigged_2.glb");

    const curveOne = createCubicBezierCurve(new Vector2(0, 0), new Vector2(0.3, 0.2), new Vector2(0.7, 1.2), new Vector2(1, 0.7))
    const curveTwo = createCubicBezierCurve(new Vector2(1, 0.7), new Vector2(1.3, 0.2), new Vector2(1.7, -0.1), new Vector2(2, 0))
    const animationCurve = (_t: number) => {
        const t = _t % 2;

        if(t < 1) {
            return curveOne(t);
        }

        return curveTwo(t - 1);
    }

    const treeMaker = new SharedInverseAnimatedModel(
        riggedTree,
        {
            boneIndex: riggedTree.bone_map["BoneTarget"],
            target: (clock: THREE.Clock): THREE.Vector3 => {
                return new Vector3(animationCurve(clock.getElapsedTime()), 6, 0);
            }
        },
        {
            low: {
                "effector": 3,
                "iteration": 10,
                // @ts-ignore
                "links": [{index: 2}], 
                "maxAngle": 0.0001,
                "target": 4
            },
            medium: {
                "effector": 3,
                "iteration": 10,
                // @ts-ignore
                "links": [{index: 2}, {index: 1}], 
                "maxAngle": 0.0001,
                "target": 4
            }
        },
        "low"
    );

    // setTimeout(() => treeMaker.setAnimationLevel("medium"), 2500)
    
    const treeGroup = new THREE.Group();

    for(let i = 0; i < 5; i++) {
        for(let j = 0; j < 5; j++) {
            const spawned = treeMaker.spawnObject();
            // spawned.position.set(5 * i, 0, 5 * j);

            const lod = new THREE.LOD();
            lod.addLevel(group.clone(), 30);
            lod.addLevel(group.clone(), 20);
            lod.addLevel(spawned, 10);
            lod.position.set(5 * i, 0, 5 * j)

            scene.add(lod);
        }
    }

    // scene.add(treeGroup);
    
    
    // const copy = treeMaker.cloneMesh();
    // copy.position.set(0, 5, 0)
    // scene.add(copy)
    // const copy = treeMaker.object.clone();
    // copy.position.set(0, 0, 0);
    // scene.add(copy);

    // 
    // // const riggedTree = await SkeletalModel.createSkeletalModel("models/custom/basic_humanoid/rigged_basic_targets.glb")
    // scene.add(riggedTree.model);
    // scene.add(riggedTree.skinned_mesh);
    // scene.add(riggedTree.skeleton_helper);

    // console.log({
    //     hierarchy: riggedTree.getSkeletonHierarchy(),
    //     bones: riggedTree.getBoneNames(),
    //     map: riggedTree.bone_map
    // });

    // const ikSolver = new CCDIKSolver(riggedTree.skinned_mesh, [
    //     {
    //         "effector": 3,
    //         "iteration": 10,
    //         // @ts-ignore
    //         "links": [{index: 2}, {index: 1}], 
    //         "maxAngle": 0.0001,
    //         "target": 4
    //     }
    // ]);

    // ikSolver.

    // const target = new THREE.Vector3(1, 1, 0);
    // const visualTarget = new THREE.Mesh(new BoxGeometry(0.2, 0.2, 0.2), traceMaterial);
    // visualTarget.position.copy(target);
    // scene.add(visualTarget);

    // const clock = new THREE.Clock();

    // const left = createCubicBezierCurve(new Vector2(0, 0), new Vector2(0.3, 0.2), new Vector2(0.7, 1.2), new Vector2(1, 0.7))
    // const right = createCubicBezierCurve(new Vector2(1, 0.7), new Vector2(1.3, 0.2), new Vector2(1.7, -0.1), new Vector2(2, 0))

    // const func = (_t: number) => {
    //     const t = _t % 2;

    //     if(t < 1) {
    //         return left(t);
    //     }

    //     return right(t - 1);
    // }

    // for(let i = 0; i < 101; i++) {
    //     const t = i / 50;
    //     console.log({t, y: func(t)})
    // }

    const clock = new THREE.Clock();

    return () => {
        // riggedTree.getBone("BoneTarget").position.copy(new THREE.Vector3(func(clock.getElapsedTime()), 6, 0));
        // visualTarget.position.copy(target);
        // ikSolver.update();
        treeMaker.update(clock);
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