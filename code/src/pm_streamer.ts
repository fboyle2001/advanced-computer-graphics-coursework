import * as THREE from 'three';
import { BufferGeometry } from 'three';
import testData from './test_all.json';

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
    indexMap: {[key: string]: number};
    nextIndex: number;
    nextFaceIndex: number;
    halted: boolean;

    constructor(initial_vertices: any, initial_faces: any, m: any) {
        this.halted = false;
        this.vertexLimit = testData.maximums.vertices + 500000;
        this.polygonLimit = testData.maximums.polygons + 500000;
        this.reductionData = testData.reduction;

        const vertices = new Float32Array(this.vertexLimit * 3);
        const faces = new Uint16Array(this.polygonLimit * 3);

        const geometry = new BufferGeometry(); 
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3))
        geometry.setIndex(new THREE.BufferAttribute(faces, 1))

        

        const material = new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide });
        material.wireframe = false;
        this.mesh = new THREE.Mesh(geometry, m);

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

        this.nextIndex = vertexIndex;

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

    stepMesh() {
        if(this.halted) {
            return;
        }

        if(this.reductionData.length === 0) {
            return;
        }

        const record = this.reductionData.pop();

        if(!record) {
            return;
        }

        console.log(`It: ${record.i}`)

        const { mName, xName, xCoords, yName, yCoords, polygons } = record;
        const deletionVertexIndex = this.indexMap[mName];

        // Add the new vertices
        this.indexMap[xName] = this.nextIndex++;
        const xIndex = this.indexMap[xName];
        this.mesh.geometry.attributes.position.setXYZ(xIndex, xCoords[0], xCoords[1], xCoords[2]);

        this.indexMap[yName] = this.nextIndex++;
        const yIndex = this.indexMap[yName];
        this.mesh.geometry.attributes.position.setXYZ(yIndex, yCoords[0], yCoords[1], yCoords[2]);

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
                } else if (i % 3 === 1) {
                    indices.setX(i - 1, 0)
                    indices.setX(i, 0)
                    indices.setX(i + 1, 0)
                } else if (i % 3 === 2) {
                    indices.setX(i - 2, 0)
                    indices.setX(i - 1, 0)
                    indices.setX(i, 0)
                }
            }
        }

        // Add the new faces
        for(const polygon of polygons) {
            const realisedPolygon = polygon.map(x => this.indexMap[x]);
            const faceIndex = this.nextFaceIndex;

            indices.setX(faceIndex, realisedPolygon[0]);
            indices.setX(faceIndex + 1, realisedPolygon[1]);
            indices.setX(faceIndex + 2, realisedPolygon[2]);

            this.nextFaceIndex += 3;
        }

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