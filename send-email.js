// ════════════════════════════════════════════════════════════════════════
//  Vercel Function — Envío de correos con Resend
//  Casa de Avivamiento Nueva Vida
//  Ruta: /api/send-email
// ════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Verificar que la clave existe
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY no está configurada en las variables de entorno");
    return res.status(500).json({ error: "RESEND_API_KEY no configurada en el servidor" });
  }

  const { to, subject, html } = req.body || {};

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Faltan campos requeridos: to, subject, html", received: { to: !!to, subject: !!subject, html: !!html } });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Agenda Pastoral Nueva Vida <onboarding@resend.dev>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }

    if (!response.ok) {
      console.error("Error de Resend:", response.status, data);
      return res.status(response.status).json({ error: data, status: response.status });
    }

    return res.status(200).json({ success: true, id: data.id });

  } catch (error) {
    console.error("Error al enviar correo:", error.message, error.stack);
    return res.status(500).json({ error: "Error interno: " + error.message });
  }
}
