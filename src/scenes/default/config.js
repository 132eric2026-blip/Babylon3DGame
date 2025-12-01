export const DefaultSceneConfig = {
    horseEnabled: false, // 是否生成马
    groundColor: { r: 0.2, g: 0.2, b: 0.2 },
    hemiLightIntensity: 0.3,
    dirLightIntensity: 0.2,
    dirLightPosition: { x: 20, y: 40, z: -20 },
    decorations: {
        count: 50, // 装饰物总数
        areaSize: 80, // 分布范围（-40 到 40）
        stoneColor: { r: 0.5, g: 0.5, b: 0.5 },
        treeTrunkColor: { r: 0.4, g: 0.2, b: 0.1 },
        treeLeavesColor: { r: 0.1, g: 0.6, b: 0.1 },
        treesEnabled: false, // 是否生成树木
        rocksEnabled: false,  // 是否生成岩石
        streetLampsEnabled: false // 是否生成路灯
    }
};
