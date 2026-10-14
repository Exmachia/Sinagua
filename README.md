# Sinagua — el agua de México

Sitio ciudadano de periodismo de datos sobre la falta de agua en México: agua por persona, sequía, presas y acuíferos.
El nombre es una parodia de CONAGUA; el proyecto es independiente y no está afiliado a ninguna dependencia de gobierno.

Sitio de periodismo de datos sobre la disponibilidad de agua subterránea en los 653 acuíferos de México.

## Desarrollo

```bash
npm install
npm run dev
```

## Datos

Todo el pipeline es reproducible y usa solo fuentes oficiales:

```bash
npm run data        # descarga (data:fetch) + procesa (data:build)
```

| Paso | Script | Qué hace |
|---|---|---|
| `data:fetch` | `scripts/fetch.sh` | CONAGUA (disponibilidad 2023, polígonos), DOF (2013–2020) e INEGI municipios 2023 (vía CONABIO) → `data/raw/` |
| `data:build` | `scripts/geo_pre.sh` | Cruce municipio × acuífero (km²), punto interior de cada acuífero |
|  | `scripts/build_data.py` | Historia, estatus, % de territorio en déficit por municipio/estado → `public/data/*.json`, `src/data/resumen.json` |
|  | `scripts/geo_post.sh` | Geometrías simplificadas: estados, acuíferos, burbujas y un archivo de municipios por estado (`public/data/mun/`) |

### Actualización automática

`.github/workflows/actualizar-datos.yml` corre **lunes y jueves** (y a mano desde la pestaña *Actions* → *Run workflow*):
baja presas (SIH) y sequía (SMN), recalcula, verifica que el sitio compila y, si hubo cambios, hace commit en `main`.
Vercel publica con cada push. Si una descarga falla o trae datos más viejos que los publicados, el flujo se detiene
sin escribir nada.

En local: `npm run data:presas` y `npm run data:agua`.

### Presas

```bash
npm run data:sina      # solo una vez: baja el SINA 1991–2025 y lo compacta en data/fuentes/ (ya versionado)
npm run data:presas    # extensión diaria hasta hoy (SIH) + procesamiento
node scripts/fetch_presas.mjs 1991-01-02 2025-04-23 reverso   # opcional: segundo proceso en paralelo
python3 -I scripts/build_presas.py
```

- Fuentes: API del monitoreo de presas de CONAGUA (SINA, solo responde dentro de un navegador; se detiene el 23 abr 2025)
  y el histórico diario por presa del SIH (`bash scripts/fetch_sih.sh`, se actualiza a diario). Ambas dan cifras idénticas
  en las fechas que se traslapan; el SIH extiende la serie semanal hasta la semana más reciente.
- Limpieza: se descartan almacenamientos imposibles (> NAME + 5%) y picos aislados (> 40 pts de la mediana de ±4 semanas).
  Presas con > 20% de registros inválidos quedan fuera de los agregados (`aviso: true`).
- Agregados con panel fijo (presas con ≥ 90% de semanas desde 2000) para que el promedio no cambie por altas/bajas del registro.

### Estatus

Presión = volumen concesionado / (recarga − descarga natural comprometida).

| Estatus | Regla |
|---|---|
| Con agua disponible | presión < 60% |
| Cerca del límite | 60% ≤ presión, DMA ≥ 0 |
| En déficit | DMA < 0 y presión < 150% |
| Déficit severo | DMA < 0 y presión ≥ 150% (o sin recarga aprovechable) |

### Territorio en déficit

% de la superficie de un municipio o estado que está sobre acuíferos en déficit (déficit + déficit severo).

## Navegación

México (coropleta por estado) → Estado (municipios + una burbuja por acuífero) → Municipio (acuíferos bajo él) → Acuífero.
La vista vive en el hash y es compartible: `#e=guanajuato&m=11020&a=1113`.

## Diseño

- Modo claro, estilo editorial impreso. Tipografía: Newsreader (titulares) y Schibsted Grotesk (texto).
- Paletas validadas para daltonismo sobre `#fbfaf7`:
  - Estatus: `#2a78d6` → `#7f7a70` → `#e0703a` → `#9e2f1c` (más oscuro = más grave).
  - Territorio en déficit (secuencial): `#ece8df` + `#e2a47b` → `#6f2e18`.
- Mapa: MapLibre GL + base positron de OpenFreeMap (gratuita, sin API key, etiquetas en español).

### Población y proyecciones

- `scripts/build_poblacion.py`: ubica cada localidad del Censo 2020 (INEGI, ITER) sobre su acuífero (99.9% de la población asignada).
- `scripts/build_proyecciones.py`: con las 5 actualizaciones del DOF (2013–2023) ajusta una recta (acuíferos en déficit, % de
  territorio y personas) con intervalo de predicción del 95% → `src/data/proyecciones.json`.
  Es un **escenario de continuidad**, no un pronóstico; la landing lo explica en el botón "?".

## Fases

1. **Fase 1 (hecha):** pipeline de datos, mapa estado → municipio → acuífero, búsqueda por municipio/estado/acuífero, ficha con historia 2013–2023, metodología.
2. ~~Municipios~~ (hecho en la fase 1).
3. Proyecciones: tendencia por acuífero con intervalos de confianza (+ GRACE, CONAPO).
4. Contexto: población afectada, usos del agua (REPDA), mapa base con etiquetas (Protomaps).
