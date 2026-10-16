"""Encuadres sin islas lejanas.

El encuadre ("bbox") de un municipio o estado sirve para acercar el mapa. Algunos municipios incluyen islas muy
lejanas (p. ej. Manzanillo y Tecomán, Colima, con las Islas Revillagigedo a más de 600 km), y el mapa se abría hasta el
Pacífico. Aquí se recalcula cada encuadre solo con la parte principal del municipio y lo que está cerca de ella
(a menos de ~1° ≈ 110 km). El estado toma la unión de los encuadres de sus municipios.

Lee la geometría de public/data/mun/<cve>.json y corrige "b" en public/data/municipios.json y public/data/estados.json.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"
CERCA = 1.0  # grados


def partes(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon":
        return geom["coordinates"]
    return []


def caja(anillo):
    xs = [p[0] for p in anillo]
    ys = [p[1] for p in anillo]
    return [min(xs), min(ys), max(xs), max(ys)]


def area(anillo):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(anillo, anillo[1:] + anillo[:1]))) / 2


def distancia(a, b):
    dx = max(0, max(a[0], b[0]) - min(a[2], b[2]))
    dy = max(0, max(a[1], b[1]) - min(a[3], b[3]))
    return (dx * dx + dy * dy) ** 0.5


def union(cajas):
    return [min(c[0] for c in cajas), min(c[1] for c in cajas), max(c[2] for c in cajas), max(c[3] for c in cajas)]


def main():
    encuadre = {}
    for f in sorted((DATA / "mun").glob("*.json")):
        for feat in json.loads(f.read_text(encoding="utf-8"))["features"]:
            ps = [(caja(p[0]), area(p[0])) for p in partes(feat["geometry"]) if p and p[0]]
            if not ps:
                continue
            principal = max(ps, key=lambda x: x[1])[0]
            cerca = [c for c, _ in ps if distancia(c, principal) <= CERCA]
            encuadre[str(feat["properties"].get("CVEGEO") or feat.get("id"))] = [round(v, 3) for v in union(cerca)]

    mun_path = DATA / "municipios.json"
    municipios = json.loads(mun_path.read_text(encoding="utf-8"))
    cambiados = []
    for m in municipios:
        nuevo = encuadre.get(m["g"])
        if nuevo and nuevo != m["b"]:
            if abs(nuevo[0] - m["b"][0]) + abs(nuevo[2] - m["b"][2]) + abs(nuevo[1] - m["b"][1]) + abs(nuevo[3] - m["b"][3]) > 0.5:
                cambiados.append(f"{m['n']} ({m['ent']})")
            m["b"] = nuevo
    mun_path.write_text(json.dumps(municipios, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    est_path = DATA / "estados.json"
    estados = json.loads(est_path.read_text(encoding="utf-8"))
    for e in estados:
        cajas = [m["b"] for m in municipios if m["ent"] == e["cve"]]
        if cajas:
            e["b"] = [round(v, 3) for v in union(cajas)]
    est_path.write_text(json.dumps(estados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"encuadres sin islas lejanas: {len(cambiados)} municipios cambiaron mucho → {', '.join(cambiados)}")


if __name__ == "__main__":
    main()
