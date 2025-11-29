import { MeshBuilder, StandardMaterial, Color3, Color4, ParticleSystem, Texture, Vector3, DefaultRenderingPipeline, FresnelParameters } from "@babylonjs/core";
import { Config } from "./config";

export class Shield {
    constructor(scene, parentMesh) {
        this.scene = scene;
        this.parentMesh = parentMesh;
        this.mesh = null;
        this.pipeline = null;

        this.createShieldMesh();
        if (Config.shield && Config.shield.particlesEnabled) {
            this.createParticles();
            this.setupBloom();
        }
    }

    createShieldMesh() {
        // 创建球体并缩放成鸡蛋形状
        // 直径1.8刚好包住玩家
        this.mesh = MeshBuilder.CreateSphere("shieldMesh", { diameter: 1.8, segments: 32 }, this.scene);
        // Y轴缩放让它呈鸡蛋形
        this.mesh.scaling = new Vector3(1, 1.2, 1);

        this.mesh.parent = this.parentMesh;
        // 调整位置让底部贴地
        // 玩家落地后 modelRoot 世界坐标约 -0.2
        // 设 Y=1.3，则世界中心 = 1.1，底部 = 0.02（贴地），顶部 = 2.18（包头）
        this.mesh.position.y = 1.3;

        // --- Force Field Material ---
        const shieldMat = new StandardMaterial("shieldMat", this.scene);

        // 1. Basic Colors
        shieldMat.diffuseColor = new Color3(0, 0, 0); // No diffuse
        shieldMat.specularColor = new Color3(0, 0, 0); // No specular
        shieldMat.emissiveColor = new Color3(1, 0.8, 0); // Base Gold

        // 2. Fresnel for Emissive (Glowing Edges)
        // 边缘(Left)是高亮金色，中心(Right)是暗色
        const fresnel = new FresnelParameters();
        fresnel.isEnabled = true;
        fresnel.bias = 0.1;
        fresnel.power = 2.0; // Controls how thin the rim is
        fresnel.leftColor = new Color3(2.0, 1.8, 0.5); // Bright Gold Edge (Intensity > 1 for Bloom)
        fresnel.rightColor = new Color3(0.2, 0.15, 0); // Dark Center
        shieldMat.emissiveFresnelParameters = fresnel;

        // 3. Fresnel for Opacity (Transparent Center)
        // 边缘(Left)不透明，中心(Right)透明
        const opacityFresnel = new FresnelParameters();
        opacityFresnel.isEnabled = true;
        opacityFresnel.bias = 0.1;
        opacityFresnel.power = 1.5;
        opacityFresnel.leftColor = new Color3(1, 1, 1); // Opaque Edge
        opacityFresnel.rightColor = new Color3(0.1, 0.1, 0.1); // Mostly Transparent Center
        shieldMat.opacityFresnelParameters = opacityFresnel;

        shieldMat.alpha = 0.5; // Base Alpha
        shieldMat.disableLighting = true; // Self-illuminated

        this.mesh.material = shieldMat;
    }

    setupBloom() {
        // 使用 DefaultRenderingPipeline 来实现 Bloom
        let pipeline = this.scene.postProcessRenderPipelineManager.supportedPipelines.find(p => p.name === "shieldBloomPipeline");

        if (!pipeline) {
            pipeline = new DefaultRenderingPipeline("shieldBloomPipeline", true, this.scene, [this.scene.activeCamera]);
            pipeline.bloomEnabled = true;
            pipeline.bloomThreshold = 1.2; // 阈值1.2，配合Fresnel边缘的高亮(>1.2)产生辉光
            pipeline.bloomWeight = 0.6;    // 适度辉光
            pipeline.bloomKernel = 64;     // 柔和扩散
            pipeline.bloomScale = 0.5;

            // Anti-Aliasing
            pipeline.fxaaEnabled = true; // 开启FXAA抗锯齿
            pipeline.samples = 4;        // 开启MSAA 4x
        }
        this.pipeline = pipeline;
    }

    createParticles() {
        // Create a particle system
        const particleSystem = new ParticleSystem("shieldParticles", 1000, this.scene);

        // Texture of each particle
        // Dynamic Texture for Circular Particle
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)"); // Core White
        grad.addColorStop(0.5, "rgba(255, 255, 255, 0.5)"); // Mid Halo
        grad.addColorStop(1, "rgba(255, 255, 255, 0)"); // Fade out
        ctx.fillStyle = grad;
        ctx.clearRect(0, 0, 64, 64); // Clear first
        ctx.fillRect(0, 0, 64, 64);
        const particleUrl = canvas.toDataURL();

        const texture = Texture.CreateFromBase64String(particleUrl, "particleCircle.png", this.scene);
        particleSystem.particleTexture = texture;

        // Emitter
        particleSystem.emitter = this.mesh;

        // Sphere Emitter - Surface Only
        // Radius 0.9 matches the mesh radius (Diameter 1.8 / 2)
        particleSystem.createSphereEmitter(0.9, 0);

        // Colors - Bright Gold for Bloom
        particleSystem.color1 = new Color4(3.0, 2.5, 1.0, 1.0); // Very Bright Gold
        particleSystem.color2 = new Color4(2.0, 1.5, 0.5, 1.0); // Gold
        particleSystem.colorDead = new Color4(0, 0, 0, 0.0);

        // Size - Small and subtle
        particleSystem.minSize = 0.03;
        particleSystem.maxSize = 0.06;

        // Life time
        particleSystem.minLifeTime = 0.5;
        particleSystem.maxLifeTime = 1.2;

        // Emission rate
        particleSystem.emitRate = 150;

        // Blend mode
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

        // Gravity - float up slightly
        particleSystem.gravity = new Vector3(0, 0.5, 0);

        // Speed
        particleSystem.minEmitPower = 0.2;
        particleSystem.maxEmitPower = 0.6;
        particleSystem.updateSpeed = 0.01;

        // Start
        particleSystem.start();

        this.particleSystem = particleSystem;
    }

    dispose() {
        if (this.particleSystem) {
            this.particleSystem.stop();
            this.particleSystem.dispose();
        }
        if (this.mesh) {
            this.mesh.dispose();
        }
        if (this.pipeline) {
            this.pipeline.dispose();
        }
    }
}
