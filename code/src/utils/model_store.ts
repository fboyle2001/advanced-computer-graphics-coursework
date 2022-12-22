import { BufferGeometry, DoubleSide, Group, Material, Mesh, MeshBasicMaterial, TextureLoader, Triangle, Vector3 } from "three";
import { BezierSurface } from "./parametric_surfaces";

const createBikeShed = (samples: number, roofMaterial: Material, sideMaterial: Material, floorMaterial: Material): Group => {
    const group = new Group();

    const curvedRoof = new Mesh(
        new BezierSurface([
            [new Vector3(0, 0, 0), new Vector3(0, 4, 0), new Vector3(4, 4, 0)],
            [new Vector3(0, 0, 8), new Vector3(0, 4, 8), new Vector3(4, 4, 8)]
        ]).createGeometry(samples), 
        roofMaterial
    );
    group.add(curvedRoof);

    const side = new Group();

    const curvedSection = new Mesh(
        new BezierSurface([
            [new Vector3(0, 0, 0), new Vector3(0, 4, 0), new Vector3(4, 4, 0)],
            [new Vector3(4, 4, 0), new Vector3(0, 4, 0), new Vector3(0, 0, 0)]
        ]).createGeometry(samples),
        sideMaterial
    );

    const triangleFill = new Mesh(
        new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(4, 4, 0), new Vector3(4, 0, 0)]), 
        sideMaterial
    );

    side.add(curvedSection);
    side.add(triangleFill);
    group.add(side);
    
    const otherSide = side.clone();
    otherSide.position.set(0, 0, 8);
    group.add(otherSide);

    const floor = new Mesh(
        new BufferGeometry().setFromPoints(
            [
                new Vector3(0, 0, 0), new Vector3(4, 0, 0), new Vector3(4, 0, 8),
                new Vector3(4, 0, 8), new Vector3(0, 0, 8), new Vector3(0, 0, 0)
            ]
        ),
        floorMaterial
    )
    group.add(floor);

    return group;
}

const createBillboardTree = (faces: number): Group => {
    const billboardTreeSurfaceGeomGen = new BezierSurface(
        [
            [new Vector3(0, 0, 0), new Vector3(0, 9, 0), new Vector3(0, 9, 0)],
            [new Vector3(0, 0, 8), new Vector3(0, 9, 8), new Vector3(0, 9, 8)]
        ]
    );

    const billboardTexture = new TextureLoader().load("/textures/tree_billboard.png");
    const billboardMaterial = new MeshBasicMaterial({
        map: billboardTexture,
        transparent: true,
        depthTest: false,
        side: DoubleSide,
        
    });
    
    const billboardMesh = new Mesh(billboardTreeSurfaceGeomGen.createGeometry(2), billboardMaterial);
    const group = new Group().add(billboardMesh);

    for(let i = 1; i < faces; i++) {
        const otherFace = billboardMesh.clone();
        otherFace.position.sub(new Vector3(0, 0, 4));
        otherFace.position.applyAxisAngle(new Vector3(0, 1, 0), i * Math.PI / faces)
        otherFace.position.add(new Vector3(0, 0, 4));
        otherFace.rotateOnAxis(new Vector3(0, 1, 0), i * Math.PI / faces)
        group.add(otherFace);
    }

    return group
}

export { createBikeShed, createBillboardTree };