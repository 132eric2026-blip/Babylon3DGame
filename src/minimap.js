import {
    TargetCamera,
    Vector3,
    Color3,
    StandardMaterial,
    MeshBuilder,
    Viewport
} from "@babylonjs/core";
import {
    AdvancedDynamicTexture,
    Image,
    Control,
    Rectangle,
    Button,
    TextBlock
} from "@babylonjs/gui";
import { Config } from "./config";

/**
 * 初始化小地图系统
 * 包含标记创建、独立相机、遮罩与缩放控件、视口布局与跟随更新
 * @param {Scene} scene 场景实例
 * @param {any} player 玩家对象
 */
export function setupMinimap(scene, player) {
    // 常量与图层掩码
    // 第28位：小地图对象（仅对小地图可见，对主相机不可见）
    const MASK_MINIMAP = 0x10000000;
    // 第29位：UI 对象（仅对 UI 相机可见，对主相机不可见）
    const MASK_UI = 0x20000000;

    // 主相机：排除小地图与 UI 图层
    const MASK_MAIN = 0xFFFFFFFF;

    if (scene.activeCamera) {
        scene.activeCamera.layerMask = MASK_MAIN & ~MASK_MINIMAP & ~MASK_UI;
    }

    // 1. 创建小地图标记

    // 1.1 玩家标记容器
    const playerMarker = MeshBuilder.CreateBox("playerMarkerRoot", { size: 0.1 }, scene);
    playerMarker.isVisible = false; // Invisible container
    playerMarker.parent = player.mesh;
    playerMarker.position.y = 10;
    playerMarker.layerMask = MASK_MINIMAP;

    // 箭头（三角形）
    const arrow = MeshBuilder.CreateDisc("minimapArrow", { radius: 1.5, tessellation: 3 }, scene);
    arrow.rotation.x = Math.PI / 2;
    arrow.rotation.y = -Math.PI / 2; // Points Forward

    const yellowMat = new StandardMaterial("yellowMat", scene);
    yellowMat.emissiveColor = Color3.Yellow();
    yellowMat.disableLighting = true;

    arrow.material = yellowMat;
    arrow.parent = playerMarker;
    arrow.layerMask = MASK_MINIMAP;

    // 箭头后的圆点
    const dot = MeshBuilder.CreateDisc("minimapDot", { radius: 0.6, tessellation: 16 }, scene);
    dot.rotation.x = Math.PI / 2;
    dot.position.z = -1.2; // Behind the arrow center
    dot.material = yellowMat;
    dot.parent = playerMarker;
    dot.layerMask = MASK_MINIMAP;

    // 1.2 物体标记（圆形）：扫描场景中的石头与树
    scene.meshes.forEach(mesh => {
        if (mesh.name.startsWith("stone") || mesh.name.startsWith("leaves")) {
            // Calculate size
            const boundingBox = mesh.getBoundingInfo().boundingBox;
            const radius = boundingBox.extendSizeWorld.x; // Use X extent as radius

            const marker = MeshBuilder.CreateDisc(mesh.name + "_marker", { radius: radius, tessellation: 16 }, scene);
            marker.rotation.x = Math.PI / 2;

            const markerMat = new StandardMaterial("markerMat", scene);
            markerMat.emissiveColor = new Color3(0.8, 0.8, 0.8); // Light Gray
            markerMat.disableLighting = true;
            marker.material = markerMat;

            marker.parent = mesh;
            marker.position.y = 20; // Above object
            marker.layerMask = MASK_MINIMAP;
        }
    });

    // 缩放与正交尺寸
    let currentZoom = Config.minimap.zoom;
    let zoomTextControl = null;

    const minimapCamera = new TargetCamera("minimapCamera", new Vector3(0, 100, 0), scene);
    minimapCamera.mode = TargetCamera.ORTHOGRAPHIC_CAMERA;
    minimapCamera.setTarget(Vector3.Zero());
    minimapCamera.rotation.x = Math.PI / 2; // Look Down
    minimapCamera.rotation.y = 0; // North Up

    // 更新缩放的函数
    const updateCameraZoom = () => {
        minimapCamera.orthoLeft = -currentZoom;
        minimapCamera.orthoRight = currentZoom;
        minimapCamera.orthoTop = currentZoom;
        minimapCamera.orthoBottom = -currentZoom;
        // Force projection matrix update
        minimapCamera.getProjectionMatrix(true);

        if (zoomTextControl) {
            zoomTextControl.text = "Zoom: " + currentZoom;
        }
    };

    updateCameraZoom(); // 初始设置

    // 小地图相机仅渲染标记图层
    minimapCamera.layerMask = MASK_MINIMAP;

    // UI 相机设置：使用独立相机避免被主相机的泛光影响
    const uiCamera = new TargetCamera("uiCamera", Vector3.Zero(), scene);
    uiCamera.layerMask = MASK_UI;

    // 添加到活动相机列表，确保主相机仍然在列表中
    if (scene.activeCameras.length === 0 && scene.activeCamera) {
        scene.activeCameras.push(scene.activeCamera);
    }
    // Avoid duplicate addition
    if (!scene.activeCameras.includes(minimapCamera)) {
        scene.activeCameras.push(minimapCamera);
    }
    if (!scene.activeCameras.includes(uiCamera)) {
        scene.activeCameras.push(uiCamera);
    }

    // 3. 视口与 UI 遮罩（圆形效果）
    const mapSize = 200; // px
    const mapMargin = 20; // px

    // 3.1 创建 GUI 容器用于遮罩与按钮
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("MinimapUI");
    // 重要：设置图层掩码，使其仅被 UI 相机渲染，避免主相机的泛光影响
    advancedTexture.layer.layerMask = MASK_UI;

    // Container for Minimap UI
    const minimapContainer = new Rectangle("minimapContainer");
    minimapContainer.width = mapSize + "px";
    minimapContainer.height = mapSize + "px";
    minimapContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    minimapContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    minimapContainer.left = mapMargin + "px";
    minimapContainer.top = -mapMargin + "px";
    minimapContainer.thickness = 0; // Invisible container border
    advancedTexture.addControl(minimapContainer);

    // 3.2 圆形遮罩（按配置可选）
    if (Config.minimap.showMask) {
        // 使用 Canvas 创建圆形遮罩纹理
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = mapSize;
        maskCanvas.height = mapSize;
        const ctx = maskCanvas.getContext("2d");

        // 小地图相机清屏颜色
        minimapCamera.clearColor = new Color3(0, 0, 0.2);

        // 填充黑色（遮住视口四角）
        ctx.fillStyle = "#222222";
        ctx.fillRect(0, 0, mapSize, mapSize);

        // 切出圆形区域
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(mapSize / 2, mapSize / 2, mapSize / 2 - 4, 0, Math.PI * 2);
        ctx.fill();

        // 重置混合模式
        ctx.globalCompositeOperation = "source-over";

        // 画边框圆环
        ctx.strokeStyle = "white";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(mapSize / 2, mapSize / 2, mapSize / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();

        const maskDataUrl = maskCanvas.toDataURL();

        const maskImage = new Image("minimapMask", maskDataUrl);
        maskImage.stretch = Image.STRETCH_FILL;
        minimapContainer.addControl(maskImage);
    } else {
        // 无遮罩时使用方形边框
        const border = new Rectangle("minimapBorder");
        border.thickness = 2;
        border.color = "white";
        border.background = "transparent";
        minimapContainer.addControl(border);

        // 设置相机清屏颜色为不透明背景，小地图通常有底色
        minimapCamera.clearColor = new Color3(0, 0, 0.2);
    }

    // 调试：显示缩放级别文本
    zoomTextControl = new TextBlock();
    zoomTextControl.text = "Zoom: " + currentZoom;
    zoomTextControl.color = "white";
    zoomTextControl.fontSize = 12;
    zoomTextControl.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    zoomTextControl.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    zoomTextControl.left = "-5px";
    zoomTextControl.top = "5px";
    minimapContainer.addControl(zoomTextControl);

    // 3.3 缩放按钮
    const createZoomButton = (text, alignLeft) => {
        const btn = Button.CreateSimpleButton("zoomBtn" + text, text);
        btn.width = "30px";
        btn.height = "30px";
        btn.color = "white";
        btn.background = "rgba(0, 0, 0, 0.5)";
        btn.cornerRadius = 15;
        btn.horizontalAlignment = alignLeft ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
        btn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        // 位置：放置在容器内部的左右下角，更紧凑
        btn.left = alignLeft ? "5px" : "-5px";
        btn.top = "-5px";
        return btn;
    };

    const btnMinus = createZoomButton("-", true); // 左下角：缩小（视野扩大）
    btnMinus.onPointerUpObservable.add(() => {
        currentZoom = Math.min(currentZoom + Config.minimap.zoomStep, Config.minimap.maxZoom);
        updateCameraZoom();
    });
    minimapContainer.addControl(btnMinus);

    const btnPlus = createZoomButton("+", false); // 右下角：放大（视野缩小）
    btnPlus.onPointerUpObservable.add(() => {
        currentZoom = Math.max(currentZoom - Config.minimap.zoomStep, Config.minimap.minZoom);
        updateCameraZoom();
    });
    minimapContainer.addControl(btnPlus);

    // 4. 视口逻辑
    const updateViewport = () => {
        const engine = scene.getEngine();
        const w = engine.getRenderWidth();
        const h = engine.getRenderHeight();

        minimapCamera.viewport = new Viewport(
            mapMargin / w,
            mapMargin / h,
            mapSize / w,
            mapSize / h
        );
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    // 5. 更新逻辑（跟随玩家）
    scene.onBeforeRenderObservable.add(() => {
        if (player.mesh) {
            minimapCamera.position.x = player.mesh.position.x;
            minimapCamera.position.z = player.mesh.position.z;
            // 旋转：采用“北向固定，箭头随玩家朝向旋转”的方案

            // 同步标记与玩家朝向
            // 玩家物理胶囊体不旋转，实际旋转的是 `modelRoot`
            if (player.modelRoot) {
                // 由于锁定了玩家刚体转动，需要手动将 `playerMarker.rotation.y` 对齐到 `modelRoot` 的朝向

                if (player.modelRoot.rotationQuaternion) {
                    const euler = player.modelRoot.rotationQuaternion.toEulerAngles();
                    // Marker Root Rotation matches Player Rotation
                    playerMarker.rotation.y = euler.y;
                } else {
                    playerMarker.rotation.y = player.modelRoot.rotation.y;
                }
            }
        }
    });
}
