import json

with open("achievements.json", "r", encoding="utf-8") as f:
    achievements = json.load(f)

new_descriptions = {
    "state.created": "Объявите независимость и создайте собственное суверенное государство на сервере.",
    "settlement.created": "Заложите фундамент нового общества, основав собственное поселение или город.",
    "settlement.joined": "Получите одобрение мэра, чтобы стать полноправным жителем города.",
    "election.president.voted": "Примите участие в выборах президента страны, отдав свой голос за кандидата.",
    "election.mayor.voted": "Повлияйте на будущее своего города, проголосовав на выборах мэра.",
    "election.president.won": "Одержите победу на выборах и возглавьте целое государство.",
    "election.mayor.won": "Возьмите городское управление в свои руки, победив на выборах мэра.",
    "bank.account.created.first": "Начните свой финансовый путь, открыв первый личный банковский счет.",
    "bank.account.offshore.created": "Откройте счет или компанию в валюте иностранного государства для хранения капитала.",
    "card.created.first": "Забудьте про наличные, выпустив свою первую банковскую карту.",
    "card.created.fifth": "Удивите сотрудника банка, выпустив на свое имя 5 банковских карт.",
    "transaction.large": "Совершите колоссальный перевод на сумму не менее 10% от всей эмиссии валюты.",
    "company.created": "Сделайте первый шаг в бизнесе, зарегистрировав свое коммерческое предприятие.",
    "company.created.fifth": "Постройте настоящую бизнес-империю, создав 5 действующих компаний.",
    "company.ipo": "Привлеките серьезный капитал, проведя размещение акций (IPO) своей компании.",
    "company.ipo.fifth": "Станьте королем фондового рынка, выведя на IPO целых 5 различных компаний.",
    "shares.bought": "Рискните капиталом и приобретите акции компании на открытых торгах биржи.",
    "company.order.disputed": "Докажите, что клиент всегда прав, открыв официальный спор (диспут) по заказу услуги.",
    "company.order.escalated": "Эскалируйте корпоративный спор на уровень администрации сервера, чтобы добиться справедливости.",
    "economy.fortune": "Накопите богатства, сконцентрировав на счете компании не менее 10% от всей эмиссии валюты.",
    "economy.monopolist": "Возьмите рынок под контроль, накопив на счете компании 20% от всей эмиссии валюты.",
    "economy.corporation": "Сотрите границы, став владельцем иностранной компании с балансом более 20% от эмиссии валюты."
}

sql = ""

for ach in achievements:
    trigger = ach.get("triggerEvent", "")
    if trigger in new_descriptions:
        new_desc = new_descriptions[trigger]
        ach["description"] = new_desc
        
        title_escaped = ach["title"].replace("'", "''")
        desc_escaped = new_desc.replace("'", "''")
        
        sql += f"UPDATE achievements SET description = '{desc_escaped}' WHERE title = '{title_escaped}';\n"

with open("achievements.json", "w", encoding="utf-8") as f:
    json.dump(achievements, f, indent=2, ensure_ascii=False)

with open("update_single_descriptions.sql", "w", encoding="utf-8") as f:
    f.write(sql)

print("Done updating json and generating sql.")
