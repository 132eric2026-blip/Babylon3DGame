import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation } from "@babylonjs/core";
import { Equipment } from "../../Equipment";

/**
 * 日耀等离子炮 (Solar Plasma Cannon)
 * 类型：枪械 (gun)
 */
export class SolarPlasmaCannon extends Equipment {
    /**
     * 构造函数
     * @param {Scene} scene - BabylonJS 场景
     */
    constructor(scene) {
        super(scene, "SolarPlasmaCannon", "gun");
        this.init();
    }

    /**
     * 初始化网格
     */
    init() {
        // 创建枪械的根节点
        const gunGroup = new TransformNode("solarCannonVisuals", this.scene);

        // === 材质定义 ===

        // 主体紫色材质
        const purpleMat = new StandardMaterial("solarPurpleMat", this.scene);
        purpleMat.diffuseColor = new Color3(0.5, 0.2, 0.7);  // 紫色
        purpleMat.specularColor = new Color3(0.4, 0.3, 0.5);
        purpleMat.specularPower = 32;

        // 深紫色材质（用于装饰）
        const darkPurpleMat = new StandardMaterial("solarDarkPurpleMat", this.scene);
        darkPurpleMat.diffuseColor = new Color3(0.3, 0.1, 0.5);
        darkPurpleMat.specularColor = new Color3(0.2, 0.1, 0.3);

        // 熔岩能量材质（发光橙红色）
        const lavaMat = new StandardMaterial("solarLavaMat", this.scene);
        lavaMat.emissiveColor = new Color3(1.0, 0.4, 0.1);  // 橙红色发光
        lavaMat.diffuseColor = new Color3(1.0, 0.3, 0.0);
        lavaMat.disableLighting = true;

        // === 1. 粗壮主体炮身 ===
        const mainBody = MeshBuilder.CreateCylinder("solarMainBody", {
            height: 0.6,
            diameterTop: 0.25,
            diameterBottom: 0.3
        }, this.scene);
        mainBody.rotation.x = Math.PI / 2;  // 横向放置
        mainBody.material = purpleMat;
        mainBody.parent = gunGroup;
        mainBody.position.z = 0.1;

        // === 2. 能量反应炉（枪尾部分）===
        const reactor = MeshBuilder.CreateSphere("solarReactor", {
            diameter: 0.35,
            segments: 16
        }, this.scene);
        reactor.material = darkPurpleMat;
        reactor.parent = gunGroup;
        reactor.position.z = -0.25;

        // 反应炉内部 - 滚动熔岩能量球
        const lavaCore = MeshBuilder.CreateSphere("solarLavaCore", {
            diameter: 0.25,
            segments: 16
        }, this.scene);
        lavaCore.material = lavaMat;
        lavaCore.parent = reactor;
        lavaCore.position = new Vector3(0, 0, 0);

        // 熔岩核心旋转动画
        const lavaCoreRotAnim = new Animation(
            "lavaCoreRotAnim",
            "rotation.y",
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        lavaCoreRotAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 100, value: Math.PI * 2 }
        ]);
        lavaCore.animations.push(lavaCoreRotAnim);
        this.scene.beginAnimation(lavaCore, 0, 100, true);

        // === 3. 炮口部分 ===
        const muzzle = MeshBuilder.CreateCylinder("solarMuzzle", {
            height: 0.35,
            diameterTop: 0.18,
            diameterBottom: 0.14
        }, this.scene);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.material = purpleMat;
        muzzle.parent = gunGroup;
        muzzle.position.z = 0.55;

        // 炮口发光环
        const muzzleGlow = MeshBuilder.CreateTorus("solarMuzzleGlow", {
            diameter: 0.2,
            thickness: 0.03
        }, this.scene);
        muzzleGlow.rotation.x = Math.PI / 2;
        muzzleGlow.material = lavaMat;
        muzzleGlow.parent = gunGroup;
        muzzleGlow.position.z = 0.7;

        // === 4. 装饰散热片（4片，环绕主体）===
        for (let i = 0; i < 4; i++) {
            const fin = MeshBuilder.CreateBox("solarFin" + i, {
                width: 0.05,
                height: 0.35,
                depth: 0.15
            }, this.scene);
            fin.material = darkPurpleMat;
            fin.parent = gunGroup;
            
            // 围绕中心旋转布局
            const angle = (Math.PI / 2) * i;
            const radius = 0.18;
            fin.position.x = Math.cos(angle) * radius;
            fin.position.y = Math.sin(angle) * radius;
            fin.position.z = 0.1;
            fin.rotation.z = angle;
        }

        // 将创建的网格组赋值给基类的 mesh 属性
        this.mesh = gunGroup;
    }
}

// 兼容旧的 spawn 函数 (如果需要的话，但建议迁移到类用法)
export function spawnSolarPlasmaCannon(scene, position) {
    const weapon = new SolarPlasmaCannon(scene);
    if (weapon.mesh) {
        weapon.mesh.position = position;
    }
    return weapon.mesh;
}

// 兼容旧的 mesh 创建函数
export function createSolarPlasmaCannonMesh(scene) {
    const weapon = new SolarPlasmaCannon(scene);
    return weapon.mesh;
}

/**
 * 获取“日耀等离子炮”背包图标（DataURL）
 * 图标风格与模型一致：主体紫色、尾部暗紫反应炉、橙红熔岩核心、前端发光炮口环与散热片
 * @returns {string} DataURL
 */
export function getSolarPlasmaCannonIcon() {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");

    ctx.clearRect(0, 0, size, size);
    ctx.translate(0.5, 0.5);

    // 颜色定义
    const purpleGrad = ctx.createLinearGradient(22, 26, 50, 38);
    purpleGrad.addColorStop(0, "#7a3bb3");
    purpleGrad.addColorStop(0.5, "#612a8f");
    purpleGrad.addColorStop(1, "#4c1f72");

    const darkPurple = "#3a155c";
    const lavaCoreOuter = ctx.createRadialGradient(16, 32, 0, 16, 32, 9);
    lavaCoreOuter.addColorStop(0, "rgba(255,160,70,1)");
    lavaCoreOuter.addColorStop(0.6, "rgba(255,110,30,0.9)");
    lavaCoreOuter.addColorStop(1, "rgba(255,80,20,0.0)");

    // 背景微光
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, size, size);

    // 1) 反应炉主体（暗紫圆）
    ctx.beginPath();
    ctx.arc(16, 32, 10, 0, Math.PI * 2);
    ctx.fillStyle = darkPurple;
    ctx.fill();

    // 2) 熔岩核心（橙红发光）
    ctx.beginPath();
    ctx.arc(16, 32, 9, 0, Math.PI * 2);
    ctx.fillStyle = lavaCoreOuter;
    ctx.fill();

    // 3) 粗壮炮身（紫色渐变，圆角矩形）
    ctx.beginPath();
    const x = 22, y = 26, w = 28, h = 12, r = 6;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = purpleGrad;
    ctx.fill();

    // 4) 装饰散热片（四片）
    const fins = [
        {px: 30, py: 24}, {px: 34, py: 24}, {px: 30, py: 40}, {px: 34, py: 40}
    ];
    ctx.fillStyle = darkPurple;
    fins.forEach(f => {
        ctx.beginPath();
        ctx.roundRect(f.px, f.py, 6, 6, 2);
        ctx.fill();
    });

    // 5) 炮口发光环（橙红描边与外圈柔光）
    // 外圈柔光
    const glowGrad = ctx.createRadialGradient(52, 32, 2, 52, 32, 9);
    glowGrad.addColorStop(0, "rgba(255,160,70,0.6)");
    glowGrad.addColorStop(1, "rgba(255,160,70,0)");
    ctx.beginPath();
    ctx.arc(52, 32, 9, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // 内圈亮环
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ff7a2a";
    ctx.arc(52, 32, 6, 0, Math.PI * 2);
    ctx.stroke();

    // 细节高光线（炮身顶部）
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.moveTo(26, 27);
    ctx.lineTo(46, 27);
    ctx.stroke();

    return c.toDataURL();
}
