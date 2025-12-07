/**
 * 纳格兰场景配置
 * 魔兽世界燃烧的远征 - 纳格兰风格
 */
export const NagrandConfig = {
    // 地形配置
    terrain: {
        size: 200,           // 地形尺寸
        subdivisions: 32,    // 细分程度（优化后）
        groundColor: {
            primary: { r: 0.25, g: 0.45, b: 0.2 },    // 翠绿色草地
            secondary: { r: 0.35, g: 0.55, b: 0.25 }  // 浅绿色变化
        },
        heightScale: 3       // 地形高度变化幅度
    },
    
    // 天空配置
    sky: {
        // 主色调 - 紫粉色系
        colors: {
            zenith: { r: 0.15, g: 0.08, b: 0.25 },      // 天顶深紫色
            horizon: { r: 0.4, g: 0.25, b: 0.45 },      // 地平线粉紫色
            ambient: { r: 0.35, g: 0.25, b: 0.45 }      // 环境光色调
        },
        // 星星配置
        stars: {
            density: 0.003,        // 星星密度
            brightness: 0.8,       // 亮度
            twinkleSpeed: 2.0      // 闪烁速度
        },
        // 云层配置
        clouds: {
            layers: 2,             // 云层数量
            speed: 0.02,           // 移动速度
            opacity: 0.6,          // 透明度
            color: { r: 0.5, g: 0.35, b: 0.5 }  // 粉紫色云彩
        },
        // 光带/星云配置
        nebula: {
            enabled: true,
            color: { r: 0.9, g: 0.4, b: 0.9 },    // 亮粉色
            coreColor: { r: 1.0, g: 0.8, b: 1.0 }, // 核心高亮
            width: 0.15,           // 光带宽度
            intensity: 1.5,        // 强度
            flowSpeed: 0.3         // 流动速度
        }
    },
    
    // 光照配置
    lighting: {
        directional: {
            direction: { x: -0.5, y: -1, z: 0.3 },
            intensity: 0.8,
            color: { r: 1.0, g: 0.9, b: 0.95 }    // 略带粉色的阳光
        },
        ambient: {
            intensity: 0.4,
            color: { r: 0.6, g: 0.5, b: 0.7 }     // 紫色环境光
        },
        hemispheric: {
            intensity: 0.3,
            groundColor: { r: 0.2, g: 0.3, b: 0.15 }  // 草地反射
        }
    },
    
    // 装饰物配置
    decorations: {
        // 树木配置
        trees: {
            count: 25,            // 树木数量（优化后）
            minHeight: 4,
            maxHeight: 12,
            spreadRadius: 90,     // 分布半径
            // 纳格兰特色 - 非洲金合欢树风格
            types: ['acacia', 'baobab', 'twisted'],
            foliageColors: [
                { r: 0.3, g: 0.6, b: 0.25 },   // 翠绿
                { r: 0.4, g: 0.55, b: 0.2 },   // 橄榄绿
                { r: 0.25, g: 0.5, b: 0.3 }    // 深绿
            ]
        },
        // 岩石配置
        rocks: {
            count: 20,            // 岩石数量（优化后）
            minSize: 0.8,
            maxSize: 4,
            spreadRadius: 95,
            // 纳格兰特色 - 漂浮岩石风格的颜色
            colors: [
                { r: 0.55, g: 0.5, b: 0.45 },   // 灰褐色
                { r: 0.6, g: 0.55, b: 0.5 },    // 浅褐色
                { r: 0.45, g: 0.4, b: 0.38 }    // 深灰色
            ]
        },
        // 草丛配置
        grass: {
            enabled: false,       // 禁用草丛提升性能
            density: 50,
            height: 0.5,
            spreadRadius: 85
        }
    },
    
    // 雾效配置
    fog: {
        enabled: true,
        mode: 'exponential',
        density: 0.008,
        color: { r: 0.35, g: 0.28, b: 0.42 }  // 紫色薄雾
    }
};
