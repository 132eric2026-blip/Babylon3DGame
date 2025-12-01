import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, ParticleSystem, Texture, Color4, DynamicTexture, PointLight } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";

// 创建时空劲弩的视觉网格 (蒸汽朋克风格)
export function createChronoArbalestMesh(scene) {
    const gunGroup = new TransformNode("chronoArbalestVisuals", scene);

    // === 材质定义 ===

    // 1. 黄铜材质 (齿轮、装饰)
    const brassMat = new StandardMaterial("brassMat", scene);
    brassMat.diffuseColor = new Color3(0.8, 0.6, 0.2);
    brassMat.specularColor = new Color3(0.9, 0.8, 0.4);
    brassMat.specularPower = 64;

    // 2. 胡桃木材质 (枪托)
    const woodMat = new StandardMaterial("woodMat", scene);
    woodMat.diffuseColor = new Color3(0.4, 0.2, 0.1);
    woodMat.specularColor = new Color3(0.1, 0.1, 0.1); // 低光泽

    // 3. 紫铜材质 (管道)
    const copperMat = new StandardMaterial("copperMat", scene);
    copperMat.diffuseColor = new Color3(0.7, 0.3, 0.2);
    copperMat.specularColor = new Color3(0.8, 0.4, 0.3);

    // 4. 发光能量 (时间能量)
    const timeMat = new StandardMaterial("timeMat", scene);
    timeMat.emissiveColor = new Color3(1.0, 0.8, 0.4); // 金色光芒
    timeMat.disableLighting = true;

    // === 1. 枪身主体 (木质 + 黄铜加固) ===
    const stock = MeshBuilder.CreateBox("stock", { width: 0.12, height: 0.2, depth: 0.6 }, scene);
    stock.material = woodMat;
    stock.parent = gunGroup;
    stock.position.z = 0.1;

    const barrel = MeshBuilder.CreateCylinder("barrel", { height: 0.8, diameter: 0.08 }, scene);
    barrel.rotation.x = Math.PI / 2;
    barrel.material = brassMat;
    barrel.parent = gunGroup;
    barrel.position.z = 0.5;

    // === 2. 弩臂 (紫铜) ===
    const bowWidth = 0.8;
    const bow = MeshBuilder.CreateTube("bow", {
        path: [
            new Vector3(-bowWidth / 2, 0, 0.2),
            new Vector3(-bowWidth / 4, 0, 0.1),
            new Vector3(0, 0, 0),
            new Vector3(bowWidth / 4, 0, 0.1),
            new Vector3(bowWidth / 2, 0, 0.2)
        ],
        radius: 0.04,
        cap: 3
    }, scene);
    bow.material = copperMat;
    bow.parent = gunGroup;
    bow.position.z = 0.6;

    // === 3. 旋转齿轮系统 (核心特征) ===
    const createGear = (name, size, teeth, pos) => {
        const gear = MeshBuilder.CreateCylinder(name, { height: 0.05, diameter: size, tessellation: teeth * 2 }, scene);
        gear.rotation.x = Math.PI / 2;
        gear.position = pos;
        gear.material = brassMat;
        gear.parent = gunGroup;
        return gear;
    };

    // 主齿轮 (大)
    const mainGear = createGear("mainGear", 0.3, 12, new Vector3(0, 0.12, 0.2));

    // 副齿轮 (小)
    const subGear1 = createGear("subGear1", 0.15, 8, new Vector3(-0.15, 0.12, 0.05));
    const subGear2 = createGear("subGear2", 0.15, 8, new Vector3(0.15, 0.12, 0.05));

    // 齿轮动画
    const rotateAnim = new Animation("gearRotate", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    rotateAnim.setKeys([{ frame: 0, value: 0 }, { frame: 120, value: Math.PI * 2 }]);

    const rotateAnimRev = new Animation("gearRotateRev", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    rotateAnimRev.setKeys([{ frame: 0, value: 0 }, { frame: 120, value: -Math.PI * 2 }]);

    mainGear.animations.push(rotateAnim);
    subGear1.animations.push(rotateAnimRev);
    subGear2.animations.push(rotateAnimRev);

    scene.beginAnimation(mainGear, 0, 120, true);
    scene.beginAnimation(subGear1, 0, 120, true);
    scene.beginAnimation(subGear2, 0, 120, true);

    // === 4. 蒸汽管道与排气口 ===
    const pipeL = MeshBuilder.CreateTube("pipeL", {
        path: [new Vector3(-0.08, 0, 0), new Vector3(-0.12, 0.1, 0.3), new Vector3(-0.12, 0.1, 0.6)],
        radius: 0.02
    }, scene);
    pipeL.material = copperMat;
    pipeL.parent = gunGroup;

    const pipeR = MeshBuilder.CreateTube("pipeR", {
        path: [new Vector3(0.08, 0, 0), new Vector3(0.12, 0.1, 0.3), new Vector3(0.12, 0.1, 0.6)],
        radius: 0.02
    }, scene);
    pipeR.material = copperMat;
    pipeR.parent = gunGroup;

    // === 5. 蒸汽粒子系统 (挂载在枪上) ===
    // 注意: 这里创建粒子系统是为了拾取物展示。手持时需要在 player.js 中重新创建或复用。
    // 为了简单起见，我们在 spawn 函数中处理拾取物的粒子，这里只返回网格结构。

    return gunGroup;
}

// 生成世界中的拾取物
export function spawnChronoArbalest(scene, position, player) {
    const root = new TransformNode("chronoArbalestRoot", scene);
    root.position = position.clone();
    if (root.position.y > 0.5) {
        root.position.y = 0.5;
    }

    // === 1. 武器视觉模型 ===
    const gunVisuals = createChronoArbalestMesh(scene);
    gunVisuals.parent = root;
    gunVisuals.rotation.x = Math.PI / 2; // 竖直放置

    // === 2. 时钟光环 (地面) ===
    const aura = MeshBuilder.CreateGround("clockAura", { width: 3, height: 3 }, scene);
    aura.parent = root;
    aura.position.y = 0.02;

    const auraMat = new StandardMaterial("clockAuraMat", scene);
    auraMat.diffuseColor = new Color3(0, 0, 0);
    auraMat.emissiveColor = new Color3(1.0, 0.8, 0.4); // 金色

    // 绘制时钟表盘纹理
    const texture = new DynamicTexture("clockTexture", 512, scene, true);
    const ctx = texture.getContext();
    const cx = 256, cy = 256;

    ctx.clearRect(0, 0, 512, 512);

    // 外圈
    ctx.strokeStyle = "rgba(255, 200, 100, 0.8)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 200, 0, Math.PI * 2);
    ctx.stroke();

    // 刻度
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x1 = cx + Math.cos(angle) * 180;
        const y1 = cy + Math.sin(angle) * 180;
        const x2 = cx + Math.cos(angle) * 200;
        const y2 = cy + Math.sin(angle) * 200;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // 罗马数字 (简化为线条)

    texture.update();

    auraMat.diffuseTexture = texture;
    auraMat.opacityTexture = texture;
    auraMat.disableLighting = true;
    aura.material = auraMat;

    // 光环旋转 (像秒针一样跳动?) 不，平滑旋转吧
    const auraAnim = new Animation("auraAnim", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    auraAnim.setKeys([{ frame: 0, value: 0 }, { frame: 600, value: Math.PI * 2 }]); // 慢速旋转
    aura.animations.push(auraAnim);
    scene.beginAnimation(aura, 0, 600, true);

    // === 3. 蒸汽粒子 ===
    const steamPS = new ParticleSystem("steamPS", 100, scene);
    steamPS.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/cloud.png", scene);
    steamPS.emitter = root;
    steamPS.createConeEmitter(0.5, 0.5);

    steamPS.color1 = new Color4(1.0, 1.0, 1.0, 0.5); // 白烟
    steamPS.color2 = new Color4(0.8, 0.8, 0.8, 0.2);
    steamPS.colorDead = new Color4(0.5, 0.5, 0.5, 0.0);

    steamPS.minSize = 0.2;
    steamPS.maxSize = 0.5;
    steamPS.minLifeTime = 1.0;
    steamPS.maxLifeTime = 2.0;
    steamPS.emitRate = 20; // 间歇性喷射效果最好，但这里先持续
    steamPS.gravity = new Vector3(0, 1.0, 0); // 向上飘

    steamPS.start();

    // === 4. 金色点光源 ===
    const light = new PointLight("clockLight", new Vector3(0, 1, 0), scene);
    light.parent = root;
    light.diffuse = new Color3(1.0, 0.8, 0.4);
    light.intensity = 1.2;
    light.range = 6;

    // === 5. UI 标签 ===
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("chronoUI", true, scene);
    const labelAnchor = new TransformNode("labelAnchor", scene);
    labelAnchor.parent = root;
    labelAnchor.position.y = 1.6;

    const label = new TextBlock();
    label.text = "时空劲弩";
    label.color = "#FFCC00";
    label.fontSize = 28;
    label.fontWeight = "bold";
    label.outlineColor = "#442200";
    label.outlineWidth = 3;

    ui.addControl(label);
    label.linkWithMesh(labelAnchor);

    // === 6. 浮动动画 ===
    const floatAnim = new Animation("floatAnim", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    floatAnim.setKeys([
        { frame: 0, value: 0.5 },
        { frame: 60, value: 0.7 },
        { frame: 120, value: 0.5 }
    ]);
    gunVisuals.animations.push(floatAnim);
    scene.beginAnimation(gunVisuals, 0, 120, true);

    // === 7. 元数据 ===
    root.metadata = {
        weaponPickup: true,
        weaponName: "ChronoArbalest",
        particleSystem: steamPS,
        ui: ui,
        light: light
    };

    return root;
}
