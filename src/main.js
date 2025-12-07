import { WebGPUEngine, Scene, Vector3, ArcRotateCamera, HavokPlugin, GlowLayer } from "@babylonjs/core";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import HavokPhysics from "@babylonjs/havok";
import { SagittariusScene } from "./scenes/sagittarius/SagittariusScene";
import { DefaultScene } from "./scenes/default/DefaultScene";
import { HellFireScene } from "./scenes/HellFire/HellFireScene";
import { NagrandScene } from "./scenes/Narang/NagrandScene";
//import { Player } from "./player";
import { Player2 } from "./player";
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
// 监听鼠标按键状态，检测旋转操作
    let isMouseDown = false;
    let currentButton = -1;
    let lastX = 0;
    let lastY = 0;
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
    } else if (Config.scene.activeScene === "HellFire") {
        const hellFireScene = new HellFireScene(scene);
        hellFireScene.create();
    } else if (Config.scene.activeScene === "Nagrand") {
        const nagrandScene = new NagrandScene(scene);
        nagrandScene.create();
    } else {
        const sagittariusScene = new SagittariusScene(scene);
        sagittariusScene.create();
    }

    // 相机
    const camera = new ArcRotateCamera("camera", -Math.PI / 2.5, Math.PI / 2.5, 20, Vector3.Zero(), scene);
    camera.wheelPrecision = 20;
    camera.inputs.attached.pointers.buttons = [0,2];
    camera.useCtrlForPanning = true;
    camera.attachControl(engine.getRenderingCanvas(), true);
    scene.activeCameras = [camera];
    camera.panningSensibility = 0; // 禁用平移（避免意外拖动）

    const canvasEl = engine.getRenderingCanvas();
    if (canvasEl) {
        // 阻止右键菜单，允许使用右键控制相机旋转
        canvasEl.oncontextmenu = function (e) {
            e.preventDefault();
        };
        // canvasEl.addEventListener("contextmenu", (e) => {
        //     e.preventDefault();
        //     console.log("CanvasRightClick", e);
        // });
        // canvasEl.addEventListener("mousedown", (evt) => {
        //     if (evt.button === 2) {
        //         console.log("CanvasRightMouseDown", evt);
        //     }
        // });

        // const rightDragState = { active: false, lastX: 0, lastY: 0 };

        // canvasEl.addEventListener("mousedown", (evt) => {
        //     if (evt.button === 2) {
        //         rightDragState.active = true;
        //         rightDragState.lastX = evt.clientX;
        //         rightDragState.lastY = evt.clientY;
        //     }
        // });

        // canvasEl.addEventListener("mousemove", (evt) => {
        //     if (!rightDragState.active) return;
        //     const dx = evt.clientX - rightDragState.lastX;
        //     const dy = evt.clientY - rightDragState.lastY;
        //     rightDragState.lastX = evt.clientX;
        //     rightDragState.lastY = evt.clientY;
        //     console.log("CanvasRightDrag", { dx, dy, x: evt.clientX, y: evt.clientY });
        // });

        // const endRightDrag = () => { rightDragState.active = false; };
        // canvasEl.addEventListener("mouseup", (evt) => { if (evt.button === 2) endRightDrag(); });
        // canvasEl.addEventListener("mouseleave", endRightDrag);
        // window.addEventListener("mouseup", (evt) => { if (evt.button === 2) endRightDrag(); });



        canvasEl.addEventListener('mousedown', (evt) => {
            console.log('Mouse down, button:', evt.button);
            if (evt.button === 2) {
                isMouseDown = true;
                currentButton = evt.button;
                lastX = evt.clientX;
                lastY = evt.clientY;
            }
        });

    // canvasEl.addEventListener('mousemove', (evt) => {
    //     if (isMouseDown && currentButton !== -1) {
    //         // 检测鼠标是否真的移动了
    //         if (Math.abs(evt.clientX - lastX) > 1 || Math.abs(evt.clientY - lastY) > 1) {
    //             if (currentButton === 2) {
    //                 console.log(1); // 右键旋转
    //             } else if (currentButton === 0) {
    //                 console.log(2); // 左键旋转
    //             }
    //             lastX = evt.clientX;
    //             lastY = evt.clientY;
    //         }
    //     }
    // });

    // canvasEl.addEventListener('mouseup', (evt) => {
    //     console.log('Mouse up');
    //     isMouseDown = false;
    //     currentButton = -1;
    // });
    }

    // window.addEventListener("mousedown", (evt) => {
    //     if (evt.button === 2) {
    //         console.log("RightMouseDown", evt);
    //     }
    // });

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
    const glowLayer = new GlowLayer("glowLayer", scene);
    glowLayer.intensity = 1.2;

    // 玩家 (默认使用 Player2 逻辑，通过配置选择具体角色)
    let player = new Player2(scene, camera, glowLayer);
    // 如果需要兼容旧的 player1 逻辑，可以在这里保留，但根据需求默认场景使用 player2.js


    // 相机跟随玩家
    // 注意：player.mesh 是物理胶囊体
    camera.lockedTarget = player.mesh;

    // 关键修复：
    // BoxMan 会自动将自己添加到 glowLayer (IncludedOnly模式)，从而屏蔽场景其他元素(如路灯)的泛光。
    // VoxelKnight 没有发光部件，导致 glowLayer 保持默认模式(影响全场景)。
    // 这里手动将 player.mesh 加入 glowLayer，强制切换到 IncludedOnly 模式。
    // 因为 VoxelKnight 本身不发光，这样既保持了角色正常，又消除了场景污染。
    if (player.mesh) {
        glowLayer.addIncludedOnlyMesh(player.mesh);
    }

    // 将玩家网格添加到阴影生成器（投射阴影）并接收阴影
    if (scene.shadowGenerator && player.mesh) {
        // 获取所有子网格（包括嵌套的）
        const allChildMeshes = player.mesh.getChildMeshes(false);
        allChildMeshes.forEach(m => {
            // 添加为阴影投射者
            scene.shadowGenerator.addShadowCaster(m);
            // 设置接收阴影
            m.receiveShadows = true;
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
