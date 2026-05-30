import urllib.request, json, os, re, time
from pathlib import Path

BASE_URL = 'https://www.hmgstones.com/'
JSON_URL = BASE_URL + 'assets/includes/products-new.json'
OUT_DIR = Path('D:/papa2/papa/app/scratch/stone_catalog')
IMG_DIR = OUT_DIR / 'images'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': 'https://www.hmgstones.com/offerings.php',
}

OUT_DIR.mkdir(parents=True, exist_ok=True)
IMG_DIR.mkdir(parents=True, exist_ok=True)

# --- Fetch JSON ---
req = urllib.request.Request(JSON_URL, headers=HEADERS)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read().decode('utf-8'))

items = data['items']
print(f"Total items: {len(items)}")

# --- Normalize color/stone ---
for item in items:
    item['color'] = (item.get('color') or '').strip().lower() or 'unknown'
    item['stone'] = (item.get('stone') or '').strip().lower() or 'unknown'

# --- Download images ---
downloaded = {}
failed = []

def safe_filename(name, ext):
    name = re.sub(r'[^\w\-. ]', '_', name)
    return name.strip().replace(' ', '_') + ext

for i, item in enumerate(items):
    src = item.get('thumb') or item.get('src') or ''
    if not src:
        item['local_img'] = ''
        continue

    ext = os.path.splitext(src.split('?')[0])[1] or '.jpg'
    fname = f"{i:04d}_{safe_filename(item['name'], ext)}"
    local_path = IMG_DIR / fname
    item['local_img'] = f"images/{fname}"

    if local_path.exists():
        print(f"  [skip] {fname}")
        continue

    url = BASE_URL + src if not src.startswith('http') else src
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as r:
            local_path.write_bytes(r.read())
        print(f"  [{i+1}/{len(items)}] {fname}")
    except Exception as e:
        print(f"  [FAIL] {fname}: {e}")
        failed.append(item['name'])
        item['local_img'] = ''
    time.sleep(0.05)

print(f"\nDownloaded. Failed: {len(failed)}")

# --- Collect filter values ---
stone_types = sorted(set(it['stone'] for it in items if it['stone'] != 'unknown'))
colors = sorted(set(it['color'] for it in items if it['color'] not in ('unknown', '')))

# Normalize color case for display
COLOR_DISPLAY = {c: c.title() for c in colors}

# --- Build HTML ---
def item_html(item):
    img_src = item['local_img'] or ''
    img_tag = (f'<img src="{img_src}" alt="{item["name"]}" loading="lazy">'
               if img_src else '<div class="no-img">No image</div>')
    color = item['color']
    stone = item['stone']
    color_dot = f'<span class="dot" style="background:{color_to_css(color)}"></span>'
    return (f'<div class="card" data-stone="{stone}" data-color="{color}">'
            f'<div class="img-wrap">{img_tag}</div>'
            f'<div class="info">'
            f'<p class="name">{item["name"]}</p>'
            f'{color_dot}<span class="color-label">{COLOR_DISPLAY.get(color, color.title())}</span>'
            f'<span class="stone-badge">{stone.title()}</span>'
            f'</div></div>')

def color_to_css(color):
    MAP = {
        'white': '#f5f5f0', 'black': '#222', 'grey': '#888', 'gray': '#888',
        'beige': '#d4b896', 'biege': '#d4b896', 'cream': '#fffdd0',
        'brown': '#7b4f2e', 'red': '#b33a3a', 'green': '#3a7d44',
        'blue': '#3a5fa8', 'gold': '#c9a84c', 'yellow': '#e8d44d',
        'silver': '#a8a9ad', 'jasmine': '#f8de7e', 'unknown': '#ccc',
    }
    return MAP.get(color, '#ccc')

stone_buttons = ''.join(
    f'<button class="filter-btn" data-type="stone" data-val="{s}">{s.title()}</button>'
    for s in stone_types
)
color_buttons = ''.join(
    f'<button class="filter-btn color-btn" data-type="color" data-val="{c}">'
    f'<span class="dot-sm" style="background:{color_to_css(c)}"></span>{COLOR_DISPLAY[c]}</button>'
    for c in colors
)
cards_html = '\n'.join(item_html(it) for it in items)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HMG Stones Catalog</title>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Segoe UI', sans-serif; background: #f4f1ec; color: #333; }}
  header {{ background: #1a1a1a; color: #e8d5b0; padding: 24px 32px; }}
  header h1 {{ font-size: 1.8rem; letter-spacing: 2px; text-transform: uppercase; }}
  header p {{ font-size: 0.9rem; opacity: 0.7; margin-top: 4px; }}
  .controls {{ background: #fff; padding: 20px 32px; border-bottom: 1px solid #e0d8cc;
               position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,.06); }}
  .controls h3 {{ font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;
                  color: #999; margin-bottom: 8px; }}
  .filter-row {{ display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }}
  .filter-btn {{ padding: 6px 14px; border: 1.5px solid #ccc; border-radius: 20px;
                 background: #fff; cursor: pointer; font-size: 0.82rem; display: flex;
                 align-items: center; gap: 6px; transition: all .15s; }}
  .filter-btn:hover {{ border-color: #8b6f47; color: #8b6f47; }}
  .filter-btn.active {{ background: #8b6f47; border-color: #8b6f47; color: #fff; }}
  .filter-btn.all-btn {{ background: #333; border-color: #333; color: #fff; }}
  .filter-btn.all-btn.active {{ background: #8b6f47; border-color: #8b6f47; }}
  .dot {{ display: inline-block; width: 12px; height: 12px; border-radius: 50%;
          border: 1px solid rgba(0,0,0,.15); flex-shrink: 0; }}
  .dot-sm {{ display: inline-block; width: 10px; height: 10px; border-radius: 50%;
             border: 1px solid rgba(0,0,0,.15); flex-shrink: 0; }}
  .stats {{ font-size: 0.8rem; color: #888; padding: 0 32px 12px; }}
  .grid {{ display: grid;
           grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
           gap: 20px; padding: 24px 32px; }}
  .card {{ background: #fff; border-radius: 8px; overflow: hidden;
           box-shadow: 0 1px 4px rgba(0,0,0,.08); transition: transform .2s, box-shadow .2s; }}
  .card:hover {{ transform: translateY(-3px); box-shadow: 0 6px 18px rgba(0,0,0,.12); }}
  .card.hidden {{ display: none; }}
  .img-wrap {{ width: 100%; aspect-ratio: 1; overflow: hidden; background: #eee; }}
  .img-wrap img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
  .no-img {{ width: 100%; height: 100%; display: flex; align-items: center;
             justify-content: center; color: #bbb; font-size: 0.8rem; }}
  .info {{ padding: 10px 12px 12px; }}
  .name {{ font-size: 0.88rem; font-weight: 600; margin-bottom: 6px; line-height: 1.3; }}
  .color-label {{ font-size: 0.75rem; color: #666; margin-left: 4px; }}
  .stone-badge {{ display: inline-block; margin-top: 6px; font-size: 0.7rem;
                  background: #f0ebe3; color: #8b6f47; padding: 2px 8px;
                  border-radius: 10px; float: right; }}
  .no-results {{ padding: 60px; text-align: center; color: #999;
                 font-size: 1.1rem; display: none; }}
  @media (max-width: 600px) {{
    .grid {{ padding: 16px; gap: 12px; }}
    .controls {{ padding: 14px 16px; }}
  }}
</style>
</head>
<body>
<header>
  <h1>HMG Stones Catalog</h1>
  <p>{len(items)} stones &mdash; scraped from hmgstones.com</p>
</header>

<div class="controls">
  <h3>Stone Type</h3>
  <div class="filter-row" id="stone-filters">
    <button class="filter-btn all-btn active" data-type="stone" data-val="all">All Types</button>
    {stone_buttons}
  </div>
  <h3>Color</h3>
  <div class="filter-row" id="color-filters">
    <button class="filter-btn all-btn active" data-type="color" data-val="all">All Colors</button>
    {color_buttons}
  </div>
</div>

<p class="stats" id="count-label"></p>

<div class="grid" id="grid">
{cards_html}
</div>
<p class="no-results" id="no-results">No stones match the selected filters.</p>

<script>
  var activeStone = 'all', activeColor = 'all';

  function applyFilters() {{
    var cards = document.querySelectorAll('.card');
    var shown = 0;
    cards.forEach(function(card) {{
      var stoneMatch = activeStone === 'all' || card.dataset.stone === activeStone;
      var colorMatch = activeColor === 'all' || card.dataset.color === activeColor;
      if (stoneMatch && colorMatch) {{ card.classList.remove('hidden'); shown++; }}
      else {{ card.classList.add('hidden'); }}
    }});
    document.getElementById('count-label').textContent = shown + ' stone' + (shown !== 1 ? 's' : '') + ' shown';
    document.getElementById('no-results').style.display = shown === 0 ? 'block' : 'none';
  }}

  document.querySelectorAll('.filter-btn').forEach(function(btn) {{
    btn.addEventListener('click', function() {{
      var type = btn.dataset.type, val = btn.dataset.val;
      if (type === 'stone') {{
        activeStone = val;
        document.querySelectorAll('#stone-filters .filter-btn').forEach(b => b.classList.remove('active'));
      }} else {{
        activeColor = val;
        document.querySelectorAll('#color-filters .filter-btn').forEach(b => b.classList.remove('active'));
      }}
      btn.classList.add('active');
      applyFilters();
    }});
  }});

  applyFilters();
</script>
</body>
</html>
"""

out_file = OUT_DIR / 'stones_catalog.html'
out_file.write_text(html, encoding='utf-8')
print(f"\nSaved: {out_file}")
print(f"Images in: {IMG_DIR}")
