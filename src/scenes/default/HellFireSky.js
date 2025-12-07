import { MeshBuilder, Vector3, ShaderMaterial, Effect, Engine, TransformNode } from "@babylonjs/core";

/**
 * 地狱火半岛天空效果
 * 包含三层：紫色渐变天空盒 + 黄绿色极光能量带 + Bloom增强
 */
export class HellFireSky {
    /**
     * 构造地狱火天空
     * @param {Scene} scene Babylon 场景实例
     */
    constructor(scene) {
        this.scene = scene;
        this.time = 0;
        
        // 创建天空效果
        this.createSkybox();
        this.createAurora();
        
        // 注册渲染前更新
        this.scene.registerBeforeRender(() => {
            this.time += this.scene.getEngine().getDeltaTime() * 0.001;
            this.update();
        });
    }

    /**
     * 创建紫色渐变天空盒
     */
    createSkybox() {
        // 天空盒顶点着色器
        Effect.ShadersStore["hellFireSkyVertexShader"] = `
            precision highp float;
            attribute vec3 position;
            uniform mat4 worldViewProjection;
            varying vec3 vPosition;
            
            void main() {
                vPosition = position;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;

        // 天空盒片段着色器 - 紫色/深蓝渐变背景
        Effect.ShadersStore["hellFireSkyFragmentShader"] = `
            precision highp float;
            varying vec3 vPosition;
            
            void main() {
                // 根据Y方向计算渐变
                vec3 dir = normalize(vPosition);
                float y = dir.y * 0.5 + 0.5; // 0到1
                
                // 地平线附近：深紫红色
                vec3 horizonColor = vec3(0.25, 0.08, 0.20);
                // 天顶：深蓝紫色
                vec3 zenithColor = vec3(0.08, 0.05, 0.18);
                // 地面以下：更深的暗红色
                vec3 groundColor = vec3(0.15, 0.05, 0.08);
                
                vec3 color;
                if (y > 0.5) {
                    // 地平线到天顶
                    float t = (y - 0.5) * 2.0;
                    t = pow(t, 0.7); // 非线性渐变
                    color = mix(horizonColor, zenithColor, t);
                } else {
                    // 地平线到地面
                    float t = (0.5 - y) * 2.0;
                    color = mix(horizonColor, groundColor, t);
                }
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        // 创建大型天空盒
        const skybox = MeshBuilder.CreateBox("hellFireSkyBox", { size: 800.0 }, this.scene);
        
        const skyboxMat = new ShaderMaterial("hellFireSkyMat", this.scene, {
            vertex: "hellFireSky",
            fragment: "hellFireSky"
        }, {
            attributes: ["position"],
            uniforms: ["worldViewProjection"],
            backFaceCulling: false
        });
        
        skybox.material = skyboxMat;
        skybox.infiniteDistance = true;
        
        this.skybox = skybox;
    }

    /**
     * 创建极光能量带效果
     */
    createAurora() {
        // 极光顶点着色器
        Effect.ShadersStore["auroraVertexShader"] = `
            precision highp float;
            attribute vec3 position;
            attribute vec2 uv;
            uniform mat4 world;
            uniform mat4 worldViewProjection;
            varying vec2 vUV;
            varying vec3 vPositionW;
            
            void main() {
                vUV = uv;
                vPositionW = (world * vec4(position, 1.0)).xyz;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;

        // 极光片段着色器 - FBM噪声 + 动态UV扭曲
        Effect.ShadersStore["auroraFragmentShader"] = `
            precision highp float;
            varying vec2 vUV;
            varying vec3 vPositionW;
            uniform float time;
            
            // 简易哈希函数
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
            }
            
            // 2D 噪声
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
            
            // 分形布朗运动 (FBM)
            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for (int i = 0; i < 5; i++) {
                    value += amplitude * noise(p * frequency);
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                
                return value;
            }
            
            void main() {
                vec2 uv = vUV;
                
                // 动态UV扭曲 - 模拟风吹效果
                float windSpeed = 0.15;
                float distortion = 0.3;
                
                // 第一层扭曲
                vec2 distortedUV = uv;
                distortedUV.x += time * windSpeed;
                distortedUV.y += sin(uv.x * 3.0 + time * 0.5) * 0.05;
                
                // 第二层扭曲叠加
                float warp = fbm(distortedUV * 2.0 + time * 0.1);
                distortedUV += vec2(warp * distortion, warp * distortion * 0.5);
                
                // 主极光纹理 - 拉伸的噪声
                float aurora1 = fbm(vec2(distortedUV.x * 1.5, distortedUV.y * 4.0));
                float aurora2 = fbm(vec2(distortedUV.x * 2.0 + 100.0, distortedUV.y * 3.0 - time * 0.2));
                
                // 合并极光层
                float aurora = (aurora1 + aurora2) * 0.5;
                
                // 增强条带感 - 通过y方向的非线性变换
                float band = pow(aurora, 1.5);
                band *= smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.4, uv.y);
                
                // 颜色渐变：绿色 → 黄色 → 淡橙色
                vec3 greenColor = vec3(0.2, 0.8, 0.3);
                vec3 yellowColor = vec3(0.95, 0.85, 0.2);
                vec3 orangeColor = vec3(1.0, 0.6, 0.2);
                
                // 根据极光强度混合颜色
                vec3 color = mix(greenColor, yellowColor, aurora);
                color = mix(color, orangeColor, pow(aurora, 2.0));
                
                // 增加亮度脉冲
                float pulse = 1.0 + 0.15 * sin(time * 2.0 + aurora * 10.0);
                color *= pulse;
                
                // 边缘渐隐
                float edgeFade = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
                edgeFade *= smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.5, uv.y);
                
                // 最终透明度
                float alpha = band * edgeFade * 0.85;
                
                // 增强发光效果 (与Bloom配合)
                color *= 1.5;
                
                gl_FragColor = vec4(color, alpha);
            }
        `;

        // 创建极光平面 - 大型倾斜平面贴在天空
        const auroraRoot = new TransformNode("auroraRoot", this.scene);
        
        // 创建多个极光层以增加层次感
        this.auroraPlanes = [];
        
        for (let i = 0; i < 3; i++) {
            const plane = MeshBuilder.CreatePlane(`aurora${i}`, { 
                width: 800, 
                height: 300 
            }, this.scene);
            
            plane.parent = auroraRoot;
            
            // 定位：倾斜放置在天空中，降低高度使默认视角可见
            plane.position = new Vector3(0, 40 + i * 20, -150 - i * 80);
            plane.rotation.x = -Math.PI * 0.35 - i * 0.05; // 向玩家倾斜
            
            // 极光材质
            const auroraMat = new ShaderMaterial(`auroraMat${i}`, this.scene, {
                vertex: "aurora",
                fragment: "aurora"
            }, {
                attributes: ["position", "uv"],
                uniforms: ["world", "worldViewProjection", "time"],
                needAlphaBlending: true
            });
            
            auroraMat.backFaceCulling = false;
            auroraMat.alphaMode = Engine.ALPHA_ADD; // 加法混合增强发光
            auroraMat.setFloat("time", 0);
            
            plane.material = auroraMat;
            
            this.auroraPlanes.push({ mesh: plane, material: auroraMat, timeOffset: i * 100 });
        }
        
        this.auroraRoot = auroraRoot;
    }

    /**
     * 更新极光动画
     */
    update() {
        // 更新每个极光层的时间
        for (const aurora of this.auroraPlanes) {
            aurora.material.setFloat("time", this.time + aurora.timeOffset);
        }
    }

    /**
     * 销毁天空效果
     */
    dispose() {
        if (this.skybox) {
            this.skybox.dispose();
        }
        if (this.auroraRoot) {
            this.auroraRoot.dispose();
        }
    }
}
