"""Valida v1/aplicaciones.json contra v1/esquema.json y las reglas que el esquema no expresa.

Uso: python validar.py   (lo corre la CI antes de publicar; requiere `pip install jsonschema`).
"""
import json
import pathlib
import sys

import jsonschema

RAIZ = pathlib.Path(__file__).parent
datos = json.loads((RAIZ / "v1/aplicaciones.json").read_text(encoding="utf-8"))
esquema = json.loads((RAIZ / "v1/esquema.json").read_text(encoding="utf-8"))
errores = []

try:
    jsonschema.validate(datos, esquema, format_checker=jsonschema.FormatChecker())
except jsonschema.ValidationError as e:
    errores.append(f"esquema: {e.message} (en {'/'.join(map(str, e.absolute_path))})")


def luminancia(hex_color):
    canales = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in canales]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


ids, ordenes, urls = set(), set(), set()
for a in datos.get("apps", []):
    for campo, vistos in (("id", ids), ("orden", ordenes), ("url", urls)):
        if a.get(campo) in vistos:
            errores.append(f"{campo} repetido: {a.get(campo)}")
        vistos.add(a.get(campo))
    color = a.get("color", "")
    if len(color) == 7:
        contraste = 1.05 / (luminancia(color) + 0.05)  # texto blanco sobre el color
        if contraste < 4.5:
            errores.append(f"{a.get('id')}: contraste {contraste:.2f}:1 con texto blanco (< 4.5:1); oscurecer {color}")
    if "@" in json.dumps(a):
        errores.append(f"{a.get('id')}: no se listan correos en la lista pública")

if errores:
    print("\n".join("ERROR " + e for e in errores))
    sys.exit(1)
print(f"OK: {len(datos['apps'])} aplicaciones, versión {datos['version']}")
