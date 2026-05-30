"""
organize_by_pattern.py
----------------------
Creates organized/by_pattern/ with subfolders:
  Linear Vein | Cloudy | Fossil | Mosaic | Concentric | Dramatic | Minimal Vein | Metallic Vein

Classification uses original stone name + new name + color + type.
"""

import json, re, shutil
from pathlib import Path

BASE      = Path('D:/papa2/papa/app/scratch/stone_catalog')
ORGANIZED = BASE / 'organized'
BY_PAT    = ORGANIZED / 'by_pattern'

mapping  = json.loads((BASE / 'stone_names_mapping.json').read_text(encoding='utf-8'))

# Build orig_name -> source image path (covers HMG local_img and Marmo local_img)
hmg_data   = json.loads((BASE / 'hmg_stones.json').read_text(encoding='utf-8'))
marmo_data = json.loads((BASE / 'marmo_stones.json').read_text(encoding='utf-8'))
name_to_src = {}
for s in hmg_data:
    name_to_src[s['name'].strip().lower()] = BASE / s.get('local_img','')
for s in marmo_data:
    name_to_src[s['name'].strip().lower()] = BASE / s.get('local_img','')

PATTERNS = ['Linear Vein', 'Cloudy', 'Fossil', 'Mosaic',
            'Concentric', 'Dramatic', 'Minimal Vein', 'Metallic Vein']

# ── Classification rules (checked in priority order) ─────────────────────────
# Each rule: (pattern, [name-keywords], [type-keywords], [color-keywords])
# name-keywords matched against original + new name (combined, lower-cased)
# type-keywords matched against stone type
# color-keywords matched against color
# ALL keyword lists that are non-empty must match at least one keyword (AND logic between lists, OR within)

RULES = [
    # ── Fossil ────────────────────────────────────────────────────────────────
    ('Fossil', [r'fossil|shell|ammonite|coral|nautilus|sea\s*life|marine\s*life|coquina|reef|aquifer|fossi'], [], []),
    ('Fossil', [], ['shellstone','limestone'], []),                    # shellstone always fossil-like

    # ── Mosaic ────────────────────────────────────────────────────────────────
    ('Mosaic', [r'breccia|mosaic|mosai|patchwork|fragment|crazy\s*pave|cobble|brecia|brec'], [], []),
    ('Mosaic', [r'picasso|abstract|puzzle|shatter|broken|kaleidoscope'], [], []),

    # ── Concentric ────────────────────────────────────────────────────────────
    ('Concentric', [], ['onyx'], []),                                  # onyx → concentric rings
    ('Concentric', [r'concentric|ring|eye|circular|iris|target|bullseye|radial|agate|orbit'], [], []),

    # ── Metallic Vein ─────────────────────────────────────────────────────────
    ('Metallic Vein', [r'gold\s*vein|silver\s*vein|metallic\s*vein|copper\s*vein|bronze\s*vein'], [], []),
    ('Metallic Vein', [r'sparkle|glitter|mica|fleck|speckle|labradorite|galaxy|cosmic|star|nebula|universe|galatt|galattic|cosmico|stellar|stellare'], [], []),
    ('Metallic Vein', [r'gold(?:en)?\s*spider|gold(?:en)?\s*rain|gold(?:en)?\s*root|titanium\s*gold|cosmic\s*gold|cosmic\s*silver|platinum\s*black'], [], []),
    ('Metallic Vein', [r'marinace|via\s*lattea|lemurian|emarald\s*pearl'], [], []),
    ('Metallic Vein', [r'igneous|vulcan|lava(?!bo)|basalt|magma'], [], []),

    # ── Cloudy ────────────────────────────────────────────────────────────────
    ('Cloudy', [r'cloud|nebbia|nebul|mist|foggy|haze|vapor|smoky|lumino|luminous|opal(?:ine|escent)|fantasy|invisible|cotton|foam|ghost|aurora|diffuse|blend|soft|fluffy|dreamy|vision'], [], []),
    ('Cloudy', [r'ice\s*berg|iceberg|frozen|tundra|arctic|polar\s*ice|snow\s*flake|blizzard|drift|whirl'], [], []),

    # ── Dramatic ──────────────────────────────────────────────────────────────
    ('Dramatic', [r'tiger|leopard|panther|jaguar|animal\s*print|maculat|tigrato|exotic|jungle|tropical\s*storm|tempest|thunder|lightning|storm(?!y)'], [], []),
    ('Dramatic', [r'nero\s*marquina|marquina|noir|black\s*beauty|black\s*diamond|dark\s*emperor|dark\s*emperador|black\s*fantasy|black\s*phatus|black\s*forest|verde\s*levanto|portoro|sahara\s*noir'], [], []),
    ('Dramatic', [r'volcano|volcan|eruption|inferno|fuego|fire|blaze|flame|obsidian|lava'], [], []),
    ('Dramatic', [r'super\s*white|dramatic|bold|striking|intense|vivid|extreme|spectacular'], [], []),
    # High contrast = black+white = dramatic (calacatta type)
    ('Dramatic', [r'calacatta|statuario|arabescato'], ['marble'], ['white','black']),

    # ── Linear Vein ───────────────────────────────────────────────────────────
    ('Linear Vein', [r'venato|vein|stripe|striated|linear|parallel|wave|ripple|flow|river|stream|line|band|ribbon|cascade|waterfall|silk|satin'], [], []),
    ('Linear Vein', [r'carrara|statuario|calacatta|botticino|bardiglio|arabescato|serpeggiante|antique\s*green|verde\s*alpi'], [], []),

    # ── Minimal Vein ──────────────────────────────────────────────────────────
    ('Minimal Vein', [r'pure|solid|minimal|plain|mono|uniform|clean|simple|subtle|slight|faint|delicate|soft\s*vein|micro|fine\s*grain|honed|blasted|blast|shot\s*blast|areka|ribbed|scratch|hydro|cypress\s*finish|roller|liner|combo|3d'], [], []),
    ('Minimal Vein', [r'bianco\s*assoluto|nero\s*assoluto|absolute|puro|assoluto|massangis'], [], []),
    # Sandstone → minimal (naturally fine-grained)
    ('Minimal Vein', [], ['sandstone'], []),
    # Granite (speckled, no veins) → minimal unless caught by metallic rule above
    ('Minimal Vein', [], ['granite'], []),
    ('Minimal Vein', [], ['dolomite'], []),
]

def classify(orig, new_name, color, stone_type):
    combined = (orig + ' ' + new_name).lower()
    color_l  = (color or '').lower()
    type_l   = (stone_type or '').lower()

    for pattern, name_kws, type_kws, color_kws in RULES:
        name_match  = (not name_kws)  or any(re.search(kw, combined) for kw in name_kws)
        type_match  = (not type_kws)  or any(kw == type_l for kw in type_kws)
        color_match = (not color_kws) or any(kw == color_l for kw in color_kws)
        if name_match and type_match and color_match:
            return pattern

    # Fallback by type
    fallbacks = {
        'marble':     'Linear Vein',
        'quartzite':  'Dramatic',
        'travertine': 'Minimal Vein',
        'limestone':  'Fossil',
        'slate':      'Minimal Vein',
    }
    return fallbacks.get(type_l, 'Cloudy')


# ── Build pattern folders (wipe first for clean rebuild) ─────────────────────
import shutil as _shutil
if BY_PAT.exists():
    _shutil.rmtree(BY_PAT)
BY_PAT.mkdir(parents=True)
for p in PATTERNS:
    (BY_PAT / p).mkdir()

# Slugs to skip (unknown color AND type)
unknown_slugs = {m['new_slug'] for m in mapping
                 if m['color'].lower() in ('unknown','') and m['type'].lower() in ('unknown','')}

results = []
for m in mapping:
    if m['new_slug'] in unknown_slugs:
        continue
    pat = classify(m['orig_name'], m['new_name'], m['color'], m['type'])

    # Source image — try mapping first, fallback to name_to_src lookup
    src_rel = m.get('local_img', '')
    src = BASE / src_rel if src_rel else None
    if not src or not src.exists():
        src = name_to_src.get(m['orig_name'].strip().lower())
    if not src or not src.exists():
        print(f"  [MISSING SRC] {m['orig_name']}")
        continue

    filename = m['new_slug'] + src.suffix.lower()
    dest = BY_PAT / pat / filename
    if dest.exists():
        n = 1
        while dest.exists():
            dest = BY_PAT / pat / f"{m['new_slug']}-{n}{src.suffix.lower()}"
            n += 1
    shutil.copy2(src, dest)
    results.append((pat, m['new_name'], m['orig_name']))

# ── Report ────────────────────────────────────────────────────────────────────
from collections import Counter
counts = Counter(r[0] for r in results)
print("=== by_pattern folder ===")
for pat in PATTERNS:
    print(f"  {pat:<20} {counts.get(pat,0):>4} stones")
print(f"  {'TOTAL':<20} {sum(counts.values()):>4}")

print()
print("=== Samples per pattern ===")
from collections import defaultdict
by_pat = defaultdict(list)
for pat, new, orig in results:
    by_pat[pat].append((new, orig))

for pat in PATTERNS:
    stones = by_pat[pat]
    print(f"\n  [{pat}]")
    for new, orig in stones[:6]:
        print(f"    {orig:<40} -> {new}")
    if len(stones) > 6:
        print(f"    ... +{len(stones)-6} more")
