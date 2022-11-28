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
    scene: THREE.Scene;
    loaded: boolean;
    object: THREE.Group | undefined;
    file_location: string;
    load_positions: ((model: THREE.Group) => void)[];
    type: string;
    postLoad: (model: THREE.Group) => void;

    constructor(scene: THREE.Scene, file_location: string, postLoad?: (model: THREE.Group) => void) {
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
            case "gltf":
                new GLTFLoader().load(this.file_location, (gltf) => {
                    this.object = gltf.scene;
                    this.postLoad(this.object);

                    this.load_positions.forEach(callback => {
                        if(!this.object) {
                            return;
                        }

                        const instance = this.object.clone();
                        this.scene.add(instance);
                        callback(instance);
                    });
                }, undefined, console.error);
        }
    }

    addToScene(postAdd: (model: THREE.Group) => void): void {
        if(!this.loaded || !this.object) {
            this.load_positions.push(postAdd);
            return;
        }

        const instance = this.object.clone();
        this.scene.add(instance);
        postAdd(instance);
    }
}

export { ModelLoader };