import urllib.request, re, json

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
}

# 1. Fetch custom scripts.js to look for data sources
urls_to_check = [
    'https://www.marmodesign.com.my/wp-content/themes/marmodesign/js/scripts.js',
    'https://www.marmodesign.com.my/wp-content/themes/marmodesign/js/gsap-controller.js',
]
for url in urls_to_check:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as r:
            content = r.read().decode('utf-8', errors='ignore')
        print(f"\n=== {url} ===")
        print(content[:3000])
    except Exception as e:
        print(f"FAIL {url}: {e}")

# 2. Try WordPress REST API for posts
print("\n\n=== WP REST API - collection posts ===")
api_urls = [
    'https://www.marmodesign.com.my/wp-json/wp/v2/posts?per_page=100&_fields=id,title,link,featured_media,categories,tags,acf',
    'https://www.marmodesign.com.my/wp-json/wp/v2/collection?per_page=100',
    'https://www.marmodesign.com.my/wp-json/wp/v2/types',
]
for url in api_urls:
    try:
        req = urllib.request.Request(url, headers={**HEADERS, 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
        print(f"\n--- {url} ---")
        if isinstance(data, list):
            print(f"  {len(data)} items")
            if data:
                print(f"  Keys: {list(data[0].keys())}")
                print(f"  First: {json.dumps(data[0], indent=2)[:500]}")
        else:
            print(json.dumps(data, indent=2)[:800])
    except Exception as e:
        print(f"  FAIL: {e}")
