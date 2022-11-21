from typing import List, Tuple, Dict, Any, Optional, Callable

import time
import json

from vertex_graph import VertexGraph

class OBJModel:
    def __init__(self, file_name: str, graph: VertexGraph, preserved_headers: List[str], reduction_records, original_index_map):
        self.isolated_name = '.'.join(file_name.split(".")[:-1])
        self.graph = graph
        self.preserved_headers = preserved_headers
        self.reduction_records = reduction_records
        self.already_reduced = len(reduction_records) > 0
        self.original_index_map = original_index_map
        self.already_reproduced = False

        self.maximum_vertices = len(self.graph.indices)
        self.maximum_polygons = len(self.graph.compute_all_polygons())

    def write(self, include_reduction_record: bool) -> str:
        return write_obj_file(self, include_reduction_record)

    def reduce(self, iterations: Optional[int], stopping_condition: Optional[Callable[[int, int], bool]], verbose: bool = False):
        """
        1. Identify edge to collapse
        2. Find all polygons from each point on the edge and save them
        3. Collapse the edge
        4. Repeat
        """

        assert iterations is not None or stopping_condition is not None

        reduction_records = []

        i = 0
        while True:
            i += 1
            
            if verbose:
                print(f"===Iteration {i + 1}===")
                print(f"Polygons: {len(self.graph.compute_all_polygons())}")

            res = self.graph.determine_preferred_collapsible_edge()

            if not res:
                break

            x, y = res

            x_coords, y_coords = self.graph.index_data[x].coords, self.graph.index_data[y].coords
            x_polygons = set([tuple(z["polygon"]) for z in self.graph.compute_polygons(x).values()])
            y_polygons = set([tuple(z["polygon"]) for z in self.graph.compute_polygons(y).values()])
            polygons = x_polygons | y_polygons
            new_point = self.graph.collapse_edge(x, y)

            reduction_records.append({
                "i": i,
                "mName": new_point,
                "xName": x,
                "xCoords": x_coords,
                "yName": y,
                "yCoords": y_coords,
                "polygons": list(polygons)
            })

            if iterations is not None:
                if i == iterations:
                    print("Iteration condition reached")
                    break

            if stopping_condition is not None:
                total_polygons = len(self.graph.compute_all_polygons())
                if stopping_condition(i, total_polygons):
                    print("Stopping condition reached")
                    break

        self.reduction_records = reduction_records
    
    def reproduce(self):
        assert len(self.reduction_records) > 0

        # Go in reverse order
        for record in self.reduction_records[::-1]:
            vertex_name = record["n"]

            a_name = record["l"]
            a_coords = record["lc"]
            a_neighbours = record["ln"]

            b_name = record["r"]
            b_coords = record["rc"]
            b_neighbours = record["rn"]

            self.graph.split_vertex(vertex_name, a_name, a_coords, a_neighbours, b_name, b_coords, b_neighbours)
        
        self.already_reproduced = True
        self.reduction_records = []

    def to_json(self, save=None):
        geometry_data: Dict[str, Any] = {
            "maximums": {
                "vertices": self.maximum_vertices,
                "polygons": self.maximum_polygons
            }
        }
        
        real_index_map = {}
        save_index_order = []

        vertices = []

        for real_index, index in enumerate(self.graph.indices):
            vertices.append({
                "name": index,
                "coords": self.graph.index_data[index].coords
            })

            real_index_map[index] = real_index
            save_index_order.append(index)

        geometry_data["vertices"] = vertices

        polygons = []

        for polygon_data in self.graph.compute_all_polygons().values():
            a, b, c = polygon_data["polygon"]
            polygons.append([a, b, c])
        
        geometry_data["polygons"] = polygons
        geometry_data["graph_index_map"] = real_index_map
        geometry_data["reduction"] = self.reduction_records

        if save:
            with open(save, "w+") as fp:
                json.dump(geometry_data, fp, indent=2)

def process_obj_file(file_name: str) -> OBJModel:
    graph = VertexGraph()
    preserved_headers = []
    reduction_records = []
    original_index_map = {}

    def process_vertex(arguments):
        node_index = len(graph.indices) + 1

        if len(original_index_map.keys()) > 0:
            node_index = original_index_map[node_index]

        graph.add_node(str(node_index), tuple(float(coord) for coord in arguments))

    def process_texture(arguments):
        # print("Texture", arguments)
        return

    def process_normal(arguments):
        # print("Normal", arguments)
        return

    def process_free_form(arguments):
        assert False, "Not handling free form"

    def process_face(arguments):
        assert len(arguments) == 3, f"Only triangles are supported, received {len(arguments)} vertices for a polygon"
        # print("Face", arguments)

        face_indices = [arg.split("/")[0] for arg in arguments]
        a, b, c = face_indices[0], face_indices[1], face_indices[2]

        if len(original_index_map.keys()) > 0:
            a = original_index_map[int(a)]
            b = original_index_map[int(b)]
            c = original_index_map[int(c)]
        else:
            a = str(a)
            b = str(b)
            c = str(c)

        graph.add_edge(a, b)
        graph.add_edge(a, c)
        graph.add_edge(b, c)

    def process_line(arguments):
        assert False, "Not handling line"

    def process_comment(arguments):
        # Reduction data is stored in comments to not interfere with existing .obj
        nonlocal reduction_records

        if len(arguments) == 0:
            return

        if arguments[0].startswith("REDUCTION_DATA"):
            if len(arguments) == 1:
                return
            
            unparsed_data = arguments[1]
            reduction_records = json.loads(unparsed_data)
        elif arguments[0] == "REDUCTION_VERTEX_KEYS":
            keys = json.loads(arguments[1])
            
            for i, key in enumerate(keys, 1):
                original_index_map[i] = key

    def process_other(op_code, arguments):
        if op_code != "usemtl":
            preserved_headers.append(f"{op_code} {' '.join(arguments)}")

    op_codes = {
        "v": process_vertex,
        "vt": process_texture,
        "vn": process_normal,
        "vp": process_free_form,
        "f": process_face,
        "l": process_line,
        "#": process_comment
    }

    with open(file_name, "r") as fp:
        for item_line in fp.readlines():
            item_line = item_line.strip()
            
            if len(item_line) == 0:
                continue
            
            whitespace_split = item_line.split(" ")
            op_code = whitespace_split[0]
            arguments = whitespace_split[1:]

            if op_code not in op_codes.keys():
                process_other(op_code, arguments)
            else:
                op_codes[op_code](arguments)
    
    return OBJModel(file_name, graph, preserved_headers, reduction_records, original_index_map)

def write_obj_file(obj_model: OBJModel, write_reduction_records: bool) -> str:
    current_time = time.time()
    initial_line = "# REDUCTION_V1_LEN_0"

    if write_reduction_records:
        initial_line = f"# REDUCTION_V1_LEN_{len(obj_model.reduction_records)}"

    lines = [
        initial_line,
        f"# Generated by progressive_generator.py at {current_time}",
        "# Preserved Headers",
        *obj_model.preserved_headers
    ]

    lines.append("")
    lines.append("# Vertices")

    real_index_map = {}
    save_index_order = []

    for real_index, index in enumerate(obj_model.graph.indices, 1):
        x, y, z = obj_model.graph.index_data[index].coords
        lines.append(f"v {x} {y} {z}")
        real_index_map[index] = real_index
        save_index_order.append(index)

    normals = {}

    polygon_lines = []
    normal_lines = []

    for polygon_data in obj_model.graph.compute_all_polygons().values():
        a, b, c = polygon_data["polygon"]
        normal = polygon_data["normal"]

        if str(normal) not in normals.keys():
            normals[str(normal)] = len(normals.keys()) + 1
            normal_lines.append(f"vn {normal[0]} {normal[1]} {normal[2]}")
        
        normal = normals[str(normal)]

        real_a, real_b, real_c = real_index_map[a], real_index_map[b], real_index_map[c]
        polygon_lines.append(f"f {real_a}// {real_b}// {real_c}//")

    lines = [*lines, "", "# Normal Vectors", *normal_lines, "", "# Polygon Faces", *polygon_lines]

    if write_reduction_records:
        lines.append("")

        lines = [
            f"# REDUCTION_VERTEX_KEYS {json.dumps(save_index_order, separators=(',', ':'))}",
            *lines
        ]

        lines.append(f"# REDUCTION_DATA {json.dumps(obj_model.reduction_records, separators=(',', ':'))}")

    new_file_name = f"{obj_model.isolated_name}_reduced_{current_time}{'.rr' if write_reduction_records else ''}.obj"

    with open(new_file_name, "w+") as fp:
        for line in lines:
            fp.write(f"{line}\n")

    return new_file_name