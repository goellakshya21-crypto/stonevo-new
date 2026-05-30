import urllib.request

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/javascript, application/javascript, */*',
    'Referer': 'https://www.hmgstones.com/offerings.php',
}

req = urllib.request.Request('https://www.hmgstones.com/assets/js/filter.js', headers=headers)
with urllib.request.urlopen(req) as r:
    content = r.read().decode('utf-8', errors='ignore')
    print(content)
