import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, TrailMesh, Texture, Engine, Quaternion } from "@babylonjs/core";
import { Config } from "../../config";

/**
 * 方块人角色
 * 负责方块人的视觉模型、动画与特效
 */
export class BoxMan {
    /**
     * 构造方块人
     * @param {Scene} scene 场景实例
     * @param {TransformNode} parent 父节点（通常是玩家的物理胶囊体）
     */
    constructor(scene, parent) {
        this.scene = scene;
        this.parent = parent;
        
        // 动画相关属性
        this.walkTime = 0;
        
        // 模型部件引用
        this.modelRoot = null;
        this.head = null;
        this.leftShoulder = null;
        this.rightShoulder = null;
        this.leftArm = null;
        this.rightArm = null;
        this.leftHip = null;
        this.rightHip = null;
        this.booster = null;
        this.boosterNozzleL = null;
        this.boosterNozzleR = null;
        this.flameRoots = [];
        
        // 攻击特效
        this.attackRef = null;
        this.attackTrail = null;
        this.isAttacking = false;
        this.attackTime = 0;
        this.attackDuration = 0.4;

        this.createMesh();
        this.setupAttackEffect();
    }

    /**
     * 创建方块人可视网格与身体结构
     */
    createMesh() {
        // 材质
        const skinMat = new StandardMaterial("skinMat", this.scene);
        skinMat.diffuseColor = new Color3(1, 0.8, 0.6);
        skinMat.specularColor = new Color3(0, 0, 0);

        const hairMat = new StandardMaterial("hairMat", this.scene);
        hairMat.diffuseColor = new Color3(0.4, 0.2, 0.1);
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
        this.modelRoot = new MeshBuilder.CreateBox("modelRoot", { size: 0.1 }, this.scene);
        this.modelRoot.isVisible = false;
        this.modelRoot.parent = this.parent;
        this.modelRoot.position.y = -1.2; // 调整模型在胶囊体中的位置

        // 头部
        this.head = MeshBuilder.CreateBox("head", { size: 0.5 }, this.scene);
        this.head.material = skinMat;
        this.head.parent = this.modelRoot;
        this.head.position.y = 1.75;

        // 头发
        const hairTop = MeshBuilder.CreateBox("hairTop", { width: 0.55, height: 0.15, depth: 0.55 }, this.scene);
        hairTop.material = hairMat;
        hairTop.parent = this.head;
        hairTop.position.y = 0.25;

        const hairBack = MeshBuilder.CreateBox("hairBack", { width: 0.55, height: 0.6, depth: 0.15 }, this.scene);
        hairBack.material = hairMat;
        hairBack.parent = this.head;
        hairBack.position.y = -0.1;
        hairBack.position.z = -0.22;

        // 眼睛
        const leftEye = MeshBuilder.CreateBox("leftEye", { width: 0.08, height: 0.08, depth: 0.02 }, this.scene);
        leftEye.material = eyeMat;
        leftEye.parent = this.head;
        leftEye.position.z = 0.251;
        leftEye.position.x = -0.12;
        leftEye.position.y = 0;

        const rightEye = MeshBuilder.CreateBox("rightEye", { width: 0.08, height: 0.08, depth: 0.02 }, this.scene);
        rightEye.material = eyeMat;
        rightEye.parent = this.head;
        rightEye.position.z = 0.251;
        rightEye.position.x = 0.12;
        rightEye.position.y = 0;

        // 鼻子
        const nose = MeshBuilder.CreateBox("nose", { width: 0.06, height: 0.06, depth: 0.02 }, this.scene);
        nose.material = skinMat;
        nose.parent = this.head;
        nose.position.z = 0.26;
        nose.position.y = -0.08;

        // 嘴巴
        const mouth = MeshBuilder.CreateBox("mouth", { width: 0.15, height: 0.04, depth: 0.02 }, this.scene);
        mouth.material = mouthMat;
        mouth.parent = this.head;
        mouth.position.z = 0.251;
        mouth.position.y = -0.18;

        // 身体
        const body = MeshBuilder.CreateBox("body", { width: 0.5, height: 0.6, depth: 0.25 }, this.scene);
        body.material = clothesMat;
        body.parent = this.modelRoot;
        body.position.y = 1.2;

        // 喷射器
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

        this.boosterNozzleL = new TransformNode("boosterNozzleL", this.scene);
        this.boosterNozzleL.parent = nozzleMeshL;
        this.boosterNozzleL.position = new Vector3(0, -nozzleHeight / 2, 0);

        this.boosterNozzleR = new TransformNode("boosterNozzleR", this.scene);
        this.boosterNozzleR.parent = nozzleMeshR;
        this.boosterNozzleR.position = new Vector3(0, -nozzleHeight / 2, 0);

        // 体积光束（喷射火焰）
        this.createBoosterFlame();

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
        this.leftArm = MeshBuilder.CreateBox("leftArm", { width: armWidth, height: armHeight, depth: armDepth }, this.scene);
        this.leftArm.material = skinMat;
        this.leftArm.parent = this.leftShoulder;
        this.leftArm.position.y = -armHeight / 2;

        // 右肩关节
        this.rightShoulder = MeshBuilder.CreateBox("rightShoulder", { size: 0.01 }, this.scene);
        this.rightShoulder.isVisible = false;
        this.rightShoulder.parent = this.modelRoot;
        this.rightShoulder.position = new Vector3(armOffsetX, shoulderY, 0);

        // 右臂
        this.rightArm = MeshBuilder.CreateBox("rightArm", { width: armWidth, height: armHeight, depth: armDepth }, this.scene);
        this.rightArm.material = skinMat;
        this.rightArm.parent = this.rightShoulder;
        this.rightArm.position.y = -armHeight / 2;

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

    /**
     * 创建喷射器火焰特效
     */
    createBoosterFlame() {
        const canvas = document.createElement("canvas");
        canvas.width = 64; canvas.height = 128;
        const ctx = canvas.getContext("2d");

        const grad = ctx.createLinearGradient(0, 0, 0, 128);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.1, "rgba(255, 240, 100, 0.95)");
        grad.addColorStop(0.3, "rgba(255, 140, 0, 0.9)");
        grad.addColorStop(0.6, "rgba(200, 40, 0, 0.7)");
        grad.addColorStop(1, "rgba(100, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 128);

        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255, 255, 200, 0.4)";
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * 64;
            const w = Math.random() * 8 + 2;
            ctx.fillRect(x, 0, w, 128);
        }

        const texUrl = canvas.toDataURL();
        const flameTex = Texture.CreateFromBase64String(texUrl, "flame_beam.png", this.scene);
        flameTex.hasAlpha = true;
        flameTex.vScale = 1.0;

        const flameMat = new StandardMaterial("flameMat", this.scene);
        flameMat.diffuseTexture = flameTex;
        flameMat.emissiveTexture = flameTex;
        flameMat.opacityTexture = flameTex;
        flameMat.emissiveColor = new Color3(1.0, 0.5, 0.0);
        flameMat.disableLighting = true;
        flameMat.alphaMode = Engine.ALPHA_ADD;
        flameMat.backFaceCulling = false;

        this.flameMat = flameMat;

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

            root.scaling = new Vector3(0, 0, 0);
            return root;
        };

        this.flameRoots = [
            createFlameMesh(this.boosterNozzleL),
            createFlameMesh(this.boosterNozzleR)
        ];
    }

    /**
     * 初始化近战攻击特效
     */
    setupAttackEffect() {
        // 攻击特效挂点 (手部)
        this.attackRef = new TransformNode("attackRef", this.scene);
        this.attackRef.parent = this.rightArm;
        this.attackRef.position = new Vector3(0, -0.3, 0);

        // 拖尾特效
        this.attackTrail = new TrailMesh("attackTrail", this.attackRef, this.scene, 0.2, 30, true);

        const trailMat = new StandardMaterial("trailMat", this.scene);
        trailMat.emissiveColor = new Color3(0.2, 0.8, 1);
        trailMat.diffuseColor = new Color3(0, 0, 0);
        trailMat.specularColor = new Color3(0, 0, 0);
        trailMat.alpha = 0.8;
        trailMat.disableLighting = true;

        this.attackTrail.material = trailMat;
        this.attackTrail.isVisible = false;
    }

    /**
     * 触发一次近战攻击
     */
    attack() {
        if (this.isAttacking) return;
        this.isAttacking = true;
        this.attackTime = 0;
        this.attackTrail.isVisible = true;
        this.attackTrail.start();
    }

    /**
     * 更新近战攻击动画与状态
     * @param {number} dt 帧间隔（秒）
     */
    updateAttack(dt) {
        if (!this.isAttacking) return;

        this.attackTime += dt;
        const progress = Math.min(this.attackTime / this.attackDuration, 1.0);

        // 挥砍动画曲线
        const t = 1 - Math.pow(1 - progress, 3);

        const startAngle = -0.8;
        const endAngle = 2.8;
        const currentAngle = startAngle + (endAngle - startAngle) * t;

        this.rightShoulder.rotation.x = -Math.PI / 2;
        this.rightShoulder.rotation.y = currentAngle;
        this.rightShoulder.rotation.z = 0;

        if (progress >= 1.0) {
            this.isAttacking = false;
            this.attackTrail.isVisible = false;
        }
    }

    /**
     * 更新角色动画（行走、飞行、闲置）
     * @param {object} params 动画参数
     */
    updateAnimation(params) {
        const { isMoving, isSprinting, isGrounded, velocity, dt, yaw, hoverActive, ascendImpulse } = params;

        // 喷射火焰动画
        if (this.flameMat) {
            this.flameMat.diffuseTexture.vOffset -= dt * 2.0;
        }

        // 喷射器开关与缩放逻辑
        let targetScaleY = 0;
        let targetWidth = 0;

        if (isSprinting) {
            if (hoverActive) {
                if (ascendImpulse) {
                    // 爆发上升
                    targetScaleY = 2.5;
                    targetWidth = 1.5;
                } else {
                    // 悬浮中
                    targetScaleY = 1.2;
                    targetWidth = 1.0;
                }
            } else {
                // 地面冲刺
                targetScaleY = 0.3;
                targetWidth = 1.0;
            }
        }

        this.flameRoots.forEach(root => {
            const curX = root.scaling.x;
            const curY = root.scaling.y;
            
            const nextX = curX + (targetWidth - curX) * dt * 10;
            const nextY = curY + (targetScaleY - curY) * dt * 10;

            root.scaling.x = nextX;
            root.scaling.z = nextX;
            root.scaling.y = nextY;
        });

        if (isMoving) {
            const dtScale = isSprinting ? 0.018 : 0.01;
            const curSpeed = isSprinting ? (Config.player.sprintSpeed || 6) : Config.player.speed;
            this.walkTime += dt * 1000 * dtScale * (curSpeed / 5);
            const amp = isSprinting ? 1.2 : 0.8;
            const angle = Math.sin(this.walkTime);

            if (!isGrounded) {
                // 空中移动
                if (isSprinting) {
                    // 超级英雄飞行
                    this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(1.0, yaw, 0);
                    this.rightShoulder.rotation.x = -3.1;
                    this.rightShoulder.rotation.z = 0.0;
                    this.leftShoulder.rotation.x = 0.5;
                    this.leftShoulder.rotation.z = 0.2;
                    this.leftHip.rotation.x = 0.1 + angle * 0.05;
                    this.rightHip.rotation.x = 0.1 - angle * 0.05;
                } else {
                    // 普通跳跃移动
                    const vy = velocity.y;
                    if (vy > 0.5) {
                        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.2, yaw, 0);
                        this.leftShoulder.rotation.x = -2.8;
                        this.rightShoulder.rotation.x = -2.8;
                        this.leftShoulder.rotation.z = -0.2;
                        this.rightShoulder.rotation.z = 0.2;
                        this.leftHip.rotation.x = -1.2;
                        this.rightHip.rotation.x = 0.2;
                    } else if (vy < -0.5) {
                        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
                        this.leftShoulder.rotation.x = -1.5;
                        this.rightShoulder.rotation.x = -1.5;
                        this.leftShoulder.rotation.z = -0.8;
                        this.rightShoulder.rotation.z = 0.8;
                        this.leftHip.rotation.x = -0.4;
                        this.rightHip.rotation.x = -0.4;
                    } else {
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
                // 地面行走
                this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, yaw, 0);
                this.leftShoulder.rotation.x = angle * amp;
                this.rightShoulder.rotation.x = -angle * amp;
                this.leftHip.rotation.x = -angle * amp;
                this.rightHip.rotation.x = angle * amp;
                this.leftShoulder.rotation.z = 0;
                this.rightShoulder.rotation.z = 0;
            }
        } else {
            // 停止状态
            if (!isGrounded) {
                const ds = 0.003;
                this.walkTime += dt * 1000 * ds;
                const ang = Math.sin(this.walkTime);

                if (isSprinting) {
                    // 空中悬停
                    this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(-0.1, yaw, 0);
                    this.modelRoot.position.y = -1.2 + ang * 0.08;
                    this.leftShoulder.rotation.x = 0.0 + ang * 0.05;
                    this.rightShoulder.rotation.x = 0.0 + ang * 0.05;
                    this.leftShoulder.rotation.z = 0.8 + ang * 0.05;
                    this.rightShoulder.rotation.z = -0.8 - ang * 0.05;
                    this.leftHip.rotation.x = 0.1 + ang * 0.05;
                    this.rightHip.rotation.x = 0.05 - ang * 0.05;
                } else {
                    // 普通下落/跳跃静止
                    const vy = velocity.y;
                    this.modelRoot.position.y = -1.2;

                    if (vy > 0.5) {
                        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
                        this.leftShoulder.rotation.x = -2.8;
                        this.rightShoulder.rotation.x = -2.8;
                        this.leftShoulder.rotation.z = -0.1;
                        this.rightShoulder.rotation.z = 0.1;
                        this.leftHip.rotation.x = -1.0;
                        this.rightHip.rotation.x = -1.0;
                    } else if (vy < -0.5) {
                        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
                        this.leftShoulder.rotation.x = -1.8 + ang * 0.1;
                        this.rightShoulder.rotation.x = -1.8 - ang * 0.1;
                        this.leftShoulder.rotation.z = -0.5;
                        this.rightShoulder.rotation.z = 0.5;
                        this.leftHip.rotation.x = 0.0;
                        this.rightHip.rotation.x = 0.0;
                    } else {
                        this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0.0, yaw, 0);
                        this.leftShoulder.rotation.x = -0.5;
                        this.rightShoulder.rotation.x = -0.5;
                        this.leftHip.rotation.x = -0.2;
                        this.rightHip.rotation.x = -0.2;
                    }
                }
            } else {
                // 地面静止
                this.walkTime = 0;
                this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, yaw, 0);
                this.modelRoot.position.y = -1.2;
                this.leftShoulder.rotation.x = 0;
                this.rightShoulder.rotation.x = 0;
                this.leftHip.rotation.x = 0;
                this.rightHip.rotation.x = 0;
                this.leftShoulder.rotation.z = 0;
                this.rightShoulder.rotation.z = 0;
            }
        }
    }

    /**
     * 设置骑乘姿势
     */
    setRidingPose() {
        this.modelRoot.rotationQuaternion = Quaternion.Identity();
        this.modelRoot.position.y = -1.0;

        this.leftHip.rotation.x = -1.5;
        this.leftHip.rotation.z = -0.5;
        this.rightHip.rotation.x = -1.5;
        this.rightHip.rotation.z = 0.5;

        this.leftShoulder.rotation.x = -0.8;
        this.rightShoulder.rotation.x = -0.8;
    }

    /**
     * 恢复默认姿势
     */
    resetPose() {
        this.modelRoot.position.y = -1.2;
        this.leftHip.rotation.x = 0;
        this.leftHip.rotation.z = 0;
        this.rightHip.rotation.x = 0;
        this.rightHip.rotation.z = 0;
        this.leftShoulder.rotation.x = 0;
        this.rightShoulder.rotation.x = 0;
    }

    /**
     * 更新持枪姿势（双臂姿态等）
     */
    updateGunPose() {
        // Right arm aims forward
        this.rightShoulder.rotation.x = -Math.PI / 2;
        this.rightShoulder.rotation.y = 0;
        this.rightShoulder.rotation.z = 0;

        // Left arm holds the gun body
        this.leftShoulder.rotation.x = -Math.PI / 2;
        this.leftShoulder.rotation.y = 0.5; // Inward
        this.leftShoulder.rotation.z = 0;
    }
}
