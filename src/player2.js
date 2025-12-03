import { Vector3, Quaternion, Matrix, ActionManager, KeyboardEventTypes, Ray, TransformNode, MeshBuilder, StandardMaterial, Color3, Texture, ParticleSystem, Color4, PointerEventTypes, TrailMesh, GlowLayer } from "@babylonjs/core";
import { BoxMan } from "./characters/boxMan";
//import { CyberpunkMan } from "./characters/cyberpunkMan";
//import { SphereGirl } from "./characters/sphereGirl";
import { VoxelKnight } from "./characters/voxelKnight";
import { Config } from "./config";
import { createSolarPlasmaCannonMesh, spawnSolarPlasmaCannon, getSolarPlasmaCannonIcon } from "./equipment/weapons/ranged/SolarPlasmaCannon";
import { BackpackUI } from "./ui/BackpackUI";

export class Player2 {
    constructor(scene, camera, glowLayer = null) {
        this.scene = scene;
        this.camera = camera;
        this.glowLayer = glowLayer;

        // 实例化角色，根据配置选择
        if (Config.selectCharacters === "voxelKnight") {
            this.boxMan = new VoxelKnight(scene, new Vector3(5, 5, 5), this.glowLayer);
        } else {
            this.boxMan = new BoxMan(scene, new Vector3(5, 5, 5), this.glowLayer);
        }

        // 引用角色的组件
        this.mesh = this.boxMan.mesh;
        this.aggregate = this.boxMan.aggregate;
        this.modelRoot = this.boxMan.modelRoot;
        // 需要获取右臂来挂载武器，这里假设 boxMan 和 voxelKnight 都有 rightArm 或者 rightShoulder 结构
        // 如果没有直接暴露，可能需要 traverse 或者在 character 类中暴露
        // BoxMan 中有 rightShoulder, rightArm 挂在下面
        // VoxelKnight 结构可能不同，先尝试兼容 BoxMan
        if (this.boxMan.rightShoulder) {
             this.rightArm = this.boxMan.rightShoulder.getChildMeshes()[0];
        }
        // 如果找不到，就挂在 modelRoot 下作为备选
        if (!this.rightArm) {
            this.rightArm = this.modelRoot;
        }


        // 确保boxMan已经准备好
        if (this.boxMan.mesh) {
            this.mesh = this.boxMan.mesh;
            this.aggregate = this.boxMan.aggregate;
            this.modelRoot = this.boxMan.modelRoot;
        }

        this.inputMap = {};
        this.isSprinting = false;
        this.isBoosterActive = false;
        this._groundEpsilon = 0.06;
        // Z键按压状态
        this.isZPressed = false;
        
        // 初始化背包数据
        this.inventory = new Array(20).fill(null);
        // 第一个格子放入 SolarPlasmaCannon
        this.inventory[0] = {
            id: "SolarPlasmaCannon",
            name: "SolarPlasmaCannon",
            type: "gun",
            icon: getSolarPlasmaCannonIcon()
        };

        this.backpackUI = new BackpackUI(scene, this);
        this.backpackUI.updateDisplay(this.inventory);

        this.setupInputs();
        this.setupGun(); // 初始化武器系统
        this.registerBeforeRender();

        // 让相机跟随
        this.camera.lockedTarget = this.mesh;
    }

    // 装备物品的方法 (供 BackpackUI 调用)
    equipItem(item) {
        if (item.type === "gun") {
            if (this.currentWeapon === item.id) {
                // 如果已经装备，则卸下 (可选逻辑，这里暂不卸下)
                // this.unequipWeapon(); 
                return;
            }
            this.equipWeaponVisuals(item.id);
            this.setGunVisibility(true);
            this.isHoldingGun = true;
            this.currentWeapon = item.id;
        }
    }

    unequipWeapon() {
        this.setGunVisibility(false);
        this.isHoldingGun = false;
        this.currentWeapon = null;
        if (this.currentGunModel) {
            this.currentGunModel.dispose();
            this.currentGunModel = null;
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
        this.gunRoot.parent = this.rightArm;

        // Adjust position to be in hand
        this.gunRoot.position = new Vector3(0, -0.3, 0.1);
        this.gunRoot.rotation.x = Math.PI / 2; // Point forward (Aligned with raised arm)
        this.gunRoot.isVisible = false;

        // Muzzle Point (Placeholder, updated in equipWeaponVisuals)
        this.gunMuzzle = new TransformNode("gunMuzzle", this.scene);
        this.gunMuzzle.parent = this.gunRoot;
        this.gunMuzzle.position.z = 0.8;

        // Setup Particle Texture for Muzzle Flash
        this.particleTexture = this.createParticleTexture();

        // Setup Persistent Muzzle Flash System
        this.setupMuzzleFlash();

        // Initialize with NO weapon (User request)
        // this.equipWeaponVisuals("SolarPlasmaCannon");
        this.setGunVisibility(false); // 默认不显示
        this.isHoldingGun = false;
        this.currentWeapon = null;
    }

    equipWeaponVisuals(weaponName) {
        // Dispose old model
        if (this.currentGunModel) {
            this.currentGunModel.dispose();
            this.currentGunModel = null;
        }

        // Create new model based on weapon
        if (weaponName === "SolarPlasmaCannon") {
            this.currentGunModel = createSolarPlasmaCannonMesh(this.scene);
            this.currentGunModel.parent = this.gunRoot;
            this.currentGunModel.rotation = Vector3.Zero();

            // Adjust position for holding
            // Gun is stout.
            this.gunMuzzle.position = new Vector3(0, 0, 0.8);
        }
        
        // Re-attach muzzle flash to new muzzle position (it follows transform node)
        if (this.muzzleFlashPS) {
            this.muzzleFlashPS.emitter = this.gunMuzzle;
        }
    }

    setGunVisibility(visible) {
        if (this.gunRoot) {
            this.gunRoot.setEnabled(visible);
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
        
        this.muzzleFlashPS = ps;
        this.muzzleFlashPS.start();
    }

    updateBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.life -= dt;

            if (b.hasGravity) {
                b.velocity.y -= 9.81 * dt;
            }

            b.mesh.position.addInPlace(b.velocity.scale(dt));

            if (b.mesh.position.y < -10 || b.life <= 0) {
                b.mesh.dispose();
                if (b.trail) b.trail.dispose();
                if (b.particleSystem) {
                    b.particleSystem.stop();
                    b.particleSystem.dispose();
                }
                if (b.particleSystems) {
                    b.particleSystems.forEach(ps => {
                        ps.stop();
                        ps.dispose();
                    });
                }
                if (b.glowLayer) {
                    b.glowLayer.dispose();
                }
                this.bullets.splice(i, 1);
            }
        }
    }

    fireWeapon() {
        if (!this.currentWeapon) return;

        // Muzzle Flash
        if (this.muzzleFlashPS) {
            this.muzzleFlashPS.manualEmitCount = 15;
            // Solar Plasma Cannon colors
            this.muzzleFlashPS.color1 = new Color4(1, 0.5, 0, 1); // Orange
            this.muzzleFlashPS.color2 = new Color4(1, 0, 1, 1); // Purple
            this.muzzleFlashPS.start();
        }

        const origin = this.gunMuzzle.getAbsolutePosition();
        const direction = origin.subtract(this.gunRoot.getAbsolutePosition()).normalize();

        if (this.currentWeapon === "SolarPlasmaCannon") {
            let bulletMesh;
            let bulletData = {
                life: 2.0,
                velocity: direction.scale(60)
            };

            // --- SOLAR PLASMA CANNON (MAGIC ORB) ---
            // 1. Projectile: Purple Magic Orb
            bulletMesh = MeshBuilder.CreateSphere("plasmaBall", { diameter: 0.8, segments: 32 }, this.scene);
            bulletMesh.position = origin.clone();

            const plasmaMat = new StandardMaterial("plasmaMat", this.scene);
            plasmaMat.emissiveColor = new Color3(0.7, 0.2, 1.0); // Bright Purple Core
            plasmaMat.diffuseColor = new Color3(0.5, 0.1, 0.8); // Deep Purple
            plasmaMat.specularColor = new Color3(0.9, 0.5, 1.0); // Purple specular
            plasmaMat.emissiveIntensity = 1.5; // Boost emissive
            plasmaMat.disableLighting = true;
            bulletMesh.material = plasmaMat;

            // 2. Glow Effect
            const glowLayer = new GlowLayer("plasmaGlow_" + Date.now(), this.scene);
            glowLayer.intensity = 1.2;
            glowLayer.addIncludedOnlyMesh(bulletMesh);
            bulletData.glowLayer = glowLayer;

            // 3. Particle Systems
            bulletData.particleSystems = [];

            // A. Inner Core
            const psCore = new ParticleSystem("plasmaCore", 500, this.scene);
            psCore.particleTexture = this.particleTexture;
            psCore.emitter = bulletMesh;
            psCore.createSphereEmitter(0.3);
            psCore.color1 = new Color4(0.8, 0.3, 1.0, 1.0);
            psCore.color2 = new Color4(0.6, 0.1, 0.9, 1.0);
            psCore.colorDead = new Color4(0.3, 0.0, 0.5, 0.0);
            psCore.minSize = 0.2;
            psCore.maxSize = 0.5;
            psCore.minLifeTime = 0.15;
            psCore.maxLifeTime = 0.35;
            psCore.emitRate = 400;
            psCore.blendMode = ParticleSystem.BLENDMODE_ADD;
            psCore.start();
            bulletData.particleSystems.push(psCore);

            // B. Outer Magic Vortex
            const psVortex = new ParticleSystem("plasmaVortex", 350, this.scene);
            psVortex.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
            psVortex.emitter = bulletMesh;
            psVortex.createSphereEmitter(0.5);
            psVortex.color1 = new Color4(1.0, 0.2, 1.0, 0.9);
            psVortex.color2 = new Color4(0.7, 0.4, 1.0, 0.8);
            psVortex.colorDead = new Color4(0.2, 0.0, 0.4, 0.0);
            psVortex.minSize = 0.4;
            psVortex.maxSize = 0.9;
            psVortex.minLifeTime = 0.25;
            psVortex.maxLifeTime = 0.6;
            psVortex.emitRate = 250;
            psVortex.blendMode = ParticleSystem.BLENDMODE_ADD;
            psVortex.minAngularSpeed = -Math.PI * 6;
            psVortex.maxAngularSpeed = Math.PI * 6;
            psVortex.start();
            bulletData.particleSystems.push(psVortex);

            // C. Magic Arcs
            const psArcs = new ParticleSystem("plasmaArcs", 200, this.scene);
            psArcs.particleTexture = this.particleTexture;
            psArcs.emitter = bulletMesh;
            psArcs.createSphereEmitter(0.6);
            psArcs.color1 = new Color4(0.8, 0.2, 1.0, 1.0);
            psArcs.color2 = new Color4(1.0, 0.8, 1.0, 0.9);
            psArcs.colorDead = new Color4(0.4, 0.0, 0.7, 0.0);
            psArcs.minSize = 0.15;
            psArcs.maxSize = 0.35;
            psArcs.minLifeTime = 0.1;
            psArcs.maxLifeTime = 0.3;
            psArcs.emitRate = 150;
            psArcs.blendMode = ParticleSystem.BLENDMODE_ADD;
            psArcs.start();
            bulletData.particleSystems.push(psArcs);

             // D. Trailing Magic Sparks
            const psSparks = new ParticleSystem("plasmaSparks", 250, this.scene);
            psSparks.particleTexture = this.particleTexture;
            psSparks.emitter = bulletMesh;
            psSparks.minEmitBox = new Vector3(-0.2, -0.2, -0.2);
            psSparks.maxEmitBox = new Vector3(0.2, 0.2, 0.2);
            psSparks.color1 = new Color4(0.9, 0.5, 1.0, 1.0);
            psSparks.color2 = new Color4(0.5, 0.2, 0.8, 1.0);
            psSparks.colorDead = new Color4(0.2, 0.0, 0.3, 0.0);
            psSparks.minSize = 0.08;
            psSparks.maxSize = 0.25;
            psSparks.minLifeTime = 0.3;
            psSparks.maxLifeTime = 0.7;
            psSparks.emitRate = 180;
            psSparks.blendMode = ParticleSystem.BLENDMODE_ADD;
            psSparks.gravity = new Vector3(0, -1, 0);
            psSparks.start();
            bulletData.particleSystems.push(psSparks);

            bulletData.mesh = bulletMesh;
            this.bullets.push(bulletData);
        }
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
                // Z: 切换背包显示/隐藏（不切换指针锁状态）
                if (evt.key.toLowerCase() === "tab") {
                    if (!this.isZPressed) {
                        this.isZPressed = true;
                        if (this.backpackUI.isVisible) {
                            this.backpackUI.hide();
                        } else {
                            this.backpackUI.show();
                        }
                    }
                }
            } else {
                this.inputMap[evt.key.toLowerCase()] = false;
                if (evt.key.toLowerCase() === "shift") {
                    this.isSprinting = false;
                }
                // Z Release: Reset flag only
                if (evt.key.toLowerCase() === "tab") {
                    this.isZPressed = false;
                }
            }
        });

        // 鼠标输入（射击）
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                if (pointerInfo.event.button === 0) {
                    // 允许在背包打开时射击
                    this.fireInputPressed = true;
                    this.fireWeapon();
                }
            } else if (pointerInfo.type === PointerEventTypes.POINTERUP) {
                if (pointerInfo.event.button === 0) {
                    this.fireInputPressed = false;
                }
            }
        });
    }

    registerBeforeRender() {
        this.scene.registerBeforeRender(() => {
            const dt = this.scene.getEngine().getDeltaTime() / 1000.0;
            this.updateBullets(dt);

            this.updateMovement();

            // Check if moving (horizontal or vertical)
            const isMoving = this.inputMap["w"] || this.inputMap["s"] || this.inputMap["a"] || this.inputMap["d"] || this.inputMap[" "];

            if (this.boxMan && this.boxMan.updateBoosterEffect) {
                this.boxMan.updateBoosterEffect(this.isBoosterActive, isMoving);
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
                
                // 只要按住空格上升，就切换到空中悬停模式，并记录当前高度
                this.boosterMode = "air";
                this.holdY = this.mesh.position.y;
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

        // Calculate walkTime increment
        let walkTimeIncrement = 0;
        if (isMoving) {
            const curSpeed = this.isSprinting ? Config.player2.sprintSpeed : Config.player2.speed;
            const dtScale = this.isSprinting ? 0.018 : 0.01;
            walkTimeIncrement = dt * dtScale * (curSpeed / 5);
        } else {
            const ds = 0.003;
            walkTimeIncrement = dt * ds;
        }

        // Call BoxMan animation
        if (this.boxMan && this.boxMan.updateAnimation) {
            this.boxMan.updateAnimation(dt, {
                isMoving,
                isSprinting: this.isSprinting,
                isGrounded,
                isBoosterActive: this.isBoosterActive,
                velocity,
                yaw,
                walkTimeIncrement
            });

            // Override arm rotation if holding gun
            if (this.isHoldingGun && this.boxMan && this.boxMan.rightShoulder) {
                this.boxMan.rightShoulder.rotation.x = -Math.PI / 2;
                this.boxMan.rightShoulder.rotation.z = 0;
                this.boxMan.rightShoulder.rotation.y = 0;
            }
        }
    }
}
