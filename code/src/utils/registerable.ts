import { PerspectiveCamera, Scene } from "three";
import { LODParametricBinder, ParametricSurface } from "./parametric_surfaces";
import { ProgressiveMesh } from "./progressive_mesh";
import { QCAnimatedModel } from "./skeletal_model";

interface RegisterableComponents {
    lods?: THREE.LOD[],
    fixedSurfaces?: ParametricSurface[],
    progressives?: ProgressiveMesh[],
    lodSurfaces?: ParametricSurface[],
    qcAnimatedModels?: QCAnimatedModel[];
}

abstract class Registerable {
    abstract getComponents(): RegisterableComponents;
}

class ComponentRegister {
    lods: THREE.LOD[];
    fixedSurfaces: ParametricSurface[];
    progressives: ProgressiveMesh[];
    lodSurfaceBinder: LODParametricBinder;
    qcAnimatedModels: QCAnimatedModel[];

    constructor(parametricLevels: {[distance: number]: number}) {
        this.lods = [];
        this.fixedSurfaces = [];
        this.progressives = [];
        this.lodSurfaceBinder = new LODParametricBinder(parametricLevels);
        this.qcAnimatedModels = [];
    }

    register = (registerable: Registerable): void => {
        const components = registerable.getComponents();
        this.addComponents(components);
    }

    addComponents = (components: RegisterableComponents): void => {
        components.lods?.forEach(lod => this.lods.push(lod));
        components.fixedSurfaces?.forEach(fixedSurface => this.fixedSurfaces.push(fixedSurface));
        components.progressives?.forEach(progressive => this.progressives.push(progressive));
        components.lodSurfaces?.forEach(lodSurface => this.lodSurfaceBinder.bindSurface(lodSurface));
        components.qcAnimatedModels?.forEach(qc => this.qcAnimatedModels.push(qc));
    }

    toggleDebugMode = (debug: boolean, scene: Scene): void => {}

    updateFixedSampleCounts = (samples: number) => {
        this.fixedSurfaces.forEach(surface => surface.updateSampleCount(samples));
    }

    updateParametricLODs = (camera: PerspectiveCamera) => {
        this.lodSurfaceBinder.updateAll(camera);
    }

    stepProgressiveMeshes = () => {
        this.progressives.forEach(progressive => progressive.stepMesh());
    }

    lodDebug = () => {
        this.lods.forEach(l => console.log({n: l.name, l: l.levels}))
    }

    setLODModelLevels = (distances: number[]) => {
        const orderedDistances = distances.sort((a, b) => a - b);

        this.lods.forEach(lod => {
            for(let i = 0; i < lod.levels.length; i++) {
                lod.levels[i].distance = orderedDistances[i];
            }
        })
    }

    setAnimationQuality = (quality: string) => {
        this.qcAnimatedModels.forEach(qc => qc.setAnimationLevel(quality));
    }
}

export { Registerable, RegisterableComponents, ComponentRegister };