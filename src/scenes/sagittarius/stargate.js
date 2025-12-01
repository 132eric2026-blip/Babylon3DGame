import { MeshBuilder, Vector3, StandardMaterial, Color3, TransformNode, ShaderMaterial, Effect, Texture, Animation, PointLight } from "@babylonjs/core";
import { AncientGuardian } from "./ancientGuardian";

/**
 * 星门
 * 包含环体结构、能量漩涡与守护者的生成逻辑
 */
export class Stargate {
    /**
     * 构造星门
     * @param {Scene} scene 场景实例
     * @param {Vector3} position 世界位置
     */
    constructor(scene, position) {
        this.scene = scene;
        this.position = position;
        this.root = new TransformNode("stargateRoot", scene);
        this.root.position = position;
        
        // 创建结构
        this.createRing();
        
        // 创建能量效果
        this.createVortex();

        // 创建守护者
        this.createGuardians();
    }

    /**
     * 创建两侧守护者
     */
    createGuardians() {
        // 左侧守护者：位于星门左前方，微内转
        
        const leftPos = this.root.position.clone().add(new Vector3(-7, 0, 2));
        new AncientGuardian(this.scene, leftPos, Math.PI / 6); // Slight inward turn

        // 右侧守护者：位于星门右前方，微内转
        const rightPos = this.root.position.clone().add(new Vector3(7, 0, 2));
        new AncientGuardian(this.scene, rightPos, -Math.PI / 6); // Slight inward turn
    }

    /**
     * 创建环体结构与细节（外环与发光楔块）
     */
    createRing() {
        // 外环材质（古代金属）
        const metalMat = new StandardMaterial("gateMetalMat", this.scene);
        metalMat.diffuseColor = new Color3(0.3, 0.35, 0.4);
        metalMat.specularColor = new Color3(0.6, 0.6, 0.7);
        metalMat.roughness = 0.4;
        
        // 发光楔块材质
        const chevronMat = new StandardMaterial("chevronMat", this.scene);
        chevronMat.emissiveColor = new Color3(1.0, 0.4, 0.0); // Orange glow
        chevronMat.diffuseColor = new Color3(1.0, 0.2, 0.0);
        
        // 1. 主环（圆环体）
        const ring = MeshBuilder.CreateTorus("gateRing", {
            diameter: 8,
            thickness: 1.2,
            tessellation: 64
        }, this.scene);
        ring.material = metalMat;
        ring.parent = this.root;
        // 立起
        ring.rotation.x = Math.PI / 2; 
        ring.position.y = 4; // 中心高度 4m（半径 4）

        // 2. 楔块（围绕环体的细节）
        const chevronCount = 9;
        for (let i = 0; i < chevronCount; i++) {
            const angle = (i / chevronCount) * Math.PI * 2;
            
            const chevronGroup = new TransformNode("chevron" + i, this.scene);
            chevronGroup.parent = this.root;
            chevronGroup.position.y = 4; // 与环中心一致
            chevronGroup.rotation.z = angle; // 绕环中心旋转
            
            // 计算环上的位置
            const radius = 4;
            const cx = Math.cos(angle) * radius;
            const cy = Math.sin(angle) * radius;
            
            // 外壳盒体
            const box = MeshBuilder.CreateBox("chevBox", { width: 0.8, height: 1.4, depth: 1.4 }, this.scene);
            box.parent = this.root;
            // 相对根节点中心 (0, 4, 0)
            box.position = new Vector3(cx, cy + 4, 0);
            box.rotation.z = angle - Math.PI / 2; // 指向外/内
            box.material = metalMat;
            
            // 发光中心
            const light = MeshBuilder.CreateBox("chevLight", { width: 0.4, height: 0.6, depth: 1.5 }, this.scene);
            light.parent = box;
            light.material = chevronMat;
        }
        
        // 3. 底座平台
        const platform = MeshBuilder.CreateBox("gatePlatform", { width: 6, height: 1, depth: 4 }, this.scene);
        platform.position = new Vector3(0, 0.5, 0);
        platform.material = metalMat;
        platform.parent = this.root;
    }

    /**
     * 创建星门漩涡（着色器平面与动画、光源）
     */
    createVortex() {
        // 注册着色器
        Effect.ShadersStore["vortexVertexShader"] = `
            precision highp float;
            attribute vec3 position;
            attribute vec2 uv;
            uniform mat4 worldViewProjection;
            uniform float time;
            varying vec2 vUV;
            varying vec3 vPosition;
            
            void main() {
                vUV = uv;
                vPosition = position;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;

        Effect.ShadersStore["vortexFragmentShader"] = `
            precision highp float;
            varying vec2 vUV;
            uniform float time;
            
            // Noise function
            float hash(float n) { return fract(sin(n) * 43758.5453123); }
            float noise(vec2 x) {
                vec2 p = floor(x);
                vec2 f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                float n = p.x + p.y * 57.0;
                return mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                           mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
            }
            
            float fbm(vec2 p) {
                float f = 0.0;
                f += 0.50000 * noise(p); p = p * 2.02;
                f += 0.25000 * noise(p); p = p * 2.03;
                f += 0.12500 * noise(p); p = p * 2.01;
                return f;
            }

            void main() {
                // Center UV
                vec2 p = vUV * 2.0 - 1.0;
                
                // Polar coordinates
                float r = length(p);
                float a = atan(p.y, p.x);
                
                // Swirl effect
                float swirl = a + r * 3.0 - time * 1.5;
                
                // Dynamic Noise Pattern
                float n = fbm(vec2(r * 3.0 - time * 0.5, swirl));
                
                // Colors
                vec3 deepPurple = vec3(0.1, 0.0, 0.2);
                vec3 brightPurple = vec3(0.6, 0.0, 1.0);
                vec3 energyWhite = vec3(0.8, 0.6, 1.0);
                
                // Mixing colors based on noise and radius
                vec3 color = mix(deepPurple, brightPurple, n);
                
                // Add energy streaks
                float streaks = smoothstep(0.4, 0.6, n + 0.1 * sin(time * 5.0));
                color = mix(color, energyWhite, streaks * 0.5);
                
                // Center glow
                color += energyWhite * (1.0 - smoothstep(0.0, 0.2, r));
                
                // Event Horizon edges (fade out towards ring)
                float alpha = 1.0 - smoothstep(0.85, 1.0, r);
                
                // Ripple/Wave effect (optional sine wave on radius)
                float wave = sin(r * 20.0 - time * 8.0) * 0.05;
                alpha *= 1.0 + wave;
                
                // Discard outside circle
                if(r > 1.0) discard;

                gl_FragColor = vec4(color, alpha * 0.9);
            }
        `;

        // 创建事件视界圆盘
        const vortexMesh = MeshBuilder.CreatePlane("vortex", { size: 7.5 }, this.scene);
        vortexMesh.parent = this.root;
        vortexMesh.position.y = 4;
        
        // 材质
        const vortexMat = new ShaderMaterial("vortexMat", this.scene, {
            vertex: "vortex",
            fragment: "vortex",
        }, {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection", "time"],
            needAlphaBlending: true
        });

        vortexMesh.material = vortexMat;
        
        // 动画
        let time = 0;
        this.scene.registerBeforeRender(() => {
            time += this.scene.getEngine().getDeltaTime() * 0.001;
            vortexMat.setFloat("time", time);
        });
        
        // 添加点光增强辉光
        const light = new PointLight("gateLight", new Vector3(0, 4, 0), this.scene);
        light.parent = this.root;
        light.diffuse = new Color3(0.8, 0.2, 1.0);
        light.intensity = 3.0;
        light.range = 15;
    }
}
