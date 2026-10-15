import Link from "next/link";

const CAPAS = [
  { href: "/mapa", label: "Acuíferos" },
  { href: "/presas", label: "Presas" },
] as const;

/** Cambia entre los mapas del sitio. Vive sobre el mapa, junto al buscador. */
export default function Conmutador({ actual }: { actual: "/mapa" | "/presas" }) {
  return (
    <nav aria-label="Mapas" className="pointer-events-auto grid grid-cols-2 gap-1 rounded-[10px] bg-surface p-1 shadow-[0_6px_24px_rgba(25,23,20,0.14)] ring-1 ring-black/5">
      {CAPAS.map((c) => {
        const activo = c.href === actual;
        return (
          <Link key={c.href} href={c.href} aria-current={activo ? "page" : undefined}
            className={`flex min-h-11 flex-col items-center justify-center rounded-md px-2 leading-tight transition-colors ${
              activo ? "bg-ink text-white" : "text-ink-2 hover:bg-raised hover:text-ink"
            }`}>
            <span className="text-[14px] font-semibold">{c.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
