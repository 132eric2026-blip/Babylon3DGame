export const Config = {
    player: {
        speed: 5,
        height: 2,
        width: 1,
        depth: 1,
        showCollider: false // 是否显示物理胶囊体
    },
    scene: {
        gravity: -9.81,
        groundColor: { r: 0.2, g: 0.2, b: 0.2 },
        enableShadows: true,
        hemiLightIntensity: 0.5,
        dirLightIntensity: 0.7,
        dirLightPosition: { x: 20, y: 40, z: 20 },
        decorations: {
            count: 50, // 装饰物总数
            areaSize: 80, // 分布范围（-40 到 40）
            stoneColor: { r: 0.5, g: 0.5, b: 0.5 },
            treeTrunkColor: { r: 0.4, g: 0.2, b: 0.1 },
            treeLeavesColor: { r: 0.1, g: 0.6, b: 0.1 }
        }
    }
};
