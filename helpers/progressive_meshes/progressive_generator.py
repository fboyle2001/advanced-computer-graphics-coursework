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

file_name = "chair_max.obj"

stopping_condition = lambda iterations, polygons: polygons < 50

model = process_obj_file(file_name)
model.graph.display(label_vertices=False)
model.reduce(iterations=None, stopping_condition=stopping_condition, verbose=True)
model.graph.display()
model.to_json(save="chair_50.json", readable=True)
write_obj_file(model, write_reduction_records=True)