import { AdvancedDynamicTexture, TextBlock, Control, Rectangle, StackPanel } from "@babylonjs/gui";

/**
 * 性能面板配置
 * 设置每项指标是否显示
 */
export const PerformancePanelConfig = {
    enabled: true,              // 是否显示整个面板
    fps: true,                  // FPS
    frameTime: true,            // 帧时间
    drawCalls: true,            // 绘制调用次数
    activeMeshes: false,         // 活跃网格数
    activeIndices: false,       // 活跃索引数（默认关闭）
    activeBones: false,         // 活跃骨骼数（默认关闭）
    particles: false,            // 粒子数
    totalVertices: false,        // 总顶点数
    materials: false            // 材质总数（默认关闭）
};

/**
 * 创建性能日志面板
 * @param {AdvancedDynamicTexture} advancedTexture GUI纹理
 * @param {Scene} scene 场景实例
 * @param {Object} config 配置对象（可选）
 */
function createPerformancePanel(advancedTexture, scene, config = PerformancePanelConfig) {
    if (!config.enabled) return null;

    const engine = scene.getEngine();

    // 计算显示的指标数量，动态调整面板高度
    const visibleMetrics = [
        config.fps, config.frameTime, config.drawCalls,
        config.activeMeshes, config.activeIndices, config.activeBones,
        config.particles, config.totalVertices, config.materials
    ].filter(Boolean).length;
    
    const panelHeight = 45 + visibleMetrics * 26; // 标题高度 + 每行高度

    // 面板容器
    const panel = new Rectangle("performancePanel");
    panel.width = "220px";
    panel.height = panelHeight + "px";
    panel.cornerRadius = 8;
    panel.color = "#00ff88";
    panel.thickness = 1;
    panel.background = "rgba(0, 0, 0, 0.7)";
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    panel.left = "-15px";
    panel.top = "15px";
    advancedTexture.addControl(panel);

    // 标题
    const titleText = new TextBlock("perfTitle");
    titleText.text = "⚡ Performance";
    titleText.color = "#00ff88";
    titleText.fontSize = 16;
    titleText.fontWeight = "bold";
    titleText.height = "30px";
    titleText.top = (-panelHeight / 2 + 20) + "px";
    titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.addControl(titleText);

    // 内容堆栈
    const stack = new StackPanel("perfStack");
    stack.width = "200px";
    stack.top = "20px";
    stack.spacing = 4;
    panel.addControl(stack);

    // 创建指标文本行
    const createMetricRow = (name, initialValue = "0") => {
        const row = new Rectangle();
        row.width = "200px";
        row.height = "24px";
        row.thickness = 0;
        row.background = "transparent";

        const label = new TextBlock();
        label.text = name;
        label.color = "#aaaaaa";
        label.fontSize = 12;
        label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        label.left = "5px";
        row.addControl(label);

        const value = new TextBlock();
        value.text = initialValue;
        value.color = "#ffffff";
        value.fontSize = 12;
        value.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        value.left = "-5px";
        row.addControl(value);

        stack.addControl(row);
        return value;
    };

    // 根据配置创建各项指标
    const fpsValue = config.fps ? createMetricRow("FPS", "60") : null;
    const frameTimeValue = config.frameTime ? createMetricRow("Frame Time", "16.67 ms") : null;
    const drawCallsValue = config.drawCalls ? createMetricRow("Draw Calls", "0") : null;
    const activeMeshesValue = config.activeMeshes ? createMetricRow("Active Meshes", "0") : null;
    const activeIndicesValue = config.activeIndices ? createMetricRow("Active Indices", "0") : null;
    const activeBonesValue = config.activeBones ? createMetricRow("Active Bones", "0") : null;
    const activeParticlesValue = config.particles ? createMetricRow("Particles", "0") : null;
    const totalVerticesValue = config.totalVertices ? createMetricRow("Total Vertices", "0") : null;
    const totalMaterialsValue = config.materials ? createMetricRow("Materials", "0") : null;

    // 帧时间平滑计算
    let frameTimeHistory = [];
    const historySize = 30;

    // 更新逻辑
    scene.onBeforeRenderObservable.add(() => {
        const fps = engine.getFps();
        const frameTime = 1000 / fps;

        // 平滑帧时间
        frameTimeHistory.push(frameTime);
        if (frameTimeHistory.length > historySize) {
            frameTimeHistory.shift();
        }
        const avgFrameTime = frameTimeHistory.reduce((a, b) => a + b, 0) / frameTimeHistory.length;

        // 获取场景统计
        const instrumentation = scene.getInstrumentation ? scene.getInstrumentation() : null;

        // 更新各项指标（仅更新已启用的）
        if (fpsValue) {
            // FPS颜色根据性能变化
            if (fps >= 55) {
                fpsValue.color = "#00ff88";
            } else if (fps >= 30) {
                fpsValue.color = "#ffff00";
            } else {
                fpsValue.color = "#ff4444";
            }
            fpsValue.text = fps.toFixed(0);
        }
        if (frameTimeValue) frameTimeValue.text = avgFrameTime.toFixed(2) + " ms";
        if (drawCallsValue) drawCallsValue.text = scene.getDrawCalls ? scene.getDrawCalls().toString() : (engine._drawCalls?.current?.toString() || "N/A");
        if (activeMeshesValue) activeMeshesValue.text = scene.getActiveMeshes().length.toString();
        if (activeIndicesValue) activeIndicesValue.text = scene.getActiveIndices().toString();
        if (activeBonesValue) activeBonesValue.text = scene.getActiveBones().toString();
        if (activeParticlesValue) activeParticlesValue.text = scene.getActiveParticles().toString();
        if (totalVerticesValue) totalVerticesValue.text = formatNumber(scene.getTotalVertices());
        if (totalMaterialsValue) totalMaterialsValue.text = scene.materials.length.toString();
    });

    return panel;
}

/**
 * 格式化大数字（如 1000 -> 1K）
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
}

/**
 * 初始化基础 UI（FPS 显示等）
 * @param {Scene} scene 场景实例
 * @param {any} player 玩家对象
 */
export function setupUI(scene, player) {
    // GUI（FPS）
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    // 设置图层掩码为 0x20000000（仅 UI 相机可见，避免被主相机的泛光影响）
    advancedTexture.layer.layerMask = 0x20000000;

    // 创建右上角性能面板
    createPerformancePanel(advancedTexture, scene);
}
