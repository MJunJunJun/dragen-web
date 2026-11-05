# Bangun assets/event/events.json dari kode game Unity (EventCalendar.cs, EventRules.cs, lang_en.json), supaya bagian Event
# website selalu sama dengan game. Jalankan ulang tiap kalender/hadiah event berubah:
#   python -I tools/events-from-unity.py "F:/zzzz testing claude/unity/Dragon Dragon"
import json, re, sys, os, datetime

unity = sys.argv[1] if len(sys.argv) > 1 else r"F:\zzzz testing claude\unity\Dragon Dragon"
naga = os.path.join(unity, "Assets", "Naga")
cal = open(os.path.join(naga, "Scripts", "Game", "EventCalendar.cs"), encoding="utf-8").read()
rules = open(os.path.join(naga, "Scripts", "Game", "EventRules.cs"), encoding="utf-8").read()
lang = json.load(open(os.path.join(naga, "Resources", "NagaData", "lang_en.json"), encoding="utf-8"))
element = {e["id"]: e["en"] for e in lang["elements"]}

def iso(y, m, d): return datetime.datetime(int(y), int(m), int(d), tzinfo=datetime.timezone.utc).isoformat().replace("+00:00", "Z")

events = []
for m in re.finditer(r'E\("([^"]+)",\s*"([^"]+)",\s*D\((\d+),\s*(\d+),\s*(\d+)\),\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"', cal):
    eid, name, y, mo, d, coin, boss, thrown, el = m.groups()
    events.append({"id": eid, "name": name, "starts": iso(y, mo, d), "coin": coin, "boss": boss, "element": element.get(el, el)})
last = re.search(r"LastEnd\s*=\s*D\((\d+),\s*(\d+),\s*(\d+)\)", cal).groups()
for i, e in enumerate(events):  # akhir event = awal event berikutnya (EventCalendar.Build)
    e["ends"] = events[i + 1]["starts"] if i + 1 < len(events) else iso(*last)

ranks = [{"from": int(a), "to": int(b), "label": l} for a, b, l in
         re.findall(r'new RankReward \{ from = (\d+), to = (\d+), eggs = new\[\] \{[^}]*\}, label = "([^"]+)" \}', rules)]

def tmpl(s):  # string C# berinterpolasi → penanda {name} {element} {edition}
    return (s.replace("{e.name}", "{name}").replace("{Loc.Element(e.element)}", "{element}").replace("{EditionLabel(e.id)}", "{edition}"))
shop = []
for m in re.finditer(r'l\.Add\(new ShopItem \{ id = "([^"]+)", name = \$?"([^"]+)", note = \$?"([^"]+)", price = (\d+), limit = (\d+)', rules):
    sid, name, note, price, limit = m.groups()
    shop.append({"id": sid, "name": tmpl(name), "note": tmpl(note), "price": int(price), "limit": int(limit)})

out = {"events": events, "rankRewards": ranks, "shop": shop}
dst = os.path.join(os.path.dirname(__file__), "..", "assets", "event", "events.json")
os.makedirs(os.path.dirname(dst), exist_ok=True)
json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(events)} event, {len(ranks)} hadiah peringkat, {len(shop)} barang toko -> {os.path.normpath(dst)}")
