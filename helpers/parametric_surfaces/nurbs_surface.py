import numpy as np
import matplotlib.pyplot as plt
from matplotlib import cm
import math
from bspline_basis import bspline_basis

"""
Closely followed: 
a) https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/spline/B-spline/bspline-basis.html
b) https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/spline/NURBS/NURBS-def.html
c) Lecture Slides

B-Spline Basis
1) Domain is subdivided by knots
2) Basis functions are not non-zero on the entire interval (quite "local")
Surface plotting and general numpy changes to original are from: https://stackoverflow.com/q/72154002
"""

def generate_nurbs_surface_func(points, U, V, u_deg, v_deg):
    m = len(points)
    n = len(points[0])

    def S(u, v):
        numer = [0, 0, 0]
        denom = 1e-8

        for i in range(m):
            for j in range(n):
                x, y, z, w = points[i][j]
                basis = bspline_basis(i, u_deg, U)(u) * bspline_basis(j, v_deg, V)(v)

                numer[0] += w * x * basis
                numer[1] += w * y * basis
                numer[2] += w * z * basis
                denom += w * basis
        
        return [numer[0] / denom, numer[1] / denom, numer[2] / denom]

    return S

def generate_nurbs_surface(points, U, V, u_deg, v_deg, samples):
    S = generate_nurbs_surface_func(points, U, V, u_deg, v_deg)
    steps = np.linspace(0, 1, samples)

    points = []

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

control_points = np.array(
    [
        [[-2, -2, 1, 1], [-2, -1, -2, 1], [-2, 1, 2.5, 1], [-2, 2, -1, 1]],
        [[0, -2, 0, 1], [0, -1, -1, 5], [0, 1, 1.5, 5], [0, 2, 0, 1]],
        [[2, -2, -1, 1], [2, -1, 2, 1], [2, 1, -2.5, 1], [2, 2, 1, 1]]
    ], float
)

u_deg = 2
v_deg = 3
U = [0, 0, 0, 1, 1, 1]
V = [0, 0, 0, 0, 1, 1, 1, 1]
samples = 100

surface = generate_nurbs_surface(control_points, U, V, u_deg, v_deg, samples)
plot_surface(surface)