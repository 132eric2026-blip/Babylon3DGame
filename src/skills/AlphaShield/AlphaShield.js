import { MeshBuilder, StandardMaterial, Color3, Color4, ParticleSystem, Texture, Vector3, FresnelParameters, PointLight, Scalar } from "@babylonjs/core";
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
        // Position: Assuming player origin is at feet, 1.0 is roughly center
        this.shieldMesh.position.y = 1.0;

        // 2. Material
        this.shieldMaterial = new StandardMaterial("alphaShieldMat", this.scene);
        this.shieldMaterial.diffuseColor = Color3.Black();
        this.shieldMaterial.specularColor = Color3.Black();
        this.shieldMaterial.emissiveColor = new Color3(1.0, 0.8, 0.0); // Golden base
        this.shieldMaterial.alpha = 0; // Start invisible
        
        // Fresnel for Glowing Edges
        const fresnel = new FresnelParameters();
        fresnel.isEnabled = true;
        fresnel.bias = 0.1;
        fresnel.power = 2.0;
        fresnel.leftColor = new Color3(1.0, 0.9, 0.5); // Bright Gold Edge
        fresnel.rightColor = new Color3(0.2, 0.15, 0.0); // Darker Center
        this.shieldMaterial.emissiveFresnelParameters = fresnel;

        // Fresnel for Opacity (Transparent Center)
        const opacityFresnel = new FresnelParameters();
        opacityFresnel.isEnabled = true;
        opacityFresnel.bias = 0.1;
        opacityFresnel.power = 2.0;
        opacityFresnel.leftColor = new Color3(1.0, 1.0, 1.0); // Opaque Edge
        opacityFresnel.rightColor = new Color3(0.05, 0.05, 0.05); // Transparent Center
        this.shieldMaterial.opacityFresnelParameters = opacityFresnel;

        this.shieldMaterial.disableLighting = true; // Self-illuminated
        this.shieldMaterial.backFaceCulling = false; // Visible from inside

        this.shieldMesh.material = this.shieldMaterial;
        this.shieldMesh.isVisible = false;

        // 3. Light (Golden glow)
        this.light = new PointLight("alphaShieldLight", Vector3.Zero(), this.scene);
        this.light.parent = this.shieldMesh;
        this.light.intensity = 0;
        this.light.diffuse = new Color3(1.0, 0.8, 0.0);
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
        this.particleSystem.color1 = new Color4(1.0, 0.9, 0.5, 1.0);
        this.particleSystem.color2 = new Color4(1.0, 0.8, 0.0, 1.0);
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
            this.targetAlpha = 0.8;
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
            if (this.shieldMaterial.emissiveFresnelParameters) {
                // Pulse bias between 0.1 and 0.2
                const pulse = Math.sin(this.time * 3.0) * 0.05 + 0.15; 
                this.shieldMaterial.emissiveFresnelParameters.bias = pulse;
            }
            
            // Hide if closed and fully transparent/small
            if (!this.active && this.currentAlpha < 0.05 && this.currentScale < 0.1) {
                this.shieldMesh.isVisible = false;
            }
        }
    }
}
