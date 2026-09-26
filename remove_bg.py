import os
from PIL import Image

def process_image(filepath):
    # Open image and convert to RGBA
    img = Image.open(filepath).convert("RGBA")
    data = img.load()
    width, height = img.size
    
    # We assume the background color is the color of the top-left pixel.
    # We will flood-fill from all corners to make it transparent.
    bg_color = data[0, 0][:3]
    
    # Tolerance for background matching
    tol = 30
    
    def matches_bg(c):
        return abs(c[0] - bg_color[0]) < tol and abs(c[1] - bg_color[1]) < tol and abs(c[2] - bg_color[2]) < tol
    
    # Simple BFS flood fill to find background pixels connected to edges
    visited = set()
    queue = []
    
    # Add borders to queue
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
        
    for start_node in queue:
        if start_node not in visited:
            if matches_bg(data[start_node[0], start_node[1]]):
                q = [start_node]
                visited.add(start_node)
                while q:
                    x, y = q.pop(0)
                    data[x, y] = (0, 0, 0, 0) # Make transparent
                    
                    for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < width and 0 <= ny < height:
                            if (nx, ny) not in visited:
                                if matches_bg(data[nx, ny]):
                                    visited.add((nx, ny))
                                    q.append((nx, ny))
    
    # Find bounding box of non-transparent pixels
    min_x, min_y, max_x, max_y = width, height, 0, 0
    for x in range(width):
        for y in range(height):
            if data[x, y][3] != 0:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
                
    if min_x <= max_x and min_y <= max_y:
        # Crop to bounding box
        img = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    
    # Save as PNG
    new_filepath = filepath.rsplit('.', 1)[0] + '.png'
    img.save(new_filepath, "PNG")
    os.remove(filepath)
    print(f"Processed {filepath} -> {new_filepath}")

directory = "frontend/public/png/achievements"
for filename in os.listdir(directory):
    if filename.endswith(".jpg"):
        filepath = os.path.join(directory, filename)
        process_image(filepath)

print("Done processing images.")
