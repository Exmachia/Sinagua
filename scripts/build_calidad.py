"""¿Se puede usar el agua? Calidad del agua en ríos, lagos, presas y pozos (Red Nacional de Medición de
Calidad del Agua de CONAGUA).

Cada sitio de monitoreo tiene un semáforo oficial:
  · Agua superficial: rojo si incumple DBO, DQO, enterococos o toxicidad; amarillo si incumple sólidos,
    oxígeno, coliformes fecales o E. coli; verde si cumple todo.
  · Agua subterránea (pozos): rojo/amarillo según contaminantes como arsénico, flúor, nitratos, metales,
    coliformes o sales.
Se usa el resultado más reciente de cada sitio: 2023 y, para los que no se midieron en 2023, 2021.

OJO: esto mide el agua en su fuente (río, presa, pozo), NO la que sale de la llave.

Entrada: data/raw/abiertos/{Indicadores_de_calidad_del_agua_2023…, Datos_de_calidad_del_agua_de_5000…}.zip
Salida: src/data/calidad.json (resumen nacional) y public/data/calidad.geojson (sitios para el mapa)
"""

from __future__ import annotations

import csv
import io
import json
import sys
import unicodedata
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "abiertos"
FUENTES = [  # más reciente primero
    (RAW / "Indicadores_de_calidad_del_agua_2023_en_1056_sitios_de_monitoreo.zip", 2023),
    (RAW / "Datos_de_calidad_del_agua_de_5000_sitios_de_monitoreo.zip", 2021),
]

# Claves de CONAGUA → qué se encontró, en lenguaje llano
QUE = {
    "CF": "heces", "E_COLI": "heces", "ENTEROC": "heces", "COLI_FEC": "heces",
    "DBO": "aguas negras", "DQO": "aguas negras", "OD_PORC": "aguas negras",
    "SST": "lodo",
    "TOX": "tóxicos", "TOX_D_48": "tóxicos", "TOX_V_15": "tóxicos", "TOX_FIS": "tóxicos",
    "AS": "arsénico", "FLUO": "flúor", "N_NO3": "nitratos",
    "CD": "metales", "CR": "metales", "HG": "metales", "PB": "metales", "MN": "metales", "FE": "metales",
    "DT": "sales", "SDT": "sales", "CONDUC": "sales", "ALC": "sales", "DUR": "sales",
}
SEMAFORO = {"VERDE": "v", "AMARILLO": "a", "ROJO": "r"}
ESTADO_CVE = {}  # nombre normalizado → clave INEGI (se llena con estados.json)


def sin_acentos(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s.upper()) if unicodedata.category(c) != "Mn").strip()


MINUSCULAS = {"De", "Del", "La", "Las", "Los", "El", "Y", "E", "En", "A", "Al"}


def titulo(s: str) -> str:
    """'RIO DE LOS REMEDIOS' → 'Río de los Remedios' (sin inventar acentos: solo minúsculas y conectores)."""
    palabras = s.strip().title().split()
    return " ".join(w.lower() if i and w in MINUSCULAS else w for i, w in enumerate(palabras))


def contaminantes(texto: str) -> list[str]:
    vistos = []
    for c in texto.replace(" ", "").split(","):
        base = c.strip().upper()
        if not base or base == "-":
            continue
        q = QUE.get(base) or next((v for k, v in QUE.items() if base.startswith(k)), None)
        if q and q not in vistos:
            vistos.append(q)
    return vistos


def leer(zp: Path, anio: int):
    z = zipfile.ZipFile(zp)
    for i in z.infolist():
        nombre = i.filename.lower()
        if not nombre.endswith(".csv") or ("indicadores" not in nombre and "datos_de_calidad" not in nombre):
            continue
        tipo = "pozo" if "subterr" in nombre else "superficie"
        texto = z.read(i).decode("latin-1")
        for r in csv.DictReader(io.StringIO(texto)):
            yield tipo, anio, {k.strip(): (v or "").strip() for k, v in r.items() if k}


def main():
    for zp, _ in FUENTES:
        if not zp.exists():
            sys.exit(f"Falta {zp} (corre scripts/fetch_abiertos.sh)")
    estados = json.loads((ROOT / "public" / "data" / "estados.json").read_text(encoding="utf-8"))
    for e in estados:
        ESTADO_CVE[sin_acentos(e["e"])] = e["cve"]
    ESTADO_CVE.update({"MEXICO": "15", "ESTADO DE MEXICO": "15", "CIUDAD DE MEXICO": "09", "DISTRITO FEDERAL": "09",
                       "COAHUILA DE ZARAGOZA": "05", "QUERETARO ARTEAGA": "22", "MICHOACAN DE OCAMPO": "16", "VERACRUZ DE IGNACIO DE LA LLAVE": "30"})

    sitios: dict[str, dict] = {}
    sin_estado = Counter()
    for zp, anio in FUENTES:
        for tipo, anio_, r in leer(zp, anio):
            clave = r.get("CLAVE", "")
            sem = SEMAFORO.get(sin_acentos(r.get("SEMAFORO", "")))
            if not clave or not sem or clave in sitios:
                continue  # ya hay un dato más reciente de este sitio
            try:
                lon, lat = float(r["LONGITUD"]), float(r["LATITUD"])
            except (KeyError, ValueError):
                continue
            cve = ESTADO_CVE.get(sin_acentos(r.get("ESTADO", "")).rstrip("0123456789 "))  # "BAJA CALIFORNIA2"
            if not cve:
                sin_estado[r.get("ESTADO", "")] += 1
                continue
            sitios[clave] = {
                "c": clave, "n": titulo(r.get("SITIO", "")), "cve": cve, "mun": titulo(r.get("MUNICIPIO", "")),
                "cuerpo": titulo(r.get("CUERPO DE AGUA") or r.get("ACUIFERO") or ""),
                "t": tipo, "y": anio_, "presa": "PRESA" in sin_acentos(r.get("SUBTIPO", "")), "s": sem, "q": contaminantes(r.get("CONTAMINANTES", "")),
                "x": round(lon, 5), "yy": round(lat, 5),
            }

    if sin_estado:
        print("  sitios sin estado reconocido:", dict(sin_estado))

    def resumen(lista):
        c = Counter(s["s"] for s in lista)
        q = Counter(x for s in lista for x in s["q"])
        return {"n": len(lista), "r": c["r"], "a": c["a"], "v": c["v"], "q": q.most_common()}

    por_tipo = defaultdict(list)
    por_estado = defaultdict(lambda: defaultdict(list))
    # Presas principales: los sitios de monitoreo dentro de cada presa (a menos de 6 km de su cortina/centro)
    from math import cos, radians, hypot
    presas = json.loads((ROOT / "public" / "data" / "presas.json").read_text(encoding="utf-8"))
    en_presa = defaultdict(list)
    for s in sitios.values():
        if not s["presa"]:
            continue
        cerca = min(((hypot((p["lon"] - s["x"]) * 111 * cos(radians(s["yy"])), (p["lat"] - s["yy"]) * 111), p["c"]) for p in presas
                     if p.get("lat") and p.get("lon")), default=None)
        if cerca and cerca[0] < 6:
            en_presa[cerca[1]].append(s)
    calidad_presas = {}
    for c, l in en_presa.items():
        peor = min(l, key=lambda s: "rav".index(s["s"]))
        q = []
        for x in l:
            q += [y for y in x["q"] if y not in q]
        calidad_presas[c] = {"s": peor["s"], "q": q, "y": max(x["y"] for x in l), "n": len(l)}
    (ROOT / "public" / "data" / "calidad_presas.json").write_text(json.dumps(calidad_presas, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    cp = Counter(v["s"] for v in calidad_presas.values())
    print(f"presas principales con medición: {len(calidad_presas)} · rojo {cp['r']} · amarillo {cp['a']} · verde {cp['v']}")

    for s in sitios.values():
        por_tipo[s["t"]].append(s)
        por_estado[s["cve"]][s["t"]].append(s)

    salida = {
        "presas": {"n": len(calidad_presas), "r": cp["r"], "a": cp["a"], "v": cp["v"]},
        "anios": sorted({s["y"] for s in sitios.values()}),
        "superficie": resumen(por_tipo["superficie"]),
        "pozo": resumen(por_tipo["pozo"]),
        "estados": {cve: {t: resumen(v) for t, v in d.items()} for cve, d in sorted(por_estado.items())},
    }
    (ROOT / "src" / "data" / "calidad.json").write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    geo = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": {"type": "Point", "coordinates": [s["x"], s["yy"]]},
         "properties": {k: (", ".join(v) if k == "q" else v) for k, v in s.items() if k not in ("x", "yy")}}
        for s in sitios.values()]}
    (ROOT / "public" / "data" / "calidad.geojson").write_text(json.dumps(geo, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    for t in ("superficie", "pozo"):
        r = salida[t]
        print(f"{t:10} {r['n']:5} sitios · rojo {r['r'] / r['n'] * 100:4.1f}% · amarillo {r['a'] / r['n'] * 100:4.1f}% · "
              f"verde {r['v'] / r['n'] * 100:4.1f}% · {r['q'][:5]}")
    print(f"años: {salida['anios']} · estados con datos: {len(salida['estados'])}")


if __name__ == "__main__":
    main()
