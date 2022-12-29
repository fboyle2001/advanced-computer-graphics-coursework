import { Clock, Group, Object3D, SkinnedMesh, Vector3 } from "three";
import { CCDIKSolver, IKS } from "three/examples/jsm/animation/CCDIKSolver";
import { SkeletalModel } from "./skeletal_model";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils";

interface SingleInverseKinematicSetup {
    boneIndex: number,
    target: (clock: Clock) => Vector3
}

class SharedInverseAnimatedModel {
    baseSkeletal: SkeletalModel;
    ikTarget: SingleInverseKinematicSetup;
    animationLevels: {[level: string]: IKS};
    ikSolvers: CCDIKSolver[];
    skinnedMeshes: SkinnedMesh[];
    currentAnimationLevel: string;
    baseObject!: Group;

    constructor(skeletal: SkeletalModel, ikTarget: SingleInverseKinematicSetup, animationLevels: {[level: string]: IKS}, defaultAnimationLevel: string) {
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

    update = (clock: Clock) => {
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

export { SharedInverseAnimatedModel };