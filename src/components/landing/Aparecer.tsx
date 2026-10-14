"use client";

import { useEffect, useRef, useState } from "react";

/** Aparece suavemente (sube y se aclara) cuando entra en pantalla. Sin animación si se pide movimiento reducido. */
export default function Aparecer({ children, retraso = 0, className = "" }: { children: React.ReactNode; retraso?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVisto(true);
        io.disconnect();
      }
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${retraso}ms` }}
      className={`min-w-0 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${visto ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"} ${className}`}>
      {children}
    </div>
  );
}
