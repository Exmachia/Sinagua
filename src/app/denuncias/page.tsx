import type { Metadata } from "next";
import Link from "next/link";
import NavFlotante from "@/components/landing/NavFlotante";
import MuroDenuncias, { BotonDenunciar } from "@/components/MuroDenuncias";
import { DENUNCIAS } from "@/lib/denuncias";
import { CONTACTO } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Denuncias — Sinagua",
  description: "Lo que la gente nos cuenta que pasa con el agua donde vive. Anónimo, por estado y municipio.",
  alternates: { canonical: "/denuncias" },
};

export default function Denuncias() {
  return (
    <>
      <NavFlotante />
      <main className="mx-auto max-w-6xl px-4 pt-32 pb-24 sm:px-8 lg:pt-40">
        <p className="text-[14px] font-semibold text-critico">Denuncias</p>
        <h1 className="mt-3 max-w-3xl font-serif text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.04] font-semibold tracking-[-0.02em] text-balance">
          Lo que pasa con el agua, contado por quien lo vive
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
          <BotonDenunciar />
          <p className="max-w-[44ch] text-[14px] leading-snug text-ink-3">
            Todas las denuncias son anónimas. Manda la tuya para que se publique aquí.
          </p>
        </div>
        <MuroDenuncias denuncias={DENUNCIAS} />
        <p className="mt-10 max-w-[64ch] border-t border-line pt-6 text-[13px] leading-relaxed text-ink-3">
          Estas denuncias las escribe la gente que está viviendo estas situaciones; no las verificamos una por una. Las
          publicamos para que se conozcan.{" "}
          ¿Una denuncia te afecta, o es tuya y quieres que la quitemos?{" "}
          <a href={CONTACTO} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">Escríbenos</a>{" "}
          y la revisamos. <Link href="/privacidad" className="underline underline-offset-2 hover:text-ink">Aviso de privacidad</Link>.
        </p>
      </main>
    </>
  );
}
