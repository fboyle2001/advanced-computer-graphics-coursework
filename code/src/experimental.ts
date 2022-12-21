import * as THREE from 'three';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { ProgressiveMeshModel } from './utils/progressive_mesh';
import chairModelData from './progressive_meshes/chair_50.json';
import { ModelLoader } from './utils/model_loader';
import { createLevelOfDetail } from './utils/level_of_detail';
import { ParametricBufferGeometry, ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry';
import { ParametricGeometries } from 'three/examples/jsm/geometries/ParametricGeometries';
import { BufferGeometry, Clock, Mesh, Points, PointsMaterial, SkinnedMesh, Vector, Vector3, Vector4 } from 'three';

import { NURBSSurface as DefaultNURBS } from 'three/examples/jsm/curves/NURBSSurface.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { SkeletalModel } from './utils/skeletal_model';

import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver';
import { BezierSurface, BSplineSurface, NURBSSurface, EditableNURBSSurface } from './utils/parametric_surfaces';
import { createPointMesh } from './utils/points_util';

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
    // const paramGeom = new ParametricGeometry(
    //     ParametricGeometries.plane(10, 10),
    //     3, 3
    // )

    // console.log(paramGeom.attributes.position)
    // paramGeom.attributes.position.setXYZ(5, 3.33, 2, 3.33);
    // paramGeom.attributes.position.setXYZ(6, 6.67, -2, 3.33);
    // paramGeom.attributes.position.setXYZ(9, 3.33, 2, 6.67);
    // paramGeom.attributes.position.setXYZ(10, 6.67, -2, 6.67);

    const gridMap = new THREE.TextureLoader().load("https://threejs.org/examples/textures/uv_grid_opengl.jpg");
    gridMap.wrapS = gridMap.wrapT = THREE.RepeatWrapping;
    gridMap.anisotropy = 16;
    
    const gridMaterial = new THREE.MeshPhongMaterial({
        map: gridMap,
        side: THREE.DoubleSide
    });

    const nsControlPoints = [
        [
            new THREE.Vector4( 0, 0, 0, 1 ),
            new THREE.Vector4( 0, 0, 1, 1 ),
            new THREE.Vector4( 0, 0, 2, 1 ),
            new THREE.Vector4( 0, 0, 3, 1 )
        ],
        [
            new THREE.Vector4( 1, 0, 0, 1 ),
            new THREE.Vector4( 1, 2, 1, 1 ),
            new THREE.Vector4( 1, 2, 2, 1 ),
            new THREE.Vector4( 1, 0, 3, 1 )
        ],
        [
            new THREE.Vector4( 2, 0, 0, 1 ),
            new THREE.Vector4( 2, -2, 1, 1 ),
            new THREE.Vector4( 2, -2, 2, 1 ),
            new THREE.Vector4( 2, 0, 3, 1 )
        ],
        [
            new THREE.Vector4( 3, 0, 0, 1 ),
            new THREE.Vector4( 3, 0, 1, 1 ),
            new THREE.Vector4( 3, 0, 2, 1 ),
            new THREE.Vector4( 3, 0, 3, 1 )
        ]
    ];
    
    const U = [ 0, 0, 0, 0, 1, 1, 1, 1 ];
    const V = [ 0, 0, 0, 0, 1, 1, 1, 1 ];
    const p = 3;
    const q = 3;
    const samples = 24;

    const nurbsSurface = new EditableNURBSSurface(nsControlPoints, p, q, U, V, samples);
    // const nurbsMesh = new Mesh(nurbsSurface.createGeometry(samples), gridMaterial);
    // scene.add(nurbsMesh);
    const editableNurbsSurface = nurbsSurface.createDynamicMesh(gridMaterial);
    scene.add(editableNurbsSurface);

    // const defNurbsSurface = new DefaultNURBS(p, q, U, V, nsControlPoints);

    // function getSurfacePoint( u: number, v: number, target: Vector3 ) {

    //     return defNurbsSurface.getPoint( u, v, target );

    // }
    
    // const geometry = new ParametricGeometry( getSurfacePoint, samples, samples );
    // const object = new THREE.Mesh( geometry, gridMaterial );
    // object.position.set(5, 0, 0);
    // scene.add(object);

    // const nurbsGridMesh = createPointMesh(nurbsMesh, 0.05);
    // scene.add(nurbsGridMesh);

    // const nurbsControlMesh = nurbsSurface.createControlPointGrid(0.2);
    // scene.add(nurbsControlMesh);
    const clock = new Clock();
    let last = 0;
    const updatesPerSecond = 5;
    const maxUpdates = 40;
    const secondsPerWave = 2;

    let currentHeight = 2;
    let dir = -1;
    let waveHeight = 4;

    return () => {
        if(last >= maxUpdates) {
            return;
        }

        if(currentHeight < 0 || currentHeight > waveHeight) {
            dir *= -1;
        }

        currentHeight += dir * (waveHeight / secondsPerWave) * clock.getDelta();
        // console.log({height: currentHeight});
        nurbsSurface.updateControlPoint(1, 1, new Vector4(1, currentHeight, 1, 1))
        nurbsSurface.updateControlPoint(2, 1, new Vector4(1, currentHeight, 2, 1))
        nurbsSurface.updateControlPoint(1, 2, new Vector4(2, -currentHeight * 2 / waveHeight, 1, 1))
        nurbsSurface.updateControlPoint(2, 2, new Vector4(2, -currentHeight * 2 / waveHeight, 2, 1))
        nurbsSurface.updateDynamicMeshes();

        // if(Math.round(clock.getElapsedTime() * updatesPerSecond) > last) {
        //     last += 1;
        //     nurbsSurface.updateControlPoint(1, 1, new Vector4(1, -1, 1, -1 + clock.getElapsedTime() / 10))
        //     nurbsSurface.updateDynamicMeshes();
        // }

        // nurbsSurface.updateControlPoint(1, 1, new Vector4(1, -1, 1, -1 + clock.getElapsedTime() / 10))
        // nurbsSurface.updateDynamicMeshes();
    };
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