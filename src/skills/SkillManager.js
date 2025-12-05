import { HalfMoonSlash } from "./HalfMoonSlash/HalfMoonSlash";
import { ThunderSpear } from "./ThunderSpear/ThunderSpear";
import { FlameShockwave } from "./FlameShockwave/FlameShockwave";
import { EnergyShield } from "./EnergyShield/EnergyShield";
import { PlasmaShield } from "./PlasmaShield/PlasmaShield";

/**
 * 技能管理器
 * 负责管理所有玩家技能的注册、激活和执行
 */
export class SkillManager {
    /**
     * 构造函数
     * @param {Scene} scene - BabylonJS 场景
     * @param {Player2} player - 玩家实例
     */
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // 技能槽（数字键1-9，0）
        this.skills = new Array(10).fill(null);
        
        // 初始化技能
        this.initSkills();
        
        // 设置输入监听
        this.setupInput();
    }
    
    /**
     * 初始化技能
     */
    initSkills() {
        // 第一个技能槽（按键1）：半月斩
        this.skills[0] = new HalfMoonSlash(this.scene, this.player);
        // 第二个技能槽（按键F）：雷霆之矛
        this.skills[1] = new ThunderSpear(this.scene, this.player);
        // 第三个技能槽（按键R）：烈焰震地
        this.skills[2] = new FlameShockwave(this.scene, this.player);
        // 第四个技能槽（按键E）：能量护盾
        this.skills[3] = new EnergyShield(this.scene, this.player);
        // 第五个技能槽（按键Z）：等离子护盾
        this.skills[4] = new PlasmaShield(this.scene, this.player);
    }
    
    /**
     * 设置输入监听
     */
    setupInput() {
        window.addEventListener("keydown", (evt) => {
            const key = evt.key;
            
            // 数字键 1-9, 0
            if (key >= '1' && key <= '9') {
                const index = parseInt(key) - 1;
                this.activateSkill(index);
            } else if (key === '0') {
                this.activateSkill(9);
            }
            
            // F键：释放第二个技能（雷霆之矛）
            if (key.toLowerCase() === 'f') {
                this.activateSkill(1);
            }
            
            // R键：释放第三个技能（烈焰震地）
            if (key.toLowerCase() === 'r') {
                this.activateSkill(2);
            }
            
            // E键：切换第四个技能（能量护盾）
            if (key.toLowerCase() === 'e') {
                this.activateSkill(3);
            }
            
            // Z键：切换第五个技能（等离子护盾）
            if (key.toLowerCase() === 'z') {
                this.activateSkill(4);
            }
        });
    }
    
    /**
     * 激活技能
     * @param {number} index - 技能槽索引（0-9）
     */
    activateSkill(index) {
        const skill = this.skills[index];
        
        if (!skill) {
            console.log(`技能槽 ${index + 1} 没有技能`);
            return;
        }
        
        // 检查冷却
        if (!skill.isReady()) {
            const remainingCooldown = skill.getRemainingCooldown();
            console.log(`技能 ${skill.name} 冷却中，剩余 ${remainingCooldown.toFixed(1)} 秒`);
            return;
        }
        
        // 激活技能
        skill.activate();
    }
    
    /**
     * 更新技能状态（每帧调用）
     * @param {number} deltaTime - 帧间隔时间（秒）
     */
    update(deltaTime) {
        // 更新所有技能的冷却时间
        for (const skill of this.skills) {
            if (skill) {
                skill.update(deltaTime);
            }
        }
    }
}
