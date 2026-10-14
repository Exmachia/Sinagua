/**
 * Marca "Sinagua": parodia de CONAGUA. "Sin" resaltado; nunca usar el logo ni los colores de la dependencia.
 */
export default function Marca({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif font-semibold tracking-[-0.01em] ${className}`}>
      <span className="text-critico">Sin</span>agua
    </span>
  );
}
