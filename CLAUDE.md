# Babylon3DGame 项目架构文档

## 概述

基于 **Babylon.js 8.x + WebGPU** 构建的3D动作游戏，支持角色控制、技能系统、武器装备、多场景切换等功能。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Babylon.js | ^8.39.0 | 3D渲染引擎（WebGPU版本） |
| Babylon.js GUI | ^8.39.0 | UI界面系统 |
| Havok Physics | ^1.3.10 | 物理引擎 |
| Vite | ^5.4.21 | 构建工具 |

## 项目结构

```
Babylon3DGame/
├── src/
│   ├── main.js                 # 应用入口，引擎与场景初始化
│   ├── config.js               # 全局配置（角色、武器、场景等）
│   ├── player.js               # 玩家控制器（Player2类）
│   ├── ui.js                   # UI系统（性能面板等）
│   ├── skills.js               # 技能栏UI
│   ├── minimap.js              # 小地图
│   ├── weaponManager.js        # 武器生成管理
│   │
│   ├── characters/             # 角色系统
│   │   ├── boxMan/             # 方块人角色
│   │   └── voxelKnight/        # 体素骑士角色
│   │
│   ├── equipment/              # 装备系统
│   │   └── weapons/
│   │       ├── melee/          # 近战武器
│   │       │   └── ThunderStormBlade.js
│   │       └── ranged/         # 远程武器
│   │           ├── SolarPlasmaCannon.js
│   │           ├── CrystalVoidWand.js
│   │           └── ForestStaff.js
│   │
│   ├── skills/                 # 技能系统
│   │   ├── BaseSkill.js        # 技能基类
│   │   ├── SkillManager.js     # 技能管理器
│   │   ├── HalfMoonSlash/      # 半月斩
│   │   ├── ThunderSpear/       # 雷霆之矛
│   │   ├── FlameShockwave/     # 烈焰震地
│   │   └── AlphaShield/        # Alpha护盾
│   │
│   ├── scenes/                 # 场景系统
│   │   ├── default/            # 默认场景
│   │   │   ├── DefaultScene.js
│   │   │   ├── config.js
│   │   │   ├── decorations.js
│   │   │   └── horse.js
│   │   └── sagittarius/        # 射手座星域场景
│   │       ├── SagittariusScene.js
│   │       ├── asteroidBelt.js
│   │       ├── giantPlanet.js
│   │       └── stargate.js
│   │
│   └── ui/                     # UI组件
│       └── BackpackUI.js       # 背包界面
│
├── index.html                  # 入口页面
├── vite.config.js              # Vite配置
└── package.json                # 依赖配置
```

## 核心模块

### 1. 渲染引擎 (main.js)

```
WebGPUEngine
    ├── 异步初始化 (initAsync)
    ├── 抗锯齿 (antialiasingEnabled)
    ├── 后处理管线 (DefaultRenderingPipeline)
    │   ├── FXAA
    │   ├── Bloom (泛光)
    │   └── 多重采样
    └── 发光层 (GlowLayer)
```

### 2. 玩家系统 (player.js - Player2)

```
Player2
    ├── 角色实例化
    │   ├── BoxMan (方块人)
    │   └── VoxelKnight (体素骑士)
    │
    ├── 输入控制
    │   ├── WASD 移动
    │   ├── Space 跳跃
    │   ├── Shift 冲刺
    │   ├── Q 喷射器模式
    │   └── Tab 背包切换
    │
    ├── 武器系统
    │   ├── 装备管理
    │   ├── 射击/攻击
    │   ├── 弹道系统
    │   └── 枪口闪光特效
    │
    ├── 技能管理器 (SkillManager)
    └── 背包系统 (BackpackUI)
```

### 3. 技能系统 (skills/)

```
SkillManager
    ├── 技能槽 [0-9]
    ├── 冷却管理
    └── 输入绑定

BaseSkill (抽象基类)
    ├── activate()   - 激活技能
    ├── execute()    - 执行效果（子类实现）
    ├── isReady()    - 冷却检查
    └── update()     - 帧更新

技能列表:
    ├── HalfMoonSlash  - 半月斩 (鼠标左键/按键1)
    ├── ThunderSpear   - 雷霆之矛 (F键)
    ├── FlameShockwave - 烈焰震地 (R键)
    ├── DragonBreath   - 龙息术 (Z键)
    └── AlphaShield    - Alpha护盾 (E键，开关模式)
```

### 4. 武器系统 (equipment/weapons/)

```
weaponManager.js
    ├── 武器注册表 (WEAPON_REGISTRY)
    ├── 权重随机选择
    └── 场景生成

武器类型:
    ├── 远程 (ranged/)
    │   ├── SolarPlasmaCannon  - 太阳等离子炮
    │   ├── CrystalVoidWand    - 水晶虚空魔杖
    │   └── ForestStaff        - 森林法杖
    │
    └── 近战 (melee/)
        └── ThunderStormBlade  - 雷霆风暴之刃
```

### 5. 场景系统 (scenes/)

```
场景切换: Config.scene.activeScene
    ├── "default"     → DefaultScene
    └── "sagittarius" → SagittariusScene

DefaultScene
    ├── 地面/地形
    ├── 装饰物 (decorations.js)
    ├── 光照/阴影
    └── 物理碰撞

SagittariusScene
    ├── 小行星带 (asteroidBelt.js)
    ├── 巨行星 (giantPlanet.js)
    ├── 星门 (stargate.js)
    └── 古代守护者 (ancientGuardian.js)
```

### 6. UI系统 (ui.js, ui/)

```
AdvancedDynamicTexture (全屏UI)
    ├── 性能监控面板 (右上角)
    │   ├── FPS
    │   ├── Frame Time
    │   ├── Draw Calls
    │   ├── Active Meshes
    │   ├── Vertices
    │   └── Materials
    │
    ├── 技能栏 (skills.js)
    ├── 小地图 (minimap.js)
    └── 背包界面 (BackpackUI.js)
```

## 配置系统 (config.js)

```javascript
Config = {
    selectCharacters: "boxMan",    // 角色选择
    
    player2: {                     // 玩家参数
        speed, sprintSpeed, jumpSpeed, boosterSpeed...
    },
    
    scene: {                       // 场景配置
        activeScene: "default",
        gravity: -9.81,
        shadows: { enabled, size, darkness... }
    },
    
    minimap: {                     // 小地图
        zoom, minZoom, maxZoom...
    },
    
    weapons: {                     // 武器配置
        spawnCount,
        SolarPlasmaCannon: { enabled, spawnWeight },
        ThunderStormBlade: { enabled, spawnWeight }
        ...
    }
}
```

## 按键绑定

| 按键 | 功能 |
|------|------|
| W/A/S/D | 移动 |
| Space | 跳跃 / 喷射上升 |
| Shift | 冲刺 |
| Q | 喷射器开关 |
| Tab | 背包开关 |
| 鼠标左键 | 攻击 / 半月斩 |
| 鼠标右键 | 相机旋转 |
| F | 雷霆之矛 |
| R | 烈焰震地 |
| E | Alpha护盾 (开关) |
| Z | 龙息术 |
| 1-9, 0 | 技能槽快捷键 |

## 渲染管线

```
WebGPUEngine
    │
    ├─→ Scene.render()
    │       │
    │       ├─→ Physics (Havok)
    │       ├─→ Mesh Rendering
    │       ├─→ Particle Systems
    │       └─→ Post-Processing
    │               │
    │               ├─→ FXAA
    │               ├─→ MSAA (4x)
    │               └─→ Bloom
    │
    └─→ GlowLayer (特效发光)
```

## 物理系统

- **引擎**: Havok Physics
- **重力**: -9.81 m/s²
- **碰撞体**: 胶囊体（玩家）、盒体（场景物体）
- **射线检测**: 地面检测、拾取检测

## 扩展指南

### 添加新技能

1. 在 `src/skills/` 创建技能目录
2. 继承 `BaseSkill` 实现 `execute()` 方法
3. 在 `SkillManager.initSkills()` 中注册
4. 在 `setupInput()` 中绑定按键

### 添加新武器

1. 在 `src/equipment/weapons/` 对应目录创建文件
2. 导出 `create[Weapon]Mesh()` 和 `spawn[Weapon]()` 函数
3. 在 `weaponManager.js` 的 `WEAPON_REGISTRY` 中注册
4. 在 `config.js` 的 `weapons` 中添加配置

### 添加新场景

1. 在 `src/scenes/` 创建场景目录
2. 创建场景类（参考 DefaultScene）
3. 在 `main.js` 的 `createScene()` 中添加条件分支
4. 在 `config.js` 中配置场景名称

## 性能优化建议

1. **网格合并**: 静态物体使用 `Mesh.MergeMeshes()`
2. **LOD**: 远距离物体使用低精度模型
3. **实例化**: 重复物体使用 `InstancedMesh`
4. **粒子池**: 复用粒子系统避免频繁创建销毁
5. **Shader优化**: 使用GLSL而非WGSL确保兼容性
