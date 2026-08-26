import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET_DIRS = [os.path.join(ROOT, "uploads"), os.path.join(ROOT, "assets")]
QUALITY = 82

report = []

for d in TARGET_DIRS:
    for fname in os.listdir(d):
        fpath = os.path.join(d, fname)
        if not os.path.isfile(fpath):
            continue
        ext = os.path.splitext(fname)[1].lower()
        if ext not in (".png", ".jpg", ".jpeg"):
            continue
        out_name = os.path.splitext(fname)[0] + ".webp"
        out_path = os.path.join(d, out_name)
        try:
            im = Image.open(fpath)
            if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
                im = im.convert("RGBA")
            else:
                im = im.convert("RGB")
            im.save(out_path, "WEBP", quality=QUALITY, method=6)
            orig_size = os.path.getsize(fpath)
            new_size = os.path.getsize(out_path)
            report.append((os.path.relpath(fpath, ROOT), orig_size, new_size))
        except Exception as e:
            report.append((os.path.relpath(fpath, ROOT), -1, str(e)))

total_orig = sum(r[1] for r in report if r[1] > 0)
total_new = sum(r[2] for r in report if r[1] > 0 and isinstance(r[2], int))

print(f"{'file':<55} {'orig KB':>10} {'new KB':>10} {'saved %':>8}")
for name, orig, new in report:
    if orig < 0:
        print(f"{name:<55} ERROR: {new}")
    else:
        pct = 100 * (1 - new / orig)
        print(f"{name:<55} {orig/1024:>10.1f} {new/1024:>10.1f} {pct:>7.1f}%")

print()
print(f"TOTAL: {total_orig/1024/1024:.2f} MB -> {total_new/1024/1024:.2f} MB ({100*(1-total_new/total_orig):.1f}% saved)")
