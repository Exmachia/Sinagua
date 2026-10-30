"""Descarga el almacenamiento de las presas Picachos y Santa María (sur de Sinaloa).

No están en el Sistema de Información Hidrológica de CONAGUA, pero sí en el reporte diario del
Organismo de Cuenca Pacífico Norte de CONAGUA, que publica la CIDH (Comisión para la Investigación y
la Defensa de las Hortalizas de Sinaloa) en https://cidh.org.mx/almacenamiento-de-presas/
Gracias a Conselva, Costas y Comunidades A.C. por el aviso.

Salida: data/fuentes/cidh_presas.json  {"presas": {nombre: {fecha: [almacenamiento hm³, capacidad al NAMO hm³]}},
                                       "archivos": [ids ya leídos]}

Uso:
  python3 scripts/fetch_cidh.py                 # lo nuevo de este mes y el anterior (GitHub Actions)
  python3 scripts/fetch_cidh.py --historia 2019 # un reporte por semana desde ese año (se corre una vez)

Requiere pypdf.
"""

from __future__ import annotations

import io
import json
import re
import sys
import time
import urllib.request
from datetime import date
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SALIDA = ROOT / "data" / "fuentes" / "cidh_presas.json"
AJAX = "https://cidh.org.mx/wp-admin/admin-ajax.php?juwpfisadmin=false&action=wpfd"
RAIZ = 77  # carpeta "Almacenamiento de Presas"
UA = "Mozilla/5.0 (sinagua.org; datos abiertos)"
PRESAS = {"Picachos": r"Picachos", "Santa María": r"Santa Mar[ií]a"}
MESES = {m: i + 1 for i, m in enumerate("enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split())}


def pedir(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        datos = r.read()
    time.sleep(0.5)  # sin prisa: es el sitio de alguien más
    return datos


def carpetas(id_: int) -> list[dict]:
    d = json.loads(pedir(f"{AJAX}&task=categories.display&view=categories&id={id_}&top={RAIZ}"))
    return d.get("categories", [])


def archivos(id_: int) -> list[dict]:
    out, pagina = [], 1
    while True:
        d = json.loads(pedir(f"{AJAX}&task=files.display&view=files&id={id_}&rootcat={id_}&page={pagina}"))
        if not d.get("files"):
            return out
        out += [f for f in d["files"] if f.get("ext") == "pdf"]
        pagina += 1


def leer(pdf: bytes) -> dict[str, tuple[str, float, float]]:
    """{presa: (fecha, almacenamiento, capacidad al NAMO)}. Solo filas cuyo % coincide con almacenamiento / NAMO."""
    texto = "\n".join(p.extract_text() or "" for p in PdfReader(io.BytesIO(pdf)).pages)
    lineas = [" ".join(l.split()) for l in texto.splitlines()]
    # Fecha del reporte: una línea que solo dice "30 de octubre de 2026" (las notas también traen fechas, pero con más texto).
    fecha = None
    for l in lineas:
        m = re.fullmatch(r"(\d{1,2}) de (\w+) de (\d{4})", l.lower())
        if m and m.group(2) in MESES:
            fecha = date(int(m.group(3)), MESES[m.group(2)], int(m.group(1))).isoformat()
    if not fecha:
        return {}
    out = {}
    for nombre, patron in PRESAS.items():
        dia = fecha
        # "LOS DATOS DE LA PRESA SANTA MARIA CORRESPONDEN AL DIA 29/10/2026"
        # Solo se acepta si cae en la semana anterior al reporte: a veces la nota trae un error de captura (01/08 por 01/09).
        nota = re.search(rf"PRESA\s+{patron.upper()}.{{0,20}}CORRESPONDEN\s+AL\s+D[IÍ]A\s+(\d\d)/(\d\d)/(\d{{4}})", texto.upper())
        if nota:
            try:
                n = date(int(nota.group(3)), int(nota.group(2)), int(nota.group(1)))
                if 0 <= (date.fromisoformat(fecha) - n).days <= 7:
                    dia = n.isoformat()
            except ValueError:
                pass
        for l in lineas:
            m = re.match(rf"{patron}\s+([\d.\s-]+)$", l)
            if not m:
                continue
            try:
                nums = [float(x) for x in m.group(1).split()]
            except ValueError:
                continue
            if len(nums) < 6:
                continue
            _, _, namo, _, alm, pct = nums[:6]
            if namo > 0 and abs(alm / namo * 100 - pct) < 1.5:
                out[nombre] = (dia, alm, namo)
                break
    return out


def guardar(d: dict) -> None:
    for p in d["presas"].values():
        orden = dict(sorted(p.items()))
        p.clear()
        p.update(orden)
    d["archivos"] = sorted(set(d["archivos"]))
    SALIDA.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def procesar(d: dict, f: dict) -> bool:
    try:
        filas = leer(pedir(f["linkdownload"]))
    except Exception as e:  # un PDF dañado no detiene lo demás
        print(f"  ✗ {f['post_title']}: {e}")
        return False
    d["archivos"].append(f["ID"])
    for nombre, (dia, alm, namo) in filas.items():
        d["presas"].setdefault(nombre, {})[dia] = [alm, namo]
    return bool(filas)


def main():
    d = json.loads(SALIDA.read_text(encoding="utf-8")) if SALIDA.exists() else {"presas": {}, "archivos": []}
    vistos = set(d["archivos"])
    anios = sorted(carpetas(RAIZ), key=lambda c: c["name"])
    if "--historia" in sys.argv:
        desde = sys.argv[sys.argv.index("--historia") + 1]
        for a in (a for a in anios if a["name"] >= desde):
            for mes in carpetas(a["term_id"]):
                por_semana: dict[tuple, list] = {}
                for f in archivos(mes["term_id"]):
                    sem = date.fromisoformat(f["created_time"][:10]).isocalendar()[:2]
                    por_semana.setdefault(sem, []).append(f)
                for sem, fs in sorted(por_semana.items()):
                    if any(f["ID"] in vistos for f in fs):
                        continue
                    # el más reciente de la semana; si no trae las presas, el siguiente (máximo 3 intentos)
                    for f in sorted(fs, key=lambda f: f["created_time"], reverse=True)[:3]:
                        if procesar(d, f):
                            break
                print(f"{a['name']} {mes['name']}: {sum(len(p) for p in d['presas'].values())} registros")
                guardar(d)
    else:
        orden = {m: i for i, m in enumerate(MESES)}
        meses = [(a["name"], orden.get(m["name"].lower(), -1), m) for a in anios[-2:] for m in carpetas(a["term_id"])]
        # Los dos meses más recientes (en enero, el anterior es diciembre del año pasado).
        listas = [archivos(m["term_id"]) for *_, m in sorted(meses, key=lambda x: x[:2])[-2:]]
        listas = sorted((l for l in listas if l), key=lambda l: max(f["created_time"] for f in l))[-2:]
        nuevos = [f for l in listas for f in l if f["ID"] not in vistos]
        for f in sorted(nuevos, key=lambda f: f["created_time"]):
            procesar(d, f)
        print(f"CIDH: {len(nuevos)} reportes nuevos")
        guardar(d)
    for nombre, p in d["presas"].items():
        ult = max(p)
        print(f"  {nombre}: {len(p)} días, {min(p)} → {ult} ({p[ult][0] / p[ult][1] * 100:.1f}%)")


if __name__ == "__main__":
    main()
