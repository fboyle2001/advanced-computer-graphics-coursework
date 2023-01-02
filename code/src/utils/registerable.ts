import { Clock, PerspectiveCamera } from "three";
import { LODParametricBinder, ParametricSurface } from "./parametric_surfaces";
import { ProgressiveMesh } from "./progressive_mesh";
import { QCAnimatedModel } from "./skeletal_model";

// Represents registerable object types
interface RegisterableComponents {
    lods?: THREE.LOD[],
    fixedSurfaces?: ParametricSurface[],
    progressives?: ProgressiveMesh[],
    lodSurfaces?: ParametricSurface[],
    qcAnimatedModels?: QCAnimatedModel[];
}

// A class can implement this to be registered easily 
abstract class Registerable {
    abstract getComponents(): RegisterableComponents;
}

// Maintains a store of all components that can be dynamically changed
// This makes visual setting changes quick and easy!
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

    // Register components for use later
    register = (registerable: Registerable): void => {
        const components = registerable.getComponents();
        this.addComponents(components);
    }

    // Register components for use later
    addComponents = (components: RegisterableComponents): void => {
        components.lods?.forEach(lod => this.lods.push(lod));
        components.fixedSurfaces?.forEach(fixedSurface => this.fixedSurfaces.push(fixedSurface));
        components.progressives?.forEach(progressive => this.progressives.push(progressive));
        components.lodSurfaces?.forEach(lodSurface => this.lodSurfaceBinder.bindSurface(lodSurface));
        components.qcAnimatedModels?.forEach(qc => this.qcAnimatedModels.push(qc));
    }

    // Called once per frame
    updateAll = (clock: Clock, camera: PerspectiveCamera) => {
        if(!this.started) {
            // Simulate the progressive mesh, only need to do once as it runs itself
            this.progressives.forEach(progressive => progressive.simulateNetworkDataArrival(20));
            this.started = true;
        }

        // Check LoD and step the animations
        this.lodSurfaceBinder.updateAll(camera);
        this.qcAnimatedModels.forEach(qc => qc.updateAll(clock));
    }
    
    // Update visual quality
    setFixedSampleCounts = (samples: number) => {
        this.fixedSurfaces.forEach(surface => surface.updateSampleCount(samples));
    }

    // Update visual quality
    setLODSurfaceLevels = (levels: {[distance: number]: number}) => {
        this.lodSurfaceBinder.setLevels(levels);
    }

    // Update visual quality
    setLODModelLevels = (distances: number[]) => {
        const orderedDistances = distances.sort((a, b) => a - b);

        this.lods.forEach(lod => {
            for(let i = 0; i < lod.levels.length; i++) {
                lod.levels[i].distance = orderedDistances[i];
            }
        })
    }

    // Update visual quality
    setAnimationQuality = (quality: string) => {
        this.qcAnimatedModels.forEach(qc => qc.setAnimationLevel(quality));
    }

    // Enable debug mode to visualise surface control points
    setControlPointGridVisibility = (visible: boolean) => {
        this.lodSurfaceBinder.boundSurfaces.forEach(surface => surface.control_point_grid.visible = visible);
        this.fixedSurfaces.forEach(surface => surface.control_point_grid.visible = visible);
    }
}

export { Registerable, RegisterableComponents, ComponentRegister };