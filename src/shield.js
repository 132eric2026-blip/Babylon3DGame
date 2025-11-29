import { MeshBuilder, StandardMaterial, Color3, Color4, ParticleSystem, Texture, Vector3, DefaultRenderingPipeline, FresnelParameters } from "@babylonjs/core";

export class Shield {
    constructor(scene, parentMesh) {
        this.scene = scene;
        this.parentMesh = parentMesh;
        this.mesh = null;
        this.pipeline = null;

        this.createShieldMesh();
        this.setupBloom();
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
        }
        this.pipeline = pipeline;
    }

    dispose() {
        if (this.mesh) {
            this.mesh.dispose();
        }
    }
}
