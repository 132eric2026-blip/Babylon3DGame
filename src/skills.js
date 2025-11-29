import { AdvancedDynamicTexture, Rectangle, Control, Image, TextBlock } from "@babylonjs/gui";

function createShieldIcon() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 64, 64);
    const bg = ctx.createRadialGradient(32, 32, 6, 32, 32, 30);
    bg.addColorStop(0, "rgba(255, 240, 160, 1)");
    bg.addColorStop(0.5, "rgba(255, 210, 80, 0.9)");
    bg.addColorStop(1, "rgba(255, 180, 0, 0)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();
    const ring = ctx.createLinearGradient(0, 0, 64, 64);
    ring.addColorStop(0, "rgba(255, 220, 120, 1)");
    ring.addColorStop(1, "rgba(255, 190, 40, 1)");
    ctx.strokeStyle = ring;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(32, 32);
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.quadraticCurveTo(12, -14, 12, -4);
    ctx.quadraticCurveTo(12, 8, 0, 14);
    ctx.quadraticCurveTo(-12, 8, -12, -4);
    ctx.quadraticCurveTo(-12, -14, 0, -14);
    ctx.closePath();
    const sg = ctx.createLinearGradient(0, -16, 0, 16);
    sg.addColorStop(0, "rgba(255, 230, 120, 1)");
    sg.addColorStop(0.5, "rgba(245, 180, 40, 1)");
    sg.addColorStop(1, "rgba(220, 140, 20, 1)");
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 200, 60, 1)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(32, 32);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.quadraticCurveTo(0, -16, 8, -10);
    ctx.quadraticCurveTo(0, -8, -8, -10);
    ctx.closePath();
    const hg = ctx.createLinearGradient(-8, -16, 8, -8);
    hg.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    hg.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(32, 32);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / 5;
        ctx.lineTo(Math.cos(angle) * 5, Math.sin(angle) * 5);
        const angle2 = angle + Math.PI / 5;
        ctx.lineTo(Math.cos(angle2) * 2.2, Math.sin(angle2) * 2.2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return canvas.toDataURL();
}

export function setupSkillBar(scene, player) {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("SkillsUI");
    advancedTexture.layer.layerMask = 0x20000000;

    const bar = new Rectangle("skillBar");
    bar.width = "720px";
    bar.height = "90px";
    bar.thickness = 0;
    bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    bar.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    bar.background = "transparent";
    advancedTexture.addControl(bar);

    const slotSize = 64;
    const gap = 8;
    const totalWidth = 10 * slotSize + 9 * gap;
    for (let i = 0; i < 10; i++) {
        const slot = new Rectangle("skillSlot_" + i);
        slot.width = slotSize + "px";
        slot.height = slotSize + "px";
        slot.thickness = 2;
        slot.color = "#999999";
        slot.background = "rgba(0,0,0,0.5)";
        slot.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        slot.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        slot.left = ((-totalWidth / 2) + i * (slotSize + gap) + slotSize / 2) + "px";
        slot.top = "-10px";
        bar.addControl(slot);

        const keyText = new TextBlock("keyText_" + i, i === 0 ? "E" : keys[i]);
        keyText.color = "white";
        keyText.fontSize = 14;
        keyText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        keyText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        keyText.left = "6px";
        keyText.top = "6px";
        slot.addControl(keyText);

        const icon = new Image("icon_" + i, i === 0 ? createShieldIcon() : "");
        icon.width = (i === 0 ? (slotSize - 20) : (slotSize - 12)) + "px";
        icon.height = (i === 0 ? (slotSize - 20) : (slotSize - 12)) + "px";
        icon.stretch = Image.STRETCH_UNIFORM;
        icon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        icon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        slot.addControl(icon);
    }

    window.addEventListener("keydown", (evt) => {
        const k = (evt.key || "").toLowerCase();
        if (k === "e") {
            if (player && player.shield) {
                player.shield.setActive(!player.shield.active);
            }
        }
    });
}
