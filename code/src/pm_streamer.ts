import * as THREE from 'three';
import { BufferGeometry } from 'three';
import testData from './chair_10.json';

interface ReductionData {
    i: number;
    mName: string;
    xName: string;
    xCoords: number[];
    yName: string;
    yCoords: number[];
    polygons: string[][];
}

class ProgressiveMeshStreamingModel {
    vertexLimit: number;
    polygonLimit: number;
    mesh: THREE.Mesh;
    reductionData: ReductionData[];
    vertexIndexMap: {[key: string]: number};
    nextVertexIndex: number;
    nextFaceIndex: number;
    halted: boolean;
    reusableVertexIndices: number[];
    reusableFaceIndices: number[];

    constructor(initial_vertices: any, initial_faces: any, m: any) {
        this.halted = false;
        this.reusableVertexIndices = [];
        this.reusableFaceIndices = [];

        this.vertexLimit = testData.maximums.vertices + 1000;
        this.polygonLimit = testData.maximums.polygons;
        this.reductionData = testData.reduction;

        const vertices = new Float32Array(this.vertexLimit * 3);
        const faces = new Uint16Array(this.polygonLimit * 3);

        const geometry = new BufferGeometry(); 
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3))
        geometry.setIndex(new THREE.BufferAttribute(faces, 1))

        const material = m ? m : new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
        material.wireframe = false;
        this.mesh = new THREE.Mesh(geometry, material);

        this.vertexIndexMap = {};
        let vertexIndex: number = 0;
        let positions = this.mesh.geometry.attributes.position;

        for (const vertexData of testData.vertices) {
            const [x, y, z]: number[] = vertexData.coords;
            this.vertexIndexMap[vertexData.name] = vertexIndex;
            positions.setXYZ(vertexIndex, x, y, z);
            vertexIndex++;
        }

        this.nextVertexIndex = vertexIndex;

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
            indices.setX(polygonIndex++, this.vertexIndexMap[a])
            indices.setX(polygonIndex++, this.vertexIndexMap[b])
            indices.setX(polygonIndex++, this.vertexIndexMap[c])
        }

        this.nextFaceIndex = polygonIndex;

        //@ts-ignore
        this.mesh.geometry.index.needsUpdate = true;
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.geometry.computeBoundingBox();
        this.mesh.geometry.computeBoundingSphere();
        this.mesh.geometry.computeVertexNormals();
    }

    startStepping(delay: number) {
        const autoStep = () => {
            if(this.halted) {
                return;
            }

            this.stepMesh();

            setTimeout(autoStep, delay)
        };

        autoStep();
    }

    addNewVertex(name: string, x: number, y: number, z: number) {
        let vertexIndex: number = this.nextVertexIndex;

        if(this.reusableVertexIndices.length === 0) {
            this.nextVertexIndex += 1;
        } else {
            // @ts-ignore
            vertexIndex = this.reusableVertexIndices.pop();
        }

        this.vertexIndexMap[name] = vertexIndex;
        this.mesh.geometry.attributes.position.setXYZ(vertexIndex, x, y, z);
    }

    stepMesh() {
        if(this.halted) {
            return;
        }

        if(this.reductionData.length === 0) {
            if(document.getElementById("pm_step") !== null) {
                (document.getElementById("pm_step") as HTMLElement).innerHTML = `Done`;
            }
            return;
        }

        const record = this.reductionData.pop();

        if(!record) {
            return;
        }

        if(document.getElementById("pm_step") !== null) {
            (document.getElementById("pm_step") as HTMLElement).innerHTML = `${record.i}`;
        }

        const { mName, xName, xCoords, yName, yCoords, polygons } = record;
        const deletionVertexIndex = this.vertexIndexMap[mName];

        // Add the new vertices
        this.addNewVertex(xName, xCoords[0], xCoords[1], xCoords[2]);
        this.addNewVertex(yName, yCoords[0], yCoords[1], yCoords[2]);

        // Delete all faces related to the midpoint vertex
        let indices = this.mesh.geometry.index;

        if(indices === null) {
            return;
        }
        
        for(let i = 0; i < indices.array.length; i++) {
            if(indices.array[i] == deletionVertexIndex) {
                if(i % 3 === 0) {
                    indices.setX(i, 0)
                    indices.setX(i + 1, 0)
                    indices.setX(i + 2, 0)
                    this.reusableFaceIndices.push(i)
                } else if (i % 3 === 1) {
                    indices.setX(i - 1, 0)
                    indices.setX(i, 0)
                    indices.setX(i + 1, 0)
                    this.reusableFaceIndices.push(i - 1)
                } else if (i % 3 === 2) {
                    indices.setX(i - 2, 0)
                    indices.setX(i - 1, 0)
                    indices.setX(i, 0)
                    this.reusableFaceIndices.push(i - 2)
                }
            }
        }

        // Add the new faces
        for(const polygon of polygons) {
            const realisedPolygon = polygon.map(x => this.vertexIndexMap[x]);
            let faceIndex: number = this.nextFaceIndex;

            if(this.reusableFaceIndices.length === 0) {
                this.nextFaceIndex += 3;
            } else {
                // @ts-ignore
                faceIndex = this.reusableFaceIndices.pop();
            }

            indices.setX(faceIndex, realisedPolygon[0]);
            indices.setX(faceIndex + 1, realisedPolygon[1]);
            indices.setX(faceIndex + 2, realisedPolygon[2]);
        }

        // Delete the old vertex
        this.mesh.geometry.attributes.position.setXYZ(deletionVertexIndex, 0, 0, 0);
        // Including the next line breaks it?
        // delete this.vertexIndexMap[deletionVertexIndex];
        this.reusableVertexIndices.push(deletionVertexIndex);

        //@ts-ignore
        this.mesh.geometry.index.needsUpdate = true;
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.geometry.computeBoundingBox();
        this.mesh.geometry.computeBoundingSphere();
        this.mesh.geometry.computeVertexNormals();
    }
}

export { ProgressiveMeshStreamingModel };