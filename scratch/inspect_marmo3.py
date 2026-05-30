import urllib.request, re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,*/*',
}

for page_url in [
    'https://www.marmodesign.com.my/collection/',
    'https://www.marmodesign.com.my/collection/page/2/',
    'https://www.marmodesign.com.my/collection/page/3/',
]:
    try:
        req = urllib.request.Request(page_url, headers=HEADERS)
        with urllib.request.urlopen(req) as r:
            html = r.read().decode('utf-8', errors='ignore')

        # Find wp-content/uploads images (actual product images, not theme)
        imgs = re.findall(r'https://www\.marmodesign\.com\.my/wp-content/uploads/[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', html, re.IGNORECASE)
        # Stone page links
        links = re.findall(r'https://www\.marmodesign\.com\.my/(?!collection|wp-content|wp-includes|feed|page)[^\s"\'<>/?#]+/?', html)
        # Check pages referenced
        more_pages = re.findall(r'/collection/page/(\d+)/', html)

        print(f"\n=== {page_url} ===")
        print(f"  Product images: {len(imgs)}")
        for img in imgs:
            print(f"    {img}")
        print(f"  Stone page links: {len(links)}")
        for l in set(links):
            print(f"    {l}")
        print(f"  More pages: {sorted(set(int(p) for p in more_pages))}")
    except Exception as e:
        print(f"  ERROR: {e}")
