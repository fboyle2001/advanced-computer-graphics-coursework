from obj_model import process_obj_file

model = process_obj_file("table_high_detail.obj")
start, end = model.reduce(151)

print(f"Start polygons: {start}")
print(f"End polygons: {end}")
print(f"Reduction percent: {((start - end) / start) * 100:.2f}% reduced")

new_file_name = model.write()
print(f"Written file to {new_file_name}")