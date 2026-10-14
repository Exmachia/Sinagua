#!/usr/bin/env bash
# Descarga las fuentes oficiales a data/raw. CONAGUA usa Incapsula: requiere cookie jar.
set -euo pipefail
cd "$(dirname "$0")/../data/raw"
UA="Mozilla/5.0 (sinagua; datos abiertos)"
JAR=cookies.txt
BASE="https://sigagis.conagua.gob.mx/gas1/sections"
get() { curl -sSL --fail -m 180 -c "$JAR" -b "$JAR" -A "$UA" "$1" -o "$2"; echo "  ✓ $2 ($(wc -c < "$2" | tr -d ' ') bytes)"; }

echo "CONAGUA — disponibilidad 2023"
get "$BASE/Disponibilidad_Acuiferos.html" conagua.html
get "$BASE/assets/data/acuiferos.json" acuiferos_2023.json
get "$BASE/assets/geojson/acuiferos.geojson" acuiferos.geojson
get "$BASE/assets/geojson/estados.geojson" estados.geojson

echo "DOF — actualizaciones nacionales históricas"
for entry in 2013:5327360 2015:5389380 2018:5510042 2020:5600593; do
  year=${entry%%:*}; code=${entry##*:}
  [ -s "dof/$year.html" ] || { get "https://dof.gob.mx/nota_detalle.php?codigo=$code" "dof/$year.html"; sleep 2; }
done
echo "INEGI (vía CONABIO) — áreas geoestadísticas municipales 2023"
if [ ! -s mun23gw/mun23gw.shp ]; then
  get "http://www.conabio.gob.mx/informacion/gis/maps/geo/mun23gw.zip" mun23gw.zip
  mkdir -p mun23gw && unzip -oq mun23gw.zip -d mun23gw && rm mun23gw.zip
fi
echo "INEGI — Censo 2020, población por localidad (ITER, con coordenadas)"
if [ ! -s iter/conjunto_de_datos/conjunto_de_datos_iter_00CSV20.csv ]; then
  get "https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/iter/iter_00_cpv2020_csv.zip" iter.zip
  mkdir -p iter && unzip -oq iter.zip -d iter && rm iter.zip
fi
echo "SMN — Monitor de Sequía de México, por municipio (se actualiza cada quincena)"
mkdir -p sequia
get "https://smn.conagua.gob.mx/tools/RESOURCES/Monitor%20de%20Sequia%20en%20Mexico/MunicipiosSequia.xlsx" sequia/MunicipiosSequia.xlsx
rm -f "$JAR"
