import { HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, ShadowGenerator, PhysicsAggregate, PhysicsShapeType, Color4 } from "@babylonjs/core";
import { Config } from "../../config";
import { DefaultSceneConfig } from "./config";
import { DecorationManager } from "./decorations";
import { Horse } from "./horse";
import { HellfireSky } from "./HellFireSky";

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
        this.createHellfireSky();
        this.setupLights();
        this.createGround();
        this.createDecorations();
    }

    /**
     * 创建地狱火半岛风格天空
     */
    createHellfireSky() {
        this.hellfireSky = new HellfireSky(this.scene);
    }

    /**
     * 环境设置：天空色、环境光、雾效
     */
    setupEnvironment() {
        // 背景色 - 地狱火风格暗色调
        this.scene.clearColor = new Color4(0.1, 0.02, 0.08, 1.0);

        // 环境光颜色 - 紫红色调
        this.scene.ambientColor = new Color3(0.2, 0.1, 0.15);

        // 雾效 - 地狱火风格暗红色雾
        this.scene.fogMode = this.scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.001;
        this.scene.fogColor = new Color3(0.3, 0.15, 0.1);
    }

    /**
     * 光照设置：半球光与方向光以及阴影
     */
    setupLights() {
        // 半球光 - 地狱火风格暖黄色
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
        hemiLight.diffuse = new Color3(0.9, 0.7, 0.4);      // 暖黄色
        hemiLight.groundColor = new Color3(0.3, 0.1, 0.15); // 紫红色地面反光
        hemiLight.intensity = 0.6;

        // 方向光 - 模拟能量流方向光
        const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -0.5, 0.5), this.scene);
        dirLight.position = new Vector3(20, 40, 20);
        dirLight.diffuse = new Color3(1.0, 0.9, 0.5);  // 黄色能量光
        dirLight.specular = new Color3(0, 0, 0);
        dirLight.intensity = 0.4;

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
