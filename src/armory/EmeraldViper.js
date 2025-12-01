import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, ParticleSystem, Texture, Color4, DynamicTexture, PointLight } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";

// 创建翡翠毒蛇的视觉网格 (生物有机风格)
export function createEmeraldViperMesh(scene) {
    const gunGroup = new TransformNode("emeraldViperVisuals", scene);

    // === 材质定义 ===

    // 1. 生物甲壳材质 (深黑绿色,高光)
    const carapaceMat = new StandardMaterial("viperCarapaceMat", scene);
    carapaceMat.diffuseColor = new Color3(0.05, 0.1, 0.05);
    carapaceMat.specularColor = new Color3(0.2, 0.5, 0.2);
    carapaceMat.specularPower = 32;

    // 2. 毒液发光材质 (亮绿色,自发光)
    const venomMat = new StandardMaterial("viperVenomMat", scene);
    venomMat.emissiveColor = new Color3(0.2, 1.0, 0.0);
    venomMat.diffuseColor = new Color3(0.0, 0.8, 0.0);
    venomMat.alpha = 0.9;
    venomMat.disableLighting = true;

    // 3. 肌肉/内脏材质 (暗红色/紫色)
    const muscleMat = new StandardMaterial("viperMuscleMat", scene);
    muscleMat.diffuseColor = new Color3(0.3, 0.1, 0.2);
    muscleMat.specularColor = new Color3(0.1, 0.0, 0.0);

    // === 1. 主体 (弯曲的生物管状结构) ===
    // 使用 Tube 创建不规则的有机形状
    const path = [
        new Vector3(0, 0, -0.2),
        new Vector3(0, 0.05, 0),
        new Vector3(0, 0.02, 0.3),
        new Vector3(0, -0.02, 0.6),
        new Vector3(0, 0, 0.9)
    ];

    // 半径函数,模拟肌肉起伏
    const radiusFunction = (i, distance) => {
        if (i === 0) return 0.12; // 尾部
        if (i === 1) return 0.18; // 腹部膨胀
        if (i === 2) return 0.14; // 收缩
        if (i === 3) return 0.16; // 颈部
        return 0.10; // 嘴部
    };

    const mainBody = MeshBuilder.CreateTube("viperBody", {
        path: path,
        radiusFunction: radiusFunction,
        tessellation: 16,
        cap: 3 // CAP_ALL
    }, scene);

    mainBody.material = carapaceMat;
    mainBody.parent = gunGroup;
    mainBody.rotation.x = Math.PI / 2;

    // === 2. 毒液囊 (发光的绿色球体,嵌入身体) ===
    const venomSac = MeshBuilder.CreateSphere("venomSac", {
        diameter: 0.22,
        segments: 16
    }, scene);
    venomSac.material = venomMat;
    venomSac.parent = gunGroup;
    venomSac.position.z = 0.1; // 位于后部
    venomSac.scaling = new Vector3(1, 0.8, 1.2); // 拉伸

    // === 3. 呼吸动画 (整体脉动) ===
    const breatheAnim = new Animation(
        "breatheAnim",
        "scaling",
        30,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CYCLE
    );

    // 模拟呼吸节奏: 快吸慢呼
    breatheAnim.setKeys([
        { frame: 0, value: new Vector3(1, 1, 1) },
        { frame: 20, value: new Vector3(1.05, 1.1, 1.05) }, // 膨胀
        { frame: 60, value: new Vector3(1, 1, 1) } // 恢复
    ]);

    gunGroup.animations.push(breatheAnim);
    scene.beginAnimation(gunGroup, 0, 60, true);

    // === 4. 毒牙/喷口 (前端尖刺) ===
    const fangL = MeshBuilder.CreateCylinder("fangL", {
        height: 0.25,
        diameterTop: 0.01,
        diameterBottom: 0.06,
        tessellation: 6
    }, scene);
    fangL.rotation.x = Math.PI / 2 + 0.3; // 向下弯曲
    fangL.rotation.z = -0.2; // 向外张开
    fangL.position = new Vector3(-0.08, 0, 0.85);
    fangL.material = carapaceMat;
    fangL.parent = gunGroup;

    const fangR = MeshBuilder.CreateCylinder("fangR", {
        height: 0.25,
        diameterTop: 0.01,
        diameterBottom: 0.06,
        tessellation: 6
    }, scene);
    fangR.rotation.x = Math.PI / 2 + 0.3;
    fangR.rotation.z = 0.2;
    fangR.position = new Vector3(0.08, 0, 0.85);
    fangR.material = carapaceMat;
    fangR.parent = gunGroup;

    // === 5. 滴落的粘液粒子 (装饰性) ===
    // 仅在拾取物模式下显示,手持时可能太乱,这里先加上
    // 实际手持时可能会被 player.js 控制

    return gunGroup;
}

// 生成世界中的拾取物
export function spawnEmeraldViper(scene, position, player) {
    const root = new TransformNode("emeraldViperRoot", scene);
    root.position = position.clone();
    if (root.position.y > 0.5) {
        root.position.y = 0.5;
    }

    // === 1. 武器视觉模型 ===
    const gunVisuals = createEmeraldViperMesh(scene);
    gunVisuals.parent = root;
    gunVisuals.rotation.x = Math.PI / 2; // 竖直放置

    // === 2. 毒气光环 ===
    const aura = MeshBuilder.CreateGround("toxicAura", { width: 2.5, height: 2.5 }, scene);
    aura.parent = root;
    aura.position.y = 0.02;

    const auraMat = new StandardMaterial("toxicAuraMat", scene);
    auraMat.diffuseColor = new Color3(0, 0, 0);
    auraMat.emissiveColor = new Color3(0.2, 0.8, 0.0);

    // 创建程序化毒气纹理
    const texture = new DynamicTexture("toxicTexture", 256, scene, true);
    const ctx = texture.getContext();
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, "rgba(50, 255, 0, 0.8)");
    grad.addColorStop(0.5, "rgba(20, 150, 0, 0.4)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    texture.update();

    auraMat.diffuseTexture = texture;
    auraMat.opacityTexture = texture;
    auraMat.disableLighting = true;
    aura.material = auraMat;

    // 光环旋转
    const auraAnim = new Animation("auraAnim", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    auraAnim.setKeys([{ frame: 0, value: 0 }, { frame: 120, value: Math.PI * 2 }]);
    aura.animations.push(auraAnim);
    scene.beginAnimation(aura, 0, 120, true);

    // === 3. 气泡粒子系统 ===
    const particleSystem = new ParticleSystem("toxicBubbles", 100, scene);
    particleSystem.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    particleSystem.emitter = root;
    particleSystem.createCylinderEmitter(0.8, 0.5, 0, 0);

    particleSystem.color1 = new Color4(0.2, 1.0, 0.0, 0.8);
    particleSystem.color2 = new Color4(0.5, 0.8, 0.0, 0.6);
    particleSystem.colorDead = new Color4(0, 0.2, 0, 0);

    particleSystem.minSize = 0.05;
    particleSystem.maxSize = 0.15;
    particleSystem.minLifeTime = 1.0;
    particleSystem.maxLifeTime = 2.0;
    particleSystem.emitRate = 30;
    particleSystem.gravity = new Vector3(0, 0.5, 0); // 向上飘

    particleSystem.start();

    // === 4. 绿色点光源 ===
    const light = new PointLight("toxicLight", new Vector3(0, 1, 0), scene);
    light.parent = root;
    light.diffuse = new Color3(0.2, 1.0, 0.0);
    light.intensity = 1.5;
    light.range = 5;

    // === 5. UI 标签 ===
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("viperUI", true, scene);
    const labelAnchor = new TransformNode("labelAnchor", scene);
    labelAnchor.parent = root;
    labelAnchor.position.y = 1.5;

    const label = new TextBlock();
    label.text = "翡翠毒蛇";
    label.color = "#44FF00";
    label.fontSize = 28;
    label.fontWeight = "bold";
    label.outlineColor = "#004400";
    label.outlineWidth = 3;

    ui.addControl(label);
    label.linkWithMesh(labelAnchor);

    // === 6. 浮动动画 ===
    const floatAnim = new Animation("floatAnim", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    floatAnim.setKeys([
        { frame: 0, value: 0.5 },
        { frame: 45, value: 0.8 },
        { frame: 90, value: 0.5 }
    ]);
    gunVisuals.animations.push(floatAnim);
    scene.beginAnimation(gunVisuals, 0, 90, true);

    // === 7. 元数据 ===
    root.metadata = {
        weaponPickup: true,
        weaponName: "EmeraldViper",
        particleSystem: particleSystem,
        ui: ui,
        light: light
    };

    return root;
}
