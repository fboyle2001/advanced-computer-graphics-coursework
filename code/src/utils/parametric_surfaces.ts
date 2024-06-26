import { BufferGeometry, Material, Mesh, PerspectiveCamera, Points, PointsMaterial, Vector2, Vector3, Vector4 } from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry";
import { binomial } from "./binomial_coeff";
import { Registerable } from "./registerable";

/*
 * Defines Bezier Surface, B-Spline Surfaces and NURBS Surfaces
 * References:
 * Lecture 5 - Parametric Surfaces
 * https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/spline/B-spline/bspline-basis.html 
 * https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/surface/bspline-construct.html 
 * https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/spline/NURBS/NURBS-def.html
 */

// The basis of Bezier curves, see https://en.wikipedia.org/wiki/Bernstein_polynomial
const bernsteinBasis = (n: number, i: number): ((t: number) => number) => {
    return (t: number) => binomial(n, i) * (t ** i) * ((1 - t) ** (n - i));
}

// Parent class so that we can update them easily via the Visual Quality Settings 
// Maintain the mesh directly for the same reason
abstract class ParametricSurface extends Registerable {
    abstract samples: number;
    abstract mesh: Mesh;
    abstract control_point_grid: Points;

    abstract calculateSurfacePoint(u: number, v: number): Vector3;
    abstract updateSampleCount(samples: number): void;
    abstract _createGeometry(samples: number): ParametricGeometry;
    // Useful to visualise the control point positions
    abstract _generateControlPointGrid(): void;

    getComponents = () => {
        return {
            fixedSurfaces: [this]
        }
    }
}

// Defines a Bezier Surface given arbitrary control points 
class BezierSurface extends ParametricSurface {
    control_points: Vector3[][];
    m: number;
    m_basis: ((t: number) => number)[] = [];
    n: number;
    n_basis: ((t: number) => number)[] = [];
    samples: number;
    mesh: Mesh;
    control_point_grid!: Points;
    control_point_size: number;

    constructor(control_points: Vector3[][], samples: number, material: Material, control_point_size?: number) {
        super();

        this.control_points = control_points;
        this.samples = samples;

        this.m = control_points.length;
        this.m_basis = [];

        // Precompute the basis functions
        for(let i = 0; i < this.m; i++) {
            this.m_basis.push(bernsteinBasis(this.m - 1, i));
        }

        this.n = control_points[0].length;
        this.n_basis = [];

        // Precompute the basis functions
        for(let j = 0; j < this.n; j++) {
            this.n_basis.push(bernsteinBasis(this.n - 1, j));
        }

        this.mesh = new Mesh(this._createGeometry(this.samples), material);
        this.control_point_size = control_point_size ?? 0.2;
        this._generateControlPointGrid();
    }

    calculateSurfacePoint = (u: number, v: number): Vector3 => {
        let point = new Vector3(0, 0, 0);

        // Compute the point at given (u, v) coords 
        // Needed for the Three.js Parametric Geometry
        for(let i = 0; i < this.m; i++) {
            for(let j = 0; j < this.n; j++) {
                const uv_scale = this.m_basis[i](u) * this.n_basis[j](v);
                point = point.add(this.control_points[i][j].clone().multiplyScalar(uv_scale));
            }
        }

        return point;
    }

    updateSampleCount = (samples: number): void => {
        this.samples = samples;
        // Need to make a fresh geometry when we update the sample resolution
        // Automatically updates the generated mesh
        this.mesh.geometry.dispose();
        this.mesh.geometry = this._createGeometry(this.samples);
    }

    _calculateSurfacePoint = (u: number, v: number, target: Vector3): void => {
        let point = this.calculateSurfacePoint(u, v);
        target.set(point.x, point.y, point.z);
    }

    _createGeometry = (samples: number): ParametricGeometry => {
        return new ParametricGeometry(this._calculateSurfacePoint, samples, samples);
    }

    _generateControlPointGrid = () => {
        const flatPoints = this.control_points.flat();
        const pointsGeom = new BufferGeometry().setFromPoints(flatPoints);
        
        if(this.control_point_grid) {
            this.control_point_grid.geometry.dispose();
            this.control_point_grid.geometry = pointsGeom;
        } else{
            const pointsMesh = new Points(pointsGeom, new PointsMaterial({ color: 0xAA00AA, size: this.control_point_size }));
            this.control_point_grid = pointsMesh;
        }
    }
}

// Recursive defintion of the B-Spline Basis Functions
// See https://en.wikipedia.org/wiki/B-spline#Definition
// See https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/spline/B-spline/bspline-basis.html
const bSplineBasis = (i: number, p: number, U: number[]): ((u: number) => number) => {
    const basis = (i: number, p: number, u: number): number => {
        // Base case
        if(p == 0) {
            return U[i] <= u && u <= U[i + 1] ? 1 : 0;
        }

        // If denominator is 0 then set the value to 0
        const left = U[i + p] - U[i] != 0 ? ((u - U[i]) / (U[i + p] - U[i])) * bSplineBasis(i, p - 1, U)(u) : 0;
        const right = U[i + p + 1] - U[i + 1] != 0 ? ((U[i + p + 1] - u) / (U[i + p + 1] - U[i + 1])) * bSplineBasis(i + 1, p - 1, U)(u) : 0;
        return left + right;
    }

    return (u: number) => basis(i, p, u);
}

// Defines a B-Spline Surface given arbitrary control points
class BSplineSurface extends ParametricSurface {
    control_points: Vector3[][];
    m: number;
    n: number;
    u_basis: ((u: number) => number)[];
    v_basis: ((v: number) => number)[];
    samples: number;
    mesh: Mesh;
    control_point_grid!: Points;
    control_point_size: number;

    constructor(control_points: Vector3[][], p: number, q: number, U: number[], V: number[], samples: number, material: Material, control_point_size?: number) {
        super();

        this.control_points = control_points;
        this.m = control_points.length;
        this.n = control_points[0].length;
        // Precompute the basis functions
        this.u_basis = [...Array(this.m).keys()].map(i => bSplineBasis(i, p, U));
        this.v_basis = [...Array(this.n).keys()].map(j => bSplineBasis(j, q, V));
        this.samples = samples;
        this.mesh = new Mesh(this._createGeometry(this.samples), material);
        this.control_point_size = control_point_size ?? 0.2;
        this._generateControlPointGrid();
    }

    updateSampleCount(samples: number): void {
        this.samples = samples;
        // Need to make a fresh geometry when we update the sample resolution
        // Automatically updates the generated mesh
        this.mesh.geometry.dispose();
        this.mesh.geometry = this._createGeometry(this.samples);
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

    // Specification for the ParametricGeometry class provided by Three.js
    _calculateSurfacePoint = (u: number, v: number, target: Vector3): void => {
        let point = this.calculateSurfacePoint(u, v);
        target.set(point.x, point.y, point.z);
    }

    _createGeometry = (samples: number): ParametricGeometry => {
        return new ParametricGeometry(this._calculateSurfacePoint, samples, samples);
    }

    _generateControlPointGrid = () => {
        const flatPoints = this.control_points.flat();
        const pointsGeom = new BufferGeometry().setFromPoints(flatPoints);

        if(this.control_point_grid) {
            this.control_point_grid.geometry.dispose();
            this.control_point_grid.geometry = pointsGeom;
        } else{
            const pointsMesh = new Points(pointsGeom, new PointsMaterial({ color: 0xAA00AA, size: this.control_point_size }));
            this.control_point_grid = pointsMesh;
        }
    }
}

// Used for storing computations for incremental updating
interface NURBSIntermediateComputation {
    uv_scales: number[][], // per control point
    denom: number // overall
}

// Defines a Non-Uniform Rational B-Spline Surface
class NURBSSurface extends ParametricSurface {
    control_points: Vector4[][];
    m: number;
    n: number;
    u_basis: ((u: number) => number)[];
    v_basis: ((v: number) => number)[];
    mesh: Mesh;
    samples: number;
    control_point_size: number;
    stored_computation!: NURBSIntermediateComputation[][];
    control_point_grid!: Points;

    constructor(control_points: Vector4[][], p: number, q: number, U: number[], V: number[], samples: number, material: Material, control_point_size?: number) {
        super();

        this.control_points = control_points;
        this.m = control_points.length;
        this.n = control_points[0].length;
        // Precompute the basis functions
        this.u_basis = [...Array(this.m).keys()].map(i => bSplineBasis(i, p, U));
        this.v_basis = [...Array(this.n).keys()].map(j => bSplineBasis(j, q, V));
        this.samples = samples;
        // Reset each time the number of samples changes
        this._resetStored();
        this.mesh = new Mesh(this._createGeometry(this.samples), material);
        this.control_point_size = control_point_size ?? 0.2;
        this._generateControlPointGrid();
    }

    _generateControlPointGrid = () => {
        const flatPoints = this.control_points.flat().map(vec => new Vector3(vec.x, vec.y, vec.z));
        const pointsGeom = new BufferGeometry().setFromPoints(flatPoints);

        if(this.control_point_grid) {
            this.control_point_grid.geometry.dispose();
            this.control_point_grid.geometry = pointsGeom;
        } else{
            const pointsMesh = new Points(pointsGeom, new PointsMaterial({ color: 0xAA00AA, size: this.control_point_size }));
            this.control_point_grid = pointsMesh;
        }
    }

    _resetStored = () => {
        this.stored_computation = [...Array(this.samples + 1)].map(() => Array(this.samples + 1));
    }

    calculateSurfacePoint = (u: number, v: number): Vector3 => {
        let point = new Vector3(0, 0, 0);
        let denom = 1e-8;
        let uv_scales: number[][] = [];

        const u_idx = Math.round(u * this.samples);
        const v_idx = Math.round(v * this.samples);

        for(let i = 0; i < this.m; i++) {
            let i_uv_scales = [];

            for(let j = 0; j < this.n; j++) {
                const control = this.control_points[i][j];
                const uv_scale = this.u_basis[i](u) * this.v_basis[j](v) * control.w;
                point.add(new Vector3(control.x, control.y, control.z).multiplyScalar(uv_scale));
                i_uv_scales.push(uv_scale);
                denom += uv_scale;
            }

            uv_scales.push(i_uv_scales);
        }

        // Save the contribution at the (u, v) coordinates
        this.stored_computation[u_idx][v_idx] = { uv_scales, denom };
        return point.divideScalar(denom);
    }

    _calculateSurfacePoint = (u: number, v: number, target: Vector3): void => {
        let point = this.calculateSurfacePoint(u, v);
        target.set(point.x, point.y, point.z);
    }

    _createGeometry = (samples: number): ParametricGeometry => {
        return new ParametricGeometry(this._calculateSurfacePoint, samples, samples);
    }

    updateSampleCount = (samples: number): void => {
        this.samples = samples;
        // Need to make a fresh geometry when we update the sample resolution
        // Automatically updates the generated mesh
        this._resetStored();
        this.mesh.geometry.dispose();
        this.mesh.geometry = this._createGeometry(this.samples);
    }

    updateControlPoint = (row: number, column: number, updated_point: Vector3, incremental: boolean = true): void => {
        // Incremental update is O((samples + 1) ** 2) ~= O(s^2)
        // Non-incremental update is O(m * n * (samples + 1) ** 2) ~= O(mns^2) > O(s^2)
        // Incremental may use less space because we aren't maintaining two geometries but updating one

        // Do not allow changes to the control point weights otherwise we need to recompute a new geometry every time
        // Easy to implement this in the future if I want it
        const existing_point = this.control_points[row][column].clone();
        const weighted_point = new Vector4(updated_point.x, updated_point.y, updated_point.z, existing_point.w);

        // If not doing an incremental update, replace the geometry instead
        if(!incremental) {
            this.control_points[row][column] = weighted_point;
            this._generateControlPointGrid();
            this.mesh.geometry.dispose();
            this.mesh.geometry = this._createGeometry(this.samples);
            return;
        }

        // More efficient than cloning the vector each time
        const xDiff = updated_point.x - existing_point.x;
        const yDiff = updated_point.y - existing_point.y;
        const zDiff = updated_point.z - existing_point.z;

        for(let v_idx = 0; v_idx <= this.samples; v_idx++) {
            for(let u_idx = 0; u_idx <= this.samples; u_idx++) {
                const posIdx = v_idx * (this.samples + 1) + u_idx
                const { uv_scales, denom } = this.stored_computation[u_idx][v_idx];
                const uv_scale = uv_scales[row][column];
                
                // Update the geometry position buffer directly for speed
                this.mesh.geometry.attributes.position.setXYZ(
                    posIdx,
                    this.mesh.geometry.attributes.position.getX(posIdx) + xDiff * uv_scale / denom,
                    this.mesh.geometry.attributes.position.getY(posIdx) + yDiff * uv_scale / denom,
                    this.mesh.geometry.attributes.position.getZ(posIdx) + zDiff * uv_scale / denom 
                )
            }
        }

        // Tell the renderer the geometry has changed
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.control_points[row][column] = weighted_point;
        // Recompute the control point grid
        this._generateControlPointGrid();
    }
}

// Makes updating the quality of the surfaces easy!
class LODParametricBinder {
    boundSurfaces: ParametricSurface[];
    levels!: {[distance: number]: number};
    numericLevelKeys!: number[];

    constructor(levels: {[distance: number]: number}) {
        this.boundSurfaces = [];
        this.setLevels(levels);
    }

    // Update the levels
    setLevels(levels: {[distance: number]: number}) {
        this.levels = levels;
        this.numericLevelKeys = Object.keys(this.levels).map(level => Number(level)).sort((a, b) => a - b);
    }

    // Register a surface so it can be updated automatically
    bindSurface(surface: ParametricSurface) {
        this.boundSurfaces.push(surface);
    }

    // Run every frame, computes level of detail and if it should change
    updateAll(camera: PerspectiveCamera) {
        const cameraPosition = new Vector3().setFromMatrixPosition(camera.matrixWorld);

        this.boundSurfaces.forEach(surface => {
            const surfacePosition = new Vector3().setFromMatrixPosition(surface.mesh.matrixWorld);
            const distanceToCamera = cameraPosition.distanceTo(surfacePosition) / camera.zoom;
            let levelIdx = 0;

            while(this.numericLevelKeys[levelIdx] < distanceToCamera && levelIdx != this.numericLevelKeys.length - 1) {
                levelIdx++;
            }

            const level = this.numericLevelKeys[levelIdx];
            const samples = this.levels[level];

            // console.log({levels: this.numericLevelKeys, level, distanceToCamera, samples})

            if(surface.samples !== samples) {
                surface.updateSampleCount(samples);
            }
        });
    }
}

// Defines a cubic Bezier curve from 4 control points, used for parametric curves rather than surfaces
// e.g. with skeletal animations to define bone paths
const createCubicBezierCurve = (p_0: Vector2, p_1: Vector2, p_2: Vector2, p_3: Vector2): ((t: number) => number) => {
    const a = p_0.y;
    const b = p_1.y;
    const c = p_2.y;
    const d = p_3.y;

    const tMax = Math.min(p_0.x, p_1.x, p_2.x, p_3.x)

    return (t: number): number => {
        return a * (1 - t) ** 3 + b * (3 * t * (1 - t) ** 2) + c * (3 * (1 - t) * t ** 2) + d * t ** 3;
    }
}

export { ParametricSurface, BezierSurface, BSplineSurface, NURBSSurface, LODParametricBinder, createCubicBezierCurve };