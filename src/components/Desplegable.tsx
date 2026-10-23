"use client";

import { useState } from "react";

/** En celular, el contenido se abre con un botón (para no alargar la página); en escritorio siempre se ve. */
export default function Desplegable({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierto((x) => !x)} aria-expanded={abierto}
        className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-full bg-surface px-5 text-[15px] font-semibold ring-1 ring-line-strong md:hidden">
        {abierto ? "Ocultar" : etiqueta}
        <svg aria-hidden viewBox="0 0 24 24" className={`size-4 transition-transform ${abierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div className={abierto ? "" : "max-md:hidden"}>{children}</div>
    </>
  );
}
