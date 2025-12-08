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
    Animation,
    Axis,
    ParticleSystem,
    Texture,
    TrailMesh
} from "@babylonjs/core";

/**
 * 虚空追猎者 (Void Chaser)
 * Roguelike 风格的几何体敌人
 * 悬浮移动，自带旋转光效和拖尾
 */
export class VoidChaser {
    constructor(scene, position) {
        this.scene = scene;
        this.initialPosition = position;
        this.isDead = false;
        
        // 属性
        this.moveSpeed = 3.5; 
        this.rotateSpeed = 5.0;
        this.patrolRadius = 15; // 巡逻半径
        this.detectionRadius = 12; // 索敌半径
        this.giveUpRadius = 20; // 放弃追踪半径
        this.chaseSpeed = 6.0; // 追踪速度
        this.patrolSpeed = 3.0; // 巡逻速度

        // 状态机
        this.state = "idle"; 
        this.stateTimer = 0;
        this.framesRendered = 0; // 用于延迟启动特效
        
        this.targetRotation = 0;
        this.currentRotation = 0;
        this.targetPosition = null; // 目标位置（巡逻点或玩家位置）
        this.playerMesh = null; // 缓存玩家引用
        
        this.components = []; // 存储旋转部件
        
        this.createMesh();
        this.createPhysics();
        this.createAnimations();
        this.enableShadows();
        this.registerUpdate();
        
        // 标记为敌人
        this.root.metadata = { instance: this, type: "enemy" };
        this.addMetadataRecursively(this.modelRoot);
    }

    addMetadataRecursively(node) {
        node.metadata = { instance: this, type: "enemy" };
        node.getChildren().forEach(child => this.addMetadataRecursively(child));
    }

    createMesh() {
        // 1. 物理根节点 (隐形盒子)
        this.root = MeshBuilder.CreateBox("voidRoot", { width: 1, height: 2, depth: 1 }, this.scene);
        this.root.position = this.initialPosition.clone().add(new Vector3(0, 1.5, 0)); // 悬浮高度
        this.root.visibility = 0;
        
        // 2. 视觉模型根节点
        this.modelRoot = new TransformNode("modelRoot", this.scene);
        this.modelRoot.parent = this.root;
        
        // 材质
        const coreMat = new StandardMaterial("coreMat", this.scene);
        coreMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
        coreMat.emissiveColor = new Color3(0.2, 0.0, 0.4); // 深紫发光
        coreMat.specularColor = new Color3(1, 1, 1);
        
        const edgeMat = new StandardMaterial("edgeMat", this.scene);
        edgeMat.diffuseColor = new Color3(0, 0, 0);
        edgeMat.emissiveColor = new Color3(0.0, 0.8, 1.0); // 青色能量
        edgeMat.alpha = 0.8;

        // --- 构建几何体 ---
        
        // A. 核心 (菱形)
        this.core = MeshBuilder.CreatePolyhedron("core", { type: 2, size: 0.5 }, this.scene);
        this.core.material = coreMat;
        this.core.parent = this.modelRoot;
        
        // B. 能量环 (两个交叉的 Torus)
        const ring1 = MeshBuilder.CreateTorus("ring1", { diameter: 1.4, thickness: 0.05, tessellation: 32 }, this.scene);
        ring1.material = edgeMat;
        ring1.parent = this.modelRoot;
        ring1.rotation.x = Math.PI / 4;
        this.components.push({ mesh: ring1, speed: 2.0, axis: new Vector3(1, 0, 0) });

        const ring2 = MeshBuilder.CreateTorus("ring2", { diameter: 1.2, thickness: 0.05, tessellation: 32 }, this.scene);
        ring2.material = edgeMat;
        ring2.parent = this.modelRoot;
        ring2.rotation.x = -Math.PI / 4;
        this.components.push({ mesh: ring2, speed: -2.0, axis: new Vector3(0, 0, 1) });
        
        // C. 悬浮尖刺 (4个)
        for (let i = 0; i < 4; i++) {
            const spike = MeshBuilder.CreateCylinder("spike" + i, { diameterTop: 0, diameterBottom: 0.2, height: 0.6, tessellation: 4 }, this.scene);
            spike.material = coreMat;
            spike.parent = this.modelRoot;
            
            // 初始位置：围绕中心
            const angle = (Math.PI / 2) * i;
            const dist = 0.8;
            spike.position = new Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
            
            // 尖端朝外
            spike.lookAt(new Vector3(0, 0, 0));
            spike.rotation.x += Math.PI / 2; // 调整朝向
            
            this.components.push({ mesh: spike, speed: 1.0, axis: new Vector3(0, 1, 0), orbit: true, startAngle: angle });
        }
        
        // D. 拖尾效果
        // 挂载两个隐形点作为拖尾生成源
        this.trailSource = new TransformNode("trailSource", this.scene);
        this.trailSource.parent = this.modelRoot;
        this.trailSource.position.x = 0.8;
        
        // 强制更新矩阵
        this.root.computeWorldMatrix(true);
        this.modelRoot.computeWorldMatrix(true);
        this.trailSource.computeWorldMatrix(true);
    }

    createPhysics() {
        this.aggregate = new PhysicsAggregate(
            this.root, 
            PhysicsShapeType.BOX, 
            { mass: 10, friction: 0.0, restitution: 0.5 }, // 摩擦力0，像气垫船一样滑行
            this.scene
        );
        this.aggregate.body.setMassProperties({ inertia: new Vector3(0, 0, 0) });
        this.aggregate.body.setLinearDamping(1.0); // 空气阻力
    }

    createAnimations() {
        // 核心呼吸动画
        const scaleAnim = new Animation("pulse", "scaling", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
        const keys = [
            { frame: 0, value: new Vector3(1, 1, 1) },
            { frame: 30, value: new Vector3(1.2, 1.2, 1.2) },
            { frame: 60, value: new Vector3(1, 1, 1) }
        ];
        scaleAnim.setKeys(keys);
        this.core.animations = [scaleAnim];
        this.scene.beginAnimation(this.core, 0, 60, true);
        
        // 上下悬浮动画
        const floatAnim = new Animation("float", "position.y", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const floatKeys = [
            { frame: 0, value: 0 },
            { frame: 60, value: 0.3 },
            { frame: 120, value: 0 }
        ];
        floatAnim.setKeys(floatKeys);
        this.modelRoot.animations = [floatAnim];
        this.scene.beginAnimation(this.modelRoot, 0, 120, true);
    }

    enableShadows() {
        const shadowGenerator = this.scene.shadowGenerator;
        if (shadowGenerator) {
            const addShadows = (node) => {
                if (node.getClassName() === "Mesh") {
                    shadowGenerator.addShadowCaster(node);
                    node.receiveShadows = true;
                }
                node.getChildren().forEach(child => addShadows(child));
            };
            addShadows(this.modelRoot);
        }
    }

    registerUpdate() {
        this.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (this.isDead) return;

            // 延迟启动拖尾，等待下落稳定
            // 增加到 60 帧 (约1秒)，确保物理引擎完全稳定悬浮后再开启特效
            if (this.framesRendered < 60) {
                this.framesRendered++;
                if (this.framesRendered === 60) {
                    this.createTrail();
                }
            }

            this.updateBehavior();
            this.updatePhysics();
            this.animateComponents();
        });
    }

    createTrail() {
        if (this.isDead) return;
        this.trail = new TrailMesh("voidTrail", this.trailSource, this.scene, 0.4, 30, true);
        const trailMat = new StandardMaterial("trailMat", this.scene);
        trailMat.emissiveColor = new Color3(0.5, 0.0, 1.0);
        trailMat.disableLighting = true;
        this.trail.material = trailMat;
    }

    animateComponents() {
        // 旋转部件
        this.components.forEach(comp => {
            if (comp.orbit) {
                // 轨道公转
                comp.startAngle += comp.speed * 0.02;
                comp.mesh.position.x = Math.cos(comp.startAngle) * 0.8;
                comp.mesh.position.z = Math.sin(comp.startAngle) * 0.8;
                comp.mesh.lookAt(new Vector3(0, 0, 0));
                comp.mesh.rotation.x += Math.PI / 2;
            } else {
                // 自转
                comp.mesh.rotation.addInPlace(comp.axis.scale(comp.speed * 0.02));
            }
        });
    }

    updateBehavior() {
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        this.stateTimer -= dt;

        // 1. 尝试寻找玩家
        if (!this.playerMesh || this.playerMesh.isDisposed()) {
            this.findPlayer();
        }

        // 2. 状态机逻辑
        const myPos = this.root.absolutePosition;

        // 距离检测
        let distToPlayer = 999;
        if (this.playerMesh) {
            distToPlayer = Vector3.Distance(myPos, this.playerMesh.absolutePosition);
        }

        // 状态切换逻辑
        if (this.state === "chase") {
            if (distToPlayer > this.giveUpRadius) {
                this.state = "idle"; // 丢失目标，发呆一会儿
                this.stateTimer = 1.5;
            } else {
                // 持续更新追踪目标
                this.targetPosition = this.playerMesh.absolutePosition.clone();
            }
        } else {
            // 在 idle 或 patrol 状态下发现玩家
            if (distToPlayer < this.detectionRadius) {
                this.state = "chase";
                this.stateTimer = 0; // 追踪没有时间限制
            } else if (this.stateTimer <= 0) {
                // 定时切换 idle <-> patrol
                this.switchPatrolState();
            }
        }

        // 3. 执行当前状态行为
        if (this.state === "chase" || this.state === "patrol") {
            if (this.targetPosition) {
                // 计算目标方向
                const diff = this.targetPosition.subtract(myPos);
                // 忽略高度差
                const angle = Math.atan2(diff.x, diff.z);
                
                // 平滑旋转
                let rotDiff = angle - this.currentRotation;
                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                
                this.currentRotation += rotDiff * dt * this.rotateSpeed;
                this.modelRoot.rotation.y = this.currentRotation;
                
                // 移动时的倾斜特效
                const tilt = (this.state === "chase" ? 0.3 : 0.15);
                this.modelRoot.rotation.z = tilt;
            }
        } else {
            // Idle 状态缓慢回正
            this.modelRoot.rotation.z *= 0.9;
        }
    }

    findPlayer() {
        // 遍历场景寻找 metadata.type === "player" 的网格
        // 优化：每隔几十帧才找一次，或者只找一次
        this.scene.meshes.some(mesh => {
            if (mesh.metadata && mesh.metadata.type === "player") {
                this.playerMesh = mesh;
                return true;
            }
            return false;
        });
    }

    switchPatrolState() {
        if (this.state === "idle") {
            // 切换到巡逻
            this.state = "patrol";
            this.stateTimer = 3 + Math.random() * 4; // 巡逻 3-7 秒
            
            // 随机找个目标点
            const r = this.patrolRadius;
            const dx = (Math.random() - 0.5) * 2 * r;
            const dz = (Math.random() - 0.5) * 2 * r;
            this.targetPosition = this.initialPosition.add(new Vector3(dx, 0, dz));
            
        } else {
            // 切换到发呆
            this.state = "idle";
            this.stateTimer = 1 + Math.random() * 2; // 发呆 1-3 秒
        }
    }

    updatePhysics() {
        if (!this.aggregate || !this.aggregate.body) return;

        if (this.state === "chase" || this.state === "patrol") {
            const forward = new Vector3(Math.sin(this.currentRotation), 0, Math.cos(this.currentRotation));
            
            // 根据状态选择速度
            const targetSpeed = (this.state === "chase") ? this.chaseSpeed : this.patrolSpeed;
            
            // 施加力
            const force = forward.scale(targetSpeed * 50); 
            this.aggregate.body.applyForce(force, this.root.absolutePosition);
            
            // 限制最大速度
            const vel = new Vector3();
            this.aggregate.body.getLinearVelocityToRef(vel);
            const currentSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
            
            if (currentSpeed > targetSpeed) {
                const factor = targetSpeed / currentSpeed;
                this.aggregate.body.setLinearVelocity(new Vector3(vel.x * factor, vel.y, vel.z * factor));
            }
        } else {
             // Idle 状态下增加阻力使其快速停下
            const vel = new Vector3();
            this.aggregate.body.getLinearVelocityToRef(vel);
            // 只对水平速度进行阻尼
            const horizontalVel = new Vector3(vel.x, 0, vel.z);
            if (horizontalVel.length() > 0.1) {
                const dampingForce = horizontalVel.scale(-5.0); // 反向阻力
                this.aggregate.body.applyForce(dampingForce, this.root.absolutePosition);
            }
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        
        if (this.aggregate) this.aggregate.dispose();
        if (this.trail) this.trail.dispose(); // 移除拖尾

        // 停止动画
        this.scene.stopAnimation(this.core);
        this.scene.stopAnimation(this.modelRoot);

        // 爆炸特效
        this.createExplosion();

        // 模型内爆缩小然后消失
        Animation.CreateAndStartAnimation("implode", this.modelRoot, "scaling", 60, 30, this.modelRoot.scaling, Vector3.Zero(), 0);

        setTimeout(() => {
            if (this.updateObserver) this.scene.onBeforeRenderObservable.remove(this.updateObserver);
            this.root.dispose();
        }, 500);
    }

    createExplosion() {
        // 复用之前的粒子逻辑，颜色改为青紫
        const ps = new ParticleSystem("voidExplosion", 500, this.scene);
        ps.particleTexture = this.getExplosionTexture();
        ps.emitter = this.root.absolutePosition;
        ps.minEmitBox = new Vector3(-0.5, -0.5, -0.5);
        ps.maxEmitBox = new Vector3(0.5, 0.5, 0.5);
        
        ps.color1 = new Color4(0.0, 0.8, 1.0, 1.0); // 青色
        ps.color2 = new Color4(0.6, 0.0, 1.0, 1.0); // 紫色
        ps.colorDead = new Color4(0, 0, 0, 0);
        
        ps.minSize = 0.2; ps.maxSize = 0.6;
        ps.minLifeTime = 0.4; ps.maxLifeTime = 1.0;
        ps.emitRate = 2000;
        ps.targetStopDuration = 0.1;
        ps.minEmitPower = 5; ps.maxEmitPower = 10;
        
        ps.start();
        setTimeout(() => ps.dispose(), 2000);
    }

    getExplosionTexture() {
         // 简单的发光点
         if (this.scene.getTextureByName("voidParticle")) {
             return this.scene.getTextureByName("voidParticle");
         }
         const canvas = document.createElement("canvas");
         canvas.width = 32; canvas.height = 32;
         const ctx = canvas.getContext("2d");
         const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
         grad.addColorStop(0, "white");
         grad.addColorStop(1, "rgba(0,0,0,0)");
         ctx.fillStyle = grad;
         ctx.fillRect(0,0,32,32);
         return Texture.CreateFromBase64String(canvas.toDataURL(), "voidParticle", this.scene);
    }
}
