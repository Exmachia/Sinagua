"use client";

import { useMemo } from "react";
import { ESTATUS, normaliza, type Acuifero, type Estado, type Municipio } from "@/lib/acuiferos";
import type { Vista } from "./AquiferMap";
import Buscador, { type Opcion } from "./Buscador";

type Props = {
  estados: Estado[];
  municipios: Municipio[];
  acuiferos: Acuifero[];
  onPick: (v: Vista) => void;
  grande?: boolean;
  flotante?: boolean;
  cargando?: boolean;
};

/** Buscador de acuíferos: estados, municipios y acuíferos. */
export default function SearchBox({ estados, municipios, acuiferos, onPick, grande, flotante, cargando }: Props) {
  const opciones = useMemo<Opcion<Vista>[]>(() => {
    const nombreEstado = new Map(estados.map((e) => [e.cve, e.e]));
    return [
      ...estados.map((e) => ({
        key: normaliza(e.e), tipo: "Estado", label: e.e, sub: `${e.total} acuíferos`,
        valor: { e: e.cve, m: null, a: null },
      })),
      ...municipios.map((m) => ({
        key: normaliza(m.n), tipo: "Municipio", label: m.n, sub: nombreEstado.get(m.ent) ?? "",
        valor: { e: m.ent, m: m.g, a: null },
      })),
      ...acuiferos.map((a) => ({
        key: normaliza(`${a.n} ${a.c}`), tipo: "Acuífero", label: a.n, sub: `${a.c} · ${ESTATUS[a.s].label}`,
        valor: { e: a.st[0] ?? null, m: null, a: a.c }, color: ESTATUS[a.s].color,
      })),
    ];
  }, [estados, municipios, acuiferos]);

  return (
    <Buscador opciones={opciones} onPick={onPick} grande={grande} flotante={flotante} cargando={cargando}
      etiqueta="Busca tu municipio, estado o acuífero"
      placeholder={grande ? "Ej. León, Hermosillo, Valle de Celaya" : "Busca municipio, estado o acuífero"} />
  );
}
