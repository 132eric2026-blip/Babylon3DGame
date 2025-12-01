import { MeshBuilder, Vector3, StandardMaterial, Color3, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core";

export class Horse {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position;
        this.mesh = this.createHorseMesh();
        this.setupPhysics();
    }

    createHorseMesh() {
        // Materials
        const horseMat = new StandardMaterial("horseMat", this.scene);
        horseMat.diffuseColor = new Color3(0.6, 0.4, 0.2); // Brown
        horseMat.specularColor = new Color3(0, 0, 0); // Matte
        horseMat.maxSimultaneousLights = 6; // Ensure it receives light from lamps too

        const hairMat = new StandardMaterial("horseHairMat", this.scene);
        hairMat.diffuseColor = new Color3(0.1, 0.1, 0.1); // Dark Grey/Black
        hairMat.specularColor = new Color3(0, 0, 0);
        hairMat.maxSimultaneousLights = 6;

        const hoofMat = new StandardMaterial("hoofMat", this.scene);
        hoofMat.diffuseColor = new Color3(0.05, 0.05, 0.05); // Black
        hoofMat.specularColor = new Color3(0, 0, 0);
        hoofMat.maxSimultaneousLights = 6;

        // Root (Collider)
        // Designed to match the height of the horse's back so player can stand on it without floating.
        // Total height approx 1.6m (Legs 1.0 + Body 0.6)
        const rootHeight = 1.6;
        const root = MeshBuilder.CreateBox("horseRoot", { width: 0.8, height: rootHeight, depth: 2.2 }, this.scene);
        root.position = this.position.clone();
        root.position.y += rootHeight / 2; // Pivot at center
        root.isVisible = false; // Invisible collider

        // Dimensions
        const bodyLen = 1.4;
        const bodyWidth = 0.6;
        const bodyHeight = 0.6;
        const legHeight = 1.0;
        const legWidth = 0.25;
        
        // Visual offsets relative to root center (y=0.8)
        // Legs bottom at 0, top at 1.0. Center at 0.5.
        // Offset = 0.5 - 0.8 = -0.3
        const legY = -0.3;

        // Body bottom at 1.0, top at 1.6. Center at 1.3.
        // Offset = 1.3 - 0.8 = 0.5
        const bodyY = 0.5;

        // Body (Torso)
        const body = MeshBuilder.CreateBox("horseBody", { width: bodyWidth, height: bodyHeight, depth: bodyLen }, this.scene);
        body.material = horseMat;
        body.parent = root;
        body.position.y = bodyY; 

        // Neck
        const neck = MeshBuilder.CreateBox("horseNeck", { width: 0.3, height: 0.8, depth: 0.5 }, this.scene);
        neck.material = horseMat;
        neck.parent = body;
        neck.position = new Vector3(0, 0.4, 0.6); // Relative to body
        neck.rotation.x = -Math.PI / 4;

        // Head
        const head = MeshBuilder.CreateBox("horseHead", { width: 0.3, height: 0.35, depth: 0.7 }, this.scene);
        head.material = horseMat;
        head.parent = neck;
        head.position = new Vector3(0, 0.4, 0.2); // Top of neck
        head.rotation.x = Math.PI / 4; // Level out

        // Ears
        const earL = MeshBuilder.CreateBox("earL", { size: 0.08 }, this.scene);
        earL.material = horseMat;
        earL.parent = head;
        earL.position = new Vector3(-0.1, 0.25, -0.2);
        
        const earR = MeshBuilder.CreateBox("earR", { size: 0.08 }, this.scene);
        earR.material = horseMat;
        earR.parent = head;
        earR.position = new Vector3(0.1, 0.25, -0.2);

        // Mane
        const mane = MeshBuilder.CreateBox("horseMane", { width: 0.1, height: 0.6, depth: 0.4 }, this.scene);
        mane.material = hairMat;
        mane.parent = neck;
        mane.position = new Vector3(0, 0.1, -0.26);

        // Tail
        const tail = MeshBuilder.CreateBox("horseTail", { width: 0.15, height: 0.7, depth: 0.15 }, this.scene);
        tail.material = hairMat;
        tail.parent = body;
        tail.position = new Vector3(0, 0.2, -0.7);
        tail.rotation.x = Math.PI / 6;

        // Legs
        const createLeg = (name, x, z) => {
            const leg = MeshBuilder.CreateBox(name, { width: legWidth, height: legHeight, depth: legWidth }, this.scene);
            leg.material = horseMat;
            leg.parent = root;
            leg.position = new Vector3(x, legY, z); 
            
            // Hoof
            const hoof = MeshBuilder.CreateBox(name + "_hoof", { width: legWidth, height: 0.15, depth: legWidth }, this.scene);
            hoof.material = hoofMat;
            hoof.parent = leg;
            hoof.position.y = -legHeight / 2 + 0.075;
            
            return leg;
        };

        const dx = bodyWidth / 2 - legWidth / 2;
        const dz = bodyLen / 2 - legWidth / 2;

        const legFL = createLeg("legFL", -dx, dz);
        const legFR = createLeg("legFR", dx, dz);
        const legBL = createLeg("legBL", -dx, -dz);
        const legBR = createLeg("legBR", dx, -dz);

        // Shadow
        if (this.scene.shadowGenerator) {
            const casters = [body, neck, head, earL, earR, mane, tail, legFL, legFR, legBL, legBR];
            // Also include hooves
            legFL.getChildren().concat(legFR.getChildren(), legBL.getChildren(), legBR.getChildren()).forEach(c => casters.push(c));

            casters.forEach(m => {
                this.scene.shadowGenerator.addShadowCaster(m);
                m.receiveShadows = true;
            });
        }

        return root;
    }

    setupPhysics() {
        // Dynamic box collider for the horse
        // Mass > 0 = Movable
        // Friction: High friction to stop sliding when not moving
        // Restitution: Low bounce
        // Lock rotation to prevent tipping over (like player)
        this.aggregate = new PhysicsAggregate(this.mesh, PhysicsShapeType.BOX, { mass: 200, restitution: 0.0, friction: 1.0 }, this.scene);
        
        // Store aggregate in metadata for player access
        this.mesh.metadata = { aggregate: this.aggregate };

        this.aggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0) // Lock rotation physics
        });
        
        // Set linear damping to slow down naturally
        this.aggregate.body.setLinearDamping(2.0);
    }
}
