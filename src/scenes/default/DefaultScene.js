import { HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, ShadowGenerator, PhysicsAggregate, PhysicsShapeType, Color4, Texture, Effect, ShaderMaterial, DefaultRenderingPipeline } from "@babylonjs/core";
import { SkyMaterial } from "@babylonjs/materials";
import { Config } from "../../config";
import { DefaultSceneConfig } from "./config";
import { DecorationManager } from "./decorations";
import { Horse } from "./horse";

/**
 * 默认场景
 * 负责搭建地面、光照、环境与装饰，并生成可交互对象（如马）
 */
export class DefaultScene {
    /**
     * 构造默认场景
     * @param {Scene} scene Babylon 场景实例
     */
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * 创建场景：环境、光照、地面与装饰
     */
    create() {
        this.setupEnvironment();
        this.createSkybox();
        this.createAurora();
        this.setupLights();
        this.createGround();
        this.createDecorations();
        this.setupPostProcessing();
    }

    /**
     * 环境设置：天空色、环境光、雾效
     */
    setupEnvironment() {
        // 背景色
        if (DefaultSceneConfig.clearColor) {
            this.scene.clearColor = new Color4(
                DefaultSceneConfig.clearColor.r, 
                DefaultSceneConfig.clearColor.g, 
                DefaultSceneConfig.clearColor.b, 
                DefaultSceneConfig.clearColor.a
            );
        } else {
            this.scene.clearColor = new Color4(0.5, 0.8, 1.0, 1.0); // 默认天空蓝
        }

        // 环境光颜色
        if (DefaultSceneConfig.ambientColor) {
            this.scene.ambientColor = new Color3(
                DefaultSceneConfig.ambientColor.r, 
                DefaultSceneConfig.ambientColor.g, 
                DefaultSceneConfig.ambientColor.b
            );
        } else {
            this.scene.ambientColor = new Color3(0.3, 0.3, 0.3);
        }

        // 雾效
        if (DefaultSceneConfig.fog && DefaultSceneConfig.fog.enabled) {
            this.scene.fogMode = this.scene.FOGMODE_EXP2;
            this.scene.fogDensity = DefaultSceneConfig.fog.density !== undefined ? DefaultSceneConfig.fog.density : 0.002;
            
            if (DefaultSceneConfig.fog.color) {
                this.scene.fogColor = new Color3(
                    DefaultSceneConfig.fog.color.r,
                    DefaultSceneConfig.fog.color.g,
                    DefaultSceneConfig.fog.color.b
                );
            } else {
                this.scene.fogColor = new Color3(0.5, 0.8, 1.0);
            }
        } else {
             // 默认雾效配置（如果 config 中没有 fog 字段，或者 fog.enabled 为 true 但未指定细节）
             // 但如果 user 明确把 fog 删了或者 enabled false，就不开启。
             // 这里为了兼容旧代码，如果 DefaultSceneConfig.fog 根本不存在，保持原样？
             // 刚才我加了 default config，所以 DefaultSceneConfig.fog 应该存在。
             // 但为了安全：
             if (!DefaultSceneConfig.fog) {
                this.scene.fogMode = this.scene.FOGMODE_EXP2;
                this.scene.fogDensity = 0.002;
                this.scene.fogColor = new Color3(0.5, 0.8, 1.0);
             }
        }
    }

    /**
     * 光照设置：半球光与方向光以及阴影
     */
    setupLights() {
        // 半球光（天空光）
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
        hemiLight.diffuse = new Color3(0.8, 0.8, 0.9); // 略带蓝色
        hemiLight.groundColor = new Color3(0.4, 0.4, 0.4);
        hemiLight.intensity = DefaultSceneConfig.hemiLightIntensity;

        // 方向光（太阳）
        const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), this.scene);
        if (DefaultSceneConfig.dirLightPosition) {
            dirLight.position = new Vector3(
                DefaultSceneConfig.dirLightPosition.x, 
                DefaultSceneConfig.dirLightPosition.y, 
                DefaultSceneConfig.dirLightPosition.z
            );
        } else {
            dirLight.position = new Vector3(20, 40, 20);
        }
        dirLight.diffuse = new Color3(1.0, 0.9, 0.8); // 温暖的太阳色
        dirLight.specular = new Color3(0, 0, 0);
        dirLight.intensity = DefaultSceneConfig.dirLightIntensity;

        // 阴影
        if (Config.scene.shadows && Config.scene.shadows.enabled) {
            const shadowConfig = Config.scene.shadows;
            const treeShadow = DefaultSceneConfig.decorations && DefaultSceneConfig.decorations.treeShadow;
            const size = treeShadow && treeShadow.mapSize ? treeShadow.mapSize : shadowConfig.size;
            const shadowGenerator = new ShadowGenerator(size, dirLight);

            const filter = treeShadow && treeShadow.filter ? treeShadow.filter : "pcf";
            if (filter === "pcf") {
                shadowGenerator.usePercentageCloserFiltering = true;
                const q = treeShadow && treeShadow.quality ? treeShadow.quality : "high";
                shadowGenerator.filteringQuality = q === "low" ? ShadowGenerator.QUALITY_LOW : (q === "medium" ? ShadowGenerator.QUALITY_MEDIUM : ShadowGenerator.QUALITY_HIGH);
                shadowGenerator.useBlurExponentialShadowMap = false;
                shadowGenerator.useKernelBlur = false;
            } else {
                const useESM = (treeShadow && treeShadow.useBlurExponentialShadowMap !== undefined)
                    ? treeShadow.useBlurExponentialShadowMap
                    : shadowConfig.useBlurExponentialShadowMap;
                shadowGenerator.useBlurExponentialShadowMap = useESM;
                const blurKernel = (treeShadow && treeShadow.blurKernel !== undefined)
                    ? treeShadow.blurKernel
                    : (treeShadow && treeShadow.quality
                        ? (treeShadow.quality === "low" ? 8 : (treeShadow.quality === "high" ? 32 : 16))
                        : shadowConfig.blurKernel);
                shadowGenerator.blurKernel = blurKernel;
                shadowGenerator.useKernelBlur = (treeShadow && treeShadow.useKernelBlur !== undefined)
                    ? treeShadow.useKernelBlur
                    : shadowConfig.useKernelBlur;
            }

            if (treeShadow && treeShadow.darkness !== undefined) {
                shadowGenerator.setDarkness(treeShadow.darkness);
            } else if (shadowConfig.darkness !== undefined) {
                shadowGenerator.setDarkness(shadowConfig.darkness);
            }

            if (treeShadow && treeShadow.bias !== undefined) {
                shadowGenerator.bias = treeShadow.bias;
            }
            if (treeShadow && treeShadow.normalBias !== undefined) {
                shadowGenerator.normalBias = treeShadow.normalBias;
            }

            this.scene.shadowGenerator = shadowGenerator;
        }
    }

    /**
     * 创建地面并启用物理与坐标轴（可选）
     */
    createGround() {
        // 标准地面
        const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100, subdivisions: 2 }, this.scene);
        
        const groundMat = new StandardMaterial("groundMat", this.scene);
        groundMat.diffuseColor = new Color3(
            DefaultSceneConfig.groundColor.r,
            DefaultSceneConfig.groundColor.g,
            DefaultSceneConfig.groundColor.b
        ); // 灰色地面
        groundMat.specularColor = new Color3(0, 0, 0); // 去掉高光
        
        // 可选：网格纹理，默认场景使用纯色即可
        
        ground.material = groundMat;
        ground.receiveShadows = true;

        // 物理
        new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0.1 }, this.scene);

        // 坐标轴
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
     * 创建装饰与交互对象（树、石头、路灯、马）
     */
    createDecorations() {
        const decorationManager = new DecorationManager(this.scene);
        
        // 依据配置生成装饰
        decorationManager.generateRandomDecorations();
        
        // 路灯需单独检查配置
        if (DefaultSceneConfig.decorations.streetLampsEnabled) {
            decorationManager.generateStreetLamps(3);
        }

        // 创建马
        if (DefaultSceneConfig.horseEnabled) {
            new Horse(this.scene, new Vector3(5, 0, 5));
        }
    }

    createSkybox() {
        if (!DefaultSceneConfig.nightSky || !DefaultSceneConfig.nightSky.skybox) return;
        const skyConfig = DefaultSceneConfig.nightSky.skybox;

        const skyMaterial = new SkyMaterial("skyMaterial", this.scene);
        skyMaterial.backFaceCulling = false;
        
        // Night settings
        skyMaterial.inclination = skyConfig.inclination;
        skyMaterial.azimuth = skyConfig.azimuth;
        skyMaterial.luminance = skyConfig.luminance;
        skyMaterial.turbidity = skyConfig.turbidity;
        skyMaterial.rayleigh = skyConfig.rayleigh;
        
        const skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, this.scene);
        skybox.material = skyMaterial;
    }

    createAurora() {
        if (!DefaultSceneConfig.nightSky || !DefaultSceneConfig.nightSky.aurora.enabled) return;
        
        const auroraConfig = DefaultSceneConfig.nightSky.aurora;

        Effect.ShadersStore["aurora2VertexShader"] = `
            precision highp float;
            attribute vec3 position;
            attribute vec2 uv;
            uniform mat4 worldViewProjection;
            varying vec2 vUV;
            
            void main() {
                vUV = uv;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;

        Effect.ShadersStore["aurora2FragmentShader"] = `
            precision highp float;
            varying vec2 vUV;
            uniform float time;
            uniform float speed;
            uniform float intensity;

            vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, vec3(289.0)); }
            float snoise(vec2 v){
              const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
              vec2 i  = floor(v + dot(v, C.yy) );
              vec2 x0 = v -   i + dot(i, C.xx);
              vec2 i1;
              i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
              vec4 x12 = x0.xyxy + C.xxzz;
              x12.xy -= i1;
              i = mod(i, vec2(289.0));
              vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
              + i.x + vec3(0.0, i1.x, 1.0 ));
              vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
              m = m*m ;
              m = m*m ;
              vec3 x = 2.0 * fract(p * C.www) - 1.0;
              vec3 h = abs(x) - 0.5;
              vec3 ox = floor(x + 0.5);
              vec3 a0 = x - ox;
              m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
              vec3 g;
              g.x  = a0.x  * x0.x  + h.x  * x0.y;
              g.yz = a0.yz * x12.xz + h.yz * x12.yw;
              return 130.0 * dot(m, g);
            }

            float fbm(vec2 st) {
                float value = 0.0;
                float amplitude = 0.5;
                for (int i = 0; i < 4; i++) {
                    value += amplitude * snoise(st);
                    st *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }

            void main() {
                vec2 uv = vUV;
                uv *= 2.0;
                
                float t = time * speed;
                
                float distortion = fbm(uv * 0.5 + vec2(t * 0.2, t * 0.1));
                float noiseVal = fbm(vec2(uv.x * 0.5 + distortion, uv.y * 2.0 - t));
                
                float alpha = smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.5, uv.y);
                alpha *= smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);
                
                vec3 colGreen = vec3(0.0, 1.0, 0.5);
                vec3 colYellow = vec3(1.0, 0.9, 0.0);
                vec3 colOrange = vec3(1.0, 0.4, 0.0);
                
                vec3 color = mix(colGreen, colYellow, noiseVal);
                color = mix(color, colOrange, pow(noiseVal, 3.0));
                
                color *= intensity;
                float finalAlpha = alpha * (noiseVal * 0.8 + 0.2);
                
                gl_FragColor = vec4(color, finalAlpha);
            }
        `;

        const auroraMat = new ShaderMaterial("auroraMat", this.scene, {
            vertex: "aurora2",
            fragment: "aurora2",
        },
        {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection", "time", "speed", "intensity"],
            needAlphaBlending: true
        });

        auroraMat.backFaceCulling = false;
        
        const size = auroraConfig.scale || 200;
        const auroraMesh = MeshBuilder.CreateGround("auroraMesh", { width: size, height: size, subdivisions: 32 }, this.scene);
        auroraMesh.position.y = auroraConfig.height || 50;
        auroraMesh.material = auroraMat;
        
        let time = 0;
        this.scene.registerBeforeRender(() => {
            time += 0.01;
            auroraMat.setFloat("time", time);
            auroraMat.setFloat("speed", auroraConfig.speed);
            auroraMat.setFloat("intensity", auroraConfig.intensity);
        });
    }

    setupPostProcessing() {
        if (!DefaultSceneConfig.nightSky || !DefaultSceneConfig.nightSky.bloom || !DefaultSceneConfig.nightSky.bloom.enabled) return;
        
        const bloomConfig = DefaultSceneConfig.nightSky.bloom;
        
        // Check if pipeline already exists to avoid duplication
        const pipelineName = "defaultPipeline";
        let pipeline = this.scene.postProcessRenderPipelineManager.supportedPipelines.find(p => p.name === pipelineName);

        if (!pipeline) {
            pipeline = new DefaultRenderingPipeline(
                pipelineName,
                true,
                this.scene,
                this.scene.cameras
            );
        }
        
        if (this.scene.cameras.length === 0) {
             const observer = this.scene.onNewCameraAddedObservable.add((camera) => {
                 // Check if camera already has this pipeline attached
                 // But default pipeline attaches via manager.
                 // Safest way for DefaultRenderingPipeline:
                 if (pipeline.cameras.indexOf(camera) === -1) {
                     try {
                         pipeline.addCamera(camera);
                     } catch (e) {
                         // Ignore if already attached or conflicting
                         console.warn("Auto-attach pipeline failed", e);
                     }
                 }
             });
        }

        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = bloomConfig.threshold;
        pipeline.bloomWeight = bloomConfig.weight;
        pipeline.bloomKernel = bloomConfig.kernel;
        pipeline.bloomScale = bloomConfig.scale;
    }
}
