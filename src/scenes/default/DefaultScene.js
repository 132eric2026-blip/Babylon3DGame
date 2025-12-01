import { HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, ShadowGenerator, PhysicsAggregate, PhysicsShapeType, Color4 } from "@babylonjs/core";
import { Config } from "../../config";
import { DecorationManager } from "../../decorations";
import { Horse } from "../../horse";

export class DefaultScene {
    constructor(scene) {
        this.scene = scene;
    }

    create() {
        this.setupEnvironment();
        this.setupLights();
        this.createGround();
        this.createDecorations();
    }

    setupEnvironment() {
        // Standard Earth-like environment
        this.scene.clearColor = new Color4(0.5, 0.8, 1.0, 1.0); // Sky Blue
        this.scene.ambientColor = new Color3(0.3, 0.3, 0.3);
        
        // Fog
        this.scene.fogMode = this.scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.002; // Lighter fog than space
        this.scene.fogColor = new Color3(0.5, 0.8, 1.0);
    }

    setupLights() {
        // Hemispheric Light (Sky light)
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
        hemiLight.diffuse = new Color3(0.8, 0.8, 0.9); // Slight blue tint
        hemiLight.groundColor = new Color3(0.4, 0.4, 0.4);
        hemiLight.intensity = 0.6;

        // Directional Light (Sun)
        const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), this.scene);
        dirLight.position = new Vector3(20, 40, 20);
        dirLight.diffuse = new Color3(1.0, 0.9, 0.8); // Warm sun
        dirLight.specular = new Color3(1.0, 1.0, 1.0);
        dirLight.intensity = 0.8;

        // Shadows
        if (Config.scene.shadows && Config.scene.shadows.enabled) {
            const shadowConfig = Config.scene.shadows;
            const shadowGenerator = new ShadowGenerator(shadowConfig.size, dirLight);
            shadowGenerator.useBlurExponentialShadowMap = shadowConfig.useBlurExponentialShadowMap;
            shadowGenerator.blurKernel = shadowConfig.blurKernel;
            shadowGenerator.useKernelBlur = shadowConfig.useKernelBlur;
            if (shadowConfig.darkness !== undefined) {
                shadowGenerator.setDarkness(shadowConfig.darkness);
            }
            this.scene.shadowGenerator = shadowGenerator;
        }
    }

    createGround() {
        // Standard Ground
        const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200, subdivisions: 2 }, this.scene);
        
        const groundMat = new StandardMaterial("groundMat", this.scene);
        groundMat.diffuseColor = new Color3(0.2, 0.2, 0.2); // Grey ground
        groundMat.specularColor = new Color3(0.1, 0.1, 0.1); // Low gloss
        
        // Optional: Grid texture if we wanted, but simple color is fine for "Default"
        
        ground.material = groundMat;
        ground.receiveShadows = true;

        // Physics
        new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0.1 }, this.scene);

        // Axes
        if (Config.scene.showAxes) {
            const axisX = MeshBuilder.CreateLines("axisX", { points: [Vector3.Zero(), new Vector3(5, 0, 0)] }, this.scene);
            axisX.color = new Color3(1, 0, 0);
            const axisY = MeshBuilder.CreateLines("axisY", { points: [Vector3.Zero(), new Vector3(0, 5, 0)] }, this.scene);
            axisY.color = new Color3(0, 1, 0);
            const axisZ = MeshBuilder.CreateLines("axisZ", { points: [Vector3.Zero(), new Vector3(0, 0, 5)] }, this.scene);
            axisZ.color = new Color3(0, 0, 1);
        }
    }

    createDecorations() {
        // Decorations
        // Force enable for DefaultScene if they were disabled in config
        // But to respect "Default", we should probably just use the manager
        // However, user said "ground has rocks, trees, lamps, horse" as default.
        // Let's temporarily override config flags for this scene generation or just manually call them.
        
        // To avoid mutating global config state that might affect other scenes if switched at runtime,
        // we can just manually invoke the generation logic with explicit "true" where possible, 
        // OR we assume the user wants these enabled in the config for "Default" scene.
        
        // Better approach: The DecorationManager reads from Config.
        // Let's use the manager but ensure we pass flags or modified config? 
        // Since Config is a singleton object, modifying it here is risky if we switch scenes.
        // But for now, let's assume the user wants these enabled when in Default scene.
        
        // We will manually trigger the generation methods.
        const decorationManager = new DecorationManager(this.scene);
        
        // Manually generate standard set for Default Scene
        // 1. Random decorations (Trees + Rocks)
        // We need to temporarily mock the config or modify the manager to accept params.
        // Looking at DecorationManager, it reads directly from Config.
        // Let's create a helper to generate them regardless of config, 
        // or we can just temporarily set config values and restore them.
        
        const originalRocks = Config.scene.decorations.rocksEnabled;
        const originalTrees = Config.scene.decorations.treesEnabled;
        const originalLamps = Config.scene.decorations.streetLampsEnabled;
        
        // Enable for generation
        Config.scene.decorations.rocksEnabled = true;
        Config.scene.decorations.treesEnabled = true;
        Config.scene.decorations.streetLampsEnabled = true;
        
        decorationManager.generateRandomDecorations();
        decorationManager.generateStreetLamps(3);
        
        // Restore config (optional, but good practice if we switch scenes dynamically later)
        Config.scene.decorations.rocksEnabled = originalRocks;
        Config.scene.decorations.treesEnabled = originalTrees;
        Config.scene.decorations.streetLampsEnabled = originalLamps;

        // Create Horse
        // Always create horse in default scene
        new Horse(this.scene, new Vector3(5, 0, 5));
    }
}
