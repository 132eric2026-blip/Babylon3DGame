/**
 * 纳格兰天空效果
 * 魔兽世界燃烧的远征 - 纳格兰风格天空
 * 特点：紫粉色天空、闪烁星星、流动云彩、发光星云光带
 */
import {
    MeshBuilder,
    ShaderMaterial,
    Vector3,
    Color3,
    Effect
} from "@babylonjs/core";
import { NagrandConfig } from "./config";

export class NagrandSky {
    constructor(scene) {
        this.scene = scene;
        this.skyMesh = null;
        this.skyMaterial = null;
        this.time = 0;
    }

    /**
     * 创建纳格兰天空
     */
    create() {
        this._registerShaders();
        this._createSkyDome();
        this._startAnimation();
        return this.skyMesh;
    }

    /**
     * 注册自定义着色器
     */
    _registerShaders() {
        // 顶点着色器
        Effect.ShadersStore["nagrandSkyVertexShader"] = `
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

        // 片段着色器 - 纳格兰天空效果
        Effect.ShadersStore["nagrandSkyFragmentShader"] = `
            precision highp float;
            
            varying vec3 vPosition;
            varying vec2 vUV;
            
            uniform float uTime;
            uniform vec3 uZenithColor;
            uniform vec3 uHorizonColor;
            uniform vec3 uNebulaColor;
            uniform vec3 uNebulaCoreColor;
            uniform vec3 uCloudColor;
            uniform float uStarDensity;
            uniform float uStarBrightness;
            uniform float uCloudOpacity;
            uniform float uNebulaIntensity;
            uniform float uNebulaWidth;
            
            // 噪声函数
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            
            float hash3(vec3 p) {
                return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
            }
            
            // 2D噪声
            float noise2D(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            
            // 3D噪声
            float noise3D(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float n = mix(
                    mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
                        mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
                    mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
                        mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
                    f.z
                );
                return n;
            }
            
            // 分形布朗运动 - 用于云层（优化：减少迭代）
            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for(int i = 0; i < 3; i++) {
                    value += amplitude * noise2D(p * frequency);
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                return value;
            }
            
            // 3D分形布朗运动 - 用于星云（优化：减少迭代）
            float fbm3D(vec3 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for(int i = 0; i < 2; i++) {
                    value += amplitude * noise3D(p * frequency);
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                return value;
            }
            
            // 星星生成（优化：简化算法）
            float stars(vec3 dir) {
                vec3 p = dir * 200.0;
                vec3 i = floor(p);
                vec3 f = fract(p);
                
                // 只检查当前格子
                float starRandom = hash3(i);
                if(starRandom > 1.0 - uStarDensity * 3.0) {
                    vec3 starPos = vec3(
                        hash3(i + vec3(1.0, 0.0, 0.0)),
                        hash3(i + vec3(0.0, 1.0, 0.0)),
                        hash3(i + vec3(0.0, 0.0, 1.0))
                    ) * 0.6 + 0.2;
                    
                    float dist = length(f - starPos);
                    float twinkle = sin(uTime * 2.0 + hash3(i) * 6.28) * 0.3 + 0.7;
                    float brightness = hash3(i + vec3(100.0)) * 0.5 + 0.5;
                    
                    return smoothstep(0.08, 0.0, dist) * brightness * twinkle * uStarBrightness;
                }
                return 0.0;
            }
            
            // 云层生成
            float clouds(vec3 dir, float time) {
                // 将方向转换为球面坐标用于云层采样
                float theta = atan(dir.z, dir.x);
                float phi = asin(clamp(dir.y, -1.0, 1.0));
                
                vec2 cloudUV = vec2(theta * 0.5 + time * 0.02, phi * 2.0);
                
                // 多层云效果
                float cloud1 = fbm(cloudUV * 3.0 + time * 0.01);
                float cloud2 = fbm(cloudUV * 5.0 - time * 0.015);
                
                float cloudVal = cloud1 * 0.6 + cloud2 * 0.4;
                
                // 云层形状调整 - 更集中在地平线附近
                float horizonMask = 1.0 - abs(dir.y);
                horizonMask = pow(horizonMask, 0.5);
                
                cloudVal = smoothstep(0.4, 0.7, cloudVal) * horizonMask;
                
                return cloudVal * uCloudOpacity;
            }
            
            // 星云/光带生成（优化：简化计算）
            vec3 nebula(vec3 dir, float time) {
                // 星云主轴 - 斜穿天空
                vec3 nebulaAxis = normalize(vec3(0.7, 0.3, 0.5));
                
                // 计算到主轴的距离
                float distToAxis = length(cross(dir, nebulaAxis));
                
                // 主光带
                float mainBand = exp(-distToAxis * distToAxis / (uNebulaWidth * uNebulaWidth));
                
                // 简化的噪声扰动
                float noiseVal = noise3D(dir * 5.0 + vec3(time * 0.05));
                mainBand *= 0.6 + noiseVal * 0.4;
                
                // 次级光带（简化）
                vec3 nebulaAxis2 = normalize(vec3(-0.5, 0.4, 0.7));
                float distToAxis2 = length(cross(dir, nebulaAxis2));
                float secondBand = exp(-distToAxis2 * distToAxis2 / (uNebulaWidth * uNebulaWidth * 2.0)) * 0.3;
                
                // 组合光带
                float totalNebula = mainBand + secondBand;
                
                // 核心更亮
                float core = pow(mainBand, 2.0);
                
                // 颜色混合
                vec3 nebulaColor = mix(uNebulaColor, uNebulaCoreColor, core);
                
                return nebulaColor * totalNebula * uNebulaIntensity;
            }
            
            // 黄色极光/能量带生成 - 条状效果
            vec3 aurora(vec3 dir, float time) {
                // 极光颜色 - 金黄/橙色
                vec3 auroraColor1 = vec3(1.0, 0.9, 0.35);
                vec3 auroraColor2 = vec3(1.0, 0.7, 0.25);
                vec3 auroraColor3 = vec3(0.95, 1.0, 0.5);
                
                vec3 totalAurora = vec3(0.0);
                
                // 第一条极光带
                {
                    vec3 auroraAxis = normalize(vec3(0.95, 0.1, -0.2));
                    float distToAxis = length(cross(dir, auroraAxis));
                    
                    // 窄的条状带
                    float bandWidth = 0.08;
                    float band = exp(-distToAxis * distToAxis / (bandWidth * bandWidth));
                    
                    // 沿轴向的波动 - 创建条纹效果
                    float axisPos = dot(dir, auroraAxis);
                    float stripe = sin(axisPos * 15.0 + time * 0.5) * 0.5 + 0.5;
                    stripe *= sin(axisPos * 25.0 - time * 0.3) * 0.3 + 0.7;
                    
                    // 流动效果
                    float flow = noise2D(vec2(axisPos * 8.0 + time * 0.2, distToAxis * 10.0));
                    
                    float aurora1 = band * stripe * (0.7 + flow * 0.3);
                    totalAurora += auroraColor1 * aurora1 * 2.5;
                }
                
                // 第二条极光带
                {
                    vec3 auroraAxis = normalize(vec3(-0.8, 0.2, 0.5));
                    float distToAxis = length(cross(dir, auroraAxis));
                    
                    float bandWidth = 0.1;
                    float band = exp(-distToAxis * distToAxis / (bandWidth * bandWidth));
                    
                    float axisPos = dot(dir, auroraAxis);
                    float stripe = sin(axisPos * 12.0 + time * 0.4) * 0.5 + 0.5;
                    stripe *= sin(axisPos * 20.0 - time * 0.25) * 0.3 + 0.7;
                    
                    float flow = noise2D(vec2(axisPos * 6.0 + time * 0.15, distToAxis * 8.0));
                    
                    float aurora2 = band * stripe * (0.7 + flow * 0.3);
                    totalAurora += auroraColor2 * aurora2 * 2.0;
                }
                
                // 第三条细极光带
                {
                    vec3 auroraAxis = normalize(vec3(0.6, 0.25, 0.7));
                    float distToAxis = length(cross(dir, auroraAxis));
                    
                    float bandWidth = 0.06;
                    float band = exp(-distToAxis * distToAxis / (bandWidth * bandWidth));
                    
                    float axisPos = dot(dir, auroraAxis);
                    float stripe = sin(axisPos * 18.0 + time * 0.6) * 0.5 + 0.5;
                    
                    float aurora3 = band * stripe;
                    totalAurora += auroraColor3 * aurora3 * 1.5;
                }
                
                // 只在天空上半部分显示
                float skyMask = smoothstep(-0.05, 0.15, dir.y);
                
                return totalAurora * skyMask;
            }
            
            void main() {
                vec3 dir = normalize(vPosition);
                
                // 1. 基础天空渐变 - 从天顶到地平线
                float gradientFactor = pow(1.0 - max(0.0, dir.y), 1.5);
                vec3 skyColor = mix(uZenithColor, uHorizonColor, gradientFactor);
                
                // 2. 添加星星
                float starVal = stars(dir);
                skyColor += vec3(1.0, 0.95, 1.0) * starVal;
                
                // 3. 添加星云光带
                vec3 nebulaColor = nebula(dir, uTime);
                skyColor += nebulaColor;
                
                // 4. 添加黄色极光
                vec3 auroraColor = aurora(dir, uTime);
                skyColor += auroraColor;
                
                // 5. 添加云层
                float cloudVal = clouds(dir, uTime);
                skyColor = mix(skyColor, uCloudColor, cloudVal * 0.6);
                
                // 6. 地平线发光效果
                float horizonGlow = exp(-abs(dir.y) * 3.0) * 0.2;
                skyColor += uHorizonColor * horizonGlow;
                
                // 7. 整体色调调整
                skyColor = pow(skyColor, vec3(0.9));
                
                gl_FragColor = vec4(skyColor, 1.0);
            }
        `;
    }

    /**
     * 创建天空球体
     */
    _createSkyDome() {
        const skyConfig = NagrandConfig.sky;
        
        // 创建大型球体作为天空
        this.skyMesh = MeshBuilder.CreateSphere("nagrandSky", {
            diameter: 500,
            segments: 32,  // 优化：减少分段数
            sideOrientation: 1 // 内面可见
        }, this.scene);
        
        // 创建着色器材质
        this.skyMaterial = new ShaderMaterial("nagrandSkyMat", this.scene, {
            vertex: "nagrandSky",
            fragment: "nagrandSky"
        }, {
            attributes: ["position", "uv"],
            uniforms: [
                "worldViewProjection", "uTime",
                "uZenithColor", "uHorizonColor",
                "uNebulaColor", "uNebulaCoreColor", "uCloudColor",
                "uStarDensity", "uStarBrightness",
                "uCloudOpacity", "uNebulaIntensity", "uNebulaWidth"
            ]
        });
        
        // 设置uniform值
        const zenith = skyConfig.colors.zenith;
        const horizon = skyConfig.colors.horizon;
        const nebula = skyConfig.nebula;
        const cloud = skyConfig.clouds;
        const stars = skyConfig.stars;
        
        this.skyMaterial.setVector3("uZenithColor", new Vector3(zenith.r, zenith.g, zenith.b));
        this.skyMaterial.setVector3("uHorizonColor", new Vector3(horizon.r, horizon.g, horizon.b));
        this.skyMaterial.setVector3("uNebulaColor", new Vector3(nebula.color.r, nebula.color.g, nebula.color.b));
        this.skyMaterial.setVector3("uNebulaCoreColor", new Vector3(nebula.coreColor.r, nebula.coreColor.g, nebula.coreColor.b));
        this.skyMaterial.setVector3("uCloudColor", new Vector3(cloud.color.r, cloud.color.g, cloud.color.b));
        this.skyMaterial.setFloat("uStarDensity", stars.density);
        this.skyMaterial.setFloat("uStarBrightness", stars.brightness);
        this.skyMaterial.setFloat("uCloudOpacity", cloud.opacity);
        this.skyMaterial.setFloat("uNebulaIntensity", nebula.intensity);
        this.skyMaterial.setFloat("uNebulaWidth", nebula.width);
        this.skyMaterial.setFloat("uTime", 0);
        
        // 禁用背面剔除、深度写入
        this.skyMaterial.backFaceCulling = false;
        this.skyMaterial.disableDepthWrite = true;
        
        this.skyMesh.material = this.skyMaterial;
        this.skyMesh.infiniteDistance = true;
        this.skyMesh.renderingGroupId = 0;
    }

    /**
     * 启动动画循环
     */
    _startAnimation() {
        this.scene.registerBeforeRender(() => {
            this.time += this.scene.getEngine().getDeltaTime() * 0.001;
            if (this.skyMaterial) {
                this.skyMaterial.setFloat("uTime", this.time);
            }
        });
    }

    /**
     * 更新天空参数
     */
    updateParams(params) {
        if (!this.skyMaterial) return;
        
        if (params.nebulaIntensity !== undefined) {
            this.skyMaterial.setFloat("uNebulaIntensity", params.nebulaIntensity);
        }
        if (params.starBrightness !== undefined) {
            this.skyMaterial.setFloat("uStarBrightness", params.starBrightness);
        }
        if (params.cloudOpacity !== undefined) {
            this.skyMaterial.setFloat("uCloudOpacity", params.cloudOpacity);
        }
    }

    /**
     * 销毁天空
     */
    dispose() {
        if (this.skyMesh) {
            this.skyMesh.dispose();
        }
        if (this.skyMaterial) {
            this.skyMaterial.dispose();
        }
    }
}
