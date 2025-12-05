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
    Mesh
} from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

/**
 * 烈焰震地技能
 * 角色双拳高举猛砸地面，在前方产生扇形火焰裂痕和冲击波
 */
export class FlameShockwave extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "烈焰震地", 1.0); // 1秒冷却
    }

    execute() {
        const playerPos = this.player.mesh.position.clone();
        const playerRotation = this.getPlayerRotation();
        
        // 播放施法动画
        this.playSlamAnimation();
        
        // 延迟释放技能效果（配合施法动画的砸地时机）
        setTimeout(() => {
            this.createFlameShockwave(playerPos, playerRotation);
        }, 250);
    }

    /**
     * 施法动画 - 双拳高举猛砸地面
     */
    playSlamAnimation() {
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
        this.player.flameShockwaveAnimating = true;
        
        // 右臂动画 - 高举再猛砸
        const rightAnimX = new Animation("flameRightX", "rotation.x", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: rightStartX },
            { frame: 8, value: -2.8 },       // 高举过头
            { frame: 15, value: 0.3 },       // 猛砸向下
            { frame: 22, value: 0.1 },       // 保持砸地姿势
            { frame: 35, value: rightStartX }
        ]);
        
        const rightAnimY = new Animation("flameRightY", "rotation.y", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimY.setKeys([
            { frame: 0, value: rightStartY },
            { frame: 8, value: -0.3 },       // 内收
            { frame: 15, value: -0.5 },      // 向前
            { frame: 22, value: -0.5 },
            { frame: 35, value: rightStartY }
        ]);
        
        const rightAnimZ = new Animation("flameRightZ", "rotation.z", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimZ.setKeys([
            { frame: 0, value: rightStartZ },
            { frame: 8, value: -0.4 },
            { frame: 15, value: 0.2 },
            { frame: 35, value: rightStartZ }
        ]);
        
        // 左臂动画 - 同步高举猛砸
        const leftAnimX = new Animation("flameLeftX", "rotation.x", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimX.setKeys([
            { frame: 0, value: leftStartX },
            { frame: 8, value: -2.8 },       // 高举过头
            { frame: 15, value: 0.3 },       // 猛砸向下
            { frame: 22, value: 0.1 },       // 保持砸地姿势
            { frame: 35, value: leftStartX }
        ]);
        
        const leftAnimY = new Animation("flameLeftY", "rotation.y", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimY.setKeys([
            { frame: 0, value: leftStartY },
            { frame: 8, value: 0.3 },        // 内收
            { frame: 15, value: 0.5 },       // 向前
            { frame: 22, value: 0.5 },
            { frame: 35, value: leftStartY }
        ]);
        
        const leftAnimZ = new Animation("flameLeftZ", "rotation.z", fps, 
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimZ.setKeys([
            { frame: 0, value: leftStartZ },
            { frame: 8, value: 0.4 },
            { frame: 15, value: -0.2 },
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
            this.player.flameShockwaveAnimating = false;
        };
    }

    getPlayerRotation() {
        if (this.player.modelRoot.rotationQuaternion) {
            return this.player.modelRoot.rotationQuaternion.toEulerAngles().y;
        }
        return this.player.modelRoot.rotation.y;
    }

    /**
     * 创建烈焰震地效果
     */
    createFlameShockwave(position, rotation) {
        const scene = this.scene;
        const glowLayer = this.player.glowLayer;
        
        // 效果参数
        const maxRadius = 4.5;          // 最大范围
        const arcAngle = Math.PI * 0.8; // 扇形角度（约144度）
        const crackCount = 7;           // 裂痕数量
        const effectDuration = 0.5;     // 效果持续时间
        
        // 创建根节点
        const rootNode = new TransformNode("flameShockwaveRoot", scene);
        rootNode.position = position.clone();
        rootNode.position.y += 0.05; // 略高于地面
        rootNode.rotation.y = rotation;
        
        // 创建扇形冲击波
        this.createFanShockwave(rootNode, maxRadius, arcAngle, glowLayer);
        
        // 创建地面火焰裂痕
        const cracks = this.createFlameCracks(rootNode, crackCount, maxRadius, arcAngle, glowLayer);
        
        // 创建火焰喷涌粒子
        const flamePS = this.createFlameParticles(rootNode, maxRadius, arcAngle);
        
        // 创建火星飞溅粒子
        const sparkPS = this.createSparkParticles(rootNode, maxRadius, arcAngle);
        
        // 创建热浪扭曲效果
        const heatPS = this.createHeatParticles(rootNode, maxRadius, arcAngle);
        
        // 创建中心爆发效果
        this.createCenterBurst(position.clone(), rotation, glowLayer);
        
        // 管理效果生命周期
        let frameCount = 0;
        const fps = 60;
        const totalFrames = effectDuration * fps * 2;
        
        const effectObserver = scene.onBeforeRenderObservable.add(() => {
            frameCount++;
            
            // 裂痕淡出
            const progress = frameCount / totalFrames;
            if (progress > 0.5) {
                const fadeProgress = (progress - 0.5) / 0.5;
                cracks.forEach(crack => {
                    if (crack.material) {
                        crack.material.alpha = 0.9 * (1 - fadeProgress);
                    }
                });
            }
            
            // 效果结束
            if (frameCount >= totalFrames) {
                scene.onBeforeRenderObservable.remove(effectObserver);
                
                // 停止粒子
                flamePS.stop();
                sparkPS.stop();
                heatPS.stop();
                
                // 延迟清理资源
                setTimeout(() => {
                    cracks.forEach(crack => {
                        if (crack.material) crack.material.dispose();
                        crack.dispose();
                    });
                    flamePS.dispose();
                    sparkPS.dispose();
                    heatPS.dispose();
                    rootNode.dispose();
                    console.log("烈焰震地效果消散");
                }, 500);
            }
        });
    }

    /**
     * 创建扇形冲击波
     */
    createFanShockwave(rootNode, maxRadius, arcAngle, glowLayer) {
        const scene = this.scene;
        
        // 创建多层扩散的冲击波环
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const wave = this.createWaveRing(scene, i);
                wave.parent = rootNode;
                wave.position.y = 0.1 + i * 0.05;
                
                if (glowLayer) {
                    glowLayer.addIncludedOnlyMesh(wave);
                }
                
                // 扩散动画
                const scaleAnim = new Animation("waveScale" + i, "scaling", 60,
                    Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
                scaleAnim.setKeys([
                    { frame: 0, value: new Vector3(0.3, 1, 0.3) },
                    { frame: 20, value: new Vector3(maxRadius / 2, 1, maxRadius / 2) }
                ]);
                
                const alphaAnim = new Animation("waveAlpha" + i, "material.alpha", 60,
                    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
                alphaAnim.setKeys([
                    { frame: 0, value: 0.9 },
                    { frame: 20, value: 0.0 }
                ]);
                
                const animatable = scene.beginDirectAnimation(wave, [scaleAnim, alphaAnim], 0, 20, false);
                animatable.onAnimationEnd = () => {
                    wave.material.dispose();
                    wave.dispose();
                };
            }, i * 80);
        }
    }

    /**
     * 创建单个冲击波环
     */
    createWaveRing(scene, index) {
        const ring = MeshBuilder.CreateTorus("waveRing" + index, {
            diameter: 2,
            thickness: 0.15 + index * 0.05,
            tessellation: 32
        }, scene);
        ring.rotation.x = Math.PI / 2;
        
        const ringMat = new StandardMaterial("waveRingMat" + index, scene);
        // 从红橙到黄色渐变
        const colorLerp = index / 3;
        ringMat.emissiveColor = new Color3(
            1.0,
            0.3 + colorLerp * 0.5,
            0.0 + colorLerp * 0.2
        );
        ringMat.diffuseColor = ringMat.emissiveColor;
        ringMat.alpha = 0.9;
        ringMat.disableLighting = true;
        ringMat.backFaceCulling = false;
        ring.material = ringMat;
        
        return ring;
    }

    /**
     * 创建火焰裂痕
     */
    createFlameCracks(rootNode, count, maxRadius, arcAngle, glowLayer) {
        const scene = this.scene;
        const cracks = [];
        
        const startAngle = -arcAngle / 2;
        const angleStep = arcAngle / (count - 1);
        
        for (let i = 0; i < count; i++) {
            const angle = startAngle + angleStep * i;
            const crack = this.createSingleCrack(scene, angle, maxRadius, i);
            crack.parent = rootNode;
            
            if (glowLayer) {
                glowLayer.addIncludedOnlyMesh(crack);
            }
            
            cracks.push(crack);
            
            // 逐个裂痕延伸动画
            this.animateCrackExtend(crack, i * 30);
        }
        
        return cracks;
    }

    /**
     * 创建单条裂痕
     */
    createSingleCrack(scene, angle, maxLength, index) {
        // 创建锯齿状裂痕路径
        const points = [];
        const segments = 8;
        const baseWidth = 0.15;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const distance = t * maxLength;
            // 添加随机偏移使裂痕看起来更自然
            const offset = (Math.random() - 0.5) * 0.3 * t;
            const x = Math.sin(angle + offset * 0.1) * distance;
            const z = Math.cos(angle + offset * 0.1) * distance;
            points.push(new Vector3(x, 0, z));
        }
        
        // 创建裂痕网格（使用tube更好地表现裂痕）
        const crack = MeshBuilder.CreateTube("crack" + index, {
            path: points,
            radius: baseWidth,
            tessellation: 6,
            cap: Mesh.CAP_ALL
        }, scene);
        
        // 裂痕材质 - 炽热的岩浆色
        const crackMat = new StandardMaterial("crackMat" + index, scene);
        crackMat.emissiveColor = new Color3(1.0, 0.4, 0.0);
        crackMat.diffuseColor = new Color3(1.0, 0.2, 0.0);
        crackMat.specularColor = new Color3(1.0, 0.8, 0.3);
        crackMat.alpha = 0.9;
        crackMat.disableLighting = true;
        crackMat.backFaceCulling = false;
        crack.material = crackMat;
        
        // 初始缩放为0
        crack.scaling = new Vector3(0, 1, 0);
        
        return crack;
    }

    /**
     * 裂痕延伸动画
     */
    animateCrackExtend(crack, delay) {
        setTimeout(() => {
            const scaleAnim = new Animation("crackExtend", "scaling", 60,
                Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
            scaleAnim.setKeys([
                { frame: 0, value: new Vector3(0.1, 1, 0.1) },
                { frame: 8, value: new Vector3(1, 1, 1) }
            ]);
            
            this.scene.beginDirectAnimation(crack, [scaleAnim], 0, 8, false);
        }, delay);
    }

    /**
     * 创建火焰喷涌粒子
     */
    createFlameParticles(rootNode, maxRadius, arcAngle) {
        const scene = this.scene;
        
        const ps = new ParticleSystem("flameParticles", 1500, scene);
        ps.particleTexture = this.createFlameTexture();
        ps.emitter = rootNode;
        
        // 扇形发射区域
        ps.minEmitBox = new Vector3(-maxRadius * 0.8, 0, 0);
        ps.maxEmitBox = new Vector3(maxRadius * 0.8, 0.1, maxRadius * 0.9);
        
        // 火焰颜色 - 从白黄核心到红橙边缘
        ps.color1 = new Color4(1.0, 0.9, 0.3, 1.0);
        ps.color2 = new Color4(1.0, 0.5, 0.1, 1.0);
        ps.colorDead = new Color4(0.8, 0.2, 0.0, 0.0);
        
        ps.minSize = 0.3;
        ps.maxSize = 0.8;
        ps.minLifeTime = 0.3;
        ps.maxLifeTime = 0.7;
        
        ps.emitRate = 800;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.minEmitPower = 2;
        ps.maxEmitPower = 5;
        
        // 火焰向上升腾
        ps.direction1 = new Vector3(-0.5, 1, 0.5);
        ps.direction2 = new Vector3(0.5, 2, 1);
        
        // 添加重力使火焰自然下落
        ps.gravity = new Vector3(0, -3, 0);
        
        ps.minAngularSpeed = -Math.PI;
        ps.maxAngularSpeed = Math.PI;
        
        ps.start();
        
        // 逐渐减弱
        setTimeout(() => {
            ps.emitRate = 200;
        }, 300);
        
        return ps;
    }

    /**
     * 创建火星飞溅粒子
     */
    createSparkParticles(rootNode, maxRadius, arcAngle) {
        const scene = this.scene;
        
        const ps = new ParticleSystem("sparkParticles", 800, scene);
        ps.particleTexture = this.createSparkTexture();
        ps.emitter = rootNode;
        
        ps.minEmitBox = new Vector3(-maxRadius * 0.6, 0, 0);
        ps.maxEmitBox = new Vector3(maxRadius * 0.6, 0.05, maxRadius * 0.8);
        
        // 明亮的火星颜色
        ps.color1 = new Color4(1.0, 1.0, 0.6, 1.0);
        ps.color2 = new Color4(1.0, 0.7, 0.2, 1.0);
        ps.colorDead = new Color4(1.0, 0.3, 0.0, 0.0);
        
        ps.minSize = 0.05;
        ps.maxSize = 0.15;
        ps.minLifeTime = 0.4;
        ps.maxLifeTime = 1.0;
        
        ps.emitRate = 500;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.minEmitPower = 4;
        ps.maxEmitPower = 10;
        
        // 火星四散飞溅
        ps.direction1 = new Vector3(-1, 2, -0.5);
        ps.direction2 = new Vector3(1, 4, 1.5);
        
        ps.gravity = new Vector3(0, -8, 0);
        
        ps.start();
        
        setTimeout(() => {
            ps.emitRate = 100;
        }, 200);
        
        return ps;
    }

    /**
     * 创建热浪粒子
     */
    createHeatParticles(rootNode, maxRadius, arcAngle) {
        const scene = this.scene;
        
        const ps = new ParticleSystem("heatParticles", 400, scene);
        ps.particleTexture = this.createHeatTexture();
        ps.emitter = rootNode;
        
        ps.minEmitBox = new Vector3(-maxRadius * 0.5, 0, 0);
        ps.maxEmitBox = new Vector3(maxRadius * 0.5, 0.2, maxRadius * 0.7);
        
        // 半透明的热浪
        ps.color1 = new Color4(1.0, 0.6, 0.2, 0.3);
        ps.color2 = new Color4(1.0, 0.4, 0.1, 0.2);
        ps.colorDead = new Color4(0.8, 0.2, 0.0, 0.0);
        
        ps.minSize = 0.8;
        ps.maxSize = 1.5;
        ps.minLifeTime = 0.5;
        ps.maxLifeTime = 1.0;
        
        ps.emitRate = 150;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.minEmitPower = 1;
        ps.maxEmitPower = 2;
        
        ps.direction1 = new Vector3(-0.2, 1, 0.3);
        ps.direction2 = new Vector3(0.2, 1.5, 0.5);
        
        ps.start();
        
        return ps;
    }

    /**
     * 创建中心爆发效果
     */
    createCenterBurst(position, rotation, glowLayer) {
        const scene = this.scene;
        
        // 爆发核心球
        const burstCore = MeshBuilder.CreateSphere("burstCore", {
            diameter: 0.8,
            segments: 16
        }, scene);
        
        burstCore.position = position;
        burstCore.position.y += 0.3;
        
        const coreMat = new StandardMaterial("burstCoreMat", scene);
        coreMat.emissiveColor = new Color3(1.0, 0.8, 0.3);
        coreMat.diffuseColor = new Color3(1.0, 0.6, 0.1);
        coreMat.alpha = 1.0;
        coreMat.disableLighting = true;
        burstCore.material = coreMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(burstCore);
        }
        
        // 爆发粒子
        const burstPS = new ParticleSystem("burstPS", 600, scene);
        burstPS.particleTexture = this.createFlameTexture();
        burstPS.emitter = burstCore;
        burstPS.createSphereEmitter(0.3);
        
        burstPS.color1 = new Color4(1.0, 0.9, 0.5, 1.0);
        burstPS.color2 = new Color4(1.0, 0.5, 0.0, 1.0);
        burstPS.colorDead = new Color4(0.8, 0.2, 0.0, 0.0);
        
        burstPS.minSize = 0.2;
        burstPS.maxSize = 0.6;
        burstPS.minLifeTime = 0.2;
        burstPS.maxLifeTime = 0.4;
        
        burstPS.emitRate = 0;
        burstPS.manualEmitCount = 200;
        burstPS.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        burstPS.minEmitPower = 5;
        burstPS.maxEmitPower = 12;
        
        burstPS.start();
        
        // 核心扩散消失动画
        const scaleAnim = new Animation("burstScale", "scaling", 60,
            Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
        scaleAnim.setKeys([
            { frame: 0, value: new Vector3(0.5, 0.5, 0.5) },
            { frame: 5, value: new Vector3(2.5, 2.5, 2.5) },
            { frame: 12, value: new Vector3(3, 3, 3) }
        ]);
        
        const alphaAnim = new Animation("burstAlpha", "material.alpha", 60,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        alphaAnim.setKeys([
            { frame: 0, value: 1.0 },
            { frame: 5, value: 0.7 },
            { frame: 12, value: 0.0 }
        ]);
        
        const animatable = scene.beginDirectAnimation(burstCore, [scaleAnim, alphaAnim], 0, 12, false);
        animatable.onAnimationEnd = () => {
            burstCore.dispose();
            burstPS.dispose();
        };
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
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "flameTex", this.scene);
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
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "sparkTex", this.scene);
    }

    /**
     * 创建热浪纹理
     */
    createHeatTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 200, 150, 0.5)");
        grad.addColorStop(0.4, "rgba(255, 150, 80, 0.3)");
        grad.addColorStop(0.7, "rgba(255, 100, 50, 0.1)");
        grad.addColorStop(1, "rgba(200, 50, 20, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "heatTex", this.scene);
    }
}
