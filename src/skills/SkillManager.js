import { HalfMoonSlash } from "./HalfMoonSlash/HalfMoonSlash";
import { ThunderSpear } from "./ThunderSpear/ThunderSpear";
import { FlameShockwave } from "./FlameShockwave/FlameShockwave";
import { DragonBreath } from "./DragonBreath/DragonBreath";
//import { EnergyShield } from "./EnergyShield/EnergyShield";
import { AlphaShield } from "./AlphaShield/AlphaShield";
//import { GoldenShield } from "./GoldenShield/GoldenShield";
//import { FireRingShield } from "./FireRingShield/FireRingShield";
import { PhoenixRay } from "./PhoenixRay/PhoenixRay";
// 已移除 FireShield


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
        // 第四个技能槽（按键4）：能量护盾
        //this.skills[3] = new EnergyShield(this.scene, this.player);
        // 第五个技能槽（按键E）：Alpha护盾（开关模式）
        //this.skills[4] = new GoldenShield(this.scene, this.player);
        // 实际上 E 键绑定的是 index 5
        this.skills[5] = new AlphaShield(this.scene, this.player);
        // 第六个技能槽（按键Z）：龙息术
        this.skills[6] = new DragonBreath(this.scene, this.player);
        // 第七个技能槽：火焰防护盾
        //this.skills[7] = new FireRingShield(this.scene, this.player);
        // 第八个技能槽（鼠标中键）：凤凰射线（持续释放）
        this.skills[8] = new PhoenixRay(this.scene, this.player);
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

            // E键：释放Alpha护盾（开关模式）
            if (key.toLowerCase() === 'e') {
                this.activateSkill(5);
            }
            
            // Z键：释放龙息术
            if (key.toLowerCase() === 'z') {
                this.activateSkill(6);
            }
            
        });
        
        // 鼠标中键：凤凰射线（按住持续释放）
        // 注意：这部分逻辑已移动到 Player.js 中处理，以便支持 UI 遮挡检测
        /*
        window.addEventListener("mousedown", (evt) => {
            if (evt.button === 1) { // 鼠标中键
                evt.preventDefault();
                const phoenixRay = this.skills[8];
                if (phoenixRay && phoenixRay.startChanneling) {
                    phoenixRay.startChanneling();
                }
            }
        });
        
        window.addEventListener("mouseup", (evt) => {
            if (evt.button === 1) { // 鼠标中键
                const phoenixRay = this.skills[8];
                if (phoenixRay && phoenixRay.stopChanneling) {
                    phoenixRay.stopChanneling();
                }
            }
        });
        */
        
        // 防止中键点击时的默认滚动行为
        window.addEventListener("auxclick", (evt) => {
            if (evt.button === 1) {
                evt.preventDefault();
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
