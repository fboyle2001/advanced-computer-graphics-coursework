import * as THREE from 'three';
import { BufferGeometry } from 'three';
import testData from './test_reduced.json';

interface ReductionData {
    i: number;
    l: string;
    lc: number[];
    ln: string[];
    r: string;
    rc: number[];
    rn: string[];
    n: string;
}

class ProgressiveMeshStreamingModel {
    vertexLimit: number;
    polygonLimit: number;
    mesh: THREE.Mesh;
    reductionData: ReductionData[];
    indexMap: {[key: string]: number};
    nextIndex: number;
    nextFaceIndex: number;
    halted: boolean;

    constructor(initial_vertices: any, initial_faces: any) {
        this.halted = false;
        this.vertexLimit = testData.maximums.vertices + 5000;
        this.polygonLimit = testData.maximums.polygons + 5000;
        this.reductionData = testData.reduction;

        const vertices = new Float32Array(this.vertexLimit * 3);
        const faces = new Uint16Array(this.polygonLimit * 3);

        const geometry = new BufferGeometry(); 
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3))
        geometry.setIndex(new THREE.BufferAttribute(faces, 1))

        const material = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
        material.wireframe = false;
        this.mesh = new THREE.Mesh(geometry, material);

        this.indexMap = {};
        let vertexIndex: number = 0;
        let positions = this.mesh.geometry.attributes.position;
        console.log(positions.clone().array)

        for (const vertexData of testData.vertices) {
            const [x, y, z]: number[] = vertexData.coords;
            this.indexMap[vertexData.name] = vertexIndex;
            positions.setXYZ(vertexIndex, x, y, z);
            vertexIndex++;
        }

        this.nextIndex = Object.keys(this.indexMap).length;

        console.log({vertexIndex, l: this.vertexLimit})

        let indices = this.mesh.geometry.index;

        if(indices === null) {
            console.error("Null indices");
            this.nextFaceIndex = 0;
            return;
        }

        let polygonIndex = 0;

        for (const polygon of testData.polygons) {
            const [a, b, c]: string[] = polygon;
            // Must note that the vectors are defined as length one so setXYZ doesn't work!
            indices.setX(polygonIndex++, this.indexMap[a])
            indices.setX(polygonIndex++, this.indexMap[b])
            indices.setX(polygonIndex++, this.indexMap[c])
        }

        this.nextFaceIndex = polygonIndex;

        //@ts-ignore
        this.mesh.geometry.index.needsUpdate = true;
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.geometry.computeBoundingBox();
        this.mesh.geometry.computeBoundingSphere();
        this.mesh.geometry.computeVertexNormals();
    }

    stepMesh() {
        if(this.reductionData.length === 0 || this.halted) {
            return;
        }

        const record = this.reductionData.pop();
        
        if(!record) {
            return;
        }

        const vertexName = record.n;

        const aName = record.l;
        this.indexMap[aName] = this.nextIndex++;
        const aCoords = record.lc;
        const aNeighbours = record.ln; 

        const bName = record.r;
        this.indexMap[bName] = this.nextIndex++;
        const bCoords = record.rc;
        const bNeighbours = record.rn;

        const deletionVertexIndex = this.indexMap[vertexName];
        const aMapped = aNeighbours.map(x => this.indexMap[x]);
        const bMapped = bNeighbours.map(x => this.indexMap[x]);
        const aIndex = this.indexMap[aName];
        const bIndex = this.indexMap[bName];

        console.log({deletionVertexIndex})
        console.log({aName, aIndex, bName, bIndex})
        console.log({aNeighbours, aMapped }) 
        console.log({bNeighbours, bMapped })

        // Delete all faces related to the midpoint vertex
        let indices = this.mesh.geometry.index;

        if(indices === null) {
            return;
        }

        let deletedNeighbours: number[][] = [];
        let freeSlots: number[] = [];
        
        for(let i = 0; i < indices.array.length; i++) {
            if(indices.array[i] == deletionVertexIndex) {
                if(i % 3 === 0) {
                    deletedNeighbours.push([indices.array[i + 1], indices.array[i + 2]]);
                    freeSlots.push(i);
                    indices.setX(i, 0)
                    indices.setX(i + 1, 0)
                    indices.setX(i + 2, 0)
                } else if (i % 3 === 1) {
                    deletedNeighbours.push([indices.array[i - 1], indices.array[i + 1]]);
                    freeSlots.push(i - 1);
                    indices.setX(i - 1, 0)
                    indices.setX(i, 0)
                    indices.setX(i + 1, 0)
                } else if (i % 3 === 2) {
                    deletedNeighbours.push([indices.array[i - 2], indices.array[i - 1]]);
                    freeSlots.push(i - 2);
                    indices.setX(i - 2, 0)
                    indices.setX(i - 1, 0)
                    indices.setX(i, 0)
                }
            }
        }

        // Put the new vertices into the position buffer
        this.mesh.geometry.attributes.position.setXYZ(aIndex, aCoords[0], aCoords[1], aCoords[2])
        this.mesh.geometry.attributes.position.setXYZ(bIndex, bCoords[0], bCoords[1], bCoords[2])

        // Create the new polygons
        for(const [x, y] of deletedNeighbours) {
            const neighbouringA = aMapped.filter(z => z === x || z === y)
            const neighbouringB = bMapped.filter(z => z === x || z === y)
            const faceIndex = this.nextFaceIndex++;

            console.log({x, y, neighbouringA, neighbouringB});

            if(neighbouringA.length === 0 && neighbouringB.length === 0) {
                console.error("A = 0, B = 0");
                this.halted = true;
                return;
            } else if (neighbouringA.length === 1 && neighbouringB.length === 0) {
                // Shouldn't occur
                console.error("A = 0, B = 1")
                // this.halted = true;
                return;
            } else if (neighbouringA.length === 2 && neighbouringB.length === 0) {
                // Both neighbour A so it forms a polygon with A
                indices.setX(faceIndex, aIndex);
                indices.setX(faceIndex + 1, x);
                indices.setX(faceIndex + 2, y)
            } else if (neighbouringA.length === 1 && neighbouringB.length === 1) {
                // Neighbour A and B so it forms a polygon with both
                if(neighbouringA[0] !== neighbouringB[0]) {
                    console.error(`Not matched ${neighbouringA[0]} ${neighbouringB[0]} choosing not to halt`)
                    // this.halted = true;
                    return;
                }
                
                indices.setX(faceIndex, aIndex);
                indices.setX(faceIndex + 1, bIndex);
                indices.setX(faceIndex + 2, neighbouringA[0]);
            } else if (neighbouringA.length === 2 && neighbouringB.length === 1) {
                // Only do to A
                indices.setX(faceIndex, aIndex);
                indices.setX(faceIndex + 1, x);
                indices.setX(faceIndex + 2, y)
            } else if (neighbouringA.length === 1 && neighbouringB.length === 2) {
                // Only do to B
                indices.setX(faceIndex, bIndex);
                indices.setX(faceIndex + 1, x);
                indices.setX(faceIndex + 2, y)
            } else if (neighbouringA.length === 0 && neighbouringB.length === 1) {
                // Shouldn't occur
                console.error("A = 0, B = 1")
                // this.halted = true;
                return;
            } else if (neighbouringA.length === 0 && neighbouringB.length === 2) {
                // Both neighbour B so it forms a polygon with B
                indices.setX(faceIndex, bIndex);
                indices.setX(faceIndex + 1, x);
                indices.setX(faceIndex + 2, y)
            } else if (neighbouringA.length === 2 && neighbouringB.length === 2) {
                // Both new nodes neighbour them
                indices.setX(faceIndex, aIndex);
                indices.setX(faceIndex + 1, neighbouringA[1]);
                indices.setX(faceIndex + 2, neighbouringA[2]);

                this.nextFaceIndex += 2;
                const additionalFaceIndex = this.nextFaceIndex++;

                indices.setX(additionalFaceIndex, bIndex);
                indices.setX(additionalFaceIndex + 1, neighbouringB[1]);
                indices.setX(additionalFaceIndex + 2, neighbouringB[2]);
            }
            
            this.nextFaceIndex += 2;

            // if(neighbouringA.length === 0) {
            //     if(neighbouringB.length > 0) {
            //         // Neighbours B only
            //         let faceIndex = freeSlots.pop();

            //         if(!faceIndex) {
            //             console.error("No faceIndex");
            //             return;
            //         }

            //         if(neighbouringB.length !== 2) {
            //             console.error("Invalid no of neighbours");
            //             faceIndex = this.nextFaceIndex++;
            //         }

            //         indices.setX(faceIndex, bIndex);
            //         indices.setX(faceIndex + 1, neighbouringB[0]);
            //         indices.setX(faceIndex + 2, neighbouringB[1]);
            //     } else {
            //         console.error(`Not connected to either ${x} ${y}`);
            //         continue
            //     }
            // } else {
            //     if(neighbouringB.length > 0) {
            //         // Neighbours both 
            //         const faceIndex = freeSlots.pop();

            //         if(!faceIndex) {
            //             console.error("No faceIndex");
            //             return;
            //         }

            //         indices.setX(faceIndex, neighbouringB[0]);
            //         indices.setX(faceIndex + 1, aIndex);
            //         indices.setX(faceIndex + 2, bIndex);
            //     } else {
            //         // Neighbours A only
            //         let faceIndex = freeSlots.pop();

            //         if(!faceIndex) {
            //             console.error("No faceIndex");
            //             return;
            //         }

            //         if(neighbouringA.length !== 2) {
            //             console.error("Invalid no of neighbours");
            //             faceIndex = this.nextFaceIndex++;
            //         }

            //         indices.setX(faceIndex, aIndex);
            //         indices.setX(faceIndex + 1, neighbouringA[0]);
            //         indices.setX(faceIndex + 2, neighbouringA[1]);
            //     }
            // }
        }

        // if(freeSlots.length !== 0) {
        //     console.error("Did not expend free slots");
        //     this.halted = true;
        //     return;
        // }

        // Finish by deleting the old vertex

        //@ts-ignore
        this.mesh.geometry.index.needsUpdate = true;
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.geometry.computeBoundingBox();
        this.mesh.geometry.computeBoundingSphere();
        this.mesh.geometry.computeVertexNormals();

        console.warn("Done!")
    }
}

export { ProgressiveMeshStreamingModel };