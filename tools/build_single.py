"""Inline every <script src> into single files: index.html -> dist/racing.html (the game), workshop.html -> dist/workshop.html.

Run from the repo root:  python3 tools/pack_assets.py && python3 tools/build_single.py
"""
import pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
def inline(m):
    src = (root / m.group(1)).read_text()
    return "<script>\n" + src.replace("</script", "<\\/script") + "\n</script>"
(root / "dist").mkdir(exist_ok=True)
for page, out in [("index.html", "racing.html"), ("workshop.html", "workshop.html")]:
    html = re.sub(r'<script src="([^"]+)"></script>', inline, (root / page).read_text())
    (root / "dist" / out).write_text(html)
    print("wrote dist/" + out, len(html) // 1024, "KB")
