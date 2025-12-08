import { 
    MeshBuilder, 
    Vector3, 
    StandardMaterial, 
    Color3, 
    Color4,
    TransformNode, 
    PhysicsAggregate, 
    PhysicsShapeType,
    Quaternion,
    Scalar,
    ActionManager,
    ExecuteCodeAction,
    Animation,
    Axis,
    ParticleSystem,
    Texture
} from "@babylonjs/core";

/**
 * 邪恶鹿
 * 随机出现，随机行走，被半月斩击中会死亡
 */
export class EvilDeer {
    /**
     * @param {Scene} scene 
     * @param {Vector3} position 
     */
    constructor(scene, position) {
        this.scene = scene;
        this.initialPosition = position;
        this.isDead = false;
        
        // 移动相关
        this.moveSpeed = 2.0;
        this.rotateSpeed = 3.0; // 加快旋转速度
        
        // 状态机
        this.state = "idle"; // idle, walk
        this.stateTimer = 0;
        
        this.targetRotation = 0;
        this.currentRotation = 0;
        
        this.legs = []; // 存储腿部 mesh
        this.neck = null;
        this.head = null;
        
        this.createMesh();
        this.createPhysics();
        this.createAnimations();
        this.enableShadows();
        this.registerUpdate();
        
        // 标记为敌人，方便技能查找
        this.root.metadata = { instance: this, type: "enemy" };
        
        // 同时挂载到身体部件上，以防万一
        if (this.root.getChildren) {
            this.root.getChildren().forEach(child => {
                if (child instanceof TransformNode) { 
                    child.metadata = { instance: this, type: "enemy" };
                }
            });
        }

        this.deathParticleSystem = null;
    }

    createMesh() {
        // 1. 物理根节点 (不可见的碰撞盒)
        // 高度2，中心在1，所以底部在0
        this.root = MeshBuilder.CreateBox("evilDeerRoot", { width: 1, height: 2, depth: 2 }, this.scene);
        this.root.position = this.initialPosition.clone().add(new Vector3(0, 1, 0));
        this.root.visibility = 0; // 不可见
        
        // 2. 视觉模型根节点 (负责旋转和承载模型)
        this.modelRoot = new TransformNode("modelRoot", this.scene);
        this.modelRoot.parent = this.root;
        this.modelRoot.position.y = -1; // 下移1单位，使模型的(0,0,0)对应物理盒的底部
        
        // 材质
        const bodyMat = new StandardMaterial("deerBodyMat", this.scene);
        bodyMat.diffuseColor = new Color3(0.4, 0.2, 0.1); // 深褐色
        
        const eyeMat = new StandardMaterial("deerEyeMat", this.scene);
        eyeMat.diffuseColor = new Color3(0, 0, 0);
        eyeMat.emissiveColor = new Color3(1, 0, 0); // 邪恶红眼
        
        // 身体
        const body = MeshBuilder.CreateBox("deerBody", { width: 0.8, height: 0.8, depth: 1.5 }, this.scene);
        body.position.y = 1.2;
        body.material = bodyMat;
        body.parent = this.modelRoot;
        this.body = body; // 引用身体
        
        // 脖子关节 (Pivot)
        const neckPivot = new TransformNode("neckPivot", this.scene);
        neckPivot.position = new Vector3(0, 1.4, 0.6);
        neckPivot.parent = this.modelRoot;
        this.neckPivot = neckPivot;

        // 脖子
        const neck = MeshBuilder.CreateBox("deerNeck", { width: 0.4, height: 0.8, depth: 0.4 }, this.scene);
        // 相对于 Pivot 的位置
        neck.position = new Vector3(0, 0.4, 0); 
        neck.rotation.x = -Math.PI / 6;
        neck.material = bodyMat;
        neck.parent = neckPivot;
        this.neck = neck;
        
        // 头 (挂在脖子上，或者相对于 Pivot)
        const head = MeshBuilder.CreateBox("deerHead", { width: 0.5, height: 0.5, depth: 0.7 }, this.scene);
        head.position = new Vector3(0, 0.8, 0.3); // 调整位置
        head.material = bodyMat;
        head.parent = neckPivot;
        this.head = head;
        
        // 眼睛 (挂在头上)
        const eyeL = MeshBuilder.CreatePlane("eyeL", { size: 0.15 }, this.scene);
        eyeL.position = new Vector3(-0.26, 0.1, 0.2);
        eyeL.rotation.y = -Math.PI / 2;
        eyeL.material = eyeMat;
        eyeL.parent = head;
        
        const eyeR = MeshBuilder.CreatePlane("eyeR", { size: 0.15 }, this.scene);
        eyeR.position = new Vector3(0.26, 0.1, 0.2);
        eyeR.rotation.y = Math.PI / 2;
        eyeR.material = eyeMat;
        eyeR.parent = head;
        
        // 鹿角
        const antlerL = MeshBuilder.CreateCylinder("antlerL", { height: 0.8, diameterTop: 0.05, diameterBottom: 0.1 }, this.scene);
        antlerL.position = new Vector3(-0.2, 0.4, -0.1);
        antlerL.rotation.z = Math.PI / 6;
        antlerL.rotation.x = -Math.PI / 6;
        antlerL.material = bodyMat;
        antlerL.parent = head;
        
        const antlerR = MeshBuilder.CreateCylinder("antlerR", { height: 0.8, diameterTop: 0.05, diameterBottom: 0.1 }, this.scene);
        antlerR.position = new Vector3(0.2, 0.4, -0.1);
        antlerR.rotation.z = -Math.PI / 6;
        antlerR.rotation.x = -Math.PI / 6;
        antlerR.material = bodyMat;
        antlerR.parent = head;
        
        // 腿部关节
        const createLeg = (name, x, z) => {
            const pivot = new TransformNode(name + "Pivot", this.scene);
            pivot.position = new Vector3(x, 0.8, z); // 腿根部高度
            pivot.parent = this.modelRoot;
            
            const leg = MeshBuilder.CreateBox(name, { width: 0.2, height: 1.2, depth: 0.2 }, this.scene);
            leg.position.y = -0.6; // 向下延伸
            leg.material = bodyMat;
            leg.parent = pivot;
            
            this.legs.push(pivot);
            return pivot;
        };

        createLeg("legFL", -0.3, 0.6);
        createLeg("legFR", 0.3, 0.6);
        createLeg("legBL", -0.3, -0.6);
        createLeg("legBR", 0.3, -0.6);
        
        this.mesh = this.root; 
    }

    createPhysics() {
        // 碰撞体直接使用 root (它已经是一个合适大小的 Box 了)
        this.aggregate = new PhysicsAggregate(
            this.root, 
            PhysicsShapeType.BOX, 
            { mass: 50, friction: 0.5, restitution: 0.0 }, 
            this.scene
        );
        
        // 锁定物理旋转，完全由逻辑控制模型朝向 (防止翻倒)
        this.aggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0)
        });

        // 挂载 metadata 到 root 和 modelRoot 下的所有 mesh，方便射线检测
        this.root.metadata = { instance: this, type: "enemy" };
        // 递归给所有子网格添加 metadata
        const addMetadata = (node) => {
            node.metadata = { instance: this, type: "enemy" };
            node.getChildren().forEach(child => addMetadata(child));
        };
        addMetadata(this.modelRoot);
    }


    createAnimations() {
        // 腿部行走动画
        const walkAnim = new Animation("walkAnim", "rotation.x", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const walkKeys = [
            { frame: 0, value: -0.5 },
            { frame: 30, value: 0.5 },
            { frame: 60, value: -0.5 }
        ];
        walkAnim.setKeys(walkKeys);
        
        // 将动画附加到腿部
        this.legs.forEach((leg, index) => {
            leg.animations = [];
            // 对角线腿相位一致
            // FL(0), FR(1), BL(2), BR(3)
            // FL 和 BR 一组，FR 和 BL 一组
            if (index === 0 || index === 3) {
                // 正相
                leg.animations.push(walkAnim);
            } else {
                // 反相 (我们可以创建另一个反相动画，或者在播放时设置 offset，这里简化创建另一个动画对象)
                const reverseAnim = new Animation("walkAnimRev", "rotation.x", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
                const revKeys = [
                    { frame: 0, value: 0.5 },
                    { frame: 30, value: -0.5 },
                    { frame: 60, value: 0.5 }
                ];
                reverseAnim.setKeys(revKeys);
                leg.animations.push(reverseAnim);
            }
        });
        
        // 身体起伏动画 (模拟呼吸/行走颠簸)
        // 暂时简单点，只做腿部
        
        // 头部 Idle 动画 (偶尔低头)
        const idleHeadAnim = new Animation("idleHead", "rotation.x", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const idleKeys = [
            { frame: 0, value: 0 },
            { frame: 40, value: 0.5 }, // 低头
            { frame: 80, value: 0.5 },
            { frame: 120, value: 0 }
        ];
        idleHeadAnim.setKeys(idleKeys);
        this.neckPivot.animations = [idleHeadAnim];
    }

    enableShadows() {
        const shadowGenerator = this.scene.shadowGenerator;
        if (!shadowGenerator) return;

        const addShadowsRecursively = (node) => {
            if (node.getClassName() === "Mesh") {
                shadowGenerator.addShadowCaster(node);
                node.receiveShadows = true;
            }
            node.getChildren().forEach(child => addShadowsRecursively(child));
        }

        addShadowsRecursively(this.modelRoot);
    }

    registerUpdate() {
        this.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (this.isDead) return;
            this.updateBehavior();
            this.updatePhysics();
        });
    }
    
    updateBehavior() {
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        this.stateTimer -= dt;

        if (this.stateTimer <= 0) {
            this.switchState();
        }

        if (this.state === "walk") {
            // 平滑旋转向目标方向
            let diff = this.targetRotation - this.currentRotation;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            
            // 简单的 P 控制
            this.currentRotation += diff * dt * this.rotateSpeed;
            
            // 确保腿部动画在播放
            if (!this.isWalkingAnimPlaying) {
                this.legs.forEach(leg => this.scene.beginAnimation(leg, 0, 60, true, 1.5));
                this.scene.stopAnimation(this.neckPivot); // 走路时不低头
                this.neckPivot.rotation.x = 0; // 复位
                this.isWalkingAnimPlaying = true;
            }
            
            // 随机微调方向，使其走得更自然
            if (Math.random() < 0.02) {
                this.targetRotation += (Math.random() - 0.5) * 0.5;
            }
        } else {
            // Idle
            if (this.isWalkingAnimPlaying) {
                this.legs.forEach(leg => this.scene.stopAnimation(leg));
                // 复位腿
                this.legs.forEach(leg => leg.rotation.x = 0);
                this.isWalkingAnimPlaying = false;
                
                // 偶尔播放低头动画
                if (Math.random() > 0.5) {
                     this.scene.beginAnimation(this.neckPivot, 0, 120, false, 0.5);
                }
            }
        }
    }

    switchState() {
        if (this.state === "idle") {
            // 切换到行走
            this.state = "walk";
            this.stateTimer = 2 + Math.random() * 4; // 走 2-6 秒
            this.targetRotation = Math.random() * Math.PI * 2;
        } else {
            // 切换到 Idle
            this.state = "idle";
            this.stateTimer = 1 + Math.random() * 3; // 停 1-4 秒
        }
    }

    updatePhysics() {
        if (!this.aggregate || !this.aggregate.body) return;

        if (this.state === "walk") {
            const forward = new Vector3(Math.sin(this.currentRotation), 0, Math.cos(this.currentRotation));
            const velocity = forward.scale(this.moveSpeed);
            
            const currentLinVel = new Vector3();
            this.aggregate.body.getLinearVelocityToRef(currentLinVel);
            
            // 应用速度，保留 Y 轴 (重力)
            this.aggregate.body.setLinearVelocity(new Vector3(velocity.x, currentLinVel.y, velocity.z));
            
            // 强制设定朝向 (旋转 modelRoot 而不是 root)
            // root 是物理体，不旋转
            // modelRoot 是视觉模型，根据 currentRotation 旋转
            // 速度方向是基于 currentRotation 的，所以模型朝向和移动方向一致
            this.modelRoot.rotation.y = this.currentRotation;
        } else {
            // Idle - 停止水平移动，保留重力
            const currentLinVel = new Vector3();
            this.aggregate.body.getLinearVelocityToRef(currentLinVel);
            // 施加阻尼效果，让它停得更快
            this.aggregate.body.setLinearVelocity(new Vector3(currentLinVel.x * 0.9, currentLinVel.y, currentLinVel.z * 0.9));
            
            // Idle 时也保持朝向
            this.modelRoot.rotation.y = this.currentRotation;
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        
        if (this.aggregate) {
            this.aggregate.dispose();
        }
        
        // 停止所有动画
        this.scene.stopAnimation(this.neckPivot);
        this.legs.forEach(leg => this.scene.stopAnimation(leg));

        // 死亡特效
        this.createDeathEffect();

        // 倒下动画
        const rotAnim = Animation.CreateAndStartAnimation("dieAnim", this.modelRoot, "rotation.z", 30, 30, this.modelRoot.rotation.z, Math.PI / 2, 0);
        
        // 稍微下沉
        Animation.CreateAndStartAnimation("sinkAnim", this.modelRoot, "position.y", 30, 30, this.modelRoot.position.y, this.modelRoot.position.y - 0.5, 0);

        setTimeout(() => {
            if (this.updateObserver) {
                this.scene.onBeforeRenderObservable.remove(this.updateObserver);
            }
            this.root.dispose();
        }, 1000);
    }
    
    createDeathEffect() {
        // 1. 低多边形碎片爆炸效果 (保留)
        const particleCount = 12;
        const center = this.root.absolutePosition.clone().add(new Vector3(0, 1, 0));
        
        for (let i = 0; i < particleCount; i++) {
            const debris = MeshBuilder.CreatePolyhedron("debris", { type: 1, size: 0.2 + Math.random() * 0.2 }, this.scene);
            debris.position = center.clone().add(new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5));
            if (this.body && this.body.material) {
                debris.material = this.body.material;
            }
            
            // 碎片也产生阴影
            if (this.scene.shadowGenerator) {
                this.scene.shadowGenerator.addShadowCaster(debris);
            }

            // 随机初始旋转
            debris.rotation = new Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            
            // 手动模拟抛物线运动
            const velocity = new Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 3 + 2, // 向上抛
                (Math.random() - 0.5) * 5
            );
            
            const spin = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).scale(0.3);
            
            let life = 1.0;
            const obs = this.scene.onBeforeRenderObservable.add(() => {
                const dt = this.scene.getEngine().getDeltaTime() / 1000;
                life -= dt;
                
                // 物理模拟
                velocity.y -= 9.8 * dt; // 重力
                debris.position.addInPlace(velocity.scale(dt));
                debris.rotation.addInPlace(spin);
                
                // 缩放消失
                if (life < 0.3) {
                    const scale = life / 0.3;
                    debris.scaling = new Vector3(scale, scale, scale);
                }
                
                if (life <= 0 || debris.position.y < 0) {
                    this.scene.onBeforeRenderObservable.remove(obs);
                    debris.dispose();
                }
            });
        }

        // 2. 粒子系统爆炸
        this.createExplosionParticles(center);
    }

    createExplosionParticles(position) {
        // 创建粒子纹理 (手搓一个发光球)
        const particleTexture = this.createParticleTexture();

        const ps = new ParticleSystem("explosion", 500, this.scene);
        ps.particleTexture = particleTexture;
        ps.emitter = position;
        ps.minEmitBox = new Vector3(-0.5, -0.5, -0.5);
        ps.maxEmitBox = new Vector3(0.5, 0.5, 0.5);
        
        // 颜色渐变: 亮黄 -> 橙 -> 暗红 -> 透明
        ps.color1 = new Color4(1.0, 0.8, 0.1, 1.0);
        ps.color2 = new Color4(1.0, 0.5, 0.0, 1.0);
        ps.colorDead = new Color4(0.2, 0.0, 0.0, 0.0);
        
        ps.minSize = 0.1;
        ps.maxSize = 0.4;
        
        ps.minLifeTime = 0.3;
        ps.maxLifeTime = 0.8;
        
        ps.emitRate = 1000;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        ps.gravity = new Vector3(0, -9.8, 0);
        ps.direction1 = new Vector3(-1, 1, -1);
        ps.direction2 = new Vector3(1, 1, 1);
        
        ps.minEmitPower = 2;
        ps.maxEmitPower = 5;
        ps.updateSpeed = 0.01;
        
        // 爆发式发射
        ps.manualEmitCount = 300;
        ps.start();
        
        // 自动销毁
        setTimeout(() => {
            ps.dispose();
        }, 1500);
    }

    createParticleTexture() {
        // 如果已经创建过，直接返回 (避免重复创建纹理资源)
        if (this.scene.getTextureByName("explosionParticle")) {
            return this.scene.getTextureByName("explosionParticle");
        }

        const canvas = document.createElement("canvas");
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.2, "rgba(255, 200, 50, 0.8)");
        grad.addColorStop(0.5, "rgba(255, 100, 0, 0.3)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "explosionParticle", this.scene);
    }
}
