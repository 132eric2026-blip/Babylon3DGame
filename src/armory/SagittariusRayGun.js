import { MeshBuilder, Vector3, StandardMaterial, Color3, ActionManager, ParticleSystem, Color4, TransformNode } from "@babylonjs/core";

export function createSagittariusRayGunMesh(scene) {
    const root = new TransformNode("sagittariusRayGunRoot", scene);

    // Main body - Red/Dark Red theme
    const body = MeshBuilder.CreateCylinder("sRayBody", { height: 0.7, diameter: 0.06 }, scene);
    body.rotation.x = Math.PI / 2;
    body.parent = root;
    
    const bodyMat = new StandardMaterial("sRayBodyMat", scene);
    bodyMat.diffuseColor = new Color3(0.5, 0.0, 0.0); // Dark Red
    bodyMat.emissiveColor = new Color3(0.2, 0.0, 0.0);
    bodyMat.specularColor = new Color3(0.3, 0.3, 0.3);
    body.material = bodyMat;

    // Emitter tip - Glowing Red
    const emitter = MeshBuilder.CreateSphere("sRayEmitter", { diameter: 0.14 }, scene);
    emitter.position.z = 0.35;
    emitter.parent = root;

    const emitterMat = new StandardMaterial("sRayEmitterMat", scene);
    emitterMat.emissiveColor = new Color3(1.0, 0.0, 0.0); // Bright Red
    emitterMat.disableLighting = true;
    emitter.material = emitterMat;

    // Decorative Rings - Gold/Yellow accents for "Sagittarius" feel? Or just Red?
    // Let's stick to Red theme as requested, maybe some orange/gold hints.
    const ring1 = MeshBuilder.CreateTorus("sRayRing1", { diameter: 0.18, thickness: 0.025 }, scene);
    ring1.position.z = 0.2;
    ring1.rotation.x = Math.PI / 2;
    ring1.parent = root;
    
    const ringMat = new StandardMaterial("sRayRingMat", scene);
    ringMat.diffuseColor = new Color3(1.0, 0.8, 0.0); // Gold
    ringMat.emissiveColor = new Color3(0.5, 0.4, 0.0);
    ring1.material = ringMat;

    return root;
}

export function spawnSagittariusRayGun(scene, position, player) {
    const mesh = createSagittariusRayGunMesh(scene);
    mesh.position = position.clone();
    
    // Idle Animation
    scene.onBeforeRenderObservable.add(() => {
        if (mesh.isDisposed()) return;
        mesh.rotation.y += 0.02;
        mesh.position.y = position.y + Math.sin(Date.now() * 0.002) * 0.1;
    });

    // Visual indicator (Red Particles)
    const ps = new ParticleSystem("sRayPickupPS", 100, scene);
    ps.emitter = mesh;
    ps.particleTexture = player.particleTexture; 
    ps.minEmitBox = new Vector3(-0.2, 0, -0.2);
    ps.maxEmitBox = new Vector3(0.2, 0, 0.2);
    ps.color1 = new Color4(1.0, 0.0, 0.0, 1.0);
    ps.color2 = new Color4(1.0, 0.5, 0.0, 1.0);
    ps.colorDead = new Color4(0, 0, 0, 0.0);
    ps.minSize = 0.05;
    ps.maxSize = 0.12;
    ps.minLifeTime = 0.5;
    ps.maxLifeTime = 1.0;
    ps.emitRate = 60;
    ps.start();

    // Pickup Logic
    const observer = scene.onBeforeRenderObservable.add(() => {
        if (mesh.isDisposed()) {
            scene.onBeforeRenderObservable.remove(observer);
            return;
        }
        
        if (player.mesh && Vector3.Distance(player.mesh.position, mesh.position) < 2.0) {
            player.pickupWeapon("SagittariusRayGun");
            ps.dispose();
            mesh.dispose();
        }
    });
}
