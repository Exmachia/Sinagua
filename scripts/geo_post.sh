#!/usr/bin/env bash
# Geometría final para el sitio, unida a los atributos que calcula build_data.py.
set -euo pipefail
cd "$(dirname "$0")/.."
MS="node_modules/.bin/mapshaper -quiet"
OUT=public/data
rm -rf $OUT/mun $OUT/estados.geojson && mkdir -p $OUT/mun

# Acuíferos (contorno del seleccionado y relleno en la vista estatal).
$MS -i data/raw/acuiferos.geojson \
  -filter-fields CLV_ACUI -rename-fields clave=CLV_ACUI \
  -join data/interim/acuiferos_props.csv keys=clave,clave field-types=clave:str \
  -simplify 6% weighted keep-shapes -clean \
  -o $OUT/acuiferos.geojson format=geojson precision=0.0001 id-field=clave

# Estados: disolución de los municipios del INEGI (bordes idénticos a los municipales).
$MS -i data/raw/mun23gw/mun23gw.shp \
  -simplify 4% weighted keep-shapes \
  -dissolve CVE_ENT copy-fields=NOM_ENT \
  -join data/interim/estados_props.csv keys=CVE_ENT,cve field-types=CVE_ENT:str,cve:str \
  -filter-fields CVE_ENT,nombre,pct \
  -o $OUT/estados.geojson format=geojson precision=0.001 id-field=CVE_ENT

# Punto interior de cada estado para su etiqueta (pastilla blanca en el mapa).
$MS -i data/raw/mun23gw/mun23gw.shp \
  -dissolve CVE_ENT \
  -join data/interim/estados_props.csv keys=CVE_ENT,cve field-types=CVE_ENT:str,cve:str \
  -points inner \
  -filter-fields CVE_ENT,nombre \
  -o $OUT/estados_puntos.geojson format=geojson precision=0.001

# Estados muy simplificados para la vista previa estática de la portada (SVG en el HTML).
$MS -i data/raw/mun23gw/mun23gw.shp \
  -dissolve CVE_ENT \
  -simplify 0.3% weighted keep-shapes \
  -filter-slivers min-area=30km2 \
  -o src/data/estados_preview.json format=geojson precision=0.01 id-field=CVE_ENT

# Municipios: un archivo por estado, se cargan al entrar a cada estado.
$MS -i data/raw/mun23gw/mun23gw.shp \
  -simplify 12% weighted keep-shapes \
  -join data/interim/municipios_props.csv keys=CVEGEO,g field-types=CVEGEO:str,g:str \
  -filter-fields CVEGEO,CVE_ENT,NOMGEO,pct \
  -split CVE_ENT \
  -o $OUT/mun/ format=geojson precision=0.0005 id-field=CVEGEO

# Burbujas: un punto por acuífero con su estatus.
$MS -i data/interim/burbujas.csv string-fields=clave \
  -points x=x y=y -filter-fields clave,n,s \
  -o $OUT/burbujas.geojson format=geojson precision=0.0001 id-field=clave

ls -lh $OUT $OUT/mun | head -12
echo "geo_post ✓"
