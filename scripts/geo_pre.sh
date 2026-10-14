#!/usr/bin/env bash
# Geometría previa al cálculo: cruce municipio × acuífero, puntos de burbuja, estados.
set -euo pipefail
cd "$(dirname "$0")/.."
MS="node_modules/.bin/mapshaper -quiet"
mkdir -p data/interim

# 1) Superficie de cada municipio que cae sobre cada acuífero (km², área esférica).
$MS -i data/raw/mun23gw/mun23gw.shp data/raw/acuiferos.geojson combine-files \
  -filter-fields CVEGEO target=mun23gw -filter-fields CLV_ACUI target=acuiferos \
  -union target=mun23gw,acuiferos fields=CVEGEO,CLV_ACUI name=cruce \
  -filter '!!(CVEGEO && CLV_ACUI)' \
  -each 'km2=this.area/1e6' \
  -o data/interim/cruce.csv

# 2) Atributos y superficie de municipios.
$MS -i data/raw/mun23gw/mun23gw.shp \
  -each 'km2=this.area/1e6, w=this.bounds[0], s=this.bounds[1], e=this.bounds[2], n=this.bounds[3]' \
  -filter-fields CVEGEO,CVE_ENT,NOMGEO,NOM_ENT,km2,w,s,e,n \
  -o data/interim/municipios.csv

# 3) Punto interior de cada acuífero (dónde va la burbuja).
$MS -i data/raw/acuiferos.geojson -points inner -filter-fields CLV_ACUI \
  -each 'x=this.x, y=this.y' -o data/interim/puntos.csv
echo "geo_pre ✓"
