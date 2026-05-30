import urllib.request, json

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
}
API = 'https://www.marmodesign.com.my/wp-json/wp/v2/'

# Load marmo stones and find the tiny ones
import struct
from pathlib import Path

IMG_DIR = Path('D:/papa2/papa/app/scratch/stone_catalog/images_marmo')
marmo = json.loads(Path('D:/papa2/papa/app/scratch/stone_catalog/marmo_stones.json').read_text())

def get_width(path):
    try:
        data = path.read_bytes()
        if data[:2] == b'\xff\xd8':
            i = 2
            while i < len(data) - 4:
                if data[i] != 0xff: break
                marker = data[i+1]
                if marker in (0xC0, 0xC2):
                    return struct.unpack('>H', data[i+7:i+9])[0]
                length = struct.unpack('>H', data[i+2:i+4])[0]
                i += 2 + length
    except: pass
    return 0

# Find tiny images and check their media API entry
tiny_stones = []
for i, s in enumerate(marmo):
    img = s.get('local_img','').replace('images_marmo/','')
    p = IMG_DIR / img
    if p.exists() and get_width(p) < 500:
        tiny_stones.append((i, s))

print(f"Tiny images (<500px): {len(tiny_stones)}")
print("\nChecking first 5 against WP Media API...")

# Fetch all media to find IDs
req = urllib.request.Request(
    'https://www.marmodesign.com.my/wp-json/wp/v2/collection?per_page=100&page=1&_fields=id,title,slug,featured_media',
    headers=HEADERS
)
with urllib.request.urlopen(req, timeout=15) as r:
    page1 = json.loads(r.read())
req = urllib.request.Request(
    'https://www.marmodesign.com.my/wp-json/wp/v2/collection?per_page=100&page=2&_fields=id,title,slug,featured_media',
    headers=HEADERS
)
with urllib.request.urlopen(req, timeout=15) as r:
    page2 = json.loads(r.read())
req = urllib.request.Request(
    'https://www.marmodesign.com.my/wp-json/wp/v2/collection?per_page=100&page=3&_fields=id,title,slug,featured_media',
    headers=HEADERS
)
with urllib.request.urlopen(req, timeout=15) as r:
    page3 = json.loads(r.read())

all_col = page1 + page2 + page3
slug_to_media = {it['slug']: it['featured_media'] for it in all_col}

for idx, s in tiny_stones[:5]:
    slug = s['link'].rstrip('/').split('/')[-1]
    media_id = slug_to_media.get(slug)
    if not media_id:
        print(f"  {s['name']}: no media ID found")
        continue
    req = urllib.request.Request(f"{API}media/{media_id}?_fields=source_url,media_details", headers=HEADERS)
    with urllib.request.urlopen(req, timeout=10) as r:
        m = json.loads(r.read())
    src = m.get('source_url','')
    sizes = m.get('media_details',{}).get('sizes',{})
    print(f"\n  {s['name']}:")
    print(f"    source_url: {src}")
    for sz, info in sizes.items():
        print(f"    {sz}: {info.get('width')}x{info.get('height')}  {info.get('source_url','')}")
