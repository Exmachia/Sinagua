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

  // La lista del buscador (~140 KB) se pide cuando la página ya se dibujó, para no competir con la portada.
  useEffect(() => {
    let vivo = true;
    const get = (u: string) => fetch(u).then((r) => r.json());
    const cargar = () =>
      Promise.all([get("/data/acuiferos.json"), get("/data/municipios.json"), get("/data/estados.json")])
        .then(([acuiferos, municipios, estados]) => vivo && setD({ acuiferos, municipios, estados }))
        .catch(() => {});
    // Safari no tiene requestIdleCallback: ahí se espera un momento.
    const ocioso = typeof window.requestIdleCallback === "function";
    const id = ocioso ? window.requestIdleCallback(cargar, { timeout: 2500 }) : window.setTimeout(cargar, 1200) as number;
    return () => {
      vivo = false;
      if (ocioso) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);

  if (!d) {
    return (
      <div>
        <p className="mb-2 text-[15px] font-semibold">Busca tu municipio, estado o acuífero</p>
        <div className="h-14 animate-pulse rounded-full bg-raised ring-1 ring-line-strong" aria-hidden />
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
