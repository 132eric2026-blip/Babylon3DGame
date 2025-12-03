/**
 * 装备基类
 * 所有具体的装备（如武器、防具等）都应该继承此类
 */
export class Equipment {
    /**
     * 构造函数
     * @param {Scene} scene - BabylonJS 场景对象
     * @param {string} name - 装备名称
     * @param {string} type - 装备类型 (例如 "gun", "armor")
     */
    constructor(scene, name, type) {
        this.scene = scene;
        this.name = name;
        this.type = type;
        this.mesh = null; // 装备对应的视觉网格
    }

    /**
     * 初始化装备，通常用于创建网格
     * 子类应该重写此方法
     */
    init() {
        console.warn(`${this.name} 的 init 方法未实现`);
    }

    /**
     * 销毁装备资源
     */
    dispose() {
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
    }
}
