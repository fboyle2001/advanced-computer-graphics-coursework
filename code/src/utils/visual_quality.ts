import { ComponentRegister } from "./registerable";

enum QualityLevel { Low, Medium, High }
enum AntiAliasing { None, FXAA, SSAA, SMAA }

const defaultVisualSettings = {
    antialiasing: AntiAliasing.None,
    renderDistance: 1000,
    animationQuality: QualityLevel.Medium,
    fixedSurfaceSamples: 24,
    levelsOfDetail: {
        low: {
            distance: 30,
            samples: 4,
            framesPerAnimationUpdate: 8
        },
        medium: {
            distance: 20,
            samples: 12,
            framesPerAnimationUpdate: 4
        },
        high: {
            distance: 10,
            samples: 24,
            framesPerAnimationUpdate: 1
        }
    }
}

const setupVisualQualityEvents = (componentRegister: ComponentRegister): void => {

}

export { defaultVisualSettings };