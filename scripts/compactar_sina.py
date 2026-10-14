"""Compacta el monitoreo semanal del SINA (data/raw/presas/*.json, 236 MB) en dos archivos versionables.

El SINA dejó de publicar en abril de 2025, así que esta serie ya no cambia: se compacta una vez y se
guarda en el repositorio para que la actualización automática (que solo baja el SIH) no la necesite.

Salidas:
  data/fuentes/sina_presas.csv.gz   clave,fecha,almacenamiento,namo,name (un renglón por presa y semana)
  data/fuentes/sina_catalogo.json   registro más reciente de cada presa (nombre, estado, uso, coordenadas…)
"""

from __future__ import annotations

import csv
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "presas"
FUENTES = ROOT / "data" / "fuentes"
CAMPOS = ["clavesih", "nombreoficial", "nombrecomun", "estado", "nommunicipio", "regioncna", "latitud", "longitud",
          "uso", "corriente", "inicioop", "namoalmac", "namealmac"]


def main():
    archivos = sorted(RAW.glob("*.json"))
    if not archivos:
        raise SystemExit("No hay data/raw/presas: corre primero scripts/fetch_presas.mjs")
    catalogo = {}
    filas = 0
    with gzip.open(FUENTES / "sina_presas.csv.gz", "wt", newline="", encoding="utf-8", compresslevel=9) as f:
        w = csv.writer(f)
        w.writerow(["clave", "fecha", "almac", "namo", "name"])
        for a in archivos:
            for r in json.loads(a.read_text(encoding="utf-8")):
                if r.get("almacenaactual") is None or not r.get("namoalmac"):
                    continue
                c = " ".join(str(r["clavesih"]).split())
                w.writerow([c, a.stem, r["almacenaactual"], r["namoalmac"], r.get("namealmac") or 0])
                filas += 1
                catalogo[c] = {k: r.get(k) for k in CAMPOS}
    (FUENTES / "sina_catalogo.json").write_text(json.dumps(catalogo, ensure_ascii=False, indent=0), encoding="utf-8")
    tam = (FUENTES / "sina_presas.csv.gz").stat().st_size / 1e6
    print(f"{len(archivos)} semanas, {filas:,} registros, {len(catalogo)} presas → sina_presas.csv.gz ({tam:.1f} MB)")


if __name__ == "__main__":
    main()
