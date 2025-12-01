import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, Scalar, ParticleSystem, Texture, Color4, Engine, PointLight, DynamicTexture, Mesh } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";

/**
 * 生成阿尔法粒子炮拾取物
 * 创建武器视觉模型、地面光环与粒子、名称标签与漂浮动画，并挂载拾取元数据
 * @param {Scene} scene 场景实例
 * @param {Vector3} position 生成位置
 * @param {any} player 玩家对象（用于交互）
 * @returns {TransformNode} 武器根节点
 */
export function spawnAlphaParticleCannon(scene, position, player) {
    const root = new TransformNode("worldWeaponRoot", scene);
    root.position = position.clone();
    if (root.position.y > 0.5) {
        root.position.y = 0.5;
    }

    // --- 1. Visuals: The Gun Mesh ---
    const gunGroup = new TransformNode("gunVisuals", scene);
    gunGroup.parent = root;
    gunGroup.rotation.x = Math.PI / 2; 
    
    // Gun Body
    const gunBody = MeshBuilder.CreateBox("worldGunBody", { width: 0.1, height: 0.15, depth: 0.4 }, scene);
    const gunMat = new StandardMaterial("worldGunMat", scene);
    gunMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
    gunBody.material = gunMat;
    gunBody.parent = gunGroup;
    gunBody.position.z = 0.2;

    // Barrel
    const barrel = MeshBuilder.CreateCylinder("worldGunBarrel", { height: 0.5, diameter: 0.08 }, scene);
    barrel.rotation.x = Math.PI / 2;
    barrel.parent = gunGroup;
    barrel.position.z = 0.5;
    barrel.material = gunMat;

    // Core
    const core = MeshBuilder.CreateCylinder("worldGunCore", { height: 0.3, diameter: 0.12 }, scene);
    core.rotation.x = Math.PI / 2;
    core.parent = gunGroup;
    core.position.z = 0.3;
    
    const coreMat = new StandardMaterial("worldCoreMat", scene);
    coreMat.emissiveColor = new Color3(0, 1, 1); 
    coreMat.disableLighting = true;
    core.material = coreMat;

    // --- 2. Visuals: Warcraft 3 Style Hero Aura + Particles ---

    // Helper to create the Aura Texture (Procedural)
    const createHeroAuraTexture = () => {
        const textureSize = 512;
        const texture = new DynamicTexture("heroAuraTexture", textureSize, scene, true);
        const ctx = texture.getContext();
        const cx = textureSize / 2;
        const cy = textureSize / 2;

        // Clear
        ctx.clearRect(0, 0, textureSize, textureSize);

        // 1. Outer Glow Ring (Gradient)
        const gradient = ctx.createRadialGradient(cx, cy, textureSize * 0.2, cx, cy, textureSize * 0.5);
        gradient.addColorStop(0, "rgba(0, 255, 255, 0)");   // Center transparent
        gradient.addColorStop(0.7, "rgba(0, 200, 255, 0.6)"); // Blue/Cyan ring
        gradient.addColorStop(0.9, "rgba(0, 100, 255, 0.8)"); // Outer edge
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");       // Fade out

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, textureSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // 2. Inner Runes / Geometric Pattern (Star)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = "rgba(200, 255, 255, 0.9)";
        ctx.lineWidth = 8;
        ctx.beginPath();
        // Draw a 6-pointed star (Hexagram)
        for (let i = 0; i < 7; i++) {
            const angle = (i * Math.PI * 2) / 3; // Triangle 1
            const r = textureSize * 0.35;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
            const angle = (i * Math.PI * 2) / 3 + Math.PI / 3; // Triangle 2
            const r = textureSize * 0.35;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // 3. Magic Circle Text/Runes (Dots for simplicity)
        ctx.fillStyle = "rgba(255, 255, 200, 1)";
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI * 2) / 12;
            const r = textureSize * 0.42;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
        texture.update();
        return texture;
    };

    // A. Ground Aura Mesh
    const auraSize = 2.5;
    const auraMesh = MeshBuilder.CreateGround("heroAura", { width: auraSize, height: auraSize }, scene);
    auraMesh.parent = root;
    auraMesh.position.y = 0.02; // Slightly above ground to prevent Z-fighting

    const auraMat = new StandardMaterial("heroAuraMat", scene);
    auraMat.diffuseTexture = createHeroAuraTexture();
    auraMat.diffuseTexture.hasAlpha = true;
    auraMat.useAlphaFromDiffuseTexture = true;
    auraMat.emissiveColor = new Color3(1, 1, 1); // Self-illuminated
    auraMat.disableLighting = true;
    auraMat.alpha = 0.8; // Overall transparency
    auraMesh.material = auraMat;

    // Animation: Rotate Aura
    const animAura = new Animation("animAura", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animAura.setKeys([{ frame: 0, value: 0 }, { frame: 300, value: Math.PI * 2 }]); // Slow rotation
    auraMesh.animations.push(animAura);
    scene.beginAnimation(auraMesh, 0, 300, true);

    // Animation: Pulse Aura Scale
    const animAuraScale = new Animation("animAuraScale", "scaling", 30, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
    animAuraScale.setKeys([
        { frame: 0, value: new Vector3(1, 1, 1) },
        { frame: 60, value: new Vector3(1.1, 1, 1.1) },
        { frame: 120, value: new Vector3(1, 1, 1) }
    ]);
    auraMesh.animations.push(animAuraScale);
    scene.beginAnimation(auraMesh, 0, 120, true);


    // B. Particle System (Rising Heroic Sparkles)
    const particleSystem = new ParticleSystem("heroParticles", 200, scene);
    particleSystem.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    particleSystem.emitter = root; 
    
    // Emitter shape: Cylinder/Circle on ground
    const radius = 0.8;
    particleSystem.createCylinderEmitter(radius, 0.1, 0, 0); // Radius, Height, RadiusRange, DirectionRandomizer

    particleSystem.minEmitBox = new Vector3(0, 0, 0); 
    particleSystem.maxEmitBox = new Vector3(0, 0.5, 0); 

    // Colors (Cyan/Gold Magic)
    particleSystem.color1 = new Color4(0.2, 0.8, 1.0, 1.0); // Cyan
    particleSystem.color2 = new Color4(1.0, 0.9, 0.5, 1.0); // Gold
    particleSystem.colorDead = new Color4(0, 0, 0.2, 0.0);

    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.3;
    
    particleSystem.minLifeTime = 1.0;
    particleSystem.maxLifeTime = 2.0;

    particleSystem.emitRate = 40; // Good density
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD; // Additive for glow

    // Motion
    particleSystem.gravity = new Vector3(0, 0.5, 0); // Slight gravity (or negative for float) - let's float up
    particleSystem.direction1 = new Vector3(-0.2, 1, -0.2);
    particleSystem.direction2 = new Vector3(0.2, 1, 0.2);
    
    particleSystem.minAngularSpeed = 0;
    particleSystem.maxAngularSpeed = Math.PI;
    particleSystem.minEmitPower = 0.5;
    particleSystem.maxEmitPower = 1.5;
    particleSystem.updateSpeed = 0.01;

    particleSystem.start();


    // --- Name Label (GUI for Fixed Size) ---
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("alphaUI", true, scene);
    
    // Create a specific anchor point for the label in 3D space
    const labelAnchor = new TransformNode("alphaLabelAnchor", scene);
    labelAnchor.parent = root;
    labelAnchor.position.y = 1.5; // Fixed height above the weapon in 3D world units

    const label = new TextBlock();
    label.text = "alpha粒子炮";
    label.color = "#00FFFF"; // Cyan
    label.fontSize = 24; 
    label.fontWeight = "bold";
    label.outlineColor = "black";
    label.outlineWidth = 2;
    
    ui.addControl(label);
    label.linkWithMesh(labelAnchor); // Link to the 3D anchor
    label.linkOffsetY = 0; // No pixel offset needed anymore

    // Animation: Floating and Rotating (Gun)
    const frameRate = 10;
    const animRot = new Animation("animRot", "rotation.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animRot.setKeys([{ frame: 0, value: 0 }, { frame: frameRate * 4, value: Math.PI * 2 }]);
    gunGroup.animations.push(animRot);

    const animFloat = new Animation("animFloat", "position.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animFloat.setKeys([
        { frame: 0, value: 0.5 },
        { frame: frameRate * 2, value: 0.8 },
        { frame: frameRate * 4, value: 0.5 }
    ]);
    gunGroup.animations.push(animFloat);

    scene.beginAnimation(gunGroup, 0, frameRate * 4, true);
    root.metadata = root.metadata || {};
    root.metadata.weaponPickup = true;
    root.metadata.weaponName = "AlphaParticleCannon";
    root.metadata.particleSystem = particleSystem;
    root.metadata.ui = ui;

    return root;
}
