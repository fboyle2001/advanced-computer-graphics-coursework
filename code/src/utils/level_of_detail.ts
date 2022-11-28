import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

interface LevelOfDetailConfiguration {
    distances: { [distance: string]: number },
    modelFolder: string,
    modelName: string
}

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

const createLevelOfDetail = (config: LevelOfDetailConfiguration, postLoad?: (model: THREE.Group) => void): THREE.LOD => {
    // Requires GLTF model
    const lod = new THREE.LOD();
    const postLoadDefaulted = postLoad ?? defaultPostLoad;

    Object.keys(config.distances).forEach(key => {
        const distance = config.distances[key];
        const tableLoader = new GLTFLoader();

        tableLoader.load(`${config.modelFolder}${key}/${config.modelName}`, (gltf) => {
            const model = gltf.scene;
            postLoadDefaulted(model);
            lod.addLevel(model, distance);
        }, undefined, console.error);
    });

    return lod;
}

export { createLevelOfDetail };