import json, re, shutil
from pathlib import Path

BASE    = Path('D:/papa2/papa/app/scratch/stone_catalog')
BY_TEMP = BASE / 'organized' / 'by_temperature'

hmg   = json.loads((BASE / 'hmg_stones.json').read_text(encoding='utf-8'))
marmo = json.loads((BASE / 'marmo_stones.json').read_text(encoding='utf-8'))

TEMP_MAP = {
    'red':'Warm','orange':'Warm','yellow':'Warm','gold':'Warm',
    'brown':'Warm','cream':'Warm','beige':'Warm','pink':'Warm',
    'warm':'Warm','bronze':'Warm','copper':'Warm','amber':'Warm',
    'honey':'Warm','rust':'Warm','terra':'Warm','sand':'Warm',
    'ivory':'Warm','caramel':'Warm','teak':'Warm','sunny':'Warm',
    'blue':'Cool','green':'Cool','grey':'Cool','silver':'Cool',
    'gray':'Cool','teal':'Cool','mint':'Cool','sage':'Cool',
    'aqua':'Cool','azure':'Cool','slate':'Cool','steel':'Cool',
    'white':'Neutral','black':'Neutral','charcoal':'Neutral',
    'onyx':'Neutral','ebony':'Neutral','snow':'Neutral','pearl':'Neutral',
}

def infer_temp(name):
    name_lower = name.lower()
    for keyword, temp in TEMP_MAP.items():
        if keyword in name_lower:
            return temp
    return 'Neutral'  # true fallback — neutral is safest default

def safe(s):
    s = re.sub(r'[^\w\s\-]', '', s.strip())
    return re.sub(r'[\s_]+', '-', s).strip('-').lower()

# Build slug -> stone lookup for unclassified stones
all_stones = [(s, 'hmg') for s in hmg] + [(s, 'marmo') for s in marmo]
unknown = [(s, src) for s, src in all_stones
           if s.get('color','').strip().lower() in ('unknown', '')]

print(f"Unclassified stones to fix: {len(unknown)}")

moved = {'Warm': 0, 'Cool': 0, 'Neutral': 0}

for img in list((BY_TEMP / 'Unclassified').glob('*')):
    if not img.is_file():
        continue
    # Match file back to a stone by slug
    slug = img.stem  # e.g. "aqua-jet-finish"
    match = None
    for s, _ in unknown:
        if safe(s['name']) == slug or safe(s['name']) == re.sub(r'-\d+$', '', slug):
            match = s
            break

    temp = infer_temp(match['name']) if match else 'Neutral'
    dest_dir = BY_TEMP / temp
    dest_dir.mkdir(exist_ok=True)
    dest = dest_dir / img.name
    n = 1
    while dest.exists():
        dest = dest_dir / f"{img.stem}-{n}{img.suffix}"
        n += 1
    shutil.move(str(img), str(dest))
    moved[temp] += 1
    print(f"  [{temp}] {img.name}")

# Remove Unclassified folder
unc = BY_TEMP / 'Unclassified'
if unc.exists() and not any(unc.iterdir()):
    unc.rmdir()
    print("\nRemoved Unclassified/ folder")

print(f"\nDistributed: Warm +{moved['Warm']}  Cool +{moved['Cool']}  Neutral +{moved['Neutral']}")

print("\n=== Final by_temperature ===")
for folder in sorted(BY_TEMP.iterdir()):
    count = len(list(folder.glob('*')))
    print(f"  {folder.name:<12}  {count:>4} stones")
