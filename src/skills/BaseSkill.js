/**
 * 技能基类
 * 所有技能都继承此类
 */
export class BaseSkill {
    /**
     * 构造函数
     * @param {Scene} scene - BabylonJS 场景
     * @param {Player2} player - 玩家实例
     * @param {string} name - 技能名称
     * @param {number} cooldown - 冷却时间（秒）
     */
    constructor(scene, player, name, cooldown) {
        this.scene = scene;
        this.player = player;
        this.name = name;
        this.cooldown = cooldown;
        this.currentCooldown = 0; // 当前冷却剩余时间
    }
    
    /**
     * 激活技能
     */
    activate() {
        if (!this.isReady()) {
            return false;
        }
        
        console.log(`激活技能：${this.name}`);
        
        // 执行技能效果
        this.execute();
        
        // 开始冷却
        this.currentCooldown = this.cooldown;
        
        return true;
    }
    
    /**
     * 执行技能效果（由子类实现）
     */
    execute() {
        throw new Error("execute() 方法必须由子类实现");
    }
    
    /**
     * 检查技能是否就绪
     * @returns {boolean}
     */
    isReady() {
        return this.currentCooldown <= 0;
    }
    
    /**
     * 获取剩余冷却时间
     * @returns {number}
     */
    getRemainingCooldown() {
        return this.currentCooldown;
    }
    
    /**
     * 更新技能状态
     * @param {number} deltaTime - 帧间隔时间（秒）
     */
    update(deltaTime) {
        if (this.currentCooldown > 0) {
            this.currentCooldown -= deltaTime;
            if (this.currentCooldown < 0) {
                this.currentCooldown = 0;
            }
        }
    }
}
