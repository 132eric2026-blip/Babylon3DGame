import { WebGPUEngine, Scene, Vector3, ArcRotateCamera, HavokPlugin, GlowLayer } from "@babylonjs/core";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import HavokPhysics from "@babylonjs/havok";
import { SagittariusScene } from "./scenes/sagittarius/SagittariusScene";
import { DefaultScene } from "./scenes/default/DefaultScene";
import { Player } from "./player";
import { Player2 } from "./player2";
import { BoxMan } from "./characters/boxMan";
import { Config } from "./config";
import { setupUI } from "./ui";
import { setupMinimap } from "./minimap";
import { setupSkillBar } from "./skills";
import { spawnWeapons } from "./weaponManager";

/**
 * 创建渲染引擎
 * 返回已初始化的 `WebGPUEngine`
 */
async function createEngine() {
    const canvas = document.getElementById("renderCanvas");
    const engine = new WebGPUEngine(canvas, { antialiasingEnabled: true });
    await engine.initAsync();
    return engine;
}

/**
 * 创建并配置场景
 * 初始化物理、相机、后处理、UI、武器等模块
 * @param {WebGPUEngine} engine 渲染引擎
 * @returns {Scene} 场景对象
 */
async function createScene(engine) {
    const scene = new Scene(engine);

    // 物理引擎
    // 如果需要自定义 wasm 路径：
    // const havokInstance = await HavokPhysics({ locateFile: () => "./HavokPhysics.wasm" });
    const havokInstance = await HavokPhysics();
    const hk = new HavokPlugin(true, havokInstance);
    scene.enablePhysics(new Vector3(0, Config.scene.gravity, 0), hk);

    // 场景元素
    if (Config.scene.activeScene === "default") {
        const defaultScene = new DefaultScene(scene);
        defaultScene.create();
    } else {
        const sagittariusScene = new SagittariusScene(scene);
        sagittariusScene.create();
    }

    // 相机
    const camera = new ArcRotateCamera("camera", -Math.PI / 2.5, Math.PI / 2.5, 20, Vector3.Zero(), scene);
    camera.wheelPrecision = 20;
    camera.attachControl(engine.getRenderingCanvas(), true);
    scene.activeCameras = [camera];

    // 抗锯齿与泛光：开启 FXAA 与多重采样，同时启用泛光
    const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
    pipeline.fxaaEnabled = true;
    pipeline.samples = 4;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.65;
    pipeline.bloomWeight = 1.1;
    pipeline.bloomKernel = 96;
    pipeline.bloomScale = 0.5;

    // 发光层（可选）：用于对特定网格增强泛光
    // const glowLayer = new GlowLayer("glowLayer", scene);
    // glowLayer.intensity = 1.0;

    // 玩家
    let player;
    if (Config.selectedPlayer === "player2") {
        player = new Player2(scene, camera);
    } else {
        player = new Player(scene, camera);
        // BoxMan 仅在 player1 模式下作为独立实体出现
        const boxMan = new BoxMan(scene, new Vector3(5, 5, 5));
    }

    // 相机跟随玩家
    // 注意：player.mesh 是物理胶囊体
    camera.lockedTarget = player.mesh;

    // 将玩家网格添加到阴影生成器
    if (scene.shadowGenerator && player.mesh) {
        player.mesh.getChildMeshes().forEach(m => {
            scene.shadowGenerator.addShadowCaster(m);
        });
    }

    // 提升材质可同时处理的最大光源数量：支持护盾+路灯+环境光
    scene.materials.forEach(mat => {
        if (typeof mat.maxSimultaneousLights === "number") {
            mat.maxSimultaneousLights = 6;
        }
    });

    // 用户界面
    setupUI(scene, player);

    // 小地图
    setupMinimap(scene, player);

    // 技能栏
    setupSkillBar(scene, player);

    // 生成武器（依据配置）
    spawnWeapons(scene, player);

    return scene;
}

/**
 * 应用入口
 * 初始化引擎与场景，并启动渲染循环与窗口自适应
 */
async function main() {
    const engine = await createEngine();
    const scene = await createScene(engine);

    engine.runRenderLoop(() => {
        scene.render();
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });
}

main();
