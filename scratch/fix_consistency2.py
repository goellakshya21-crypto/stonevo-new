import json, re, shutil
from pathlib import Path
from collections import defaultdict

BASE      = Path('D:/papa2/papa/app/scratch/stone_catalog')
ORGANIZED = BASE / 'organized'
TREES     = ['by_color', 'by_type', 'by_temperature']

# Build per-tree: set of stems present
tree_files = {}
for tree in TREES:
    stems = {}  # stem -> Path
    for img in (ORGANIZED / tree).rglob('*'):
        if img.is_file() and img.suffix.lower() in ('.jpg','.jpeg','.png','.webp'):
            stems[img.stem] = img
    tree_files[tree] = stems

# The real question: is every stem in by_color also in by_temperature and by_type?
# (by_color and by_type should be identical sets since every stone has both)
# by_temperature may differ slightly since some unknown-color stones still got placed

ref_stems  = set(tree_files['by_color'].keys())   # use by_color as reference
temp_stems = set(tree_files['by_temperature'].keys())

missing_in_temp = ref_stems - temp_stems
extra_in_temp   = temp_stems - ref_stems

print(f"Stems in by_color not in by_temperature: {len(missing_in_temp)}")
for s in sorted(missing_in_temp):
    print(f"  {s}")

print(f"\nStems in by_temperature not in by_color: {len(extra_in_temp)}")
for s in sorted(extra_in_temp):
    print(f"  {s}")

# ── Fix: copy missing stems from by_type into by_temperature ─────────────────
# Need to figure out which temperature folder each missing stone belongs to
hmg   = json.loads((BASE / 'hmg_stones.json').read_text(encoding='utf-8'))
marmo = json.loads((BASE / 'marmo_stones.json').read_text(encoding='utf-8'))

TEMP_MAP = {
    'red':'Warm','orange':'Warm','yellow':'Warm','gold':'Warm',
    'brown':'Warm','cream':'Warm','beige':'Warm','pink':'Warm',
    'bronze':'Warm','copper':'Warm','honey':'Warm','sand':'Warm',
    'blue':'Cool','green':'Cool','grey':'Cool','silver':'Cool',
    'teal':'Cool','mint':'Cool','aqua':'Cool','slate':'Cool',
    'white':'Neutral','black':'Neutral',
}

def safe(s):
    s = re.sub(r'[^\w\s\-]', '', s.strip())
    return re.sub(r'[\s_]+', '-', s).strip('-').lower()

slug_to_info = {}
for s in hmg + marmo:
    slug = safe(s.get('name',''))
    slug_to_info[slug] = s

def infer_temp(name, color):
    t = TEMP_MAP.get(color.lower(), '')
    if t: return t
    name_lower = name.lower()
    for kw, temp in {**TEMP_MAP, 'warm':'Warm','cool':'Cool','neutral':'Neutral'}.items():
        if kw in name_lower: return temp
    return 'Neutral'

copied = 0
for stem in sorted(missing_in_temp):
    # Get the file from by_type
    src = tree_files['by_type'].get(stem)
    if not src:
        # Try by_color
        src = tree_files['by_color'].get(stem)
    if not src:
        print(f"  [no source found for {stem}]")
        continue

    # Find the stone info
    base_slug = re.sub(r'-\d+$', '', stem)
    info = slug_to_info.get(stem) or slug_to_info.get(base_slug)
    color = info.get('color','unknown') if info else 'unknown'
    name  = info.get('name', stem)     if info else stem
    temp  = infer_temp(name, color)

    dest_dir  = ORGANIZED / 'by_temperature' / temp
    dest_dir.mkdir(exist_ok=True)
    dest = dest_dir / src.name
    n = 1
    while dest.exists():
        dest = dest_dir / f"{stem}-{n}{src.suffix}"
        n += 1
    shutil.copy2(src, dest)
    print(f"  Copied {stem} -> by_temperature/{temp}/{dest.name}")
    copied += 1

print(f"\nCopied {copied} missing stones into by_temperature")

# ── Final count ───────────────────────────────────────────────────────────────
print("\n=== Final counts ===")
for tree in TREES:
    count = sum(1 for _ in (ORGANIZED / tree).rglob('*')
                if _.is_file() and _.suffix.lower() in ('.jpg','.jpeg','.png','.webp'))
    print(f"  {tree:<25} {count} files")

# Verify
tree_files2 = {}
for tree in TREES:
    tree_files2[tree] = {f.stem for f in (ORGANIZED/tree).rglob('*')
                         if f.is_file() and f.suffix.lower() in ('.jpg','.jpeg','.png','.webp')}

ref = tree_files2['by_color']
still_missing = ref - tree_files2['by_temperature']
print(f"\nStill missing in by_temperature: {len(still_missing)}")
if not still_missing:
    print("  All stone names are fully consistent across every folder.")
