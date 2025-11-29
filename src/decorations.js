import { MeshBuilder, StandardMaterial, Color3, Vector3, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";
import { Config } from "./config";

export class DecorationManager {
    constructor(scene) {
        this.scene = scene;
        this.materials = {};
        this.initMaterials();
    }

    initMaterials() {
        // 石头材质
        const stoneMat = new StandardMaterial("stoneMat", this.scene);
        stoneMat.diffuseColor = new Color3(
            Config.scene.decorations.stoneColor.r,
            Config.scene.decorations.stoneColor.g,
            Config.scene.decorations.stoneColor.b
        );
        stoneMat.specularColor = new Color3(0, 0, 0);
        this.materials.stone = stoneMat;

        // 树干材质
        const trunkMat = new StandardMaterial("trunkMat", this.scene);
        trunkMat.diffuseColor = new Color3(
            Config.scene.decorations.treeTrunkColor.r,
            Config.scene.decorations.treeTrunkColor.g,
            Config.scene.decorations.treeTrunkColor.b
        );
        trunkMat.specularColor = new Color3(0, 0, 0);
        this.materials.trunk = trunkMat;

        // 树叶材质
        const leavesMat = new StandardMaterial("leavesMat", this.scene);
        leavesMat.diffuseColor = new Color3(
            Config.scene.decorations.treeLeavesColor.r,
            Config.scene.decorations.treeLeavesColor.g,
            Config.scene.decorations.treeLeavesColor.b
        );
        leavesMat.specularColor = new Color3(0, 0, 0);
        this.materials.leaves = leavesMat;
    }

    generateRandomDecorations() {
        const count = Config.scene.decorations.count;
        const areaSize = Config.scene.decorations.areaSize;
        const halfSize = areaSize / 2;

        for (let i = 0; i < count; i++) {
            const x = (Math.random() * areaSize) - halfSize;
            const z = (Math.random() * areaSize) - halfSize;
            
            // 避免在出生点附近生成
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;

            const type = Math.random();
            if (type < 0.6) {
                this.createStone(x, z);
            } else {
                this.createTree(x, z);
            }
        }
    }

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

    createTree(x, z) {
        // 树干
        const trunkHeight = 1.5 + Math.random();
        const trunkWidth = 0.4;
        const trunk = MeshBuilder.CreateBox("trunk", { width: trunkWidth, depth: trunkWidth, height: trunkHeight }, this.scene);
        trunk.position = new Vector3(x, trunkHeight / 2, z);
        trunk.material = this.materials.trunk;

        // 树叶 (几个方块堆叠)
        const leavesSize = 1.2 + Math.random() * 0.5;
        const leaves = MeshBuilder.CreateBox("leaves", { size: leavesSize }, this.scene);
        leaves.position = new Vector3(x, trunkHeight + leavesSize / 2 - 0.2, z);
        leaves.material = this.materials.leaves;

        // 物理 (只给树干加碰撞即可，或者给整体加)
        new PhysicsAggregate(trunk, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        // 树叶通常不阻挡玩家移动，或者也加个物理
        new PhysicsAggregate(leaves, PhysicsShapeType.BOX, { mass: 0 }, this.scene);

        // 阴影
        if (this.scene.shadowGenerator) {
            this.scene.shadowGenerator.addShadowCaster(trunk);
            this.scene.shadowGenerator.addShadowCaster(leaves);
            trunk.receiveShadows = true;
            leaves.receiveShadows = true;
        }
    }
}
