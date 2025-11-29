import { MeshBuilder, StandardMaterial, Color3, ParticleSystem, Texture, Vector3, GlowLayer } from "@babylonjs/core";

export class Shield {
    constructor(scene, parentMesh) {
        this.scene = scene;
        this.parentMesh = parentMesh;
        this.mesh = null;
        this.particleSystem = null;
        this.glowLayer = null;
        
        this.createShieldMesh();
        this.createParticles();
        this.setupBloom();
    }

    createShieldMesh() {
        // Create a sphere and scale it to look like an egg
        // Diameter 2.2 roughly covers the player (height 2)
        this.mesh = MeshBuilder.CreateSphere("shieldMesh", { diameter: 2.2, segments: 16 }, this.scene);
        // Scale Y to make it egg-shaped
        this.mesh.scaling = new Vector3(1, 1.3, 1); 
        
        this.mesh.parent = this.parentMesh;
        // Adjust position to avoid ground penetration
        // Lowered from 1.65 to 1.45 as requested ("Too high")
        this.mesh.position.y = 1.45; 
        
        // Material
        const shieldMat = new StandardMaterial("shieldMat", this.scene);
        shieldMat.diffuseColor = new Color3(1, 1, 0); // Yellow
        shieldMat.emissiveColor = new Color3(0.5, 0.4, 0); // Warm Glow
        shieldMat.alpha = 0.3; // Transparent
        shieldMat.backFaceCulling = false; // Visible from inside too (optional)
        
        this.mesh.material = shieldMat;
    }

    setupBloom() {
        // Create a dedicated GlowLayer for shield particles
        this.glowLayer = new GlowLayer("shieldGlow", this.scene);
        this.glowLayer.intensity = 2.0; // Increased intensity for better effect
        this.glowLayer.layerMask = 0xFFFFFFFF & ~0x10000000;
        this.glowLayer.customEmissiveColorSelector = (mesh, subMesh, material, result) => {
            if ((mesh.layerMask & 0x10000000) !== 0) {
                result.set(0, 0, 0);
                return;
            }
            if (material && material.emissiveColor) {
                result.copyFrom(material.emissiveColor);
            } else {
                result.set(0, 0, 0);
            }
        };
        
        // Exclude the shield mesh itself so it doesn't bloom (User wants only particles)
        if (this.mesh) {
            this.glowLayer.addExcludedMesh(this.mesh);
        }
        
        // Exclude Player meshes to be safe
        if (this.parentMesh) {
            this.glowLayer.addExcludedMesh(this.parentMesh);
            this.parentMesh.getChildMeshes().forEach(m => {
                this.glowLayer.addExcludedMesh(m);
            });
        }

        // Exclude Ground to be safe
        const ground = this.scene.getMeshByName("ground");
        if (ground) {
            this.glowLayer.addExcludedMesh(ground);
        }
    }

    createParticles() {
        // Create a particle system
        const particleSystem = new ParticleSystem("shieldParticles", 2000, this.scene);

        // Texture of each particle
        // Circular soft particle (Gold)
        // We create a radial gradient circle using a canvas data URL or manual buffer?
        
        // Dynamic Texture for Circular Particle
        // FIX: Use a canvas and create texture properly to ensure visibility.
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)"); // Core White
        grad.addColorStop(0.5, "rgba(255, 255, 255, 0.5)"); // Mid Halo
        grad.addColorStop(1, "rgba(255, 255, 255, 0)"); // Fade out
        ctx.fillStyle = grad;
        ctx.clearRect(0, 0, 64, 64); // Clear first
        ctx.fillRect(0, 0, 64, 64);
        const particleUrl = canvas.toDataURL();
        
        const texture = Texture.CreateFromBase64String(particleUrl, "particleCircle.png", this.scene);
        particleSystem.particleTexture = texture;

        // Emitter
        // Emit from the shield mesh surface
        particleSystem.emitter = this.mesh;
        
        // Sphere Emitter
        particleSystem.createSphereEmitter(1.5);

        // Colors - GOLDEN & BOOSTED for BLOOM
        // Values > 1.0 will trigger the GlowLayer (if threshold is set correctly)
        // Standard Gold: (1.0, 0.8, 0.0)
        // Boosted Gold: (3.0, 2.4, 0.0)
        particleSystem.color1 = new Color3(3.0, 2.4, 0.0); 
        particleSystem.color2 = new Color3(2.0, 1.0, 0.0);
        particleSystem.colorDead = new Color3(0, 0, 0);

        // Size
        particleSystem.minSize = 0.05;
        particleSystem.maxSize = 0.15;

        // Life time
        particleSystem.minLifeTime = 0.5;
        particleSystem.maxLifeTime = 1.5;

        // Emission rate
        particleSystem.emitRate = 200; // Increased rate for better visibility

        // Blend mode
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD; // Essential for Bloom

        // Gravity - float up slightly
        particleSystem.gravity = new Vector3(0, 0.2, 0);

        // Speed
        particleSystem.minEmitPower = 0.1;
        particleSystem.maxEmitPower = 0.5;
        particleSystem.updateSpeed = 0.01;

        // Start
        particleSystem.start();
        
        this.particleSystem = particleSystem;
    }

    dispose() {
        if (this.particleSystem) {
            this.particleSystem.stop();
            this.particleSystem.dispose();
        }
        if (this.mesh) {
            this.mesh.dispose();
        }
    }
}
