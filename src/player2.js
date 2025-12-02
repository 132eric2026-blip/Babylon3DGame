import { Vector3, Quaternion, Matrix, ActionManager, KeyboardEventTypes, Ray } from "@babylonjs/core";
import { BoxMan } from "./characters/boxMan/BoxMan";
import { Config } from "./config";

export class Player2 {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // 实例化 BoxMan
        this.boxMan = new BoxMan(scene, new Vector3(5, 5, 5));
        
        // 引用 BoxMan 的组件
        this.mesh = this.boxMan.mesh;
        this.aggregate = this.boxMan.aggregate;
        this.modelRoot = this.boxMan.modelRoot;
        
        // 动画相关引用
        this.leftHip = this.boxMan.leftHip;
        this.rightHip = this.boxMan.rightHip;
        this.leftShoulder = this.boxMan.leftShoulder;
        this.rightShoulder = this.boxMan.rightShoulder;

        this.inputMap = {};
        this.walkTime = 0;
        this.isSprinting = false;
        this.isBoosterActive = false;
        this._groundEpsilon = 0.06;
        
        this.setupInputs();
        this.registerBeforeRender();
        
        // 让相机跟随
        this.camera.lockedTarget = this.mesh;
    }

    setupInputs() {
        this.scene.actionManager = this.scene.actionManager || new ActionManager(this.scene);

        this.scene.onKeyboardObservable.add((kbInfo) => {
            const evt = kbInfo.event;
            if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
                if (evt.key.toLowerCase() === "q" && !this.inputMap["q"]) {
                    this.isBoosterActive = !this.isBoosterActive;
                    if (this.isBoosterActive) {
                        if (this.isGrounded()) {
                            this.boosterMode = "ground";
                        } else {
                            this.boosterMode = "air";
                            this.holdY = this.mesh.position.y;
                        }
                    }
                }
                this.inputMap[evt.key.toLowerCase()] = true;
                if (evt.key.toLowerCase() === "shift") {
                    this.isSprinting = true;
                }
            } else {
                this.inputMap[evt.key.toLowerCase()] = false;
                if (evt.key.toLowerCase() === "shift") {
                    this.isSprinting = false;
                }
            }
        });
    }

    registerBeforeRender() {
        this.scene.registerBeforeRender(() => {
            this.updateMovement();

            if (this.boxMan && this.boxMan.updateBoosterEffect) {
                this.boxMan.updateBoosterEffect(this.isBoosterActive);
            }

            this.animate();
        });
    }

    updateMovement() {
        if (!this.mesh || !this.aggregate) return;

        let speed = this.isSprinting ? Config.player2.sprintSpeed : Config.player2.speed;
        if (this.isBoosterActive) {
            speed = Config.player2.boosterSpeed;
        }
        
        const velocity = this.aggregate.body.getLinearVelocity();
        
        // 获取相机方向（忽略Y轴）
        const cameraForward = this.camera.getDirection(Vector3.Forward());
        cameraForward.y = 0;
        cameraForward.normalize();
        
        const cameraRight = this.camera.getDirection(Vector3.Right());
        cameraRight.y = 0;
        cameraRight.normalize();

        let moveDir = Vector3.Zero();

        if (this.inputMap["w"]) {
            moveDir.addInPlace(cameraForward);
        }
        if (this.inputMap["s"]) {
            moveDir.subtractInPlace(cameraForward);
        }
        if (this.inputMap["a"]) {
            moveDir.subtractInPlace(cameraRight);
        }
        if (this.inputMap["d"]) {
            moveDir.addInPlace(cameraRight);
        }

        if (moveDir.length() > 0) {
            moveDir.normalize();
            
            // 设置速度
            this.aggregate.body.setLinearVelocity(new Vector3(
                moveDir.x * speed,
                velocity.y, // 保持原有的垂直速度（重力）
                moveDir.z * speed
            ));

            // 旋转模型朝向移动方向
            const targetRotation = Math.atan2(moveDir.x, moveDir.z);
            // 平滑旋转
            const currentRotationQuaternion = this.modelRoot.rotationQuaternion || Quaternion.FromEulerVector(this.modelRoot.rotation);
            const targetRotationQuaternion = Quaternion.FromEulerAngles(0, targetRotation, 0);
            this.modelRoot.rotationQuaternion = Quaternion.Slerp(currentRotationQuaternion, targetRotationQuaternion, 0.1);
        } else {
            // 停止水平移动
            this.aggregate.body.setLinearVelocity(new Vector3(0, velocity.y, 0));
        }

        // 跳跃 / 飞行 / 悬浮
        if (this.inputMap[" "]) {
            if (this.isBoosterActive) {
                // 助推器飞行模式
                const v = this.aggregate.body.getLinearVelocity();
                // 限制上升速度，避免无限加速
                const upSpeed = Config.player2.boosterUpSpeed; 
                if (v.y < upSpeed) {
                    this.aggregate.body.setLinearVelocity(new Vector3(v.x, upSpeed, v.z));
                }
                // 飞行时，如果是air模式，更新holdY，以便松开空格时悬停在当前高度
                if (this.boosterMode === "air") {
                    this.holdY = this.mesh.position.y;
                }
            } else if (this.isGrounded()) {
                // 普通跳跃
                const v = this.aggregate.body.getLinearVelocity();
                this.aggregate.body.setLinearVelocity(new Vector3(v.x, Config.player2.jumpSpeed, v.z));
            }
        } else if (this.isBoosterActive) {
            // 助推器悬浮 (未按跳跃键时)
            
            if (this.boosterMode === "air") {
                // 空中启动模式：在当前高度悬浮 (抵消重力 + 维持高度)
                const v = this.aggregate.body.getLinearVelocity();
                const currentY = this.mesh.position.y;
                
                // 如果当前Y低于目标Y太多，施加向上速度
                // 如果当前Y高于目标Y，我们也可以施加向下速度或者让重力起作用，
                // 但为了"悬浮"，最好是双向控制
                const error = this.holdY - currentY;
                
                // P控制
                let vy = error * 5; 
                
                // 限制最大垂直修正速度
                vy = Math.max(-5, Math.min(vy, 5));

                // 设置速度，覆盖重力
                this.aggregate.body.setLinearVelocity(new Vector3(v.x, vy, v.z));

            } else {
                // 地面启动模式：维持相对地面高度 (现有逻辑)
                const hoverHeight = Config.player2.boosterHoverHeight;
                // 射线检测下方距离
                const ray = new Ray(this.mesh.position, new Vector3(0, -1, 0), hoverHeight + 5);
                const pick = this.scene.pickWithRay(ray, (mesh) => {
                    return mesh !== this.mesh && !mesh.isDescendantOf(this.mesh) && mesh.isPickable;
                });
    
                if (pick.hit) {
                    // 计算离地高度 (mesh中心到地面的距离)
                    const currentDist = pick.distance;
                    // 目标距离 = 悬浮高度 + 1 (假设中心高度为1)
                    const targetDist = hoverHeight + 1;
                    
                    if (currentDist < targetDist) {
                        // 低于悬浮高度，施加向上速度
                        const v = this.aggregate.body.getLinearVelocity();
                        const error = targetDist - currentDist;
                        // 简单的P控制
                        const liftSpeed = error * 3; 
                        const finalUpSpeed = Math.min(liftSpeed, 5);
                        
                        if (v.y < finalUpSpeed) {
                             this.aggregate.body.setLinearVelocity(new Vector3(v.x, finalUpSpeed, v.z));
                        }
                    }
                }
            }
        }
    }

    isGrounded() {
        // 简单的射线检测判断是否在地面
        // 玩家高度为 2，所以中心到底部是 1
        // 我们投射一条长度为 1.1 的射线，以允许小的浮点误差（epsilon）
        const rayLength = 1.1;
        const ray = new Ray(this.mesh.position, new Vector3(0, -1, 0), rayLength);
        
        const pick = this.scene.pickWithRay(ray, (mesh) => {
            return mesh !== this.mesh && !mesh.isDescendantOf(this.mesh) && mesh.isPickable;
        });
        
        // 也保留 Y=0 检查，以防地面网格缺失或不可拾取
        let minY = 0;
        if (this.mesh.getBoundingInfo()) {
            minY = this.mesh.getBoundingInfo().boundingBox.minimumWorld.y;
        }
        return pick.hit || (minY <= this._groundEpsilon);
    }

    animate() {
        if (!this.mesh || !this.aggregate) return;
        
        const velocity = this.aggregate.body.getLinearVelocity();
        const isGrounded = this.isGrounded();
        const dt = this.scene.getEngine().getDeltaTime();
        
        // Get current yaw
        let yaw = 0;
        if (this.modelRoot.rotationQuaternion) {
            yaw = this.modelRoot.rotationQuaternion.toEulerAngles().y;
        } else {
            yaw = this.modelRoot.rotation.y;
        }

        // Check if moving
        let isMoving = this.inputMap["w"] || this.inputMap["s"] || this.inputMap["a"] || this.inputMap["d"];

        // Update walkTime
        if (isMoving) {
            const curSpeed = this.isSprinting ? Config.player2.sprintSpeed : Config.player2.speed;
            const dtScale = this.isSprinting ? 0.018 : 0.01;
            this.walkTime += dt * dtScale * (curSpeed / 5);
        } else {
            const ds = 0.003;
            this.walkTime += dt * ds;
        }
        
        const angle = Math.sin(this.walkTime);

        if (this.isBoosterActive) {
             // 助推器模式动画
            if (isMoving) {
                // 飞行姿态
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
            } else {
                // 悬浮姿态
                this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(-0.1, yaw, 0);
                this.modelRoot.position.y = -1.2 + angle * 0.08;
                if (this.leftShoulder) { this.leftShoulder.rotation.x = 0.0 + angle * 0.05; this.leftShoulder.rotation.z = 0.8 + angle * 0.05; }
                if (this.rightShoulder) { this.rightShoulder.rotation.x = 0.0 + angle * 0.05; this.rightShoulder.rotation.z = -0.8 - angle * 0.05; }
                if (this.leftHip) this.leftHip.rotation.x = 0.1 + angle * 0.05;
                if (this.rightHip) this.rightHip.rotation.x = 0.05 - angle * 0.05;
            }
            return;
        }

        if (!isGrounded) {
            // Air Animation
            if (isMoving) {
                if (this.isSprinting) {
                    // Superhero Flight
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
                } else {
                    // Moving Jump (Standard)
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
            } else {
                // Stationary Jump / Hover
                if (this.isSprinting) {
                    // Zero Gravity Float
                    this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(-0.1, yaw, 0);
                    this.modelRoot.position.y = -1.2 + angle * 0.08;
                    if (this.leftShoulder) { this.leftShoulder.rotation.x = 0.0 + angle * 0.05; this.leftShoulder.rotation.z = 0.8 + angle * 0.05; }
                    if (this.rightShoulder) { this.rightShoulder.rotation.x = 0.0 + angle * 0.05; this.rightShoulder.rotation.z = -0.8 - angle * 0.05; }
                    if (this.leftHip) this.leftHip.rotation.x = 0.1 + angle * 0.05;
                    if (this.rightHip) this.rightHip.rotation.x = 0.05 - angle * 0.05;
                } else {
                    // Standard Stationary Jump
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
            }
        } else {
            // Grounded Logic
            this.modelRoot.position.y = -1.2;
            this.modelRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, yaw, 0);

            if (isMoving) {
                // Walking Animation
                const amp = this.isSprinting ? 1.2 : 0.8;
                
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
            } else {
                // Idle
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
    }
}
