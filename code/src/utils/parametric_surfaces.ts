import { BufferGeometry, Material, Matrix4, Mesh, Points, PointsMaterial, Scene, Vector3, Vector4 } from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry";
import { binomial } from "./binomial_coeff";

const bernsteinBasis = (n: number, i: number): ((t: number) => number) => {
    return (t: number) => binomial(n, i) * (t ** i) * ((1 - t) ** (n - i));
}

class BezierGeometryMaker {
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
            this.m_basis.push(bernsteinBasis(this.m - 1, i));
        }

        this.n = control_points[0].length;
        this.n_basis = [];

        for(let j = 0; j < this.n; j++) {
            this.n_basis.push(bernsteinBasis(this.n - 1, j));
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

const bSplineBasis = (i: number, p: number, U: number[]): ((u: number) => number) => {
    const basis = (i: number, p: number, u: number): number => {
        if(p == 0) {
            return U[i] <= u && u <= U[i + 1] ? 1 : 0;
        }

        const left = U[i + p] - U[i] != 0 ? ((u - U[i]) / (U[i + p] - U[i])) * bSplineBasis(i, p - 1, U)(u) : 0;
        const right = U[i + p + 1] - U[i + 1] != 0 ? ((U[i + p + 1] - u) / (U[i + p + 1] - U[i + 1])) * bSplineBasis(i + 1, p - 1, U)(u) : 0;
        return left + right;
    }

    return (u: number) => basis(i, p, u);
}

class BSplineGeometryMaker {
    control_points: Vector3[][];
    m: number;
    n: number;
    u_basis: ((u: number) => number)[];
    v_basis: ((v: number) => number)[];

    constructor(control_points: Vector3[][], p: number, q: number, U: number[], V: number[]) {
        this.control_points = control_points;
        this.m = control_points.length;
        this.n = control_points[0].length;
        this.u_basis = [...Array(this.m).keys()].map(i => bSplineBasis(i, p, U));
        this.v_basis = [...Array(this.n).keys()].map(j => bSplineBasis(j, q, V));
    }

    calculateSurfacePoint = (u: number, v: number): Vector3 => {
        let point = new Vector3(0, 0, 0);

        for(let i = 0; i < this.m; i++) {
            for(let j = 0; j < this.n; j++) {
                const uv_scale = this.u_basis[i](u) * this.v_basis[j](v);
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

class NURBSSurface {
    control_points: Vector4[][];
    m: number;
    n: number;
    u_basis: ((u: number) => number)[];
    v_basis: ((v: number) => number)[];
    mesh: Mesh;
    samples: number;

    constructor(control_points: Vector4[][], p: number, q: number, U: number[], V: number[], samples: number, material: Material) {
        /*
         * To speed this up when responding to updates, we can precompute the denominators which are indexed by the (u, v) coordinates
         * We can also precompute the numerator (and sum them at calculation time), they are indexed by (control_point, u, v)
         * The denominators need updating if we change the weight of a control point
         * The numerators need updating when we change a control point by computing, only those indexed by (control_point, _, _) need updating
         * This reduces the number of updates need from control_point*samples**2 to samples**2
         */
        this.control_points = control_points;
        this.m = control_points.length;
        this.n = control_points[0].length;
        this.u_basis = [...Array(this.m).keys()].map(i => bSplineBasis(i, p, U));
        this.v_basis = [...Array(this.n).keys()].map(j => bSplineBasis(j, q, V));
        this.samples = samples;
        this.mesh = new Mesh(this._createGeometry(this.samples), material); 
    }

    calculateSurfacePoint = (u: number, v: number): Vector3 => {
        let point = new Vector3(0, 0, 0);
        let denom = 1e-8;

        for(let i = 0; i < this.m; i++) {
            for(let j = 0; j < this.n; j++) {
                const control = this.control_points[i][j];
                const uv_scale = this.u_basis[i](u) * this.v_basis[j](v) * control.w;
                point = point.add(new Vector3(control.x, control.y, control.z).multiplyScalar(uv_scale));
                denom += uv_scale;
            }
        }

        return point.divideScalar(denom);
    }

    _calculateSurfacePoint = (u: number, v: number, target: Vector3): void => {
        let point = this.calculateSurfacePoint(u, v);
        target.set(point.x, point.y, point.z);
    }

    _createGeometry = (samples: number): ParametricGeometry => {
        return new ParametricGeometry(this._calculateSurfacePoint, samples, samples);
    }

    createControlPointGrid = (pointSize: number): Points => {
        const flatPoints = this.control_points.flat().map(vec => new Vector3(vec.x, vec.y, vec.z));
        const pointsGeom = new BufferGeometry().setFromPoints(flatPoints);
        const pointsMesh = new Points(pointsGeom, new PointsMaterial({ color: 0xAA00AA, size: pointSize }))
        return pointsMesh;
    }

    updateSampleCount = (samples: number): void => {
        this.samples = samples;
        // Need to make a fresh geometry when we update the sample resolution
        // Automatically updates the generated mesh
        this.mesh.geometry = this._createGeometry(this.samples);
    }

    updateControlPoint = (row: number, column: number, updated_point: Vector4, incremental: boolean = false): void => {
        // Update the mesh.geometry.position from this
        if(!incremental) {
            this.control_points[row][column] = updated_point;
            this.mesh.geometry = this._createGeometry(this.samples);
            return;
        }
    }
}

export { BezierGeometryMaker, BSplineGeometryMaker, NURBSSurface };