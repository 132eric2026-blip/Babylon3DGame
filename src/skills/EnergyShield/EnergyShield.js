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
    Mesh,
    VertexData
} from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

/**
 * 能量护盾技能
 * 切换式防御技能，按E开启/关闭
 * 创建青蓝色能量护盾包围角色
 */
export class EnergyShield extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "能量护盾", 0.5); // 0.5秒切换冷却
        
        this.isActive = false;          // 护盾是否激活
        this.shieldRoot = null;         // 护盾根节点
        this.shieldMeshes = [];         // 护盾网格
        this.particleSystems = [];      // 粒子系统
        this.updateObserver = null;     // 更新观察者
        this.rotationAngle = 0;         // 旋转角度
    }

    /**
     * 重写激活方法 - 实现切换逻辑
     */
    activate() {
        if (!this.isReady()) {
            return false;
        }
        
        if (this.isActive) {
            // 关闭护盾
            this.deactivateShield();
            console.log("能量护盾已关闭");
        } else {
            // 开启护盾
            this.activateShield();
            console.log("能量护盾已开启");
        }
        
        // 开始冷却
        this.currentCooldown = this.cooldown;
        
        return true;
    }

    /**
     * 执行技能效果（此处不使用，用activateShield替代）
     */
    execute() {
        // 切换型技能不使用execute
    }

    /**
     * 开启护盾
     */
    activateShield() {
        this.isActive = true;
        
        const scene = this.scene;
        const glowLayer = this.player.glowLayer;
        
        // 创建护盾根节点
        this.shieldRoot = new TransformNode("energyShieldRoot", scene);
        
        // 播放开启动画
        this.playActivateAnimation();
        
        // 创建主护盾球体
        this.createMainShield(glowLayer);
        
        // 创建六边形盾牌图案
        this.createHexagonShield(glowLayer);
        
        // 创建外环能量环
        this.createEnergyRings(glowLayer);
        
        // 创建能量粒子效果
        this.createEnergyParticles();
        
        // 创建边缘火焰效果
        this.createEdgeFlames();
        
        // 创建脚底光环
        this.createFootCircle(glowLayer);
        
        // 开始更新循环
        this.startUpdateLoop();
    }

    /**
     * 关闭护盾
     */
    deactivateShield() {
        this.isActive = false;
        
        // 播放关闭动画
        this.playDeactivateAnimation();
        
        // 延迟清理资源
        setTimeout(() => {
            this.cleanup();
        }, 300);
    }

    /**
     * 开启动画 - 双手护身姿势
     */
    playActivateAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.rightShoulder || !boxMan.leftShoulder) return;
        
        const scene = this.scene;
        const fps = 60;
        
        const rightStartX = boxMan.rightShoulder.rotation.x;
        const rightStartY = boxMan.rightShoulder.rotation.y;
        const leftStartX = boxMan.leftShoulder.rotation.x;
        const leftStartY = boxMan.leftShoulder.rotation.y;
        
        // 右臂 - 护身姿势
        const rightAnimX = new Animation("shieldRightX", "rotation.x", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: rightStartX },
            { frame: 10, value: -1.2 }  // 手臂向前护住身体
        ]);
        
        const rightAnimY = new Animation("shieldRightY", "rotation.y", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimY.setKeys([
            { frame: 0, value: rightStartY },
            { frame: 10, value: -0.4 }  // 向内收
        ]);
        
        // 左臂 - 护身姿势
        const leftAnimX = new Animation("shieldLeftX", "rotation.x", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimX.setKeys([
            { frame: 0, value: leftStartX },
            { frame: 10, value: -1.2 }
        ]);
        
        const leftAnimY = new Animation("shieldLeftY", "rotation.y", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimY.setKeys([
            { frame: 0, value: leftStartY },
            { frame: 10, value: 0.4 }
        ]);
        
        scene.stopAnimation(boxMan.rightShoulder);
        scene.stopAnimation(boxMan.leftShoulder);
        
        scene.beginDirectAnimation(boxMan.rightShoulder, [rightAnimX, rightAnimY], 0, 10, false);
        scene.beginDirectAnimation(boxMan.leftShoulder, [leftAnimX, leftAnimY], 0, 10, false);
    }

    /**
     * 关闭动画 - 恢复姿势
     */
    playDeactivateAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.rightShoulder || !boxMan.leftShoulder) return;
        
        const scene = this.scene;
        const fps = 60;
        
        // 恢复到初始姿势
        const rightAnimX = new Animation("shieldRightX", "rotation.x", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: boxMan.rightShoulder.rotation.x },
            { frame: 8, value: 0 }
        ]);
        
        const rightAnimY = new Animation("shieldRightY", "rotation.y", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimY.setKeys([
            { frame: 0, value: boxMan.rightShoulder.rotation.y },
            { frame: 8, value: 0 }
        ]);
        
        const leftAnimX = new Animation("shieldLeftX", "rotation.x", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimX.setKeys([
            { frame: 0, value: boxMan.leftShoulder.rotation.x },
            { frame: 8, value: 0 }
        ]);
        
        const leftAnimY = new Animation("shieldLeftY", "rotation.y", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimY.setKeys([
            { frame: 0, value: boxMan.leftShoulder.rotation.y },
            { frame: 8, value: 0 }
        ]);
        
        scene.beginDirectAnimation(boxMan.rightShoulder, [rightAnimX, rightAnimY], 0, 8, false);
        scene.beginDirectAnimation(boxMan.leftShoulder, [leftAnimX, leftAnimY], 0, 8, false);
    }

    /**
     * 创建主护盾球体 - 椭圆形能量护盾
     */
    createMainShield(glowLayer) {
        const scene = this.scene;
        
        // 创建椭圆形护盾（拉伸的球体）
        const shield = MeshBuilder.CreateSphere("mainShield", {
            diameter: 3.5,
            segments: 32
        }, scene);
        
        shield.parent = this.shieldRoot;
        shield.scaling = new Vector3(1, 1.3, 1); // 椭圆形
        shield.position.y = 1.2;
        
        // 半透明青蓝色材质
        const shieldMat = new StandardMaterial("mainShieldMat", scene);
        shieldMat.emissiveColor = new Color3(0.0, 0.8, 1.0);
        shieldMat.diffuseColor = new Color3(0.0, 0.6, 0.9);
        shieldMat.specularColor = new Color3(0.5, 0.9, 1.0);
        shieldMat.alpha = 0.15;
        shieldMat.backFaceCulling = false;
        shieldMat.disableLighting = true;
        shield.material = shieldMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(shield);
        }
        
        this.shieldMeshes.push(shield);
        
        // 创建内层护盾
        const innerShield = MeshBuilder.CreateSphere("innerShield", {
            diameter: 3.2,
            segments: 24
        }, scene);
        
        innerShield.parent = this.shieldRoot;
        innerShield.scaling = new Vector3(1, 1.3, 1);
        innerShield.position.y = 1.2;
        
        const innerMat = new StandardMaterial("innerShieldMat", scene);
        innerMat.emissiveColor = new Color3(0.2, 0.9, 1.0);
        innerMat.alpha = 0.08;
        innerMat.backFaceCulling = false;
        innerMat.disableLighting = true;
        innerShield.material = innerMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(innerShield);
        }
        
        this.shieldMeshes.push(innerShield);
    }

    /**
     * 创建六边形盾牌图案
     */
    createHexagonShield(glowLayer) {
        const scene = this.scene;
        
        // 创建六边形盾牌形状
        const hexShield = this.createHexagonMesh(scene, 0.8);
        hexShield.parent = this.shieldRoot;
        hexShield.position = new Vector3(0, 1.3, 1.2); // 前方
        hexShield.rotation.y = Math.PI;
        
        const hexMat = new StandardMaterial("hexShieldMat", scene);
        hexMat.emissiveColor = new Color3(0.0, 0.9, 1.0);
        hexMat.diffuseColor = new Color3(0.0, 0.7, 1.0);
        hexMat.alpha = 0.6;
        hexMat.backFaceCulling = false;
        hexMat.disableLighting = true;
        hexShield.material = hexMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(hexShield);
        }
        
        this.shieldMeshes.push(hexShield);
        
        // 创建六边形边框
        const hexBorder = this.createHexagonBorder(scene, 0.85);
        hexBorder.parent = this.shieldRoot;
        hexBorder.position = new Vector3(0, 1.3, 1.18);
        hexBorder.rotation.y = Math.PI;
        
        const borderMat = new StandardMaterial("hexBorderMat", scene);
        borderMat.emissiveColor = new Color3(0.3, 1.0, 1.0);
        borderMat.alpha = 0.9;
        borderMat.disableLighting = true;
        hexBorder.material = borderMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(hexBorder);
        }
        
        this.shieldMeshes.push(hexBorder);
        
        // 内部六边形装饰
        const innerHex = this.createHexagonMesh(scene, 0.4);
        innerHex.parent = this.shieldRoot;
        innerHex.position = new Vector3(0, 1.3, 1.15);
        innerHex.rotation.y = Math.PI;
        
        const innerHexMat = new StandardMaterial("innerHexMat", scene);
        innerHexMat.emissiveColor = new Color3(0.5, 1.0, 1.0);
        innerHexMat.alpha = 0.8;
        innerHexMat.disableLighting = true;
        innerHex.material = innerHexMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(innerHex);
        }
        
        this.shieldMeshes.push(innerHex);
    }

    /**
     * 创建六边形网格
     */
    createHexagonMesh(scene, size) {
        const positions = [];
        const indices = [];
        const normals = [];
        
        // 中心点
        positions.push(0, 0, 0);
        
        // 六边形顶点
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            positions.push(
                Math.cos(angle) * size,
                Math.sin(angle) * size,
                0
            );
        }
        
        // 创建三角形面
        for (let i = 0; i < 6; i++) {
            indices.push(0, i + 1, ((i + 1) % 6) + 1);
        }
        
        // 法线
        for (let i = 0; i < 7; i++) {
            normals.push(0, 0, 1);
        }
        
        const hexagon = new Mesh("hexagon", scene);
        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;
        vertexData.applyToMesh(hexagon);
        
        return hexagon;
    }

    /**
     * 创建六边形边框
     */
    createHexagonBorder(scene, size) {
        const points = [];
        for (let i = 0; i <= 6; i++) {
            const angle = (Math.PI / 3) * (i % 6) - Math.PI / 6;
            points.push(new Vector3(
                Math.cos(angle) * size,
                Math.sin(angle) * size,
                0
            ));
        }
        
        const border = MeshBuilder.CreateTube("hexBorder", {
            path: points,
            radius: 0.03,
            tessellation: 8,
            cap: Mesh.NO_CAP
        }, scene);
        
        return border;
    }

    /**
     * 创建外环能量环
     */
    createEnergyRings(glowLayer) {
        const scene = this.scene;
        
        // 创建多层旋转能量环
        for (let i = 0; i < 3; i++) {
            const ring = MeshBuilder.CreateTorus("energyRing" + i, {
                diameter: 3.0 + i * 0.3,
                thickness: 0.04,
                tessellation: 48
            }, scene);
            
            ring.parent = this.shieldRoot;
            ring.position.y = 1.2;
            ring.rotation.x = Math.PI / 2 + (i - 1) * 0.3;
            ring.rotation.z = i * Math.PI / 3;
            
            const ringMat = new StandardMaterial("energyRingMat" + i, scene);
            ringMat.emissiveColor = new Color3(0.0, 0.8 + i * 0.1, 1.0);
            ringMat.alpha = 0.7 - i * 0.1;
            ringMat.disableLighting = true;
            ring.material = ringMat;
            
            if (glowLayer) {
                glowLayer.addIncludedOnlyMesh(ring);
            }
            
            this.shieldMeshes.push(ring);
        }
    }

    /**
     * 创建能量粒子效果
     */
    createEnergyParticles() {
        const scene = this.scene;
        
        // 环绕护盾的能量粒子
        const energyPS = new ParticleSystem("energyParticles", 400, scene);
        energyPS.particleTexture = this.createEnergyTexture();
        energyPS.emitter = this.shieldRoot;
        
        // 球形发射区域
        energyPS.createSphereEmitter(1.8);
        
        energyPS.color1 = new Color4(0.0, 0.9, 1.0, 0.8);
        energyPS.color2 = new Color4(0.3, 1.0, 1.0, 0.6);
        energyPS.colorDead = new Color4(0.0, 0.5, 0.8, 0.0);
        
        energyPS.minSize = 0.08;
        energyPS.maxSize = 0.2;
        energyPS.minLifeTime = 0.8;
        energyPS.maxLifeTime = 1.5;
        
        energyPS.emitRate = 100;
        energyPS.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        energyPS.minEmitPower = 0.3;
        energyPS.maxEmitPower = 0.8;
        
        // 粒子向上漂浮
        energyPS.gravity = new Vector3(0, 0.5, 0);
        
        energyPS.start();
        this.particleSystems.push(energyPS);
    }

    /**
     * 创建边缘火焰/能量流动效果
     */
    createEdgeFlames() {
        const scene = this.scene;
        
        // 边缘能量流动
        const flamePS = new ParticleSystem("edgeFlames", 600, scene);
        flamePS.particleTexture = this.createFlameTexture();
        flamePS.emitter = this.shieldRoot;
        
        // 从护盾边缘发射
        flamePS.minEmitBox = new Vector3(-1.8, 0, -1.8);
        flamePS.maxEmitBox = new Vector3(1.8, 2.5, 1.8);
        
        flamePS.color1 = new Color4(0.0, 0.8, 1.0, 0.7);
        flamePS.color2 = new Color4(0.2, 0.9, 1.0, 0.5);
        flamePS.colorDead = new Color4(0.0, 0.4, 0.8, 0.0);
        
        flamePS.minSize = 0.15;
        flamePS.maxSize = 0.4;
        flamePS.minLifeTime = 0.3;
        flamePS.maxLifeTime = 0.8;
        
        flamePS.emitRate = 200;
        flamePS.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        flamePS.minEmitPower = 0.5;
        flamePS.maxEmitPower = 1.5;
        
        // 向上飘动
        flamePS.direction1 = new Vector3(-0.3, 1, -0.3);
        flamePS.direction2 = new Vector3(0.3, 2, 0.3);
        
        flamePS.gravity = new Vector3(0, 1, 0);
        
        flamePS.start();
        this.particleSystems.push(flamePS);
    }

    /**
     * 创建脚底光环
     */
    createFootCircle(glowLayer) {
        const scene = this.scene;
        
        // 脚底光环
        const footRing = MeshBuilder.CreateTorus("footRing", {
            diameter: 2.5,
            thickness: 0.08,
            tessellation: 48
        }, scene);
        
        footRing.parent = this.shieldRoot;
        footRing.position.y = 0.05;
        footRing.rotation.x = Math.PI / 2;
        
        const footMat = new StandardMaterial("footRingMat", scene);
        footMat.emissiveColor = new Color3(0.0, 0.9, 1.0);
        footMat.alpha = 0.8;
        footMat.disableLighting = true;
        footRing.material = footMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(footRing);
        }
        
        this.shieldMeshes.push(footRing);
        
        // 内部装饰圆
        const innerRing = MeshBuilder.CreateTorus("innerFootRing", {
            diameter: 1.8,
            thickness: 0.04,
            tessellation: 32
        }, scene);
        
        innerRing.parent = this.shieldRoot;
        innerRing.position.y = 0.05;
        innerRing.rotation.x = Math.PI / 2;
        
        const innerMat = new StandardMaterial("innerFootMat", scene);
        innerMat.emissiveColor = new Color3(0.3, 1.0, 1.0);
        innerMat.alpha = 0.6;
        innerMat.disableLighting = true;
        innerRing.material = innerMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(innerRing);
        }
        
        this.shieldMeshes.push(innerRing);
    }

    /**
     * 开始更新循环
     */
    startUpdateLoop() {
        const scene = this.scene;
        
        this.updateObserver = scene.onBeforeRenderObservable.add(() => {
            if (!this.isActive || !this.shieldRoot) return;
            
            // 跟随玩家位置
            const playerPos = this.player.mesh.position;
            this.shieldRoot.position = playerPos.clone();
            
            // 旋转能量环
            this.rotationAngle += 0.02;
            
            // 更新每个能量环的旋转
            this.shieldMeshes.forEach((mesh, index) => {
                if (mesh.name.includes("energyRing")) {
                    mesh.rotation.y = this.rotationAngle * (index % 2 === 0 ? 1 : -1);
                }
                if (mesh.name === "footRing") {
                    mesh.rotation.z = this.rotationAngle * 0.5;
                }
                if (mesh.name === "innerFootRing") {
                    mesh.rotation.z = -this.rotationAngle * 0.8;
                }
            });
            
            // 护盾呼吸效果
            const breathScale = 1 + Math.sin(this.rotationAngle * 2) * 0.02;
            this.shieldMeshes.forEach(mesh => {
                if (mesh.name === "mainShield" || mesh.name === "innerShield") {
                    mesh.scaling.x = breathScale;
                    mesh.scaling.z = breathScale;
                }
            });
        });
    }

    /**
     * 清理资源
     */
    cleanup() {
        // 移除更新观察者
        if (this.updateObserver) {
            this.scene.onBeforeRenderObservable.remove(this.updateObserver);
            this.updateObserver = null;
        }
        
        // 清理粒子系统
        this.particleSystems.forEach(ps => {
            ps.stop();
            ps.dispose();
        });
        this.particleSystems = [];
        
        // 清理网格
        this.shieldMeshes.forEach(mesh => {
            if (mesh.material) mesh.material.dispose();
            mesh.dispose();
        });
        this.shieldMeshes = [];
        
        // 清理根节点
        if (this.shieldRoot) {
            this.shieldRoot.dispose();
            this.shieldRoot = null;
        }
    }

    /**
     * 创建能量纹理
     */
    createEnergyTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.2, "rgba(100, 220, 255, 0.9)");
        grad.addColorStop(0.5, "rgba(0, 180, 255, 0.5)");
        grad.addColorStop(1, "rgba(0, 100, 200, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "energyTex", this.scene);
    }

    /**
     * 创建火焰/能量流纹理
     */
    createFlameTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(200, 255, 255, 1)");
        grad.addColorStop(0.3, "rgba(50, 200, 255, 0.8)");
        grad.addColorStop(0.6, "rgba(0, 150, 255, 0.4)");
        grad.addColorStop(1, "rgba(0, 80, 180, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "flameTex", this.scene);
    }

    /**
     * 重写更新方法
     */
    update(deltaTime) {
        super.update(deltaTime);
        // 护盾激活时的额外更新逻辑可在此添加
    }

    /**
     * 获取护盾状态
     */
    isShieldActive() {
        return this.isActive;
    }
}
