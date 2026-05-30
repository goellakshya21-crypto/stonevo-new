import json, shutil
from pathlib import Path

BASE      = Path('D:/papa2/papa/app/scratch/stone_catalog')
ORGANIZED = BASE / 'organized'
BY_TYPE   = ORGANIZED / 'by_type'
BY_COLOR  = ORGANIZED / 'by_color'

# Load stone data to get the REAL type and color for every stone name
hmg   = json.loads((BASE / 'hmg_stones.json').read_text(encoding='utf-8'))
marmo = json.loads((BASE / 'marmo_stones.json').read_text(encoding='utf-8'))

# Build: filename-stem prefix → (correct_type_folder, correct_color_folder)
# The filename stem is: type-name-color  e.g. "marble-mildew-algae-grey"
# We need: for each stone, what is the correct type folder and color folder?
lookup = {}  # stem → {'type': ..., 'color': ...}

import re
def industry_stem(stone_type, stone_name, color):
    def safe(s):
        s = re.sub(r'[^\w\s\-]', '', s.strip())
        return re.sub(r'[\s_]+', '-', s).strip('-').lower()
    t = safe(stone_type) if stone_type and stone_type != 'unknown' else ''
    n = safe(stone_name)
    c = safe(color)       if color and color != 'unknown' else ''
    return '-'.join(p for p in [t, n, c] if p)

for s in hmg + marmo:
    name  = s.get('name','').strip()
    stype = s.get('stone','unknown').strip()
    color = s.get('color','unknown').strip()
    stem  = industry_stem(stype, name, color)
    lookup[stem] = {
        'type_folder':  stype.title() if stype != 'unknown' else None,
        'color_folder': color.title() if color != 'unknown' else None,
    }

def correct_folder(stem, all_stems):
    """Return the lookup entry for this stem, handling -1/-2 dedup suffixes."""
    if stem in lookup:
        return lookup[stem]
    # Strip trailing -N dedup suffix
    base = re.sub(r'-\d+$', '', stem)
    return lookup.get(base)

moved = 0

# ── Fix by_type: any folder whose name isn't a known stone type ───────────────
known_types = {s.get('stone','').title() for s in hmg + marmo} | {
    'Marble','Granite','Onyx','Travertine','Quartzite',
    'Limestone','Sandstone','Shellstone','Dolomite','Unknown'
}

for sub in list(BY_TYPE.iterdir()):
    if not sub.is_dir():
        continue
    if sub.name in known_types:
        continue
    # This is a rogue folder — move its contents to the correct folder
    print(f"Rogue type folder: {sub.name}/")
    for img in list(sub.glob('*')):
        if not img.is_file():
            continue
        info = correct_folder(img.stem, lookup)
        if info and info['type_folder']:
            dest_dir = BY_TYPE / info['type_folder']
        else:
            dest_dir = BY_TYPE / 'Unknown'
        dest_dir.mkdir(exist_ok=True)
        dest = dest_dir / img.name
        counter = 1
        while dest.exists():
            dest = dest_dir / f"{img.stem}-{counter}{img.suffix}"
            counter += 1
        shutil.move(str(img), str(dest))
        print(f"  {img.name} -> {dest_dir.name}/{dest.name}")
        moved += 1
    sub.rmdir()

# ── Fix by_color: any folder whose name isn't a known color ──────────────────
known_colors = {s.get('color','').title() for s in hmg + marmo} | {
    'White','Black','Grey','Beige','Cream','Brown','Red','Green',
    'Blue','Gold','Yellow','Silver','Pink','Orange','Unknown'
}

for sub in list(BY_COLOR.iterdir()):
    if not sub.is_dir():
        continue
    if sub.name in known_colors:
        continue
    print(f"Rogue color folder: {sub.name}/")
    for img in list(sub.glob('*')):
        if not img.is_file():
            continue
        info = correct_folder(img.stem, lookup)
        if info and info['color_folder']:
            dest_dir = BY_COLOR / info['color_folder']
        else:
            dest_dir = BY_COLOR / 'Unknown'
        dest_dir.mkdir(exist_ok=True)
        dest = dest_dir / img.name
        counter = 1
        while dest.exists():
            dest = dest_dir / f"{img.stem}-{counter}{img.suffix}"
            counter += 1
        shutil.move(str(img), str(dest))
        print(f"  {img.name} -> {dest_dir.name}/{dest.name}")
        moved += 1
    sub.rmdir()

print(f"\nTotal corrections: {moved}")

print("\n=== Final by_type ===")
for sub in sorted(BY_TYPE.iterdir()):
    print(f"  {sub.name:<20} {len(list(sub.glob('*'))):>4} images")

print("\n=== Final by_color ===")
for sub in sorted(BY_COLOR.iterdir()):
    print(f"  {sub.name:<20} {len(list(sub.glob('*'))):>4} images")
