import { HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, ShadowGenerator, PhysicsAggregate, PhysicsShapeType, ShaderMaterial, Effect, Texture, Color4 } from "@babylonjs/core";
import { Config } from "./config";

export function createSceneElements(scene) {
    // 0. Space Environment (Clear Color)
    scene.clearColor = new Color4(0.05, 0.05, 0.1, 1.0);
    scene.fogMode = scene.FOGMODE_EXP2;
    scene.fogDensity = 0.02;
    scene.fogColor = new Color3(0.05, 0.05, 0.1);

    // 1. Cosmic Lighting
    // Dim ambient light (Space is dark)
    const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    hemiLight.diffuse = new Color3(0.1, 0.1, 0.2);
    hemiLight.groundColor = new Color3(0.1, 0.1, 0.1);
    hemiLight.intensity = 0.3;

    // Main Star Light (Blue/White distant star)
    const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), scene);
    dirLight.position = new Vector3(20, 40, 20);
    dirLight.diffuse = new Color3(0.8, 0.8, 1.0);
    dirLight.specular = new Color3(1.0, 1.0, 1.0);
    dirLight.intensity = 1.2;

    // Secondary Light (Nebula Glow - Purple/Pink from opposite side)
    const rimLight = new DirectionalLight("rimLight", new Vector3(1, -0.5, 1), scene);
    rimLight.diffuse = new Color3(0.6, 0.2, 0.8);
    rimLight.intensity = 0.5;

    // Shadows
    if (Config.scene.shadows && Config.scene.shadows.enabled) {
        const shadowConfig = Config.scene.shadows;
        const shadowGenerator = new ShadowGenerator(shadowConfig.size, dirLight);
        shadowGenerator.useBlurExponentialShadowMap = shadowConfig.useBlurExponentialShadowMap;
        shadowGenerator.blurKernel = shadowConfig.blurKernel;
        shadowGenerator.useKernelBlur = shadowConfig.useKernelBlur;
        if (shadowConfig.darkness !== undefined) {
            shadowGenerator.setDarkness(shadowConfig.darkness);
        }
        scene.shadowGenerator = shadowGenerator;
    }

    // 2. Cosmic Skybox (Procedural Shader)
    createCosmicSky(scene);

    // 3. Alien Ground
    const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200, subdivisions: 50 }, scene);
    
    // Custom Ground Shader
    Effect.ShadersStore["alienGroundVertexShader"] = `
        precision highp float;
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 uv;
        uniform mat4 world;
        uniform mat4 worldViewProjection;
        varying vec2 vUV;
        varying vec3 vPositionW;
        varying vec3 vNormalW;

        void main() {
            vec4 p = vec4(position, 1.0);
            vPositionW = (world * p).xyz;
            vNormalW = normalize(vec3(world * vec4(normal, 0.0)));
            vUV = uv;
            gl_Position = worldViewProjection * p;
        }
    `;

    Effect.ShadersStore["alienGroundFragmentShader"] = `
        precision highp float;
        varying vec2 vUV;
        varying vec3 vPositionW;
        varying vec3 vNormalW;
        uniform vec3 cameraPosition;

        // Simple Noise
        float hash(float n) { return fract(sin(n) * 43758.5453123); }
        float noise(vec2 x) {
            vec2 p = floor(x);
            vec2 f = fract(x);
            f = f * f * (3.0 - 2.0 * f);
            float n = p.x + p.y * 57.0;
            return mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                       mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
        }

        void main() {
            // Grid Pattern
            float scale = 50.0;
            vec2 gridUV = vUV * scale;
            vec2 grid = abs(fract(gridUV - 0.5) - 0.5) / fwidth(gridUV);
            float line = min(grid.x, grid.y);
            float gridFactor = 1.0 - smoothstep(0.0, 1.5, line);
            
            // Hexagon-ish noise pattern
            float n = noise(vUV * 20.0);
            
            // Base Color (Dark Purple/Blue)
            vec3 baseColor = vec3(0.05, 0.05, 0.1);
            
            // Vein Color (Glowing Blue)
            vec3 veinColor = vec3(0.0, 0.8, 1.0);
            
            // Mix based on grid
            vec3 color = mix(baseColor, veinColor, gridFactor * 0.5);
            
            // Add some organic noise variation
            color += vec3(0.05, 0.0, 0.1) * n;

            // Specular / Reflection (Alien moist/crystal surface)
            vec3 viewDir = normalize(cameraPosition - vPositionW);
            vec3 lightDir = normalize(vec3(20.0, 40.0, 20.0)); // Match dirLight
            vec3 halfDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(vNormalW, halfDir), 0.0), 32.0);
            
            color += vec3(0.5, 0.5, 1.0) * spec;

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const groundMat = new ShaderMaterial("alienGroundMat", scene, {
        vertex: "alienGround",
        fragment: "alienGround",
    }, {
        attributes: ["position", "normal", "uv"],
        uniforms: ["world", "worldViewProjection", "cameraPosition"]
    });
    
    ground.material = groundMat;
    ground.receiveShadows = true;

    // Physics
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0.1 }, scene);

    // 4. Axes (Optional)
    if (Config.scene.showAxes) {
        const axisX = MeshBuilder.CreateLines("axisX", { points: [Vector3.Zero(), new Vector3(5, 0, 0)] }, scene);
        axisX.color = new Color3(1, 0, 0);
        const axisY = MeshBuilder.CreateLines("axisY", { points: [Vector3.Zero(), new Vector3(0, 5, 0)] }, scene);
        axisY.color = new Color3(0, 1, 0);
        const axisZ = MeshBuilder.CreateLines("axisZ", { points: [Vector3.Zero(), new Vector3(0, 0, 5)] }, scene);
        axisZ.color = new Color3(0, 0, 1);
    }
}

function createCosmicSky(scene) {
    Effect.ShadersStore["skyBoxVertexShader"] = `
        precision highp float;
        attribute vec3 position;
        uniform mat4 worldViewProjection;
        varying vec3 vPosition;
        void main() {
            vec4 p = vec4(position, 1.0);
            vPosition = position;
            gl_Position = worldViewProjection * p;
        }
    `;

    Effect.ShadersStore["skyBoxFragmentShader"] = `
        precision highp float;
        varying vec3 vPosition;
        uniform float time;
        
        // Noise functions
        float hash(float n) { return fract(sin(n) * 43758.5453123); }
        float noise(vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f * f * (3.0 - 2.0 * f);
            float n = p.x + p.y * 57.0 + p.z * 113.0;
            return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                           mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
                       mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                           mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
        }
        
        float fbm(vec3 p) {
            float f = 0.0;
            f += 0.50000 * noise(p); p = p * 2.02;
            f += 0.25000 * noise(p); p = p * 2.03;
            f += 0.12500 * noise(p); p = p * 2.01;
            return f;
        }

        void main() {
            vec3 dir = normalize(vPosition);
            
            // 1. Background Deep Space
            vec3 color = vec3(0.0, 0.0, 0.05);
            
            // 2. Nebula Clouds (Purple/Pink/Blue)
            float n = fbm(dir * 3.0);
            float n2 = fbm(dir * 6.0 + vec3(1.0));
            
            vec3 nebulaColor1 = vec3(0.2, 0.0, 0.4); // Purple
            vec3 nebulaColor2 = vec3(0.0, 0.2, 0.5); // Blue
            
            float nebulaMask = smoothstep(0.4, 0.8, n);
            color += mix(nebulaColor1, nebulaColor2, n2) * nebulaMask * 1.5;
            
            // 3. Stars
            float starNoise = noise(dir * 150.0);
            float stars = smoothstep(0.95, 1.0, starNoise);
            color += vec3(stars) * (0.5 + 0.5 * sin(time + starNoise * 10.0)); // Twinkle
            
            // Big bright stars
            float bigStarNoise = noise(dir * 50.0);
            float bigStars = smoothstep(0.98, 1.0, bigStarNoise);
            color += vec3(bigStars) * vec3(0.8, 0.9, 1.0);

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
    const skyboxMaterial = new ShaderMaterial("skyBox", scene, {
        vertex: "skyBox",
        fragment: "skyBox",
    }, {
        attributes: ["position"],
        uniforms: ["worldViewProjection", "time"],
        sideOrientation: MeshBuilder.BACKSIDE
    });
    
    skyboxMaterial.backFaceCulling = false;
    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true; // Make it follow camera
    
    let time = 0;
    scene.registerBeforeRender(() => {
        time += scene.getEngine().getDeltaTime() * 0.001;
        skyboxMaterial.setFloat("time", time);
    });
}
