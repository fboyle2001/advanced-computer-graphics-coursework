# Mostly derived from lecture slides
# Surface plotting and general numpy changes to original are from https://stackoverflow.com/q/72154002

import numpy as np
import matplotlib.pyplot as plt
from matplotlib import cm
import math

def bernstein_basis_polynomial(n, i):
    return lambda t: math.comb(n, i) * (t ** i) * ((1 - t) ** (n - i))

def generate_bezier_surface(control_points, samples):
    steps = np.linspace(0, 1, samples)

    # Pregenerate the basis polynomials
    m = len(control_points)
    m_basis = []

    for i in range(m):
        m_basis.append(bernstein_basis_polynomial(m - 1, i))

    n = len(control_points[0])
    n_basis = []

    for j in range(n):
        n_basis.append(bernstein_basis_polynomial(n - 1, j))
    
    points = []

    for u in steps:
        fixed_u_points = []

        for v in steps:
            point = [0, 0, 0]

            for i in range(m):
                for j in range(n):
                    control = control_points[i][j]
                    uv_scale = m_basis[i](u) * n_basis[j](v)

                    point[0] += control[0] * uv_scale
                    point[1] += control[1] * uv_scale
                    point[2] += control[2] * uv_scale
            
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
        [[1.8, -0.3, 0.], [1.8, 0.13, 0.1], [1.8, 0.5, 0.]],
        [[2., -0.3, 0.06], [2.1, 0.1, 0.1], [2.1, 0.5, 0.1]],
        [[2.3, -0.3, 0.1], [2.3, 0.13, 0.2], [2.3, 0.5, 0.1]],
        [[2.4, -0.3, 0.1], [2.5, 0.1, 0.15], [2.5, 0.5, 0.1]],
        [[2.6, -0.3, 0.], [2.6, 0.1, 0.1], [2.5, 0.5, 0.]]
    ]
)

surface = generate_bezier_surface(control_points, 40)
plot_surface(surface)