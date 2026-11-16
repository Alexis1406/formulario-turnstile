
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido. Usa POST.' });
  }

  try {
    const { nombre, email, asunto, 'cf-turnstile-response': turnstileToken } = req.body;

    if (!turnstileToken) {
      return res.status(400).json({ success: false, message: 'No se recibió el token de Turnstile.' });
    }

    const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '0x4AAAAAAGC49rHohugAqrC9dLI38HFQCZ0';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    const formData = new URLSearchParams();
    formData.append('secret', SECRET_KEY);
    formData.append('response', turnstileToken);
    if (clientIp) formData.append('remoteip', clientIp);

    const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const cfData = await cfResponse.json();

    if (cfData.success) {
      return res.status(200).json({
        success: true,
        message: `¡Bienvenido ${nombre}! Verificación aprobada por Cloudflare.`,
        data: { nombre, email, asunto, challenge_ts: cfData.challenge_ts, hostname: cfData.hostname }
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Verificación fallida de Cloudflare.',
        errors: cfData['error-codes']
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error interno en el servidor.' });
  }
}
