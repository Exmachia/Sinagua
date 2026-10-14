"""Procesa el monitoreo semanal de presas.

Entradas:
  data/fuentes/sina_presas.csv.gz + sina_catalogo.json   serie del SINA 1991–abr 2025 (compactar_sina.py)
  data/raw/sih/<clave>.csv                                extensión diaria del SIH hasta hoy (fetch_sih.sh)

Salidas:
  public/data/presas.json          catálogo + estado más reciente + comparación con lo normal
  public/data/presas/<clave>.json  serie semanal de cada presa [fecha, almacenamiento hm³]
  src/data/presas_resumen.json     series nacionales y por uso, mínimos anuales, tendencias

Notas de método:
  - % de llenado = almacenamiento / capacidad al NAMO (nivel de aguas máximo ordinario).
  - Los agregados usan un PANEL FIJO: presas con datos en ≥90% de las semanas desde el año
    de inicio del panel. Así el promedio no cambia porque entren o salgan presas del registro.
  - "Normal" de una presa para una semana del año = mediana de su % de llenado en esa misma
    semana a lo largo de todos los años disponibles.
"""

from __future__ import annotations

import csv
import gzip
import json
import re
import sys
import statistics
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FUENTES = ROOT / "data" / "fuentes"
SIH = ROOT / "data" / "raw" / "sih"  # histórico diario por presa (scripts/fetch_sih.sh)
PUB = ROOT / "public" / "data"
PANEL_DESDE = 2000

# Nombre de estado en CONAGUA → nombre corto del sitio (estados.json, INEGI).
ALIAS = {"Coahuila de Zaragoza": "Coahuila", "México": "Estado de México", "Veracruz de Ignacio de la Llave": "Veracruz"}

USOS = {"RI": "Riego", "AP": "Abastecimiento público", "GH": "Hidroeléctrica", "CA": "Control de avenidas"}


def limpio(s) -> str:
    return " ".join(str(s or "").split())


def nombre(s: str) -> tuple[str, str]:
    """'La Angostura, Chis.' → ('La Angostura', 'Chis.')"""
    s = limpio(s)
    m = re.match(r"^(.*?),\s*([A-Z][\w.]*\.?)$", s)
    return (m.group(1), m.group(2)) if m else (s, "")


def semana(f: str) -> int:
    return min(date.fromisoformat(f).isocalendar()[1], 52)


def tendencia(xs: list[float], ys: list[float]) -> float:
    """Pendiente por mínimos cuadrados (unidades de y por unidad de x)."""
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    den = sum((x - mx) ** 2 for x in xs)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den if den else 0.0


def t_pendiente(xs: list[float], ys: list[float]) -> float:
    """Estadístico t de la pendiente: |t| ≥ 2 ≈ tendencia distinguible del ruido (95%)."""
    b = tendencia(xs, ys)
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    res = [y - (my + b * (x - mx)) for x, y in zip(xs, ys)]
    sxx = sum((x - mx) ** 2 for x in xs)
    se = (sum(e * e for e in res) / (len(xs) - 2) / sxx) ** 0.5 if len(xs) > 2 and sxx else 0
    return b / se if se else 0.0


def recta(xs: list[float], ys: list[float]) -> list[list[float]]:
    b = tendencia(xs, ys)
    a = statistics.fmean(ys) - b * statistics.fmean(xs)
    return [[xs[0], round(a + b * xs[0], 1)], [xs[-1], round(a + b * xs[-1], 1)]]


def limpiar(s: dict[str, tuple[float, float, float]]) -> tuple[dict[str, tuple[float, float]], int]:
    """Quita registros imposibles y picos aislados. Devuelve {fecha: (almacenamiento, namo)} y # descartados.

    1. Imposible: almacenamiento < 0 o > NAME (nivel máximo extraordinario) + 5%.
    2. Pico aislado: % de llenado a más de 40 puntos de la mediana de las ±4 semanas vecinas.
    """
    ok = {f: (v, namo) for f, (v, namo, name) in s.items() if 0 <= v <= max(name, namo) * 1.05}
    fechas = sorted(ok)
    pct = [ok[f][0] / ok[f][1] * 100 for f in fechas]
    limpio_ = {}
    for i, f in enumerate(fechas):
        vecinos = pct[max(0, i - 4):i] + pct[i + 1:i + 5]
        if len(vecinos) >= 3 and abs(pct[i] - statistics.median(vecinos)) > 40:
            continue
        limpio_[f] = ok[f]
    return limpio_, len(s) - len(limpio_)


def main():
    estados_inegi = json.loads((PUB / "estados.json").read_text(encoding="utf-8"))
    cve_por_nombre = {e["e"]: e["cve"] for e in estados_inegi}
    crudo = defaultdict(dict)  # clave → {fecha: (almacenamiento, namo, name)}
    with gzip.open(FUENTES / "sina_presas.csv.gz", "rt", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            crudo[r["clave"]][r["fecha"]] = (float(r["almac"]), float(r["namo"]), float(r["name"]))
    info = json.loads((FUENTES / "sina_catalogo.json").read_text(encoding="utf-8"))  # registro más reciente

    # --- extensión con el SIH (se actualiza a diario; el SINA se detiene en abril de 2025).
    # El SIH no siempre mide igual: en unas presas da exactamente las cifras del SINA y en otras incluye
    # el volumen muerto (un desfase fijo). Se calibra presa por presa con el último año de traslape:
    # si la diferencia SINA − SIH es estable, se aplica como corrección; si no, la presa no se extiende.
    fin_sina = date.fromisoformat(max(f for s in crudo.values() for f in s))
    desde_traslape = (fin_sina - timedelta(days=365)).isoformat()
    extra = 0
    calibracion = {"igual": 0, "desfase": 0, "rechazada": [], "sin_archivo": 0}
    for c in list(crudo):
        archivo = SIH / f"{c}.csv"
        if not archivo.exists():
            calibracion["sin_archivo"] += 1
            continue
        lineas = archivo.read_text(encoding="latin-1").splitlines()
        cab = next((l.strip().split(",") for l in lineas if l.startswith("Estacion,")), None)
        if not cab or "VolumenAlm(Mm3)" not in cab:
            calibracion["sin_archivo"] += 1
            continue
        iv = cab.index("VolumenAlm(Mm3)")
        dia = {}
        for linea in lineas:
            q = linea.strip().split(",")
            if len(q) > iv and q[0] == c and q[1] >= desde_traslape and q[iv]:
                try:
                    dia[q[1]] = float(q[iv])
                except ValueError:
                    pass
        _, namo, name = crudo[c][max(crudo[c])]
        diffs = [crudo[c][f][0] - dia[f] for f in crudo[c] if f >= desde_traslape and f in dia]
        if len(diffs) < 10:
            calibracion["rechazada"].append(c)
            continue
        desfase = statistics.median(diffs)
        dispersion = statistics.median(abs(d - desfase) for d in diffs)
        if dispersion > 0.02 * namo:
            calibracion["rechazada"].append(c)
            continue
        calibracion["igual" if abs(desfase) < 0.005 * namo else "desfase"] += 1
        f = fin_sina
        ultimo_dia = max(dia)
        while (f := f + timedelta(days=7)).isoformat() <= ultimo_dia:
            # el dato del día de la cuadrícula o, si falta, el más cercano en ±3 días
            cerca = [f + timedelta(days=d) for d in (0, -1, 1, -2, 2, -3, 3)]
            v = next((dia[x.isoformat()] for x in cerca if x.isoformat() in dia), None)
            if v is not None:
                crudo[c][f.isoformat()] = (v + desfase, namo, name)
                extra += 1
    print(f"SIH: {extra} semanas-presa agregadas después del {fin_sina} · calibración: {calibracion['igual']} idénticas, "
          f"{calibracion['desfase']} con desfase fijo, {len(calibracion['rechazada'])} rechazadas, "
          f"{calibracion['sin_archivo']} sin archivo")
    if calibracion["rechazada"]:
        print("  rechazadas:", " ".join(calibracion["rechazada"]))

    serie, descartes = {}, {}
    for c, s in crudo.items():
        serie[c], descartes[c] = limpiar(s)
    inconsistentes = {c for c in crudo if descartes[c] > 0.2 * len(crudo[c])}
    # Fecha "actual": la semana más reciente con datos de al menos 80% de las presas.
    cuenta = defaultdict(int)
    for s in serie.values():
        for f in s:
            cuenta[f] += 1
    ultima = max(f for f, n in cuenta.items() if n >= 0.8 * len(serie))
    fechas = sorted(f for f in cuenta if f <= ultima)
    for c in serie:
        serie[c] = {f: v for f, v in serie[c].items() if f <= ultima}
    # Protección: nunca reemplazar datos publicados con otros más viejos (p. ej. si falló la descarga del SIH).
    previo = ROOT / "src" / "data" / "presas_resumen.json"
    if previo.exists():
        anterior = json.loads(previo.read_text(encoding="utf-8"))["ultima"]
        if ultima < anterior:
            sys.exit(f"ABORTADO: la fecha más reciente ({ultima}) es anterior a la publicada ({anterior}). "
                     "¿Falló la descarga del SIH? No se escribió nada.")
    print(f"{len(fechas)} semanas · {fechas[0]} → {ultima} · {len(serie)} presas")
    print(f"limpieza: {sum(descartes.values())} registros descartados de {sum(len(s) for s in crudo.values())}; "
          f"presas inconsistentes (fuera de agregados): {sorted(inconsistentes)}")

    # --- catálogo, serie por presa y estado actual
    presas = []
    (PUB / "presas").mkdir(parents=True, exist_ok=True)
    for c, r in info.items():
        s = serie[c]
        if not s:
            continue
        por_semana = defaultdict(list)
        for f, (v, namo) in s.items():
            por_semana[semana(f)].append(v / namo * 100)
        ult_f = max(s)
        act, namo = s[ult_f]
        pct = act / namo * 100
        hist = por_semana[semana(ult_f)]
        normal = statistics.median(hist) if len(hist) >= 5 else None
        n, _ = nombre(r["nombrecomun"] or r["nombreoficial"])
        presas.append({
            "c": c,
            "n": n,
            "of": nombre(r["nombreoficial"])[0],
            "e": ALIAS.get(limpio(r["estado"]), limpio(r["estado"])),
            "ent": cve_por_nombre[ALIAS.get(limpio(r["estado"]), limpio(r["estado"]))],
            "mun": limpio(r["nommunicipio"]),
            "reg": limpio(r["regioncna"]),
            "rio": limpio(r["corriente"]),
            "inicio": limpio(r["inicioop"]),
            "uso": [u for u in re.split(r"[/\s]+", limpio(r["uso"])) if u],
            "lat": round(float(r["latitud"]), 4),
            "lon": round(float(r["longitud"]), 4),
            "cap": round(namo, 1),
            "act": round(act, 1),
            "pct": round(pct, 1),
            "fecha": ult_f,
            "normal": round(normal, 1) if normal is not None else None,
            "desde": min(s)[:4],
            "aviso": c in inconsistentes,
            # dato del último mes respecto a la fecha de corte (si no, se muestra en gris)
            "reciente": ult_f >= (date.fromisoformat(ultima) - timedelta(days=28)).isoformat(),
        })
        (PUB / "presas" / f"{c}.json").write_text(
            json.dumps([[f, round(v / namo_ * 100, 1)] for f, (v, namo_) in sorted(s.items())], separators=(",", ":")),
            encoding="utf-8")
    presas.sort(key=lambda p: -p["cap"])

    # --- panel fijo para agregados (sin presas inconsistentes)
    desde_panel = [f for f in fechas if int(f[:4]) >= PANEL_DESDE]
    # Panel: ≥ 90% de las semanas desde PANEL_DESDE, sin inconsistencias y con dato en el último mes
    # (para no arrastrar valores viejos de presas que dejaron de reportar).
    reciente = (date.fromisoformat(ultima) - timedelta(days=28)).isoformat()
    panel = [c for c in serie if c not in inconsistentes and serie[c] and max(serie[c]) >= reciente
             and sum(1 for f in desde_panel if f in serie[c]) >= 0.9 * len(desde_panel)]
    cap = {c: serie[c][max(serie[c])][1] for c in panel}
    print(f"panel {PANEL_DESDE}+: {len(panel)} presas, {sum(cap.values()):,.0f} hm³ de capacidad")

    def agregado(claves: list[str]):
        """% de llenado semanal del grupo (Σ almacenamiento / Σ capacidad). Huecos: último valor conocido."""
        ultimo = {}
        out = []
        for f in desde_panel:
            for c in claves:
                if f in serie[c]:
                    ultimo[c] = serie[c][f]
            if len(ultimo) == len(claves):
                out.append((f, sum(v for v, _ in ultimo.values()) / sum(n for _, n in ultimo.values()) * 100))
        return out

    grupos = {"nacional": panel}
    for u in USOS:
        grupos[u] = [c for c in panel if u in re.split(r"[/\s]+", limpio(info[c]["uso"]))]

    resumen = {"ultima": ultima, "desde": fechas[0], "panelDesde": PANEL_DESDE, "panel": len(panel),
               "capacidadPanel": round(sum(cap.values())), "usos": USOS, "grupos": {}}
    for g, claves in grupos.items():
        if len(claves) < 3:
            continue
        sem = agregado(claves)
        por_anio = defaultdict(list)
        for f, v in sem:
            por_anio[int(f[:4])].append(v)
        anios = sorted(a for a in por_anio if len(por_anio[a]) >= 45)  # años completos
        minimos = [round(min(por_anio[a]), 1) for a in anios]
        medias = [round(statistics.fmean(por_anio[a]), 1) for a in anios]
        normal = {}
        for f, v in sem:
            normal.setdefault(semana(f), []).append(v)
        resumen["grupos"][g] = {
            "presas": len(claves),
            "capacidad": round(sum(cap[c] for c in claves)),
            "semanal": [[f, round(v, 1)] for f, v in sem],
            "anual": [{"y": a, "min": mn, "media": md} for a, mn, md in zip(anios, minimos, medias)],
            "normalSemana": {w: round(statistics.median(vs), 1) for w, vs in sorted(normal.items())},
            "tendenciaMin": round(tendencia(anios, minimos), 3),   # puntos % por año
            # Recta ajustada a los mínimos anuales: extremos [año, valor] para dibujarla.
            "lineaMin": recta(anios, minimos),
            "tMin": round(t_pendiente(anios, minimos), 2),
            # Mediana de los mínimos anuales ("un año seco típico") y los años más secos.
            "minTipico": round(statistics.median(minimos), 1),
            "peores": [a for a, _ in sorted(zip(anios, minimos), key=lambda x: x[1])[:6]],
            "tendenciaMedia": round(tendencia(anios, medias), 3),
        }
        g_ = resumen["grupos"][g]
        print(f"  {g:9} {len(claves):3} presas · mínimo anual {g_['tendenciaMin']:+.2f} pts/año · media {g_['tendenciaMedia']:+.2f} pts/año")

    # --- por estado: estado actual + serie semanal (presas del panel en ese estado)
    actuales = [p for p in presas if p["reciente"] and not p["aviso"]]
    ent_de = {p["c"]: p["ent"] for p in presas}
    (PUB / "presas_estado").mkdir(parents=True, exist_ok=True)
    resumen["estados"] = []
    for e in estados_inegi:
        ps = [p for p in actuales if p["ent"] == e["cve"]]
        if not ps:
            continue
        en_panel = [c for c in panel if ent_de.get(c) == e["cve"]]
        sem = agregado(en_panel) if en_panel else []
        (PUB / "presas_estado" / f"{e['cve']}.json").write_text(
            json.dumps([[f, round(v, 1)] for f, v in sem], separators=(",", ":")), encoding="utf-8")
        resumen["estados"].append({
            "cve": e["cve"], "e": e["e"], "presas": len(ps),
            "pct": round(sum(p["act"] for p in ps) / sum(p["cap"] for p in ps) * 100, 1),
            "cap": round(sum(p["cap"] for p in ps)),
            "bajo20": sum(1 for p in ps if p["pct"] < 20),
            "serie": len(en_panel),
        })
    resumen["actual"] = {
        "presas": len(actuales),
        "pct": round(sum(p["act"] for p in actuales) / sum(p["cap"] for p in actuales) * 100, 1),
        "bajo20": sum(1 for p in actuales if p["pct"] < 20),
        "bajo50": sum(1 for p in actuales if p["pct"] < 50),
        "debajoNormal": sum(1 for p in actuales if p["normal"] is not None and p["pct"] < p["normal"] - 10),
    }

    (PUB / "presas.json").write_text(json.dumps(presas, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for destino in (ROOT / "src" / "data" / "presas_resumen.json", PUB / "presas_resumen.json"):
        destino.write_text(json.dumps(resumen, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("actual:", resumen["actual"])


if __name__ == "__main__":
    main()
