import urllib.request, re, json

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
}

# Check an individual stone page for color/type metadata
for url in [
    'https://www.marmodesign.com.my/collection/black-beauty/',
    'https://www.marmodesign.com.my/collection/emerald-green-onyx-travertine/',
    'https://www.marmodesign.com.my/collection/lotus-beige/',
]:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        html = r.read().decode('utf-8', errors='ignore')

    print(f"\n=== {url} ===")
    # Look for colour, type, category, stone-type data
    for kw in ['colour', 'color', 'type', 'stone', 'category', 'tag', 'class=', 'data-']:
        idx = html.lower().find(kw)
        if idx > 0:
            snippet = html[max(0, idx-30):idx+200].replace('\n', ' ')
            print(f"  [{kw}] {snippet[:180]}")

    # Look for any visible text labels near stone-related keywords
    labels = re.findall(r'<(?:h[1-6]|p|span|li|td)[^>]*>([^<]{3,80})</(?:h[1-6]|p|span|li|td)>', html)
    relevant = [l.strip() for l in labels if any(k in l.lower() for k in ['marble','granite','onyx','beige','black','white','grey','green','brown','gold','travertine','quartzite','limestone'])]
    print(f"  Relevant labels: {relevant[:10]}")

    # Also check for type taxonomy in the REST response
    rest_url = url.rstrip('/').replace('https://www.marmodesign.com.my/collection/', '')
    print(f"  slug: {rest_url}")
