import { PerspectiveCamera, Scene } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass";
import { SSAARenderPass } from "three/examples/jsm/postprocessing/SSAARenderPass";
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
import { ComponentRegister } from "./registerable";

const defaultVisualSettings = {
    antialiasing: "disabled",
    renderDistance: "1000",
    fixedSurfaceSamples: 24,
    animationQuality: "low",
    debugMode: false,
    levelsOfDetail: {
        low: {
            distance: 30,
            samples: 4
        },
        medium: {
            distance: 20,
            samples: 12
        },
        high: {
            distance: 10,
            samples: 24
        }
    }
}

let currentAAPass: SMAAPass | SSAARenderPass | ShaderPass | GlitchPass | null = null;

const updateSettings = (
    componentRegister: ComponentRegister, 
    camera: PerspectiveCamera, 
    composedRenderer: EffectComposer, 
    scene: Scene
) => {
    // Render Distance
    const renderDistance = (document.getElementById("render_distance") as HTMLInputElement)!.value;
    camera.far = Number(renderDistance);
    camera.updateProjectionMatrix();

    // Level of Detail
    const distanceLevels = {
        low: Number((document.getElementById("lod_low_distance") as HTMLInputElement)!.value),
        medium: Number((document.getElementById("lod_medium_distance") as HTMLInputElement)!.value),
        high: Number((document.getElementById("lod_high_distance") as HTMLInputElement)!.value),
    }

    const parametricLevels = {
        [distanceLevels.low]: Number((document.getElementById("lod_low_surface_samples") as HTMLInputElement)!.value),
        [distanceLevels.medium]: Number((document.getElementById("lod_medium_surface_samples") as HTMLInputElement)!.value),
        [distanceLevels.high]: Number((document.getElementById("lod_high_surface_samples") as HTMLInputElement)!.value),
    }

    const distances = Object.values(distanceLevels);

    componentRegister.setLODModelLevels(distances);
    componentRegister.setLODSurfaceLevels(parametricLevels);

    // Anti-Aliasing (revisit this)
    const antiAliasingType = (document.getElementById("aa_type") as HTMLInputElement)!.value;

    if(currentAAPass !== null) {
        composedRenderer.removePass(currentAAPass);
    }

    if(antiAliasingType === "disabled") {
        currentAAPass = null;
    } else {
        switch(antiAliasingType) {
            case "fxaa":
                currentAAPass = new ShaderPass(FXAAShader);
                break;
            case "ssaa":
                // Not good at all
                composedRenderer.setPixelRatio(1)
                currentAAPass = new SSAARenderPass(scene, camera);
                break;
            case "smaa":
                currentAAPass = new SMAAPass(window.innerWidth, window.innerHeight);
                break;
            default:
                console.error("Invalid AA type");
        }

        if(currentAAPass) {
            composedRenderer.addPass(currentAAPass);
        }
    }

    // Animation Quality
    const animationQuality = (document.getElementById("animation_quality") as HTMLInputElement)!.value;
    componentRegister.setAnimationQuality(animationQuality);

    // Fixed Samples
    const fixedSamples = Number((document.getElementById("fixed_samples") as HTMLInputElement)!.value);
    componentRegister.setFixedSampleCounts(fixedSamples);

    // Debug Mode
    const debugMode = (document.getElementById("debug_mode") as HTMLInputElement)!.checked;
    componentRegister.setControlPointGridVisibility(debugMode);
}

const setupVisualQualityEvents = (
    componentRegister: ComponentRegister, 
    camera: PerspectiveCamera, 
    composedRenderer: EffectComposer, 
    scene: Scene
): void => {
    // Register on change events and propagate the changes automatically
    document.getElementById("save_settings")?.addEventListener("click", (event) => {
        console.log("Saving settings")
        updateSettings(componentRegister, camera, composedRenderer, scene);
    });
}

const setVisualQualityDefaults = (
    componentRegister: ComponentRegister, 
    camera: PerspectiveCamera, 
    composedRenderer: EffectComposer, 
    scene: Scene
) => {
    (document.getElementById("lod_low_distance") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.low.distance;
    (document.getElementById("lod_medium_distance") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.medium.distance;
    (document.getElementById("lod_high_distance") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.high.distance;

    (document.getElementById("lod_low_surface_samples") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.low.samples;
    (document.getElementById("lod_medium_surface_samples") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.medium.samples;
    (document.getElementById("lod_high_surface_samples") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.high.samples;

    (document.getElementById("render_distance") as HTMLInputElement)!.value = defaultVisualSettings.renderDistance;
    (document.getElementById("aa_type") as HTMLInputElement)!.value = defaultVisualSettings.antialiasing;
    (document.getElementById("animation_quality") as HTMLInputElement)!.value = defaultVisualSettings.animationQuality;
    (document.getElementById("fixed_samples") as HTMLInputElement)!.value = "" + defaultVisualSettings.fixedSurfaceSamples;

    (document.getElementById("debug_mode") as HTMLInputElement)!.checked = defaultVisualSettings.debugMode;

    updateSettings(componentRegister, camera, composedRenderer, scene)
}

export { setVisualQualityDefaults, setupVisualQualityEvents, defaultVisualSettings };