import json, re, shutil
from pathlib import Path

BASE      = Path('D:/papa2/papa/app/scratch/stone_catalog')
ORGANIZED = BASE / 'organized'
BY_TEMP   = ORGANIZED / 'by_temperature'
IMG_HMG   = BASE / 'images'
IMG_MARMO = BASE / 'images_marmo'

hmg   = json.loads((BASE / 'hmg_stones.json').read_text(encoding='utf-8'))
marmo = json.loads((BASE / 'marmo_stones.json').read_text(encoding='utf-8'))

# ── Temperature mapping ───────────────────────────────────────────────────────
# Based on interior design / stone industry standards
TEMP_MAP = {
    # Warm — reds, oranges, yellows, golds, browns, creams, beiges, warm pinks
    'red':    'Warm',
    'orange': 'Warm',
    'yellow': 'Warm',
    'gold':   'Warm',
    'brown':  'Warm',
    'cream':  'Warm',
    'beige':  'Warm',
    'pink':   'Warm',
    # Cool — blues, greens, greys, silvers
    'blue':   'Cool',
    'green':  'Cool',
    'grey':   'Cool',
    'silver': 'Cool',
    # Neutral — whites, blacks
    'white':  'Neutral',
    'black':  'Neutral',
}

def safe(name):
    name = re.sub(r'[^\w\s\-]', '', name.strip())
    return re.sub(r'[\s_]+', '-', name).strip('-').lower()

def get_local(stone, source):
    img = stone.get('local_img', '')
    if source == 'hmg':
        fname = img.replace('images/', '')
        return IMG_HMG / fname if fname else None
    else:
        fname = img.replace('images_marmo/', '')
        return IMG_MARMO / fname if fname else None

def copy_to(src, dest_dir, stone_name):
    if not src or not Path(src).exists():
        return
    dest_dir.mkdir(parents=True, exist_ok=True)
    ext  = Path(src).suffix.lower()
    base = safe(stone_name)
    dest = dest_dir / f"{base}{ext}"
    n = 1
    while dest.exists():
        dest = dest_dir / f"{base}-{n}{ext}"
        n += 1
    shutil.copy2(src, dest)

# ── Build and copy ────────────────────────────────────────────────────────────
counts = {'Warm': 0, 'Cool': 0, 'Neutral': 0, 'Unclassified': 0}

for s in hmg:
    color = s.get('color', '').strip().lower()
    temp  = TEMP_MAP.get(color, 'Unclassified')
    src   = get_local(s, 'hmg')
    copy_to(src, BY_TEMP / temp, s['name'])
    counts[temp] = counts.get(temp, 0) + 1

for s in marmo:
    color = s.get('color', '').strip().lower()
    temp  = TEMP_MAP.get(color, 'Unclassified')
    src   = get_local(s, 'marmo')
    copy_to(src, BY_TEMP / temp, s['name'])
    counts[temp] = counts.get(temp, 0) + 1

# ── Summary ───────────────────────────────────────────────────────────────────
print("=== by_temperature ===")
for folder in sorted(BY_TEMP.iterdir()):
    files = list(folder.glob('*'))
    print(f"\n  {folder.name}/  ({len(files)} stones)")
    for f in sorted(files)[:6]:
        print(f"    {f.name}")
    if len(files) > 6:
        print(f"    ... and {len(files)-6} more")

total = sum(len(list(BY_TEMP.rglob('*[!.]'))) for _ in [1])
print(f"\nTotal: {sum(counts.values())} stones across 3 temperature groups")
print(f"  Warm:     {counts['Warm']}")
print(f"  Cool:     {counts['Cool']}")
print(f"  Neutral:  {counts['Neutral']}")
if counts.get('Unclassified', 0):
    print(f"  Unclassified: {counts['Unclassified']}")
