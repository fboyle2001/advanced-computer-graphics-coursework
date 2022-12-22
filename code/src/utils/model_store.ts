import { BufferGeometry, Group, Material, Mesh, Triangle, Vector3 } from "three";
import { BezierSurface } from "./parametric_surfaces";

const createBikeShed = (samples: number, roofMaterial: Material, sideMaterial: Material, floorMaterial: Material): Group => {
    const group = new Group();

    const curvedRoof = new Mesh(
        new BezierSurface([
            [new Vector3(0, 0, 0), new Vector3(0, 4, 0), new Vector3(4, 4, 0)],
            [new Vector3(0, 0, 8), new Vector3(0, 4, 8), new Vector3(4, 4, 8)]
        ]).createGeometry(samples), 
        roofMaterial
    );
    group.add(curvedRoof);

    const side = new Group();

    const curvedSection = new Mesh(
        new BezierSurface([
            [new Vector3(0, 0, 0), new Vector3(0, 4, 0), new Vector3(4, 4, 0)],
            [new Vector3(4, 4, 0), new Vector3(0, 4, 0), new Vector3(0, 0, 0)]
        ]).createGeometry(samples),
        sideMaterial
    );

    const triangleFill = new Mesh(
        new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(4, 4, 0), new Vector3(4, 0, 0)]), 
        sideMaterial
    );

    side.add(curvedSection);
    side.add(triangleFill);
    group.add(side);
    
    const otherSide = side.clone();
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

    return group;
}

export { createBikeShed };