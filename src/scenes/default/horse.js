import { MeshBuilder, Vector3, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";

/**
 * 马（可骑乘）
 * 负责创建马的网格结构与物理聚合体，供玩家骑乘交互
 */
export class Horse {
    /**
     * 构造马
     * @param {Scene} scene 场景实例
     * @param {Vector3} position 初始位置
     */
    constructor(scene, position) {
        this.scene = scene;
        this.position = position;
        this.mesh = this.createHorseMesh();
        this.setupPhysics();
    }

    /**
     * 创建马的可视网格结构（身体、头颈、鬃毛、尾巴、四肢等）
     * @returns {import("@babylonjs/core").Mesh} 马的根网格（不可见碰撞体）
     */
    createHorseMesh() {
        // 材质
        const horseMat = new StandardMaterial("horseMat", this.scene);
        horseMat.diffuseColor = new Color3(0.6, 0.4, 0.2); // 棕色
        horseMat.specularColor = new Color3(0, 0, 0); // 亚光
        horseMat.maxSimultaneousLights = 6; // 确保能接受多光源

        const hairMat = new StandardMaterial("horseHairMat", this.scene);
        hairMat.diffuseColor = new Color3(0.1, 0.1, 0.1); // Dark Grey/Black
        hairMat.specularColor = new Color3(0, 0, 0);
        hairMat.maxSimultaneousLights = 6;

        const hoofMat = new StandardMaterial("hoofMat", this.scene);
        hoofMat.diffuseColor = new Color3(0.05, 0.05, 0.05); // Black
        hoofMat.specularColor = new Color3(0, 0, 0);
        hoofMat.maxSimultaneousLights = 6;

        // 根节点（碰撞体）
        // 设计高度与马背相匹配，玩家站上去不会悬空
        // 总高度约 1.6m（腿 1.0 + 身体 0.6）
        const rootHeight = 1.6;
        const root = MeshBuilder.CreateBox("horseRoot", { width: 0.8, height: rootHeight, depth: 2.2 }, this.scene);
        root.position = this.position.clone();
        root.position.y += rootHeight / 2; // Pivot at center
        root.isVisible = false; // 不可见碰撞体

        // 尺寸参数
        const bodyLen = 1.4;
        const bodyWidth = 0.6;
        const bodyHeight = 0.6;
        const legHeight = 1.0;
        const legWidth = 0.25;
        
        // 相对根中心（y=0.8）的视觉偏移
        // 腿底在 0，腿顶在 1.0，中心在 0.5
        // 偏移 = 0.5 - 0.8 = -0.3
        const legY = -0.3;

        // 身体底在 1.0，顶在 1.6，中心在 1.3
        // 偏移 = 1.3 - 0.8 = 0.5
        const bodyY = 0.5;

        // 身体（躯干）
        const body = MeshBuilder.CreateBox("horseBody", { width: bodyWidth, height: bodyHeight, depth: bodyLen }, this.scene);
        body.material = horseMat;
        body.parent = root;
        body.position.y = bodyY; 

        // 颈部
        const neck = MeshBuilder.CreateBox("horseNeck", { width: 0.3, height: 0.8, depth: 0.5 }, this.scene);
        neck.material = horseMat;
        neck.parent = body;
        neck.position = new Vector3(0, 0.4, 0.6); // Relative to body
        neck.rotation.x = -Math.PI / 4;

        // 头部
        const head = MeshBuilder.CreateBox("horseHead", { width: 0.3, height: 0.35, depth: 0.7 }, this.scene);
        head.material = horseMat;
        head.parent = neck;
        head.position = new Vector3(0, 0.4, 0.2); // Top of neck
        head.rotation.x = Math.PI / 4; // Level out

        // 耳朵
        const earL = MeshBuilder.CreateBox("earL", { size: 0.08 }, this.scene);
        earL.material = horseMat;
        earL.parent = head;
        earL.position = new Vector3(-0.1, 0.25, -0.2);
        
        const earR = MeshBuilder.CreateBox("earR", { size: 0.08 }, this.scene);
        earR.material = horseMat;
        earR.parent = head;
        earR.position = new Vector3(0.1, 0.25, -0.2);

        // 鬃毛
        const mane = MeshBuilder.CreateBox("horseMane", { width: 0.1, height: 0.6, depth: 0.4 }, this.scene);
        mane.material = hairMat;
        mane.parent = neck;
        mane.position = new Vector3(0, 0.1, -0.26);

        // 尾巴
        const tail = MeshBuilder.CreateBox("horseTail", { width: 0.15, height: 0.7, depth: 0.15 }, this.scene);
        tail.material = hairMat;
        tail.parent = body;
        tail.position = new Vector3(0, 0.2, -0.7);
        tail.rotation.x = Math.PI / 6;

        // 四肢
        const createLeg = (name, x, z) => {
            const leg = MeshBuilder.CreateBox(name, { width: legWidth, height: legHeight, depth: legWidth }, this.scene);
            leg.material = horseMat;
            leg.parent = root;
            leg.position = new Vector3(x, legY, z); 
            
            // 蹄子
            const hoof = MeshBuilder.CreateBox(name + "_hoof", { width: legWidth, height: 0.15, depth: legWidth }, this.scene);
            hoof.material = hoofMat;
            hoof.parent = leg;
            hoof.position.y = -legHeight / 2 + 0.075;
            
            return leg;
        };

        const dx = bodyWidth / 2 - legWidth / 2;
        const dz = bodyLen / 2 - legWidth / 2;

        const legFL = createLeg("legFL", -dx, dz);
        const legFR = createLeg("legFR", dx, dz);
        const legBL = createLeg("legBL", -dx, -dz);
        const legBR = createLeg("legBR", dx, -dz);

        // 阴影
        if (this.scene.shadowGenerator) {
            const casters = [body, neck, head, earL, earR, mane, tail, legFL, legFR, legBL, legBR];
            // 也包含蹄子
            legFL.getChildren().concat(legFR.getChildren(), legBL.getChildren(), legBR.getChildren()).forEach(c => casters.push(c));

            casters.forEach(m => {
                this.scene.shadowGenerator.addShadowCaster(m);
                m.receiveShadows = true;
            });
        }

        return root;
    }

    /**
     * 设置马的物理：动态盒体、锁旋转、线性阻尼
     */
    setupPhysics() {
        // 动态盒体碰撞器
        // 质量 > 0 可移动；高摩擦防止滑动；低弹性防止弹跳
        // 锁定旋转以避免侧翻（与玩家类似）
        this.aggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.BOX, { mass: 200, restitution: 0.0, friction: 1.0 }, this.scene);
        
        // 将聚合体存入 metadata，便于玩家访问
        this.mesh.metadata = { aggregate: this.aggregate };

        this.aggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0) // 锁定旋转
        });
        
        // 设置线性阻尼，让其自然减速
        this.aggregate.body.setLinearDamping(2.0);
    }
}
