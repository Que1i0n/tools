def read_names_from_file(file_path):
    with open(file_path, 'r') as file:
        names = [name.strip() for name in file.readlines()]
    return names

def sort_names_by_length(names):
    return sorted(names, key=len)

def distribute_names_into_columns(names):
    column1 = []
    column2 = []
    for i, name in enumerate(names):
        if i % 2 == 0:
            column1.append(name)
        else:
            column2.append(name)
    return column1, column2

def reverse_names(names):
    return list(reversed(names))

def save_columns_to_file(column1, column2, column3, column4, file_path):
    with open(file_path, 'w') as file:
        file.write('Column1\n')
        file.write('\n'.join(column1))
        file.write('\n\nColumn2\n')
        file.write('\n'.join(column2))
        file.write('\n\nColumn3\n')
        file.write('\n'.join(column3))
        file.write('\n\nColumn4\n')
        file.write('\n'.join(column4))

# Example usage
file_path = 'names.txt'  # Replace with your actual file path
names = read_names_from_file(file_path)
sorted_names = sort_names_by_length(names)
column1, column2 = distribute_names_into_columns(sorted_names)
column3 = reverse_names(column1)
column4 = reverse_names(column2)
save_columns_to_file(column1, column2, column3, column4, 'combined_columns.txt')
