import { WebGPUEngine, Scene, Vector3, ArcRotateCamera, HavokPlugin, GlowLayer } from "@babylonjs/core";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import HavokPhysics from "@babylonjs/havok";
import { createSceneElements } from "./sceneSetup";
import { Player } from "./player";
import { Config } from "./config";
import { DecorationManager } from "./decorations";
import { setupUI } from "./ui";
import { setupMinimap } from "./minimap";
import { setupSkillBar } from "./skills";
import { Horse } from "./horse";
import { spawnAlphaParticleCannon } from "./armory/AlphaParticleCannon";
import { spawnPegasusParticleCannon } from "./armory/PegasusParticleCannon";
import { spawnSolarPlasmaCannon } from "./armory/SolarPlasmaCannon";
import { spawnScorpioPulsarGun } from "./armory/ScorpioPulsarGun";

async function createEngine() {
    const canvas = document.getElementById("renderCanvas");
    const engine = new WebGPUEngine(canvas, { antialiasingEnabled: true });
    await engine.initAsync();
    return engine;
}

async function createScene(engine) {
    const scene = new Scene(engine);

    // Physics
    // Load Havok from the public folder if needed, or let the package handle it.
    // If we need to specify the wasm location:
    // const havokInstance = await HavokPhysics({ locateFile: () => "./HavokPhysics.wasm" });
    // But let's try default first.
    const havokInstance = await HavokPhysics();
    const hk = new HavokPlugin(true, havokInstance);
    scene.enablePhysics(new Vector3(0, Config.scene.gravity, 0), hk);

    // Elements
    createSceneElements(scene);

    // Decorations
    const decorationManager = new DecorationManager(scene);
    decorationManager.generateRandomDecorations();
    decorationManager.generateStreetLamps(3);

    // Camera
    const camera = new ArcRotateCamera("camera", -Math.PI / 2.5, Math.PI / 2.5, 20, Vector3.Zero(), scene);
    camera.wheelPrecision = 20;
    camera.attachControl(engine.getRenderingCanvas(), true);
    scene.activeCameras = [camera];

    // Antialiasing: FXAA + MSAA samples (if supported)
    const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
    pipeline.fxaaEnabled = true;
    pipeline.samples = 4;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.65;
    pipeline.bloomWeight = 1.1;
    pipeline.bloomKernel = 96;
    pipeline.bloomScale = 0.5;

    // Glow Layer for extra bloom control on specific meshes if needed
    // const glowLayer = new GlowLayer("glowLayer", scene);
    // glowLayer.intensity = 1.0;

    // Player
    const player = new Player(scene, camera);

    // Camera follow player
    // Note: player.mesh is the physics capsule.
    camera.lockedTarget = player.mesh;

    // Add player meshes to shadow generator
    if (scene.shadowGenerator) {
        player.mesh.getChildMeshes().forEach(m => {
            scene.shadowGenerator.addShadowCaster(m);
        });
    }

    // Raise max simultaneous lights across materials to support shield + 3 lamps + ambient
    scene.materials.forEach(mat => {
        if (typeof mat.maxSimultaneousLights === "number") {
            mat.maxSimultaneousLights = 6;
        }
    });

    // UI
    setupUI(scene, player);

    // Minimap
    setupMinimap(scene, player);

    // Skills
    setupSkillBar(scene, player);

    // Create Horse
    const horse = new Horse(scene, new Vector3(5, 0, 5));

    // Spawn Random Weapon (Alpha Particle Cannon)
    // Random position within -20 to 20 range
    const rx = (Math.random() - 0.5) * 40;
    const rz = (Math.random() - 0.5) * 40;
    spawnAlphaParticleCannon(scene, new Vector3(rx, 0.5, rz), player);

    // Spawn Random Weapon (Pegasus Particle Cannon)
    const rx2 = (Math.random() - 0.5) * 40;
    const rz2 = (Math.random() - 0.5) * 40;
    spawnPegasusParticleCannon(scene, new Vector3(rx2, 0.5, rz2), player);

    // Spawn Solar Plasma Cannon
    spawnSolarPlasmaCannon(scene, new Vector3(-2, 0.5, 2), player);

    // Spawn Scorpio Pulsar Gun
    spawnScorpioPulsarGun(scene, new Vector3(4, 0.5, 2), player);

    return scene;
}

async function main() {
    const engine = await createEngine();
    const scene = await createScene(engine);

    engine.runRenderLoop(() => {
        scene.render();
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });
}

main();
