import json, re, urllib.request
from pathlib import Path

BASE = Path('D:/papa2/papa/app/scratch/stone_catalog')
IMG_HMG = BASE / 'images'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.hmgstones.com/offerings.php',
    'X-Requested-With': 'XMLHttpRequest',
}

req = urllib.request.Request(
    'https://www.hmgstones.com/assets/includes/products-new.json',
    headers=HEADERS
)
with urllib.request.urlopen(req, timeout=20) as r:
    raw = json.loads(r.read().decode('utf-8'))

def safe(name):
    return re.sub(r'[^\w\-. ]', '_', name).strip().replace(' ', '_')

items = []
for i, it in enumerate(raw['items']):
    src = it.get('thumb') or it.get('src') or ''
    ext = re.search(r'\.[a-zA-Z]+$', src.split('?')[0])
    ext = ext.group() if ext else '.jpg'
    color = (it.get('color') or '').strip().lower()
    if color == 'biege': color = 'beige'
    if color == 'jasmine': color = 'yellow'
    items.append({
        'name':      it.get('name', '').strip(),
        'stone':     (it.get('stone') or '').strip().lower() or 'unknown',
        'color':     color or 'unknown',
        'basin':     it.get('basin', ''),
        'textures':  it.get('textures', ''),
        'furniture': it.get('furnitures', '') or it.get('tables', ''),
        'artifact':  it.get('artifacts', ''),
        'local_img': f"images/{i:04d}_{safe(it.get('name',''))}{ext}",
    })

out = BASE / 'hmg_stones.json'
out.write_text(json.dumps(items, indent=2), encoding='utf-8')
print(f"Saved {len(items)} HMG stones to {out}")
