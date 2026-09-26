import os
from PIL import Image

def process_all_safely(directory, original_dir):
    for filename in os.listdir(original_dir):
        if filename.endswith(".jpg") and filename.startswith("icon_"):
            filepath = os.path.join(original_dir, filename)
            
            # Map original names to standard names based on achievements
            std_name = None
            if "startuper" in filename: std_name = "startuper"
            elif "first_savings" in filename: std_name = "first_savings"
            elif "full_house" in filename: std_name = "full_house"
            elif "industrial_holding" in filename: std_name = "industrial_holding"
            elif "ipo" in filename: std_name = "ipo"
            elif "first_card" in filename: std_name = "first_card"
            elif "venture_investor" in filename: std_name = "venture_investor"
            elif "oligarch" in filename: std_name = "oligarch"
            elif "wolf_wallstreet" in filename: std_name = "wolf_wallstreet"
            elif "offshore_haven" in filename: std_name = "offshore_haven"
            
            elif "order_disputed" in filename: std_name = "order_disputed"
            elif "order_escalated" in filename: std_name = "order_escalated"
            elif "fortune" in filename: std_name = "fortune"
            elif "monopolist" in filename: std_name = "monopolist"
            elif "corporation" in filename: std_name = "corporation"
            elif "state_created" in filename: std_name = "state_created"
            elif "settle_created" in filename: std_name = "settle_created"
            elif "settle_joined" in filename: std_name = "settle_joined"
            elif "pres_voted" in filename: std_name = "pres_voted"
            elif "mayor_voted" in filename: std_name = "mayor_voted"
            elif "pres_won" in filename: std_name = "pres_won"
            elif "mayor_won" in filename: std_name = "mayor_won"
            
            # Only process if we found a matching name
            if std_name:
                img = Image.open(filepath).convert("RGBA")
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
                            
                if min_x <= max_x and min_y <= max_y:
                    img = img.crop((min_x, min_y, max_x + 1, max_y + 1))
                    
                    # We will NOT do transparency. We keep it as a square and save as PNG.
                    # This prevents the "transparent sky" leak.
                    out_path = os.path.join(directory, f"{std_name}.png")
                    img.save(out_path, "PNG")
                    print(f"Reprocessed safely: {std_name}.png")

process_all_safely(
    "/Users/oleksandrshtonda/projects/minecraft-website/frontend/public/png/achievements",
    "/Users/oleksandrshtonda/.gemini/antigravity-ide/brain/aa57be8e-1f2f-4dde-8767-9da0a647f966"
)
