from vector import Vector2

import matplotlib.pyplot as plt
import numpy as np

def create_cubic_bspline_curve(p_0: Vector2, p_1: Vector2, p_2: Vector2, p_3: Vector2):
    return lambda t: p_0.scale(((1 - t) ** 3) / 6) + p_1.scale((3 * t ** 3 - 6 * t ** 2 + 4) / 6) + p_2.scale((-3 * t ** 3 + 3 * t ** 2 + 3 * t + 1) / 6) + p_3.scale((t ** 3) / 6)

def plot_curve(control_points, points=50):
    for i in range(len(control_points) - 3):
        cps = control_points[i:i+4]
        B = create_cubic_bspline_curve(*cps)
        assert B is not None
        ts = np.linspace(0, 1, points)

        xs = []
        ys = []

        for t in ts:
            point = B(t)
            xs.append(point.x)
            ys.append(point.y)

        plt.scatter(xs, ys, color="blue")

        bxs = []
        bys = []

        last = None

        for b in control_points:
            if last is not None:
                plt.plot([last[0], b.x], [last[1], b.y], color="gray")

            last = (b.x, b.y)
            bxs.append(b.x)
            bys.append(b.y)

        plt.scatter(bxs, bys, color="red")
    plt.gca().set_aspect('equal', adjustable='box')
    plt.show()

plot_curve([Vector2(0, 0), Vector2(0.3, 1.1), Vector2(0.7, 0.6), Vector2(1, 0)])#, Vector2(4, 2), Vector2(3, 4), Vector2(5, 3)])