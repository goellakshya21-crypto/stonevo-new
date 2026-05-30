import urllib.request, re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,*/*',
}

req = urllib.request.Request('https://www.marmodesign.com.my/collection/', headers=HEADERS)
with urllib.request.urlopen(req) as r:
    html = r.read().decode('utf-8', errors='ignore')

# Find stone/product cards
idx = html.find('col-collection')
if idx < 0:
    idx = html.find('collection-item')
if idx < 0:
    idx = html.find('post-')
if idx < 0:
    idx = html.find('entry-')
print(f"Found at {idx}:")
print(html[max(0,idx-50):idx+600])
print("\n---\n")

# Find all img tags in the main body area
body_start = html.find('<body')
imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', html[body_start:])
print(f"Images found in body: {len(imgs)}")
for img in imgs[:20]:
    print(" ", img)

# Look for pagination - how many pages?
pages = re.findall(r'/collection/page/(\d+)/', html)
print(f"\nPage numbers found: {sorted(set(int(p) for p in pages))}")

# Look for stone names / anchor links to individual stone pages
links = re.findall(r'href=["\']([^"\']+/collection/[^"\']+)["\']', html)
print(f"\nCollection links: {len(links)}")
for l in links[:20]:
    print(" ", l)
