import json, re
from pathlib import Path

OUT_DIR = Path('D:/papa2/papa/app/scratch/stone_catalog')
HMG_JSON = OUT_DIR / 'hmg_stones.json'
MARMO_JSON = OUT_DIR / 'marmo_stones.json'

# ── Load HMG data from products-new.json ────────────────────────────────────
import urllib.request
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*', 'Referer': 'https://www.hmgstones.com/offerings.php',
}

def safe_fname(name, i, ext):
    n = re.sub(r'[^\w\-. ]', '_', name).strip().replace(' ', '_')
    return f"{i:04d}_{n}{ext}"

if not HMG_JSON.exists():
    req = urllib.request.Request('https://www.hmgstones.com/assets/includes/products-new.json', headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        raw = json.loads(r.read().decode('utf-8'))
    hmg_items = []
    for i, it in enumerate(raw['items']):
        ext = re.search(r'\.[a-zA-Z]+$', (it.get('src') or '').split('?')[0])
        ext = ext.group() if ext else '.jpg'
        fname = safe_fname(it.get('name',''), i, ext)
        hmg_items.append({
            'name': it.get('name','').strip(),
            'stone': (it.get('stone') or '').strip().lower() or 'unknown',
            'color': (it.get('color') or '').strip().lower() or 'unknown',
            'local_img': f"images/{fname}",
            'link': 'https://www.hmgstones.com/' + it.get('url',''),
            'source': 'hmg',
        })
    HMG_JSON.write_text(json.dumps(hmg_items, indent=2), encoding='utf-8')
    print(f"Built HMG JSON: {len(hmg_items)} stones")
else:
    hmg_items = json.loads(HMG_JSON.read_text(encoding='utf-8'))
    print(f"Loaded HMG JSON: {len(hmg_items)} stones")

marmo_items = json.loads(MARMO_JSON.read_text(encoding='utf-8'))
print(f"Loaded Marmo JSON: {len(marmo_items)} stones")

all_stones = hmg_items + marmo_items
print(f"Total: {len(all_stones)} stones\n")

# ── Collect filter values ────────────────────────────────────────────────────
def clean(v): return (v or 'unknown').strip().lower()

for s in all_stones:
    s['stone'] = clean(s.get('stone'))
    s['color'] = clean(s.get('color'))

stone_types = sorted(set(s['stone'] for s in all_stones if s['stone'] not in ('unknown','')))
colors_raw  = sorted(set(s['color'] for s in all_stones if s['color'] not in ('unknown','')))
sources = ['hmg', 'marmo']

COLOR_CSS = {
    'white':'#f5f5f0','black':'#1a1a1a','grey':'#888','gray':'#888',
    'beige':'#d4b896','biege':'#d4b896','cream':'#fffdd0','brown':'#7b4f2e',
    'red':'#b33a3a','green':'#3a7d44','blue':'#3a5fa8','gold':'#c9a84c',
    'yellow':'#e8d44d','silver':'#a8a9ad','jasmine':'#f8de7e',
    'pink':'#e8a0b0','purple':'#7b5ea7','orange':'#e07b39','unknown':'#ccc',
}

def color_css(c):
    return COLOR_CSS.get(c, COLOR_CSS.get(c.split()[0], '#ccc'))

SOURCE_LABEL = {'hmg': 'HMG Stones', 'marmo': 'Marmo Design'}
SOURCE_COLOR = {'hmg': '#8b6f47', 'marmo': '#2a6496'}

# ── Build card HTML ──────────────────────────────────────────────────────────
def card(s):
    img = s.get('local_img','')
    img_tag = f'<img src="{img}" alt="{s["name"]}" loading="lazy">' if img else '<div class="no-img">No image</div>'
    src = s.get('source','hmg')
    dot_color = color_css(s['color'])
    return (
        f'<div class="card" data-stone="{s["stone"]}" data-color="{s["color"]}" data-source="{src}">'
        f'<a href="{s.get("link","#")}" target="_blank" class="card-link">'
        f'<div class="img-wrap">{img_tag}</div></a>'
        f'<div class="info">'
        f'<p class="name">{s["name"]}</p>'
        f'<div class="tags">'
        f'<span class="dot" style="background:{dot_color}"></span>'
        f'<span class="color-label">{s["color"].title()}</span>'
        f'<span class="stone-badge">{s["stone"].title()}</span>'
        f'<span class="source-badge src-{src}">{SOURCE_LABEL[src]}</span>'
        f'</div></div></div>'
    )

cards_html = '\n'.join(card(s) for s in all_stones)

# ── Filter buttons ───────────────────────────────────────────────────────────
def btn(label, dtype, val, extra_cls=''):
    return f'<button class="filter-btn {extra_cls}" data-type="{dtype}" data-val="{val}">{label}</button>'

stone_btns = ''.join(btn(t.title(), 'stone', t) for t in stone_types)
color_btns = ''.join(
    f'<button class="filter-btn" data-type="color" data-val="{c}">'
    f'<span class="dot-sm" style="background:{color_css(c)}"></span>{c.title()}</button>'
    for c in colors_raw
)
source_btns = ''.join(btn(SOURCE_LABEL[s], 'source', s, f'src-btn-{s}') for s in sources)

# ── Full HTML ────────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stone Catalog — HMG + Marmo Design</title>
<style>
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f4f1ec; color: #333; }}

/* ── Header ── */
header {{ background: #111; color: #e8d5b0; padding: 28px 36px 20px; }}
header h1 {{ font-size: 1.9rem; letter-spacing: 3px; text-transform: uppercase; }}
.header-sub {{ display: flex; gap: 24px; margin-top: 10px; flex-wrap: wrap; }}
.source-pill {{ font-size: 0.8rem; padding: 4px 12px; border-radius: 12px; font-weight: 600; }}
.source-pill.hmg   {{ background: #8b6f47; color:#fff; }}
.source-pill.marmo {{ background: #2a6496; color:#fff; }}

/* ── Controls ── */
.controls {{ background: #fff; padding: 18px 36px 14px; border-bottom: 1px solid #e0d8cc;
             position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,.07); }}
.filter-section {{ margin-bottom: 10px; }}
.filter-label {{ font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.2px;
                 color: #aaa; margin-bottom: 6px; }}
.filter-row {{ display: flex; flex-wrap: wrap; gap: 6px; }}
.filter-btn {{ padding: 5px 13px; border: 1.5px solid #ccc; border-radius: 20px;
               background: #fff; cursor: pointer; font-size: 0.79rem; display: inline-flex;
               align-items: center; gap: 5px; transition: all .14s; white-space: nowrap; }}
.filter-btn:hover {{ border-color: #888; }}
.filter-btn.active {{ background: #333; border-color: #333; color: #fff; }}
.filter-btn.src-btn-hmg.active   {{ background: #8b6f47; border-color: #8b6f47; color:#fff; }}
.filter-btn.src-btn-marmo.active {{ background: #2a6496; border-color: #2a6496; color:#fff; }}
.filter-btn.all-active {{ background: #555; border-color: #555; color:#fff; }}

/* ── Count bar ── */
.count-bar {{ padding: 8px 36px; font-size: 0.78rem; color: #888; background: #faf8f5; border-bottom: 1px solid #ece8e0; }}

/* ── Grid ── */
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
         gap: 18px; padding: 24px 36px; }}
.card {{ background: #fff; border-radius: 8px; overflow: hidden;
         box-shadow: 0 1px 4px rgba(0,0,0,.08); transition: transform .18s, box-shadow .18s; }}
.card:hover {{ transform: translateY(-3px); box-shadow: 0 6px 18px rgba(0,0,0,.12); }}
.card.hidden {{ display: none; }}
.card-link {{ display: block; }}
.img-wrap {{ width: 100%; aspect-ratio: 1; overflow: hidden; background: #eee; }}
.img-wrap img {{ width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }}
.card:hover .img-wrap img {{ transform: scale(1.04); }}
.no-img {{ width: 100%; height: 100%; display: flex; align-items: center;
           justify-content: center; color: #bbb; font-size: 0.78rem; }}
.info {{ padding: 9px 11px 11px; }}
.name {{ font-size: 0.83rem; font-weight: 600; margin-bottom: 6px; line-height: 1.3;
         color: #222; }}
.tags {{ display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }}
.dot {{ display: inline-block; width: 11px; height: 11px; border-radius: 50%;
        border: 1px solid rgba(0,0,0,.15); flex-shrink: 0; }}
.dot-sm {{ display: inline-block; width: 9px; height: 9px; border-radius: 50%;
           border: 1px solid rgba(0,0,0,.15); flex-shrink: 0; }}
.color-label {{ font-size: 0.7rem; color: #666; }}
.stone-badge {{ font-size: 0.65rem; background: #f0ebe3; color: #8b6f47;
                padding: 2px 7px; border-radius: 9px; }}
.source-badge {{ font-size: 0.62rem; padding: 2px 7px; border-radius: 9px; font-weight: 600; }}
.source-badge.src-hmg   {{ background: #fdf0e0; color: #8b6f47; }}
.source-badge.src-marmo {{ background: #e0ecf8; color: #2a6496; }}
.no-results {{ padding: 80px; text-align: center; color: #aaa; font-size: 1rem;
               display: none; grid-column: 1/-1; }}

/* ── Search ── */
.search-wrap {{ position: relative; }}
#search {{ border: 1.5px solid #ddd; border-radius: 20px; padding: 5px 14px 5px 32px;
           font-size: 0.82rem; outline: none; width: 200px; transition: border-color .15s; }}
#search:focus {{ border-color: #888; }}
.search-icon {{ position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
                font-size: 0.75rem; color: #aaa; pointer-events: none; }}

@media (max-width: 600px) {{
  .grid {{ padding: 14px; gap: 12px; }}
  .controls {{ padding: 12px 14px 10px; }}
  .count-bar {{ padding: 6px 14px; }}
  header {{ padding: 20px 18px; }}
}}
</style>
</head>
<body>

<header>
  <h1>Stone Catalog</h1>
  <div class="header-sub">
    <span class="source-pill hmg">HMG Stones — {len(hmg_items)} stones</span>
    <span class="source-pill marmo">Marmo Design — {len(marmo_items)} stones</span>
  </div>
</header>

<div class="controls">
  <div class="filter-section">
    <div class="filter-label">Source</div>
    <div class="filter-row">
      <button class="filter-btn all-active" data-type="source" data-val="all">All Sources</button>
      {source_btns}
    </div>
  </div>
  <div class="filter-section">
    <div class="filter-label">Stone Type</div>
    <div class="filter-row">
      <button class="filter-btn all-active" data-type="stone" data-val="all">All Types</button>
      {stone_btns}
    </div>
  </div>
  <div class="filter-section">
    <div class="filter-label">Colour</div>
    <div class="filter-row">
      <button class="filter-btn all-active" data-type="color" data-val="all">All Colours</button>
      {color_btns}
    </div>
  </div>
  <div class="filter-section">
    <div class="filter-label">Search</div>
    <div class="search-wrap">
      <span class="search-icon">&#128269;</span>
      <input id="search" type="text" placeholder="Search stone name…">
    </div>
  </div>
</div>

<div class="count-bar" id="count-bar">Loading…</div>

<div class="grid" id="grid">
{cards_html}
<p class="no-results" id="no-results">No stones match your filters.</p>
</div>

<script>
var state = {{ source:'all', stone:'all', color:'all', q:'' }};

function applyFilters() {{
  var cards = document.querySelectorAll('.card');
  var shown = 0, total = cards.length;
  var q = state.q.toLowerCase().trim();
  cards.forEach(function(c) {{
    var match =
      (state.source === 'all' || c.dataset.source === state.source) &&
      (state.stone  === 'all' || c.dataset.stone  === state.stone)  &&
      (state.color  === 'all' || c.dataset.color  === state.color)  &&
      (!q || c.querySelector('.name').textContent.toLowerCase().includes(q));
    c.classList.toggle('hidden', !match);
    if (match) shown++;
  }});
  document.getElementById('count-bar').textContent = shown + ' of ' + total + ' stones shown';
  document.getElementById('no-results').style.display = shown === 0 ? 'block' : 'none';
}}

document.querySelectorAll('.filter-btn').forEach(function(btn) {{
  btn.addEventListener('click', function() {{
    var type = btn.dataset.type, val = btn.dataset.val;
    state[type] = val;
    // Update active state for this group
    document.querySelectorAll('[data-type="' + type + '"]').forEach(function(b) {{
      b.classList.remove('active','all-active');
    }});
    btn.classList.add(val === 'all' ? 'all-active' : 'active');
    applyFilters();
  }});
}});

document.getElementById('search').addEventListener('input', function() {{
  state.q = this.value;
  applyFilters();
}});

applyFilters();
</script>
</body>
</html>
"""

out = OUT_DIR / 'combined_catalog.html'
out.write_text(html, encoding='utf-8')
print(f"\nSaved combined catalog: {out}")
print(f"Total stones: {len(all_stones)} ({len(hmg_items)} HMG + {len(marmo_items)} Marmo)")
