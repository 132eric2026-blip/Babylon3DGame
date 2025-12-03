/**
 * 默认场景配置
 * 控制马生成、地面颜色、光照强度与装饰开关等
 */
export const DefaultSceneConfig = {
    horseEnabled: false, // 是否生成马
    groundColor: { r: 0.2, g: 0.2, b: 0.2 },
    hemiLightIntensity: 0.5,
    dirLightIntensity: 0.4,
    dirLightPosition: { x: 20, y: 40, z: -20 },
    // 环境设置
    ambientColor: { r: 0.3, g: 0.3, b: 0.3 }, // 环境光颜色
    clearColor: { r: 0.5, g: 0.8, b: 1.0, a: 1.0 }, // 背景色 (天空)
    fog: {
        enabled: false, // 是否开启雾效
        density: 10.3, // 雾的浓度（数值越大能见度越低，0.002为淡雾，0.1为浓雾）
        color: { r: 0.5, g: 0.8, b: 1.0 } // 雾的颜色
    },
    decorations: {
        count: 20, // 装饰物总数
        areaSize: 80, // 分布范围（-40 到 40）
        stoneColor: { r: 0.5, g: 0.5, b: 0.5 },
        treeTrunkColor: { r: 0.4, g: 0.2, b: 0.1 },
        treeLeavesColor: { r: 0.1, g: 0.6, b: 0.1 },
        treesEnabled: true, // 是否生成树木
        rocksEnabled: true,  // 是否生成岩石
        streetLampsEnabled: false // 是否生成路灯
    }
};
