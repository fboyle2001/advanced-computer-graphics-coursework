import { ParametricSurface } from "./parametric_surfaces";
import { ProgressiveMesh } from "./progressive_mesh";

interface RegisterableComponents {
    lods?: THREE.LOD[],
    surfaces?: ParametricSurface[],
    progressives?: ProgressiveMesh[]
}

abstract class Registerable {
    abstract getComponents(): RegisterableComponents;
}

class ComponentRegister {
    lods: THREE.LOD[];
    surfaces: ParametricSurface[];
    progressives: ProgressiveMesh[];

    constructor() {
        this.lods = [];
        this.surfaces = [];
        this.progressives = [];
    }

    register = (registerable: Registerable): void => {
        const components = registerable.getComponents();
        this.addComponents(components);
    }

    addComponents = (components: RegisterableComponents): void => {
        if(components.lods) {
            components.lods.forEach(lod => this.lods.push(lod));
        }

        if(components.surfaces) {
            components.surfaces.forEach(surface => this.surfaces.push(surface));
        }

        if(components.progressives) {
            components.progressives.forEach(progressive => this.progressives.push(progressive));
        }
    }

    updateSampleCounts = (samples: number) => {
        this.surfaces.forEach(surface => surface.updateSampleCount(samples));
    }
}

export { Registerable, RegisterableComponents, ComponentRegister };