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
found = list(re.finditer(r'E\("([^"]+)",\s*"([^"]+)",\s*D\((\d+),\s*(\d+),\s*(\d+)\),\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"', cal))
for i, m in enumerate(found):
    eid, name, y, mo, d, coin, boss, thrown, el = m.groups()
    ev = {"id": eid, "name": name, "starts": iso(y, mo, d), "coin": coin, "boss": boss, "element": element.get(el, el)}
    # nama edisi naga khusus: .Edition("Founder's Edition") di entri ini (SeasonEvent.editionName); tanpa itu "<nama> Edition"
    tail = cal[m.end(): found[i + 1].start() if i + 1 < len(found) else len(cal)]
    ed = re.search(r'\.Edition\("([^"]+)"\)', tail)
    if ed: ev["edition"] = ed.group(1)
    events.append(ev)
last = re.search(r"LastEnd\s*=\s*D\((\d+),\s*(\d+),\s*(\d+)\)", cal).groups()
for i, e in enumerate(events):  # akhir event = awal event berikutnya (EventCalendar.Build)
    e["ends"] = events[i + 1]["starts"] if i + 1 < len(events) else iso(*last)

ranks = [{"from": int(a), "to": int(b), "label": l} for a, b, l in
         re.findall(r'new RankReward \{ from = (\d+), to = (\d+), eggs = new\[\] \{[^}]*\}, label = "([^"]+)" \}', rules)]

def tmpl(s):  # string C# berinterpolasi → penanda {name} {element} {edition}
    return (s.replace("{e.name}", "{name}").replace("{Loc.Element(e.element)}", "{element}").replace("{EditionLabel(e.id)}", "{edition}"))
# harga boleh angka atau konstanta (public const int MythicEggPrice = 10000, LegendaryEggPrice = 3000, …)
const = {k: int(v) for line in re.findall(r"const int ([^;]+);", rules) for k, v in re.findall(r"(\w+)\s*=\s*(\d+)", line)}
shop = []
for m in re.finditer(r'l\.Add\(new ShopItem \{ id = "([^"]+)", name = \$?"([^"]+)", note = \$?"([^"]+)", price = (\w+), limit = (\d+)([^}]*)\}', rules):
    sid, name, note, price, limit, rest = m.groups()
    item = {"id": sid, "name": tmpl(name), "note": tmpl(note), "price": int(price) if price.isdigit() else const[price], "limit": int(limit)}
    if re.search(r"eventEgg\s*=\s*true", rest): item["eventEgg"] = True  # telur eksklusif event (Mythic Edisi)
    shop.append(item)
if not shop: sys.exit("toko event tidak terbaca dari EventRules.cs: periksa pola ShopItem")

out = {"events": events, "rankRewards": ranks, "shop": shop}
dst = os.path.join(os.path.dirname(__file__), "..", "assets", "event", "events.json")
os.makedirs(os.path.dirname(dst), exist_ok=True)
json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(events)} event, {len(ranks)} hadiah peringkat, {len(shop)} barang toko -> {os.path.normpath(dst)}")
