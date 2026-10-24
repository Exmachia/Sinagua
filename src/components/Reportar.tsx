"use client";

import { useEffect, useRef, useState } from "react";

type Estado = { cve: string; e: string };
type Municipio = { n: string; ent: string };

const MAX_FOTOS = 3;

/** Reduce una foto a 1600 px por lado y la pasa a JPEG, para que el envío sea ligero. */
async function reducir(archivo: File): Promise<Blob> {
  const img = await createImageBitmap(archivo);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(img.width * k);
  lienzo.height = Math.round(img.height * k);
  lienzo.getContext("2d")!.drawImage(img, 0, 0, lienzo.width, lienzo.height);
  img.close();
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("foto"))), "image/jpeg", 0.8));
}

/** Botón flotante "Cuéntanos" y su formulario: la gente manda lo que pasa con el agua donde vive. */
export default function Reportar() {
  const [abierto, setAbierto] = useState(false);
  const [estados, setEstados] = useState<Estado[] | null>(null);
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);
  const [cve, setCve] = useState("");
  const [fotos, setFotos] = useState<{ blob: Blob; url: string }[]>([]);
  const [estado, setEstado] = useState<"listo" | "enviando" | "enviado" | "error">("listo");
  const [error, setError] = useState("");
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  // El muro de denuncias también lo abre (botón "Manda tu denuncia")
  useEffect(() => {
    const abrir = () => {
      setAbierto(true);
      setEstado((x) => (x === "enviando" ? x : "listo"));
    };
    window.addEventListener("sinagua:reportar", abrir);
    return () => window.removeEventListener("sinagua:reportar", abrir);
  }, []);

  // Las listas se cargan solo cuando alguien abre el formulario
  useEffect(() => {
    if (!abierto || estados) return;
    fetch("/data/estados.json").then((r) => r.json()).then(setEstados).catch(() => setEstados([]));
    fetch("/data/municipios.json").then((r) => r.json()).then(setMunicipios).catch(() => setMunicipios([]));
  }, [abierto, estados]);

  useEffect(() => {
    if (!abierto) return;
    caja.current?.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
    // Mientras está abierto, la página de atrás no se mueve (en celular el scroll se iba al fondo)
    const html = document.documentElement;
    const antes = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
      [html.style.overflow, document.body.style.overflow] = antes;
    };
  }, [abierto]);

  function cerrar() {
    setAbierto(false);
    boton.current?.focus();
  }

  async function agregarFotos(lista: FileList | null) {
    if (!lista) return;
    const nuevas: { blob: Blob; url: string }[] = [];
    for (const f of [...lista].slice(0, MAX_FOTOS - fotos.length)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const blob = await reducir(f);
        nuevas.push({ blob, url: URL.createObjectURL(blob) });
      } catch {
        /* una foto que no se puede leer se ignora */
      }
    }
    setFotos((x) => [...x, ...nuevas]);
  }

  function quitarFoto(i: number) {
    setFotos((x) => {
      URL.revokeObjectURL(x[i].url);
      return x.filter((_, j) => j !== i);
    });
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    datos.set("estado", estados?.find((x) => x.cve === cve)?.e ?? "");
    for (const f of fotos) datos.append("fotos", f.blob, "foto.jpg");
    setEstado("enviando");
    setError("");
    try {
      const r = await fetch("/api/reporte", { method: "POST", body: datos });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "No se pudo enviar.");
      setEstado("enviado");
      fotos.forEach((f) => URL.revokeObjectURL(f.url));
      setFotos([]);
      setCve("");
    } catch (err) {
      setEstado("error");
      setError(err instanceof Error ? err.message : "No se pudo enviar.");
    }
  }

  const deEstado = municipios?.filter((m) => m.ent === cve).map((m) => m.n).sort((a, b) => a.localeCompare(b, "es")) ?? [];
  // Flecha propia en los select: la del navegador queda pegada al borde
  const flecha = "appearance-none pr-10";
  const conFlecha = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b655c' stroke-width='2.2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    backgroundSize: "16px",
  };
  const campo = "mt-1 block min-h-11 w-full rounded-xl bg-surface px-3.5 text-[16px] ring-1 ring-line-strong focus:ring-2 focus:ring-ink focus:outline-none";

  return (
    <>
      <button ref={boton} type="button" onClick={() => { setAbierto(true); if (estado !== "enviando") setEstado("listo"); }}
        aria-haspopup="dialog" aria-expanded={abierto} aria-label="Cuéntanos qué pasa con el agua donde vives" title="Cuéntanos qué pasa con el agua donde vives"
        className="pointer-events-auto fixed right-4 bottom-5 z-40 grid size-12 cursor-pointer place-items-center rounded-full bg-critico text-white shadow-[0_8px_24px_rgba(25,23,20,0.25)] transition-opacity hover:opacity-90">
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
      </button>

      {abierto && (
        <div className="pointer-events-auto fixed inset-0 z-[60] flex overscroll-contain items-end justify-center bg-ink/40 sm:items-center sm:p-4" onPointerDown={(e) => e.target === e.currentTarget && cerrar()}>
          <div ref={caja} role="dialog" aria-modal="true" aria-labelledby="reportar-titulo"
            className="relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-bg p-6 shadow-[0_20px_60px_rgba(25,23,20,0.3)] sm:max-w-lg sm:rounded-3xl sm:p-8">
            <button type="button" onClick={cerrar} aria-label="Cerrar"
              className="absolute top-3 right-3 grid size-11 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-raised">
              <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>

            {estado === "enviado" ? (
              <div className="py-6 pr-8">
                <h2 id="reportar-titulo" className="font-serif text-[1.7rem] leading-tight font-semibold">Gracias. Ya me llegó.</h2>
                <p className="mt-3 text-ink-2">Lo leo y, si hace falta, te escribo a tu correo.</p>
                <button type="button" onClick={cerrar} className="mt-6 min-h-11 cursor-pointer rounded-full bg-ink px-6 font-semibold text-white hover:opacity-85">Cerrar</button>
              </div>
            ) : (
              <form onSubmit={enviar} className="space-y-4">
                <div className="pr-10">
                  <h2 id="reportar-titulo" className="font-serif text-[1.7rem] leading-tight font-semibold">¿Qué pasa con el agua donde vives?</h2>
                </div>

                <label className="block text-[14px] font-semibold">
                  Tu correo
                  <input name="correo" type="email" required autoComplete="email" inputMode="email" className={campo} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-[14px] font-semibold">
                    Estado
                    <select required value={cve} onChange={(e) => setCve(e.target.value)} className={`${campo} ${flecha}`} style={conFlecha}>
                      <option value="">{estados ? "Elige" : "Cargando…"}</option>
                      {estados?.map((x) => <option key={x.cve} value={x.cve}>{x.e}</option>)}
                    </select>
                  </label>
                  <label className="block text-[14px] font-semibold">
                    Municipio <span className="font-normal text-ink-3">(opcional)</span>
                    <select name="municipio" disabled={!cve} className={`${campo} ${flecha} disabled:opacity-50`} style={conFlecha}>
                      <option value="">{cve ? "Elige" : "Primero el estado"}</option>
                      {deEstado.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                </div>
                <label className="block text-[14px] font-semibold">
                  ¿Qué está pasando?
                  <textarea name="mensaje" required minLength={10} maxLength={4000} rows={5}
                    placeholder="Desde cuándo, qué colonias, qué dicen las autoridades…"
                    className={`${campo} py-2.5 leading-relaxed font-normal placeholder:text-ink-3`} />
                </label>

                <div>
                  <p className="text-[14px] font-semibold">Fotos <span className="font-normal text-ink-3">(opcional, hasta {MAX_FOTOS})</span></p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fotos.map((f, i) => (
                      <div key={f.url} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.url} alt={`Foto ${i + 1}`} className="size-20 rounded-xl object-cover ring-1 ring-black/10" />
                        <button type="button" onClick={() => quitarFoto(i)} aria-label={`Quitar la foto ${i + 1}`}
                          className="absolute -top-2 -right-2 grid size-7 cursor-pointer place-items-center rounded-full bg-ink text-white">
                          <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </button>
                      </div>
                    ))}
                    {fotos.length < MAX_FOTOS && (
                      <label className="grid size-20 cursor-pointer place-items-center rounded-xl text-ink-2 ring-1 ring-line-strong ring-dashed hover:bg-raised">
                        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                        <span className="sr-only">Agregar fotos</span>
                        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { agregarFotos(e.target.files); e.target.value = ""; }} />
                      </label>
                    )}
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug">
                  <input name="publicar" type="checkbox" defaultChecked className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--ink)]" />
                  <span>Se puede publicar en el <a href="/denuncias" target="_blank" className="underline underline-offset-2">muro de denuncias</a>, como anónima.</span>
                </label>

                {/* Trampa para bots: la gente no la ve */}
                <input name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />

                {estado === "error" && <p role="alert" className="text-[14px] font-semibold text-critico">{error}</p>}

                <button type="submit" disabled={estado === "enviando"}
                  className="min-h-12 w-full cursor-pointer rounded-full bg-ink px-6 text-[16px] font-semibold text-white hover:opacity-85 disabled:cursor-wait disabled:opacity-60">
                  {estado === "enviando" ? "Enviando…" : "Enviar"}
                </button>
                <p className="text-[12px] leading-snug text-ink-3">
                  Tu correo solo es para responderte; nunca se publica. Tampoco publicamos nombres de personas.{" "}
                  <a href="/privacidad" target="_blank" className="underline underline-offset-2 hover:text-ink">Aviso de privacidad</a>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
