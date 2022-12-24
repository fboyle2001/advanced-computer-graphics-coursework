import * as THREE from 'three';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass';
import { createBikeShed } from './utils/model_store';
import { ComponentRegister, RegisterableComponents } from './utils/registerable';
import { BezierSurface, NURBSSurface } from './utils/parametric_surfaces';


/* BASIC MATERIALS */
const purpleMaterial = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
const brownMaterial = new THREE.MeshBasicMaterial({ color: 0x9e9378, side: THREE.DoubleSide });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x268cab, side: THREE.DoubleSide });

const composedRenderer = new EffectComposer(renderer);
// const primaryRenderPass = new SSAARenderPass(scene, camera, 0xFFFFFF, 1);
const primaryRenderPass = new RenderPass(scene, camera);
composedRenderer.addPass(primaryRenderPass);
//composedRenderer.addPass(new SMAAPass(window.innerWidth, window.innerHeight))

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    primaryRenderPass.camera = camera;
    primaryRenderPass.scene = scene;
}, false);

let registeredComponents = new ComponentRegister();

const constructInitialScene = async (scene: THREE.Scene): Promise<() => void> => {
    const gridMap = new THREE.TextureLoader().load("https://threejs.org/examples/textures/uv_grid_opengl.jpg");
    gridMap.wrapS = gridMap.wrapT = THREE.RepeatWrapping;
    gridMap.anisotropy = 16;

    const gridMaterial = new THREE.MeshPhongMaterial({
        map: gridMap,
        side: THREE.DoubleSide
    });

    return () => {};
}

const animate = (sceneUpdate: () => void) => {
    requestAnimationFrame(() => animate(sceneUpdate))
    controls.update();
    composedRenderer.render();
    stats.update();
    updateStatsDisplay()
    sceneUpdate();
}

constructInitialScene(scene).then(sceneUpdate => animate(sceneUpdate));