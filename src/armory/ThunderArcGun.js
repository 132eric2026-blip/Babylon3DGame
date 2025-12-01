import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, DynamicTexture, Mesh } from "@babylonjs/core";

/**
 * 创建雷霆电弧枪的视觉网格
 * @param {Scene} scene 场景实例
 * @returns {TransformNode} 枪械模型根节点
 */
export function createThunderArcGunMesh(scene) {
    const gunGroup = new TransformNode("thunderArcVisuals", scene);

    // === 材质定义 ===
    
    // 金属深蓝材质
    const metalBlueMat = new StandardMaterial("thunderMetalBlueMat", scene);
    metalBlueMat.diffuseColor = new Color3(0.1, 0.2, 0.4);
    metalBlueMat.specularColor = new Color3(0.6, 0.8, 1.0);
    metalBlueMat.specularPower = 64;

    // 银色导电金属
    const silverMat = new StandardMaterial("thunderSilverMat", scene);
    silverMat.diffuseColor = new Color3(0.8, 0.8, 0.9);
    silverMat.specularColor = new Color3(1.0, 1.0, 1.0);

    // 电弧能量材质（发光青色）
    const electricMat = new StandardMaterial("thunderElectricMat", scene);
    electricMat.emissiveColor = new Color3(0.2, 0.8, 1.0); // 青色发光
    electricMat.diffuseColor = new Color3(0.0, 0.5, 1.0);
    electricMat.disableLighting = true;

    // === 1. 枪身主体 ===
    const mainBody = MeshBuilder.CreateBox("thunderBody", {
        width: 0.12,
        height: 0.15,
        depth: 0.4
    }, scene);
    mainBody.material = metalBlueMat;
    mainBody.parent = gunGroup;
    mainBody.position.z = 0.1;

    // === 2. 特斯拉线圈核心 (透明圆柱 + 内部发光) ===
    const coilCore = MeshBuilder.CreateCylinder("thunderCoil", {
        height: 0.25,
        diameter: 0.1
    }, scene);
    coilCore.rotation.x = Math.PI / 2;
    coilCore.material = electricMat;
    coilCore.parent = gunGroup;
    coilCore.position.z = 0.1;
    
    // 线圈环绕装饰
    const coilRing1 = MeshBuilder.CreateTorus("coilRing1", {
        diameter: 0.14,
        thickness: 0.02
    }, scene);
    coilRing1.rotation.x = Math.PI / 2;
    coilRing1.material = silverMat;
    coilRing1.parent = gunGroup;
    coilRing1.position.z = 0.05;

    const coilRing2 = MeshBuilder.CreateTorus("coilRing2", {
        diameter: 0.14,
        thickness: 0.02
    }, scene);
    coilRing2.rotation.x = Math.PI / 2;
    coilRing2.material = silverMat;
    coilRing2.parent = gunGroup;
    coilRing2.position.z = 0.15;

    // === 3. 叉状电极 (枪口) ===
    const prongLength = 0.4;
    const prongOffset = 0.08;
    
    // 上电极
    const topProng = MeshBuilder.CreateBox("topProng", { width: 0.03, height: 0.03, depth: prongLength }, scene);
    topProng.material = silverMat;
    topProng.parent = gunGroup;
    topProng.position.y = prongOffset;
    topProng.position.z = 0.4;

    // 下电极
    const bottomProng = MeshBuilder.CreateBox("bottomProng", { width: 0.03, height: 0.03, depth: prongLength }, scene);
    bottomProng.material = silverMat;
    bottomProng.parent = gunGroup;
    bottomProng.position.y = -prongOffset;
    bottomProng.position.z = 0.4;

    // 左电极
    const leftProng = MeshBuilder.CreateBox("leftProng", { width: 0.03, height: 0.03, depth: prongLength }, scene);
    leftProng.material = silverMat;
    leftProng.parent = gunGroup;
    leftProng.position.x = -prongOffset;
    leftProng.position.z = 0.4;

    // 右电极
    const rightProng = MeshBuilder.CreateBox("rightProng", { width: 0.03, height: 0.03, depth: prongLength }, scene);
    rightProng.material = silverMat;
    rightProng.parent = gunGroup;
    rightProng.position.x = prongOffset;
    rightProng.position.z = 0.4;

    // 电极尖端发光点
    const createTip = (parent) => {
        const tip = MeshBuilder.CreateSphere("prongTip", { diameter: 0.04 }, scene);
        tip.material = electricMat;
        tip.parent = parent;
        tip.position.z = prongLength / 2;
        return tip;
    };
    createTip(topProng);
    createTip(bottomProng);
    createTip(leftProng);
    createTip(rightProng);

    // === 4. 中心发射针 ===
    const needle = MeshBuilder.CreateCylinder("thunderNeedle", {
        height: 0.5,
        diameterTop: 0.01,
        diameterBottom: 0.04
    }, scene);
    needle.rotation.x = Math.PI / 2;
    needle.material = silverMat;
    needle.parent = gunGroup;
    needle.position.z = 0.35;

    return gunGroup;
}

/**
 * 生成雷霆电弧枪拾取物
 * 创建武器视觉、地面电场光环与交互元数据
 * @param {Scene} scene 场景实例
 * @param {Vector3} position 生成位置
 * @param {any} player 玩家对象（用于交互）
 * @returns {TransformNode} 武器根节点
 */
export function spawnThunderArcGun(scene, position, player) {
    const root = new TransformNode("thunderWeaponRoot", scene);
    root.position = position.clone();
    if (root.position.y > 0.5) {
        root.position.y = 0.5;
    }

    // === 1. 武器视觉模型 ===
    const gunVisuals = createThunderArcGunMesh(scene);
    gunVisuals.parent = root;
    gunVisuals.rotation.x = Math.PI / 2; // 竖直放置

    // === 2. 蓝色电场光环 ===
    const createElectricAuraTexture = () => {
        const textureSize = 512;
        const texture = new DynamicTexture("thunderAuraTexture", textureSize, scene, true);
        const ctx = texture.getContext();
        const cx = textureSize / 2;
        const cy = textureSize / 2;

        ctx.clearRect(0, 0, textureSize, textureSize);

        // 外部蓝色光晕
        const gradient = ctx.createRadialGradient(cx, cy, textureSize * 0.2, cx, cy, textureSize * 0.5);
        gradient.addColorStop(0, "rgba(0, 100, 255, 0)");
        gradient.addColorStop(0.5, "rgba(0, 200, 255, 0.7)");
        gradient.addColorStop(0.8, "rgba(0, 50, 200, 0.9)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, textureSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // 闪电纹路
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = "rgba(200, 255, 255, 0.9)";
        ctx.lineWidth = 4;

        for (let j = 0; j < 8; j++) {
            ctx.rotate(Math.PI * 2 / 8);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            // 简单的闪电折线
            ctx.lineTo(10, 40);
            ctx.lineTo(-10, 80);
            ctx.lineTo(20, 120);
            ctx.lineTo(0, 180);
            ctx.stroke();
        }

        ctx.restore();
        texture.update();
        return texture;
    };

    // 光环网格
    const auraSize = 3.0;
    const auraMesh = MeshBuilder.CreateGround("thunderAura", { width: auraSize, height: auraSize }, scene);
    auraMesh.parent = root;
    auraMesh.position.y = 0.02;

    const auraMat = new StandardMaterial("thunderAuraMat", scene);
    auraMat.diffuseTexture = createElectricAuraTexture();
    auraMat.diffuseTexture.hasAlpha = true;
    auraMat.useAlphaFromDiffuseTexture = true;
    auraMat.emissiveColor = new Color3(0.2, 0.6, 1.0);
    auraMat.disableLighting = true;
    auraMat.alpha = 0.85;
    auraMesh.material = auraMat;

    // 光环旋转动画
    const animAura = new Animation("animAura", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animAura.setKeys([{ frame: 0, value: 0 }, { frame: 120, value: Math.PI * 2 }]);
    auraMesh.animations.push(animAura);
    scene.beginAnimation(auraMesh, 0, 120, true);

    // === 3. 交互逻辑 ===
    // 简单的拾取范围检查
    const checkPickup = () => {
        if (!root || root.isDisposed()) {
            scene.onBeforeRenderObservable.removeCallback(checkPickup);
            return;
        }
        
        if (player && player.mesh) {
            const dist = Vector3.Distance(player.mesh.position, root.position);
            if (dist < 2.0) {
                // 玩家靠近，提示按E (这里简化直接拾取或者等待按键)
                // 实际上是在Player.tryPickup里检测距离
            }
        }
    };
    scene.onBeforeRenderObservable.add(checkPickup);

    // 给root添加metadata以便识别
    root.metadata = {
        weaponPickup: true,
        weaponName: "ThunderArcGun",
        pickupRange: 2.5
    };

    return root;
}
