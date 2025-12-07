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
        const f = this.player.mesh.getDirection(Vector3.Forward());
        return Math.atan2(f.x, f.z);
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
     * 创建龙头模型 - 更真实的东方龙头
     */
    createDragonHead(scene, glowLayer) {
        const dragonHead = new TransformNode("dragonHead", scene);
        const allMeshes = [];
        
        // === 龙头主体材质 - 炽热的岩浆龙 ===
        const createDragonMaterial = (name, baseColor, emissiveIntensity = 1.0) => {
            const mat = new StandardMaterial(name, scene);
            mat.diffuseColor = baseColor.scale(0.6);
            mat.emissiveColor = baseColor.scale(emissiveIntensity);
            mat.specularColor = new Color3(1.0, 0.6, 0.3);
            mat.specularPower = 32;
            mat.alpha = 0.95;
            mat.backFaceCulling = false;
            return mat;
        };
        
        // === 龙头主体 - 使用多个部分组合 ===
        // 头颅主体
        const skull = MeshBuilder.CreateSphere("dragonSkull", {
            diameterX: 1.0,
            diameterY: 0.75,
            diameterZ: 1.3,
            segments: 24
        }, scene);
        skull.parent = dragonHead;
        skull.position.z = -0.2;
        skull.material = createDragonMaterial("skullMat", new Color3(0.9, 0.35, 0.05), 0.8);
        allMeshes.push(skull);
        
        // 上颚
        const upperJaw = MeshBuilder.CreateCapsule("upperJaw", {
            height: 1.0,
            radius: 0.25,
            tessellation: 16,
            subdivisions: 4
        }, scene);
        upperJaw.parent = dragonHead;
        upperJaw.rotation.x = Math.PI / 2;
        upperJaw.position = new Vector3(0, 0.05, 0.5);
        upperJaw.scaling = new Vector3(1.2, 1, 0.8);
        upperJaw.material = createDragonMaterial("upperJawMat", new Color3(0.95, 0.4, 0.08), 0.85);
        allMeshes.push(upperJaw);
        
        // 下颚
        const lowerJaw = MeshBuilder.CreateCapsule("lowerJaw", {
            height: 0.9,
            radius: 0.2,
            tessellation: 16,
            subdivisions: 4
        }, scene);
        lowerJaw.parent = dragonHead;
        lowerJaw.rotation.x = Math.PI / 2 + 0.15; // 微微张嘴
        lowerJaw.position = new Vector3(0, -0.15, 0.45);
        lowerJaw.scaling = new Vector3(1.0, 1, 0.7);
        lowerJaw.material = createDragonMaterial("lowerJawMat", new Color3(0.85, 0.3, 0.05), 0.75);
        allMeshes.push(lowerJaw);
        
        // 鼻梁隆起
        const noseBridge = MeshBuilder.CreateSphere("noseBridge", {
            diameterX: 0.5,
            diameterY: 0.25,
            diameterZ: 0.6,
            segments: 12
        }, scene);
        noseBridge.parent = dragonHead;
        noseBridge.position = new Vector3(0, 0.2, 0.3);
        noseBridge.material = createDragonMaterial("noseBridgeMat", new Color3(1.0, 0.45, 0.1), 0.9);
        allMeshes.push(noseBridge);
        
        // === 眉骨/眼眶 ===
        const createBrow = (name, posX) => {
            const brow = MeshBuilder.CreateCapsule(name, {
                height: 0.4,
                radius: 0.08,
                tessellation: 8
            }, scene);
            brow.parent = dragonHead;
            brow.position = new Vector3(posX, 0.25, 0.1);
            brow.rotation.z = posX > 0 ? -0.6 : 0.6;
            brow.rotation.x = 0.2;
            brow.material = createDragonMaterial("browMat", new Color3(0.8, 0.25, 0.02), 0.7);
            return brow;
        };
        const browLeft = createBrow("browLeft", -0.28);
        const browRight = createBrow("browRight", 0.28);
        allMeshes.push(browLeft, browRight);
        
        // === 龙角 - 更复杂的弯曲角 ===
        const createHorn = (name, posX, rotZ) => {
            const hornGroup = new TransformNode(name + "Group", scene);
            hornGroup.parent = dragonHead;
            hornGroup.position = new Vector3(posX, 0.35, -0.35);
            hornGroup.rotation.z = rotZ;
            hornGroup.rotation.x = -0.4;
            
            // 角的基部
            const hornBase = MeshBuilder.CreateCylinder(name + "Base", {
                diameterTop: 0.12,
                diameterBottom: 0.2,
                height: 0.25,
                tessellation: 8
            }, scene);
            hornBase.parent = hornGroup;
            hornBase.material = createDragonMaterial("hornBaseMat", new Color3(1.0, 0.5, 0.15), 0.9);
            allMeshes.push(hornBase);
            
            // 角的中段
            const hornMid = MeshBuilder.CreateCylinder(name + "Mid", {
                diameterTop: 0.08,
                diameterBottom: 0.12,
                height: 0.3,
                tessellation: 8
            }, scene);
            hornMid.parent = hornGroup;
            hornMid.position.y = 0.25;
            hornMid.rotation.x = 0.3; // 向后弯曲
            hornMid.material = createDragonMaterial("hornMidMat", new Color3(1.0, 0.6, 0.2), 1.0);
            allMeshes.push(hornMid);
            
            // 角尖
            const hornTip = MeshBuilder.CreateCylinder(name + "Tip", {
                diameterTop: 0,
                diameterBottom: 0.08,
                height: 0.25,
                tessellation: 6
            }, scene);
            hornTip.parent = hornMid;
            hornTip.position.y = 0.25;
            hornTip.rotation.x = 0.4;
            hornTip.material = createDragonMaterial("hornTipMat", new Color3(1.0, 0.8, 0.4), 1.2);
            allMeshes.push(hornTip);
            
            return hornGroup;
        };
        createHorn("hornLeft", -0.35, 0.3);
        createHorn("hornRight", 0.35, -0.3);
        
        // === 龙须 - 东方龙特征 ===
        const createWhisker = (name, posX, posY, rotZ, length) => {
            const whisker = MeshBuilder.CreateCylinder(name, {
                diameterTop: 0,
                diameterBottom: 0.04,
                height: length,
                tessellation: 6
            }, scene);
            whisker.parent = dragonHead;
            whisker.position = new Vector3(posX, posY, 0.6);
            whisker.rotation.z = rotZ;
            whisker.rotation.x = 0.5;
            whisker.material = createDragonMaterial("whiskerMat", new Color3(1.0, 0.7, 0.3), 1.1);
            return whisker;
        };
        // 长须
        const whiskerL1 = createWhisker("whiskerL1", -0.2, 0, 0.8, 0.6);
        const whiskerR1 = createWhisker("whiskerR1", 0.2, 0, -0.8, 0.6);
        const whiskerL2 = createWhisker("whiskerL2", -0.18, 0.08, 0.5, 0.4);
        const whiskerR2 = createWhisker("whiskerR2", 0.18, 0.08, -0.5, 0.4);
        allMeshes.push(whiskerL1, whiskerR1, whiskerL2, whiskerR2);
        
        // === 獠牙 ===
        const createFang = (name, posX) => {
            const fang = MeshBuilder.CreateCylinder(name, {
                diameterTop: 0,
                diameterBottom: 0.06,
                height: 0.2,
                tessellation: 6
            }, scene);
            fang.parent = dragonHead;
            fang.position = new Vector3(posX, -0.1, 0.7);
            fang.rotation.x = 0.3;
            const fangMat = new StandardMaterial(name + "Mat", scene);
            fangMat.emissiveColor = new Color3(1.0, 0.95, 0.8);
            fangMat.diffuseColor = new Color3(1.0, 0.9, 0.7);
            fangMat.disableLighting = true;
            fang.material = fangMat;
            return fang;
        };
        const fangLeft = createFang("fangLeft", -0.12);
        const fangRight = createFang("fangRight", 0.12);
        allMeshes.push(fangLeft, fangRight);
        
        // === 龙眼 - 更有神的眼睛 ===
        const createEye = (name, posX) => {
            const eyeGroup = new TransformNode(name + "Group", scene);
            eyeGroup.parent = dragonHead;
            eyeGroup.position = new Vector3(posX, 0.12, 0.15);
            
            // 眼眶
            const eyeSocket = MeshBuilder.CreateSphere(name + "Socket", {
                diameter: 0.18,
                segments: 12
            }, scene);
            eyeSocket.parent = eyeGroup;
            const socketMat = new StandardMaterial(name + "SocketMat", scene);
            socketMat.emissiveColor = new Color3(0.3, 0.1, 0.0);
            socketMat.diffuseColor = new Color3(0.2, 0.05, 0.0);
            eyeSocket.material = socketMat;
            allMeshes.push(eyeSocket);
            
            // 眼球
            const eyeball = MeshBuilder.CreateSphere(name + "Ball", {
                diameter: 0.14,
                segments: 12
            }, scene);
            eyeball.parent = eyeGroup;
            eyeball.position.z = 0.02;
            const eyeMat = new StandardMaterial(name + "Mat", scene);
            eyeMat.emissiveColor = new Color3(1.0, 0.9, 0.2);
            eyeMat.diffuseColor = new Color3(1.0, 0.7, 0.0);
            eyeMat.specularColor = new Color3(1, 1, 1);
            eyeMat.specularPower = 64;
            eyeMat.disableLighting = true;
            eyeball.material = eyeMat;
            allMeshes.push(eyeball);
            
            // 瞳孔（竖直的龙瞳）
            const pupil = MeshBuilder.CreateCylinder(name + "Pupil", {
                diameterTop: 0.02,
                diameterBottom: 0.02,
                height: 0.1,
                tessellation: 6
            }, scene);
            pupil.parent = eyeGroup;
            pupil.position.z = 0.06;
            pupil.rotation.x = Math.PI / 2;
            const pupilMat = new StandardMaterial(name + "PupilMat", scene);
            pupilMat.emissiveColor = new Color3(0.1, 0.0, 0.0);
            pupilMat.diffuseColor = new Color3(0, 0, 0);
            pupil.material = pupilMat;
            allMeshes.push(pupil);
            
            return { eyeGroup, eyeball, eyeMat };
        };
        const eyeLeft = createEye("eyeLeft", -0.28);
        const eyeRight = createEye("eyeRight", 0.28);
        
        // === 鼻孔 ===
        const createNostril = (name, posX) => {
            const nostril = MeshBuilder.CreateTorus(name, {
                diameter: 0.08,
                thickness: 0.02,
                tessellation: 12
            }, scene);
            nostril.parent = dragonHead;
            nostril.position = new Vector3(posX, 0.1, 0.85);
            nostril.rotation.x = Math.PI / 2;
            nostril.material = createDragonMaterial("nostrilMat", new Color3(0.7, 0.2, 0.0), 0.6);
            return nostril;
        };
        const nostrilLeft = createNostril("nostrilLeft", -0.1);
        const nostrilRight = createNostril("nostrilRight", 0.1);
        allMeshes.push(nostrilLeft, nostrilRight);
        
        // === 头顶鳞片/脊 ===
        for (let i = 0; i < 5; i++) {
            const spine = MeshBuilder.CreateCylinder("spine" + i, {
                diameterTop: 0,
                diameterBottom: 0.08 - i * 0.01,
                height: 0.15 - i * 0.02,
                tessellation: 4
            }, scene);
            spine.parent = dragonHead;
            spine.position = new Vector3(0, 0.4, -0.3 - i * 0.15);
            spine.rotation.x = -0.3;
            spine.material = createDragonMaterial("spineMat", new Color3(1.0, 0.5, 0.1), 1.0);
            allMeshes.push(spine);
        }
        
        // === 添加到发光层 ===
        if (glowLayer) {
            allMeshes.forEach(mesh => {
                glowLayer.addIncludedOnlyMesh(mesh);
            });
        }
        
        // === 眼睛发光闪烁动画 ===
        let eyeFlickerFrame = 0;
        const eyeFlickerObserver = scene.onBeforeRenderObservable.add(() => {
            eyeFlickerFrame++;
            const flicker = 0.8 + Math.sin(eyeFlickerFrame * 0.15) * 0.2 + Math.random() * 0.1;
            const eyeColor = new Color3(1.0 * flicker, 0.9 * flicker, 0.2 * flicker);
            eyeLeft.eyeMat.emissiveColor = eyeColor;
            eyeRight.eyeMat.emissiveColor = eyeColor;
        });
        dragonHead._eyeFlickerObserver = eyeFlickerObserver;
        
        // === 鼻孔喷烟粒子 ===
        const createNostrilSmoke = (nostril) => {
            const ps = new ParticleSystem("nostrilSmoke", 50, scene);
            ps.particleTexture = this.createSmokeTexture();
            ps.emitter = nostril;
            ps.minEmitBox = new Vector3(-0.02, -0.02, 0);
            ps.maxEmitBox = new Vector3(0.02, 0.02, 0);
            ps.color1 = new Color4(0.4, 0.4, 0.4, 0.3);
            ps.color2 = new Color4(0.3, 0.2, 0.1, 0.2);
            ps.colorDead = new Color4(0.1, 0.1, 0.1, 0);
            ps.minSize = 0.05;
            ps.maxSize = 0.15;
            ps.minLifeTime = 0.3;
            ps.maxLifeTime = 0.6;
            ps.emitRate = 20;
            ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
            ps.direction1 = new Vector3(-0.1, 0.3, 0.5);
            ps.direction2 = new Vector3(0.1, 0.5, 0.8);
            ps.minEmitPower = 0.5;
            ps.maxEmitPower = 1;
            ps.gravity = new Vector3(0, 0.3, 0);
            ps.start();
            return ps;
        };
        dragonHead._nostrilSmokeLeft = createNostrilSmoke(nostrilLeft);
        dragonHead._nostrilSmokeRight = createNostrilSmoke(nostrilRight);
        
        // 初始缩放为0（用于出现动画）
        dragonHead.scaling = new Vector3(0, 0, 0);
        
        // 清理方法
        const originalDispose = dragonHead.dispose.bind(dragonHead);
        dragonHead.dispose = () => {
            if (dragonHead._eyeFlickerObserver) {
                scene.onBeforeRenderObservable.remove(dragonHead._eyeFlickerObserver);
            }
            if (dragonHead._nostrilSmokeLeft) {
                dragonHead._nostrilSmokeLeft.dispose();
            }
            if (dragonHead._nostrilSmokeRight) {
                dragonHead._nostrilSmokeRight.dispose();
            }
            originalDispose();
        };
        
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
