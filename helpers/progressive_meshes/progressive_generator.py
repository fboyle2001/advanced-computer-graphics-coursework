from obj_model import process_obj_file, write_obj_file

def reduce_model(file_name, iterations=40, stopping_condition=None):
    model = process_obj_file(file_name)
    model.reduce(iterations, stopping_condition, verbose=True)

    # print()
    # print(f"Start polygons: {start}")
    # print(f"End polygons: {end}")
    # print(f"Reduction percent: {((start - end) / start) * 100:.2f}% reduced")

    # new_file_name = model.write(include_reduction_record=True)
    # print(f"Written file to {new_file_name}")

    return model

def reproduce_model(file_name):
    model = process_obj_file(file_name)
    model.reproduce()

    print(f"Has {len(model.graph.compute_all_polygons())} polygons")

    new_file_name = model.write(include_reduction_record=False)
    print(f"Written file to {new_file_name}")

file_name = "chair_max.obj"
# reduce_model(file_name)

# file_name = "original_reduced_1668696781.2866838.rr.obj"
# reproduce_model(file_name)

# model = process_obj_file(file_name)
stopping_condition = lambda iterations, polygons: polygons < 10
model = reduce_model(file_name, iterations=None, stopping_condition=stopping_condition) # type: ignore
model.to_json(save="chair_10.json")
write_obj_file(model, write_reduction_records=False)
# print(model.reduction_records)
# model.to_json(save="test_reduced.json")