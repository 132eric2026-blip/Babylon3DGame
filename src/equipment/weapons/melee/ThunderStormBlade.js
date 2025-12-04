import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, ParticleSystem, Color4 } from "@babylonjs/core";
import { Equipment } from "../../Equipment";

/**
 * 雷霆风暴之刃 (Thunder Storm Blade)
 * 类型：剑 (sword) - 近战武器
 * 描述：一把蕴含着远古雷霆之力的史诗巨剑，剑身流动着狂暴的电光。
 */
export class ThunderStormBlade extends Equipment {
    /**
     * 构造函数
     * @param {Scene} scene - BabylonJS 场景
     */
    constructor(scene) {
        super(scene, "ThunderStormBlade", "sword");
        this.init();
    }

    /**
     * 初始化网格
     */
    init() {
        // 创建武器的根节点
        const swordGroup = new TransformNode("thunderSwordVisuals", this.scene);

        // === 材质定义 ===

        // 剑刃材质 - 充能核心 (高亮蓝白)
        const energyMat = new StandardMaterial("energyMat", this.scene);
        energyMat.diffuseColor = new Color3(0.4, 0.8, 1.0);
        energyMat.emissiveColor = new Color3(0.6, 0.9, 1.0);
        energyMat.specularColor = new Color3(1.0, 1.0, 1.0);
        energyMat.alpha = 0.9;

        // 剑锋材质 - 暗黑金属 (包裹能量)
        const darkMetalMat = new StandardMaterial("darkMetalMat", this.scene);
        darkMetalMat.diffuseColor = new Color3(0.1, 0.1, 0.15);
        darkMetalMat.specularColor = new Color3(0.4, 0.4, 0.5);
        darkMetalMat.emissiveColor = new Color3(0.05, 0.05, 0.1);

        // 剑柄/护手材质 - 黄金与青铜
        const hiltMat = new StandardMaterial("hiltMat", this.scene);
        hiltMat.diffuseColor = new Color3(0.8, 0.6, 0.2);
        hiltMat.specularColor = new Color3(1.0, 0.8, 0.4);
        hiltMat.emissiveColor = new Color3(0.1, 0.05, 0.0);

        // === 1. 剑身 (Blade) ===
        
        // 核心能量刃 (稍微细一点，在中间)
        const bladeCore = MeshBuilder.CreateBox("bladeCore", {
            height: 1.8,
            width: 0.15,
            depth: 0.04
        }, this.scene);
        bladeCore.material = energyMat;
        bladeCore.parent = swordGroup;
        bladeCore.position.y = 1.1; // 向上偏移

        // 剑刃外壳 (分成两半，夹住能量)
        // 左刃
        const bladeEdgeL = MeshBuilder.CreateCylinder("bladeEdgeL", {
            height: 1.8,
            diameterTop: 0.01,
            diameterBottom: 0.1,
            tessellation: 3
        }, this.scene);
        bladeEdgeL.scaling.x = 0.5; // 压扁
        bladeEdgeL.rotation.z = 0.05; // 稍微向外张开
        bladeEdgeL.position = new Vector3(-0.08, 1.1, 0);
        bladeEdgeL.material = darkMetalMat;
        bladeEdgeL.parent = swordGroup;

        // 右刃
        const bladeEdgeR = MeshBuilder.CreateCylinder("bladeEdgeR", {
            height: 1.8,
            diameterTop: 0.01,
            diameterBottom: 0.1,
            tessellation: 3
        }, this.scene);
        bladeEdgeR.scaling.x = 0.5;
        bladeEdgeR.rotation.z = -0.05;
        bladeEdgeR.rotation.y = Math.PI; // 翻转
        bladeEdgeR.position = new Vector3(0.08, 1.1, 0);
        bladeEdgeR.material = darkMetalMat;
        bladeEdgeR.parent = swordGroup;


        // === 2. 护手 (Crossguard) ===
        
        // 护手主体 - 雷霆造型
        const guardCenter = MeshBuilder.CreateBox("guardCenter", {
            width: 0.4,
            height: 0.15,
            depth: 0.15
        }, this.scene);
        guardCenter.position.y = 0.1;
        guardCenter.material = hiltMat;
        guardCenter.parent = swordGroup;

        // 护手翼 (左右各一个尖刺)
        const guardWingL = MeshBuilder.CreateCylinder("guardWingL", {
            height: 0.5,
            diameterTop: 0.02,
            diameterBottom: 0.12,
            tessellation: 4
        }, this.scene);
        guardWingL.rotation.z = Math.PI / 2 + 0.3; // 稍微上翘
        guardWingL.position = new Vector3(-0.35, 0.2, 0);
        guardWingL.material = hiltMat;
        guardWingL.parent = swordGroup;

        const guardWingR = MeshBuilder.CreateCylinder("guardWingR", {
            height: 0.5,
            diameterTop: 0.02,
            diameterBottom: 0.12,
            tessellation: 4
        }, this.scene);
        guardWingR.rotation.z = -(Math.PI / 2 + 0.3);
        guardWingR.position = new Vector3(0.35, 0.2, 0);
        guardWingR.material = hiltMat;
        guardWingR.parent = swordGroup;

        // 护手中心的能量宝石
        const gem = MeshBuilder.CreateSphere("guardGem", {
            diameter: 0.15,
            segments: 8
        }, this.scene);
        gem.position.y = 0.1;
        gem.position.z = 0.08; // 稍微突出
        gem.scaling.z = 0.5; // 扁平一点
        gem.material = energyMat;
        gem.parent = swordGroup;

        // === 3. 剑柄 (Hilt & Pommel) ===

        // 握把
        const handle = MeshBuilder.CreateCylinder("swordHandle", {
            height: 0.6,
            diameter: 0.07
        }, this.scene);
        handle.position.y = -0.3;
        handle.material = darkMetalMat;
        handle.parent = swordGroup;

        // 剑首 (Pommel)
        const pommel = MeshBuilder.CreateSphere("pommel", {
            diameter: 0.12
        }, this.scene);
        pommel.position.y = -0.65;
        pommel.material = hiltMat;
        pommel.parent = swordGroup;

        // === 4. 动画效果 ===

        // 能量脉冲动画 (缩放)
        const pulseAnim = new Animation(
            "energyPulse",
            "scaling",
            30,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const keys = [];
        keys.push({ frame: 0, value: new Vector3(1, 1, 1) });
        keys.push({ frame: 30, value: new Vector3(1.1, 1, 1.1) }); // 剑芯变粗
        keys.push({ frame: 60, value: new Vector3(1, 1, 1) });
        
        pulseAnim.setKeys(keys);
        bladeCore.animations.push(pulseAnim);
        this.scene.beginAnimation(bladeCore, 0, 60, true);

        // 宝石闪烁动画 (Emissive Color)
        // 注意：直接动画 Color3 比较麻烦，这里简单用缩放代替闪烁感，或者可以单独做材质动画
        // 这里给宝石也加一个微小的旋转
        const gemAnim = new Animation(
            "gemSpin",
            "rotation.z",
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        gemAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 120, value: Math.PI * 2 }
        ]);
        gem.animations.push(gemAnim);
        this.scene.beginAnimation(gem, 0, 120, true);


        // === 5. 粒子效果 (雷电火花) ===
        
        const particleSystem = new ParticleSystem("sparks", 200, this.scene);
        particleSystem.emitter = bladeCore; // 从剑芯发射
        
        // 发射区域：整个剑身长度
        particleSystem.minEmitBox = new Vector3(-0.05, -0.8, -0.02);
        particleSystem.maxEmitBox = new Vector3(0.05, 0.8, 0.02);

        // 颜色：电光蓝 -> 白色 -> 透明
        particleSystem.color1 = new Color4(0.2, 0.8, 1.0, 1.0);
        particleSystem.color2 = new Color4(1.0, 1.0, 1.0, 1.0);
        particleSystem.colorDead = new Color4(0, 0, 0, 0.0);

        particleSystem.minSize = 0.02;
        particleSystem.maxSize = 0.08;
        particleSystem.minLifeTime = 0.1;
        particleSystem.maxLifeTime = 0.3;

        particleSystem.emitRate = 50;
        
        // 随机飞溅
        particleSystem.direction1 = new Vector3(-1, 0, -1);
        particleSystem.direction2 = new Vector3(1, 0, 1);
        particleSystem.minEmitPower = 0.2;
        particleSystem.maxEmitPower = 0.5;
        particleSystem.updateSpeed = 0.01;

        particleSystem.start();

        // 调整整体大小和位置，使其适合握持
        swordGroup.scaling = new Vector3(0.5, 0.5, 0.5); // 稍微缩小一点
        swordGroup.rotation.x = Math.PI / 2; // 旋转以匹配手持方向 (通常Z轴向前或Y轴向上，取决于具体的骨骼绑定)
        // 这里假设手持时，Z轴是武器指向，Y轴是上方。
        // 之前的构建是 Y 轴向上。
        // 我们需要把它放倒，指着 Z 轴正向。
        swordGroup.rotation.x = Math.PI / 2; 

        this.mesh = swordGroup;
    }
}

// 兼容 mesh 创建函数
export function createThunderStormBladeMesh(scene) {
    const weapon = new ThunderStormBlade(scene);
    return weapon.mesh;
}

// 兼容旧的 spawn 函数
export function spawnThunderStormBlade(scene, position) {
    const weapon = new ThunderStormBlade(scene);
    if (weapon.mesh) {
        weapon.mesh.position = position;
    }
    return weapon.mesh;
}

/**
 * 获取“雷霆风暴之刃”背包图标
 * @returns {string} DataURL
 */
export function getThunderStormBladeIcon() {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");

    ctx.clearRect(0, 0, size, size);

    // 1. 背景辉光 (雷电蓝)
    const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    glow.addColorStop(0, "rgba(100, 200, 255, 0.6)");
    glow.addColorStop(1, "rgba(0, 0, 50, 0.0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // 2. 剑身剪影
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(Math.PI / 4); // 斜着放

    // 剑刃
    ctx.fillStyle = "#88ccff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(4, -10);
    ctx.lineTo(3, 10);
    ctx.lineTo(0, 12);
    ctx.lineTo(-3, 10);
    ctx.lineTo(-4, -10);
    ctx.closePath();
    ctx.fill();

    // 剑柄
    ctx.fillStyle = "#d4af37"; // 金色
    ctx.shadowBlur = 0;
    ctx.fillRect(-6, 10, 12, 4); // 护手
    ctx.fillStyle = "#333";
    ctx.fillRect(-1.5, 14, 3, 8); // 握把
    ctx.fillStyle = "#d4af37";
    ctx.beginPath();
    ctx.arc(0, 24, 2.5, 0, Math.PI * 2); // 剑首
    ctx.fill();

    ctx.restore();

    return c.toDataURL("image/png");
}
