#!/usr/bin/env bash
# Datos abiertos de CONAGUA (datos.conagua.gob.mx):
#   · Otorgamiento de concesiones: el Registro Público de Derechos de Agua (REPDA) completo.
#   · Calidad del agua: indicadores de los sitios de monitoreo (2023, y 2021 para los sitios no medidos en 2023).
# Solo se reemplaza un archivo si la descarga es un zip válido.
set -euo pipefail
mkdir -p "$(dirname "$0")/../data/raw/abiertos"
cd "$(dirname "$0")/../data/raw/abiertos"
BASE="https://datos.conagua.gob.mx/docs/DatosAbiertos"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
for f in Otorgamiento_de_Concesiones.zip \
         Indicadores_de_calidad_del_agua_2023_en_1056_sitios_de_monitoreo.zip \
         Datos_de_calidad_del_agua_de_5000_sitios_de_monitoreo.zip; do
  curl -sSL --fail -m 600 -c "$JAR" -b "$JAR" -A "Mozilla/5.0 (sinagua; datos abiertos)" "$BASE/$f" -o "$f.tmp"
  if head -c 2 "$f.tmp" | grep -q "PK"; then
    mv "$f.tmp" "$f"
    echo "  ✓ $f ($(wc -c < "$f" | tr -d ' ') bytes)"
  else
    rm -f "$f.tmp"
    echo "  ✗ $f: la descarga no es un zip (se conserva el anterior)" >&2
    exit 1
  fi
done
