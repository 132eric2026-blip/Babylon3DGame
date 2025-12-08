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
    PointLight,
    ShaderMaterial,
    Effect
} from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

// 注册 Shader
Effect.ShadersStore["halfMoonEnergyVertexShader"] = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    uniform mat4 worldViewProjection;
    uniform float time;
    uniform float segmentIndex;
    uniform float totalSegments;

    varying vec2 vUV;
    varying float vGlobalU;

    void main() {
        vec3 p = position;
        // 简单的呼吸膨胀
        float pulse = sin(time * 15.0 + p.x) * 0.03;
        p += normal * pulse;
        
        gl_Position = worldViewProjection * vec4(p, 1.0);
        vUV = uv;
        // 计算全局 U 坐标，用于连续的纹理流动
        vGlobalU = (uv.x + segmentIndex) / totalSegments;
    }
`;

Effect.ShadersStore["halfMoonEnergyFragmentShader"] = `
    precision highp float;
    varying vec2 vUV;
    varying float vGlobalU;
    
    uniform float time;
    uniform vec3 colorCore;
    uniform vec3 colorEdge;
    uniform float alphaMultiplier;

    // 伪随机
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // 噪声
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    // FBM
    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 3; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        // 能量流动 - 使用全局 U 坐标
        vec2 flowUV = vec2(vGlobalU * 10.0 - time * 3.0, vUV.y);
        
        float energy = fbm(flowUV * 2.0);
        
        // 边缘光 (纵向)
        float distFromCenter = abs(vUV.y - 0.5) * 2.0;
        float core = 1.0 - distFromCenter;
        core = pow(core, 2.0); 
        
        // 动态闪电纹路
        float lightning = 1.0 - smoothstep(0.02, 0.05, abs(vUV.y - 0.5 + (energy - 0.5) * 0.5));
        
        // 混合颜色
        vec3 finalColor = mix(colorEdge, colorCore, core);
        finalColor += vec3(0.8, 0.9, 1.0) * lightning * 2.0; // 亮白闪电
        finalColor += colorCore * energy; // 能量底色

        // 透明度
        float alpha = (core * 0.8 + lightning + energy * 0.2) * alphaMultiplier;
        
        // 边缘硬切避免锯齿
        if (alpha < 0.01) discard;
        
        gl_FragColor = vec4(finalColor, alpha);
    }
`;

export class HalfMoonSlash extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "半月斩", 0.2);
    }

    execute() {
        const playerPos = this.player.mesh.position.clone();
        const playerRotation = this.getPlayerRotation();
        this.createSweepingCrescent(playerPos, playerRotation);
        this.checkHits(playerPos, playerRotation);
    }

    checkHits(origin, rotation) {
        const radius = 3.0; // 攻击半径
        const angleLimit = Math.PI * 0.8; // 攻击扇形角度
        
        const forward = new Vector3(Math.sin(rotation), 0, Math.cos(rotation));
        
        // 查找场景中所有的敌人
        // 也可以优化为使用 octree 或者专门的 enemy manager
        this.scene.meshes.forEach(mesh => {
            if (mesh.metadata && mesh.metadata.type === "enemy" && mesh.metadata.instance && !mesh.metadata.instance.isDead) {
                const enemyPos = mesh.absolutePosition ? mesh.absolutePosition.clone() : mesh.position.clone();
                // 忽略高度差，只计算水平距离
                enemyPos.y = origin.y;
                
                const diff = enemyPos.subtract(origin);
                const dist = diff.length();
                
                if (dist < radius) {
                    diff.normalize();
                    const dot = Vector3.Dot(forward, diff);
                    // 防止精度问题导致 acos NaN
                    const clampedDot = Math.max(-1, Math.min(1, dot));
                    const angle = Math.acos(clampedDot);
                    
                    if (angle < angleLimit / 2) {
                        mesh.metadata.instance.die();
                    }
                }
            }
        });
    }

    getPlayerRotation() {
        const f = this.player.mesh.getDirection(Vector3.Forward());
        return Math.atan2(f.x, f.z);
    }

    createSweepingCrescent(position, rotation) {
        const scene = this.scene;
        const glowLayer = this.player.glowLayer;
        const radius = 1.8;
        const arcWidth = 0.1;
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
        
        // 主能量材质 - 使用 ShaderMaterial
        const createEnergyMaterial = (index, total) => {
            const mat = new ShaderMaterial("energyMat_" + index, scene, {
                vertex: "halfMoonEnergy",
                fragment: "halfMoonEnergy",
            },
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["worldViewProjection", "time", "colorCore", "colorEdge", "alphaMultiplier", "segmentIndex", "totalSegments"],
                needAlphaBlending: true
            });
            
            const t = index / total;
            // 紫色(0.8, 0.2, 1.0) 到 青色(0.2, 0.8, 1.0) 渐变
            const r = 0.8 - 0.6 * t;
            const g = 0.2 + 0.6 * t;
            const b = 1.0;

            mat.setColor3("colorCore", new Color3(r, g, b));
            mat.setColor3("colorEdge", new Color3(r * 0.4, g * 0.4, b * 0.8));
            mat.setFloat("alphaMultiplier", 1.0);
            mat.setFloat("segmentIndex", index);
            mat.setFloat("totalSegments", total);
            mat.setFloat("time", 0);
            
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
        const corePS = new ParticleSystem("coreParticles", 600, scene);
        corePS.particleTexture = coreTexture;
        corePS.emitter = emitter;
        corePS.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
        corePS.maxEmitBox = new Vector3(0.1, 0.1, 0.1);
        corePS.color1 = new Color4(1.0, 0.9, 1.0, 1.0);
        corePS.color2 = new Color4(0.8, 0.5, 1.0, 1.0);
        corePS.colorDead = new Color4(0.4, 0.1, 0.8, 0.0);
        corePS.minSize = 0.3;
        corePS.maxSize = 0.6;
        corePS.minLifeTime = 0.2;
        corePS.maxLifeTime = 0.4;
        corePS.emitRate = 800;
        corePS.blendMode = ParticleSystem.BLENDMODE_ADD;
        corePS.minEmitPower = 1.0;
        corePS.maxEmitPower = 2.0;
        corePS.start();
        
        // 火花粒子 - 飞溅效果
        const sparkPS = new ParticleSystem("sparkParticles", 500, scene);
        sparkPS.particleTexture = sparkTexture;
        sparkPS.emitter = emitter;
        sparkPS.minEmitBox = new Vector3(-0.05, -0.05, -0.05);
        sparkPS.maxEmitBox = new Vector3(0.05, 0.05, 0.05);
        sparkPS.color1 = new Color4(0.8, 0.6, 1.0, 1.0); // 亮紫色
        sparkPS.color2 = new Color4(0.4, 0.2, 1.0, 1.0); // 深紫色
        sparkPS.colorDead = new Color4(0.1, 0.0, 0.3, 0.0); // 消失时的暗紫色
        sparkPS.minSize = 0.08;
        sparkPS.maxSize = 0.2;
        sparkPS.minLifeTime = 0.4;
        sparkPS.maxLifeTime = 0.8;
        sparkPS.emitRate = 600;
        sparkPS.blendMode = ParticleSystem.BLENDMODE_ADD;
        sparkPS.minEmitPower = 3;
        sparkPS.maxEmitPower = 7;
        sparkPS.gravity = new Vector3(0, -5, 0);
        sparkPS.direction1 = new Vector3(-1, 0.5, -1);
        sparkPS.direction2 = new Vector3(1, 2, 1);
        sparkPS.start();
        
        // 尾迹能量流
        const trailPS = new ParticleSystem("trailEnergy", 1000, scene);
        trailPS.particleTexture = coreTexture;
        trailPS.emitter = emitter;
        trailPS.minEmitBox = new Vector3(-0.2, -0.15, -0.2);
        trailPS.maxEmitBox = new Vector3(0.2, 0.15, 0.2);
        trailPS.color1 = new Color4(0.6, 0.2, 1.0, 0.8);
        trailPS.color2 = new Color4(0.2, 0.5, 1.0, 0.8);
        trailPS.colorDead = new Color4(0.1, 0.0, 0.3, 0.0);
        trailPS.minSize = 0.15;
        trailPS.maxSize = 0.4;
        trailPS.minLifeTime = 0.3;
        trailPS.maxLifeTime = 0.6;
        trailPS.emitRate = 800;
        trailPS.blendMode = ParticleSystem.BLENDMODE_ADD;
        trailPS.minEmitPower = 0.5;
        trailPS.maxEmitPower = 1.5;
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
            const currentTime = frameCount * 0.02;
            
            for (let i = trailSegments.length - 1; i >= 0; i--) {
                const seg = trailSegments[i];
                const age = frameCount - seg.createdAt;
                
                // 更新 Shader 时间
                if (seg.material instanceof ShaderMaterial) {
                    seg.material.setFloat("time", currentTime);
                }

                if (age > trailFrames) {
                    seg.mesh.dispose();
                    seg.material.dispose();
                    trailSegments.splice(i, 1);
                } else {
                    const fadeProgress = age / trailFrames;
                    const pulse = 1 + Math.sin(age * 0.8) * 0.1;
                    
                    if (seg.material instanceof ShaderMaterial) {
                        // ShaderMaterial 使用 alphaMultiplier
                        const alphaVal = 1.0 * (1 - fadeProgress * fadeProgress) * pulse;
                        seg.material.setFloat("alphaMultiplier", alphaVal);
                    } else {
                        // 兼容其他材质 (如果有)
                        seg.material.alpha = 0.95 * (1 - fadeProgress * fadeProgress) * pulse;
                        // 颜色渐变到更深的紫色
                        const colorShift = fadeProgress * 0.5;
                        if (seg.material.emissiveColor) {
                            seg.material.emissiveColor = new Color3(
                                0.6 - colorShift * 0.3,
                                0.3 - colorShift * 0.2,
                                1.0 - colorShift * 0.2
                            );
                        }
                    }
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
        grad.addColorStop(0, "rgba(220, 220, 255, 1)"); // 亮白偏蓝
        grad.addColorStop(0.3, "rgba(180, 100, 255, 0.8)"); // 亮紫色
        grad.addColorStop(0.6, "rgba(100, 50, 200, 0.4)"); // 深紫色
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, Math.PI * 2);
        ctx.fill();
        return Texture.CreateFromBase64String(canvas.toDataURL(), "sparkParticle", this.scene);
    }
}
