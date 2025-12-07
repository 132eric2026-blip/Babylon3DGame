# 地狱火半岛天空效果实现方案

## 效果分析

魔兽世界地狱火半岛天空包含以下视觉元素：

### 1. 扭曲虚空能量流（黄色气流）
- **本质**：扭曲虚空（Twisting Nether）的能量流，是外域破碎世界的标志性视觉
- **特点**：
  - 黄绿色发光条纹
  - 具有流动感和飘动效果
  - 边缘柔和，有光晕扩散
  - 像极光但更具能量感

### 2. 天空渐变层
- 深紫色（天空边缘/远处）
- 暗红色/褐红色（中层）
- 黄绿色能量流（穿透整个天空）
- 暗色调的星云感

---

## Babylon.js 实现方案

### 方案一：自定义Shader天空球（推荐）

```javascript
// HellfireSky.js
import * as BABYLON from '@babylonjs/core';

export class HellfireSky {
    constructor(scene) {
        this.scene = scene;
        this.time = 0;
        this.createSky();
    }

    createSky() {
        // 创建天空球
        this.skybox = BABYLON.MeshBuilder.CreateSphere("hellfireSky", {
            diameter: 1000,
            segments: 32
        }, this.scene);
        
        // 内部可见
        this.skybox.scaling = new BABYLON.Vector3(-1, 1, 1);
        
        // 创建自定义Shader材质
        this.createShaderMaterial();
        
        // 动画更新
        this.scene.onBeforeRenderObservable.add(() => {
            this.time += this.scene.getEngine().getDeltaTime() * 0.001;
            if (this.material) {
                this.material.setFloat("time", this.time);
            }
        });
    }

    createShaderMaterial() {
        // 顶点着色器
        const vertexShader = `
            precision highp float;
            
            attribute vec3 position;
            attribute vec2 uv;
            
            uniform mat4 worldViewProjection;
            
            varying vec3 vPosition;
            varying vec2 vUV;
            
            void main() {
                vPosition = position;
                vUV = uv;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;

        // 片段着色器
        const fragmentShader = `
            precision highp float;
            
            varying vec3 vPosition;
            varying vec2 vUV;
            
            uniform float time;
            
            // 噪声函数
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            
            // FBM噪声（多层叠加）
            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                for(int i = 0; i < 5; i++) {
                    value += amplitude * noise(p);
                    p *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }
            
            void main() {
                // 球面坐标转换
                vec3 dir = normalize(vPosition);
                float phi = atan(dir.z, dir.x);
                float theta = acos(dir.y);
                
                // 基础UV
                vec2 skyUV = vec2(phi / 6.28318, theta / 3.14159);
                
                // === 天空渐变背景 ===
                // 深紫色到暗红色渐变
                vec3 colorTop = vec3(0.1, 0.02, 0.15);      // 深紫色
                vec3 colorMid = vec3(0.25, 0.05, 0.1);      // 暗红色
                vec3 colorBottom = vec3(0.3, 0.1, 0.05);    // 褐红色
                
                float heightFactor = 1.0 - skyUV.y;
                vec3 skyColor = mix(colorBottom, colorMid, smoothstep(0.0, 0.5, heightFactor));
                skyColor = mix(skyColor, colorTop, smoothstep(0.5, 1.0, heightFactor));
                
                // === 扭曲虚空能量流 ===
                // 能量流UV（添加时间动画）
                vec2 flowUV = skyUV * vec2(3.0, 2.0);
                flowUV.x += time * 0.02;  // 水平流动
                
                // 多层噪声创建能量带
                float flow1 = fbm(flowUV * 2.0 + vec2(time * 0.05, 0.0));
                float flow2 = fbm(flowUV * 3.0 + vec2(0.0, time * 0.03));
                float flow3 = fbm(flowUV * 1.5 + vec2(time * 0.02, time * 0.01));
                
                // 能量流条纹方向（斜向）
                float angle = 0.4;  // 倾斜角度
                vec2 rotatedUV = vec2(
                    skyUV.x * cos(angle) - skyUV.y * sin(angle),
                    skyUV.x * sin(angle) + skyUV.y * cos(angle)
                );
                
                // 创建条纹状能量流
                float stripe = sin(rotatedUV.x * 8.0 + flow1 * 2.0 + time * 0.1);
                stripe = smoothstep(0.3, 0.7, stripe);
                
                // 能量流强度（基于噪声调制）
                float energyIntensity = flow1 * flow2 * 2.0;
                energyIntensity *= stripe;
                energyIntensity *= smoothstep(0.8, 0.3, skyUV.y);  // 地平线附近更强
                
                // 能量流颜色（黄绿色）
                vec3 energyColorCore = vec3(1.0, 0.95, 0.4);    // 亮黄色核心
                vec3 energyColorEdge = vec3(0.6, 0.8, 0.2);     // 黄绿色边缘
                vec3 energyColor = mix(energyColorEdge, energyColorCore, energyIntensity);
                
                // === 次级能量流 ===
                float secondaryFlow = fbm(skyUV * vec2(5.0, 3.0) + vec2(time * -0.03, time * 0.02));
                secondaryFlow = smoothstep(0.4, 0.8, secondaryFlow);
                secondaryFlow *= 0.3;
                
                vec3 secondaryColor = vec3(0.8, 0.9, 0.5);
                
                // === 星云/尘埃效果 ===
                float dust = fbm(skyUV * 8.0 + time * 0.01);
                dust = smoothstep(0.4, 0.7, dust) * 0.15;
                vec3 dustColor = vec3(0.5, 0.2, 0.3);
                
                // === 合成最终颜色 ===
                vec3 finalColor = skyColor;
                
                // 添加尘埃
                finalColor = mix(finalColor, dustColor, dust);
                
                // 添加能量流（使用加法混合产生发光效果）
                finalColor += energyColor * energyIntensity * 0.8;
                finalColor += secondaryColor * secondaryFlow;
                
                // 添加边缘发光
                float glow = energyIntensity * 0.3;
                finalColor += vec3(1.0, 0.9, 0.5) * glow;
                
                // 色调调整
                finalColor = pow(finalColor, vec3(0.9));  // 轻微提亮
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        // 创建Shader材质
        BABYLON.Effect.ShadersStore["hellfireSkyVertexShader"] = vertexShader;
        BABYLON.Effect.ShadersStore["hellfireSkyFragmentShader"] = fragmentShader;

        this.material = new BABYLON.ShaderMaterial("hellfireSkyMaterial", this.scene, {
            vertex: "hellfireSky",
            fragment: "hellfireSky"
        }, {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection", "time"]
        });

        this.material.backFaceCulling = false;
        this.skybox.material = this.material;
    }

    dispose() {
        if (this.skybox) {
            this.skybox.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
    }
}
```

---

### 方案二：多层天空盒 + 粒子系统

适合需要更多控制的情况：

```javascript
// HellfireSkyLayered.js
import * as BABYLON from '@babylonjs/core';

export class HellfireSkyLayered {
    constructor(scene) {
        this.scene = scene;
        this.createLayers();
    }

    createLayers() {
        // 第一层：基础渐变天空盒
        this.createGradientSkybox();
        
        // 第二层：能量流粒子系统
        this.createEnergyStreams();
        
        // 第三层：光晕/雾气效果
        this.createAtmosphericGlow();
    }

    createGradientSkybox() {
        // 使用程序化纹理创建渐变天空
        const dynamicTexture = new BABYLON.DynamicTexture("skyGradient", {
            width: 512,
            height: 512
        }, this.scene);

        const ctx = dynamicTexture.getContext();
        
        // 创建渐变
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#1a0528');      // 深紫色顶部
        gradient.addColorStop(0.3, '#3d0d1a');    // 暗红色
        gradient.addColorStop(0.6, '#4a1a0f');    // 褐红色
        gradient.addColorStop(1, '#2a1008');      // 暗褐色底部
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        dynamicTexture.update();

        // 创建天空球
        this.baseSky = BABYLON.MeshBuilder.CreateSphere("baseSky", {
            diameter: 900,
            segments: 32
        }, this.scene);
        this.baseSky.scaling.x = -1;

        const baseMaterial = new BABYLON.StandardMaterial("baseSkyMat", this.scene);
        baseMaterial.diffuseTexture = dynamicTexture;
        baseMaterial.emissiveTexture = dynamicTexture;
        baseMaterial.backFaceCulling = false;
        baseMaterial.disableLighting = true;
        this.baseSky.material = baseMaterial;
    }

    createEnergyStreams() {
        // 使用粒子系统创建能量流
        const particleSystem = new BABYLON.ParticleSystem("energyStream", 2000, this.scene);
        
        // 使用程序化粒子纹理
        particleSystem.particleTexture = this.createEnergyTexture();
        
        // 发射器设置（环绕天空）
        particleSystem.emitter = new BABYLON.Vector3(0, 50, 0);
        particleSystem.minEmitBox = new BABYLON.Vector3(-200, 0, -200);
        particleSystem.maxEmitBox = new BABYLON.Vector3(200, 100, 200);
        
        // 粒子属性
        particleSystem.color1 = new BABYLON.Color4(1, 0.95, 0.4, 0.8);
        particleSystem.color2 = new BABYLON.Color4(0.6, 0.8, 0.2, 0.6);
        particleSystem.colorDead = new BABYLON.Color4(0.3, 0.5, 0.1, 0);
        
        particleSystem.minSize = 20;
        particleSystem.maxSize = 80;
        
        particleSystem.minLifeTime = 5;
        particleSystem.maxLifeTime = 10;
        
        particleSystem.emitRate = 50;
        
        // 流动方向
        particleSystem.direction1 = new BABYLON.Vector3(-1, 0.2, 0.5);
        particleSystem.direction2 = new BABYLON.Vector3(-0.5, 0.3, 1);
        
        particleSystem.minEmitPower = 5;
        particleSystem.maxEmitPower = 15;
        
        // 混合模式（加法发光）
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        particleSystem.start();
        this.energyParticles = particleSystem;
    }

    createEnergyTexture() {
        const size = 128;
        const dynamicTexture = new BABYLON.DynamicTexture("energyTex", size, this.scene);
        const ctx = dynamicTexture.getContext();
        
        // 创建柔和的发光点
        const gradient = ctx.createRadialGradient(
            size/2, size/2, 0,
            size/2, size/2, size/2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 240, 100, 0.8)');
        gradient.addColorStop(0.7, 'rgba(200, 220, 80, 0.3)');
        gradient.addColorStop(1, 'rgba(100, 150, 50, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        dynamicTexture.update();
        
        return dynamicTexture;
    }

    createAtmosphericGlow() {
        // 创建光晕层
        const glowLayer = new BABYLON.GlowLayer("skyGlow", this.scene, {
            mainTextureFixedSize: 512,
            blurKernelSize: 64
        });
        glowLayer.intensity = 0.5;
    }

    dispose() {
        if (this.baseSky) this.baseSky.dispose();
        if (this.energyParticles) this.energyParticles.dispose();
    }
}
```

---

### 方案三：节点材质编辑器（Node Material）

使用Babylon.js的可视化节点材质系统：

```javascript
// 使用Node Material Editor创建
// 访问 https://nme.babylonjs.com/ 可视化编辑

import * as BABYLON from '@babylonjs/core';

export async function createHellfireSkyNME(scene) {
    // 加载预制的节点材质
    const nodeMaterial = await BABYLON.NodeMaterial.ParseFromSnippetAsync(
        "YOUR_SNIPPET_ID",  // 从NME导出的ID
        scene
    );
    
    // 或者通过代码构建节点材质
    const nodeMat = new BABYLON.NodeMaterial("hellfireNME", scene);
    
    // 构建节点图...
    // (此处省略详细节点配置)
    
    return nodeMat;
}
```

---

## 场景集成示例

```javascript
// DefaultScene.js 中使用
import { HellfireSky } from './HellfireSky.js';

export class DefaultScene {
    constructor(engine, canvas) {
        this.scene = new BABYLON.Scene(engine);
        
        // 创建地狱火天空
        this.hellfireSky = new HellfireSky(this.scene);
        
        // 配套的环境光设置
        this.setupLighting();
    }
    
    setupLighting() {
        // 主光源（模拟能量流的漫反射光）
        const mainLight = new BABYLON.HemisphericLight(
            "mainLight",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        mainLight.intensity = 0.6;
        mainLight.diffuse = new BABYLON.Color3(0.9, 0.7, 0.4);      // 暖黄色
        mainLight.groundColor = new BABYLON.Color3(0.3, 0.1, 0.15); // 紫红色地面反光
        
        // 方向光（模拟能量流方向）
        const dirLight = new BABYLON.DirectionalLight(
            "dirLight",
            new BABYLON.Vector3(-1, -0.5, 0.5),
            this.scene
        );
        dirLight.intensity = 0.4;
        dirLight.diffuse = new BABYLON.Color3(1, 0.9, 0.5);
        
        // 环境颜色
        this.scene.ambientColor = new BABYLON.Color3(0.2, 0.1, 0.15);
        this.scene.clearColor = new BABYLON.Color4(0.1, 0.02, 0.08, 1);
        
        // 可选：添加雾效果
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.001;
        this.scene.fogColor = new BABYLON.Color3(0.3, 0.15, 0.1);
    }
}
```

---

## 关键技术要点

### 1. 能量流效果核心
- **FBM噪声**：多层Perlin噪声叠加，创建自然的流动纹理
- **条纹调制**：使用sin函数创建条纹，噪声扰动边缘
- **时间动画**：UV偏移 + 噪声参数变化

### 2. 颜色方案
```
深紫色: #1a0528 / RGB(26, 5, 40)
暗红色: #3d0d1a / RGB(61, 13, 26)
褐红色: #4a1a0f / RGB(74, 26, 15)
能量黄: #fff066 / RGB(255, 240, 102)
能量绿: #99cc33 / RGB(153, 204, 51)
```

### 3. 性能优化
- 天空球使用低面数（32 segments足够）
- Shader中避免过多循环迭代
- 粒子系统限制数量（1000-2000）
- 考虑使用LOD对远距离简化

---

## 扩展效果

### 添加闪电/能量爆发
```javascript
// 随机能量闪烁
createLightningFlash() {
    setInterval(() => {
        if (Math.random() > 0.95) {
            this.material.setFloat("flashIntensity", 1.0);
            setTimeout(() => {
                this.material.setFloat("flashIntensity", 0.0);
            }, 100);
        }
    }, 500);
}
```

### 添加星星/碎片
```javascript
// 在能量流中添加发光碎片粒子
createDebrisParticles() {
    // 小型快速粒子，模拟被能量流携带的碎片
}
```

---

## 参考资源

- [Babylon.js Shader材质文档](https://doc.babylonjs.com/features/featuresDeepDive/materials/shaders)
- [Node Material Editor](https://nme.babylonjs.com/)
- [Babylon.js粒子系统](https://doc.babylonjs.com/features/featuresDeepDive/particles)
- [GLSL噪声函数参考](https://thebookofshaders.com/11/)
