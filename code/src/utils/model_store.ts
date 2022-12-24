import THREE, { BufferGeometry, DoubleSide, Group, Material, Mesh, MeshBasicMaterial, TextureLoader, Triangle, Vector3 } from "three";
import { ModelLoader } from "./model_loader";
import { BezierSurface } from "./parametric_surfaces";
import { ProgressiveMesh } from "./progressive_mesh";
import { scene } from "./three_setup";

import chairModelData from '../progressive_meshes/chair_50.json';
import { createLevelOfDetail } from "./level_of_detail";
import { RegisterableComponents } from "./registerable";

const levelOfDetailDistances = {
    low: 20,
    medium: 10,
    high: 0
}

const eps = (): number => {
    return Math.random() / 1e6;
}

const createBikeShed = (samples: number, roofMaterial: Material, sideMaterial: Material, floorMaterial: Material): [Group, RegisterableComponents] => {
    const group = new Group();

    const curvedRoof = new BezierSurface(
        [
            [new Vector3(0, 0, 0), new Vector3(0, 4, 0), new Vector3(4, 4, 0)],
            [new Vector3(0, 0, 8), new Vector3(0, 4, 8), new Vector3(4, 4, 8)]
        ],
        samples,
        roofMaterial
    );
    group.add(curvedRoof.mesh);

    const side = new Group();

    const curvedSection = new BezierSurface(
        [
            [new Vector3(0, 0, 0), new Vector3(0, 4, 0), new Vector3(4, 4, 0)],
            [new Vector3(4, 4, 0), new Vector3(0, 4, 0), new Vector3(0, 0, 0)]
        ],
        samples,
        sideMaterial
    );

    const triangleFill = new Mesh(
        new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(4, 4, 0), new Vector3(4, 0, 0)]), 
        sideMaterial
    );

    side.add(curvedSection.mesh);
    side.add(triangleFill);
    group.add(side);
    
    const otherSide = new Group(); 
    const otherCurvedSection = new BezierSurface(
        [
            [new Vector3(0, 0, 0), new Vector3(0, 4, 0), new Vector3(4, 4, 0)],
            [new Vector3(4, 4, 0), new Vector3(0, 4, 0), new Vector3(0, 0, 0)]
        ],
        samples,
        sideMaterial
    );

    const otherTriangleFill = new Mesh(
        new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(4, 4, 0), new Vector3(4, 0, 0)]), 
        sideMaterial
    );
    
    otherSide.add(otherCurvedSection.mesh);
    otherSide.add(otherTriangleFill);
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

    return [group, {
        surfaces: [curvedRoof, curvedSection, otherCurvedSection]
    }];
}

const createBillboardTree = (faces: number): Group => {
    const billboardTexture = new TextureLoader().load("/textures/tree_billboard.png");
    const billboardMaterial = new MeshBasicMaterial({
        map: billboardTexture,
        transparent: true,
        depthTest: false,
        side: DoubleSide,
        
    });
    
    const group = new Group();

    for(let i = 0; i < faces; i++) {
        const otherFace = new BezierSurface(
            [
                [new Vector3(0, 0, 0), new Vector3(0, 9, 0), new Vector3(0, 9, 0)],
                [new Vector3(0, 0, 8), new Vector3(0, 9, 8), new Vector3(0, 9, 8)]
            ],
            2,
            billboardMaterial
        ).mesh;
        otherFace.position.sub(new Vector3(0, 0, 4));
        otherFace.position.applyAxisAngle(new Vector3(0, 1, 0), i * Math.PI / faces)
        otherFace.position.add(new Vector3(0, 0, 4));
        otherFace.rotateOnAxis(new Vector3(0, 1, 0), i * Math.PI / faces)
        group.add(otherFace);
    }

    return group
}

export { createBikeShed, createBillboardTree };