import { MeshBuilder, Vector3, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Quaternion, Matrix, ActionManager } from "@babylonjs/core";
import { Config } from "./config";

export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.aggregate = null;
        this.inputMap = {};
        
        this.createPlayerMesh();
        this.setupPhysics();
        this.setupInputs();
        this.registerBeforeRender();
    }

    createPlayerMesh() {
        // 玩家容器
        this.mesh = MeshBuilder.CreateCapsule("player", { height: 2, radius: 0.5 }, this.scene);
        this.mesh.position.y = 2; // 初始位置
        this.mesh.visibility = Config.player.showCollider ? 0.5 : 0; // 根据配置显示或隐藏胶囊体

        // 材质
        const skinMat = new StandardMaterial("skinMat", this.scene);
        skinMat.diffuseColor = new Color3(1, 0.8, 0.6);

        const hairMat = new StandardMaterial("hairMat", this.scene);
        hairMat.diffuseColor = new Color3(0.4, 0.2, 0.1); // Brown hair

        const clothesMat = new StandardMaterial("clothesMat", this.scene);
        clothesMat.diffuseColor = new Color3(1, 0.4, 0.6); // Pink shirt

        const pantsMat = new StandardMaterial("pantsMat", this.scene);
        pantsMat.diffuseColor = new Color3(0.2, 0.2, 0.8); // Blue pants

        const eyeMat = new StandardMaterial("eyeMat", this.scene);
        eyeMat.diffuseColor = new Color3(0, 0, 0);

        const mouthMat = new StandardMaterial("mouthMat", this.scene);
        mouthMat.diffuseColor = new Color3(0.8, 0.2, 0.2);

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
        nose.material = skinMat; // Same as skin but sticks out
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

        // 手臂
        const leftArm = MeshBuilder.CreateBox("leftArm", { width: 0.15, height: 0.6, depth: 0.15 }, this.scene);
        leftArm.material = skinMat;
        leftArm.parent = this.modelRoot;
        leftArm.position.y = 1.2;
        leftArm.position.x = -0.35;

        const rightArm = MeshBuilder.CreateBox("rightArm", { width: 0.15, height: 0.6, depth: 0.15 }, this.scene);
        rightArm.material = skinMat;
        rightArm.parent = this.modelRoot;
        rightArm.position.y = 1.2;
        rightArm.position.x = 0.35;

        // 腿
        const leftLeg = MeshBuilder.CreateBox("leftLeg", { width: 0.2, height: 0.7, depth: 0.2 }, this.scene);
        leftLeg.material = pantsMat;
        leftLeg.parent = this.modelRoot;
        leftLeg.position.y = 0.55;
        leftLeg.position.x = -0.12;

        const rightLeg = MeshBuilder.CreateBox("rightLeg", { width: 0.2, height: 0.7, depth: 0.2 }, this.scene);
        rightLeg.material = pantsMat;
        rightLeg.parent = this.modelRoot;
        rightLeg.position.y = 0.55;
        rightLeg.position.x = 0.12;
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
        });

        window.addEventListener("keyup", (evt) => {
            this.inputMap[evt.key.toLowerCase()] = false;
        });
    }

    registerBeforeRender() {
        this.scene.onBeforeRenderObservable.add(() => {
            this.updateMovement();
        });
    }

    updateMovement() {
        if (!this.mesh || !this.aggregate) return;

        const speed = Config.player.speed;
        const velocity = this.aggregate.body.getLinearVelocity();
        
        let moveDirection = new Vector3(0, 0, 0);
        let isMoving = false;

        // 获取相机的前方方向（忽略Y轴）
        const cameraForward = this.camera.getForwardRay().direction;
        cameraForward.y = 0;
        cameraForward.normalize();

        const cameraRight = Vector3.Cross(this.scene.yAxis || new Vector3(0, 1, 0), cameraForward);
        cameraRight.normalize(); // Actually this is Left if Cross(Up, Fwd) ? No, Up x Fwd = Right (Right Hand Rule? Babylon is Left Handed)
        // Babylon: Left Handed system.
        // Up (0,1,0) x Forward (0,0,1) = (1,0,0) which is Right.
        // But wait, let's verify directions.
        
        // W - Forward
        if (this.inputMap["w"]) {
            moveDirection.addInPlace(cameraForward);
            isMoving = true;
            
            // 只有按住W时，玩家模型才转向相机前方
            // 计算目标旋转
            const targetRotation = Math.atan2(cameraForward.x, cameraForward.z);
            // 旋转模型（不是物理体，物理体锁住了旋转）
            // 我们旋转modelRoot
            // 使用 Quaternion.Slerp 平滑旋转
            const currentRotation = this.modelRoot.rotationQuaternion ? this.modelRoot.rotationQuaternion.toEulerAngles().y : this.modelRoot.rotation.y;
            // 简单处理，直接设置rotation.y
             this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, targetRotation, 0);
        }

        // S - Backward
        if (this.inputMap["s"]) {
            moveDirection.subtractInPlace(cameraForward);
            isMoving = true;
        }

        // A - Left
        // If cameraRight points Right, then Left is -cameraRight.
        // Let's assume we want to move Left.
        // We need a vector pointing Left.
        // If Up x Forward = Right, then Left = -Right = Right x Up = (Up x Forward) * -1
        // Actually simpler: Vector3.Cross(cameraForward, Up) = Right (in Left Handed?)
        // Let's stick to standard logic:
        // Forward = Z
        // Right = X
        // Up = Y
        
        // Babylon Left Handed:
        // Cross(Up, Forward) -> Right ?
        // (0,1,0) x (0,0,1) = (1,0,0) -> Right. Correct.
        
        if (this.inputMap["a"]) {
             // Move Left -> -Right
             moveDirection.subtractInPlace(cameraRight);
             isMoving = true;
        }

        // D - Right
        if (this.inputMap["d"]) {
            moveDirection.addInPlace(cameraRight);
            isMoving = true;
        }

        if (isMoving) {
            moveDirection.normalize();
            // Apply velocity
            // We want to keep the vertical velocity (gravity)
            this.aggregate.body.setLinearVelocity(new Vector3(
                moveDirection.x * speed,
                velocity.y,
                moveDirection.z * speed
            ));
        } else {
            // Stop horizontal movement
            this.aggregate.body.setLinearVelocity(new Vector3(0, velocity.y, 0));
        }
    }
}
