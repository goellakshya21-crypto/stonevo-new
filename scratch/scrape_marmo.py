import urllib.request, json, re, time, os
from pathlib import Path
from urllib.parse import quote, urljoin

BASE_URL = 'https://www.marmodesign.com.my/'
API_BASE = BASE_URL + 'wp-json/wp/v2/'
OUT_DIR = Path('D:/papa2/papa/app/scratch/stone_catalog')
IMG_DIR = OUT_DIR / 'images_marmo'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
}

IMG_DIR.mkdir(parents=True, exist_ok=True)

def fetch(url, json_mode=False, timeout=20):
    h = {**HEADERS}
    if json_mode:
        h['Accept'] = 'application/json'
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
    return json.loads(raw.decode('utf-8')) if json_mode else raw.decode('utf-8', errors='ignore')

# ── Step 1: Fetch all collection items ──────────────────────────────────────
print("Fetching collection items from WP REST API...")
all_items = []
page = 1
while True:
    url = f'{API_BASE}collection?per_page=100&page={page}&_fields=id,title,slug,link,featured_media'
    try:
        data = fetch(url, json_mode=True)
        if not data:
            break
        all_items.extend(data)
        print(f"  Page {page}: {len(data)} items")
        if len(data) < 100:
            break
        page += 1
    except Exception as e:
        print(f"  Page {page} failed: {e}")
        break

print(f"Total: {len(all_items)} stones\n")

# ── Step 2: Batch-fetch all featured media ──────────────────────────────────
print("Fetching media URLs...")
media_ids = [it['featured_media'] for it in all_items if it.get('featured_media')]
media_map = {}  # id -> full source_url

for i in range(0, len(media_ids), 100):
    batch = media_ids[i:i+100]
    include = ','.join(str(m) for m in batch)
    url = f'{API_BASE}media?per_page=100&include={include}&_fields=id,source_url,media_details'
    try:
        mdata = fetch(url, json_mode=True)
        for m in mdata:
            # Prefer 'full' size, fall back to source_url
            full_url = m.get('media_details', {}).get('sizes', {}).get('full', {}).get('source_url') or m.get('source_url', '')
            media_map[m['id']] = full_url
        print(f"  Fetched media batch {i//100+1}: {len(mdata)} items")
    except Exception as e:
        print(f"  Media batch {i//100+1} failed: {e}")
    time.sleep(0.2)

# ── Step 3: Scrape individual stone pages for colour & type ─────────────────
print("\nScraping stone pages for colour and type...")

def extract_detail(html, label):
    """Extract value after a label like <h4>COLOUR</h4> ... <p>VALUE</p>"""
    pattern = rf'<h4[^>]*>{re.escape(label)}[^<]*</h4>\s*</div>\s*<div[^>]*>\s*<p>([^<]+)</p>'
    m = re.search(pattern, html, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # Fallback: looser match
    idx = html.upper().find(label.upper())
    if idx > 0:
        snippet = html[idx:idx+300]
        pm = re.search(r'<p>([^<]{1,60})</p>', snippet)
        if pm:
            return pm.group(1).strip()
    return ''

def infer_type_from_name(name):
    name_up = name.upper()
    for t in ['MARBLE', 'GRANITE', 'ONYX', 'TRAVERTINE', 'QUARTZITE', 'LIMESTONE', 'SANDSTONE', 'DOLOMITE', 'SLATE']:
        if t in name_up:
            return t.title()
    return ''

def normalize_color(raw):
    if not raw:
        return 'unknown'
    raw = raw.lower().strip().split(',')[0].strip()  # take first if multiple
    MAP = {
        'beige': 'beige', 'white': 'white', 'black': 'black', 'grey': 'grey',
        'gray': 'grey', 'brown': 'brown', 'green': 'green', 'blue': 'blue',
        'gold': 'gold', 'yellow': 'yellow', 'red': 'red', 'silver': 'silver',
        'cream': 'cream', 'pink': 'pink', 'purple': 'purple', 'orange': 'orange',
        'platinum': 'grey', 'dark': 'black',
    }
    for k, v in MAP.items():
        if k in raw:
            return v
    return raw or 'unknown'

stones = []
for idx, item in enumerate(all_items):
    name = item['title']['rendered'].strip()
    link = item.get('link', '')
    media_id = item.get('featured_media')
    img_url = media_map.get(media_id, '') if media_id else ''

    colour = ''
    stone_type = ''

    try:
        html = fetch(link)
        colour = extract_detail(html, 'COLOUR')
        stone_type = extract_detail(html, 'TYPE') or extract_detail(html, 'STONE TYPE')
        if not stone_type:
            # Try to find type label in relevant labels
            labels = re.findall(r'<h4[^>]*>([^<]+)</h4>', html)
            for label in labels:
                l = label.strip().upper()
                if l in ('MARBLE','GRANITE','ONYX','TRAVERTINE','QUARTZITE','LIMESTONE','SANDSTONE','DOLOMITE','SLATE'):
                    stone_type = label.strip().title()
                    break
        if not stone_type:
            stone_type = infer_type_from_name(name)
        if idx % 20 == 0:
            print(f"  [{idx+1}/{len(all_items)}] {name} | type={stone_type} | colour={colour}")
    except Exception as e:
        if idx % 20 == 0:
            print(f"  [{idx+1}/{len(all_items)}] {name} | ERROR: {e}")

    stones.append({
        'name': name,
        'stone': stone_type.lower() or 'unknown',
        'color': normalize_color(colour),
        'color_raw': colour,
        'img_url': img_url,
        'link': link,
        'source': 'marmo',
    })
    time.sleep(0.08)

print(f"\nScraped {len(stones)} stones")
stone_types = sorted(set(s['stone'] for s in stones))
colors = sorted(set(s['color'] for s in stones))
print(f"Stone types: {stone_types}")
print(f"Colors: {colors}")

# ── Step 4: Download images ──────────────────────────────────────────────────
print("\nDownloading images...")

def safe_fname(name, ext):
    n = re.sub(r'[^\w\-. ]', '_', name).strip().replace(' ', '_')
    return n + ext

for i, stone in enumerate(stones):
    url = stone['img_url']
    if not url:
        stone['local_img'] = ''
        continue
    ext = os.path.splitext(url.split('?')[0])[1] or '.jpg'
    fname = f"{i:04d}_{safe_fname(stone['name'], ext)}"
    local = IMG_DIR / fname
    stone['local_img'] = f"images_marmo/{fname}"

    if local.exists():
        continue
    try:
        data = fetch(url)
        local.write_bytes(data.encode('latin-1') if isinstance(data, str) else data)
        if i % 30 == 0:
            print(f"  [{i+1}/{len(stones)}] {fname}")
    except Exception as e:
        # fetch returns str for html mode — use binary fetch
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as r:
                local.write_bytes(r.read())
            if i % 30 == 0:
                print(f"  [{i+1}/{len(stones)}] {fname}")
        except Exception as e2:
            print(f"  [FAIL] {fname}: {e2}")
            stone['local_img'] = ''
    time.sleep(0.05)

# Save stone data
(OUT_DIR / 'marmo_stones.json').write_text(json.dumps(stones, indent=2), encoding='utf-8')
print(f"\nSaved {len(stones)} Marmo stones to marmo_stones.json")
print(f"Images in: {IMG_DIR}")
