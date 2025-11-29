import { AdvancedDynamicTexture, TextBlock, Control } from "@babylonjs/gui";

export function setupUI(scene, player) {
    // --- GUI (FPS) ---
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // FPS Counter
    const fpsText = new TextBlock();
    fpsText.text = "FPS: 60";
    fpsText.color = "white";
    fpsText.fontSize = 24;
    fpsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    fpsText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    fpsText.left = "20px";
    fpsText.top = "20px";
    advancedTexture.addControl(fpsText);

    // Update Logic
    scene.onBeforeRenderObservable.add(() => {
        fpsText.text = "FPS: " + scene.getEngine().getFps().toFixed(0);
    });
}
