import { HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, ShadowGenerator, PhysicsAggregate, PhysicsShapeType, ShaderMaterial, Effect, Texture, Color4 } from "@babylonjs/core";
import { Config } from "../../config";
import { SagittariusSceneConfig } from "./config";
import { AsteroidBelt } from "./asteroidBelt";
import { Stargate } from "./stargate";
import { GiantPlanet } from "./giantPlanet";

/**
 * 人马座科幻场景
 * 搭建太空环境、光照、外星地面与场景物体（小行星带、星门、巨行星）
 */
export class SagittariusScene {
    /**
     * 构造人马座场景
     * @param {Scene} scene Babylon 场景实例
     */
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * 创建场景：环境、光照、天空、地面与场景物体
     */
    create() {
        this.setupEnvironment();
        this.setupLights();
        this.createCosmicSky();
        this.createAlienGround();
        this.createSceneObjects();
    }

    /**
     * 环境设置：深色太空背景与雾效
     */
    setupEnvironment() {
        this.scene.clearColor = new Color4(0.05, 0.05, 0.1, 1.0);
        this.scene.fogMode = this.scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.02;
        this.scene.fogColor = new Color3(0.05, 0.05, 0.1);
    }

    /**
     * 光照设置：宇宙环境光、主星方向光与星云边缘光
     */
    setupLights() {
        // 微弱环境光（太空较暗）
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
        hemiLight.diffuse = new Color3(0.1, 0.1, 0.2);
        hemiLight.groundColor = new Color3(0.1, 0.1, 0.1);
        hemiLight.intensity = 0.3;

        // 主恒星方向光（偏蓝白）
        const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), this.scene);
        dirLight.position = new Vector3(20, 40, 20);
        dirLight.diffuse = new Color3(0.8, 0.8, 1.0);
        dirLight.specular = new Color3(1.0, 1.0, 1.0);
        dirLight.intensity = 1.2;

        // 次级光（星云辉光，紫粉色，来自相对方向）
        const rimLight = new DirectionalLight("rimLight", new Vector3(1, -0.5, 1), this.scene);
        rimLight.diffuse = new Color3(0.6, 0.2, 0.8);
        rimLight.intensity = 0.5;

        // 阴影
        if (Config.scene.shadows && Config.scene.shadows.enabled) {
            const shadowConfig = Config.scene.shadows;
            const shadowGenerator = new ShadowGenerator(shadowConfig.size, dirLight);
            shadowGenerator.useBlurExponentialShadowMap = shadowConfig.useBlurExponentialShadowMap;
            shadowGenerator.blurKernel = shadowConfig.blurKernel;
            shadowGenerator.useKernelBlur = shadowConfig.useKernelBlur;
            if (shadowConfig.darkness !== undefined) {
                shadowGenerator.setDarkness(shadowConfig.darkness);
            }
            this.scene.shadowGenerator = shadowGenerator;
        }
    }

    /**
     * 创建外星地面并应用着色器与物理
     */
    createAlienGround() {
        const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200, subdivisions: 50 }, this.scene);
        
        // 自定义地面着色器
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

        const groundMat = new ShaderMaterial("alienGroundMat", this.scene, {
            vertex: "alienGround",
            fragment: "alienGround",
        }, {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldViewProjection", "cameraPosition"]
        });
        
        ground.material = groundMat;
        ground.receiveShadows = true;

        // Physics
        new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0.1 }, this.scene);

        // 坐标轴（可选）
        if (Config.scene.showAxes) {
            const axisX = MeshBuilder.CreateLines("axisX", { points: [Vector3.Zero(), new Vector3(5, 0, 0)] }, this.scene);
            axisX.color = new Color3(1, 0, 0);
            const axisY = MeshBuilder.CreateLines("axisY", { points: [Vector3.Zero(), new Vector3(0, 5, 0)] }, this.scene);
            axisY.color = new Color3(0, 1, 0);
            const axisZ = MeshBuilder.CreateLines("axisZ", { points: [Vector3.Zero(), new Vector3(0, 0, 5)] }, this.scene);
            axisZ.color = new Color3(0, 0, 1);
        }
    }

    /**
     * 创建程序化太空天空盒
     */
    createCosmicSky() {
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
                
                // 1. Background Deep Space (Gradient)
                vec3 color = mix(vec3(0.0, 0.0, 0.02), vec3(0.0, 0.0, 0.05), dir.y * 0.5 + 0.5);
                
                // 2. Nebula Clouds (Multi-layered)
                // Layer 1: Large structures
                float n1 = fbm(dir * 2.0 + vec3(time * 0.01));
                // Layer 2: Details
                float n2 = fbm(dir * 4.0 - vec3(time * 0.02));
                
                vec3 c1 = vec3(0.3, 0.0, 0.4); // Purple
                vec3 c2 = vec3(0.0, 0.3, 0.6); // Blue
                vec3 c3 = vec3(0.4, 0.1, 0.1); // Reddish
                
                float mask1 = smoothstep(0.4, 0.8, n1);
                float mask2 = smoothstep(0.3, 0.7, n2);
                
                // Mix colors based on noise
                vec3 nebula = mix(c1, c2, n2);
                nebula = mix(nebula, c3, n1 * mask2);
                
                color += nebula * mask1 * 1.2;
                
                // 3. Milky Way Band (Directional intensity)
                // Band along X-Z plane approx
                float band = 1.0 - abs(dot(dir, normalize(vec3(0.5, 0.8, 0.1)))); 
                band = pow(band, 4.0); // Concentrate it
                
                float bandNoise = fbm(dir * 10.0);
                color += vec3(0.8, 0.7, 0.9) * band * bandNoise * 0.4;
                
                // 4. Stars
                float starNoise = noise(dir * 200.0);
                float stars = smoothstep(0.95, 1.0, starNoise);
                
                // Twinkle
                float twinkle = 0.5 + 0.5 * sin(time * 3.0 + starNoise * 100.0);
                color += vec3(stars) * twinkle;
                
                // Dense stars in band
                float denseStars = smoothstep(0.90, 1.0, noise(dir * 150.0)) * band;
                color += vec3(denseStars) * 0.5;

                // 5. Super Bright Stars
                float bigStarNoise = noise(dir * 60.0);
                float bigStars = smoothstep(0.99, 1.0, bigStarNoise);
                color += vec3(bigStars) * vec3(1.0, 0.9, 0.8) * 2.0;

                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, this.scene);
        const skyboxMaterial = new ShaderMaterial("skyBox", this.scene, {
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
        this.scene.registerBeforeRender(() => {
            time += this.scene.getEngine().getDeltaTime() * 0.001;
            skyboxMaterial.setFloat("time", time);
        });
    }

    /**
     * 创建场景物体：小行星带、星门与巨行星（按配置）
     */
    createSceneObjects() {
        // 小行星带
        if (SagittariusSceneConfig.asteroids && SagittariusSceneConfig.asteroids.enabled) {
            const ac = SagittariusSceneConfig.asteroids;
            new AsteroidBelt(this.scene, ac.count, ac.radius, ac.width);
        }

        // 星门
        if (SagittariusSceneConfig.stargate && SagittariusSceneConfig.stargate.enabled) {
            const pos = SagittariusSceneConfig.stargate.position;
            new Stargate(this.scene, new Vector3(pos.x, pos.y, pos.z));
        }

        // 巨行星
        if (SagittariusSceneConfig.giantPlanet && SagittariusSceneConfig.giantPlanet.enabled) {
            const gp = SagittariusSceneConfig.giantPlanet;
            new GiantPlanet(this.scene, new Vector3(gp.position.x, gp.position.y, gp.position.z), gp.scale);
        }
    }
}
