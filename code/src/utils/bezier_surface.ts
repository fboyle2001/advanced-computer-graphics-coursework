import { BufferGeometry, Matrix4, Points, PointsMaterial, Vector3, Vector4 } from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry";
import { binomial } from "./binomial_coeff";

const bernsteinBasisPolynomial = (n: number, i: number): ((t: number) => number) => {
    return (t: number) => binomial(n, i) * (t ** i) * ((1 - t) ** (n - i));
}

class BezierSurface {
    control_points: Vector3[][];
    m: number;
    m_basis: ((t: number) => number)[] = [];
    n: number;
    n_basis: ((t: number) => number)[] = [];

    constructor(control_points: Vector3[][]) {
        this.control_points = control_points;

        this.m = control_points.length;
        this.m_basis = [];

        for(let i = 0; i < this.m; i++) {
            this.m_basis.push(bernsteinBasisPolynomial(this.m - 1, i));
        }

        this.n = control_points[0].length;
        this.n_basis = [];

        for(let j = 0; j < this.n; j++) {
            this.n_basis.push(bernsteinBasisPolynomial(this.n - 1, j));
        }
    }

    calculateSurfacePoint = (u: number, v: number): Vector3 => {
        let point = new Vector3(0, 0, 0);

        for(let i = 0; i < this.m; i++) {
            for(let j = 0; j < this.n; j++) {
                const uv_scale = this.m_basis[i](u) * this.n_basis[j](v);
                point = point.add(this.control_points[i][j].clone().multiplyScalar(uv_scale));
            }
        }

        return point;
    }

    _calculateSurfacePoint = (u: number, v: number, target: Vector3): void => {
        let point = this.calculateSurfacePoint(u, v);
        target.set(point.x, point.y, point.z);
    }

    createGeometry = (samples: number): ParametricGeometry => {
        return new ParametricGeometry(this._calculateSurfacePoint, samples, samples);
    }

    createControlPointGrid = (pointSize: number): Points => {
        const flatPoints = this.control_points.flat();
        const pointsGeom = new BufferGeometry().setFromPoints(flatPoints);
        const pointsMesh = new Points(pointsGeom, new PointsMaterial({ color: 0xAA00AA, size: pointSize }))
        return pointsMesh;
    }
}

const createNURBSGeometry = (weighted_control_points: Vector4[][]) => {
    const bSplineMat = new Matrix4();
    bSplineMat.set(-1, 3, -3, 1, 3, -6, 0, 4, -3, 3, 3, 1, 1, 0, 0, 0);
    bSplineMat.multiplyScalar(1 / 6);

}

export { BezierSurface, createNURBSGeometry };