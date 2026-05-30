"""
update_html_names.py
--------------------
Updates combined_catalog.html to show the new creative stone names.
Replaces:
  - <p class="name">Old Name</p>  ->  <p class="name">New Name</p>
  - alt="Old Name"                ->  alt="New Name"
"""

import json, re
from pathlib import Path

BASE      = Path('D:/papa2/papa/app/scratch/stone_catalog')
HTML_PATH = BASE / 'combined_catalog.html'

mapping = json.loads((BASE / 'stone_names_mapping.json').read_text(encoding='utf-8'))

# Build lookup: original name (stripped/normalised) -> new name
# Use exact original name as key (case-insensitive)
orig_to_new = {}
for m in mapping:
    orig_to_new[m['orig_name'].strip().lower()] = m['new_name']

html = HTML_PATH.read_text(encoding='utf-8')
original_html = html

# ── Replace display name inside <p class="name">...</p> ──────────────────────
# Pattern: <p class="name">STONE NAME</p>
def replace_name_tag(match):
    old_name = match.group(1)
    new_name = orig_to_new.get(old_name.strip().lower())
    if new_name:
        return f'<p class="name">{new_name}</p>'
    return match.group(0)

html, n1 = re.subn(
    r'<p class="name">([^<]+)</p>',
    replace_name_tag,
    html
)
print(f"Replaced {n1} name tags")

# ── Replace alt="" text on stone images ──────────────────────────────────────
def replace_alt(match):
    old_alt = match.group(1)
    new_name = orig_to_new.get(old_alt.strip().lower())
    if new_name:
        return f'alt="{new_name}"'
    return match.group(0)

html, n2 = re.subn(
    r'alt="([^"]+)"',
    replace_alt,
    html
)
print(f"Replaced {n2} alt attributes")

# ── Save updated HTML ─────────────────────────────────────────────────────────
HTML_PATH.write_text(html, encoding='utf-8')
print(f"\nSaved updated catalog -> {HTML_PATH}")
print(f"File size: {len(html):,} bytes")

# ── Quick sanity check ───────────────────────────────────────────────────────
cards_after = re.findall(r'<p class="name">([^<]+)</p>', html)
print(f"\nTotal name tags found: {len(cards_after)}")
print("First 10 new display names:")
for n in cards_after[:10]:
    print(f"  {n}")
