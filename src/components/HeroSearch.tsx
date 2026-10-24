"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Acuifero, Estado, Municipio } from "@/lib/acuiferos";
import type { Vista } from "./AquiferMap";
import SearchBox from "./SearchBox";

type Datos = { acuiferos: Acuifero[]; municipios: Municipio[]; estados: Estado[] };
const VACIO: Datos = { acuiferos: [], municipios: [], estados: [] };

/** Buscador de la portada: abre /mapa con la ubicación elegida. */
export default function HeroSearch() {
  const [d, setD] = useState<Datos | null>(null);
  const router = useRouter();

  // El buscador se muestra de inmediato; la lista (~140 KB comprimida) se pide al montar.
  useEffect(() => {
    let vivo = true;
    const get = (u: string) => fetch(u).then((r) => r.json());
    Promise.all([get("/data/acuiferos.json"), get("/data/municipios.json"), get("/data/estados.json")])
      .then(([acuiferos, municipios, estados]) => vivo && setD({ acuiferos, municipios, estados }))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const datos = d ?? VACIO;
  const slug = new Map(datos.estados.map((e) => [e.cve, e.slug]));
  const ir = (v: Vista) => {
    const p = new URLSearchParams();
    if (v.e) p.set("e", slug.get(v.e) ?? v.e);
    if (v.m) p.set("m", v.m);
    if (v.a) p.set("a", v.a);
    router.push(`/mapa#${p.toString()}`);
  };

  return <SearchBox grande estados={datos.estados} municipios={datos.municipios} acuiferos={datos.acuiferos} onPick={ir} cargando={!d} />;
}
