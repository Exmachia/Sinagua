"""Construye los datos del sitio a partir de data/raw.

Salidas:
  public/data/acuiferos.json  atributos + historia por acuífero (lo consume el cliente)
  public/data/municipios.json acuíferos bajo cada municipio (% de su superficie)
  public/data/estados.json    estados INEGI con sus acuíferos
  src/data/resumen.json       cifras nacionales y por estado (render en servidor)
  data/interim/*.csv          atributos que geo_post.sh une a la geometría

Definiciones (NOM-011-CONAGUA-2015):
  R    recarga media anual
  DNC  descarga natural comprometida
  VEAS volumen de extracción de aguas subterráneas concesionado/asignado
  DMA  disponibilidad media anual = R - DNC - VEAS     (hm³/año)
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
INTERIM = ROOT / "data" / "interim"

# Año de publicación en el DOF → año de referencia
DOF_YEARS = [2013, 2015, 2018, 2020]
LATEST_YEAR = 2023

MINOR = {"de", "del", "la", "las", "el", "los", "y", "e", "en", "a", "al"}
UPPER = {"II", "III", "IV", "SLP"}


def nice(name: str) -> str:
    """'VALLE DE AGUASCALIENTES' → 'Valle de Aguascalientes'."""
    name = re.sub(r"\s*-\s*", "-", " ".join(name.split()))
    out = []
    for i, word in enumerate(name.split(" ")):
        parts = []
        for p in word.split("-"):
            low = p.lower()
            if p in UPPER:
                parts.append(p)
            elif i > 0 and low in MINOR:
                parts.append(low)
            else:
                parts.append(low[:1].upper() + low[1:])
        out.append("-".join(parts))
    return " ".join(out).replace("Cd.", "Cd.")


def num(s: str) -> float:
    s = s.replace(" ", "").replace(",", "")
    return float(s) if s not in ("", "-") else 0.0


class Rows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        elif tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)


def parse_dof(year: int) -> dict:
    """Devuelve {clave: {r, dnc, veas, dma, ext?}} de una publicación del DOF."""
    p = Rows()
    p.feed((RAW / "dof" / f"{year}.html").read_text(encoding="utf-8", errors="ignore"))
    out = {}
    for row in p.rows:
        # En 2018/2020 algunas filas traen región y entidad antes de la clave.
        idx = next((i for i, c in enumerate(row[:3]) if re.fullmatch(r"\d{4}", c)), None)
        if idx is None:
            continue
        v = row[idx:]
        clave = v[0]
        if year <= 2015:
            # CLAVE ACUÍFERO R DNCOM VCAS VEXTET DAS DÉFICIT
            if len(v) < 8:
                continue
            r, dnc, veas, ext = num(v[2]), num(v[3]), num(v[4]), num(v[5])
            dma = num(v[6]) + num(v[7])
            out[clave] = {"r": r, "dnc": dnc, "veas": veas, "dma": dma, "ext": ext}
        else:
            # CLAVE ACUÍFERO R DNC VCAS VEALA VAPTYR VAPRH DMA(+) DMA(-)
            if len(v) < 10:
                continue
            r, dnc = num(v[2]), num(v[3])
            veas = sum(num(x) for x in v[4:8])
            dma = num(v[8]) + num(v[9])
            out[clave] = {"r": r, "dnc": dnc, "veas": veas, "dma": dma}
    if len(out) < 600:
        sys.exit(f"DOF {year}: solo {len(out)} acuíferos — revisar el parser")
    return out


def status(r: float, dnc: float, veas: float, dma: float) -> tuple[str, float | None]:
    """Clasifica por presión = VEAS / (R − DNC): cuánto se concesiona de lo que se renueva."""
    renovable = r - dnc
    presion = veas / renovable if renovable > 0 else None
    if dma < 0:
        severo = presion is None or presion >= 1.5
        return ("critico" if severo else "deficit"), presion
    if presion is not None and presion >= 0.6:
        return "limite", presion
    return "disponible", presion


def bboxes() -> dict:
    """Caja envolvente por acuífero (para hacer zoom sin descargar la geometría)."""
    geo = json.loads((RAW / "acuiferos.geojson").read_text(encoding="utf-8"))
    out = {}
    for f in geo["features"]:
        xs, ys = [], []

        def walk(c):
            if isinstance(c[0], (int, float)):
                xs.append(c[0])
                ys.append(c[1])
            else:
                for x in c:
                    walk(x)

        walk(f["geometry"]["coordinates"])
        out[f["properties"]["CLV_ACUI"]] = [round(min(xs), 3), round(min(ys), 3),
                                            round(max(xs), 3), round(max(ys), 3)]
    return out


def main():
    latest = json.loads((RAW / "acuiferos_2023.json").read_text(encoding="utf-8"))
    history = {y: parse_dof(y) for y in DOF_YEARS}
    boxes = bboxes()

    acuiferos = []
    for estado, clave, nombre, r, dnc, veas, dma, pdf in latest:
        r, dnc, veas, dma = float(r), float(dnc), float(veas), float(dma)
        s, presion = status(r, dnc, veas, dma)
        h = [
            [y, round(history[y][clave]["dma"], 2), round(history[y][clave]["veas"], 2)]
            for y in DOF_YEARS
            if clave in history[y]
        ]
        h.append([LATEST_YEAR, round(dma, 2), round(veas, 2)])
        ext = history[2015].get(clave, {}).get("ext")
        acuiferos.append({
            "c": clave,
            "n": nice(nombre),
            "e": nice(estado),
            "r": round(r, 2),
            "dnc": round(dnc, 2),
            "veas": round(veas, 2),
            "dma": round(dma, 2),
            "p": round(presion, 3) if presion is not None else None,
            "s": s,
            "ext15": round(ext, 2) if ext is not None else None,
            "h": h,
            "b": boxes[clave],
            "pdf": pdf,
        })

    DEF = ("deficit", "critico")
    by_clave = {a["c"]: a for a in acuiferos}

    # --- municipios × acuíferos (superficie del municipio que cae sobre cada acuífero)
    mun = {}
    with open(INTERIM / "municipios.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            mun[r["CVEGEO"]] = {
                "g": r["CVEGEO"], "n": r["NOMGEO"], "ent": r["CVE_ENT"], "nom_ent": r["NOM_ENT"],
                "km2": float(r["km2"]),
                "b": [round(float(r[k]), 3) for k in ("w", "s", "e", "n")],
            }
    cruce = defaultdict(float)
    with open(INTERIM / "cruce.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            cruce[(r["CVEGEO"], r["CLV_ACUI"])] += float(r["km2"])

    por_mun = defaultdict(list)
    for (g, c), km2 in cruce.items():
        if g in mun and c in by_clave:
            por_mun[g].append((c, km2))

    municipios = []
    for g, m in sorted(mun.items()):
        partes = sorted(por_mun[g], key=lambda x: -x[1])
        total = sum(k for _, k in partes) or m["km2"]
        # Se ignoran astillas de borde (< 1% del municipio y < 2 km²).
        sobre = [(c, k / total) for c, k in partes if k / total >= 0.01 or k >= 2]
        pct_def = sum(k for c, k in partes if by_clave[c]["s"] in DEF) / total
        m["pct"] = round(pct_def * 100, 1)
        m["a"] = [[c, round(f * 100, 1)] for c, f in sobre]
        municipios.append(m)

    # --- estados (INEGI): % del territorio sobre acuíferos en déficit
    CORTO = {
        "Coahuila de Zaragoza": "Coahuila", "Michoacán de Ocampo": "Michoacán",
        "Veracruz de Ignacio de la Llave": "Veracruz", "México": "Estado de México",
    }
    ent = defaultdict(lambda: {"km2": 0.0, "def": 0.0, "acu": defaultdict(float), "b": [180, 90, -180, -90]})
    for m in municipios:
        e = ent[m["ent"]]
        e["nombre"] = CORTO.get(m["nom_ent"], m["nom_ent"])
        e["km2"] += m["km2"]
        e["def"] += m["km2"] * m["pct"] / 100
        e["b"] = [min(e["b"][0], m["b"][0]), min(e["b"][1], m["b"][1]),
                  max(e["b"][2], m["b"][2]), max(e["b"][3], m["b"][3])]
    for (g, c), km2 in cruce.items():
        if g in mun and c in by_clave:
            ent[mun[g]["ent"]]["acu"][c] += km2

    estados = []
    for cve, e in sorted(ent.items()):
        # Un acuífero "está" en el estado si al menos 5 km² de su superficie cae ahí.
        claves = [c for c, k in e["acu"].items() if k >= 5]
        items = [by_clave[c] for c in claves]
        estados.append({
            "cve": cve,
            "e": e["nombre"],
            "slug": re.sub(r"[^a-z0-9]+", "-", unicode_slug(e["nombre"])).strip("-"),
            "pct": round(e["def"] / e["km2"] * 100, 1),
            "km2": round(e["km2"]),
            "total": len(items),
            "deficit": sum(1 for a in items if a["s"] in DEF),
            "critico": sum(1 for a in items if a["s"] == "critico"),
            "hm3": round(-sum(a["dma"] for a in items if a["s"] in DEF), 1),
            "b": [round(x, 3) for x in e["b"]],
            "a": sorted(claves),
        })
    for a in acuiferos:
        a["st"] = [e["cve"] for e in estados if a["c"] in e["a"]]

    # --- resumen nacional
    counts = defaultdict(int)
    for a in acuiferos:
        counts[a["s"]] += 1
    en_deficit = [a for a in acuiferos if a["s"] in DEF]
    deficit_total = round(-sum(a["dma"] for a in en_deficit), 1)
    km2_mx = sum(m["km2"] for m in municipios)
    km2_def = sum(m["km2"] * m["pct"] / 100 for m in municipios)

    serie = []
    for y in DOF_YEARS:
        vals = history[y].values()
        serie.append({"y": y, "deficit": sum(1 for v in vals if v["dma"] < 0),
                      "hm3": round(-sum(v["dma"] for v in vals if v["dma"] < 0))})
    serie.append({"y": LATEST_YEAR, "deficit": len(en_deficit), "hm3": round(deficit_total)})

    resumen = {
        "anio": LATEST_YEAR,
        "total": len(acuiferos),
        "conteo": dict(counts),
        "deficit": len(en_deficit),
        "hm3Deficit": deficit_total,
        "pctTerritorio": round(km2_def / km2_mx * 100, 1),
        "municipios": len(municipios),
        "municipiosMayoria": sum(1 for m in municipios if m["pct"] >= 50),
        "serie": serie,
        "estados": [{k: v for k, v in e.items() if k != "a"} for e in estados],
    }

    # --- escritura
    pub = ROOT / "public" / "data"
    (pub / "acuiferos.json").write_text(
        json.dumps(acuiferos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (pub / "municipios.json").write_text(json.dumps(
        [{"g": m["g"], "n": m["n"], "ent": m["ent"], "pct": m["pct"], "a": m["a"], "b": m["b"]} for m in municipios],
        ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (pub / "estados.json").write_text(
        json.dumps(estados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (ROOT / "src" / "data" / "resumen.json").write_text(
        json.dumps(resumen, ensure_ascii=False, indent=1), encoding="utf-8")

    puntos = {}
    with open(INTERIM / "puntos.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            puntos[r["CLV_ACUI"]] = (r["x"], r["y"])

    def write_csv(name, header, rows):
        with open(INTERIM / name, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)
            w.writerows(rows)

    write_csv("acuiferos_props.csv", ["clave", "s"], [[a["c"], a["s"]] for a in acuiferos])
    write_csv("estados_props.csv", ["cve", "nombre", "pct"], [[e["cve"], e["e"], e["pct"]] for e in estados])
    write_csv("municipios_props.csv", ["g", "pct"], [[m["g"], m["pct"]] for m in municipios])
    write_csv("burbujas.csv", ["clave", "n", "s", "x", "y"],
              [[a["c"], a["n"], a["s"], *puntos[a["c"]]] for a in acuiferos])

    print(f"{len(acuiferos)} acuíferos · {len(en_deficit)} en déficit · {deficit_total} hm³/año")
    print(f"{len(municipios)} municipios · {resumen['pctTerritorio']}% del territorio sobre acuíferos en déficit")
    print("estados:", [(e["e"], e["pct"], e["total"]) for e in sorted(estados, key=lambda e: -e["pct"])[:6]])


def unicode_slug(s: str) -> str:
    import unicodedata
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()


if __name__ == "__main__":
    main()
