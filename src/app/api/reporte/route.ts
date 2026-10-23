/**
 * Recibe el formulario "Cuéntanos" y lo manda por correo con Resend (https://resend.com).
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY  clave de Resend
 *   REPORTE_PARA    correo que recibe los reportes (no se pone en el código: el repo es público)
 *   REPORTE_DE      opcional; remitente verificado en Resend (por defecto, el de pruebas de Resend)
 */

const MAX_FOTOS = 3;
const MAX_FOTO = 1.5 * 1024 * 1024; // las fotos llegan ya reducidas desde el navegador
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Límite simple por IP (por instancia): 5 envíos cada 10 minutos
const envios = new Map<string, number[]>();
function demasiados(ip: string) {
  const ahora = Date.now();
  const lista = (envios.get(ip) ?? []).filter((t) => ahora - t < 10 * 60 * 1000);
  lista.push(ahora);
  envios.set(ip, lista);
  return lista.length > 5;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const texto = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  const clave = process.env.RESEND_API_KEY;
  const para = process.env.REPORTE_PARA;
  if (!clave || !para) return Response.json({ error: "El formulario todavía no está configurado." }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "?";
  if (demasiados(ip)) return Response.json({ error: "Enviaste varios mensajes seguidos. Intenta en unos minutos." }, { status: 429 });

  let f: FormData;
  try {
    f = await req.formData();
  } catch {
    return Response.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  }
  if (texto(f, "sitio_web", 200)) return Response.json({ ok: true }); // trampa para bots

  const correo = texto(f, "correo", 200);
  const estado = texto(f, "estado", 80);
  const municipio = texto(f, "municipio", 120);
  const mensaje = texto(f, "mensaje", 4000);
  if (!CORREO.test(correo)) return Response.json({ error: "Revisa tu correo." }, { status: 400 });
  if (!estado) return Response.json({ error: "Elige tu estado." }, { status: 400 });
  if (mensaje.length < 10) return Response.json({ error: "Cuéntanos un poco más." }, { status: 400 });

  const fotos = f.getAll("fotos").filter((x): x is File => x instanceof File && x.size > 0);
  if (fotos.length > MAX_FOTOS) return Response.json({ error: `Máximo ${MAX_FOTOS} fotos.` }, { status: 400 });
  const adjuntos = [];
  for (const [i, foto] of fotos.entries()) {
    if (!foto.type.startsWith("image/") || foto.size > MAX_FOTO) return Response.json({ error: "Una de las fotos no es válida o pesa mucho." }, { status: 400 });
    adjuntos.push({ filename: `foto-${i + 1}.jpg`, content: Buffer.from(await foto.arrayBuffer()).toString("base64") });
  }

  const lugar = [municipio, estado].filter(Boolean).join(", ");
  const html = `
    <p><strong>Lugar:</strong> ${esc(lugar)}</p>
    <p><strong>Correo:</strong> ${esc(correo)}</p>
    <p style="white-space:pre-wrap">${esc(mensaje)}</p>
    <p style="color:#888;font-size:12px">${adjuntos.length} foto(s) adjunta(s) · Enviado desde sinagua.org</p>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.REPORTE_DE ?? "Sinagua <onboarding@resend.dev>",
      to: [para],
      reply_to: correo,
      subject: `Sinagua: reporte desde ${lugar}`,
      html,
      attachments: adjuntos,
    }),
  });
  if (!r.ok) {
    console.error("Resend", r.status, await r.text());
    return Response.json({ error: "No se pudo enviar. Intenta más tarde." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
