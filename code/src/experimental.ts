import * as THREE from 'three';
import { scene, animate } from './utils/three_setup';
import { ProgressiveMeshModel } from './utils/progressive_mesh';
import chairModelData from './progressive_meshes/chair_50.json';
import { ModelLoader } from './utils/model_loader';
import { createLevelOfDetail } from './utils/level_of_detail';

/* BASIC MATERIALS */
const purpleMaterial = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
const brownMaterial = new THREE.MeshBasicMaterial({ color: 0x9e9378, side: THREE.DoubleSide });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x268cab, side: THREE.DoubleSide }); 

const constructScene = (scene: THREE.Scene) => {
    // Setup the base plane
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshPhongMaterial({ color: 0xEEEADE, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    /* LEVEL OF DETAIL */
    const levelOfDetailDistances = {
        low: 20,
        medium: 10,
        high: 0
    }

    // Table LOD
    const tableLOD = createLevelOfDetail({
        distances: levelOfDetailDistances,
        modelFolder: "models/custom/table/",
        modelName: "model.gltf"
    });

    tableLOD.position.set(5, 0, 0)
    scene.add(tableLOD);

    /* PROGRESSIVE MESH */
    // Config this to simulate network arrival
    const updatesPerSecond = 20;
    const updateDelayMS = 1000 / updatesPerSecond;

    // Chair
    const chairProgressiveMesh = new ProgressiveMeshModel(chairModelData.vertices, chairModelData.polygons, chairModelData.maximums.vertices, chairModelData.maximums.polygons);
    
    const chairOne = chairProgressiveMesh.createMesh(purpleMaterial);
    chairOne.position.set(1, 0, 0);
    scene.add(chairOne);
    const chairTwo = chairProgressiveMesh.createMesh(blueMaterial)
    chairTwo.position.set(2, 0, 0);
    scene.add(chairTwo);

    chairProgressiveMesh.simulateNetworkDataArrival(chairModelData.reduction, updateDelayMS);

    /* REGULAR MODEL LOADING */
    const classroomCreator = new ModelLoader(scene, `models/custom/classroom/model.gltf`);
    classroomCreator.addToScene(m => m.position.set(-5, 0, 0));
    classroomCreator.load();
}

constructScene(scene);
animate();