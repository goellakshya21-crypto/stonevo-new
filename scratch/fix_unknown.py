import shutil
from pathlib import Path

ORGANIZED = Path('D:/papa2/papa/app/scratch/stone_catalog/organized')

# by_type: move Unknown/mildew-algae.jpg -> Marble/marble-mildew-algae-green.jpg
src_t = ORGANIZED / 'by_type' / 'Unknown' / 'mildew-algae.jpg'
dst_t = ORGANIZED / 'by_type' / 'Marble' / 'marble-mildew-algae-green.jpg'
if src_t.exists():
    shutil.move(str(src_t), str(dst_t))
    print('Moved to Marble:', dst_t.name)
unknown_t = ORGANIZED / 'by_type' / 'Unknown'
if unknown_t.exists() and not any(unknown_t.iterdir()):
    unknown_t.rmdir()
    print('Removed by_type/Unknown/')

# by_color: move Unknown/mildew-algae.jpg -> Green/marble-mildew-algae-green.jpg
src_c = ORGANIZED / 'by_color' / 'Unknown' / 'mildew-algae.jpg'
dst_c = ORGANIZED / 'by_color' / 'Green' / 'marble-mildew-algae-green.jpg'
if src_c.exists():
    shutil.move(str(src_c), str(dst_c))
    print('Moved to Green:', dst_c.name)
unknown_c = ORGANIZED / 'by_color' / 'Unknown'
if unknown_c.exists() and not any(unknown_c.iterdir()):
    unknown_c.rmdir()
    print('Removed by_color/Unknown/')

print('\nFinal by_type:')
for f in sorted((ORGANIZED / 'by_type').iterdir()):
    n = len(list(f.glob('*')))
    print(f'  {f.name:20}  {n:4} images')

print('\nFinal by_color:')
for f in sorted((ORGANIZED / 'by_color').iterdir()):
    n = len(list(f.glob('*')))
    print(f'  {f.name:20}  {n:4} images')
