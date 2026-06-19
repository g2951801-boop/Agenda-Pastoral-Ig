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

  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Faltan campos requeridos: to, subject, html" });
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

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de Resend:", data);
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({ success: true, id: data.id });

  } catch (error) {
    console.error("Error al enviar correo:", error);
    return res.status(500).json({ error: "Error interno al enviar el correo" });
  }
}
