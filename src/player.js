import { MeshBuilder, Vector3, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Quaternion, Matrix, ActionManager, ParticleSystem, Texture, Color4, TransformNode, Ray, Engine, Scalar, TrailMesh, PointLight, PointerEventTypes, GlowLayer, Space, DynamicTexture, ShaderMaterial, Effect } from "@babylonjs/core";
import { Config } from "./config";
import { Shield } from "./shield";
import { spawnAlphaParticleCannon } from "./armory/AlphaParticleCannon";
import { spawnPegasusParticleCannon, createPegasusGunMesh } from "./armory/PegasusParticleCannon";
import { createLightSpearMesh, spawnLightSpear } from "./armory/LightSpear";
import { createSolarPlasmaCannonMesh, spawnSolarPlasmaCannon } from "./armory/SolarPlasmaCannon";
import { createScorpioPulsarGunMesh, spawnScorpioPulsarGun } from "./armory/ScorpioPulsarGun";
import { createQuantumAnnihilatorMesh, spawnQuantumAnnihilator } from "./armory/QuantumAnnihilator";
import { createEmeraldViperMesh, spawnEmeraldViper } from "./armory/EmeraldViper";
import { createChronoArbalestMesh, spawnChronoArbalest } from "./armory/ChronoArbalest";

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.aggregate = null;
        this.inputMap = {};
        this.walkTime = 0;
        this.isSprinting = false;
        this.booster = null;
        this.boosterPSList = [];
        this.antiGravity = false;
        this.hoverActive = false;
        this.ascendImpulseMs = 0;
        this._groundEpsilon = 0.06;
        this.nearbyHorse = null;
        this.hoverHeight = 0.8;
        this.ascendHeld = false;
        this.altHoldEnabled = false;
        this.altHoldMinY = 0;
        this.mountedHorse = null;

        this.createPlayerMesh();
        this.setupAttackEffect();
        this.setupGun();

        // 创建护盾
        this.shield = new Shield(this.scene, this.modelRoot);

        this.setupPhysics();
        this.setupInputs();
        this.registerBeforeRender();
    }

    createPlayerMesh() {
        // 玩家容器
        this.mesh = MeshBuilder.CreateCapsule("player", { height: 2, radius: 0.5 }, this.scene);
        this.mesh.position.y = 1;
        this.mesh.visibility = Config.player.showCollider ? 0.5 : 0; // 根据配置显示或隐藏胶囊体

        // 材质
        const skinMat = new StandardMaterial("skinMat", this.scene);
        skinMat.diffuseColor = new Color3(1, 0.8, 0.6);
        skinMat.specularColor = new Color3(0, 0, 0); // 去掉高光

        const hairMat = new StandardMaterial("hairMat", this.scene);
        hairMat.diffuseColor = new Color3(0.4, 0.2, 0.1); // 棕色头发
        hairMat.specularColor = new Color3(0, 0, 0); // 去掉高光

        const clothesMat = new StandardMaterial("clothesMat", this.scene);
        clothesMat.diffuseColor = new Color3(1, 0.4, 0.6); // 粉色衬衫
        clothesMat.specularColor = new Color3(0, 0, 0); // 去掉高光

        const pantsMat = new StandardMaterial("pantsMat", this.scene);
        pantsMat.diffuseColor = new Color3(0.2, 0.2, 0.8); // 蓝色裤子
        pantsMat.specularColor = new Color3(0, 0, 0); // 去掉高光

        const eyeMat = new StandardMaterial("eyeMat", this.scene);
        eyeMat.diffuseColor = new Color3(0, 0, 0);
        eyeMat.specularColor = new Color3(0, 0, 0); // 去掉高光

        const mouthMat = new StandardMaterial("mouthMat", this.scene);
        mouthMat.diffuseColor = new Color3(0.8, 0.2, 0.2);
        mouthMat.specularColor = new Color3(0, 0, 0); // 去掉高光

        // 身体容器，用于旋转
        this.modelRoot = new MeshBuilder.CreateBox("modelRoot", { size: 0.1 }, this.scene);
        this.modelRoot.isVisible = false;
        this.modelRoot.parent = this.mesh;
        this.modelRoot.position.y = -1.2; // 调整模型在胶囊体中的位置 (腿底是0.2, 所以 -1.2 + 0.2 = -1, 刚好到底)

        // 头部
        const head = MeshBuilder.CreateBox("head", { size: 0.5 }, this.scene);
        head.material = skinMat;
        head.parent = this.modelRoot;
        head.position.y = 1.75;

        // 头发
        const hairTop = MeshBuilder.CreateBox("hairTop", { width: 0.55, height: 0.15, depth: 0.55 }, this.scene);
        hairTop.material = hairMat;
        hairTop.parent = head;
        hairTop.position.y = 0.25;

        const hairBack = MeshBuilder.CreateBox("hairBack", { width: 0.55, height: 0.6, depth: 0.15 }, this.scene);
        hairBack.material = hairMat;
        hairBack.parent = head;
        hairBack.position.y = -0.1;
        hairBack.position.z = -0.22;

        // 眼睛
        const leftEye = MeshBuilder.CreateBox("leftEye", { width: 0.08, height: 0.08, depth: 0.02 }, this.scene);
        leftEye.material = eyeMat;
        leftEye.parent = head;
        leftEye.position.z = 0.251;
        leftEye.position.x = -0.12;
        leftEye.position.y = 0;

        const rightEye = MeshBuilder.CreateBox("rightEye", { width: 0.08, height: 0.08, depth: 0.02 }, this.scene);
        rightEye.material = eyeMat;
        rightEye.parent = head;
        rightEye.position.z = 0.251;
        rightEye.position.x = 0.12;
        rightEye.position.y = 0;

        // 鼻子
        const nose = MeshBuilder.CreateBox("nose", { width: 0.06, height: 0.06, depth: 0.02 }, this.scene);
        nose.material = skinMat; // 与皮肤相同但突出
        nose.parent = head;
        nose.position.z = 0.26;
        nose.position.y = -0.08;

        // 嘴巴
        const mouth = MeshBuilder.CreateBox("mouth", { width: 0.15, height: 0.04, depth: 0.02 }, this.scene);
        mouth.material = mouthMat;
        mouth.parent = head;
        mouth.position.z = 0.251;
        mouth.position.y = -0.18;

        // 身体
        const body = MeshBuilder.CreateBox("body", { width: 0.5, height: 0.6, depth: 0.25 }, this.scene);
        body.material = clothesMat;
        body.parent = this.modelRoot;
        body.position.y = 1.2;

        const boosterMat = new StandardMaterial("boosterMat", this.scene);
        boosterMat.diffuseColor = new Color3(0.6, 0.6, 0.6);
        boosterMat.specularColor = new Color3(0, 0, 0);
        this.booster = new TransformNode("boosterRoot", this.scene);
        this.booster.parent = body;
        this.booster.position = new Vector3(0, 0.05, -0.29);

        const housing = MeshBuilder.CreateBox("boosterHousing", { width: 0.6, height: 0.25, depth: 0.2 }, this.scene);
        housing.material = boosterMat;
        housing.parent = this.booster;
        housing.position = new Vector3(0, 0.1, 0);

        const pipeHeight = 0.25;
        const pipeY = -0.15;

        const pipeL = MeshBuilder.CreateCylinder("boosterPipeL", { diameter: 0.12, height: pipeHeight }, this.scene);
        pipeL.material = boosterMat;
        pipeL.parent = this.booster;
        pipeL.position = new Vector3(-0.15, pipeY, 0);

        const pipeR = MeshBuilder.CreateCylinder("boosterPipeR", { diameter: 0.12, height: pipeHeight }, this.scene);
        pipeR.material = boosterMat;
        pipeR.parent = this.booster;
        pipeR.position = new Vector3(0.15, pipeY, 0);

        // 喷嘴细节
        const nozzleHeight = 0.05;
        const nozzleDiameter = 0.14;

        const nozzleMeshL = MeshBuilder.CreateCylinder("nozzleMeshL", { diameter: nozzleDiameter, height: nozzleHeight }, this.scene);
        nozzleMeshL.material = boosterMat;
        nozzleMeshL.parent = pipeL;
        nozzleMeshL.position.y = -pipeHeight / 2 - nozzleHeight / 2;

        const nozzleMeshR = MeshBuilder.CreateCylinder("nozzleMeshR", { diameter: nozzleDiameter, height: nozzleHeight }, this.scene);
        nozzleMeshR.material = boosterMat;
        nozzleMeshR.parent = pipeR;
        nozzleMeshR.position.y = -pipeHeight / 2 - nozzleHeight / 2;

        const nozzleL = new TransformNode("boosterNozzleL", this.scene);
        nozzleL.parent = nozzleMeshL;
        nozzleL.position = new Vector3(0, -nozzleHeight / 2, 0);
        this.boosterNozzleL = nozzleL;

        const nozzleR = new TransformNode("boosterNozzleR", this.scene);
        nozzleR.parent = nozzleMeshR;
        nozzleR.position = new Vector3(0, -nozzleHeight / 2, 0);
        this.boosterNozzleR = nozzleR;

        // --- 替换为：体积光束（Volumetric Beam）方案 ---
        // 1. 生成光束纹理 (线性渐变 + 噪声线条)
        const canvas = document.createElement("canvas");
        canvas.width = 64; canvas.height = 128;
        const ctx = canvas.getContext("2d");

        // 背景渐变 (白 -> 黄 -> 橙 -> 红 -> 透明) - 更像真实火焰的颜色
        const grad = ctx.createLinearGradient(0, 0, 0, 128);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");       // 核心白热
        grad.addColorStop(0.1, "rgba(255, 240, 100, 0.95)");  // 内焰亮黄
        grad.addColorStop(0.3, "rgba(255, 140, 0, 0.9)");     // 中焰橙红
        grad.addColorStop(0.6, "rgba(200, 40, 0, 0.7)");      // 外焰深红
        grad.addColorStop(1, "rgba(100, 0, 0, 0)");           // 尾部烟雾/消散
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 128);

        // 添加随机的高亮线条 (模拟喷射气流感)
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255, 255, 200, 0.4)"; // 线条也带点暖色
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * 64;
            const w = Math.random() * 8 + 2;
            ctx.fillRect(x, 0, w, 128);
        }

        const texUrl = canvas.toDataURL();
        const flameTex = Texture.CreateFromBase64String(texUrl, "flame_beam.png", this.scene);
        flameTex.hasAlpha = true;
        flameTex.vScale = 1.0;

        // 2. 创建发光材质
        const flameMat = new StandardMaterial("flameMat", this.scene);
        flameMat.diffuseTexture = flameTex;
        flameMat.emissiveTexture = flameTex;
        flameMat.opacityTexture = flameTex; // 使用同样的纹理作为透明通道
        flameMat.emissiveColor = new Color3(1.0, 0.5, 0.0); // 强调橙红色发光
        flameMat.disableLighting = true; // 自发光，不受光照影响
        flameMat.alphaMode = Engine.ALPHA_ADD; // 叠加模式，更亮
        flameMat.backFaceCulling = false; // 双面可见

        this.flameMat = flameMat; // 保存引用以便更新UV

        // 3. 创建光束网格 (Cylinder)
        const createFlameMesh = (parent) => {
            const root = new TransformNode("flameRoot", this.scene);
            root.parent = parent;
            root.position = new Vector3(0, 0, 0);

            // 创建倒圆锥体/圆柱体
            const mesh = MeshBuilder.CreateCylinder("flameMesh", {
                height: 0.8,
                diameterTop: 0.16,
                diameterBottom: 0.02,
                tessellation: 16
            }, this.scene);

            mesh.material = flameMat;
            mesh.parent = root;
            // 向下偏移一半高度，使顶部对齐 root (即对齐喷嘴)
            mesh.position.y = -0.4;

            // 初始缩放为0 (隐藏)
            root.scaling = new Vector3(0, 0, 0);
            return root;
        };

        this.flameRootL = createFlameMesh(this.boosterNozzleL);
        this.flameRootR = createFlameMesh(this.boosterNozzleR);
        this.flameRoots = [this.flameRootL, this.flameRootR];

        // 移除旧的粒子系统列表引用
        this.boosterPSList = null;

        // 手臂参数
        const armWidth = 0.15;
        const armHeight = 0.6;
        const armDepth = 0.15;
        const shoulderY = 1.5; // 肩膀高度 (身体顶部在 1.2 + 0.3 = 1.5)
        const armOffsetX = 0.35;

        // 左肩关节
        this.leftShoulder = MeshBuilder.CreateBox("leftShoulder", { size: 0.01 }, this.scene);
        this.leftShoulder.isVisible = false;
        this.leftShoulder.parent = this.modelRoot;
        this.leftShoulder.position = new Vector3(-armOffsetX, shoulderY, 0);

        // 左臂 (挂在左肩下)
        const leftArm = MeshBuilder.CreateBox("leftArm", { width: armWidth, height: armHeight, depth: armDepth }, this.scene);
        leftArm.material = skinMat;
        leftArm.parent = this.leftShoulder;
        leftArm.position.y = -armHeight / 2; // 向下偏移一半高度

        // 右肩关节
        this.rightShoulder = MeshBuilder.CreateBox("rightShoulder", { size: 0.01 }, this.scene);
        this.rightShoulder.isVisible = false;
        this.rightShoulder.parent = this.modelRoot;
        this.rightShoulder.position = new Vector3(armOffsetX, shoulderY, 0);

        // 右臂
        const rightArm = MeshBuilder.CreateBox("rightArm", { width: armWidth, height: armHeight, depth: armDepth }, this.scene);
        rightArm.material = skinMat;
        rightArm.parent = this.rightShoulder;
        rightArm.position.y = -armHeight / 2;

        // 腿部参数
        const legWidth = 0.2;
        const legHeight = 0.7;
        const legDepth = 0.2;
        const hipY = 0.9; // 臀部高度 (身体底部在 1.2 - 0.3 = 0.9)
        const legOffsetX = 0.12;

        // 左髋关节
        this.leftHip = MeshBuilder.CreateBox("leftHip", { size: 0.01 }, this.scene);
        this.leftHip.isVisible = false;
        this.leftHip.parent = this.modelRoot;
        this.leftHip.position = new Vector3(-legOffsetX, hipY, 0);

        // 左腿
        const leftLeg = MeshBuilder.CreateBox("leftLeg", { width: legWidth, height: legHeight, depth: legDepth }, this.scene);
        leftLeg.material = pantsMat;
        leftLeg.parent = this.leftHip;
        leftLeg.position.y = -legHeight / 2;

        // 右髋关节
        this.rightHip = MeshBuilder.CreateBox("rightHip", { size: 0.01 }, this.scene);
        this.rightHip.isVisible = false;
        this.rightHip.parent = this.modelRoot;
        this.rightHip.position = new Vector3(legOffsetX, hipY, 0);

        // 右腿
        const rightLeg = MeshBuilder.CreateBox("rightLeg", { width: legWidth, height: legHeight, depth: legDepth }, this.scene);
        rightLeg.material = pantsMat;
        rightLeg.parent = this.rightHip;
        rightLeg.position.y = -legHeight / 2;
    }

    setupAttackEffect() {
        // 攻击状态
        this.isAttacking = false;
        this.attackTime = 0;
        this.attackDuration = 0.4; // 攻击持续时间 0.4秒

        // 攻击特效挂点 (手部)
        this.attackRef = new TransformNode("attackRef", this.scene);
        this.attackRef.parent = this.rightArm;
        this.attackRef.position = new Vector3(0, -0.3, 0); // 手部末端位置

        // 拖尾特效 - 增加直径和长度，使其更明显
        this.attackTrail = new TrailMesh("attackTrail", this.attackRef, this.scene, 0.2, 30, true);

        // 拖尾材质 - 酷炫的光效
        const trailMat = new StandardMaterial("trailMat", this.scene);
        trailMat.emissiveColor = new Color3(0.2, 0.8, 1); // 青蓝色光效，更有科技感
        trailMat.diffuseColor = new Color3(0, 0, 0);
        trailMat.specularColor = new Color3(0, 0, 0);
        trailMat.alpha = 0.8;
        trailMat.disableLighting = true;

        this.attackTrail.material = trailMat;
        this.attackTrail.isVisible = false; // 初始隐藏
    }

    attack() {
        if (this.isAttacking) return;
        this.isAttacking = true;
        this.attackTime = 0;
        this.attackTrail.isVisible = true;
        this.attackTrail.start();
    }

    updateAttack(dt) {
        if (!this.isAttacking) return;

        this.attackTime += dt;
        const progress = Math.min(this.attackTime / this.attackDuration, 1.0);

        // 简单的挥砍动画曲线 (EaseOut)
        const t = 1 - Math.pow(1 - progress, 3);

        // 挥动动作: 右臂横向挥动
        // 初始: 向后蓄力 (Rotation Y 约 -0.5)
        // 结束: 向前挥过 (Rotation Y 约 2.8)
        const startAngle = -0.8;
        const endAngle = 2.8;
        const currentAngle = startAngle + (endAngle - startAngle) * t;

        // 覆盖右肩旋转
        // x轴微调保持手臂水平或略斜
        this.rightShoulder.rotation.x = -Math.PI / 2; // 手臂平举
        this.rightShoulder.rotation.y = currentAngle;
        this.rightShoulder.rotation.z = 0;

        // 结束判定
        if (progress >= 1.0) {
            this.isAttacking = false;
            this.attackTrail.isVisible = false;
        }
    }

    setupGun() {
        this.currentWeapon = null;
        this.isHoldingGun = false;
        this.bullets = [];
        this.currentGunModel = null;

        // Beam Weapon State
        this.isBeamActive = false;
        this.beamMesh = null;
        this.fireInputPressed = false;

        // Gun Root attached to Right Arm
        this.gunRoot = new TransformNode("gunRoot", this.scene);
        // Fix: Find rightArm from rightShoulder as it wasn't saved to 'this'
        this.rightArm = this.rightShoulder.getChildMeshes()[0];
        this.gunRoot.parent = this.rightArm;

        // Adjust position to be in hand
        this.gunRoot.position = new Vector3(0, -0.3, 0.1);
        this.gunRoot.rotation.x = Math.PI / 2; // Point forward
        this.gunRoot.isVisible = false;

        // Muzzle Point (Placeholder, updated in equipWeaponVisuals)
        this.gunMuzzle = new TransformNode("gunMuzzle", this.scene);
        this.gunMuzzle.parent = this.gunRoot;
        this.gunMuzzle.position.z = 0.8;

        // Setup Particle Texture for Muzzle Flash
        this.particleTexture = this.createParticleTexture();

        // Setup Persistent Muzzle Flash System
        this.setupMuzzleFlash();

        // Initialize with default visuals (hidden)
        this.equipWeaponVisuals(null);
        this.setGunVisibility(false);
    }

    equipWeaponVisuals(weaponName) {
        // Dispose old model
        if (this.currentGunModel) {
            this.currentGunModel.dispose();
            this.currentGunModel = null;
        }

        // Create new model based on weapon
        if (weaponName === "PegasusParticleCannon") {
            this.currentGunModel = createPegasusGunMesh(this.scene);
            this.currentGunModel.parent = this.gunRoot;
            // Adjust Pegasus Model to fit in hand
            // The model was designed with Z forward.
            // gunRoot is rotated X=90.
            // Pegasus model usually needs to just sit there.
            // Check createPegasusGunMesh: body.position.z = 0.2
            this.currentGunModel.rotation = Vector3.Zero();

            // Update Muzzle Position
            this.gunMuzzle.position = new Vector3(0, 0, 1.2); // Tip of barrel (1.2 length)

            // Update Muzzle Position
            this.gunMuzzle.position = new Vector3(0, 0, 1.2); // Tip of barrel (1.2 length)

        } else if (weaponName === "LightSpear") {
            this.currentGunModel = createLightSpearMesh(this.scene);
            this.currentGunModel.parent = this.gunRoot;
            this.currentGunModel.rotation = Vector3.Zero();

            // Adjust position for holding
            // Gun model center is around z=0.4-0.6. 
            // We want the handle (around z=0) to be at hand.
            // The model starts at z=0 basically.

            // Update Muzzle Position (Tip is at z=1.15)
            this.gunMuzzle.position = new Vector3(0, 0, 1.15);

        } else if (weaponName === "SolarPlasmaCannon") {
            this.currentGunModel = createSolarPlasmaCannonMesh(this.scene);
            this.currentGunModel.parent = this.gunRoot;
            this.currentGunModel.rotation = Vector3.Zero();

            // Adjust position for holding
            // Gun is stout.
            this.gunMuzzle.position = new Vector3(0, 0, 0.8);

        } else if (weaponName === "ScorpioPulsarGun") {
            this.currentGunModel = createScorpioPulsarGunMesh(this.scene);
            this.currentGunModel.parent = this.gunRoot;
            this.currentGunModel.rotation = Vector3.Zero();

            // Adjust position
            this.gunMuzzle.position = new Vector3(0, 0, 0.8);

        } else if (weaponName === "QuantumAnnihilator") {
            this.currentGunModel = createQuantumAnnihilatorMesh(this.scene);
            this.currentGunModel.parent = this.gunRoot;
            this.currentGunModel.rotation = Vector3.Zero();

            // Adjust position for quantum cannon
            this.gunMuzzle.position = new Vector3(0, 0, 0.9);

        } else if (weaponName === "EmeraldViper") {
            this.currentGunModel = createEmeraldViperMesh(this.scene);
            this.currentGunModel.parent = this.gunRoot;
            this.currentGunModel.rotation = Vector3.Zero();

            // 调整位置: 生物武器包裹在手臂上
            this.gunMuzzle.position = new Vector3(0, 0, 0.85);

        } else {
            // Default / Alpha Particle Cannon (Grey Boxy Gun)
            const group = new TransformNode("defaultGunGroup", this.scene);

            const gunBody = MeshBuilder.CreateBox("gunBody", { width: 0.1, height: 0.15, depth: 0.4 }, this.scene);
            const gunMat = new StandardMaterial("gunMat", this.scene);
            gunMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
            gunBody.material = gunMat;
            gunBody.parent = group;
            gunBody.position.z = 0.2;

            const barrel = MeshBuilder.CreateCylinder("gunBarrel", { height: 0.5, diameter: 0.08 }, this.scene);
            barrel.rotation.x = Math.PI / 2;
            barrel.parent = group;
            barrel.position.z = 0.5;
            barrel.material = gunMat;

            const core = MeshBuilder.CreateCylinder("gunCore", { height: 0.3, diameter: 0.12 }, this.scene);
            core.rotation.x = Math.PI / 2;
            core.parent = group;
            core.position.z = 0.3;

            const coreMat = new StandardMaterial("coreMat", this.scene);
            coreMat.emissiveColor = new Color3(0, 1, 1); // Cyan Glow
            coreMat.disableLighting = true;
            core.material = coreMat;

            this.currentGunModel = group;
            this.currentGunModel.parent = this.gunRoot;

            // Update Muzzle Position
            this.gunMuzzle.position = new Vector3(0, 0, 0.8);
        }

        // Re-attach muzzle flash to new muzzle position (it follows transform node)
        if (this.muzzleFlashPS) {
            this.muzzleFlashPS.emitter = this.gunMuzzle;
        }
    }

    createParticleTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext("2d");

        // Star/Spark shape
        ctx.beginPath();
        const cx = 32, cy = 32, spikes = 8, outerRadius = 30, innerRadius = 10;
        let rot = Math.PI / 2 * 3;
        let x = cx, y = cy;
        const step = Math.PI / spikes;

        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.5, "rgba(0, 255, 255, 0.8)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fill();

        return Texture.CreateFromBase64String(canvas.toDataURL(), "particleStar", this.scene);
    }

    setupMuzzleFlash() {
        if (this.muzzleFlashPS) {
            this.muzzleFlashPS.dispose();
        }
        // Create persistent particle system
        const ps = new ParticleSystem("muzzleFlash", 50, this.scene);
        ps.particleTexture = this.particleTexture;
        ps.emitter = this.gunMuzzle;

        ps.minEmitBox = new Vector3(0, 0, 0);
        ps.maxEmitBox = new Vector3(0, 0, 0);

        ps.color1 = new Color4(1, 1, 1, 1.0);
        ps.color2 = new Color4(0, 1, 1, 1.0);
        ps.colorDead = new Color4(0, 0, 0, 0.0);

        ps.minSize = 0.1;
        ps.maxSize = 0.4;
        ps.minLifeTime = 0.1;
        ps.maxLifeTime = 0.2;

        ps.emitRate = 0; // Manual emit only
        ps.targetStopDuration = 0; // Continuous
        ps.disposeOnStop = false; // Keep alive

        ps.isLocal = true;
        ps.minEmitPower = 2;
        ps.maxEmitPower = 6;
        ps.updateSpeed = 0.02;
        ps.direction1 = new Vector3(-0.5, -0.5, 1);
        ps.direction2 = new Vector3(0.5, 0.5, 5);

        // Start immediately (but emitRate is 0, so no particles yet)
        ps.start();

        this.muzzleFlashPS = ps;
    }

    setGunVisibility(visible) {
        const scale = visible ? 1 : 0;
        this.gunRoot.scaling = new Vector3(scale, scale, scale);
    }

    toggleGun() {
        if (this.currentWeapon) {
            this.dropWeapon();
        }
    }

    pickupWeapon(weaponName) {
        if (this.currentWeapon) return;
        this.currentWeapon = weaponName || "AlphaParticleCannon";
        this.isHoldingGun = true;

        // Update Visuals (Mesh and Position)
        this.equipWeaponVisuals(this.currentWeapon);

        this.setGunVisibility(true);
    }

    dropWeapon() {
        if (!this.currentWeapon) return;

        if (this.isBeamActive) this.stopBeam();

        // Drop slightly forward to avoid immediate re-pickup
        const forward = this.mesh.getDirection(new Vector3(0, 0, 1));
        const dropPos = this.mesh.position.add(forward.scale(2.5));
        // Keep Y close to ground or current player Y
        dropPos.y = Math.max(0.5, this.mesh.position.y);

        if (this.currentWeapon === "AlphaParticleCannon") {
            spawnAlphaParticleCannon(this.scene, dropPos, this);
        } else if (this.currentWeapon === "PegasusParticleCannon") {
            spawnPegasusParticleCannon(this.scene, dropPos, this);
        } else if (this.currentWeapon === "LightSpear") {
            spawnLightSpear(this.scene, dropPos, this);
        } else if (this.currentWeapon === "SolarPlasmaCannon") {
            spawnSolarPlasmaCannon(this.scene, dropPos, this);
        } else if (this.currentWeapon === "ScorpioPulsarGun") {
            spawnScorpioPulsarGun(this.scene, dropPos, this);
        } else if (this.currentWeapon === "QuantumAnnihilator") {
            spawnQuantumAnnihilator(this.scene, dropPos, this);
        } else if (this.currentWeapon === "EmeraldViper") {
            spawnEmeraldViper(this.scene, dropPos, this);
        } else if (this.currentWeapon === "ChronoArbalest") {
            spawnChronoArbalest(this.scene, dropPos, this);
        }

        this.currentWeapon = null;
        this.isHoldingGun = false;
        this.setGunVisibility(false);
    }

    shoot() {
        if (!this.isHoldingGun) return;

        // 1. Muzzle Flash
        this.muzzleFlashPS.manualEmitCount = 20;

        // Update Flash Color based on weapon
        if (this.currentWeapon === "PegasusParticleCannon") {
            this.muzzleFlashPS.color1 = new Color4(1, 0.8, 0, 1); // Gold/Red
            this.muzzleFlashPS.color2 = new Color4(1, 0, 0, 1);
        } else if (this.currentWeapon === "LightSpear") {
            this.muzzleFlashPS.color1 = new Color4(0.5, 1, 1, 1); // Cyan/White
            this.muzzleFlashPS.color2 = new Color4(0, 1, 1, 1);
        } else if (this.currentWeapon === "SolarPlasmaCannon") {
            this.muzzleFlashPS.color1 = new Color4(1, 0.5, 0, 1); // Orange
            this.muzzleFlashPS.color2 = new Color4(1, 0, 1, 1); // Purple
        } else if (this.currentWeapon === "QuantumAnnihilator") {
            this.muzzleFlashPS.color1 = new Color4(0.3, 0.6, 1, 1); // Blue
            this.muzzleFlashPS.color2 = new Color4(0.7, 0.3, 1, 1); // Purple
        } else if (this.currentWeapon === "EmeraldViper") {
            this.muzzleFlashPS.color1 = new Color4(0.2, 1.0, 0.0, 1); // Toxic Green
            this.muzzleFlashPS.color2 = new Color4(0.8, 1.0, 0.2, 1); // Yellow Green
        } else if (this.currentWeapon === "ChronoArbalest") {
            this.muzzleFlashPS.color1 = new Color4(1.0, 0.8, 0.4, 1); // Gold
            this.muzzleFlashPS.color2 = new Color4(1.0, 1.0, 1.0, 1); // White Steam
        } else {
            this.muzzleFlashPS.color1 = new Color4(0, 1, 1, 1);
            this.muzzleFlashPS.color2 = new Color4(0, 0.5, 1, 1);
        }
        this.muzzleFlashPS.start();

        // 2. Bullet Creation
        const startPos = this.gunMuzzle.absolutePosition.clone();
        const forward = this.gunMuzzle.getDirection(new Vector3(0, 0, 1)).normalize();

        let bulletMesh;
        let bulletData = {
            life: 2.0,
            velocity: forward.scale(40)
        };

        if (this.currentWeapon === "PegasusParticleCannon") {
            // --- PEGASUS METEOR (ENHANCED) ---
            // 1. Core Projectile (The "Star")
            bulletMesh = MeshBuilder.CreateSphere("pegasusBolt", { diameter: 0.3, segments: 16 }, this.scene);
            bulletMesh.position = startPos;

            const mat = new StandardMaterial("pegasusBoltMat", this.scene);
            mat.emissiveColor = new Color3(1, 0.8, 0.4); // Bright Gold/White Core
            mat.diffuseColor = new Color3(1, 1, 1);
            mat.disableLighting = true;
            bulletMesh.material = mat;

            // 2. Particle Systems Container
            bulletData.particleSystems = [];

            // Helper to create systems
            const createSystem = (name, textureUrl, options) => {
                const ps = new ParticleSystem(name, options.capacity || 100, this.scene);
                ps.particleTexture = new Texture(textureUrl, this.scene);
                ps.emitter = bulletMesh;

                // Emitter shape
                if (options.sphereEmitter) {
                    ps.createSphereEmitter(options.sphereEmitter.radius || 0.1);
                } else {
                    ps.minEmitBox = options.minEmitBox || new Vector3(0, 0, 0);
                    ps.maxEmitBox = options.maxEmitBox || new Vector3(0, 0, 0);
                }

                // Life
                ps.minLifeTime = options.minLife || 0.5;
                ps.maxLifeTime = options.maxLife || 1.0;

                // Size
                ps.minSize = options.minSize || 0.1;
                ps.maxSize = options.maxSize || 0.3;

                // Color
                ps.color1 = options.color1 || new Color4(1, 1, 1, 1);
                ps.color2 = options.color2 || new Color4(1, 1, 1, 1);
                ps.colorDead = options.colorDead || new Color4(0, 0, 0, 0);

                // Speed/Force
                ps.emitRate = options.emitRate || 50;
                ps.minEmitPower = options.minPower || 1;
                ps.maxEmitPower = options.maxPower || 3;
                ps.updateSpeed = options.updateSpeed || 0.01;

                // Blending
                ps.blendMode = ParticleSystem.BLENDMODE_ADD;

                ps.start();
                return ps;
            };

            // A. The "Comet Tail" (Dense, Gold/Red Stream)
            // Uses the star texture we already generated in createParticleTexture, but we need to access it.
            // Let's just use a standard flare texture URL for robustness or reuse this.particleTexture if possible.
            // Reusing `this.particleTexture` is efficient.
            const psTail = new ParticleSystem("pegasusTail", 400, this.scene);
            psTail.particleTexture = this.particleTexture;
            psTail.emitter = bulletMesh;
            psTail.minEmitBox = new Vector3(-0.05, -0.05, -0.05);
            psTail.maxEmitBox = new Vector3(0.05, 0.05, 0.05);

            psTail.color1 = new Color4(1.0, 0.8, 0.2, 1.0); // Gold
            psTail.color2 = new Color4(1.0, 0.2, 0.1, 1.0); // Red
            psTail.colorDead = new Color4(0.5, 0.0, 0.0, 0.0); // Dark Red fade

            psTail.minSize = 0.3;
            psTail.maxSize = 0.7;
            psTail.minLifeTime = 0.4;
            psTail.maxLifeTime = 0.8;
            psTail.emitRate = 300; // High density
            psTail.blendMode = ParticleSystem.BLENDMODE_ADD;
            psTail.start();
            bulletData.particleSystems.push(psTail);

            // B. The "Wings/Feathers" (Wide spread, slower, floating)
            const psWings = new ParticleSystem("pegasusWings", 200, this.scene);
            psWings.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
            psWings.emitter = bulletMesh;
            // Emit from a slightly larger sphere
            psWings.createSphereEmitter(0.2);

            psWings.color1 = new Color4(1.0, 1.0, 1.0, 0.8); // White
            psWings.color2 = new Color4(1.0, 0.9, 0.5, 0.6); // Pale Gold
            psWings.colorDead = new Color4(1.0, 0.5, 0.5, 0.0);

            psWings.minSize = 0.4;
            psWings.maxSize = 0.9;
            psWings.minLifeTime = 0.5;
            psWings.maxLifeTime = 1.2;
            psWings.emitRate = 80;

            // Drag/Gravity to make them "drift" behind
            psWings.gravity = new Vector3(0, 0.5, 0); // Slight rise
            psWings.minEmitPower = 0;
            psWings.maxEmitPower = 1;
            psWings.blendMode = ParticleSystem.BLENDMODE_ADD;
            psWings.start();
            bulletData.particleSystems.push(psWings);

            // C. The "Sparkles" (High frequency, tiny, chaotic)
            const psSparks = new ParticleSystem("pegasusSparks", 150, this.scene);
            psSparks.particleTexture = this.particleTexture;
            psSparks.emitter = bulletMesh;
            psSparks.createSphereEmitter(0.15);

            psSparks.color1 = new Color4(1.0, 1.0, 0.0, 1.0); // Bright Yellow
            psSparks.color2 = new Color4(1.0, 0.5, 0.0, 1.0); // Orange
            psSparks.colorDead = new Color4(1.0, 0.0, 0.0, 0.0);

            psSparks.minSize = 0.05;
            psSparks.maxSize = 0.15;
            psSparks.minLifeTime = 0.2;
            psSparks.maxLifeTime = 0.5;
            psSparks.emitRate = 200;

            psSparks.minAngularSpeed = -Math.PI;
            psSparks.maxAngularSpeed = Math.PI;
            psSparks.minEmitPower = 2;
            psSparks.maxEmitPower = 5;

            psSparks.blendMode = ParticleSystem.BLENDMODE_ADD;
            psSparks.start();
            bulletData.particleSystems.push(psSparks);

        } else if (this.currentWeapon === "LightSpear") {
            // --- LIGHT SPEAR (LASER SNIPER) ---
            // 1. Projectile: Long, thin laser beam
            bulletMesh = MeshBuilder.CreateCylinder("laserBeam", { height: 2.0, diameter: 0.05 }, this.scene);
            bulletMesh.rotation.x = Math.PI / 2; // Align with forward
            bulletMesh.position = startPos;
            bulletMesh.lookAt(bulletMesh.position.add(forward));

            const laserMat = new StandardMaterial("laserMat", this.scene);
            laserMat.emissiveColor = new Color3(0.6, 1.0, 1.0); // Bright Cyan
            laserMat.diffuseColor = new Color3(1, 1, 1);
            laserMat.disableLighting = true;
            laserMat.alpha = 0.9;
            bulletMesh.material = laserMat;

            // 2. Trail (Refraction/Distortion feel)
            const trail = new TrailMesh("laserTrail", bulletMesh, this.scene, 0.1, 20, true);
            const trailMat = new StandardMaterial("laserTrailMat", this.scene);
            trailMat.emissiveColor = new Color3(0.0, 0.8, 1.0);
            trailMat.disableLighting = true;
            trailMat.alpha = 0.5;
            trail.material = trailMat;
            bulletData.trail = trail;

            // 3. "Air Burning" Particles
            const psBurn = new ParticleSystem("laserBurn", 100, this.scene);
            psBurn.particleTexture = this.particleTexture;
            psBurn.emitter = bulletMesh;
            psBurn.createBoxEmitter(new Vector3(0, 0, 0), new Vector3(0, 0, 0), new Vector3(-0.05, -0.05, -1), new Vector3(0.05, 0.05, 1));

            psBurn.color1 = new Color4(0.8, 1.0, 1.0, 0.5);
            psBurn.color2 = new Color4(0.0, 0.5, 1.0, 0.0);
            psBurn.colorDead = new Color4(0, 0, 0, 0);

            psBurn.minSize = 0.1;
            psBurn.maxSize = 0.3;
            psBurn.minLifeTime = 0.2;
            psBurn.maxLifeTime = 0.5;
            psBurn.emitRate = 100;
            psBurn.start();

            bulletData.particleSystems = [psBurn];

            // Faster velocity for sniper
            bulletData.velocity = forward.scale(80);
        } else if (this.currentWeapon === "SolarPlasmaCannon") {
            // --- SOLAR PLASMA CANNON (MAGIC ORB) ---
            // 1. Projectile: Purple Magic Orb
            bulletMesh = MeshBuilder.CreateSphere("plasmaBall", { diameter: 0.8, segments: 32 }, this.scene);
            bulletMesh.position = startPos;

            const plasmaMat = new StandardMaterial("plasmaMat", this.scene);
            plasmaMat.emissiveColor = new Color3(0.7, 0.2, 1.0); // Bright Purple Core
            plasmaMat.diffuseColor = new Color3(0.5, 0.1, 0.8); // Deep Purple
            plasmaMat.specularColor = new Color3(0.9, 0.5, 1.0); // Purple specular
            plasmaMat.emissiveIntensity = 1.5; // Boost emissive
            plasmaMat.disableLighting = true;
            bulletMesh.material = plasmaMat;

            // 2. Glow Effect - Create independent glow layer for this bullet
            const glowLayer = new GlowLayer("plasmaGlow_" + Date.now(), this.scene);
            glowLayer.intensity = 1.2;
            glowLayer.addIncludedOnlyMesh(bulletMesh);
            bulletData.glowLayer = glowLayer; // Store for cleanup

            // 3. Particle Systems Container
            bulletData.particleSystems = [];

            // A. Inner Core - Dense Magic Energy (紫色魔法核心)
            const psCore = new ParticleSystem("plasmaCore", 500, this.scene);
            psCore.particleTexture = this.particleTexture;
            psCore.emitter = bulletMesh;
            psCore.createSphereEmitter(0.3); // Tight around center

            psCore.color1 = new Color4(0.8, 0.3, 1.0, 1.0); // Bright Purple
            psCore.color2 = new Color4(0.6, 0.1, 0.9, 1.0); // Violet
            psCore.colorDead = new Color4(0.3, 0.0, 0.5, 0.0); // Dark purple fade

            psCore.minSize = 0.2;
            psCore.maxSize = 0.5;
            psCore.minLifeTime = 0.15;
            psCore.maxLifeTime = 0.35;
            psCore.emitRate = 400;
            psCore.blendMode = ParticleSystem.BLENDMODE_ADD;

            // Slow rotation for energy swirl
            psCore.minAngularSpeed = -Math.PI * 2;
            psCore.maxAngularSpeed = Math.PI * 2;
            psCore.minEmitPower = 0.5;
            psCore.maxEmitPower = 2;

            psCore.start();
            bulletData.particleSystems.push(psCore);

            // B. Outer Magic Vortex - Swirling Aura (旋转紫色光环)
            const psVortex = new ParticleSystem("plasmaVortex", 350, this.scene);
            psVortex.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
            psVortex.emitter = bulletMesh;
            psVortex.createSphereEmitter(0.5); // Medium radius

            psVortex.color1 = new Color4(1.0, 0.2, 1.0, 0.9); // Magenta
            psVortex.color2 = new Color4(0.7, 0.4, 1.0, 0.8); // Pink Purple
            psVortex.colorDead = new Color4(0.2, 0.0, 0.4, 0.0); // Dark purple fade

            psVortex.minSize = 0.4;
            psVortex.maxSize = 0.9;
            psVortex.minLifeTime = 0.25;
            psVortex.maxLifeTime = 0.6;
            psVortex.emitRate = 250;
            psVortex.blendMode = ParticleSystem.BLENDMODE_ADD;

            // Fast rotation for vortex effect
            psVortex.minAngularSpeed = -Math.PI * 6;
            psVortex.maxAngularSpeed = Math.PI * 6;
            psVortex.minInitialRotation = 0;
            psVortex.maxInitialRotation = Math.PI * 2;
            psVortex.minEmitPower = 1;
            psVortex.maxEmitPower = 3;

            psVortex.start();
            bulletData.particleSystems.push(psVortex);

            // C. Magic Arcs/Lightning (魔法电弧)
            const psArcs = new ParticleSystem("plasmaArcs", 200, this.scene);
            psArcs.particleTexture = this.particleTexture;
            psArcs.emitter = bulletMesh;
            psArcs.createSphereEmitter(0.6); // Outer layer

            psArcs.color1 = new Color4(0.8, 0.2, 1.0, 1.0); // Bright Purple
            psArcs.color2 = new Color4(1.0, 0.8, 1.0, 0.9); // Light Purple/White
            psArcs.colorDead = new Color4(0.4, 0.0, 0.7, 0.0); // Purple fade

            psArcs.minSize = 0.15;
            psArcs.maxSize = 0.35;
            psArcs.minLifeTime = 0.1;
            psArcs.maxLifeTime = 0.3;
            psArcs.emitRate = 150;
            psArcs.blendMode = ParticleSystem.BLENDMODE_ADD;

            // Erratic movement for lightning effect
            psArcs.minAngularSpeed = -Math.PI * 8;
            psArcs.maxAngularSpeed = Math.PI * 8;
            psArcs.minEmitPower = 3;
            psArcs.maxEmitPower = 7;

            psArcs.start();
            bulletData.particleSystems.push(psArcs);

            // D. Trailing Magic Sparks (后拖魔法火花)
            const psSparks = new ParticleSystem("plasmaSparks", 250, this.scene);
            psSparks.particleTexture = this.particleTexture;
            psSparks.emitter = bulletMesh;
            psSparks.minEmitBox = new Vector3(-0.2, -0.2, -0.2);
            psSparks.maxEmitBox = new Vector3(0.2, 0.2, 0.2);

            psSparks.color1 = new Color4(0.9, 0.5, 1.0, 1.0); // Light Purple
            psSparks.color2 = new Color4(0.5, 0.2, 0.8, 1.0); // Deep Purple
            psSparks.colorDead = new Color4(0.2, 0.0, 0.3, 0.0); // Dark purple fade

            psSparks.minSize = 0.08;
            psSparks.maxSize = 0.25;
            psSparks.minLifeTime = 0.3;
            psSparks.maxLifeTime = 0.7;
            psSparks.emitRate = 180;
            psSparks.blendMode = ParticleSystem.BLENDMODE_ADD;

            // Slow drift behind
            psSparks.minAngularSpeed = 0;
            psSparks.maxAngularSpeed = Math.PI;
            psSparks.minEmitPower = 0.5;
            psSparks.maxEmitPower = 2;
            psSparks.gravity = new Vector3(0, -1, 0); // Slight downward drift

            psSparks.start();
            bulletData.particleSystems.push(psSparks);

            // High speed projectile
            bulletData.velocity = forward.scale(60);

        } else if (this.currentWeapon === "QuantumAnnihilator") {
            // --- QUANTUM ANNIHILATOR (QUANTUM ENERGY SPHERE) ---
            // 1. Projectile: Quantum Energy Sphere with Rotating Rings
            bulletMesh = MeshBuilder.CreateSphere("quantumBolt", { diameter: 0.6, segments: 32 }, this.scene);
            bulletMesh.position = startPos;

            const quantumMat = new StandardMaterial("quantumBoltMat", this.scene);
            quantumMat.emissiveColor = new Color3(0.3, 0.6, 1.0); // Bright Blue Core
            quantumMat.diffuseColor = new Color3(0.2, 0.4, 0.8); // Deep Blue
            quantumMat.specularColor = new Color3(0.5, 0.7, 1.0); // Blue specular
            quantumMat.emissiveIntensity = 1.5; // Boost emissive
            quantumMat.disableLighting = true;
            bulletMesh.material = quantumMat;

            // Ensure world matrix is computed before creating trail
            bulletMesh.computeWorldMatrix(true);

            // 2. Glow Effect - Create independent glow layer for this bullet
            const quantumGlowLayer = new GlowLayer("quantumGlow_" + Date.now(), this.scene);
            quantumGlowLayer.intensity = 1.5;
            quantumGlowLayer.addIncludedOnlyMesh(bulletMesh);
            bulletData.glowLayer = quantumGlowLayer; // Store for cleanup

            // 3. Spiral Trail Mesh (Quantum Distortion)
            const quantumTrail = new TrailMesh("quantumTrail", bulletMesh, this.scene, 0.15, 30, true);
            const quantumTrailMat = new StandardMaterial("quantumTrailMat", this.scene);
            quantumTrailMat.emissiveColor = new Color3(0.4, 0.6, 1.0); // Blue glow
            quantumTrailMat.disableLighting = true;
            quantumTrailMat.alpha = 0.7;
            quantumTrail.material = quantumTrailMat;
            bulletData.trail = quantumTrail;

            // 4. Particle Systems Container
            bulletData.particleSystems = [];

            // A. Quantum Core - Dense Energy Particles (量子核心)
            const psQuantumCore = new ParticleSystem("quantumCore", 450, this.scene);
            psQuantumCore.particleTexture = this.particleTexture;
            psQuantumCore.emitter = bulletMesh;
            psQuantumCore.createSphereEmitter(0.25); // Tight around center

            psQuantumCore.color1 = new Color4(0.3, 0.6, 1.0, 1.0); // Bright Blue
            psQuantumCore.color2 = new Color4(0.5, 0.4, 1.0, 1.0); // Blue-Purple
            psQuantumCore.colorDead = new Color4(0.1, 0.2, 0.5, 0.0); // Dark blue fade

            psQuantumCore.minSize = 0.15;
            psQuantumCore.maxSize = 0.4;
            psQuantumCore.minLifeTime = 0.2;
            psQuantumCore.maxLifeTime = 0.4;
            psQuantumCore.emitRate = 350;
            psQuantumCore.blendMode = ParticleSystem.BLENDMODE_ADD;

            // Quantum fluctuation rotation
            psQuantumCore.minAngularSpeed = -Math.PI * 3;
            psQuantumCore.maxAngularSpeed = Math.PI * 3;
            psQuantumCore.minEmitPower = 0.5;
            psQuantumCore.maxEmitPower = 2;

            psQuantumCore.start();
            bulletData.particleSystems.push(psQuantumCore);

            // B. Quantum Vortex - Swirling Energy Field (量子漩涡)
            const psQuantumVortex = new ParticleSystem("quantumVortex", 300, this.scene);
            psQuantumVortex.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
            psQuantumVortex.emitter = bulletMesh;
            psQuantumVortex.createSphereEmitter(0.4); // Medium radius

            psQuantumVortex.color1 = new Color4(0.4, 0.7, 1.0, 0.9); // Bright Blue
            psQuantumVortex.color2 = new Color4(0.6, 0.5, 1.0, 0.8); // Purple-Blue
            psQuantumVortex.colorDead = new Color4(0.2, 0.3, 0.6, 0.0); // Dark blue fade

            psQuantumVortex.minSize = 0.3;
            psQuantumVortex.maxSize = 0.8;
            psQuantumVortex.minLifeTime = 0.3;
            psQuantumVortex.maxLifeTime = 0.7;
            psQuantumVortex.emitRate = 220;
            psQuantumVortex.blendMode = ParticleSystem.BLENDMODE_ADD;

            // Fast rotation for vortex effect
            psQuantumVortex.minAngularSpeed = -Math.PI * 5;
            psQuantumVortex.maxAngularSpeed = Math.PI * 5;
            psQuantumVortex.minInitialRotation = 0;
            psQuantumVortex.maxInitialRotation = Math.PI * 2;
            psQuantumVortex.minEmitPower = 1;
            psQuantumVortex.maxEmitPower = 3;

            psQuantumVortex.start();
            bulletData.particleSystems.push(psQuantumVortex);

            // C. Electric Arcs - Quantum Lightning (量子电弧)
            const psQuantumArcs = new ParticleSystem("quantumArcs", 180, this.scene);
            psQuantumArcs.particleTexture = this.particleTexture;
            psQuantumArcs.emitter = bulletMesh;
            psQuantumArcs.createSphereEmitter(0.5); // Outer layer

            psQuantumArcs.color1 = new Color4(0.0, 1.0, 1.0, 1.0); // Bright Cyan
            psQuantumArcs.color2 = new Color4(0.5, 0.8, 1.0, 0.9); // Light Blue
            psQuantumArcs.colorDead = new Color4(0.0, 0.4, 0.8, 0.0); // Blue fade

            psQuantumArcs.minSize = 0.1;
            psQuantumArcs.maxSize = 0.3;
            psQuantumArcs.minLifeTime = 0.08;
            psQuantumArcs.maxLifeTime = 0.25;
            psQuantumArcs.emitRate = 140;
            psQuantumArcs.blendMode = ParticleSystem.BLENDMODE_ADD;

            // Erratic movement for lightning effect
            psQuantumArcs.minAngularSpeed = -Math.PI * 10;
            psQuantumArcs.maxAngularSpeed = Math.PI * 10;
            psQuantumArcs.minEmitPower = 4;
            psQuantumArcs.maxEmitPower = 8;

            psQuantumArcs.start();
            bulletData.particleSystems.push(psQuantumArcs);

            // D. Quantum Trail - Trailing Energy Particles (量子拖尾)
            const psQuantumTrail = new ParticleSystem("quantumTrailPS", 220, this.scene);
            psQuantumTrail.particleTexture = this.particleTexture;
            psQuantumTrail.emitter = bulletMesh;
            psQuantumTrail.minEmitBox = new Vector3(-0.15, -0.15, -0.15);
            psQuantumTrail.maxEmitBox = new Vector3(0.15, 0.15, 0.15);

            psQuantumTrail.color1 = new Color4(0.5, 0.7, 1.0, 1.0); // Light Blue
            psQuantumTrail.color2 = new Color4(0.7, 0.5, 1.0, 1.0); // Purple-Blue
            psQuantumTrail.colorDead = new Color4(0.2, 0.2, 0.5, 0.0); // Dark blue fade

            psQuantumTrail.minSize = 0.1;
            psQuantumTrail.maxSize = 0.3;
            psQuantumTrail.minLifeTime = 0.4;
            psQuantumTrail.maxLifeTime = 0.8;
            psQuantumTrail.emitRate = 160;
            psQuantumTrail.blendMode = ParticleSystem.BLENDMODE_ADD;

            // Slow drift behind with quantum fluctuation
            psQuantumTrail.minAngularSpeed = -Math.PI;
            psQuantumTrail.maxAngularSpeed = Math.PI;
            psQuantumTrail.minEmitPower = 0.3;
            psQuantumTrail.maxEmitPower = 1.5;
            psQuantumTrail.gravity = new Vector3(0, 0, 0); // No gravity for quantum particles

            psQuantumTrail.start();
            bulletData.particleSystems.push(psQuantumTrail);

            // E. Quantum Sparkles - High-frequency micro particles (量子闪烁)
            const psQuantumSparkles = new ParticleSystem("quantumSparkles", 150, this.scene);
            psQuantumSparkles.particleTexture = this.particleTexture;
            psQuantumSparkles.emitter = bulletMesh;
            psQuantumSparkles.createSphereEmitter(0.35);

            psQuantumSparkles.color1 = new Color4(0.8, 0.9, 1.0, 1.0); // Bright White-Blue
            psQuantumSparkles.color2 = new Color4(0.3, 0.7, 1.0, 1.0); // Blue
            psQuantumSparkles.colorDead = new Color4(0.0, 0.3, 0.6, 0.0); // Dark blue fade

            psQuantumSparkles.minSize = 0.05;
            psQuantumSparkles.maxSize = 0.15;
            psQuantumSparkles.minLifeTime = 0.15;
            psQuantumSparkles.maxLifeTime = 0.4;
            psQuantumSparkles.emitRate = 180;
            psQuantumSparkles.blendMode = ParticleSystem.BLENDMODE_ADD;

            // Fast chaotic movement
            psQuantumSparkles.minAngularSpeed = -Math.PI * 6;
            psQuantumSparkles.maxAngularSpeed = Math.PI * 6;
            psQuantumSparkles.minEmitPower = 2;
            psQuantumSparkles.maxEmitPower = 5;

            psQuantumSparkles.start();
            bulletData.particleSystems.push(psQuantumSparkles);

            // High speed quantum projectile
            bulletData.velocity = forward.scale(70);

        } else if (this.currentWeapon === "EmeraldViper") {
            // --- EMERALD VIPER (ACID BLOB) ---
            // 1. Projectile: Deformed Slime Ball
            bulletMesh = MeshBuilder.CreateSphere("acidBlob", { diameter: 0.4, segments: 16 }, this.scene);
            bulletMesh.position = startPos;
            bulletMesh.scaling = new Vector3(1, 0.8, 1.2); // Slightly elongated

            const acidMat = new StandardMaterial("acidMat", this.scene);
            acidMat.diffuseColor = new Color3(0.2, 0.8, 0.0);
            acidMat.emissiveColor = new Color3(0.1, 0.4, 0.0);
            acidMat.specularColor = new Color3(0.5, 1.0, 0.5); // Wet look
            acidMat.specularPower = 64;
            acidMat.alpha = 0.9;
            bulletMesh.material = acidMat;

            // Ensure world matrix is computed before creating trail
            bulletMesh.computeWorldMatrix(true);

            // 2. Trail: Dripping Slime (No TrailMesh, just particles)
            bulletData.particleSystems = [];

            // A. Acid Cloud (Smoke)
            const psCloud = new ParticleSystem("acidCloud", 200, this.scene);
            psCloud.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/cloud.png", this.scene);
            psCloud.emitter = bulletMesh;
            psCloud.createSphereEmitter(0.3);

            psCloud.color1 = new Color4(0.1, 0.6, 0.0, 0.6); // Dark Green
            psCloud.color2 = new Color4(0.4, 0.8, 0.0, 0.4); // Light Green
            psCloud.colorDead = new Color4(0.0, 0.2, 0.0, 0.0);

            psCloud.minSize = 0.3;
            psCloud.maxSize = 0.6;
            psCloud.minLifeTime = 0.5;
            psCloud.maxLifeTime = 1.0;
            psCloud.emitRate = 100;
            psCloud.blendMode = ParticleSystem.BLENDMODE_STANDARD; // Smoke look

            psCloud.start();
            bulletData.particleSystems.push(psCloud);

            // B. Dripping Drops
            const psDrips = new ParticleSystem("acidDrips", 150, this.scene);
            psDrips.particleTexture = this.particleTexture;
            psDrips.emitter = bulletMesh;

            psDrips.color1 = new Color4(0.2, 1.0, 0.0, 1.0);
            psDrips.color2 = new Color4(0.6, 1.0, 0.2, 1.0);
            psDrips.colorDead = new Color4(0.2, 0.5, 0.0, 0.0);

            psDrips.minSize = 0.05;
            psDrips.maxSize = 0.15;
            psDrips.minLifeTime = 0.5;
            psDrips.maxLifeTime = 1.0;
            psDrips.emitRate = 80;

            // Gravity effect for dripping
            psDrips.gravity = new Vector3(0, -5, 0);
            psDrips.minEmitPower = 0;
            psDrips.maxEmitPower = 1;

            psDrips.start();
            bulletData.particleSystems.push(psDrips);

            // Slower projectile with gravity arc
            bulletData.velocity = forward.scale(25); // Slower
            // We need to handle gravity for this bullet type in updateBullets
            bulletData.hasGravity = true;

        } else if (this.currentWeapon === "ChronoArbalest") {
            // --- CHRONO ARBALEST (BRASS BOLT) ---
            // 1. Projectile: Brass Bolt with Glowing Core
            bulletMesh = MeshBuilder.CreateCylinder("brassBolt", { height: 0.8, diameterTop: 0.02, diameterBottom: 0.06, tessellation: 12 }, this.scene);
            bulletMesh.rotation.x = Math.PI / 2;
            bulletMesh.position = startPos;
            bulletMesh.lookAt(bulletMesh.position.add(forward));

            const brassMat = new StandardMaterial("brassBoltMat", this.scene);
            brassMat.diffuseColor = new Color3(0.8, 0.6, 0.2);
            brassMat.emissiveColor = new Color3(0.4, 0.3, 0.1); // Slight glow
            brassMat.specularColor = new Color3(1.0, 0.9, 0.5);
            brassMat.specularPower = 64;
            bulletMesh.material = brassMat;

            bulletMesh.computeWorldMatrix(true);

            // 2. Dynamic Point Light (Golden Glow)
            const bulletLight = new PointLight("bulletLight", new Vector3(0, 0, 0), this.scene);
            bulletLight.parent = bulletMesh;
            bulletLight.diffuse = new Color3(1.0, 0.7, 0.2);
            bulletLight.intensity = 3.0;
            bulletLight.range = 8;
            bulletData.light = bulletLight; // Store for cleanup

            // 3. Rotating Rune/Clock Aura (Mesh attached to bullet)
            const auraMesh = MeshBuilder.CreateDisc("timeAura", { radius: 0.3, tessellation: 32 }, this.scene);
            auraMesh.parent = bulletMesh;
            auraMesh.rotation.x = Math.PI / 2; // Face forward
            auraMesh.position.y = -0.2; // Slightly behind tip

            const auraMat = new StandardMaterial("auraMat", this.scene);
            auraMat.diffuseColor = new Color3(0, 0, 0);
            auraMat.emissiveColor = new Color3(1.0, 0.8, 0.0);
            auraMat.alpha = 0.8;
            // Use a texture or noise for the aura
            const auraTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
            auraMat.opacityTexture = auraTexture;
            auraMat.emissiveTexture = auraTexture;
            auraMat.disableLighting = true;
            auraMesh.material = auraMat;

            // Animation for Aura Rotation
            const spinAnim = new Animation("spin", "rotation.z", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
            spinAnim.setKeys([{ frame: 0, value: 0 }, { frame: 30, value: Math.PI * 2 }]);
            bulletMesh.animations.push(spinAnim);
            this.scene.beginAnimation(bulletMesh, 0, 30, true);

            // 4. TrailMesh: Time Distortion (Golden Trail)
            const timeTrail = new TrailMesh("timeTrail", bulletMesh, this.scene, 0.3, 30, true);
            const timeTrailMat = new StandardMaterial("timeTrailMat", this.scene);
            timeTrailMat.emissiveColor = new Color3(1.0, 0.6, 0.1);
            timeTrailMat.disableLighting = true;
            timeTrailMat.alpha = 0.6;
            timeTrail.material = timeTrailMat;
            bulletData.trail = timeTrail;

            // 5. Particle Systems
            bulletData.particleSystems = [];

            // A. Steam Jet (High Pressure)
            const psSteam = new ParticleSystem("steamTrail", 300, this.scene);
            psSteam.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/cloud.png", this.scene);
            psSteam.emitter = bulletMesh;
            psSteam.createConeEmitter(0.1, 0.8);

            psSteam.color1 = new Color4(1.0, 1.0, 1.0, 0.8);
            psSteam.color2 = new Color4(0.9, 0.8, 0.7, 0.4);
            psSteam.colorDead = new Color4(0.6, 0.5, 0.4, 0.0);

            psSteam.minSize = 0.2;
            psSteam.maxSize = 0.6;
            psSteam.minLifeTime = 0.3;
            psSteam.maxLifeTime = 0.8;
            psSteam.emitRate = 400; // Dense steam
            psSteam.blendMode = ParticleSystem.BLENDMODE_ADD;

            psSteam.start();
            bulletData.particleSystems.push(psSteam);

            // B. Golden Gears/Sparks (Explosive)
            const psTime = new ParticleSystem("timeSparks", 200, this.scene);
            psTime.particleTexture = this.particleTexture;
            psTime.emitter = bulletMesh;
            psTime.createSphereEmitter(0.2);

            psTime.color1 = new Color4(1.0, 0.9, 0.4, 1.0); // Bright Gold
            psTime.color2 = new Color4(1.0, 0.5, 0.0, 1.0); // Orange Gold
            psTime.colorDead = new Color4(0.6, 0.2, 0.0, 0.0);

            psTime.minSize = 0.08;
            psTime.maxSize = 0.25;
            psTime.minLifeTime = 0.2;
            psTime.maxLifeTime = 0.5;
            psTime.emitRate = 200;

            psTime.minAngularSpeed = -Math.PI * 10;
            psTime.maxAngularSpeed = Math.PI * 10;
            psTime.minEmitPower = 2;
            psTime.maxEmitPower = 6; // Wide spread

            psTime.start();
            bulletData.particleSystems.push(psTime);

            // High velocity bolt
            bulletData.velocity = forward.scale(90);

        } else {
            // --- ALPHA PARTICLE CANNON ---
            // Bolt
            bulletMesh = MeshBuilder.CreateSphere("bullet", { diameter: 0.2, segments: 8 }, this.scene);
            bulletMesh.position = startPos;
            bulletMesh.lookAt(bulletMesh.position.add(forward));
            bulletMesh.scaling = new Vector3(0.6, 0.6, 3.0);

            bulletMesh.computeWorldMatrix(true);

            const bulletMat = new StandardMaterial("bulletMat", this.scene);
            bulletMat.emissiveColor = new Color3(0, 1, 1); // Cyan
            bulletMat.disableLighting = true;
            bulletMesh.material = bulletMat;

            // Trail
            const trail = new TrailMesh("bulletTrail", bulletMesh, this.scene, 0.05, 10, true);
            const trailMat = new StandardMaterial("trailMat", this.scene);
            trailMat.emissiveColor = new Color3(0.5, 1.0, 0.8);
            trailMat.disableLighting = true;
            trailMat.alpha = 0.6;
            trail.material = trailMat;

            bulletData.trail = trail;
        }

        bulletData.mesh = bulletMesh;
        this.bullets.push(bulletData);
    }

    updateBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.life -= dt;

            // Apply Gravity if needed
            if (b.hasGravity) {
                b.velocity.y -= 9.81 * dt; // Gravity
            }

            // Move
            b.mesh.position.addInPlace(b.velocity.scale(dt));

            // Collision/Life Check
            if (b.mesh.position.y < 0 || b.life <= 0) {
                b.mesh.dispose();
                if (b.trail) b.trail.dispose();

                // Handle single particle system (legacy or alpha cannon if used)
                if (b.particleSystem) {
                    b.particleSystem.stop();
                    b.particleSystem.dispose();
                }
                // Handle multiple particle systems (Pegasus, Solar)
                if (b.particleSystems) {
                    b.particleSystems.forEach(ps => {
                        ps.stop();
                        ps.dispose();
                    });
                }
                // Handle glow effect (Solar Plasma Cannon)
                if (b.glowLayer) {
                    b.glowLayer.dispose();
                }
                // Handle dynamic light (Chrono Arbalest)
                if (b.light) {
                    b.light.dispose();
                }

                this.bullets.splice(i, 1);
            }
        }
    }

    startBeam() {
        if (this.isBeamActive) return;
        this.isBeamActive = true;

        if (this.beamGlow) { this.beamGlow.dispose(); this.beamGlow = null; }

        const isScorpio = (this.currentWeapon === "ScorpioPulsarGun");
        if (!isScorpio) return; // Safety check

        const beamType = "Scorpio";

        // Check if we need to switch beam type
        if (this.beamMesh && this.beamMesh.metadata?.type !== beamType) {
            this.beamMesh.dispose();
            this.beamMesh = null;
            this.beamCore = null;
            this.beamShell = null;
            // Glow layer might need reset or update meshes
            if (this.beamGlow) {
                this.beamGlow.dispose();
                this.beamGlow = null;
            }
        }

        // 1. Create Beam Texture if needed
        let targetTexture;
        if (!this.scorpioBeamTexture) {
            const width = 256; const height = 256;
            const canvas = document.createElement("canvas");
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, width, height);

            // Purple Theme
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#A020F0"; // Purple
            ctx.lineCap = "round"; ctx.lineJoin = "round";

            // Draw horizontal wavy bands (flow around circumference, uniform along length)
            const drawHorizontalStrand = (color, thickness, opacity, waveFreq, waveAmp) => {
                ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.globalAlpha = opacity;
                const yCenter = Math.random() * height;
                ctx.beginPath();
                for (let x = 0; x <= width; x += 4) {
                    const angle = (x / width) * Math.PI * 2 * waveFreq;
                    const y = yCenter + Math.sin(angle) * waveAmp;
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            };

            for (let i = 0; i < 24; i++) {
                drawHorizontalStrand("white", 2, 0.7, 2 + Math.random(), 4);
                drawHorizontalStrand("#A020F0", 3, 0.35, 3 + Math.random(), 6);
                drawHorizontalStrand("#FF00FF", 4, 0.2, 1 + Math.random(), 8);
            }

            this.scorpioBeamTexture = new Texture("scorpioBeamTex", this.scene, false, false, Texture.TRILINEAR_SAMPLINGMODE, null, null, canvas.toDataURL());
            this.scorpioBeamTexture.wrapU = Texture.WRAP_ADDRESSMODE;
            this.scorpioBeamTexture.wrapV = Texture.WRAP_ADDRESSMODE;
            this.scorpioBeamTexture.hasAlpha = true;
        }
        targetTexture = this.scorpioBeamTexture;

        // Opacity texture (soft radial falloff across circumference)
        if (!this.beamOpacityTexture) {
            const size = 256;
            this.beamOpacityTexture = new DynamicTexture("beamOpacityTex", size, this.scene, true);
            const octx = this.beamOpacityTexture.getContext();
            octx.clearRect(0, 0, size, size);
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const center = 0.5;
                const d = Math.abs(u - center);
                const alpha = Math.max(0, 1 - Scalar.Clamp(d / 0.5, 0, 1) ** 1.5);
                octx.fillStyle = `rgba(255,255,255,${alpha})`;
                octx.fillRect(x, 0, 1, size);
            }
            this.beamOpacityTexture.update();
            this.beamOpacityTexture.wrapU = Texture.WRAP_ADDRESSMODE;
            this.beamOpacityTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
        }

        // 2. Create Beam Mesh
        if (!this.beamMesh) {
            this.beamMesh = new TransformNode("beamRoot", this.scene);
            this.beamMesh.metadata = { type: beamType };

            // A. Core
            this.beamCore = MeshBuilder.CreateCylinder("beamCore", { height: 1, diameter: 0.02, tessellation: 16 }, this.scene);
            this.beamCore.setPivotPoint(new Vector3(0, -0.5, 0));
            this.beamCore.parent = this.beamMesh;

            const coreMat = new StandardMaterial("beamCoreMat", this.scene);
            coreMat.emissiveColor = new Color3(1, 1, 1);
            coreMat.diffuseColor = new Color3(0, 0, 0);
            coreMat.disableLighting = true;
            this.beamCore.material = coreMat;

            // B. Shell
            this.beamShell = MeshBuilder.CreateCylinder("beamShell", { height: 1, diameter: 0.12, tessellation: 32 }, this.scene);
            this.beamShell.setPivotPoint(new Vector3(0, -0.5, 0));
            this.beamShell.parent = this.beamMesh;

            if (!Effect.ShadersStore["beamShellVertexShader"]) {
                Effect.ShadersStore["beamShellVertexShader"] = "precision highp float;attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform mat4 world;uniform mat4 worldViewProjection;varying vec2 vUV;varying vec3 vNormalW;varying vec3 vPosW;void main(){vUV=uv;vec4 worldPos=world*vec4(position,1.0);vPosW=worldPos.xyz;vNormalW=normalize(mat3(world)*normal);gl_Position=worldViewProjection*vec4(position,1.0);}";
            }
            if (!Effect.ShadersStore["beamShellFragmentShader"]) {
                Effect.ShadersStore["beamShellFragmentShader"] = "precision highp float;varying vec2 vUV;varying vec3 vNormalW;varying vec3 vPosW;uniform vec3 cameraPosition;uniform float time;uniform vec3 baseColor;uniform float alpha;uniform float flowSpeed;uniform float rimPower;uniform float rimIntensity;uniform float noiseAmp;uniform float glowBoost;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);float a=hash(i);float b=hash(i+vec2(1.0,0.0));float c=hash(i+vec2(0.0,1.0));float d=hash(i+vec2(1.0,1.0));vec2 u=f*f*(3.0-2.0*f);return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;}void main(){vec3 V=normalize(cameraPosition-vPosW);float NdotV=dot(normalize(vNormalW),V);float fres=pow(1.0-max(0.0,abs(NdotV)),rimPower);float v=vUV.y;float spiral1=sin((vUV.x*12.0+v*30.0)-time*flowSpeed*3.0);float spiral2=sin((vUV.x*8.0-v*25.0)+time*flowSpeed*2.0);float spirals=smoothstep(0.2,0.9,max(0.0,spiral1*0.5+spiral2*0.5));float n1=noise(vec2(vUV.x*10.0+time,v*12.0-time*flowSpeed));float n2=noise(vec2(vUV.x*20.0-time*0.5,v*20.0-time*flowSpeed*1.5));float pulse=1.0+0.15*sin(time*20.0);float coreFlow=0.5+0.5*sin(v*40.0-time*flowSpeed*4.0);float bright=coreFlow*0.4+spirals*0.6+(n1+n2)*0.3*noiseAmp+fres*rimIntensity;vec3 col=baseColor*bright*pulse*glowBoost;col+=vec3(1.0,1.0,1.0)*fres*0.6*rimIntensity;float a=alpha*clamp(bright,0.0,1.0);gl_FragColor=vec4(col,a);}";
            }
            if (!this.beamShellMat) {
                this.beamShellMat = new ShaderMaterial("beamShellMat", this.scene, { vertex: "beamShell", fragment: "beamShell" }, { attributes: ["position", "normal", "uv"], uniforms: ["world", "worldViewProjection", "cameraPosition", "time", "baseColor", "alpha", "flowSpeed", "rimPower", "rimIntensity", "noiseAmp", "glowBoost"] });
                this.beamShellMat.disableLighting = true;
                this.beamShellMat.alphaMode = Engine.ALPHA_ADD;
                this.beamShellMat.backFaceCulling = false;
            }
            this.beamShell.material = this.beamShellMat;

            // C. Light
            if (!this.beamLight) {
                this.beamLight = new PointLight("beamLight", Vector3.Zero(), this.scene);
                this.beamLight.intensity = 0;
                this.beamLight.range = 8;
                this.beamLight.parent = null; // 独立于层级
            }
        }

        this.beamMesh.parent = this.gunMuzzle;
        this.beamMesh.position = Vector3.Zero();
        this.beamMesh.rotation = new Vector3(Math.PI / 2, 0, 0);
        this.beamMesh.isVisible = true;
        this.beamCore.isVisible = true;
        this.beamShell.isVisible = true;

        // 3. Particles
        if (!this.beamImpactPS) {
            this.beamImpactPS = new ParticleSystem("beamImpact", 200, this.scene);
            this.beamImpactPS.particleTexture = this.particleTexture;
            this.beamImpactPS.emitter = new Vector3(0, 0, 0);
            this.beamImpactPS.createSphereEmitter(0.1);
            this.beamImpactPS.minSize = 0.1;
            this.beamImpactPS.maxSize = 0.3;
            this.beamImpactPS.minLifeTime = 0.1;
            this.beamImpactPS.maxLifeTime = 0.4;
            this.beamImpactPS.blendMode = ParticleSystem.BLENDMODE_ADD;
            this.beamImpactPS.minEmitPower = 2;
            this.beamImpactPS.maxEmitPower = 5;
        }

        // Update Particle Colors
        if (isScorpio) {
            this.beamImpactPS.color1 = new Color4(0.8, 0, 1, 1); // Purple
            this.beamImpactPS.color2 = new Color4(1, 0, 1, 1); // Magenta
            this.beamImpactPS.colorDead = new Color4(0.2, 0, 0.5, 0);
        } else {
            this.beamImpactPS.color1 = new Color4(0.5, 1, 1, 1); // Cyan
            this.beamImpactPS.color2 = new Color4(1, 1, 1, 1); // White
            this.beamImpactPS.colorDead = new Color4(0, 0, 1, 0);
        }

        this.beamImpactPS.emitRate = 300;
        this.beamImpactPS.start();

        // 4. Muzzle Flash
        if (this.muzzleFlashPS) {
            if (isScorpio) {
                this.muzzleFlashPS.color1 = new Color4(0.8, 0, 1, 1);
                this.muzzleFlashPS.color2 = new Color4(0.5, 0, 0.8, 1);
            } else {
                this.muzzleFlashPS.color1 = new Color4(0.2, 1, 1, 1);
                this.muzzleFlashPS.color2 = new Color4(0, 0.5, 1, 1);
            }
            this.muzzleFlashPS.emitRate = 100;
            this.muzzleFlashPS.start();
        }
    }

    stopBeam() {
        if (!this.isBeamActive) return;
        this.isBeamActive = false;

        if (this.beamMesh) {
            this.beamMesh.isVisible = false;
            if (this.beamCore) this.beamCore.isVisible = false;
            if (this.beamShell) this.beamShell.isVisible = false;
        }
        if (this.beamLight) {
            this.beamLight.setEnabled(false);
        }
        if (this.beamImpactPS) {
            this.beamImpactPS.stop();
        }
        if (this.muzzleFlashPS) {
            this.muzzleFlashPS.emitRate = 0;
            this.muzzleFlashPS.stop();
        }
        if (this.beamGlow) { this.beamGlow.dispose(); this.beamGlow = null; }
    }

    updateBeam(dt) {
        if (!this.isBeamActive) return;
        if (!this.beamMesh) return;

        // Raycast
        const origin = this.gunMuzzle.absolutePosition;
        const direction = this.gunMuzzle.getDirection(new Vector3(0, 0, 1));
        const maxDist = 50;

        const ray = new Ray(origin, direction, maxDist);
        const hit = this.scene.pickWithRay(ray, (mesh) => {
            return mesh !== this.mesh && !mesh.isDescendantOf(this.mesh) && mesh.isVisible && mesh.name !== "beamCore" && mesh.name !== "beamShell";
        });

        let dist = maxDist;
        if (hit.hit) {
            dist = hit.distance;
            this.beamImpactPS.emitter = hit.pickedPoint;
            this.beamImpactPS.emitRate = 300;
        } else {
            this.beamImpactPS.emitRate = 0;
            this.beamImpactPS.emitter = origin.add(direction.scale(maxDist));
        }

        // Update Light
        if (this.beamLight) {
            this.beamLight.setEnabled(true);
            if (hit.hit) {
                // 稍微拉回一点，避免穿模
                this.beamLight.position = hit.pickedPoint.add(hit.getNormal(true).scale(0.2));
            } else {
                this.beamLight.position = origin.add(direction.scale(5.0));
            }
            const isScorpio = (this.currentWeapon === "ScorpioPulsarGun");
            const bc = isScorpio ? new Color3(0.8, 0.0, 1.0) : new Color3(0.2, 0.8, 1.0);
            this.beamLight.diffuse = bc;
            // 随时间高频闪烁
            this.beamLight.intensity = 2.0 + Math.random() * 1.5;
        }

        // Scale Length
        this.beamCore.scaling.y = dist;
        this.beamShell.scaling.y = dist;

        // Animation: Scroll Texture (around circumference)
        this.beamTime = (this.beamTime || 0) + dt;
        if (this.beamShellMat) {
            const isScorpio = (this.currentWeapon === "ScorpioPulsarGun");
            const bc = isScorpio ? new Color3(0.8, 0.0, 1.0) : new Color3(0.2, 0.8, 1.0);
            this.beamShellMat.setFloat("time", this.beamTime);
            this.beamShellMat.setVector3("baseColor", new Vector3(bc.r, bc.g, bc.b));
            this.beamShellMat.setFloat("alpha", 0.7);
            this.beamShellMat.setFloat("flowSpeed", 1.2);
            this.beamShellMat.setFloat("rimPower", 3.0);
            this.beamShellMat.setFloat("rimIntensity", 1.5);
            this.beamShellMat.setFloat("noiseAmp", 0.25);
            this.beamShellMat.setFloat("glowBoost", isScorpio ? 1.5 : 1.3);
            this.beamShellMat.setVector3("cameraPosition", new Vector3(this.camera.position.x, this.camera.position.y, this.camera.position.z));
        }

        // Keep shell thickness stable to avoid bead-like bulges
        this.beamShell.scaling.x = 1;
        this.beamShell.scaling.z = 1;

        // Core flickers slightly
        const flicker = 1 + Math.random() * 0.03;
        this.beamCore.scaling.x = flicker;
        this.beamCore.scaling.z = flicker;
    }


    updateGunPose() {
        if (!this.isHoldingGun) return;
        if (this.isAttacking) return;

        // Override arm rotations
        // Right arm aims forward
        this.rightShoulder.rotation.x = -Math.PI / 2;
        this.rightShoulder.rotation.y = 0;
        this.rightShoulder.rotation.z = 0;

        // Left arm holds the gun body
        this.leftShoulder.rotation.x = -Math.PI / 2;
        this.leftShoulder.rotation.y = 0.5; // Inward
        this.leftShoulder.rotation.z = 0;

        // Adjust left arm length/position if needed to match gun?
        // Visual approximation is usually enough.
    }

    setupPhysics() {
        // 胶囊体物理聚合体
        // mass: 1, friction: 0.2, restitution: 0
        this.aggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.CAPSULE, { mass: 1, friction: 0.5, restitution: 0 }, this.scene);

        // 锁定旋转，防止玩家摔倒
        this.aggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0)
        });
    }

    setupInputs() {
        this.scene.actionManager = this.scene.actionManager || new ActionManager(this.scene);

        window.addEventListener("keydown", (evt) => {
            this.inputMap[evt.key.toLowerCase()] = true;
            if (evt.key.toLowerCase() === "q") {
                if (evt.repeat) return;
                const wasSprinting = this.isSprinting;
                this.isSprinting = !this.isSprinting;
                if (!this.isSprinting) { this.antiGravity = false; this.hoverActive = false; this.ascendImpulseMs = 0; this.ascendHeld = false; this.altHoldEnabled = false; }
                else {
                    // 开启喷射模式：无论是否在地面，都进入悬浮控制
                    this.hoverActive = true;
                    const v = this.aggregate?.body?.getLinearVelocity();
                    if (v) this.aggregate.body.setLinearVelocity(new Vector3(v.x, 0, v.z));
                    // 初始上升脉冲，确保离地
                    this.ascendImpulseMs = (Config.player.boosterReenableImpulseMs || 300);
                }
            }
            if (evt.code === "Space") {
                if (this.mountedHorse) {
                    // 跳跃时下马
                    this.dismountHorse();
                    return;
                }
                if (this.isSprinting) {
                    // 按住空格：持续上升
                    this.hoverActive = true;
                    this.ascendHeld = true;
                    this.altHoldEnabled = false;
                    this.ascendImpulseMs = 0;
                } else {

                    this.tryJump();
                }
            }
            if (evt.key.toLowerCase() === "r") {
                if (this.mountedHorse) {
                    this.dismountHorse();
                } else if (this.nearbyHorse) {
                    this.mountHorse(this.nearbyHorse);
                }
            }
            if (evt.key === "1") {
                this.attack();
            }
            if (evt.key.toLowerCase() === "c") {
                this.toggleGun();
            }
            if (evt.key.toLowerCase() === "e") {
                this.tryPickup();
            }
        });

        // Use Scene Pointer Observable for better compatibility with Pointer Lock
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                // Left Click (0)
                if (pointerInfo.event.button === 0) {
                    this.fireInputPressed = true;
                    if (this.currentWeapon === "ScorpioPulsarGun") {
                        this.startBeam();
                    } else {
                        this.shoot();
                    }
                }
            } else if (pointerInfo.type === PointerEventTypes.POINTERUP) {
                if (pointerInfo.event.button === 0) {
                    this.fireInputPressed = false;
                    if (this.currentWeapon === "ScorpioPulsarGun") {
                        this.stopBeam();
                    }
                }
            }
        });

        window.addEventListener("keyup", (evt) => {
            this.inputMap[evt.key.toLowerCase()] = false;
            if (evt.code === "Space") {
                // 松开空格：在空中保持当前位置，不再下落
                if (this.isSprinting) {
                    this.ascendHeld = false;
                    // 记录当前底部高度为目标高度
                    const minY = this.mesh.getBoundingInfo().boundingBox.minimumWorld.y;
                    this.altHoldMinY = minY;
                    this.altHoldEnabled = true;
                    const v = this.aggregate?.body?.getLinearVelocity();
                    if (v) this.aggregate.body.setLinearVelocity(new Vector3(v.x, 0, v.z));
                }
            }
        });
    }

    tryPickup() {
        const nodes = this.scene.transformNodes || [];
        let nearest = null;
        let nearestDist = Infinity;
        for (const n of nodes) {
            const md = n.metadata;
            if (!md || !md.weaponPickup) continue;
            const d = Vector3.Distance(this.mesh.position, n.position);
            if (d < 2.0 && d < nearestDist) {
                nearest = n;
                nearestDist = d;
            }
        }
        if (!nearest) return;
        const md = nearest.metadata || {};
        const name = md.weaponName;
        if (!name) return;
        this.pickupWeapon(name);
        if (md.particleSystem) { try { md.particleSystem.stop(); md.particleSystem.dispose(); } catch (_) { } }
        if (md.ui) { try { md.ui.dispose(); } catch (_) { } }
        nearest.dispose();
    }

    registerBeforeRender() {
        this.scene.onBeforeRenderObservable.add(() => {
            const dt = this.scene.getEngine().getDeltaTime() / 1000;
            if (this.mountedHorse) {
                this.updateMountedMovement();
            } else {
                this.updateMovement();
                this.checkNearbyHorses();
            }
            this.updateAttack(dt);
            this.updateBullets(dt);
            this.updateBeam(dt);
            this.autoPickupNearby();
            this.updateGunPose();
        });
    }

    checkNearbyHorses() {
        // 简单的距离检查，对所有名为 "horseRoot" 的网格进行检测
        // 理想情况下我们应该有一个可交互对象列表，但现在先扫描场景
        let foundHorse = null;
        // We know we only have one horse for now, but let's be somewhat generic
        const horses = this.scene.meshes.filter(m => m.name === "horseRoot");
        for (let horse of horses) {
            if (Vector3.Distance(this.mesh.position, horse.position) < 3.0) {
                foundHorse = horse;
                break;
            }
        }
        this.nearbyHorse = foundHorse;
    }

    mountHorse(horseMesh) {
        if (!horseMesh) return;
        this.mountedHorse = horseMesh;

        // Try to find the aggregate on the horse mesh metadata or via a global lookup if needed.
        // In our case, we created the aggregate in horse.js but didn't attach it to mesh.metadata.
        // BUT, we can just look for a way to get it.
        // Actually, we need to pass the Horse instance or store the aggregate on the mesh.
        // Let's assume we can hack it: check scene physics bodies?
        // Better way: Let's modify Horse.js to attach aggregate to mesh.metadata.
        // For now, let's assume we did that (I will do it in next step).
        this.horseAggregate = horseMesh.metadata?.aggregate;

        // Disable player physics temporarily or make it kinematic to attach?
        // Easier: Make player child of horse? 
        // But player has physics body. 
        // Strategy: Disable player physics, parent mesh to horse, reset local position.

        if (this.aggregate) {
            this.aggregate.body.disablePreStep = false; // Ensure we can modify
            this.aggregate.dispose(); // Remove physics body while riding
            this.aggregate = null;
        }

        this.mesh.setParent(horseMesh);
        this.mesh.position = new Vector3(0, 1.2, 0); // Sit on top
        this.mesh.rotationQuaternion = Quaternion.Identity();

        // Set riding pose
        this.setRidingPose();
    }

    dismountHorse() {
        if (!this.mountedHorse) return;

        const horsePos = this.mountedHorse.absolutePosition;

        this.mesh.setParent(null);
        this.mountedHorse = null;

        // Place player next to horse
        this.mesh.position = horsePos.add(new Vector3(1.5, 0, 0));
        this.mesh.rotationQuaternion = Quaternion.Identity();

        // Re-enable physics
        this.setupPhysics();

        // Reset pose
        this.resetPose();
    }

    setRidingPose() {
        // Sitting pose
        this.modelRoot.rotationQuaternion = Quaternion.Identity();
        this.modelRoot.position.y = -1.0;

        // Legs straddle
        this.leftHip.rotation.x = -1.5; // Sitting
        this.leftHip.rotation.z = -0.5; // Spread
        this.rightHip.rotation.x = -1.5;
        this.rightHip.rotation.z = 0.5;

        // Arms holding reins
        this.leftShoulder.rotation.x = -0.8;
        this.rightShoulder.rotation.x = -0.8;
    }

    resetPose() {
        // Reset to default idle
        this.modelRoot.position.y = -1.2;
        this.leftHip.rotation.x = 0;
        this.leftHip.rotation.z = 0;
        this.rightHip.rotation.x = 0;
        this.rightHip.rotation.z = 0;
        this.leftShoulder.rotation.x = 0;
        this.rightShoulder.rotation.x = 0;
    }

    updateMountedMovement() {
        // Move the horse using Physics
        if (!this.mountedHorse) return;

        // Find the PhysicsAggregate of the horse
        // Since we don't have direct access to the horse instance here easily,
        // we can try to get the metadata or just check if the mesh has an aggregate.
        // But wait, the aggregate is usually on the transform node or mesh.
        // Let's assume mountedHorse has metadata.aggregate or we look it up.
        // Actually, Babylon Havok plugin attaches body to the mesh.
        // However, the `PhysicsAggregate` object is what we need.
        // Usually it's stored on the mesh in some projects, or we can try to access it.
        // Let's assume we can access physicsBody directly if we are lucky, 
        // but Havok V2 uses PhysicsBody which is on the mesh? No, it's on the aggregate.

        // Workaround: When mounting, store the horse's aggregate on the player
        if (!this.horseAggregate) return;

        const speed = 8.0; // Horse speed
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        let moveDir = new Vector3(0, 0, 0);

        const cameraForward = this.camera.getForwardRay().direction;
        cameraForward.y = 0;
        cameraForward.normalize();
        const cameraRight = Vector3.Cross(new Vector3(0, 1, 0), cameraForward);

        if (this.inputMap["w"]) moveDir.addInPlace(cameraForward);
        if (this.inputMap["s"]) moveDir.subtractInPlace(cameraForward);
        if (this.inputMap["a"]) moveDir.subtractInPlace(cameraRight);
        if (this.inputMap["d"]) moveDir.addInPlace(cameraRight);

        // Align horse with camera forward when moving forward/backward, or general movement?
        // User asked: "Horse rigid body direction should be consistent with camera direction."
        // Usually this means if I press W, horse faces camera forward.
        // If I press S, horse faces camera backward? Or still forward but moves back?
        // Typically in TPS, "Forward" means Character Forward aligns with Camera Forward when moving forward.
        // But if "consistent with camera direction" means the horse ALWAYS faces camera forward (strafe mode)?
        // Or just when moving?
        // Let's assume standard TPS control: When moving, rotate towards movement direction.
        // BUT, if the user specifically asked for "consistent with camera direction", it might imply
        // the horse should turn to look where the camera is looking, especially when pressing W.

        // Let's refine:
        // If user means "Horse Rotation = Camera Rotation" (Strafe mode):
        // Then pressing A/D would strafe left/right.
        // Let's try to interpret "direction consistent with camera".
        // Most likely: Horse always faces the direction the camera is facing (Camera Forward), 
        // regardless of movement direction (like in shooter mode or strafing).

        // Let's implement Strafing logic for Horse Rotation:
        const targetRotation = Math.atan2(cameraForward.x, cameraForward.z);
        this.mountedHorse.rotationQuaternion = Quaternion.FromEulerAngles(0, targetRotation, 0);

        if (moveDir.length() > 0.1) {
            moveDir.normalize();

            // Apply Velocity to Horse
            // Keep existing Y velocity (gravity)
            const currentVel = this.horseAggregate.body.getLinearVelocity();
            this.horseAggregate.body.setLinearVelocity(new Vector3(
                moveDir.x * speed,
                currentVel.y,
                moveDir.z * speed
            ));

            // Bobbing animation for horse/player
            this.walkTime += dt * 12;
            // Animate player bobbing on horse
            this.mesh.position.y = 1.2 + Math.sin(this.walkTime) * 0.08;
        } else {
            // Stop horizontal movement, keep gravity
            const currentVel = this.horseAggregate.body.getLinearVelocity();
            this.horseAggregate.body.setLinearVelocity(new Vector3(0, currentVel.y, 0));
        }
    }

    isGrounded() {
        // Raycast down to find ANY surface (ground, book, platform)
        // Player height is 2, so center to bottom is 1.
        // We cast a ray of length 1.1 to allow for small floating errors (epsilon).
        const rayLength = 1.1;
        const ray = new Ray(this.mesh.position, new Vector3(0, -1, 0), rayLength);

        const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
            // Filter out player itself and its parts
            return mesh !== this.mesh && !mesh.isDescendantOf(this.mesh);
        });

        // Also keep the Y=0 check just in case the ground mesh is missing or non-pickable
        const minY = this.mesh.getBoundingInfo().boundingBox.minimumWorld.y;
        return pickInfo.hit || (minY <= this._groundEpsilon);
    }

    tryJump() {
        if (!this.mesh || !this.aggregate) return;
        if (!this.isGrounded()) return;
        const v = this.aggregate.body.getLinearVelocity();
        const j = Config.player.jumpSpeed || 6.5;
        this.aggregate.body.setLinearVelocity(new Vector3(v.x, j, v.z));
    }

    updateMovement() {
        if (!this.mesh || !this.aggregate) return;

        const baseSpeed = Config.player.speed;
        const sprintMul = (Config.player.sprintMultiplier || 2);
        const sprintSpeed = (Config.player.sprintSpeed || (baseSpeed * sprintMul));
        const velocity = this.aggregate.body.getLinearVelocity();
        const dtMs = this.scene.getEngine().getDeltaTime();

        let moveDirection = new Vector3(0, 0, 0);
        let isMoving = false;

        // 获取相机的前方方向（忽略Y轴）
    }

    mountHorse(horseMesh) {
        if (!horseMesh) return;
        this.mountedHorse = horseMesh;

        // Try to find the aggregate on the horse mesh metadata or via a global lookup if needed.
        // In our case, we created the aggregate in horse.js but didn't attach it to mesh.metadata.
        // BUT, we can just look for a way to get it.
        // Actually, we need to pass the Horse instance or store the aggregate on the mesh.
        // Let's assume we can hack it: check scene physics bodies?
        // Better way: Let's modify Horse.js to attach aggregate to mesh.metadata.
        // For now, let's assume we did that (I will do it in next step).
        this.horseAggregate = horseMesh.metadata?.aggregate;

        // Disable player physics temporarily or make it kinematic to attach?
        // Easier: Make player child of horse? 
        // But player has physics body. 
        // Strategy: Disable player physics, parent mesh to horse, reset local position.

        if (this.aggregate) {
            this.aggregate.body.disablePreStep = false; // Ensure we can modify
            this.aggregate.dispose(); // Remove physics body while riding
            this.aggregate = null;
        }

        this.mesh.setParent(horseMesh);
        this.mesh.position = new Vector3(0, 1.2, 0); // Sit on top
        this.mesh.rotationQuaternion = Quaternion.Identity();

        // Set riding pose
        this.setRidingPose();
    }

    dismountHorse() {
        if (!this.mountedHorse) return;

        const horsePos = this.mountedHorse.absolutePosition;

        this.mesh.setParent(null);
        this.mountedHorse = null;

        // Place player next to horse
        this.mesh.position = horsePos.add(new Vector3(1.5, 0, 0));
        this.mesh.rotationQuaternion = Quaternion.Identity();

        // Re-enable physics
        this.setupPhysics();

        // Reset pose
        this.resetPose();
    }

    setRidingPose() {
        // Sitting pose
        this.modelRoot.rotationQuaternion = Quaternion.Identity();
        this.modelRoot.position.y = -1.0;

        // Legs straddle
        this.leftHip.rotation.x = -1.5; // Sitting
        this.leftHip.rotation.z = -0.5; // Spread
        this.rightHip.rotation.x = -1.5;
        this.rightHip.rotation.z = 0.5;

        // Arms holding reins
        this.leftShoulder.rotation.x = -0.8;
        this.rightShoulder.rotation.x = -0.8;
    }

    resetPose() {
        // Reset to default idle
        this.modelRoot.position.y = -1.2;
        this.leftHip.rotation.x = 0;
        this.leftHip.rotation.z = 0;
        this.rightHip.rotation.x = 0;
        this.rightHip.rotation.z = 0;
        this.leftShoulder.rotation.x = 0;
        this.rightShoulder.rotation.x = 0;
    }

    updateMountedMovement() {
        // Move the horse using Physics
        if (!this.mountedHorse) return;

        // Find the PhysicsAggregate of the horse
        // Since we don't have direct access to the horse instance here easily,
        // we can try to get the metadata or just check if the mesh has an aggregate.
        // But wait, the aggregate is usually on the transform node or mesh.
        // Let's assume mountedHorse has metadata.aggregate or we look it up.
        // Actually, Babylon Havok plugin attaches body to the mesh.
        // However, the `PhysicsAggregate` object is what we need.
        // Usually it's stored on the mesh in some projects, or we can try to access it.
        // Let's assume we can access physicsBody directly if we are lucky, 
        // but Havok V2 uses PhysicsBody which is on the mesh? No, it's on the aggregate.

        // 解决方案：上马时，将马的聚合体存储在玩家上
        if (!this.horseAggregate) return;

        const speed = 8.0; // 马的速度
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        let moveDir = new Vector3(0, 0, 0);

        const cameraForward = this.camera.getForwardRay().direction;
        cameraForward.y = 0;
        cameraForward.normalize();
        const cameraRight = Vector3.Cross(new Vector3(0, 1, 0), cameraForward);

        if (this.inputMap["w"]) moveDir.addInPlace(cameraForward);
        if (this.inputMap["s"]) moveDir.subtractInPlace(cameraForward);
        if (this.inputMap["a"]) moveDir.subtractInPlace(cameraRight);
        if (this.inputMap["d"]) moveDir.addInPlace(cameraRight);

        // 实现骑马的横向移动逻辑：
        const targetRotation = Math.atan2(cameraForward.x, cameraForward.z);
        this.mountedHorse.rotationQuaternion = Quaternion.FromEulerAngles(0, targetRotation, 0);

        if (moveDir.length() > 0.1) {
            moveDir.normalize();

            // 应用速度到马
            // 保持现有的 Y 速度（重力）
            const currentVel = this.horseAggregate.body.getLinearVelocity();
            this.horseAggregate.body.setLinearVelocity(new Vector3(
                moveDir.x * speed,
                currentVel.y,
                moveDir.z * speed
            ));

            // 马/玩家的摇晃动画
            this.walkTime += dt * 12;
            // 动画玩家在马上的摇晃
            this.mesh.position.y = 1.2 + Math.sin(this.walkTime) * 0.08;
        } else {
            // 停止水平移动，保持重力
            const currentVel = this.horseAggregate.body.getLinearVelocity();
            this.horseAggregate.body.setLinearVelocity(new Vector3(0, currentVel.y, 0));
        }
    }

    isGrounded() {
        // 向下射线检测任何表面（地面、书本、平台）
        // 玩家高度为 2，所以中心到底部是 1
        // 我们投射一条长度为 1.1 的射线，以允许小的浮点误差（epsilon）
        const rayLength = 1.1;
        const ray = new Ray(this.mesh.position, new Vector3(0, -1, 0), rayLength);

        const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
            // 过滤掉玩家自身及其部件
            return mesh !== this.mesh && !mesh.isDescendantOf(this.mesh);
        });

        // 也保留 Y=0 检查，以防地面网格缺失或不可拾取
        const minY = this.mesh.getBoundingInfo().boundingBox.minimumWorld.y;
        return pickInfo.hit || (minY <= this._groundEpsilon);
    }

    getGroundHeight() {
        const ray = new Ray(this.mesh.position.add(new Vector3(0, 5, 0)), new Vector3(0, -1, 0), 20);
        const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
            return mesh !== this.mesh && !mesh.isDescendantOf(this.mesh);
        });
        if (pickInfo.hit && pickInfo.pickedPoint) {
            return pickInfo.pickedPoint.y;
        }
        return 0;
    }

    computeHoverVy(dtMs, currentVy) {
        // 按住空格持续上升
        if (this.ascendHeld) {
            return (Config.player.ascendHoldSpeed || 2.5);
        }

        const minY = this.mesh.getBoundingInfo().boundingBox.minimumWorld.y;
        let targetMinY;
        if (this.altHoldEnabled) {
            targetMinY = this.altHoldMinY;
        } else {
            const groundY = this.getGroundHeight();
            targetMinY = groundY + this.hoverHeight;
        }

        const err = targetMinY - minY;
        const gain = 6.0;
        let vy = err * gain;

        if (this.ascendImpulseMs > 0) {
            this.ascendImpulseMs = Math.max(0, this.ascendImpulseMs - dtMs);
            vy = (Config.player.antiGravityUpSpeed || 3.5);
        }

        const maxUp = 4.0;
        const maxDown = -3.0;
        vy = Math.min(Math.max(vy, maxDown), maxUp);
        if (Math.abs(err) < 0.02) vy = 0;
        return vy;
    }

    tryJump() {
        if (!this.mesh || !this.aggregate) return;
        if (!this.isGrounded()) return;
        const v = this.aggregate.body.getLinearVelocity();
        const j = Config.player.jumpSpeed || 6.5;
        this.aggregate.body.setLinearVelocity(new Vector3(v.x, j, v.z));
    }

    updateMovement() {

        if (!this.mesh || !this.aggregate) return;

        const baseSpeed = Config.player.speed;
        const sprintMul = (Config.player.sprintMultiplier || 2);
        const sprintSpeed = (Config.player.sprintSpeed || (baseSpeed * sprintMul));
        const velocity = this.aggregate.body.getLinearVelocity();
        const dtMs = this.scene.getEngine().getDeltaTime();

        let moveDirection = new Vector3(0, 0, 0);
        let isMoving = false;

        const cameraForward = this.camera.getForwardRay().direction;
        cameraForward.y = 0;
        cameraForward.normalize();

        const cameraRight = Vector3.Cross(this.scene.yAxis || new Vector3(0, 1, 0), cameraForward);
        cameraRight.normalize();

        // W - 向前
        if (this.inputMap["w"]) {
            moveDirection.addInPlace(cameraForward);
            isMoving = true;
            const targetRotation = Math.atan2(cameraForward.x, cameraForward.z);
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, targetRotation, 0);
        }

        // S - 向后
        if (this.inputMap["s"]) {
            moveDirection.subtractInPlace(cameraForward);
            isMoving = true;
        }

        // A - 向左
        if (this.inputMap["a"]) {
            moveDirection.subtractInPlace(cameraRight);
            isMoving = true;
        }

        // D - 向右
        if (this.inputMap["d"]) {
            moveDirection.addInPlace(cameraRight);
            isMoving = true;
        }

        if (isMoving) {
            moveDirection.normalize();
            const curSpeed = this.isSprinting ? sprintSpeed : baseSpeed;
            let vy = velocity.y;
            if (this.isSprinting && this.hoverActive) {
                vy = this.computeHoverVy(dtMs, velocity.y);
            }
            this.aggregate.body.setLinearVelocity(new Vector3(
                moveDirection.x * curSpeed,
                vy,
                moveDirection.z * curSpeed
            ));
            const dtScale = this.isSprinting ? 0.018 : 0.01;
            this.walkTime += this.scene.getEngine().getDeltaTime() * dtScale * (curSpeed / 5);
            const amp = this.isSprinting ? 1.2 : 0.8;
            const angle = Math.sin(this.walkTime);

            if (!this.isGrounded()) {
                // 在空中将角色朝向与相机前方对齐（横向移动飞行）
                const yaw = Math.atan2(cameraForward.x, cameraForward.z);

                if (this.isSprinting) {
                    // 空中移动：超级英雄飞行
                    this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(1.0, yaw, 0);
                    this.rightShoulder.rotation.x = -3.1;
                    this.rightShoulder.rotation.z = 0.0;
                    this.leftShoulder.rotation.x = 0.5;
                    this.leftShoulder.rotation.z = 0.2;
                    this.leftHip.rotation.x = 0.1 + angle * 0.05;
                    this.rightHip.rotation.x = 0.1 - angle * 0.05;
                } else {
                    // 普通跳跃（移动） - 速度依赖
                    const vy = velocity.y;

                    if (vy > 0.5) {
                        // 上升（发射姿势）
                        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.2, yaw, 0);
                        this.leftShoulder.rotation.x = -2.8;
                        this.rightShoulder.rotation.x = -2.8;
                        this.leftShoulder.rotation.z = -0.2;
                        this.rightShoulder.rotation.z = 0.2;
                        this.leftHip.rotation.x = -1.2;
                        this.rightHip.rotation.x = 0.2;
                    } else if (vy < -0.5) {
                        // 下落
                        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
                        this.leftShoulder.rotation.x = -1.5;
                        this.rightShoulder.rotation.x = -1.5;
                        this.leftShoulder.rotation.z = -0.8;
                        this.rightShoulder.rotation.z = 0.8;
                        this.leftHip.rotation.x = -0.4;
                        this.rightHip.rotation.x = -0.4;
                    } else {
                        // 顶点 / 过渡
                        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.1, yaw, 0);
                        this.leftShoulder.rotation.x = -2.0;
                        this.rightShoulder.rotation.x = -2.0;
                        this.leftShoulder.rotation.z = -0.4;
                        this.rightShoulder.rotation.z = 0.4;
                        this.leftHip.rotation.x = -0.8;
                        this.rightHip.rotation.x = -0.8;
                    }
                }
            } else {
                this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, this.modelRoot.rotationQuaternion ? this.modelRoot.rotationQuaternion.toEulerAngles().y : this.modelRoot.rotation.y, 0);
                this.leftShoulder.rotation.x = angle * amp;
                this.rightShoulder.rotation.x = -angle * amp;
                this.leftHip.rotation.x = -angle * amp;
                this.rightHip.rotation.x = angle * amp;
                this.leftShoulder.rotation.z = 0;
                this.rightShoulder.rotation.z = 0;
            }



        } else {

            // Stop horizontal movement
            if (this.ascendImpulseMs > 0) { this.ascendImpulseMs = Math.max(0, this.ascendImpulseMs - dtMs); }
            const currentVel = this.aggregate.body.getLinearVelocity();
            let vyIdle = currentVel.y;
            if (this.isSprinting && this.hoverActive) {
                vyIdle = this.computeHoverVy(dtMs, currentVel.y);
            }
            this.aggregate.body.setLinearVelocity(new Vector3(0, vyIdle, 0));

            if (!this.isGrounded()) {
                const ds = 0.003;
                this.walkTime += this.scene.getEngine().getDeltaTime() * ds;
                const ang = Math.sin(this.walkTime);

                const yaw = this.modelRoot.rotationQuaternion ? this.modelRoot.rotationQuaternion.toEulerAngles().y : this.modelRoot.rotation.y;

                if (this.isSprinting) {
                    // 空中悬停：零重力漂浮
                    this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(-0.1, yaw, 0);
                    this.modelRoot.position.y = -1.2 + ang * 0.08;
                    this.leftShoulder.rotation.x = 0.0 + ang * 0.05;
                    this.rightShoulder.rotation.x = 0.0 + ang * 0.05;
                    this.leftShoulder.rotation.z = 0.8 + ang * 0.05;
                    this.rightShoulder.rotation.z = -0.8 - ang * 0.05;
                    this.leftHip.rotation.x = 0.1 + ang * 0.05;
                    this.rightHip.rotation.x = 0.05 - ang * 0.05;
                } else {
                    // 普通跳跃（静止/垂直） - 速度依赖
                    const vy = velocity.y;
                    this.modelRoot.position.y = -1.2;

                    if (vy > 0.5) {
                        // 上升
                        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
                        this.leftShoulder.rotation.x = -2.8;
                        this.rightShoulder.rotation.x = -2.8;
                        this.leftShoulder.rotation.z = -0.1;
                        this.rightShoulder.rotation.z = 0.1;
                        this.leftHip.rotation.x = -1.0;
                        this.rightHip.rotation.x = -1.0;
                    } else if (vy < -0.5) {
                        // Falling
                        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
                        this.leftShoulder.rotation.x = -1.8 + ang * 0.1;
                        this.rightShoulder.rotation.x = -1.8 - ang * 0.1;
                        this.leftShoulder.rotation.z = -0.5;
                        this.rightShoulder.rotation.z = 0.5;
                        this.leftHip.rotation.x = -0.2;
                        this.rightHip.rotation.x = -0.2;
                    } else {
                        // 顶点
                        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
                        this.leftShoulder.rotation.x = -2.2;
                        this.rightShoulder.rotation.x = -2.2;
                        this.leftHip.rotation.x = -0.8;
                        this.rightHip.rotation.x = -0.8;
                    }
                }
            } else {
                // 着地静止
                this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, this.modelRoot.rotationQuaternion ? this.modelRoot.rotationQuaternion.toEulerAngles().y : this.modelRoot.rotation.y, 0);
                this.modelRoot.position.y = -1.2;
                this.leftShoulder.rotation.x = 0;
                this.rightShoulder.rotation.x = 0;
                this.leftHip.rotation.x = 0;
                this.rightHip.rotation.x = 0;
                this.leftShoulder.rotation.z = 0;
                this.rightShoulder.rotation.z = 0;
            }

        }
        // 更新火焰动画
        this.updateJetFlames(dtMs);
    }

    updateJetFlames(dtMs) {
        if (!this.flameRoots || !this.flameMat) return;

        // 1. 纹理滚动 (模拟流动)
        this.flameMat.diffuseTexture.vOffset -= 0.005 * dtMs;

        // 2. 计算目标缩放比例
        let targetScaleY = 0;
        let targetWidth = 1.0;

        if (this.isSprinting) {
            // 基础长度
            targetScaleY = 1.0;

            // 悬浮/加速状态
            if (this.hoverActive) {
                if (this.ascendImpulseMs > 0) {
                    // 爆发上升
                    targetScaleY = 2.5;
                    targetWidth = 1.5;
                } else {
                    // 悬浮中
                    targetScaleY = 1.2;
                }
            } else {
                // 只是开启了冲刺模式但未悬浮（例如地面跑动）
                // 地面跑动时可能不需要喷火，或者喷小火
                targetScaleY = 0.3;
            }
        }

        // 固定长度与宽度：短尾焰
        for (const root of this.flameRoots) {
            if (this.isSprinting) {
                root.scaling.y = 0.9; // 固定短长度
                root.scaling.x = 1.0;
                root.scaling.z = 1.0;
            } else {
                root.scaling.y = 0;
                root.scaling.x = 0;
                root.scaling.z = 0;
            }
        }
    }
    autoPickupNearby() {
        if (this.currentWeapon) return;
        const nodes = this.scene.transformNodes || [];
        let target = null;
        let best = Infinity;
        for (const n of nodes) {
            const md = n.metadata;
            if (!md || !md.weaponPickup) continue;
            const d = Vector3.Distance(this.mesh.position, n.position);
            if (d < 1.0 && d < best) {
                target = n;
                best = d;
            }
        }
        if (!target) return;
        const md = target.metadata || {};
        const name = md.weaponName;
        if (!name) return;
        this.pickupWeapon(name);
        if (md.particleSystem) { try { md.particleSystem.stop(); md.particleSystem.dispose(); } catch (_) { } }
        if (md.ui) { try { md.ui.dispose(); } catch (_) { } }
        target.dispose();
    }
}
