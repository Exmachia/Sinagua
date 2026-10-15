"use client";

import { useEffect } from "react";

/** Lleva al visitante a la ficha en el mapa. Los robots de redes sociales no ejecutan JS: se quedan con la tarjeta. */
export default function Redirigir({ destino }: { destino: string }) {
  useEffect(() => {
    window.location.replace(destino);
  }, [destino]);
  return null;
}
