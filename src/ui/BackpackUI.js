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
        this.dragging = false;
        this.dragIndex = -1;
        this.dragItem = null;
        this.dragIcon = null;
        this._dropCompleted = false;
        this.highlightIndex = -1;

        // 创建 UI 纹理
        this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("BackpackUI");
        this.advancedTexture.layer.layerMask = 0x20000000; // 仅 UI 相机可见

        this.createUI();
        this.createCursor();
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
                const x = this.scene.pointerX;
                const y = this.scene.pointerY;
                if (this.cursor && this.cursor.isVisible) {
                    this.cursor.left = x + "px";
                    this.cursor.top = y + "px";
                }
                if (this.dragging && this.dragIcon) {
                    this.dragIcon.left = (x - 25) + "px";
                    this.dragIcon.top = (y - 25) + "px";

                    // 拖拽时手动检测鼠标下方的槽位
                    let foundSlot = -1;
                    for (let i = 0; i < this.slots.length; i++) {
                        // 使用 Babylon GUI 的 contains 方法检测坐标是否在控件内
                        if (this.slots[i].container.contains(x, y)) {
                            foundSlot = i;
                            break;
                        }
                    }

                    if (foundSlot !== -1) {
                        if (this.highlightIndex !== foundSlot) {
                            if (this.highlightIndex !== -1) {
                                this.clearHighlight(this.highlightIndex);
                            }
                            this.setHighlight(foundSlot);
                            // console.log("Hovering over slot index: " + foundSlot);
                        }
                    } else {
                        if (this.highlightIndex !== -1) {
                            this.clearHighlight(this.highlightIndex);
                            this.highlightIndex = -1;
                        }
                    }
                }
            } else if (pointerInfo.type === PointerEventTypes.POINTERUP) {
                // console.log("🖱️ 全局 POINTERUP 事件触发，当前 dragging 状态:", this.dragging);
                if (this.dragging) {
                    // console.log("🖱️ 全局鼠标松开，拖拽状态: true");
                    // console.log("🎯 当前高亮的槽位:", this.highlightIndex);

                    if (this.highlightIndex !== -1) {
                        // 使用拖拽过程中高亮的槽位作为目标
                        this.handleSlotLeftUp(this.highlightIndex);
                    } else {
                        // 没有高亮槽位，取消拖拽
                        // console.log("❌ 未在槽位上松开，取消拖拽");
                        this.cancelDrag();
                    }
                }
            }
        });
    }

    createUI() {
        // 背包主容器
        this.container = new Rectangle();
        this.container.width = "300px";
        this.container.height = "370px";
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


        // 注释掉：这个事件会过早触发，导致全局 POINTERUP 事件无法正确处理拖放
        // 现在使用全局事件 + highlightIndex 来处理拖放
        // this.container.onPointerUpObservable.add(() => {
        //     if (this.dragging && !this._dropCompleted) {
        //         this.cancelDrag();
        //     }
        //     this._dropCompleted = false;
        // });

        // 标题
        // const title = new TextBlock();
        // title.text = "背包";
        // title.color = "white";
        // title.fontSize = 24;
        // title.height = "40px";
        // title.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        // this.container.addControl(title);

        // 物品网格 (4列 x 5行 = 20个槽位)
        this.grid = new Grid();
        this.grid.width = "280px";
        this.grid.height = "350px";
        this.grid.top = "0px";

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

    /**
     * 根据屏幕坐标计算对应的槽位索引
     * @param {number} x 屏幕 X 坐标
     * @param {number} y 屏幕 Y 坐标
     * @returns {number} 槽位索引，如果不在任何槽位上则返回 -1
     */
    getSlotIndexAtPosition(x, y) {
        if (!this.isVisible) return -1;

        // 遍历所有槽位，检查鼠标位置是否在槽位范围内
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].container.contains(x, y)) {
                return i;
            }
        }
        return -1;
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
            // console.log("🖱️ 鼠标进入槽位:", index, "拖拽状态:", this.dragging);
            if (this.dragging) {
                this.setHighlight(index);
                // console.log("✨ 高亮槽位: " + index);
            } else {
                slotContainer.background = "rgba(255, 255, 255, 0.3)";
            }
        });
        slotContainer.onPointerOutObservable.add(() => {
            // console.log("🖱️ 鼠标离开槽位:", index);
            // 统一使用 clearHighlight 恢复样式，这样可以正确处理装备高亮的恢复
            this.clearHighlight(index);
        });

        // 右键点击装备/卸下
        slotContainer.onPointerDownObservable.add((pointerInfo) => {
            // 0: Left, 1: Middle, 2: Right
            if (pointerInfo.buttonIndex === 2) {
                this.handleSlotRightClick(index);
            }
        });

        // 左键按下开始拖拽
        slotContainer.onPointerDownObservable.add((pointerInfo) => {
            if (pointerInfo.buttonIndex === 0) {
                this.handleSlotLeftDown(index);
            }
        });

        // 在槽位上松开，尝试放置/交换
        // 注释掉：现在使用全局 POINTERUP 事件 + highlightIndex 来处理拖放
        // slotContainer.onPointerUpObservable.add(() => {
        //     console.log("🖱️ 鼠标在槽位松开:", index, "拖拽状态:", this.dragging);
        //     if (this.dragging) {
        //         this.handleSlotLeftUp(index);
        //     }
        // });

        this.grid.addControl(slotContainer, row, col);

        // 图标
        const icon = new Image("icon_" + index);
        icon.width = "50px";
        icon.height = "50px";
        icon.isVisible = false;
        icon.isPointerBlocker = false;
        slotContainer.addControl(icon);

        this.slots.push({ container: slotContainer, icon: icon, item: null });
    }

    /**
     * 更新背包显示内容
     * @param {Array} inventoryItems 物品列表
     */
    updateDisplay(inventoryItems) {
        console.log("🎒 更新背包显示，当前装备的武器:", this.player.currentWeapon);

        for (let i = 0; i < 20; i++) {
            const slot = this.slots[i];
            const item = inventoryItems[i];

            if (item) {
                slot.item = item;

                // 检查是否是当前装备的武器
                const isEquipped = (item.type === "gun" && item.id === this.player.currentWeapon);
                console.log(`槽位 ${i}: ${item.name} (id: ${item.id}, type: ${item.type}), 是否装备: ${isEquipped}`);

                // 高亮当前装备的武器
                if (isEquipped) {
                    slot.container.color = "#00ff00"; // 绿色边框
                    slot.container.background = "rgba(0, 255, 0, 0.2)"; // 绿色半透明背景
                    slot.container.thickness = 2;
                    console.log(`✅ 高亮槽位 ${i}`);
                } else {
                    slot.container.color = "grey";
                    slot.container.background = "rgba(255, 255, 255, 0.1)";
                    slot.container.thickness = 1;
                }

                // 如果有 icon 路径则设置 source
                if (item.icon) {
                    slot.icon.source = item.icon;
                    slot.icon.isVisible = true;
                    if (slot.textBlock) slot.textBlock.isVisible = false;
                } else {
                    // 临时：如果没有图标，用文字显示首字母
                    if (!slot.textBlock) {
                        slot.textBlock = new TextBlock();
                        slot.textBlock.color = "white";
                        slot.textBlock.isPointerBlocker = false;
                        slot.container.addControl(slot.textBlock);
                    }
                    slot.textBlock.text = item.name.substring(0, 2);
                    slot.textBlock.isVisible = true;
                    slot.icon.isVisible = false;
                }
            } else {
                slot.item = null;
                slot.icon.isVisible = false;
                if (slot.textBlock) slot.textBlock.isVisible = false;

                // 恢复空槽位的默认样式
                slot.container.color = "grey";
                slot.container.background = "rgba(255, 255, 255, 0.1)";
                slot.container.thickness = 1;
            }
        }
    }

    handleSlotRightClick(index) {
        const slot = this.slots[index];
        if (slot && slot.item) {
            console.log("🖱️ 右键装备物品:", slot.item);
            console.log("装备前 currentWeapon:", this.player.currentWeapon);

            // 触发玩家装备逻辑
            this.player.equipItem(slot.item);

            console.log("装备后 currentWeapon:", this.player.currentWeapon);

            // 重新更新背包显示，以显示高亮
            this.updateDisplay(this.player.inventory);

            // 装备武器后不再自动关闭背包，允许玩家继续操作
            // this.hide();

            // 恢复相机控制，确保装备武器后可以正常射击
            if (this.player.camera) {
                this.player.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
            }
        }
    }

    handleSlotLeftDown(index) {
        // console.log("=== handleSlotLeftDown 被调用 ===", index);
        // console.log("背包可见性 isVisible:", this.isVisible);

        if (!this.isVisible) {
            // console.log("❌ 背包不可见，退出拖拽");
            return;
        }

        const slot = this.slots[index];
        // console.log("槽位对象 slot:", slot);
        // console.log("槽位物品 slot.item:", slot?.item);

        if (!slot || !slot.item) {
            // console.log("❌ 槽位为空或无物品，退出拖拽");
            return;
        }

        // console.log("✅ 开始拖拽物品:", slot.item.name);

        // 禁用相机控制，防止拖拽时视角旋转
        if (this.player.camera) {
            this.player.camera.detachControl();
            // console.log("📷 相机控制已禁用");
        }

        this.dragging = true;
        this.dragIndex = index;
        this.dragItem = slot.item;
        // console.log("🎯 拖拽状态设置完成 - dragging:", this.dragging, "dragIndex:", this.dragIndex);

        // 创建拖拽图标容器
        const dragContainer = new Rectangle("dragContainer");
        dragContainer.width = "50px";
        dragContainer.height = "50px";
        dragContainer.thickness = 0;
        dragContainer.isPointerBlocker = false;
        dragContainer.isHitTestVisible = false; // 关键：允许事件穿透
        dragContainer.zIndex = 1000;
        dragContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        dragContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

        if (slot.item.icon) {
            const img = new Image("dragIconImg");
            img.source = slot.item.icon;
            img.width = "100%";
            img.height = "100%";
            img.isPointerBlocker = false;
            img.isHitTestVisible = false;
            dragContainer.addControl(img);
        } else {
            const txt = new TextBlock("dragIconTxt");
            txt.text = slot.item.name.substring(0, 2);
            txt.color = "white";
            txt.fontSize = 24;
            txt.isPointerBlocker = false;
            txt.isHitTestVisible = false;
            dragContainer.addControl(txt);
        }

        this.dragIcon = dragContainer;
        this.advancedTexture.addControl(this.dragIcon);
        const x = this.scene.pointerX;
        const y = this.scene.pointerY;
        this.dragIcon.left = (x - 25) + "px";
        this.dragIcon.top = (y - 25) + "px";

        if (slot.icon) slot.icon.isVisible = false;
        if (slot.textBlock) slot.textBlock.isVisible = false;
    }

    handleSlotLeftUp(targetIndex) {
        // console.log("=== handleSlotLeftUp 被调用 ===");
        // console.log("当前拖拽状态:", this.dragging);

        if (!this.dragging) {
            // console.log("❌ 拖拽状态为 false，退出");
            return;
        }

        const fromIndex = this.dragIndex;
        const toIndex = targetIndex;

        // console.log("📦 放置到槽位:", targetIndex, "来自槽位:", fromIndex);

        if (fromIndex === toIndex) {
            // console.log("⚠️ 放置到同一槽位，取消拖拽");
            this.cancelDrag();
            this._dropCompleted = true;
            return;
        }

        const fromItem = this.player.inventory[fromIndex];
        const toItem = this.player.inventory[toIndex];
        // console.log("📦 交换物品 - 从:", fromItem?.name, "到:", toItem?.name);
        // console.log("交换前 inventory:", this.player.inventory.map((item, i) => `[${i}]:${item?.name || 'empty'}`));

        if (fromItem && toItem) {
            // console.log("✅ 执行交换：两个槽位都有物品");
            this.player.inventory[fromIndex] = toItem;
            this.player.inventory[toIndex] = fromItem;
        } else if (fromItem && !toItem) {
            // console.log("✅ 执行移动：从有物品的槽位移到空槽位");
            this.player.inventory[toIndex] = fromItem;
            this.player.inventory[fromIndex] = null;
        }

        // console.log("交换后 inventory:", this.player.inventory.map((item, i) => `[${i}]:${item?.name || 'empty'}`));

        this.updateDisplay(this.player.inventory);

        // 恢复相机控制
        if (this.player.camera) {
            this.player.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
        }

        this.dragging = false;
        this.dragIndex = -1;
        this.dragItem = null;
        if (this.dragIcon) {
            this.dragIcon.dispose();
            this.dragIcon = null;
        }
        if (this.highlightIndex !== -1) {
            this.clearHighlight(this.highlightIndex);
            this.highlightIndex = -1;
        }
        this._dropCompleted = true;
    }

    cancelDrag() {
        if (this.dragIcon) {
            this.dragIcon.dispose();
            this.dragIcon = null;
        }

        // 恢复原槽位显示
        this.updateDisplay(this.player.inventory);

        // 恢复相机控制
        if (this.player.camera) {
            this.player.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
        }

        this.dragging = false;
        this.dragIndex = -1;
        this.dragItem = null;
        this._dropCompleted = false;
        if (this.highlightIndex !== -1) {
            this.clearHighlight(this.highlightIndex);
            this.highlightIndex = -1;
        }
    }

    setHighlight(index) {
        const slot = this.slots[index];
        if (!slot) return;
        this.highlightIndex = index;
        slot.container.background = "rgba(255, 224, 128, 0.35)";
        slot.container.color = "#ffd36b";
        slot.container.thickness = 2;
    }

    clearHighlight(index) {
        const slot = this.slots[index];
        if (!slot) return;

        // 检查是否是当前装备的武器，如果是则恢复装备高亮样式
        let isEquipped = false;
        if (slot.item && slot.item.type === "gun" && this.player && this.player.currentWeapon === slot.item.id) {
            isEquipped = true;
        }

        if (isEquipped) {
            slot.container.color = "#00ff00"; // 绿色边框
            slot.container.background = "rgba(0, 255, 0, 0.2)"; // 绿色半透明背景
            slot.container.thickness = 2;
        } else {
            slot.container.background = "rgba(255, 255, 255, 0.1)";
            slot.container.color = "grey";
            slot.container.thickness = 1;
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
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
        if (this.dragging) {
            this.cancelDrag();
        }
        this.isVisible = false;
        this.container.isVisible = false;
        if (this.cursor) {
            this.cursor.isVisible = false;
        }
    }
}
