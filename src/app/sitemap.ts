import type { MetadataRoute } from "next";
import agua from "@/data/agua.json";
import presas from "@/data/presas_resumen.json";
import { DENUNCIAS } from "@/lib/denuncias";
import { SITIO } from "@/lib/sitio";

// La fecha de cada página es la de sus datos: así el buscador sabe cuándo hubo algo nuevo.
export default function sitemap(): MetadataRoute.Sitemap {
  const sequia = new Date(agua.sequia.actual.f);
  const presasF = new Date(presas.ultima);
  const reciente = sequia > presasF ? sequia : presasF;
  return [
    { url: `${SITIO}/`, lastModified: reciente, changeFrequency: "weekly", priority: 1 },
    { url: `${SITIO}/mapa`, lastModified: new Date("2023-11-09"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITIO}/presas`, lastModified: presasF, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITIO}/denuncias`, lastModified: new Date(DENUNCIAS[0]?.fecha ?? reciente), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITIO}/metodologia`, lastModified: reciente, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITIO}/urgente`, lastModified: reciente, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITIO}/privacidad`, lastModified: new Date("2026-10-24"), changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITIO}/sequia`, lastModified: sequia, changeFrequency: "weekly", priority: 0.8 },
  ];
}
