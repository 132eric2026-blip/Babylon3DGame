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
    Quaternion
} from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

/**
 * 爆裂冲击波技能
 * 在玩家前方产生巨大的爆炸冲击波
 */
export class ExplosionWave extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "爆裂冲击波", 5.0); // 5秒冷却
    }

    /**
     * 执行技能
     */
    execute() {
        const playerPos = this.player.mesh.position.clone();
        const playerRotation = this.getPlayerRotation();
        
        // 播放施法动作
        this.playCastAnimation();
        
        // 延迟一小段时间后产生爆炸效果（配合动作）
        setTimeout(() => {
            // 计算前方位置
            const forwardDir = new Vector3(Math.sin(playerRotation), 0, Math.cos(playerRotation));
            const explosionPos = playerPos.add(forwardDir.scale(3.0)); // 前方3米处
            explosionPos.y += 1.0; // 稍微抬高一点
            
            this.createExplosionEffect(explosionPos);
        }, 300);
    }

    /**
     * 获取玩家旋转角度
     */
    getPlayerRotation() {
        if (this.player.modelRoot.rotationQuaternion) {
            return this.player.modelRoot.rotationQuaternion.toEulerAngles().y;
        } else {
            return this.player.modelRoot.rotation.y;
        }
    }

    /**
     * 播放施法动作
     * 双手举起然后向前推
     */
    playCastAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.rightShoulder || !boxMan.leftShoulder) return;
        
        const scene = this.scene;
        const fps = 60;
        
        // 获取初始旋转
        const rightStartX = boxMan.rightShoulder.rotation.x;
        const leftStartX = boxMan.leftShoulder.rotation.x;
        
        // 标记正在播放动画，防止干扰
        this.player.isCastingSkill = true;
        
        // 右手动画
        const rightAnimX = new Animation("castRightX", "rotation.x", fps, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: rightStartX },
            { frame: 10, value: -Math.PI / 2 }, // 举起
            { frame: 20, value: -Math.PI / 2 }, // 保持
            { frame: 25, value: -Math.PI / 4 }, // 向前推
            { frame: 40, value: rightStartX }   // 恢复
        ]);
        
        const rightAnimY = new Animation("castRightY", "rotation.y", fps, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimY.setKeys([
            { frame: 0, value: boxMan.rightShoulder.rotation.y },
            { frame: 10, value: 0 },
            { frame: 40, value: 0 }
        ]);

        const rightAnimZ = new Animation("castRightZ", "rotation.z", fps, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimZ.setKeys([
            { frame: 0, value: boxMan.rightShoulder.rotation.z },
            { frame: 10, value: 0 },
            { frame: 40, value: 0 }
        ]);

        // 左手动画
        const leftAnimX = new Animation("castLeftX", "rotation.x", fps, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimX.setKeys([
            { frame: 0, value: leftStartX },
            { frame: 10, value: -Math.PI / 2 }, // 举起
            { frame: 20, value: -Math.PI / 2 }, // 保持
            { frame: 25, value: -Math.PI / 4 }, // 向前推
            { frame: 40, value: leftStartX }    // 恢复
        ]);

        const leftAnimY = new Animation("castLeftY", "rotation.y", fps, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimY.setKeys([
            { frame: 0, value: boxMan.leftShoulder.rotation.y },
            { frame: 10, value: 0 },
            { frame: 40, value: 0 }
        ]);

        const leftAnimZ = new Animation("castLeftZ", "rotation.z", fps, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimZ.setKeys([
            { frame: 0, value: boxMan.leftShoulder.rotation.z },
            { frame: 10, value: 0 },
            { frame: 40, value: 0 }
        ]);

        // 停止之前的动画
        scene.stopAnimation(boxMan.rightShoulder);
        scene.stopAnimation(boxMan.leftShoulder);
        
        // 开始新动画
        const animatable = scene.beginDirectAnimation(boxMan.rightShoulder, [rightAnimX, rightAnimY, rightAnimZ], 0, 40, false, 1.5);
        scene.beginDirectAnimation(boxMan.leftShoulder, [leftAnimX, leftAnimY, leftAnimZ], 0, 40, false, 1.5);
        
        // 动画结束回调
        animatable.onAnimationEnd = () => {
            this.player.isCastingSkill = false;
        };
    }

    /**
     * 创建爆炸特效
     */
    createExplosionEffect(position) {
        const scene = this.scene;
        
        // 1. 冲击波球体（快速膨胀消散）
        const sphere = MeshBuilder.CreateSphere("explosionSphere", { diameter: 1, segments: 16 }, scene);
        sphere.position = position.clone();
        
        const mat = new StandardMaterial("explosionMat", scene);
        mat.emissiveColor = new Color3(1.0, 0.5, 0.0); // 橙色发光
        mat.diffuseColor = new Color3(1.0, 0.2, 0.0);
        mat.alpha = 0.8;
        mat.disableLighting = true;
        sphere.material = mat;
        
        if (this.player.glowLayer) {
            this.player.glowLayer.addIncludedOnlyMesh(sphere);
        }

        // 球体动画
        let frame = 0;
        const maxFrame = 30;
        const observer = scene.onBeforeRenderObservable.add(() => {
            frame++;
            const progress = frame / maxFrame;
            
            // 膨胀
            const scale = 1 + progress * 8;
            sphere.scaling = new Vector3(scale, scale, scale);
            
            // 透明度衰减
            mat.alpha = 0.8 * (1 - progress);
            
            if (frame >= maxFrame) {
                scene.onBeforeRenderObservable.remove(observer);
                sphere.dispose();
                mat.dispose();
            }
        });

        // 2. 粒子爆炸系统
        this.createParticleExplosion(position);
    }

    /**
     * 创建粒子系统
     */
    createParticleExplosion(position) {
        const scene = this.scene;
        
        // 创建粒子发射源
        const emitter = new TransformNode("explosionEmitter", scene);
        emitter.position = position.clone();

        const particleSystem = new ParticleSystem("explosionParticles", 500, scene);
        
        // 使用简单的纹理（这里使用程序生成的纹理）
        particleSystem.particleTexture = this.createParticleTexture();
        particleSystem.emitter = emitter;
        
        // 颜色渐变：红 -> 橙 -> 黄 -> 透明
        particleSystem.color1 = new Color4(1.0, 0.2, 0.0, 1.0);
        particleSystem.color2 = new Color4(1.0, 0.5, 0.0, 1.0);
        particleSystem.colorDead = new Color4(0.2, 0.2, 0.2, 0.0);
        
        particleSystem.minSize = 0.3;
        particleSystem.maxSize = 0.8;
        
        particleSystem.minLifeTime = 0.5;
        particleSystem.maxLifeTime = 1.0;
        
        particleSystem.emitRate = 1000;
        particleSystem.manualEmitCount = 300; // 一次性发射300个
        
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        particleSystem.gravity = new Vector3(0, -9.81, 0);
        
        particleSystem.minEmitPower = 5;
        particleSystem.maxEmitPower = 10;
        particleSystem.updateSpeed = 0.02;
        
        particleSystem.start();
        
        // 自动销毁
        setTimeout(() => {
            particleSystem.dispose();
            emitter.dispose();
        }, 2000);
    }

    /**
     * 创建粒子纹理
     */
    createParticleTexture() {
        // 复用HalfMoonSlash的纹理生成逻辑，或者创建一个新的
        // 这里简单创建一个圆形渐变纹理
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        const texture = new Texture(canvas.toDataURL(), this.scene);
        return texture;
    }
}
