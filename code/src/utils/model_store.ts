import THREE, { BufferGeometry, DoubleSide, Group, Material, Mesh, MeshBasicMaterial, TextureLoader, Vector3 } from "three";
import { ModelLoader } from "./model_loader";
import { BezierSurface } from "./parametric_surfaces";
import { ProgressiveMesh } from "./progressive_mesh";
import { scene } from "./three_setup";

import chairModelData from '../progressive_meshes/chair_50.json';
import { RegisterableComponents } from "./registerable";
import { createLevelOfDetail } from "./level_of_detail";

const initialLODs = {
    low: 30,
    medium: 20,
    high: 10
}

const offset = (): number => Math.round(Math.random() * 1e4) / 1e6;
const classroomCreator = new ModelLoader(scene, `models/custom/classroom/model.gltf`);

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

const createClassroom = async (chairMaterial: Material): Promise<[Group, RegisterableComponents]> => {
    // Table LOD
    let tableLOD = await createLevelOfDetail({
        distances: initialLODs,
        modelFolder: "models/custom/table/",
        modelName: "model.gltf"
    });

    tableLOD.rotation.y = Math.PI;
    tableLOD.position.set(3, 0, 4);
    
    const chairProgressiveMesh = new ProgressiveMesh(
        chairModelData.vertices, 
        chairModelData.polygons, 
        chairModelData.maximums.vertices, 
        chairModelData.maximums.polygons, 
        chairModelData.reduction
    );
    await classroomCreator.loadAndBlock();

    const tableWithChairs = new Group();

    const chairLeft = chairProgressiveMesh.createMesh(chairMaterial);
    chairLeft.position.set(0, offset(), 0);
    const chairRight = chairProgressiveMesh.createMesh(chairMaterial);
    chairRight.position.set(0, offset(), 0.8);
    const table = tableLOD.clone();
    table.position.set(0.9, offset(), -0.75);

    tableWithChairs.add(chairLeft);
    tableWithChairs.add(chairRight);
    tableWithChairs.add(table);

    tableWithChairs.rotation.y = Math.PI;

    const classroomWithTables = new Group();

    const tablePositions = [
        [4.25, offset(), -1.25], [4.25, offset(), -3.75], [4.25, offset(), -6.25],
        [2.75, offset(), -1.25], [2.75, offset(), -3.75], [2.75, offset(), -6.25]
    ];

    tablePositions.forEach(([x, y, z]) => {
        const copied = tableWithChairs.clone();
        copied.position.set(x, y, z); 
        classroomWithTables.add(copied);
    });

    const copied = tableWithChairs.clone();
    copied.rotation.y = -Math.PI / 2;
    copied.position.set(2, offset(), -9)
    classroomWithTables.add(copied);
    
    classroomCreator.addToScene(m => {
        m.position.set(0, offset(), 0)
        classroomWithTables.add(m);
    });

    return [classroomWithTables, {
        lods: [tableLOD],
        progressives: [chairProgressiveMesh]
    }];
}

export { createBikeShed, createBillboardTree, createClassroom };