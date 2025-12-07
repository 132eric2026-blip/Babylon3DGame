import { HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, Color4, ShadowGenerator, PointLight, PBRMaterial, Texture, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";
import { Config } from "../../config";
import { MarvelSky } from "./MarvelSky";

/**
 * 漫威风格场景
 * 包含量子领域风格的天空、高科技地面和强烈的对比光照
 */
export class MarvelScene {
    /**
     * @param {Scene} scene Babylon 场景实例
     */
    constructor(scene) {
        this.scene = scene;
    }

    create() {
        this.setupEnvironment();
        this.createSky();
        this.setupLights();
        this.createGround();
    }

    setupEnvironment() {
        // 深邃的宇宙紫背景
        this.scene.clearColor = new Color4(0.05, 0.0, 0.1, 1.0);
        this.scene.ambientColor = new Color3(0.1, 0.1, 0.2);
        
        // 淡淡的蓝色雾气，增加神秘感
        this.scene.fogMode = this.scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.002;
        this.scene.fogColor = new Color3(0.1, 0.1, 0.3);
    }

    createSky() {
        this.marvelSky = new MarvelSky(this.scene);
    }

    setupLights() {
        // 半球光 - 冷色调
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
        hemiLight.diffuse = new Color3(0.2, 0.2, 0.5); // 蓝紫色
        hemiLight.groundColor = new Color3(0.1, 0.1, 0.1);
        hemiLight.intensity = 0.5;

        // 主光源 - 强烈的青色光，模拟能量核心
        const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), this.scene);
        dirLight.position = new Vector3(20, 40, 20);
        dirLight.diffuse = new Color3(0.0, 0.8, 1.0); // 青色
        dirLight.specular = new Color3(1.0, 1.0, 1.0);
        dirLight.intensity = 0.8;

        // 辅助点光源 - 橙色，形成冷暖对比（像钢铁侠的配色）
        const pointLight = new PointLight("pointLight", new Vector3(0, 10, 0), this.scene);
        pointLight.diffuse = new Color3(1.0, 0.5, 0.0);
        pointLight.intensity = 0.5;

        // 阴影配置
        if (Config.scene.shadows && Config.scene.shadows.enabled) {
            const shadowGenerator = new ShadowGenerator(2048, dirLight);
            shadowGenerator.useBlurExponentialShadowMap = true;
            shadowGenerator.blurKernel = 16;
            shadowGenerator.setDarkness(0.4);
            this.scene.shadowGenerator = shadowGenerator;
        }
    }

    createGround() {
        // 创建一个高科技感的地面
        const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200, subdivisions: 100 }, this.scene);
        
        // 使用普通材质，无高光
        const groundMat = new StandardMaterial("groundMat", this.scene);
        groundMat.diffuseColor = new Color3(0.05, 0.05, 0.1);
        groundMat.specularColor = new Color3(0, 0, 0); // 去掉高光
        
        ground.receiveShadows = true;
        ground.material = groundMat;

        // 添加物理
        const groundAggregate = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, restitution: 0.5 }, this.scene);
    }
}
