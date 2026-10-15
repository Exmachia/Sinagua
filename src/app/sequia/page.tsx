import type { Metadata } from "next";
import SequiaExplorer from "@/components/SequiaExplorer";

export const metadata: Metadata = {
  title: "Sequía — Sinagua",
  description: "Qué municipios de México están en sequía hoy y desde cuándo, según el Monitor de Sequía de México.",
};

export default function SequiaPage() {
  return (
    <main className="h-dvh overflow-clip">
      <h1 className="sr-only">Mapa de sequía de México</h1>
      <SequiaExplorer />
    </main>
  );
}
