import { Bone, Euler, Group, Scene, Skeleton, SkeletonHelper, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

interface StoredBoneState {
    rotation: Euler,
    position: Vector3
}

const recursiveHierarchy = (bone: Bone): {[name: string]: Object | null} | null => {
    if(bone.children.length === 0) {
        return null;
    }

    let children: {[name: string]: Object | null} = {};

    bone.children.forEach(child => {
        children[child.name] = recursiveHierarchy(child as Bone);
    });

    return children;
}

class SkeletalModel {
    model: Group
    skinned_mesh: SkinnedMesh
    skeleton: Skeleton
    bone_map: {[name: string]: number}
    skeleton_helper: SkeletonHelper
    stored_skeleton_positions: {[name: string]: {[bone: string]: StoredBoneState}}

    public static async createSkeletalModel(file_location: string): Promise<SkeletalModel> {
        const gltf = await new GLTFLoader().loadAsync(file_location);
        console.log(gltf)
        const model = gltf.scene;

        let skinned_mesh: SkinnedMesh | null = null;

        model.traverse(child => {
            // @ts-ignore
            if(child.isSkinnedMesh) {
                skinned_mesh = child as SkinnedMesh;
            }
        });

        if(skinned_mesh == null) {
            return Promise.reject("Mesh is not skinned");
        }

        skinned_mesh = skinned_mesh as SkinnedMesh;
        return new SkeletalModel(model, skinned_mesh)
    }

    private constructor(model: Group, skinned_mesh: SkinnedMesh) {
        this.model = model;
        this.skinned_mesh = skinned_mesh
        this.skeleton = skinned_mesh.skeleton;
        this.bone_map = this.skeleton.bones.reduce((store: {[name: string]: number}, bone, idx) => (store[bone.name] = idx, store), {});
        this.skeleton_helper = new SkeletonHelper(this.model);
        this.stored_skeleton_positions = {};

        let defaultBoneStates: {[bone: string]: StoredBoneState} = {};

        this.getBoneNames().forEach(bone_name => {
            const bone = this.skeleton.bones[this.bone_map[bone_name]];
            defaultBoneStates[bone_name] = {
                rotation: bone.rotation,
                position: bone.position
            }
        });

        this.stored_skeleton_positions["default"] = defaultBoneStates;
    }

    addToScene(scene: Scene): void {
        scene.add(this.model);
        scene.add(this.skeleton_helper);
    }

    setSkeletonVisible(visible: boolean): void {
        this.skeleton_helper.visible = visible;
    }

    getBoneNames(): string[] {
        return Object.keys(this.bone_map);
    }

    getCurrentState() {
        return Object.keys(this.bone_map).reduce((dict: {[bone: string]: StoredBoneState}, name) => {
            const bone = this.skeleton.bones[this.bone_map[name]];

            dict[name] = {
                rotation: bone.rotation,
                position: bone.position
            }

            return dict
        }, {})
    }

    saveState(name: string, state: {[bone: string]: StoredBoneState}): void {
        this.stored_skeleton_positions[name] = state;
    }

    loadState(name: string): void {
        const state = this.stored_skeleton_positions[name];
        Object.keys(state).forEach(bone_name => {
            const rot = state[bone_name].rotation;
            const pos = state[bone_name].position;
            this.skeleton.bones[this.bone_map[bone_name]].rotation.set(rot.x, rot.y, rot.z, rot.order);
            this.skeleton.bones[this.bone_map[bone_name]].position.set(pos.x, pos.y, pos.z);
        })
    }

    getBone(bone_name: string): Bone {
        return this.skeleton.bones[this.bone_map[bone_name]];
    }

    getSkeletonHierarchy() {
        const root = this.skeleton.bones[0];
        return {[root.name]: recursiveHierarchy(root)};
    }

}

export { SkeletalModel };
