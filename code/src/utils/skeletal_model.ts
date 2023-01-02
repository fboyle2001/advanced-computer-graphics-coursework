import { Bone, Euler, Group, Scene, SkeletonHelper, SkinnedMesh, Vector3, Clock, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { CCDIKSolver, IKS } from "three/examples/jsm/animation/CCDIKSolver";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils";

// Stores the state of a bone so it can be replicated
interface StoredBoneState {
    rotation: Euler,
    position: Vector3
}

// Extract the bone hierarchy from a rigged model
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

// Makes it easier to manipulate rigged models
class SkeletalModel {
    model: Group
    skinned_mesh: SkinnedMesh
    bone_map: {[name: string]: number}
    skeleton_helper: SkeletonHelper
    stored_skeleton_positions: {[name: string]: {[bone: string]: StoredBoneState}}

    // Load the model and check that it is actually rigged
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
        // Map the names of each bone to indices to make it easier to manipulate the skeleton
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

    // Access a bone by its name rather than its index on the skeleton
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

// Used for both Forward and Inverse Kinematics
abstract class QCAnimatedModel {
    abstract setAnimationLevel(level: string): void;
    abstract updateAll(clock: Clock): void;
}

// Represents an Inverse Kinematic animated model
// Shares the skeletal model to reduce model loading
class InverseAnimatedModel extends QCAnimatedModel {
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

    // Create a new instance of this rigged model
    spawnObject = (): Object3D => {
        const object = SkeletonUtils.clone(this.baseObject);
        let skinnedMesh: SkinnedMesh;

        object.children.forEach(child => {
            // @ts-ignore
            if(child.isSkinnedMesh) {
                skinnedMesh = child as SkinnedMesh;
            }
        });

        // object.add(SkeletonUtils.getHelperFromSkeleton(skinnedMesh!.skeleton));

        // Each one needs its own skinned mesh and IK Solver otherwise we get very strange results!
        this.skinnedMeshes.push(skinnedMesh!);
        this.ikSolvers.push(new CCDIKSolver(skinnedMesh!, [this.animationLevels[this.currentAnimationLevel]]));

        return object;
    }

    // Update the animation quality for each spawned mesh
    setAnimationLevel = (animationLevel: string) => {
        let newSolvers: CCDIKSolver[] = [];
        this.skinnedMeshes.forEach(skinnedMesh => newSolvers.push(new CCDIKSolver(skinnedMesh, [this.animationLevels[animationLevel]])))
        this.ikSolvers = newSolvers;
    }

    // Run every frame to progress the animation
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

// Same as above but for a forward kinematic rigged model
class ForwardAnimatedModel extends QCAnimatedModel {
    baseSkeletal: SkeletalModel;
    animationLevels: {[level: string]: number};
    skinnedMeshes: SkinnedMesh[];
    framesPerUpdate!: number;
    baseObject!: Group;
    initialPoses: {[name: string]: (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel) => void};
    animations: {[name: string]: (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel, clock: Clock) => void}
    selectedAnimations: string[];
    framesSinceLastUpdate: number;

    constructor(skeletal: SkeletalModel, animationLevels: {[level: string]: number}, initialAnimationLevel: string) {
        super();
        this.baseSkeletal = skeletal;
        this.animationLevels = animationLevels;
        this.skinnedMeshes = [];
        // Maintain a list of animations, can quickly toggle between them
        this.animations = {
            "disabled": (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel, clock: Clock) => {}
        };
        this.selectedAnimations = [];
        // Some animations require movement to an initial pose
        this.initialPoses = {
            "disabled": (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel) => {}
        };
        this._createBaseObject();
        this.setAnimationLevel(initialAnimationLevel);
        // Used for animation quality
        this.framesSinceLastUpdate = 0;
    }

    // Create a new animation defintion
    addAnimation = (
        name: string, 
        initialPose: (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel) => void, 
        animationLoop: (skinnedMesh: SkinnedMesh, skeletalModel: SkeletalModel, clock: Clock) => void
    ): void => {
        this.initialPoses[name] = initialPose;
        this.animations[name] = animationLoop;
    }

    // Update quality
    setAnimationLevel(level: string): void {
        this.framesPerUpdate = this.animationLevels[level];
        this.framesSinceLastUpdate = 0;
    }

    _createBaseObject = () => {
        const object = new Group();
        
        object.add(this.baseSkeletal.model);
        object.add(this.baseSkeletal.skinned_mesh);

        this.baseObject = object;
    }

    // Create a new mesh
    spawnObject = (): Object3D => {
        const object = SkeletonUtils.clone(this.baseObject);
        let skinnedMesh: SkinnedMesh;

        object.children.forEach(child => {
            // @ts-ignore
            if(child.isSkinnedMesh) {
                skinnedMesh = child as SkinnedMesh;
            }
        });

        // object.add(SkeletonUtils.getHelperFromSkeleton(skinnedMesh!.skeleton));
        
        // Create a new skinned mesh and start without any animation
        this.skinnedMeshes.push(skinnedMesh!);
        this.selectedAnimations.push("disabled");

        return object;
    }

    // Choose the animation for a spawned mesh
    selectAnimation = (idx: number, animationName: string) => {
        this.initialPoses[animationName](this.skinnedMeshes[idx], this.baseSkeletal);
        this.selectedAnimations[idx] = animationName;
    }

    // Called every frame to step the animation
    updateAll = (clock: Clock): void => {
        if(this.framesSinceLastUpdate !== this.framesPerUpdate - 1) {
            this.framesSinceLastUpdate++;
            return;
        }

        for(let i = 0; i < this.skinnedMeshes.length; i++) {
            if(!this.skinnedMeshes[i].visible) {
                continue;
            }

            this.animations[this.selectedAnimations[i]](this.skinnedMeshes[i], this.baseSkeletal, clock); 
        }

        this.framesSinceLastUpdate = 0;
    }
}

export { SkeletalModel, InverseAnimatedModel, ForwardAnimatedModel, QCAnimatedModel };
