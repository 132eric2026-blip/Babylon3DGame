import { HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, ShadowGenerator, PhysicsAggregate, PhysicsShapeType, Color4 } from "@babylonjs/core";
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
        this.createGround();
        this.createDecorations();
    }

    /**
     * 环境设置：天空色、环境光、雾效
     */
    setupEnvironment() {
        // 接近地球的环境
        this.scene.clearColor = new Color4(0.5, 0.8, 1.0, 1.0); // 天空蓝
        this.scene.ambientColor = new Color3(0.3, 0.3, 0.3);
        // 雾效
        this.scene.fogMode = this.scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.002; // 比太空场景更轻的雾
        this.scene.fogColor = new Color3(0.5, 0.8, 1.0);
    }

    /**
     * 光照设置：半球光与方向光以及阴影
     */
    setupLights() {
        // 半球光（天空光）
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
        hemiLight.diffuse = new Color3(0.8, 0.8, 0.9); // 略带蓝色
        hemiLight.groundColor = new Color3(0.4, 0.4, 0.4);
        hemiLight.intensity = 0.6;

        // 方向光（太阳）
        const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), this.scene);
        dirLight.position = new Vector3(20, 40, 20);
        dirLight.diffuse = new Color3(1.0, 0.9, 0.8); // 温暖的太阳色
        dirLight.specular = new Color3(1.0, 1.0, 1.0);
        dirLight.intensity = 0.8;

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
     * 创建地面并启用物理与坐标轴（可选）
     */
    createGround() {
        // 标准地面
        const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200, subdivisions: 2 }, this.scene);
        
        const groundMat = new StandardMaterial("groundMat", this.scene);
        groundMat.diffuseColor = new Color3(
            DefaultSceneConfig.groundColor.r,
            DefaultSceneConfig.groundColor.g,
            DefaultSceneConfig.groundColor.b
        ); // 灰色地面
        groundMat.specularColor = new Color3(0.1, 0.1, 0.1); // 低高光
        
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
        
        // 默认场景的标准装饰：随机树木与石头、路灯
        // 为便于生成，临时调整配置后再恢复
        
        const originalRocks = DefaultSceneConfig.decorations.rocksEnabled;
        const originalTrees = DefaultSceneConfig.decorations.treesEnabled;
        const originalLamps = DefaultSceneConfig.decorations.streetLampsEnabled;
        
        // Enable for generation
        DefaultSceneConfig.decorations.rocksEnabled = true;
        DefaultSceneConfig.decorations.treesEnabled = true;
        DefaultSceneConfig.decorations.streetLampsEnabled = true;
        
        decorationManager.generateRandomDecorations();
        decorationManager.generateStreetLamps(3);
        
        // 恢复配置（以便后续动态切换场景时保持一致）
        DefaultSceneConfig.decorations.rocksEnabled = originalRocks;
        DefaultSceneConfig.decorations.treesEnabled = originalTrees;
        DefaultSceneConfig.decorations.streetLampsEnabled = originalLamps;

        // 创建马（默认场景始终生成）
        new Horse(this.scene, new Vector3(5, 0, 5));
    }
}
