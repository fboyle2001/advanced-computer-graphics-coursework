from obj_model import process_obj_file, write_obj_file

def reduce_model(file_name, iterations=40, stopping_condition=None):
    model = process_obj_file(file_name)
    model.reduce(iterations, stopping_condition, verbose=True)
    return model

def reproduce_model(file_name):
    model = process_obj_file(file_name)
    model.reproduce()

    print(f"Has {len(model.graph.compute_all_polygons())} polygons")

    new_file_name = model.write(include_reduction_record=False)
    print(f"Written file to {new_file_name}")


if __name__ == "__main__":
    file_name = ""

    if file_name == "":
        print("You need to specify the file in the code first! Provide a path to a .obj file.")
        exit(0)

    stopping_condition = lambda iterations, polygons: polygons < 250

    model = process_obj_file(file_name)
    model.graph.display(label_vertices=False)
    model.reduce(iterations=None, stopping_condition=stopping_condition, verbose=True)
    model.graph.display()
    model.to_json(save="reduced.json", readable=False)
    write_obj_file(model, write_reduction_records=True)