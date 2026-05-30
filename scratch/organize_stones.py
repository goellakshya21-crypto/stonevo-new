import json, re, shutil, urllib.request
from pathlib import Path

BASE       = Path('D:/papa2/papa/app/scratch/stone_catalog')
OUT        = BASE / 'organized'
IMG_HMG    = BASE / 'images'
IMG_MARMO  = BASE / 'images_marmo'
MARMO_JSON = BASE / 'marmo_stones.json'

def safe(name):
    return re.sub(r'[^\w\-. ]', '_', name).strip().replace(' ', '_')

# ── Load HMG data from local JSON ─────────────────────────────────────────────
hmg_raw = json.loads((BASE / 'hmg_stones.json').read_text(encoding='utf-8'))
hmg_stones = []
for it in hmg_raw:
    img = it.get('local_img', '')
    hmg_stones.append({
        'name':      it['name'],
        'stone':     it['stone'],
        'color':     it['color'],
        'basin':     it.get('basin', ''),
        'textures':  it.get('textures', ''),
        'furniture': it.get('furniture', ''),
        'artifact':  it.get('artifact', ''),
        'local':     IMG_HMG / img.replace('images/', '') if img else None,
    })

# ── Load Marmo data ───────────────────────────────────────────────────────────
marmo_stones = json.loads(MARMO_JSON.read_text(encoding='utf-8'))
for i, s in enumerate(marmo_stones):
    img = s.get('local_img', '').replace('images_marmo/', '')
    s['local'] = IMG_MARMO / img if img else None

all_stones = []
for s in hmg_stones:
    all_stones.append({'name': s['name'], 'stone': s['stone'], 'color': s['color'],
                       'basin': s.get('basin',''), 'textures': s.get('textures',''),
                       'furniture': s.get('furniture',''), 'artifact': s.get('artifact',''),
                       'local': s['local']})
for s in marmo_stones:
    all_stones.append({'name': s['name'], 'stone': s['stone'], 'color': s['color'],
                       'basin': '', 'textures': '', 'furniture': '', 'artifact': '',
                       'local': s.get('local')})

# ── Helper: copy with auto-dedup name ─────────────────────────────────────────
def copy_to(src: Path, dest_dir: Path, stone_name: str):
    if not src or not src.exists():
        return
    dest_dir.mkdir(parents=True, exist_ok=True)
    ext  = src.suffix
    base = safe(stone_name)
    dest = dest_dir / f"{base}{ext}"
    n = 1
    while dest.exists():
        dest = dest_dir / f"{base}_{n}{ext}"
        n += 1
    shutil.copy2(src, dest)

# ── 1. by_color ───────────────────────────────────────────────────────────────
print("Building by_color...")
for s in all_stones:
    color = s['color'] or 'unknown'
    copy_to(s['local'], OUT / 'by_color' / color.title(), s['name'])

# ── 2. by_type ────────────────────────────────────────────────────────────────
print("Building by_type...")
for s in all_stones:
    stone = s['stone'] or 'unknown'
    copy_to(s['local'], OUT / 'by_type' / stone.title(), s['name'])

# ── 3. by_application (HMG-specific categories + general stone types) ─────────
print("Building by_application...")
app_map = {
    'Stone Basin':  lambda s: bool(s.get('basin')),
    'Textures':     lambda s: bool(s.get('textures')),
    'Furniture':    lambda s: bool(s.get('furniture')),
    'Artifacts':    lambda s: bool(s.get('artifact')),
    'Marble':       lambda s: s['stone'] == 'marble',
    'Granite':      lambda s: s['stone'] == 'granite',
    'Onyx':         lambda s: s['stone'] == 'onyx',
    'Travertine':   lambda s: s['stone'] == 'travertine',
    'Quartzite':    lambda s: s['stone'] == 'quartzite',
    'Limestone':    lambda s: s['stone'] == 'limestone',
    'Sandstone':    lambda s: s['stone'] == 'sandstone',
    'Shellstone':   lambda s: s['stone'] == 'shellstone',
    'Dolomite':     lambda s: s['stone'] == 'dolomite',
}
for label, test in app_map.items():
    for s in all_stones:
        if test(s):
            copy_to(s['local'], OUT / 'by_application' / label, s['name'])

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n=== Folder Summary ===")
for top in sorted(OUT.iterdir()):
    print(f"\n{top.name}/")
    for sub in sorted(top.iterdir()):
        count = len(list(sub.glob('*')))
        print(f"  {sub.name:<25} {count:>4} images")

total = sum(1 for _ in OUT.rglob('*') if _.is_file())
print(f"\nTotal files copied: {total}")
print(f"Output: {OUT}")
