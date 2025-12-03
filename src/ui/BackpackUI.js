import { AdvancedDynamicTexture, Control, Grid, Rectangle, Image, TextBlock } from "@babylonjs/gui";
import { PointerEventTypes } from "@babylonjs/core";

/**
 * 背包 UI 类
 * 管理背包的显示、隐藏以及物品槽位的渲染
 */
export class BackpackUI {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.isVisible = false;
        this.cursor = null;
        
        // 创建 UI 纹理
        this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("BackpackUI");
        this.advancedTexture.layer.layerMask = 0x20000000; // 仅 UI 相机可见

        this.createUI();
        this.createCursor();
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.cursor || !this.cursor.isVisible) return;
            if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
                const x = this.scene.pointerX;
                const y = this.scene.pointerY;
                this.cursor.left = x + "px";
                this.cursor.top = y + "px";
            }
        });
    }

    createUI() {
        // 背包主容器
        this.container = new Rectangle();
        this.container.width = "300px";
        this.container.height = "400px";
        this.container.background = "rgba(0, 0, 0, 0.8)";
        this.container.cornerRadius = 10;
        this.container.thickness = 2;
        this.container.color = "white";
        this.container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.container.left = "-20px";
        this.container.top = "-20px";
        this.container.isVisible = false;
        this.advancedTexture.addControl(this.container);

        // 标题
        const title = new TextBlock();
        title.text = "背包";
        title.color = "white";
        title.fontSize = 24;
        title.height = "40px";
        title.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.container.addControl(title);

        // 物品网格 (4列 x 5行 = 20个槽位)
        this.grid = new Grid();
        this.grid.width = "280px";
        this.grid.height = "340px";
        this.grid.top = "40px";
        
        for (let i = 0; i < 5; i++) {
            this.grid.addRowDefinition(1);
        }
        for (let i = 0; i < 4; i++) {
            this.grid.addColumnDefinition(1);
        }
        this.container.addControl(this.grid);

        // 初始化槽位
        this.slots = [];
        for (let i = 0; i < 20; i++) {
            const row = Math.floor(i / 4);
            const col = i % 4;
            this.createSlot(i, row, col);
        }
    }

    createCursor() {
        const cur = new Rectangle("uiCursor");
        cur.width = "12px";
        cur.height = "12px";
        cur.thickness = 0;
        cur.background = "#ffffff";
        cur.alpha = 0.9;
        cur.cornerRadius = 6;
        cur.isVisible = false;
        cur.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        cur.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.cursor = cur;
        this.advancedTexture.addControl(this.cursor);
    }

    createSlot(index, row, col) {
        const slotContainer = new Rectangle();
        slotContainer.width = "60px";
        slotContainer.height = "60px";
        slotContainer.thickness = 1;
        slotContainer.color = "grey";
        slotContainer.background = "rgba(255, 255, 255, 0.1)";
        slotContainer.cornerRadius = 5;
        
        // 鼠标交互
        slotContainer.onPointerEnterObservable.add(() => {
            slotContainer.background = "rgba(255, 255, 255, 0.3)";
        });
        slotContainer.onPointerOutObservable.add(() => {
            slotContainer.background = "rgba(255, 255, 255, 0.1)";
        });

        // 右键点击装备/卸下
        slotContainer.onPointerDownObservable.add((pointerInfo) => {
            // 0: Left, 1: Middle, 2: Right
            if (pointerInfo.buttonIndex === 2) {
                this.handleSlotRightClick(index);
            }
        });

        this.grid.addControl(slotContainer, row, col);
        
        // 图标
        const icon = new Image("icon_" + index);
        icon.width = "50px";
        icon.height = "50px";
        icon.isVisible = false;
        slotContainer.addControl(icon);

        this.slots.push({ container: slotContainer, icon: icon, item: null });
    }

    /**
     * 更新背包显示内容
     * @param {Array} inventoryItems 物品列表
     */
    updateDisplay(inventoryItems) {
        for (let i = 0; i < 20; i++) {
            const slot = this.slots[i];
            const item = inventoryItems[i];
            
            if (item) {
                slot.item = item;
                // 这里暂时用文字代替图标，或者使用临时颜色块，后续可以加载真实图标
                // 如果有 icon 路径则设置 source
                 if (item.icon) {
                    slot.icon.source = item.icon;
                    slot.icon.isVisible = true;
                } else {
                    // 临时：如果没有图标，用文字显示首字母
                    if (!slot.textBlock) {
                        slot.textBlock = new TextBlock();
                        slot.textBlock.color = "white";
                        slot.container.addControl(slot.textBlock);
                    }
                    slot.textBlock.text = item.name.substring(0, 2);
                    slot.icon.isVisible = false;
                }
            } else {
                slot.item = null;
                slot.icon.isVisible = false;
                if (slot.textBlock) slot.textBlock.text = "";
            }
        }
    }

    handleSlotRightClick(index) {
        const slot = this.slots[index];
        if (slot && slot.item) {
            // 触发玩家装备逻辑
            this.player.equipItem(slot.item);
            console.log("Equipped: " + slot.item.name);
        }
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.isVisible = this.isVisible;
        return this.isVisible;
    }

    show() {
        this.isVisible = true;
        this.container.isVisible = true;
        if (this.cursor) {
            this.cursor.isVisible = this.scene.getEngine().isPointerLock;
            if (this.cursor.isVisible) {
                const x = this.scene.pointerX;
                const y = this.scene.pointerY;
                this.cursor.left = x + "px";
                this.cursor.top = y + "px";
            }
        }
    }

    hide() {
        this.isVisible = false;
        this.container.isVisible = false;
        if (this.cursor) {
            this.cursor.isVisible = false;
        }
    }
}
