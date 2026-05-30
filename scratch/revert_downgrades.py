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

def fetch_size(url):
    try:
        req2 = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req2, timeout=15) as r:
            return r.read()
    except Exception as e:
        return None

reverted = 0
for i, item in enumerate(items):
    src = item.get('src', '')
    thumb = item.get('thumb', '')
    if not src or src == thumb:
        continue

    ext = re.search(r'\.[a-zA-Z]+$', src.split('?')[0])
    ext = ext.group() if ext else '.jpg'
    fname = f"{i:04d}_{safe_filename(item['name'], ext)}"
    local_path = IMG_DIR / fname
    current_size = local_path.stat().st_size if local_path.exists() else 0

    # Fetch thumb to compare
    encoded_thumb = quote(thumb, safe='/:?=&')
    thumb_url = BASE_URL + encoded_thumb if not encoded_thumb.startswith('http') else encoded_thumb
    thumb_data = fetch_size(thumb_url)
    if thumb_data is None:
        continue
    thumb_size = len(thumb_data)

    if thumb_size > current_size:
        local_path.write_bytes(thumb_data)
        print(f"  [reverted] {item['name']}: {current_size//1024}KB -> {thumb_size//1024}KB (thumb was bigger)")
        reverted += 1
    else:
        print(f"  [kept src] {item['name']}: src={current_size//1024}KB, thumb={thumb_size//1024}KB")
    time.sleep(0.05)

print(f"\nReverted {reverted} images back to the larger (thumb) version.")
