import * as THREE from 'three';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { ProgressiveMeshModel } from './utils/progressive_mesh';
import chairModelData from './progressive_meshes/chair_50.json';
import { ModelLoader } from './utils/model_loader';
import { createLevelOfDetail } from './utils/level_of_detail';
import { ParametricBufferGeometry, ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry';
import { ParametricGeometries } from 'three/examples/jsm/geometries/ParametricGeometries';
import { BufferGeometry, Mesh, Points, PointsMaterial, SkinnedMesh, Vector, Vector3 } from 'three';

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
    // const flooorGeometry = new THREE.PlaneGeometry(20, 20);
    // const floorMaterial = new THREE.MeshPhongMaterial({ color: 0xEEEADE, side: THREE.DoubleSide });
    // const floor = new THREE.Mesh(flooorGeometry, floorMaterial);
    // floor.rotation.x = -Math.PI / 2;
    // scene.add(floor);

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

    // Parametric Plane
    const paramGeom = new ParametricGeometry(
        ParametricGeometries.plane(10, 10),
        3, 3
    )

    console.log(paramGeom.attributes.position)
    paramGeom.attributes.position.setXYZ(5, 3.33, 2, 3.33);
    paramGeom.attributes.position.setXYZ(6, 6.67, -2, 3.33);
    paramGeom.attributes.position.setXYZ(9, 3.33, 2, 6.67);
    paramGeom.attributes.position.setXYZ(10, 6.67, -2, 6.67);


    const map = new THREE.TextureLoader().load(
        "https://threejs.org/examples/textures/uv_grid_opengl.jpg"
      );
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.anisotropy = 16;
    
      const material = new THREE.MeshPhongMaterial({
        map: map,
        side: THREE.DoubleSide
      });

    const paramObj = new Mesh(paramGeom, material)
    scene.add(paramObj)

    const pos = paramObj.geometry.attributes.position; // want 5th point
    let points = [];

    for(let i = 0; i < pos.count; i++) {
        let point = new Vector3().fromBufferAttribute(pos, i);
        console.log({i, point})
        paramObj.localToWorld(point)
        points.push(point);
    }

    const pointsGeom = new BufferGeometry().setFromPoints(points);
    const pointsMesh = new Points(pointsGeom, new PointsMaterial({ color: 0xFFFFFF, size: 0.2 }))
    scene.add(pointsMesh)

    return () => {}
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