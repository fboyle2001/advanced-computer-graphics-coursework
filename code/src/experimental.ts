import * as THREE from 'three';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { NURBSSurface } from './utils/parametric_surfaces';

/* CONFIGURATION */
// Config this to simulate network arrival
const updatesPerSecond = 20;
const updateDelayMS = 1000 / updatesPerSecond;

/* BASIC MATERIALS */
const purpleMaterial = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
const brownMaterial = new THREE.MeshBasicMaterial({ color: 0x9e9378, side: THREE.DoubleSide });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x268cab, side: THREE.DoubleSide });

const constructScene = async (scene: THREE.Scene): Promise<() => void> => {
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
            new THREE.Vector4( 1, -1, 1, 1 ),
            new THREE.Vector4( 1, -1, 2, 1 ),
            new THREE.Vector4( 1, 0, 3, 1 )
        ],
        [
            new THREE.Vector4( 2, 0, 0, 1 ),
            new THREE.Vector4( 2, -1, 1, 1 ),
            new THREE.Vector4( 2, -1, 2, 1 ),
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

    const nurbsSurface = new NURBSSurface(nsControlPoints, p, q, U, V, samples, gridMaterial);
    scene.add(nurbsSurface.mesh)
    scene.add(nurbsSurface.control_point_grid);

    setTimeout(() => nurbsSurface.updateControlPoint(1, 1, new THREE.Vector3(1, -10, 1), true), 1000)

    return () => {};
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