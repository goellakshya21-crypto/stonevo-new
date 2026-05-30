import shutil
from pathlib import Path

ORGANIZED = Path('D:/papa2/papa/app/scratch/stone_catalog/organized')

moved_type  = 0
moved_color = 0

# ── Fix by_type ───────────────────────────────────────────────────────────────
# Rule: filename starts with the type, e.g. marble-... must live in by_type/Marble/
by_type = ORGANIZED / 'by_type'
for sub in sorted(by_type.iterdir()):
    if not sub.is_dir():
        continue
    folder_type = sub.name.lower()  # e.g. "quartzite"
    for img in list(sub.glob('*')):
        if not img.is_file():
            continue
        # Extract type from filename prefix (first segment before first hyphen)
        stem = img.stem  # e.g. "marble-super-white-white"
        file_type = stem.split('-')[0].lower()  # e.g. "marble"
        if file_type == folder_type:
            continue  # already correct
        # Find or create the correct folder
        correct_dir = by_type / file_type.title()
        correct_dir.mkdir(exist_ok=True)
        dest = correct_dir / img.name
        # Dedup
        counter = 1
        while dest.exists():
            dest = correct_dir / f"{img.stem}-{counter}{img.suffix}"
            counter += 1
        shutil.move(str(img), str(dest))
        print(f"  [type] {sub.name}/{img.name} -> {correct_dir.name}/{dest.name}")
        moved_type += 1

# Remove any empty type dirs left behind
for sub in by_type.iterdir():
    if sub.is_dir() and not any(sub.iterdir()):
        sub.rmdir()

# ── Fix by_color ──────────────────────────────────────────────────────────────
# Rule: filename ends with the color, e.g. ...-white.jpg must live in by_color/White/
by_color = ORGANIZED / 'by_color'
for sub in sorted(by_color.iterdir()):
    if not sub.is_dir():
        continue
    folder_color = sub.name.lower()  # e.g. "quartzite" → "white"
    for img in list(sub.glob('*')):
        if not img.is_file():
            continue
        stem = img.stem  # e.g. "marble-bianco-lava-white"
        parts = stem.split('-')
        file_color = parts[-1].lower() if parts else ''
        # Handle dedup suffixes like -1, -2
        if file_color.isdigit() and len(parts) >= 2:
            file_color = parts[-2].lower()
        if file_color == folder_color:
            continue
        correct_dir = by_color / file_color.title()
        correct_dir.mkdir(exist_ok=True)
        dest = correct_dir / img.name
        counter = 1
        while dest.exists():
            dest = correct_dir / f"{img.stem}-{counter}{img.suffix}"
            counter += 1
        shutil.move(str(img), str(dest))
        print(f"  [color] {sub.name}/{img.name} -> {correct_dir.name}/{dest.name}")
        moved_color += 1

# Remove any empty color dirs left behind
for sub in by_color.iterdir():
    if sub.is_dir() and not any(sub.iterdir()):
        sub.rmdir()

print(f"\nMoved (type mismatches):  {moved_type}")
print(f"Moved (color mismatches): {moved_color}")
print(f"Total corrections:        {moved_type + moved_color}")

# ── Final folder summary ──────────────────────────────────────────────────────
print("\n=== Final by_type ===")
for sub in sorted(by_type.iterdir()):
    count = len(list(sub.glob('*')))
    print(f"  {sub.name:<20} {count:>4} images")

print("\n=== Final by_color ===")
for sub in sorted(by_color.iterdir()):
    count = len(list(sub.glob('*')))
    print(f"  {sub.name:<20} {count:>4} images")
