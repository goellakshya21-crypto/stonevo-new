import json, re
from pathlib import Path
from collections import defaultdict

BASE      = Path('D:/papa2/papa/app/scratch/stone_catalog')
ORGANIZED = BASE / 'organized'

hmg   = json.loads((BASE / 'hmg_stones.json').read_text(encoding='utf-8'))
marmo = json.loads((BASE / 'marmo_stones.json').read_text(encoding='utf-8'))

def safe(s):
    s = re.sub(r'[^\w\s\-]', '', s.strip())
    return re.sub(r'[\s_]+', '-', s).strip('-').lower()

# Expected slug for every stone
expected = {}  # stone_name -> slug
for s in hmg + marmo:
    name = s.get('name','').strip()
    expected[name] = safe(name)

# Collect all files across all organized subfolders
# Map: slug (strip dedup suffix) -> set of actual filenames seen
slug_to_files = defaultdict(set)   # base_slug -> {(folder_tree, actual_filename)}
for img in ORGANIZED.rglob('*'):
    if not img.is_file(): continue
    if img.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'): continue
    stem      = img.stem
    base_slug = re.sub(r'-\d+$', '', stem)  # strip dedup suffix
    tree      = img.parent.parent.name       # by_color / by_type / by_temperature
    slug_to_files[base_slug].add((tree, img.parent.name, img.name))

# Find stones whose actual filename differs from expected slug
mismatches = []
for name, expected_slug in expected.items():
    # Find files for this stone
    files = slug_to_files.get(expected_slug, set())
    if not files:
        continue
    stems = set(re.sub(r'-\d+$','',f[2].rsplit('.',1)[0]) for f in files)
    if len(stems) > 1:
        mismatches.append((name, expected_slug, stems, files))

# Also find any file whose name doesn't match any expected slug
all_expected = set(expected.values())
unknown_files = []
for img in ORGANIZED.rglob('*'):
    if not img.is_file(): continue
    if img.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'): continue
    base = re.sub(r'-\d+$', '', img.stem)
    if base not in all_expected:
        unknown_files.append(img)

print(f"Total stones: {len(expected)}")
print(f"Name mismatches across folders: {len(mismatches)}")
for name, exp, stems, files in mismatches[:10]:
    print(f"  '{name}' -> expected '{exp}' but found: {stems}")

print(f"\nFiles with no matching stone: {len(unknown_files)}")
for f in unknown_files[:10]:
    print(f"  {f.parent.parent.name}/{f.parent.name}/{f.name}")
