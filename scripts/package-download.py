"""Create the small Windows download after `npm run standalone` (Python 3)."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / "package.json").read_text())["version"].removesuffix(".0")
game = (root / "JOGAR.html").read_bytes()
assert game == (root / "docs/index.html").read_bytes(), "Run npm run standalone first"
assert b'<script type="module">' in game and b'<script src=' not in game
destination = root / "downloads" / f"Patricia_Pilar_Mundo_3D_v{version}.zip"
destination.parent.mkdir(exist_ok=True)
files = {
    "JOGAR.html": game,
    "COMECAR_AQUI.txt": (root / "COMECAR_AQUI.txt").read_bytes(),
    "Exploracoes_Patricia_Pilar.kml": (root / "dados/Exploracoes_Patricia_Pilar.kml").read_bytes(),
}
with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name, body in files.items():
        archive.writestr(name, body)
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert archive.read("JOGAR.html") == game
print(f"Download: {destination.name} ({destination.stat().st_size} bytes)")
print(f"JOGAR.html SHA-256: {hashlib.sha256(game).hexdigest()}")
