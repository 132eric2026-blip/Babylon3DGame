import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, ParticleSystem, Texture, Color4, DynamicTexture, Mesh, ShaderMaterial, Effect } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";

// 创建日耀等离子炮的视觉网格
export function createSolarPlasmaCannonMesh(scene) {
    const gunGroup = new TransformNode("solarCannonVisuals", scene);

    // === 材质定义 ===

    // 主体紫色材质
    const purpleMat = new StandardMaterial("solarPurpleMat", scene);
    purpleMat.diffuseColor = new Color3(0.5, 0.2, 0.7);  // 紫色
    purpleMat.specularColor = new Color3(0.4, 0.3, 0.5);
    purpleMat.specularPower = 32;

    // 深紫色材质（用于装饰）
    const darkPurpleMat = new StandardMaterial("solarDarkPurpleMat", scene);
    darkPurpleMat.diffuseColor = new Color3(0.3, 0.1, 0.5);
    darkPurpleMat.specularColor = new Color3(0.2, 0.1, 0.3);

    // 熔岩能量材质（发光橙红色）
    const lavaMat = new StandardMaterial("solarLavaMat", scene);
    lavaMat.emissiveColor = new Color3(1.0, 0.4, 0.1);  // 橙红色发光
    lavaMat.diffuseColor = new Color3(1.0, 0.3, 0.0);
    lavaMat.disableLighting = true;

    // === 1. 粗壮主体炮身 ===
    const mainBody = MeshBuilder.CreateCylinder("solarMainBody", {
        height: 0.6,
        diameterTop: 0.25,
        diameterBottom: 0.3
    }, scene);
    mainBody.rotation.x = Math.PI / 2;  // 横向放置
    mainBody.material = purpleMat;
    mainBody.parent = gunGroup;
    mainBody.position.z = 0.1;

    // === 2. 能量反应炉（枪尾部分）===
    const reactor = MeshBuilder.CreateSphere("solarReactor", {
        diameter: 0.35,
        segments: 16
    }, scene);
    reactor.material = darkPurpleMat;
    reactor.parent = gunGroup;
    reactor.position.z = -0.25;

    // 反应炉内部 - 滚动熔岩能量球
    const lavaCore = MeshBuilder.CreateSphere("solarLavaCore", {
        diameter: 0.25,
        segments: 16
    }, scene);
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
    scene.beginAnimation(lavaCore, 0, 100, true);

    // === 3. 炮口部分 ===
    const muzzle = MeshBuilder.CreateCylinder("solarMuzzle", {
        height: 0.35,
        diameterTop: 0.18,
        diameterBottom: 0.14
    }, scene);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.material = purpleMat;
    muzzle.parent = gunGroup;
    muzzle.position.z = 0.55;

    // 炮口发光环
    const muzzleGlow = MeshBuilder.CreateTorus("solarMuzzleGlow", {
        diameter: 0.2,
        thickness: 0.03
    }, scene);
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
        }, scene);
        fin.material = darkPurpleMat;
        fin.parent = gunGroup;

        const angle = (Math.PI * 2 / 4) * i;
        const radius = 0.18;
        fin.position.x = Math.cos(angle) * radius;
        fin.position.y = Math.sin(angle) * radius;
        fin.position.z = 0.25;
        fin.rotation.z = angle;
    }

    // === 5. 能量流动管道（用于充能动画）===
    const energyTube = MeshBuilder.CreateTorus("solarEnergyTube", {
        diameter: 0.35,
        thickness: 0.02
    }, scene);
    energyTube.rotation.x = Math.PI / 2;
    energyTube.material = lavaMat;
    energyTube.parent = gunGroup;
    energyTube.position.z = -0.05;
    energyTube.visibility = 0.5;  // 半透明效果

    return gunGroup;
}

// 生成世界中的拾取物
export function spawnSolarPlasmaCannon(scene, position, player) {
    const root = new TransformNode("solarWeaponRoot", scene);
    root.position = position.clone();
    if (root.position.y > 0.5) {
        root.position.y = 0.5;
    }

    // === 1. 武器视觉模型 ===
    const gunVisuals = createSolarPlasmaCannonMesh(scene);
    gunVisuals.parent = root;
    gunVisuals.rotation.x = Math.PI / 2;  // 竖直放置用于拾取

    // === 2. 紫色英雄光环 + 粒子效果 ===

    // 创建紫色光环纹理
    const createPurpleAuraTexture = () => {
        const textureSize = 512;
        const texture = new DynamicTexture("solarAuraTexture", textureSize, scene, true);
        const ctx = texture.getContext();
        const cx = textureSize / 2;
        const cy = textureSize / 2;

        ctx.clearRect(0, 0, textureSize, textureSize);

        // 外部紫色光晕
        const gradient = ctx.createRadialGradient(cx, cy, textureSize * 0.2, cx, cy, textureSize * 0.5);
        gradient.addColorStop(0, "rgba(128, 0, 255, 0)");     // 中心透明
        gradient.addColorStop(0.5, "rgba(150, 50, 255, 0.7)"); // 紫色光环
        gradient.addColorStop(0.8, "rgba(180, 80, 255, 0.9)"); // 外层紫色
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");          // 边缘渐隐

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, textureSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // 内部能量符文（熔岩纹路）
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = "rgba(255, 150, 0, 0.9)";  // 橙色
        ctx.lineWidth = 8;

        // 绘制6条能量脉络
        for (let j = 0; j < 6; j++) {
            ctx.rotate(Math.PI * 2 / 6);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 180);
            ctx.stroke();
        }

        ctx.restore();
        texture.update();
        return texture;
    };

    // A. 地面光环网格
    const auraSize = 3.0;
    const auraMesh = MeshBuilder.CreateGround("solarAura", { width: auraSize, height: auraSize }, scene);
    auraMesh.parent = root;
    auraMesh.position.y = 0.02;

    const auraMat = new StandardMaterial("solarAuraMat", scene);
    auraMat.diffuseTexture = createPurpleAuraTexture();
    auraMat.diffuseTexture.hasAlpha = true;
    auraMat.useAlphaFromDiffuseTexture = true;
    auraMat.emissiveColor = new Color3(0.6, 0.3, 1.0);  // 紫色发光
    auraMat.disableLighting = true;
    auraMat.alpha = 0.85;
    auraMesh.material = auraMat;

    // 光环旋转动画
    const animAura = new Animation(
        "animAura",
        "rotation.y",
        30,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CYCLE
    );
    animAura.setKeys([
        { frame: 0, value: 0 },
        { frame: 180, value: Math.PI * 2 }
    ]);
    auraMesh.animations.push(animAura);
    scene.beginAnimation(auraMesh, 0, 180, true);

    // B. 粒子系统（紫色能量上升）
    const particleSystem = new ParticleSystem("solarParticles", 250, scene);
    particleSystem.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    particleSystem.emitter = root;

    const radius = 1.2;
    particleSystem.createCylinderEmitter(radius, 0.1, 0, 0);

    // 紫色/橙色粒子
    particleSystem.color1 = new Color4(0.6, 0.2, 1.0, 1.0);  // 紫色
    particleSystem.color2 = new Color4(1.0, 0.5, 0.2, 1.0);  // 橙色
    particleSystem.colorDead = new Color4(0.3, 0.1, 0.5, 0.0);

    particleSystem.minSize = 0.2;
    particleSystem.maxSize = 0.4;

    particleSystem.minLifeTime = 1.0;
    particleSystem.maxLifeTime = 2.0;

    particleSystem.emitRate = 60;
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

    particleSystem.gravity = new Vector3(0, 2.0, 0);  // 向上升起
    particleSystem.direction1 = new Vector3(-0.4, 1.2, -0.4);
    particleSystem.direction2 = new Vector3(0.4, 1.2, 0.4);

    particleSystem.minAngularSpeed = 0;
    particleSystem.maxAngularSpeed = Math.PI;

    particleSystem.start();

    // === 3. 名称标签 ===
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("solarUI", true, scene);

    const labelAnchor = new TransformNode("solarLabelAnchor", scene);
    labelAnchor.parent = root;
    labelAnchor.position.y = 1.6;

    const label = new TextBlock();
    label.text = "日耀等离子炮";
    label.color = "#BB66FF";  // 紫色
    label.fontSize = 26;
    label.fontWeight = "bold";
    label.outlineColor = "black";
    label.outlineWidth = 2;

    ui.addControl(label);
    label.linkWithMesh(labelAnchor);
    label.linkOffsetY = 0;

    // === 4. 浮动和旋转动画 ===
    const frameRate = 10;
    const animRot = new Animation(
        "animRot",
        "rotation.y",
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CYCLE
    );
    animRot.setKeys([
        { frame: 0, value: 0 },
        { frame: frameRate * 4, value: Math.PI * 2 }
    ]);
    gunVisuals.animations.push(animRot);

    const animFloat = new Animation(
        "animFloat",
        "position.y",
        frameRate,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CYCLE
    );
    animFloat.setKeys([
        { frame: 0, value: 0.5 },
        { frame: frameRate * 2, value: 0.95 },
        { frame: frameRate * 4, value: 0.5 }
    ]);
    gunVisuals.animations.push(animFloat);

    scene.beginAnimation(gunVisuals, 0, frameRate * 4, true);
    root.metadata = root.metadata || {};
    root.metadata.weaponPickup = true;
    root.metadata.weaponName = "SolarPlasmaCannon";
    root.metadata.particleSystem = particleSystem;
    root.metadata.ui = ui;

    return root;
}
