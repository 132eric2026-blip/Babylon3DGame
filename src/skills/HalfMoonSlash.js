import { 
    Vector3, 
    MeshBuilder, 
    StandardMaterial, 
    Color3, 
    Color4,
    Animation,
    ParticleSystem,
    Texture
} from "@babylonjs/core";
import { BaseSkill } from "./BaseSkill";

/**
 * 半月斩技能
 * 以玩家为中心，向前方释放一个半月形的气波
 */
export class HalfMoonSlash extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "半月斩", 0.2); // 3秒冷却
    }
    
    /**
     * 执行技能效果
     */
    execute() {
        // 获取玩家位置和朝向
        const playerPos = this.player.mesh.position.clone();
        const playerRotation = this.getPlayerRotation();
        
        // 创建半月形气波
        this.createCrescentWave(playerPos, playerRotation);
    }
    
    /**
     * 获取玩家旋转角度
     * @returns {number} Y轴旋转角度（弧度）
     */
    getPlayerRotation() {
        if (this.player.modelRoot.rotationQuaternion) {
            return this.player.modelRoot.rotationQuaternion.toEulerAngles().y;
        } else {
            return this.player.modelRoot.rotation.y;
        }
    }
    
    /**
     * 创建半月形气波
     * @param {Vector3} position - 初始位置（玩家中心）
     * @param {number} rotation - 朝向角度
     */
    createCrescentWave(position, rotation) {
        const scene = this.scene;
        const glowLayer = this.player.glowLayer;
        
        // === 1. 创建半月形网格 ===
        const crescentMesh = this.createCrescentMesh();
        
        // 计算玩家前方位置（半月形圆弧中心在玩家位置）
        const direction = new Vector3(
            Math.sin(rotation),
            0,
            Math.cos(rotation)
        );
        
        // 设置位置和旋转
        crescentMesh.position = position.clone();
        crescentMesh.position.y += 0.2; // 稍微抬高一点，接近地面
        
        // 旋转调整：保持水平（与地面平行），半月形圆弧包裹玩家
        crescentMesh.rotation.x = 0; // 保持水平
        crescentMesh.rotation.y = rotation - Math.PI / 2; // 旋转-90度，使圆弧两端点在左右手臂方向，开口朝后
        
        // 材质
        const crescentMat = new StandardMaterial("crescentMat", scene);
        crescentMat.emissiveColor = new Color3(0.9, 1.0, 1.0); // 明亮的青白色
        crescentMat.diffuseColor = new Color3(0.4, 0.8, 1.0);
        crescentMat.specularColor = new Color3(1.0, 1.0, 1.0);
        crescentMat.alpha = 0.85;
        crescentMat.disableLighting = true;
        crescentMat.backFaceCulling = false; // 双面渲染
        crescentMesh.material = crescentMat;
        
        // 添加发光效果
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(crescentMesh);
        }
        
        // === 2. 粒子效果 ===
        this.createCrescentParticles(crescentMesh);
        
        // === 3. 静态展示动画（不飞出去）===
        this.animateCrescentWave(crescentMesh);
    }
    
    /**
     * 创建半月形网格
     * @returns {Mesh} 半月形网格
     */
    createCrescentMesh() {
        const scene = this.scene;
        
        // 使用 Ribbon 创建半月形
        const radius = 2.5; // 半月半径
        const thickness = 0.15; // 厚度
        const segments = 40; // 分段数
        
        // 创建两条路径（内外边缘）
        const outerPath = [];
        const innerPath = [];
        
        // 半月形角度范围：从 -90度到90度（朝向前方的半圆）
        for (let i = 0; i <= segments; i++) {
            const angle = Math.PI * (-0.5 + i / segments); // -π/2 到 π/2
            
            // 外边缘
            const outerX = Math.cos(angle) * radius;
            const outerZ = Math.sin(angle) * radius;
            outerPath.push(new Vector3(outerX, 0, outerZ));
            
            // 内边缘（稍微细一点）
            const innerX = Math.cos(angle) * (radius - thickness);
            const innerZ = Math.sin(angle) * (radius - thickness);
            innerPath.push(new Vector3(innerX, 0, innerZ));
        }
        
        // 创建 Ribbon（带状网格）
        const crescentMesh = MeshBuilder.CreateRibbon("crescent", {
            pathArray: [innerPath, outerPath],
            closeArray: false,
            closePath: false,
            updatable: false
        }, scene);
        
        return crescentMesh;
    }
    
    /**
     * 创建气波粒子效果
     * @param {Mesh} crescentMesh - 半月形网格
     */
    createCrescentParticles(crescentMesh) {
        const scene = this.scene;
        
        // 主粒子系统：青白色光辉
        const ps = new ParticleSystem("crescentParticles", 500, scene);
        
        // 创建粒子纹理
        const particleTexture = this.createParticleTexture();
        ps.particleTexture = particleTexture;
        
        ps.emitter = crescentMesh;
        ps.minEmitBox = new Vector3(-2.5, -0.3, -2.5);
        ps.maxEmitBox = new Vector3(2.5, 0.3, 2.5);
        
        // 颜色：青白色 -> 蓝色 -> 透明
        ps.color1 = new Color4(0.9, 1.0, 1.0, 1.0);
        ps.color2 = new Color4(0.4, 0.9, 1.0, 1.0);
        ps.colorDead = new Color4(0.2, 0.6, 1.0, 0.0);
        
        ps.minSize = 0.15;
        ps.maxSize = 0.4;
        ps.minLifeTime = 0.3;
        ps.maxLifeTime = 0.6;
        
        ps.emitRate = 400;
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // 粒子向外飞溅
        ps.minEmitPower = 1.5;
        ps.maxEmitPower = 3.5;
        ps.updateSpeed = 0.01;
        
        ps.start();
        
        // 火花粒子（边缘效果）
        const psSparks = new ParticleSystem("crescentSparks", 300, scene);
        psSparks.particleTexture = particleTexture;
        psSparks.emitter = crescentMesh;
        psSparks.minEmitBox = new Vector3(-2.5, -0.2, -2.5);
        psSparks.maxEmitBox = new Vector3(2.5, 0.2, 2.5);
        
        psSparks.color1 = new Color4(1.0, 1.0, 1.0, 1.0); // 白色火花
        psSparks.color2 = new Color4(0.7, 1.0, 1.0, 1.0);
        psSparks.colorDead = new Color4(0.3, 0.7, 1.0, 0.0);
        
        psSparks.minSize = 0.08;
        psSparks.maxSize = 0.2;
        psSparks.minLifeTime = 0.2;
        psSparks.maxLifeTime = 0.5;
        
        psSparks.emitRate = 250;
        psSparks.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        psSparks.minEmitPower = 2.0;
        psSparks.maxEmitPower = 5.0;
        psSparks.gravity = new Vector3(0, -2, 0); // 火花下落
        psSparks.updateSpeed = 0.008;
        
        psSparks.start();
        
        // 存储粒子系统，用于后续清理
        crescentMesh._particleSystems = [ps, psSparks];
    }
    
    /**
     * 创建粒子纹理
     * @returns {Texture}
     */
    createParticleTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        // 星形/光芒形状
        ctx.beginPath();
        const cx = 32, cy = 32, spikes = 8, outerRadius = 30, innerRadius = 10;
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            let x = cx + Math.cos(rot) * outerRadius;
            let y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.5, "rgba(200, 240, 255, 0.8)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fill();
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "crescentParticle", this.scene);
    }
    
    /**
     * 气波静态展示动画（在玩家前方停留）
     * @param {Mesh} crescentMesh - 半月形网格
     */
    animateCrescentWave(crescentMesh) {
        const scene = this.scene;
        
        const duration = 0.8; // 持续时间（秒）
        const fps = 60;
        const totalFrames = fps * duration;
        
        // 缩放动画（出现 -> 放大 -> 缩小消失）
        const scaleAnim = new Animation(
            "crescentScale",
            "scaling",
            fps,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const scaleKeys = [];
        scaleKeys.push({ frame: 0, value: new Vector3(0.3, 0.3, 0.3) });      // 从小开始
        scaleKeys.push({ frame: totalFrames * 0.2, value: new Vector3(1.3, 1.3, 1.3) }); // 快速放大
        scaleKeys.push({ frame: totalFrames * 0.6, value: new Vector3(1.2, 1.2, 1.2) }); // 保持
        scaleKeys.push({ frame: totalFrames, value: new Vector3(0.5, 0.5, 0.5) });       // 缩小消失
        scaleAnim.setKeys(scaleKeys);
        
        // 透明度动画
        const alphaAnim = new Animation(
            "crescentAlpha",
            "material.alpha",
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const alphaKeys = [];
        alphaKeys.push({ frame: 0, value: 0.0 });                    // 开始透明
        alphaKeys.push({ frame: totalFrames * 0.15, value: 0.95 });  // 快速出现
        alphaKeys.push({ frame: totalFrames * 0.6, value: 0.9 });    // 保持
        alphaKeys.push({ frame: totalFrames, value: 0.0 });          // 淡出
        alphaAnim.setKeys(alphaKeys);
        
        // 轻微的Y轴旋转动画（增加动感）
        const rotAnim = new Animation(
            "crescentRotate",
            "rotation.y",
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const currentRotY = crescentMesh.rotation.y;
        const rotKeys = [];
        rotKeys.push({ frame: 0, value: currentRotY });
        rotKeys.push({ frame: totalFrames, value: currentRotY + 0.15 }); // 减小旋转幅度
        rotAnim.setKeys(rotKeys);
        
        // 播放动画
        const animatable = scene.beginDirectAnimation(
            crescentMesh,
            [scaleAnim, alphaAnim, rotAnim],
            0,
            totalFrames,
            false,
            1.5 // 稍微加快一点速度
        );
        
        // 动画结束后清理
        animatable.onAnimationEnd = () => {
            // 停止并清理粒子系统
            if (crescentMesh._particleSystems) {
                for (const ps of crescentMesh._particleSystems) {
                    ps.stop();
                    setTimeout(() => ps.dispose(), 500);
                }
            }
            
            // 销毁网格
            crescentMesh.dispose();
            
            console.log("半月斩气波消散");
        };
    }
}
