"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Acuifero, Estado, Municipio } from "@/lib/acuiferos";
import type { Vista } from "./AquiferMap";
import SearchBox from "./SearchBox";

type Datos = { acuiferos: Acuifero[]; municipios: Municipio[]; estados: Estado[] };

/** Buscador de la portada: abre /mapa con la ubicación elegida. */
export default function HeroSearch() {
  const [d, setD] = useState<Datos | null>(null);
  const router = useRouter();

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

  if (!d) {
    return (
      <div>
        <p className="mb-2 text-[15px] font-semibold">Busca tu municipio, estado o acuífero</p>
        <div className="h-14 animate-pulse border border-line-strong bg-raised" aria-hidden />
      </div>
    );
  }

  const slug = new Map(d.estados.map((e) => [e.cve, e.slug]));
  const ir = (v: Vista) => {
    const p = new URLSearchParams();
    if (v.e) p.set("e", slug.get(v.e) ?? v.e);
    if (v.m) p.set("m", v.m);
    if (v.a) p.set("a", v.a);
    router.push(`/mapa#${p.toString()}`);
  };

  return <SearchBox grande estados={d.estados} municipios={d.municipios} acuiferos={d.acuiferos} onPick={ir} />;
}
