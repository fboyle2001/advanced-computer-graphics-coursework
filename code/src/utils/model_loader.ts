import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// Ensures the models are loaded correctly when they are added to the scene
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

// Abstracts away the code required to load a model
// Handles GLTF and GLB files
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
        
        // Load without blocking
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

    // Often necessary due to issues with cloning before objects are fully loaded
    async loadAndBlock(): Promise<THREE.Group> {
        if(this.loaded) {
            console.log("already")
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

        // If we tried to add to the scene before it was loaded the calls are buffered
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

    // Adds the model to scene, safer than accessing the model directly
    // Ensures the model is loaded
    addToScene(postAdd: (model: THREE.Group) => void): void {
        if(!this.loaded || !this.object) {
            this.load_positions.push(postAdd);
            return;
        }

        const instance = this.object.clone();
        this.scene?.add(instance);
        postAdd(instance);
    }
}

export { ModelLoader };