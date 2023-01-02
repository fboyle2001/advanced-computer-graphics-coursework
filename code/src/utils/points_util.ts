import { BufferGeometry, Mesh, Points, PointsMaterial, Vector3 } from "three";

// Old method was used for testing surfaces when I was initially working on them
// Visualises the position of the points of an arbitrary mesh
const createPointMesh = (objectMesh: Mesh, pointSize: number): Points => {
    const pos = objectMesh.geometry.attributes.position;
    let points = [];

    for(let i = 0; i < pos.count; i++) {
        let point = new Vector3().fromBufferAttribute(pos, i);
        objectMesh.localToWorld(point)
        points.push(point);
    }

    const pointsGeom = new BufferGeometry().setFromPoints(points);
    const pointsMesh = new Points(pointsGeom, new PointsMaterial({ color: 0xFFFFFF, size: pointSize }));
    return pointsMesh;
}

export { createPointMesh };