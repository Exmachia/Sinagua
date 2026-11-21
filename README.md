# Sinagua — el agua de México

Sitio ciudadano y sin fines de lucro que reúne los datos oficiales del agua en México y los traduce a lenguaje llano,
municipio por municipio: sequía, nivel de las presas, acuíferos sobreexplotados, calidad del agua y quién tiene permiso
de sacarla. También publica denuncias anónimas de la gente sobre lo que vive con el agua donde vive.

**Sitio:** https://www.sinagua.org

El nombre es una parodia de CONAGUA. El proyecto es independiente: no está afiliado a CONAGUA, a ninguna dependencia de
gobierno ni a ningún partido.

## Fuentes

Todo sale de fuentes oficiales y se cita en el sitio, en la página de metodología.

| Tema | Fuente | Actualización |
|---|---|---|
| Presas | CONAGUA: Sistema Nacional de Información del Agua (1991–2025) y Sistema de Información Hidrológica | Lunes y jueves, automática |
| Picachos y Santa María (Sinaloa) | Reporte diario del Organismo de Cuenca Pacífico Norte de CONAGUA, publicado por la [CIDH](https://cidh.org.mx/almacenamiento-de-presas/) | Lunes y jueves, automática |
| Sequía | Monitor de Sequía de México (Servicio Meteorológico Nacional) | Lunes y jueves, automática |
| Acuíferos | Disponibilidad de agua de los acuíferos, Diario Oficial de la Federación (2013–2023) | A mano, cuando sale una revisión |
| Quién usa el agua | Registro Público de Derechos de Agua (REPDA) de CONAGUA | Lunes y jueves, automática |
| Calidad del agua | Red Nacional de Medición de Calidad del Agua de CONAGUA | Lunes y jueves, automática |
| Población y municipios | INEGI: Censo 2020 y marco geoestadístico | Fija |

Gracias a Conselva, Costas y Comunidades A.C. por el aviso sobre las presas Picachos y Santa María.

## Denuncias

El formulario del sitio envía las denuncias por correo; no se guardan en este repositorio ni en una base de datos. Solo las
que se revisan a mano y se publican viven en `src/data/denuncias.json`, siempre anónimas y sin datos que identifiquen a
nadie. Las reglas de moderación están en el mismo archivo.

## Licencia

- **Código:** [MIT](LICENSE). Puedes usarlo, copiarlo y adaptarlo dando crédito.
- **Datos:** son públicos de las dependencias citadas arriba; si los reutilizas, cita la fuente original.
- **Denuncias:** son testimonios de personas. No se permite reutilizarlas fuera de Sinagua.

## Contacto

eduardo.chacom12@gmail.com

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
- Picachos y Santa María: `python3 scripts/fetch_cidh.py` (requiere `pypdf`) lee el PDF diario del Organismo de Cuenca
  Pacífico Norte que publica la CIDH. Cuentan en Sinaloa pero no en el panel nacional ni en sus series.

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
