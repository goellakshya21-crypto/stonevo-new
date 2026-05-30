import urllib.request, re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,*/*',
    'Accept-Language': 'en-US,en;q=0.9',
}

req = urllib.request.Request('https://www.marmodesign.com.my/collection/', headers=HEADERS)
with urllib.request.urlopen(req) as r:
    html = r.read().decode('utf-8', errors='ignore')

print(f"Total HTML length: {len(html)}")

# Scripts
scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html)
print("\nScripts:")
for s in scripts:
    print(" ", s)

# Look for product/stone data patterns
keywords = ['collection', 'product', 'stone', 'filter', 'ajax', 'fetch(', 'grid', 'card', 'img', 'json']
for kw in keywords:
    idx = html.lower().find(kw.lower())
    if idx > 0:
        print(f"\n=== '{kw}' at {idx} ===")
        print(html[max(0,idx-80):idx+400])
