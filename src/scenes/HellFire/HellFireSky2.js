import { 
    MeshBuilder, 
    Vector3, 
    StandardMaterial, 
    Color3, 
    Color4,
    DynamicTexture,
    ParticleSystem,
    GlowLayer
} from "@babylonjs/core";

/**
 * 地狱火半岛风格天空 - 方案二
 * 使用多层天空盒 + 粒子系统实现
 */
export class HellfireSky {
    constructor(scene) {
        this.scene = scene;
        this.createLayers();
    }

    createLayers() {
        // 第一层：基础渐变天空盒
        this.createGradientSkybox();
        
        // 第二层：能量流粒子系统
        this.createEnergyStreams();
        
        // 第三层：次级能量粒子
        this.createSecondaryStreams();
        
        // 第四层：光晕/雾气效果
        this.createAtmosphericGlow();
    }

    /**
     * 创建渐变天空球
     */
    createGradientSkybox() {
        // 使用程序化纹理创建渐变天空
        const textureSize = 512;
        const dynamicTexture = new DynamicTexture("skyGradient", {
            width: textureSize,
            height: textureSize
        }, this.scene);

        const ctx = dynamicTexture.getContext();
        
        // 创建垂直渐变
        const gradient = ctx.createLinearGradient(0, 0, 0, textureSize);
        gradient.addColorStop(0, '#1a0528');      // 深紫色顶部
        gradient.addColorStop(0.25, '#2d0820');   // 紫红过渡
        gradient.addColorStop(0.5, '#3d0d1a');    // 暗红色
        gradient.addColorStop(0.75, '#4a1a0f');   // 褐红色
        gradient.addColorStop(1, '#2a1008');      // 暗褐色底部
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, textureSize, textureSize);
        
        // 添加一些星云纹理效果
        this.addNebulaEffect(ctx, textureSize);
        
        dynamicTexture.update();

        // 创建天空球
        this.baseSky = MeshBuilder.CreateSphere("baseSky", {
            diameter: 900,
            segments: 32
        }, this.scene);
        
        // 内部可见
        this.baseSky.scaling.x = -1;
        this.baseSky.isPickable = false;
        this.baseSky.infiniteDistance = true;

        const baseMaterial = new StandardMaterial("baseSkyMat", this.scene);
        baseMaterial.diffuseTexture = dynamicTexture;
        baseMaterial.emissiveTexture = dynamicTexture;
        baseMaterial.emissiveColor = new Color3(0.3, 0.3, 0.3);
        baseMaterial.backFaceCulling = false;
        baseMaterial.disableLighting = true;
        this.baseSky.material = baseMaterial;
    }

    /**
     * 添加星云纹理效果
     */
    addNebulaEffect(ctx, size) {
        // 添加随机星云斑点
        ctx.globalAlpha = 0.15;
        
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 60 + 20;
            
            const nebulaGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            
            // 随机选择星云颜色
            const colorChoice = Math.random();
            if (colorChoice < 0.4) {
                // 紫色星云
                nebulaGradient.addColorStop(0, 'rgba(80, 40, 100, 0.5)');
                nebulaGradient.addColorStop(1, 'rgba(40, 20, 60, 0)');
            } else if (colorChoice < 0.7) {
                // 红色星云
                nebulaGradient.addColorStop(0, 'rgba(100, 40, 40, 0.4)');
                nebulaGradient.addColorStop(1, 'rgba(60, 20, 20, 0)');
            } else {
                // 暗橙色星云
                nebulaGradient.addColorStop(0, 'rgba(80, 50, 30, 0.3)');
                nebulaGradient.addColorStop(1, 'rgba(40, 25, 15, 0)');
            }
            
            ctx.fillStyle = nebulaGradient;
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        
        ctx.globalAlpha = 1.0;
    }

    /**
     * 创建主能量流粒子系统
     */
    createEnergyStreams() {
        const particleSystem = new ParticleSystem("energyStream", 1500, this.scene);
        
        // 使用程序化粒子纹理
        particleSystem.particleTexture = this.createEnergyTexture("mainEnergy", 128);
        
        // 发射器设置（从天空一侧向另一侧流动）
        particleSystem.emitter = new Vector3(300, 80, 0);
        particleSystem.minEmitBox = new Vector3(-50, -100, -300);
        particleSystem.maxEmitBox = new Vector3(50, 100, 300);
        
        // 粒子颜色 - 黄绿色能量流
        particleSystem.color1 = new Color4(1.0, 0.95, 0.4, 0.7);    // 亮黄色
        particleSystem.color2 = new Color4(0.8, 0.9, 0.3, 0.5);     // 黄绿色
        particleSystem.colorDead = new Color4(0.4, 0.6, 0.2, 0);    // 淡绿色消失
        
        // 粒子大小
        particleSystem.minSize = 30;
        particleSystem.maxSize = 100;
        
        // 粒子生命周期
        particleSystem.minLifeTime = 8;
        particleSystem.maxLifeTime = 15;
        
        // 发射速率
        particleSystem.emitRate = 40;
        
        // 流动方向（斜向流动）
        particleSystem.direction1 = new Vector3(-1, 0.3, 0.2);
        particleSystem.direction2 = new Vector3(-0.8, 0.5, -0.2);
        
        // 发射力度
        particleSystem.minEmitPower = 8;
        particleSystem.maxEmitPower = 15;
        
        // 重力（轻微向上飘）
        particleSystem.gravity = new Vector3(0, 0.5, 0);
        
        // 角速度（旋转）
        particleSystem.minAngularSpeed = -0.5;
        particleSystem.maxAngularSpeed = 0.5;
        
        // 混合模式（加法发光）
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // 禁用深度写入，避免遮挡问题
        particleSystem.renderingGroupId = 0;
        
        particleSystem.start();
        this.energyParticles = particleSystem;
    }

    /**
     * 创建次级能量流粒子系统
     */
    createSecondaryStreams() {
        const particleSystem = new ParticleSystem("secondaryStream", 800, this.scene);
        
        // 使用不同的粒子纹理
        particleSystem.particleTexture = this.createEnergyTexture("secondEnergy", 96);
        
        // 发射器设置（从不同方向）
        particleSystem.emitter = new Vector3(-200, 120, 100);
        particleSystem.minEmitBox = new Vector3(-80, -80, -200);
        particleSystem.maxEmitBox = new Vector3(80, 80, 200);
        
        // 粒子颜色 - 偏绿色的次级能量流
        particleSystem.color1 = new Color4(0.7, 0.95, 0.5, 0.5);
        particleSystem.color2 = new Color4(0.5, 0.8, 0.4, 0.4);
        particleSystem.colorDead = new Color4(0.3, 0.5, 0.2, 0);
        
        // 粒子大小（较小）
        particleSystem.minSize = 20;
        particleSystem.maxSize = 60;
        
        // 粒子生命周期
        particleSystem.minLifeTime = 6;
        particleSystem.maxLifeTime = 12;
        
        // 发射速率（较低）
        particleSystem.emitRate = 25;
        
        // 流动方向
        particleSystem.direction1 = new Vector3(0.8, 0.2, -0.5);
        particleSystem.direction2 = new Vector3(1, 0.4, 0.3);
        
        // 发射力度
        particleSystem.minEmitPower = 5;
        particleSystem.maxEmitPower = 12;
        
        // 重力
        particleSystem.gravity = new Vector3(0, 0.3, 0);
        
        // 混合模式
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        particleSystem.start();
        this.secondaryParticles = particleSystem;
    }

    /**
     * 创建能量粒子纹理
     */
    createEnergyTexture(name, size) {
        const dynamicTexture = new DynamicTexture(name + "Tex", size, this.scene);
        const ctx = dynamicTexture.getContext();
        
        // 清除背景
        ctx.clearRect(0, 0, size, size);
        
        // 创建柔和的发光椭圆（模拟气流条状）
        const centerX = size / 2;
        const centerY = size / 2;
        
        // 主发光核心
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, size / 2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 220, 1)');     // 亮白黄核心
        gradient.addColorStop(0.2, 'rgba(255, 250, 150, 0.9)'); // 亮黄色
        gradient.addColorStop(0.4, 'rgba(255, 240, 100, 0.6)'); // 黄色
        gradient.addColorStop(0.7, 'rgba(200, 220, 80, 0.3)');  // 黄绿色
        gradient.addColorStop(1, 'rgba(100, 150, 50, 0)');      // 透明边缘
        
        ctx.fillStyle = gradient;
        
        // 绘制拉长的椭圆形状（模拟气流）
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(1.5, 0.6);  // 横向拉长
        ctx.beginPath();
        ctx.arc(0, 0, size / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        dynamicTexture.update();
        
        return dynamicTexture;
    }

    /**
     * 创建大气光晕效果
     */
    createAtmosphericGlow() {
        // 创建光晕层
        this.glowLayer = new GlowLayer("skyGlow", this.scene, {
            mainTextureFixedSize: 512,
            blurKernelSize: 64
        });
        this.glowLayer.intensity = 0.4;
        
        // 排除天空球，只对粒子生效
        this.glowLayer.addExcludedMesh(this.baseSky);
    }

    /**
     * 设置能量流强度
     * @param {number} intensity 0-1 范围
     */
    setIntensity(intensity) {
        if (this.energyParticles) {
            this.energyParticles.emitRate = 40 * intensity;
        }
        if (this.secondaryParticles) {
            this.secondaryParticles.emitRate = 25 * intensity;
        }
        if (this.glowLayer) {
            this.glowLayer.intensity = 0.4 * intensity;
        }
    }

    /**
     * 暂停/恢复能量流动画
     */
    setAnimating(enabled) {
        if (enabled) {
            this.energyParticles?.start();
            this.secondaryParticles?.start();
        } else {
            this.energyParticles?.stop();
            this.secondaryParticles?.stop();
        }
    }

    dispose() {
        if (this.baseSky) {
            this.baseSky.dispose();
        }
        if (this.energyParticles) {
            this.energyParticles.dispose();
        }
        if (this.secondaryParticles) {
            this.secondaryParticles.dispose();
        }
        if (this.glowLayer) {
            this.glowLayer.dispose();
        }
    }
}
