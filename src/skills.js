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

function createBoosterIcon() {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,64,64);
    const g = ctx.createRadialGradient(32, 24, 6, 32, 24, 26);
    g.addColorStop(0, "rgba(255,180,80,1)");
    g.addColorStop(0.6, "rgba(255,110,40,0.9)");
    g.addColorStop(1, "rgba(200,40,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(32, 24, 18, 24, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,80,40,0.95)";
    ctx.beginPath();
    ctx.moveTo(32, 46);
    ctx.lineTo(26, 28);
    ctx.lineTo(38, 28);
    ctx.closePath();
    ctx.fill();
    return c.toDataURL();
}

function createHalfMoonSlashIcon() {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    // 背景辉光
    const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    glow.addColorStop(0, "rgba(150, 230, 255, 0.6)");
    glow.addColorStop(1, "rgba(0, 100, 150, 0.0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // 半月形气波
    ctx.save();
    ctx.translate(32, 32);
    
    // 外圈半月
    ctx.strokeStyle = "rgba(200, 240, 255, 0.9)";
    ctx.lineWidth = 8;
    ctx.shadowColor = "rgba(150, 230, 255, 0.8)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 20, -Math.PI/2, Math.PI/2, false);
    ctx.stroke();
    
    // 内圈半月
    ctx.strokeStyle = "rgba(100, 200, 255, 0.8)";
    ctx.lineWidth = 5;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 14, -Math.PI/2, Math.PI/2, false);
    ctx.stroke();
    
    // 能量核心
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
    core.addColorStop(0, "rgba(255, 255, 255, 1)");
    core.addColorStop(0.5, "rgba(150, 230, 255, 0.8)");
    core.addColorStop(1, "rgba(100, 200, 255, 0.3)");
    ctx.fillStyle = core;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // 火花效果
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI - Math.PI/2;
        const distance = 22;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
    return c.toDataURL("image/png");
}

export function setupSkillBar(scene, player) {
    const keys = ["1", "Q", "3", "4", "5", "6", "7", "8", "9", "0"];
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
    const slots = [];
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
        slots.push(slot);

        const keyText = new TextBlock("keyText_" + i, i === 0 ? "E" : i === 2 ? "1" : keys[i]);
        keyText.color = "white";
        keyText.fontSize = 14;
        keyText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        keyText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        keyText.left = "6px";
        keyText.top = "6px";
        slot.addControl(keyText);

        const icon = new Image("icon_" + i, i === 0 ? createShieldIcon() : i === 1 ? createBoosterIcon() : i === 2 ? createHalfMoonSlashIcon() : "");
        const iconSize = (slotSize - 32);
        icon.width = iconSize + "px";
        icon.height = iconSize + "px";
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
                const s0 = slots[0];
                if (s0) {
                    if (player.shield.active) { s0.color = "#FFD54A"; s0.thickness = 3; }
                    else { s0.color = "#999999"; s0.thickness = 2; }
                }
            }
        }
        if (k === "q") {
            const s = slots[1];
            if (s) {
                const highlighted = s.color === "#FFD54A" && s.thickness === 3;
                if (highlighted) { s.color = "#999999"; s.thickness = 2; }
                else { s.color = "#FFD54A"; s.thickness = 3; }
            }
        }
    });

}
