import * as THREE from 'three';
import { BoxGeometry, Clock, SkinnedMesh, Vector2, Vector3, Vector4 } from 'three';
import { SkeletalModel, InverseAnimatedModel, ForwardAnimatedModel } from './utils/skeletal_model';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { createTreeMaker } from './utils/model_store';
import { BezierSurface, BSplineSurface, NURBSSurface } from './utils/parametric_surfaces';

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

    let controls: Vector3[][] = [];

    for(let i = 0; i < 4; i++) {
        let row: Vector3[] = [
            new Vector3(i, i, i * (-1) ** i),
            new Vector3(i + 1, i, i * (-1) ** i),
            new Vector3(i + 1, i, (i + 1) * (-1) ** i)
        ];

        controls.push(row);
    }

    const surf = new BezierSurface(
        [
            [new Vector3(0, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 1, 1)],
            [new Vector3(1, 1, 1), new Vector3(1, 1, 2), new Vector3(1, 2, 2)],
        ],
        // controls,
        20,
        gridMaterial
    )

    scene.add(surf.mesh);

    // const control_points = [
    //     [new Vector3(2.0, 8.0, 1.0), new Vector3(2.5, 7.8, 2.0), new Vector3(3.0, 7.6, 3.0), new Vector3(4.0, 7.4, 4.0), new Vector3(5.2, 7.1, 5.0), new Vector3(4.8, 6.9, 6.0)],
    //     [new Vector3(1.7, 7.0, 0.0), new Vector3(2.3, 6.9, 0.0), new Vector3(2.8, 6.8, 0.0), new Vector3(3.7, 6.5, 0.0), new Vector3(4.9, 6.2, 0.0), new Vector3(4.5, 5.9, 0.0)],
    //     [new Vector3(1.3, 5.7, 0.0), new Vector3(2.1, 5.7, 0.0), new Vector3(2.6, 5.7, 0.0), new Vector3(3.8, 5.6, 0.0), new Vector3(4.6, 5.3, 0.0), new Vector3(4.8, 5.4, 0.0)],
    //     [new Vector3(1.2, 5.0, 0.0), new Vector3(1.8, 4.9, 0.0), new Vector3(2.5, 4.9, 0.0), new Vector3(3.7, 4.8, 0.0), new Vector3(4.5, 4.6, 0.0), new Vector3(4.7, 4.4, 0.0)],
    //     [new Vector3(0.8, 3.8, 0.0), new Vector3(1.4, 3.9, 0.0), new Vector3(2.2, 3.8, 0.0), new Vector3(3.4, 3.3, 0.0), new Vector3(4.3, 2.5, 0.0), new Vector3(4.8, 2.1, 0.0)],
    //     [new Vector3(0.5, 3.0, 0.0), new Vector3(1.2, 3.3, 0.0), new Vector3(1.8, 3.4, 0.0), new Vector3(3.0, 3.0, 0.0), new Vector3(4.0, 1.5, 0.0), new Vector3(4.8, 0.0, 0.0)],
    // ];

    // const U = [0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1];
    // const V = [0, 0, 0, 0, 0.33, 0.66, 1, 1, 1, 1];
    // const p = 2;
    // const q = 3;
    // const samples = 4;

    // const s = new BSplineSurface(control_points, p, q, U, V, samples, gridMaterial);
    // scene.add(s.mesh)

    // const controlPoints = [
    //     [new Vector3(0, 0, 0), new Vector3(0, 0, 2), new Vector3(0, 0, 4)],

    // ]

    // const b = new BezierSurface(controlPoints, 40, gridMaterial);
    // scene.add(b.mesh)

    return () => {
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