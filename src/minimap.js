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
    Control 
} from "@babylonjs/gui";

export function setupMinimap(scene, player) {
    // --- Constants & Masks ---
    // Bit 28: Minimap Objects (Visible to Minimap, Invisible to Main)
    const MASK_MINIMAP = 0x10000000;
    // Main camera sees everything EXCEPT MASK_MINIMAP
    // Note: We need to ensure Main Camera mask is set correctly.
    // Default is 0xFFFFFFFF. We want (Default & ~MASK_MINIMAP).
    const MASK_MAIN = 0xFFFFFFFF;

    if (scene.activeCamera) {
        scene.activeCamera.layerMask = MASK_MAIN & ~MASK_MINIMAP;
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

    // --- 2. Minimap Camera ---
    const minimapCamera = new TargetCamera("minimapCamera", new Vector3(0, 100, 0), scene);
    minimapCamera.mode = TargetCamera.ORTHOGRAPHIC_CAMERA;
    minimapCamera.setTarget(Vector3.Zero());
    minimapCamera.rotation.x = Math.PI / 2; // Look Down
    minimapCamera.rotation.y = 0; // North Up
    
    // Zoom / Ortho Size
    const orthoSize = 30; // View range
    minimapCamera.orthoLeft = -orthoSize;
    minimapCamera.orthoRight = orthoSize;
    minimapCamera.orthoTop = orthoSize;
    minimapCamera.orthoBottom = -orthoSize;

    // Minimap sees ONLY the markers (and maybe ground if we want context? User said "Circles for objects", implying abstract map).
    // Let's try showing ONLY markers first. If it's too empty, we can add ground.
    // But user said "Circles for other objects", so abstract is likely better.
    minimapCamera.layerMask = MASK_MINIMAP;

    // Add to active cameras
    // Ensure Main Camera is still active and in 0 index (usually)
    if (scene.activeCameras.length === 0 && scene.activeCamera) {
        scene.activeCameras.push(scene.activeCamera);
    }
    scene.activeCameras.push(minimapCamera);

    // --- 3. Viewport & UI Mask (Circular Effect) ---
    const mapSize = 200; // px
    const mapMargin = 20; // px

    // 3.1 Create Circular Mask Texture using Canvas
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = mapSize;
    maskCanvas.height = mapSize;
    const ctx = maskCanvas.getContext("2d");
    
    // Draw Mask: Transparent Circle in the middle, Opaque color outside.
    // Since we can't easily match the 3D canvas background if it changes, we usually use a "Frame".
    // Or we can just make the viewport background specific?
    // Minimap camera clear color?
    minimapCamera.clearColor = new Color3(0, 0, 0.2); // Dark Blue background for map
    
    // Now the mask: We want to HIDE the corners of the viewport.
    // So we draw a generic "border" image that has opaque corners and transparent center.
    
    // Clear
    ctx.clearRect(0, 0, mapSize, mapSize);
    
    // Fill all with Black (or UI background color) - This covers the viewport corners
    ctx.fillStyle = "rgba(0,0,0,0)"; // Transparent base? No.
    // We want the CORNERS to be opaque (hiding the viewport).
    // We want the CENTER to be transparent (showing the viewport).
    
    // Fill entire canvas with "Frame Color" (e.g. Transparent? No, if it's transparent we see the viewport corners!)
    // We need the UI to BLOCK the viewport at the corners.
    // So fill with 'Black' (or page background). Assuming black borders or transparent overlay?
    // Actually, if the game is full screen, the "corners" of the minimap viewport will cover the game world.
    // We want to hide those corners.
    // But UI is drawn ON TOP of 3D.
    // So if we draw Opaque Pixels in UI, they hide the 3D Viewport.
    // So we fill the canvas with Opaque Color (e.g. Black or Dark Grey).
    ctx.fillStyle = "#222222"; 
    ctx.fillRect(0, 0, mapSize, mapSize);
    
    // Cut out the circle (Make center transparent)
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(mapSize/2, mapSize/2, mapSize/2 - 4, 0, Math.PI * 2); // -4 for border thickness
    ctx.fill();
    
    // Reset composite
    ctx.globalCompositeOperation = "source-over";
    
    // Draw a nice border ring
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(mapSize/2, mapSize/2, mapSize/2 - 2, 0, Math.PI * 2);
    ctx.stroke();

    const maskDataUrl = maskCanvas.toDataURL();

    // 3.2 Create GUI to hold the mask
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("MinimapUI");
    
    const maskImage = new Image("minimapMask", maskDataUrl);
    maskImage.width = mapSize + "px";
    maskImage.height = mapSize + "px";
    maskImage.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    maskImage.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    maskImage.left = mapMargin + "px";
    maskImage.top = -mapMargin + "px";
    advancedTexture.addControl(maskImage);

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
