import type { Metadata } from "next";
import Explorer from "@/components/Explorer";

export const metadata: Metadata = {
  alternates: { canonical: "/mapa" },
  title: "Acuíferos — Sinagua",
  description: "Explora los 653 acuíferos de México por estado y municipio: qué tienes bajo tus pies y cómo está.",
};

export default function MapaPage() {
  return (
    <main className="h-dvh overflow-clip">
      <h1 className="sr-only">Mapa de acuíferos de México</h1>
      <Explorer />
    </main>
  );
}
