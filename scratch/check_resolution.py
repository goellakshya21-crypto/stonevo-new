import urllib.request, json

BASE_URL = 'https://www.hmgstones.com/'
JSON_URL = BASE_URL + 'assets/includes/products-new.json'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Referer': 'https://www.hmgstones.com/offerings.php',
}

req = urllib.request.Request(JSON_URL, headers=HEADERS)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read().decode('utf-8'))

items = data['items']
diff = [(it['name'], it['src'], it['thumb']) for it in items if it.get('src') != it.get('thumb')]
same = [it for it in items if it.get('src') == it.get('thumb')]

print(f"Total items: {len(items)}")
print(f"Items where src == thumb (same file): {len(same)}")
print(f"Items where src != thumb (thumb is smaller): {len(diff)}")
print()
print("Examples of items with separate full-res src:")
for name, src, thumb in diff[:10]:
    print(f"  {name}")
    print(f"    src  : {src}")
    print(f"    thumb: {thumb}")
    print()
