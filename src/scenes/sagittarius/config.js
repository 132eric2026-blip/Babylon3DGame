/**
 * 人马座场景配置
 * 控制星门、巨行星与小行星带的启用与参数
 */
export const SagittariusSceneConfig = {
    stargate: {
        enabled: true,
        position: { x: 15, y: 0, z: 15 } // 放置在稍远的位置
    },
    giantPlanet: {
        enabled: true,
        position: { x: -500, y: 200, z: 800 }, // 天空位置
        scale: 300
    },
    asteroids: {
        enabled: true,
        count: 1500,
        radius: 300,
        width: 100
    }
};
