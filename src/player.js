import { MeshBuilder, Vector3, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Quaternion, Matrix, ActionManager, ParticleSystem, Texture, Color4, TransformNode, Ray, Engine, Scalar, TrailMesh, PointLight, PointerEventTypes } from "@babylonjs/core";
import { Config } from "./config";
import { Shield } from "./shield";
import { spawnAlphaParticleCannon } from "./armory/AlphaParticleCannon";

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
        for(let i=0; i<15; i++) {
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

        // Gun Root attached to Right Arm
        this.gunRoot = new TransformNode("gunRoot", this.scene);
        // Fix: Find rightArm from rightShoulder as it wasn't saved to 'this'
        this.rightArm = this.rightShoulder.getChildMeshes()[0]; 
        this.gunRoot.parent = this.rightArm;
        
        // Adjust position to be in hand (Right arm is 0.6 height, 0.15 width)
        // Hand is at bottom of arm. Arm center is 0,0,0 relative to shoulder? 
        // Wait, rightArm.position.y = -armHeight/2 (-0.3). So center of arm is at -0.3 relative to shoulder.
        // We want gun at the bottom of the arm (the hand).
        // Arm height is 0.6. Box center is 0.
        // Bottom of arm box is at -0.3 (local to arm box).
        // So we position gun at y = -0.3
        this.gunRoot.position = new Vector3(0, -0.3, 0.1); 
        this.gunRoot.rotation.x = Math.PI / 2; // Point forward
        this.gunRoot.isVisible = false;

        // --- Create Gun Mesh ---
        // Main Body
        const gunBody = MeshBuilder.CreateBox("gunBody", { width: 0.1, height: 0.15, depth: 0.4 }, this.scene);
        const gunMat = new StandardMaterial("gunMat", this.scene);
        gunMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
        gunBody.material = gunMat;
        gunBody.parent = this.gunRoot;
        gunBody.position.z = 0.2;

        // Barrel (Particle Cannon Style)
        const barrel = MeshBuilder.CreateCylinder("gunBarrel", { height: 0.5, diameter: 0.08 }, this.scene);
        barrel.rotation.x = Math.PI / 2;
        barrel.parent = this.gunRoot;
        barrel.position.z = 0.5;
        barrel.material = gunMat;

        // Energy Core (Glowing)
        const core = MeshBuilder.CreateCylinder("gunCore", { height: 0.3, diameter: 0.12 }, this.scene);
        core.rotation.x = Math.PI / 2;
        core.parent = this.gunRoot;
        core.position.z = 0.3;
        
        const coreMat = new StandardMaterial("coreMat", this.scene);
        coreMat.emissiveColor = new Color3(0, 1, 1); // Cyan Glow
        coreMat.disableLighting = true;
        core.material = coreMat;

        // Muzzle Point
        this.gunMuzzle = new TransformNode("gunMuzzle", this.scene);
        this.gunMuzzle.parent = this.gunRoot;
        this.gunMuzzle.position.z = 0.8;

        // Initially hide gun meshes
        this.gunRoot.scaling = new Vector3(0, 0, 0); // Hide by scaling or just logic
        // Note: Setting parent isVisible=false doesn't always hide children in some versions unless inherit visibility is on.
        // But for TransformNode it works if we check it? No, TransformNode doesn't have visual.
        // I should toggle meshes visibility or scaling.
        // Let's use a container mesh or just scale.
        this.gunMeshes = [gunBody, barrel, core];
        this.setGunVisibility(false);

        // Setup Particle Texture for Muzzle Flash
        this.particleTexture = this.createParticleTexture();
        
        // Setup Persistent Muzzle Flash System
        this.setupMuzzleFlash();
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
        ps.direction1 = new Vector3(0, 0, 1);
        ps.direction2 = new Vector3(0, 0, 5);
        
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
        this.setGunVisibility(true);
    }

    dropWeapon() {
        if (!this.currentWeapon) return;
        
        // Drop slightly forward to avoid immediate re-pickup
        const forward = this.mesh.getDirection(new Vector3(0, 0, 1));
        const dropPos = this.mesh.position.add(forward.scale(2.5));
        // Keep Y close to ground or current player Y
        dropPos.y = Math.max(0.5, this.mesh.position.y);
        
        if (this.currentWeapon === "AlphaParticleCannon") {
            spawnAlphaParticleCannon(this.scene, dropPos, this);
        }
        
        this.currentWeapon = null;
        this.isHoldingGun = false;
        this.setGunVisibility(false);
    }

    shoot() {
        if (!this.isHoldingGun) return;

        // 1. Muzzle Flash
        this.muzzleFlashPS.manualEmitCount = 20;
        this.muzzleFlashPS.start(); // Ensure it's running (manual emit needs it running)

        // 2. Bullet Mesh (High Energy Bolt)
        // Use a small sphere but scale it to look like a bolt
        const bullet = MeshBuilder.CreateSphere("bullet", { diameter: 0.2, segments: 8 }, this.scene);
        
        // Position
        bullet.position = this.gunMuzzle.absolutePosition.clone();
        
        // Orientation
        // We need to point the bullet in the direction of fire.
        const forward = this.gunMuzzle.getDirection(new Vector3(0, 0, 1)).normalize();
        
        // Align Z axis of bullet to forward
        // Sphere has no direction, but we will scale it.
        // We want scaling Z to align with velocity.
        // LookAt aligns +Z to target.
        bullet.lookAt(bullet.position.add(forward));
        
        // Elongate
        bullet.scaling = new Vector3(0.6, 0.6, 3.0);

        // Force update world matrix immediately so TrailMesh knows the starting position
        bullet.computeWorldMatrix(true);

        // Material: Core High Emissive
        const bulletMat = new StandardMaterial("bulletMat", this.scene);
        bulletMat.emissiveColor = new Color3(3, 8, 3); // Ultra Bright Green/Cyan
        bulletMat.diffuseColor = new Color3(0, 0, 0);
        bulletMat.specularColor = new Color3(0, 0, 0);
        bulletMat.disableLighting = true;
        bullet.material = bulletMat;

        // 3. Trail Effect (Tron Style)
        // Attach trail to bullet
        // Reduced diameter from 0.15 to 0.05 for a finer trail
        // Reduced length from 30 to 10 for a shorter trail
        const trail = new TrailMesh("bulletTrail", bullet, this.scene, 0.05, 10, true);
        const trailMat = new StandardMaterial("trailMat", this.scene);
        trailMat.emissiveColor = new Color3(0.5, 1.0, 0.8); 
        trailMat.disableLighting = true;
        trailMat.alpha = 0.6;
        trail.material = trailMat;

        this.bullets.push({
            mesh: bullet,
            trail: trail,
            velocity: forward.scale(40), // High Speed
            life: 2.0 
        });
    }

    updateBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.life -= dt;
            
            // Move
            b.mesh.position.addInPlace(b.velocity.scale(dt));

            // Collision/Life Check
            if (b.mesh.position.y < 0 || b.life <= 0) {
                b.mesh.dispose();
                if (b.trail) b.trail.dispose();
                this.bullets.splice(i, 1);
            }
        }
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
        });

        // Use Scene Pointer Observable for better compatibility with Pointer Lock
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                if (pointerInfo.event.button === 1) { // Middle Mouse Button
                    this.shoot();
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
}
