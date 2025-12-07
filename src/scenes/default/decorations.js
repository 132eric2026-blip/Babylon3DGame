import { MeshBuilder, StandardMaterial, Color3, Vector3, PhysicsAggregate, PhysicsShapeType, PointLight, ShadowGenerator, Matrix, Quaternion } from "@babylonjs/core";
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
        this.mcTrunkBase = null;
        this.mcLeavesBase = null;
    }

    /**
     * 初始化装饰所用材质
     */
    initMaterials() {
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
     * 随机生成装饰（石头、树）
     */
    generateRandomDecorations() {
        const config = DefaultSceneConfig.decorations;
        const areaSize = config.areaSize;
        const half = areaSize / 2;
        const positions = [];
        const minDist = 3;
        const shadowEnabled = !!config.treesShadowEnabled;
        const maxShadow = config.treeShadowCount || 0;

        // 1. 生成树木
        if (config.treesEnabled) {
            const treeCount = config.treeCount || 20;
            // 树干材质
            const trunkMat = new StandardMaterial("treeTrunkMat", this.scene);
            trunkMat.diffuseColor = new Color3(config.treeTrunkColor.r, config.treeTrunkColor.g, config.treeTrunkColor.b);
            trunkMat.specularColor = Color3.Black();
            trunkMat.freeze();
            
            // 树叶材质
            const leavesMat = new StandardMaterial("treeLeavesMat", this.scene);
            leavesMat.diffuseColor = new Color3(config.treeLeavesColor.r, config.treeLeavesColor.g, config.treeLeavesColor.b);
            leavesMat.specularColor = Color3.Black();
            leavesMat.freeze();

            for (let i = 0; i < treeCount; i++) {
                let tries = 0;
                while (tries < 20) {
                    const x = (Math.random() * areaSize) - half;
                    const z = (Math.random() * areaSize) - half;
                    // 避开原点
                    if (Math.abs(x) < 5 && Math.abs(z) < 5) { tries++; continue; }
                    // 距离检查
                    const ok = positions.every(p => Math.hypot(p.x - x, p.z - z) > minDist);
                    if (ok) {
                        positions.push({ x, z });
                        break;
                    }
                    tries++;
                }
            }
            this.createMinecraftTreesThinInstances(positions);
        }

        // 2. 生成石头（原有逻辑预留）
        if (config.rocksEnabled) {
            // ...
        }
    }

    /**
     * 创建简单树木（圆柱树干+球体树冠）
     */
    createSimpleTree(x, z, trunkMat, leavesMat, shadowEnabled = false, maxShadow = 0) {
        // 随机高度
        const height = 3 + Math.random() * 3; // 3~6m
        
        // 树干
        const trunk = MeshBuilder.CreateCylinder("trunk", { height: height * 0.4, diameter: 0.6 }, this.scene);
        trunk.position = new Vector3(x, height * 0.2, z);
        trunk.material = trunkMat;
        trunk.receiveShadows = true;
        if (shadowEnabled && this.scene.shadowGenerator && maxShadow > 0) {
            const list = this.scene.shadowGenerator.getShadowMap().renderList;
            if (list.length < maxShadow) {
                list.push(trunk);
            }
        }
        trunk.freezeWorldMatrix();
        
        // 物理（树干阻挡）
        if (DefaultSceneConfig.decorations.treesPhysicsEnabled) {
            new PhysicsAggregate(trunk, PhysicsShapeType.CYLINDER, { mass: 0 }, this.scene);
        }

        // 树冠（2-3个球体堆叠）
        const leavesCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < leavesCount; i++) {
            const size = 1.5 + Math.random() * 1.5;
            const leaves = MeshBuilder.CreateSphere("leaves", { diameter: size, segments: 8 }, this.scene); // Low poly look
            leaves.position = new Vector3(x, height * 0.4 + 0.8 + i * 0.8, z);
            leaves.scaling.y = 0.8; // 略扁
            leaves.material = leavesMat;
            leaves.receiveShadows = true;
            leaves.freezeWorldMatrix();
        
            // 树冠不加物理，或者只加简易包围盒
        }
    }

    /**
     * 使用薄实例创建我的世界风格树（方块树干+方块树冠）
     */
    createMinecraftTreesThinInstances(positions) {
        const cfg = DefaultSceneConfig.decorations;

        const trunkMat = new StandardMaterial("mcTrunkMat", this.scene);
        trunkMat.diffuseColor = new Color3(cfg.treeTrunkColor.r, cfg.treeTrunkColor.g, cfg.treeTrunkColor.b);
        trunkMat.specularColor = Color3.Black();
        trunkMat.freeze();

        const leavesMat = new StandardMaterial("mcLeavesMat", this.scene);
        leavesMat.diffuseColor = new Color3(cfg.treeLeavesColor.r, cfg.treeLeavesColor.g, cfg.treeLeavesColor.b);
        leavesMat.specularColor = Color3.Black();
        leavesMat.freeze();

        if (!this.mcTrunkBase) {
            this.mcTrunkBase = MeshBuilder.CreateBox("mc_trunk_base", { size: 1 }, this.scene);
            this.mcTrunkBase.material = trunkMat;
            this.mcTrunkBase.isVisible = false;
        }
        if (!this.mcLeavesBase) {
            this.mcLeavesBase = MeshBuilder.CreateBox("mc_leaves_base", { size: 1 }, this.scene);
            this.mcLeavesBase.material = leavesMat;
            this.mcLeavesBase.isVisible = false;
        }

        const trunkMatrices = [];
        const leavesMatrices = [];

        const hMin = (cfg.trunkHeightRange && cfg.trunkHeightRange.min) || 3;
        const hMax = (cfg.trunkHeightRange && cfg.trunkHeightRange.max) || 8;
        const wMin = (cfg.trunkWidthRange && cfg.trunkWidthRange.min) || 0.6;
        const wMax = (cfg.trunkWidthRange && cfg.trunkWidthRange.max) || 1.2;
        const cMin = (cfg.crownSizeRange && cfg.crownSizeRange.min) || 2.0;
        const cMax = (cfg.crownSizeRange && cfg.crownSizeRange.max) || 3.2;

        const sizeInfo = [];

        positions.forEach(({ x, z }) => {
            const h = hMin + Math.random() * (hMax - hMin);
            const w = wMin + Math.random() * (wMax - wMin);
            const trunkScale = new Vector3(w, h, w);
            const trunkPos = new Vector3(x, h * 0.5, z);
            const trunkMatrix = Matrix.Compose(trunkScale, Quaternion.Identity(), trunkPos);
            trunkMatrices.push(trunkMatrix);

            const leafSize = cMin + Math.random() * (cMax - cMin);
            const leavesScale = new Vector3(leafSize, leafSize * 0.9, leafSize);
            const leavesPos = new Vector3(x, h + (leafSize * 0.45), z);
            const leavesMatrix = Matrix.Compose(leavesScale, Quaternion.Identity(), leavesPos);
            leavesMatrices.push(leavesMatrix);
            sizeInfo.push({ h, w, leafSize });
        });

        if (trunkMatrices.length) {
            const trunkData = new Float32Array(trunkMatrices.length * 16);
            for (let i = 0; i < trunkMatrices.length; i++) {
                trunkMatrices[i].toArray(trunkData, i * 16);
            }
            this.mcTrunkBase.thinInstanceSetBuffer("matrix", trunkData, 16);
        }
        if (leavesMatrices.length) {
            const leavesData = new Float32Array(leavesMatrices.length * 16);
            for (let i = 0; i < leavesMatrices.length; i++) {
                leavesMatrices[i].toArray(leavesData, i * 16);
            }
            this.mcLeavesBase.thinInstanceSetBuffer("matrix", leavesData, 16);
        }

        if (cfg.treesShadowEnabled && this.scene.shadowGenerator) {
            const limit = cfg.treeShadowCount || 0;
            const list = this.scene.shadowGenerator.getShadowMap().renderList;
            for (let i = 0; i < Math.min(limit, positions.length); i++) {
                const p = positions[i];
                const s = sizeInfo[i] || { h: 4, w: 0.7, leafSize: 2.5 };
                const trunkProxy = MeshBuilder.CreateBox("mc_trunk_shadow", { size: 1 }, this.scene);
                trunkProxy.scaling = new Vector3(s.w, s.h, s.w);
                trunkProxy.position = new Vector3(p.x, s.h * 0.5, p.z);
                trunkProxy.material = this.mcTrunkBase.material;
                list.push(trunkProxy);

                const leafProxy = MeshBuilder.CreateBox("mc_leaves_shadow", { size: 1 }, this.scene);
                leafProxy.scaling = new Vector3(s.leafSize, s.leafSize * 0.9, s.leafSize);
                leafProxy.position = new Vector3(p.x, s.h + s.leafSize * 0.45, p.z);
                leafProxy.material = this.mcLeavesBase.material;
                list.push(leafProxy);
            }
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
