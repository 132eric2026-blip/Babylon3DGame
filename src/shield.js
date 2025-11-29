import { MeshBuilder, StandardMaterial, Color3, Color4, ParticleSystem, Texture, Vector3, DefaultRenderingPipeline, FresnelParameters, PointLight, ShadowGenerator, HemisphericLight } from "@babylonjs/core";
import { Config } from "./config";

export class Shield {
    constructor(scene, parentMesh) {
        this.scene = scene;
        this.parentMesh = parentMesh;
        this.mesh = null;
        this.pipeline = null;
        this.light = null;
        this.shadowGenerator = null;
        this.ambientLight = null;
        this.active = true;

        // --- 护盾整体亮度控制 ---
        // 调整此值可同时改变护盾的视觉发光度和对周围环境的照明强度
        // 1.0 为基准值
        this.brightness = 1;

        this.createShieldMesh();
        if (Config.shield && Config.shield.particlesEnabled) {
            this.createParticles();
        }

        this.setupLightAndShadows();
        this.setActive(false);
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
        // 基准颜色 * 亮度系数
        shieldMat.emissiveColor = new Color3(1, 0.8, 0).scale(this.brightness);

        // 2. Fresnel for Emissive (Glowing Edges)
        // 边缘(Left)是高亮金色，中心(Right)是暗色
        const fresnel = new FresnelParameters();
        fresnel.isEnabled = true;
        fresnel.bias = 0.1;
        fresnel.power = 1.0; // Controls how thin the rim is
        // 边缘高亮也受亮度系数影响
        fresnel.leftColor = new Color3(2.0, 1.8, 0.5).scale(this.brightness);
        fresnel.rightColor = new Color3(0.2, 0.15, 0).scale(this.brightness); // Dark Center
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

    setupBloom() {}

    setupLightAndShadows() {
        // 1. Create Point Light
        // Positioned at the center of the shield
        this.light = new PointLight("shieldLight", Vector3.Zero(), this.scene);
        this.light.parent = this.mesh;
        // 光照强度受亮度系数影响 (基准 2.0)
        this.light.intensity = 2.0 * this.brightness;
        this.light.diffuse = new Color3(1.0, 0.8, 0.0);
        this.light.range = 25;
        this.shadowGenerator = new ShadowGenerator(512*1, this.light);
        this.shadowGenerator.usePoissonSampling = true;
        this.shadowGenerator.setDarkness(0.35);
        const ground = this.scene.getMeshByName("ground");
        if (ground) {
            ground.receiveShadows = true;
        }
        if (this.parentMesh) {
            this.parentMesh.getChildMeshes().forEach(m => {
                this.shadowGenerator.addShadowCaster(m);
                m.receiveShadows = true;
            });
            const center = this.parentMesh.getAbsolutePosition();
            const r = 50;
            this.scene.meshes.forEach(mesh => {
                if (mesh.name.startsWith("stone") || mesh.name.startsWith("trunk") || mesh.name.startsWith("leaves")) {
                    const p = mesh.getAbsolutePosition ? mesh.getAbsolutePosition() : mesh.position;
                    if (p && Math.hypot(p.x - center.x, p.z - center.z) <= r) {
                        this.shadowGenerator.addShadowCaster(mesh);
                        mesh.receiveShadows = true;
                    }
                }
            });
        }
        this.scene.meshes.forEach(m => { m.receiveShadows = true; });

        // 4. Ambient Light for Player
        // Since the PointLight is inside the player's body, the body faces pointing outwards are dark.
        // We add a HemisphericLight restricted to the player to simulate the shield's ambient glow on the player.
        this.ambientLight = new HemisphericLight("shieldAmbientLight", new Vector3(0, 1, 0), this.scene);
        // 环境光强度受亮度系数影响 (基准 0.5)
        this.ambientLight.intensity = 0.5 * this.brightness;
        this.ambientLight.diffuse = new Color3(1.0, 0.9, 0.6);
        this.ambientLight.groundColor = new Color3(0.5, 0.4, 0.2); // Light from bottom too
        this.ambientLight.includedOnlyMeshes = [];

        if (this.parentMesh) {
            this.parentMesh.getChildMeshes().forEach(m => {
                this.ambientLight.includedOnlyMeshes.push(m);
            });
        }
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

    setActive(active) {
        this.active = active;
        if (this.mesh) this.mesh.setEnabled(active);
        if (this.light) this.light.setEnabled(active);
        if (this.ambientLight) this.ambientLight.setEnabled(active);
        if (this.particleSystem) {
            if (active) this.particleSystem.start();
            else this.particleSystem.stop();
        }
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
        if (this.light) {
            this.light.dispose();
        }
        if (this.shadowGenerator) {
            this.shadowGenerator.dispose();
        }
        if (this.ambientLight) {
            this.ambientLight.dispose();
        }
    }
}
