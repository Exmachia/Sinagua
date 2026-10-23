/**
 * Artículos: casos que nos comparte la gente, contados con hechos y fuentes.
 * Regla: cada punto debe poder verificarse en una de las fuentes; lo que es opinión no entra.
 * Los "datos" se calculan con los datos oficiales del sitio (se actualizan solos).
 */
import type { DatoPedido } from "@/lib/articulos";

export type Articulo = {
  slug: string;
  titulo: string;
  entrada: string;
  lugar: string;
  estado: string; // clave INEGI
  fecha: string; // publicación
  puntos: string[];
  datos: DatoPedido[];
  fuentes: { nombre: string; url: string }[];
  mapa: string; // dónde verlo en el sitio
};

export const ARTICULOS: Articulo[] = [
  {
    slug: "guadalajara-agua-sucia",
    titulo: "Guadalajara: no es que falte agua, es que llega sucia",
    entrada: "Desde 2020 sale agua turbia en colonias de la zona metropolitana. El gobierno lo atribuye a descargas irregulares en el canal que alimenta la presa Las Pintas.",
    lugar: "Guadalajara, Jalisco",
    estado: "14",
    fecha: "2026-10-23",
    puntos: [
      "Las colonias con problemas pasaron de 126 en 2019 a 140 en 2020; en 2021, SIAPA reconoció afectaciones en 159.",
      "El 6 de octubre de 2026, el gobernador reconoció una crisis “sin precedentes” y dejó de usar el agua de la presa Las Pintas por al menos seis meses. El servicio se reparte por tandeos.",
      "El gobierno culpa a descargas irregulares a lo largo del canal de Las Pintas, que trae agua del lago de Chapala por el sistema antiguo.",
      "Cinco días después, unas 10 mil personas marcharon a Casa Jalisco.",
      "Las autoridades descartaron evidencia de daños a la salud que justificara una alerta sanitaria.",
    ],
    datos: [
      { tipo: "acuifero", clave: "1401" },
      { tipo: "calidad-superficie", estado: "14" },
    ],
    fuentes: [
      { nombre: "El Financiero, 18 oct 2026", url: "https://www.elfinanciero.com.mx/estados/2026/10/18/seis-anos-de-agua-sucia-en-guadalajara-por-que-y-como-comenzo-la-crisis/" },
      { nombre: "El Imparcial, 9 oct 2026", url: "https://www.elimparcial.com/mexico/2026/10/07/que-esta-pasando-en-guadalajara-agua-negra-y-con-mal-olor-mas-sucia-de-lo-que-reconocen-las-autoridades-sale-de-los-grifos-en-al-menos-475-colonias-desde-hace-mas-de-9-meses-y-luego-de-protestas-el-gobierno-les-dara-tandeos/" },
      { nombre: "El Informador, 12 oct 2026", url: "https://www.informador.mx/jalisco/siapa-lemus-anuncia-rotacion-del-agua-en-guadalajara-inicia-el-15-de-octubre-20261012-0187.html" },
    ],
    mapa: "/mapa#e=jalisco&a=1401",
  },
  {
    slug: "yucatan-granjas-porcicolas",
    titulo: "Yucatán: contaminación fecal en pozos y cenotes",
    entrada: "Comunidades mayas y Greenpeace encontraron contaminación en los 17 pozos y cenotes que analizaron. Otros estudios identificaron heces de cerdo en cinco puntos.",
    lugar: "Yucatán",
    estado: "31",
    fecha: "2026-10-23",
    puntos: [
      "En agosto de 2026, Greenpeace analizó 17 pozos y cenotes en Kinchil, Sitilpech, Motul, Chocholá, Molas, Celestún y San Antonio Tedzidz: todos tenían materia orgánica, bacterias e indicadores fecales.",
      "Estudios de la Red To'one Ja'o'on (2024 y 2026), analizados en la UNAM y en la Universidad Johns Hopkins, identificaron heces de cerdo en Mérida, Izamal, Kinchil, Chapab y Maxcanú.",
      "La mayoría de las granjas está en el Anillo de Cenotes, una zona muy vulnerable: el suelo deja pasar el agua, y lo que lleva, hacia el acuífero.",
      "El análisis de Greenpeace no distingue entre heces de animales y de personas; las comunidades piden investigar todas las fuentes, inspeccionar las granjas y frenar las nuevas.",
    ],
    datos: [
      { tipo: "calidad-pozo", estado: "31" },
      { tipo: "acuifero", clave: "3105" },
    ],
    fuentes: [
      { nombre: "Greenpeace México, 20 oct 2026", url: "https://www.greenpeace.org/mexico/informacion-prensa/65872/exigen-acciones-ante-la-contaminacion-del-agua/" },
      { nombre: "PorEsto, 20 oct 2026", url: "https://www.poresto.com/yucatan/merida/2026/10/20/greenpeace-detecta-contaminacion-cuerpos-agua-yucatan-vinculada-megagranjas-porcicolas.html" },
      { nombre: "Infolliteras, 21 oct 2026", url: "https://infolliteras.com/2026/10/21/estudio-presentado-por-greenpeace-revela-mosaico-complejo-de-contaminacion-organica-severa-en-cenotes-de-yucatan-que-puede-tener-origen-humano-y-o-animal-de-granjas-de-pollos-y-cerdos-entre-otro/" },
    ],
    mapa: "/mapa#e=yucatan",
  },
  {
    slug: "queretaro-centros-de-datos",
    titulo: "Querétaro: centros de datos en un estado sin agua de sobra",
    entrada: "Querétaro concentra la mayor cantidad de centros de datos del país y nadie sabe cuánta agua usan: no están obligados a reportarlo.",
    lugar: "Querétaro",
    estado: "22",
    fecha: "2026-10-23",
    puntos: [
      "Operan 12 centros de datos y hay 18 en construcción, según reportes de octubre de 2026; otras fuentes cuentan hasta 30.",
      "Por ser empresas de servicios, hoy no tienen que reportar cuánta agua consumen. El gobierno del estado prevé publicar esa información a partir de 2027.",
      "Oxfam México señala que un campus de Microsoft tiene permiso para extraer hasta 25 millones de litros al año. Es lo autorizado, no lo medido.",
      "El secretario de Desarrollo Sustentable sostiene que algunos consumen menos agua que un edificio de oficinas.",
      "Querétaro es el sexto estado con más estrés hídrico del país.",
    ],
    datos: [
      { tipo: "acuiferos-estado", estado: "22" },
      { tipo: "acuifero", clave: "2201" },
    ],
    fuentes: [
      { nombre: "Canal 44, oct 2026", url: "https://canal44.com/queretaro-reportara-2027-consumo-agua-centros-datos/" },
      { nombre: "El Congresista, 12 oct 2026", url: "https://elcongresista.mx/politica/queretaro/queretaro-reto-economia-digital-estres-hidrico" },
      { nombre: "Expansión, 27 may 2026", url: "https://expansion.mx/tecnologia/2026/05/27/data-centers-en-queretaro-chocan-con-el-estres-hidrico" },
    ],
    mapa: "/mapa#e=queretaro",
  },
];
