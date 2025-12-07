/**
 * 默认场景配置
 * 控制马生成、地面颜色、光照强度与装饰开关等
 */
export const DefaultSceneConfig = {
    horseEnabled: false,
    groundColor: { r: 0.06, g: 0.06, b: 0.08 },
    hemiLightIntensity: 0.18,
    dirLightIntensity: 0.22,
    dirLightPosition: { x: -60, y: 80, z: 40 },
    ambientColor: { r: 0.05, g: 0.05, b: 0.10 },
    clearColor: { r: 0.02, g: 0.02, b: 0.06, a: 1.0 },
    fog: {
        enabled: true,
        density: 0.002,
        color: { r: 0.02, g: 0.02, b: 0.06 }
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
        streetLampsEnabled: true,
        treeShadow: {
            filter: "pcf",
            quality: "high", //"low"|"medium"|"high"
            mapSize: 4096,        // 增大阴影贴图尺寸提高清晰度
            blurKernel: 8,
            useKernelBlur: false,
            darkness: 0.4,        // 降低阴影透明度使其更清晰
            bias: 0.00005,        // 减小bias避免阴影痤疮和提高边缘清晰度
            normalBias: 0.02      // 减小normalBias提高阴影精度
        }
    }
};
