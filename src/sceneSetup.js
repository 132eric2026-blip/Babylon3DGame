import { HemisphericLight, DirectionalLight, Vector3, MeshBuilder, StandardMaterial, Color3, ShadowGenerator, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";
import { Config } from "./config";

export function createSceneElements(scene) {
    // 环境光
    const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    hemiLight.intensity = Config.scene.hemiLightIntensity;

    // 方向光
    const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), scene);
    dirLight.position = new Vector3(
        Config.scene.dirLightPosition.x, 
        Config.scene.dirLightPosition.y, 
        Config.scene.dirLightPosition.z
    );
    dirLight.intensity = Config.scene.dirLightIntensity;

    // 阴影
    if (Config.scene.enableShadows) {
        const shadowGenerator = new ShadowGenerator(1024, dirLight);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;
        scene.shadowGenerator = shadowGenerator;
    }

    // 地面
    const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
    const groundMat = new StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new Color3(Config.scene.groundColor.r, Config.scene.groundColor.g, Config.scene.groundColor.b);
    groundMat.specularColor = new Color3(0, 0, 0); // No specular
    ground.material = groundMat;
    ground.receiveShadows = true;

    // 地面物理 (Havok uses PhysicsAggregate)
    // Ground needs to be a box for physics if we use BOX shape, or MESH for CreateGround
    // For CreateGround (plane), BOX works if we give it some thickness or use MESH/CONVEX_HULL.
    // But standard way for ground is often BOX with huge depth or simply BOX shape on a plane mesh (it might act as a thin box).
    // Let's use PhysicsShapeType.BOX for the ground.
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

    // 世界坐标系辅助线
    const axisX = MeshBuilder.CreateLines("axisX", { points: [Vector3.Zero(), new Vector3(5, 0, 0)] }, scene);
    axisX.color = new Color3(1, 0, 0);
    const axisY = MeshBuilder.CreateLines("axisY", { points: [Vector3.Zero(), new Vector3(0, 5, 0)] }, scene);
    axisY.color = new Color3(0, 1, 0);
    const axisZ = MeshBuilder.CreateLines("axisZ", { points: [Vector3.Zero(), new Vector3(0, 0, 5)] }, scene);
    axisZ.color = new Color3(0, 0, 1);
}
