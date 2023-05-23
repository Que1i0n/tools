from PIL import Image
import os

def convert_to_jpg(input_path, output_path):
    image = Image.open(input_path)
    rgb_image = image.convert('RGB')
    rgb_image.save(output_path, 'JPEG')

def batch_convert_to_jpg(input_folder, output_folder):
    # Create the output folder if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Get a list of all files in the input folder
    file_list = os.listdir(input_folder)

    # Process each file
    for file_name in file_list:
        # Get the file extension
        file_ext = os.path.splitext(file_name)[1].lower()

        # Check if the file is a PNG or WebP
        if file_ext == '.png' or file_ext == '.webp':
            # Build the input and output file paths
            input_path = os.path.join(input_folder, file_name)
            output_name = os.path.splitext(file_name)[0] + '.jpg'
            output_path = os.path.join(output_folder, output_name)

            # Convert the image to JPG
            convert_to_jpg(input_path, output_path)

# Example usage
input_folder = 'to_jpg'
output_folder = 'jpeg'
batch_convert_to_jpg(input_folder, output_folder)
