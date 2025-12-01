import { MeshBuilder, Vector3, StandardMaterial, Color3, Matrix, Quaternion, Texture } from "@babylonjs/core";

export class AsteroidBelt {
    constructor(scene, count = 1000, radius = 200, width = 50) {
        this.scene = scene;
        this.count = count;
        this.radius = radius;
        this.width = width;
        
        this.createAsteroids();
    }

    createAsteroids() {
        // Create a base asteroid mesh
        const asteroidMaster = MeshBuilder.CreatePolyhedron("asteroidMaster", {
            type: 2, // Icosahedron-ish
            size: 2
        }, this.scene);
        
        // Give it a rocky material
        const mat = new StandardMaterial("asteroidMat", this.scene);
        mat.diffuseColor = new Color3(0.4, 0.35, 0.3);
        mat.specularColor = new Color3(0.1, 0.1, 0.1);
        mat.bumpTexture = new Texture("https://playground.babylonjs.com/textures/rockn.png", this.scene);
        asteroidMaster.material = mat;

        // Use Thin Instances for performance
        const matrices = new Float32Array(16 * this.count);
        const colorData = new Float32Array(4 * this.count);

        for (let i = 0; i < this.count; i++) {
            const matrix = Matrix.Identity();
            
            // Random position in a torus/belt shape
            // Angle
            const angle = Math.random() * Math.PI * 2;
            // Distance from center (gaussian-ish distribution around radius)
            const dist = this.radius + (Math.random() - 0.5) * this.width;
            // Height variation
            const height = (Math.random() - 0.5) * (this.width * 0.4);

            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const y = height;

            const position = new Vector3(x, y, z);

            // Random rotation
            const rotation = Quaternion.FromEulerAngles(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            // Random scale
            const scaleVal = 0.5 + Math.random() * 2.0;
            const scale = new Vector3(scaleVal, scaleVal, scaleVal);

            Matrix.ComposeToRef(scale, rotation, position, matrix);
            
            matrix.copyToArray(matrices, i * 16);

            // Random slight color variation
            const tint = 0.8 + Math.random() * 0.4;
            colorData[i * 4] = tint;
            colorData[i * 4 + 1] = tint;
            colorData[i * 4 + 2] = tint;
            colorData[i * 4 + 3] = 1.0;
        }

        asteroidMaster.thinInstanceSetBuffer("matrix", matrices, 16, true);
        asteroidMaster.thinInstanceSetBuffer("color", colorData, 4);
        
        // Optional: Add rotation animation (simple CPU side for now, or shader if needed)
        // For massive amount, static or shader based is better.
        // Let's leave them static for now to save FPS, or rotate the whole group.
        
        // Group rotation
        this.root = asteroidMaster;
        
        this.scene.registerBeforeRender(() => {
            this.root.rotation.y += 0.0005;
        });
    }
}
