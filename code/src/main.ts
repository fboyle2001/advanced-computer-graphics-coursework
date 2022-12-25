import * as THREE from 'three';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass';
import { createBikeShed } from './utils/model_store';
import { ComponentRegister, RegisterableComponents } from './utils/registerable';
import { BezierSurface, LODParametricBinder, NURBSSurface } from './utils/parametric_surfaces';
import { LOD, Plane, PlaneGeometry, Vector3 } from 'three';

const offset = (): number => Math.round(Math.random() * 1e4) / 1e6;

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

enum QualityLevel { Low, Medium, High }
enum AntiAliasing { None, FXAA }

let visualSettings = {
    renderQuality: {
        surfaceSamples: 20,
        levelsOfDetail: {
            low: {
                distance: 30,
                samples: 4
            },
            medium: {
                distance: 20,
                samples: 12
            },
            high: {
                distance: 10,
                samples: 24
            }
        },
        animationQuality: QualityLevel.Medium
    },
    postProcessing: {
        antialiasing: AntiAliasing.None
    }
}

const getParametricLevels = () => {
    let levels: {[distance: number]: number} = {};

    for(const key of Object.keys(visualSettings.renderQuality.levelsOfDetail)) {
        const { distance, samples } = visualSettings.renderQuality.levelsOfDetail[key as keyof typeof visualSettings.renderQuality.levelsOfDetail];
        levels[distance] = samples;
    }

    return levels;
}

const registeredComponents = new ComponentRegister();
const levels = getParametricLevels();
const lodParametricBinder = new LODParametricBinder(levels);
console.log({levels: lodParametricBinder.levels, num: lodParametricBinder.numericLevelKeys})

const constructInitialScene = async (scene: THREE.Scene): Promise<() => void> => {
    const gridMap = new THREE.TextureLoader().load("https://threejs.org/examples/textures/uv_grid_opengl.jpg");
    gridMap.wrapS = gridMap.wrapT = THREE.RepeatWrapping;
    gridMap.anisotropy = 16;

    const gridMaterial = new THREE.MeshPhongMaterial({
        map: gridMap,
        side: THREE.DoubleSide
    });

    const carParkPlane = new THREE.Mesh(new PlaneGeometry(20, 20), blueMaterial);
    carParkPlane.rotation.x = -Math.PI / 2;
    carParkPlane.position.add(new Vector3(10, 0, 10));
    scene.add(carParkPlane);

    const bikeShedCount = 3;

    for(let i = 0; i < bikeShedCount; i++) {
        const [bikeShed, registerable] = createBikeShed(visualSettings.renderQuality.surfaceSamples, gridMaterial, brownMaterial, purpleMaterial);
        let size = new Vector3();
        new THREE.Box3().setFromObject(bikeShed).getSize(size);
        bikeShed.position.add(new Vector3(0, offset(), (size.z + 0.2) * i));
        registeredComponents.addComponents(registerable);
        // scene.add(bikeShed);
    }

    const curvedSection = new BezierSurface(
        [
            [new Vector3(0, 0, 0), new Vector3(0, 4, 0), new Vector3(4, 4, 0)],
            [new Vector3(4, 4, 0), new Vector3(0, 4, 0), new Vector3(0, 0, 0)]
        ],
        30,
        gridMaterial
    );

    scene.add(curvedSection.mesh);
    lodParametricBinder.bindSurface(curvedSection);

    return () => {
        lodParametricBinder.updateAll(camera);
    };
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