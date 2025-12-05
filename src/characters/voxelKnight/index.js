import { MeshBuilder, Vector3, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, TransformNode, Texture, Engine, Scalar, Quaternion, PointLight } from "@babylonjs/core";

export class VoxelKnight {
    constructor(scene, position = new Vector3(5, 5, 5), glowLayer = null) {
        this.scene = scene;
        this.glowLayer = glowLayer;
        this.mesh = null;
        this.aggregate = null;
        this.modelRoot = null;
        this.flameRoots = [];
        this.walkTime = 0;
        this.time = 0;

        this.createKnightMesh();
        this.createFlameEffects();

        if (this.mesh) {
            this.mesh.position = position;
        }

        this.setupPhysics();
    }

    createKnightMesh() {
        // 玩家容器 (胶囊体)
        this.mesh = MeshBuilder.CreateCapsule("voxelKnight", { height: 2, radius: 0.5 }, this.scene);
        this.mesh.visibility = 0; // 隐藏胶囊体

        // 材质
        const armorMat = new StandardMaterial("armorMat", this.scene);
        armorMat.diffuseColor = new Color3(0.7, 0.7, 0.75); // 银色盔甲
        armorMat.specularColor = new Color3(0.4, 0.4, 0.4);

        const darkMetalMat = new StandardMaterial("darkMetalMat", this.scene);
        darkMetalMat.diffuseColor = new Color3(0.3, 0.3, 0.35); // 深灰色关节/锁甲
        darkMetalMat.specularColor = new Color3(0.1, 0.1, 0.1);

        const accentMat = new StandardMaterial("accentMat", this.scene);
        accentMat.diffuseColor = new Color3(0.8, 0.1, 0.1); // 红色装饰
        accentMat.specularColor = new Color3(0.1, 0.1, 0.1);

        // 专门给头盔顶饰的材质，用于呼吸灯效果
        const plumeMat = new StandardMaterial("plumeMat", this.scene);
        // [COLOR] 头顶羽毛颜色 (橘黄色)
        plumeMat.diffuseColor = new Color3(1.0, 0.6, 0.1);
        plumeMat.specularColor = new Color3(0.1, 0.1, 0.1);
        plumeMat.emissiveColor = new Color3(0.2, 0.1, 0); // 初始微弱发光
        this.plumeMat = plumeMat;

        const skinMat = new StandardMaterial("skinMat", this.scene);
        skinMat.diffuseColor = new Color3(1, 0.8, 0.6); // 皮肤

        const goldMat = new StandardMaterial("goldMat", this.scene);
        goldMat.diffuseColor = new Color3(1.0, 0.8, 0.1); // 金色
        goldMat.specularColor = new Color3(0.8, 0.8, 0.2);

        // 身体容器，用于旋转
        this.modelRoot = MeshBuilder.CreateBox("modelRoot", { size: 0.1 }, this.scene);
        this.modelRoot.isVisible = false;
        this.modelRoot.parent = this.mesh;
        this.modelRoot.position.y = -1.2;

        // --- 头部 ---
        const headGroup = new TransformNode("headGroup", this.scene);
        headGroup.parent = this.modelRoot;
        headGroup.position.y = 1.75;

        // 头盔主体
        const helmet = MeshBuilder.CreateBox("helmet", { width: 0.55, height: 0.55, depth: 0.55 }, this.scene);
        helmet.material = armorMat;
        helmet.parent = headGroup;

        // 面罩/观察缝
        const visor = MeshBuilder.CreateBox("visor", { width: 0.45, height: 0.1, depth: 0.05 }, this.scene);
        visor.material = darkMetalMat;
        visor.parent = helmet;
        visor.position.z = 0.26;
        visor.position.y = 0;

        // 头盔顶饰 (羽毛/装饰)
        const plumeBase = MeshBuilder.CreateBox("plumeBase", { width: 0.1, height: 0.1, depth: 0.4 }, this.scene);
        plumeBase.material = plumeMat;
        plumeBase.parent = helmet;
        plumeBase.position.y = 0.3;

        // [LIGHT] 添加点光源，照亮周围
        this.plumeLight = new PointLight("plumeLight", new Vector3(0, 0, 0), this.scene);
        this.plumeLight.parent = plumeBase;
        this.plumeLight.diffuse = new Color3(1.0, 0.6, 0.1); // 橘黄色光
        this.plumeLight.intensity = 2.5;
        this.plumeLight.range = 25; // 照明范围

        const plumeTop = MeshBuilder.CreateBox("plumeTop", { width: 0.1, height: 0.2, depth: 0.3 }, this.scene);
        plumeTop.material = plumeMat;
        plumeTop.parent = helmet;
        plumeTop.position.y = 0.4;
        plumeTop.position.z = -0.05;

        // 添加到发光层
        if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(plumeBase);
            this.glowLayer.addIncludedOnlyMesh(plumeTop);
        }

        // --- 身体 ---
        const body = MeshBuilder.CreateBox("body", { width: 0.5, height: 0.6, depth: 0.3 }, this.scene);
        body.material = armorMat;
        body.parent = this.modelRoot;
        body.position.y = 1.2;

        // 胸甲装饰
        const chestPlate = MeshBuilder.CreateBox("chestPlate", { width: 0.4, height: 0.3, depth: 0.05 }, this.scene);
        chestPlate.material = darkMetalMat;
        chestPlate.parent = body;
        chestPlate.position.z = 0.16;
        chestPlate.position.y = 0.1;

        // 腰带
        const belt = MeshBuilder.CreateBox("belt", { width: 0.52, height: 0.1, depth: 0.32 }, this.scene);
        belt.material = darkMetalMat;
        belt.parent = body;
        belt.position.y = -0.25;

        // 喷气背包 (Booster) - 骑士风格改为蒸汽朋克背包或魔法背包
        // 这里简单做一个金属背包
        const booster = new TransformNode("boosterRoot", this.scene);
        booster.parent = body;
        booster.position = new Vector3(0, 0.05, -0.2);

        const backpack = MeshBuilder.CreateBox("backpack", { width: 0.4, height: 0.4, depth: 0.15 }, this.scene);
        backpack.material = darkMetalMat;
        backpack.parent = booster;

        // 喷口
        this.nozzleMeshL = MeshBuilder.CreateCylinder("nozzleL", { diameter: 0.1, height: 0.2 }, this.scene);
        this.nozzleMeshL.material = armorMat;
        this.nozzleMeshL.parent = backpack;
        this.nozzleMeshL.position = new Vector3(-0.1, -0.2, 0);

        this.nozzleMeshR = MeshBuilder.CreateCylinder("nozzleR", { diameter: 0.1, height: 0.2 }, this.scene);
        this.nozzleMeshR.material = armorMat;
        this.nozzleMeshR.parent = backpack;
        this.nozzleMeshR.position = new Vector3(0.1, -0.2, 0);

        // --- 手臂参数 ---
        const armWidth = 0.15;
        const armHeight = 0.6;
        const armDepth = 0.15;
        const shoulderY = 1.5;
        const armOffsetX = 0.35;

        // 左肩关节
        this.leftShoulder = MeshBuilder.CreateBox("leftShoulder", { size: 0.01 }, this.scene);
        this.leftShoulder.isVisible = false;
        this.leftShoulder.parent = this.modelRoot;
        this.leftShoulder.position = new Vector3(-armOffsetX, shoulderY, 0);

        // 左肩甲
        const leftPauldron = MeshBuilder.CreateBox("leftPauldron", { width: 0.25, height: 0.25, depth: 0.25 }, this.scene);
        leftPauldron.material = armorMat;
        leftPauldron.parent = this.leftShoulder;
        leftPauldron.position.y = 0;

        // 左臂
        const leftArm = MeshBuilder.CreateBox("leftArm", { width: armWidth, height: armHeight, depth: armDepth }, this.scene);
        leftArm.material = darkMetalMat; // 锁甲颜色
        leftArm.parent = this.leftShoulder;
        leftArm.position.y = -armHeight / 2;

        // 左手 (拳头)
        const leftHand = MeshBuilder.CreateBox("leftHand", { width: 0.16, height: 0.16, depth: 0.16 }, this.scene);
        leftHand.material = armorMat;
        leftHand.parent = leftArm;
        leftHand.position.y = -armHeight / 2 - 0.08;

        // 盾牌 (挂在左臂)
        const shield = MeshBuilder.CreateBox("shield", { width: 0.5, height: 0.6, depth: 0.05 }, this.scene);
        shield.material = armorMat;
        shield.parent = leftArm;
        shield.position.x = -0.1;
        shield.position.z = 0.15;

        const shieldCrossH = MeshBuilder.CreateBox("shieldCrossH", { width: 0.4, height: 0.1, depth: 0.06 }, this.scene);
        shieldCrossH.material = accentMat;
        shieldCrossH.parent = shield;

        const shieldCrossV = MeshBuilder.CreateBox("shieldCrossV", { width: 0.1, height: 0.5, depth: 0.06 }, this.scene);
        shieldCrossV.material = accentMat;
        shieldCrossV.parent = shield;


        // 右肩关节
        this.rightShoulder = MeshBuilder.CreateBox("rightShoulder", { size: 0.01 }, this.scene);
        this.rightShoulder.isVisible = false;
        this.rightShoulder.parent = this.modelRoot;
        this.rightShoulder.position = new Vector3(armOffsetX, shoulderY, 0);

        // 右肩甲
        const rightPauldron = MeshBuilder.CreateBox("rightPauldron", { width: 0.25, height: 0.25, depth: 0.25 }, this.scene);
        rightPauldron.material = armorMat;
        rightPauldron.parent = this.rightShoulder;
        rightPauldron.position.y = 0;

        // 右臂
        const rightArm = MeshBuilder.CreateBox("rightArm", { width: armWidth, height: armHeight, depth: armDepth }, this.scene);
        rightArm.material = darkMetalMat;
        rightArm.parent = this.rightShoulder;
        rightArm.position.y = -armHeight / 2;

        // 右手
        const rightHand = MeshBuilder.CreateBox("rightHand", { width: 0.16, height: 0.16, depth: 0.16 }, this.scene);
        rightHand.material = armorMat;
        rightHand.parent = rightArm;
        rightHand.position.y = -armHeight / 2 - 0.08;

        // 剑 (挂在右手) - 初始状态
        // 注意：如果 Player.js 会覆盖 rightArm 的子节点来挂枪，这里可能需要调整
        // 但 BoxMan 没有手持物品，所以我们先加上装饰性的剑
        // 实际上 Player.js 会把枪挂在 rightShoulder 的第一个子 Mesh 上 (line 428: this.rightShoulder.getChildMeshes()[0])
        // 这意味着 rightPauldron 可能会被当做手臂... 
        // BoxMan 的 rightShoulder 只有一个 child (rightArm)。
        // 这里我有 rightPauldron 和 rightArm。
        // 为了兼容，我应该把 rightPauldron 设为 rightArm 的子节点，或者调整层级。
        // 或者，让 rightArm 成为 rightShoulder 的第一个子节点。
        // 代码创建顺序：Pauldron 先创建。
        // 修正：让 Pauldron 成为 Arm 的子节点，或者确保 Arm 是第一个。
        // 最好是：RightShoulder -> RightArm -> (Hand, Pauldron)

        // 重构右臂层级
        rightPauldron.parent = rightArm;
        rightPauldron.position.y = armHeight / 2; // 移回肩膀位置

        // --- 腿部参数 ---
        const legWidth = 0.2;
        const legHeight = 0.7;
        const legDepth = 0.2;
        const hipY = 0.9;
        const legOffsetX = 0.12;

        // 左髋关节
        this.leftHip = MeshBuilder.CreateBox("leftHip", { size: 0.01 }, this.scene);
        this.leftHip.isVisible = false;
        this.leftHip.parent = this.modelRoot;
        this.leftHip.position = new Vector3(-legOffsetX, hipY, 0);

        // 左腿
        const leftLeg = MeshBuilder.CreateBox("leftLeg", { width: legWidth, height: legHeight, depth: legDepth }, this.scene);
        leftLeg.material = armorMat;
        leftLeg.parent = this.leftHip;
        leftLeg.position.y = -legHeight / 2;

        // 左脚
        const leftFoot = MeshBuilder.CreateBox("leftFoot", { width: 0.22, height: 0.1, depth: 0.25 }, this.scene);
        leftFoot.material = darkMetalMat;
        leftFoot.parent = leftLeg;
        leftFoot.position.y = -legHeight / 2 - 0.05;
        leftFoot.position.z = 0.025;

        // 右髋关节
        this.rightHip = MeshBuilder.CreateBox("rightHip", { size: 0.01 }, this.scene);
        this.rightHip.isVisible = false;
        this.rightHip.parent = this.modelRoot;
        this.rightHip.position = new Vector3(legOffsetX, hipY, 0);

        // 右腿
        const rightLeg = MeshBuilder.CreateBox("rightLeg", { width: legWidth, height: legHeight, depth: legDepth }, this.scene);
        rightLeg.material = armorMat;
        rightLeg.parent = this.rightHip;
        rightLeg.position.y = -legHeight / 2;

        // 右脚
        const rightFoot = MeshBuilder.CreateBox("rightFoot", { width: 0.22, height: 0.1, depth: 0.25 }, this.scene);
        rightFoot.material = darkMetalMat;
        rightFoot.parent = rightLeg;
        rightFoot.position.y = -legHeight / 2 - 0.05;
        rightFoot.position.z = 0.025;

        // 暴露关键部位给 Player.js 使用
        this.head = headGroup;
        // this.rightArm = rightArm; // Player.js 自动查找
    }

    setupPhysics() {
        // 刚体设置
        this.aggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.CAPSULE, { mass: 1, friction: 0.5, restitution: 0 }, this.scene);

        // 锁定旋转
        this.aggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0)
        });
    }

    createFlameEffects() {
        if (!this.nozzleMeshL || !this.nozzleMeshR) return;

        // 1. 生成光束纹理 (线性渐变 + 噪声线条)
        const canvas = document.createElement("canvas");
        canvas.width = 64; canvas.height = 128;
        const ctx = canvas.getContext("2d");

        // 背景渐变 (白 -> 黄 -> 橙 -> 红 -> 透明)
        const grad = ctx.createLinearGradient(0, 0, 0, 128);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.6)");       // 核心白热 (降低不透明度以减小泛光强度)
        grad.addColorStop(0.1, "rgba(255, 240, 100, 0.4)");    // 内焰亮黄
        grad.addColorStop(0.3, "rgba(255, 140, 0, 0.2)");      // 中焰橙红
        grad.addColorStop(0.6, "rgba(200, 40, 0, 0.1)");       // 外焰深红
        grad.addColorStop(1, "rgba(100, 0, 0, 0)");            // 尾部烟雾/消散
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 128);

        // 添加随机的高亮线条
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255, 255, 200, 0.1)";
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
        flameMat.opacityTexture = flameTex;
        flameMat.emissiveColor = new Color3(0.6, 0.3, 0.0); // 稍微降低发光强度

        flameMat.disableLighting = true;
        flameMat.alphaMode = Engine.ALPHA_ADD;
        flameMat.backFaceCulling = false;

        this.flameMat = flameMat;

        // 3. 创建光束网格
        const createFlameMesh = (parent) => {
            const root = new TransformNode("flameRoot", this.scene);
            root.parent = parent;
            root.position = new Vector3(0, 0, 0);

            const mesh = MeshBuilder.CreateCylinder("flameMesh", {
                height: 0.8,
                diameterTop: 0.16,
                diameterBottom: 0.02,
                tessellation: 16
            }, this.scene);

            mesh.material = flameMat;
            mesh.parent = root;
            mesh.position.y = -0.4;

            if (this.glowLayer) {
                this.glowLayer.addIncludedOnlyMesh(mesh);
            }

            root.scaling = new Vector3(0, 0, 0);
            return root;
        };

        this.flameRoots = [
            createFlameMesh(this.nozzleMeshL),
            createFlameMesh(this.nozzleMeshR)
        ];
    }

    updateBoosterEffect(active, isMoving = false) {
        const dt = this.scene.getEngine().getDeltaTime();

        // 动画纹理
        if (this.flameMat && this.flameMat.diffuseTexture) {
            this.flameMat.diffuseTexture.vOffset -= 0.005 * dt;
        }

        // 动态调整尾焰长度
        const targetScaleY = isMoving ? 1.2 : 0.5; // 运动时更长(1.2)，悬浮时更短(0.5)

        // 动态调整泛光强度
        // 悬浮时: (0.6, 0.3, 0.0) 
        // 飞行时: (1.0, 0.6, 0.2) - 更亮，泛光更强
        const targetEmissive = isMoving ? new Color3(1.0, 0.6, 0.2) : new Color3(0.6, 0.3, 0.0);

        if (this.flameMat) {
            Color3.LerpToRef(this.flameMat.emissiveColor, targetEmissive, 0.1, this.flameMat.emissiveColor);
        }

        this.flameRoots.forEach(root => {
            if (active) {
                // 使用 Lerp 平滑过渡长度
                root.scaling.y = Scalar.Lerp(root.scaling.y, targetScaleY, 0.1);
                root.scaling.x = 1.0;
                root.scaling.z = 1.0;
            } else {
                root.scaling.y = 0;
                root.scaling.x = 0;
                root.scaling.z = 0;
            }
        });
    }

    // 复用 BoxMan 的动画逻辑，因为骨骼结构一致
    updateAnimation(dt, state) {
        const { isMoving, isSprinting, isGrounded, isBoosterActive, velocity, yaw, walkTimeIncrement, swordSlashAnimating, halfMoonSlashAnimating, thunderSpearAnimating } = state;
        
        // 合并所有手臂动画状态
        const isArmAnimating = swordSlashAnimating || halfMoonSlashAnimating || thunderSpearAnimating;

        this.walkTime += walkTimeIncrement;
        this.time += dt * 0.001; // 转换为秒

        // 呼吸灯效果
        if (this.plumeMat) {
            // 0.5 到 1.5 之间波动，周期约 2 秒
            const intensity = 0.8 + Math.sin(this.time * 3) * 0.4;
            // [COLOR] 呼吸灯颜色变化 (保持橘黄色比例)
            this.plumeMat.emissiveColor.r = 1.0 * intensity;
            this.plumeMat.emissiveColor.g = 0.6 * intensity;
            this.plumeMat.emissiveColor.b = 0.1 * intensity;

            // [LIGHT] 同步更新点光源强度
            if (this.plumeLight) {
                this.plumeLight.intensity = 0.5 * intensity;
            }
        }

        const angle = Math.sin(this.walkTime);

        if (isBoosterActive) {
            if (isMoving) {
                this.animateBoosterFlight(yaw, angle);
            } else {
                this.animateBoosterHover(yaw, angle);
            }
            return;
        }

        if (!isGrounded) {
            if (isMoving) {
                if (isSprinting) {
                    this.animateSuperheroFlight(yaw, angle);
                } else {
                    this.animateJumpMoving(velocity, yaw);
                }
            } else {
                if (isSprinting) {
                    this.animateZeroGravityFloat(yaw, angle);
                } else {
                    this.animateJumpStationary(velocity, yaw, angle);
                }
            }
        } else {
            // Grounded Logic
            this.modelRoot.position.y = -1.2;
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, yaw, 0);

            if (isMoving) {
                this.animateWalk(isSprinting, yaw, angle, isArmAnimating);
            } else {
                this.animateIdle(yaw, isArmAnimating);
            }
        }
    }

    animateBoosterFlight(yaw, angle) {
        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(1.0, yaw, 0);
        if (this.rightShoulder) {
            this.rightShoulder.rotation.x = -3.1;
            this.rightShoulder.rotation.z = 0.0;
        }
        if (this.leftShoulder) {
            this.leftShoulder.rotation.x = 0.5;
            this.leftShoulder.rotation.z = 0.2;
        }
        if (this.leftHip) this.leftHip.rotation.x = 0.1 + angle * 0.05;
        if (this.rightHip) this.rightHip.rotation.x = 0.1 - angle * 0.05;
    }

    animateBoosterHover(yaw, angle) {
        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(-0.1, yaw, 0);
        this.modelRoot.position.y = -1.2 + angle * 0.08;
        if (this.leftShoulder) { this.leftShoulder.rotation.x = 0.0 + angle * 0.05; this.leftShoulder.rotation.z = 0.8 + angle * 0.05; }
        if (this.rightShoulder) { this.rightShoulder.rotation.x = 0.0 + angle * 0.05; this.rightShoulder.rotation.z = -0.8 - angle * 0.05; }
        if (this.leftHip) this.leftHip.rotation.x = 0.1 + angle * 0.05;
        if (this.rightHip) this.rightHip.rotation.x = 0.05 - angle * 0.05;
    }

    animateSuperheroFlight(yaw, angle) {
        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(1.0, yaw, 0);
        if (this.rightShoulder) {
            this.rightShoulder.rotation.x = -3.1;
            this.rightShoulder.rotation.z = 0.0;
        }
        if (this.leftShoulder) {
            this.leftShoulder.rotation.x = 0.5;
            this.leftShoulder.rotation.z = 0.2;
        }
        if (this.leftHip) this.leftHip.rotation.x = 0.1 + angle * 0.05;
        if (this.rightHip) this.rightHip.rotation.x = 0.1 - angle * 0.05;
    }

    animateJumpMoving(velocity, yaw) {
        const vy = velocity.y;
        if (vy > 0.5) {
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.2, yaw, 0);
            if (this.leftShoulder) { this.leftShoulder.rotation.x = -2.8; this.leftShoulder.rotation.z = -0.2; }
            if (this.rightShoulder) { this.rightShoulder.rotation.x = -2.8; this.rightShoulder.rotation.z = 0.2; }
            if (this.leftHip) this.leftHip.rotation.x = -1.2;
            if (this.rightHip) this.rightHip.rotation.x = 0.2;
        } else if (vy < -0.5) {
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
            if (this.leftShoulder) { this.leftShoulder.rotation.x = -1.5; this.leftShoulder.rotation.z = -0.8; }
            if (this.rightShoulder) { this.rightShoulder.rotation.x = -1.5; this.rightShoulder.rotation.z = 0.8; }
            if (this.leftHip) this.leftHip.rotation.x = -0.4;
            if (this.rightHip) this.rightHip.rotation.x = -0.4;
        } else {
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.1, yaw, 0);
            if (this.leftShoulder) { this.leftShoulder.rotation.x = -2.0; this.leftShoulder.rotation.z = -0.4; }
            if (this.rightShoulder) { this.rightShoulder.rotation.x = -2.0; this.rightShoulder.rotation.z = 0.4; }
            if (this.leftHip) this.leftHip.rotation.x = -0.8;
            if (this.rightHip) this.rightHip.rotation.x = -0.8;
        }
    }

    animateZeroGravityFloat(yaw, angle) {
        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(-0.1, yaw, 0);
        this.modelRoot.position.y = -1.2 + angle * 0.08;
        if (this.leftShoulder) { this.leftShoulder.rotation.x = 0.0 + angle * 0.05; this.leftShoulder.rotation.z = 0.8 + angle * 0.05; }
        if (this.rightShoulder) { this.rightShoulder.rotation.x = 0.0 + angle * 0.05; this.rightShoulder.rotation.z = -0.8 - angle * 0.05; }
        if (this.leftHip) this.leftHip.rotation.x = 0.1 + angle * 0.05;
        if (this.rightHip) this.rightHip.rotation.x = 0.05 - angle * 0.05;
    }

    animateJumpStationary(velocity, yaw, angle) {
        const vy = velocity.y;
        this.modelRoot.position.y = -1.2;

        if (vy > 0.5) {
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
            if (this.leftShoulder) { this.leftShoulder.rotation.x = -2.8; this.leftShoulder.rotation.z = -0.1; }
            if (this.rightShoulder) { this.rightShoulder.rotation.x = -2.8; this.rightShoulder.rotation.z = 0.1; }
            if (this.leftHip) this.leftHip.rotation.x = -1.0;
            if (this.rightHip) this.rightHip.rotation.x = -1.0;
        } else if (vy < -0.5) {
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
            if (this.leftShoulder) { this.leftShoulder.rotation.x = -1.8 + angle * 0.1; this.leftShoulder.rotation.z = -0.5; }
            if (this.rightShoulder) { this.rightShoulder.rotation.x = -1.8 - angle * 0.1; this.rightShoulder.rotation.z = 0.5; }
            if (this.leftHip) this.leftHip.rotation.x = -0.2;
            if (this.rightHip) this.rightHip.rotation.x = -0.2;
        } else {
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
            if (this.leftShoulder) { this.leftShoulder.rotation.x = -2.2; }
            if (this.rightShoulder) { this.rightShoulder.rotation.x = -2.2; }
            if (this.leftHip) this.leftHip.rotation.x = -0.8;
            if (this.rightHip) this.rightHip.rotation.x = -0.8;
        }
    }

    animateWalk(isSprinting, yaw, angle, isArmAnimating = false) {
        const amp = isSprinting ? 1.2 : 0.8;

        if (this.leftHip) this.leftHip.rotation.x = -angle * amp;
        if (this.rightHip) this.rightHip.rotation.x = angle * amp;
        
        // 只在非手臂动画时才设置手臂动画
        if (!isArmAnimating) {
            if (this.leftShoulder) {
                this.leftShoulder.rotation.x = angle * amp;
                this.leftShoulder.rotation.z = 0;
            }
            if (this.rightShoulder) {
                this.rightShoulder.rotation.x = -angle * amp;
                this.rightShoulder.rotation.z = 0;
            }
        }
    }

    animateIdle(yaw, isArmAnimating = false) {
        if (this.leftHip) this.leftHip.rotation.x = 0;
        if (this.rightHip) this.rightHip.rotation.x = 0;
        
        // 只在非手臂动画时才设置手臂动画
        if (!isArmAnimating) {
            if (this.leftShoulder) {
                this.leftShoulder.rotation.x = 0;
                this.leftShoulder.rotation.z = 0;
            }
            if (this.rightShoulder) {
                this.rightShoulder.rotation.x = 0;
                this.rightShoulder.rotation.z = 0;
            }
        }
    }
}
