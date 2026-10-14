"""Indicadores nacionales de falta de agua para la landing.

1. Sequía (SMN, Monitor de Sequía de México, por municipio y quincena desde 2003) cruzada con la población
   del Censo 2020 por municipio → personas viviendo en sequía en cada quincena.
2. Agua renovable por persona (CONAGUA vía SEMARNAT, data/fuentes/agua_renovable.csv) y población de los
   estados por debajo de los umbrales internacionales de Falkenmark:
     < 1,700 m³/hab/año = estrés hídrico · < 1,000 = escasez · < 500 = escasez absoluta.

Salida: src/data/agua.json
"""

from __future__ import annotations

import csv
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
ITER = RAW / "iter" / "iter_00_cpv2020" / "conjunto_de_datos" / "conjunto_de_datos_iter_00CSV20.csv"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NOMBRE_CORTO = {"Coahuila de Zaragoza": "Coahuila", "Michoacán de Ocampo": "Michoacán",
                "Veracruz de Ignacio de la Llave": "Veracruz", "México": "Estado de México"}


def poblacion():
    """Población 2020 por municipio (CVEGEO) y por estado (nombre corto).

    Se toma de data/fuentes/poblacion_2020.csv (versionado). Si no existe, se genera a partir de los renglones
    de totales del ITER de INEGI (data/raw/iter), que solo hace falta la primera vez.
    """
    compacto = ROOT / "data" / "fuentes" / "poblacion_2020.csv"
    if not compacto.exists():
        with open(ITER, encoding="utf-8-sig") as f, open(compacto, "w", newline="", encoding="utf-8") as out:
            w = csv.writer(out)
            w.writerow(["clave", "nombre", "pob"])  # clave de 2 dígitos = estado, de 5 = municipio
            for r in csv.DictReader(f):
                if r["LOC"] != "0000" or r["ENTIDAD"] == "00":
                    continue
                if r["MUN"] == "000":
                    w.writerow([r["ENTIDAD"], NOMBRE_CORTO.get(r["NOM_ENT"], r["NOM_ENT"]), r["POBTOT"]])
                else:
                    w.writerow([r["ENTIDAD"] + r["MUN"], r["NOM_MUN"], r["POBTOT"]])
    mun, ent = {}, {}
    with open(compacto, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if len(r["clave"]) == 2:
                ent[r["nombre"]] = int(r["pob"])
            else:
                mun[r["clave"]] = int(r["pob"])
    return mun, ent


def col(ref: str) -> int:
    """'AB12' → índice de columna (base 0)."""
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def sequia(pob_mun: dict[str, int]):
    z = zipfile.ZipFile(RAW / "sequia" / "MunicipiosSequia.xlsx")
    compartidas = ["".join(t.itertext()) for t in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)]
    filas = ET.fromstring(z.read("xl/worksheets/sheet1.xml")).find("m:sheetData", NS).findall("m:row", NS)

    def valores(fila):
        out = {}
        for c in fila.findall("m:c", NS):
            v = c.find("m:v", NS)
            if v is not None:
                out[col(c.get("r"))] = compartidas[int(v.text)] if c.get("t") == "s" else v.text
        return out

    cab = valores(filas[0])
    fechas = {i: (date(1899, 12, 30) + timedelta(days=int(float(v)))).isoformat()
              for i, v in cab.items() if re.fullmatch(r"\d+(\.0)?", str(v))}
    total = sum(pob_mun.values())
    en_sequia = defaultdict(int)   # D1–D4
    severa = defaultdict(int)      # D2–D4
    munis = defaultdict(int)
    sin_pob = 0
    for fila in filas[1:]:
        v = valores(fila)
        clave = str(v.get(0, "")).zfill(5)
        p = pob_mun.get(clave)
        if p is None:
            sin_pob += 1
            continue
        for i, f in fechas.items():
            cat = str(v.get(i, "")).strip()
            if cat in ("D1", "D2", "D3", "D4"):
                en_sequia[f] += p
                munis[f] += 1
                if cat != "D1":
                    severa[f] += p
    serie = [{"f": f, "pct": round(en_sequia[f] / total * 100, 1), "severa": round(severa[f] / total * 100, 1),
              "municipios": munis[f]} for f in sorted(fechas.values())]
    print(f"sequía: {len(serie)} quincenas {serie[0]['f']} → {serie[-1]['f']} · municipios sin población: {sin_pob}")
    return serie, total


def main():
    pob_mun, pob_ent = poblacion()
    serie, total = sequia(pob_mun)
    actual = serie[-1]
    peor = max(serie, key=lambda s: s["pct"])
    por_anio = defaultdict(list)
    for s in serie:
        por_anio[int(s["f"][:4])].append(s["pct"])
    # Años en que, en algún momento, más de la mitad del país vivió en sequía.
    anios_mitad = [a for a, v in sorted(por_anio.items()) if max(v) >= 50]

    renovable = defaultdict(dict)
    with open(ROOT / "data" / "fuentes" / "agua_renovable.csv", encoding="utf-8") as f:
        for r in csv.DictReader(l for l in f if not l.startswith("#")):
            renovable[r["ambito"]][int(r["anio"])] = int(r["m3_hab"])
    nacional = sorted(renovable.pop("Nacional").items())
    estados = [{"e": e, "m3": v[2019], "pob": pob_ent[e]} for e, v in renovable.items()]
    pob_total = sum(pob_ent.values())

    def bajo(umbral):
        return round(sum(x["pob"] for x in estados if x["m3"] < umbral) / pob_total * 100, 1)

    out = {
        "poblacion": pob_total,
        "sequia": {
            "actual": actual,
            "personas": round(actual["pct"] / 100 * total),
            "peor": peor,
            "aniosMitad": anios_mitad,
            # serie mensual (la primera quincena de cada mes) para graficar sin cargar 500 puntos
            "serie": [s for i, s in enumerate(serie) if i == len(serie) - 1 or s["f"][:7] != serie[i + 1]["f"][:7]],
        },
        "aguaPorPersona": {
            "nacional": [{"y": y, "m3": v} for y, v in nacional],
            "estados": sorted(estados, key=lambda x: x["m3"]),
            "umbrales": {"estres": 1700, "escasez": 1000, "absoluta": 500},
            "pctEstres": bajo(1700),
            "pctEscasez": bajo(1000),
            "pctAbsoluta": bajo(500),
        },
    }
    # Protección: nunca reemplazar con un monitor de sequía más viejo (p. ej. si falló la descarga).
    previo = ROOT / "src" / "data" / "agua.json"
    if previo.exists():
        anterior = json.loads(previo.read_text(encoding="utf-8"))["sequia"]["actual"]["f"]
        if actual["f"] < anterior:
            raise SystemExit(f"ABORTADO: el monitor de sequía ({actual['f']}) es anterior al publicado ({anterior}). "
                             "No se escribió nada.")
    (ROOT / "src" / "data" / "agua.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    a = out["aguaPorPersona"]
    print(f"hoy ({actual['f']}): {actual['pct']}% de la población en sequía ({out['sequia']['personas'] / 1e6:.1f} M), "
          f"{actual['municipios']} municipios · severa o peor: {actual['severa']}%")
    print(f"peor momento: {peor['f']} con {peor['pct']}% · años con más de la mitad en sequía: {anios_mitad}")
    print(f"agua por persona: {nacional[0]} → {nacional[-1]} · población en estados con estrés {a['pctEstres']}%, "
          f"escasez {a['pctEscasez']}%, escasez absoluta {a['pctAbsoluta']}%")


if __name__ == "__main__":
    main()
