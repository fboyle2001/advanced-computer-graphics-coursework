import * as THREE from 'three';
import { renderer, scene, camera, controls, stats, updateStatsDisplay } from './utils/three_setup';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { createBikeShed, createClassroom, createCorridor, createPond, createRiggedHumanoid, createSportsField, createSportsHall, createTrampoline, createTreeMaker } from './utils/model_store';
import { ComponentRegister } from './utils/registerable';
import { BoxGeometry, Group, PlaneGeometry, Vector3 } from 'three';
import { ModelLoader } from './utils/model_loader';
import { setVisualQualityDefaults, defaultVisualSettings as visualSettings, setupVisualQualityEvents, dynamicQualityControl } from './utils/visual_quality';
import { NURBSSurface } from './utils/parametric_surfaces';

const offset = (): number => Math.round(Math.random() * 1e4) / 1e6;

/* BASIC MATERIALS */
const purpleMaterial = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
const brownMaterial = new THREE.MeshBasicMaterial({ color: 0x9d7c5d, side: THREE.DoubleSide });
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x268cab, side: THREE.DoubleSide });
const redMaterial = new THREE.MeshBasicMaterial({ color: 0x910c00, side: THREE.DoubleSide });
const greyMaterial = new THREE.MeshBasicMaterial({ color: 0x404040, side: THREE.DoubleSide });
const lightGreyMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide });
const wireframeMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide, wireframe: true });

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

const constructInitialScene = async (scene: THREE.Scene): Promise<(clock: THREE.Clock) => void> => {
    const gridMap = new THREE.TextureLoader().load("https://threejs.org/examples/textures/uv_grid_opengl.jpg");
    gridMap.wrapS = gridMap.wrapT = THREE.RepeatWrapping;
    gridMap.anisotropy = 16;

    const gridMaterial = new THREE.MeshStandardMaterial({
        map: gridMap,
        side: THREE.DoubleSide
    });

    const woodenPanelMap = new THREE.TextureLoader().load("/textures/wooden_shed.png");
    woodenPanelMap.wrapS = woodenPanelMap.wrapT = THREE.RepeatWrapping;
    woodenPanelMap.anisotropy = 16;

    const woodenPanelMaterial = new THREE.MeshStandardMaterial({
        map: woodenPanelMap,
        side: THREE.DoubleSide
    });

    const carParkMap = new THREE.TextureLoader().load("/textures/car_park.png");
    carParkMap.wrapS = carParkMap.wrapT = THREE.RepeatWrapping;
    carParkMap.anisotropy = 16;

    const carParkMaterial = new THREE.MeshStandardMaterial({
        map: carParkMap,
        side: THREE.DoubleSide
    });

    const bikeShedPavementMap = new THREE.TextureLoader().load("/textures/bike_shed.png");
    bikeShedPavementMap.wrapS = bikeShedPavementMap.wrapT = THREE.RepeatWrapping;
    bikeShedPavementMap.repeat.set(1, 8)
    bikeShedPavementMap.anisotropy = 16;

    const bikeShedPavementMaterial = new THREE.MeshStandardMaterial({
        map: bikeShedPavementMap,
        side: THREE.DoubleSide
    });

    const classroomRoofMap = new THREE.TextureLoader().load("/textures/classroom_roof.jpg");
    classroomRoofMap.wrapS = classroomRoofMap.wrapT = THREE.RepeatWrapping;
    classroomRoofMap.repeat.set(1, 8)
    classroomRoofMap.anisotropy = 16;

    const classroomRoofMaterial = new THREE.MeshStandardMaterial({
        map: classroomRoofMap,
        side: THREE.DoubleSide
    });

    const classroomRoofRotatedMap = classroomRoofMap.clone()
    classroomRoofRotatedMap.rotation = Math.PI / 2;

    const classroomRoofRotatedMaterial = new THREE.MeshStandardMaterial({
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

    const grassMap = new THREE.TextureLoader().load("/textures/grass.jpg");
    grassMap.wrapS = grassMap.wrapT = THREE.RepeatWrapping;
    grassMap.repeat.set(8, 8)
    grassMap.anisotropy = 16;

    const grassTexture = new THREE.MeshStandardMaterial({
        map: grassMap,
        side: THREE.DoubleSide
    });

    const dirtMap = new THREE.TextureLoader().load("/textures/dirt.jpg");
    dirtMap.wrapS = dirtMap.wrapT = THREE.RepeatWrapping;
    dirtMap.repeat.set(8, 8)
    dirtMap.anisotropy = 16;

    const dirtTexture = new THREE.MeshStandardMaterial({
        map: dirtMap,
        side: THREE.DoubleSide
    });

    const longDirtMap = dirtMap.clone();
    longDirtMap.repeat.set(16, 64);

    const dirtTextureLong = new THREE.MeshStandardMaterial({
        map: longDirtMap,
        side: THREE.DoubleSide
    });

    const roadMap = new THREE.TextureLoader().load("/textures/road.png");
    roadMap.wrapS = roadMap.wrapT = THREE.RepeatWrapping;
    roadMap.repeat.set(8, 1)
    roadMap.anisotropy = 16;

    const roadTexture = new THREE.MeshStandardMaterial({
        map: roadMap,
        side: THREE.DoubleSide
    });

    const waterMap = new THREE.TextureLoader().load("/textures/water.jpg");
    waterMap.wrapS = waterMap.wrapT = THREE.RepeatWrapping;
    waterMap.repeat.set(8, 8)
    waterMap.anisotropy = 16;
    waterMap.encoding = THREE.sRGBEncoding;

    const waterTexture = new THREE.MeshStandardMaterial({
        map: waterMap,
        side: THREE.DoubleSide
    });

    const trampolineMap = new THREE.TextureLoader().load("/textures/trampoline.jpg");
    trampolineMap.wrapS = trampolineMap.wrapT = THREE.RepeatWrapping;
    trampolineMap.repeat.set(2, 2)
    trampolineMap.anisotropy = 16;
    trampolineMap.encoding = THREE.sRGBEncoding;

    const trampolineTexture = new THREE.MeshStandardMaterial({
        map: trampolineMap,
        side: THREE.DoubleSide
    });

    const gravelMap = new THREE.TextureLoader().load("/textures/gravel.jpg");
    gravelMap.wrapS = gravelMap.wrapT = THREE.RepeatWrapping;
    gravelMap.repeat.set(6, 6)
    gravelMap.anisotropy = 16;
    gravelMap.encoding = THREE.sRGBEncoding;

    const gravelTexture = new THREE.MeshStandardMaterial({
        map: gravelMap,
        side: THREE.DoubleSide
    });

    const longGravelMap = gravelMap.clone();
    longGravelMap.repeat.set(2, 16);

    const gravelTextureLong = new THREE.MeshStandardMaterial({
        map: longGravelMap,
        side: THREE.DoubleSide
    });

    // RIGGED MODELS

    const [treeMakerOwner, createNewTree] = await createTreeMaker(treeBillboardMaterial);
    const riggedHumanMaker = await createRiggedHumanoid();
    registeredComponents.addComponents({ qcAnimatedModels: [treeMakerOwner, riggedHumanMaker] });

    /** START OF OUTSIDE ROAD */

    const outsideRoadPlane = new THREE.Mesh(new PlaneGeometry(200, 15), roadTexture);
    outsideRoadPlane.rotation.x = -Math.PI / 2;
    outsideRoadPlane.position.add(new Vector3(23, -offset(), -10));
    scene.add(outsideRoadPlane);

    const innerJunctionPlane = new THREE.Mesh(new PlaneGeometry(10, 2.5), greyMaterial);
    innerJunctionPlane.rotation.x = -Math.PI / 2;
    innerJunctionPlane.position.add(new Vector3(23, -offset(), -1.25));
    scene.add(innerJunctionPlane);

    const longPavement = new THREE.Mesh(new BoxGeometry(95, 0.6, 2.5), lightGreyMaterial);
    longPavement.position.add(new Vector3(-29.5, 0.3 - offset(), -1.25));
    scene.add(longPavement);

    const reflectedLongPavement = longPavement.clone();
    reflectedLongPavement.position.add(new Vector3(95 + 10, 0, 0));
    scene.add(reflectedLongPavement);

    const otherSideLongPavement = new THREE.Mesh(new BoxGeometry(200, 0.6, 2.5), lightGreyMaterial);
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
        const [bikeShed, registerable] = createBikeShed(visualSettings.fixedSurfaceSamples, classroomRoofMaterial, brownMaterial, woodenPanelMaterial);
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
        if(i % 2 == 1) {
            continue;
        }

        lowPolyCarLoader.addToScene(model => {
            model.scale.set(2, 2, 2);
            model.rotation.set(0, -Math.PI / 2, 0);
            model.position.set(16, offset() + 4e-2, 3 + i * 4.2);
        });
    }

    const carParkPavement = new THREE.Mesh(new BoxGeometry(26.25, 4.0, 2.5), lightGreyMaterial);
    carParkPavement.position.add(new Vector3(13.125, -1.4 - offset(), 31.25));
    scene.add(carParkPavement);

    const carParkTreePlane = new THREE.Mesh(new PlaneGeometry(20, 30), dirtTexture);
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

    const longCarParkTreePlane = new THREE.Mesh(new BoxGeometry(20, 4.0, 240), dirtTextureLong);
    // longCarParkTreePlane.rotation.x = -Math.PI / 2;
    longCarParkTreePlane.position.set(-10, -1.4 - offset(), 120)

    const longCarParkTreeGroup = new THREE.Group();
    // longCarParkTreeGroup.rotation.x = Math.PI / 2;
    longCarParkTreeGroup.position.set(-5, 8, -115);

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

    for(let j = 0; j < 18; j++) {
        const [treeLod, treeLodComponents] = createNewTree();
        registeredComponents.addComponents(treeLodComponents);
        treeLod.position.set(5, -2, 5 + 12 * j);
        treeLod.rotation.set(0, -Math.PI / 2, 0);
        treeLod.scale.set(1.2, 1.2, 1.2);
        longCarParkTreeGroup.add(treeLod);
    }

    longCarParkTreePlane.add(longCarParkTreeGroup);
    scene.add(longCarParkTreePlane)

    /** END OF CAR PARK */

    /** START OF ENTRANCE */

    const entrancePlane = new THREE.Mesh(new PlaneGeometry(5.5, 30), greyMaterial);
    entrancePlane.rotation.x = -Math.PI / 2;
    entrancePlane.position.set(31.25, -offset(), 45);
    scene.add(entrancePlane);

    const entrancePavement = new THREE.Mesh(new BoxGeometry(2.5, 4.0, 30), lightGreyMaterial);
    entrancePavement.position.add(new Vector3(27.5, -1.4 - offset(), 45));
    scene.add(entrancePavement);

    /** END OF ENTRANCE */

    /** START OF PLAYGROUND */

    const playgroundPlane = new THREE.Mesh(new PlaneGeometry(40, 40), gravelTexture);
    playgroundPlane.rotation.x = -Math.PI / 2;
    playgroundPlane.position.set(40, -offset(), 80);
    scene.add(playgroundPlane);

    /** END OF PLAYGROUND */

    /** START OF CLASSROOMS */

    const [classroomOne, classroomOneComponents] = await createClassroom(blueMaterial, classroomRoofMaterial, true);
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

    const [corridor, corridorComponents] = await createCorridor(classroomRoofMaterial);
    registeredComponents.addComponents(corridorComponents);
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
    const [trampoline, trampolineComponents, trampolineUpdate] = await createTrampoline(trampolineTexture);
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
            person.position.set(8 * i, offset(), 2 * j)
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

    const [pond, pondComponents, pondUpdate] = createPond(waterTexture);
    pond.position.add(new Vector3(0, -0.4 + offset(), 32.5))
    registeredComponents.addComponents(pondComponents)
    scene.add(pond);

    const pondPavement = new THREE.Mesh(new BoxGeometry(26.25, 4.0, 2.5), lightGreyMaterial);
    pondPavement.position.add(new Vector3(13.125, -1.4 - offset(), 60 - 1.25));
    scene.add(pondPavement); 

    /** END OF POND */

    /** START OF OUTSIDE FIELD */

    const outsideFieldPath = new THREE.Mesh(new PlaneGeometry(20, 110), gravelTextureLong);
    outsideFieldPath.position.set(10, -offset(), 60 + 110/2);
    outsideFieldPath.rotation.x = -Math.PI / 2;
    scene.add(outsideFieldPath);

    const [outsideFieldSurface, outsideFieldComponents, outsideFieldUpdate] = createSportsField(grassTexture);
    registeredComponents.addComponents(outsideFieldComponents);
    outsideFieldSurface.position.set(0, -offset(), 170);
    scene.add(outsideFieldSurface);

    /** END OF OUTSIDE FIELD */

    let earthquake = false;

    // EARTHQUAKE SETUP
    document.getElementById("earthquake_on")?.addEventListener("click", (event) => {
        earthquake = !earthquake;
    });

    const earthquakeApplier = (elapsed: number, delta: number) => {
        registeredComponents.fixedSurfaces.forEach(surface => {
            if(surface instanceof NURBSSurface) {
                const surfaceSize = Math.max(surface.control_points[surface.m - 1][surface.n - 1].x, surface.control_points[surface.m - 1][surface.n - 1].z);
                
                for(let i = 0; i < surface.m; i++) {
                    for(let j = 0; j < surface.n; j++) {
                        const oldPoint = surface.control_points[i][j];
                        surface.updateControlPoint(i, j, new Vector3(oldPoint.x, (surfaceSize ** 0.5) * Math.random(), oldPoint.z))
                    }
                }
            } 
        })
    }

    // INITIAL QUALITY SETTINGS
    setVisualQualityDefaults(registeredComponents, camera, composedRenderer, scene);

    return (clock: THREE.Clock) => {
        const delta = clock.getDelta();

        registeredComponents.updateAll(clock, camera);
        if(earthquake) {
            earthquakeApplier(clock.getElapsedTime(), delta);
        } else {
            trampolineUpdate(clock.getElapsedTime())
            pondUpdate(clock.getElapsedTime());
            outsideFieldUpdate(clock.getElapsedTime());
        }

        updateHumanTrampolineHeight(clock);
        dynamicQualityControl(registeredComponents, camera, composedRenderer, scene, delta, clock.getElapsedTime());
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