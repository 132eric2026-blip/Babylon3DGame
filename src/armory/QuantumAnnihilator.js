import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, ParticleSystem, Texture, Color4, DynamicTexture, PointLight } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";

// 创建量子湮灭炮的视觉网格
export function createQuantumAnnihilatorMesh(scene) {
    const gunGroup = new TransformNode("quantumCannonVisuals", scene);

    // === 材质定义 ===

    // 主体深蓝色金属材质
    const darkBlueMat = new StandardMaterial("quantumDarkBlueMat", scene);
    darkBlueMat.diffuseColor = new Color3(0.1, 0.2, 0.4);
    darkBlueMat.specularColor = new Color3(0.3, 0.4, 0.6);
    darkBlueMat.specularPower = 64;

    // 量子能量材质（蓝紫色发光）
    const quantumMat = new StandardMaterial("quantumEnergyMat", scene);
    quantumMat.emissiveColor = new Color3(0.3, 0.6, 1.0);  // 蓝色发光
    quantumMat.diffuseColor = new Color3(0.2, 0.4, 0.8);
    quantumMat.disableLighting = true;

    // 紫色高能材质
    const purpleEnergyMat = new StandardMaterial("quantumPurpleMat", scene);
    purpleEnergyMat.emissiveColor = new Color3(0.8, 0.2, 1.0);  // 紫色发光
    purpleEnergyMat.diffuseColor = new Color3(0.6, 0.1, 0.8);
    purpleEnergyMat.disableLighting = true;

    // 青色电弧材质
    const cyanMat = new StandardMaterial("quantumCyanMat", scene);
    cyanMat.emissiveColor = new Color3(0.0, 1.0, 1.0);  // 青色发光
    cyanMat.disableLighting = true;

    // === 1. 主炮身（六边形柱体）===
    const mainBody = MeshBuilder.CreateCylinder("quantumMainBody", {
        height: 0.7,
        diameterTop: 0.22,
        diameterBottom: 0.26,
        tessellation: 6  // 六边形
    }, scene);
    mainBody.rotation.x = Math.PI / 2;
    mainBody.material = darkBlueMat;
    mainBody.parent = gunGroup;
    mainBody.position.z = 0.1;

    // === 2. 量子核心（中央能量球）===
    const quantumCore = MeshBuilder.CreateSphere("quantumCore", {
        diameter: 0.3,
        segments: 32
    }, scene);
    quantumCore.material = quantumMat;
    quantumCore.parent = gunGroup;
    quantumCore.position.z = -0.2;

    // 核心脉动动画
    const coreScaleAnim = new Animation(
        "coreScaleAnim",
        "scaling",
        30,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CYCLE
    );
    coreScaleAnim.setKeys([
        { frame: 0, value: new Vector3(1, 1, 1) },
        { frame: 30, value: new Vector3(1.15, 1.15, 1.15) },
        { frame: 60, value: new Vector3(1, 1, 1) }
    ]);
    quantumCore.animations.push(coreScaleAnim);
    scene.beginAnimation(quantumCore, 0, 60, true);

    // === 3. 三层旋转能量环 ===
    for (let i = 0; i < 3; i++) {
        const ring = MeshBuilder.CreateTorus("quantumRing" + i, {
            diameter: 0.4 + i * 0.1,
            thickness: 0.02,
            tessellation: 32
        }, scene);
        
        // 交替使用蓝色和紫色
        ring.material = i % 2 === 0 ? quantumMat : purpleEnergyMat;
        ring.parent = gunGroup;
        ring.position.z = -0.2;
        
        // 不同方向的旋转
        const rotAxis = i === 0 ? "rotation.x" : (i === 1 ? "rotation.y" : "rotation.z");
        const ringRotAnim = new Animation(
            "ringRotAnim" + i,
            rotAxis,
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const direction = i % 2 === 0 ? 1 : -1;
        ringRotAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 100 + i * 20, value: Math.PI * 2 * direction }
        ]);
        ring.animations.push(ringRotAnim);
        scene.beginAnimation(ring, 0, 100 + i * 20, true);
    }

    // === 4. 炮管（多段式）===
    // 前段炮管
    const barrelFront = MeshBuilder.CreateCylinder("quantumBarrelFront", {
        height: 0.5,
        diameterTop: 0.12,
        diameterBottom: 0.16,
        tessellation: 8
    }, scene);
    barrelFront.rotation.x = Math.PI / 2;
    barrelFront.material = darkBlueMat;
    barrelFront.parent = gunGroup;
    barrelFront.position.z = 0.6;

    // 炮口能量聚焦环
    const muzzleRing = MeshBuilder.CreateTorus("quantumMuzzleRing", {
        diameter: 0.18,
        thickness: 0.04,
        tessellation: 32
    }, scene);
    muzzleRing.rotation.x = Math.PI / 2;
    muzzleRing.material = cyanMat;
    muzzleRing.parent = gunGroup;
    muzzleRing.position.z = 0.85;

    // 炮口内部发光
    const muzzleGlow = MeshBuilder.CreateDisc("quantumMuzzleGlow", {
        radius: 0.08,
        tessellation: 32
    }, scene);
    muzzleGlow.rotation.x = Math.PI / 2;
    muzzleGlow.material = purpleEnergyMat;
    muzzleGlow.parent = gunGroup;
    muzzleGlow.position.z = 0.86;

    // === 5. 能量导管（4条螺旋管道）===
    for (let i = 0; i < 4; i++) {
        const tube = MeshBuilder.CreateCylinder("quantumTube" + i, {
            height: 0.6,
            diameter: 0.03
        }, scene);
        tube.material = cyanMat;
        tube.parent = gunGroup;
        
        const angle = (Math.PI * 2 / 4) * i;
        const radius = 0.15;
        tube.position.x = Math.cos(angle) * radius;
        tube.position.y = Math.sin(angle) * radius;
        tube.position.z = 0.3;
        tube.rotation.x = Math.PI / 2;
    }

    // === 6. 量子稳定器（后部装置）===
    const stabilizer = MeshBuilder.CreatePolyhedron("quantumStabilizer", {
        type: 1,  // 八面体
        size: 0.18
    }, scene);
    stabilizer.material = purpleEnergyMat;
    stabilizer.parent = gunGroup;
    stabilizer.position.z = -0.45;

    // 稳定器旋转
    const stabRotAnim = new Animation(
        "stabRotAnim",
        "rotation",
        30,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CYCLE
    );
    stabRotAnim.setKeys([
        { frame: 0, value: new Vector3(0, 0, 0) },
        { frame: 120, value: new Vector3(Math.PI * 2, Math.PI * 2, Math.PI * 2) }
    ]);
    stabilizer.animations.push(stabRotAnim);
    scene.beginAnimation(stabilizer, 0, 120, true);

    // === 7. 电弧效果装饰（小型能量球）===
    for (let i = 0; i < 6; i++) {
        const arcNode = MeshBuilder.CreateSphere("quantumArc" + i, {
            diameter: 0.04,
            segments: 8
        }, scene);
        arcNode.material = cyanMat;
        arcNode.parent = gunGroup;
        
        const angle = (Math.PI * 2 / 6) * i;
        const radius = 0.2;
        arcNode.position.x = Math.cos(angle) * radius;
        arcNode.position.y = Math.sin(angle) * radius;
        arcNode.position.z = 0.1;

        // 闪烁动画
        const blinkAnim = new Animation(
            "blinkAnim" + i,
            "visibility",
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        blinkAnim.setKeys([
            { frame: 0 + i * 5, value: 1.0 },
            { frame: 15 + i * 5, value: 0.3 },
            { frame: 30 + i * 5, value: 1.0 }
        ]);
        arcNode.animations.push(blinkAnim);
        scene.beginAnimation(arcNode, 0, 30 + i * 5, true);
    }

    return gunGroup;
}

// 生成世界中的拾取物
export function spawnQuantumAnnihilator(scene, position, player) {
    const root = new TransformNode("quantumWeaponRoot", scene);
    root.position = position.clone();
    if (root.position.y > 0.5) {
        root.position.y = 0.5;
    }

    // === 1. 武器视觉模型 ===
    const gunVisuals = createQuantumAnnihilatorMesh(scene);
    gunVisuals.parent = root;
    gunVisuals.rotation.x = Math.PI / 2;  // 竖直放置用于拾取

    // === 2. 量子光环 + 粒子效果 ===

    // 创建量子符文光环纹理
    const createQuantumAuraTexture = () => {
        const textureSize = 512;
        const texture = new DynamicTexture("quantumAuraTexture", textureSize, scene, true);
        const ctx = texture.getContext();
        const cx = textureSize / 2;
        const cy = textureSize / 2;

        ctx.clearRect(0, 0, textureSize, textureSize);

        // 外部量子光晕（蓝紫渐变）
        const gradient = ctx.createRadialGradient(cx, cy, textureSize * 0.15, cx, cy, textureSize * 0.5);
        gradient.addColorStop(0, "rgba(100, 200, 255, 0)");     // 中心透明
        gradient.addColorStop(0.4, "rgba(80, 150, 255, 0.6)");  // 蓝色
        gradient.addColorStop(0.7, "rgba(150, 100, 255, 0.8)"); // 紫色
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");           // 边缘渐隐

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, textureSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // 量子符文阵列（六芒星 + 圆环）
        ctx.save();
        ctx.translate(cx, cy);
        
        // 绘制六芒星
        ctx.strokeStyle = "rgba(0, 255, 255, 0.9)";  // 青色
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            const x = Math.cos(angle) * 150;
            const y = Math.sin(angle) * 150;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();

        // 绘制内部三角形
        ctx.strokeStyle = "rgba(200, 100, 255, 0.9)";  // 紫色
        ctx.lineWidth = 5;
        for (let j = 0; j < 2; j++) {
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 / 3) * i + (j * Math.PI);
                const x = Math.cos(angle) * 100;
                const y = Math.sin(angle) * 100;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }

        // 绘制能量圆环
        ctx.strokeStyle = "rgba(100, 200, 255, 0.7)";
        ctx.lineWidth = 4;
        for (let r = 50; r < 180; r += 40) {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
        texture.update();
        return texture;
    };

    // A. 地面光环网格
    const auraSize = 3.5;
    const auraMesh = MeshBuilder.CreateGround("quantumAura", { width: auraSize, height: auraSize }, scene);
    auraMesh.parent = root;
    auraMesh.position.y = 0.02;

    const auraMat = new StandardMaterial("quantumAuraMat", scene);
    auraMat.diffuseTexture = createQuantumAuraTexture();
    auraMat.diffuseTexture.hasAlpha = true;
    auraMat.useAlphaFromDiffuseTexture = true;
    auraMat.emissiveColor = new Color3(0.4, 0.6, 1.0);  // 蓝色发光
    auraMat.disableLighting = true;
    auraMat.alpha = 0.9;
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
        { frame: 200, value: Math.PI * 2 }
    ]);
    auraMesh.animations.push(animAura);
    scene.beginAnimation(auraMesh, 0, 200, true);

    // B. 螺旋上升粒子系统（量子粒子）
    const particleSystem = new ParticleSystem("quantumParticles", 300, scene);
    particleSystem.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    particleSystem.emitter = root;

    const radius = 1.3;
    particleSystem.createCylinderEmitter(radius, 0.1, 0, 0);

    // 蓝色/紫色/青色粒子
    particleSystem.color1 = new Color4(0.3, 0.6, 1.0, 1.0);  // 蓝色
    particleSystem.color2 = new Color4(0.7, 0.3, 1.0, 1.0);  // 紫色
    particleSystem.colorDead = new Color4(0.0, 1.0, 1.0, 0.0);  // 青色消散

    particleSystem.minSize = 0.15;
    particleSystem.maxSize = 0.35;

    particleSystem.minLifeTime = 1.2;
    particleSystem.maxLifeTime = 2.5;

    particleSystem.emitRate = 80;
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

    // 螺旋上升效果
    particleSystem.gravity = new Vector3(0, 2.5, 0);
    particleSystem.direction1 = new Vector3(-0.5, 1.5, -0.5);
    particleSystem.direction2 = new Vector3(0.5, 1.5, 0.5);

    particleSystem.minAngularSpeed = -Math.PI;
    particleSystem.maxAngularSpeed = Math.PI;

    particleSystem.start();

    // C. 电弧粒子系统（闪电效果）
    const arcParticleSystem = new ParticleSystem("quantumArcParticles", 150, scene);
    arcParticleSystem.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    arcParticleSystem.emitter = root;

    arcParticleSystem.createSphereEmitter(1.5);

    // 青色电弧
    arcParticleSystem.color1 = new Color4(0.0, 1.0, 1.0, 1.0);  // 青色
    arcParticleSystem.color2 = new Color4(0.5, 1.0, 1.0, 1.0);  // 亮青色
    arcParticleSystem.colorDead = new Color4(0.0, 0.5, 1.0, 0.0);

    arcParticleSystem.minSize = 0.08;
    arcParticleSystem.maxSize = 0.15;

    arcParticleSystem.minLifeTime = 0.3;
    arcParticleSystem.maxLifeTime = 0.6;

    arcParticleSystem.emitRate = 40;
    arcParticleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

    arcParticleSystem.gravity = new Vector3(0, 0, 0);
    arcParticleSystem.direction1 = new Vector3(-1, -1, -1);
    arcParticleSystem.direction2 = new Vector3(1, 1, 1);

    arcParticleSystem.minAngularSpeed = -Math.PI * 2;
    arcParticleSystem.maxAngularSpeed = Math.PI * 2;

    arcParticleSystem.start();

    // === 3. 点光源（蓝紫色光照）===
    const pointLight = new PointLight("quantumLight", root.position.clone(), scene);
    pointLight.diffuse = new Color3(0.4, 0.6, 1.0);
    pointLight.specular = new Color3(0.6, 0.4, 1.0);
    pointLight.intensity = 2.0;
    pointLight.range = 10;
    pointLight.parent = root;

    // 光源闪烁动画
    const lightAnim = new Animation(
        "lightAnim",
        "intensity",
        30,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CYCLE
    );
    lightAnim.setKeys([
        { frame: 0, value: 1.5 },
        { frame: 20, value: 2.5 },
        { frame: 40, value: 1.5 }
    ]);
    pointLight.animations.push(lightAnim);
    scene.beginAnimation(pointLight, 0, 40, true);

    // === 4. 名称标签 ===
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("quantumUI", true, scene);

    const labelAnchor = new TransformNode("quantumLabelAnchor", scene);
    labelAnchor.parent = root;
    labelAnchor.position.y = 1.8;

    const label = new TextBlock();
    label.text = "量子湮灭炮";
    label.color = "#66CCFF";  // 蓝色
    label.fontSize = 28;
    label.fontWeight = "bold";
    label.outlineColor = "#0088FF";
    label.outlineWidth = 3;

    ui.addControl(label);
    label.linkWithMesh(labelAnchor);
    label.linkOffsetY = 0;

    // === 5. 浮动和旋转动画 ===
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
        { frame: frameRate * 5, value: Math.PI * 2 }
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
        { frame: frameRate * 2.5, value: 1.0 },
        { frame: frameRate * 5, value: 0.5 }
    ]);
    gunVisuals.animations.push(animFloat);

    scene.beginAnimation(gunVisuals, 0, frameRate * 5, true);

    // === 6. 元数据 ===
    root.metadata = root.metadata || {};
    root.metadata.weaponPickup = true;
    root.metadata.weaponName = "QuantumAnnihilator";
    root.metadata.particleSystem = particleSystem;
    root.metadata.arcParticleSystem = arcParticleSystem;
    root.metadata.pointLight = pointLight;
    root.metadata.ui = ui;

    return root;
}
