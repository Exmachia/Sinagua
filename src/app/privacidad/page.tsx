import type { Metadata } from "next";
import NavFlotante from "@/components/landing/NavFlotante";
import { CONTACTO, CORREO } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Aviso de privacidad — Sinagua",
  description: "Qué datos pide Sinagua cuando mandas una denuncia, para qué los usa y cómo pedir que se borren.",
  alternates: { canonical: "/privacidad" },
};

const ACTUALIZADO = "24 de octubre de 2026";

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-[1.5rem] leading-tight font-semibold">{titulo}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

export default function Privacidad() {
  const contacto = (
    <a href={CONTACTO} className="font-semibold text-ink underline underline-offset-2 hover:text-critico">
      a {CORREO}
    </a>
  );
  return (
    <>
      <NavFlotante />
      <main className="mx-auto max-w-3xl px-4 pt-32 pb-24 sm:px-8 lg:pt-40">
        <h1 className="font-serif text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.04] font-semibold tracking-[-0.02em]">Aviso de privacidad</h1>
        <p className="mt-3 text-[14px] text-ink-3">Última actualización: {ACTUALIZADO}</p>

        <Bloque titulo="Quién es responsable">
          <p>
            Sinagua (sinagua.org) es un proyecto ciudadano independiente y sin fines de lucro. Es responsable de los datos que
            nos mandas por el formulario de denuncias, conforme a la Ley Federal de Protección de Datos Personales en Posesión
            de los Particulares.
          </p>
        </Bloque>

        <Bloque titulo="Qué datos pedimos">
          <p>Solo cuando mandas una denuncia: tu correo, tu estado, tu municipio (si lo eliges), tu mensaje y las fotos que agregues.</p>
          <p>No pedimos tu nombre, teléfono, dirección ni datos financieros. No usamos cookies de seguimiento ni publicidad.</p>
        </Bloque>

        <Bloque titulo="Para qué los usamos">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Leer tu denuncia y, si hace falta, responderte a tu correo.</li>
            <li>
              Si lo autorizas con la casilla del formulario, publicar tu mensaje en el muro de denuncias <strong>como anónimo</strong>:
              solo el texto (con la ortografía corregida y sin nombres de personas), tu estado, tu municipio y la fecha.
            </li>
          </ul>
          <p>Tu correo y tus fotos nunca se publican. No vendemos ni compartimos tus datos con nadie para otros fines.</p>
        </Bloque>

        <Bloque titulo="Quién más los procesa">
          <p>
            Para que el sitio funcione usamos dos servicios que procesan los datos solo por cuenta nuestra: Vercel (aloja el
            sitio) y Resend (entrega el correo con tu denuncia). Las estadísticas de visitas de Vercel no usan cookies ni
            identifican a nadie.
          </p>
        </Bloque>

        <Bloque titulo="Cuánto tiempo los guardamos">
          <p>
            Tu denuncia llega a un correo y se guarda ahí mientras sea útil para darle seguimiento. Si nos lo pides, la
            borramos, junto con tu correo y tus fotos.
          </p>
        </Bloque>

        <Bloque titulo="Tus derechos">
          <p>
            Puedes pedir en cualquier momento ver tus datos, corregirlos, borrarlos u oponerte a que los usemos (derechos ARCO),
            y también que quitemos del muro una denuncia tuya. Escríbenos {contacto} con el correo que usaste y lo que
            necesitas; te respondemos en un máximo de 20 días hábiles.
          </p>
          <p>Si una denuncia publicada te afecta, escríbenos por el mismo medio y la revisamos.</p>
        </Bloque>

        <Bloque titulo="Cambios a este aviso">
          <p>Si cambia, lo publicamos en esta misma página con su fecha.</p>
        </Bloque>
      </main>
    </>
  );
}
