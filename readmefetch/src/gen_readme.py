import json
import os
import re
from src.draw_ascii import generate_logo
from src.fetch_info import fetch_stats
from PIL import Image, ImageDraw, ImageFont
from github import Github


def load_config():
    script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(script_dir, "config.json")
    with open(config_path, "r") as f:
        return json.load(f)


def generate_fetch(g: Github) -> str:
    config = load_config()
    user = fetch_stats(g)
    pfp = generate_logo(g)

    stats = f"{user['username']}@github.com\n------------------------------\n"
    for stat in config['display_stats']:
        if stat in user:
            stats += f"{stat.replace('_', ' ').title()}: {user[stat]}\n"
    stats += f"\n{config['additional_info']}\n"

    pfp_lines = pfp.split("\n")
    stats_lines = stats.split("\n")

    max_lines = max(len(pfp_lines), len(stats_lines))
    pfp_lines += [""] * (max_lines - len(pfp_lines))
    stats_lines += [""] * (max_lines - len(stats_lines))

    combined = "\n".join(f"{pfp_line:<50} {stats_line}" for pfp_line, stats_line in zip(pfp_lines, stats_lines))

    return combined


def return_preffered_color() -> tuple:
    config = load_config()
    color = config['preferred_color']
    color_map = {
        "red": (255, 0, 0),
        "green": (0, 128, 0),
        "blue": (0, 0, 255),
        "yellow": (255, 255, 0),
        "purple": (128, 0, 128),
        "orange": (255, 165, 0),
        "pink": (255, 192, 203),
        "white": (255, 255, 255),
        "lightblue": (173, 216, 230),
    }

    if color in color_map:
        return color_map[color]
    else:
        return color_map["lightblue"]


def gen_image(g: Github, out_dir: str = "out"):
    width, initial_height = 1200, 550
    ascii_width = 450
    text_margin = 60

    bg_color = (12, 17, 22)
    value_color = return_preffered_color()
    text_color = (255, 255, 255)
    font_size = 16

    font = None
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/ubuntu/UbuntuMono-R.ttf",
        "/usr/share/fonts/liberation-mono/LiberationMono-Regular.ttf",
        "monospace",
        "consola.ttf"
    ]

    fetch = generate_fetch(g)
    image = Image.new("RGB", (width, initial_height), bg_color)
    draw = ImageDraw.Draw(image)

    for font_path in font_paths:
        try:
            font = ImageFont.truetype(font_path, font_size)
            break
        except IOError:
            continue

    if font is None:
        print("No suitable fonts found. Aborting!")
        return

    lines = fetch.split("\n")
    ascii_lines = [line[:50] for line in lines]
    info_lines = [line[50:].strip() for line in lines]

    y_offset = 10
    line_spacing = font_size + 4
    for ascii_line in ascii_lines:
        draw.text((10, y_offset), ascii_line, fill=value_color, font=font)
        y_offset += line_spacing

    y_offset = 10
    x_text = ascii_width + text_margin
    max_text_width = width - ascii_width - (text_margin * 2)

    for info_line in info_lines:
        if info_line:
            parts = info_line.split(':', 1)
            if len(parts) == 2:
                title = parts[0] + ':'
                value = parts[1].strip()

                title_width = font.getlength(title)
                draw.text((x_text, y_offset), title, fill=value_color, font=font)

                x_value = x_text + title_width + 5
                remaining_width = max_text_width - title_width - 5

                words = value.split()
                line = []
                x_current = x_value

                for word in words:
                    test_line = ' '.join(line + [word])
                    text_width = font.getlength(test_line)

                    if text_width <= remaining_width:
                        line.append(word)
                    else:
                        if line:
                            draw.text((x_current, y_offset), ' '.join(line), fill=text_color, font=font)
                            y_offset += line_spacing
                            line = [word]
                            x_current = x_text + text_margin
                        else:
                            draw.text((x_current, y_offset), word, fill=text_color, font=font)
                            y_offset += line_spacing
                if line:
                    draw.text((x_current, y_offset), ' '.join(line), fill=text_color, font=font)
                y_offset += line_spacing
            else:
                words = info_line.split()
                line = []
                x_current = x_text

                for word in words:
                    test_line = ' '.join(line + [word])
                    text_width = font.getlength(test_line)

                    if text_width <= max_text_width:
                        line.append(word)
                    else:
                        if line:
                            draw.text((x_current, y_offset), ' '.join(line), fill=text_color, font=font)
                            y_offset += line_spacing
                            line = [word]
                            x_current = x_text
                        else:
                            draw.text((x_current, y_offset), word, fill=text_color, font=font)
                            y_offset += line_spacing
                            x_current = x_text

                if line:
                    draw.text((x_current, y_offset), ' '.join(line), fill=text_color, font=font)
                y_offset += line_spacing

    if y_offset > initial_height:
        new_height = y_offset + 20
        image = Image.new("RGB", (width, new_height), bg_color)
        draw = ImageDraw.Draw(image)

        y_offset = 10
        for ascii_line in ascii_lines:
            draw.text((10, y_offset), ascii_line, fill=value_color, font=font)
            y_offset += line_spacing

        y_offset = 10
        for info_line in info_lines:
            if info_line:
                parts = info_line.split(':', 1)
                if len(parts) == 2:
                    title = parts[0] + ':'
                    value = parts[1].strip()

                    title_width = font.getlength(title)
                    draw.text((x_text, y_offset), title, fill=value_color, font=font)

                    x_value = x_text + title_width + 5
                    remaining_width = max_text_width - title_width - 5

                    words = value.split()
                    line = []
                    x_current = x_value

                    for word in words:
                        test_line = ' '.join(line + [word])
                        text_width = font.getlength(test_line)

                        if text_width <= remaining_width:
                            line.append(word)
                        else:
                            if line:
                                draw.text((x_current, y_offset), ' '.join(line), fill=text_color, font=font)
                                y_offset += line_spacing
                                line = [word]
                                x_current = x_text + text_margin
                            else:
                                draw.text((x_current, y_offset), word, fill=text_color, font=font)
                                y_offset += line_spacing
                    if line:
                        draw.text((x_current, y_offset), ' '.join(line), fill=text_color, font=font)
                    y_offset += line_spacing
                else:
                    words = info_line.split()
                    line = []
                    x_current = x_text

                    for word in words:
                        test_line = ' '.join(line + [word])
                        text_width = font.getlength(test_line)

                        if text_width <= max_text_width:
                            line.append(word)
                        else:
                            if line:
                                draw.text((x_current, y_offset), ' '.join(line), fill=text_color, font=font)
                                y_offset += line_spacing
                                line = [word]
                                x_current = x_text
                            else:
                                draw.text((x_current, y_offset), word, fill=text_color, font=font)
                                y_offset += line_spacing
                                x_current = x_text

                    if line:
                        draw.text((x_current, y_offset), ' '.join(line), fill=text_color, font=font)
                    y_offset += line_spacing

    os.makedirs(out_dir, exist_ok=True)
    image.save(os.path.join(out_dir, "fetch.png"))


def generate_readme(g: Github, readme_path: str = "../README.md", out_dir: str = "../out"):
    gen_image(g, out_dir)

    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()

    stats_block = (
        "<!--START_GITHUB_STATS-->\n\n"
        '<p align="center">\n'
        '  <img src="out/fetch.png" alt="Github Fetch" width="700">\n'
        "</p>\n\n"
        "<!--END_GITHUB_STATS-->"
    )

    if "<!--START_GITHUB_STATS-->" in content:
        content = re.sub(
            r"<!--START_GITHUB_STATS-->.*?<!--END_GITHUB_STATS-->",
            stats_block,
            content,
            flags=re.DOTALL,
        )
    else:
        content += f"\n\n## GithubStats\n\n{stats_block}\n"

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(content)
