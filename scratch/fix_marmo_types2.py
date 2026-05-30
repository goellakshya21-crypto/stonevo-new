import urllib.request, json, re, time
from pathlib import Path

OUT_DIR = Path('D:/papa2/papa/app/scratch/stone_catalog')
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
}

stones = json.loads((OUT_DIR / 'marmo_stones.json').read_text(encoding='utf-8'))

# Pattern: <h4>LABEL</h4> </div> <div class="details-content"> <p>VALUE</p>
DETAIL_RE = re.compile(
    r'<h4>([^<]+)</h4>\s*</div>\s*<div[^>]*details-content[^>]*>\s*<p>([^<]+)</p>',
    re.IGNORECASE
)

def extract_all_details(html):
    return {m.group(1).strip().upper(): m.group(2).strip() for m in DETAIL_RE.finditer(html)}

def normalize_color(raw):
    if not raw: return 'unknown'
    c = raw.lower().strip().split(',')[0].strip()
    MAP = {'beige':'beige','white':'white','black':'black','grey':'grey','gray':'grey',
           'brown':'brown','green':'green','blue':'blue','gold':'gold','yellow':'yellow',
           'red':'red','silver':'silver','cream':'cream','pink':'pink','purple':'purple',
           'orange':'orange','platinum':'grey','light grey':'grey','dark':'black',
           'crystal white':'white','crystal jade':'green','torquoise':'blue','pastel':'white'}
    for k,v in MAP.items():
        if k in c: return v
    return c or 'unknown'

def normalize_stone(raw):
    if not raw: return 'unknown'
    r = raw.strip().lower()
    MAP = {'marble':'marble','granite':'granite','onyx':'onyx','travertine':'travertine',
           'quartzite':'quartzite','limestone':'limestone','sandstone':'sandstone',
           'dolomite':'dolomite','slate':'slate','quartz':'quartzite'}
    for k,v in MAP.items():
        if k in r: return v
    return r or 'unknown'

print(f"Re-scraping types for {len(stones)} Marmo stones...")
for i, stone in enumerate(stones):
    if not stone.get('link'):
        continue
    try:
        req = urllib.request.Request(stone['link'], headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as r:
            html = r.read().decode('utf-8', errors='ignore')
        details = extract_all_details(html)
        colour  = details.get('COLOUR', details.get('COLOR', ''))
        material = details.get('MATERIAL', details.get('TYPE', details.get('STONE TYPE', '')))
        stone['color']     = normalize_color(colour)
        stone['color_raw'] = colour
        stone['stone']     = normalize_stone(material)
        stone['material_raw'] = material
        if i % 25 == 0:
            print(f"  [{i+1}/{len(stones)}] {stone['name']} | stone={stone['stone']} | color={stone['color']}")
    except Exception as e:
        if i % 25 == 0:
            print(f"  [{i+1}/{len(stones)}] {stone['name']} | ERROR: {e}")
    time.sleep(0.07)

(OUT_DIR / 'marmo_stones.json').write_text(json.dumps(stones, indent=2), encoding='utf-8')

stone_types = sorted(set(s['stone'] for s in stones))
colors      = sorted(set(s['color'] for s in stones))
print(f"\nDone. Stone types: {stone_types}")
print(f"Colors: {colors}")
