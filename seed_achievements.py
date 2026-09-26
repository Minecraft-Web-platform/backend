import json

with open("achievements.json", "r", encoding="utf-8") as f:
    achievements = json.load(f)

sql = "INSERT INTO achievements (id, title, description, icon_url, rarity, trigger_event) VALUES "
values = []
for idx, a in enumerate(achievements):
    title = a["title"].replace("'", "''")
    desc = a["description"].replace("'", "''")
    icon = a["iconUrl"].replace("'", "''")
    rarity = a["rarity"]
    trigger = a["triggerEvent"]
    # We will generate a uuid just using uuid module
    import uuid
    id_ = str(uuid.uuid4())
    values.append(f"('{id_}', '{title}', '{desc}', '{icon}', '{rarity}', '{trigger}')")

sql += ",\n".join(values)
sql += " ON CONFLICT (id) DO NOTHING;"

# Wait, there's no unique constraint on title in the entity. 
# It might create duplicates. 
# Instead, let's just do a script that updates existing ones by title, and inserts new ones.
sql2 = ""
for a in achievements:
    title = a["title"].replace("'", "''")
    desc = a["description"].replace("'", "''")
    icon = a["iconUrl"].replace("'", "''")
    rarity = a["rarity"]
    trigger = a["triggerEvent"]
    
    sql2 += f"""
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM achievements WHERE title = '{title}') THEN
        UPDATE achievements SET icon_url = '{icon}', rarity = '{rarity}', description = '{desc}', trigger_event = '{trigger}' WHERE title = '{title}';
    ELSE
        INSERT INTO achievements (title, description, icon_url, rarity, trigger_event) VALUES ('{title}', '{desc}', '{icon}', '{rarity}', '{trigger}');
    END IF;
END $$;
"""

with open("seed.sql", "w", encoding="utf-8") as f:
    f.write(sql2)

