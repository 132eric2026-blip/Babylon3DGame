import { MeshBuilder, Vector3, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType, TransformNode, Texture, Engine, Scalar, Quaternion } from "@babylonjs/core";

export class BoxMan {
    constructor(scene, position = new Vector3(5, 5, 5), glowLayer = null) {
        this.scene = scene;
        this.glowLayer = glowLayer;
        this.mesh = null;
        this.aggregate = null;
        this.modelRoot = null;
        this.flameRoots = [];
        this.walkTime = 0;

        this.createBoxManMesh();
        this.createFlameEffects();
        
        if (this.mesh) {
            this.mesh.position = position;
        }

        this.setupPhysics();
    }

    createBoxManMesh() {
        // 玩家容器 (胶囊体)
        this.mesh = MeshBuilder.CreateCapsule("boxMan", { height: 2, radius: 0.5 }, this.scene);
        this.mesh.visibility = 0; // 隐藏胶囊体，只显示内部方块人

        // 材质
        const skinMat = new StandardMaterial("skinMat", this.scene);
        skinMat.diffuseColor = new Color3(1, 0.8, 0.6);
        skinMat.specularColor = new Color3(0, 0, 0);

        const hairMat = new StandardMaterial("hairMat", this.scene);
        hairMat.diffuseColor = new Color3(0.4, 0.2, 0.5);
        hairMat.specularColor = new Color3(0, 0, 0);

        const clothesMat = new StandardMaterial("clothesMat", this.scene);
        clothesMat.diffuseColor = new Color3(1, 0.4, 0.6);
        clothesMat.specularColor = new Color3(0, 0, 0);

        const pantsMat = new StandardMaterial("pantsMat", this.scene);
        pantsMat.diffuseColor = new Color3(0.2, 0.2, 0.8);
        pantsMat.specularColor = new Color3(0, 0, 0);

        const eyeMat = new StandardMaterial("eyeMat", this.scene);
        eyeMat.diffuseColor = new Color3(0, 0, 0);
        eyeMat.specularColor = new Color3(0, 0, 0);

        const mouthMat = new StandardMaterial("mouthMat", this.scene);
        mouthMat.diffuseColor = new Color3(0.8, 0.2, 0.2);
        mouthMat.specularColor = new Color3(0, 0, 0);

        // 身体容器，用于旋转
        this.modelRoot = MeshBuilder.CreateBox("modelRoot", { size: 0.1 }, this.scene);
        this.modelRoot.isVisible = false;
        this.modelRoot.parent = this.mesh;
        this.modelRoot.position.y = -1.2; // 调整模型在胶囊体中的位置

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
        nose.material = skinMat;
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

        // 喷气背包 (Booster)
        const boosterMat = new StandardMaterial("boosterMat", this.scene);
        boosterMat.diffuseColor = new Color3(0.6, 0.6, 0.6);
        boosterMat.specularColor = new Color3(0, 0, 0);
        
        const booster = new TransformNode("boosterRoot", this.scene);
        booster.parent = body;
        booster.position = new Vector3(0, 0.05, -0.29);

        const housing = MeshBuilder.CreateBox("boosterHousing", { width: 0.6, height: 0.25, depth: 0.2 }, this.scene);
        housing.material = boosterMat;
        housing.parent = booster;
        housing.position = new Vector3(0, 0.1, 0);

        const pipeHeight = 0.25;
        const pipeY = -0.15;

        const pipeL = MeshBuilder.CreateCylinder("boosterPipeL", { diameter: 0.12, height: pipeHeight }, this.scene);
        pipeL.material = boosterMat;
        pipeL.parent = booster;
        pipeL.position = new Vector3(-0.15, pipeY, 0);

        const pipeR = MeshBuilder.CreateCylinder("boosterPipeR", { diameter: 0.12, height: pipeHeight }, this.scene);
        pipeR.material = boosterMat;
        pipeR.parent = booster;
        pipeR.position = new Vector3(0.15, pipeY, 0);

        // 喷嘴细节
        const nozzleHeight = 0.05;
        const nozzleDiameter = 0.14;

        const nozzleMeshL = MeshBuilder.CreateCylinder("nozzleMeshL", { diameter: nozzleDiameter, height: nozzleHeight }, this.scene);
        nozzleMeshL.material = boosterMat;
        nozzleMeshL.parent = pipeL;
        nozzleMeshL.position.y = -pipeHeight / 2 - nozzleHeight / 2;
        this.nozzleMeshL = nozzleMeshL;

        const nozzleMeshR = MeshBuilder.CreateCylinder("nozzleMeshR", { diameter: nozzleDiameter, height: nozzleHeight }, this.scene);
        nozzleMeshR.material = boosterMat;
        nozzleMeshR.parent = pipeR;
        nozzleMeshR.position.y = -pipeHeight / 2 - nozzleHeight / 2;
        this.nozzleMeshR = nozzleMeshR;

        // 手臂参数
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

        // 左臂
        const leftArm = MeshBuilder.CreateBox("leftArm", { width: armWidth, height: armHeight, depth: armDepth }, this.scene);
        leftArm.material = skinMat;
        leftArm.parent = this.leftShoulder;
        leftArm.position.y = -armHeight / 2;

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
        const hipY = 0.9;
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

    setupPhysics() {
        // 刚体设置
        this.aggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.CAPSULE, { mass: 1, friction: 0.5, restitution: 0 }, this.scene);

        // 锁定旋转
        this.aggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0)
        });
    }

    updateAnimation(dt, state) {
        const { isMoving, isSprinting, isGrounded, isBoosterActive, velocity, yaw, walkTimeIncrement, swordSlashAnimating } = state;
        
        this.walkTime += walkTimeIncrement;
        const angle = Math.sin(this.walkTime);
        this.lastAngle = angle; // 保存 angle 供外部访问

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
                this.animateWalk(isSprinting, yaw, angle, swordSlashAnimating);
            } else {
                this.animateIdle(yaw, swordSlashAnimating);
            }
        }
    }

    /**
     * 助推器飞行姿态
     */
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

    /**
     * 助推器悬浮姿态
     */
    animateBoosterHover(yaw, angle) {
        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(-0.1, yaw, 0);
        this.modelRoot.position.y = -1.2 + angle * 0.08;
        if (this.leftShoulder) { this.leftShoulder.rotation.x = 0.0 + angle * 0.05; this.leftShoulder.rotation.z = 0.8 + angle * 0.05; }
        if (this.rightShoulder) { this.rightShoulder.rotation.x = 0.0 + angle * 0.05; this.rightShoulder.rotation.z = -0.8 - angle * 0.05; }
        if (this.leftHip) this.leftHip.rotation.x = 0.1 + angle * 0.05;
        if (this.rightHip) this.rightHip.rotation.x = 0.05 - angle * 0.05;
    }

    /**
     * 超级英雄飞行 (空中冲刺)
     */
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

    /**
     * 移动跳跃
     */
    animateJumpMoving(velocity, yaw) {
        const vy = velocity.y;
        if (vy > 0.5) {
            // Rising
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.2, yaw, 0);
            if (this.leftShoulder) { this.leftShoulder.rotation.x = -2.8; this.leftShoulder.rotation.z = -0.2; }
            if (this.rightShoulder) { this.rightShoulder.rotation.x = -2.8; this.rightShoulder.rotation.z = 0.2; }
            if (this.leftHip) this.leftHip.rotation.x = -1.2;
            if (this.rightHip) this.rightHip.rotation.x = 0.2;
        } else if (vy < -0.5) {
            // Falling
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
            if (this.leftShoulder) { this.leftShoulder.rotation.x = -1.5; this.leftShoulder.rotation.z = -0.8; }
            if (this.rightShoulder) { this.rightShoulder.rotation.x = -1.5; this.rightShoulder.rotation.z = 0.8; }
            if (this.leftHip) this.leftHip.rotation.x = -0.4;
            if (this.rightHip) this.rightHip.rotation.x = -0.4;
        } else {
            // Apex
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.1, yaw, 0);
            if (this.leftShoulder) { this.leftShoulder.rotation.x = -2.0; this.leftShoulder.rotation.z = -0.4; }
            if (this.rightShoulder) { this.rightShoulder.rotation.x = -2.0; this.rightShoulder.rotation.z = 0.4; }
            if (this.leftHip) this.leftHip.rotation.x = -0.8;
            if (this.rightHip) this.rightHip.rotation.x = -0.8;
        }
    }

    /**
     * 零重力漂浮 (空中原地冲刺状态)
     */
    animateZeroGravityFloat(yaw, angle) {
        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(-0.1, yaw, 0);
        this.modelRoot.position.y = -1.2 + angle * 0.08;
        if (this.leftShoulder) { this.leftShoulder.rotation.x = 0.0 + angle * 0.05; this.leftShoulder.rotation.z = 0.8 + angle * 0.05; }
        if (this.rightShoulder) { this.rightShoulder.rotation.x = 0.0 + angle * 0.05; this.rightShoulder.rotation.z = -0.8 - angle * 0.05; }
        if (this.leftHip) this.leftHip.rotation.x = 0.1 + angle * 0.05;
        if (this.rightHip) this.rightHip.rotation.x = 0.05 - angle * 0.05;
    }

    /**
     * 原地跳跃
     */
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

    /**
     * 行走动画
     */
    animateWalk(isSprinting, yaw, angle, swordSlashAnimating = false) {
        const amp = isSprinting ? 1.2 : 0.8;
        
        if (this.leftHip) this.leftHip.rotation.x = -angle * amp;
        if (this.rightHip) this.rightHip.rotation.x = angle * amp;
        if (this.leftShoulder) {
            this.leftShoulder.rotation.x = angle * amp;
            this.leftShoulder.rotation.z = 0;
        }
        // 只在非挥砍动画时才设置右肩臂动画
        if (this.rightShoulder && !swordSlashAnimating) {
            this.rightShoulder.rotation.x = -angle * amp;
            this.rightShoulder.rotation.z = 0;
        }
    }

    /**
     * 待机动画
     */
    animateIdle(yaw, swordSlashAnimating = false) {
        if (this.leftHip) this.leftHip.rotation.x = 0;
        if (this.rightHip) this.rightHip.rotation.x = 0;
        if (this.leftShoulder) {
            this.leftShoulder.rotation.x = 0;
            this.leftShoulder.rotation.z = 0;
        }
        // 只在非挥砍动画时才设置右肩臂动画
        if (this.rightShoulder && !swordSlashAnimating) {
            this.rightShoulder.rotation.x = 0;
            this.rightShoulder.rotation.z = 0;
        }
    }
}
