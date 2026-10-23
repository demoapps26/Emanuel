"""Package the standalone interactive map; only developers need Python 3."""
from pathlib import Path
import hashlib
import zipfile

root = Path(__file__).resolve().parent.parent
html = (root / "MAPA.html").read_bytes()
assert html == (root / "docs/mapa.html").read_bytes()
assert b'<script type="module">' in html
destination = root / "downloads/Mapa_Exploracoes_Patricia_Pilar_v1.1.zip"
destination.parent.mkdir(exist_ok=True)
files = {
    "MAPA.html": html,
    "LER_PRIMEIRO.txt": (root / "MAPA_LER_PRIMEIRO.txt").read_bytes(),
    "Exploracoes_Patricia_Pilar.kml": (root / "dados/Exploracoes_Patricia_Pilar.kml").read_bytes(),
    "Exploracoes_Patricia_Pilar.geojson": (root / "dados/Exploracoes_Patricia_Pilar.geojson").read_bytes(),
}
with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name, content in files.items():
        archive.writestr(name, content)
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert archive.read("MAPA.html") == html
print(f"Mapa para transferir: {destination.name} ({destination.stat().st_size} bytes)")
print(f"MAPA.html SHA-256: {hashlib.sha256(html).hexdigest()}")
