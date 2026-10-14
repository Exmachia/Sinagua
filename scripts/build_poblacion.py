"""Población (Censo 2020) que vive sobre cada acuífero.

1. Extrae las localidades con coordenadas del ITER de INEGI → data/interim/localidades.csv
2. (geo) mapshaper asigna cada localidad al acuífero que tiene debajo → data/interim/localidades_acuifero.csv
3. Suma población por acuífero → data/interim/poblacion_acuifero.csv

Las filas "localidades de una/dos viviendas" (sin coordenadas) se reparten entre los acuíferos
del municipio según la superficie (municipios.json).
"""

from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ITER = ROOT / "data" / "raw" / "iter" / "iter_00_cpv2020" / "conjunto_de_datos" / "conjunto_de_datos_iter_00CSV20.csv"
INTERIM = ROOT / "data" / "interim"

DMS = re.compile(r"(\d+)°(\d+)'([\d.]+)\"\s*([NSEW])")


def grados(s: str) -> float | None:
    m = DMS.match(s.strip())
    if not m:
        return None
    g, mi, se, h = m.groups()
    v = int(g) + int(mi) / 60 + float(se) / 3600
    return -v if h in "SW" else v


def main():
    sin_coord = defaultdict(int)  # CVEGEO municipio → población sin coordenadas
    total = 0
    with open(ITER, encoding="utf-8-sig") as f, open(INTERIM / "localidades.csv", "w", newline="") as out:
        w = csv.writer(out)
        w.writerow(["mun", "x", "y", "pob"])
        for r in csv.DictReader(f):
            if r["ENTIDAD"] == "00" or r["MUN"] == "000" or r["LOC"] == "0000":
                continue  # totales nacionales, estatales y municipales
            pob = int(r["POBTOT"]) if r["POBTOT"].isdigit() else 0
            total += pob
            mun = r["ENTIDAD"] + r["MUN"]
            x, y = grados(r["LONGITUD"]), grados(r["LATITUD"])
            if x is None or y is None:
                sin_coord[mun] += pob
            else:
                w.writerow([mun, round(x, 5), round(y, 5), pob])
    print(f"población en localidades: {total:,} · sin coordenadas: {sum(sin_coord.values()):,}")

    subprocess.run([str(ROOT / "node_modules/.bin/mapshaper"), "-quiet",
                    "-i", str(INTERIM / "localidades.csv"), "string-fields=mun",
                    "-points", "x=x", "y=y",
                    "-join", str(ROOT / "data/raw/acuiferos.geojson"), "fields=CLV_ACUI",
                    "-o", str(INTERIM / "localidades_acuifero.csv")], check=True)

    pob = defaultdict(float)
    fuera = 0
    with open(INTERIM / "localidades_acuifero.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("CLV_ACUI"):
                pob[r["CLV_ACUI"]] += int(r["pob"])
            else:
                fuera += int(r["pob"])
    municipios = {m["g"]: m for m in json.loads((ROOT / "public/data/municipios.json").read_text(encoding="utf-8"))}
    for mun, p in sin_coord.items():
        partes = municipios.get(mun, {}).get("a", [])
        suma = sum(x[1] for x in partes) or 1
        for clave, pct in partes:
            pob[clave] += p * pct / suma
    asignada = sum(pob.values())
    print(f"asignada a acuíferos: {asignada:,.0f} ({asignada / total:.1%}) · localidades fuera de todo polígono: {fuera:,}")
    if asignada / total < 0.97:
        sys.exit("menos del 97% de la población quedó asignada: revisar coordenadas")

    with open(INTERIM / "poblacion_acuifero.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["clave", "pob"])
        for c, p in sorted(pob.items()):
            w.writerow([c, round(p)])


if __name__ == "__main__":
    main()
