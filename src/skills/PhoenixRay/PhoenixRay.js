import { 
    Vector3, 
    MeshBuilder, 
    StandardMaterial, 
    Color3, 
    Color4, 
    ParticleSystem, 
    Texture, 
    TransformNode, 
    Mesh, 
    PointLight,
    Animation,
    Ray
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
        
        // 播放施法动画（如果有）
        // this.playCastAnimation();
    }

    /**
     * 停止引导技能（松开按键）
     */
    stopChanneling() {
        if (!this.isChanneling) return;
        this.isChanneling = false;
        
        // 清理视觉效果
        this.cleanupVisuals();
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
        // 直接挂到玩家主体上，自动跟随朝向
        this.rootNode.parent = this.player.mesh;
        this.rootNode.position = new Vector3(0, 1.2, 0);

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

        // 4. 光源
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
    }

    /**
     * 更新根节点的位置和旋转，使其始终跟随着玩家并朝向前方
     */
    updateRootTransform() {
        if (!this.rootNode) return;
        if (this.rootNode.parent) {
            this.rootNode.position.set(0, 1.2, 0);
            this.rootNode.rotation.set(0, 0, 0);
            return;
        }
        if (!this.player.mesh) return;
        const playerPos = this.player.mesh.position;
        const emitPos = playerPos.clone().add(new Vector3(0, 1.2, 0));
        this.rootNode.position = emitPos;
        const f = this.player.mesh.getDirection(Vector3.Forward());
        const rotationY = Math.atan2(f.x, f.z);
        this.rootNode.rotation = new Vector3(0, rotationY, 0);
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
