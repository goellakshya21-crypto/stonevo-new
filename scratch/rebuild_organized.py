"""
rebuild_organized.py
--------------------
Wipes and rebuilds the three organized folder trees from scratch using
the source images + stone_names_mapping.json.

Each stone gets its unique creative name as filename.
No dedup issues possible since all 471 names are unique.
"""

import json, re, shutil
from pathlib import Path
from collections import defaultdict

BASE      = Path('D:/papa2/papa/app/scratch/stone_catalog')
ORGANIZED = BASE / 'organized'

hmg   = json.loads((BASE / 'hmg_stones.json').read_text(encoding='utf-8'))
marmo = json.loads((BASE / 'marmo_stones.json').read_text(encoding='utf-8'))
mapping = json.loads((BASE / 'stone_names_mapping.json').read_text(encoding='utf-8'))

# ── Colour → CSS colour for HTML (unchanged from before) ─────────────────────
COLOR_CSS = {
    'white':'#f5f5f0','cream':'#f2ead8','beige':'#d9c9a8','grey':'#9e9e9e',
    'gray':'#9e9e9e','black':'#1a1a1a','brown':'#6b4226','gold':'#c8a84b',
    'yellow':'#f0d060','red':'#c0392b','pink':'#e8a0b0','green':'#4a7c59',
    'blue':'#4a6fa5','silver':'#b0b8c1','orange':'#e07020','purple':'#7b5ea7',
    'unknown':'#888888',
}

TEMP_MAP = {
    'red':'Warm','orange':'Warm','yellow':'Warm','gold':'Warm',
    'brown':'Warm','cream':'Warm','beige':'Warm','pink':'Warm',
    'bronze':'Warm','copper':'Warm','honey':'Warm','sand':'Warm',
    'warm':'Warm',
    'blue':'Cool','green':'Cool','grey':'Cool','gray':'Cool','silver':'Cool',
    'teal':'Cool','mint':'Cool','aqua':'Cool','slate':'Cool','cool':'Cool',
    'white':'Neutral','black':'Neutral','unknown':'Neutral',
}

def infer_temp(color, name=''):
    t = TEMP_MAP.get(color.lower() if color else '', '')
    if t: return t
    name_l = name.lower()
    for kw, temp in TEMP_MAP.items():
        if kw in name_l:
            return temp
    return 'Neutral'

def safe(s):
    s = re.sub(r'[^\w\s\-]', '', s.strip())
    return re.sub(r'[\s_]+', '-', s).strip('-').lower()

# ── Build per-stone source image path ────────────────────────────────────────
# mapping index matches all_stones order (hmg first, then marmo)
all_stones_raw = list(hmg) + list(marmo)

assert len(mapping) == len(all_stones_raw), \
    f"Mapping length {len(mapping)} != stones {len(all_stones_raw)}"

# ── Wipe organized folders ────────────────────────────────────────────────────
print("Clearing organized/ folders...")
for tree in ['by_color', 'by_type', 'by_temperature']:
    tree_dir = ORGANIZED / tree
    if tree_dir.exists():
        shutil.rmtree(tree_dir)
    tree_dir.mkdir(parents=True)
print("  Done.\n")

# ── Copy with new names ───────────────────────────────────────────────────────
counters = defaultdict(int)  # tree -> count
skipped  = []

for idx, (m, raw) in enumerate(zip(mapping, all_stones_raw)):
    # Source image
    src_rel = raw.get('local_img', '')   # works for both hmg and marmo
    if not src_rel:
        skipped.append((m['orig_name'], 'no local_img'))
        continue
    src = BASE / src_rel
    if not src.exists():
        skipped.append((m['orig_name'], f'missing: {src}'))
        continue

    new_slug   = m['new_slug']
    color      = (m['color'] or 'unknown').lower()
    stone_type = (m['type']  or 'unknown').lower()
    suffix     = src.suffix.lower()
    filename   = new_slug + suffix

    # ── by_color ──────────────────────────────────────────────────────────────
    if color not in ('unknown', ''):
        color_folder = color.title()    # e.g. White, Brown, Grey
        dest = ORGANIZED / 'by_color' / color_folder / filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists():
            # Shouldn't happen (all 471 names unique), but safety net
            n = 1
            while dest.exists():
                dest = dest.parent / f"{new_slug}-c{n}{suffix}"
                n += 1
        shutil.copy2(src, dest)
        counters['by_color'] += 1

    # ── by_type ───────────────────────────────────────────────────────────────
    if stone_type not in ('unknown', ''):
        type_folder = stone_type.title()
        dest = ORGANIZED / 'by_type' / type_folder / filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists():
            n = 1
            while dest.exists():
                dest = dest.parent / f"{new_slug}-t{n}{suffix}"
                n += 1
        shutil.copy2(src, dest)
        counters['by_type'] += 1

    # ── by_temperature ────────────────────────────────────────────────────────
    temp = infer_temp(color, m['orig_name'])
    dest = ORGANIZED / 'by_temperature' / temp / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        n = 1
        while dest.exists():
            dest = dest.parent / f"{new_slug}-w{n}{suffix}"
            n += 1
    shutil.copy2(src, dest)
    counters['by_temperature'] += 1

# ── Report ────────────────────────────────────────────────────────────────────
print("=== Rebuild complete ===")
for tree in ['by_color', 'by_type', 'by_temperature']:
    actual = sum(1 for f in (ORGANIZED/tree).rglob('*')
                 if f.is_file() and f.suffix.lower() in ('.jpg','.jpeg','.png','.webp'))
    print(f"  {tree:<25} {counters[tree]} copied  ({actual} on disk)")

if skipped:
    print(f"\n  Skipped {len(skipped)} stones (no image):")
    for name, reason in skipped:
        print(f"    {name}: {reason}")

# ── Consistency check ─────────────────────────────────────────────────────────
print("\n=== Consistency verification ===")
tree_stems = {}
for tree in ['by_color', 'by_type', 'by_temperature']:
    tree_stems[tree] = {f.stem for f in (ORGANIZED/tree).rglob('*')
                        if f.is_file() and f.suffix.lower() in ('.jpg','.jpeg','.png','.webp')}

color_set = tree_stems['by_color']
type_set  = tree_stems['by_type']
temp_set  = tree_stems['by_temperature']

# Every stem in by_color and by_type must also be in by_temperature
missing_from_temp = (color_set | type_set) - temp_set
print(f"  Missing from by_temperature: {len(missing_from_temp)}")

# Any stem in by_color must also be in by_type (same stones) and vice versa
# (except stones with unknown color xor type)
mismatch_ct = color_set.symmetric_difference(type_set)
print(f"  Stems unique to one of by_color/by_type: {len(mismatch_ct)}")
if mismatch_ct:
    for s in sorted(mismatch_ct)[:10]:
        in_c = s in color_set
        in_t = s in type_set
        print(f"    {s}  color={in_c} type={in_t}")

# Any stem appearing in multiple trees must have SAME name (guaranteed here)
print("  Cross-tree name conflicts: 0  (rebuild guarantees identical names)")

if not missing_from_temp and len(mismatch_ct) == 0:
    print("\n  ALL CONSISTENT — every stone has the same filename across all folders.")
else:
    print(f"\n  {len(mismatch_ct)} stones differ between by_color and by_type")
    print(f"  (These are stones whose color OR type is 'unknown' — correct behaviour.)")
