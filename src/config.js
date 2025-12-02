export const Config = {
    selectedPlayer: "player2", // "player1" or "player2"
    player: {
        speed: 3,
        sprintMultiplier: 2,
        sprintSpeed: 8,
        antiGravityUpSpeed: 3.5,
        boosterReenableImpulseMs: 220,
        jumpSpeed: 6.5,
        height: 2,
        width: 1,
        depth: 1,
        showCollider: false // 是否显示物理胶囊体
    },
    player2: {
        speed: 3,
        sprintMultiplier: 2,
        sprintSpeed: 8,
        jumpSpeed: 6.5,
        boosterUpSpeed: 5,
        boosterSpeed: 10,
        boosterHoverHeight: 1,
        showCollider: false
    },
    shield: {
        particlesEnabled: true // 是否开启护盾粒子效果
    },
    scene: {
        activeScene: "default", // "sagittarius" or "default"
        gravity: -9.81,
        showAxes: false, // 是否显示世界坐标系
        // 阴影配置
        shadows: {
            enabled: true,
            size: 2048,
            useBlurExponentialShadowMap: false,
            blurKernel: 16,
            useKernelBlur: false,
            darkness: 0.5
        }
    },
    minimap: {
        showMask: false, // 是否显示圆形遮罩（黑色四角）
        zoom: 20,
        minZoom: 10,
        maxZoom: 100,
        zoomStep: 10
    },
    weapons: {
        // 武器生成配置
        spawnCount: 2, // 游戏中生成的武器数量
        spawnAreaSize: 40, // 生成范围 (-20 到 20)

        // 各武器配置
        AlphaParticleCannon: { // 阿尔法粒子炮
            enabled: false,
            spawnWeight: 1.0 // 生成权重(相对概率)
        },
        PegasusParticleCannon: { // 飞马粒子炮
            enabled: false,
            spawnWeight: 1.0
        },
        LightSpear: { // 光矛
            enabled: false, // 未实现,默认禁用
            spawnWeight: 1.0
        },
        SolarPlasmaCannon: { // 太阳等离子炮
            enabled: true,
            spawnWeight: .5
        },
        ScorpioPulsarGun: { // 天蝎脉冲枪
            enabled: false,
            spawnWeight: 1.0
        },
        QuantumAnnihilator: { // 量子湮灭炮
            enabled: false,
            spawnWeight: 1.0
        },
        EmeraldViper: { // 翡翠毒蛇 (生物生化武器)
            enabled: false,
            spawnWeight: 1.0
        },
        ChronoArbalest: { // 时空劲弩 (蒸汽朋克)
            enabled: false,
            spawnWeight: 1.0
        },
        ThunderArcGun: { // 雷霆电弧枪 (特斯拉电弧)
            enabled: true,
            spawnWeight:.5
        }
    }
};
