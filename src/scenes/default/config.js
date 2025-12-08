/**
 * 默认场景配置
 * 控制马生成、地面颜色、光照强度与装饰开关等
 */
export const DefaultSceneConfig = {
    horseEnabled: false, // 是否生成马
    groundColor: { r: 0.2, g: 0.2, b: 0.2 },
    hemiLightIntensity: .4,
    dirLightIntensity: 0.2,
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
        areaSize:100, // 分布范围（-90 到 90）
        stoneColor: { r: 0.5, g: 0.5, b: 0.5 },
        treeTrunkColor: { r: 0.4, g: 0.2, b: 0.1 },
        treeLeavesColor: { r: 0.1, g: 0.6, b: 0.1 },
        treesEnabled: true, // 是否生成树木
        treeCount: 30,     // 树木生成数量
        treesShadowEnabled: true,
        treeShadowCount: 12,
        treesPhysicsEnabled: true,
        showPhysicsColliders: false, // 是否显示刚体轮廓（调试用）
        trunkHeightRange: { min: 3, max: 8 },
        trunkWidthRange: { min: 0.55, max: 1.1 },
        crownSizeRange: { min: 2.0, max: 3.2 },
        rocksEnabled: true,  // 是否生成岩石
        streetLampsEnabled: false, // 是否生成路灯
        treeShadow: {
            filter: "pcf",
            quality: "medium", //"low"|"medium"|"high"
            mapSize: 2048,        // 优化：从4096降至2048以提高性能
            blurKernel: 8,
            useKernelBlur: false,
            darkness: 0.4,        // 降低阴影透明度使其更清晰
            bias: 0.00005,        // 减小bias避免阴影痤疮和提高边缘清晰度
            normalBias: 0.02      // 减小normalBias提高阴影精度
        }
    }
};
