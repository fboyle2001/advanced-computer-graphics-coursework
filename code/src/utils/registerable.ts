import { Clock, PerspectiveCamera, Scene } from "three";
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
    started: boolean;

    constructor(parametricLevels: {[distance: number]: number}) {
        this.lods = [];
        this.fixedSurfaces = [];
        this.progressives = [];
        this.lodSurfaceBinder = new LODParametricBinder(parametricLevels);
        this.qcAnimatedModels = [];
        this.started = false;
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

    updateAll = (clock: Clock, camera: PerspectiveCamera) => {
        if(!this.started) {
            this.progressives.forEach(progressive => progressive.simulateNetworkDataArrival(20));
            this.started = true;
        }

        this.lodSurfaceBinder.updateAll(camera);
        this.qcAnimatedModels.forEach(qc => qc.updateAll(clock));
    }
    
    setFixedSampleCounts = (samples: number) => {
        this.fixedSurfaces.forEach(surface => surface.updateSampleCount(samples));
    }

    setLODSurfaceLevels = (levels: {[distance: number]: number}) => {
        this.lodSurfaceBinder.setLevels(levels);
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

    setControlPointGridVisibility = (visible: boolean) => {
        this.lodSurfaceBinder.boundSurfaces.forEach(surface => surface.control_point_grid.visible = visible);
        this.fixedSurfaces.forEach(surface => surface.control_point_grid.visible = visible);
    }
}

export { Registerable, RegisterableComponents, ComponentRegister };