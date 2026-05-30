import json, re
from pathlib import Path

BASE      = Path('D:/papa2/papa/app/scratch/stone_catalog')
ORGANIZED = BASE / 'organized'

hmg   = json.loads((BASE / 'hmg_stones.json').read_text(encoding='utf-8'))
marmo = json.loads((BASE / 'marmo_stones.json').read_text(encoding='utf-8'))

def safe(s):
    s = re.sub(r'[^\w\s\-]', '', s.strip())
    return re.sub(r'[\s_]+', '-', s).strip('-').lower()

def industry_stem(stone_type, stone_name, color):
    t = safe(stone_type) if stone_type and stone_type != 'unknown' else ''
    n = safe(stone_name)
    c = safe(color)       if color and color != 'unknown' else ''
    return '-'.join(p for p in [t, n, c] if p)

# Build map: current full stem -> name-only stem
stem_to_name = {}
for s in hmg + marmo:
    name  = s.get('name', '').strip()
    stype = s.get('stone', 'unknown').strip()
    color = s.get('color', 'unknown').strip()
    full_stem = industry_stem(stype, name, color)
    name_stem = safe(name)
    stem_to_name[full_stem] = name_stem

renamed  = 0
skipped  = 0
no_match = []

for img in sorted(ORGANIZED.rglob('*')):
    if not img.is_file():
        continue
    if img.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
        continue

    stem = img.stem
    # Strip dedup suffix (-1, -2 etc.) for lookup
    base_stem = re.sub(r'-\d+$', '', stem)

    name_stem = stem_to_name.get(base_stem)

    if not name_stem:
        no_match.append(img)
        skipped += 1
        continue

    new_name = name_stem + img.suffix.lower()
    new_path = img.parent / new_name

    # Dedup if same stone name appears multiple times in same folder
    counter = 1
    while new_path.exists() and new_path != img:
        new_path = img.parent / f"{name_stem}-{counter}{img.suffix.lower()}"
        counter += 1

    if new_path != img:
        img.rename(new_path)
        renamed += 1

print(f"Renamed:  {renamed}")
print(f"Skipped:  {skipped}")
if no_match:
    print("No match:")
    for p in no_match:
        print(f"  {p.parent.name}/{p.name}")

# Sample output
print("\nSample files:")
for folder in sorted(ORGANIZED.iterdir()):
    print(f"\n  {folder.name}/")
    for sub in sorted(folder.iterdir()):
        files = sorted(sub.glob('*'))[:3]
        print(f"    {sub.name}/")
        for f in files:
            print(f"      {f.name}")
