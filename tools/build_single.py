"""Inline every <script src> in index.html into one file: dist/racing.html (the playable page).

Run from the repo root:  python3 tools/pack_assets.py && python3 tools/build_single.py
"""
import pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text()
def inline(m):
    src = (root / m.group(1)).read_text()
    return "<script>\n" + src.replace("</script", "<\\/script") + "\n</script>"
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
(root / "dist").mkdir(exist_ok=True)
(root / "dist" / "racing.html").write_text(html)
print("wrote dist/racing.html", len(html) // 1024, "KB")
