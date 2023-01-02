## This code was used for experimentation - see code/src/utils/parametric_surfaces.ts for the final implementation

import numpy as np
import math
import matplotlib.pyplot as plt
from bspline_basis import bspline_basis
from matplotlib import cm

"""
Closely followed: https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/surface/bspline-construct.html
"""

def get_surface_func(m, n, U, V, p, q, points):
    def S(u, v):
        point = [0, 0, 0]

        for i in range(m):
            for j in range(n):
                x, y, z = points[i][j]
                scale = bspline_basis(i, p, U)(u) * bspline_basis(j, q, V)(v)
                point[0] += x * scale
                point[1] += y * scale
                point[2] += z * scale
        
        return point

    return S

def generate_bspline_surface(m, n, U, V, p, q, control_points, samples):
    steps = np.linspace(0, 1, samples)
    points = []
    S = get_surface_func(m, n, U, V, p, q, control_points)

    for u in steps:
        fixed_u_points = []

        for v in steps:
            point = S(u, v)
            fixed_u_points.append(point)
        
        points.append(fixed_u_points)
    
    return np.array(points)

def plot_surface(surface_points):
    fig = plt.figure()
    ax = fig.add_subplot(projection="3d")
    x, y, z = surface_points.T
    ax.plot_surface(x, y, z, cmap=cm.gray, linewidth=1, antialiased=False) # type: ignore
    plt.show()

if __name__ == "__main__":
    control_points = np.array([
        [[x, 0, z] for z in range(0, 6)] for x in range(0, 6)
    ], np.float64)

    print(control_points.shape)
    print(control_points)

    U = [0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1]
    V = [0, 0, 0, 0, 0.33, 0.66, 1, 1, 1, 1]
    p = 2 # deg u
    q = 3 # deg v

    m = len(control_points)
    n = len(control_points[0])
    samples = 40

    assert len(U) == m + p + 1, f"{len(U)} != {m + p + 2}"
    assert len(V) == n + q + 1, f"{len(V)} != {n + q + 2}"

    print(m, n)
    surface = generate_bspline_surface(m, n, U, V, p, q, control_points, samples)
    plot_surface(surface)