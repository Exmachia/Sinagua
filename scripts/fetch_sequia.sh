#!/usr/bin/env bash
# Monitor de Sequía de México (SMN-CONAGUA): categoría de sequía por municipio, cada quincena desde 2003.
set -euo pipefail
# data/raw no está en el repositorio (en GitHub Actions no existe): se crea si hace falta.
mkdir -p "$(dirname "$0")/../data/raw"
cd "$(dirname "$0")/../data/raw"
mkdir -p sequia
curl -sSL --fail -m 180 -A "Mozilla/5.0 (sinagua; datos abiertos)" \
  "https://smn.conagua.gob.mx/tools/RESOURCES/Monitor%20de%20Sequia%20en%20Mexico/MunicipiosSequia.xlsx" \
  -o sequia/MunicipiosSequia.xlsx.tmp
# Un .xlsx es un zip: si llegó una página de error en su lugar, no se reemplaza el archivo anterior.
head -c 2 sequia/MunicipiosSequia.xlsx.tmp | grep -q "PK" || { echo "La descarga no es un .xlsx" >&2; rm sequia/MunicipiosSequia.xlsx.tmp; exit 1; }
mv sequia/MunicipiosSequia.xlsx.tmp sequia/MunicipiosSequia.xlsx
echo "  ✓ Monitor de Sequía ($(wc -c < sequia/MunicipiosSequia.xlsx | tr -d ' ') bytes)"
