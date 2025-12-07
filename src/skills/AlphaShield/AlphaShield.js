import { MeshBuilder, StandardMaterial, Color3, Color4, ParticleSystem, Texture, Vector3, FresnelParameters, PointLight, Scalar, Engine } from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

export class AlphaShield extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "AlphaShield", 0.5); // 0.5s cooldown for toggle
        
        this.active = false;
        this.shieldMesh = null;
        this.shieldMaterial = null;
        this.particleSystem = null;
        this.light = null;
        
        // Animation state
        this.targetScale = 0;
        this.currentScale = 0;
        this.targetAlpha = 0;
        this.currentAlpha = 0;
        this.transitionSpeed = 5.0;
        
        // Time for flowing effect
        this.time = 0;

        this.createShield();
    }

    createShield() {
        // 1. Mesh: Ellipsoid shape
        // Diameter 2.0 to cover the player
        this.shieldMesh = MeshBuilder.CreateSphere("alphaShield", { diameter: 2.0, segments: 32 }, this.scene);
        this.shieldMesh.scaling = new Vector3(1, 1.3, 1); // Ellipsoid
        
        // Parent to player mesh so it follows
        this.shieldMesh.parent = this.player.mesh;
        // Position: 
        // The player mesh origin (for BoxMan/VoxelKnight) is the center of the capsule.
        // The capsule height is 2.0, so the center is at y=1.0 relative to ground (if bottom is at 0).
        // The user says the shield center (at local y=1.0) is at the head.
        // This means the parent mesh origin might be higher or the user perception is different.
        // If we want the shield center at the waist, and waist is roughly the center of the body.
        // If the parent (player mesh) is already centered at the body center (which it seems to be for Capsule),
        // then local y=0 should be the center.
        // Let's try setting local y to 0.
        // But we also want the bottom to touch the ground.
        // Shield height (radius Y) is 1.3.
        // If center is at 0 relative to player center.
        // Player center is at world Y=1.0 (since height 2, radius 0.5, usually origin is center of physics body).
        // If player center is world Y=1.0.
        // Shield center at local 0 => world 1.0.
        // Shield bottom at world 1.0 - 1.3 = -0.3 (underground).
        // If we want bottom at ground (world 0).
        // Shield center should be at world 1.3.
        // So local y should be 0.3 (1.3 - 1.0).
        
        // However, the user said "Currently at head". My previous code had y=1.0.
        // If local y=1.0 was at Head.
        // And we want it at Waist (Center).
        // We should lower it significantly.
        // Let's try setting it to 0 first, which should be the center of the capsule.
        // But wait, the user specifically said "bottom touching ground".
        // If I set it to 0 (center of player), and scale Y is 1.3.
        // Bottom will be at -1.3 relative to center.
        // If player center is at +1.0 (relative to ground).
        // Bottom will be at -0.3 (submerged).
        // This might be okay or slightly too low.
        // Let's try 0.3 to be safe (Center at 1.3m height, bottom at 0).
        
        // WAIT, let's look at the user feedback again.
        // "Ellipse center is at player head".
        // Previous code: this.shieldMesh.position.y = 1.0;
        // If 1.0 is Head.
        // Then 0.0 is Center/Waist?
        // And -1.0 is Feet?
        // This matches the Capsule geometry where origin is center?
        // Actually, `MeshBuilder.CreateCapsule` origin is at the center.
        // If `this.mesh.position` is (5, 5, 5) in world.
        // The `BoxMan` constructor sets `this.mesh.position`.
        // Physics aggregate matches the mesh.
        // So the mesh origin IS the center of mass.
        
        // If I set `shieldMesh.position.y = 1.0` (relative to player mesh center), 
        // it puts the shield center 1.0 unit ABOVE the player center.
        // Since player half-height is 1.0 (total 2.0).
        // 1.0 unit above center IS the top of the head.
        // So the user was right, it was centered at the head.
        
        // To center it at the waist (which is roughly the player center, maybe slightly lower),
        // we should set `y = 0` or close to it.
        // If we want the bottom to touch the ground.
        // The shield Y-radius is 1.3.
        // So we need the center to be 1.3 units above the ground.
        // The player center is 1.0 units above the ground (assuming standing).
        // So we need the shield center to be 0.3 units above the player center.
        // So `this.shieldMesh.position.y = 0.3`.
        
        this.shieldMesh.position.y = 0.3;

        // 2. Material
        this.shieldMaterial = new StandardMaterial("alphaShieldMat", this.scene);
        this.shieldMaterial.diffuseColor = Color3.Black();
        this.shieldMaterial.specularColor = Color3.Black();
        this.shieldMaterial.emissiveColor = new Color3(1.0, 1.0, 0.0); // Bright Yellow base
        this.shieldMaterial.alpha = 0; // Start invisible
        
        // Fresnel for Glowing Edges
        const fresnel = new FresnelParameters();
        fresnel.isEnabled = true;
        fresnel.bias = 0.18;
        fresnel.power = 1.6;
        fresnel.leftColor = new Color3(1.0, 1.0, 0.6);
        fresnel.rightColor = new Color3(0.0, 0.0, 0.0);
        this.shieldMaterial.emissiveFresnelParameters = fresnel;

        // Fresnel for Opacity (Transparent Center)
        const opacityFresnel = new FresnelParameters();
        opacityFresnel.isEnabled = true;
        opacityFresnel.bias = 0.22;
        opacityFresnel.power = 2.6;
        opacityFresnel.leftColor = new Color3(1.0, 1.0, 1.0); // Opaque Edge
        opacityFresnel.rightColor = new Color3(0.0, 0.0, 0.0); // Fully Transparent Center
        this.shieldMaterial.opacityFresnelParameters = opacityFresnel;

        this.shieldMaterial.disableLighting = true;
        this.shieldMaterial.backFaceCulling = false;
        this.shieldMaterial.alphaMode = Engine.ALPHA_ADD;

        this.shieldMesh.material = this.shieldMaterial;
        this.shieldMesh.isVisible = false;

        // 3. Light (Golden glow)
        this.light = new PointLight("alphaShieldLight", Vector3.Zero(), this.scene);
        this.light.parent = this.shieldMesh;
        this.light.intensity = 0;
        this.light.diffuse = new Color3(1.0, 1.0, 0.0);
        this.light.range = 15;

        // 4. Particles
        this.createParticles();
    }

    createParticles() {
        this.particleSystem = new ParticleSystem("alphaShieldParticles", 1000, this.scene);
        
        // Generate particle texture (Circle with soft edge)
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        const particleTexture = Texture.CreateFromBase64String(canvas.toDataURL(), "particleCircle.png", this.scene);
        this.particleSystem.particleTexture = particleTexture;
        
        this.particleSystem.emitter = this.shieldMesh;
        // Emit from surface
        this.particleSystem.createSphereEmitter(1.0, 0); // Radius matches mesh roughly (unit sphere * scaling)

        // Golden particles
        this.particleSystem.color1 = new Color4(1.0, 1.0, 0.2, 1.0);
        this.particleSystem.color2 = new Color4(1.0, 0.9, 0.0, 1.0);
        this.particleSystem.colorDead = new Color4(0, 0, 0, 0.0);

        this.particleSystem.minSize = 0.05;
        this.particleSystem.maxSize = 0.1;
        this.particleSystem.minLifeTime = 0.5;
        this.particleSystem.maxLifeTime = 1.0;
        this.particleSystem.emitRate = 200;
        this.particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        this.particleSystem.gravity = new Vector3(0, 0.2, 0); // Slight float

        // Do not start yet
        // this.particleSystem.start(); 
    }

    execute() {
        this.active = !this.active;
        
        if (this.active) {
            // Open
            this.shieldMesh.isVisible = true;
            this.particleSystem.start();
            this.targetScale = 1.0;
            this.targetAlpha = 0.35;
        } else {
            // Close
            this.targetScale = 0.0;
            this.targetAlpha = 0.0;
            this.particleSystem.stop();
        }
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Smooth transition
        const lerpSpeed = this.transitionSpeed * deltaTime;
        
        // Animate Scale
        this.currentScale = Scalar.Lerp(this.currentScale, this.targetScale, lerpSpeed);
        // Animate Alpha
        this.currentAlpha = Scalar.Lerp(this.currentAlpha, this.targetAlpha, lerpSpeed);

        if (this.shieldMesh && this.shieldMesh.isVisible) {
            // Apply scale (maintaining ellipsoid proportion)
            this.shieldMesh.scaling.set(this.currentScale, this.currentScale * 1.3, this.currentScale);
            
            // Apply alpha
            if (this.shieldMaterial) {
                this.shieldMaterial.alpha = this.currentAlpha;
            }
            
            // Apply light intensity
            if (this.light) {
                this.light.intensity = this.currentAlpha * 2.0;
            }

            // "Flowing" effect simulation: Pulse the Fresnel power or bias slightly
            this.time += deltaTime;
            // if (this.shieldMaterial.emissiveFresnelParameters) {
            //     // Pulse bias between 0.1 and 0.2
            //     const pulse = Math.sin(this.time * 3.0) * 0.05 + 0.15; 
            //     this.shieldMaterial.emissiveFresnelParameters.bias = pulse;
            // }
            
            // Hide if closed and fully transparent/small
            if (!this.active && this.currentAlpha < 0.05 && this.currentScale < 0.1) {
                this.shieldMesh.isVisible = false;
            }
        }
    }
}
