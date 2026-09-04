export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use POST.' });
  }

  try {
    const { apiKey, from, to, subject, html, reply_to } = req.body || {};

    const resolvedApiKey =
      apiKey ||
      process.env.VITE_RESEND_API_KEY ||
      process.env.RESEND_API_KEY ||
      '';

    if (!resolvedApiKey) {
      return res.status(400).json({ success: false, error: 'Chave API do Resend não configurada.' });
    }

    if (!from || !to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios ausentes: from, to, subject, html são requeridos.',
      });
    }

    const resendPayload: Record<string, any> = {
      from: from.includes('<') ? from : `Comercial <${from}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    if (reply_to) {
      resendPayload.reply_to = reply_to;
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resolvedApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    const data = await resendResponse.json();

    if (resendResponse.ok) {
      return res.status(200).json({
        success: true,
        id: data.id,
      });
    } else {
      return res.status(resendResponse.status).json({
        success: false,
        error: data.message || 'Erro ao enviar e-mail via Resend.',
        details: data,
      });
    }
  } catch (error: any) {
    console.error('[API Send Email Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno no servidor de envio.',
    });
  }
}
