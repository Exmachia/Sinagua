"""Proyección "si seguimos así" para los acuíferos.

Con las 5 publicaciones oficiales (2013, 2015, 2018, 2020, 2023) calcula, por año:
  - acuíferos en déficit,
  - % del territorio sobre acuíferos en déficit,
  - personas (Censo 2020) que viven sobre acuíferos en déficit,
y ajusta una recta por mínimos cuadrados con intervalo de predicción del 95% (t de Student, n−2 g.l.).

La proyección es un escenario de continuidad, no un pronóstico: supone que el ritmo de los
últimos 10 años se mantiene. Entrada: public/data/acuiferos.json, data/interim/{cruce,poblacion_acuifero}.csv
Salida: src/data/proyecciones.json
"""

from __future__ import annotations

import csv
import json
import statistics
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INTERIM = ROOT / "data" / "interim"
HASTA = 2060
POB_OFICIAL = 126_014_024  # INEGI, Censo 2020
T95 = {3: 3.182, 4: 2.776, 5: 2.571}  # t de Student a dos colas, 95%


def ajuste(xs: list[float], ys: list[float]):
    n = len(xs)
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    a = my - b * mx
    s = (sum((y - (a + b * x)) ** 2 for x, y in zip(xs, ys)) / (n - 2)) ** 0.5
    t = T95[n - 2]

    def pred(x: float) -> tuple[float, float, float]:
        e = t * s * (1 + 1 / n + (x - mx) ** 2 / sxx) ** 0.5
        y = a + b * x
        return y, y - e, y + e

    r2 = 1 - sum((y - (a + b * x)) ** 2 for x, y in zip(xs, ys)) / sum((y - my) ** 2 for y in ys)
    return a, b, r2, pred


def cruce_anio(a: float, b: float, meta: float) -> float | None:
    return (meta - a) / b if b > 0 else None


def main():
    acuiferos = json.loads((ROOT / "public/data/acuiferos.json").read_text(encoding="utf-8"))
    area = defaultdict(float)
    with open(INTERIM / "cruce.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            area[r["CLV_ACUI"]] += float(r["km2"])
    pob = {}
    with open(INTERIM / "poblacion_acuifero.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            pob[r["clave"]] = int(r["pob"])
    area_total = sum(area.values())
    pob_total = sum(pob.values())

    anios = sorted({h[0] for a in acuiferos for h in a["h"]})
    serie = []
    for y in anios:
        en_deficit = [a for a in acuiferos if any(h[0] == y and h[1] < 0 for h in a["h"])]
        # En 2023 se usa el estatus del sitio (dma con todos los decimales).
        if y == max(anios):
            en_deficit = [a for a in acuiferos if a["s"] in ("deficit", "critico")]
        serie.append({
            "y": y,
            "acuiferos": len(en_deficit),
            "territorio": round(sum(area[a["c"]] for a in en_deficit) / area_total * 100, 1),
            # Escalada al total oficial del censo (la suma por localidades difiere ~0.3%).
            "personas": round(sum(pob.get(a["c"], 0) for a in en_deficit) / pob_total * POB_OFICIAL),
        })

    total = len(acuiferos)
    xs = [s["y"] for s in serie]
    out = {"total": total, "poblacion": POB_OFICIAL, "serie": serie, "proyecciones": {}}
    for campo, tope, metas in (
        ("acuiferos", total, {"mitad": total * 0.5, "tresCuartos": total * 0.75, "todos": total}),
        ("territorio", 100, {"mitad": 50, "tresCuartos": 75}),
        ("personas", POB_OFICIAL, {"mitad": POB_OFICIAL * 0.5, "tresCuartos": POB_OFICIAL * 0.75}),
    ):
        ys = [s[campo] for s in serie]
        a, b, r2, pred = ajuste(xs, ys)
        curva = []
        for y in range(xs[0], HASTA + 1):
            c, lo, hi = pred(y)
            curva.append([y, round(min(c, tope), 1), round(max(min(lo, tope), 0), 1), round(min(hi, tope), 1)])
        cruces = {}
        for k, meta in metas.items():
            if ys[0] >= meta:  # la meta ya se había cruzado al inicio de la serie
                cruces[k] = {"meta": round(meta), "ya": True}
                continue
            c = cruce_anio(a, b, meta)
            # Rango: años en que la banda inferior y la superior cruzan la meta.
            temprano = next((y for y, _, _, hi in curva if hi >= meta), None)
            tardio = next((y for y, _, lo, _ in curva if lo >= meta), None)
            cruces[k] = {"meta": round(meta), "anio": round(c) if c else None, "desde": temprano, "hasta": tardio}
        out["proyecciones"][campo] = {
            "pendiente": round(b, 3), "r2": round(r2, 3), "curva": curva, "cruces": cruces,
        }
        print(f"{campo:10} {b:+,.2f}/año  r²={r2:.2f}  " + "  ".join(
            f"{k}: ya" if v.get("ya") else f"{k}: {v['anio']} ({v['desde']}–{v['hasta'] or '>' + str(HASTA)})"
            for k, v in cruces.items()))
    print("serie:", [(s["y"], s["acuiferos"], s["territorio"], f"{s['personas'] / 1e6:.1f} M") for s in serie])

    (ROOT / "src/data/proyecciones.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
