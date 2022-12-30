import { BufferGeometry, DoubleSide, FrontSide, Group, LOD, Material, Mesh, MeshBasicMaterial, MeshPhongMaterial, PlaneGeometry, sRGBEncoding, TextureLoader, Vector2, Vector3, Vector4 } from "three";
import { ModelLoader } from "./model_loader";
import { BezierSurface, BSplineSurface, createCubicBezierCurve, NURBSSurface } from "./parametric_surfaces";
import { ProgressiveMesh } from "./progressive_mesh";

import chairModelData from '../progressive_meshes/chair_packed_reduced.json';
import { RegisterableComponents } from "./registerable";
import { createLevelOfDetail } from "./level_of_detail";
import { ForwardAnimatedModel, InverseAnimatedModel, SkeletalModel } from "./skeletal_model";

const initialLODs = {
    low: 30,
    medium: 20,
    high: 10
}

const offset = (): number => Math.round(Math.random() * 1e4) / 1e6;

const classroomCreator = new ModelLoader(null, `models/custom/classroom/roofless/model.gltf`);
const trampolineEdgeCreator = new ModelLoader(null, `models/custom/trampoline/model.gltf`);
const sportsHallCreator = new ModelLoader(null, `models/custom/sports_hall/model.gltf`);
const corridorCreator = new ModelLoader(null, `models/custom/corridor/model.gltf`);

let tableLOD: LOD | null = null;
let computerLOD: LOD | null = null;

const chairProgressiveMesh = new ProgressiveMesh(
    chairModelData.vertices, 
    chairModelData.polygons, 
    chairModelData.maximums.vertices, 
    chairModelData.maximums.polygons, 
    chairModelData.reduction
);

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

const createBillboarded = (faces: number, billboardMaterial: Material): Group => {
    const group = new Group();

    for(let i = 0; i < faces; i++) {
        const otherFace = new Mesh(new PlaneGeometry(4, 4 * 417/216), billboardMaterial);
        otherFace.rotateY(i * Math.PI / faces)
        group.add(otherFace);
    }

    return group;
}

const createTreeMaker = async (billboardMaterial: Material): Promise<[InverseAnimatedModel, () => [LOD, RegisterableComponents]]> => {
    const billboarded = createBillboarded(2, billboardMaterial);
    const riggedTree = await SkeletalModel.createSkeletalModel("models/external/rigged_pine/rigged.glb");

    const curveOne = createCubicBezierCurve(new Vector2(0, 0), new Vector2(0.3, 0.2), new Vector2(0.7, 1.2), new Vector2(1, 0.7))
    const curveTwo = createCubicBezierCurve(new Vector2(1, 0.7), new Vector2(1.3, 0.2), new Vector2(1.7, -0.1), new Vector2(2, 0))
    const animationCurve = (_t: number) => {
        const t = _t % 2;

        if(t < 1) {
            return curveOne(t);
        }

        return curveTwo(t - 1);
    }

    const treeMaker = new InverseAnimatedModel(
        riggedTree,
        {
            boneIndex: riggedTree.bone_map["BoneTarget"],
            target: (clock: THREE.Clock): THREE.Vector3 => {
                return new Vector3(animationCurve(clock.getElapsedTime()), 6, 0);
            }
        },
        {
            low: {
                "effector": 3,
                "iteration": 1,
                // @ts-ignore
                "links": [{index: 2}], 
                "maxAngle": 0.005,
                "target": 4
            },
            medium: {
                "effector": 3,
                "iteration": 5,
                // @ts-ignore
                "links": [{index: 2}, {index: 1}], 
                "maxAngle": 0.0025,
                "target": 4
            },
            high: {
                "effector": 3,
                "iteration": 10,
                // @ts-ignore
                "links": [{index: 2}, {index: 1}], 
                "maxAngle": 0.0001,
                "target": 4
            }
        },
        "low"
    );

    return [treeMaker,
        () => {
            const lod = new LOD();

            lod.addLevel(billboarded.clone(), 30);
            lod.addLevel(billboarded.clone(), 20);
            lod.addLevel(treeMaker.spawnObject(), 10);

            return [lod, { lods: [lod] }]
        }
    ];
}

const createClassroom = async (chairMaterial: Material, roofMaterial: Material, registerPM?: boolean): Promise<[Group, RegisterableComponents]> => {
    // Table LOD
    if(!tableLOD) {
        tableLOD = await createLevelOfDetail({
            distances: initialLODs,
            modelFolder: "models/custom/table/",
            modelName: "model_pack.gltf"
        });
    }

    tableLOD.rotation.y = Math.PI;
    tableLOD.position.set(3, 0, 4);

    if(!computerLOD) {
        computerLOD = await createLevelOfDetail({
            distances: initialLODs,
            modelFolder: "models/custom/computer/",
            modelName: "model_packed.gltf"
        });
    }

    if(!classroomCreator.loaded) {
        await classroomCreator.loadAndBlock();
    }

    const tableWithChairs = new Group();

    const chairLeft = chairProgressiveMesh.createMesh(chairMaterial);
    chairLeft.position.set(0, offset(), 0);
    const chairRight = chairProgressiveMesh.createMesh(chairMaterial);
    chairRight.position.set(0, offset(), 0.8);
    const table = tableLOD.clone();
    table.position.set(0.9, offset(), -0.75);

    const computerLeft = computerLOD.clone();
    computerLeft.position.set(0.77 * 1.7, 0.9 + offset(), -1.38);
    computerLeft.scale.set(2, 2, 2);
    computerLeft.rotation.y = Math.PI;

    tableWithChairs.add(computerLeft);
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
    roofNURBS.mesh.position.set(0, 2.665 + offset(), -10)
    classroomWithTables.add(roofNURBS.mesh);
    roofNURBS.control_point_grid.position.set(0, 2.665 + offset(), -10)
    classroomWithTables.add(roofNURBS.control_point_grid)

    const prgs = registerPM ? [chairProgressiveMesh] : [];

    return [classroomWithTables, {
        lods: [tableLOD],
        progressives: prgs,
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
        bouncySurface.updateControlPoint(1, 1, new Vector3(1.875, bounceFactor * Math.cos(Math.PI * elapsed) - bounceDepth, 1.875))
        bouncySurface.updateControlPoint(1, 2, new Vector3(1.875, bounceFactor * Math.cos(Math.PI * (elapsed + 0.25)) - bounceDepth, 5.625))
        bouncySurface.updateControlPoint(2, 1, new Vector3(5.625, bounceFactor * Math.cos(Math.PI * (elapsed + 0.5)) - bounceDepth, 1.875))
        bouncySurface.updateControlPoint(2, 2, new Vector3(5.625, bounceFactor * Math.cos(Math.PI * (elapsed + 0.75)) - bounceDepth, 5.625))
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
    roof.control_point_grid.position.add(new Vector3(0, 8.97 - a, -30));
    group.add(roof.control_point_grid);

    return [group , {
        lodSurfaces: [roof]
    }];
}

const createPond = (surfaceMaterial: Material): [Group, RegisterableComponents, (elapsed: number) => void] => {
    const group = new Group();

    const nsControlPoints = [
        [
            new Vector4( 0, 0, 0, 1 ),
            new Vector4( 0, 0, 5, 1 ),
            new Vector4( 0, 0, 10, 1 ),
            new Vector4( 0, 0, 15, 1 ),
            new Vector4( 0, 0, 20, 1 ),
            new Vector4( 0, 0, 25, 1 )
        ],
        [
            new Vector4( 1 * 26.25 / 5, 0, 0, 1 ),
            new Vector4( 1 * 26.25 / 5, 0, 5, 2 ),
            new Vector4( 1 * 26.25 / 5, 0, 10, 2 ),
            new Vector4( 1 * 26.25 / 5, 0, 15, 2 ),
            new Vector4( 1 * 26.25 / 5, 0, 20, 2 ),
            new Vector4( 1 * 26.25 / 5, 0, 25, 1 )
        ],
        [
            new Vector4( 2 * 26.25 / 5, 0, 0, 1 ),
            new Vector4( 2 * 26.25 / 5, 0, 5, 2 ),
            new Vector4( 2 * 26.25 / 5, 0, 10, 2 ),
            new Vector4( 2 * 26.25 / 5, 0, 15, 2 ),
            new Vector4( 2 * 26.25 / 5, 0, 20, 2 ),
            new Vector4( 2 * 26.25 / 5, 0, 25, 1 )
        ],
        [
            new Vector4( 3 * 26.25 / 5, 0, 0, 1 ),
            new Vector4( 3 * 26.25 / 5, 0, 5, 2 ),
            new Vector4( 3 * 26.25 / 5, 0, 10, 2 ),
            new Vector4( 3 * 26.25 / 5, 0, 15, 2 ),
            new Vector4( 3 * 26.25 / 5, 0, 20, 2 ),
            new Vector4( 3 * 26.25 / 5, 0, 25, 1 )
        ],
        [
            new Vector4( 4 * 26.25 / 5, 0, 0, 1 ),
            new Vector4( 4 * 26.25 / 5, 0, 5, 2 ),
            new Vector4( 4 * 26.25 / 5, 0, 10, 2 ),
            new Vector4( 4 * 26.25 / 5, 0, 15, 2 ),
            new Vector4( 4 * 26.25 / 5, 0, 20, 2 ),
            new Vector4( 4 * 26.25 / 5, 0, 25, 1 )
        ],
        [
            new Vector4( 26.25, 0, 0, 1 ),
            new Vector4( 26.25, 0, 5, 1 ),
            new Vector4( 26.25, 0, 10, 1 ),
            new Vector4( 26.25, 0, 15, 1 ),
            new Vector4( 26.25, 0, 20, 1 ),
            new Vector4( 26.25, 0, 25, 1 )
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
                pondSurface.updateControlPoint(i, j, 
                    new Vector3(oldPoint.x, (Math.sin(elapsed * (i ** 2 + j ** 2) / 50 + Math.PI / 2) + Math.sin(elapsed * ((5 - i) ** 2 + (5 - j) ** 2) / 50)) / 2, oldPoint.z)
                )
            })
        })
    }];
}

const createCorridor = async (roofMaterial: Material): Promise<Group> => {
    await corridorCreator.loadAndBlock()

    const group = new Group();
    corridorCreator.addToScene(m => group.add(m));

    return group;
}

const createSportsField = (surfaceMaterial: Material): [Group, RegisterableComponents, (elapsed: number) => void] => {
    const group = new Group();

    const nsControlPoints = [
        [
            new Vector4( 0, 0, 0, 1 ),
            new Vector4( 0, 0, 14, 1 ),
            new Vector4( 0, 0, 28, 1 ),
            new Vector4( 0, 0, 42, 1 ),
            new Vector4( 0, 0, 56, 1 ),
            new Vector4( 0, 0, 70, 1 )
        ],
        [
            new Vector4( 12, 0, 0, 1 ),
            new Vector4( 12, 0, 14, 2 ),
            new Vector4( 12, 0, 28, 2 ),
            new Vector4( 12, 0, 42, 2 ),
            new Vector4( 12, 0, 56, 2 ),
            new Vector4( 12, 0, 70, 1 )
        ],
        [
            new Vector4( 24, 0, 0, 1 ),
            new Vector4( 24, 0, 14, 3 ),
            new Vector4( 24, 0, 28, 6 ),
            new Vector4( 24, 0, 42, 6 ),
            new Vector4( 24, 0, 56, 3 ),
            new Vector4( 24, 0, 70, 1 )
        ],
        [
            new Vector4( 36, 0, 0, 1 ),
            new Vector4( 36, 0, 14, 3 ),
            new Vector4( 36, 0, 28, 6 ),
            new Vector4( 36, 0, 42, 6 ),
            new Vector4( 36, 0, 56, 3 ),
            new Vector4( 36, 0, 70, 1 )
        ],
        [
            new Vector4( 48, 0, 0, 1 ),
            new Vector4( 48, 0, 14, 2 ),
            new Vector4( 48, 0, 28, 2 ),
            new Vector4( 48, 0, 42, 2 ),
            new Vector4( 48, 0, 56, 2 ),
            new Vector4( 48, 0, 70, 1 )
        ],
        [
            new Vector4( 60, 0, 0, 1 ),
            new Vector4( 60, 0, 14, 1 ),
            new Vector4( 60, 0, 28, 1 ),
            new Vector4( 60, 0, 42, 1 ),
            new Vector4( 60, 0, 56, 1 ),
            new Vector4( 60, 0, 70, 1 )
        ]
    ];

    const p = 2;
    const U = [0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1]
    const q = 3;
    const V = [0, 0, 0, 0, 0.33, 0.66, 1, 1, 1, 1]

    const samples = 40;

    const fieldSurface = new NURBSSurface(nsControlPoints, p, q, U, V, samples, surfaceMaterial, 0.5);
    group.add(fieldSurface.mesh);
    group.add(fieldSurface.control_point_grid);

    return [group, {
        fixedSurfaces: [fieldSurface]
    }, (elapsed) => {
        [...Array(6).keys()].forEach(i => {
            [...Array(6).keys()].forEach(j => {
                const oldPoint = fieldSurface.control_points[i][j];
                // fieldSurface.updateControlPoint(i, j, 
                //     new Vector3(oldPoint.x, (12.5 - ((i - 2.5) ** 2 + (j - 2.5) ** 2)) * -1 * (Math.sin(Math.PI * elapsed * (i - 5) * (j - 5) * i * j / 40) + 1), oldPoint.z)
                // )
            })
        })
    }];
}

const createRiggedHumanoid = async (): Promise<ForwardAnimatedModel> => {
    const riggedPerson = await SkeletalModel.createSkeletalModel("models/custom/basic_humanoid/rigged_basic_targets.glb");
    const forwardKinematicModel = new ForwardAnimatedModel(riggedPerson, {
        low: 8,
        medium: 4,
        high: 1
    }, "low");

    console.log({h: riggedPerson.getSkeletonHierarchy()})

    forwardKinematicModel.addAnimation(
        "stretch", 
        (skinnedMesh: THREE.SkinnedMesh, skeletal: SkeletalModel) => {},
        (skinnedMesh: THREE.SkinnedMesh, skeletal: SkeletalModel, clock: THREE.Clock) => {
            skinnedMesh.skeleton.bones[skeletal.bone_map["spine001"]].rotation.set(0, Math.cos(clock.getElapsedTime()) * (Math.PI / 2 - 0.5), 0);
        }
    );

    const bounceSpeed = Math.PI;

    for(let i = 0; i < 4; i++) {
        const offset = i / 4;

        forwardKinematicModel.addAnimation(
            `bounce${i}`, 
            (skinnedMesh: THREE.SkinnedMesh, skeletal: SkeletalModel) => {
                skinnedMesh.skeleton.bones[skeletal.bone_map["upper_armL"]].rotateZ(- Math.PI / 4);
                skinnedMesh.skeleton.bones[skeletal.bone_map["forearmL"]].rotateZ(- Math.PI / 8);
                skinnedMesh.skeleton.bones[skeletal.bone_map["forearmL"]].rotateX(Math.PI / 4);
    
                skinnedMesh.skeleton.bones[skeletal.bone_map["upper_armR"]].rotateZ(Math.PI / 4);
                skinnedMesh.skeleton.bones[skeletal.bone_map["forearmR"]].rotateZ(Math.PI / 8);
                skinnedMesh.skeleton.bones[skeletal.bone_map["forearmR"]].rotateX(Math.PI / 4);
            },
            (skinnedMesh: THREE.SkinnedMesh, skeletal: SkeletalModel, clock: THREE.Clock) => {
                const offsetTime = clock.getElapsedTime() + offset;
                const thighY = 1 - 0.3 * Math.abs(Math.cos(0.5 * bounceSpeed * offsetTime));
                skinnedMesh.skeleton.bones[skeletal.bone_map["thighL"]].scale.set(1, thighY, 1);
                skinnedMesh.skeleton.bones[skeletal.bone_map["thighR"]].scale.set(1, thighY, 1);
                const spineRotationX = Math.PI / 16 + (3 * Math.PI / 16) * Math.cos(bounceSpeed * offsetTime)
                skinnedMesh.skeleton.bones[skeletal.bone_map["spine001"]].rotation.setFromVector3(new Vector3(spineRotationX, 0, 0));
            }
        );
    }
    

    return forwardKinematicModel;
}

export { 
    createBikeShed, 
    createBillboarded, 
    createClassroom, 
    createTrampoline, 
    createSportsHall, 
    createPond, 
    createCorridor, 
    createSportsField, 
    createTreeMaker,
    createRiggedHumanoid
};