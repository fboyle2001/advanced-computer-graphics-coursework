import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import Stats from 'three/examples/jsm/libs/stats.module';
import { ProgressiveMeshModel } from './progressive_mesh';
import chairModelData from './chair_50.json';

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = Stats();
document.body.appendChild(stats.dom);

const scene = new THREE.Scene()

const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.y = 5;
camera.position.z = 2;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const geometry = new THREE.PlaneGeometry(20, 20);
const material = new THREE.MeshPhongMaterial({ color: 0xEEEADE, side: THREE.DoubleSide });
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// const lampPostLoader = new GLTFLoader();
// lampPostLoader.load("models/custom/lamp_post/Lamp Post Coloured.gltf", (gltf) => {
//     const model = gltf.scene;

//     model.traverse( child => {

//         // @ts-ignore
//         if ( child.material ) child.material.metalness = 0;

//         // @ts-ignore
//         if(child.isMesh) {
//             // @ts-ignore
//             child.material.wireframe=wireframe;
//         }
    
//     } );

//     scene.add(model);
    
// }, undefined, console.error);

const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

window.addEventListener('resize', onWindowResize, false);

// const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
// scene.add(directionalLight);

const skyboxLoader = new THREE.TextureLoader();
const texture = skyboxLoader.load(
    "FS002_Rainy.png", () => {
        const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
        rt.fromEquirectangularTexture(renderer, texture);
        scene.background = rt.texture;
    }
);

const tableLod = new THREE.LOD();
const dists = {
    low: 20,
    medium: 10,
    high: 0
}

Object.keys(dists).forEach(key => {
    const distance: number = (dists as any)[key];

    const tableLoader = new GLTFLoader();
    tableLoader.load(`models/custom/table/${key}/model.gltf`, (gltf) => {
        const model = gltf.scene;

        model.traverse(child => {
            // @ts-ignore
            if ( child.material ) child.material.metalness = 0;

            // @ts-ignore
            if(child.isMesh) {
                const wireframe=false;
                // @ts-ignore
                child.material.wireframe=wireframe;
            }
        });

        tableLod.addLevel(model, distance);
    }, undefined, console.error);
});

scene.add(tableLod)
tableLod.position.set(0, 0, 5)

const chairProgressiveMesh = new ProgressiveMeshModel(chairModelData.vertices, chairModelData.polygons, chairModelData.maximums.vertices, chairModelData.maximums.polygons)

const loader = new THREE.TextureLoader();
// load a resource
const m = loader.load(
    // resource URL
    'models/custom/table/pm_reduced/pexels-fwstudio-129731.jpg',

    // onLoad callback
    function ( texture ) {
        // in this example we create the material when the texture is loaded
        const material = new THREE.MeshBasicMaterial( {
            map: texture,
            side: THREE.DoubleSide
        } );

        scene.add(chairProgressiveMesh.createMesh(material))
        
        const materialTwo = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
        
        const second = chairProgressiveMesh.createMesh(materialTwo)
        scene.add(second)
        second.position.set(1, 0, 0)

        chairProgressiveMesh.simulateNetworkDataArrival(chairModelData.reduction, 50);
    },

    // onProgress callback currently not supported
    undefined,

    // onError callback
    function ( err ) {
        console.error( 'An error happened.' );
    }
);

const updateStatsDisplay = () => {
    if(document.getElementById("polygon_count") !== null) {
        (document.getElementById("polygon_count") as HTMLElement).innerHTML = `${renderer.info.render.triangles}`;
    }

    if(document.getElementById("texture_count") !== null) {
        (document.getElementById("texture_count") as HTMLElement).innerHTML = `${renderer.info.memory.textures}`;
    }

    if(document.getElementById("geometry_count") !== null) {
        (document.getElementById("geometry_count") as HTMLElement).innerHTML = `${renderer.info.memory.geometries}`;
    }
}

const animate = () => {
    requestAnimationFrame(animate)
    controls.update()
    render()
    stats.update();
    updateStatsDisplay()
}

const render = () => {
    renderer.render(scene, camera)
}

animate()