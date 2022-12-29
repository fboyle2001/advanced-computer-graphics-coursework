from typing import List

import matplotlib.pyplot as plt
import numpy as np
from vector import Vector2

def create_linear_bezier_curve(p_0: Vector2, p_1: Vector2):
    return lambda t: p_0 + (p_1 - p_0).scale(t)

def create_quadratic_bezier_curve(p_0: Vector2, p_1: Vector2, p_2: Vector2):
    return lambda t: p_0.scale((1 - t) ** 2) + p_1.scale(2 * t * (1 - t)) + p_2.scale(t ** 2)

def create_cubic_bezier_curve(p_0: Vector2, p_1: Vector2, p_2: Vector2, p_3: Vector2):
    return lambda t: p_0.scale((1 - t) ** 3) + p_1.scale(3 * t * (1 - t) ** 2) + p_2.scale(3 * (1 - t) * t ** 2) + p_3.scale(t ** 3)

def create_bezier_curve(ps: List[Vector2]):
    match len(ps):
        case 2:
            return create_linear_bezier_curve(*ps)
        case 3:
            return create_quadratic_bezier_curve(*ps)
        case 4:
            return create_cubic_bezier_curve(*ps)
        case _:
            assert 1==0, "Invalid number of points"

def plot_curve(control_points, points=50, show=True, color="blue"):
    B = create_bezier_curve(control_points)
    assert B is not None
    ts = np.linspace(0, 1, points)

    xs = []
    ys = []

    for t in ts:
        point = B(t)
        xs.append(point.x)
        ys.append(point.y)

    plt.scatter(xs, ys, color=color)

    bxs = []
    bys = []

    for b in control_points:
        bxs.append(b.x)
        bys.append(b.y)

    plt.scatter(bxs, bys, color="red")
    plt.gca().set_aspect('equal', adjustable='box')
    if show:
        plt.show()

plot_curve([Vector2(0, 0), Vector2(0.3, 0.2), Vector2(0.7, 1.2), Vector2(1, 0.7)], show=False)
plot_curve([Vector2(1, 0.7), Vector2(1.3, 0.2), Vector2(1.7, -0.1), Vector2(2, 0)], color="green")