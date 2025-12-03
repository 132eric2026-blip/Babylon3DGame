import { MeshBuilder, Vector3, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, TransformNode, Texture, Engine, Scalar, Quaternion } from "@babylonjs/core";

export class VoxelKnight {
    constructor(scene, position = new Vector3(5, 5, 5), glowLayer = null) {
        this.scene = scene;
        this.glowLayer = glowLayer;
        this.mesh = null;
        this.aggregate = null;
        this.modelRoot = null;
        this.walkTime = 0;

        this.createKnightMesh();

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
        plumeBase.material = accentMat;
        plumeBase.parent = helmet;
        plumeBase.position.y = 0.3;

        const plumeTop = MeshBuilder.CreateBox("plumeTop", { width: 0.1, height: 0.2, depth: 0.3 }, this.scene);
        plumeTop.material = accentMat;
        plumeTop.parent = helmet;
        plumeTop.position.y = 0.4;
        plumeTop.position.z = -0.05;

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

    // 复用 BoxMan 的动画逻辑，因为骨骼结构一致
    updateAnimation(dt, state) {
        const { isMoving, isSprinting, isGrounded, isBoosterActive, velocity, yaw, walkTimeIncrement } = state;

        this.walkTime += walkTimeIncrement;
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
                this.animateWalk(isSprinting, yaw, angle);
            } else {
                this.animateIdle(yaw);
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

    animateWalk(isSprinting, yaw, angle) {
        const amp = isSprinting ? 1.2 : 0.8;

        if (this.leftHip) this.leftHip.rotation.x = -angle * amp;
        if (this.rightHip) this.rightHip.rotation.x = angle * amp;
        if (this.leftShoulder) {
            this.leftShoulder.rotation.x = angle * amp;
            this.leftShoulder.rotation.z = 0;
        }
        if (this.rightShoulder) {
            this.rightShoulder.rotation.x = -angle * amp;
            this.rightShoulder.rotation.z = 0;
        }
    }

    animateIdle(yaw) {
        if (this.leftHip) this.leftHip.rotation.x = 0;
        if (this.rightHip) this.rightHip.rotation.x = 0;
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
