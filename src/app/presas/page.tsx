import type { Metadata } from "next";
import PresasExplorer from "@/components/PresasExplorer";

export const metadata: Metadata = {
  alternates: { canonical: "/presas" },
  title: "Presas — Sinagua",
  description: "Qué tan llenas están las principales presas de México y cómo han cambiado desde 1991.",
};

export default function PresasPage() {
  return (
    <main className="h-dvh overflow-clip">
      <h1 className="sr-only">Mapa de presas de México</h1>
      <PresasExplorer />
    </main>
  );
}
