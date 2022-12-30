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
    materialQuality: "highest",
    animationQuality: "low",
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

const populateSettingDefaults = () => {
    (document.getElementById("lod_low_distance") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.low.distance;
    (document.getElementById("lod_medium_distance") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.medium.distance;
    (document.getElementById("lod_high_distance") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.high.distance;

    (document.getElementById("lod_low_surface_samples") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.low.samples;
    (document.getElementById("lod_medium_surface_samples") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.medium.samples;
    (document.getElementById("lod_high_surface_samples") as HTMLInputElement)!.value = "" + defaultVisualSettings.levelsOfDetail.high.samples;

    (document.getElementById("render_distance") as HTMLInputElement)!.value = defaultVisualSettings.renderDistance;
    (document.getElementById("aa_type") as HTMLInputElement)!.value = defaultVisualSettings.antialiasing;
    (document.getElementById("material_quality") as HTMLInputElement)!.value = defaultVisualSettings.materialQuality;
    (document.getElementById("animation_quality") as HTMLInputElement)!.value = defaultVisualSettings.animationQuality;
    (document.getElementById("fixed_samples") as HTMLInputElement)!.value = "" + defaultVisualSettings.fixedSurfaceSamples;
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

        // Render Distance
        const renderDistance = (document.getElementById("render_distance") as HTMLInputElement)!.value;
        camera.far = Number(renderDistance);
        camera.updateProjectionMatrix();

        // TODO: Level of Detail
        const high = {
            distance: (document.getElementById("lod_high_distance") as HTMLInputElement)!.value,
            samples: (document.getElementById("lod_high_surface_samples") as HTMLInputElement)!.value,
        }

        const medium = {
            distance: (document.getElementById("lod_medium_distance") as HTMLInputElement)!.value,
            samples: (document.getElementById("lod_medium_surface_samples") as HTMLInputElement)!.value,
        }

        const low = {
            distance: (document.getElementById("lod_low_distance") as HTMLInputElement)!.value,
            samples: (document.getElementById("lod_low_surface_samples") as HTMLInputElement)!.value,
        }

        const levelsOfDetail = { low, medium, high };

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

        // TODO: Material Quality
        const materialQuality = (document.getElementById("material_quality") as HTMLInputElement)!.value;

        // Animation Quality
        const animationQuality = (document.getElementById("animation_quality") as HTMLInputElement)!.value;
        componentRegister.setAnimationQuality(animationQuality);

        // Fixed Samples
        const fixedSamples = Number((document.getElementById("fixed_samples") as HTMLInputElement)!.value);
        componentRegister.updateFixedSampleCounts(fixedSamples);
    });

    // document.getElementById("render_distance")?.addEventListener("change", (event) => {
    //     const target = event.target as HTMLInputElement;
    //     console.log(`Render Distance value is ${target.value}`)
    // })
}

export { populateSettingDefaults, setupVisualQualityEvents, defaultVisualSettings };