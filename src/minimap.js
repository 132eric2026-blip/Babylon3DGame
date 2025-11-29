import {
    TargetCamera,
    Vector3,
    Color3,
    StandardMaterial,
    MeshBuilder,
    Viewport
} from "@babylonjs/core";
import {
    AdvancedDynamicTexture,
    Image,
    Control,
    Rectangle,
    Button,
    TextBlock
} from "@babylonjs/gui";
import { Config } from "./config";

export function setupMinimap(scene, player) {
    // --- Constants & Masks ---
    // Bit 28: Minimap Objects (Visible to Minimap, Invisible to Main)
    const MASK_MINIMAP = 0x10000000;
    // Bit 29: UI Objects (Visible to UI Camera, Invisible to Main)
    const MASK_UI = 0x20000000;

    // Main camera sees everything EXCEPT MASK_MINIMAP and MASK_UI
    const MASK_MAIN = 0xFFFFFFFF;

    if (scene.activeCamera) {
        scene.activeCamera.layerMask = MASK_MAIN & ~MASK_MINIMAP & ~MASK_UI;
    }

    // --- 1. Create Minimap Markers ---

    // 1.1 Player Marker Root (Container)
    const playerMarker = MeshBuilder.CreateBox("playerMarkerRoot", { size: 0.1 }, scene);
    playerMarker.isVisible = false; // Invisible container
    playerMarker.parent = player.mesh;
    playerMarker.position.y = 10;
    playerMarker.layerMask = MASK_MINIMAP;

    // Arrow (Triangle)
    const arrow = MeshBuilder.CreateDisc("minimapArrow", { radius: 1.5, tessellation: 3 }, scene);
    arrow.rotation.x = Math.PI / 2;
    arrow.rotation.y = -Math.PI / 2; // Points Forward

    const yellowMat = new StandardMaterial("yellowMat", scene);
    yellowMat.emissiveColor = Color3.Yellow();
    yellowMat.disableLighting = true;

    arrow.material = yellowMat;
    arrow.parent = playerMarker;
    arrow.layerMask = MASK_MINIMAP;

    // Dot (Circle) behind arrow
    const dot = MeshBuilder.CreateDisc("minimapDot", { radius: 0.6, tessellation: 16 }, scene);
    dot.rotation.x = Math.PI / 2;
    dot.position.z = -1.2; // Behind the arrow center
    dot.material = yellowMat;
    dot.parent = playerMarker;
    dot.layerMask = MASK_MINIMAP;

    // 1.2 Object Markers (Circles)
    // Scan scene for stones and trees (leaves)
    scene.meshes.forEach(mesh => {
        if (mesh.name.startsWith("stone") || mesh.name.startsWith("leaves")) {
            // Calculate size
            const boundingBox = mesh.getBoundingInfo().boundingBox;
            const radius = boundingBox.extendSizeWorld.x; // Use X extent as radius

            const marker = MeshBuilder.CreateDisc(mesh.name + "_marker", { radius: radius, tessellation: 16 }, scene);
            marker.rotation.x = Math.PI / 2;

            const markerMat = new StandardMaterial("markerMat", scene);
            markerMat.emissiveColor = new Color3(0.8, 0.8, 0.8); // Light Gray
            markerMat.disableLighting = true;
            marker.material = markerMat;

            marker.parent = mesh;
            marker.position.y = 20; // Above object
            marker.layerMask = MASK_MINIMAP;
        }
    });

    // Zoom / Ortho Size
    let currentZoom = Config.minimap.zoom;
    let zoomTextControl = null;

    const minimapCamera = new TargetCamera("minimapCamera", new Vector3(0, 100, 0), scene);
    minimapCamera.mode = TargetCamera.ORTHOGRAPHIC_CAMERA;
    minimapCamera.setTarget(Vector3.Zero());
    minimapCamera.rotation.x = Math.PI / 2; // Look Down
    minimapCamera.rotation.y = 0; // North Up

    // Function to update zoom
    const updateCameraZoom = () => {
        minimapCamera.orthoLeft = -currentZoom;
        minimapCamera.orthoRight = currentZoom;
        minimapCamera.orthoTop = currentZoom;
        minimapCamera.orthoBottom = -currentZoom;
        // Force projection matrix update
        minimapCamera.getProjectionMatrix(true);

        if (zoomTextControl) {
            zoomTextControl.text = "Zoom: " + currentZoom;
        }
    };

    updateCameraZoom(); // Initial Set

    // Minimap sees ONLY the markers
    minimapCamera.layerMask = MASK_MINIMAP;

    // --- UI Camera Setup ---
    // Create a dedicated camera for UI to avoid Bloom
    const uiCamera = new TargetCamera("uiCamera", Vector3.Zero(), scene);
    uiCamera.layerMask = MASK_UI;

    // Add to active cameras
    // Ensure Main Camera is still active and in 0 index (usually)
    if (scene.activeCameras.length === 0 && scene.activeCamera) {
        scene.activeCameras.push(scene.activeCamera);
    }
    // Avoid duplicate addition
    if (!scene.activeCameras.includes(minimapCamera)) {
        scene.activeCameras.push(minimapCamera);
    }
    if (!scene.activeCameras.includes(uiCamera)) {
        scene.activeCameras.push(uiCamera);
    }

    // --- 3. Viewport & UI Mask (Circular Effect) ---
    const mapSize = 200; // px
    const mapMargin = 20; // px

    // 3.1 Create GUI to hold the mask and buttons
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("MinimapUI");
    // Important: Set layer mask so ONLY uiCamera sees this, preventing Bloom from Main Camera
    advancedTexture.layer.layerMask = MASK_UI;

    // Container for Minimap UI
    const minimapContainer = new Rectangle("minimapContainer");
    minimapContainer.width = mapSize + "px";
    minimapContainer.height = mapSize + "px";
    minimapContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    minimapContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    minimapContainer.left = mapMargin + "px";
    minimapContainer.top = -mapMargin + "px";
    minimapContainer.thickness = 0; // Invisible container border
    advancedTexture.addControl(minimapContainer);

    // 3.2 Circular Mask (Optional Config)
    if (Config.minimap.showMask) {
        // Create Circular Mask Texture using Canvas
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = mapSize;
        maskCanvas.height = mapSize;
        const ctx = maskCanvas.getContext("2d");

        // Minimap camera clear color
        minimapCamera.clearColor = new Color3(0, 0, 0.2);

        // Fill all with Black (covers viewport corners)
        ctx.fillStyle = "#222222";
        ctx.fillRect(0, 0, mapSize, mapSize);

        // Cut out the circle
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(mapSize / 2, mapSize / 2, mapSize / 2 - 4, 0, Math.PI * 2);
        ctx.fill();

        // Reset composite
        ctx.globalCompositeOperation = "source-over";

        // Draw border ring
        ctx.strokeStyle = "white";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(mapSize / 2, mapSize / 2, mapSize / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();

        const maskDataUrl = maskCanvas.toDataURL();

        const maskImage = new Image("minimapMask", maskDataUrl);
        maskImage.stretch = Image.STRETCH_FILL;
        minimapContainer.addControl(maskImage);
    } else {
        // Square Border if no mask
        const border = new Rectangle("minimapBorder");
        border.thickness = 2;
        border.color = "white";
        border.background = "transparent";
        minimapContainer.addControl(border);

        // Set camera clear color to something opaque so it doesn't show game behind
        // Or if we want it to be transparent? Usually Minimaps have background.
        minimapCamera.clearColor = new Color3(0, 0, 0.2);
    }

    // Debug: Zoom Level Text
    zoomTextControl = new TextBlock();
    zoomTextControl.text = "Zoom: " + currentZoom;
    zoomTextControl.color = "white";
    zoomTextControl.fontSize = 12;
    zoomTextControl.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    zoomTextControl.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    zoomTextControl.left = "-5px";
    zoomTextControl.top = "5px";
    minimapContainer.addControl(zoomTextControl);

    // 3.3 Zoom Buttons
    const createZoomButton = (text, alignLeft) => {
        const btn = Button.CreateSimpleButton("zoomBtn" + text, text);
        btn.width = "30px";
        btn.height = "30px";
        btn.color = "white";
        btn.background = "rgba(0, 0, 0, 0.5)";
        btn.cornerRadius = 15;
        btn.horizontalAlignment = alignLeft ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
        btn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        // Position slightly outside or inside? User said "Lower two corners".
        // If inside, they might block map. If outside, they expand footprint.
        // Let's put them INSIDE the corners for compactness.
        btn.left = alignLeft ? "5px" : "-5px";
        btn.top = "-5px";
        return btn;
    };

    const btnMinus = createZoomButton("-", true); // Left corner -> Zoom Out (Increase View)
    btnMinus.onPointerUpObservable.add(() => {
        currentZoom = Math.min(currentZoom + Config.minimap.zoomStep, Config.minimap.maxZoom);
        updateCameraZoom();
    });
    minimapContainer.addControl(btnMinus);

    const btnPlus = createZoomButton("+", false); // Right corner -> Zoom In (Decrease View)
    btnPlus.onPointerUpObservable.add(() => {
        currentZoom = Math.max(currentZoom - Config.minimap.zoomStep, Config.minimap.minZoom);
        updateCameraZoom();
    });
    minimapContainer.addControl(btnPlus);

    // 4. Handle Viewport Logic
    const updateViewport = () => {
        const engine = scene.getEngine();
        const w = engine.getRenderWidth();
        const h = engine.getRenderHeight();

        minimapCamera.viewport = new Viewport(
            mapMargin / w,
            mapMargin / h,
            mapSize / w,
            mapSize / h
        );
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    // 5. Update Logic (Follow Player)
    scene.onBeforeRenderObservable.add(() => {
        if (player.mesh) {
            minimapCamera.position.x = player.mesh.position.x;
            minimapCamera.position.z = player.mesh.position.z;
            // Rotation: The user wants "Player arrow matches 3D world direction".
            // 1. If Minimap is "North Up" (RotY=0), and Player Arrow rotates:
            //    - We set Arrow rotation to Player Rotation.
            // 2. If Minimap rotates with player:
            //    - We rotate Camera.
            // The prompt says: "Player uses yellow arrow... matches 3D world direction".
            // Usually means: Map is Fixed (North Up), Arrow Rotates.
            // Let's stick to North Up (Map fixed), Arrow Rotates.

            // Sync marker rotation with player rotation
            // Player Mesh (Capsule) might not rotate? The modelRoot inside it rotates?
            // In `player.js`, `this.mesh.rotationQuaternion` or `rotation` is usually 0 for physics capsule?
            // The `modelRoot` rotates.
            if (player.modelRoot) {
                // playerMarker is child of player.mesh.
                // If player.mesh doesn't rotate, we need to rotate marker manually?
                // Or if player.mesh DOES rotate (Havok usually rotates body?), then marker rotates automatically.
                // In `player.js`, we use `setLinearVelocity`. Rotation is handled by... ?
                // Let's check `player.js`.
                // Ah, `updateMovement`: `this.modelRoot.rotationQuaternion = ...`
                // The CAPSULE (`this.mesh`) usually has `rotationQuaternion` fixed (Inertia locked)?
                // "this.aggregate.body.setMassProperties({ inertia: new Vector3(0, 0, 0) });" -> Lock rotation.
                // So `this.mesh` does NOT rotate.
                // So `playerMarker` (child of mesh) will NOT rotate.
                // We must update `playerMarker.rotation.y` to match `player.modelRoot.rotationQuaternion`.

                if (player.modelRoot.rotationQuaternion) {
                    const euler = player.modelRoot.rotationQuaternion.toEulerAngles();
                    // Marker Root Rotation matches Player Rotation
                    playerMarker.rotation.y = euler.y;
                } else {
                    playerMarker.rotation.y = player.modelRoot.rotation.y;
                }
            }
        }
    });
}
