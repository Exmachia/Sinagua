"""¿Quién usa el agua? A partir del Registro Público de Derechos de Agua (REPDA) de CONAGUA.

Cada título de concesión dice para qué es el agua (uso), quién la tiene (titular) y cuánto puede sacar al año.
Sus anexos dicen de dónde la saca (estado, municipio y, si es pozo, el acuífero). Con eso:

  · src/data/usos.json            → resumen nacional para la landing
  · public/data/usos/<cve>.json   → por estado y por municipio (se carga al abrir un estado en el mapa)
  · public/data/usos_acuiferos.json → por acuífero

Usos agrupados en lenguaje llano: campo, ciudades y casas, industria y servicios, plantas de electricidad y
"varios usos" (títulos que no detallan uno solo). Las hidroeléctricas se dejan fuera: el agua pasa por sus
turbinas y regresa al río.

Privacidad: el REPDA es público por ley, pero aquí solo se muestran nombres de organizaciones (empresas,
gobiernos, ejidos, asociaciones). Lo de personas particulares se suma sin nombre.

Es el volumen que el permiso AUTORIZA sacar, no el que se mide.
Entrada: data/raw/abiertos/Otorgamiento_de_Concesiones.zip (fetch_abiertos.sh)
"""

from __future__ import annotations

import csv
import io
import json
import re
import sys
import unicodedata
import zipfile
from collections import defaultdict
from datetime import datetime
from math import fsum
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ZIP = ROOT / "data" / "raw" / "abiertos" / "Otorgamiento_de_Concesiones.zip"
POBLACION = ROOT / "data" / "fuentes" / "poblacion_2020.csv"

GRUPOS = ["campo", "ciudades", "industria", "electricidad", "varios"]
USO_GRUPO = {
    "AGRÍCOLA": "campo", "PECUARIO": "campo", "ACUACULTURA": "campo", "AGROINDUSTRIAL": "campo",
    "PÚBLICO URBANO": "ciudades", "DOMÉSTICO": "ciudades",
    "INDUSTRIAL": "industria", "SERVICIOS": "industria", "COMERCIO": "industria",
    "DIFERENTES USOS": "varios", "OTROS": "varios", "CONSERVACIÓN ECOLÓGICA": "varios",
}
HIDRO = re.compile(r"GENERACI[OÓ]N DE ENERG")  # uso de las hidroeléctricas
ELECTRICA = re.compile(r"\b(C\.?\s?F\.?\s?E\.?|COMISI[OÓ]N FEDERAL DE ELECTRICIDAD|ELECTRICIDAD|EL[EÉ]CTRICA|TERMOEL[EÉ]CTRICA|ENERG[IÍ]A)\b")
HIDRO_NOMBRE = re.compile(r"HIDROEL[EÉ]CTRIC")
# Toma de una planta de electricidad en una presa o central hidroeléctrica: turbinas, el agua sigue su curso
# Agua de mar (enfriamiento de plantas, desaladoras): no es agua dulce, no se cuenta
FUENTE_MAR = re.compile(r"\bGOLFO\b|\bMAR\b|OC[EÉ]ANO|\bBAH[IÍ]A\b|\bOCEANO PAC")
FUENTE_HIDRO = re.compile(r"PRESA|EMBALSE|C\.\s?H\.|HIDRO")

# Organizaciones: empresas, gobiernos, organismos de agua, ejidos, asociaciones…
MORAL = re.compile(r"""\b(S\.?\s?A\.?|S\.?\s?DE\s?R\.?\s?L|S\.?\s?A\.?\s?P\.?\s?I|S\.?\s?C\.?|A\.?\s?C\.?|S\.?\s?P\.?\s?R|S\.?\s?DE\s?P\.?\s?R|
  SOCIEDAD|ASOCIACI[OÓ]N|ASOC\.|UNI[OÓ]N|COOPERATIVA|EJIDO|EJIDAL|COMUNIDAD|COMISI[OÓ]N|COMISARIADO|SISTEMA|ORGANISMO|JUNTA|
  MUNICIPIO|MUNICIPAL|AYUNTAMIENTO|PRESIDENCIA|GOBIERNO|ESTADO\sDE|SECRETAR[IÍ]A|INSTITUTO|UNIVERSIDAD|COLEGIO|ESCUELA|
  C\.?\s?F\.?\s?E|PEMEX|E\.\s?P\.\s?S|I\.\s?P\.\s?D|FIDEICOMISO|BANCO|GRUPO|COMPA[NÑ][IÍ]A|EMPRESA|INDUSTRIA|CERVECER|DISTRITO|
  M[OÓ]DULO|UNIDAD\sDE\sRIEGO|USUARIOS|PRODUCTORES|AGUA\sPOTABLE|ALCANTARILLADO|SANEAMIENTO|COMIT[EÉ]|PATRONATO|CONSEJO|
  CLUB|HOSPITAL|INMOBILIARIA|DESARROLL|CONSTRUCTORA|HOTEL|SERVICIOS|FEDERAL|NACIONAL|INC\.?|LLC|LTD)\b""", re.X)
# Empresas privadas (para el ranking nacional): solo razones sociales mercantiles
PRIVADA = re.compile(r"\b(S\.?\s?A\.?(\s?B\.?)?\s?(DE\s)?C\.?\s?V|S\.?\s?A\.?\s?P\.?\s?I|S\.?\s?DE\s?R\.?\s?L|S\.?\s?A\.?$|S\.\s?A\.,|INC\.?|LLC|LTD)\b")
INTERES_PUBLICO = re.compile(r"I\.?\s?P\.?\s?Y\s?C\.?\s?V|INTER[EÉ]S P[UÚ]BLICO|DISTRITO DE RIEGO|M[OÓ]DULO|USUARIOS")  # asociaciones de regantes
PUBLICA = re.compile(r"\b(C\.?\s?F\.?\s?E|COMISI[OÓ]N|PEMEX|GOBIERNO|MUNICIP|AYUNTAMIENTO|ORGANISMO|SISTEMA|JUNTA|E\.\s?P\.\s?S|I\.\s?P\.\s?D|PARAESTATAL)\b")


def norm(s: str) -> str:
    return unicodedata.normalize("NFC", s.replace("﻿", "")).strip()


MINUSCULAS = {"DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "E", "EN", "PARA", "POR", "A", "AL"}


def limpio(nombre: str) -> str:
    """Nombre para mostrar, sin gritar: "CERVECERÍA CUAUHTÉMOC MOCTEZUMA, S.A. DE C.V." → "Cervecería Cuauhtémoc
    Moctezuma, S.A. de C.V.". Sin lo que va entre paréntesis (a veces trae nombres de personas o localidades)."""
    n = " ".join(re.sub(r"\s*\([^)]*\)?", "", nombre).split()).strip(" ,;") or " ".join(nombre.split())
    palabras = []
    for i, w in enumerate(n.split(" ")):
        if "." in w or (len(w) <= 3 and w.isalpha() and w.upper() not in MINUSCULAS and i > 0 and palabras and palabras[-1].endswith(",")):
            palabras.append(w.upper())  # siglas: S.A., C.V., SAPI…
        elif w.isalpha() and not re.search(r"[AEIOUÁÉÍÓÚ]", w.upper()):
            palabras.append(w.upper())  # siglas sin vocales: "SPR", "CV"…
        elif w.upper() in MINUSCULAS and i > 0:
            palabras.append(w.lower())
        else:
            palabras.append(w[:1].upper() + w[1:].lower())
    n = " ".join(palabras)
    n = re.sub(r"\b(Cpi|Sapi|Cfe|Ica)\b", lambda m: m.group(1).upper(), n)  # siglas con vocales
    return re.sub(r"\b(De|Del)\s(C\.\s?V)", lambda m: m.group(1).lower() + " " + m.group(2), n)


def leer(z: zipfile.ZipFile, nombre):
    """Renglones como dict. Algunos encabezados traen bytes basura (ej. 'TÍ\\x8dTULO'): se buscan por prefijo."""
    with z.open(nombre) as f:
        r = csv.reader(io.TextIOWrapper(f, encoding="utf-8", errors="replace"))
        cab = [norm(c) for c in next(r)]
        for x in r:
            yield dict(zip(cab, x))


def col(fila: dict, *prefijos: str) -> str:
    for p in prefijos:
        for k in fila:
            if k.startswith(p):
                return k
    raise KeyError(prefijos)


def num(s: str) -> float:
    try:
        return float(s.replace(",", "")) if s else 0.0
    except ValueError:
        return 0.0


def grupo(uso: str, titular: str) -> str | None:
    if HIDRO.search(uso) or HIDRO_NOMBRE.search(titular):
        return None  # hidroeléctrica: el agua regresa al río
    if ELECTRICA.search(titular):
        return "electricidad"
    return USO_GRUPO.get(uso, "varios")


def main():
    if not ZIP.exists():
        sys.exit(f"Falta {ZIP} (corre scripts/fetch_abiertos.sh)")
    z = zipfile.ZipFile(ZIP)
    # Los nombres dentro del zip vienen en la página de códigos de DOS (cp850): "SUBTERRÁNEOS" se lee "SUBTERR╡NEOS"
    nombres = {}
    for i in z.infolist():
        real = i.filename if i.flag_bits & 0x800 else i.filename.encode("cp437").decode("cp850")
        nombres[norm(real)] = i
    fecha = datetime(*z.getinfo("Concesiones/CONCESIONES.csv").date_time[:3]).date().isoformat()

    # 1) Títulos: uso, titular, volumen total
    titulos: dict[str, tuple[str | None, str, bool, float]] = {}
    hidro = 0.0
    for archivo in ("Concesiones/CONCESIONES.csv", "Concesiones/CONCESIONES_DTTOS_DE_RIEGO.csv"):
        filas = leer(z, archivo)
        primera = next(filas)
        kv = col(primera, "VOLUMEN DE EXTRACCIÓN ANUAL DE AGUAS NACIONALES")
        kt = next(iter(primera))
        for x in (primera, *filas):
            titular = " ".join(x["TITULAR"].split()).upper()
            uso = x["USO QUE AMPARA EL TÍTULO"].strip()
            g = grupo(uso, titular)
            v = num(x[kv])
            if g is None:
                hidro += v  # uso hidroeléctrico declarado en el título
            if x[kt] in titulos:  # el mismo título en los dos archivos: se cuenta una vez
                continue
            titulos[x[kt]] = (g, titular, bool(MORAL.search(titular)), v)

    # 3) Por lugar, con el volumen de cada anexo (cada pozo o toma)
    est = defaultdict(lambda: defaultdict(float))  # cve estado → (grupo|titular) → m3
    mun = defaultdict(lambda: defaultdict(float))
    acu = defaultdict(lambda: defaultdict(float))
    huerfanos = 0.0
    nac = defaultdict(list)  # grupo → volúmenes de cada anexo
    por_titulo = defaultdict(float)  # volumen contado de cada título (para el ranking)

    mar = 0.0

    def sumar(destinos, titulo: str, v: float, fuente: str):
        nonlocal huerfanos, hidro, mar
        t = titulos.get(titulo)
        if not t:
            huerfanos += v
            return
        if FUENTE_MAR.search(fuente):
            mar += v
            return
        g, titular, moral, _ = t
        if g == "electricidad" and FUENTE_HIDRO.search(fuente):
            g = None
            hidro += v
        if not g or v <= 0:
            return
        nac[g].append(v)
        por_titulo[titulo] += v
        for d in destinos:
            d[("g", g)] += v
            d[("t", titular) if moral else ("p", "")] += v
            d[("n", titulo)] = 1

    for archivo, tiene_mun, tiene_acu in (
        ("Concesiones/ANEXOS_SUBTERRÁNEOS.csv", True, True),
        ("Concesiones/ANEXOS_SUBTERRÁNEOS_DTTOS.csv", True, True),
        ("Concesiones/ANEXOS_SUPERFICIALES.csv", True, False),
        ("Concesiones/ANEXOS_SUPERFICIALES_DTTOS.csv", False, False),
    ):
        filas = leer(z, nombres[archivo])
        primera = next(filas)
        kv = col(primera, "VOLUMEN ANUAL EN m3")
        kt = next(iter(primera))  # "TÍTULO" (a veces con bytes basura)
        for x in (primera, *filas):
            v = num(x[kv])
            ce = x["CLAVE DE ESTADO"].strip().zfill(2)
            destinos = [est[ce]]
            if tiene_mun and x.get("CLAVE DE MUNICIPIO", "").strip().isdigit():
                destinos.append(mun[ce + x["CLAVE DE MUNICIPIO"].strip().zfill(3)])
            if tiene_acu:
                ca = x.get("CLAVE DE ACUÍFERO HOMOLOGADO", "").strip()
                if ca.isdigit() and int(ca) > 0:
                    destinos.append(acu[ca.zfill(4)])
            sumar(destinos, x[kt], v, x.get("FUENTE DE ABASTECIMIENTO", x.get("FUENTE", "")).upper())

    nacional = {g: fsum(nac[g]) / 1e6 for g in GRUPOS}
    total = fsum(nacional.values())

    def resumen(d) -> dict:
        g = [round(d[("g", k)] / 1e6, 2) for k in GRUPOS]
        orgs = sorted(((k[1], v) for k, v in d.items() if k[0] == "t"), key=lambda kv: -kv[1])
        # el mismo titular escrito igual suma; distinto ("S.A." vs "SA") queda aparte, igual que en el REPDA
        return {
            "v": round(sum(g), 2),
            "g": g,
            "p": round(d[("p", "")] / 1e6, 2),  # personas particulares (sin nombre)
            "n": sum(1 for k in d if k[0] == "n"),
            "t": [[limpio(n), round(v / 1e6, 2)] for n, v in orgs[:5]],
        }

    out_dir = ROOT / "public" / "data" / "usos"
    out_dir.mkdir(parents=True, exist_ok=True)
    for ce, d in est.items():
        if not ce.strip("0"):
            continue
        datos = {"e": resumen(d), "m": {g: resumen(m) for g, m in mun.items() if g.startswith(ce)}}
        (out_dir / f"{ce}.json").write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (ROOT / "public" / "data" / "usos_acuiferos.json").write_text(
        json.dumps({c: resumen(d) for c, d in acu.items()}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # 4) Ranking nacional de empresas privadas (sin gobiernos, organismos de agua, CFE, PEMEX ni ejidos)
    por_empresa = defaultdict(lambda: defaultdict(float))
    for t, v in por_titulo.items():
        g, titular, _, _ = titulos[t]
        if PRIVADA.search(titular) and not PUBLICA.search(titular) and not INTERES_PUBLICO.search(titular):
            por_empresa[limpio(titular)][g] += v
    empresas = sorted(por_empresa.items(), key=lambda kv: -sum(kv[1].values()))[:10]

    personas = 0
    with open(POBLACION, encoding="utf-8") as f:
        personas = sum(int(r["pob"]) for r in csv.DictReader(f) if len(r["clave"]) == 2)
    por_persona = nacional["ciudades"] * 1e6 / personas  # m³ al año que se permite sacar para ciudades, por persona

    salida = {
        "fecha": fecha,
        "total": round(total, 1),
        "grupos": {g: round(nacional[g], 1) for g in GRUPOS},
        "hidro": round(hidro / 1e6, 1),
        "titulos": len(titulos),
        "m3PersonaCiudad": round(por_persona, 1),
        "empresas": [{"n": n, "hm3": round(fsum(gs.values()) / 1e6, 1), "g": max(gs, key=gs.get)} for n, gs in empresas],
    }
    destino = ROOT / "src" / "data" / "usos.json"
    if destino.exists() and json.loads(destino.read_text(encoding="utf-8")).get("fecha", "") > fecha:
        sys.exit(f"ABORTADO: el REPDA descargado ({fecha}) es más viejo que el publicado.")
    destino.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"REPDA al {fecha}: {len(titulos):,} títulos · {total:,.0f} hm³ al año · aparte, hidroeléctricas: {hidro / 1e6:,.0f} hm³ y agua de mar: {mar / 1e6:,.0f} hm³")
    for g in GRUPOS:
        print(f"  {g:13} {nacional[g]:9,.0f} hm³  {nacional[g] / total * 100:5.1f}%")
    sin_lugar = huerfanos / 1e6
    print(f"  anexos sin título conocido: {sin_lugar:,.0f} hm³ · estados {len(est)} · municipios {len(mun)} · acuíferos {len(acu)}")
    print(f"  por persona (ciudades): {por_persona:.0f} m³/año")
    for e in salida["empresas"]:
        print(f"  {e['hm3']:8,.1f} hm³  {e['g']:12} {e['n']}")


if __name__ == "__main__":
    main()
