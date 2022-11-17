import * as THREE from 'three';
import testData from './test.json';

class ProgressiveMeshStreamingModel {
    vertices: Float32Array;
    faces: Uint16Array;

    constructor(initial_vertices: any, initial_faces: any) {
        let tempVertices: number[] = []
        let indices: string[] = []

        for (const vertexData of testData.vertices) {
            const [x, y, z]: number[] = vertexData.coords;
            tempVertices.push(x, y, z);
            indices.push(vertexData.name);
        }

        let tempFaces: number[] = []

        for (const polygon of testData.polygons) {
            const [a, b, c]: string[] = polygon;
            tempFaces.push(indices.indexOf(a), indices.indexOf(b), indices.indexOf(c))
        }

        this.vertices = new Float32Array(tempVertices);
        this.faces = new Uint16Array(tempFaces);
    }

    scratch = (): THREE.Mesh => {
        const geometry = new THREE.BufferGeometry();
        // const vertices = new Float32Array([
        //     0, 0, 0,
        //     0, 0, 1,
        //     0, 1, 1,
        //     0, 1, 0,
        //     1, 1, 0
        // ]);

        // const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

        // geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3))
        // geometry.setIndex(new THREE.BufferAttribute(indices, 1))

        geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.vertices, 3))
        geometry.setIndex(new THREE.BufferAttribute(this.faces, 1))

        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x6d12a9, side: THREE.DoubleSide }));
        return mesh;
    }
    
}

export { ProgressiveMeshStreamingModel };