import re
from pathlib import Path

f = Path('D:/papa2/papa/app/scratch/stone_catalog/combined_catalog.html')
html = f.read_text(encoding='utf-8')

# Remove href URLs from card links (lightbox handles clicks; URLs expose source sites)
html = re.sub(r'<a href="[^"]*" target="_blank" class="card-link">', '<a class="card-link">', html)

# Any remaining stray visible text (shouldn't be any after previous pass, but catch all)
html = re.sub(r'(?<=>)[^<]*(hmg|marmo)[^<]*(?=<)', lambda m: re.sub(r'(?i)hmg|marmo', '', m.group(0)), html, flags=re.IGNORECASE)

# Remove the lightbox JS line that still references 'hmg' in code string
# It now says: card.dataset.source === 'hmg' ? ... - replace that whole expression
html = html.replace(
    "var source = card.dataset.source === 'hmg' ? 'HMG Stones' : 'Marmo Design';",
    ""
)

f.write_text(html, encoding='utf-8')

# Final check — only count text nodes, not attributes/CSS
import html as htmllib
visible = re.findall(r'>([^<]+)<', html)
hits = [v.strip() for v in visible if re.search(r'(?i)\bhmg\b|\bmarmo\b', v)]
print(f"Visible text nodes still containing brand names: {len(hits)}")
for h in hits:
    print(" ", repr(h))

# Also check href attributes specifically
hrefs = re.findall(r'href="([^"]*)"', html)
brand_hrefs = [h for h in hrefs if re.search(r'(?i)hmg|marmo', h)]
print(f"\nhref attributes containing brand names: {len(brand_hrefs)}")
for h in brand_hrefs:
    print(" ", h)

print("\nDone.")
