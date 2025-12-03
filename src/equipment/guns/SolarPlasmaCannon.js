import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, Animation, ParticleSystem, Texture, Color4, DynamicTexture, Mesh, ShaderMaterial, Effect } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";

// 创建日耀等离子炮的视觉网格
export function createSolarPlasmaCannonMesh(scene) {
    const gunGroup = new TransformNode("solarCannonVisuals", scene);

    // === 材质定义 ===

    // 主体紫色材质
    const purpleMat = new StandardMaterial("solarPurpleMat", scene);
    purpleMat.diffuseColor = new Color3(0.5, 0.2, 0.7);  // 紫色
    purpleMat.specularColor = new Color3(0.4, 0.3, 0.5);
    purpleMat.specularPower = 32;

    // 深紫色材质（用于装饰）
    const darkPurpleMat = new StandardMaterial("solarDarkPurpleMat", scene);
    darkPurpleMat.diffuseColor = new Color3(0.3, 0.1, 0.5);
    darkPurpleMat.specularColor = new Color3(0.2, 0.1, 0.3);

    // 熔岩能量材质（发光橙红色）
    const lavaMat = new StandardMaterial("solarLavaMat", scene);
    lavaMat.emissiveColor = new Color3(1.0, 0.4, 0.1);  // 橙红色发光
    lavaMat.diffuseColor = new Color3(1.0, 0.3, 0.0);
    lavaMat.disableLighting = true;

    // === 1. 粗壮主体炮身 ===
    const mainBody = MeshBuilder.CreateCylinder("solarMainBody", {
        height: 0.6,
        diameterTop: 0.25,
        diameterBottom: 0.3
    }, scene);
    mainBody.rotation.x = Math.PI / 2;  // 横向放置
    mainBody.material = purpleMat;
    mainBody.parent = gunGroup;
    mainBody.position.z = 0.1;

    // === 2. 能量反应炉（枪尾部分）===
    const reactor = MeshBuilder.CreateSphere("solarReactor", {
        diameter: 0.35,
        segments: 16
    }, scene);
    reactor.material = darkPurpleMat;
    reactor.parent = gunGroup;
    reactor.position.z = -0.25;

    // 反应炉内部 - 滚动熔岩能量球
    const lavaCore = MeshBuilder.CreateSphere("solarLavaCore", {
        diameter: 0.25,
        segments: 16
    }, scene);
    lavaCore.material = lavaMat;
    lavaCore.parent = reactor;
    lavaCore.position = new Vector3(0, 0, 0);

    // 熔岩核心旋转动画
    const lavaCoreRotAnim = new Animation(
        "lavaCoreRotAnim",
        "rotation.y",
        30,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CYCLE
    );
    lavaCoreRotAnim.setKeys([
        { frame: 0, value: 0 },
        { frame: 100, value: Math.PI * 2 }
    ]);
    lavaCore.animations.push(lavaCoreRotAnim);
    scene.beginAnimation(lavaCore, 0, 100, true);

    // === 3. 炮口部分 ===
    const muzzle = MeshBuilder.CreateCylinder("solarMuzzle", {
        height: 0.35,
        diameterTop: 0.18,
        diameterBottom: 0.14
    }, scene);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.material = purpleMat;
    muzzle.parent = gunGroup;
    muzzle.position.z = 0.55;

    // 炮口发光环
    const muzzleGlow = MeshBuilder.CreateTorus("solarMuzzleGlow", {
        diameter: 0.2,
        thickness: 0.03
    }, scene);
    muzzleGlow.rotation.x = Math.PI / 2;
    muzzleGlow.material = lavaMat;
    muzzleGlow.parent = gunGroup;
    muzzleGlow.position.z = 0.7;

    // === 4. 装饰散热片（4片，环绕主体）===
    for (let i = 0; i < 4; i++) {
        const fin = MeshBuilder.CreateBox("solarFin" + i, {
            width: 0.05,
            height: 0.35,
            depth: 0.15
        }, scene);
        fin.material = darkPurpleMat;
        fin.parent = gunGroup;
        
        // 围绕中心旋转布局
        const angle = (Math.PI / 2) * i;
        const radius = 0.18;
        fin.position.x = Math.cos(angle) * radius;
        fin.position.y = Math.sin(angle) * radius;
        fin.position.z = 0.1;
        fin.rotation.z = angle;
    }

    return gunGroup;
}

export function spawnSolarPlasmaCannon(scene, position) {
    const mesh = createSolarPlasmaCannonMesh(scene);
    mesh.position = position;
    return mesh;
}
