import { 
    Vector3, 
    MeshBuilder, 
    StandardMaterial, 
    Color3, 
    Color4,
    Animation,
    ParticleSystem,
    Texture,
    TransformNode,
    Mesh,
    PointLight
} from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

/**
 * 龙息术技能
 * 召唤龙头喷射烈焰，对前方敌人造成持续火焰伤害
 */
export class DragonBreath extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "龙息术", 2.0); // 2秒冷却
    }

    execute() {
        const playerPos = this.player.mesh.position.clone();
        const playerRotation = this.getPlayerRotation();
        
        // 播放施法动画
        this.playCastAnimation();
        
        // 延迟释放技能效果（配合施法动画）
        setTimeout(() => {
            this.createDragonBreath(playerPos, playerRotation);
        }, 200);
    }

    /**
     * 施法动画 - 单手前推释放龙息
     */
    playCastAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.rightShoulder) return;
        
        const scene = this.scene;
        const fps = 60;
        
        // 保存初始状态
        const rightStartX = boxMan.rightShoulder.rotation.x;
        const rightStartY = boxMan.rightShoulder.rotation.y;
        const rightStartZ = boxMan.rightShoulder.rotation.z;
        
        // 标记动画状态
        this.player.dragonBreathAnimating = true;
        
        // 右臂动画 - 前推释放
        const rightAnimX = new Animation("dragonRightX", "rotation.x", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: rightStartX },
            { frame: 8, value: -1.8 },        // 手臂平举
            { frame: 50, value: -1.8 },       // 保持姿势（持续喷火）
            { frame: 60, value: rightStartX } // 恢复
        ]);
        
        const rightAnimY = new Animation("dragonRightY", "rotation.y", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimY.setKeys([
            { frame: 0, value: rightStartY },
            { frame: 8, value: -0.3 },
            { frame: 50, value: -0.3 },
            { frame: 60, value: rightStartY }
        ]);
        
        const rightAnimZ = new Animation("dragonRightZ", "rotation.z", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimZ.setKeys([
            { frame: 0, value: rightStartZ },
            { frame: 8, value: 0 },
            { frame: 50, value: 0 },
            { frame: 60, value: rightStartZ }
        ]);
        
        // 停止现有动画
        scene.stopAnimation(boxMan.rightShoulder);
        
        // 播放动画
        const rightAnimatable = scene.beginDirectAnimation(
            boxMan.rightShoulder, 
            [rightAnimX, rightAnimY, rightAnimZ], 
            0, 60, false, 1.0
        );
        
        rightAnimatable.onAnimationEnd = () => {
            this.player.dragonBreathAnimating = false;
        };
    }

    getPlayerRotation() {
        if (this.player.modelRoot.rotationQuaternion) {
            return this.player.modelRoot.rotationQuaternion.toEulerAngles().y;
        }
        return this.player.modelRoot.rotation.y;
    }

    /**
     * 创建龙息术效果
     */
    createDragonBreath(position, rotation) {
        const scene = this.scene;
        const glowLayer = this.player.glowLayer;
        
        // 效果参数
        const breathDuration = 1.0; // 持续时间（秒）
        const breathRange = 8;       // 火焰射程
        
        // 创建根节点（位于玩家前方）
        const rootNode = new TransformNode("dragonBreathRoot", scene);
        rootNode.position = position.clone();
        rootNode.position.y += 1.2; // 手部高度
        rootNode.rotation.y = rotation;
        
        // 创建龙头
        const dragonHead = this.createDragonHead(scene, glowLayer);
        dragonHead.parent = rootNode;
        dragonHead.position.z = 1.5; // 在玩家前方
        
        // 创建火焰光源
        const fireLight = new PointLight("dragonFireLight", new Vector3(0, 0, 2), scene);
        fireLight.parent = rootNode;
        fireLight.intensity = 5;
        fireLight.diffuse = new Color3(1.0, 0.5, 0.1);
        fireLight.specular = new Color3(1.0, 0.3, 0.0);
        fireLight.range = 10;
        
        // 创建火焰粒子系统
        const flameEmitter = new TransformNode("flameEmitter", scene);
        flameEmitter.parent = dragonHead;
        flameEmitter.position.z = 0.8; // 龙嘴位置
        
        const flamePS = this.createFlameParticles(flameEmitter, breathRange);
        const sparkPS = this.createSparkParticles(flameEmitter, breathRange);
        const smokePS = this.createSmokeParticles(flameEmitter, breathRange);
        const corePS = this.createCoreFlameParticles(flameEmitter);
        
        // 龙头出现动画
        this.animateDragonHead(dragonHead, scene);
        
        // 管理效果生命周期
        let frameCount = 0;
        const fps = 60;
        const totalFrames = breathDuration * fps;
        
        const effectObserver = scene.onBeforeRenderObservable.add(() => {
            frameCount++;
            const progress = frameCount / totalFrames;
            
            // 火焰光源闪烁
            fireLight.intensity = 5 + Math.sin(frameCount * 0.5) * 2 + Math.random() * 1;
            fireLight.position.z = 2 + progress * 3;
            
            // 效果结束
            if (frameCount >= totalFrames) {
                scene.onBeforeRenderObservable.remove(effectObserver);
                
                // 停止粒子
                flamePS.stop();
                sparkPS.stop();
                smokePS.stop();
                corePS.stop();
                
                // 龙头消失动画
                this.animateDragonHeadDisappear(dragonHead, scene, () => {
                    // 延迟清理资源
                    setTimeout(() => {
                        flamePS.dispose();
                        sparkPS.dispose();
                        smokePS.dispose();
                        corePS.dispose();
                        fireLight.dispose();
                        dragonHead.dispose();
                        flameEmitter.dispose();
                        rootNode.dispose();
                        console.log("龙息术效果消散");
                    }, 500);
                });
            }
        });
    }

    /**
     * 创建龙头模型
     */
    createDragonHead(scene, glowLayer) {
        const dragonHead = new TransformNode("dragonHead", scene);
        
        // 龙头主体（椭球形）
        const headMain = MeshBuilder.CreateSphere("dragonHeadMain", {
            diameterX: 0.8,
            diameterY: 0.6,
            diameterZ: 1.2,
            segments: 16
        }, scene);
        headMain.parent = dragonHead;
        headMain.position.z = -0.3;
        
        const headMat = new StandardMaterial("dragonHeadMat", scene);
        headMat.emissiveColor = new Color3(0.8, 0.3, 0.0);
        headMat.diffuseColor = new Color3(0.6, 0.2, 0.0);
        headMat.specularColor = new Color3(1.0, 0.5, 0.2);
        headMat.alpha = 0.9;
        headMat.disableLighting = true;
        headMain.material = headMat;
        
        // 龙嘴（锥形）
        const snout = MeshBuilder.CreateCylinder("dragonSnout", {
            diameterTop: 0.2,
            diameterBottom: 0.5,
            height: 0.8,
            tessellation: 8
        }, scene);
        snout.parent = dragonHead;
        snout.rotation.x = Math.PI / 2;
        snout.position.z = 0.4;
        
        const snoutMat = new StandardMaterial("snoutMat", scene);
        snoutMat.emissiveColor = new Color3(0.9, 0.4, 0.1);
        snoutMat.diffuseColor = new Color3(0.7, 0.3, 0.0);
        snoutMat.alpha = 0.9;
        snoutMat.disableLighting = true;
        snout.material = snoutMat;
        
        // 龙角（左）
        const hornLeft = MeshBuilder.CreateCylinder("hornLeft", {
            diameterTop: 0,
            diameterBottom: 0.15,
            height: 0.5,
            tessellation: 6
        }, scene);
        hornLeft.parent = dragonHead;
        hornLeft.position = new Vector3(-0.3, 0.35, -0.4);
        hornLeft.rotation.z = 0.4;
        hornLeft.rotation.x = -0.3;
        
        const hornMat = new StandardMaterial("hornMat", scene);
        hornMat.emissiveColor = new Color3(1.0, 0.6, 0.2);
        hornMat.diffuseColor = new Color3(0.8, 0.4, 0.1);
        hornMat.disableLighting = true;
        hornLeft.material = hornMat;
        
        // 龙角（右）
        const hornRight = hornLeft.clone("hornRight");
        hornRight.parent = dragonHead;
        hornRight.position.x = 0.3;
        hornRight.rotation.z = -0.4;
        
        // 龙眼（左）
        const eyeLeft = MeshBuilder.CreateSphere("eyeLeft", { diameter: 0.12 }, scene);
        eyeLeft.parent = dragonHead;
        eyeLeft.position = new Vector3(-0.25, 0.1, 0.1);
        
        const eyeMat = new StandardMaterial("eyeMat", scene);
        eyeMat.emissiveColor = new Color3(1.0, 1.0, 0.3);
        eyeMat.diffuseColor = new Color3(1.0, 0.8, 0.0);
        eyeMat.disableLighting = true;
        eyeLeft.material = eyeMat;
        
        // 龙眼（右）
        const eyeRight = eyeLeft.clone("eyeRight");
        eyeRight.parent = dragonHead;
        eyeRight.position.x = 0.25;
        eyeRight.material = eyeMat;
        
        // 添加到发光层
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(headMain);
            glowLayer.addIncludedOnlyMesh(snout);
            glowLayer.addIncludedOnlyMesh(hornLeft);
            glowLayer.addIncludedOnlyMesh(hornRight);
            glowLayer.addIncludedOnlyMesh(eyeLeft);
            glowLayer.addIncludedOnlyMesh(eyeRight);
        }
        
        // 初始缩放为0（用于出现动画）
        dragonHead.scaling = new Vector3(0, 0, 0);
        
        return dragonHead;
    }

    /**
     * 龙头出现动画
     */
    animateDragonHead(dragonHead, scene) {
        const scaleAnim = new Animation("dragonAppear", "scaling", 60,
            Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        scaleAnim.setKeys([
            { frame: 0, value: new Vector3(0, 0, 0) },
            { frame: 5, value: new Vector3(1.3, 1.3, 1.3) },
            { frame: 10, value: new Vector3(1.0, 1.0, 1.0) }
        ]);
        
        scene.beginDirectAnimation(dragonHead, [scaleAnim], 0, 10, false);
    }

    /**
     * 龙头消失动画
     */
    animateDragonHeadDisappear(dragonHead, scene, onComplete) {
        const scaleAnim = new Animation("dragonDisappear", "scaling", 60,
            Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        scaleAnim.setKeys([
            { frame: 0, value: new Vector3(1.0, 1.0, 1.0) },
            { frame: 10, value: new Vector3(0, 0, 0) }
        ]);
        
        const animatable = scene.beginDirectAnimation(dragonHead, [scaleAnim], 0, 10, false);
        animatable.onAnimationEnd = onComplete;
    }

    /**
     * 创建主火焰粒子
     */
    createFlameParticles(emitter, range) {
        const scene = this.scene;
        
        const ps = new ParticleSystem("dragonFlame", 2000, scene);
        ps.particleTexture = this.createFlameTexture();
        ps.emitter = emitter;
        
        // 锥形发射区域
        ps.minEmitBox = new Vector3(-0.2, -0.2, 0);
        ps.maxEmitBox = new Vector3(0.2, 0.2, 0.3);
        
        // 火焰颜色 - 从白黄核心到红橙边缘
        ps.color1 = new Color4(1.0, 0.9, 0.4, 1.0);
        ps.color2 = new Color4(1.0, 0.5, 0.1, 1.0);
        ps.colorDead = new Color4(0.8, 0.2, 0.0, 0.0);
        
        ps.minSize = 0.4;
        ps.maxSize = 1.2;
        ps.minLifeTime = 0.3;
        ps.maxLifeTime = 0.6;
        
        ps.emitRate = 800;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.minEmitPower = 8;
        ps.maxEmitPower = 15;
        
        // 火焰向前喷射
        ps.direction1 = new Vector3(-0.3, -0.2, 1);
        ps.direction2 = new Vector3(0.3, 0.3, 1);
        
        // 火焰向上升腾
        ps.gravity = new Vector3(0, 2, 0);
        
        ps.minAngularSpeed = -Math.PI * 2;
        ps.maxAngularSpeed = Math.PI * 2;
        
        ps.start();
        
        return ps;
    }

    /**
     * 创建火星粒子
     */
    createSparkParticles(emitter, range) {
        const scene = this.scene;
        
        const ps = new ParticleSystem("dragonSparks", 600, scene);
        ps.particleTexture = this.createSparkTexture();
        ps.emitter = emitter;
        
        ps.minEmitBox = new Vector3(-0.1, -0.1, 0);
        ps.maxEmitBox = new Vector3(0.1, 0.1, 0.2);
        
        // 明亮的火星颜色
        ps.color1 = new Color4(1.0, 1.0, 0.6, 1.0);
        ps.color2 = new Color4(1.0, 0.7, 0.2, 1.0);
        ps.colorDead = new Color4(1.0, 0.3, 0.0, 0.0);
        
        ps.minSize = 0.05;
        ps.maxSize = 0.15;
        ps.minLifeTime = 0.5;
        ps.maxLifeTime = 1.2;
        
        ps.emitRate = 300;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.minEmitPower = 10;
        ps.maxEmitPower = 20;
        
        // 火星四散
        ps.direction1 = new Vector3(-0.5, -0.3, 0.8);
        ps.direction2 = new Vector3(0.5, 0.5, 1.2);
        
        ps.gravity = new Vector3(0, -2, 0);
        
        ps.start();
        
        return ps;
    }

    /**
     * 创建烟雾粒子
     */
    createSmokeParticles(emitter, range) {
        const scene = this.scene;
        
        const ps = new ParticleSystem("dragonSmoke", 300, scene);
        ps.particleTexture = this.createSmokeTexture();
        ps.emitter = emitter;
        
        ps.minEmitBox = new Vector3(-0.3, -0.3, 0.5);
        ps.maxEmitBox = new Vector3(0.3, 0.3, 1);
        
        // 黑灰色烟雾
        ps.color1 = new Color4(0.3, 0.3, 0.3, 0.4);
        ps.color2 = new Color4(0.2, 0.2, 0.2, 0.3);
        ps.colorDead = new Color4(0.1, 0.1, 0.1, 0.0);
        
        ps.minSize = 0.5;
        ps.maxSize = 1.5;
        ps.minLifeTime = 0.8;
        ps.maxLifeTime = 1.5;
        
        ps.emitRate = 100;
        ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        
        ps.minEmitPower = 3;
        ps.maxEmitPower = 6;
        
        ps.direction1 = new Vector3(-0.3, 0.3, 0.8);
        ps.direction2 = new Vector3(0.3, 0.6, 1);
        
        ps.gravity = new Vector3(0, 1, 0);
        
        ps.start();
        
        return ps;
    }

    /**
     * 创建核心火焰粒子（龙嘴处的炽热核心）
     */
    createCoreFlameParticles(emitter) {
        const scene = this.scene;
        
        const ps = new ParticleSystem("dragonCore", 400, scene);
        ps.particleTexture = this.createCoreTexture();
        ps.emitter = emitter;
        
        ps.createSphereEmitter(0.2);
        
        // 白热核心
        ps.color1 = new Color4(1.0, 1.0, 1.0, 1.0);
        ps.color2 = new Color4(1.0, 0.9, 0.5, 1.0);
        ps.colorDead = new Color4(1.0, 0.5, 0.0, 0.0);
        
        ps.minSize = 0.2;
        ps.maxSize = 0.5;
        ps.minLifeTime = 0.1;
        ps.maxLifeTime = 0.2;
        
        ps.emitRate = 500;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.minEmitPower = 1;
        ps.maxEmitPower = 3;
        
        ps.start();
        
        return ps;
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
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "dragonFlameTex", this.scene);
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
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "dragonSparkTex", this.scene);
    }

    /**
     * 创建烟雾纹理
     */
    createSmokeTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(80, 80, 80, 0.6)");
        grad.addColorStop(0.4, "rgba(60, 60, 60, 0.4)");
        grad.addColorStop(0.7, "rgba(40, 40, 40, 0.2)");
        grad.addColorStop(1, "rgba(20, 20, 20, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "dragonSmokeTex", this.scene);
    }

    /**
     * 创建核心纹理
     */
    createCoreTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.3, "rgba(255, 255, 200, 0.9)");
        grad.addColorStop(0.6, "rgba(255, 200, 100, 0.5)");
        grad.addColorStop(1, "rgba(255, 150, 50, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "dragonCoreTex", this.scene);
    }
}
