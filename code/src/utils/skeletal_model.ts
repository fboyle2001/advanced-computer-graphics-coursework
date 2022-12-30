import { Bone, Euler, Group, Scene, Skeleton, SkeletonHelper, SkinnedMesh, Vector3, Clock, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { CCDIKSolver, IKS } from "three/examples/jsm/animation/CCDIKSolver";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils";

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
        this.bone_map = this.skinned_mesh.skeleton.bones.reduce((store: {[name: string]: number}, bone, idx) => (store[bone.name] = idx, store), {});
        this.skeleton_helper = new SkeletonHelper(this.model);
        this.stored_skeleton_positions = {};

        let defaultBoneStates: {[bone: string]: StoredBoneState} = {};

        this.getBoneNames().forEach(bone_name => {
            const bone = this.skinned_mesh.skeleton.bones[this.bone_map[bone_name]];
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
            const bone = this.skinned_mesh.skeleton.bones[this.bone_map[name]];

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
            this.skinned_mesh.skeleton.bones[this.bone_map[bone_name]].rotation.set(rot.x, rot.y, rot.z, rot.order);
            this.skinned_mesh.skeleton.bones[this.bone_map[bone_name]].position.set(pos.x, pos.y, pos.z);
        })
    }

    getBone(bone_name: string): Bone {
        return this.skinned_mesh.skeleton.bones[this.bone_map[bone_name]];
    }

    getSkeletonHierarchy() {
        const root = this.skinned_mesh.skeleton.bones[0];
        return {[root.name]: recursiveHierarchy(root)};
    }

}

interface SingleInverseKinematicSetup {
    boneIndex: number,
    target: (clock: Clock) => Vector3
}

abstract class QCAnimatedModel {
    abstract setAnimationLevel(level: string): void;
    abstract updateAll(clock: Clock): void;
}

class SharedInverseAnimatedModel extends QCAnimatedModel {
    baseSkeletal: SkeletalModel;
    ikTarget: SingleInverseKinematicSetup;
    animationLevels: {[level: string]: IKS};
    ikSolvers: CCDIKSolver[];
    skinnedMeshes: SkinnedMesh[];
    currentAnimationLevel: string;
    baseObject!: Group;

    constructor(skeletal: SkeletalModel, ikTarget: SingleInverseKinematicSetup, animationLevels: {[level: string]: IKS}, defaultAnimationLevel: string) {
        super();
        this.baseSkeletal = skeletal;
        this.ikTarget = ikTarget;
        this.animationLevels = animationLevels;
        this.ikSolvers = [];
        this.skinnedMeshes = [];
        this.currentAnimationLevel = defaultAnimationLevel;
        this._createBaseObject();
    }

    _createBaseObject = () => {
        const object = new Group();
        
        object.add(this.baseSkeletal.model);
        object.add(this.baseSkeletal.skinned_mesh);

        this.baseObject = object;
    }

    spawnObject = (): Object3D => {
        const object = SkeletonUtils.clone(this.baseObject);
        let skinnedMesh: SkinnedMesh;

        object.children.forEach(child => {
            // @ts-ignore
            if(child.isSkinnedMesh) {
                skinnedMesh = child as SkinnedMesh;
            }
        });

        this.skinnedMeshes.push(skinnedMesh!);
        this.ikSolvers.push(new CCDIKSolver(skinnedMesh!, [this.animationLevels[this.currentAnimationLevel]]));

        return object;
    }

    setAnimationLevel = (animationLevel: string) => {
        let newSolvers: CCDIKSolver[] = [];
        this.skinnedMeshes.forEach(skinnedMesh => newSolvers.push(new CCDIKSolver(skinnedMesh, [this.animationLevels[animationLevel]])))
        this.ikSolvers = newSolvers;
    }

    updateAll = (clock: Clock) => {
        const targetVector = this.ikTarget.target(clock);
        
        for(let i = 0; i < this.skinnedMeshes.length; i++) {
            if(!this.skinnedMeshes[i].visible) {
                continue;
            }

            this.skinnedMeshes[i].skeleton.bones[this.ikTarget.boneIndex].position.copy(targetVector);
            this.ikSolvers[i].update();
        }
    }

}

class ForwardAnimatedModel extends QCAnimatedModel {
    baseSkeletal: SkeletalModel;
    animationLevels: {[level: string]: {}};
    skinnedMeshes: SkinnedMesh[];
    currentAnimationLevel: string;
    baseObject!: Group;
    initialPoses: {[name: string]: (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel) => void};
    animations: {[name: string]: (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel, clock: Clock) => void}
    selectedAnimations: string[];

    constructor(skeletal: SkeletalModel, animationLevels: {[level: string]: {}}, defaultAnimationLevel: string) {
        super();
        this.baseSkeletal = skeletal;
        this.animationLevels = animationLevels;
        this.skinnedMeshes = [];
        this.currentAnimationLevel = defaultAnimationLevel;
        this.animations = {
            "disabled": (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel, clock: Clock) => {}
        };
        this.selectedAnimations = [];
        this.initialPoses = {
            "disabled": (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel) => {}
        };
        this._createBaseObject();
    }

    addAnimation = (
        name: string, 
        initialPose: (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel) => void, 
        animationLoop: (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel, clock: Clock) => void
    ): void => {
        this.initialPoses[name] = initialPose;
        this.animations[name] = animationLoop;
    }

    setAnimationLevel(level: string): void {
        
    }

    _createBaseObject = () => {
        const object = new Group();
        
        object.add(this.baseSkeletal.model);
        object.add(this.baseSkeletal.skinned_mesh);

        this.baseObject = object;
    }

    spawnObject = (): Object3D => {
        const object = SkeletonUtils.clone(this.baseObject);
        let skinnedMesh: SkinnedMesh;

        object.children.forEach(child => {
            // @ts-ignore
            if(child.isSkinnedMesh) {
                skinnedMesh = child as SkinnedMesh;
            }
        });

        object.add(SkeletonUtils.getHelperFromSkeleton(skinnedMesh!.skeleton));

        this.skinnedMeshes.push(skinnedMesh!);
        this.selectedAnimations.push("disabled");

        return object;
    }

    selectAnimation = (idx: number, animationName: string) => {
        this.initialPoses[animationName](this.skinnedMeshes[idx], this.baseSkeletal);
        this.selectedAnimations[idx] = animationName;
    }

    updateAll = (clock: Clock): void => {
        for(let i = 0; i < this.skinnedMeshes.length; i++) {
            if(!this.skinnedMeshes[i].visible) {
                continue;
            }

            this.animations[this.selectedAnimations[i]](this.skinnedMeshes[i], this.baseSkeletal, clock); 
        }
    }
}

export { SkeletalModel, SharedInverseAnimatedModel, ForwardAnimatedModel, QCAnimatedModel };
