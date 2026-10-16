// El dominio sinagua.org lo usó otro sitio en 2020–2021 (foro y blog). Aún llegan visitas a esas páginas viejas:
// se responde 410 ("ya no existe") para que los buscadores las quiten de su índice más rápido.
export function GET() {
  return new Response("Esta página ya no existe. Visita https://www.sinagua.org", {
    status: 410,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
