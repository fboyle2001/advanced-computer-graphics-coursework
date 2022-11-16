from obj_model import process_obj_file

model = process_obj_file("table_high_detail_reduced_1668637492.5165317.rr.obj")
model.reproduce()
model.write(include_reduction_record=False)
# start, end = model.reduce(151)

# print(f"Start polygons: {start}")
# print(f"End polygons: {end}")
# print(f"Reduction percent: {((start - end) / start) * 100:.2f}% reduced")

# new_file_name = model.write(include_reduction_record=True)
# print(f"Written file to {new_file_name}")