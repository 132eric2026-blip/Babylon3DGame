import { MeshBuilder, Vector3, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, Quaternion, Matrix, ActionManager, ParticleSystem, Texture, Color4, TransformNode, Ray } from "@babylonjs/core";
import { Config } from "./config";
import { Shield } from "./shield";

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
        this.boosterPS = null;
        this.antiGravity = false;
        this.hoverActive = false;
        this.ascendImpulseMs = 0;
        this._groundEpsilon = 0.06;
        this.nearbyHorse = null;
        this.mountedHorse = null;

        this.createPlayerMesh();

        // Create Shield
        this.shield = new Shield(this.scene, this.modelRoot);

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
        skinMat.specularColor = new Color3(0, 0, 0); // 去掉高光

        const hairMat = new StandardMaterial("hairMat", this.scene);
        hairMat.diffuseColor = new Color3(0.4, 0.2, 0.1); // Brown hair
        hairMat.specularColor = new Color3(0, 0, 0); // 去掉高光

        const clothesMat = new StandardMaterial("clothesMat", this.scene);
        clothesMat.diffuseColor = new Color3(1, 0.4, 0.6); // Pink shirt
        clothesMat.specularColor = new Color3(0, 0, 0); // 去掉高光

        const pantsMat = new StandardMaterial("pantsMat", this.scene);
        pantsMat.diffuseColor = new Color3(0.2, 0.2, 0.8); // Blue pants
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

        const boosterMat = new StandardMaterial("boosterMat", this.scene);
        boosterMat.diffuseColor = new Color3(0.6, 0.6, 0.6);
        boosterMat.specularColor = new Color3(0, 0, 0);
        this.booster = MeshBuilder.CreateCylinder("booster", { diameter: 0.22, height: 0.38 }, this.scene);
        this.booster.material = boosterMat;
        this.booster.parent = body;
        this.booster.rotation.x = Math.PI / 2;
        this.booster.position = new Vector3(0, 0.05, -0.29);

        const nozzle = new TransformNode("boosterNozzle", this.scene);
        nozzle.parent = this.booster;
        nozzle.position = new Vector3(0, -.6, -0);
        this.boosterNozzle = nozzle;

        const flamePS = new ParticleSystem("boosterFlame", 400, this.scene);
        const canvas = document.createElement("canvas");
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext("2d");
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255,220,120,1)");
        grad.addColorStop(0.5, "rgba(255,140,40,0.8)");
        grad.addColorStop(1, "rgba(255,80,0,0)");
        ctx.fillStyle = grad; ctx.clearRect(0,0,64,64); ctx.fillRect(0,0,64,64);
        const texUrl = canvas.toDataURL();
        const flameTex = Texture.CreateFromBase64String(texUrl, "flame.png", this.scene);
        flamePS.particleTexture = flameTex;
        flamePS.emitter = this.boosterNozzle;
        flamePS.createConeEmitter(0.09, Math.PI / 6);
        flamePS.color1 = new Color4(3.0, 2.2, 0.8, 1.0);
        flamePS.color2 = new Color4(2.0, 1.0, 0.2, 1.0);
        flamePS.colorDead = new Color4(0, 0, 0, 0);
        flamePS.minSize = 0.09; flamePS.maxSize = 0.20;
        flamePS.minLifeTime = 0.35; flamePS.maxLifeTime = 0.7;
        flamePS.emitRate = 0;
        flamePS.blendMode = ParticleSystem.BLENDMODE_ADD;
        flamePS.gravity = new Vector3(0, 0, 0);
        flamePS.direction1 = new Vector3(0, 0, -1);
        flamePS.direction2 = new Vector3(0, 0, -1);
        flamePS.minEmitPower = 2.6; flamePS.maxEmitPower = 4.0;
        flamePS.updateSpeed = 0.02;
        this.boosterPS = flamePS;

        // 手臂参数
        const armWidth = 0.15;
        const armHeight = 0.6;
        const armDepth = 0.15;
        const shoulderY = 1.5; // 肩膀高度 (body top is at 1.2 + 0.3 = 1.5)
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
        const hipY = 0.9; // 臀部高度 (body bottom is at 1.2 - 0.3 = 0.9)
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
                if (!this.isSprinting) { this.antiGravity = false; this.hoverActive = false; this.ascendImpulseMs = 0; }
                else {
                    if (!this.isGrounded()) {
                        this.hoverActive = true;
                        const v = this.aggregate?.body?.getLinearVelocity();
                        if (v) this.aggregate.body.setLinearVelocity(new Vector3(v.x, 0, v.z));
                        this.ascendImpulseMs = (Config.player.boosterReenableImpulseMs || 200);
                    }
                }
            }
            if (evt.code === "Space") {
                if (this.mountedHorse) {
                    // Dismount on jump
                    this.dismountHorse();
                    return;
                }
                if (this.isSprinting) {
                    if (!this.hoverActive) { this.hoverActive = true; }
                    else { this.ascendImpulseMs = 300; }
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
        });

        window.addEventListener("keyup", (evt) => {
            this.inputMap[evt.key.toLowerCase()] = false;
        });
    }

    registerBeforeRender() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (this.mountedHorse) {
                this.updateMountedMovement();
            } else {
                this.updateMovement();
                this.checkNearbyHorses();
            }
        });
    }

    checkNearbyHorses() {
        // Simple distance check against all meshes named "horseRoot"
        // Ideally we would have a list of interactables, but for now scan scene
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
            const curSpeed = this.isSprinting ? sprintSpeed : baseSpeed;
            if (this.ascendImpulseMs > 0) { this.ascendImpulseMs = Math.max(0, this.ascendImpulseMs - dtMs); }
            let vy = velocity.y;
            if (this.isSprinting && this.hoverActive) {
                vy = this.ascendImpulseMs > 0 ? (Config.player.antiGravityUpSpeed || 3.5) : 0;
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
                // Align character facing with camera forward in air (Strafing flight)
                const yaw = Math.atan2(cameraForward.x, cameraForward.z);
                
                // Air Move: Super Hero Flight (Right arm forward, body horizontal)
                // User reported previous -1.4 was backward leaning, so we invert to positive.
                this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(1.0, yaw, 0);
                
                // Right arm punches forward (Fully extended relative to body)
                // Using ~PI to ensure it's straight up/forward relative to torso
                this.rightShoulder.rotation.x = -3.1; 
                this.rightShoulder.rotation.z = 0.0;
                
                // Left arm tucked near waist
                this.leftShoulder.rotation.x = 0.5;
                this.leftShoulder.rotation.z = 0.2;
                
                // Legs streamlined
                this.leftHip.rotation.x = 0.1 + angle * 0.05;
                this.rightHip.rotation.x = 0.1 - angle * 0.05;
            } else {
                this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, this.modelRoot.rotationQuaternion ? this.modelRoot.rotationQuaternion.toEulerAngles().y : this.modelRoot.rotation.y, 0);
                this.leftShoulder.rotation.x = angle * amp;
                this.rightShoulder.rotation.x = -angle * amp;
                this.leftHip.rotation.x = -angle * amp;
                this.rightHip.rotation.x = angle * amp;
                this.leftShoulder.rotation.z = 0;
                this.rightShoulder.rotation.z = 0;
            }

            if (this.boosterPS) {
                let rate = 0;
                if (this.isSprinting) {
                    rate = this.hoverActive ? (this.ascendImpulseMs > 0 ? 280 : 140) : 80;
                }
                this.boosterPS.emitRate = rate;
                if (this.isSprinting) this.boosterPS.start(); else this.boosterPS.stop();
            }

        } else {
            // Stop horizontal movement
            if (this.ascendImpulseMs > 0) { this.ascendImpulseMs = Math.max(0, this.ascendImpulseMs - dtMs); }
            let vyIdle = velocity.y;
            if (this.isSprinting && this.hoverActive) {
                vyIdle = this.ascendImpulseMs > 0 ? (Config.player.antiGravityUpSpeed || 3.5) : 0;
            }
            this.aggregate.body.setLinearVelocity(new Vector3(0, vyIdle, 0));

            if (!this.isGrounded()) {
                const ds = 0.003; 
                this.walkTime += this.scene.getEngine().getDeltaTime() * ds;
                const ang = Math.sin(this.walkTime);
                
                // Air Hover: Zero-G Float (Upright, arms out)
                const yaw = this.modelRoot.rotationQuaternion ? this.modelRoot.rotationQuaternion.toEulerAngles().y : this.modelRoot.rotation.y;
                this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(-0.1, yaw, 0);
                this.modelRoot.position.y = -1.2 + ang * 0.08;
                
                this.leftShoulder.rotation.x = 0.0 + ang * 0.05;
                this.rightShoulder.rotation.x = 0.0 + ang * 0.05;
                this.leftShoulder.rotation.z = 0.8 + ang * 0.05;
                this.rightShoulder.rotation.z = -0.8 - ang * 0.05;
                
                this.leftHip.rotation.x = 0.1 + ang * 0.05;
                this.rightHip.rotation.x = 0.05 - ang * 0.05;
            } else {
                // Grounded Idle - Reset posture to upright
                this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, this.modelRoot.rotationQuaternion ? this.modelRoot.rotationQuaternion.toEulerAngles().y : this.modelRoot.rotation.y, 0);
                this.modelRoot.position.y = -1.2;
                this.leftShoulder.rotation.x = 0;
                this.rightShoulder.rotation.x = 0;
                this.leftHip.rotation.x = 0;
                this.rightHip.rotation.x = 0;
                this.leftShoulder.rotation.z = 0;
                this.rightShoulder.rotation.z = 0;
            }
            if (this.boosterPS) {
                if (this.isSprinting) { this.boosterPS.emitRate = this.hoverActive ? (this.ascendImpulseMs > 0 ? 240 : 120) : 80; this.boosterPS.start(); }
                else { this.boosterPS.emitRate = 0; this.boosterPS.stop(); }
            }
        }
    }
}
