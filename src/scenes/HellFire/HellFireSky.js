import { MeshBuilder, Vector3, ShaderMaterial, Effect } from "@babylonjs/core";

/**
 * 地狱火半岛风格天空
 * 实现扭曲虚空能量流效果
 */
export class HellfireSky {
    constructor(scene) {
        this.scene = scene;
        this.time = 0;
        this.createSky();
    }

    createSky() {
        // 创建天空球
        this.skybox = MeshBuilder.CreateSphere("hellfireSky", {
            diameter: 1000,
            segments: 32
        }, this.scene);
        
        // 内部可见
        this.skybox.scaling = new Vector3(-1, 1, 1);
        
        // 禁用拾取和阴影
        this.skybox.isPickable = false;
        this.skybox.receiveShadows = false;
        
        // 确保天空球始终在最远处渲染
        this.skybox.infiniteDistance = true;
        
        // 创建自定义Shader材质
        this.createShaderMaterial();
        
        // 动画更新
        this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
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
            
            // 3D噪声函数 - 用于无缝球面
            float hash3(vec3 p) {
                return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
            }
            
            float noise3(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float n000 = hash3(i);
                float n100 = hash3(i + vec3(1.0, 0.0, 0.0));
                float n010 = hash3(i + vec3(0.0, 1.0, 0.0));
                float n110 = hash3(i + vec3(1.0, 1.0, 0.0));
                float n001 = hash3(i + vec3(0.0, 0.0, 1.0));
                float n101 = hash3(i + vec3(1.0, 0.0, 1.0));
                float n011 = hash3(i + vec3(0.0, 1.0, 1.0));
                float n111 = hash3(i + vec3(1.0, 1.0, 1.0));
                
                float n00 = mix(n000, n100, f.x);
                float n01 = mix(n001, n101, f.x);
                float n10 = mix(n010, n110, f.x);
                float n11 = mix(n011, n111, f.x);
                
                float n0 = mix(n00, n10, f.y);
                float n1 = mix(n01, n11, f.y);
                
                return mix(n0, n1, f.z);
            }
            
            // 3D FBM - 无缝
            float fbm3(vec3 p) {
                float value = 0.0;
                float amplitude = 0.5;
                for(int i = 0; i < 5; i++) {
                    value += amplitude * noise3(p);
                    p *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }
            
            void main() {
                // 球面坐标转换
                vec3 dir = normalize(vPosition);
                float phi = atan(dir.z, dir.x) + 3.14159;  // 修正到 0-2π 范围
                float theta = acos(dir.y);
                
                // 基础UV（仅用于渐变，渐变不会有接缝问题）
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
                // 使用3D位置计算噪声，避免UV接缝
                vec3 flowPos = dir * 2.0;
                flowPos.x += time * 0.02;  // 水平流动
                
                // 多层3D噪声创建能量带（无接缝）
                float flow1 = fbm3(flowPos * 2.0 + vec3(time * 0.05, 0.0, 0.0));
                float flow2 = fbm3(flowPos * 3.0 + vec3(0.0, time * 0.03, 0.0));
                float flow3 = fbm3(flowPos * 1.5 + vec3(time * 0.02, time * 0.01, 0.0));
                
                // 能量流条纹方向（基于3D位置）
                float angle = 0.4;
                vec3 rotatedDir = vec3(
                    dir.x * cos(angle) - dir.y * sin(angle),
                    dir.x * sin(angle) + dir.y * cos(angle),
                    dir.z
                );
                
                // 创建条纹状能量流（使用3D位置避免接缝）
                float stripe = sin(rotatedDir.x * 8.0 + rotatedDir.z * 4.0 + flow1 * 2.0 + time * 0.1);
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
                float secondaryFlow = fbm3(dir * vec3(5.0, 3.0, 4.0) + vec3(time * -0.03, time * 0.02, 0.0));
                secondaryFlow = smoothstep(0.4, 0.8, secondaryFlow);
                secondaryFlow *= 0.3;
                
                vec3 secondaryColor = vec3(0.8, 0.9, 0.5);
                
                // === 星云/尘埃效果 ===
                float dust = fbm3(dir * 8.0 + vec3(time * 0.01, 0.0, 0.0));
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

        // 注册Shader
        Effect.ShadersStore["hellfireSkyVertexShader"] = vertexShader;
        Effect.ShadersStore["hellfireSkyFragmentShader"] = fragmentShader;

        // 创建Shader材质
        this.material = new ShaderMaterial("hellfireSkyMaterial", this.scene, {
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
        if (this.renderObserver) {
            this.scene.onBeforeRenderObservable.remove(this.renderObserver);
        }
        if (this.skybox) {
            this.skybox.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
    }
}
