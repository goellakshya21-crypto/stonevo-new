import urllib.request, json, os, re
from urllib.parse import urljoin

BASE_URL = 'https://www.hmgstones.com/'
JSON_URL = BASE_URL + 'assets/includes/products-new.json'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.hmgstones.com/offerings.php',
}

req = urllib.request.Request(JSON_URL, headers=HEADERS)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read().decode('utf-8'))

items = data['items']
print(f"Total stones: {len(items)}")
print(f"\nSample item keys: {list(items[0].keys()) if items else 'none'}")
print(f"\nFirst 5 items:")
for item in items[:5]:
    print(json.dumps(item, indent=2))

# Show all unique field names across items
all_keys = set()
for item in items:
    all_keys.update(item.keys())
print(f"\nAll field names used: {sorted(all_keys)}")

# Show unique stone types and colors
stones = set(item.get('stone','') for item in items)
colors = set(item.get('color','') for item in items)
print(f"\nStone types: {sorted(stones)}")
print(f"\nColors: {sorted(colors)}")
