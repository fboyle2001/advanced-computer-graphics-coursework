import numpy as np
import math
import matplotlib.pyplot as plt

"""
Closely followed: https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/spline/B-spline/bspline-basis.html
More complex than Bezier:
1) Domain is subdivided by knots
2) Basis functions are not non-zero on the entire interval (quite "local")
"""

def bspline_basis(i, p, U):
    eps = 1e-8

    def basis(i, p, u):
        if p == 0:
            if U[i] <= u < U[i + 1]:
                return 1
            
            return 0

        left = ((u - U[i]) / (U[i + p] - U[i])) * bspline_basis(i, p - 1, U)(u) if U[i + p] - U[i] != 0 else 0
        right = ((U[i + p + 1] - u) / (U[i + p + 1] - U[i + 1])) * bspline_basis(i + 1, p - 1, U)(u) if U[i + p + 1] - U[i + 1] != 0 else 0

        return left + right
    
    return lambda u: basis(i, p, u)

def validate_knot_vector(m, U, u_0=0, u_m=1):
    if len(U) != m + 1:
        return False
    
    last = None

    for u in U:
        if u < u_0 or u > u_m:
            return False

        if last is not None:
            if u < last:
                return False
        
        last = U
    
    return True

if __name__ == "__main__":
    u_0 = 0
    u_m = 3
    m = 3
    # Knot vector
    U = [0, 1, 2, 3]

    us = np.linspace(u_0, u_m, 20)

    ys1 = []
    ys2 = []
    ys3 = []

    N_0_1 = bspline_basis(0, 1, U)
    N_1_1 = bspline_basis(1, 1, U)
    N_0_2 = bspline_basis(0, 2, U)

    for u in us:
        ys1.append(N_0_1(u))
        ys2.append(N_1_1(u))
        ys3.append(N_0_2(u))

    plt.scatter(us, ys1, color="blue")
    plt.scatter(us, ys2, color="red")
    plt.scatter(us, ys3, color="green")
    plt.gca().set_aspect('equal', adjustable='box')
    plt.show()


