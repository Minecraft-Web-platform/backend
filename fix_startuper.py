from PIL import Image

def fix_startuper():
    # Load original JPG
    img = Image.open('/Users/oleksandrshtonda/.gemini/antigravity-ide/brain/aa57be8e-1f2f-4dde-8767-9da0a647f966/icon_startuper_1790440706300.jpg').convert("RGBA")
    
    # We want to crop out the dark borders without flood filling into the center.
    # The image is probably 1024x1024.
    # Let's find the bounding box by looking for pixels that are significantly DIFFERENT from the corner background color.
    data = img.load()
    width, height = img.size
    bg_color = data[0, 0][:3]
    tol = 30
    
    min_x, min_y, max_x, max_y = width, height, 0, 0
    
    for x in range(width):
        for y in range(height):
            c = data[x, y]
            if abs(c[0] - bg_color[0]) > tol or abs(c[1] - bg_color[1]) > tol or abs(c[2] - bg_color[2]) > tol:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
                
    # Crop to this bounding box
    img = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    
    # Now we don't have transparent corners on the outside, but it will be a perfect square.
    # Let's save it.
    img.save('/Users/oleksandrshtonda/projects/minecraft-website/frontend/public/png/achievements/startuper.png', "PNG")
    print("Fixed startuper.png")

fix_startuper()
