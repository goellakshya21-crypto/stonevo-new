import re
from pathlib import Path

f = Path('D:/papa2/papa/app/scratch/stone_catalog/combined_catalog.html')
html = f.read_text(encoding='utf-8')

# 1. Title
html = html.replace(
    '<title>Stone Catalog — HMG + Marmo Design</title>',
    '<title>Stone Catalog</title>'
)

# 2. Header pills — remove the whole pills div
html = re.sub(
    r'\s*<div class="header-pills">.*?</div>\s*(?=</header>)',
    '\n',
    html, flags=re.DOTALL
)

# 3. Source filter section — remove the entire Source filter-section block
html = re.sub(
    r'\s*<div class="filter-section">\s*<div class="filter-label">Source</div>.*?</div>\s*</div>\s*(?=<div class="filter-section">)',
    '\n  ',
    html, flags=re.DOTALL
)

# 4. Source badges on every card
html = re.sub(
    r'<span class="source-badge src-(?:hmg|marmo)">[^<]*</span>',
    '',
    html
)

# 5. Lightbox meta — remove the source part from the JS
html = html.replace(
    "  var source = card.dataset.source === 'hmg' ? 'HMG Stones' : 'Marmo Design';\n  lbMeta.textContent = [stone, color, source].filter(Boolean).map(function(s){",
    "  lbMeta.textContent = [stone, color].filter(Boolean).map(function(s){"
)
html = html.replace(
    "  }).join(' · ');",
    "  }).join(' · ');"
)

# 6. Any stray text mentions (just in case)
html = html.replace('HMG Stones', '').replace('Marmo Design', '').replace('HMG', '').replace('Marmo', '')

f.write_text(html, encoding='utf-8')

# Verify
remaining = len(re.findall(r'(?i)hmg|marmo', html))
visible = len(re.findall(r'>([^<]*(?:hmg|marmo)[^<]*)<', html, re.IGNORECASE))
print(f"Remaining pattern matches (CSS classes, data-attrs etc.): {remaining}")
print(f"Visible text mentions remaining: {visible}")
print("Done.")
