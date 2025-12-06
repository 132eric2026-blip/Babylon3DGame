import { Animation } from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";
import { Shield } from "../../shield";

export class AlphaShield extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "Alpha护盾", 0.1);
        this.shield = null;
        this.active = false;
    }

    execute() {
        if (!this.shield) {
            this.shield = new Shield(this.scene, this.player.modelRoot);
            if (this.player.glowLayer && this.shield.mesh) {
                this.player.glowLayer.addIncludedOnlyMesh(this.shield.mesh);
            }
        }
        if (this.active) {
            this.fadeOut();
        } else {
            this.fadeIn();
        }
    }

    fadeIn() {
        if (!this.shield || !this.shield.mesh || !this.shield.mesh.material) return;
        this.active = true;
        this.shield.mesh.material.alpha = 0;
        this.shield.setActive(true);
        const alphaAnim = new Animation(
            "alphaShieldFadeIn",
            "material.alpha",
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        alphaAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 15, value: 0.5 }
        ]);
        this.scene.beginDirectAnimation(this.shield.mesh, [alphaAnim], 0, 15, false);
    }

    fadeOut() {
        if (!this.shield || !this.shield.mesh || !this.shield.mesh.material) { this.active = false; return; }
        const startAlpha = this.shield.mesh.material.alpha;
        const alphaAnim = new Animation(
            "alphaShieldFadeOut",
            "material.alpha",
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        alphaAnim.setKeys([
            { frame: 0, value: startAlpha },
            { frame: 15, value: 0 }
        ]);
        const anim = this.scene.beginDirectAnimation(this.shield.mesh, [alphaAnim], 0, 15, false);
        anim.onAnimationEnd = () => {
            this.shield.setActive(false);
            this.active = false;
        };
    }
}
