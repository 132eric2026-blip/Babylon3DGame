import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, ParticleSystem, Color4, Texture, Curve3 } from "@babylonjs/core";
import { Equipment } from "../../Equipment";

/**
 * 森林之息法杖 (Forest Breath Staff)
 * 风格：自然、森系、弯曲树枝、发光花苞
 */
export class ForestStaff extends Equipment {
    constructor(scene) {
        super(scene, "ForestStaff", "staff");
        this.init();
    }

    init() {
        const staffGroup = new TransformNode("forestStaffVisuals", this.scene);

        // === 材质 ===
        // 树木材质
        const woodMat = new StandardMaterial("woodMat", this.scene);
        woodMat.diffuseColor = new Color3(0.4, 0.25, 0.1); // 深褐色
        woodMat.specularColor = new Color3(0.1, 0.1, 0.1); // 低反光

        // 树叶材质
        const leafMat = new StandardMaterial("leafMat", this.scene);
        leafMat.diffuseColor = new Color3(0.2, 0.8, 0.2); // 鲜绿
        leafMat.backFaceCulling = false;

        // 发光花苞材质
        const glowMat = new StandardMaterial("glowMat", this.scene);
        glowMat.diffuseColor = new Color3(1.0, 0.9, 0.4); // 暖黄
        glowMat.emissiveColor = new Color3(1.0, 0.8, 0.2);
        glowMat.disableLighting = true;

        // === 1. 杖身 (弯曲的藤蔓/树枝) ===
        // 使用 Curve3 创建路径
        const pathPoints = [
            new Vector3(0, -0.8, 0),    // 底部
            new Vector3(0.02, -0.4, 0.02),
            new Vector3(-0.02, 0, -0.02), // 握持点附近
            new Vector3(0, 0.4, 0),
            new Vector3(0.1, 0.7, 0.05),
            new Vector3(-0.1, 1.0, -0.05), // 顶部弯曲开始
            new Vector3(-0.2, 1.1, 0),
            new Vector3(-0.15, 1.2, 0.1)
        ];

        const curve = Curve3.CreateCatmullRomSpline(pathPoints, 20);
        const radiusFunction = (i, distance) => {
            // 底部粗，顶部细
            return 0.04 * (1 - distance * 0.6) + 0.015;
        };

        const staffBody = MeshBuilder.CreateTube("staffBody", {
            path: curve.getPoints(),
            radiusFunction: radiusFunction,
            cap: MeshBuilder.NO_CAP,
            sideOrientation: MeshBuilder.DOUBLESIDE
        }, this.scene);
        staffBody.material = woodMat;
        staffBody.parent = staffGroup;

        // === 2. 顶部螺旋装饰 (藤蔓缠绕) ===
        const spiralPath = [];
        for (let i = 0; i < 30; i++) {
            const angle = i * 0.5;
            const r = 0.15 - i * 0.003;
            const y = 1.0 + i * 0.01;
            const x = Math.cos(angle) * r - 0.1; // Offset center
            const z = Math.sin(angle) * r;
            spiralPath.push(new Vector3(x, y, z));
        }
        const spiral = MeshBuilder.CreateTube("staffSpiral", {
            path: spiralPath,
            radius: 0.015,
            cap: MeshBuilder.CAP_ALL
        }, this.scene);
        spiral.material = woodMat;
        spiral.parent = staffGroup;

        // === 3. 树叶装饰 ===
        // 随机分布一些叶子片
        for (let i = 0; i < 12; i++) {
            const leaf = MeshBuilder.CreatePlane("leaf" + i, { size: 0.12 }, this.scene);
            leaf.material = leafMat;
            leaf.parent = staffGroup;

            // 随机位置 (主要在中上部)
            const t = 0.3 + Math.random() * 0.7;
            // 简单估算位置，围绕Y轴
            const y = -0.5 + t * 1.7;
            const angle = Math.random() * Math.PI * 2;
            const r = 0.05 + Math.random() * 0.05;

            leaf.position = new Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
            leaf.rotation = new Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        }

        // === 4. 发光花苞/萤火虫 ===
        // 顶部悬挂几个光点
        const lightPositions = [
            new Vector3(-0.1, 1.15, 0),
            new Vector3(-0.2, 1.05, 0.1),
            new Vector3(0, 1.1, -0.1)
        ];

        lightPositions.forEach((pos, idx) => {
            const bulb = MeshBuilder.CreateSphere("bulb" + idx, { diameter: 0.06 }, this.scene);
            bulb.material = glowMat;
            bulb.parent = staffGroup;
            bulb.position = pos;
        });

        // === 5. 粒子特效 (飘落的魔法花瓣/萤火虫) ===
        const particleSystem = new ParticleSystem("forestParticles", 100, this.scene);
        // 绑定到顶部区域
        const emitterMesh = MeshBuilder.CreateBox("emitter", { size: 0.5 }, this.scene);
        emitterMesh.isVisible = false;
        emitterMesh.parent = staffGroup;
        emitterMesh.position.y = 1.0;

        particleSystem.emitter = emitterMesh;

        particleSystem.color1 = new Color4(0.5, 1.0, 0.2, 1.0); // 黄绿
        particleSystem.color2 = new Color4(1.0, 1.0, 0.5, 1.0); // 浅黄
        particleSystem.colorDead = new Color4(0, 0, 0, 0.0);

        particleSystem.minSize = 0.03;
        particleSystem.maxSize = 0.08;
        particleSystem.minLifeTime = 1.0;
        particleSystem.maxLifeTime = 2.5;

        particleSystem.emitRate = 15;
        particleSystem.gravity = new Vector3(0, -0.1, 0); // 缓慢飘落
        particleSystem.minEmitPower = 0.1;
        particleSystem.maxEmitPower = 0.3;

        particleSystem.start();

        this.mesh = staffGroup;
    }
}

export function createForestStaffMesh(scene) {
    const weapon = new ForestStaff(scene);
    return weapon.mesh;
}

export function getForestStaffIcon() {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");

    ctx.clearRect(0, 0, size, size);

    // 背景：森林绿渐变
    const bg = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    bg.addColorStop(0, "rgba(20, 60, 20, 0.6)");
    bg.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // 杖身 (棕色弯曲)
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(40, 50);
    ctx.quadraticCurveTo(32, 32, 24, 14); // 弯曲向上
    ctx.stroke();

    // 顶部卷曲
    ctx.beginPath();
    ctx.arc(20, 18, 6, 0, Math.PI * 1.5, false);
    ctx.stroke();

    // 叶子 (绿色)
    ctx.fillStyle = "#32CD32";
    ctx.beginPath(); ctx.ellipse(32, 30, 4, 2, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(28, 20, 3, 1.5, -Math.PI / 4, 0, Math.PI * 2); ctx.fill();

    // 光点 (黄色发光)
    ctx.fillStyle = "#FFD700";
    ctx.shadowColor = "#FFFF00";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(20, 18, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    return c.toDataURL();
}
