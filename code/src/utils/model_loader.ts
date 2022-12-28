import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const defaultPostLoad = (model: THREE.Group): void => {
    model.traverse(child => {
        // @ts-ignore
        if ( child.material ) child.material.metalness = 0;

        // @ts-ignore
        if(child.isMesh) {
            const wireframe = false;
            // @ts-ignore
            child.material.wireframe=wireframe;
        }
    });
}

class ModelLoader {
    scene: THREE.Scene | null;
    loaded: boolean;
    object: THREE.Group | undefined;
    file_location: string;
    load_positions: ((model: THREE.Group) => void)[];
    type: string;
    postLoad: (model: THREE.Group) => void;

    constructor(scene: THREE.Scene | null, file_location: string, postLoad?: (model: THREE.Group) => void) {
        this.scene = scene;
        this.postLoad = postLoad ?? defaultPostLoad;
        this.loaded = false;
        this.object = undefined;
        this.file_location = file_location;
        this.load_positions = [];

        const splitType = file_location.split(".");
        const type = splitType[splitType.length - 1].toLowerCase();

        this.type = type;
    }

    load(): void {
        if(this.loaded) {
            return;
        }

        switch(this.type) {
            case "glb":
            case "gltf":
                new GLTFLoader().load(this.file_location, (gltf) => {
                    this.object = gltf.scene;
                    this.postLoad(this.object);

                    this.load_positions.forEach(callback => {
                        if(!this.object) {
                            return;
                        }

                        const instance = this.object.clone();
                        this.scene?.add(instance);
                        callback(instance);
                    });
                }, undefined, console.error);
        }

        this.loaded = true;
    }

    async loadAndBlock(): Promise<THREE.Group> {
        if(this.loaded) {
            return new Promise<THREE.Group>(() => this.object);
        }

        let model;

        switch(this.type) {
            case "glb":
            case "gltf":
                const gltf = await new GLTFLoader().loadAsync(this.file_location);
                model = gltf.scene;
        }

        if(!model) {
            throw new Error("Unable to load model");
        }

        this.postLoad(model);
        this.object = model;

        this.load_positions.forEach(callback => {
            if(!this.object) {
                return;
            }

            const instance = this.object.clone();
            this.scene?.add(instance);
            callback(instance);
        });

        this.loaded = true;
        return model;
    }

    addToScene(postAdd: (model: THREE.Group) => void): void {
        if(!this.loaded || !this.object) {
            this.load_positions.push(postAdd);
            return;
        }

        const instance = this.object.clone();
        this.scene?.add(instance);
        postAdd(instance);
    }

    addToSceneSynchronous() {
        if(!this.loaded) {
            throw new Error("Model needs to be loaded first");
        }
    }
}

export { ModelLoader };