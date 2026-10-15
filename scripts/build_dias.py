"""Días de agua de los sistemas que abastecen a las grandes ciudades.

Días de agua = agua almacenada / lo que sale cada día por la obra de toma (promedio de los últimos 30 días).
Es decir: cuánto duraría el agua de las presas si dejara de llover hoy y se siguiera sacando al mismo ritmo.

Advertencias (se explican en el sitio): no todo el volumen se puede extraer (el fondo de la presa), no se cuenta la
evaporación ni lo que todavía entra, y en algunas presas parte de lo que sale es para riego. Los días reales serían
menos.

Entrada: data/raw/sih/<clave>.csv (fetch_sih.sh) y public/data/presas.json (capacidades).
Salida: src/data/dias_agua.json
"""

from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from math import fsum
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIH = ROOT / "data" / "raw" / "sih"
DESDE = date(2010, 1, 6)  # la gráfica arranca en 2010
VENTANA = 30  # días para promediar la extracción

SISTEMAS = [
    {"id": "cutzamala", "nombre": "Sistema Cutzamala", "ciudad": "Ciudad de México y Valle de México",
     "presas": ["VBRMX", "VVCMX", "DBOMC"]},
    {"id": "monterrey", "nombre": "Presas de Monterrey", "ciudad": "Monterrey y su zona metropolitana",
     "presas": ["CCHNL", "CPRNL", "LBCNL"]},
]


def leer(clave: str):
    """Volumen (hm³) y extracción por obra de toma (m³/s) diarios, leyendo las columnas por nombre."""
    lineas = (SIH / f"{clave}.csv").read_text(encoding="latin-1").splitlines()
    i = next(k for k, l in enumerate(lineas) if l.startswith("Estacion,"))
    cab = lineas[i].strip().split(",")
    iv, io = cab.index("VolumenAlm(Mm3)"), cab.index("ObraToma(m3/s)")
    vol, toma = {}, {}
    for l in lineas[i + 1:]:
        p = l.strip().split(",")
        if len(p) <= max(iv, io) or p[0] != clave:
            continue
        try:
            if p[iv]:
                vol[p[1]] = float(p[iv])
            if p[io]:
                toma[p[1]] = float(p[io])
        except ValueError:
            pass
    return vol, toma


def extraccion(toma: dict[str, float], d: date) -> float | None:
    """Promedio de los últimos 30 días (m³/s); None si faltan más de la mitad de los datos."""
    v = [toma[x] for x in ((d - timedelta(days=k)).isoformat() for k in range(VENTANA)) if x in toma]
    return fsum(v) / len(v) if len(v) >= VENTANA / 2 else None


def dias(volumen: float, m3s: float | None) -> int | None:
    if m3s is None or m3s < 0.05:
        return None  # casi no sale agua: los "días" no tienen sentido
    return round(volumen / (m3s * 86400 / 1e6))


def main():
    presas = {p["c"]: p for p in json.loads((ROOT / "public/data/presas.json").read_text(encoding="utf-8"))}
    salida = {"sistemas": []}
    for s in SISTEMAS:
        datos = {c: leer(c) for c in s["presas"]}
        cap = {c: presas[c]["cap"] for c in s["presas"]}
        # Fecha más reciente con volumen de todas las presas del sistema
        comunes = set.intersection(*(set(datos[c][0]) for c in s["presas"]))
        hoy = date.fromisoformat(max(comunes))

        def foto(d: date):
            f = d.isoformat()
            if any(f not in datos[c][0] for c in s["presas"]):
                return None
            ext = {c: extraccion(datos[c][1], d) for c in s["presas"]}
            if any(v is None for v in ext.values()):
                return None
            vol = {c: datos[c][0][f] for c in s["presas"]}
            total_v, total_q = fsum(vol.values()), fsum(ext.values())
            return {
                "f": f,
                "vol": round(total_v, 1),
                "pct": round(total_v / fsum(cap.values()) * 100, 1),
                "m3s": round(total_q, 2),
                "dias": dias(total_v, total_q),
                "presas": [{"c": c, "n": presas[c]["n"], "pct": round(vol[c] / cap[c] * 100, 1),
                            "m3s": round(ext[c], 2), "dias": dias(vol[c], ext[c])} for c in s["presas"]],
            }

        actual = foto(hoy)
        serie, d = [], DESDE
        while d <= hoy:
            x = foto(d)
            if x and x["dias"] is not None:
                serie.append(x)
            d += timedelta(days=7)
        # Peor momento del sistema y la presa que más bajó
        recientes = serie
        peor = min(recientes, key=lambda x: x["dias"])
        # Cuántos días tenía en los 12 meses previos al peor momento: qué tan rápido se vacía en una temporada seca
        hace_un_anio = f"{int(peor['f'][:4]) - 1}{peor['f'][4:]}"
        antes = max((x for x in serie if hace_un_anio <= x["f"] < peor["f"]), key=lambda x: x["dias"])
        presa_baja = min(((x["f"], p) for x in recientes for p in x["presas"]), key=lambda t: t[1]["pct"])
        salida["sistemas"].append({
            "id": s["id"], "nombre": s["nombre"], "ciudad": s["ciudad"],
            "capacidad": round(fsum(cap.values()), 1),
            "actual": actual,
            "peor": {"f": peor["f"], "dias": peor["dias"], "pct": peor["pct"],
                     "antes": {"f": antes["f"], "dias": antes["dias"], "pct": antes["pct"]}},
            "presaMasBaja": {"f": presa_baja[0], "n": presa_baja[1]["n"], "pct": presa_baja[1]["pct"]},
            "serie": [[x["f"], x["dias"], x["pct"]] for x in serie],
        })
        print(f"{s['nombre']}: al {actual['f']} {actual['pct']}% · sale {actual['m3s']} m³/s · {actual['dias']} días · "
              f"peor {peor['f']} ({peor['dias']} días; {antes['dias']} el {antes['f']}) · presa más baja {presa_baja[1]['n']} {presa_baja[1]['pct']}% ({presa_baja[0]})")
        for p in actual["presas"]:
            print(f"    {p['n']:16} {p['pct']:5.1f}%  {p['m3s']:5.2f} m³/s  {p['dias']} días")

    # Protección: no reemplazar con datos más viejos (p. ej. si falló la descarga del SIH).
    destino = ROOT / "src" / "data" / "dias_agua.json"
    if destino.exists():
        previo = {x["id"]: x["actual"]["f"] for x in json.loads(destino.read_text(encoding="utf-8"))["sistemas"]}
        for x in salida["sistemas"]:
            if x["actual"]["f"] < previo.get(x["id"], ""):
                sys.exit(f"ABORTADO: {x['nombre']} tiene datos al {x['actual']['f']}, más viejos que los publicados.")
    destino.write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
