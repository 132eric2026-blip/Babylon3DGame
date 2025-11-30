import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, Scalar, ParticleSystem, Texture, Color4, Engine, PointLight, DynamicTexture, Mesh } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";

// Shared function to create the visual mesh of the gun
export function createLightSpearMesh(scene) {
    const gunGroup = new TransformNode("lightSpearVisuals", scene);

    // Materials
    const darkMetalMat = new StandardMaterial("lsDarkMetalMat", scene);
    darkMetalMat.diffuseColor = new Color3(0.1, 0.1, 0.15);
    darkMetalMat.specularColor = new Color3(0.3, 0.3, 0.4);

    const energyMat = new StandardMaterial("lsEnergyMat", scene);
    energyMat.diffuseColor = new Color3(0.5, 1.0, 1.0);
    energyMat.emissiveColor = new Color3(0.2, 0.8, 1.0); // Cyan glow
    energyMat.disableLighting = true;

    // 1. Main Body (Long, flat structure)
    const body = MeshBuilder.CreateBox("lsBody", { width: 0.08, height: 0.12, depth: 0.8 }, scene);
    body.material = darkMetalMat;
    body.parent = gunGroup;
    body.position.z = 0.4;

    // 2. Segmented Energy Rails (Top and Bottom)
    const railLength = 1.0;
    const railOffset = 0.08;

    // Top Rail
    const topRail = MeshBuilder.CreateBox("lsTopRail", { width: 0.04, height: 0.02, depth: railLength }, scene);
    topRail.material = darkMetalMat;
    topRail.parent = gunGroup;
    topRail.position.y = 0.08;
    topRail.position.z = 0.6;

    // Bottom Rail
    const bottomRail = MeshBuilder.CreateBox("lsBottomRail", { width: 0.04, height: 0.02, depth: railLength }, scene);
    bottomRail.material = darkMetalMat;
    bottomRail.parent = gunGroup;
    bottomRail.position.y = -0.08;
    bottomRail.position.z = 0.6;

    // Energy Segments (Glowing parts between rails)
    for (let i = 0; i < 5; i++) {
        const segment = MeshBuilder.CreateBox(`lsSegment${i}`, { width: 0.03, height: 0.14, depth: 0.05 }, scene);
        segment.material = energyMat;
        segment.parent = gunGroup;
        segment.position.z = 0.3 + i * 0.15;
    }

    // 3. Barrel Tip (Focusing lens)
    const tip = MeshBuilder.CreateCylinder("lsTip", { height: 0.1, diameter: 0.06 }, scene);
    tip.rotation.x = Math.PI / 2;
    tip.material = energyMat;
    tip.parent = gunGroup;
    tip.position.z = 1.15;

    // 4. Scope (Sniper feel)
    const scopeMount = MeshBuilder.CreateBox("lsScopeMount", { width: 0.04, height: 0.05, depth: 0.1 }, scene);
    scopeMount.material = darkMetalMat;
    scopeMount.parent = gunGroup;
    scopeMount.position.y = 0.08;
    scopeMount.position.z = 0.3;

    const scope = MeshBuilder.CreateCylinder("lsScope", { height: 0.3, diameter: 0.05 }, scene);
    scope.rotation.x = Math.PI / 2;
    scope.material = darkMetalMat;
    scope.parent = scopeMount;
    scope.position.y = 0.04;

    // Pulse Animation for Energy Material
    const animPulse = new Animation("lsPulse", "emissiveColor", 30, Animation.ANIMATIONTYPE_COLOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
    const keys = [];
    keys.push({ frame: 0, value: new Color3(0.2, 0.8, 1.0) });
    keys.push({ frame: 30, value: new Color3(0.5, 1.0, 1.0) }); // Brighter
    keys.push({ frame: 60, value: new Color3(0.2, 0.8, 1.0) });
    animPulse.setKeys(keys);
    if (!energyMat.animations) {
        energyMat.animations = [];
    }
    energyMat.animations.push(animPulse);
    scene.beginAnimation(energyMat, 0, 60, true);

    return gunGroup;
}

export function spawnLightSpear(scene, position, player) {
    const root = new TransformNode("lightSpearRoot", scene);
    root.position = position.clone();
    if (root.position.y > 0.5) {
        root.position.y = 0.5;
    }

    // --- 1. Visuals: The Gun Mesh ---
    const gunVisuals = createLightSpearMesh(scene);
    gunVisuals.parent = root;
    gunVisuals.rotation.x = Math.PI / 2; // Stand upright for pickup

    // --- 2. Visuals: Cyan Aura ---
    // A. Ground Aura Mesh
    const auraSize = 2.5;
    const auraMesh = MeshBuilder.CreateGround("lsAura", { width: auraSize, height: auraSize }, scene);
    auraMesh.parent = root;
    auraMesh.position.y = 0.02;

    const auraMat = new StandardMaterial("lsAuraMat", scene);
    auraMat.diffuseColor = new Color3(0, 1, 1);
    auraMat.emissiveColor = new Color3(0, 0.5, 0.5);
    auraMat.disableLighting = true;
    auraMat.alpha = 0.5;

    // Simple texture for aura
    const texture = new DynamicTexture("lsAuraTex", 256, scene, true);
    const ctx = texture.getContext();
    const cx = 128, cy = 128;
    const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 120);
    grad.addColorStop(0, "rgba(0, 255, 255, 0)");
    grad.addColorStop(0.5, "rgba(0, 255, 255, 0.5)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    texture.update();

    auraMat.diffuseTexture = texture;
    auraMat.opacityTexture = texture;
    auraMesh.material = auraMat;

    // Animation: Rotate Aura
    const animAura = new Animation("animAura", "rotation.y", 20, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animAura.setKeys([{ frame: 0, value: 0 }, { frame: 200, value: Math.PI * 2 }]);
    auraMesh.animations.push(animAura);
    scene.beginAnimation(auraMesh, 0, 200, true);

    // B. Particle System (Rising Light)
    const particleSystem = new ParticleSystem("lsParticles", 100, scene);
    particleSystem.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    particleSystem.emitter = root;
    particleSystem.createCylinderEmitter(0.8, 0.1, 0, 0);
    particleSystem.minEmitBox = new Vector3(0, 0, 0);
    particleSystem.maxEmitBox = new Vector3(0, 0.5, 0);

    particleSystem.color1 = new Color4(0.0, 1.0, 1.0, 1.0); // Cyan
    particleSystem.color2 = new Color4(0.5, 1.0, 1.0, 1.0); // White-Cyan
    particleSystem.colorDead = new Color4(0, 0, 0.2, 0.0);

    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.2;
    particleSystem.minLifeTime = 0.5;
    particleSystem.maxLifeTime = 1.0;
    particleSystem.emitRate = 30;
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
    particleSystem.gravity = new Vector3(0, 1.0, 0);
    particleSystem.start();

    // --- Name Label ---
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("lsUI", true, scene);
    const labelAnchor = new TransformNode("lsLabelAnchor", scene);
    labelAnchor.parent = root;
    labelAnchor.position.y = 1.5;

    const label = new TextBlock();
    label.text = "光矛能量狙击枪";
    label.color = "#00FFFF"; // Cyan
    label.fontSize = 24;
    label.fontWeight = "bold";
    label.outlineColor = "black";
    label.outlineWidth = 2;

    ui.addControl(label);
    label.linkWithMesh(labelAnchor);

    // Animation: Floating and Rotating
    const frameRate = 10;
    const animRot = new Animation("animRot", "rotation.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animRot.setKeys([{ frame: 0, value: 0 }, { frame: frameRate * 4, value: Math.PI * 2 }]);
    gunVisuals.animations.push(animRot);

    const animFloat = new Animation("animFloat", "position.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animFloat.setKeys([
        { frame: 0, value: 0.5 },
        { frame: frameRate * 2, value: 0.8 },
        { frame: frameRate * 4, value: 0.5 }
    ]);
    gunVisuals.animations.push(animFloat);

    scene.beginAnimation(gunVisuals, 0, frameRate * 4, true);

    // --- 3. Pickup Logic ---
    const observer = scene.onBeforeRenderObservable.add(() => {
        if (!player || !player.mesh) return;

        const dist = Vector3.Distance(root.position, player.mesh.position);
        if (dist < 2.0) {
            player.pickupWeapon("LightSpear");
            scene.onBeforeRenderObservable.remove(observer);
            particleSystem.stop();
            particleSystem.dispose();
            ui.dispose();
            root.dispose();
        }
    });

    return root;
}
