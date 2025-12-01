import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation } from "@babylonjs/core";

/**
 * 远古守护者雕像
 * 由石质身体、巨剑与发光双眼组成，带有呼吸式发光动画
 */
export class AncientGuardian {
    /**
     * 构造守护者
     * @param {Scene} scene 场景实例
     * @param {Vector3} position 位置
     * @param {number} rotationY 朝向（y 轴旋转）
     */
    constructor(scene, position, rotationY) {
        this.scene = scene;
        this.root = new TransformNode("guardianRoot", scene);
        this.root.position = position;
        this.root.rotation.y = rotationY;

        this.createMaterials();
        this.createBody();
        this.createSword();
        this.createEyes();
    }

    /**
     * 创建所需材质（石材、眼睛发光、金属）
     */
    createMaterials() {
        // 古代石材
        this.stoneMat = new StandardMaterial("guardianStoneMat", this.scene);
        this.stoneMat.diffuseColor = new Color3(0.4, 0.42, 0.45);
        this.stoneMat.specularColor = new Color3(0.1, 0.1, 0.1);
        this.stoneMat.roughness = 0.8;

        // 发光红眼材质
        this.eyeMat = new StandardMaterial("guardianEyeMat", this.scene);
        this.eyeMat.diffuseColor = new Color3(0, 0, 0);
        this.eyeMat.emissiveColor = new Color3(1, 0, 0);
        this.eyeMat.specularColor = new Color3(0, 0, 0);
        this.eyeMat.disableLighting = true;
        
        // 剑的金属材质
        this.swordMat = new StandardMaterial("guardianSwordMat", this.scene);
        this.swordMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
        this.swordMat.specularColor = new Color3(0.8, 0.8, 0.9);
    }

    /**
     * 创建身体结构（基座、腿、躯干、肩、头、盔饰、手臂与手）
     */
    createBody() {
        // 1. 基座
        const base = MeshBuilder.CreateBox("guardianBase", { width: 2, height: 0.5, depth: 2 }, this.scene);
        base.position.y = 0.25;
        base.material = this.stoneMat;
        base.parent = this.root;

        // 2. 双腿（方块风格）
        const leftLeg = MeshBuilder.CreateBox("leftLeg", { width: 0.6, height: 2.5, depth: 0.8 }, this.scene);
        leftLeg.position = new Vector3(-0.5, 1.5, 0);
        leftLeg.material = this.stoneMat;
        leftLeg.parent = this.root;

        const rightLeg = MeshBuilder.CreateBox("rightLeg", { width: 0.6, height: 2.5, depth: 0.8 }, this.scene);
        rightLeg.position = new Vector3(0.5, 1.5, 0);
        rightLeg.material = this.stoneMat;
        rightLeg.parent = this.root;

        // 3. 躯干（胸甲）
        const torso = MeshBuilder.CreateBox("torso", { width: 1.8, height: 2.0, depth: 1.0 }, this.scene);
        torso.position = new Vector3(0, 3.75, 0);
        torso.material = this.stoneMat;
        torso.parent = this.root;

        // 4. 肩部
        const shoulderL = MeshBuilder.CreateSphere("shoulderL", { diameter: 1.2, segments: 8 }, this.scene);
        shoulderL.position = new Vector3(-1.1, 4.5, 0);
        shoulderL.material = this.stoneMat;
        shoulderL.parent = this.root;

        const shoulderR = MeshBuilder.CreateSphere("shoulderR", { diameter: 1.2, segments: 8 }, this.scene);
        shoulderR.position = new Vector3(1.1, 4.5, 0);
        shoulderR.material = this.stoneMat;
        shoulderR.parent = this.root;

        // 5. 头部（头盔风格）
        const head = MeshBuilder.CreateBox("head", { width: 0.8, height: 1.0, depth: 0.9 }, this.scene);
        head.position = new Vector3(0, 5.25, 0);
        head.material = this.stoneMat;
        head.parent = this.root;

        // 头盔饰条
        const crest = MeshBuilder.CreateBox("crest", { width: 0.2, height: 0.6, depth: 1.0 }, this.scene);
        crest.position = new Vector3(0, 5.9, 0);
        crest.material = this.stoneMat;
        crest.parent = this.root;
        
        // 6. 手臂（前伸持剑）
        // 手臂略向前倾
        const armL = MeshBuilder.CreateBox("armL", { width: 0.5, height: 2.0, depth: 0.5 }, this.scene);
        armL.rotation.x = -Math.PI / 6; // Angled forward
        armL.rotation.z = Math.PI / 12;
        armL.position = new Vector3(-1.1, 3.5, 0.8);
        armL.material = this.stoneMat;
        armL.parent = this.root;

        const armR = MeshBuilder.CreateBox("armR", { width: 0.5, height: 2.0, depth: 0.5 }, this.scene);
        armR.rotation.x = -Math.PI / 6;
        armR.rotation.z = -Math.PI / 12;
        armR.position = new Vector3(1.1, 3.5, 0.8);
        armR.material = this.stoneMat;
        armR.parent = this.root;
        
        // 手
        const handL = MeshBuilder.CreateBox("handL", { size: 0.6 }, this.scene);
        handL.position = new Vector3(-0.8, 2.6, 1.3);
        handL.material = this.stoneMat;
        handL.parent = this.root;
        
        const handR = MeshBuilder.CreateBox("handR", { size: 0.6 }, this.scene);
        handR.position = new Vector3(0.8, 2.6, 1.3);
        handR.material = this.stoneMat;
        handR.parent = this.root;
    }

    /**
     * 创建巨剑（刃、格、柄、球头）
     */
    createSword() {
        // 插在地面的巨剑
        const swordGroup = new TransformNode("swordGroup", this.scene);
        swordGroup.parent = this.root;
        swordGroup.position = new Vector3(0, 0, 1.3); // Between hands, forward

        // 刀刃
        const blade = MeshBuilder.CreateBox("blade", { width: 0.8, height: 5, depth: 0.1 }, this.scene);
        blade.position.y = 2.5; // Tip at 0, handle up
        // 刀刃渐细（梯形），此处用简化盒体
        blade.material = this.swordMat;
        blade.parent = swordGroup;

        // 护手横档
        const guard = MeshBuilder.CreateBox("guard", { width: 2.5, height: 0.3, depth: 0.3 }, this.scene);
        guard.position.y = 5.0;
        guard.material = this.swordMat;
        guard.parent = swordGroup;

        // 剑柄
        const hilt = MeshBuilder.CreateCylinder("hilt", { diameter: 0.2, height: 1.5 }, this.scene);
        hilt.position.y = 5.9;
        hilt.material = this.stoneMat; // 石/皮握柄简化
        hilt.parent = swordGroup;
        
        // 球头
        const pommel = MeshBuilder.CreateSphere("pommel", { diameter: 0.4 }, this.scene);
        pommel.position.y = 6.7;
        pommel.material = this.swordMat;
        pommel.parent = swordGroup;
    }

    /**
     * 创建发光双眼并添加呼吸动画
     */
    createEyes() {
        // 左眼
        const eyeL = MeshBuilder.CreatePlane("eyeL", { width: 0.2, height: 0.1 }, this.scene);
        eyeL.parent = this.root;
        eyeL.position = new Vector3(-0.2, 5.3, 0.46); // On face surface
        eyeL.material = this.eyeMat;

        // 右眼
        const eyeR = MeshBuilder.CreatePlane("eyeR", { width: 0.2, height: 0.1 }, this.scene);
        eyeR.parent = this.root;
        eyeR.position = new Vector3(0.2, 5.3, 0.46);
        eyeR.material = this.eyeMat;

        // 呼吸式发光动画
        const anim = new Animation(
            "eyeBreath",
            "material.emissiveColor",
            30,
            Animation.ANIMATIONTYPE_COLOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const keys = [];
        keys.push({ frame: 0, value: new Color3(0.2, 0, 0) }); // Dim
        keys.push({ frame: 30, value: new Color3(1.0, 0, 0) }); // Bright
        keys.push({ frame: 60, value: new Color3(0.2, 0, 0) }); // Dim

        anim.setKeys(keys);

        eyeL.animations.push(anim);
        eyeR.animations.push(anim);

        this.scene.beginAnimation(eyeL, 0, 60, true);
        this.scene.beginAnimation(eyeR, 0, 60, true);
    }
}
