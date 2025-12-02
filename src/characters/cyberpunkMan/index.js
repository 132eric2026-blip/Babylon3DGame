// CyberpunkMan character implementation with neon aesthetic and unique animations
import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Texture, Engine, Quaternion, PhysicsAggregate, PhysicsShapeType, Color4 } from "@babylonjs/core";

export class CyberpunkMan {
    constructor(scene, position = new Vector3(5, 5, 5), glowLayer = null) {
        this.scene = scene;
        this.glowLayer = glowLayer;
        this.mesh = null; // capsule collider
        this.modelRoot = null; // root for rotations
        this.neonRoots = [];
        this.walkTime = 0;
        
        // 部件引用，用于动画
        this.head = null;
        this.torso = null;
        this.leftArmGroup = null;
        this.rightArmGroup = null;
        this.leftLegGroup = null;
        this.rightLegGroup = null;

        this.createMesh();
        // createNeonEffects is now integrated into createMesh via material assignments and neonRoots pushing
        
        if (this.mesh) {
            this.mesh.position = position;
        }
        this.setupPhysics();
    }

    // Create capsule collider and visual components
    createMesh() {
        // 1. 物理胶囊体 (隐形)
        this.mesh = MeshBuilder.CreateCapsule("cyberpunkMan", { height: 2, radius: 0.5 }, this.scene);
        this.mesh.visibility = 0;

        // 2. 材质定义
        // 基础暗黑金属 (磨砂黑)
        const darkMetalMat = new StandardMaterial("darkMetalMat", this.scene);
        darkMetalMat.diffuseColor = new Color3(0.05, 0.05, 0.08);
        darkMetalMat.specularColor = new Color3(0.2, 0.2, 0.3);
        
        // 亮银色 (机械关节)
        const chromeMat = new StandardMaterial("chromeMat", this.scene);
        chromeMat.diffuseColor = new Color3(0.6, 0.6, 0.7);
        chromeMat.specularColor = new Color3(0.9, 0.9, 1.0);

        // 霓虹青 (主发光)
        const neonCyanMat = new StandardMaterial("neonCyanMat", this.scene);
        neonCyanMat.diffuseColor = new Color3(0.0, 0.0, 0.0);
        neonCyanMat.emissiveColor = new Color3(0.0, 1.0, 1.0);
        neonCyanMat.disableLighting = true;
        this.neonRoots.push({ mat: neonCyanMat, color: new Color3(0, 1, 1) });

        // 霓虹紫 (副发光)
        const neonPinkMat = new StandardMaterial("neonPinkMat", this.scene);
        neonPinkMat.diffuseColor = new Color3(0.0, 0.0, 0.0);
        neonPinkMat.emissiveColor = new Color3(1.0, 0.0, 1.0);
        neonPinkMat.disableLighting = true;
        this.neonRoots.push({ mat: neonPinkMat, color: new Color3(1, 0, 1) });

        // 3. 模型根节点
        this.modelRoot = new TransformNode("modelRoot", this.scene);
        this.modelRoot.parent = this.mesh;
        this.modelRoot.position.y = -1.0; // 调整到底部对齐

        // === 躯干 (Torso) ===
        // 核心装甲 - 倒梯形设计
        this.torso = new TransformNode("torsoGroup", this.scene);
        this.torso.parent = this.modelRoot;
        this.torso.position.y = 1.1;

        const chestPlate = MeshBuilder.CreateBox("chestPlate", { width: 0.6, height: 0.5, depth: 0.35 }, this.scene);
        chestPlate.material = darkMetalMat;
        chestPlate.parent = this.torso;
        chestPlate.position.y = 0.2;

        // 腹部 (脊柱感)
        const abs = MeshBuilder.CreateCylinder("abs", { height: 0.4, diameter: 0.25, tessellation: 6 }, this.scene);
        abs.material = darkMetalMat;
        abs.parent = this.torso;
        abs.position.y = -0.25;

        // 能量核心 (胸口三角形)
        const core = MeshBuilder.CreateDisc("core", { radius: 0.1, tessellation: 3 }, this.scene);
        core.material = neonCyanMat;
        core.parent = chestPlate;
        core.position.z = 0.18;
        core.position.y = 0.05;
        core.rotation.z = Math.PI; // 倒三角
        if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(core);

        // 背部脊柱发光条
        const spine = MeshBuilder.CreatePlane("spine", { width: 0.05, height: 0.4 }, this.scene);
        spine.material = neonPinkMat;
        spine.parent = chestPlate;
        spine.position.z = -0.18;
        spine.rotation.y = Math.PI;
        if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(spine);

        // === 头部 (Head) ===
        // 赛博忍者头盔
        this.head = new TransformNode("headGroup", this.scene);
        this.head.parent = this.torso;
        this.head.position.y = 0.55;

        const helmetMain = MeshBuilder.CreateBox("helmetMain", { width: 0.35, height: 0.4, depth: 0.4 }, this.scene);
        helmetMain.material = darkMetalMat;
        helmetMain.parent = this.head;

        // 护目镜 (横条)
        const visor = MeshBuilder.CreateBox("visor", { width: 0.36, height: 0.08, depth: 0.25 }, this.scene);
        visor.material = neonCyanMat;
        visor.parent = this.head;
        visor.position.z = 0.1;
        visor.position.y = 0.05;
        if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(visor);

        // 莫霍克光刃 (头顶)
        const mohawk = MeshBuilder.CreateBox("mohawk", { width: 0.02, height: 0.15, depth: 0.3 }, this.scene);
        mohawk.material = neonPinkMat;
        mohawk.parent = this.head;
        mohawk.position.y = 0.25;
        if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(mohawk);

        // 下颚护甲
        const jaw = MeshBuilder.CreateBox("jaw", { width: 0.3, height: 0.15, depth: 0.35 }, this.scene);
        jaw.material = chromeMat;
        jaw.parent = this.head;
        jaw.position.y = -0.15;

        // === 左臂 (重型机械臂 - Heavy Mech Arm) ===
        this.leftArmGroup = new TransformNode("leftArmGroup", this.scene);
        this.leftArmGroup.parent = this.torso;
        this.leftArmGroup.position.set(-0.4, 0.3, 0);

        // 左肩甲 (巨大不对称)
        const leftShoulderPad = MeshBuilder.CreateBox("leftShoulderPad", { width: 0.3, height: 0.3, depth: 0.35 }, this.scene);
        leftShoulderPad.material = darkMetalMat;
        leftShoulderPad.parent = this.leftArmGroup;
        leftShoulderPad.rotation.z = 0.2;
        
        // 发光条纹装饰
        const shoulderStrip = MeshBuilder.CreatePlane("shoulderStrip", { width: 0.05, height: 0.25 }, this.scene);
        shoulderStrip.material = neonCyanMat;
        shoulderStrip.parent = leftShoulderPad;
        shoulderStrip.position.x = -0.151;
        shoulderStrip.rotation.y = -Math.PI / 2;
        if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(shoulderStrip);

        // 上臂 (液压杆风格)
        const leftUpperArm = MeshBuilder.CreateCylinder("leftUpperArm", { height: 0.35, diameter: 0.12 }, this.scene);
        leftUpperArm.material = chromeMat;
        leftUpperArm.parent = this.leftArmGroup;
        leftUpperArm.position.y = -0.3;

        // 前臂 (巨爪基座)
        const leftForeArm = MeshBuilder.CreateBox("leftForeArm", { width: 0.2, height: 0.35, depth: 0.2 }, this.scene);
        leftForeArm.material = darkMetalMat;
        leftForeArm.parent = this.leftArmGroup;
        leftForeArm.position.y = -0.65;

        // 机械爪 (简单示意)
        const clawL = MeshBuilder.CreateBox("clawL", { width: 0.05, height: 0.15, depth: 0.05 }, this.scene);
        clawL.parent = leftForeArm;
        clawL.position.set(-0.08, -0.2, 0);
        const clawR = clawL.clone("clawR");
        clawR.position.x = 0.08;

        // === 右臂 (轻型战术臂 - Tactical Arm) ===
        this.rightArmGroup = new TransformNode("rightArmGroup", this.scene);
        this.rightArmGroup.parent = this.torso;
        this.rightArmGroup.position.set(0.4, 0.3, 0);

        const rightShoulder = MeshBuilder.CreateSphere("rightShoulder", { diameter: 0.25 }, this.scene);
        rightShoulder.material = darkMetalMat;
        rightShoulder.parent = this.rightArmGroup;

        const rightArmMesh = MeshBuilder.CreateBox("rightArmMesh", { width: 0.12, height: 0.7, depth: 0.12 }, this.scene);
        rightArmMesh.material = darkMetalMat;
        rightArmMesh.parent = this.rightArmGroup;
        rightArmMesh.position.y = -0.35;

        // 手腕全息投影仪 (发光环)
        const wristRing = MeshBuilder.CreateTorus("wristRing", { diameter: 0.15, thickness: 0.03 }, this.scene);
        wristRing.material = neonPinkMat;
        wristRing.parent = rightArmMesh;
        wristRing.position.y = -0.25;
        if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(wristRing);

        // === 腿部 (Cyber Legs) ===
        // 髋关节
        const hip = MeshBuilder.CreateBox("hip", { width: 0.4, height: 0.15, depth: 0.25 }, this.scene);
        hip.material = darkMetalMat;
        hip.parent = this.torso;
        hip.position.y = -0.5;

        // 左腿 (逆足风格/增强腿)
        this.leftLegGroup = new TransformNode("leftLegGroup", this.scene);
        this.leftLegGroup.parent = hip;
        this.leftLegGroup.position.x = -0.15;

        const leftThigh = MeshBuilder.CreateBox("leftThigh", { width: 0.18, height: 0.4, depth: 0.2 }, this.scene);
        leftThigh.material = darkMetalMat;
        leftThigh.parent = this.leftLegGroup;
        leftThigh.position.y = -0.2;

        const leftKnee = MeshBuilder.CreateSphere("leftKnee", { diameter: 0.15 }, this.scene);
        leftKnee.material = chromeMat;
        leftKnee.parent = this.leftLegGroup;
        leftKnee.position.y = -0.45;

        const leftShin = MeshBuilder.CreateBox("leftShin", { width: 0.15, height: 0.45, depth: 0.15 }, this.scene);
        leftShin.material = darkMetalMat;
        leftShin.parent = this.leftLegGroup;
        leftShin.position.y = -0.7;

        // 膝盖发光细节
        const kneeLight = MeshBuilder.CreateBox("kneeLight", { width: 0.08, height: 0.08, depth: 0.02 }, this.scene);
        kneeLight.material = neonCyanMat;
        kneeLight.parent = leftKnee;
        kneeLight.position.z = 0.08;
        if (this.glowLayer) this.glowLayer.addIncludedOnlyMesh(kneeLight);

        // 右腿 (对称)
        this.rightLegGroup = new TransformNode("rightLegGroup", this.scene);
        this.rightLegGroup.parent = hip;
        this.rightLegGroup.position.x = 0.15;

        const rightThigh = leftThigh.clone("rightThigh");
        rightThigh.parent = this.rightLegGroup;
        
        const rightKnee = leftKnee.clone("rightKnee");
        rightKnee.parent = this.rightLegGroup;
        if (this.glowLayer) {
             rightKnee.getChildMeshes().forEach(m => {
                 this.glowLayer.addIncludedOnlyMesh(m);
             });
        }

        const rightShin = leftShin.clone("rightShin");
        rightShin.parent = this.rightLegGroup;
    }

    // Simple physics setup similar to BoxMan
    setupPhysics() {
        // Create a capsule physics aggregate matching the collider
        this.aggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.CAPSULE, { mass: 1, friction: 0.5, restitution: 0 }, this.scene);
        // Lock rotation to prevent tipping
        this.aggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0)
        });
    }

    // Update animation each frame
    updateAnimation(dt, state) {
        const { isMoving, isSprinting, isGrounded, isBoosterActive, velocity, yaw, walkTimeIncrement } = state;
        this.walkTime += walkTimeIncrement;
        const angle = Math.sin(this.walkTime);
        
        // Rotate model root to face yaw
        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, yaw, 0);
        
        // Neon pulse effect (Breathing light)
        this.neonRoots.forEach(item => {
            const { mat, color } = item;
            if (mat) {
                // 快速脉冲 + 随机闪烁干扰
                const pulse = 0.8 + 0.4 * Math.sin(this.walkTime * 5);
                const flicker = Math.random() > 0.95 ? 0.5 : 1.0; // 偶尔闪烁
                mat.emissiveColor = color.scale(pulse * flicker);
            }
        });

        // Animation Logic
        if (isMoving) {
            const amp = isSprinting ? 1.2 : 0.8;
            
            // Arms - Asymmetrical swing
            // Left heavy arm moves less
            if (this.leftArmGroup) {
                this.leftArmGroup.rotation.x = angle * amp * 0.8;
                this.leftArmGroup.rotation.z = 0.1; // Slightly out
            }
            // Right tactical arm moves more
            if (this.rightArmGroup) {
                this.rightArmGroup.rotation.x = -angle * amp;
                this.rightArmGroup.rotation.z = -0.1;
            }

            // Legs
            if (this.leftLegGroup) this.leftLegGroup.rotation.x = -angle * amp;
            if (this.rightLegGroup) this.rightLegGroup.rotation.x = angle * amp;

            // Torso lean forward when sprinting
            if (isSprinting) {
                this.torso.rotation.x = 0.3;
            } else {
                this.torso.rotation.x = 0.1;
            }

        } else {
            // Idle Animation
            // Breathing torso
            this.torso.rotation.x = 0.05 * Math.sin(this.walkTime * 2);
            this.torso.position.y = 1.1 + 0.01 * Math.sin(this.walkTime * 2);
            
            // Arms idle sway
            if (this.leftArmGroup) {
                this.leftArmGroup.rotation.x = 0.05 * Math.sin(this.walkTime + 1);
                this.leftArmGroup.rotation.z = 0.1 + 0.02 * Math.cos(this.walkTime);
            }
            if (this.rightArmGroup) {
                this.rightArmGroup.rotation.x = 0.05 * Math.sin(this.walkTime);
                this.rightArmGroup.rotation.z = -0.1 - 0.02 * Math.cos(this.walkTime);
            }
            
            // Reset legs
            if (this.leftLegGroup) this.leftLegGroup.rotation.x = 0;
            if (this.rightLegGroup) this.rightLegGroup.rotation.x = 0;
        }

        // Jump/Air logic
        if (!isGrounded) {
            // Legs trail behind
            if (this.leftLegGroup) this.leftLegGroup.rotation.x = -0.5;
            if (this.rightLegGroup) this.rightLegGroup.rotation.x = -0.2;
            
            // Arms out for balance
            if (this.leftArmGroup) this.leftArmGroup.rotation.z = 0.5;
            if (this.rightArmGroup) this.rightArmGroup.rotation.z = -0.5;
        }
    }
}
