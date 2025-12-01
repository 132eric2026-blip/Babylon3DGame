import { MeshBuilder, Vector3, StandardMaterial, Color3, Matrix, Quaternion, Texture } from "@babylonjs/core";

/**
 * 小行星带
 * 使用薄实例绘制大规模小行星并进行环形分布与缓慢旋转
 */
export class AsteroidBelt {
    /**
     * 构造小行星带
     * @param {Scene} scene 场景实例
     * @param {number} count 数量
     * @param {number} radius 半径
     * @param {number} width 带宽（径向/高度随机范围）
     */
    constructor(scene, count = 1000, radius = 200, width = 50) {
        this.scene = scene;
        this.count = count;
        this.radius = radius;
        this.width = width;
        
        this.createAsteroids();
    }

    /**
     * 创建并布置小行星，使用 Thin Instance 以提升性能
     */
    createAsteroids() {
        // 基础小行星网格
        const asteroidMaster = MeshBuilder.CreatePolyhedron("asteroidMaster", {
            type: 2, // 类二十面体
            size: 2
        }, this.scene);
        
        // 岩石材质
        const mat = new StandardMaterial("asteroidMat", this.scene);
        mat.diffuseColor = new Color3(0.4, 0.35, 0.3);
        mat.specularColor = new Color3(0.1, 0.1, 0.1);
        mat.bumpTexture = new Texture("https://playground.babylonjs.com/textures/rockn.png", this.scene);
        asteroidMaster.material = mat;

        // 使用 Thin Instance 提升性能
        const matrices = new Float32Array(16 * this.count);
        const colorData = new Float32Array(4 * this.count);

        for (let i = 0; i < this.count; i++) {
            const matrix = Matrix.Identity();
            
            // 在环带形状中生成随机位置
            // 角度
            const angle = Math.random() * Math.PI * 2;
            // 距中心距离（围绕半径的高斯式分布）
            const dist = this.radius + (Math.random() - 0.5) * this.width;
            // 高度扰动
            const height = (Math.random() - 0.5) * (this.width * 0.4);

            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const y = height;

            const position = new Vector3(x, y, z);

            // 随机旋转
            const rotation = Quaternion.FromEulerAngles(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            // 随机缩放
            const scaleVal = 0.5 + Math.random() * 2.0;
            const scale = new Vector3(scaleVal, scaleVal, scaleVal);

            Matrix.ComposeToRef(scale, rotation, position, matrix);
            
            matrix.copyToArray(matrices, i * 16);

            // 随机微小颜色变化
            const tint = 0.8 + Math.random() * 0.4;
            colorData[i * 4] = tint;
            colorData[i * 4 + 1] = tint;
            colorData[i * 4 + 2] = tint;
            colorData[i * 4 + 3] = 1.0;
        }

        asteroidMaster.thinInstanceSetBuffer("matrix", matrices, 16, true);
        asteroidMaster.thinInstanceSetBuffer("color", colorData, 4);
        
        // 可选：添加旋转动画（大规模建议静态或着色器侧处理）
        // 此处通过整体缓慢旋转即可
        
        // 整体旋转根节点
        this.root = asteroidMaster;
        
        this.scene.registerBeforeRender(() => {
            this.root.rotation.y += 0.0005;
        });
    }
}
