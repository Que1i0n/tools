import colorsys
import os
from colorthief import ColorThief
import datetime
from PIL import Image, ImageDraw, ImageFont


# set the folder path
folder_path = "jpeg"

# list all the image files in the folder
image_files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if f.endswith(".jpg") or f.endswith(".jpeg") or f.endswith(".png")]

timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

swatch_size = 50

def generate_color_swatch(dominant_color):
    # Normalize the RGB values
    r_norm, g_norm, b_norm = dominant_color[0] / 255.0, dominant_color[1] / 255.0, dominant_color[2] / 255.0
    
    # Convert RGB to HSL
    h_norm, l_norm, s_norm = colorsys.rgb_to_hls(r_norm, g_norm, b_norm)

    # Calculate the complementary hue
    complementary_h = ((h_norm + 0.5) % 1.0) * 360

    # Generate a set of new colors
    new_colors = []
    for l_val in [20, 40, 60, 80, 100]:
        # Generate the new color with the same hue and saturation but different lightness
        hsl_values = (h_norm, s_norm, l_val/100)
        rgb_values = tuple(int(c*255) for c in colorsys.hls_to_rgb(*hsl_values))
        new_colors.append(rgb_values)

    # Generate a set of complementary colors
    complementary_colors = []
    for l_val in [20, 40, 60, 80, 100]:
        # Generate the complementary color with the same saturation and lightness but different hue
        hsl_values = (complementary_h/360, s_norm, l_val/100)
        rgb_values = tuple(int(c*255) for c in colorsys.hls_to_rgb(*hsl_values))
        complementary_colors.append(rgb_values)

    return new_colors, complementary_colors


def place_swatches(image, swatch, y):
    print(swatch)
    for i, color in enumerate(swatch):
        swatch_r, swatch_g, swatch_b = color
        swatch_color = (int(swatch_r), int(swatch_g), int(swatch_b))
        swatch = Image.new("RGB", (swatch_size, swatch_size), swatch_color)
        image.paste(swatch, (i * swatch_size, (y + 3) * swatch_size))

def draw_swatches(color_dict):
    # create heading
    font_size = 20
    artist_text = f"Artist: {color_dict['artist_name']}"
    title_text = f"Title: {color_dict['piece_title']}"
    text_x, text_y = 50, 50
    heading_height = text_x + text_y + font_size

    # calculate the size of the image
    num_rows = 10
    num_cols = len(color_dict["complimentary_shade_swatch"])
    width = num_cols * swatch_size + 150
    height = num_rows * swatch_size + heading_height

    # create image
    image = Image.new("RGB", (width, height), color=(255, 255, 255))

    # create text layer
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("arial.ttf", size=font_size)
    draw.text((text_x, text_y), artist_text, font=font, fill=(0, 0, 0))
    draw.text((text_x, text_y * 2), title_text, font=font, fill=(0, 0, 0))

    # place dominant colour
    dominant = Image.new("RGB", (swatch_size, swatch_size), dominant_color)
    image.paste(dominant, (width - swatch_size, heading_height - swatch_size))
    # draw swatches
    place_swatches(image, color_dict["dominant_colors_palette"], 2)
    place_swatches(image, color_dict["dominant_shade_swatch"], 3)
    place_swatches(image, color_dict["complimentary_shade_swatch"], 4)
        # save the output image
    output = f"csv/{color_dict['artist_name']}_{color_dict['piece_title']}_colours_swatch_{timestamp_str}.png"
    image.save(output)

for image_file in image_files:
    # create an empty dictionary to store the color data for the image
    color_dict = {}

    file_name = os.path.basename(image_file)
    artist, piece = file_name.split("_")[:2]
    piece_title = piece.split(".")[0]
    artist_name = artist

    # create ColorThief object for the image file
    color_thief = ColorThief(image_file)

    # extract dominant color(s)
    dominant_color = color_thief.get_color(quality=1)

    # extract a palette of colors from the image
    palette = color_thief.get_palette(color_count=7, quality=5)

    # generate complementary colors
    colour_swatches = generate_color_swatch(dominant_color)

    # fill in the color dictionary
    color_dict["artist_name"] = artist_name
    color_dict["piece_title"] = piece_title
    color_dict["image_file"] = image_file
    color_dict["dominant_color_rgb"] = dominant_color
    color_dict["dominant_colors_palette"] = palette
    color_dict["dominant_shade_swatch"] = colour_swatches[0]
    color_dict["complimentary_shade_swatch"] = colour_swatches[1]

    draw_swatches(color_dict)


