import { 
    Vector3, 
    MeshBuilder, 
    StandardMaterial, 
    Color3, 
    Color4, 
    ParticleSystem, 
    GPUParticleSystem,
    Texture, 
    TransformNode, 
    Mesh, 
    PointLight,
    Animation,
    Ray,
    Quaternion
} from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

/**
 * 凤凰射线技能
 * 按住鼠标中键持续释放烈焰射线
 */
export class PhoenixRay extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "凤凰射线", 0.1); // 短冷却，因为是持续释放
        
        this.isChanneling = false;
        this.rayMesh = null;
        this.rayLight = null;
        this.particleSystems = [];
        this.rayLength = 20; // 射线长度
        this.rayRadius = 0.2; // 射线半径
    }

    /**
     * 开始引导技能（按下按键）
     */
    startChanneling() {
        if (this.isChanneling) return;
        this.isChanneling = true;
        
        // 创建视觉效果
        this.createVisuals();
        
        // 播放施法动画
        this.playCastAnimation();
    }

    start() {
        this.startChanneling();
    }

    /**
     * 停止引导技能（松开按键）
     */
    stopChanneling() {
        if (!this.isChanneling) return;
        this.isChanneling = false;
        
        // 清理视觉效果
        this.cleanupVisuals();
        
        // 恢复姿势
        this.restoreCastPose();
    }

    stop() {
        this.stopChanneling();
    }

    /**
     * 每帧更新
     */
    update(deltaTime) {
        super.update(deltaTime);

        if (this.isChanneling) {
            this.updateVisuals();
            this.checkCollisions();
            
            // 消耗能量或产生热量等逻辑可在此添加
        }
    }

    /**
     * 创建视觉效果
     */
    createVisuals() {
        const scene = this.scene;
        
        // 创建射线根节点，方便统一管理位置
        this.rootNode = new TransformNode("phoenixRayRoot", scene);
        this.updateRootTransform(); // 初始化位置

        // 1. 核心射线模型 (发光的圆柱体)
        this.rayMesh = MeshBuilder.CreateCylinder("phoenixRayCore", {
            height: this.rayLength,
            diameter: this.rayRadius * 2,
            tessellation: 16
        }, scene);
        this.rayMesh.parent = this.rootNode;
        // 圆柱体默认是Y轴朝向，我们需要让它沿着Z轴（前方）
        // 但为了简单，我们让根节点朝向玩家前方，圆柱体旋转90度横躺
        this.rayMesh.rotation.x = Math.PI / 2;
        this.rayMesh.position.z = this.rayLength / 2; // 让射线的起点在根节点位置

        // 射线材质
        const rayMat = new StandardMaterial("phoenixRayMat", scene);
        rayMat.emissiveColor = new Color3(1.0, 0.5, 0.0); // 橙红色发光
        rayMat.diffuseColor = new Color3(1.0, 0.2, 0.0);
        rayMat.alpha = 0.6;
        rayMat.disableLighting = true; // 自发光，不受光照影响
        this.rayMesh.material = rayMat;

        // 2. 内部更亮的细光束
        this.innerRayMesh = MeshBuilder.CreateCylinder("phoenixRayInner", {
            height: this.rayLength,
            diameter: this.rayRadius,
            tessellation: 8
        }, scene);
        this.innerRayMesh.parent = this.rootNode;
        this.innerRayMesh.rotation.x = Math.PI / 2;
        this.innerRayMesh.position.z = this.rayLength / 2;
        
        const innerMat = new StandardMaterial("phoenixRayInnerMat", scene);
        innerMat.emissiveColor = new Color3(1.0, 0.9, 0.5); // 黄白色核心
        innerMat.alpha = 0.8;
        innerMat.disableLighting = true;
        this.innerRayMesh.material = innerMat;

        // 3. 沿射线的火焰粒子
        this.createFlameParticles();

        // 4. 射线出口散射粒子
        this.createExitScatterParticles();

        // 5. 手部环绕粒子
        this.createHandFlameParticles();

        // 6. 光源
        this.rayLight = new PointLight("phoenixRayLight", new Vector3(0, 0, 0), scene);
        this.rayLight.parent = this.rootNode;
        this.rayLight.diffuse = new Color3(1.0, 0.4, 0.0);
        this.rayLight.intensity = 2.0;
        this.rayLight.range = 10;
    }

    /**
     * 更新视觉效果位置
     */
    updateVisuals() {
        if (!this.rootNode) return;
        this.updateRootTransform();
        
        // 简单的脉冲动画效果
        const time = Date.now() * 0.01;
        if (this.rayMesh) {
            const scale = 1 + Math.sin(time) * 0.1;
            this.rayMesh.scaling.x = scale;
            this.rayMesh.scaling.z = scale;
        }

        // 粒子发射率脉冲
        const pulse = 1 + Math.sin(time * 5) * 0.5; // 0.5 ~ 1.5
        
        if (this.exitBurstPS) {
            this.exitBurstPS.emitRate = 600 * pulse;
        }
        if (this.exitSparksPS) {
            this.exitSparksPS.emitRate = 600 * pulse;
        }
        if (this.exitEmbersPS) {
            this.exitEmbersPS.emitRate = 500 * pulse;
        }

        // 手部粒子脉冲 (更新)
        if (this.leftHandSystems) {
            this.leftHandSystems.core.emitRate = 2000 * pulse;
            this.leftHandSystems.sparks.emitRate = 400 * pulse;
            this.updateHandParticleDirection(this.leftHandSystems);
        }
        if (this.rightHandSystems) {
            this.rightHandSystems.core.emitRate = 2000 * pulse;
            this.rightHandSystems.sparks.emitRate = 400 * pulse;
            this.updateHandParticleDirection(this.rightHandSystems);
        }
    }

    /**
     * 更新手部粒子方向，使其始终朝向玩家前方
     */
    updateHandParticleDirection(systems) {
        if (!this.rootNode || !this.rootNode.rotationQuaternion) return;
        
        // 计算前方向
        const forward = new Vector3(0, 0, 1);
        forward.rotateByQuaternionToRef(this.rootNode.rotationQuaternion, forward);
        
        // 强制水平化，防止向下喷射
        forward.y = 0;
        forward.normalize();
        
        // 使用 DirectedSphereEmitter 的 direction1 和 direction2 定义发射方向的包围盒
        // 我们希望粒子向"前方半球"随机运动
        // 核心粒子比较集中
        if (systems.core) {
            const spread = 0.5; 
            // Y轴扩散稍小一点，保持水平感
            const spreadVector = new Vector3(spread, 0.3, spread);
            const dir1 = forward.subtract(spreadVector);
            const dir2 = forward.add(spreadVector);
            systems.core.direction1 = dir1;
            systems.core.direction2 = dir2;
        }
        
        // 火星粒子范围更广，覆盖整个前方半球
        if (systems.sparks) {
            const spread = 1.0; 
            // Y轴扩散稍小，避免过于垂直发散
            const spreadVector = new Vector3(spread, 0.6, spread);
            const dir1 = forward.subtract(spreadVector);
            const dir2 = forward.add(spreadVector);
            systems.sparks.direction1 = dir1;
            systems.sparks.direction2 = dir2;
        }
    }

    /**
     * 播放施法动画：双手前推并内收
     */
    playCastAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.leftShoulder || !boxMan.rightShoulder) return;

        const scene = this.scene;
        const fps = 60;

        // 记录初始姿势，便于结束时恢复
        this._leftStart = {
            x: boxMan.leftShoulder.rotation.x,
            y: boxMan.leftShoulder.rotation.y,
            z: boxMan.leftShoulder.rotation.z
        };
        this._rightStart = {
            x: boxMan.rightShoulder.rotation.x,
            y: boxMan.rightShoulder.rotation.y,
            z: boxMan.rightShoulder.rotation.z
        };

        // 左臂动画：前推 + 向右内收 (约45度)
        const leftAnimX = new Animation("phoenixLeftX", "rotation.x", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimX.setKeys([
            { frame: 0, value: this._leftStart.x },
            { frame: 8, value: -1.6 },
            { frame: 50, value: -1.6 }
        ]);
        const leftAnimY = new Animation("phoenixLeftY", "rotation.y", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimY.setKeys([
            { frame: 0, value: this._leftStart.y },
            { frame: 8, value: 0.45 },
            { frame: 50, value: 0.45 }
        ]);
        const leftAnimZ = new Animation("phoenixLeftZ", "rotation.z", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimZ.setKeys([
            { frame: 0, value: this._leftStart.z },
            { frame: 8, value: 0.0 },
            { frame: 50, value: 0.0 }
        ]);

        // 右臂动画：前推 + 向左内收 (约45度)
        const rightAnimX = new Animation("phoenixRightX", "rotation.x", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: this._rightStart.x },
            { frame: 8, value: -1.6 },
            { frame: 50, value: -1.6 }
        ]);
        const rightAnimY = new Animation("phoenixRightY", "rotation.y", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimY.setKeys([
            { frame: 0, value: this._rightStart.y },
            { frame: 8, value: -0.45 },
            { frame: 50, value: -0.45 }
        ]);
        const rightAnimZ = new Animation("phoenixRightZ", "rotation.z", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimZ.setKeys([
            { frame: 0, value: this._rightStart.z },
            { frame: 8, value: 0.0 },
            { frame: 50, value: 0.0 }
        ]);

        // 停止现有动画，开启新动画
        scene.stopAnimation(boxMan.leftShoulder);
        scene.stopAnimation(boxMan.rightShoulder);

        this.player.phoenixRayAnimating = true;

        this._leftAnimatable = scene.beginDirectAnimation(
            boxMan.leftShoulder,
            [leftAnimX, leftAnimY, leftAnimZ],
            0, 50, false, 1.2
        );
        this._rightAnimatable = scene.beginDirectAnimation(
            boxMan.rightShoulder,
            [rightAnimX, rightAnimY, rightAnimZ],
            0, 50, false, 1.2
        );
    }

    /**
     * 恢复施法前姿势
     */
    restoreCastPose() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.leftShoulder || !boxMan.rightShoulder) return;
        
        const scene = this.scene;

        // 1. 立即停止之前的施法动画
        if (this._leftAnimatable) {
            this._leftAnimatable.stop();
            this._leftAnimatable = null;
        }
        if (this._rightAnimatable) {
            this._rightAnimatable.stop();
            this._rightAnimatable = null;
        }
        
        // 确保所有关联动画都停止
        scene.stopAnimation(boxMan.leftShoulder);
        scene.stopAnimation(boxMan.rightShoulder);

        // 2. 目标值：X恢复初始，Y/Z强制归零（修复45度残留问题）
        const lx = this._leftStart ? this._leftStart.x : 0;
        const rx = this._rightStart ? this._rightStart.x : 0;

        const fps = 60;
        const duration = 15; // frames
        
        // Helper to create and stop animation
        const animateTo = (target, prop, endVal, onEnd) => {
            let startVal = 0;
            // 获取当前实际值
            if (prop === "rotation.x") startVal = target.rotation.x;
            else if (prop === "rotation.y") startVal = target.rotation.y;
            else if (prop === "rotation.z") startVal = target.rotation.z;
            
            // 使用 CreateAndStartAnimation 会自动处理动画循环和停止
            Animation.CreateAndStartAnimation(
                "restore_" + target.name + "_" + prop,
                target,
                prop,
                fps,
                duration,
                startVal,
                endVal,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
                null,
                () => {
                    // 动画结束后再次强制赋值，确保数值精确
                    if (prop === "rotation.x") target.rotation.x = endVal;
                    else if (prop === "rotation.y") target.rotation.y = endVal;
                    else if (prop === "rotation.z") target.rotation.z = endVal;
                    
                    if (onEnd) onEnd();
                }
            );
        };

        // 并行执行恢复动画
        animateTo(boxMan.leftShoulder, "rotation.x", lx);
        animateTo(boxMan.leftShoulder, "rotation.y", 0); 
        animateTo(boxMan.leftShoulder, "rotation.z", 0);
        
        animateTo(boxMan.rightShoulder, "rotation.x", rx);
        animateTo(boxMan.rightShoulder, "rotation.y", 0);
        
        // 最后的回调用于解锁状态
        animateTo(boxMan.rightShoulder, "rotation.z", 0, () => {
             if (this.player) {
                 this.player.phoenixRayAnimating = false;
                 // 再次确保没有任何动画锁定
                 scene.stopAnimation(boxMan.leftShoulder);
                 scene.stopAnimation(boxMan.rightShoulder);
             }
        });
    }

    /**
     * 更新根节点的位置和旋转，使其始终跟随着玩家并朝向前方
     */
    updateRootTransform() {
        if (!this.player.mesh || !this.rootNode) return;

        // 确保获取最新的世界变换
        const bm = this.player.boxMan;
        let rotationQuat = null;

        if (bm && bm.modelRoot) {
            // 强制计算最新的世界矩阵，确保 absoluteRotationQuaternion 是最新的
            bm.modelRoot.computeWorldMatrix(true);
            if (bm.modelRoot.absoluteRotationQuaternion) {
                rotationQuat = bm.modelRoot.absoluteRotationQuaternion.clone();
            }
        }

        // 如果获取不到绝对旋转，回退到使用 currentYaw
        if (!rotationQuat) {
            const yaw = this.player.currentYaw || 0;
            rotationQuat = Quaternion.FromEulerAngles(0, yaw, 0);
        }

        // 应用旋转到射线根节点
        if (!this.rootNode.rotationQuaternion) {
            this.rootNode.rotationQuaternion = rotationQuat;
        } else {
            this.rootNode.rotationQuaternion.copyFrom(rotationQuat);
        }

        // 计算前方向 (从旋转四元数提取)
        const forward = new Vector3(0, 0, 1);
        forward.rotateByQuaternionToRef(rotationQuat, forward);

        // 计算发射点
        let emitPos;
        if (bm && bm.leftShoulder && bm.rightShoulder) {
            const lp = bm.leftShoulder.getAbsolutePosition();
            const rp = bm.rightShoulder.getAbsolutePosition();
            const mid = lp.add(rp).scale(0.5);
            // 沿朝向偏移
            emitPos = mid.add(forward.scale(0.5)).add(new Vector3(0, 0.08, 0));
        } else {
            // 回退：胸口位置
            const playerPos = this.player.mesh.position;
            emitPos = playerPos.clone().add(new Vector3(0, 1.2, 0));
        }
        this.rootNode.position = emitPos;
    }

    /**
     * 创建射线出口的散射粒子
     */
    createExitScatterParticles() {
        const scene = this.scene;

        // 创建出口节点
        this.tipNode = new TransformNode("phoenixRayTip", scene);
        this.tipNode.parent = this.rootNode;
        this.tipNode.position = new Vector3(0, 0, this.rayLength);

        // 1. 主爆发 (Burst) - 像火焰喷射
        const burst = new ParticleSystem("phoenixExitBurst", 800, scene);
        burst.particleTexture = this.createFlameTexture();
        burst.emitter = this.tipNode;
        burst.createConeEmitter(0.4, Math.PI / 3); // 较大的角度
        burst.isLocal = true; // 跟随移动

        burst.color1 = new Color4(1.0, 0.9, 0.5, 1.0);
        burst.color2 = new Color4(1.0, 0.5, 0.0, 1.0);
        burst.colorDead = new Color4(0.6, 0.1, 0.0, 0.0);

        burst.minSize = 0.2;
        burst.maxSize = 0.6;
        burst.minLifeTime = 0.15;
        burst.maxLifeTime = 0.35;
        
        burst.emitRate = 600;
        burst.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        burst.minEmitPower = 6;
        burst.maxEmitPower = 12;
        burst.updateSpeed = 0.02;

        burst.start();
        this.particleSystems.push(burst);
        this.exitBurstPS = burst;

        // 2. 飞溅火花 (Sparks) - 高速、随机方向
        const sparks = new ParticleSystem("phoenixExitSparks", 900, scene);
        sparks.particleTexture = this.createFlameTexture(); // 复用纹理，或者可以用更细的
        sparks.emitter = this.tipNode;
        // 几乎全向喷射
        sparks.createConeEmitter(0.1, Math.PI * 0.8);
        
        sparks.color1 = new Color4(1.0, 1.0, 0.8, 1.0);
        sparks.color2 = new Color4(1.0, 0.8, 0.4, 1.0);
        sparks.colorDead = new Color4(0.8, 0.4, 0.0, 0.0);

        sparks.minSize = 0.05;
        sparks.maxSize = 0.15;
        sparks.minLifeTime = 0.2;
        sparks.maxLifeTime = 0.5;
        
        sparks.emitRate = 600;
        sparks.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        sparks.minEmitPower = 3;
        sparks.maxEmitPower = 9;
        sparks.gravity = new Vector3(0, -5, 0); // 火花受重力下落

        sparks.start();
        this.particleSystems.push(sparks);
        this.exitSparksPS = sparks;

        // 3. 飘散余烬 (Embers) - 缓慢、大范围
        const embers = new ParticleSystem("phoenixExitEmbers", 700, scene);
        embers.particleTexture = this.createFlameTexture();
        embers.emitter = this.tipNode;
        embers.createSphereEmitter(0.5); // 球形发射器
        
        embers.color1 = new Color4(1.0, 0.4, 0.0, 1.0);
        embers.color2 = new Color4(0.8, 0.2, 0.0, 0.8);
        embers.colorDead = new Color4(0.2, 0.0, 0.0, 0.0);

        embers.minSize = 0.1;
        embers.maxSize = 0.3;
        embers.minLifeTime = 0.5;
        embers.maxLifeTime = 1.0;
        
        embers.emitRate = 500;
        embers.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        embers.minEmitPower = 6;
        embers.maxEmitPower = 14;
        // 随机方向
        embers.direction1 = new Vector3(-1, -1, -1);
        embers.direction2 = new Vector3(1, 1, 1);

        embers.start();
        this.particleSystems.push(embers);
        this.exitEmbersPS = embers;
    }

    /**
     * 创建手部环绕粒子 - 高级GPU效果
     */
    createHandFlameParticles() {
        const scene = this.scene;
        const boxMan = this.player.boxMan;
        
        if (!boxMan || !boxMan.leftShoulder || !boxMan.rightShoulder) return;

        // 创建手部节点
        this.leftHandNode = new TransformNode("phoenixLeftHand", scene);
        this.leftHandNode.parent = boxMan.leftShoulder;
        this.leftHandNode.position = new Vector3(0, -0.6, 0); // 手臂末端

        this.rightHandNode = new TransformNode("phoenixRightHand", scene);
        this.rightHandNode.parent = boxMan.rightShoulder;
        this.rightHandNode.position = new Vector3(0, -0.6, 0);

        // 高级粒子生成器
        const createAdvancedHandPS = (emitter, name) => {
            const systems = {};

            // 1. 核心烈焰 (Core Flame) - GPU版本
            // 使用 GPUParticleSystem 获得极高的粒子密度和性能
            const core = new GPUParticleSystem(name + "_Core", { capacity: 10000 }, scene);
            core.particleTexture = this.createFlameTexture();
            core.emitter = emitter;
            
            // 球形发射器，模拟手中能量球，使用 DirectedSphereEmitter 以便控制方向
            // 参数：radius, direction1, direction2
            core.createDirectedSphereEmitter(0.05, new Vector3(0, 0, 1), new Vector3(0, 0, 1));
            
            // 颜色渐变：白热 -> 金黄 -> 橙红 -> 暗红 -> 透明
            core.addColorGradient(0.0, new Color4(1, 1, 1, 1));
            core.addColorGradient(0.1, new Color4(1, 0.9, 0.4, 1));
            core.addColorGradient(0.4, new Color4(1, 0.6, 0.1, 1));
            core.addColorGradient(0.7, new Color4(0.8, 0.2, 0.1, 0.8));
            core.addColorGradient(1.0, new Color4(0.2, 0.0, 0.0, 0.0));

            // 大小渐变：从小变大再消失
            core.addSizeGradient(0.0, 0.05);
            core.addSizeGradient(0.4, 0.12);
            core.addSizeGradient(1.0, 0.02);

            core.minLifeTime = 0.1;
            core.maxLifeTime = 0.3; // 缩短生命周期，避免飞太远
            core.emitRate = 2000; // GPU模式下使用超高发射率
            
            // 物理动力学
            core.minEmitPower = 1.0;
            core.maxEmitPower = 3.0;
            core.gravity = new Vector3(0, 0, 0); // 移除重力，改为随风飘散
            core.blendMode = ParticleSystem.BLENDMODE_ADD;

            core.start();
            this.particleSystems.push(core);
            systems.core = core;

            // 2. 溅射火星 (Sparks) - 模拟火苗四处飞溅
            // 火星也可以使用 GPU 粒子
            const sparks = new GPUParticleSystem(name + "_Sparks", { capacity: 5000 }, scene);
            sparks.particleTexture = this.createFlameTexture();
            sparks.emitter = emitter;
            
            // 使用定向发射器，向前方喷射
            sparks.createDirectedSphereEmitter(0.1, new Vector3(0, 0, 1), new Vector3(0, 0, 1));
            
            sparks.addColorGradient(0.0, new Color4(1, 1, 0.8, 1));
            sparks.addColorGradient(0.5, new Color4(1, 0.8, 0.5, 1));
            sparks.addColorGradient(1.0, new Color4(1, 0.4, 0, 0));
            
            sparks.minSize = 0.05;
            sparks.maxSize = 0.15;
            sparks.minLifeTime = 0.2;
            sparks.maxLifeTime = 0.5;
            sparks.emitRate = 400;
            
            // 强力的四散飞溅
            sparks.minEmitPower = 2;
            sparks.maxEmitPower = 5;
            sparks.gravity = new Vector3(0, 0, 0); // 移除重力
            
            sparks.blendMode = ParticleSystem.BLENDMODE_ADD;
            sparks.start();
            this.particleSystems.push(sparks);
            systems.sparks = sparks;
            
            return systems;
        };

        this.leftHandSystems = createAdvancedHandPS(this.leftHandNode, "phoenixLeftHand");
        this.rightHandSystems = createAdvancedHandPS(this.rightHandNode, "phoenixRightHand");
    }

    /**
     * 清理视觉效果
     */
    cleanupVisuals() {
        if (this.rayMesh) {
            this.rayMesh.dispose();
            this.rayMesh = null;
        }
        if (this.innerRayMesh) {
            this.innerRayMesh.dispose();
            this.innerRayMesh = null;
        }
        if (this.rayLight) {
            this.rayLight.dispose();
            this.rayLight = null;
        }
        
        // 停止并清理粒子系统
        this.particleSystems.forEach(ps => {
            ps.stop();
            // 延迟销毁以让残留粒子消失
            setTimeout(() => ps.dispose(), 1000);
        });
        this.particleSystems = [];
        this.exitBurstPS = null;
        this.exitSparksPS = null;
        this.exitEmbersPS = null;
        this.leftHandSystems = null;
        this.rightHandSystems = null;

        if (this.tipNode) {
            this.tipNode.dispose();
            this.tipNode = null;
        }
        if (this.leftHandNode) {
            this.leftHandNode.dispose();
            this.leftHandNode = null;
        }
        if (this.rightHandNode) {
            this.rightHandNode.dispose();
            this.rightHandNode = null;
        }

        if (this.rootNode) {
            this.rootNode.dispose();
            this.rootNode = null;
        }
    }

    /**
     * 碰撞检测逻辑（占位）
     */
    checkCollisions() {
        // 这里可以添加射线检测逻辑，检测前方敌人并造成伤害
        // 例如：
        // const ray = new Ray(this.rootNode.position, this.rootNode.forward, this.rayLength);
        // const hit = this.scene.pickWithRay(ray, (mesh) => mesh.isEnemy);
        // if (hit.pickedMesh) { ... }
    }

    /**
     * 创建火焰粒子
     */
    createFlameParticles() {
        const scene = this.scene;
        
        // 粒子发射器绑定到根节点
        // 我们希望粒子沿着射线发射，或者围绕射线生成
        // 这里创建一个发射器，沿着射线长度分布
        
        const ps = new ParticleSystem("phoenixRayFlames", 1000, scene);
        ps.particleTexture = this.createFlameTexture();
        ps.emitter = this.rootNode;
        
        // 发射盒形状：长条形，沿着Z轴（因为根节点朝向Z轴）
        // 射线长20，起点在0，终点在20
        ps.minEmitBox = new Vector3(-0.1, -0.1, 0);
        ps.maxEmitBox = new Vector3(0.1, 0.1, this.rayLength);
        
        ps.color1 = new Color4(1.0, 0.8, 0.0, 1.0);
        ps.color2 = new Color4(1.0, 0.2, 0.0, 1.0);
        ps.colorDead = new Color4(0.5, 0.0, 0.0, 0.0);
        
        ps.minSize = 0.3;
        ps.maxSize = 0.8;
        ps.minLifeTime = 0.2;
        ps.maxLifeTime = 0.5;
        
        ps.emitRate = 500;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.gravity = new Vector3(0, 0.5, 0); // 微微向上飘
        
        // 粒子速度方向
        ps.direction1 = new Vector3(-0.2, 0, 0);
        ps.direction2 = new Vector3(0.2, 0.2, 0);
        ps.minEmitPower = 0.1;
        ps.maxEmitPower = 0.5;
        
        ps.start();
        this.particleSystems.push(ps);
    }

    /**
     * 复用 DragonBreath 的火焰纹理生成逻辑
     */
    createFlameTexture() {
        // 如果已经创建过，可以复用（这里为了简单每次创建，或者依赖Babylon缓存）
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 200, 1)");
        grad.addColorStop(0.2, "rgba(255, 200, 100, 0.9)");
        grad.addColorStop(0.5, "rgba(255, 120, 50, 0.6)");
        grad.addColorStop(0.8, "rgba(200, 50, 20, 0.3)");
        grad.addColorStop(1, "rgba(100, 20, 0, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "phoenixFlameTex", this.scene);
    }

    execute() {
        // PhoenixRay 是引导型技能，通过 startChanneling/stopChanneling 控制
        // 这里留空或作为单次触发的备用逻辑
        console.log("PhoenixRay execute called (should be channeling)");
    }
}
