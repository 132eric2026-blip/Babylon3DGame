import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, ShaderMaterial, Effect, Texture, Animation, Color4 } from "@babylonjs/core";

export class GiantPlanet {
    constructor(scene, position, scale) {
        this.scene = scene;
        this.root = new TransformNode("planetRoot", scene);
        this.root.position = position;
        this.root.scaling = new Vector3(scale, scale, scale);

        this.createPlanet();
        this.createRings();
    }

    createPlanet() {
        // Custom Shader for Gas Giant
        Effect.ShadersStore["gasGiantVertexShader"] = `
            precision highp float;
            attribute vec3 position;
            attribute vec2 uv;
            uniform mat4 worldViewProjection;
            varying vec2 vUV;
            varying vec3 vPosition;
            
            void main() {
                vUV = uv;
                vPosition = position;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;

        Effect.ShadersStore["gasGiantFragmentShader"] = `
            precision highp float;
            varying vec2 vUV;
            varying vec3 vPosition;
            uniform float time;
            uniform vec3 sunDirection;

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
                // Spherical mapping adjustment
                vec2 p = vUV;
                
                // Gas Bands (horizontal stretching)
                float bands = fbm(vec2(p.y * 10.0, p.x * 2.0 + time * 0.05));
                
                // Turbulance
                float turb = fbm(vec2(p.x * 10.0 + time * 0.1, p.y * 20.0));
                
                // Mix patterns
                float pattern = mix(bands, turb, 0.3);
                
                // Colors (Jupiter-like or Alien)
                vec3 col1 = vec3(0.8, 0.4, 0.1); // Orange
                vec3 col2 = vec3(0.4, 0.2, 0.05); // Brown
                vec3 col3 = vec3(0.9, 0.8, 0.6); // Cream
                
                vec3 color = mix(col2, col1, pattern);
                color = mix(color, col3, smoothstep(0.4, 0.6, pattern));
                
                // Lighting (Fake)
                // Simple rim lighting or directional
                vec3 normal = normalize(vPosition);
                float light = dot(normal, normalize(vec3(1.0, 0.5, 1.0))); // Sun direction
                light = max(0.05, light); // Ambient
                
                // Atmosphere glow (Fresnel)
                float fresnel = pow(1.0 - dot(normal, vec3(0,0,1)), 3.0); // Simplified view dir
                
                gl_FragColor = vec4(color * light + fresnel * vec3(0.2, 0.4, 0.8) * 0.5, 1.0);
            }
        `;

        const planet = MeshBuilder.CreateSphere("gasGiant", { diameter: 1, segments: 64 }, this.scene);
        planet.parent = this.root;
        
        const planetMat = new ShaderMaterial("gasGiantMat", this.scene, {
            vertex: "gasGiant",
            fragment: "gasGiant",
        }, {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection", "time", "sunDirection"]
        });

        planet.material = planetMat;

        let time = 0;
        this.scene.registerBeforeRender(() => {
            time += this.scene.getEngine().getDeltaTime() * 0.0005;
            planetMat.setFloat("time", time);
        });
    }

    createRings() {
        // Ring Geometry
        const rings = MeshBuilder.CreateDisc("planetRings", { radius: 1.2, tessellation: 64 }, this.scene);
        rings.parent = this.root;
        rings.rotation.x = Math.PI / 2.2; // Tilted
        rings.scaling = new Vector3(1, 1, 1); // Flattened handled by Disc

        // Custom Ring Shader
        Effect.ShadersStore["planetRingFragmentShader"] = `
            precision highp float;
            varying vec2 vUV;
            
            void main() {
                // Center is 0.5, 0.5
                vec2 uv = vUV - 0.5;
                float r = length(uv) * 2.0; // 0 to 1
                
                if (r < 0.6 || r > 1.0) discard;
                
                // Ring Pattern (Concentric lines)
                float rings = sin(r * 100.0);
                
                // Alpha fade
                float alpha = 0.8 * (1.0 - smoothstep(0.9, 1.0, r)) * smoothstep(0.6, 0.65, r);
                
                // Color
                vec3 col = vec3(0.7, 0.6, 0.5);
                
                // Shadow from planet (Simple approximation)
                // If UV.y is behind planet... simplified
                
                gl_FragColor = vec4(col * (0.8 + 0.2 * rings), alpha);
            }
        `;

        const ringMat = new ShaderMaterial("planetRingMat", this.scene, {
            vertex: "skyBox", // Reuse simple vertex shader
            fragment: "planetRing",
        }, {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection"],
            needAlphaBlending: true
        });
        
        ringMat.backFaceCulling = false;
        rings.material = ringMat;
    }
}
