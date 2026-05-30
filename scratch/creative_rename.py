"""
creative_rename.py
------------------
Generates new creative, industry-standard stone names for every stone
based on colour, type, and visual descriptors extracted from the existing name.
Then renames every file in the organized/ folder trees.
Also updates the combined_catalog.html display names.
"""

import json, re, csv, shutil
from pathlib import Path
from collections import defaultdict

BASE      = Path('D:/papa2/papa/app/scratch/stone_catalog')
ORGANIZED = BASE / 'organized'
TREES     = ['by_color', 'by_type', 'by_temperature']

hmg   = json.loads((BASE / 'hmg_stones.json').read_text(encoding='utf-8'))
marmo = json.loads((BASE / 'marmo_stones.json').read_text(encoding='utf-8'))

# ── Vocabulary tables ─────────────────────────────────────────────────────────

COLOR_PREFIX = {
    'white':   ['Bianco',  'Crystal',  'Arctic',   'Alpine',   'Polar',    'Snow',     'Pearl',    'Neve',     'Ghiaccio', 'Lunare'],
    'black':   ['Nero',    'Midnight', 'Obsidian', 'Eclipse',  'Carbon',   'Shadow',   'Notturno', 'Ebano',    'Oscuro',   'Abisso'],
    'grey':    ['Grigio',  'Storm',    'Slate',    'Smoke',    'Steel',    'Silver',   'Ash',      'Pietra',   'Ardesia',  'Cenere'],
    'gray':    ['Grigio',  'Storm',    'Slate',    'Smoke',    'Steel',    'Silver',   'Ash',      'Pietra',   'Ardesia',  'Cenere'],
    'beige':   ['Crema',   'Sand',     'Dune',     'Sahara',   'Bisque',   'Buff',     'Cashmere', 'Sabbia',   'Avena',    'Paglia'],
    'cream':   ['Avorio',  'Ivory',    'Vanilla',  'Champagne','Linen',    'Parchment','Almond',   'Burro',    'Mandorla', 'Candido'],
    'brown':   ['Marrone', 'Walnut',   'Mocha',    'Espresso', 'Teak',     'Chestnut', 'Bronze',   'Noce',     'Mogano',   'Castagno'],
    'gold':    ['Dorato',  'Golden',   'Honey',    'Amber',    'Topaz',    'Saffron',  'Solar',    'Aurum',    'Miele',    'Oro'],
    'yellow':  ['Giallo',  'Soleil',   'Sunrise',  'Citrine',  'Limone',   'Zolfo',    'Solare',   'Aureo',    'Ambra',    'Grano'],
    'red':     ['Rosso',   'Crimson',  'Ruby',     'Garnet',   'Bordeaux', 'Scarlet',  'Carmine',  'Rubino',   'Corallo',  'Fiamma'],
    'pink':    ['Rosa',    'Blush',    'Petal',    'Coral',    'Flamingo', 'Blossom',  'Powder',   'Petalo',   'Rosato',   'Fiorino'],
    'green':   ['Verde',   'Emerald',  'Jade',     'Forest',   'Sage',     'Fern',     'Malachite','Smeraldo', 'Bosco',    'Giada'],
    'blue':    ['Azzurro', 'Sapphire', 'Aegean',   'Pacific',  'Cobalt',   'Indigo',   'Lagoon',   'Celeste',  'Marina',   'Oceano'],
    'silver':  ['Argento', 'Platinum', 'Mercury',  'Metallic', 'Chrome',   'Mirror',   'Luster',   'Acciaio',  'Cromo',    'Riflesso'],
    'orange':  ['Arancio', 'Copper',   'Sienna',   'Terra',    'Canyon',   'Rust',     'Ochre',    'Rame',     'Terracotta','Paprica'],
    'purple':  ['Viola',   'Amethyst', 'Lavender', 'Plum',     'Mauve',    'Lilac',    'Iris',     'Ametista', 'Glicine',  'Prugna'],
    'unknown': ['Lusso',   'Elegante', 'Imperial', 'Nobile',   'Regio',    'Classic',  'Prestige', 'Antico',   'Heritage', 'Grand'],
}

TYPE_QUALIFIER = {
    'marble':      ['Venato',    'Magnifico', 'Imperiale', 'Classico', 'Supremo',  'Elegante', 'Brillante', 'Antico',   'Lustro',    'Regale',   'Puro',      'Sontuoso', 'Finissimo',  'Nobile',   'Prezioso'],
    'granite':     ['Peak',      'Ridge',     'Summit',    'Mountain', 'Highland', 'Boulder',  'Massif',    'Bedrock',  'Pinnacle',  'Crest',    'Upland',    'Plateau',  'Tableland',  'Escarp',   'Fastness'],
    'quartzite':   ['Cristallo', 'Gem',       'Prisma',    'Vein',     'Fusion',   'Sparkle',  'Glimmer',   'Facet',    'Radiant',   'Lumina',   'Brillante', 'Fulgente', 'Risplendente','Nitido',  'Scintilla'],
    'onyx':        ['Opalino',   'Glow',      'Radiant',   'Vivid',    'Luminoso', 'Incanto',  'Translux',  'Aurora',   'Opal',      'Nimbus',   'Iridato',   'Splendore','Bagliore',   'Fiamma',  'Candore'],
    'travertine':  ['Romano',    'Antiqua',   'Heritage',  'Villa',    'Rustico',  'Timeless', 'Antico',    'Colosseum','Forum',     'Strata',   'Campestre', 'Arcaico',  'Storico',    'Classico','Imperiale'],
    'sandstone':   ['Desert',    'Dune',      'Canyon',    'Sahara',   'Prairie',  'Mesa',     'Erg',       'Basin',    'Plateau',   'Arroya',   'Steppe',    'Badlands', 'Savanna',    'Pampa',   'Llano'],
    'limestone':   ['Coastal',   'Shoreline', 'Clifftop',  'Crest',    'Seashore', 'Fossil',   'Sediment',  'Stratum',  'Laguna',    'Reef',     'Atoll',     'Scogliera','Riviera',    'Marina',  'Faro'],
    'shellstone':  ['Oceano',    'Coral',     'Tidal',     'Pearl',    'Marine',   'Marea',    'Nautilus',  'Shore',    'Atoll',     'Pelagic',  'Conchiglia','Abisso',   'Sirena',     'Posidonia','Arrecife'],
    'dolomite':    ['Alpine',    'Summit',    'Massif',    'Crestone', 'Crag',     'Pinnacle', 'Aiguille',  'Cirque',   'Moraine',   'Snowfield','Serac',     'Ghiaccio', 'Valanga',    'Vetta',   'Colle'],
    'slate':       ['Cleft',     'Split',     'Stratum',   'Layer',    'Mesa',     'Plateau',  'Shale',     'Escarp',   'Ledge',     'Formation','Lastra',    'Lastrone', 'Scheggia',   'Sfoglia', 'Fronte'],
    'unknown':     ['Lusso',     'Nobile',    'Prestige',  'Grand',    'Elite',    'Prime',    'Opulente',  'Regal',    'Artisan',   'Heritage', 'Raffinato', 'Distinto', 'Esclusivo',  'Pregiato','Eccellente'],
}

# Keyword patterns in existing stone name → inject as qualifier
KEYWORD_MAP = [
    (r'calacatt',          'Calacatta'),
    (r'carrar',            'Carrara'),
    (r'statuari',          'Statuario'),
    (r'emperor|empera',    'Imperiale'),
    (r'arabescato',        'Arabescato'),
    (r'marquina',          'Marquina'),
    (r'botticino',         'Botticino'),
    (r'venato|vein',       'Venato'),
    (r'gold(?!en)|dorato', 'Dorato'),
    (r'silver|argento',    'Argento'),
    (r'onyx',              'Opalino'),
    (r'crystal|cryst',     'Cristallo'),
    (r'royal|regal',       'Regale'),
    (r'imperial',          'Imperiale'),
    (r'snow|blizzard|nive','Niveo'),
    (r'forest|jungle',     'Selvatico'),
    (r'desert|sahara',     'Sahariano'),
    (r'ocean|sea(?!son)|marine','Oceano'),
    (r'storm|thunder',     'Tempesta'),
    (r'mountain|peak|summit','Alpino'),
    (r'river|stream',      'Fluviale'),
    (r'cloud|mist|fog|nebul','Nebuloso'),
    (r'sunset|dusk|tramonto','Tramonto'),
    (r'midnight|night',    'Notturno'),
    (r'sunrise|dawn|aurora','Aurora'),
    (r'smoke|smoky',       'Fumoso'),
    (r'ash(?!ley)',         'Cenere'),
    (r'copper|bronze(?!z)', 'Bronzato'),
    (r'rust|rugg',         'Ruggine'),
    (r'emerald|smerald',   'Smeraldo'),
    (r'sapphire|zaffiro',  'Zaffiro'),
    (r'ruby|rubino',       'Rubino'),
    (r'pearl|perla',       'Perla'),
    (r'lava|vulcan',       'Vulcanico'),
    (r'fossil',            'Fossile'),
    (r'coral|corall',      'Corallo'),
    (r'tiger',             'Tigrato'),
    (r'leopard|panther|maculat','Maculato'),
    (r'wave|ripple|ondulat','Ondulato'),
    (r'exotic|esotico',    'Esotico'),
    (r'classic|classi',    'Classico'),
    (r'super|supreme|supremo','Supremo'),
    (r'pure|puro|purezza',  'Puro'),
    (r'grand|grande',      'Grande'),
    (r'premium|prestig',   'Pregiato'),
    (r'antique|antico',    'Antico'),
    (r'nordic|nord(?!i)',  'Nordico'),
    (r'tundra|arctic|artic','Artico'),
    (r'tropical|tropicale','Tropicale'),
    (r'horizon|orizzonte', 'Orizzonte'),
    (r'infinity|infinito', 'Infinito'),
    (r'galaxy|nebula',     'Galattico'),
    (r'zen|serenity|sereno','Sereno'),
    (r'harmony|armonia',   'Armonia'),
    (r'luna|moon',         'Lunare'),
    (r'solar|sun(?!set)',  'Solare'),
    (r'stella|star(?!t)',  'Stellare'),
    (r'rain|pluvial',      'Pluviale'),
    (r'monsoon|monsone',   'Monsone'),
    (r'volcano|vulcanic',  'Vulcanico'),
    (r'quartz(?!ite)',     'Quarzitico'),
    (r'magma',             'Magmatico'),
    (r'glacier|ghiacciaio','Glaciale'),
    (r'arctic|polo|polari','Polare'),
    (r'bamboo|bambu',      'Bambuseto'),
    (r'teak|mogano',       'Mogano'),
    (r'espresso|caffe',    'Caffe'),
    (r'caramel|caramel',   'Caramello'),
    (r'honey|miele',       'Miele'),
    (r'champagne|chardon', 'Chardon'),
    (r'ivory|avorio',      'Avorio'),
    (r'cream|crema',       'Crema'),
    (r'obsidian|ossidiana','Ossidiana'),
    (r'phantom|fantasma',  'Fantasma'),
]


def safe(s):
    s = re.sub(r'[^\w\s\-]', '', s.strip())
    return re.sub(r'[\s_]+', '-', s).strip('-').lower()


def extract_keyword_descriptor(name):
    name_l = name.lower()
    for pattern, descriptor in KEYWORD_MAP:
        if re.search(pattern, name_l):
            return descriptor
    return None


def pick(lst, idx):
    return lst[idx % len(lst)]


def generate_name(name, color, stone_type, seed):
    color_l = (color or 'unknown').lower()
    type_l  = (stone_type or 'unknown').lower()

    prefixes   = COLOR_PREFIX.get(color_l, COLOR_PREFIX['unknown'])
    qualifiers = TYPE_QUALIFIER.get(type_l,  TYPE_QUALIFIER['unknown'])

    kw = extract_keyword_descriptor(name)

    prefix    = pick(prefixes, seed)
    qualifier = kw if kw else pick(qualifiers, seed)

    return f"{prefix} {qualifier}"


# ── Build stone list ──────────────────────────────────────────────────────────
all_stones = []
for s in hmg:
    all_stones.append({'orig_name': s.get('name',''), 'color': s.get('color','unknown'),
                       'type': s.get('stone','unknown'), 'source': 'hmg',
                       'local_img': s.get('local_img','')})
for s in marmo:
    all_stones.append({'orig_name': s.get('name',''), 'color': s.get('color','unknown'),
                       'type': s.get('stone','unknown'), 'source': 'marmo',
                       'local_img': s.get('local','')})

# ── Generate unique names ─────────────────────────────────────────────────────
used_names = {}    # name -> count
mapping    = []

for i, st in enumerate(all_stones):
    orig  = st['orig_name']
    color = st['color']
    stype = st['type']

    # Try seeds until we get a unique name
    candidate = None
    for attempt in range(60):
        seed = (i + attempt * 13) % 100
        name = generate_name(orig, color, stype, seed)
        if name not in used_names:
            candidate = name
            break

    if candidate is None:
        # Absolute fallback: append Roman numeral
        base = generate_name(orig, color, stype, i % 10)
        romans = ['II','III','IV','V','VI','VII','VIII','IX','X','XI','XII',
                  'XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']
        for r in romans:
            attempt_name = f"{base} {r}"
            if attempt_name not in used_names:
                candidate = attempt_name
                break
        else:
            candidate = f"{base} {i}"   # last resort

    used_names[candidate] = True

    mapping.append({
        'orig_name': orig,
        'new_name':  candidate,
        'old_slug':  safe(orig),
        'new_slug':  safe(candidate),
        'color':     color,
        'type':      stype,
        'source':    st['source'],
        'local_img': st['local_img'],
    })

# ── Save mapping ──────────────────────────────────────────────────────────────
out_json = BASE / 'stone_names_mapping.json'
out_json.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding='utf-8')
print(f"Saved {len(mapping)} names  ({len(used_names)} unique)")

out_csv = BASE / 'stone_names_mapping.csv'
with open(out_csv, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['orig_name','new_name','color','type','source','old_slug','new_slug','local_img'])
    w.writeheader()
    w.writerows(mapping)
print(f"Saved CSV  -> {out_csv}")

# ── Preview by color group ────────────────────────────────────────────────────
print("\n=== Sample names per colour ===")
from collections import defaultdict
by_color = defaultdict(list)
for m in mapping:
    by_color[m['color']].append(m)

for clr in ['white','black','grey','beige','cream','brown','gold','green','blue','red','pink','unknown']:
    stones = by_color.get(clr, [])
    if not stones: continue
    print(f"\n  [{clr.upper()}]")
    for m in stones[:4]:
        print(f"    {m['orig_name']:<38} -> {m['new_name']}")
    if len(stones) > 4:
        print(f"    ... +{len(stones)-4} more")

# ── Rename files in all organized trees ───────────────────────────────────────
print("\n\n=== Renaming files in organized/ folders ===")

# Build lookup: old_slug -> new_slug (without dedup suffix in old)
# Files are currently named like:  bianco-lava.jpg  or  bianco-lava-1.jpg
old_to_new = {}
for m in mapping:
    old_to_new[m['old_slug']] = m['new_slug']

renamed_total = 0
skipped       = 0

for tree in TREES:
    tree_dir = ORGANIZED / tree
    renamed_tree = 0
    for img in sorted(tree_dir.rglob('*')):
        if not img.is_file():
            continue
        if img.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'):
            continue

        stem = img.stem
        # Strip dedup suffix to look up base slug
        base_slug = re.sub(r'-\d+$', '', stem)

        new_base = old_to_new.get(stem) or old_to_new.get(base_slug)
        if not new_base:
            skipped += 1
            continue

        # Re-add dedup suffix if original had one
        dedup_match = re.search(r'-(\d+)$', stem)
        if dedup_match and not re.search(r'-(\d+)$', base_slug):
            new_slug = f"{new_base}-{dedup_match.group(1)}"
        else:
            new_slug = new_base

        new_name = new_slug + img.suffix.lower()
        dest = img.parent / new_name

        if dest == img:
            continue     # already correct
        if dest.exists():
            # name collision: append counter
            n = 1
            while dest.exists():
                dest = img.parent / f"{new_slug}-{n}{img.suffix.lower()}"
                n += 1

        img.rename(dest)
        renamed_tree += 1

    print(f"  {tree:<25} renamed {renamed_tree} files")
    renamed_total += renamed_tree

print(f"\nTotal renamed: {renamed_total}   Skipped (no match): {skipped}")

# ── Final file counts ─────────────────────────────────────────────────────────
print("\n=== Final file counts ===")
for tree in TREES:
    count = sum(1 for f in (ORGANIZED/tree).rglob('*')
                if f.is_file() and f.suffix.lower() in ('.jpg','.jpeg','.png','.webp'))
    print(f"  {tree:<25} {count} files")
