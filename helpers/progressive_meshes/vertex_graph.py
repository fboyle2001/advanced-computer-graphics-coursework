import matplotlib.pyplot as plt
import numpy as np

class VertexGraph:
    def __init__(self):
        self.indices = []
        self.index_data = {}
        self.edges = {}
        self.m_count = 0

    def add_node(self, index, data):
        assert index not in self.indices
        assert len(data) == 3

        self.indices.append(index)
        self.index_data[index] = data
        self.edges[index] = set()

    def add_edge(self, index_one, index_two):
        assert index_one in self.indices
        assert index_two in self.indices
        assert index_one != index_two

        self.edges[index_one].add(index_two)
        self.edges[index_two].add(index_one)
    
    def get_neighbours(self, index):
        assert index in self.indices
        return self.edges[index]

    def remove_node(self, index):
        assert index in self.indices
        
        for neighbour in self.edges[index]:
            # i.e. midpoint
            if index not in self.get_neighbours(neighbour):
                continue

            self.edges[neighbour].remove(index)
        
        del self.edges[index]
        self.indices.remove(index)
        del self.index_data[index]

    def collapse_edge(self, left, right):
        assert left in self.indices
        assert right in self.indices

        assert right in self.get_neighbours(left), "Nodes must be connected by an edge"

        left_x, left_y, left_z = self.index_data[left]
        right_x, right_y, right_z = self.index_data[right]

        midpoint_coords = ((left_x + right_x) / 2, (left_y + right_y) / 2, (left_z + right_z) / 2)
        self.m_count += 1
        midpoint_name = f"m{self.m_count}"

        self.add_node(midpoint_name, midpoint_coords)

        for neighbour in self.get_neighbours(left):
            self.add_edge(midpoint_name, neighbour)

        for neighbour in self.get_neighbours(right):
            if neighbour == midpoint_name:
                continue
            
            self.add_edge(midpoint_name, neighbour)

        self.remove_node(left)
        self.remove_node(right)

        return midpoint_name

    def compute_polygons(self, origin):
        polygons = set()
        neighbours = self.get_neighbours(origin)

        # Go to each neighbour, check if any of their neighbours are also neighbours of the origin
        for neighbour in neighbours:
            shared_neighbours = self.get_neighbours(neighbour) & neighbours - {neighbour}

            for shared in shared_neighbours:
                left = str(shared) if str(shared) < str(neighbour) else str(neighbour)
                right = str(shared) if str(shared) > str(neighbour) else str(neighbour)

                polygon = (str(origin), left, right)
                polygons.add(polygon)

        return polygons

    def compute_all_polygons(self):
        polygons = set()

        for index in self.indices:
            polygons |= self.compute_polygons(index)

        return polygons

    def compute_vertex_quadric_matrix(self, index):
        assert index in self.indices

        epsilon = 1e-7
        polygons = self.compute_polygons(index)
        a_coords = np.array(self.index_data[index])
        Q_matrix = np.zeros((4, 4))

        for _, b, c in polygons:
            b_coords = np.array(self.index_data[b])
            c_coords = np.array(self.index_data[c])

            ab = b_coords - a_coords
            ac = c_coords - a_coords

            cross = np.cross(ab, ac)
            cross_norm = np.linalg.norm(cross)

            # Avoid a div by 0
            normal_vec = cross / (cross_norm + epsilon)
            d = -np.dot(normal_vec, a_coords)
            # a, b, c = normal_vec
            plane_vec = np.asmatrix(np.append(normal_vec, d)).T

            K_p = plane_vec @ plane_vec.T
            Q_matrix += K_p

            # K_p = np.array([
            #     [a ** 2, a * b, a * c, a * d],
            #     [a * b, b ** 2, b * c, b * d],
            #     [a * c, b * c, c ** 2, c * d],
            #     [a * d, b * d, c * d, d ** 2]
            # ])

        return Q_matrix

    def determine_preferred_collapsible_edge(self):
        edge_pairs = set()

        for start in self.edges.keys():
            x, y, z = self.index_data[start]

            for neighbour in self.get_neighbours(start):
                left = str(start) if str(start) < str(neighbour) else str(neighbour)
                right = str(start) if str(start) > str(neighbour) else str(neighbour)

                edge_pairs.add((left, right))

        # Get all quadric matrices
        quadrics = {vertex: self.compute_vertex_quadric_matrix(vertex) for vertex in self.indices}
        edge_errors = {}

        smallest_error = None
        smallest_error_pair = None

        inversion_enabled = False

        for a, b in edge_pairs:
            combined_quadric = quadrics[a] + quadrics[b]
            partial_derivatives = np.array([
                combined_quadric[0],
                combined_quadric[1],
                combined_quadric[2],
                [0.0, 0.0, 0.0, 1.0]
            ])

            # Just use the midpoint initially to test it works
            is_invertible = np.abs(np.linalg.det(partial_derivatives)) > 1e-7 and inversion_enabled
            v_bar = (np.array(self.index_data[a]) + np.array(self.index_data[b])) / 2
            v_bar = np.asmatrix(np.append(v_bar, 1)).T

            if is_invertible:
                v_bar = np.linalg.inv(partial_derivatives) @ np.asmatrix(np.array([0.0, 0.0, 0.0, 1.0])).T

            quadric_error = v_bar.T @ combined_quadric @ v_bar
            edge_errors[(a, b)] = quadric_error.item()

            if smallest_error is None or quadric_error.item() < smallest_error:
                smallest_error = quadric_error.item()
                smallest_error_pair = (a, b)
        
        assert smallest_error_pair is not None
        return smallest_error_pair

    def find_index_by_coords(self, coords):
        assert coords in self.index_data.values()
        return list(self.index_data.keys())[list(self.index_data.values()).index(coords)]

    def split_vertex(self, vertex_name, a_name, a_coords, a_neighbours, b_name, b_coords, b_neighbours):
        assert vertex_name in self.indices
        assert a_name not in self.indices
        assert b_name not in self.indices

        self.remove_node(vertex_name)
        self.add_node(a_name, a_coords)
        self.add_node(b_name, b_coords)

        for a_neighbour in a_neighbours:
            self.add_edge(a_name, a_neighbour)

        for b_neighbour in b_neighbours:
            self.add_edge(b_name, b_neighbour)

    def display(self, join=True, show_vertices=True, label_vertices=True):
        fig = plt.figure()

        # Plot a 3D scatter of the vertices
        ax = fig.add_subplot(projection="3d")
        marker = "." if show_vertices else "None"
        ax.scatter(*zip(*self.index_data.values()), marker=marker) # type: ignore

        if show_vertices and label_vertices:
            for index in self.indices:
                x, y, z = self.index_data[index]
                ax.text(x, y, z, str(index), color="k") # type: ignore

        print(f"Vertices: {len(self.index_data.keys())}")

        # Determine scale
        x_scale = None
        y_scale = None
        z_scale = None

        for vertex in self.index_data.values():
            x, y, z = vertex

            if x_scale is None or np.abs(x) > x_scale:
                x_scale = np.abs(x)
            
            if y_scale is None or np.abs(y) > y_scale:
                y_scale = np.abs(y)

            if z_scale is None or np.abs(z) > z_scale:
                z_scale = np.abs(z)

        ax.set_box_aspect(aspect=(x_scale, y_scale, z_scale)) # type: ignore

        if join:
            # Join the vertices with edges
            plotted_edges = set()
            real_edge_count = 0

            for start in self.edges.keys():
                x, y, z = self.index_data[start]

                for neighbour in self.get_neighbours(start):
                    nx, ny, nz = self.index_data[neighbour]
                    real_edge_count += 1

                    left = str(start) if str(start) < str(neighbour) else str(neighbour)
                    right = str(start) if str(start) > str(neighbour) else str(neighbour)

                    # Avoid double plotting
                    if (left, right) in plotted_edges:
                        continue

                    plotted_edges.add((left, right))
                    ax.plot([x, nx], [y, ny], [z, nz], color="r")
            
            print(f"Edges: {len(plotted_edges)} ({real_edge_count})")

        print(f"Polygons: {len(self.compute_all_polygons())}")

        plt.show()
