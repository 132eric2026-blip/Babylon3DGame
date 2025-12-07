/**
 * 纳格兰场景装饰物
 * 包含：金合欢风格树木、岩石、草丛
 */
import {
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    Mesh,
    VertexData,
    PhysicsAggregate,
    PhysicsShapeType
} from "@babylonjs/core";
import { NagrandConfig } from "./config";

export class NagrandDecorations {
    constructor(scene) {
        this.scene = scene;
        this.trees = [];
        this.rocks = [];
        this.grassPatches = [];
    }

    /**
     * 创建所有装饰物
     */
    create() {
        this._createTrees();
        this._createRocks();
        if (NagrandConfig.decorations.grass.enabled) {
            this._createGrass();
        }
    }

    /**
     * 创建纳格兰风格树木 - 金合欢/猴面包树风格
     */
    _createTrees() {
        const config = NagrandConfig.decorations.trees;
        
        for (let i = 0; i < config.count; i++) {
            // 随机位置
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * config.spreadRadius;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // 随机树类型
            const treeType = config.types[Math.floor(Math.random() * config.types.length)];
            const height = config.minHeight + Math.random() * (config.maxHeight - config.minHeight);
            
            let tree;
            switch(treeType) {
                case 'acacia':
                    tree = this._createAcaciaTree(height, i);
                    break;
                case 'baobab':
                    tree = this._createBaobabTree(height, i);
                    break;
                case 'twisted':
                    tree = this._createTwistedTree(height, i);
                    break;
                default:
                    tree = this._createAcaciaTree(height, i);
            }
            
            tree.position = new Vector3(x, 0, z);
            tree.rotation.y = Math.random() * Math.PI * 2;
            
            this.trees.push(tree);
        }
    }

    /**
     * 创建金合欢树 - 扁平伞状树冠
     */
    _createAcaciaTree(height, index) {
        const treeRoot = new Mesh(`acacia_${index}`, this.scene);
        
        // 树干 - 细长弯曲
        const trunkHeight = height * 0.7;
        const trunk = MeshBuilder.CreateCylinder(`trunk_${index}`, {
            height: trunkHeight,
            diameterTop: 0.15,
            diameterBottom: 0.4,
            tessellation: 8
        }, this.scene);
        trunk.position.y = trunkHeight / 2;
        
        // 树干材质
        const trunkMat = new StandardMaterial(`trunkMat_${index}`, this.scene);
        trunkMat.diffuseColor = new Color3(0.35, 0.25, 0.15);
        trunkMat.specularColor = new Color3(0.1, 0.1, 0.1);
        trunk.material = trunkMat;
        trunk.parent = treeRoot;
        
        // 扁平伞状树冠
        const canopyWidth = height * 0.8;
        const canopyHeight = height * 0.15;
        const canopy = MeshBuilder.CreateCylinder(`canopy_${index}`, {
            height: canopyHeight,
            diameterTop: canopyWidth,
            diameterBottom: canopyWidth * 0.3,
            tessellation: 12
        }, this.scene);
        canopy.position.y = trunkHeight + canopyHeight * 0.3;
        
        // 树冠材质
        const foliageColor = this._getRandomFoliageColor();
        const canopyMat = new StandardMaterial(`canopyMat_${index}`, this.scene);
        canopyMat.diffuseColor = foliageColor;
        canopyMat.specularColor = new Color3(0.05, 0.1, 0.05);
        canopy.material = canopyMat;
        canopy.parent = treeRoot;
        
        // 添加第二层树冠增加层次感
        const canopy2 = MeshBuilder.CreateCylinder(`canopy2_${index}`, {
            height: canopyHeight * 0.6,
            diameterTop: canopyWidth * 0.6,
            diameterBottom: canopyWidth * 0.2,
            tessellation: 10
        }, this.scene);
        canopy2.position.y = trunkHeight + canopyHeight * 0.8;
        canopy2.material = canopyMat;
        canopy2.parent = treeRoot;
        
        return treeRoot;
    }

    /**
     * 创建猴面包树 - 粗壮树干，稀疏树枝
     */
    _createBaobabTree(height, index) {
        const treeRoot = new Mesh(`baobab_${index}`, this.scene);
        
        // 粗壮树干
        const trunkHeight = height * 0.6;
        const trunk = MeshBuilder.CreateCylinder(`trunk_${index}`, {
            height: trunkHeight,
            diameterTop: height * 0.25,
            diameterBottom: height * 0.35,
            tessellation: 10
        }, this.scene);
        trunk.position.y = trunkHeight / 2;
        
        const trunkMat = new StandardMaterial(`trunkMat_${index}`, this.scene);
        trunkMat.diffuseColor = new Color3(0.45, 0.35, 0.25);
        trunkMat.specularColor = new Color3(0.1, 0.1, 0.1);
        trunk.material = trunkMat;
        trunk.parent = treeRoot;
        
        // 创建多个分支
        const branchCount = 4 + Math.floor(Math.random() * 3);
        const foliageColor = this._getRandomFoliageColor();
        
        for (let i = 0; i < branchCount; i++) {
            const branchAngle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.3;
            const branchLength = height * 0.3 * (0.8 + Math.random() * 0.4);
            
            // 分支
            const branch = MeshBuilder.CreateCylinder(`branch_${index}_${i}`, {
                height: branchLength,
                diameterTop: 0.1,
                diameterBottom: 0.25,
                tessellation: 6
            }, this.scene);
            
            branch.position.y = trunkHeight;
            branch.position.x = Math.cos(branchAngle) * height * 0.1;
            branch.position.z = Math.sin(branchAngle) * height * 0.1;
            branch.rotation.z = -Math.cos(branchAngle) * 0.6;
            branch.rotation.x = Math.sin(branchAngle) * 0.6;
            branch.material = trunkMat;
            branch.parent = treeRoot;
            
            // 小树冠在分支顶端
            const smallCanopy = MeshBuilder.CreateSphere(`smallCanopy_${index}_${i}`, {
                diameter: branchLength * 0.8,
                segments: 8
            }, this.scene);
            
            const canopyMat = new StandardMaterial(`canopyMat_${index}_${i}`, this.scene);
            canopyMat.diffuseColor = foliageColor;
            canopyMat.specularColor = new Color3(0.05, 0.1, 0.05);
            smallCanopy.material = canopyMat;
            
            // 计算分支末端位置
            const tipOffset = branchLength * 0.5;
            smallCanopy.position.y = trunkHeight + tipOffset * Math.cos(0.6);
            smallCanopy.position.x = Math.cos(branchAngle) * (height * 0.1 + tipOffset * Math.sin(0.6));
            smallCanopy.position.z = Math.sin(branchAngle) * (height * 0.1 + tipOffset * Math.sin(0.6));
            smallCanopy.parent = treeRoot;
        }
        
        return treeRoot;
    }

    /**
     * 创建扭曲树 - 外星风格扭曲树干
     */
    _createTwistedTree(height, index) {
        const treeRoot = new Mesh(`twisted_${index}`, this.scene);
        
        const trunkMat = new StandardMaterial(`trunkMat_${index}`, this.scene);
        trunkMat.diffuseColor = new Color3(0.4, 0.3, 0.2);
        trunkMat.specularColor = new Color3(0.1, 0.1, 0.1);
        
        // 创建扭曲的多段树干
        const segments = 5;
        let currentY = 0;
        let currentX = 0;
        let currentZ = 0;
        
        for (let i = 0; i < segments; i++) {
            const segmentHeight = height / segments * (0.8 + Math.random() * 0.4);
            const segmentDiameter = 0.4 * (1 - i * 0.15);
            
            const segment = MeshBuilder.CreateCylinder(`segment_${index}_${i}`, {
                height: segmentHeight,
                diameterTop: segmentDiameter * 0.7,
                diameterBottom: segmentDiameter,
                tessellation: 8
            }, this.scene);
            
            segment.position.y = currentY + segmentHeight / 2;
            segment.position.x = currentX;
            segment.position.z = currentZ;
            
            // 随机倾斜
            segment.rotation.x = (Math.random() - 0.5) * 0.3;
            segment.rotation.z = (Math.random() - 0.5) * 0.3;
            
            segment.material = trunkMat;
            segment.parent = treeRoot;
            
            currentY += segmentHeight * 0.9;
            currentX += (Math.random() - 0.5) * 0.5;
            currentZ += (Math.random() - 0.5) * 0.5;
        }
        
        // 顶部树冠 - 不规则形状
        const foliageColor = this._getRandomFoliageColor();
        const canopyMat = new StandardMaterial(`canopyMat_${index}`, this.scene);
        canopyMat.diffuseColor = foliageColor;
        canopyMat.specularColor = new Color3(0.05, 0.1, 0.05);
        
        // 多个小球组成不规则树冠
        for (let i = 0; i < 4; i++) {
            const foliage = MeshBuilder.CreateSphere(`foliage_${index}_${i}`, {
                diameter: height * 0.25 * (0.7 + Math.random() * 0.6),
                segments: 8
            }, this.scene);
            
            foliage.position.y = currentY + Math.random() * height * 0.1;
            foliage.position.x = currentX + (Math.random() - 0.5) * height * 0.2;
            foliage.position.z = currentZ + (Math.random() - 0.5) * height * 0.2;
            foliage.material = canopyMat;
            foliage.parent = treeRoot;
        }
        
        return treeRoot;
    }

    /**
     * 获取随机树叶颜色
     */
    _getRandomFoliageColor() {
        const colors = NagrandConfig.decorations.trees.foliageColors;
        const color = colors[Math.floor(Math.random() * colors.length)];
        return new Color3(color.r, color.g, color.b);
    }

    /**
     * 创建岩石
     */
    _createRocks() {
        const config = NagrandConfig.decorations.rocks;
        
        for (let i = 0; i < config.count; i++) {
            // 随机位置
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * config.spreadRadius;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
            const rock = this._createRock(size, i);
            
            rock.position = new Vector3(x, size * 0.3, z);
            rock.rotation = new Vector3(
                Math.random() * 0.3,
                Math.random() * Math.PI * 2,
                Math.random() * 0.3
            );
            
            // 添加物理
            new PhysicsAggregate(rock, PhysicsShapeType.CONVEX_HULL, {
                mass: 0,
                friction: 0.8,
                restitution: 0.1
            }, this.scene);
            
            this.rocks.push(rock);
        }
    }

    /**
     * 创建单个岩石 - 不规则多面体
     */
    _createRock(size, index) {
        // 使用十二面体作为基础，然后变形
        const rock = MeshBuilder.CreatePolyhedron(`rock_${index}`, {
            type: 2, // 十二面体
            size: size * 0.5
        }, this.scene);
        
        // 变形顶点使其更自然
        const positions = rock.getVerticesData("position");
        if (positions) {
            for (let i = 0; i < positions.length; i += 3) {
                const noise = (Math.random() - 0.5) * size * 0.3;
                positions[i] += noise;
                positions[i + 1] += (Math.random() - 0.5) * size * 0.2;
                positions[i + 2] += noise;
            }
            rock.updateVerticesData("position", positions);
        }
        
        // 随机颜色
        const colors = NagrandConfig.decorations.rocks.colors;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const rockMat = new StandardMaterial(`rockMat_${index}`, this.scene);
        rockMat.diffuseColor = new Color3(color.r, color.g, color.b);
        rockMat.specularColor = new Color3(0.1, 0.1, 0.1);
        rockMat.specularPower = 4;
        rock.material = rockMat;
        
        // 接收阴影
        rock.receiveShadows = true;
        
        return rock;
    }

    /**
     * 创建草丛
     */
    _createGrass() {
        const config = NagrandConfig.decorations.grass;
        
        // 创建草丛材质
        const grassMat = new StandardMaterial("grassMat", this.scene);
        grassMat.diffuseColor = new Color3(0.35, 0.55, 0.25);
        grassMat.specularColor = new Color3(0.1, 0.15, 0.1);
        grassMat.backFaceCulling = false;
        
        for (let i = 0; i < config.density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * config.spreadRadius;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // 创建草丛 - 使用交叉的平面
            const grassPatch = this._createGrassPatch(config.height, i);
            grassPatch.position = new Vector3(x, 0, z);
            grassPatch.material = grassMat;
            
            this.grassPatches.push(grassPatch);
        }
    }

    /**
     * 创建单个草丛
     */
    _createGrassPatch(height, index) {
        // 使用两个交叉的平面
        const grassRoot = new Mesh(`grass_${index}`, this.scene);
        
        const plane1 = MeshBuilder.CreatePlane(`grassPlane1_${index}`, {
            width: height * 0.6,
            height: height
        }, this.scene);
        plane1.position.y = height / 2;
        plane1.parent = grassRoot;
        
        const plane2 = MeshBuilder.CreatePlane(`grassPlane2_${index}`, {
            width: height * 0.6,
            height: height
        }, this.scene);
        plane2.position.y = height / 2;
        plane2.rotation.y = Math.PI / 2;
        plane2.parent = grassRoot;
        
        return grassRoot;
    }

    /**
     * 销毁所有装饰物
     */
    dispose() {
        this.trees.forEach(tree => tree.dispose());
        this.rocks.forEach(rock => rock.dispose());
        this.grassPatches.forEach(grass => grass.dispose());
        
        this.trees = [];
        this.rocks = [];
        this.grassPatches = [];
    }
}
