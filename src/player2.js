import { Vector3, Quaternion, Matrix, ActionManager, KeyboardEventTypes, Ray, TransformNode, MeshBuilder, StandardMaterial, Color3, Texture, ParticleSystem, Color4, PointerEventTypes, TrailMesh, GlowLayer } from "@babylonjs/core";
import { BoxMan } from "./characters/boxMan";
//import { CyberpunkMan } from "./characters/cyberpunkMan";
//import { SphereGirl } from "./characters/sphereGirl";
import { VoxelKnight } from "./characters/voxelKnight";
import { Config } from "./config";
import { createSolarPlasmaCannonMesh, spawnSolarPlasmaCannon, getSolarPlasmaCannonIcon } from "./equipment/weapons/ranged/SolarPlasmaCannon";
import { createCrystalVoidWandMesh, getCrystalVoidWandIcon } from "./equipment/weapons/ranged/CrystalVoidWand";
import { createForestStaffMesh, getForestStaffIcon } from "./equipment/weapons/ranged/ForestStaff";
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
        // 第二个格子放入 CrystalVoidWand
        this.inventory[1] = {
            id: "CrystalVoidWand",
            name: "CrystalVoidWand",
            type: "gun",
            icon: getCrystalVoidWandIcon()
        };
        // 第三个格子放入 ForestStaff
        this.inventory[2] = {
            id: "ForestStaff",
            name: "ForestStaff",
            type: "gun",
            icon: getForestStaffIcon()
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

        // Reset gunRoot transform to default (Gun pose) before applying specific weapon overrides
        // This ensures we have a clean slate
        this.gunRoot.position = new Vector3(0, -0.3, 0.1);
        this.gunRoot.rotation = new Vector3(Math.PI / 2, 0, 0);

        // Create new model based on weapon
        if (weaponName === "SolarPlasmaCannon") {
            this.currentGunModel = createSolarPlasmaCannonMesh(this.scene);
            this.currentGunModel.parent = this.gunRoot;
            this.currentGunModel.rotation = Vector3.Zero();

            // Adjust position for holding
            // Gun is stout.
            this.gunMuzzle.position = new Vector3(0, 0, 0.8);
        } else if (weaponName === "CrystalVoidWand") {
            this.currentGunModel = createCrystalVoidWandMesh(this.scene);
            this.currentGunModel.parent = this.gunRoot;
            this.currentGunModel.rotation = Vector3.Zero();
            
            // 魔杖调整：稍微靠前一点
            this.currentGunModel.position = new Vector3(0, 0, 0.4);
            
            // 调整枪口位置到水晶处
            this.gunMuzzle.position = new Vector3(0, 0, 1.2);

            // 魔杖专属 Grip 调整 (相对于手掌)
             // 我们希望魔杖看起来是被握在手里，但角度可以稍微不同
             // 配合向右斜伸的手臂，我们需要让魔杖指回前方 (修正 Y 旋转)
             // Arm Y rotation is approx 0.6, so we need to counter that.
             // GunRoot default rotation is (PI/2, 0, 0). 
             // adding Y rotation:
             this.gunRoot.rotation = new Vector3(Math.PI / 2, -0.6, 0);
             
             // 位置微调：因为手臂向右了，魔杖需要稍微往左(手臂本地坐标的?)移一点，或者保持在右侧
             // Arm local coords: Y is down (along arm), X/Z are cross section.
             // Actually Arm geometry is Box.
             this.gunRoot.position = new Vector3(-0.1, -0.4, 0.2); 
        } else if (weaponName === "ForestStaff") {
            this.currentGunModel = createForestStaffMesh(this.scene);
            this.currentGunModel.parent = this.gunRoot;
            
            // Forest Staff Pose: Vertical Hold (Walking Stick style)
            // We align Model Y with GunRoot Y to stand vertical
            this.currentGunModel.rotation = Vector3.Zero();
            
            // Adjust Position: Hand holds the middle
            this.currentGunModel.position = new Vector3(0, 0, 0); 
            
            // Arm is lowered to -1.0 (approx 60 deg). We rotate GunRoot to 1.0 to keep staff vertical.
            this.gunRoot.rotation = new Vector3(1.0, 0, 0);
            this.gunRoot.position = new Vector3(0.1, -0.4, 0.2); // Hold in hand
            
            // Muzzle: Top of the staff (Magic comes from the tip)
            this.gunMuzzle.position = new Vector3(0, 1.2, 0); 
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
            if (this.currentWeapon === "CrystalVoidWand") {
                // Cyan/Blue for Wand
                this.muzzleFlashPS.color1 = new Color4(0, 1, 1, 1); 
                this.muzzleFlashPS.color2 = new Color4(0, 0.5, 1, 1);
            } else if (this.currentWeapon === "ForestStaff") {
                // Green/Yellow for Forest Staff
                this.muzzleFlashPS.color1 = new Color4(0.2, 1, 0.2, 1);
                this.muzzleFlashPS.color2 = new Color4(1, 1, 0.5, 1);
            } else {
                // Default (Solar Plasma Cannon) colors
                this.muzzleFlashPS.color1 = new Color4(1, 0.5, 0, 1); // Orange
                this.muzzleFlashPS.color2 = new Color4(1, 0, 1, 1); // Purple
            }
            this.muzzleFlashPS.start();
        }

        const origin = this.gunMuzzle.getAbsolutePosition();
        let direction;
        
        if (this.currentWeapon === "ForestStaff") {
            // Staff is held vertically, but magic shoots towards camera aim
            direction = this.camera.getForwardRay().direction;
        } else {
            // Guns/Wands pointing forward shoot along their barrel
            direction = origin.subtract(this.gunRoot.getAbsolutePosition()).normalize();
        }

        let bulletMesh;
        let bulletData = {
            life: 2.0,
            velocity: direction.scale(60)
        };

        if (this.currentWeapon === "SolarPlasmaCannon") {
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

        } else if (this.currentWeapon === "CrystalVoidWand") {
             // --- CRYSTAL VOID WAND (CRYSTAL SHARDS) ---
             bulletData.life = 3.0; // 射程更远
             bulletData.velocity = direction.scale(40); // 速度稍慢
 
             // 1. Projectile: Cyan Crystal Shard
             bulletMesh = MeshBuilder.CreatePolyhedron("crystalShard", { type: 2, size: 0.3 }, this.scene);
             bulletMesh.position = origin.clone();
             
             const crystalMat = new StandardMaterial("shardMat", this.scene);
             crystalMat.emissiveColor = new Color3(0.2, 0.8, 1.0); 
             crystalMat.diffuseColor = new Color3(0.0, 0.6, 0.9);
             crystalMat.disableLighting = true;
             bulletMesh.material = crystalMat;
             
             // 2. Glow
              const glowLayer = new GlowLayer("shardGlow_" + Date.now(), this.scene);
             glowLayer.intensity = 1.5;
             glowLayer.addIncludedOnlyMesh(bulletMesh);
             bulletData.glowLayer = glowLayer;
 
             // 3. Particle Systems
             bulletData.particleSystems = [];
             
             // Trail
             const psTrail = new ParticleSystem("shardTrail", 200, this.scene);
             psTrail.particleTexture = this.particleTexture;
             psTrail.emitter = bulletMesh;
             psTrail.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
             psTrail.maxEmitBox = new Vector3(0.1, 0.1, 0.1);
             psTrail.color1 = new Color4(0.0, 1.0, 1.0, 1.0);
             psTrail.color2 = new Color4(0.0, 0.5, 1.0, 0.5);
             psTrail.colorDead = new Color4(0, 0, 0.2, 0.0);
             psTrail.minSize = 0.1;
             psTrail.maxSize = 0.3;
             psTrail.minLifeTime = 0.2;
             psTrail.maxLifeTime = 0.5;
             psTrail.emitRate = 100;
             psTrail.start();
             bulletData.particleSystems.push(psTrail);
 
             bulletData.mesh = bulletMesh;
             this.bullets.push(bulletData);
        } else if (this.currentWeapon === "ForestStaff") {
            // --- FOREST STAFF (NATURE ORB) ---
            // Projectile: Green glowing sphere
            bulletMesh = MeshBuilder.CreateSphere("natureOrb", { diameter: 0.6 }, this.scene);
            bulletMesh.position = origin.clone();
            
            const natureMat = new StandardMaterial("natureMat", this.scene);
            natureMat.emissiveColor = new Color3(0.2, 1.0, 0.2);
            natureMat.disableLighting = true;
            bulletMesh.material = natureMat;
            
            bulletData.particleSystems = [];
            
            // 1. Core Glow
            const psGlow = new ParticleSystem("natureGlow", 100, this.scene);
            psGlow.particleTexture = this.particleTexture;
            psGlow.emitter = bulletMesh;
            psGlow.createSphereEmitter(0.4);
            psGlow.color1 = new Color4(0.2, 1.0, 0.2, 1.0);
            psGlow.color2 = new Color4(0.8, 1.0, 0.4, 1.0);
            psGlow.colorDead = new Color4(0, 0.5, 0, 0);
            psGlow.minSize = 0.2;
            psGlow.maxSize = 0.5;
            psGlow.minLifeTime = 0.2;
            psGlow.maxLifeTime = 0.4;
            psGlow.emitRate = 100;
            psGlow.blendMode = ParticleSystem.BLENDMODE_ADD;
            psGlow.start();
            bulletData.particleSystems.push(psGlow);
            
            // 2. Leaf Trail (Falling particles)
            const psLeaves = new ParticleSystem("natureLeaves", 200, this.scene);
            // Use cloud texture if available or default with color
            psLeaves.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene); 
            psLeaves.emitter = bulletMesh;
            psLeaves.minEmitBox = new Vector3(-0.2, -0.2, -0.2);
            psLeaves.maxEmitBox = new Vector3(0.2, 0.2, 0.2);
            
            psLeaves.color1 = new Color4(0.2, 0.8, 0.2, 1.0); // Green
            psLeaves.color2 = new Color4(0.8, 0.8, 0.2, 1.0); // Yellow-Green
            psLeaves.colorDead = new Color4(0.2, 0.4, 0.1, 0);
            
            psLeaves.minSize = 0.1;
            psLeaves.maxSize = 0.2;
            psLeaves.minLifeTime = 0.5;
            psLeaves.maxLifeTime = 1.0;
            psLeaves.emitRate = 80;
            psLeaves.gravity = new Vector3(0, -2, 0); // Leaves fall
            psLeaves.minAngularSpeed = 0;
            psLeaves.maxAngularSpeed = Math.PI;
            psLeaves.blendMode = ParticleSystem.BLENDMODE_STANDARD;
            psLeaves.start();
            bulletData.particleSystems.push(psLeaves);
            
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
                this.updateCameraDragButtons();
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
                this.updateCameraDragButtons();
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
                    // 如果点击在背包UI内，则不触发射击
                    if (this.backpackUI && this.backpackUI.isInsideUI(this.scene.pointerX, this.scene.pointerY)) {
                        return;
                    }

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

    updateCameraDragButtons() {
        const moving = this.inputMap["w"] || this.inputMap["a"] || this.inputMap["s"] || this.inputMap["d"];
        const pointers = this.camera && this.camera.inputs && this.camera.inputs.attached && this.camera.inputs.attached.pointers;
        if (!pointers) return;
        pointers.buttons = moving ? [2] : [0, 2];
    }

    updateMovement() {
        if (!this.mesh || !this.aggregate) return;

        let speed = this.isSprinting ? Config.player2.sprintSpeed : Config.player2.speed;
        if (this.isBoosterActive) {
            speed = Config.player2.boosterSpeed;
        }

        const velocity = this.aggregate.body.getLinearVelocity();

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

            this.aggregate.body.setLinearVelocity(new Vector3(
                moveDir.x * speed,
                velocity.y,
                moveDir.z * speed
            ));

            const targetRotation = Math.atan2(moveDir.x, moveDir.z);
            const currentRotationQuaternion = this.modelRoot.rotationQuaternion || Quaternion.FromEulerVector(this.modelRoot.rotation);
            const targetRotationQuaternion = Quaternion.FromEulerAngles(0, targetRotation, 0);
            this.modelRoot.rotationQuaternion = Quaternion.Slerp(currentRotationQuaternion, targetRotationQuaternion, 0.1);
        } else {
            this.aggregate.body.setLinearVelocity(new Vector3(0, velocity.y, 0));
        }

        if (this.inputMap[" "]) {
            if (this.isBoosterActive) {
                const v = this.aggregate.body.getLinearVelocity();
                const upSpeed = Config.player2.boosterUpSpeed;
                if (v.y < upSpeed) {
                    this.aggregate.body.setLinearVelocity(new Vector3(v.x, upSpeed, v.z));
                }
                this.boosterMode = "air";
                this.holdY = this.mesh.position.y;
            } else if (this.isGrounded()) {
                const v = this.aggregate.body.getLinearVelocity();
                this.aggregate.body.setLinearVelocity(new Vector3(v.x, Config.player2.jumpSpeed, v.z));
            }
        } else if (this.isBoosterActive) {
            if (this.boosterMode === "air") {
                const v = this.aggregate.body.getLinearVelocity();
                const currentY = this.mesh.position.y;

                const error = this.holdY - currentY;
                let vy = error * 5;
                vy = Math.max(-5, Math.min(vy, 5));

                this.aggregate.body.setLinearVelocity(new Vector3(v.x, vy, v.z));
            } else {
                const hoverHeight = Config.player2.boosterHoverHeight;
                const ray = new Ray(this.mesh.position, new Vector3(0, -1, 0), hoverHeight + 5);
                const pick = this.scene.pickWithRay(ray, (mesh) => {
                    return mesh !== this.mesh && !mesh.isDescendantOf(this.mesh) && mesh.isPickable;
                });

                if (pick.hit) {
                    const currentDist = pick.distance;
                    const targetDist = hoverHeight + 1;

                    if (currentDist < targetDist) {
                        const v = this.aggregate.body.getLinearVelocity();
                        const error = targetDist - currentDist;
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
                if (this.currentWeapon === "CrystalVoidWand") {
                    // 魔杖姿势：更自然的战斗法师姿态
                    // 手臂不完全平举，而是稍微向右打开 (Y轴旋转)，显得更自信/随意
                    // x: -1.5 (接近水平，指向前方)
                    // y: 0.6 (向右偏约 35 度)
                    // z: 0.0
                    this.boxMan.rightShoulder.rotation.x = -1.5;
                    this.boxMan.rightShoulder.rotation.y = 0.6;
                    this.boxMan.rightShoulder.rotation.z = 0.0;
                } else if (this.currentWeapon === "ForestStaff") {
                    // 森林法杖姿势：手持手杖 (稍微降低手臂，不完全水平)
                    // x: -1.0 (约60度下垂)
                    // y: 0
                    // z: 0
                    this.boxMan.rightShoulder.rotation.x = -1.0;
                    this.boxMan.rightShoulder.rotation.y = 0.0;
                    this.boxMan.rightShoulder.rotation.z = 0.0;
                } else {
                    // 默认枪械姿势：平举
                    this.boxMan.rightShoulder.rotation.x = -Math.PI / 2;
                    this.boxMan.rightShoulder.rotation.z = 0;
                    this.boxMan.rightShoulder.rotation.y = 0;
                }
            }
        }
    }
}
