import json

with open("achievements.json", "r", encoding="utf-8") as f:
    achievements = json.load(f)

new_icons = {
    "company.order.disputed": "/png/achievements/order_disputed.png",
    "company.order.escalated": "/png/achievements/order_escalated.png",
    "economy.fortune": "/png/achievements/fortune.png",
    "economy.monopolist": "/png/achievements/monopolist.png",
    "economy.corporation": "/png/achievements/corporation.png"
}

sql = ""

for ach in achievements:
    trigger = ach.get("triggerEvent", "")
    if trigger in new_icons:
        new_icon = new_icons[trigger]
        ach["iconUrl"] = new_icon
        
        title_escaped = ach["title"].replace("'", "''")
        icon_escaped = new_icon.replace("'", "''")
        sql += f"UPDATE achievements SET icon_url = '{icon_escaped}' WHERE title = '{title_escaped}';\n"

with open("achievements.json", "w", encoding="utf-8") as f:
    json.dump(achievements, f, indent=2, ensure_ascii=False)

with open("update_remaining_icons.sql", "w", encoding="utf-8") as f:
    f.write(sql)

print("Done updating json and generating sql.")
