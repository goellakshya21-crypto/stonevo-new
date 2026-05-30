import re, shutil
from pathlib import Path
from collections import defaultdict

ORGANIZED = Path('D:/papa2/papa/app/scratch/stone_catalog/organized')
TREES     = ['by_color', 'by_type', 'by_temperature']

# The 3 mismatches found: slug in by_color/by_type vs slug in by_temperature
# Strategy: by_color and by_type used careful dedup — treat them as authoritative.
# Find every slug that exists in by_color or by_type, find its base,
# then make sure by_temperature uses the exact same slug.

# Build: base_slug -> canonical slug (from by_color/by_type)
canonical = {}  # base -> canonical slug
for tree in ['by_color', 'by_type']:
    for img in (ORGANIZED / tree).rglob('*'):
        if not img.is_file(): continue
        if img.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'): continue
        slug = img.stem
        base = re.sub(r'-\d+$', '', slug)
        # If multiple exist (e.g. copenhagen and copenhagen-1), keep track of all
        canonical.setdefault(base, set()).add(slug)

# For by_temperature: find any file whose slug doesn't match canonical
fixed = 0
for img in sorted((ORGANIZED / 'by_temperature').rglob('*')):
    if not img.is_file(): continue
    if img.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'): continue

    slug = img.stem
    base = re.sub(r'-\d+$', '', slug)
    canon_slugs = canonical.get(base, set())

    if not canon_slugs or slug in canon_slugs:
        continue  # already correct or not in other trees (fine)

    # Find which canonical slug this should be
    # Pick the one not already present in by_temperature
    existing_in_temp = {f.stem for f in img.parent.glob('*') if f.is_file()}
    for canon in sorted(canon_slugs):
        if canon not in existing_in_temp:
            new_path = img.parent / (canon + img.suffix.lower())
            img.rename(new_path)
            print(f"  Fixed: by_temperature/{img.parent.name}/{slug}{img.suffix} -> {canon}{img.suffix}")
            fixed += 1
            break

print(f"\nTotal fixed: {fixed}")

# Re-run verification
print("\n=== Re-checking consistency ===")
tree_files = defaultdict(set)
for tree in TREES:
    for img in (ORGANIZED / tree).rglob('*'):
        if img.is_file() and img.suffix.lower() in ('.jpg','.jpeg','.png','.webp'):
            tree_files[tree].add(img.stem)

all_slugs = set()
for slugs in tree_files.values(): all_slugs.update(slugs)

problems = 0
for slug in sorted(all_slugs):
    base = re.sub(r'-\d+$', '', slug)
    for t in TREES:
        variants = [s for s in tree_files[t] if re.sub(r'-\d+$','',s) == base and s != slug]
        if variants and slug in tree_files[t]:
            print(f"  MISMATCH: '{slug}' vs '{variants}' in {t}")
            problems += 1

if problems == 0:
    print("  All stone names are fully consistent across every folder.")
