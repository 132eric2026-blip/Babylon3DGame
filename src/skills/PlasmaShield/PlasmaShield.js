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
    VertexData,
    DynamicTexture
} from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

/**
 * 等离子护盾技能
 * 切换式防御技能，按Z开启/关闭
 * 紫色网格护盾，带闪电效果和科技感边框
 */
export class PlasmaShield extends BaseSkill {
    constructor(scene, player) {
        super(scene, player, "等离子护盾", 0.5);
        
        this.isActive = false;
        this.shieldRoot = null;
        this.shieldMeshes = [];
        this.particleSystems = [];
        this.updateObserver = null;
        this.rotationAngle = 0;
        this.lightningTime = 0;
    }

    activate() {
        if (!this.isReady()) {
            return false;
        }
        
        if (this.isActive) {
            this.deactivateShield();
            console.log("等离子护盾已关闭");
        } else {
            this.activateShield();
            console.log("等离子护盾已开启");
        }
        
        this.currentCooldown = this.cooldown;
        return true;
    }

    execute() {}

    activateShield() {
        this.isActive = true;
        
        const scene = this.scene;
        const glowLayer = this.player.glowLayer;
        
        this.shieldRoot = new TransformNode("plasmaShieldRoot", scene);
        
        this.playActivateAnimation();
        this.createMainShield(glowLayer);
       this.createGridPattern(glowLayer);
       // this.createTechFrame(glowLayer);
        this.createLightningParticles();
       // this.createPlasmaParticles();
        //this.createFootRing(glowLayer);
        this.startUpdateLoop();
    }

    deactivateShield() {
        this.isActive = false;
        this.playDeactivateAnimation();
        
        setTimeout(() => {
            this.cleanup();
        }, 300);
    }

    playActivateAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.rightShoulder || !boxMan.leftShoulder) return;
        
        const scene = this.scene;
        const fps = 60;
        
        const rightStartX = boxMan.rightShoulder.rotation.x;
        const rightStartY = boxMan.rightShoulder.rotation.y;
        const leftStartX = boxMan.leftShoulder.rotation.x;
        const leftStartY = boxMan.leftShoulder.rotation.y;
        
        const rightAnimX = new Animation("plasmaRightX", "rotation.x", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: rightStartX },
            { frame: 8, value: -1.0 },
            { frame: 12, value: -1.3 }
        ]);
        
        const rightAnimY = new Animation("plasmaRightY", "rotation.y", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimY.setKeys([
            { frame: 0, value: rightStartY },
            { frame: 12, value: -0.5 }
        ]);
        
        const leftAnimX = new Animation("plasmaLeftX", "rotation.x", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimX.setKeys([
            { frame: 0, value: leftStartX },
            { frame: 8, value: -1.0 },
            { frame: 12, value: -1.3 }
        ]);
        
        const leftAnimY = new Animation("plasmaLeftY", "rotation.y", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimY.setKeys([
            { frame: 0, value: leftStartY },
            { frame: 12, value: 0.5 }
        ]);
        
        scene.stopAnimation(boxMan.rightShoulder);
        scene.stopAnimation(boxMan.leftShoulder);
        
        scene.beginDirectAnimation(boxMan.rightShoulder, [rightAnimX, rightAnimY], 0, 12, false);
        scene.beginDirectAnimation(boxMan.leftShoulder, [leftAnimX, leftAnimY], 0, 12, false);
    }

    playDeactivateAnimation() {
        const boxMan = this.player.boxMan;
        if (!boxMan || !boxMan.rightShoulder || !boxMan.leftShoulder) return;
        
        const scene = this.scene;
        const fps = 60;
        
        const rightAnimX = new Animation("plasmaRightX", "rotation.x", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimX.setKeys([
            { frame: 0, value: boxMan.rightShoulder.rotation.x },
            { frame: 8, value: 0 }
        ]);
        
        const rightAnimY = new Animation("plasmaRightY", "rotation.y", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        rightAnimY.setKeys([
            { frame: 0, value: boxMan.rightShoulder.rotation.y },
            { frame: 8, value: 0 }
        ]);
        
        const leftAnimX = new Animation("plasmaLeftX", "rotation.x", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimX.setKeys([
            { frame: 0, value: boxMan.leftShoulder.rotation.x },
            { frame: 8, value: 0 }
        ]);
        
        const leftAnimY = new Animation("plasmaLeftY", "rotation.y", fps,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
        leftAnimY.setKeys([
            { frame: 0, value: boxMan.leftShoulder.rotation.y },
            { frame: 8, value: 0 }
        ]);
        
        scene.beginDirectAnimation(boxMan.rightShoulder, [rightAnimX, rightAnimY], 0, 8, false);
        scene.beginDirectAnimation(boxMan.leftShoulder, [leftAnimX, leftAnimY], 0, 8, false);
    }

    /**
     * 创建主护盾 - 紫色半透明椭圆形
     */
    createMainShield(glowLayer) {
        const scene = this.scene;
        
        // 缩小护盾尺寸，更贴合角色
        const shield = MeshBuilder.CreateSphere("plasmaMainShield", {
            diameter: 2.4,
            segments: 32
        }, scene);
        
        shield.parent = this.shieldRoot;
        shield.scaling = new Vector3(1, 1, 1);
        shield.position.y = 0.5;  // 降低位置，包住玩家中心
        
        const shieldMat = new StandardMaterial("plasmaShieldMat", scene);
        shieldMat.emissiveColor = new Color3(0.5, 0.15, 0.7);
        shieldMat.diffuseColor = new Color3(0.4, 0.1, 0.6);
        shieldMat.specularColor = new Color3(0.7, 0.4, 0.9);
        shieldMat.alpha = 0.04;
        shieldMat.backFaceCulling = false;
        shieldMat.disableLighting = true;
        shield.material = shieldMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(shield);
        }
        
        this.shieldMeshes.push(shield);
    }

    /**
     * 创建网格图案 - 菱形网格覆盖护盾
     */
    createGridPattern(glowLayer) {
        const scene = this.scene;
        
        // 创建多条经线 - 减少数量
        const meridianCount = 10;
        for (let i = 0; i < meridianCount; i++) {
            const angle = (Math.PI * 2 / meridianCount) * i;
            const meridian = this.createMeridianLine(scene, angle);
            meridian.parent = this.shieldRoot;
            meridian.position.y = 0.5;  // 与护盾位置一致
            
            const meridianMat = new StandardMaterial("meridianMat" + i, scene);
            meridianMat.emissiveColor = new Color3(0.7, 0.35, 0.9);
            meridianMat.alpha = 0.4;  // 更透明
            meridianMat.disableLighting = true;
            meridian.material = meridianMat;
            
            if (glowLayer) {
                glowLayer.addIncludedOnlyMesh(meridian);
            }
            
           // this.shieldMeshes.push(meridian);
        }
        
        // 创建多条纬线 - 减少数量
        const parallelCount = 8;
        for (let i = 1; i < parallelCount; i++) {
            const y = -0.9 + (1.8 / parallelCount) * i;
            const parallel = this.createParallelLine(scene, y);
            parallel.parent = this.shieldRoot;
            parallel.position.y = 0.5;  // 降低位置
            
            const parallelMat = new StandardMaterial("parallelMat" + i, scene);
            parallelMat.emissiveColor = new Color3(0.7, 0.35, 0.9);
            parallelMat.alpha = 0.35;  // 更透明
            parallelMat.disableLighting = true;
            parallel.material = parallelMat;
            
            if (glowLayer) {
                glowLayer.addIncludedOnlyMesh(parallel);
            }
            
            this.shieldMeshes.push(parallel);
        }
        
        // 创建网格交点发光点
        this.createGridNodes(glowLayer);
    }

    /**
     * 创建经线
     */
    createMeridianLine(scene, angle) {
        const points = [];
        const segments = 20;
        const radius = 1.2;  // 缩小半径
        const scaleY = 1.2;
        
        for (let i = 0; i <= segments; i++) {
            const phi = (Math.PI / segments) * i - Math.PI / 2;
            const x = Math.cos(angle) * Math.cos(phi) * radius;
            const y = Math.sin(phi) * radius * scaleY;
            const z = Math.sin(angle) * Math.cos(phi) * radius;
            points.push(new Vector3(x, y, z));
        }
        
        return MeshBuilder.CreateTube("meridian", {
            path: points,
            radius: 0.015,
            tessellation: 6,
            cap: Mesh.NO_CAP
        }, scene);
    }

    /**
     * 创建纬线
     */
    createParallelLine(scene, y) {
        const points = [];
        const segments = 24;
        const radius = 1.2;  // 缩小半径
        const scaleY = 1.2;
        
        // 根据y位置计算纬线半径
        const normalizedY = y / (radius * scaleY);
        const parallelRadius = Math.sqrt(1 - normalizedY * normalizedY) * radius;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (Math.PI * 2 / segments) * i;
            const x = Math.cos(angle) * parallelRadius;
            const z = Math.sin(angle) * parallelRadius;
            points.push(new Vector3(x, y, z));
        }
        
        return MeshBuilder.CreateTube("parallel", {
            path: points,
            radius: 0.012,
            tessellation: 6,
            cap: Mesh.NO_CAP
        }, scene);
    }

    /**
     * 创建网格交点发光节点
     */
    createGridNodes(glowLayer) {
        const scene = this.scene;
        const meridianCount = 8;
        const parallelCount = 6;
        const radius = 1.2;  // 缩小半径
        const scaleY = 1.2;
        
        for (let m = 0; m < meridianCount; m++) {
            const angle = (Math.PI * 2 / meridianCount) * m;
            
            for (let p = 1; p < parallelCount; p++) {
                const y = -0.9 + (1.8 / parallelCount) * p;
                const normalizedY = y / (radius * scaleY);
                const parallelRadius = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY)) * radius;
                
                const x = Math.cos(angle) * parallelRadius;
                const z = Math.sin(angle) * parallelRadius;
                
                const node = MeshBuilder.CreateSphere("gridNode", {
                    diameter: 0.06,
                    segments: 6
                }, scene);
                
                node.parent = this.shieldRoot;
                node.position = new Vector3(x, y , z);  // 降低位置
                
                const nodeMat = new StandardMaterial("nodeMat", scene);
                nodeMat.emissiveColor = new Color3(0.9, 0.6, 1.0);
                nodeMat.alpha = 0.7;  // 更透明
                nodeMat.disableLighting = true;
                node.material = nodeMat;
                
                if (glowLayer) {
                    glowLayer.addIncludedOnlyMesh(node);
                }
                
                this.shieldMeshes.push(node);
            }
        }
    }

    /**
     * 创建科技感边框
     */
    createTechFrame(glowLayer) {
        const scene = this.scene;
        
        // 主边框环 - 缩小尺寸
        const mainFrame = MeshBuilder.CreateTorus("techFrame", {
            diameter: 2.4,
            thickness: 0.08,
            tessellation: 48
        }, scene);
        
        mainFrame.parent = this.shieldRoot;
        mainFrame.position.y = 0.0;  // 与护盾位置一致
        mainFrame.rotation.x = Math.PI / 2;
        mainFrame.scaling.y = 1.2;
        
        const frameMat = new StandardMaterial("frameMat", scene);
        frameMat.emissiveColor = new Color3(0.45, 0.18, 0.65);
        frameMat.diffuseColor = new Color3(0.25, 0.08, 0.45);
        frameMat.specularColor = new Color3(0.7, 0.5, 0.9);
        frameMat.alpha = 0.7;
        frameMat.disableLighting = true;
        mainFrame.material = frameMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(mainFrame);
        }
        
        this.shieldMeshes.push(mainFrame);
        
        // 顶部边框 - 缩小
        const topFrame = MeshBuilder.CreateTorus("topFrame", {
            diameter: 0.8,
            thickness: 0.05,
            tessellation: 32
        }, scene);
        
        topFrame.parent = this.shieldRoot;
        topFrame.position.y = 0.9 + 1.2 * 1.2;  // 与护盾位置一致
        topFrame.rotation.x = Math.PI / 2;
        
        const topMat = new StandardMaterial("topFrameMat", scene);
        topMat.emissiveColor = new Color3(0.6, 0.25, 0.8);
        topMat.alpha = 0.6;
        topMat.disableLighting = true;
        topFrame.material = topMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(topFrame);
        }
        
        this.shieldMeshes.push(topFrame);
        
        // 底部边框 - 缩小
        const bottomFrame = MeshBuilder.CreateTorus("bottomFrame", {
            diameter: 0.8,
            thickness: 0.05,
            tessellation: 32
        }, scene);
        
        bottomFrame.parent = this.shieldRoot;
        bottomFrame.position.y = 0.9 - 1.2 * 1.2;  // 与护盾位置一致
        bottomFrame.rotation.x = Math.PI / 2;
        
        bottomFrame.material = topMat.clone("bottomFrameMat");
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(bottomFrame);
        }
        
        this.shieldMeshes.push(bottomFrame);
        
        // 装饰块
        this.createFrameDecorations(glowLayer);
    }

    /**
     * 创建边框装饰块
     */
    createFrameDecorations(glowLayer) {
        const scene = this.scene;
        const decorCount = 6;  // 减少装饰块数量
        const radius = 1.25;  // 缩小半径
        
        for (let i = 0; i < decorCount; i++) {
            const angle = (Math.PI * 2 / decorCount) * i;
            
            const decor = MeshBuilder.CreateBox("frameDecor" + i, {
                width: 0.15,
                height: 0.1,
                depth: 0.06
            }, scene);
            
            decor.parent = this.shieldRoot;
            decor.position = new Vector3(
                Math.cos(angle) * radius,
                0.5,  // 与护盾位置一致
                Math.sin(angle) * radius
            );
            decor.rotation.y = -angle;
            
            const decorMat = new StandardMaterial("decorMat" + i, scene);
            decorMat.emissiveColor = new Color3(0.55, 0.25, 0.75);
            decorMat.alpha = 0.7;
            decorMat.disableLighting = true;
            decor.material = decorMat;
            
            if (glowLayer) {
                glowLayer.addIncludedOnlyMesh(decor);
            }
            
            this.shieldMeshes.push(decor);
        }
    }

    /**
     * 创建闪电粒子效果
     */
    createLightningParticles() {
        const scene = this.scene;
        
        const lightningPS = new ParticleSystem("lightningParticles", 80, scene);  // 减少粒子
        lightningPS.particleTexture = this.createLightningTexture();
        lightningPS.emitter = this.shieldRoot;
        
        lightningPS.createSphereEmitter(1.15, 0.15);  // 缩小发射范围
        
        lightningPS.color1 = new Color4(0.85, 0.55, 0.95, 0.6);
        lightningPS.color2 = new Color4(0.65, 0.28, 0.95, 0.4);
        lightningPS.colorDead = new Color4(0.45, 0.18, 0.75, 0.0);
        
        lightningPS.minSize = 0.06;
        lightningPS.maxSize = 0.18;
        lightningPS.minLifeTime = 0.08;
        lightningPS.maxLifeTime = 0.2;
        
        lightningPS.emitRate = 30;  // 减少发射率
        lightningPS.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        lightningPS.minEmitPower = 0.5;
        lightningPS.maxEmitPower = 1.5;
        
        lightningPS.minAngularSpeed = -Math.PI * 5;
        lightningPS.maxAngularSpeed = Math.PI * 5;
        
        lightningPS.start();
        this.particleSystems.push(lightningPS);
    }

    /**
     * 创建等离子粒子效果
     */
    createPlasmaParticles() {
        const scene = this.scene;
        
        const plasmaPS = new ParticleSystem("plasmaParticles", 50, scene);  // 减少粒子
        plasmaPS.particleTexture = this.createPlasmaTexture();
        plasmaPS.emitter = this.shieldRoot;
        
        plasmaPS.createCylinderEmitter(1.15, 0.15, 0, 0);  // 缩小发射范围
        
        plasmaPS.color1 = new Color4(0.75, 0.35, 0.95, 0.35);
        plasmaPS.color2 = new Color4(0.55, 0.18, 0.85, 0.2);
        plasmaPS.colorDead = new Color4(0.35, 0.08, 0.55, 0.0);
        
        plasmaPS.minSize = 0.05;
        plasmaPS.maxSize = 0.1;
        plasmaPS.minLifeTime = 0.4;
        plasmaPS.maxLifeTime = 0.8;
        
        plasmaPS.emitRate = 20;  // 减少发射率
        plasmaPS.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        plasmaPS.direction1 = new Vector3(-0.2, 1, -0.2);
        plasmaPS.direction2 = new Vector3(0.2, 1.5, 0.2);
        
        plasmaPS.gravity = new Vector3(0, 0.8, 0);
        
        plasmaPS.start();
        this.particleSystems.push(plasmaPS);
    }

    /**
     * 创建脚底光环
     */
    createFootRing(glowLayer) {
        const scene = this.scene;
        
        // 缩小脚底光环
        const footRing = MeshBuilder.CreateTorus("plasmaFootRing", {
            diameter: 1.8,
            thickness: 0.06,
            tessellation: 48
        }, scene);
        
        footRing.parent = this.shieldRoot;
        footRing.position.y = 0.05;
        footRing.rotation.x = Math.PI / 2;
        
        const footMat = new StandardMaterial("plasmaFootMat", scene);
        footMat.emissiveColor = new Color3(0.6, 0.25, 0.85);
        footMat.alpha = 0.6;
        footMat.disableLighting = true;
        footRing.material = footMat;
        
        if (glowLayer) {
            glowLayer.addIncludedOnlyMesh(footRing);
        }
        
        this.shieldMeshes.push(footRing);
        
        // 内环 - 缩小
        const innerRing = MeshBuilder.CreateTorus("plasmaInnerRing", {
            diameter: 1.2,
            thickness: 0.03,
            tessellation: 32
        }, scene);
        
        innerRing.parent = this.shieldRoot;
        innerRing.position.y = 0.05;
        innerRing.rotation.x = Math.PI / 2;
        
        const innerMat = new StandardMaterial("plasmaInnerMat", scene);
        innerMat.emissiveColor = new Color3(0.8, 0.45, 0.95);
        innerMat.alpha = 0.45;
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
            
            const playerPos = this.player.mesh.position;
            this.shieldRoot.position = playerPos.clone();
            
            this.rotationAngle += 0.015;
            this.lightningTime += 0.1;
            
            // 旋转边框装饰
            this.shieldMeshes.forEach((mesh, index) => {
                if (mesh.name.includes("frameDecor")) {
                    mesh.rotation.z = Math.sin(this.rotationAngle * 2 + index) * 0.2;
                }
                if (mesh.name === "plasmaFootRing") {
                    mesh.rotation.z = this.rotationAngle * 0.3;
                }
                if (mesh.name === "plasmaInnerRing") {
                    mesh.rotation.z = -this.rotationAngle * 0.5;
                }
                if (mesh.name === "techFrame") {
                    mesh.rotation.z = this.rotationAngle * 0.1;
                }
                // 网格节点闪烁
                if (mesh.name === "gridNode" && mesh.material) {
                    const flicker = 0.7 + Math.sin(this.lightningTime + index * 0.5) * 0.3;
                    mesh.material.alpha = flicker;
                }
            });
            
            // 护盾脉冲效果
            const pulse = 1 + Math.sin(this.rotationAngle * 3) * 0.015;
            this.shieldMeshes.forEach(mesh => {
                if (mesh.name === "plasmaMainShield") {
                    mesh.scaling.x = pulse;
                    mesh.scaling.z = pulse;
                }
            });
        });
    }

    cleanup() {
        if (this.updateObserver) {
            this.scene.onBeforeRenderObservable.remove(this.updateObserver);
            this.updateObserver = null;
        }
        
        this.particleSystems.forEach(ps => {
            ps.stop();
            ps.dispose();
        });
        this.particleSystems = [];
        
        this.shieldMeshes.forEach(mesh => {
            if (mesh.material) mesh.material.dispose();
            mesh.dispose();
        });
        this.shieldMeshes = [];
        
        if (this.shieldRoot) {
            this.shieldRoot.dispose();
            this.shieldRoot = null;
        }
    }

    createLightningTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.2, "rgba(220, 180, 255, 0.9)");
        grad.addColorStop(0.5, "rgba(180, 100, 255, 0.5)");
        grad.addColorStop(1, "rgba(120, 50, 200, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        // 添加闪电纹路
        ctx.strokeStyle = "rgba(255, 220, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(32, 8);
        ctx.lineTo(28, 24);
        ctx.lineTo(36, 28);
        ctx.lineTo(30, 48);
        ctx.stroke();
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "lightningTex", this.scene);
    }

    createPlasmaTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255, 200, 255, 1)");
        grad.addColorStop(0.3, "rgba(200, 120, 255, 0.7)");
        grad.addColorStop(0.6, "rgba(150, 80, 220, 0.4)");
        grad.addColorStop(1, "rgba(100, 50, 180, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        return Texture.CreateFromBase64String(canvas.toDataURL(), "plasmaTex", this.scene);
    }

    update(deltaTime) {
        super.update(deltaTime);
    }

    isShieldActive() {
        return this.isActive;
    }
}
