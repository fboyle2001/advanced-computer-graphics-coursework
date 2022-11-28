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
    let tableLOD = await createLevelOfDetail({
        distances: levelOfDetailDistances,
        modelFolder: "models/custom/table/",
        modelName: "model.gltf"
    });

    tableLOD.rotation.y = Math.PI;
    tableLOD.position.set(3, 0, 4)
    scene.add(tableLOD);

    /* PROGRESSIVE MESH */
    // Chair
    const chairProgressiveMesh = new ProgressiveMeshModel(chairModelData.vertices, chairModelData.polygons, chairModelData.maximums.vertices, chairModelData.maximums.polygons);

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

    scene.add(classroomWithTables);
    const clonedClassroom = classroomWithTables.clone();
    clonedClassroom.position.set(5 + eps(), eps(), 0)
    scene.add(clonedClassroom);
    
    chairProgressiveMesh.simulateNetworkDataArrival(chairModelData.reduction, updateDelayMS);
}

constructScene(scene);
animate();