import json

with open("achievements.json", "r", encoding="utf-8") as f:
    achievements = json.load(f)

sql = ""

for ach in achievements:
    if "iconUrl" in ach and ach["iconUrl"].endswith(".jpg"):
        old_url = ach["iconUrl"]
        new_url = old_url.rsplit(".", 1)[0] + ".png"
        ach["iconUrl"] = new_url
        
        # update query for postgres
        title_escaped = ach["title"].replace("'", "''")
        icon_escaped = new_url.replace("'", "''")
        sql += f"UPDATE achievements SET icon_url = '{icon_escaped}' WHERE title = '{title_escaped}';\n"

with open("achievements.json", "w", encoding="utf-8") as f:
    json.dump(achievements, f, indent=2, ensure_ascii=False)

with open("update_png.sql", "w", encoding="utf-8") as f:
    f.write(sql)

print("Done updating json to PNG and generating sql.")
