#!/usr/bin/env bash
# Descarga el histórico diario por presa del Sistema de Información Hidrológica (SIH) de CONAGUA.
# Complementa el monitoreo del SINA (que se detiene en abril de 2025): se actualiza a diario.
set -euo pipefail
cd "$(dirname "$0")/../data/raw"
mkdir -p sih
BASE="https://sih.conagua.gob.mx/basedatos/Presas"
UA="Mozilla/5.0 (sinagua; datos abiertos)"
curl -sSL --fail -m 60 -A "$UA" "$BASE/0_Catalogo_de_presas.csv" -o sih/catalogo.csv
claves=$(iconv -f latin1 -t utf-8 sih/catalogo.csv | awk -F, 'NR>3 && $2 ~ /^[A-Z]{5,}$/ {print $2}')
n=0; fallas=0
for c in $claves; do
  if curl -sSL --fail -m 120 -A "$UA" "$BASE/$c.csv" -o "sih/$c.csv.tmp" && head -1 "sih/$c.csv.tmp" | grep -qv "DOCTYPE"; then
    mv "sih/$c.csv.tmp" "sih/$c.csv"; n=$((n+1))
  else
    rm -f "sih/$c.csv.tmp"; fallas=$((fallas+1)); echo "  ✗ $c"
  fi
  sleep 0.7
done
echo "SIH: $n presas descargadas, $fallas sin archivo"
