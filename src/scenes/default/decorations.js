import { MeshBuilder, StandardMaterial, Color3, Vector3, PhysicsAggregate, PhysicsShapeType, PointLight, ShadowGenerator } from "@babylonjs/core";
import { DefaultSceneConfig } from "./config";

/**
 * 默认场景装饰管理器
 * 负责生成石头、树、路灯等装饰物，并应用材质、物理与阴影
 */
export class DecorationManager {
    /**
     * 构造装饰管理器
     * @param {Scene} scene 场景实例
     */
    constructor(scene) {
        this.scene = scene;
        this.materials = {};
        this.initMaterials();
    }

    /**
     * 初始化装饰所用材质
     */
    initMaterials() {
        // 石头材质
        const stoneMat = new StandardMaterial("stoneMat", this.scene);
        stoneMat.diffuseColor = new Color3(
            DefaultSceneConfig.decorations.stoneColor.r,
            DefaultSceneConfig.decorations.stoneColor.g,
            DefaultSceneConfig.decorations.stoneColor.b
        );
        stoneMat.specularColor = new Color3(0, 0, 0);
        this.materials.stone = stoneMat;

        // 路灯材质 - 木杆
        const lampWood = new StandardMaterial("lampWood", this.scene);
        lampWood.diffuseColor = new Color3(0.35, 0.22, 0.12);
        lampWood.specularColor = new Color3(0, 0, 0);
        this.materials.lampWood = lampWood;

        // 路灯材质 - 灯罩（黄色泛光）
        const lampGlass = new StandardMaterial("lampGlass", this.scene);
        lampGlass.diffuseColor = new Color3(0, 0, 0);
        lampGlass.specularColor = new Color3(0, 0, 0);
        lampGlass.emissiveColor = new Color3(3.0, 2.4, 0.7);
        lampGlass.disableLighting = true;
        this.materials.lampGlass = lampGlass;
    }

    /**
     * 随机生成装饰（石头）
     */
    generateRandomDecorations() {
        const count = DefaultSceneConfig.decorations.count;
        const areaSize = DefaultSceneConfig.decorations.areaSize;
        const halfSize = areaSize / 2;
        const rocksEnabled = DefaultSceneConfig.decorations.rocksEnabled;

        if (!rocksEnabled) return;

        for (let i = 0; i < count; i++) {
            const x = (Math.random() * areaSize) - halfSize;
            const z = (Math.random() * areaSize) - halfSize;
            
            // 避免在出生点附近生成
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;

            this.createStone(x, z);
        }
    }

    /**
     * 创建石头
     * @param {number} x X 坐标
     * @param {number} z Z 坐标
     */
    createStone(x, z) {
        const scale = 0.5 + Math.random() * 1.5; // 随机大小
        const stone = MeshBuilder.CreateBox("stone", { size: 1 }, this.scene);
        stone.scaling = new Vector3(scale, scale * 0.6, scale); // 稍微压扁一点
        stone.position = new Vector3(x, (scale * 0.6) / 2, z);
        stone.material = this.materials.stone;
        
        // 随机旋转
        stone.rotation.y = Math.random() * Math.PI * 2;

        // 物理
        new PhysicsAggregate(stone, PhysicsShapeType.BOX, { mass: 0, restitution: 0.1 }, this.scene);
        
        // 阴影
        if (this.scene.shadowGenerator) {
            this.scene.shadowGenerator.addShadowCaster(stone);
            stone.receiveShadows = true;
        }
    }

    // --- 我的世界风格路灯 ---
    /**
     * 创建路灯
     * @param {number} x X 坐标
     * @param {number} z Z 坐标
     * @returns {{base:any,pole:any,head:any,light:any}} 路灯组件
     */
    createStreetLamp(x, z) {
        const base = MeshBuilder.CreateBox("lampBase", { width: 0.8, depth: 0.8, height: 0.2 }, this.scene);
        base.position = new Vector3(x, 0.1, z);
        base.material = this.materials.lampWood;

        const pole = MeshBuilder.CreateBox("lampPole", { width: 0.2, depth: 0.2, height: 2.0 }, this.scene);
        pole.parent = base;
        pole.position.y = 0.2 + 1.0; // base 高0.2 + 半高1.0
        pole.material = this.materials.lampWood;

        const head = MeshBuilder.CreateBox("lampHead", { width: 0.6, depth: 0.6, height: 0.6 }, this.scene);
        head.parent = pole;
        head.position.y = 1.0 + 0.3; // 杆顶再抬0.3
        head.material = this.materials.lampGlass;

        // 点光源（黄色）
        const light = new PointLight("lampLight", Vector3.Zero(), this.scene);
        light.parent = head;
        light.intensity = 1.6; // 轻微泛光 + 足够照明
        light.diffuse = new Color3(1.0, 0.85, 0.2);
        light.range = 18;

        // 路灯不产生阴影，保留照明与 Bloom 即可

        const ground = this.scene.getMeshByName("ground");
        if (ground) ground.receiveShadows = true;

        // 物理（可选，仅底座）
        new PhysicsAggregate(base, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        new PhysicsAggregate(pole, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        new PhysicsAggregate(head, PhysicsShapeType.BOX, { mass: 0 }, this.scene);

        return { base, pole, head, light };
    }

    /**
     * 批量生成路灯，避免位置重叠
     * @param {number} count 数量
     */
    generateStreetLamps(count = 6) {
        const areaSize = DefaultSceneConfig.decorations.areaSize;
        const half = areaSize / 2;
        const positions = [];
        const minDist = 6;
        for (let i = 0; i < count; i++) {
            let tries = 0;
            while (tries < 50) {
                const x = (Math.random() * areaSize) - half;
                const z = (Math.random() * areaSize) - half;
                if (Math.abs(x) < 5 && Math.abs(z) < 5) { tries++; continue; }
                // 距离去重，避免重叠
                const ok = positions.every(p => Math.hypot(p.x - x, p.z - z) > minDist);
                if (ok) {
                    positions.push({ x, z });
                    this.createStreetLamp(x, z);
                    break;
                }
                tries++;
            }
        }
    }
}
