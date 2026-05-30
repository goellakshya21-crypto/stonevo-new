import urllib.request, json

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
}

def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode('utf-8'))

# Fetch all pages of collection
all_items = []
page = 1
while True:
    url = f'https://www.marmodesign.com.my/wp-json/wp/v2/collection?per_page=100&page={page}'
    try:
        data = fetch_json(url)
        if not data:
            break
        all_items.extend(data)
        print(f"Page {page}: {len(data)} items (total so far: {len(all_items)})")
        if len(data) < 100:
            break
        page += 1
    except Exception as e:
        print(f"Page {page} failed: {e}")
        break

print(f"\nTotal collection items: {len(all_items)}")

# Show ACF fields from first few items
print("\n--- ACF fields on items ---")
for item in all_items[:5]:
    print(f"\n  {item['title']['rendered']}")
    print(f"  ACF: {json.dumps(item.get('acf', {}), indent=4)}")
    print(f"  featured_media: {item.get('featured_media')}")
    print(f"  link: {item.get('link')}")

# Show unique ACF keys across all items
all_acf_keys = set()
for item in all_items:
    if isinstance(item.get('acf'), dict):
        all_acf_keys.update(item['acf'].keys())
print(f"\nAll ACF keys: {sorted(all_acf_keys)}")

# Fetch a featured image to see structure
sample_media_id = next((it['featured_media'] for it in all_items if it.get('featured_media')), None)
if sample_media_id:
    media = fetch_json(f'https://www.marmodesign.com.my/wp-json/wp/v2/media/{sample_media_id}')
    print(f"\nMedia sample keys: {list(media.keys())}")
    print(f"source_url: {media.get('source_url')}")
    sizes = media.get('media_details', {}).get('sizes', {})
    print(f"Available sizes: {list(sizes.keys())}")
    for sz, info in sizes.items():
        print(f"  {sz}: {info.get('source_url','?')} ({info.get('width')}x{info.get('height')})")
