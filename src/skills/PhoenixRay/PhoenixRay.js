import { 
    Vector3, 
    MeshBuilder, 
    StandardMaterial, 
    Color3, 
    Color4,
    ParticleSystem,
    Texture,
    TransformNode,
    PointLight,
    Animation,
    TrailMesh,
    ShaderMaterial,
    Effect
} from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

/**
 * 凤凰射线技能
 * 按住鼠标中键持续释放烈焰射线
 */
export class PhoenixRay extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "凤凰射线", 0); // 无冷却（持续释放技能）
        
        // 持续释放状态
        this.isChanneling = false;
        this.effectRoot = null;
        this.particleSystems = [];
        this.lights = [];
        this.meshes = [];
        this.observers = [];
        
        // 射线参数
        this.rayLength = 15;       // 射线长度
        this.rayWidth = 0.3;       // 射线宽度
    }

    /**
     * 开始持续释放
     */
    startChanneling() {
        if (this.isChanneling) return;
        
        this.isChanneling = true;
        console.log("开始释放：凤凰射线");
        
        // 播放施法动画
        this.playCastAnimation();
        
        // 创建射线效果
        this.createRayEffect();
    }

    /**
     * 停止持续释放
     */
    stopChanneling() {
        if (!this.isChanneling) return;
        
        this.isChanneling = false;
        console.log("停止释放：凤凰射线");
        
        // 播放收手动画
        this.playEndAnimation();
        
        // 清理效果
        this.cleanupEffect();
    }

    /**
     * 施法动画 - 双手前推释放射线
     */
    playCastAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.rightShoulder) return;
        
        const scene = this.scene;
        const fps = 60;
        
        // 保存初始状态
        const rightStartX = boxMan.rightShoulder.rotation.x;
        const rightStartZ = boxMan.rightShoulder.rotation.z;
        
        // 标记动画状态
        this.player.phoenixRayAnimating = true;
        
        // 右臂动画 - 前推
        const rightAnimX = new Animation("phoenixRightX", "rotation.x", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: rightStartX },
            { frame: 10, value: -1.6 }  // 手臂平举前推
        ]);
        
        const rightAnimZ = new Animation("phoenixRightZ", "rotation.z", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimZ.setKeys([
            { frame: 0, value: rightStartZ },
            { frame: 10, value: 0.3 }
        ]);
        
        scene.stopAnimation(boxMan.rightShoulder);
        scene.beginDirectAnimation(boxMan.rightShoulder, [rightAnimX, rightAnimZ], 0, 10, false);
    }

    /**
     * 收手动画
     */
    playEndAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.rightShoulder) return;
        
        const scene = this.scene;
        const fps = 60;
        
        const rightAnimX = new Animation("phoenixEndX", "rotation.x", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: boxMan.rightShoulder.rotation.x },
            { frame: 15, value: 0 }
        ]);
        
        const rightAnimZ = new Animation("phoenixEndZ", "rotation.z", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimZ.setKeys([
            { frame: 0, value: boxMan.rightShoulder.rotation.z },
            { frame: 15, value: 0 }
        ]);
        
        scene.stopAnimation(boxMan.rightShoulder);
        const anim = scene.beginDirectAnimation(boxMan.rightShoulder, [rightAnimX, rightAnimZ], 0, 15, false);
        anim.onAnimationEnd = () => {
            this.player.phoenixRayAnimating = false;
        };
    }

    /**
     * 创建射线效果
     */
    createRayEffect() {
        const scene = this.scene;
        const glowLayer = this.player.glowLayer;
        
        // 创建根节点
        this.effectRoot = new TransformNode("phoenixRayRoot", scene);
        
        // 创建射线核心
        this.createRayCore();
        
        // 创建火焰粒子
        this.createFlameParticles();
        
        // 创建火星粒子
        this.createSparkParticles();
        
        // 创建热浪扭曲效果
        this.createHeatDistortion();
        
        // 创建光源
        this.createFireLight();
        
        // 创建凤凰羽毛粒子
        this.createFeatherParticles();
        
        // 每帧更新位置
        const updateObserver = scene.onBeforeRenderObservable.add(() => {
            if (!this.isChanneling || !this.effectRoot) return;
            
            this.updateRayPosition();
            this.updateLightFlicker();
        });
        this.observers.push(updateObserver);
    }

    /**
     * 创建射线核心 - 多层圆柱体组成的射线
     */
    createRayCore() {
        const scene = this.scene;
        const glowLayer = this.player.glowLayer;
        
        // 外层射线（橙红色）
        const outerRay = MeshBuilder.CreateCylinder("phoenixRayOuter", {
            height: this.rayLength,
            diameterTop: this.rayWidth * 0.8,
            diameterBottom: this.rayWidth * 1.2,
            tessellation: 16
        }, scene);
        outerRay.rotation.x = Math.PI / 2;
        outerRay.position.z = this.rayLength / 2;
        outerRay.parent = this.effectRoot;
        
        const outerMat = new StandardMaterial("outerRayMat", scene);
        outerMat.emissiveColor = new Color3(1.0, 0.4, 0.1);
        outerMat.diffuseColor = new Color3(1.0, 0.3, 0.0);
        outerMat.alpha = 0.6;
        outerMat.backFaceCulling = false;
        outerMat.disableLighting = true;
        outerRay.material = outerMat;
        this.meshes.push(outerRay);
        
        // 中层射线（亮橙色）
        const midRay = MeshBuilder.CreateCylinder("phoenixRayMid", {
            height: this.rayLength,
            diameterTop: this.rayWidth * 0.5,
            diameterBottom: this.rayWidth * 0.8,
            tessellation: 16
        }, scene);
        midRay.rotation.x = Math.PI / 2;
        midRay.position.z = this.rayLength / 2;
        midRay.parent = this.effectRoot;
        
        const midMat = new StandardMaterial("midRayMat", scene);
        midMat.emissiveColor = new Color3(1.0, 0.6, 0.2);
        midMat.diffuseColor = new Color3(1.0, 0.5, 0.1);
        midMat.alpha = 0.7;
        midMat.backFaceCulling = false;
        midMat.disableLighting = true;
        midRay.material = midMat;
        this.meshes.push(midRay);
        
        // 内层射线（白黄色核心）
        const innerRay = MeshBuilder.CreateCylinder("phoenixRayInner", {
            height: this.rayLength,
            diameterTop: this.rayWidth * 0.2,
            diameterBottom: this.rayWidth * 0.4,
            tessellation: 16
        }, scene);
        innerRay.rotation.x = Math.PI / 2;
        innerRay.position.z = this.rayLength / 2;
        innerRay.parent = this.effectRoot;
        
        const innerMat = new StandardMaterial("innerRayMat", scene);
        innerMat.emissiveColor = new Color3(1.0, 0.95, 0.7);
        innerMat.diffuseColor = new Color3(1.0, 0.9, 0.5);
        innerMat.alpha = 0.9;
        innerMat.backFaceCulling = false;
        innerMat.disableLighting = true;
        innerRay.material = innerMat;
        this.meshes.push(innerRay);
        
        // 添加到发光层
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(outerRay);
            glowLayer.addIncludedOnlyMesh(midRay);
            glowLayer.addIncludedOnlyMesh(innerRay);
        }
        
        // 射线脉动动画
        let pulseFrame = 0;
        const pulseObserver = scene.onBeforeRenderObservable.add(() => {
            if (!this.isChanneling) return;
            
            pulseFrame++;
            const pulse = 1 + Math.sin(pulseFrame * 0.2) * 0.15;
            const pulse2 = 1 + Math.sin(pulseFrame * 0.3 + 1) * 0.1;
            
            outerRay.scaling.x = pulse;
            outerRay.scaling.y = pulse;
            midRay.scaling.x = pulse2;
            midRay.scaling.y = pulse2;
            
            // 颜色脉动
            const flicker = 0.8 + Math.random() * 0.2;
            outerMat.emissiveColor = new Color3(1.0 * flicker, 0.4 * flicker, 0.1 * flicker);
        });
        this.observers.push(pulseObserver);
    }

    /**
     * 创建火焰粒子
     */
    createFlameParticles() {
        const scene = this.scene;
        
        // 沿射线长度创建多个发射点
        for (let i = 0; i < 3; i++) {
            const emitter = new TransformNode(`flameEmitter${i}`, scene);
            emitter.parent = this.effectRoot;
            emitter.position.z = 2 + i * 4; // 沿射线分布
            
            const ps = new ParticleSystem(`phoenixFlame${i}`, 500, scene);
            ps.particleTexture = this.createFlameTexture();
            ps.emitter = emitter;
            
            ps.minEmitBox = new Vector3(-0.3, -0.3, -0.5);
            ps.maxEmitBox = new Vector3(0.3, 0.3, 0.5);
            
            // 火焰颜色渐变
            ps.color1 = new Color4(1.0, 0.8, 0.3, 1.0);
            ps.color2 = new Color4(1.0, 0.4, 0.1, 1.0);
            ps.colorDead = new Color4(0.8, 0.2, 0.0, 0.0);
            
            ps.minSize = 0.3;
            ps.maxSize = 0.8;
            ps.minLifeTime = 0.2;
            ps.maxLifeTime = 0.5;
            
            ps.emitRate = 150;
            ps.blendMode = ParticleSystem.BLENDMODE_ADD;
            
            ps.minEmitPower = 2;
            ps.maxEmitPower = 5;
            
            // 火焰向外扩散
            ps.direction1 = new Vector3(-1, -0.5, 0.5);
            ps.direction2 = new Vector3(1, 1, 1);
            
            ps.gravity = new Vector3(0, 2, 0);
            
            ps.minAngularSpeed = -Math.PI;
            ps.maxAngularSpeed = Math.PI;
            
            ps.start();
            this.particleSystems.push(ps);
        }
    }

    /**
     * 创建火星粒子
     */
    createSparkParticles() {
        const scene = this.scene;
        
        // 射线末端发射点
        const emitter = new TransformNode("sparkEmitter", scene);
        emitter.parent = this.effectRoot;
        emitter.position.z = this.rayLength;
        
        const ps = new ParticleSystem("phoenixSparks", 800, scene);
        ps.particleTexture = this.createSparkTexture();
        ps.emitter = emitter;
        
        ps.minEmitBox = new Vector3(-0.5, -0.5, -0.5);
        ps.maxEmitBox = new Vector3(0.5, 0.5, 0.5);
        
        ps.color1 = new Color4(1.0, 1.0, 0.5, 1.0);
        ps.color2 = new Color4(1.0, 0.6, 0.2, 1.0);
        ps.colorDead = new Color4(1.0, 0.3, 0.0, 0.0);
        
        ps.minSize = 0.05;
        ps.maxSize = 0.15;
        ps.minLifeTime = 0.3;
        ps.maxLifeTime = 0.8;
        
        ps.emitRate = 400;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.minEmitPower = 5;
        ps.maxEmitPower = 15;
        
        // 火星四散
        ps.direction1 = new Vector3(-1, -1, -0.5);
        ps.direction2 = new Vector3(1, 1, 1);
        
        ps.gravity = new Vector3(0, -3, 0);
        
        ps.start();
        this.particleSystems.push(ps);
        
        // 射线起点也发射火星
        const startEmitter = new TransformNode("startSparkEmitter", scene);
        startEmitter.parent = this.effectRoot;
        startEmitter.position.z = 0.5;
        
        const startPs = new ParticleSystem("phoenixStartSparks", 200, scene);
        startPs.particleTexture = this.createSparkTexture();
        startPs.emitter = startEmitter;
        
        startPs.createSphereEmitter(0.3);
        
        startPs.color1 = new Color4(1.0, 0.9, 0.5, 1.0);
        startPs.color2 = new Color4(1.0, 0.5, 0.1, 1.0);
        startPs.colorDead = new Color4(1.0, 0.2, 0.0, 0.0);
        
        startPs.minSize = 0.03;
        startPs.maxSize = 0.1;
        startPs.minLifeTime = 0.2;
        startPs.maxLifeTime = 0.5;
        
        startPs.emitRate = 100;
        startPs.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        startPs.minEmitPower = 2;
        startPs.maxEmitPower = 5;
        
        startPs.start();
        this.particleSystems.push(startPs);
    }

    /**
     * 创建热浪扭曲效果（用波动的半透明面片模拟）
     */
    createHeatDistortion() {
        const scene = this.scene;
        
        // 创建多个扭曲平面
        for (let i = 0; i < 4; i++) {
            const plane = MeshBuilder.CreatePlane(`heatPlane${i}`, {
                width: 1.5 + i * 0.5,
                height: 1.5 + i * 0.5
            }, scene);
            plane.parent = this.effectRoot;
            plane.position.z = 3 + i * 3;
            plane.billboardMode = 7; // 始终面向相机
            
            const heatMat = new StandardMaterial(`heatMat${i}`, scene);
            heatMat.emissiveColor = new Color3(1.0, 0.5, 0.2);
            heatMat.alpha = 0.1 - i * 0.02;
            heatMat.backFaceCulling = false;
            heatMat.disableLighting = true;
            plane.material = heatMat;
            
            this.meshes.push(plane);
        }
    }

    /**
     * 创建火焰光源
     */
    createFireLight() {
        const scene = this.scene;
        
        // 主光源（跟随射线前端）
        const mainLight = new PointLight("phoenixMainLight", new Vector3(0, 0, 5), scene);
        mainLight.parent = this.effectRoot;
        mainLight.intensity = 8;
        mainLight.diffuse = new Color3(1.0, 0.5, 0.1);
        mainLight.specular = new Color3(1.0, 0.3, 0.0);
        mainLight.range = 12;
        this.lights.push(mainLight);
        
        // 末端光源
        const endLight = new PointLight("phoenixEndLight", new Vector3(0, 0, this.rayLength), scene);
        endLight.parent = this.effectRoot;
        endLight.intensity = 5;
        endLight.diffuse = new Color3(1.0, 0.6, 0.2);
        endLight.specular = new Color3(1.0, 0.4, 0.1);
        endLight.range = 8;
        this.lights.push(endLight);
    }

    /**
     * 创建凤凰羽毛粒子（特色效果）
     */
    createFeatherParticles() {
        const scene = this.scene;
        
        const emitter = new TransformNode("featherEmitter", scene);
        emitter.parent = this.effectRoot;
        emitter.position.z = this.rayLength * 0.7;
        
        const ps = new ParticleSystem("phoenixFeathers", 100, scene);
        ps.particleTexture = this.createFeatherTexture();
        ps.emitter = emitter;
        
        ps.minEmitBox = new Vector3(-1, -1, -2);
        ps.maxEmitBox = new Vector3(1, 1, 2);
        
        // 金红色羽毛
        ps.color1 = new Color4(1.0, 0.8, 0.3, 0.9);
        ps.color2 = new Color4(1.0, 0.5, 0.1, 0.8);
        ps.colorDead = new Color4(1.0, 0.3, 0.0, 0.0);
        
        ps.minSize = 0.2;
        ps.maxSize = 0.5;
        ps.minLifeTime = 0.8;
        ps.maxLifeTime = 1.5;
        
        ps.emitRate = 30;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.minEmitPower = 1;
        ps.maxEmitPower = 3;
        
        ps.direction1 = new Vector3(-1, 0.5, -0.5);
        ps.direction2 = new Vector3(1, 1.5, 0.5);
        
        ps.gravity = new Vector3(0, 1, 0);
        
        ps.minAngularSpeed = -Math.PI * 0.5;
        ps.maxAngularSpeed = Math.PI * 0.5;
        
        ps.start();
        this.particleSystems.push(ps);
    }

    /**
     * 更新射线位置（跟随玩家朝向）
     */
    updateRayPosition() {
        if (!this.effectRoot) return;
        
        const playerPos = this.player.mesh.position.clone();
        const forward = this.player.mesh.getDirection(Vector3.Forward());
        const rotation = Math.atan2(forward.x, forward.z);
        
        // 从玩家手部位置发射
        this.effectRoot.position = playerPos.clone();
        this.effectRoot.position.y += 1.2; // 手部高度
        this.effectRoot.position.addInPlace(forward.scale(0.8)); // 前移一点
        this.effectRoot.rotation.y = rotation;
    }

    /**
     * 更新光源闪烁
     */
    updateLightFlicker() {
        for (const light of this.lights) {
            const baseIntensity = light.name.includes("Main") ? 8 : 5;
            light.intensity = baseIntensity + Math.sin(Date.now() * 0.01) * 2 + Math.random() * 1;
        }
    }

    /**
     * 清理效果
     */
    cleanupEffect() {
        // 停止粒子系统
        for (const ps of this.particleSystems) {
            ps.stop();
            setTimeout(() => ps.dispose(), 500);
        }
        this.particleSystems = [];
        
        // 清理光源
        for (const light of this.lights) {
            light.dispose();
        }
        this.lights = [];
        
        // 清理网格
        for (const mesh of this.meshes) {
            mesh.dispose();
        }
        this.meshes = [];
        
        // 移除观察者
        for (const observer of this.observers) {
            this.scene.onBeforeRenderObservable.remove(observer);
        }
        this.observers = [];
        
        // 清理根节点
        if (this.effectRoot) {
            this.effectRoot.dispose();
            this.effectRoot = null;
        }
    }

    /**
     * 创建火焰纹理
     */
    createFlameTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 200, 1)");
        grad.addColorStop(0.2, "rgba(255, 200, 100, 0.9)");
        grad.addColorStop(0.5, "rgba(255, 120, 50, 0.6)");
        grad.addColorStop(0.8, "rgba(200, 50, 20, 0.3)");
        grad.addColorStop(1, "rgba(100, 20, 0, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "phoenixFlameTex", this.scene);
    }

    /**
     * 创建火星纹理
     */
    createSparkTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.3, "rgba(255, 230, 150, 0.9)");
        grad.addColorStop(0.6, "rgba(255, 180, 80, 0.5)");
        grad.addColorStop(1, "rgba(255, 100, 30, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "phoenixSparkTex", this.scene);
    }

    /**
     * 创建羽毛纹理
     */
    createFeatherTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        // 绘制羽毛形状
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.bezierCurveTo(8, 16, 4, 48, 16, 64);
        ctx.bezierCurveTo(28, 48, 24, 16, 16, 0);
        ctx.closePath();
        
        const grad = ctx.createLinearGradient(0, 0, 0, 64);
        grad.addColorStop(0, "rgba(255, 230, 150, 1)");
        grad.addColorStop(0.3, "rgba(255, 180, 80, 0.9)");
        grad.addColorStop(0.7, "rgba(255, 100, 30, 0.7)");
        grad.addColorStop(1, "rgba(200, 50, 0, 0.3)");
        
        ctx.fillStyle = grad;
        ctx.fill();
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "phoenixFeatherTex", this.scene);
    }

    /**
     * 更新（每帧调用）
     */
    update(deltaTime) {
        super.update(deltaTime);
        // 持续技能无需额外更新
    }

    /**
     * execute 方法（保持兼容性，但此技能使用 startChanneling/stopChanneling）
     */
    execute() {
        // 此技能通过 startChanneling/stopChanneling 控制
        this.startChanneling();
    }

    /**
     * 开始释放（别名，兼容 player.js 调用）
     */
    start() {
        this.startChanneling();
    }

    /**
     * 停止释放（别名，兼容 player.js 调用）
     */
    stop() {
        this.stopChanneling();
    }
}
