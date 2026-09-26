import json
import uuid

with open("achievements.json", "r", encoding="utf-8") as f:
    achievements = json.load(f)

sql = ""

for ach in achievements:
    title_escaped = ach["title"].replace("'", "''")
    desc_escaped = ach["description"].replace("'", "''")
    icon_escaped = ach["iconUrl"].replace("'", "''") if "iconUrl" in ach else ""
    rarity = ach.get("rarity", "common")
    trigger = ach.get("triggerEvent", "")
    id_ = str(uuid.uuid4())
    
    sql += f"""
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM achievements WHERE title = '{title_escaped}') THEN
        INSERT INTO achievements (id, title, description, icon_url, rarity, trigger_event) 
        VALUES ('{id_}', '{title_escaped}', '{desc_escaped}', '{icon_escaped}', '{rarity}', '{trigger}');
    END IF;
END $$;
"""

with open("insert_missing_achievements.sql", "w", encoding="utf-8") as f:
    f.write(sql)
