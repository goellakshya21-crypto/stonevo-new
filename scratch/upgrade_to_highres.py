import urllib.request, json, re, time
from pathlib import Path
from urllib.parse import quote

BASE_URL = 'https://www.hmgstones.com/'
JSON_URL = BASE_URL + 'assets/includes/products-new.json'
IMG_DIR = Path('D:/papa2/papa/app/scratch/stone_catalog/images')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': 'https://www.hmgstones.com/offerings.php',
}

req = urllib.request.Request(JSON_URL, headers=HEADERS)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read().decode('utf-8'))

items = data['items']

def safe_filename(name, ext):
    name = re.sub(r'[^\w\-. ]', '_', name)
    return name.strip().replace(' ', '_') + ext

upgraded = 0
for i, item in enumerate(items):
    src = item.get('src', '')
    thumb = item.get('thumb', '')
    if not src or src == thumb:
        continue  # already full-res or nothing to upgrade

    ext = re.search(r'\.[a-zA-Z]+$', src.split('?')[0])
    ext = ext.group() if ext else '.jpg'
    fname = f"{i:04d}_{safe_filename(item['name'], ext)}"
    local_path = IMG_DIR / fname

    encoded_src = quote(src, safe='/:?=&')
    url = BASE_URL + encoded_src if not encoded_src.startswith('http') else encoded_src

    try:
        req2 = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req2, timeout=15) as r:
            data_bytes = r.read()
        old_size = local_path.stat().st_size if local_path.exists() else 0
        local_path.write_bytes(data_bytes)
        new_size = len(data_bytes)
        print(f"  [{i+1}] {item['name']}: {old_size//1024}KB -> {new_size//1024}KB")
        upgraded += 1
    except Exception as e:
        print(f"  [FAIL] {item['name']}: {e}")
    time.sleep(0.05)

print(f"\nUpgraded {upgraded} images to full resolution.")
