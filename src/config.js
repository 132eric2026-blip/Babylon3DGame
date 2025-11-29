export const Config = {
    player: {
        speed: 3,
        height: 2,
        width: 1,
        depth: 1,
        showCollider: false // 是否显示物理胶囊体
    },
    shield: {
        particlesEnabled: true // 是否开启护盾粒子效果
    },
    scene: {
        gravity: -9.81,
        groundColor: { r: 0.2, g: 0.2, b: 0.2 },
        // 阴影配置
        shadows: {
            enabled: true,
            size: 2048,
            useBlurExponentialShadowMap: false,
            blurKernel: 16,
            useKernelBlur: false,
            darkness: 0.5
        },
        hemiLightIntensity: 0.1,
        dirLightIntensity: 0.2,
        dirLightPosition: { x: 20, y: 40, z: 20 },
        decorations: {
            count: 50, // 装饰物总数
            areaSize: 80, // 分布范围（-40 到 40）
            stoneColor: { r: 0.5, g: 0.5, b: 0.5 },
            treeTrunkColor: { r: 0.4, g: 0.2, b: 0.1 },
            treeLeavesColor: { r: 0.1, g: 0.6, b: 0.1 }
        }
    },
    minimap: {
        showMask: false, // 是否显示圆形遮罩（黑色四角）
        zoom: 20,
        minZoom: 10,
        maxZoom: 100,
        zoomStep: 10
    }
};
