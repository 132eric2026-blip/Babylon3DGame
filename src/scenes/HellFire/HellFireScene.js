import { HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, ShadowGenerator, PhysicsAggregate, PhysicsShapeType, Color4, NoiseProceduralTexture } from "@babylonjs/core";
import { Config } from "../../config";
import { DefaultSceneConfig } from "./config";
import { DecorationManager } from "./decorations";
import { Horse } from "./horse";
import { HellfireSky } from "./HellFireSky";

/**
 * 默认场景
 * 负责搭建地面、光照、环境与装饰，并生成可交互对象（如马）
 */
export class HellFireScene {
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
            // 强制使用高分辨率 Shadow Map
            const shadowGenerator = new ShadowGenerator(4096, dirLight);

            // 启用模糊指数阴影贴图 (Blur Exponential Shadow Map) 以彻底消除锯齿
            shadowGenerator.useBlurExponentialShadowMap = true;
            shadowGenerator.blurKernel = 32; // 高模糊内核，使边缘非常柔和
            shadowGenerator.depthScale = 60.0; // 调整深度比例以减少伪影

            // 也可以尝试 Close ESM，但在大场景下 Blur ESM 效果最平滑
            // shadowGenerator.useBlurCloseExponentialShadowMap = true;

            shadowGenerator.setDarkness(0.5);
            
            // 调整 Bias 防止波纹
            shadowGenerator.bias = 0.00005;
            shadowGenerator.normalBias = 0.01;

            this.scene.shadowGenerator = shadowGenerator;
        }
    }

    /**
     * 创建地面并启用物理与坐标轴（可选）
     */
    createGround() {
        // 地狱火半岛风格地面 - 增加细分以配合光照
        const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200, subdivisions: 32 }, this.scene);
        
        const groundMat = new StandardMaterial("groundMat", this.scene);
        
        // 地狱火半岛：静谧红土荒原
        // 1. 漫反射：经典的红褐色干燥土壤
        groundMat.diffuseColor = new Color3(0.4, 0.15, 0.1); 
        
        // 2. 高光：几乎没有光泽，模拟干燥的尘土
        groundMat.specularColor = new Color3(0.1, 0.1, 0.1);
        groundMat.specularPower = 64;

        // 3. 移除自发光与动态效果，回归纯粹的物理质感
        groundMat.emissiveColor = new Color3(0, 0, 0);
        groundMat.emissiveTexture = null;

        // 4. 表面纹理 (Bump)
        // 使用多层噪点叠加模拟自然的地面起伏与龟裂
        const soilNoise = new NoiseProceduralTexture("soilNoise", 1024, this.scene);
        soilNoise.animationSpeedFactor = 0; // 静态
        soilNoise.octaves = 6; // 丰富的细节
        soilNoise.persistence = 0.8; // 较高的粗糙度
        soilNoise.brightness = 0.5;
        
        // 开启各向异性过滤保证远处清晰
        if (this.scene.getEngine().getCaps().maxAnisotropy > 1) {
             soilNoise.anisotropicFilteringLevel = 4;
        }

        groundMat.bumpTexture = soilNoise;
        groundMat.bumpTexture.level = 0.5; // 适中的凹凸感

        ground.material = groundMat;
        ground.receiveShadows = true;

        // 物理
        new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.6, restitution: 0.1 }, this.scene);

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
