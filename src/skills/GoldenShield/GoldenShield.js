import { BaseSkill } from "../BaseSkill";
import { MeshBuilder, StandardMaterial, Color3, Color4, ShaderMaterial, Effect, Vector3, GlowLayer } from "@babylonjs/core";

/**
 * 金黄色圆环护盾技能
 * 按E键开启/关闭，护盾为垂直于地面的圆环
 */
export class GoldenShield extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "GoldenShield", 0);
        
        this.isActive = false;
        this.shieldMesh = null;
        this.glowLayer = null;
        
        // 注册自定义Shader
        this.registerShader();
    }
    
    /**
     * 注册自定义Shader
     */
    registerShader() {
        // 顶点着色器
        Effect.ShadersStore["goldenRingVertexShader"] = `
            precision highp float;
            
            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;
            
            uniform mat4 worldViewProjection;
            uniform mat4 world;
            uniform float time;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUV;
            
            void main(void) {
                vec4 worldPos = world * vec4(position, 1.0);
                vPosition = worldPos.xyz;
                vNormal = normalize((world * vec4(normal, 0.0)).xyz);
                vUV = uv;
                
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;
        
        // 片段着色器
        Effect.ShadersStore["goldenRingFragmentShader"] = `
            precision highp float;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUV;
            
            uniform vec3 cameraPosition;
            uniform float time;
            
            void main(void) {
                // 计算径向距离（从圆心到边缘）
                float dist = length(vUV - vec2(0.5, 0.5)) * 2.0;
                
                // 创建圆环效果：只在特定半径范围内显示
                float ringInner = 0.85;
                float ringOuter = 1.0;
                float ringMask = smoothstep(ringInner - 0.05, ringInner, dist) * 
                                 (1.0 - smoothstep(ringOuter - 0.05, ringOuter, dist));
                
                // 如果不在圆环范围内，丢弃像素
                if (ringMask < 0.1) {
                    discard;
                }
                
                // 金黄色基础颜色
                vec3 goldColor = vec3(1.0, 0.85, 0.0);
                
                // 添加流动效果
                float flow = sin(vUV.y * 20.0 + time * 3.0) * 0.3 + 0.7;
                
                // 添加能量波动
                float pulse = sin(time * 2.0) * 0.2 + 0.8;
                
                // 边缘发光效果
                float edgeGlow = pow(1.0 - abs(dist - 0.925) / 0.075, 2.0);
                
                // 菲涅尔效果（边缘更亮）
                vec3 viewDir = normalize(cameraPosition - vPosition);
                float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
                
                // 组合所有效果
                vec3 finalColor = goldColor * flow * pulse;
                finalColor += goldColor * edgeGlow * 0.5;
                finalColor += goldColor * fresnel * 0.3;
                
                // 设置透明度
                float alpha = ringMask * 0.7;
                alpha += edgeGlow * 0.3;
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `;
    }
    
    /**
     * 创建护盾网格
     */
    createShield() {
        // 创建圆盘作为护盾基础（垂直于地面）
        this.shieldMesh = MeshBuilder.CreateDisc("goldenShield", {
            radius: 1.5,
            tessellation: 64,
            sideOrientation: 2 // 双面渲染
        }, this.scene);
        
        // 旋转使其垂直于地面（沿着角色前方）
        this.shieldMesh.rotation.x = Math.PI / 2;
        
        // 创建Shader材质
        const shaderMaterial = new ShaderMaterial("goldenShieldMat", this.scene, {
            vertex: "goldenRing",
            fragment: "goldenRing"
        }, {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldViewProjection", "cameraPosition", "time"],
            needAlphaBlending: true
        });
        
        // 设置初始uniforms
        shaderMaterial.setVector3("cameraPosition", this.scene.activeCamera.position);
        shaderMaterial.setFloat("time", 0);
        shaderMaterial.backFaceCulling = false;
        shaderMaterial.alpha = 0.9;
        
        this.shieldMesh.material = shaderMaterial;
        
        // 设置护盾位置（在角色前方）
        this.updateShieldPosition();
        
        // 创建发光层
        if (!this.glowLayer) {
            this.glowLayer = new GlowLayer("goldenShieldGlow", this.scene);
            this.glowLayer.intensity = 1.2;
        }
        this.glowLayer.addIncludedOnlyMesh(this.shieldMesh);
        
        // 注册更新函数
        this.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (this.isActive && this.shieldMesh) {
                // 更新时间uniform
                const time = performance.now() / 1000.0;
                this.shieldMesh.material.setFloat("time", time);
                
                // 更新相机位置
                this.shieldMesh.material.setVector3("cameraPosition", this.scene.activeCamera.position);
                
                // 更新护盾位置跟随角色
                this.updateShieldPosition();
            }
        });
        
        console.log("金黄色圆环护盾已激活");
    }
    
    /**
     * 更新护盾位置（跟随角色）
     */
    updateShieldPosition() {
        if (!this.shieldMesh || !this.player || !this.player.mesh) return;
        
        // 获取角色位置和朝向
        const playerPos = this.player.mesh.position.clone();
        const playerRotation = this.player.modelRoot.rotationQuaternion 
            ? this.player.modelRoot.rotationQuaternion.toEulerAngles() 
            : this.player.modelRoot.rotation;
        
        // 计算护盾位置（在角色前方0.8单位）
        const forwardOffset = new Vector3(
            Math.sin(playerRotation.y) * 0.8,
            1.2, // 高度在角色腰部
            Math.cos(playerRotation.y) * 0.8
        );
        
        this.shieldMesh.position = playerPos.add(forwardOffset);
        
        // 护盾朝向与角色一致
        this.shieldMesh.rotation.y = playerRotation.y;
        // 保持垂直于地面
        this.shieldMesh.rotation.x = Math.PI / 2;
    }
    
    /**
     * 销毁护盾
     */
    destroyShield() {
        if (this.shieldMesh) {
            if (this.glowLayer) {
                this.glowLayer.removeIncludedOnlyMesh(this.shieldMesh);
            }
            this.shieldMesh.dispose();
            this.shieldMesh = null;
        }
        
        if (this.updateObserver) {
            this.scene.onBeforeRenderObservable.remove(this.updateObserver);
            this.updateObserver = null;
        }
        
        console.log("金黄色圆环护盾已关闭");
    }
    
    /**
     * 执行技能（切换护盾状态）
     */
    execute() {
        this.isActive = !this.isActive;
        
        if (this.isActive) {
            this.createShield();
        } else {
            this.destroyShield();
        }
    }
    
    /**
     * 检查技能是否就绪（护盾无冷却时间）
     */
    isReady() {
        return true;
    }
}
