import * as THREE from 'three';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass';
import { createBikeShed, createClassroom } from './utils/model_store';
import { ComponentRegister, RegisterableComponents } from './utils/registerable';
import { BezierSurface, LODParametricBinder, NURBSSurface } from './utils/parametric_surfaces';
import { BoxGeometry, LOD, Material, Plane, PlaneGeometry, Vector3 } from 'three';
import { ModelLoader } from './utils/model_loader';
import { ProgressiveMesh } from './utils/progressive_mesh';
import { createLevelOfDetail } from './utils/level_of_detail';
import chairModelData from './progressive_meshes/chair_50.json';

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
enum AntiAliasing { None, FXAA, SSAA, SMAA }

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

const updateLevelsOfDetail = (low: {distance: number, samples: number}, medium: {distance: number, samples: number}, high: {distance: number, samples: number}) => {
    visualSettings.renderQuality.levelsOfDetail.low = low;
    visualSettings.renderQuality.levelsOfDetail.medium = medium;
    visualSettings.renderQuality.levelsOfDetail.high = high;
    lodParametricBinder.setLevels(getParametricLevels());
}

const constructInitialScene = async (scene: THREE.Scene): Promise<() => void> => {
    const gridMap = new THREE.TextureLoader().load("https://threejs.org/examples/textures/uv_grid_opengl.jpg");
    gridMap.wrapS = gridMap.wrapT = THREE.RepeatWrapping;
    gridMap.anisotropy = 16;

    const gridMaterial = new THREE.MeshPhongMaterial({
        map: gridMap,
        side: THREE.DoubleSide
    });

    const woodenPanelMap = new THREE.TextureLoader().load("/textures/wooden_shed.png");
    woodenPanelMap.wrapS = woodenPanelMap.wrapT = THREE.RepeatWrapping;
    woodenPanelMap.anisotropy = 16;

    const woodenPanelMaterial = new THREE.MeshPhongMaterial({
        map: woodenPanelMap,
        side: THREE.DoubleSide
    });

    const carParkMap = new THREE.TextureLoader().load("/textures/car_park.png");
    carParkMap.wrapS = carParkMap.wrapT = THREE.RepeatWrapping;
    carParkMap.anisotropy = 16;

    const carParkMaterial = new THREE.MeshPhongMaterial({
        map: carParkMap,
        side: THREE.DoubleSide
    });

    const bikeShedPavementMap = new THREE.TextureLoader().load("/textures/bike_shed.png");
    bikeShedPavementMap.wrapS = bikeShedPavementMap.wrapT = THREE.RepeatWrapping;
    bikeShedPavementMap.repeat.set(1, 2)
    bikeShedPavementMap.anisotropy = 16;

    const bikeShedPavementMaterial = new THREE.MeshPhongMaterial({
        map: bikeShedPavementMap,
        side: THREE.DoubleSide
    });

    /** START OF BIKE SHEDS */ // 8 30
    const bikeShedPlane = new THREE.Mesh(new BoxGeometry(7.8, 0.6, 30), bikeShedPavementMaterial);
    bikeShedPlane.position.add(new Vector3(3.9, 0.3 - offset(), 15));
    scene.add(bikeShedPlane);

    const bikeShedBarrier = new THREE.Mesh(new BoxGeometry(0.2, 0.6, 30), brownMaterial);
    // bikeShedPlane.rotation.x = -Math.PI / 2;
    bikeShedBarrier.position.add(new Vector3(7.9, 0.3 - offset(), 15));
    scene.add(bikeShedBarrier);

    const bikeShedCount = 3;

    for(let i = 0; i < bikeShedCount; i++) {
        const [bikeShed, registerable] = createBikeShed(visualSettings.renderQuality.surfaceSamples, woodenPanelMaterial, brownMaterial, purpleMaterial);
        let size = new Vector3();
        new THREE.Box3().setFromObject(bikeShed).getSize(size);
        bikeShed.position.add(new Vector3(0, 0.6 + offset(), (size.z + 0.2) * i));
        // registeredComponents.addComponents(registerable);
        registerable.surfaces!.forEach(surface => lodParametricBinder.bindSurface(surface));
        scene.add(bikeShed);
    }

    /** END OF BIKE SHEDS */

    /** START OF CAR PARK */
    const carParkPlane = new THREE.Mesh(new PlaneGeometry(30, 30), carParkMaterial);
    carParkPlane.rotation.x = -Math.PI / 2;
    carParkPlane.position.add(new Vector3(8 + carParkPlane.geometry.parameters.width / 2, -offset(), 15));
    scene.add(carParkPlane);

    const lowPolyCarLoader = new ModelLoader(scene, "/models/external/low_poly_car/scene.gltf");
    await lowPolyCarLoader.loadAndBlock();

    const carColumns = 5;

    for(let i = 0; i < carColumns; i++) {
        lowPolyCarLoader.addToScene(model => {
            model.scale.set(2, 2, 2);
            model.rotation.set(0, -Math.PI / 2, 0);
            model.position.set(16, offset() + 4e-2, 3 + i * 4.2);
        });
    }
    /** END OF CAR PARK */

    /** START OF ENTRANCE */

    const entrancePlane = new THREE.Mesh(new PlaneGeometry(8, 30), purpleMaterial);
    entrancePlane.rotation.x = -Math.PI / 2;
    entrancePlane.position.set(30, -offset(), 45);
    scene.add(entrancePlane);

    /** END OF ENTRANCE */

    /** START OF PLAYGROUND */

    const playgroundPlane = new THREE.Mesh(new PlaneGeometry(40, 40), brownMaterial);
    playgroundPlane.rotation.x = -Math.PI / 2;
    playgroundPlane.position.set(40, -offset(), 80);
    scene.add(playgroundPlane);

    /** END OF PLAYGROUND */

    /** START OF CLASSROOMS */

    const [classroomOne, classroomOneComponents] = await createClassroom(blueMaterial);
    registeredComponents.addComponents(classroomOneComponents);
    classroomOne.scale.set(3, 3, 3);
    classroomOne.rotation.set(0, Math.PI, 0);
    classroomOne.position.set(60 + offset(), -0.1 + offset(), 100);
    scene.add(classroomOne);
    
    const classroomTwo = classroomOne.clone();
    classroomTwo.position.set(45 + offset(), -0.1 + offset(), 100)
    scene.add(classroomTwo);

    // const [classroomTwo, classroomTwoComponents] = await createClassroom(blueMaterial);
    // registeredComponents.addComponents(classroomTwoComponents);
    // classroomTwo.scale.set(3, 3, 3);
    // classroomTwo.rotation.set(0, Math.PI, 0);
    // classroomTwo.position.set(60, -0.1 + offset(), 100);
    // scene.add(classroomTwo);

    /** END OF CLASSROOMS */


    // INITIAL UPDATES
    registeredComponents.setLODModelLevels({});
    registeredComponents.updateSampleCounts(visualSettings.renderQuality.surfaceSamples);

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