import { MeshBuilder, StandardMaterial, Color3, Texture, CubeTexture, NoiseProceduralTexture, Vector3, Animation, AnimationGroup } from "@babylonjs/core";

/**
 * 漫威风格天空 - 宇宙/量子领域风格
 */
export class MarvelSky {
    constructor(scene) {
        this.scene = scene;
        this.createSky();
    }

    createSky() {
        // 创建一个巨大的球体作为天空盒
        const skySphere = MeshBuilder.CreateSphere("skySphere", { segments: 32, diameter: 1000.0 }, this.scene);
        const skyMaterial = new StandardMaterial("skyMat", this.scene);
        
        // 禁用光照，使其自发光
        skyMaterial.backFaceCulling = false;
        skyMaterial.disableLighting = true;

        // 使用噪声纹理模拟星云
        const noiseTexture = new NoiseProceduralTexture("perlin", 512, this.scene);
        noiseTexture.octaves = 4;
        noiseTexture.persistence = 1.2;
        noiseTexture.animationSpeedFactor = 0.5; // 让天空缓慢移动

        skyMaterial.emissiveTexture = noiseTexture;
        
        // 设置颜色 - 深邃的宇宙蓝紫色
        // 噪声纹理是黑白的，我们通过emissiveColor来调整基调，但这会影响整体亮度。
        // 更好的方法是把噪声作为opacity或者混合。
        // 这里简单点，直接用深色背景 + 噪声纹理作为亮度变化。
        
        skyMaterial.emissiveColor = new Color3(0.1, 0.05, 0.3); // 深紫底色
        
        // 我们再加一层Fresnel效果，让边缘有点发光，像大气层
        // skyMaterial.emissiveFresnelParameters = new BABYLON.FresnelParameters();
        // skyMaterial.emissiveFresnelParameters.bias = 0.6;
        // skyMaterial.emissiveFresnelParameters.power = 2;
        // skyMaterial.emissiveFresnelParameters.leftColor = Color3.Black();
        // skyMaterial.emissiveFresnelParameters.rightColor = new Color3(0.2, 0.6, 1.0); // 边缘亮蓝

        skySphere.material = skyMaterial;

        // 让天空球缓慢旋转
        const anim = new Animation("skyAnim", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const keys = [];
        keys.push({ frame: 0, value: 0 });
        keys.push({ frame: 3000, value: Math.PI * 2 });
        anim.setKeys(keys);
        skySphere.animations.push(anim);
        this.scene.beginAnimation(skySphere, 0, 3000, true);

        // 添加一些漂浮的几何体，增加科技感/奇异感
        this.createFloatingGeometry();
    }

    createFloatingGeometry() {
        // 随机生成一些发光的立方体，仿佛是量子碎片
        const count = 50;
        const material = new StandardMaterial("quantumMat", this.scene);
        material.emissiveColor = new Color3(0.2, 0.8, 1.0);
        material.disableLighting = true;
        material.alpha = 0.6;

        for (let i = 0; i < count; i++) {
            const size = Math.random() * 5 + 1;
            const box = MeshBuilder.CreateBox("quantumBox" + i, { size: size }, this.scene);
            
            // 随机位置
            const range = 200;
            const x = (Math.random() - 0.5) * range;
            const y = Math.random() * 100 + 50; // 在高空
            const z = (Math.random() - 0.5) * range;
            
            box.position = new Vector3(x, y, z);
            box.rotation = new Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            box.material = material;

            // 简单的浮动动画
            const anim = new Animation("floatAnim" + i, "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
            const keys = [];
            keys.push({ frame: 0, value: y });
            keys.push({ frame: 150, value: y + 10 });
            keys.push({ frame: 300, value: y });
            anim.setKeys(keys);
            box.animations.push(anim);
            this.scene.beginAnimation(box, 0, 300, true, Math.random() * 2);
        }
    }
}
