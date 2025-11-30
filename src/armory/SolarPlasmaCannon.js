import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, Scalar, ParticleSystem, Texture, Color4, Engine, PointLight, DynamicTexture, Mesh } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";

// Shared function to create the visual mesh of the gun
export function createSolarPlasmaCannonMesh(scene) {
    const gunGroup = new TransformNode("solarPlasmaVisuals", scene);

    // Materials
    const purpleMetalMat = new StandardMaterial("spPurpleMat", scene);
    purpleMetalMat.diffuseColor = new Color3(0.4, 0.1, 0.6); // Dark Purple
    purpleMetalMat.specularColor = new Color3(0.6, 0.3, 0.8);

    const lavaMat = new StandardMaterial("spLavaMat", scene);
    lavaMat.diffuseColor = new Color3(1, 0.5, 0);
    lavaMat.emissiveColor = new Color3(1, 0.2, 0); // Red-Orange glow
    lavaMat.disableLighting = true;

    // Procedural Lava Texture
    const lavaTex = new DynamicTexture("lavaTex", 256, scene, true);
    const ctx = lavaTex.getContext();

    // Simple noise/cloud pattern for lava
    const drawLava = (offset) => {
        const w = 256;
        const h = 256;
        const imgData = ctx.createImageData(w, h);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const x = (i / 4) % w;
            const y = Math.floor((i / 4) / w);

            // Simple moving noise simulation
            const v = Math.sin((x + offset) * 0.05) * Math.cos((y + offset) * 0.05) * 0.5 + 0.5;

            // Color map: Dark Red -> Bright Yellow
            imgData.data[i] = 255; // R
            imgData.data[i + 1] = Math.floor(v * 200); // G
            imgData.data[i + 2] = 0; // B
            imgData.data[i + 3] = 255; // A
        }
        ctx.putImageData(imgData, 0, 0);
        lavaTex.update();
    };
    drawLava(0);

    lavaMat.diffuseTexture = lavaTex;
    lavaMat.emissiveTexture = lavaTex;

    // Animation loop for lava texture
    let offset = 0;
    scene.onBeforeRenderObservable.add(() => {
        offset += 1;
        drawLava(offset);
    });


    // 1. Main Body (Stout, thick)
    const body = MeshBuilder.CreateBox("spBody", { width: 0.2, height: 0.25, depth: 0.5 }, scene);
    body.material = purpleMetalMat;
    body.parent = gunGroup;
    body.position.z = 0.25;

    // 2. Reactor Core (Cylinder embedded in body)
    const reactor = MeshBuilder.CreateCylinder("spReactor", { height: 0.18, diameter: 0.18 }, scene);
    reactor.rotation.z = Math.PI / 2; // Sideways cylinder
    reactor.material = lavaMat;
    reactor.parent = gunGroup;
    reactor.position.z = 0.25;
    // Slightly stick out sides

    // 3. Barrel (Thick, short)
    const barrel = MeshBuilder.CreateCylinder("spBarrel", { height: 0.4, diameter: 0.15 }, scene);
    barrel.rotation.x = Math.PI / 2;
    barrel.material = purpleMetalMat;
    barrel.parent = gunGroup;
    barrel.position.z = 0.6;

    // 4. Muzzle Energy Ring
    const muzzleRing = MeshBuilder.CreateTorus("spMuzzleRing", { diameter: 0.12, thickness: 0.04 }, scene);
    muzzleRing.rotation.x = Math.PI / 2;
    muzzleRing.material = lavaMat;
    muzzleRing.parent = gunGroup;
    muzzleRing.position.z = 0.8;

    // 5. Pipes/Details
    const pipeTop = MeshBuilder.CreateCylinder("spPipeTop", { height: 0.5, diameter: 0.04 }, scene);
    pipeTop.rotation.x = Math.PI / 2;
    pipeTop.material = purpleMetalMat;
    pipeTop.parent = gunGroup;
    pipeTop.position.y = 0.15;
    pipeTop.position.z = 0.4;

    return gunGroup;
}

export function spawnSolarPlasmaCannon(scene, position, player) {
    const root = new TransformNode("solarPlasmaRoot", scene);
    root.position = position.clone();
    if (root.position.y > 0.5) {
        root.position.y = 0.5;
    }

    // --- 1. Visuals: The Gun Mesh ---
    const gunVisuals = createSolarPlasmaCannonMesh(scene);
    gunVisuals.parent = root;
    gunVisuals.rotation.x = Math.PI / 2; // Stand upright

    // --- 2. Visuals: Purple Aura ---
    const auraSize = 2.5;
    const auraMesh = MeshBuilder.CreateGround("spAura", { width: auraSize, height: auraSize }, scene);
    auraMesh.parent = root;
    auraMesh.position.y = 0.02;

    const auraMat = new StandardMaterial("spAuraMat", scene);
    auraMat.diffuseColor = new Color3(0.8, 0, 1);
    auraMat.emissiveColor = new Color3(0.4, 0, 0.5);
    auraMat.disableLighting = true;
    auraMat.alpha = 0.6;

    // Simple texture for aura
    const texture = new DynamicTexture("spAuraTex", 256, scene, true);
    const ctx = texture.getContext();
    const cx = 128, cy = 128;
    const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 120);
    grad.addColorStop(0, "rgba(200, 0, 255, 0)");
    grad.addColorStop(0.5, "rgba(200, 0, 255, 0.5)");
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

    // B. Particle System (Rising Purple/Orange)
    const particleSystem = new ParticleSystem("spParticles", 100, scene);
    particleSystem.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    particleSystem.emitter = root;
    particleSystem.createCylinderEmitter(0.8, 0.1, 0, 0);
    particleSystem.minEmitBox = new Vector3(0, 0, 0);
    particleSystem.maxEmitBox = new Vector3(0, 0.5, 0);

    particleSystem.color1 = new Color4(1.0, 0.5, 0.0, 1.0); // Orange
    particleSystem.color2 = new Color4(0.8, 0.0, 1.0, 1.0); // Purple
    particleSystem.colorDead = new Color4(0.2, 0, 0.2, 0.0);

    particleSystem.minSize = 0.15;
    particleSystem.maxSize = 0.3;
    particleSystem.minLifeTime = 0.5;
    particleSystem.maxLifeTime = 1.0;
    particleSystem.emitRate = 40;
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
    particleSystem.gravity = new Vector3(0, 1.0, 0);
    particleSystem.start();

    // --- Name Label ---
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("spUI", true, scene);
    const labelAnchor = new TransformNode("spLabelAnchor", scene);
    labelAnchor.parent = root;
    labelAnchor.position.y = 1.5;

    const label = new TextBlock();
    label.text = "日耀等离子炮";
    label.color = "#FF8800"; // Orange
    label.fontSize = 24;
    label.fontWeight = "bold";
    label.outlineColor = "purple";
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
            player.pickupWeapon("SolarPlasmaCannon");
            scene.onBeforeRenderObservable.remove(observer);
            particleSystem.stop();
            particleSystem.dispose();
            ui.dispose();
            root.dispose();
        }
    });

    return root;
}
