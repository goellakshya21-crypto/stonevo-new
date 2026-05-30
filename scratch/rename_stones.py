import json, re, os
from pathlib import Path

BASE       = Path('D:/papa2/papa/app/scratch/stone_catalog')
ORGANIZED  = BASE / 'organized'

# ── Load all stone data ───────────────────────────────────────────────────────
hmg   = json.loads((BASE / 'hmg_stones.json').read_text(encoding='utf-8'))
marmo = json.loads((BASE / 'marmo_stones.json').read_text(encoding='utf-8'))

# Build lookup: safe-name → (stone_type, color, canonical_name)
# Industry standard filename: [type]-[name]-[color].[ext]
# e.g. marble-bianco-lava-white.jpg

def safe(s):
    """Filesystem-safe version of a string."""
    s = re.sub(r'[^\w\s\-]', '', s.strip())
    s = re.sub(r'[\s_]+', '-', s)
    return s.strip('-')

def industry_name(stone_type, stone_name, color):
    """
    Industry standard: TYPE-NAME-COLOR
    e.g. marble-bianco-lava-white
    All lowercase, words separated by hyphens.
    """
    t = safe(stone_type.lower())  if stone_type and stone_type != 'unknown' else ''
    n = safe(stone_name.lower())
    c = safe(color.lower())       if color and color != 'unknown' else ''
    parts = [p for p in [t, n, c] if p]
    return '-'.join(parts)

# Map: safe(stone_name) → industry filename stem
lookup = {}
for s in hmg + marmo:
    name  = s.get('name', '').strip()
    stype = s.get('stone', 'unknown').strip()
    color = s.get('color', 'unknown').strip()
    key   = re.sub(r'[\s_]+', '_', safe(name.lower()).replace('-', '_'))
    lookup[key] = {
        'name':  name,
        'stone': stype,
        'color': color,
        'new_stem': industry_name(stype, name, color)
    }

# ── Walk organized folders and rename ─────────────────────────────────────────
renamed  = 0
skipped  = 0
no_match = []

for img in sorted(ORGANIZED.rglob('*')):
    if not img.is_file():
        continue
    ext = img.suffix.lower()
    if ext not in ('.jpg', '.jpeg', '.png', '.webp'):
        continue

    # Current stem → lookup key
    stem = img.stem
    key  = re.sub(r'[\s\-]+', '_', stem.lower())          # normalise
    key  = re.sub(r'_+', '_', key).strip('_')

    match = lookup.get(key)

    # Fuzzy fallback: try stripping leading digits+underscore (e.g. 0000_bianco_lava)
    if not match:
        key2 = re.sub(r'^\d+_', '', key)
        match = lookup.get(key2)

    if not match:
        # Try partial: find a lookup key that starts with the stem key
        for k, v in lookup.items():
            if k.startswith(key) or key.startswith(k):
                match = v
                break

    if not match:
        no_match.append(img)
        skipped += 1
        continue

    new_name = match['new_stem'] + ext
    new_path = img.parent / new_name

    # Dedup if name already exists
    counter = 1
    while new_path.exists() and new_path != img:
        new_path = img.parent / f"{match['new_stem']}-{counter}{ext}"
        counter += 1

    if new_path != img:
        img.rename(new_path)
        renamed += 1

print(f"Renamed:  {renamed}")
print(f"Skipped (no match): {skipped}")
if no_match:
    print("\nUnmatched files (kept original name):")
    for p in no_match[:20]:
        print(f"  {p.parent.name}/{p.name}")

# ── Show sample results ───────────────────────────────────────────────────────
print("\nSample renamed files:")
for folder in sorted(ORGANIZED.iterdir()):
    print(f"\n  {folder.name}/")
    for sub in sorted(folder.iterdir()):
        files = sorted(sub.glob('*'))[:3]
        print(f"    {sub.name}/")
        for f in files:
            print(f"      {f.name}")
