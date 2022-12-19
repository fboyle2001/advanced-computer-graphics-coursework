import * as THREE from 'three';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { ProgressiveMeshModel } from './utils/progressive_mesh';
import chairModelData from './progressive_meshes/chair_50.json';
import { ModelLoader } from './utils/model_loader';
import { createLevelOfDetail } from './utils/level_of_detail';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry';
import { ParametricGeometries } from 'three/examples/jsm/geometries/ParametricGeometries';
import { SkinnedMesh, Vector3 } from 'three';

import { NURBSCurve } from 'three/examples/jsm/curves/NURBSCurve.js';
import { NURBSSurface } from 'three/examples/jsm/curves/NURBSSurface.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { SkeletalModel } from './utils/skeletal_model';

import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver';

/* CONFIGURATION */
// Config this to simulate network arrival
const updatesPerSecond = 20;
const updateDelayMS = 1000 / updatesPerSecond;

/* BASIC MATERIALS */
const purpleMaterial = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
const brownMaterial = new THREE.MeshBasicMaterial({ color: 0x9e9378, side: THREE.DoubleSide });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x268cab, side: THREE.DoubleSide }); 

const eps = () => (Math.random() + 1e-7) / 1e6;

const constructScene = async (scene: THREE.Scene): Promise<() => void> => {
    // Setup the base plane
    const flooorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshPhongMaterial({ color: 0xEEEADE, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(flooorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    /* LEVEL OF DETAIL */
    const levelOfDetailDistances = {
        low: 20,
        medium: 10,
        high: 0
    }

    // Table LOD
    let tableLOD = await createLevelOfDetail({
        distances: levelOfDetailDistances,
        modelFolder: "models/custom/table/",
        modelName: "model.gltf"
    });

    tableLOD.rotation.y = Math.PI;
    tableLOD.position.set(3, 0, 4)
    // scene.add(tableLOD);

    /* PROGRESSIVE MESH */
    // Chair
    const chairProgressiveMesh = new ProgressiveMeshModel(chairModelData.vertices, chairModelData.polygons, chairModelData.maximums.vertices, chairModelData.maximums.polygons);
    
    const chairOne = chairProgressiveMesh.createMesh(purpleMaterial);
    chairOne.position.set(0, eps(), 3);
    // scene.add(chairOne);
    const chairTwo = chairProgressiveMesh.createMesh(blueMaterial)
    chairTwo.position.set(1, eps(), 3);
    // scene.add(chairTwo);

    chairProgressiveMesh.simulateNetworkDataArrival(chairModelData.reduction, updateDelayMS);

    /* REGULAR MODEL LOADING */
    const classroomCreator = new ModelLoader(scene, `models/custom/classroom/model.gltf`);
    // classroomCreator.load();
    await classroomCreator.loadAndBlock();

    const tableWithChairs = new THREE.Group();

    const chairLeft = chairProgressiveMesh.createMesh(blueMaterial);
    chairLeft.position.set(0, eps(), 0);
    const chairRight = chairProgressiveMesh.createMesh(purpleMaterial);
    chairRight.position.set(0, eps(), 0.8);
    const table = tableLOD.clone();
    table.position.set(0.9, eps(), -0.75);

    tableWithChairs.add(chairLeft);
    tableWithChairs.add(chairRight);
    tableWithChairs.add(table);

    tableWithChairs.rotation.y = Math.PI;

    const classroomWithTables = new THREE.Group();

    const tablePositions = [
        [4.25, eps(), -1.25], [4.25, eps(), -3.75], [4.25, eps(), -6.25],
        [2.75, eps(), -1.25], [2.75, eps(), -3.75], [2.75, eps(), -6.25]
    ];

    tablePositions.forEach(([x, y, z]) => {
        const copied = tableWithChairs.clone();
        copied.position.set(x, y, z); 
        classroomWithTables.add(copied);
    });

    const copied = tableWithChairs.clone();
    copied.rotation.y = -Math.PI / 2;
    copied.position.set(2, eps(), -9)
    classroomWithTables.add(copied);
    
    classroomCreator.addToScene(m => {
        m.position.set(0, eps(), 0)
        classroomWithTables.add(m);
    });

    // scene.add(classroomWithTables);
    const clonedClassroom = classroomWithTables.clone();
    clonedClassroom.position.set(5 + eps(), eps(), 0)
    // scene.add(clonedClassroom);

    // Slide with Parametric Curve
    // let slideCurve = new THREE.CubicBezierCurve3(
    //     new Vector3(-4, 2, 0),
    //     new Vector3(-4, -4, 0),
    //     new Vector3(0.7, -3.5, 0),
    //     new Vector3(4, -4, 0)
    // );

    // const geometry = new ParametricGeometries.TubeGeometry(slideCurve)
    // const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
    // const slide = new THREE.Mesh( geometry, material );
    // slide.position.set(-3, 2, 0);
    // slide.scale.set(0.4, 0.4, 0.4)
    // scene.add( slide );

    // const nsControlPoints = [
    //     [
    //         new THREE.Vector4( - 200, - 200, 100, 1 ),
    //         new THREE.Vector4( - 200, - 100, - 200, 1 ),
    //         new THREE.Vector4( - 200, 100, 250, 1 ),
    //         new THREE.Vector4( - 200, 200, - 100, 1 )
    //     ],
    //     [
    //         new THREE.Vector4( 0, - 200, 0, 1 ),
    //         new THREE.Vector4( 0, - 100, - 100, 5 ),
    //         new THREE.Vector4( 0, 100, 150, 5 ),
    //         new THREE.Vector4( 0, 200, 0, 1 )
    //     ],
    //     [
    //         new THREE.Vector4( 200, - 200, - 100, 1 ),
    //         new THREE.Vector4( 200, - 100, 200, 1 ),
    //         new THREE.Vector4( 200, 100, - 250, 1 ),
    //         new THREE.Vector4( 200, 200, 100, 1 )
    //     ]
    // ];
    // const degree1 = 2;
    // const degree2 = 3;
    // const knots1 = [ 0, 0, 0, 1, 1, 1 ];
    // const knots2 = [ 0, 0, 0, 0, 1, 1, 1, 1 ];
    // const nurbsSurface = new NURBSSurface( degree1, degree2, knots1, knots2, nsControlPoints );

    // const map = new THREE.TextureLoader().load( 'textures/uv_grid_opengl.jpg' );
    // map.wrapS = map.wrapT = THREE.RepeatWrapping;
    // map.anisotropy = 16;

    // function getSurfacePoint( u: number, v: number, target: Vector3 ) {
    //     return nurbsSurface.getPoint( u, v, target );
    // }

    // const g = new ParametricGeometry( getSurfacePoint, 20, 20 );
    // const m = new THREE.MeshLambertMaterial( { map: map, side: THREE.DoubleSide } );
    // const object = new THREE.Mesh( g, m );
    // object.position.set( 0, 0, 0 );
    // scene.add(object)

    // const humanoidLoader = await new GLTFLoader().loadAsync(`models/custom/basic_humanoid/rigged_basic.glb`);
    // const humanoid = humanoidLoader.scene;
    // let skinnedT = null;

    // humanoid.traverse(x => {
    //     // @ts-ignore
    //     if(x.isSkinnedMesh) {
    //         skinnedT = x;
    //     }
    // })

    // if(!skinnedT) {
    //     return;
    // }

    // const skinned: SkinnedMesh = skinnedT;
    // const skeleton = skinned.skeleton;
    // console.log({skinned, skeleton})

    

    // humanoid.position.set(1, 1, 1);
    // scene.add(humanoid);

    // const skeletonHelper = new THREE.SkeletonHelper(humanoid);
    // skeletonHelper.visible = true;
    // scene.add(skeletonHelper);

    // // const humanoidLoader = new ModelLoader(scene, `models/custom/basic_humanoid/rigged_basic.glb`);
    // // await humanoidLoader.loadAndBlock();
    // // humanoidLoader.addToScene(m => {
    // //     m.position.set(0, 1, 0);
    // //     console.log(m)
    // //     m.visible = false;
    // //     const skeletonHelper = new THREE.SkeletonHelper(m);
    // //     skeletonHelper.visible = true;
    // //     scene.add(skeletonHelper);
    // // });

    
    // skeleton.bones[8].rotation.x += 0.8;
    // skeleton.bones[12].rotation.x += 0.8;

    const skeletalModel = await SkeletalModel.createSkeletalModel(`models/custom/basic_humanoid/rigged_basic_targets.glb`);
    skeletalModel.addToScene(scene);
    skeletalModel.setSkeletonVisible(true);

    const targetBone = skeletalModel.getBone("upper_armL").clone()
    targetBone.position.y += 4;

    console.log(skeletalModel.skeleton)
    // skeletalModel.getBone("upper_armL").rotation.x += 0.3;

    console.log(skeletalModel.getBoneNames())
    console.log(skeletalModel.getSkeletonHierarchy())

    // skeletalModel.addBone("upper_armL", targetBone, "upper_armL_target");


    // skeletalModel.getBone("handL_target_1").rotation.x += 0.1;
    skeletalModel.getBone("handL_target_1").position.y += 0.5;

    const ikSolver = new CCDIKSolver(skeletalModel.skinned_mesh, [
        {
            "effector": 10,
            "iteration": 10,
            // @ts-ignore
            "links": [{index: 9}, {index: 8}, {index: 7}],
            "maxAngle": 0.0001,
            "target": 29
        }
    ])

    return () => {
        ikSolver.update();
        skeletalModel.getBone("handL_target_1").position.y -= 0.001;
        // skeletalModel.getBone("upper_armL").position.y += 0.001;
    }
}




const animate = (x: () => void) => {
    requestAnimationFrame(() => animate(x));
    controls.update();
    renderer.render(scene, camera)
    stats.update();
    updateStatsDisplay();
    x();
}

constructScene(scene).then(x => animate(x));