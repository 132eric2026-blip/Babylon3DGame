import { MeshBuilder, StandardMaterial, Color3, Vector3, PhysicsAggregate, PhysicsShapeType, PointLight, ShadowGenerator } from "@babylonjs/core";
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

        const sakuraLeaves = new StandardMaterial("sakuraLeaves", this.scene);
        sakuraLeaves.diffuseColor = new Color3(1.0, 0.75, 0.9);
        sakuraLeaves.specularColor = new Color3(0, 0, 0);
        this.materials.sakuraLeaves = sakuraLeaves;

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
        const trunkHeight = 1.5 + Math.random();
        const variant = Math.floor(Math.random() * 7);
        let trunk;
        let leafParts = [];

        if (variant === 0) {
            const trunkWidth = 0.4;
            trunk = MeshBuilder.CreateBox("trunk", { width: trunkWidth, depth: trunkWidth, height: trunkHeight }, this.scene);
            trunk.position = new Vector3(x, trunkHeight / 2, z);
            const leavesSize = 1.2 + Math.random() * 0.5;
            const leaves = MeshBuilder.CreateBox("leaves", { size: leavesSize }, this.scene);
            leaves.position = new Vector3(x, trunkHeight + leavesSize / 2 - 0.2, z);
            leafParts.push(leaves);
        } else if (variant === 1) {
            trunk = MeshBuilder.CreateCylinder("trunk", { diameter: 0.35, height: trunkHeight }, this.scene);
            trunk.position = new Vector3(x, trunkHeight / 2, z);
            const r = 0.8 + Math.random() * 0.6;
            const leaves = MeshBuilder.CreateSphere("leaves", { diameter: r * 2, segments: 16 }, this.scene);
            leaves.position = new Vector3(x, trunkHeight + r * 0.7, z);
            leafParts.push(leaves);
        } else if (variant === 2) {
            trunk = MeshBuilder.CreateCylinder("trunk", { diameter: 0.35, height: trunkHeight }, this.scene);
            trunk.position = new Vector3(x, trunkHeight / 2, z);
            const cone1 = MeshBuilder.CreateCylinder("leavesTop", { diameterTop: 0, diameterBottom: 1.2, height: 1.0, tessellation: 16 }, this.scene);
            const cone2 = MeshBuilder.CreateCylinder("leavesMid", { diameterTop: 0, diameterBottom: 1.6, height: 1.0, tessellation: 16 }, this.scene);
            const cone3 = MeshBuilder.CreateCylinder("leavesLow", { diameterTop: 0, diameterBottom: 2.0, height: 1.0, tessellation: 16 }, this.scene);
            cone1.position = new Vector3(x, trunkHeight + 1.2, z);
            cone2.position = new Vector3(x, trunkHeight + 0.6, z);
            cone3.position = new Vector3(x, trunkHeight, z);
            leafParts.push(cone1, cone2, cone3);
        } else {
            trunk = MeshBuilder.CreateCylinder("trunk", { diameter: 0.35, height: trunkHeight }, this.scene);
            trunk.position = new Vector3(x, trunkHeight / 2, z);
            const dome = MeshBuilder.CreateSphere("leaves", { diameter: 1.8, segments: 14 }, this.scene);
            dome.scaling.y = 0.6;
            dome.position = new Vector3(x, trunkHeight + 0.6, z);
            leafParts.push(dome);
        }

        if (variant === 4) {
            trunk = MeshBuilder.CreateCylinder("trunk", { diameter: 0.35, height: trunkHeight }, this.scene);
            trunk.position = new Vector3(x, trunkHeight / 2, z);
            const crown = MeshBuilder.CreateSphere("leaves", { diameter: 1.6, segments: 12 }, this.scene);
            crown.scaling.y = 0.9;
            crown.position = new Vector3(x, trunkHeight + 0.8, z);
            leafParts.push(crown);
            const strands = 8;
            for (let i = 0; i < strands; i++) {
                const angle = (i / strands) * Math.PI * 2;
                const sx = x + Math.cos(angle) * 0.6;
                const sz = z + Math.sin(angle) * 0.6;
                const s = MeshBuilder.CreateCylinder("leafStrand", { diameter: 0.08, height: 1.2 }, this.scene);
                s.position = new Vector3(sx, trunkHeight + 0.2, sz);
                leafParts.push(s);
            }
        }

        if (variant === 5) {
            trunk = MeshBuilder.CreateCylinder("trunk", { diameter: 0.35, height: trunkHeight }, this.scene);
            trunk.position = new Vector3(x, trunkHeight / 2, z);
            const clusters = 5;
            for (let i = 0; i < clusters; i++) {
                const r = 0.7 + Math.random() * 0.5;
                const dx = (Math.random() - 0.5) * 1.0;
                const dz = (Math.random() - 0.5) * 1.0;
                const dy = trunkHeight + 0.6 + (Math.random() - 0.5) * 0.6;
                const b = MeshBuilder.CreateSphere("sakuraCluster", { diameter: r * 2, segments: 12 }, this.scene);
                b.position = new Vector3(x + dx, dy, z + dz);
                leafParts.push(b);
            }
        }

        if (variant === 6) {
            trunk = MeshBuilder.CreateCylinder("cactusBase", { diameter: 0.5, height: trunkHeight }, this.scene);
            trunk.position = new Vector3(x, trunkHeight / 2, z);
            const armL = MeshBuilder.CreateCylinder("cactusArmL", { diameter: 0.35, height: 1.2 }, this.scene);
            armL.position = new Vector3(x - 0.6, trunkHeight * 0.6, z);
            const armR = MeshBuilder.CreateCylinder("cactusArmR", { diameter: 0.35, height: 1.2 }, this.scene);
            armR.position = new Vector3(x + 0.6, trunkHeight * 0.7, z);
            leafParts.push(armL, armR);
        }

        trunk.material = this.materials.trunk;
        if (variant === 5) {
            leafParts.forEach(p => (p.material = this.materials.sakuraLeaves));
        } else {
            leafParts.forEach(p => (p.material = this.materials.leaves));
        }

        new PhysicsAggregate(trunk, PhysicsShapeType.CYLINDER, { mass: 0 }, this.scene);
        leafParts.forEach(p => new PhysicsAggregate(p, PhysicsShapeType.BOX, { mass: 0 }, this.scene));

        if (this.scene.shadowGenerator) {
            this.scene.shadowGenerator.addShadowCaster(trunk);
            trunk.receiveShadows = true;
            leafParts.forEach(p => {
                this.scene.shadowGenerator.addShadowCaster(p);
                p.receiveShadows = true;
            });
        }
    }

    // --- 我的世界风格路灯 ---
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

        // 路灯不产生阴影，保留照明与Bloom即可

        const ground = this.scene.getMeshByName("ground");
        if (ground) ground.receiveShadows = true;

        // 物理（可选，仅底座）
        new PhysicsAggregate(base, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        new PhysicsAggregate(pole, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        new PhysicsAggregate(head, PhysicsShapeType.BOX, { mass: 0 }, this.scene);

        return { base, pole, head, light };
    }

    generateStreetLamps(count = 6) {
        const areaSize = Config.scene.decorations.areaSize;
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
