import { AdvancedDynamicTexture, TextBlock, Control } from "@babylonjs/gui";

/**
 * 初始化基础 UI（FPS 显示等）
 * @param {Scene} scene 场景实例
 * @param {any} player 玩家对象
 */
export function setupUI(scene, player) {
    // GUI（FPS）
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    // 设置图层掩码为 0x20000000（仅 UI 相机可见，避免被主相机的泛光影响）
    advancedTexture.layer.layerMask = 0x20000000;

    // FPS 计数器
    const fpsText = new TextBlock();
    fpsText.text = "FPS: 60";
    fpsText.color = "white";
    fpsText.fontSize = 24;
    fpsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    fpsText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    fpsText.left = "20px";
    fpsText.top = "20px";
    advancedTexture.addControl(fpsText);

    // 更新逻辑
    scene.onBeforeRenderObservable.add(() => {
        fpsText.text = "FPS: " + scene.getEngine().getFps().toFixed(0);
    });
}
