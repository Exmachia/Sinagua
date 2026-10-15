"use client";

import { useState } from "react";

/**
 * Comparte la imagen vertical de una alerta. En el celular abre el menú nativo con la imagen (Instagram, WhatsApp…);
 * donde no se puede compartir archivos, la descarga para subirla a mano.
 */
export default function BotonHistoria({ id, titulo, lugar }: { id: string; titulo: string; lugar: string }) {
  const [estado, setEstado] = useState<"listo" | "cargando" | "descargada">("listo");
  async function compartir() {
    setEstado("cargando");
    try {
      const blob = await fetch(`/urgente/historia/${id}`).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      });
      const archivo = new File([blob], `sinagua-${id}.png`, { type: "image/png" });
      const texto = `${lugar.split(",")[0]} necesita que se sepa: ${titulo}. Datos en sinagua.org/urgente`;
      if (navigator.canShare?.({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: titulo, text: texto });
          setEstado("listo");
          return;
        } catch (e) {
          if ((e as DOMException)?.name === "AbortError") {
            setEstado("listo");
            return;
          }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = archivo.name;
      a.click();
      URL.revokeObjectURL(url);
      setEstado("descargada");
      setTimeout(() => setEstado("listo"), 4000);
    } catch {
      setEstado("listo");
    }
  }
  return (
    <button type="button" onClick={compartir} disabled={estado === "cargando"} aria-live="polite"
      className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-critico px-5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70">
      <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M12 15V8M9 11l3-3 3 3" />
      </svg>
      {estado === "cargando" ? "Preparando…" : estado === "descargada" ? "Imagen descargada: súbela a tu historia" : "Compartir en historias"}
    </button>
  );
}
