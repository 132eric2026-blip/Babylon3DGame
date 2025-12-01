import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, ShaderMaterial, Effect, Texture, Animation, PointLight } from "@babylonjs/core";
import { Config } from "./config";
import { AncientGuardian } from "./ancientGuardian";

export class Stargate {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position;
        this.root = new TransformNode("stargateRoot", scene);
        this.root.position = position;
        
        // Create the structure
        this.createRing();
        
        // Create the effect
        this.createVortex();

        // Create Guardians
        this.createGuardians();
    }

    createGuardians() {
        // Left Guardian
        // Position: Left of gate, slightly forward, facing forward
        // Gate is at 0,0,0 relative to root. Ring radius 4.
        // Let's put them at +/- 6 X, and maybe 2 Z (forward)
        
        const leftPos = this.root.position.clone().add(new Vector3(-7, 0, 2));
        new AncientGuardian(this.scene, leftPos, Math.PI / 6); // Slight inward turn

        // Right Guardian
        const rightPos = this.root.position.clone().add(new Vector3(7, 0, 2));
        new AncientGuardian(this.scene, rightPos, -Math.PI / 6); // Slight inward turn
    }

    createRing() {
        // Outer Ring Material (Ancient Metal)
        const metalMat = new StandardMaterial("gateMetalMat", this.scene);
        metalMat.diffuseColor = new Color3(0.3, 0.35, 0.4);
        metalMat.specularColor = new Color3(0.6, 0.6, 0.7);
        metalMat.roughness = 0.4;
        
        // Glowing Chevron Material
        const chevronMat = new StandardMaterial("chevronMat", this.scene);
        chevronMat.emissiveColor = new Color3(1.0, 0.4, 0.0); // Orange glow
        chevronMat.diffuseColor = new Color3(1.0, 0.2, 0.0);
        
        // 1. Main Ring (Torus)
        const ring = MeshBuilder.CreateTorus("gateRing", {
            diameter: 8,
            thickness: 1.2,
            tessellation: 64
        }, this.scene);
        ring.material = metalMat;
        ring.parent = this.root;
        // Stand upright
        ring.rotation.x = Math.PI / 2; 
        // Slightly bury in ground if needed, but user said "on ground". Let's put it slightly up so it doesn't clip too much.
        ring.position.y = 4; // Center is at 4m high (Radius 4)

        // 2. Chevrons (Details around the ring)
        const chevronCount = 9;
        for (let i = 0; i < chevronCount; i++) {
            const angle = (i / chevronCount) * Math.PI * 2;
            
            const chevronGroup = new TransformNode("chevron" + i, this.scene);
            chevronGroup.parent = this.root;
            chevronGroup.position.y = 4; // Match ring center
            chevronGroup.rotation.z = angle; // Rotate around the ring center (Z axis in local space after X rotation? No, root is Y-up)
            // Actually, since ring is rotated X=90, its local Z is world Y (roughly).
            // Let's just position them using simple trig on the upright plane (XY plane relative to world if looking from Z, but let's assume gate faces Z)
            
            // The ring is in X-Y plane relative to itself if created upright? 
            // MeshBuilder.CreateTorus creates in X-Z plane by default. 
            // We rotated X by 90, so now it's in X-Y plane.
            
            // Calculate position on the ring
            const radius = 4;
            const cx = Math.cos(angle) * radius;
            const cy = Math.sin(angle) * radius;
            
            // Box holder
            const box = MeshBuilder.CreateBox("chevBox", { width: 0.8, height: 1.4, depth: 1.4 }, this.scene);
            box.parent = this.root;
            // Position relative to root center (0, 4, 0)
            box.position = new Vector3(cx, cy + 4, 0);
            box.rotation.z = angle - Math.PI / 2; // Point outward/inward
            box.material = metalMat;
            
            // Glowing center
            const light = MeshBuilder.CreateBox("chevLight", { width: 0.4, height: 0.6, depth: 1.5 }, this.scene);
            light.parent = box;
            light.material = chevronMat;
        }
        
        // 3. Base/Platform
        const platform = MeshBuilder.CreateBox("gatePlatform", { width: 6, height: 1, depth: 4 }, this.scene);
        platform.position = new Vector3(0, 0.5, 0);
        platform.material = metalMat;
        platform.parent = this.root;
    }

    createVortex() {
        // Register Shaders
        Effect.ShadersStore["vortexVertexShader"] = `
            precision highp float;
            attribute vec3 position;
            attribute vec2 uv;
            uniform mat4 worldViewProjection;
            uniform float time;
            varying vec2 vUV;
            varying vec3 vPosition;
            
            void main() {
                vUV = uv;
                vPosition = position;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;

        Effect.ShadersStore["vortexFragmentShader"] = `
            precision highp float;
            varying vec2 vUV;
            uniform float time;
            
            // Noise function
            float hash(float n) { return fract(sin(n) * 43758.5453123); }
            float noise(vec2 x) {
                vec2 p = floor(x);
                vec2 f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                float n = p.x + p.y * 57.0;
                return mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                           mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
            }
            
            float fbm(vec2 p) {
                float f = 0.0;
                f += 0.50000 * noise(p); p = p * 2.02;
                f += 0.25000 * noise(p); p = p * 2.03;
                f += 0.12500 * noise(p); p = p * 2.01;
                return f;
            }

            void main() {
                // Center UV
                vec2 p = vUV * 2.0 - 1.0;
                
                // Polar coordinates
                float r = length(p);
                float a = atan(p.y, p.x);
                
                // Swirl effect
                float swirl = a + r * 3.0 - time * 1.5;
                
                // Dynamic Noise Pattern
                float n = fbm(vec2(r * 3.0 - time * 0.5, swirl));
                
                // Colors
                vec3 deepPurple = vec3(0.1, 0.0, 0.2);
                vec3 brightPurple = vec3(0.6, 0.0, 1.0);
                vec3 energyWhite = vec3(0.8, 0.6, 1.0);
                
                // Mixing colors based on noise and radius
                vec3 color = mix(deepPurple, brightPurple, n);
                
                // Add energy streaks
                float streaks = smoothstep(0.4, 0.6, n + 0.1 * sin(time * 5.0));
                color = mix(color, energyWhite, streaks * 0.5);
                
                // Center glow
                color += energyWhite * (1.0 - smoothstep(0.0, 0.2, r));
                
                // Event Horizon edges (fade out towards ring)
                float alpha = 1.0 - smoothstep(0.85, 1.0, r);
                
                // Ripple/Wave effect (optional sine wave on radius)
                float wave = sin(r * 20.0 - time * 8.0) * 0.05;
                alpha *= 1.0 + wave;
                
                // Discard outside circle
                if(r > 1.0) discard;

                gl_FragColor = vec4(color, alpha * 0.9);
            }
        `;

        // Create the disc for the event horizon
        const vortexMesh = MeshBuilder.CreatePlane("vortex", { size: 7.5 }, this.scene);
        vortexMesh.parent = this.root;
        vortexMesh.position.y = 4;
        
        // Material
        const vortexMat = new ShaderMaterial("vortexMat", this.scene, {
            vertex: "vortex",
            fragment: "vortex",
        }, {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection", "time"],
            needAlphaBlending: true
        });

        vortexMesh.material = vortexMat;
        
        // Animate
        let time = 0;
        this.scene.registerBeforeRender(() => {
            time += this.scene.getEngine().getDeltaTime() * 0.001;
            vortexMat.setFloat("time", time);
        });
        
        // Add a point light for the glow
        const light = new PointLight("gateLight", new Vector3(0, 4, 0), this.scene);
        light.parent = this.root;
        light.diffuse = new Color3(0.8, 0.2, 1.0);
        light.intensity = 3.0;
        light.range = 15;
    }
}
