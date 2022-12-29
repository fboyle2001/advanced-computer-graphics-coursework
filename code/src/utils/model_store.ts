import { BufferGeometry, DoubleSide, Group, Material, Mesh, MeshBasicMaterial, TextureLoader, Vector3, Vector4 } from "three";
import { ModelLoader } from "./model_loader";
import { BezierSurface, BSplineSurface, NURBSSurface } from "./parametric_surfaces";
import { ProgressiveMesh } from "./progressive_mesh";

import chairModelData from '../progressive_meshes/chair_50.json';
import { RegisterableComponents } from "./registerable";
import { createLevelOfDetail } from "./level_of_detail";

const initialLODs = {
    low: 30,
    medium: 20,
    high: 10
}

const offset = (): number => Math.round(Math.random() * 1e4) / 1e6;

const classroomCreator = new ModelLoader(null, `models/custom/classroom/roofless/model.gltf`);
const trampolineEdgeCreator = new ModelLoader(null, `models/custom/trampoline/model.gltf`);
const sportsHallCreator = new ModelLoader(null, `models/custom/sports_hall/model_pack.gltf`);

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
        lodSurfaces: [curvedRoof, curvedSection, otherCurvedSection]
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

const createClassroom = async (chairMaterial: Material, roofMaterial: Material): Promise<[Group, RegisterableComponents]> => {
    // Table LOD
    let tableLOD = await createLevelOfDetail({
        distances: initialLODs,
        modelFolder: "models/custom/table/",
        modelName: "model_pack.gltf"
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

    const nsControlPoints = [
        [
            new Vector4( 0, 0, 0, 1 ),
            new Vector4( 0, 0, 3.33, 1 ),
            new Vector4( 0, 0, 6.67, 1 ),
            new Vector4( 0, 0, 10, 1 )
        ],
        [
            new Vector4( 1.67, 0, 0, 1 ),
            new Vector4( 1.67, 2.2, 3.33, 1 ),
            new Vector4( 1.67, 2.2, 6.67, 1 ),
            new Vector4( 1.67, 0, 10, 1 )
        ],
        [
            new Vector4( 3.33, 0, 0, 1 ),
            new Vector4( 3.33, 2.2, 3.33, 1 ),
            new Vector4( 3.33, 2.2, 6.67, 1 ),
            new Vector4( 3.33, 0, 10, 1 )
        ],
        [
            new Vector4( 5, 0, 0, 1 ),
            new Vector4( 5, 0, 3.33, 1 ),
            new Vector4( 5, 0, 6.67, 1 ),
            new Vector4( 5, 0, 10, 1 )
        ]
    ];
    
    const U = [ 0, 0, 0, 0, 1, 1, 1, 1 ];
    const V = [ 0, 0, 0, 0, 1, 1, 1, 1 ];
    const p = 3;
    const q = 3;
    const samples = 40;

    const roofNURBS = new NURBSSurface(nsControlPoints, p, q, U, V, samples, roofMaterial);
    roofNURBS.mesh.position.set(0, 2.66 + offset(), -10)
    classroomWithTables.add(roofNURBS.mesh);
    roofNURBS.control_point_grid.position.set(0, 2.66 + offset(), -10)
    classroomWithTables.add(roofNURBS.control_point_grid)

    return [classroomWithTables, {
        lods: [tableLOD],
        progressives: [chairProgressiveMesh],
        lodSurfaces: [roofNURBS]
    }];
}

const createTrampoline = async (surfaceMaterial: Material): Promise<[Group, RegisterableComponents, (elapsed: number) => void]> => {
    await trampolineEdgeCreator.loadAndBlock();

    const group = new Group();
    trampolineEdgeCreator.addToScene(m => {
        group.add(m);
    });

    const nsControlPoints = [
        [
            new Vector4( 0, 0, 0, 0.8 ),
            new Vector4( 0, 0, 2.5, 1 ),
            new Vector4( 0, 0, 5, 1 ),
            new Vector4( 0, 0, 7.5, 0.8 )
        ],
        [
            new Vector4( 2.5, 0, 0, 1 ),
            new Vector4( 1.875, 0, 1.875, 1.2 ),
            new Vector4( 1.875, 0, 5.625, 1.2 ),
            new Vector4( 2.5, 0, 7.5, 1 )
        ],
        [
            new Vector4( 5, 0, 0, 1 ),
            new Vector4( 5.625, 0, 1.875, 1.2 ),
            new Vector4( 5.625, 0, 5.625, 1.2 ),
            new Vector4( 5, 0, 7.5, 1 )
        ],
        [
            new Vector4( 7.5, 0, 0, 0.8 ),
            new Vector4( 7.5, 0, 2.5, 1 ),
            new Vector4( 7.5, 0, 5, 1 ),
            new Vector4( 7.5, 0, 7.5, 0.8 )
        ]
    ];
    
    const U = [ 0, 0, 0, 0, 1, 1, 1, 1 ];
    const V = [ 0, 0, 0, 0, 1, 1, 1, 1 ];
    const p = 3;
    const q = 3;
    const samples = 40;

    const bouncySurface = new NURBSSurface(nsControlPoints, p, q, U, V, samples, surfaceMaterial);
    bouncySurface.mesh.position.set(0.25, 0.78, 0.25)
    bouncySurface.control_point_grid.position.set(0.25, 0.78, 0.25)
    group.add(bouncySurface.mesh);
    group.add(bouncySurface.control_point_grid);
    const bounceFactor = 1.1;
    const bounceDepth = 0.3;

    return [group, {
        fixedSurfaces: [bouncySurface]
    }, (elapsed) => {
        bouncySurface.updateControlPoint(1, 1, new Vector3(1.875, bounceFactor * Math.sin(Math.PI * elapsed) - bounceDepth, 1.875))
        bouncySurface.updateControlPoint(1, 2, new Vector3(1.875, bounceFactor * Math.sin(Math.PI * (elapsed + 0.25)) - bounceDepth, 5.625))
        bouncySurface.updateControlPoint(2, 1, new Vector3(5.625, bounceFactor * Math.sin(Math.PI * (elapsed + 0.5)) - bounceDepth, 1.875))
        bouncySurface.updateControlPoint(2, 2, new Vector3(5.625, bounceFactor * Math.sin(Math.PI * (elapsed + 0.75)) - bounceDepth, 5.625))
    }];
}

const createSportsHall = async (roofMaterial: Material): Promise<[Group, RegisterableComponents]> => {
    await sportsHallCreator.loadAndBlock();
    const group = new Group();
    sportsHallCreator.addToScene(m => group.add(m));

    const a = -1.2;
    const b = -1;
    const c = -0.6;

    let roofControlPoints = [
        [new Vector3(0, a, 0), new Vector3(3.528, b, 0), new Vector3(7.056, c, 0), new Vector3(10.584, c, 0), new Vector3(14.112, b, 0), new Vector3(17.64, a, 0)],
        [new Vector3(0, b, 6), new Vector3(3.528, 0, 6), new Vector3(7.056, 0, 6), new Vector3(10.584, 0, 6), new Vector3(14.112, 0, 6), new Vector3(17.64, b, 6)],
        [new Vector3(0, c, 12), new Vector3(3.528, 0, 12), new Vector3(7.056, 1, 12), new Vector3(10.584, 1, 12), new Vector3(14.112, 0, 12), new Vector3(17.64, c, 12)],
        [new Vector3(0, c, 18), new Vector3(3.528, 0, 18), new Vector3(7.056, 1, 18), new Vector3(10.584, 1, 18), new Vector3(14.112, 0, 18), new Vector3(17.64, c, 18)],
        [new Vector3(0, b, 24), new Vector3(3.528, 0, 24), new Vector3(7.056, 0, 24), new Vector3(10.584, 0, 24), new Vector3(14.112, 0, 24), new Vector3(17.64, b, 24)],
        [new Vector3(0, a, 30), new Vector3(3.528, b, 30), new Vector3(7.056, c, 30), new Vector3(10.584, c, 30), new Vector3(14.112, b, 30), new Vector3(17.64, a, 30)]
    ];

    const p = 2;
    const q = 2;
    const U = [0, 0, 0, 0.167, 0.417, 0.667, 1, 1, 1]
    const V = [0, 0, 0, 0.167, 0.417, 0.667, 1, 1, 1]
    
    // const U = [0, 0, 1e-6, 0.251, 0.667, , 1-(1e-6), 1, 1]
    // const V = [0, 0, 1e-6, 0.251, 0.667, 1-(1e-6), , 1, 1]

    const roof = new BSplineSurface(roofControlPoints, p, q, U, V, 40, roofMaterial);
    roof.mesh.position.add(new Vector3(0, 8.97 - a, -30));
    group.add(roof.mesh);
    const cpGrid = roof.createControlPointGrid(0.2);
    cpGrid.position.add(new Vector3(0, 8.97 - a, -30));
    group.add(cpGrid);

    return [group , {
        lodSurfaces: [roof]
    }];
}

const createPond = (surfaceMaterial: Material): [Group, RegisterableComponents, (elapsed: number) => void] => {
    const group = new Group();

    const nsControlPoints = [
        [
            new Vector4( 0, 0, 0, 1 ),
            new Vector4( 0, 0, 3, 1 ),
            new Vector4( 0, 0, 6, 1 ),
            new Vector4( 0, 0, 9, 1 ),
            new Vector4( 0, 0, 12, 1 ),
            new Vector4( 0, 0, 15, 1 )
        ],
        [
            new Vector4( 3, 0, 0, 1 ),
            new Vector4( 3, 0, 3, 2 ),
            new Vector4( 3, 0, 6, 2 ),
            new Vector4( 3, 0, 9, 2 ),
            new Vector4( 3, 0, 12, 2 ),
            new Vector4( 3, 0, 15, 1 )
        ],
        [
            new Vector4( 6, 0, 0, 1 ),
            new Vector4( 6, 0, 3, 2 ),
            new Vector4( 6, 0, 6, 2 ),
            new Vector4( 6, 0, 9, 2 ),
            new Vector4( 6, 0, 12, 2 ),
            new Vector4( 6, 0, 15, 1 )
        ],
        [
            new Vector4( 9, 0, 0, 1 ),
            new Vector4( 9, 0, 3, 2 ),
            new Vector4( 9, 0, 6, 2 ),
            new Vector4( 9, 0, 9, 2 ),
            new Vector4( 9, 0, 12, 2 ),
            new Vector4( 9, 0, 15, 1 )
        ],
        [
            new Vector4( 12, 0, 0, 1 ),
            new Vector4( 12, 0, 3, 2 ),
            new Vector4( 12, 0, 6, 2 ),
            new Vector4( 12, 0, 9, 2 ),
            new Vector4( 12, 0, 12, 2 ),
            new Vector4( 12, 0, 15, 1 )
        ],
        [
            new Vector4( 15, 0, 0, 1 ),
            new Vector4( 15, 0, 3, 1 ),
            new Vector4( 15, 0, 6, 1 ),
            new Vector4( 15, 0, 9, 1 ),
            new Vector4( 15, 0, 12, 1 ),
            new Vector4( 15, 0, 15, 1 )
        ]
    ];

    const p = 2;
    const U = [0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1]
    const q = 3;
    const V = [0, 0, 0, 0, 0.33, 0.66, 1, 1, 1, 1]

    const samples = 40;

    const pondSurface = new NURBSSurface(nsControlPoints, p, q, U, V, samples, surfaceMaterial, 0.5);
    group.add(pondSurface.mesh);
    group.add(pondSurface.control_point_grid);

    return [group, {
        fixedSurfaces: [pondSurface]
    }, (elapsed) => {
        [...Array(6).keys()].forEach(i => {
            [...Array(6).keys()].forEach(j => {
                const oldPoint = pondSurface.control_points[i][j];
                console.log({oldPoint})
                pondSurface.updateControlPoint(i, j, new Vector3(oldPoint.x, Math.cos(elapsed * i / 6 * Math.PI), oldPoint.z))
            })
        })
    }];
}

export { createBikeShed, createBillboardTree, createClassroom, createTrampoline, createSportsHall, createPond };