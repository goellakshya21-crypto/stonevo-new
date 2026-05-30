import urllib.request, json, re, time
from pathlib import Path

OUT_DIR = Path('D:/papa2/papa/app/scratch/stone_catalog')
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
}

# First inspect the actual HTML structure for the type field
req = urllib.request.Request('https://www.marmodesign.com.my/collection/black-beauty/', headers=HEADERS)
with urllib.request.urlopen(req, timeout=15) as r:
    html = r.read().decode('utf-8', errors='ignore')

# Find the details section
idx = html.find('details-')
print("Detail section HTML:")
print(html[max(0,idx-200):idx+1500])
