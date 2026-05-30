import re
from pathlib import Path
from collections import defaultdict

ORGANIZED = Path('D:/papa2/papa/app/scratch/stone_catalog/organized')
TREES     = ['by_color', 'by_type', 'by_temperature']

# Collect every filename per tree
tree_files = defaultdict(set)   # tree -> set of filenames (no path, no ext)
for tree in TREES:
    for img in (ORGANIZED / tree).rglob('*'):
        if img.is_file() and img.suffix.lower() in ('.jpg','.jpeg','.png','.webp'):
            tree_files[tree].add(img.stem)

# For every unique stone slug, show which trees have it
all_slugs = set()
for slugs in tree_files.values():
    all_slugs.update(slugs)

# Detect inconsistencies: same base stone, different slugs across trees
# Group by stripping trailing dedup suffix AND by not stripping
# We want: same stone → same slug in every tree that contains it

problems = []
for slug in sorted(all_slugs):
    trees_with_slug = [t for t in TREES if slug in tree_files[t]]
    # Check if there's a variant of this slug in some tree but not others
    # e.g. 'bianco-lava' in by_color and by_type but 'bianco-lava' missing in by_temperature
    pass  # first just report what's in each tree

# Simpler: find slugs that appear in some trees but are missing in others
# (meaning the same stone may have been named differently in a missing tree)
print("=== Stones with different names across trees ===")
found_issues = 0

for slug in sorted(all_slugs):
    trees_present = [t for t in TREES if slug in tree_files[t]]
    if len(trees_present) == 0:
        continue

    # Check if this slug exists in all 3 trees
    # (some stones legitimately only appear in some trees if color/type unknown)
    missing = [t for t in TREES if slug not in tree_files[t]]

    # Look for a close variant in missing trees (same base, different dedup number)
    base = re.sub(r'-\d+$', '', slug)
    for t in missing:
        variants = [s for s in tree_files[t] if re.sub(r'-\d+$','',s) == base and s != slug]
        if variants:
            print(f"  MISMATCH: '{slug}' in {trees_present} but '{variants}' in {t}")
            found_issues += 1

if found_issues == 0:
    print("  None found — all stones have identical names across every folder they appear in.")

# Summary counts per tree
print(f"\n=== Files per tree ===")
for tree in TREES:
    print(f"  {tree:<22} {len(tree_files[tree]):>4} unique stone names")

print(f"\n  Total unique stone slugs: {len(all_slugs)}")
