import struct, zlib, os
from pathlib import Path

IMG_DIR = Path('D:/papa2/papa/app/scratch/stone_catalog/images_marmo')

def get_dimensions(path):
    try:
        data = path.read_bytes()
        # JPEG
        if data[:2] == b'\xff\xd8':
            i = 2
            while i < len(data):
                if data[i] != 0xff:
                    break
                marker = data[i+1]
                if marker in (0xC0, 0xC2):  # SOF0/SOF2
                    h = struct.unpack('>H', data[i+5:i+7])[0]
                    w = struct.unpack('>H', data[i+7:i+9])[0]
                    return w, h
                length = struct.unpack('>H', data[i+2:i+4])[0]
                i += 2 + length
        # PNG
        elif data[:4] == b'\x89PNG':
            w = struct.unpack('>I', data[16:20])[0]
            h = struct.unpack('>I', data[20:24])[0]
            return w, h
        # WEBP
        elif data[8:12] == b'WEBP':
            if data[12:16] == b'VP8 ':
                w = struct.unpack('<H', data[26:28])[0] & 0x3fff
                h = struct.unpack('<H', data[28:30])[0] & 0x3fff
                return w, h
    except:
        pass
    return None, None

files = sorted(IMG_DIR.glob('*'))
sizes = []
for f in files:
    kb = f.stat().st_size / 1024
    w, h = get_dimensions(f)
    sizes.append((f.name, kb, w, h))

# Summary stats
file_sizes = [s[1] for s in sizes]
widths = [s[2] for s in sizes if s[2]]
heights = [s[3] for s in sizes if s[3]]

print(f"Total images: {len(sizes)}")
print(f"\nFile size: min={min(file_sizes):.0f}KB  avg={sum(file_sizes)/len(file_sizes):.0f}KB  max={max(file_sizes):.0f}KB")
if widths:
    print(f"Width:     min={min(widths)}px  avg={int(sum(widths)/len(widths))}px  max={max(widths)}px")
    print(f"Height:    min={min(heights)}px  avg={int(sum(heights)/len(heights))}px  max={max(heights)}px")

# Show smallest by size
print(f"\n--- 10 smallest by file size ---")
for name, kb, w, h in sorted(sizes, key=lambda x: x[1])[:10]:
    print(f"  {kb:6.0f}KB  {w}x{h}  {name}")

print(f"\n--- 10 largest by file size ---")
for name, kb, w, h in sorted(sizes, key=lambda x: x[1], reverse=True)[:10]:
    print(f"  {kb:6.0f}KB  {w}x{h}  {name}")

# Bucket by resolution
buckets = {'tiny (<500px)':0, 'small (500-999)':0, 'medium (1000-1999)':0, 'large (2000+)':0, 'unknown':0}
for _, _, w, h in sizes:
    if w is None: buckets['unknown'] += 1
    elif w < 500: buckets['tiny (<500px)'] += 1
    elif w < 1000: buckets['small (500-999)'] += 1
    elif w < 2000: buckets['medium (1000-1999)'] += 1
    else: buckets['large (2000+)'] += 1
print(f"\nResolution distribution:")
for k, v in buckets.items():
    print(f"  {k}: {v}")
