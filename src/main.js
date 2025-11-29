import { WebGPUEngine, Scene, Vector3, ArcRotateCamera, HavokPlugin, GlowLayer } from "@babylonjs/core";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import HavokPhysics from "@babylonjs/havok";
import { createSceneElements } from "./sceneSetup";
import { Player } from "./player";
import { Config } from "./config";
import { DecorationManager } from "./decorations";
import { setupUI } from "./ui";
import { setupMinimap } from "./minimap";

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

    // Camera
    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 30, Vector3.Zero(), scene);
    camera.wheelPrecision = 20;
    camera.attachControl(engine.getRenderingCanvas(), true);
    scene.activeCameras = [camera];

    // Antialiasing: FXAA + MSAA samples (if supported)
    const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
    pipeline.fxaaEnabled = true;
    pipeline.samples = 1;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 1.2;
    pipeline.bloomWeight = 0.6;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;

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

    // UI
    setupUI(scene, player);

    // Minimap
    setupMinimap(scene, player);

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
