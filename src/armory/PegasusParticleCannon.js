import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, Scalar, ParticleSystem, Texture, Color4, Engine, PointLight, DynamicTexture, Mesh } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";

// Shared function to create the visual mesh of the gun
// We export this so the Player can potentially use it to render the gun in-hand
export function createPegasusGunMesh(scene) {
    const gunGroup = new TransformNode("pegasusGunVisuals", scene);

    // Materials
    const whiteMat = new StandardMaterial("pegasusWhiteMat", scene);
    whiteMat.diffuseColor = new Color3(0.9, 0.9, 1.0); // White/Silver
    whiteMat.specularColor = new Color3(0.8, 0.8, 0.8);

    const redMat = new StandardMaterial("pegasusRedMat", scene);
    redMat.diffuseColor = new Color3(0.8, 0.0, 0.0);
    redMat.emissiveColor = new Color3(0.4, 0, 0);

    const goldMat = new StandardMaterial("pegasusGoldMat", scene);
    goldMat.diffuseColor = new Color3(1.0, 0.8, 0.0);
    goldMat.specularColor = new Color3(1, 1, 0.5);

    const glowMat = new StandardMaterial("pegasusGlowMat", scene);
    glowMat.emissiveColor = new Color3(1, 0.2, 0.2);
    glowMat.disableLighting = true;

    // 1. Main Body (Stylized)
    const body = MeshBuilder.CreateBox("pBody", { width: 0.15, height: 0.2, depth: 0.6 }, scene);
    body.material = whiteMat;
    body.parent = gunGroup;
    body.position.z = 0.2;

    // 2. Barrel (Longer, Sleek)
    const barrel = MeshBuilder.CreateCylinder("pBarrel", { height: 1.2, diameterTop: 0.08, diameterBottom: 0.12 }, scene);
    barrel.rotation.x = Math.PI / 2;
    barrel.parent = gunGroup;
    barrel.position.z = 0.6;
    barrel.material = whiteMat;

    // 3. Energy Core (Glowing Ring)
    const ring = MeshBuilder.CreateTorus("pRing", { diameter: 0.25, thickness: 0.05 }, scene);
    ring.rotation.x = Math.PI / 2; // Face forward
    ring.parent = gunGroup;
    ring.position.z = 0.4;
    ring.material = glowMat;

    // 4. Wings (The "Pegasus" element)
    const createWing = (isLeft) => {
        const wingRoot = new TransformNode("wingRoot", scene);
        wingRoot.parent = gunGroup;
        wingRoot.position.z = 0.2;
        wingRoot.position.y = 0.05;
        wingRoot.position.x = isLeft ? -0.1 : 0.1;
        
        // Wing blades
        const blade1 = MeshBuilder.CreateBox("blade1", { width: 0.05, height: 0.02, depth: 0.6 }, scene);
        blade1.material = goldMat;
        blade1.parent = wingRoot;
        blade1.position.x = isLeft ? -0.15 : 0.15;
        blade1.position.z = 0.1;
        blade1.rotation.y = isLeft ? -0.5 : 0.5;

        const blade2 = MeshBuilder.CreateBox("blade2", { width: 0.05, height: 0.02, depth: 0.4 }, scene);
        blade2.material = whiteMat;
        blade2.parent = wingRoot;
        blade2.position.x = isLeft ? -0.25 : 0.25;
        blade2.position.z = 0.0;
        blade2.rotation.y = isLeft ? -0.8 : 0.8;

        return wingRoot;
    };

    createWing(true);  // Left
    createWing(false); // Right

    // 5. Rear Crystal
    const crystal = MeshBuilder.CreatePolyhedron("pCrystal", { type: 1, size: 0.1 }, scene);
    crystal.material = glowMat;
    crystal.parent = gunGroup;
    crystal.position.z = -0.15;
    
    // Rotate gun group to point forward if needed (Babylon Z is forward)
    // But for pickup visualization, usually X rotation is applied by parent.
    
    return gunGroup;
}

export function spawnPegasusParticleCannon(scene, position, player) {
    const root = new TransformNode("pegasusWeaponRoot", scene);
    root.position = position.clone();
    if (root.position.y > 0.5) {
        root.position.y = 0.5;
    }

    // --- 1. Visuals: The Gun Mesh ---
    const gunVisuals = createPegasusGunMesh(scene);
    gunVisuals.parent = root;
    gunVisuals.rotation.x = Math.PI / 2; // Stand upright for pickup
    
    // --- 2. Visuals: Red Hero Aura + Particles ---

    // Helper to create the Aura Texture (Procedural - Red Theme)
    const createRedAuraTexture = () => {
        const textureSize = 512;
        const texture = new DynamicTexture("pegasusAuraTexture", textureSize, scene, true);
        const ctx = texture.getContext();
        const cx = textureSize / 2;
        const cy = textureSize / 2;

        // Clear
        ctx.clearRect(0, 0, textureSize, textureSize);

        // 1. Outer Glow Ring (Gradient Red)
        const gradient = ctx.createRadialGradient(cx, cy, textureSize * 0.2, cx, cy, textureSize * 0.5);
        gradient.addColorStop(0, "rgba(255, 0, 0, 0)");   // Center transparent
        gradient.addColorStop(0.7, "rgba(255, 50, 0, 0.6)"); // Orange/Red ring
        gradient.addColorStop(0.9, "rgba(255, 0, 0, 0.8)"); // Red Outer edge
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");       // Fade out

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, textureSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // 2. Inner Runes (Wing/Feather Pattern)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = "rgba(255, 200, 200, 0.9)";
        ctx.lineWidth = 6;
        
        // Draw 3 "Feathers" radiating
        for(let j=0; j<3; j++) {
            ctx.rotate(Math.PI * 2 / 3);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(50, 100, 0, 200);
            ctx.quadraticCurveTo(-50, 100, 0, 0);
            ctx.stroke();
        }
        
        ctx.restore();
        texture.update();
        return texture;
    };

    // A. Ground Aura Mesh
    const auraSize = 2.8;
    const auraMesh = MeshBuilder.CreateGround("pegasusAura", { width: auraSize, height: auraSize }, scene);
    auraMesh.parent = root;
    auraMesh.position.y = 0.02;

    const auraMat = new StandardMaterial("pegasusAuraMat", scene);
    auraMat.diffuseTexture = createRedAuraTexture();
    auraMat.diffuseTexture.hasAlpha = true;
    auraMat.useAlphaFromDiffuseTexture = true;
    auraMat.emissiveColor = new Color3(1, 0.5, 0.5); 
    auraMat.disableLighting = true;
    auraMat.alpha = 0.8;
    auraMesh.material = auraMat;

    // Animation: Rotate Aura (Faster)
    const animAura = new Animation("animAura", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animAura.setKeys([{ frame: 0, value: 0 }, { frame: 200, value: -Math.PI * 2 }]); // Reverse rotation
    auraMesh.animations.push(animAura);
    scene.beginAnimation(auraMesh, 0, 200, true);


    // B. Particle System (Rising Flames/Feathers)
    const particleSystem = new ParticleSystem("pegasusParticles", 200, scene);
    particleSystem.particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    particleSystem.emitter = root; 
    
    const radius = 1.0;
    particleSystem.createCylinderEmitter(radius, 0.1, 0, 0);

    particleSystem.minEmitBox = new Vector3(0, 0, 0); 
    particleSystem.maxEmitBox = new Vector3(0, 0.5, 0); 

    // Colors (Red/Gold)
    particleSystem.color1 = new Color4(1.0, 0.2, 0.0, 1.0); // Red
    particleSystem.color2 = new Color4(1.0, 0.8, 0.0, 1.0); // Gold
    particleSystem.colorDead = new Color4(0.2, 0, 0, 0.0);

    particleSystem.minSize = 0.15;
    particleSystem.maxSize = 0.35;
    
    particleSystem.minLifeTime = 0.8;
    particleSystem.maxLifeTime = 1.5;

    particleSystem.emitRate = 50; 
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD; 

    particleSystem.gravity = new Vector3(0, 1.5, 0); // Rise faster
    particleSystem.direction1 = new Vector3(-0.3, 1, -0.3);
    particleSystem.direction2 = new Vector3(0.3, 1, 0.3);
    
    particleSystem.minAngularSpeed = 0;
    particleSystem.maxAngularSpeed = Math.PI;
    
    particleSystem.start();

    // --- Name Label (GUI for Fixed Size) ---
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("pegasusUI", true, scene);
    
    // Create a specific anchor point for the label in 3D space
    const labelAnchor = new TransformNode("pegasusLabelAnchor", scene);
    labelAnchor.parent = root;
    labelAnchor.position.y = 1.5; // Fixed height above the weapon in 3D world units

    const label = new TextBlock();
    label.text = "天马粒子炮";
    label.color = "#FF4444"; // Reddish
    label.fontSize = 24; 
    label.fontWeight = "bold";
    label.outlineColor = "black";
    label.outlineWidth = 2;
    
    ui.addControl(label);
    label.linkWithMesh(labelAnchor); // Link to the 3D anchor
    label.linkOffsetY = 0; // No pixel offset needed anymore

    // Animation: Floating and Rotating
    const frameRate = 10;
    const animRot = new Animation("animRot", "rotation.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animRot.setKeys([{ frame: 0, value: 0 }, { frame: frameRate * 4, value: Math.PI * 2 }]);
    gunVisuals.animations.push(animRot);

    const animFloat = new Animation("animFloat", "position.y", frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animFloat.setKeys([
        { frame: 0, value: 0.5 },
        { frame: frameRate * 2, value: 0.9 }, // Higher float
        { frame: frameRate * 4, value: 0.5 }
    ]);
    gunVisuals.animations.push(animFloat);

    scene.beginAnimation(gunVisuals, 0, frameRate * 4, true);
    root.metadata = root.metadata || {};
    root.metadata.weaponPickup = true;
    root.metadata.weaponName = "PegasusParticleCannon";
    root.metadata.particleSystem = particleSystem;
    root.metadata.ui = ui;

    return root;
}
