from vector import Vector3

import numpy as np
import math
import matplotlib.pyplot as plt

us = np.linspace(0, 1, 40)
vs = np.linspace(0, 1, 40)

def bernstein_basis_polynomial(n, i):
    return lambda t: math.comb(n, i) * (t ** i) * ((1 - t) ** (n - i))

# control_points = [
#     [
#         Vector3(0, 0, 0),
#         Vector3(0, 4, 0),
#         Vector3(0, 8, -3)
#     ],
#     [
#         Vector3(2, 0, 6),
#         Vector3(2, 4, 0),
#         Vector3(2, 8, 0)
#     ],
#     [
#         Vector3(4, 0, 0),
#         Vector3(4, 4, 0),
#         Vector3(4, 8, 0)
#     ],
#     [
#         Vector3(6, 0, 0),
#         Vector3(6, 4, -3),
#         Vector3(6, 8, 0)
#     ],
# ]

# control_points = [
#     [
#         Vector3(0, 0, 0),
#         Vector3(2, 0, 6),
#         Vector3(4, 0, 0),
#         Vector3(6, 0, 0)
#     ],
#     [
#         Vector3(0, 4, 0),
#         Vector3(2, 4, 0),
#         Vector3(4, 4, 0),
#         Vector3(6, 4, -3)
#     ],
#     [
#         Vector3(0, 8, -3),
#         Vector3(2, 8, 0),
#         Vector3(4, 8, 0),
#         Vector3(6, 8, 0)
#     ]
# ]

control_points = [
    [Vector3(1.8, -0.3, 0.), Vector3(1.8, 0.13, 0.1), Vector3(1.8, 0.5, 0.)],
    [Vector3(2., -0.3, 0.06), Vector3(2.1, 0.1, 0.1), Vector3(2.1, 0.5, 0.1)],
    [Vector3(2.3, -0.3, 0.1), Vector3(2.3, 0.13, 0.2), Vector3(2.3, 0.5, 0.1)],
    [Vector3(2.4, -0.3, 0.1), Vector3(2.5, 0.1, 0.15), Vector3(2.5, 0.5, 0.1)],
    [Vector3(2.6, -0.3, 0.), Vector3(2.6, 0.1, 0.1), Vector3(2.5, 0.5, 0.)]
]

m = len(control_points)
m_basis = []
print("u deg", m - 1)

for i in range(m):
    m_basis.append(bernstein_basis_polynomial(m, i))

n = len(control_points[0])
print("v deg", n - 1)
n_basis = []

for j in range(n):
    n_basis.append(bernstein_basis_polynomial(n, j))

def p(u, v):
    point = Vector3(0, 0, 0)

    for i in range(m):
        for j in range(n):
            c = control_points[i][j]
            point += c.scale(m_basis[i](u) * n_basis[j](v))
    
    return point

xs = []
ys = []
zs = []

for u in us:
    for v in vs:
        uvd = p(u, v)

        xs.append(uvd.x)
        ys.append(uvd.y)
        zs.append(uvd.z)

fig = plt.figure()
ax = fig.add_subplot(projection="3d")
ax.scatter(xs, ys, zs)

bxs = []
bys = []
bzs = []

for cp in control_points:
    for b in cp:
        bxs.append(b.x)
        bys.append(b.y)
        bzs.append(b.z)

ax.scatter(bxs, bys, bzs, color="red")
plt.show()