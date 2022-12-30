import { PerspectiveCamera, Scene, Vector2 } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass";
import { SSAARenderPass } from "three/examples/jsm/postprocessing/SSAARenderPass";
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
import { ComponentRegister } from "./registerable";

interface VisualSettingsStore {
    antialiasing: string,
    renderDistance: string,
    fixedSurfaceSamples: number,
    animationQuality: string,
    debugMode: boolean,
    targetFPS: number,
    dynamicControl: boolean,
    levelsOfDetail: {
        low: {
            distance: number,
            samples: number
        },
        medium: {
            distance: number,
            samples: number
        },
        high: {
            distance: number,
            samples: number
        }
    }
}

const defaultVisualSettings: VisualSettingsStore = {
    antialiasing: "disabled",
    renderDistance: "1000",
    fixedSurfaceSamples: 24,
    animationQuality: "low",
    debugMode: false,
    targetFPS: 60,
    dynamicControl: false,
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

let currentVisualSettings: VisualSettingsStore = JSON.parse(JSON.stringify(defaultVisualSettings));
let currentAAPass: SMAAPass | SSAARenderPass | ShaderPass | GlitchPass | null = null;

const maxRunningSize = 16;
const dynamicDelay = 0.3;
let dynamicPaused = false;
let runningAverageFPS: number[] = [];
let lastUpdateTime = 0;

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
                // Pixel ratio is important see https://discourse.threejs.org/t/fxaapass-causing-blurry-rendering/10776/2
                currentAAPass = new ShaderPass(FXAAShader);
                const size = new Vector2(composedRenderer.renderer.domElement.clientWidth, composedRenderer.renderer.domElement.clientHeight);
                size.multiplyScalar(composedRenderer.renderer.getPixelRatio());
                currentAAPass.uniforms["resolution"].value.set(1 / size.x, 1 / size.y)
                break;
            case "ssaa":
                // Not good at all
                // composedRenderer.setPixelRatio(1)
                // currentAAPass = new SSAARenderPass(scene, camera);
                currentAAPass = null;
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

    // Dynamic Control Mode
    const targetFPS = Number((document.getElementById("target_fps") as HTMLInputElement)!.value);
    const dynamicControl = (document.getElementById("dynamic_control") as HTMLInputElement)!.checked;
    const settingsChildren = document.getElementById("custom_settings")!.getElementsByTagName("*");
    
    for(let i = 0; i < settingsChildren.length; i++) {
        if(settingsChildren[i] instanceof HTMLInputElement) {
            (settingsChildren[i] as HTMLInputElement).disabled = dynamicControl;
        } else if(settingsChildren[i] instanceof HTMLSelectElement) {
            (settingsChildren[i] as HTMLSelectElement).disabled = dynamicControl;
        }
    }

    currentVisualSettings = {
        "antialiasing": antiAliasingType,
        "renderDistance": renderDistance,
        "fixedSurfaceSamples": fixedSamples,
        "animationQuality": animationQuality,
        "debugMode": debugMode,
        "targetFPS": targetFPS,
        "dynamicControl": dynamicControl,
        "levelsOfDetail": {
            "low": {
                "distance": distanceLevels.low,
                "samples": Number((document.getElementById("lod_low_surface_samples") as HTMLInputElement)!.value)
            },
            "medium": {
                "distance": distanceLevels.medium,
                "samples": Number((document.getElementById("lod_medium_surface_samples") as HTMLInputElement)!.value)
            },
            "high": {
                "distance": distanceLevels.high,
                "samples": Number((document.getElementById("lod_high_surface_samples") as HTMLInputElement)!.value)
            }
        }
    }
}

const setupVisualQualityEvents = (
    componentRegister: ComponentRegister, 
    camera: PerspectiveCamera, 
    composedRenderer: EffectComposer, 
    scene: Scene
): void => {
    document.getElementById("save_settings")?.addEventListener("click", (event) => {
        dynamicPaused = false;
        updateSettings(componentRegister, camera, composedRenderer, scene);
    });

    document.getElementById("open_settings")?.addEventListener("click", (event) => {
        dynamicPaused = true;
    })
}

const setVisualQualitySettings = (
    componentRegister: ComponentRegister, 
    camera: PerspectiveCamera, 
    composedRenderer: EffectComposer, 
    scene: Scene,
    visualQualitySettings: VisualSettingsStore
) => {
    (document.getElementById("lod_low_distance") as HTMLInputElement)!.value = "" + visualQualitySettings.levelsOfDetail.low.distance;
    (document.getElementById("lod_medium_distance") as HTMLInputElement)!.value = "" + visualQualitySettings.levelsOfDetail.medium.distance;
    (document.getElementById("lod_high_distance") as HTMLInputElement)!.value = "" + visualQualitySettings.levelsOfDetail.high.distance;

    (document.getElementById("lod_low_surface_samples") as HTMLInputElement)!.value = "" + visualQualitySettings.levelsOfDetail.low.samples;
    (document.getElementById("lod_medium_surface_samples") as HTMLInputElement)!.value = "" + visualQualitySettings.levelsOfDetail.medium.samples;
    (document.getElementById("lod_high_surface_samples") as HTMLInputElement)!.value = "" + visualQualitySettings.levelsOfDetail.high.samples;

    (document.getElementById("render_distance") as HTMLInputElement)!.value = visualQualitySettings.renderDistance;
    (document.getElementById("aa_type") as HTMLSelectElement)!.value = visualQualitySettings.antialiasing;
    (document.getElementById("animation_quality") as HTMLSelectElement)!.value = visualQualitySettings.animationQuality;
    (document.getElementById("fixed_samples") as HTMLInputElement)!.value = "" + visualQualitySettings.fixedSurfaceSamples;

    (document.getElementById("debug_mode") as HTMLInputElement)!.checked = visualQualitySettings.debugMode;
    (document.getElementById("target_fps") as HTMLInputElement)!.value = "" + visualQualitySettings.targetFPS;
    (document.getElementById("dynamic_control") as HTMLInputElement)!.checked = visualQualitySettings.dynamicControl;

    updateSettings(componentRegister, camera, composedRenderer, scene)
}

const setVisualQualityDefaults = (
    componentRegister: ComponentRegister, 
    camera: PerspectiveCamera, 
    composedRenderer: EffectComposer, 
    scene: Scene
) => {
    setVisualQualitySettings(componentRegister, camera, composedRenderer, scene, defaultVisualSettings);
}

const incrementalQualityIncrease = () => {
    const { 
        antialiasing, 
        renderDistance: renderDistanceStr, 
        animationQuality,
        fixedSurfaceSamples,
        levelsOfDetail
    } = currentVisualSettings;
    const renderDistance = Number(renderDistanceStr);

    if(renderDistance < 200) {
        currentVisualSettings.renderDistance = "" + (renderDistance + 10);
        return;
    }

    if(fixedSurfaceSamples < 24) {
        currentVisualSettings.fixedSurfaceSamples = fixedSurfaceSamples + 2;
        return;
    }

    if(animationQuality !== "high") {
        if(animationQuality === "low") {
            currentVisualSettings.animationQuality = "medium";
        } else if(animationQuality === "medium") {
            currentVisualSettings.animationQuality = "high";
        }

        return;
    }

    if(renderDistance < 400) {
        currentVisualSettings.renderDistance = "" + (renderDistance + 100);
        return;
    }

    let affectedLod = false;

    if(levelsOfDetail.high.samples < 24) {
        currentVisualSettings.levelsOfDetail.high.samples += 4;
        affectedLod = true;
    }

    if(levelsOfDetail.medium.samples < 12) {
        currentVisualSettings.levelsOfDetail.medium.samples += 2;
        affectedLod = true;
    }

    if(levelsOfDetail.low.samples < 4) {
        currentVisualSettings.levelsOfDetail.low.samples += 1;
        affectedLod = true;
    }

    if(affectedLod) {
        return;
    }

    if(antialiasing === "disabled") {
        currentVisualSettings.antialiasing = "fxaa";
        return;
    }

    if(renderDistance < 900) {
        currentVisualSettings.renderDistance = "" + (renderDistance + 100);
        return;
    }
}

const incrementalQualityDowngrade = () => {
    const { 
        antialiasing, 
        renderDistance: renderDistanceStr, 
        animationQuality,
        fixedSurfaceSamples,
        levelsOfDetail
    } = currentVisualSettings;
    const renderDistance = Number(renderDistanceStr);

    if(antialiasing !== "disabled") {
        if(antialiasing === "smaa") {
            currentVisualSettings.antialiasing = "fxaa";
        } else if(antialiasing === "fxaa") {
            currentVisualSettings.antialiasing = "disabled";
        }

        return;
    }

    if(renderDistance > 400) {
        currentVisualSettings.renderDistance = "" + (renderDistance - 100);
        return;
    }

    if(animationQuality !== "low") {
        if(animationQuality === "high") {
            currentVisualSettings.animationQuality = "medium";
        } else if(animationQuality === "medium") {
            currentVisualSettings.animationQuality = "low";
        }

        return;
    }

    let affectedLod = false;

    if(levelsOfDetail.high.samples > 8) {
        currentVisualSettings.levelsOfDetail.high.samples -= 4;
        affectedLod = true;
    }

    if(levelsOfDetail.medium.samples > 4) {
        currentVisualSettings.levelsOfDetail.medium.samples -= 2;
        affectedLod = true;
    }

    if(levelsOfDetail.low.samples > 2) {
        currentVisualSettings.levelsOfDetail.low.samples -= 1;
        affectedLod = true;
    }

    if(affectedLod) {
        return;
    }

    if(fixedSurfaceSamples > 4) {
        currentVisualSettings.fixedSurfaceSamples = fixedSurfaceSamples - 2;
        return;
    }

    if(renderDistance > 20) {
        currentVisualSettings.renderDistance = "" + (renderDistance - 10);
        return;
    }
}

const dynamicQualityControl = (
    componentRegister: ComponentRegister, 
    camera: PerspectiveCamera, 
    composedRenderer: EffectComposer, 
    scene: Scene,
    deltaTime: number, 
    elapsedTime: number
) => {
    if(!currentVisualSettings.dynamicControl || dynamicPaused) {
        return;
    }

    while(runningAverageFPS.length >= maxRunningSize) {
        runningAverageFPS.shift()
    }

    const currentFPS = 1 / deltaTime;
    runningAverageFPS.push(currentFPS);

    if(lastUpdateTime === 0) {
        lastUpdateTime = elapsedTime;
        return;
    }

    if(elapsedTime - lastUpdateTime < dynamicDelay) {
        return;
    }

    lastUpdateTime = elapsedTime;

    const averageFPS = runningAverageFPS.reduce((a, b) => a + b, 0) / runningAverageFPS.length;
    const lowerVarianceBound = currentVisualSettings.targetFPS * 0.99;
    const upperVarianceBound = currentVisualSettings.targetFPS * 1.05;
    console.log({averageFPS, lowerVarianceBound, upperVarianceBound, runningAverageFPS})

    // Make changes in response to too little or too much FPS to tend to the target FPS
    if(averageFPS < lowerVarianceBound) {
        incrementalQualityDowngrade();
    } else if (averageFPS > upperVarianceBound) {
        incrementalQualityIncrease();
    } else {
        // In the sweet spot so don't update
        return;
    }

    // Update visual quality settings
    setVisualQualitySettings(componentRegister, camera, composedRenderer, scene, currentVisualSettings);

    // Clear the running average
    runningAverageFPS = [];
}

console.log({currentVisualSettings})

export { setVisualQualityDefaults, setupVisualQualityEvents, dynamicQualityControl, defaultVisualSettings };