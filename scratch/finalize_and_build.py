import json, re
from pathlib import Path

OUT_DIR = Path('D:/papa2/papa/app/scratch/stone_catalog')

# ── Fix Marmo typos / normalise stone types ──────────────────────────────────
marmo = json.loads((OUT_DIR / 'marmo_stones.json').read_text(encoding='utf-8'))
for s in marmo:
    if s['stone'] == 'quartize':
        s['stone'] = 'quartzite'
(OUT_DIR / 'marmo_stones.json').write_text(json.dumps(marmo, indent=2), encoding='utf-8')

# ── Build HMG items list from the products JSON ──────────────────────────────
import urllib.request
HMG_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*', 'Referer': 'https://www.hmgstones.com/offerings.php',
}
req = urllib.request.Request('https://www.hmgstones.com/assets/includes/products-new.json', headers=HMG_HEADERS)
with urllib.request.urlopen(req) as r:
    raw = json.loads(r.read().decode('utf-8'))

hmg = []
for i, it in enumerate(raw['items']):
    src = it.get('src') or it.get('thumb') or ''
    ext = re.search(r'\.[a-zA-Z]+$', src.split('?')[0])
    ext = ext.group() if ext else '.jpg'
    name = re.sub(r'[^\w\-. ]', '_', it.get('name', '')).strip().replace(' ', '_')
    fname = f"{i:04d}_{name}{ext}"
    color = (it.get('color') or '').strip().lower()
    # normalize HMG color variants
    if color == 'biege': color = 'beige'
    if color == 'jasmine': color = 'yellow'  # close enough for filter purposes
    if color == 'silver': color = 'silver'
    hmg.append({
        'name':  it.get('name','').strip(),
        'stone': (it.get('stone') or '').strip().lower() or 'unknown',
        'color': color or 'unknown',
        'local_img': f"images/{fname}",
        'link':  'https://www.hmgstones.com/' + it.get('url',''),
        'source': 'hmg',
    })

print(f"HMG: {len(hmg)} stones")
print(f"Marmo: {len(marmo)} stones")

all_stones = hmg + marmo
print(f"Total: {len(all_stones)}")

# ── Collect filter values ────────────────────────────────────────────────────
def clean(v): return (v or 'unknown').strip().lower()
for s in all_stones:
    s['stone'] = clean(s.get('stone'))
    s['color'] = clean(s.get('color'))

stone_types = sorted(set(s['stone'] for s in all_stones if s['stone'] not in ('unknown','')))
colors      = sorted(set(s['color'] for s in all_stones if s['color'] not in ('unknown','')))

COLOR_CSS = {
    'white':'#f5f5f0','black':'#1a1a1a','grey':'#888','gray':'#888',
    'beige':'#d4b896','cream':'#fffdd0','brown':'#7b4f2e','red':'#b33a3a',
    'green':'#3a7d44','blue':'#3a5fa8','gold':'#c9a84c','yellow':'#e8c840',
    'silver':'#a8a9ad','pink':'#e8a0b0','purple':'#7b5ea7','orange':'#e07b39',
    'unknown':'#ccc',
}
def color_css(c): return COLOR_CSS.get(c, '#ccc')

SOURCE_LABEL = {'hmg':'HMG Stones','marmo':'Marmo Design'}

# ── Card HTML ────────────────────────────────────────────────────────────────
def card(s):
    img = s.get('local_img','')
    img_tag = (f'<img src="{img}" alt="{s["name"]}" loading="lazy">'
               if img else '<div class="no-img">—</div>')
    src = s.get('source','hmg')
    return (
        f'<div class="card" data-stone="{s["stone"]}" data-color="{s["color"]}" data-source="{src}">'
        f'<a href="{s.get("link","#")}" target="_blank" class="card-link">'
        f'<div class="img-wrap">{img_tag}</div></a>'
        f'<div class="info">'
        f'<p class="name">{s["name"]}</p>'
        f'<div class="tags">'
        f'<span class="dot" style="background:{color_css(s["color"])}"></span>'
        f'<span class="color-label">{s["color"].title()}</span>'
        f'<span class="stone-badge">{s["stone"].title()}</span>'
        f'<span class="source-badge src-{src}">{SOURCE_LABEL[src]}</span>'
        f'</div></div></div>'
    )

cards_html = '\n'.join(card(s) for s in all_stones)

# ── Filter buttons ───────────────────────────────────────────────────────────
stone_btns  = ''.join(f'<button class="filter-btn" data-type="stone" data-val="{t}">{t.title()}</button>' for t in stone_types)
color_btns  = ''.join(
    f'<button class="filter-btn" data-type="color" data-val="{c}">'
    f'<span class="dot-sm" style="background:{color_css(c)}"></span>{c.title()}</button>'
    for c in colors
)
source_btns = ''.join(
    f'<button class="filter-btn src-btn-{s}" data-type="source" data-val="{s}">{SOURCE_LABEL[s]}</button>'
    for s in ['hmg','marmo']
)

# ── Full HTML ────────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stone Catalog — HMG + Marmo Design</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Segoe UI',Arial,sans-serif;background:#f4f1ec;color:#333}}

header{{background:#111;color:#e8d5b0;padding:28px 36px 22px}}
header h1{{font-size:2rem;letter-spacing:3px;text-transform:uppercase}}
.header-pills{{display:flex;gap:12px;margin-top:12px;flex-wrap:wrap}}
.pill{{font-size:0.78rem;padding:4px 14px;border-radius:12px;font-weight:600}}
.pill-hmg{{background:#8b6f47;color:#fff}}
.pill-marmo{{background:#2a6496;color:#fff}}
.pill-total{{background:#444;color:#e8d5b0}}

.controls{{background:#fff;padding:18px 36px 14px;border-bottom:1px solid #e0d8cc;
           position:sticky;top:0;z-index:10;box-shadow:0 2px 10px rgba(0,0,0,.07)}}
.filter-section{{margin-bottom:10px}}
.filter-label{{font-size:0.68rem;text-transform:uppercase;letter-spacing:1.2px;color:#aaa;margin-bottom:6px}}
.filter-row{{display:flex;flex-wrap:wrap;gap:6px}}
.filter-btn{{padding:5px 12px;border:1.5px solid #ddd;border-radius:20px;background:#fff;
             cursor:pointer;font-size:0.78rem;display:inline-flex;align-items:center;
             gap:5px;transition:all .14s;white-space:nowrap}}
.filter-btn:hover{{border-color:#888}}
.filter-btn.active{{background:#333;border-color:#333;color:#fff}}
.filter-btn.src-btn-hmg.active{{background:#8b6f47;border-color:#8b6f47;color:#fff}}
.filter-btn.src-btn-marmo.active{{background:#2a6496;border-color:#2a6496;color:#fff}}
.all-active{{background:#555;border-color:#555;color:#fff}}

.search-wrap{{position:relative;display:inline-block}}
.search-icon{{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#aaa;font-size:0.78rem;pointer-events:none}}
#search{{border:1.5px solid #ddd;border-radius:20px;padding:5px 14px 5px 30px;
         font-size:0.8rem;outline:none;width:220px;transition:border-color .15s}}
#search:focus{{border-color:#888}}

.count-bar{{padding:8px 36px;font-size:0.78rem;color:#888;background:#faf8f5;border-bottom:1px solid #ece8e0}}

.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));
       gap:18px;padding:24px 36px}}
.card{{background:#fff;border-radius:8px;overflow:hidden;
       box-shadow:0 1px 5px rgba(0,0,0,.08);transition:transform .18s,box-shadow .18s}}
.card:hover{{transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,.13)}}
.card.hidden{{display:none}}
.card-link{{display:block;text-decoration:none}}
.img-wrap{{width:100%;aspect-ratio:1;overflow:hidden;background:#eee}}
.img-wrap img{{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s}}
.card:hover .img-wrap img{{transform:scale(1.04)}}
.no-img{{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:.8rem}}
.info{{padding:9px 11px 11px}}
.name{{font-size:.82rem;font-weight:600;margin-bottom:6px;line-height:1.3;color:#222}}
.tags{{display:flex;align-items:center;flex-wrap:wrap;gap:4px}}
.dot{{display:inline-block;width:11px;height:11px;border-radius:50%;border:1px solid rgba(0,0,0,.15);flex-shrink:0}}
.dot-sm{{display:inline-block;width:9px;height:9px;border-radius:50%;border:1px solid rgba(0,0,0,.15);flex-shrink:0}}
.color-label{{font-size:.69rem;color:#666}}
.stone-badge{{font-size:.64rem;background:#f0ebe3;color:#8b6f47;padding:2px 7px;border-radius:9px}}
.source-badge{{font-size:.62rem;padding:2px 7px;border-radius:9px;font-weight:600}}
.src-hmg{{background:#fdf0e0;color:#8b6f47}}
.src-marmo{{background:#e0ecf8;color:#2a6496}}
#no-results{{display:none;grid-column:1/-1;padding:80px;text-align:center;color:#aaa;font-size:1rem}}

@media(max-width:600px){{
  .grid{{padding:14px;gap:12px}}
  .controls{{padding:12px 14px 10px}}
  header{{padding:20px 16px}}
  .count-bar{{padding:6px 14px}}
}}
</style>
</head>
<body>
<header>
  <h1>Stone Catalog</h1>
  <div class="header-pills">
    <span class="pill pill-hmg">HMG Stones &mdash; {len(hmg)}</span>
    <span class="pill pill-marmo">Marmo Design &mdash; {len(marmo)}</span>
    <span class="pill pill-total">Total &mdash; {len(all_stones)}</span>
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
      <input id="search" type="text" placeholder="Search stone name&hellip;">
    </div>
  </div>
</div>

<div class="count-bar" id="count-bar">Loading&hellip;</div>

<div class="grid" id="grid">
{cards_html}
<div id="no-results">No stones match your filters.</div>
</div>

<script>
var state={{source:'all',stone:'all',color:'all',q:''}};

function applyFilters(){{
  var cards=document.querySelectorAll('.card'),shown=0,total=cards.length;
  var q=state.q.toLowerCase().trim();
  cards.forEach(function(c){{
    var ok=(state.source==='all'||c.dataset.source===state.source)&&
            (state.stone==='all' ||c.dataset.stone===state.stone)&&
            (state.color==='all' ||c.dataset.color===state.color)&&
            (!q||c.querySelector('.name').textContent.toLowerCase().includes(q));
    c.classList.toggle('hidden',!ok);
    if(ok)shown++;
  }});
  document.getElementById('count-bar').textContent=shown+' of '+total+' stones shown';
  document.getElementById('no-results').style.display=shown===0?'block':'none';
}}

document.querySelectorAll('.filter-btn').forEach(function(btn){{
  btn.addEventListener('click',function(){{
    var type=btn.dataset.type,val=btn.dataset.val;
    state[type]=val;
    document.querySelectorAll('[data-type="'+type+'"]').forEach(function(b){{
      b.classList.remove('active','all-active');
    }});
    btn.classList.add(val==='all'?'all-active':'active');
    applyFilters();
  }});
}});

document.getElementById('search').addEventListener('input',function(){{
  state.q=this.value;applyFilters();
}});

applyFilters();
</script>
</body>
</html>"""

out = OUT_DIR / 'combined_catalog.html'
out.write_text(html, encoding='utf-8')
sz = out.stat().st_size / 1024
print(f"\nSaved: {out}")
print(f"File size: {sz:.0f} KB")
print(f"Stones: {len(all_stones)} ({len(hmg)} HMG + {len(marmo)} Marmo)")
print(f"Stone types: {stone_types}")
print(f"Colors: {colors}")
