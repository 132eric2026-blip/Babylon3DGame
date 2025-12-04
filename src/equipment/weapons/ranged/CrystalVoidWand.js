import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, ParticleSystem, Color4, Texture } from "@babylonjs/core";
import { Equipment } from "../../Equipment";

/**
 * 水晶虚空魔杖 (Crystal Void Wand)
 * 类型：枪械 (gun) - 虽然是魔杖，但在游戏逻辑中作为远程武器处理
 */
export class CrystalVoidWand extends Equipment {
    /**
     * 构造函数
     * @param {Scene} scene - BabylonJS 场景
     */
    constructor(scene) {
        super(scene, "CrystalVoidWand", "wand");
        this.init();
    }

    /**
     * 初始化网格
     */
    init() {
        // 创建魔杖的根节点
        const wandGroup = new TransformNode("crystalWandVisuals", this.scene);

        // === 材质定义 ===

        // 杖身材质 - 暗黑金属
        const rodMat = new StandardMaterial("rodMat", this.scene);
        rodMat.diffuseColor = new Color3(0.1, 0.1, 0.15);
        rodMat.specularColor = new Color3(0.3, 0.3, 0.4);
        rodMat.emissiveColor = new Color3(0.05, 0.05, 0.1);

        // 核心水晶材质 - 青色脉冲发光
        const crystalMat = new StandardMaterial("crystalMat", this.scene);
        crystalMat.diffuseColor = new Color3(0.0, 0.8, 1.0);
        crystalMat.emissiveColor = new Color3(0.0, 0.6, 0.9);
        crystalMat.alpha = 0.8;
        crystalMat.disableLighting = true;

        // 装饰环材质 - 金色
        const goldMat = new StandardMaterial("goldMat", this.scene);
        goldMat.diffuseColor = new Color3(0.8, 0.6, 0.1);
        goldMat.specularColor = new Color3(1.0, 0.9, 0.5);
        goldMat.emissiveColor = new Color3(0.2, 0.15, 0.0);

        // === 1. 杖身 (由几个部分组成) ===

        // 手柄
        const handle = MeshBuilder.CreateCylinder("wandHandle", {
            height: 0.4,
            diameter: 0.06
        }, this.scene);
        handle.rotation.x = Math.PI / 2;
        handle.material = rodMat;
        handle.parent = wandGroup;
        handle.position.z = -0.1;

        // 前段杖身 (稍微细一点)
        const shaft = MeshBuilder.CreateCylinder("wandShaft", {
            height: 0.6,
            diameter: 0.04
        }, this.scene);
        shaft.rotation.x = Math.PI / 2;
        shaft.material = rodMat;
        shaft.parent = wandGroup;
        shaft.position.z = 0.4;

        // 连接处装饰环
        const ring1 = MeshBuilder.CreateTorus("wandRing1", {
            diameter: 0.09,
            thickness: 0.03
        }, this.scene);
        ring1.rotation.x = Math.PI / 2;
        ring1.material = goldMat;
        ring1.parent = wandGroup;
        ring1.position.z = 0.1;

        // === 2. 杖头水晶 ===

        // 悬浮的主水晶 (八面体)
        const mainCrystal = MeshBuilder.CreatePolyhedron("wandCrystal", {
            type: 1, // 八面体
            size: 0.15
        }, this.scene);
        mainCrystal.material = crystalMat;
        mainCrystal.parent = wandGroup;
        mainCrystal.position.z = 0.85;

        // 水晶旋转动画
        const crystalAnim = new Animation(
            "crystalSpin",
            "rotation.z",
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        crystalAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 60, value: Math.PI * 2 }
        ]);
        mainCrystal.animations.push(crystalAnim);

        // 水晶浮动动画
        const floatAnim = new Animation(
            "crystalFloat",
            "position.z",
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        floatAnim.setKeys([
            { frame: 0, value: 0.85 },
            { frame: 30, value: 0.95 },
            { frame: 60, value: 0.85 }
        ]);
        mainCrystal.animations.push(floatAnim);

        this.scene.beginAnimation(mainCrystal, 0, 60, true);

        // === 3. 杖头环绕结构 ===
        // 3个环绕的小型护盾片
        for (let i = 0; i < 3; i++) {
            const shield = MeshBuilder.CreateBox("wandShield" + i, {
                width: 0.04,
                height: 0.3,
                depth: 0.02
            }, this.scene);
            shield.material = goldMat;
            shield.parent = wandGroup;

            // 初始位置
            const angle = (Math.PI * 2 / 3) * i;
            const radius = 0.12;

            // 放到杖头位置
            const holder = new TransformNode("shieldHolder" + i, this.scene);
            holder.parent = wandGroup;
            holder.position.z = 0.85;
            holder.rotation.z = angle;

            shield.parent = holder;
            shield.position.y = radius;
            // 稍微向内倾斜
            shield.rotation.x = -0.3;
        }

        // === 4. 粒子效果 (常驻) ===
        // 创建一个小的粒子系统在水晶周围
        const particleSystem = new ParticleSystem("wandParticles", 100, this.scene);
        particleSystem.emitter = mainCrystal;

        // 简单的点纹理，或者使用 scene 中已有的
        // 这里为了简便，不加载外部纹理，直接用颜色
        // 实际项目中可以使用 createParticleTexture 类似的方法

        particleSystem.minEmitBox = new Vector3(-0.05, -0.05, -0.05);
        particleSystem.maxEmitBox = new Vector3(0.05, 0.05, 0.05);

        particleSystem.color1 = new Color4(0.2, 1.0, 1.0, 1.0);
        particleSystem.color2 = new Color4(0.0, 0.5, 1.0, 1.0);
        particleSystem.colorDead = new Color4(0, 0, 0, 0.0);

        particleSystem.minSize = 0.02;
        particleSystem.maxSize = 0.05;
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 0.6;

        particleSystem.emitRate = 20;
        particleSystem.gravity = new Vector3(0, 0.5, 0); // 向上飘

        particleSystem.start();

        // 绑定粒子系统到 mesh 上以便随之移动 (注意：ParticleSystem 默认是世界坐标，需要 update)
        // BabylonJS 粒子系统 emitter 如果是 Mesh，会自动跟随。

        this.mesh = wandGroup;
    }
}

// 兼容 mesh 创建函数
export function createCrystalVoidWandMesh(scene) {
    const weapon = new CrystalVoidWand(scene);
    return weapon.mesh;
}

/**
 * 获取“水晶虚空魔杖”背包图标（DataURL）
 * @returns {string} DataURL
 */
export function getCrystalVoidWandIcon() {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");

    ctx.clearRect(0, 0, size, size);

    // 1. 背景辉光
    const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    glow.addColorStop(0, "rgba(0, 200, 255, 0.3)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // 坐标变换：45度角展示
    ctx.translate(32, 32);
    ctx.rotate(-Math.PI / 4);
    ctx.translate(-32, -32);

    // 2. 杖身 (深色细长)
    ctx.fillStyle = "#2a2a35";
    ctx.fillRect(28, 10, 8, 44);

    // 3. 装饰环 (金色)
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(26, 20, 12, 4);
    ctx.fillRect(26, 40, 12, 4);

    // 4. 杖头水晶 (菱形，青色)
    ctx.beginPath();
    ctx.moveTo(32, 2);
    ctx.lineTo(38, 12);
    ctx.lineTo(32, 22);
    ctx.lineTo(26, 12);
    ctx.closePath();

    const crystalGrad = ctx.createLinearGradient(32, 2, 32, 22);
    crystalGrad.addColorStop(0, "#aaffff");
    crystalGrad.addColorStop(0.5, "#00ccff");
    crystalGrad.addColorStop(1, "#006699");
    ctx.fillStyle = crystalGrad;
    ctx.fill();

    // 水晶高光
    ctx.beginPath();
    ctx.moveTo(32, 2);
    ctx.lineTo(35, 12);
    ctx.lineTo(32, 18);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();

    // 5. 环绕能量 (几个小圆点)
    ctx.fillStyle = "#00ffff";
    ctx.beginPath(); ctx.arc(20, 12, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(44, 12, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(32, -4, 2, 0, Math.PI * 2); ctx.fill();

    return c.toDataURL();
}
