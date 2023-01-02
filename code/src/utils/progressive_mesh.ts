import * as THREE from 'three';
import { BufferGeometry, Material } from 'three';
import { Logger } from './logger';

// Data stored about a specific vertex
interface VertexData {
    name: string,
    coords: number[]
}

// The edge collapse record used to reconstruct the mesh
interface ReductionRecord {
    i: number;
    mName: string;
    xName: string;
    xCoords: number[];
    yName: string;
    yCoords: number[];
    polygons: string[][];
}

// Defines the reconstruction process of an edge-collapsed mesh
class ProgressiveMesh {
    // We predefine these to prevent resizing the geometry which is very costly (and laggy!)
    vertexLimit: number;
    polygonLimit: number;
    reductionData: ReductionRecord[];
    // Map vertex names to vertex buffer indices
    vertexIndexMap: {[key: string]: number};
    nextVertexIndex: number;
    nextFaceIndex: number;
    // Repurpose old indices so we can use a fixed memory space
    reusableVertexIndices: number[];
    reusableFaceIndices: number[];
    // The geometry representing the current state of the vertex and edge reconstruction
    geometry: BufferGeometry;

    constructor(
        initial_vertices: VertexData[], 
        initial_faces: string[][],
        max_vertices: number,
        max_faces: number,
        reductionData: ReductionRecord[]
    ) {
        this.reusableVertexIndices = [];
        this.reusableFaceIndices = [];

        this.vertexLimit = max_vertices;
        this.polygonLimit = max_faces;
        this.reductionData = reductionData;

        // Needed as we are working at a lower level
        const vertices = new Float32Array(this.vertexLimit * 3);
        const faces = new Uint16Array(this.polygonLimit * 3);

        // Manually prepare the geometry
        this.geometry = new BufferGeometry(); 
        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        this.geometry.setIndex(new THREE.BufferAttribute(faces, 1));

        this.vertexIndexMap = {};
        let vertexIndex: number = 0;
        let positions = this.geometry.attributes.position;

        // Build the base mesh from the input data
        for (const vertexData of initial_vertices) {
            const [x, y, z] = vertexData.coords;
            this.vertexIndexMap[vertexData.name] = vertexIndex;
            positions.setXYZ(vertexIndex, x, y, z);
            vertexIndex++;
        }

        this.nextVertexIndex = vertexIndex;

        let indices = this.geometry.index;

        // Should not occur indicates an issue with the progressive mesh
        if(indices === null) {
            console.error("Null indices");
            this.nextFaceIndex = 0;
            return;
        }

        let polygonIndex = 0;

        for (const polygon of initial_faces) {
            const [a, b, c] = polygon;
            // Must note that the vectors are defined as length one so setXYZ doesn't work!
            indices.setX(polygonIndex++, this.vertexIndexMap[a])
            indices.setX(polygonIndex++, this.vertexIndexMap[b])
            indices.setX(polygonIndex++, this.vertexIndexMap[c])
        }

        this.nextFaceIndex = polygonIndex;

        // Update the geometry
        this.geometry.index!.needsUpdate = true;
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
        this.geometry.computeVertexNormals();
    }

    // Spawn a mesh using the shared geometry
    // Allows updates to the geometry to automatically propagate
    createMesh(material: Material) {
        return new THREE.Mesh(this.geometry, material);
    }
    
    addToReductionBuffer(record: ReductionRecord, stepImmediately: boolean = true) {
        this.reductionData.push(record);

        if(stepImmediately) {
            this.stepMesh();
        }
    }

    // Start the reconstruction process
    // Instead of downloading via the Internet (unreliable for coursework)
    // this uses the data from a .json file and has a fixed delay between each step
    // Called at registerable.ts:50 once per Progressive Mesh
    simulateNetworkDataArrival(delayPerStep: number) {
        const takeStep = () => {
            if(!this.reductionData || this.reductionData.length === 0) {
                let toStep = false;

                do {
                    toStep = this.stepMesh();
                } while (toStep);

                return;
            }

            const nextRecord = this.reductionData.pop();

            if(!nextRecord) {
                return;
            }

            this.addToReductionBuffer(nextRecord);
            // this.stepMesh();

            setTimeout(takeStep, delayPerStep);
        }

        takeStep();
    }

    // Create a new vertex
    addNewVertex(name: string, x: number, y: number, z: number) {
        let vertexIndex: number = this.nextVertexIndex;

        if(this.reusableVertexIndices.length === 0) {
            this.nextVertexIndex += 1;
        } else {
            // @ts-ignore
            vertexIndex = this.reusableVertexIndices.pop();
        }

        this.vertexIndexMap[name] = vertexIndex;
        this.geometry.attributes.position.setXYZ(vertexIndex, x, y, z);
    }

    // Process a single record
    stepMesh(): boolean {
        if(this.reductionData.length === 0) {
            return false;
        }

        const record = this.reductionData.pop();

        if(!record) {
            return false;
        }

        const { mName, xName, xCoords, yName, yCoords, polygons } = record;
        // Split this vertex
        const deletionVertexIndex = this.vertexIndexMap[mName];

        // Delete the old vertex
        this.geometry.attributes.position.setXYZ(deletionVertexIndex, 0, 0, 0);
        // Including the next line breaks it?
        // delete this.vertexIndexMap[deletionVertexIndex];
        this.reusableVertexIndices.push(deletionVertexIndex);

        // Add the new vertices
        this.addNewVertex(xName, xCoords[0], xCoords[1], xCoords[2]);
        this.addNewVertex(yName, yCoords[0], yCoords[1], yCoords[2]);

        // Delete all faces related to the midpoint vertex
        let indices = this.geometry.index;

        if(indices === null) {
            return false;
        }
        
        // Delete and free up the neighbouring indices based on its position in the array
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

        //@ts-ignore
        this.geometry.index.needsUpdate = true;
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
        this.geometry.computeVertexNormals();

        // Debug
        Logger.writeLine(`Completed iteration ${record.i}`);
        
        // Are we done?
        return this.reductionData.length !== 0;
    }
}

export { ProgressiveMesh };