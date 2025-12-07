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
    Quaternion,
    GlowLayer,
    PointLight
} from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

export class HalfMoonSlash extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "半月斩", 0.2);
    }

    execute() {
        const playerPos = this.player.mesh.position.clone();
        const playerRotation = this.getPlayerRotation();
        this.playSlashAnimation();
        this.createSweepingCrescent(playerPos, playerRotation);
    }

    playSlashAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.rightShoulder || !boxMan.leftShoulder) return;
        const scene = this.scene;
        const fps = 60;
        const rightStartX = boxMan.rightShoulder.rotation.x;
        const rightStartY = boxMan.rightShoulder.rotation.y;
        const rightStartZ = boxMan.rightShoulder.rotation.z;
        const leftStartX = boxMan.leftShoulder.rotation.x;
        const leftStartY = boxMan.leftShoulder.rotation.y;
        const leftStartZ = boxMan.leftShoulder.rotation.z;
        this.player.halfMoonSlashAnimating = true;
        const rightAnimX = new Animation("halfMoonRightX","rotation.x",fps,Animation.ANIMATIONTYPE_FLOAT,Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: rightStartX },
            { frame: 4, value: -1.8 },
            { frame: 10, value: -1.5 },
            { frame: 18, value: -1.2 },
            { frame: 25, value: rightStartX }
        ]);
        const rightAnimY = new Animation("halfMoonRightY","rotation.y",fps,Animation.ANIMATIONTYPE_FLOAT,Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimY.setKeys([
            { frame: 0, value: rightStartY },
            { frame: 4, value: 1.0 },
            { frame: 12, value: -1.2 },
            { frame: 18, value: -1.4 },
            { frame: 25, value: rightStartY }
        ]);
        const rightAnimZ = new Animation("halfMoonRightZ","rotation.z",fps,Animation.ANIMATIONTYPE_FLOAT,Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimZ.setKeys([
            { frame: 0, value: rightStartZ },
            { frame: 4, value: -0.3 },
            { frame: 12, value: 0.2 },
            { frame: 25, value: rightStartZ }
        ]);
        const leftAnimX = new Animation("halfMoonLeftX","rotation.x",fps,Animation.ANIMATIONTYPE_FLOAT,Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimX.setKeys([
            { frame: 0, value: leftStartX },
            { frame: 4, value: -0.8 },
            { frame: 12, value: -0.5 },
            { frame: 18, value: -0.3 },
            { frame: 25, value: leftStartX }
        ]);
        const leftAnimY = new Animation("halfMoonLeftY","rotation.y",fps,Animation.ANIMATIONTYPE_FLOAT,Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimY.setKeys([
            { frame: 0, value: leftStartY },
            { frame: 4, value: -0.5 },
            { frame: 12, value: 0.3 },
            { frame: 25, value: leftStartY }
        ]);
        const leftAnimZ = new Animation("halfMoonLeftZ","rotation.z",fps,Animation.ANIMATIONTYPE_FLOAT,Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimZ.setKeys([
            { frame: 0, value: leftStartZ },
            { frame: 4, value: 0.4 },
            { frame: 12, value: 0.2 },
            { frame: 25, value: leftStartZ }
        ]);
        scene.stopAnimation(boxMan.rightShoulder);
        scene.stopAnimation(boxMan.leftShoulder);
        const rightAnimatable = scene.beginDirectAnimation(boxMan.rightShoulder,[rightAnimX, rightAnimY, rightAnimZ],0,25,false,1.2);
        scene.beginDirectAnimation(boxMan.leftShoulder,[leftAnimX, leftAnimY, leftAnimZ],0,25,false,1.2);
        rightAnimatable.onAnimationEnd = () => { this.player.halfMoonSlashAnimating = false; };
    }

    getPlayerRotation() {
        if (this.player.modelRoot.rotationQuaternion) {
            return this.player.modelRoot.rotationQuaternion.toEulerAngles().y;
        } else {
            return this.player.modelRoot.rotation.y;
        }
    }

    createSweepingCrescent(position, rotation) {
        const scene = this.scene;
        const glowLayer = this.player.glowLayer;
        const radius = 2.8;
        const arcWidth = 0.35;
        const sweepDuration = 0.22;
        const trailDuration = 0.5;
        const segments = 36;
        
        const rootNode = new TransformNode("crescentRoot", scene);
        rootNode.position = position.clone();
        rootNode.position.y += 0.3;
        rootNode.rotation.y = rotation - Math.PI / 2;
        
        // 创建动态点光源
        const slashLight = new PointLight("slashLight", new Vector3(0, 0.5, 0), scene);
        slashLight.parent = rootNode;
        slashLight.intensity = 3;
        slashLight.diffuse = new Color3(0.6, 0.2, 1.0);
        slashLight.specular = new Color3(0.8, 0.4, 1.0);
        slashLight.range = 6;
        
        const trailSegments = [];
        const energyLayers = [];
        
        // 主能量材质 - 紫蓝渐变
        const createEnergyMaterial = (index, total) => {
            const mat = new StandardMaterial("energyMat_" + index, scene);
            const t = index / total;
            // 紫色到蓝色到青色渐变
            const r = 0.6 + 0.4 * Math.sin(t * Math.PI);
            const g = 0.1 + 0.6 * t;
            const b = 1.0;
            mat.emissiveColor = new Color3(r, g, b);
            mat.diffuseColor = new Color3(r * 0.5, g * 0.5, b * 0.8);
            mat.alpha = 0.95;
            mat.disableLighting = true;
            mat.backFaceCulling = false;
            return mat;
        };
        
        // 外层光晕材质
        const outerGlowMat = new StandardMaterial("outerGlowMat", scene);
        outerGlowMat.emissiveColor = new Color3(0.4, 0.1, 0.8);
        outerGlowMat.alpha = 0.3;
        outerGlowMat.disableLighting = true;
        outerGlowMat.backFaceCulling = false;
        
        // 粒子纹理
        const sparkTexture = this.createSparkTexture();
        const coreTexture = this.createCoreParticleTexture();
        
        // 主发射器
        const emitter = new TransformNode("sweepEmitter", scene);
        emitter.parent = rootNode;
        
        // 核心能量粒子 - 明亮的核心
        const corePS = new ParticleSystem("coreParticles", 400, scene);
        corePS.particleTexture = coreTexture;
        corePS.emitter = emitter;
        corePS.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
        corePS.maxEmitBox = new Vector3(0.1, 0.1, 0.1);
        corePS.color1 = new Color4(1.0, 0.9, 1.0, 1.0);
        corePS.color2 = new Color4(0.8, 0.5, 1.0, 1.0);
        corePS.colorDead = new Color4(0.4, 0.1, 0.8, 0.0);
        corePS.minSize = 0.2;
        corePS.maxSize = 0.5;
        corePS.minLifeTime = 0.15;
        corePS.maxLifeTime = 0.35;
        corePS.emitRate = 600;
        corePS.blendMode = ParticleSystem.BLENDMODE_ADD;
        corePS.minEmitPower = 0.5;
        corePS.maxEmitPower = 1.5;
        corePS.start();
        
        // 火花粒子 - 飞溅效果
        const sparkPS = new ParticleSystem("sparkParticles", 300, scene);
        sparkPS.particleTexture = sparkTexture;
        sparkPS.emitter = emitter;
        sparkPS.minEmitBox = new Vector3(-0.05, -0.05, -0.05);
        sparkPS.maxEmitBox = new Vector3(0.05, 0.05, 0.05);
        sparkPS.color1 = new Color4(1.0, 0.8, 0.3, 1.0);
        sparkPS.color2 = new Color4(1.0, 0.4, 0.8, 1.0);
        sparkPS.colorDead = new Color4(0.5, 0.1, 0.3, 0.0);
        sparkPS.minSize = 0.05;
        sparkPS.maxSize = 0.15;
        sparkPS.minLifeTime = 0.3;
        sparkPS.maxLifeTime = 0.6;
        sparkPS.emitRate = 400;
        sparkPS.blendMode = ParticleSystem.BLENDMODE_ADD;
        sparkPS.minEmitPower = 2;
        sparkPS.maxEmitPower = 5;
        sparkPS.gravity = new Vector3(0, -3, 0);
        sparkPS.direction1 = new Vector3(-1, 1, -1);
        sparkPS.direction2 = new Vector3(1, 2, 1);
        sparkPS.start();
        
        // 尾迹能量流
        const trailPS = new ParticleSystem("trailEnergy", 800, scene);
        trailPS.particleTexture = coreTexture;
        trailPS.emitter = emitter;
        trailPS.minEmitBox = new Vector3(-0.2, -0.15, -0.2);
        trailPS.maxEmitBox = new Vector3(0.2, 0.15, 0.2);
        trailPS.color1 = new Color4(0.7, 0.3, 1.0, 0.9);
        trailPS.color2 = new Color4(0.3, 0.6, 1.0, 0.9);
        trailPS.colorDead = new Color4(0.2, 0.1, 0.5, 0.0);
        trailPS.minSize = 0.1;
        trailPS.maxSize = 0.3;
        trailPS.minLifeTime = 0.25;
        trailPS.maxLifeTime = 0.5;
        trailPS.emitRate = 500;
        trailPS.blendMode = ParticleSystem.BLENDMODE_ADD;
        trailPS.minEmitPower = 0.2;
        trailPS.maxEmitPower = 0.8;
        trailPS.start();
        
        let currentSegment = 0;
        const fps = 60;
        let frameCount = 0;
        
        const sweepObserver = scene.onBeforeRenderObservable.add(() => {
            frameCount++;
            const progress = Math.min(frameCount / (sweepDuration * fps), 1.0);
            const targetSegment = Math.floor(progress * segments);
            const currentAngle = Math.PI * (-0.5 + progress);
            
            // 更新发射器位置
            emitter.position.x = Math.cos(currentAngle) * radius;
            emitter.position.z = Math.sin(currentAngle) * radius;
            
            // 更新光源位置和强度
            slashLight.position.x = emitter.position.x;
            slashLight.position.z = emitter.position.z;
            slashLight.intensity = 3 + Math.sin(frameCount * 0.5) * 1.5;
            
            // 创建分段
            while (currentSegment < targetSegment && currentSegment < segments) {
                // 主弧形分段
                const segmentMesh = this.createArcSegment(scene, radius, arcWidth, currentSegment, segments);
                segmentMesh.parent = rootNode;
                const segMat = createEnergyMaterial(currentSegment, segments);
                segmentMesh.material = segMat;
                if (glowLayer) { glowLayer.addIncludedOnlyMesh(segmentMesh); }
                trailSegments.push({ mesh: segmentMesh, material: segMat, createdAt: frameCount, alpha: 0.95, type: 'main' });
                
                // 内层光晕
                const innerGlow = this.createArcSegment(scene, radius - 0.15, arcWidth * 0.6, currentSegment, segments);
                innerGlow.parent = rootNode;
                const innerMat = new StandardMaterial("innerGlow_" + currentSegment, scene);
                innerMat.emissiveColor = new Color3(1.0, 0.9, 1.0);
                innerMat.alpha = 0.7;
                innerMat.disableLighting = true;
                innerMat.backFaceCulling = false;
                innerGlow.material = innerMat;
                if (glowLayer) { glowLayer.addIncludedOnlyMesh(innerGlow); }
                energyLayers.push({ mesh: innerGlow, material: innerMat, createdAt: frameCount, type: 'inner' });
                
                // 外层扩散光晕
                const outerGlow = this.createArcSegment(scene, radius + 0.25, arcWidth * 1.5, currentSegment, segments);
                outerGlow.parent = rootNode;
                const outerMat = outerGlowMat.clone("outerGlow_" + currentSegment);
                outerGlow.material = outerMat;
                energyLayers.push({ mesh: outerGlow, material: outerMat, createdAt: frameCount, type: 'outer' });
                
                currentSegment++;
            }
            
            // 更新主拖尾淡出
            const trailFrames = trailDuration * fps;
            for (let i = trailSegments.length - 1; i >= 0; i--) {
                const seg = trailSegments[i];
                const age = frameCount - seg.createdAt;
                if (age > trailFrames) {
                    seg.mesh.dispose();
                    seg.material.dispose();
                    trailSegments.splice(i, 1);
                } else {
                    const fadeProgress = age / trailFrames;
                    const pulse = 1 + Math.sin(age * 0.8) * 0.1;
                    seg.material.alpha = 0.95 * (1 - fadeProgress * fadeProgress) * pulse;
                    // 颜色渐变到更深的紫色
                    const colorShift = fadeProgress * 0.5;
                    seg.material.emissiveColor = new Color3(
                        0.6 - colorShift * 0.3,
                        0.3 - colorShift * 0.2,
                        1.0 - colorShift * 0.2
                    );
                }
            }
            
            // 更新能量层淡出
            for (let i = energyLayers.length - 1; i >= 0; i--) {
                const layer = energyLayers[i];
                const age = frameCount - layer.createdAt;
                if (age > trailFrames) {
                    layer.mesh.dispose();
                    layer.material.dispose();
                    energyLayers.splice(i, 1);
                } else {
                    const fadeProgress = age / trailFrames;
                    if (layer.type === 'inner') {
                        layer.material.alpha = 0.7 * (1 - fadeProgress);
                    } else {
                        layer.material.alpha = 0.3 * (1 - fadeProgress * fadeProgress);
                    }
                }
            }
            
            // 停止粒子
            if (progress >= 1.0) {
                if (corePS.isStarted()) corePS.stop();
                if (sparkPS.isStarted()) sparkPS.stop();
                if (trailPS.isStarted()) trailPS.stop();
            }
            
            // 清理
            if (trailSegments.length === 0 && energyLayers.length === 0 && progress >= 1.0) {
                scene.onBeforeRenderObservable.remove(sweepObserver);
                corePS.dispose();
                sparkPS.dispose();
                trailPS.dispose();
                slashLight.dispose();
                emitter.dispose();
                rootNode.dispose();
                console.log("半月斩能量消散");
            }
        });
    }

    createArcSegment(scene, radius, width, segmentIndex, totalSegments) {
        const startAngle = Math.PI * (-0.5 + segmentIndex / totalSegments);
        const endAngle = Math.PI * (-0.5 + (segmentIndex + 1) / totalSegments);
        const innerPath = [];
        const outerPath = [];
        const subSegments = 3;
        for (let i = 0; i <= subSegments; i++) {
            const t = i / subSegments;
            const angle = startAngle + (endAngle - startAngle) * t;
            innerPath.push(new Vector3(Math.cos(angle) * (radius - width / 2), 0, Math.sin(angle) * (radius - width / 2)));
            outerPath.push(new Vector3(Math.cos(angle) * (radius + width / 2), 0, Math.sin(angle) * (radius + width / 2)));
        }
        return MeshBuilder.CreateRibbon("arcSeg_" + segmentIndex, { pathArray: [innerPath, outerPath], closeArray: false, closePath: false }, scene);
    }

    // 核心粒子纹理 - 明亮发光
    createCoreParticleTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext("2d");
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.2, "rgba(220, 180, 255, 0.9)");
        grad.addColorStop(0.5, "rgba(150, 100, 255, 0.5)");
        grad.addColorStop(0.8, "rgba(80, 50, 200, 0.2)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        return Texture.CreateFromBase64String(canvas.toDataURL(), "coreParticle", this.scene);
    }
    
    // 火花纹理 - 细长光点
    createSparkTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 32; canvas.height = 32;
        const ctx = canvas.getContext("2d");
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, "rgba(255, 255, 200, 1)");
        grad.addColorStop(0.3, "rgba(255, 200, 100, 0.8)");
        grad.addColorStop(0.6, "rgba(255, 100, 150, 0.4)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, Math.PI * 2);
        ctx.fill();
        return Texture.CreateFromBase64String(canvas.toDataURL(), "sparkParticle", this.scene);
    }
}

