import { HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, ShadowGenerator, PhysicsAggregate, PhysicsShapeType, Color4, ShaderMaterial, Effect, Engine } from "@babylonjs/core";
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
        this.setupLights();
        this.createNightSky();
        this.createGround();
        this.createDecorations();
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

    createNightSky() {
        Effect.ShadersStore["nightSkyVertexShader"] = `
            precision highp float;
            attribute vec3 position;
            uniform mat4 worldViewProjection;
            varying vec3 vPos;
            void main() {
                vPos = position;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;
        Effect.ShadersStore["nightSkyFragmentShader"] = `
            precision highp float;
            varying vec3 vPos;
            uniform float time;
            float hash(vec3 p){
                p = fract(p*0.3183099 + vec3(0.1,0.2,0.3));
                p *= 17.0;
                return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
            }
            float noise(vec3 p){
                vec3 i = floor(p);
                vec3 f = fract(p);
                f = f*f*(3.0-2.0*f);
                float n = mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                                  mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                               mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                                   mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
                return n;
            }
            float fbm(vec3 p){
                float a = 0.0;
                float w = 0.5;
                for(int i=0;i<5;i++){
                    a += w*noise(p);
                    p *= 2.0;
                    w *= 0.5;
                }
                return a;
            }
            void main(){
                vec3 dir = normalize(vPos);
                float alt = clamp(dir.y*0.5 + 0.5, 0.0, 1.0);
                vec3 base = mix(vec3(0.02,0.02,0.06), vec3(0.02,0.0,0.08), alt);
                vec3 dusk1 = vec3(0.75,0.22,0.10);
                vec3 dusk2 = vec3(0.40,0.06,0.26);
                float h = smoothstep(0.0,0.35, 1.0-alt);
                vec3 horizon = mix(dusk2, dusk1, 0.6);
                vec3 col = base + horizon*h*0.8;
                float stars = smoothstep(0.995,1.0, noise(dir*80.0+time*0.05));
                float twinkle = 0.6 + 0.4*sin(time*2.5 + noise(dir*10.0)*6.2831);
                vec3 starCol = vec3(1.0,0.95,0.9) * stars * twinkle;
                float band = 1.0 - abs(dot(dir, normalize(vec3(0.0,0.3,1.0))));
                float mw = smoothstep(0.65,0.85, band);
                vec3 neb = vec3(0.05,0.08,0.12) * fbm(dir*6.0 + vec3(0.0,time*0.02,0.0));
                col += neb + vec3(0.2,0.22,0.35)*mw*0.6;
                float u = dot(normalize(vec2(dir.x, dir.z)), vec2(1.0,0.0));
                float warp = fbm(dir*8.0 + vec3(0.0,time*0.1,0.0));
                float wave = sin(u*12.0 + warp*4.0 + time*0.7);
                float stripe = smoothstep(0.70,0.98, 1.0-abs(wave));
                float spread = smoothstep(0.15,0.65, alt) * (1.0 - smoothstep(0.75,0.95, alt));
                float aur = stripe * spread;
                vec3 aurCol = mix(vec3(0.55,0.85,0.20), vec3(0.95,0.95,0.35), 0.5 + 0.5*sin(time*0.5));
                col += aurCol * aur * 1.2;
                float u2 = dot(normalize(vec2(dir.x, dir.z)), vec2(0.6,0.8));
                float warp2 = fbm(dir*10.0 + vec3(0.0,time*0.06,0.0));
                float wave2 = sin(u2*10.0 + warp2*5.0 + time*0.9);
                float stripe2 = smoothstep(0.65,0.95, 1.0-abs(wave2));
                float spread2 = smoothstep(0.20,0.70, alt) * (1.0 - smoothstep(0.60,0.90, alt));
                float aur2 = stripe2 * spread2;
                vec3 aurCol2 = vec3(0.35,0.85,0.65);
                col += aurCol2 * aur2 * 0.9;
                col += starCol;
                gl_FragColor = vec4(col,1.0);
            }
        `;
        const mat = new ShaderMaterial("nightSkyMat", this.scene, { vertex: "nightSky", fragment: "nightSky" }, {
            attributes: ["position"],
            uniforms: ["worldViewProjection", "time"]
        });
        mat.backFaceCulling = false;
        mat.disableLighting = true;
        const sky = MeshBuilder.CreateSphere("nightSky", { diameter: 1000, segments: 64 }, this.scene);
        sky.material = mat;
        sky.infiniteDistance = true;
        this._skyTime = 0;
        this.scene.onBeforeRenderObservable.add(() => {
            this._skyTime += this.scene.getEngine().getDeltaTime() * 0.001;
            mat.setFloat("time", this._skyTime);
        });
        const moon = MeshBuilder.CreateSphere("moon", { diameter: 12, segments: 32 }, this.scene);
        moon.position = new Vector3(-80, 85, 60);
        const moonMat = new StandardMaterial("moonMat", this.scene);
        moonMat.emissiveColor = new Color3(1.2,1.2,1.1);
        moonMat.disableLighting = true;
        moon.material = moonMat;
        const halo = MeshBuilder.CreatePlane("moonHalo", { size: 40 }, this.scene);
        halo.position = moon.position.clone();
        halo.billboardMode = 7;
        const haloMat = new StandardMaterial("moonHaloMat", this.scene);
        haloMat.emissiveColor = new Color3(0.35,0.35,0.5);
        haloMat.alpha = 0.35;
        halo.material = haloMat;
        halo.alphaMode = Engine.ALPHA_ADD;
    }

    /**
     * 光照设置：半球光与方向光以及阴影
     */
    setupLights() {
        // 半球光（天空光）
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
        hemiLight.diffuse = new Color3(0.12, 0.12, 0.28);
        hemiLight.groundColor = new Color3(0.06, 0.06, 0.12);
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
        dirLight.diffuse = new Color3(0.6, 0.7, 1.0);
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
}
