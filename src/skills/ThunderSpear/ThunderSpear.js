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
    GlowLayer,
    Mesh
} from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

/**
 * 雷霆之矛技能
 * 玩家双手前推聚能，释放一道强力雷电矛向前推进
 */
export class ThunderSpear extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "雷霆之矛", 1.5); // 1.5秒冷却
    }

    execute() {
        const playerPos = this.player.mesh.position.clone();
        const playerRotation = this.getPlayerRotation();
        
        // 播放施法动画
        this.playCastAnimation();
        
        // 延迟释放技能效果（配合施法动画）
        setTimeout(() => {
            this.createThunderSpear(playerPos, playerRotation);
        }, 200);
    }

    /**
     * 施法动画 - 双手前推聚能
     */
    playCastAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.rightShoulder || !boxMan.leftShoulder) return;
        
        const scene = this.scene;
        const fps = 60;
        
        // 保存初始状态
        const rightStartX = boxMan.rightShoulder.rotation.x;
        const rightStartY = boxMan.rightShoulder.rotation.y;
        const rightStartZ = boxMan.rightShoulder.rotation.z;
        const leftStartX = boxMan.leftShoulder.rotation.x;
        const leftStartY = boxMan.leftShoulder.rotation.y;
        const leftStartZ = boxMan.leftShoulder.rotation.z;
        
        // 标记动画状态
        this.player.thunderSpearAnimating = true;
        
        // 右臂动画 - 向前推出
        const rightAnimX = new Animation("thunderRightX", "rotation.x", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: rightStartX },
            { frame: 5, value: -0.5 },      // 蓄力收回
            { frame: 12, value: -2.0 },     // 前推
            { frame: 20, value: -1.8 },     // 保持
            { frame: 35, value: rightStartX }
        ]);
        
        const rightAnimY = new Animation("thunderRightY", "rotation.y", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimY.setKeys([
            { frame: 0, value: rightStartY },
            { frame: 5, value: 0.3 },       // 向内收
            { frame: 12, value: -0.5 },     // 向前推
            { frame: 20, value: -0.5 },
            { frame: 35, value: rightStartY }
        ]);
        
        const rightAnimZ = new Animation("thunderRightZ", "rotation.z", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimZ.setKeys([
            { frame: 0, value: rightStartZ },
            { frame: 5, value: 0.3 },
            { frame: 12, value: 0.0 },
            { frame: 35, value: rightStartZ }
        ]);
        
        // 左臂动画 - 同步前推
        const leftAnimX = new Animation("thunderLeftX", "rotation.x", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimX.setKeys([
            { frame: 0, value: leftStartX },
            { frame: 5, value: -0.5 },      // 蓄力收回
            { frame: 12, value: -2.0 },     // 前推
            { frame: 20, value: -1.8 },     // 保持
            { frame: 35, value: leftStartX }
        ]);
        
        const leftAnimY = new Animation("thunderLeftY", "rotation.y", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimY.setKeys([
            { frame: 0, value: leftStartY },
            { frame: 5, value: -0.3 },      // 向内收
            { frame: 12, value: 0.5 },      // 向前推
            { frame: 20, value: 0.5 },
            { frame: 35, value: leftStartY }
        ]);
        
        const leftAnimZ = new Animation("thunderLeftZ", "rotation.z", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimZ.setKeys([
            { frame: 0, value: leftStartZ },
            { frame: 5, value: -0.3 },
            { frame: 12, value: 0.0 },
            { frame: 35, value: leftStartZ }
        ]);
        
        // 停止现有动画
        scene.stopAnimation(boxMan.rightShoulder);
        scene.stopAnimation(boxMan.leftShoulder);
        
        // 播放动画
        const rightAnimatable = scene.beginDirectAnimation(
            boxMan.rightShoulder, 
            [rightAnimX, rightAnimY, rightAnimZ], 
            0, 35, false, 1.0
        );
        scene.beginDirectAnimation(
            boxMan.leftShoulder, 
            [leftAnimX, leftAnimY, leftAnimZ], 
            0, 35, false, 1.0
        );
        
        rightAnimatable.onAnimationEnd = () => {
            this.player.thunderSpearAnimating = false;
        };
    }

    getPlayerRotation() {
        if (this.player.modelRoot.rotationQuaternion) {
            return this.player.modelRoot.rotationQuaternion.toEulerAngles().y;
        }
        return this.player.modelRoot.rotation.y;
    }

    /**
     * 创建雷霆之矛效果
     */
    createThunderSpear(position, rotation) {
        const scene = this.scene;
        const glowLayer = this.player.glowLayer;
        
        // 矛的参数
        const spearLength = 2.5;
        const spearSpeed = 25;
        const maxDistance = 20;
        
        // 创建根节点
        const rootNode = new TransformNode("thunderSpearRoot", scene);
        
        // 从双手前方发射 - 获取手的位置
        let handsPosition = null; // 保存手的位置用于冲击波
        const boxMan = this.player.boxMan;
        if (boxMan && boxMan.rightShoulder && boxMan.leftShoulder) {
            // 获取左右肩膀的世界坐标
            const rightShoulderPos = boxMan.rightShoulder.getAbsolutePosition();
            const leftShoulderPos = boxMan.leftShoulder.getAbsolutePosition();
            
            // 计算双手中点
            const handsCenter = rightShoulderPos.add(leftShoulderPos).scale(0.5);
            
            // 手的位置在肩膀下方约0.5单位（手臂末端）
            handsCenter.y -= 0.3;
            
            // 保存手的位置（用于冲击波）
            handsPosition = handsCenter.clone();
            
            // 向前偏移（施法方向），让矛从手前方生成
            const forwardOffset = new Vector3(
                Math.sin(rotation) * 1.0,
                0,
                Math.cos(rotation) * 1.0
            );
            
            rootNode.position = handsCenter.add(forwardOffset);
        } else {
            // 备用位置
            rootNode.position = position.clone();
            rootNode.position.y += 1.2;
            handsPosition = rootNode.position.clone();
        }
        
        rootNode.rotation.y = rotation;
        
        // 计算前进方向
        const direction = new Vector3(
            Math.sin(rotation),
            0,
            Math.cos(rotation)
        );
        
        // 创建主矛体
        const spearMesh = this.createSpearMesh(scene, spearLength);
        spearMesh.parent = rootNode;
        spearMesh.position = new Vector3(0, 0, 1.5);
        spearMesh.rotation.x = Math.PI / 2;
        
        // 创建发光材质
        const spearMat = new StandardMaterial("thunderSpearMat", scene);
        spearMat.emissiveColor = new Color3(0.3, 0.6, 1.0);
        spearMat.diffuseColor = new Color3(0.5, 0.8, 1.0);
        spearMat.specularColor = new Color3(1.0, 1.0, 1.0);
        spearMat.alpha = 0.9;
        spearMat.disableLighting = true;
        spearMat.backFaceCulling = false;
        spearMesh.material = spearMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(spearMesh);
        }
        
        // 创建电弧粒子系统
        const arcPS = this.createArcParticles(scene, rootNode);
        
        // 创建核心粒子
        const corePS = this.createCoreParticles(scene, rootNode);
        
        // 创建尾迹粒子
        const trailPS = this.createTrailParticles(scene, rootNode);
        
        // 创建冲击波效果（在手的位置附近）
        this.createShockwave(handsPosition, rotation);
        
        // 发射动画
        let distanceTraveled = 0;
        const startTime = Date.now();
        
        const moveObserver = scene.onBeforeRenderObservable.add(() => {
            const dt = scene.getEngine().getDeltaTime() / 1000;
            const moveDistance = spearSpeed * dt;
            
            // 移动矛
            rootNode.position.addInPlace(direction.scale(moveDistance));
            distanceTraveled += moveDistance;
            
            // 旋转矛（电弧效果）
            spearMesh.rotation.z += dt * 15;
            
            // 检查是否达到最大距离
            if (distanceTraveled >= maxDistance) {
                // 创建爆炸效果
                this.createExplosion(rootNode.position.clone());
                
                // 清理
                scene.onBeforeRenderObservable.remove(moveObserver);
                arcPS.stop();
                corePS.stop();
                trailPS.stop();
                
                setTimeout(() => {
                    arcPS.dispose();
                    corePS.dispose();
                    trailPS.dispose();
                    spearMesh.dispose();
                    rootNode.dispose();
                }, 500);
            }
        });
    }

    /**
     * 创建矛体网格
     */
    createSpearMesh(scene, length) {
        // 创建矛头（锥体）
        const spearHead = MeshBuilder.CreateCylinder("spearHead", {
            height: length * 0.4,
            diameterTop: 0,
            diameterBottom: 0.3,
            tessellation: 8
        }, scene);
        spearHead.position.z = length * 0.3;
        
        // 创建矛身（圆柱）
        const spearBody = MeshBuilder.CreateCylinder("spearBody", {
            height: length * 0.6,
            diameter: 0.15,
            tessellation: 8
        }, scene);
        spearBody.position.z = -length * 0.1;
        
        // 创建能量环
        const energyRings = [];
        for (let i = 0; i < 3; i++) {
            const ring = MeshBuilder.CreateTorus("energyRing" + i, {
                diameter: 0.4 + i * 0.1,
                thickness: 0.03,
                tessellation: 16
            }, scene);
            ring.position.z = -length * 0.2 + i * 0.3;
            ring.rotation.x = Math.PI / 2;
            energyRings.push(ring);
        }
        
        // 合并网格
        const merged = Mesh.MergeMeshes(
            [spearHead, spearBody, ...energyRings], 
            true, true, undefined, false, true
        );
        merged.name = "thunderSpear";
        
        return merged;
    }

    /**
     * 创建电弧粒子
     */
    createArcParticles(scene, emitter) {
        const ps = new ParticleSystem("arcParticles", 500, scene);
        ps.particleTexture = this.createLightningTexture();
        ps.emitter = emitter;
        
        ps.minEmitBox = new Vector3(-0.5, -0.3, 0);
        ps.maxEmitBox = new Vector3(0.5, 0.3, 2);
        
        ps.color1 = new Color4(0.4, 0.7, 1.0, 1.0);
        ps.color2 = new Color4(0.8, 0.9, 1.0, 1.0);
        ps.colorDead = new Color4(0.2, 0.4, 0.8, 0.0);
        
        ps.minSize = 0.1;
        ps.maxSize = 0.4;
        ps.minLifeTime = 0.05;
        ps.maxLifeTime = 0.15;
        
        ps.emitRate = 400;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.minEmitPower = 0.5;
        ps.maxEmitPower = 2;
        
        ps.minAngularSpeed = -Math.PI * 10;
        ps.maxAngularSpeed = Math.PI * 10;
        
        ps.start();
        return ps;
    }

    /**
     * 创建核心粒子
     */
    createCoreParticles(scene, emitter) {
        const ps = new ParticleSystem("coreParticles", 300, scene);
        ps.particleTexture = this.createGlowTexture();
        ps.emitter = emitter;
        
        ps.minEmitBox = new Vector3(-0.1, -0.1, 1);
        ps.maxEmitBox = new Vector3(0.1, 0.1, 2);
        
        ps.color1 = new Color4(1.0, 1.0, 1.0, 1.0);
        ps.color2 = new Color4(0.6, 0.8, 1.0, 1.0);
        ps.colorDead = new Color4(0.3, 0.5, 1.0, 0.0);
        
        ps.minSize = 0.2;
        ps.maxSize = 0.5;
        ps.minLifeTime = 0.1;
        ps.maxLifeTime = 0.2;
        
        ps.emitRate = 200;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.minEmitPower = 0.1;
        ps.maxEmitPower = 0.5;
        
        ps.start();
        return ps;
    }

    /**
     * 创建尾迹粒子
     */
    createTrailParticles(scene, emitter) {
        const ps = new ParticleSystem("trailParticles", 600, scene);
        ps.particleTexture = this.createGlowTexture();
        ps.emitter = emitter;
        
        ps.minEmitBox = new Vector3(-0.2, -0.2, -0.5);
        ps.maxEmitBox = new Vector3(0.2, 0.2, 0);
        
        ps.color1 = new Color4(0.3, 0.6, 1.0, 0.8);
        ps.color2 = new Color4(0.5, 0.7, 1.0, 0.6);
        ps.colorDead = new Color4(0.1, 0.3, 0.8, 0.0);
        
        ps.minSize = 0.15;
        ps.maxSize = 0.4;
        ps.minLifeTime = 0.2;
        ps.maxLifeTime = 0.5;
        
        ps.emitRate = 400;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.minEmitPower = 0.1;
        ps.maxEmitPower = 0.3;
        
        // 尾迹向后飘散
        ps.direction1 = new Vector3(-0.3, 0.3, -1);
        ps.direction2 = new Vector3(0.3, -0.3, -1);
        
        ps.start();
        return ps;
    }

    /**
     * 创建冲击波效果
     */
    createShockwave(position, rotation) {
        const scene = this.scene;
        
        // 创建冲击波环
        const shockwave = MeshBuilder.CreateTorus("shockwave", {
            diameter: 0.5,
            thickness: 0.1,
            tessellation: 32
        }, scene);
        
        shockwave.position = position.clone();
        shockwave.position.y += 1.2;
        shockwave.rotation.x = Math.PI / 2;
        
        const shockMat = new StandardMaterial("shockwaveMat", scene);
        shockMat.emissiveColor = new Color3(0.5, 0.8, 1.0);
        shockMat.alpha = 0.8;
        shockMat.disableLighting = true;
        shockMat.backFaceCulling = false;
        shockwave.material = shockMat;
        
        if (this.player.glowLayer) {
            this.player.glowLayer.addIncludedOnlyMesh(shockwave);
        }
        
        // 扩散动画
        const scaleAnim = new Animation("shockwaveScale", "scaling", 60,
            Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        scaleAnim.setKeys([
            { frame: 0, value: new Vector3(1, 1, 1) },
            { frame: 15, value: new Vector3(4, 4, 0.5) }
        ]);
        
        const alphaAnim = new Animation("shockwaveAlpha", "material.alpha", 60,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        alphaAnim.setKeys([
            { frame: 0, value: 0.8 },
            { frame: 15, value: 0.0 }
        ]);
        
        const animatable = scene.beginDirectAnimation(shockwave, [scaleAnim, alphaAnim], 0, 15, false);
        animatable.onAnimationEnd = () => {
            shockwave.dispose();
        };
    }

    /**
     * 创建爆炸效果
     */
    createExplosion(position) {
        const scene = this.scene;
        
        // 爆炸核心
        const explosionCore = MeshBuilder.CreateSphere("explosionCore", {
            diameter: 1,
            segments: 16
        }, scene);
        explosionCore.position = position;
        
        const coreMat = new StandardMaterial("explosionCoreMat", scene);
        coreMat.emissiveColor = new Color3(0.6, 0.9, 1.0);
        coreMat.alpha = 1.0;
        coreMat.disableLighting = true;
        explosionCore.material = coreMat;
        
        if (this.player.glowLayer) {
            this.player.glowLayer.addIncludedOnlyMesh(explosionCore);
        }
        
        // 爆炸粒子
        const explosionPS = new ParticleSystem("explosionPS", 800, scene);
        explosionPS.particleTexture = this.createLightningTexture();
        explosionPS.emitter = position;
        explosionPS.createSphereEmitter(0.5);
        
        explosionPS.color1 = new Color4(0.6, 0.9, 1.0, 1.0);
        explosionPS.color2 = new Color4(1.0, 1.0, 1.0, 1.0);
        explosionPS.colorDead = new Color4(0.2, 0.5, 1.0, 0.0);
        
        explosionPS.minSize = 0.2;
        explosionPS.maxSize = 0.8;
        explosionPS.minLifeTime = 0.2;
        explosionPS.maxLifeTime = 0.5;
        
        explosionPS.emitRate = 0;
        explosionPS.manualEmitCount = 300;
        explosionPS.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        explosionPS.minEmitPower = 5;
        explosionPS.maxEmitPower = 15;
        
        explosionPS.start();
        
        // 电弧爆炸
        const arcExplosionPS = new ParticleSystem("arcExplosionPS", 400, scene);
        arcExplosionPS.particleTexture = this.createLightningTexture();
        arcExplosionPS.emitter = position;
        arcExplosionPS.createSphereEmitter(1);
        
        arcExplosionPS.color1 = new Color4(0.4, 0.7, 1.0, 1.0);
        arcExplosionPS.color2 = new Color4(0.8, 0.9, 1.0, 0.8);
        arcExplosionPS.colorDead = new Color4(0.1, 0.3, 0.8, 0.0);
        
        arcExplosionPS.minSize = 0.3;
        arcExplosionPS.maxSize = 1.0;
        arcExplosionPS.minLifeTime = 0.1;
        arcExplosionPS.maxLifeTime = 0.3;
        
        arcExplosionPS.emitRate = 0;
        arcExplosionPS.manualEmitCount = 200;
        arcExplosionPS.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        arcExplosionPS.minEmitPower = 8;
        arcExplosionPS.maxEmitPower = 20;
        
        arcExplosionPS.start();
        
        // 核心扩散动画
        const scaleAnim = new Animation("explosionScale", "scaling", 60,
            Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        scaleAnim.setKeys([
            { frame: 0, value: new Vector3(1, 1, 1) },
            { frame: 5, value: new Vector3(3, 3, 3) },
            { frame: 15, value: new Vector3(5, 5, 5) }
        ]);
        
        const alphaAnim = new Animation("explosionAlpha", "material.alpha", 60,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        alphaAnim.setKeys([
            { frame: 0, value: 1.0 },
            { frame: 5, value: 0.6 },
            { frame: 15, value: 0.0 }
        ]);
        
        const animatable = scene.beginDirectAnimation(explosionCore, [scaleAnim, alphaAnim], 0, 15, false);
        animatable.onAnimationEnd = () => {
            explosionCore.dispose();
            explosionPS.dispose();
            arcExplosionPS.dispose();
        };
        
        console.log("雷霆之矛爆炸!");
    }

    /**
     * 创建闪电纹理
     */
    createLightningTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        // 背景
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.2, "rgba(180, 220, 255, 0.9)");
        grad.addColorStop(0.5, "rgba(100, 180, 255, 0.5)");
        grad.addColorStop(1, "rgba(50, 100, 200, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        // 添加闪电纹路
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(32, 10);
        ctx.lineTo(28, 25);
        ctx.lineTo(35, 30);
        ctx.lineTo(30, 50);
        ctx.stroke();
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "lightningTex", this.scene);
    }

    /**
     * 创建发光纹理
     */
    createGlowTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.3, "rgba(150, 200, 255, 0.8)");
        grad.addColorStop(0.6, "rgba(80, 150, 255, 0.4)");
        grad.addColorStop(1, "rgba(30, 80, 180, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "glowTex", this.scene);
    }
}
