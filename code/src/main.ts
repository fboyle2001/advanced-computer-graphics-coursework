import * as THREE from 'three';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { createBikeShed, createClassroom, createCorridor, createPond, createRiggedHumanoid, createSportsField, createSportsHall, createTrampoline, createTreeMaker } from './utils/model_store';
import { ComponentRegister } from './utils/registerable';
import { BoxGeometry, Group, PlaneGeometry, Vector3 } from 'three';
import { ModelLoader } from './utils/model_loader';
import { setVisualQualityDefaults, defaultVisualSettings as visualSettings, setupVisualQualityEvents } from './utils/visual_quality';

const offset = (): number => Math.round(Math.random() * 1e4) / 1e6;

/* BASIC MATERIALS */
const purpleMaterial = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
const brownMaterial = new THREE.MeshBasicMaterial({ color: 0x9e9378, side: THREE.DoubleSide });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x268cab, side: THREE.DoubleSide });
const redMaterial = new THREE.MeshBasicMaterial({ color: 0x910c00, side: THREE.DoubleSide });
const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x239140, side: THREE.DoubleSide });

const composedRenderer = new EffectComposer(renderer);
const primaryRenderPass = new RenderPass(scene, camera);
composedRenderer.addPass(primaryRenderPass);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    primaryRenderPass.camera = camera;
    primaryRenderPass.scene = scene;
}, false);

const getParametricLevels = () => {
    let levels: {[distance: number]: number} = {};

    for(const key of Object.keys(visualSettings.levelsOfDetail)) {
        const { distance, samples } = visualSettings.levelsOfDetail[key as keyof typeof visualSettings.levelsOfDetail];
        levels[distance] = samples;
    }

    return levels;
}

const parametricLODLevels = getParametricLevels();
const registeredComponents = new ComponentRegister(parametricLODLevels);

setupVisualQualityEvents(registeredComponents, camera, composedRenderer, scene);

const updateLevelsOfDetail = (
    low: {distance: number, samples: number},
    medium: {distance: number, samples: number},
    high: {distance: number, samples: number}
) => {
    visualSettings.levelsOfDetail.low = low;
    visualSettings.levelsOfDetail.medium = medium;
    visualSettings.levelsOfDetail.high = high;
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

    const treeBillboardTexture = new THREE.TextureLoader().load("/textures/tree_billboard.png");
    treeBillboardTexture.encoding =THREE.sRGBEncoding;

    const treeBillboardMaterial = new THREE.MeshBasicMaterial({
        map: treeBillboardTexture,
        transparent: true,
        depthTest: true,
        side: THREE.DoubleSide
    });

    // RIGGED MODELS

    const [treeMakerOwner, createNewTree] = await createTreeMaker(treeBillboardMaterial);
    const riggedHumanMaker = await createRiggedHumanoid();
    registeredComponents.addComponents({ qcAnimatedModels: [treeMakerOwner, riggedHumanMaker] });

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

    /** START OF BIKE SHEDS */
    const bikeShedPlane = new THREE.Mesh(new BoxGeometry(7.8, 0.6, 30), bikeShedPavementMaterial);
    bikeShedPlane.position.add(new Vector3(3.9, 0.3 - offset(), 15));
    scene.add(bikeShedPlane);

    const bikeShedBarrier = new THREE.Mesh(new BoxGeometry(0.2, 0.6, 30), brownMaterial);
    bikeShedBarrier.position.add(new Vector3(7.9, 0.3 - offset(), 15));
    scene.add(bikeShedBarrier);

    const bikeShedCount = 3;

    for(let i = 0; i < bikeShedCount; i++) {
        const [bikeShed, registerable] = createBikeShed(visualSettings.fixedSurfaceSamples, woodenPanelMaterial, brownMaterial, purpleMaterial);
        let size = new Vector3();
        new THREE.Box3().setFromObject(bikeShed).getSize(size);
        bikeShed.position.add(new Vector3(0, 0.6 + offset(), (size.z + 0.2) * i));
        registeredComponents.addComponents(registerable);
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
    carParkTreePlane.position.set(48, offset(), 15);

    const carParkTreeGroup = new THREE.Group();
    carParkTreeGroup.rotation.x = Math.PI / 2;
    carParkTreeGroup.position.set(-5, 10, 7);

    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 3; j++) {
            const [treeLod, treeLodComponents] = createNewTree();
            registeredComponents.addComponents(treeLodComponents);
            treeLod.position.set(10 * i, 0, 10 * j);
            treeLod.rotation.set(0, -Math.PI / 2, 0);
            treeLod.scale.set(2, 2, 2);
            carParkTreeGroup.add(treeLod);
        }
    }

    carParkTreePlane.add(carParkTreeGroup);
    scene.add(carParkTreePlane);

    const longCarParkTreePlane = new THREE.Mesh(new PlaneGeometry(20, 240), greenMaterial);
    longCarParkTreePlane.rotation.x = -Math.PI / 2;
    longCarParkTreePlane.position.set(-10, offset(), 120)

    const longCarParkTreeGroup = new THREE.Group();
    longCarParkTreeGroup.rotation.x = Math.PI / 2;
    longCarParkTreeGroup.position.set(-5, 115, 7);

    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 24; j++) {
            const [treeLod, treeLodComponents] = createNewTree();
            registeredComponents.addComponents(treeLodComponents);
            treeLod.position.set(10 * i, 0, 10 * j);
            treeLod.rotation.set(0, -Math.PI / 2, 0);
            treeLod.scale.set(2, 2, 2);
            longCarParkTreeGroup.add(treeLod);
        }
    }

    for(let j = 0; j < 23; j++) {
        const [treeLod, treeLodComponents] = createNewTree();
        registeredComponents.addComponents(treeLodComponents);
        treeLod.position.set(5, -2, 5 + 10 * j);
        treeLod.rotation.set(0, -Math.PI / 2, 0);
        treeLod.scale.set(1.2, 1.2, 1.2);
        longCarParkTreeGroup.add(treeLod);
    }

    longCarParkTreePlane.add(longCarParkTreeGroup);
    scene.add(longCarParkTreePlane)

    /** END OF CAR PARK */

    /** START OF ENTRANCE */

    const entrancePlane = new THREE.Mesh(new PlaneGeometry(5.5, 30), purpleMaterial);
    entrancePlane.rotation.x = -Math.PI / 2;
    entrancePlane.position.set(31.25, -offset(), 45);
    scene.add(entrancePlane);

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
    sportsHallBuilding.scale.set(1.474, 1, 1)
    scene.add(sportsHallBuilding);

    const trampolineGroup = new Group();
    const [trampoline, trampolineComponents, trampolineUpdate] = await createTrampoline(gridMaterial);
    registeredComponents.addComponents(trampolineComponents);

    trampolineGroup.add(trampoline);
    trampolineGroup.scale.set(1.25, 1.25, 1.25);
    trampolineGroup.position.set(3.4, 0, -18);

    const trampolinePeopleGroup = new Group();

    const topLeftTrampolineHuman = riggedHumanMaker.spawnObject();
    topLeftTrampolineHuman.position.set(1.875 + 0.25, 0.78, 1.875 + 0.25);
    trampolinePeopleGroup.add(topLeftTrampolineHuman);

    const bottomLeftTrampolineHuman = riggedHumanMaker.spawnObject();
    bottomLeftTrampolineHuman.position.set(1.875 + 0.25, 0.78, 5.625 + 0.25);
    trampolinePeopleGroup.add(bottomLeftTrampolineHuman);

    const bottomRightTrampolineHuman = riggedHumanMaker.spawnObject();
    bottomRightTrampolineHuman.position.set(5.625 + 0.25, 0.78, 5.625 + 0.25);
    trampolinePeopleGroup.add(bottomRightTrampolineHuman);

    const topRightTrampolineHuman = riggedHumanMaker.spawnObject();
    topRightTrampolineHuman.position.set(5.625 + 0.25, 0.78, 1.875 + 0.25);
    trampolinePeopleGroup.add(topRightTrampolineHuman);

    for(let i = 0; i < 4; i++) {
        riggedHumanMaker.selectAnimation(i, `bounce${i}`)
    }

    const calculateHumanHeight = (elapsed: number, offset: number): number => (0.78 - 0.2) + Math.abs(Math.cos((Math.PI / 2) * (elapsed + offset)));
    const updateHumanTrampolineHeight = (clock: THREE.Clock) => {
        for(let i = 0; i < 4; i++) {
            const x = trampolinePeopleGroup.children[i].position.x;
            const y = calculateHumanHeight(clock.getElapsedTime(), i / 4);
            const z = trampolinePeopleGroup.children[i].position.z;
            trampolinePeopleGroup.children[i].position.set(x, y, z);
        }
    }

    trampolineGroup.add(trampolinePeopleGroup);
    trampolineGroup.scale.set(2 / 1.474, 2, 2);

    const stretchingPeopleGroup = new Group();

    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            const person = riggedHumanMaker.spawnObject();
            riggedHumanMaker.selectAnimation(4 + i * 2 + j, "stretch");
            person.position.set(8 * i, 0, 2 * j)
            person.rotateY(((-1) ** i) * Math.PI / 2)
            stretchingPeopleGroup.add(person);
        }
    }

    stretchingPeopleGroup.scale.set(2 / 1.474, 2, 2);
    stretchingPeopleGroup.position.set(3.4, 0, -26);

    sportsHallBuilding.add(trampolineGroup)
    sportsHallBuilding.add(stretchingPeopleGroup);

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

    /** START OF OUTSIDE FIELD */

    const outsideFieldPath = new THREE.Mesh(new PlaneGeometry(20, 110), redMaterial);
    outsideFieldPath.position.set(10, -offset(), 60 + 110/2);
    outsideFieldPath.rotation.x = -Math.PI / 2;
    scene.add(outsideFieldPath);

    const [outsideFieldSurface, outsideFieldComponents, outsideFieldUpdate] = createSportsField(gridMaterial);
    registeredComponents.addComponents(outsideFieldComponents);
    outsideFieldSurface.position.set(0, -offset(), 170);
    scene.add(outsideFieldSurface);

    /** END OF OUTSIDE FIELD */

    // INITIAL QUALITY SETTINGS
    setVisualQualityDefaults(registeredComponents, camera, composedRenderer, scene);

    return (clock: THREE.Clock) => {
        registeredComponents.updateAll(clock, camera);
        trampolineUpdate(clock.getElapsedTime())
        pondUpdate(clock.getElapsedTime());
        outsideFieldUpdate(clock.getElapsedTime());
        updateHumanTrampolineHeight(clock);
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