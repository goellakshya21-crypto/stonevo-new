import urllib.request, re

req = urllib.request.Request(
    'https://www.hmgstones.com/offerings.php',
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
)
with urllib.request.urlopen(req) as r:
    html = r.read().decode('utf-8', errors='ignore')

print(f"Total HTML length: {len(html)}")

scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html)
print("\nScripts loaded:")
for s in scripts:
    print(" ", s)

keywords = ['No Data', 'ajax', 'fetch(', 'getProduct', 'product_list', 'stone-item', 'stone-card', 'product-card', 'offerings', 'filter']
for keyword in keywords:
    idx = html.lower().find(keyword.lower())
    if idx > 0:
        print(f"\n=== {keyword} at index {idx} ===")
        print(html[max(0, idx-80):idx+400])
