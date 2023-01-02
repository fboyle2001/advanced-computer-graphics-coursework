import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Object definition for level of detail settings
interface LevelOfDetailConfiguration {
    distances: { [distance: string]: number },
    modelFolder: string,
    modelName: string
}

// Ensures the models are loaded correctly when they are added to the scene
const defaultPostLoad = (model: THREE.Group): void => {
    model.traverse(child => {
        // @ts-ignore
        if ( child.material ) child.material.metalness = 0;

        // @ts-ignore
        if(child.isMesh) {
            const wireframe=false;
            // @ts-ignore
            child.material.wireframe = wireframe;
        }
    });
}

// Creates a new LoD object using models stored in a correctly structured hierarchy
const createLevelOfDetail = async (config: LevelOfDetailConfiguration, postLoad?: (model: THREE.Group) => void): Promise<THREE.LOD> => {
    // Requires GLTF model
    const lod = new THREE.LOD();
    const postLoadDefaulted = postLoad ?? defaultPostLoad;

    for(const key of Object.keys(config.distances)) {
        const distance = config.distances[key];
        const loader = new GLTFLoader();

        const gltf = await loader.loadAsync(`${config.modelFolder}${key}/${config.modelName}`);
        postLoadDefaulted(gltf.scene);
        lod.addLevel(gltf.scene, distance);
    }

    // Have to block (async/await) due to issues with cloning
    return lod;
}



export { createLevelOfDetail };