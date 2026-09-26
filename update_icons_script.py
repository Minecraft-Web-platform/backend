import json
import os

updates = {
    "Первые сбережения": "/png/achievements/first_savings.jpg",
    "Оффшорная гавань": "/png/achievements/offshore_haven.jpg",
    "Игра в фризби карточкой?": "/png/achievements/first_card.jpg",
    "Фулл-хаус!": "/png/achievements/full_house.jpg",
    "Олигарх": "/png/achievements/oligarch.jpg",
    "Стартапер": "/png/achievements/startuper.jpg",
    "Промышленный холдинг": "/png/achievements/industrial_holding.jpg",
    "Выход на биржу": "/png/achievements/ipo.jpg",
    "Волк с Уолл-стрит": "/png/achievements/wolf_wallstreet.jpg",
    "Венчурный инвестор": "/png/achievements/venture_investor.jpg"
}

with open("achievements.json", "r", encoding="utf-8") as f:
    achievements = json.load(f)

sql = ""

for ach in achievements:
    if ach["title"] in updates:
        ach["iconUrl"] = updates[ach["title"]]
        
        # update query for postgres
        title_escaped = ach["title"].replace("'", "''")
        icon_escaped = ach["iconUrl"].replace("'", "''")
        sql += f"UPDATE achievements SET icon_url = '{icon_escaped}' WHERE title = '{title_escaped}';\n"

# Note: Фулл-хаус in db doesn't have an exclamation mark in one place, so let's update by LIKE just in case.
sql += "UPDATE achievements SET icon_url = '/png/achievements/full_house.jpg' WHERE title LIKE 'Фулл-хаус%';\n"

with open("achievements.json", "w", encoding="utf-8") as f:
    json.dump(achievements, f, indent=2, ensure_ascii=False)

with open("update_icons.sql", "w", encoding="utf-8") as f:
    f.write(sql)

print("Done updating json and generating sql.")
