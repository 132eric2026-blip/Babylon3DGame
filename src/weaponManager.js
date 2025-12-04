import { Vector3 } from "@babylonjs/core";
import { Config } from "./config";
// import { spawnAlphaParticleCannon } from "./props/guns/AlphaParticleCannon";
// import { spawnPegasusParticleCannon } from "./props/guns/PegasusParticleCannon";
import { spawnSolarPlasmaCannon } from "./equipment/weapons/ranged/SolarPlasmaCannon";
import { spawnThunderStormBlade } from "./equipment/weapons/melee/ThunderStormBlade";
// import { spawnScorpioPulsarGun } from "./props/guns/ScorpioPulsarGun";
// import { spawnQuantumAnnihilator } from "./props/guns/QuantumAnnihilator";
// import { spawnEmeraldViper } from "./props/guns/EmeraldViper";
// import { spawnChronoArbalest } from "./props/guns/ChronoArbalest";
// import { spawnThunderArcGun } from "./props/guns/ThunderArcGun";

/**
 * 武器注册表 - 武器名称到生成函数的映射
 */
const WEAPON_REGISTRY = {
    // AlphaParticleCannon: spawnAlphaParticleCannon,
    // PegasusParticleCannon: spawnPegasusParticleCannon,
    SolarPlasmaCannon: spawnSolarPlasmaCannon,
    ThunderStormBlade: spawnThunderStormBlade,
    // ScorpioPulsarGun: spawnScorpioPulsarGun,
    // QuantumAnnihilator: spawnQuantumAnnihilator,
    // EmeraldViper: spawnEmeraldViper,
    // ChronoArbalest: spawnChronoArbalest,
    // ThunderArcGun: spawnThunderArcGun
};

/**
 * 获取所有启用的武器列表
 * @returns {Array<{name: string, weight: number, spawnFn: Function}>}
 */
export function getEnabledWeapons() {
    const enabled = [];
    const weaponConfig = Config.weapons;

    for (const weaponName in WEAPON_REGISTRY) {
        const config = weaponConfig[weaponName];

        // 检查武器是否在配置中且已启用
        if (config && config.enabled) {
            enabled.push({
                name: weaponName,
                weight: config.spawnWeight || 1.0,
                spawnFn: WEAPON_REGISTRY[weaponName]
            });
        }
    }

    return enabled;
}

/**
 * 基于权重随机选择一个武器
 * @returns {{name: string, weight: number, spawnFn: Function} | null}
 */
export function selectRandomWeapon() {
    const enabledWeapons = getEnabledWeapons();

    if (enabledWeapons.length === 0) {
        console.warn("No weapons enabled in config!");
        return null;
    }

    // 计算总权重
    const totalWeight = enabledWeapons.reduce((sum, weapon) => sum + weapon.weight, 0);

    // 随机选择
    let random = Math.random() * totalWeight;

    for (const weapon of enabledWeapons) {
        random -= weapon.weight;
        if (random <= 0) {
            return weapon;
        }
    }

    // 兜底返回最后一个
    return enabledWeapons[enabledWeapons.length - 1];
}

/**
 * 生成随机位置
 * @param {number} areaSize - 生成区域大小
 * @returns {Vector3}
 */
function getRandomPosition(areaSize) {
    const halfSize = areaSize / 2;
    const x = (Math.random() - 0.5) * areaSize;
    const z = (Math.random() - 0.5) * areaSize;
    return new Vector3(x, 0.5, z);
}

/**
 * 在场景中生成指定数量的武器
 * @param {Scene} scene - Babylon.js 场景
 * @param {Player} player - 玩家对象
 * @param {number} count - 生成数量(可选,默认使用配置)
 */
export function spawnWeapons(scene, player, count = null) {
    const spawnCount = count !== null ? count : Config.weapons.spawnCount;
    const areaSize = Config.weapons.spawnAreaSize;

    const enabledWeapons = getEnabledWeapons();

    if (enabledWeapons.length === 0) {
        console.warn("No weapons enabled! Skipping weapon spawn.");
        return;
    }

    console.log(`Spawning ${spawnCount} weapons from ${enabledWeapons.length} enabled types...`);

    for (let i = 0; i < spawnCount; i++) {
        const weapon = selectRandomWeapon();
        if (weapon) {
            const position = getRandomPosition(areaSize);
            console.log(`  - Spawning ${weapon.name} at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
            weapon.spawnFn(scene, position, player);
        }
    }
}
