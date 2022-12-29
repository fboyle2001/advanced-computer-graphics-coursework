import * as THREE from 'three';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass';
import { createBikeShed, createClassroom, createCorridor, createPond, createSportsHall, createTrampoline } from './utils/model_store';
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
const redMaterial = new THREE.MeshBasicMaterial({ color: 0x910c00, side: THREE.DoubleSide });
const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x239140, side: THREE.DoubleSide });

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
        surfaceSamples: 24,
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

const parametricLODLevels = getParametricLevels();
const registeredComponents = new ComponentRegister(parametricLODLevels);

const updateLevelsOfDetail = (low: {distance: number, samples: number}, medium: {distance: number, samples: number}, high: {distance: number, samples: number}) => {
    visualSettings.renderQuality.levelsOfDetail.low = low;
    visualSettings.renderQuality.levelsOfDetail.medium = medium;
    visualSettings.renderQuality.levelsOfDetail.high = high;
    registeredComponents.lodSurfaceBinder.setLevels(getParametricLevels());
}

const constructInitialScene = async (scene: THREE.Scene): Promise<(clock: THREE.Clock) => void> => {
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

    const classroomRoofMap = new THREE.TextureLoader().load("/textures/classroom_roof.jpg");
    classroomRoofMap.wrapS = classroomRoofMap.wrapT = THREE.RepeatWrapping;
    classroomRoofMap.repeat.set(1, 8)
    classroomRoofMap.anisotropy = 16;

    const classroomRoofMaterial = new THREE.MeshPhongMaterial({
        map: classroomRoofMap,
        side: THREE.DoubleSide
    });

    const classroomRoofRotatedMap = classroomRoofMap.clone()
    classroomRoofRotatedMap.rotation = Math.PI / 2;

    const classroomRoofRotatedMaterial = new THREE.MeshPhongMaterial({
        map: classroomRoofRotatedMap,
        side: THREE.DoubleSide
    });

    /** START OF OUTSIDE ROAD */

    const outsideRoadPlane = new THREE.Mesh(new PlaneGeometry(200, 15), redMaterial);
    outsideRoadPlane.rotation.x = -Math.PI / 2;
    outsideRoadPlane.position.add(new Vector3(23, -offset(), -10));
    scene.add(outsideRoadPlane);

    const innerJunctionPlane = new THREE.Mesh(new PlaneGeometry(10, 2.5), blueMaterial);
    innerJunctionPlane.rotation.x = -Math.PI / 2;
    innerJunctionPlane.position.add(new Vector3(23, -offset(), -1.25));
    scene.add(innerJunctionPlane);

    const longPavement = new THREE.Mesh(new BoxGeometry(95, 0.6, 2.5), purpleMaterial);
    longPavement.position.add(new Vector3(-29.5, 0.3 - offset(), -1.25));
    scene.add(longPavement);

    const reflectedLongPavement = longPavement.clone();
    reflectedLongPavement.position.add(new Vector3(95 + 10, 0, 0));
    scene.add(reflectedLongPavement);

    const otherSideLongPavement = new THREE.Mesh(new BoxGeometry(200, 0.6, 2.5), purpleMaterial);
    otherSideLongPavement.position.add(new Vector3(23, 0.3 - offset(), -1.25-15-2.5));
    scene.add(otherSideLongPavement);    

    /** END OF OUTSIDE ROAD */

    /** START OF BIKE SHEDS */ // 8 30
    const bikeShedPlane = new THREE.Mesh(new BoxGeometry(7.8, 0.6, 30), bikeShedPavementMaterial);
    bikeShedPlane.position.add(new Vector3(3.9, 0.3 - offset(), 15));
    scene.add(bikeShedPlane);

    const bikeShedBarrier = new THREE.Mesh(new BoxGeometry(0.2, 0.6, 30), brownMaterial);
    bikeShedBarrier.position.add(new Vector3(7.9, 0.3 - offset(), 15));
    scene.add(bikeShedBarrier);

    const bikeShedCount = 3;

    for(let i = 0; i < bikeShedCount; i++) {
        const [bikeShed, registerable] = createBikeShed(visualSettings.renderQuality.surfaceSamples, woodenPanelMaterial, brownMaterial, purpleMaterial);
        let size = new Vector3();
        new THREE.Box3().setFromObject(bikeShed).getSize(size);
        bikeShed.position.add(new Vector3(0, 0.6 + offset(), (size.z + 0.2) * i));
        registeredComponents.addComponents(registerable);
        // registerable.surfaces!.forEach(surface => lodParametricBinder.bindSurface(surface));
        scene.add(bikeShed);
    }

    /** END OF BIKE SHEDS */

    /** START OF CAR PARK */
    const carParkPlane = new THREE.Mesh(new PlaneGeometry(30, 30), carParkMaterial);
    carParkPlane.rotation.x = -Math.PI / 2;
    carParkPlane.position.add(new Vector3(8 + carParkPlane.geometry.parameters.width / 2, -offset(), 15));
    scene.add(carParkPlane);

    const lowPolyCarLoader = new ModelLoader(scene, "/models/external/low_poly_car/model_pack.gltf");
    await lowPolyCarLoader.loadAndBlock();

    const carColumns = 5;

    for(let i = 0; i < carColumns; i++) {
        lowPolyCarLoader.addToScene(model => {
            model.scale.set(2, 2, 2);
            model.rotation.set(0, -Math.PI / 2, 0);
            model.position.set(16, offset() + 4e-2, 3 + i * 4.2);
        });
    }

    const carParkPavement = new THREE.Mesh(new BoxGeometry(26.25, 4.0, 2.5), blueMaterial);
    carParkPavement.position.add(new Vector3(13.125, -1.4 - offset(), 31.25));
    scene.add(carParkPavement);

    const carParkTreePlane = new THREE.Mesh(new PlaneGeometry(20, 30), greenMaterial);
    carParkTreePlane.rotation.x = -Math.PI / 2;
    carParkTreePlane.position.set(48, offset(), 15)
    scene.add(carParkTreePlane)

    const longCarParkTreePlane = new THREE.Mesh(new PlaneGeometry(20, 240), greenMaterial);
    longCarParkTreePlane.rotation.x = -Math.PI / 2;
    longCarParkTreePlane.position.set(-10, offset(), 120)
    scene.add(longCarParkTreePlane)

    /** END OF CAR PARK */

    /** START OF ENTRANCE */

    const entrancePlane = new THREE.Mesh(new PlaneGeometry(5.5, 30), purpleMaterial);
    entrancePlane.rotation.x = -Math.PI / 2;
    entrancePlane.position.set(31.25, -offset(), 45);
    scene.add(entrancePlane);

    const treeEntrancePlane = new THREE.Mesh(new PlaneGeometry(8.36, 30), blueMaterial);
    treeEntrancePlane.rotation.x = -Math.PI / 2;
    treeEntrancePlane.position.set(38.18, -offset(), 45);
    scene.add(treeEntrancePlane);

    const entrancePavement = new THREE.Mesh(new BoxGeometry(2.5, 4.0, 30), redMaterial);
    entrancePavement.position.add(new Vector3(27.5,-1.4 - offset(), 45));
    scene.add(entrancePavement);

    /** END OF ENTRANCE */

    /** START OF PLAYGROUND */

    const playgroundPlane = new THREE.Mesh(new PlaneGeometry(40, 40), brownMaterial);
    playgroundPlane.rotation.x = -Math.PI / 2;
    playgroundPlane.position.set(40, -offset(), 80);
    scene.add(playgroundPlane);

    /** END OF PLAYGROUND */

    /** START OF CLASSROOMS */

    const [classroomOne, classroomOneComponents] = await createClassroom(blueMaterial, classroomRoofMaterial);
    registeredComponents.addComponents(classroomOneComponents);
    classroomOne.scale.set(3, 3, 3);
    classroomOne.rotation.set(0, Math.PI, 0);
    classroomOne.position.set(60 - offset(), -0.1 + offset(), 100 - offset());
    scene.add(classroomOne);

    const [classroomTwo, classroomTwoComponents] = await createClassroom(blueMaterial, classroomRoofMaterial);
    registeredComponents.addComponents(classroomTwoComponents);
    classroomTwo.scale.set(3, 3, 3);
    classroomTwo.rotation.set(0, Math.PI, 0);
    classroomTwo.position.set(45 - offset(), -0.1 + offset(), 100 - offset())
    scene.add(classroomTwo);

    const corridor = await createCorridor(classroomRoofMaterial);
    corridor.rotation.set(0, -Math.PI / 2, 0);
    corridor.position.set(20 + offset(), -0.1 + offset(), 100 - offset());
    scene.add(corridor);
    
    const [classroomThree, classroomThreeComponents] = await createClassroom(blueMaterial, classroomRoofMaterial);
    registeredComponents.addComponents(classroomThreeComponents);
    classroomThree.scale.set(3, 3, 3);
    classroomThree.position.set(45 + offset(), -0.1 + offset(), 170 + offset());
    scene.add(classroomThree);

    const [classroomFour, classroomFourComponents] = await createClassroom(blueMaterial, classroomRoofMaterial);
    registeredComponents.addComponents(classroomFourComponents);
    classroomFour.scale.set(3, 3, 3);
    classroomFour.position.set(30 + offset(), -0.1 + offset(), 170 + offset());
    scene.add(classroomFour);

    /** END OF CLASSROOMS */

    /** START OF SPORTS HALL */

    const [sportsHallBuilding, sportsHallComponents] = await createSportsHall(classroomRoofRotatedMaterial);
    registeredComponents.addComponents(sportsHallComponents);
    sportsHallBuilding.rotation.set(0, Math.PI, 0)
    sportsHallBuilding.position.add(new Vector3(60, -offset(), 30));
    // sportsHallBuilding.position.add(new Vector3(0, 5-offset(), 0));
    scene.add(sportsHallBuilding);

    // const trampolineBuildingPlane = new THREE.Mesh(new PlaneGeometry(26, 30), carParkMaterial);
    // trampolineBuildingPlane.rotation.x = -Math.PI / 2;
    // trampolineBuildingPlane.position.add(new Vector3(34 + trampolineBuildingPlane.geometry.parameters.width / 2, -offset(), 45));
    // scene.add(trampolineBuildingPlane);

    const [trampoline, trampolineComponents, trampolineUpdate] = await createTrampoline(gridMaterial);
    registeredComponents.addComponents(trampolineComponents);
    trampoline.scale.set(1.25, 1.25, 1.25);
    trampoline.position.set(3.4, 0, -18);
    sportsHallBuilding.add(trampoline)

    /** END OF SPORTS HALL */

    /** START OF POND */

    const [pond, pondComponents, pondUpdate] = createPond(gridMaterial);
    pond.position.add(new Vector3(0, -0.4 + offset(), 32.5))
    registeredComponents.addComponents(pondComponents)
    scene.add(pond);

    const pondPavement = new THREE.Mesh(new BoxGeometry(26.25, 4.0, 2.5), purpleMaterial);
    pondPavement.position.add(new Vector3(13.125, -1.4 - offset(), 60 - 1.25));
    scene.add(pondPavement); 

    /** END OF POND */

    // INITIAL UPDATES
    registeredComponents.setLODModelLevels([10, 20, 30]);
    registeredComponents.updateFixedSampleCounts(visualSettings.renderQuality.surfaceSamples);

    // setTimeout(() => registeredComponents.setLODModelLevels([60, 80, 100]), 2000)
    // setTimeout(() => updateLevelsOfDetail({ distance: 30, samples: 1 }, { distance: 20, samples: 4 }, { distance: 10, samples: 40 }), 1000)
    // setTimeout(() => registeredComponents.updateFixedSampleCounts(40), 2000)

    return (clock: THREE.Clock) => {
        registeredComponents.updateParametricLODs(camera);
        registeredComponents.stepProgressiveMeshes();
        trampolineUpdate(clock.getElapsedTime())
        pondUpdate(clock.getElapsedTime());
    };
}

const clock = new THREE.Clock()

const animate = (sceneUpdate: (clock: THREE.Clock) => void) => {
    requestAnimationFrame(() => animate(sceneUpdate))
    // controls.update(clock.getDelta());
    controls.update()
    composedRenderer.render();
    stats.update();
    updateStatsDisplay()
    sceneUpdate(clock);
}

constructInitialScene(scene).then(sceneUpdate => animate(sceneUpdate));