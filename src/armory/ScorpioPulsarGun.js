import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, ParticleSystem, Texture, Color4, DynamicTexture, Mesh, GlowLayer } from "@babylonjs/core";

// Create Scorpio Pulsar Gun Visuals
export function createScorpioPulsarGunMesh(scene) {
    const gunGroup = new TransformNode("scorpioGunVisuals", scene);

    // === Materials ===

    // 1. Scorpio Dark Metal (Dark Purple/Black)
    const darkMetalMat = new StandardMaterial("scorpioDarkMetalMat", scene);
    darkMetalMat.diffuseColor = new Color3(0.1, 0.05, 0.15);
    darkMetalMat.specularColor = new Color3(0.3, 0.1, 0.4);
    darkMetalMat.emissiveColor = new Color3(0.05, 0.0, 0.1);
    darkMetalMat.specularPower = 32;

    // 2. Venom Glow (Bright Purple/Pink)
    const purpleGlowMat = new StandardMaterial("scorpioPurpleGlowMat", scene);
    purpleGlowMat.emissiveColor = new Color3(0.8, 0.0, 1.0);
    purpleGlowMat.diffuseColor = new Color3(0.8, 0.0, 1.0);
    purpleGlowMat.disableLighting = true;

    // 3. Core Energy (White/Violet)
    const coreMat = new StandardMaterial("scorpioCoreMat", scene);
    coreMat.emissiveColor = new Color3(1.0, 0.8, 1.0);
    coreMat.diffuseColor = new Color3(0.0, 0.0, 0.0);
    coreMat.disableLighting = true;

    // === 1. Body (Segmented Scorpion Tail Style) ===
    const segmentCount = 3;
    for(let i = 0; i < segmentCount; i++) {
        const width = 0.12 - (i * 0.02);
        const height = 0.15 - (i * 0.02);
        const depth = 0.25;
        const box = MeshBuilder.CreateBox(`segment${i}`, { width, height, depth }, scene);
        box.material = darkMetalMat;
        box.parent = gunGroup;
        // Arrange along Z axis, slightly curved
        box.position = new Vector3(0, i * 0.02, 0.1 + (i * 0.22));
        // Tilt down slightly like a stinging tail
        box.rotation.x = Math.PI / 12 * i;
    }

    // Handle
    const handle = MeshBuilder.CreateBox("handle", { width: 0.08, height: 0.25, depth: 0.12 }, scene);
    handle.position = new Vector3(0, -0.15, -0.1);
    handle.rotation.x = Math.PI / 6;
    handle.material = darkMetalMat;
    handle.parent = gunGroup;

    // === 2. Pincers (Front) ===
    // Left Pincer
    const pincerL = MeshBuilder.CreateCylinder("pincerL", { height: 0.4, diameterTop: 0.01, diameterBottom: 0.05, tessellation: 3 }, scene);
    pincerL.position = new Vector3(-0.15, 0.1, 0.7);
    pincerL.rotation = new Vector3(Math.PI / 2, 0, -Math.PI / 6);
    pincerL.material = purpleGlowMat;
    pincerL.parent = gunGroup;

    // Right Pincer
    const pincerR = MeshBuilder.CreateCylinder("pincerR", { height: 0.4, diameterTop: 0.01, diameterBottom: 0.05, tessellation: 3 }, scene);
    pincerR.position = new Vector3(0.15, 0.1, 0.7);
    pincerR.rotation = new Vector3(Math.PI / 2, 0, Math.PI / 6);
    pincerR.material = purpleGlowMat;
    pincerR.parent = gunGroup;

    // === 3. Pulsing Core (Stinger) ===
    const core = MeshBuilder.CreateSphere("stingerCore", { diameter: 0.08 }, scene);
    core.position = new Vector3(0, 0.15, 0.8); // Between pincers
    core.material = coreMat;
    core.parent = gunGroup;

    // Core Pulse Animation
    const pulseAnim = new Animation("scorpioPulse", "scaling", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
    pulseAnim.setKeys([
        { frame: 0, value: new Vector3(1, 1, 1) },
        { frame: 30, value: new Vector3(1.5, 1.5, 1.5) },
        { frame: 60, value: new Vector3(1, 1, 1) }
    ]);
    core.animations.push(pulseAnim);
    scene.beginAnimation(core, 0, 60, true);

    return gunGroup;
}

// Spawn Logic
export function spawnScorpioPulsarGun(scene, position, player) {
    const root = new TransformNode("scorpioWeaponRoot", scene);
    root.position = position.clone();
    if (root.position.y < 0.5) root.position.y = 0.5;

    // === Visuals ===
    const gunVisuals = createScorpioPulsarGunMesh(scene);
    gunVisuals.parent = root;
    gunVisuals.rotation.x = Math.PI / 4;
    gunVisuals.rotation.y = Math.PI / 4;

    // Float Animation
    const floatAnim = new Animation("floatAnim", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    const startY = root.position.y;
    floatAnim.setKeys([
        { frame: 0, value: startY },
        { frame: 60, value: startY + 0.2 },
        { frame: 120, value: startY }
    ]);
    root.animations.push(floatAnim);
    scene.beginAnimation(root, 0, 120, true);

    // === Aura (Scorpio Sigil / Poison Cloud) ===
    const createPoisonTexture = () => {
        const size = 256;
        const texture = new DynamicTexture("poisonTexture", size, scene, true);
        const ctx = texture.getContext();
        const cx = size / 2, cy = size / 2;

        ctx.clearRect(0, 0, size, size);
        
        // Radial Gradient (Purple to Transparent)
        const gradient = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 0.5);
        gradient.addColorStop(0, "rgba(200, 0, 255, 0.8)");
        gradient.addColorStop(0.5, "rgba(100, 0, 200, 0.4)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        texture.update();
        return texture;
    };

    const auraMesh = MeshBuilder.CreateGround("scorpioAura", { width: 2.0, height: 2.0 }, scene);
    auraMesh.parent = root;
    auraMesh.position.y = -0.4;

    const auraMat = new StandardMaterial("scorpioAuraMat", scene);
    auraMat.diffuseTexture = createPoisonTexture();
    auraMat.diffuseTexture.hasAlpha = true;
    auraMat.useAlphaFromDiffuseTexture = true;
    auraMat.emissiveColor = new Color3(0.8, 0.2, 1.0);
    auraMat.disableLighting = true;
    auraMesh.material = auraMat;

    // Aura Rotation
    const auraRotAnim = new Animation("auraRot", "rotation.y", 20, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    auraRotAnim.setKeys([{ frame: 0, value: 0 }, { frame: 200, value: -Math.PI * 2 }]); // Rotate opposite
    auraMesh.animations.push(auraRotAnim);
    scene.beginAnimation(auraMesh, 0, 200, true);

    // === Particles (Dark Energy) ===
    const ps = new ParticleSystem("scorpioDust", 100, scene);
    ps.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    ps.emitter = root;
    ps.minEmitBox = new Vector3(-0.3, 0, -0.3);
    ps.maxEmitBox = new Vector3(0.3, 0.8, 0.3);
    ps.color1 = new Color4(0.8, 0, 1, 1); // Purple
    ps.color2 = new Color4(0.2, 0, 0.5, 1); // Dark Blue/Purple
    ps.colorDead = new Color4(0, 0, 0, 0);
    ps.minSize = 0.05;
    ps.maxSize = 0.15;
    ps.minLifeTime = 0.5;
    ps.maxLifeTime = 1.2;
    ps.emitRate = 20;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.gravity = new Vector3(0, 0.2, 0);
    ps.start();

    // === Interaction ===
    root.metadata = {
        weaponPickup: true,
        weaponName: "ScorpioPulsarGun",
        particleSystem: ps
    };
}
