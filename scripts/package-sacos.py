from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
output = root / 'downloads' / 'Gestao_Sacos_Patricia_Pilar_v1.0.zip'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as z:
    z.write(root / 'SACOS.html', 'SACOS.html')
    z.write(root / 'SACOS_LER_PRIMEIRO.txt', 'LER_PRIMEIRO.txt')
print(f'ZIP: {output.name} ({output.stat().st_size} bytes)')
