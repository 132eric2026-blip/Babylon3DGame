/**
 * 纳格兰场景主文件
 * 魔兽世界燃烧的远征 - 纳格兰风格
 * 特点：紫粉色天空、翠绿草原、金合欢树、岩石地貌
 */
import {
    MeshBuilder,
    StandardMaterial,
    Color3,
    Color4,
    Vector3,
    DirectionalLight,
    HemisphericLight,
    ShadowGenerator,
    PhysicsAggregate,
    PhysicsShapeType
} from "@babylonjs/core";
import { NagrandConfig } from "./config";
import { NagrandSky } from "./NagrandSky";
import { NagrandDecorations } from "./decorations";

export class NagrandScene {
    constructor(scene) {
        this.scene = scene;
        this.sky = null;
        this.decorations = null;
        this.ground = null;
        this.lights = {};
    }

    /**
     * 创建完整场景
     */
    create() {
        this._setupSceneSettings();
        this._createLighting();
        this._createGround();
        this._createSky();
        this._createDecorations();
        this._setupFog();
    }

    /**
     * 配置场景基础设置
     */
    _setupSceneSettings() {
        // 场景背景色 - 与天空天顶色接近
        const zenith = NagrandConfig.sky.colors.zenith;
        this.scene.clearColor = new Color4(zenith.r, zenith.g, zenith.b, 1.0);
        
        // 环境色
        const ambient = NagrandConfig.sky.colors.ambient;
        this.scene.ambientColor = new Color3(ambient.r, ambient.g, ambient.b);
    }

    /**
     * 创建光照系统
     */
    _createLighting() {
        const lightConfig = NagrandConfig.lighting;
        
        // 主方向光 - 模拟太阳
        const dirLight = new DirectionalLight(
            "nagrandSunLight",
            new Vector3(
                lightConfig.directional.direction.x,
                lightConfig.directional.direction.y,
                lightConfig.directional.direction.z
            ),
            this.scene
        );
        dirLight.intensity = lightConfig.directional.intensity;
        dirLight.diffuse = new Color3(
            lightConfig.directional.color.r,
            lightConfig.directional.color.g,
            lightConfig.directional.color.b
        );
        dirLight.specular = new Color3(0.8, 0.75, 0.85);
        this.lights.directional = dirLight;
        
        // 半球光 - 环境照明
        const hemiLight = new HemisphericLight(
            "nagrandHemiLight",
            new Vector3(0, 1, 0),
            this.scene
        );
        hemiLight.intensity = lightConfig.hemispheric.intensity;
        hemiLight.diffuse = new Color3(
            lightConfig.ambient.color.r,
            lightConfig.ambient.color.g,
            lightConfig.ambient.color.b
        );
        hemiLight.groundColor = new Color3(
            lightConfig.hemispheric.groundColor.r,
            lightConfig.hemispheric.groundColor.g,
            lightConfig.hemispheric.groundColor.b
        );
        this.lights.hemispheric = hemiLight;
        
        // 创建阴影生成器
        const shadowGenerator = new ShadowGenerator(2048, dirLight);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;
        shadowGenerator.darkness = 0.4;
        
        // 保存到场景供其他组件使用
        this.scene.shadowGenerator = shadowGenerator;
    }

    /**
     * 创建地形
     */
    _createGround() {
        const terrainConfig = NagrandConfig.terrain;
        
        // 创建地面
        this.ground = MeshBuilder.CreateGround("nagrandGround", {
            width: terrainConfig.size,
            height: terrainConfig.size,
            subdivisions: terrainConfig.subdivisions
        }, this.scene);
        
        // 地面材质 - 翠绿草地
        const groundMat = new StandardMaterial("nagrandGroundMat", this.scene);
        
        // 混合草地颜色
        const primary = terrainConfig.groundColor.primary;
        groundMat.diffuseColor = new Color3(primary.r, primary.g, primary.b);
        groundMat.specularColor = new Color3(0.05, 0.1, 0.05);
        groundMat.specularPower = 8;
        
        this.ground.material = groundMat;
        this.ground.receiveShadows = true;
        
        // 添加物理
        new PhysicsAggregate(this.ground, PhysicsShapeType.BOX, {
            mass: 0,
            friction: 0.8,
            restitution: 0.1
        }, this.scene);
    }

    /**
     * 创建天空
     */
    _createSky() {
        this.sky = new NagrandSky(this.scene);
        this.sky.create();
    }

    /**
     * 创建装饰物
     */
    _createDecorations() {
        this.decorations = new NagrandDecorations(this.scene);
        this.decorations.create();
        
        // 将树木添加到阴影生成器
        if (this.scene.shadowGenerator && this.decorations.trees) {
            this.decorations.trees.forEach(tree => {
                const meshes = tree.getChildMeshes();
                meshes.forEach(mesh => {
                    this.scene.shadowGenerator.addShadowCaster(mesh);
                    mesh.receiveShadows = true;
                });
            });
        }
    }

    /**
     * 设置雾效
     */
    _setupFog() {
        const fogConfig = NagrandConfig.fog;
        
        if (!fogConfig.enabled) return;
        
        this.scene.fogMode = this.scene.constructor.FOGMODE_EXP;
        this.scene.fogDensity = fogConfig.density;
        this.scene.fogColor = new Color3(
            fogConfig.color.r,
            fogConfig.color.g,
            fogConfig.color.b
        );
    }

    /**
     * 获取出生点位置
     */
    getSpawnPoint() {
        return new Vector3(0, 5, 0);
    }

    /**
     * 销毁场景
     */
    dispose() {
        if (this.sky) {
            this.sky.dispose();
        }
        if (this.decorations) {
            this.decorations.dispose();
        }
        if (this.ground) {
            this.ground.dispose();
        }
        
        Object.values(this.lights).forEach(light => light.dispose());
    }
}
