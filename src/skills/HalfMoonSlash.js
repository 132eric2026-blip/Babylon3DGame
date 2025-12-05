import { 
    Vector3, 
    MeshBuilder, 
    StandardMaterial, 
    Color3, 
    Color4,
    Animation,
    ParticleSystem,
    Texture,
    TransformNode,
    Quaternion
} from "@babylonjs/core";
import { BaseSkill } from "./BaseSkill";

/**
 * 半月斩技能
 * 以玩家为中心，向前方释放一个半月形的气波
 */
export class HalfMoonSlash extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "半月斩", 0.2); // 1秒冷却
    }
    
    /**
     * 执行技能效果
     */
    execute() {
        // 获取玩家位置和朝向
        const playerPos = this.player.mesh.position.clone();
        const playerRotation = this.getPlayerRotation();
        
        // 播放角色施展动作
        this.playSlashAnimation();
        
        // 创建扫过式半月形气波
        this.createSweepingCrescent(playerPos, playerRotation);
    }
    
    /**
     * 播放半月斩施展动作
     * 双臂横向挥斩配合身体微转
     */
    playSlashAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.rightShoulder || !boxMan.leftShoulder) return;
        
        const scene = this.scene;
        const fps = 60;
        
        // 保存初始状态
        const rightStartX = boxMan.rightShoulder.rotation.x;
        const rightStartY = boxMan.rightShoulder.rotation.y;
        const rightStartZ = boxMan.rightShoulder.rotation.z;
        
        const leftStartX = boxMan.leftShoulder.rotation.x;
        const leftStartY = boxMan.leftShoulder.rotation.y;
        const leftStartZ = boxMan.leftShoulder.rotation.z;
        
        // 标记动画进行中（防止其他动画覆盖）
        this.player.halfMoonSlashAnimating = true;
        
        // ===== 右臂动画（主挥斩臂） =====
        // X轴：手臂抬起角度（负值=抬起）
        const rightAnimX = new Animation(
            "halfMoonRightX",
            "rotation.x",
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        rightAnimX.setKeys([
            { frame: 0, value: rightStartX },
            { frame: 4, value: -1.8 },        // 快速抬臂蓄力
            { frame: 10, value: -1.5 },       // 横扫过程保持高度
            { frame: 18, value: -1.2 },       // 挥斩延伸
            { frame: 25, value: rightStartX } // 恢复
        ]);
        
        // Y轴：横向挥斩（正值=向右，负值=向左）
        const rightAnimY = new Animation(
            "halfMoonRightY",
            "rotation.y",
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        rightAnimY.setKeys([
            { frame: 0, value: rightStartY },
            { frame: 4, value: 1.0 },         // 向右后方蓄力
            { frame: 12, value: -1.2 },       // 从右向左横扫
            { frame: 18, value: -1.4 },       // 挥斩到位
            { frame: 25, value: rightStartY } // 恢复
        ]);
        
        // Z轴：手臂外展
        const rightAnimZ = new Animation(
            "halfMoonRightZ",
            "rotation.z",
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        rightAnimZ.setKeys([
            { frame: 0, value: rightStartZ },
            { frame: 4, value: -0.3 },        // 略微外展
            { frame: 12, value: 0.2 },        // 横扫时收臂
            { frame: 25, value: rightStartZ } // 恢复
        ]);
        
        // ===== 左臂动画（配合臂） =====
        // 左臂做相反方向的配合动作，形成协调的横扫姿态
        const leftAnimX = new Animation(
            "halfMoonLeftX",
            "rotation.x",
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        leftAnimX.setKeys([
            { frame: 0, value: leftStartX },
            { frame: 4, value: -0.8 },        // 左臂略抬配合
            { frame: 12, value: -0.5 },       // 保持姿态
            { frame: 18, value: -0.3 },       // 逐渐放下
            { frame: 25, value: leftStartX }  // 恢复
        ]);
        
        const leftAnimY = new Animation(
            "halfMoonLeftY",
            "rotation.y",
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        leftAnimY.setKeys([
            { frame: 0, value: leftStartY },
            { frame: 4, value: -0.5 },        // 左臂向左
            { frame: 12, value: 0.3 },        // 配合右臂向右收
            { frame: 25, value: leftStartY }  // 恢复
        ]);
        
        const leftAnimZ = new Animation(
            "halfMoonLeftZ",
            "rotation.z",
            fps,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        leftAnimZ.setKeys([
            { frame: 0, value: leftStartZ },
            { frame: 4, value: 0.4 },         // 外展配合
            { frame: 12, value: 0.2 },        // 保持
            { frame: 25, value: leftStartZ }  // 恢复
        ]);
        
        // 停止可能正在进行的动画
        scene.stopAnimation(boxMan.rightShoulder);
        scene.stopAnimation(boxMan.leftShoulder);
        
        // 播放右臂动画
        const rightAnimatable = scene.beginDirectAnimation(
            boxMan.rightShoulder,
            [rightAnimX, rightAnimY, rightAnimZ],
            0,
            25,
            false,
            1.2  // 加快播放速度使动作更干脆
        );
        
        // 播放左臂动画
        scene.beginDirectAnimation(
            boxMan.leftShoulder,
            [leftAnimX, leftAnimY, leftAnimZ],
            0,
            25,
            false,
            1.2
        );
        
        // 动画完成后重置状态
        rightAnimatable.onAnimationEnd = () => {
            this.player.halfMoonSlashAnimating = false;
        };
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
     * 创建扫过式半月形气波（从一端到另一端横扫出现）
     * @param {Vector3} position - 玩家位置
     * @param {number} rotation - 玩家朝向
     */
    createSweepingCrescent(position, rotation) {
        const scene = this.scene;
        const glowLayer = this.player.glowLayer;
        
        // 参数设置
        const radius = 2.5;           // 半月半径
        const arcWidth = 0.2;         // 圆弧宽度
        const sweepDuration = 0.25;   // 扫过时间（秒）
        const trailDuration = 0.4;    // 拖尾持续时间（秒）
        const segments = 30;          // 分段数
        
        // 创建父节点用于统一管理
        const rootNode = new TransformNode("crescentRoot", scene);
        rootNode.position = position.clone();
        rootNode.position.y += 0.3;
        rootNode.rotation.y = rotation - Math.PI / 2; // 调整方向
        
        // 存储所有创建的小段网格
        const trailSegments = [];
        
        // 创建材质
        const trailMat = new StandardMaterial("trailMat", scene);
        trailMat.emissiveColor = new Color3(0.9, 1.0, 1.0);
        trailMat.diffuseColor = new Color3(0.5, 0.9, 1.0);
        trailMat.alpha = 0.9;
        trailMat.disableLighting = true;
        trailMat.backFaceCulling = false;
        
        // 创建粒子纹理
        const particleTexture = this.createParticleTexture();
        
        // 创建移动的发射点和粒子系统
        const emitter = new TransformNode("sweepEmitter", scene);
        emitter.parent = rootNode;
        
        const trailPS = new ParticleSystem("trailParticles", 600, scene);
        trailPS.particleTexture = particleTexture;
        trailPS.emitter = emitter;
        trailPS.minEmitBox = new Vector3(-0.15, -0.15, -0.15);
        trailPS.maxEmitBox = new Vector3(0.15, 0.15, 0.15);
        trailPS.color1 = new Color4(1.0, 1.0, 1.0, 1.0);
        trailPS.color2 = new Color4(0.7, 0.95, 1.0, 1.0);
        trailPS.colorDead = new Color4(0.4, 0.8, 1.0, 0.0);
        trailPS.minSize = 0.15;
        trailPS.maxSize = 0.4;
        trailPS.minLifeTime = 0.2;
        trailPS.maxLifeTime = 0.5;
        trailPS.emitRate = 800;
        trailPS.blendMode = ParticleSystem.BLENDMODE_ADD;
        trailPS.minEmitPower = 0.3;
        trailPS.maxEmitPower = 1.0;
        trailPS.start();
        
        // 扫过动画变量
        let currentSegment = 0;
        const fps = 60;
        const framesPerSegment = (sweepDuration * fps) / segments;
        let frameCount = 0;
        
        // 每帧更新
        const sweepObserver = scene.onBeforeRenderObservable.add(() => {
            frameCount++;
            
            // 计算当前进度
            const progress = Math.min(frameCount / (sweepDuration * fps), 1.0);
            const targetSegment = Math.floor(progress * segments);
            
            // 更新发射点位置
            const currentAngle = Math.PI * (-0.5 + progress);
            emitter.position.x = Math.cos(currentAngle) * radius;
            emitter.position.z = Math.sin(currentAngle) * radius;
            
            // 创建新的小段圆弧
            while (currentSegment < targetSegment && currentSegment < segments) {
                const segmentMesh = this.createArcSegment(
                    scene,
                    radius,
                    arcWidth,
                    currentSegment,
                    segments
                );
                
                segmentMesh.parent = rootNode;
                
                // 复制材质（每个段独立的材质以便独立淡出）
                const segMat = trailMat.clone("segMat_" + currentSegment);
                segmentMesh.material = segMat;
                
                // 添加发光
                if (glowLayer) {
                    glowLayer.addIncludedOnlyMesh(segmentMesh);
                }
                
                // 存储并设置淡出
                trailSegments.push({
                    mesh: segmentMesh,
                    material: segMat,
                    createdAt: frameCount,
                    alpha: 0.95
                });
                
                currentSegment++;
            }
            
            // 更新所有段的透明度（拖尾淡出效果）
            const trailFrames = trailDuration * fps;
            for (let i = trailSegments.length - 1; i >= 0; i--) {
                const seg = trailSegments[i];
                const age = frameCount - seg.createdAt;
                
                if (age > trailFrames) {
                    // 超出拖尾时间，销毁
                    seg.mesh.dispose();
                    seg.material.dispose();
                    trailSegments.splice(i, 1);
                } else {
                    // 计算淡出
                    const fadeProgress = age / trailFrames;
                    seg.material.alpha = 0.95 * (1 - fadeProgress * fadeProgress);
                }
            }
            
            // 扫过完成后停止粒子发射
            if (progress >= 1.0 && trailPS.isStarted()) {
                trailPS.stop();
            }
            
            // 所有段都消失后清理
            if (trailSegments.length === 0 && progress >= 1.0) {
                scene.onBeforeRenderObservable.remove(sweepObserver);
                trailPS.dispose();
                emitter.dispose();
                rootNode.dispose();
                console.log("半月斩气波消散");
            }
        });
    }
    
    /**
     * 创建单个圆弧段
     * @param {Scene} scene 
     * @param {number} radius 
     * @param {number} width 
     * @param {number} segmentIndex 
     * @param {number} totalSegments 
     * @returns {Mesh}
     */
    createArcSegment(scene, radius, width, segmentIndex, totalSegments) {
        // 计算这个段的角度范围
        const startAngle = Math.PI * (-0.5 + segmentIndex / totalSegments);
        const endAngle = Math.PI * (-0.5 + (segmentIndex + 1) / totalSegments);
        
        // 创建路径点
        const innerPath = [];
        const outerPath = [];
        const subSegments = 3; // 每个段内的细分
        
        for (let i = 0; i <= subSegments; i++) {
            const t = i / subSegments;
            const angle = startAngle + (endAngle - startAngle) * t;
            
            innerPath.push(new Vector3(
                Math.cos(angle) * (radius - width / 2),
                0,
                Math.sin(angle) * (radius - width / 2)
            ));
            
            outerPath.push(new Vector3(
                Math.cos(angle) * (radius + width / 2),
                0,
                Math.sin(angle) * (radius + width / 2)
            ));
        }
        
        // 创建带状网格
        const segment = MeshBuilder.CreateRibbon("arcSeg_" + segmentIndex, {
            pathArray: [innerPath, outerPath],
            closeArray: false,
            closePath: false
        }, scene);
        
        return segment;
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
        
        // 圆形光晕
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.3, "rgba(200, 240, 255, 0.8)");
        grad.addColorStop(0.6, "rgba(150, 220, 255, 0.4)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "crescentParticle", this.scene);
    }
}
