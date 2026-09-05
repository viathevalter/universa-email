function buildUniversaEmailHtml({
  badgeText,
  headline,
  greeting,
  paragraphs,
  boxTitle,
  boxItems,
  ctaText,
  whatsappMessage,
  whatsappNumber = '34617598421',
  secondaryNote,
  senderName = 'Carlos Ventas',
  senderRole = 'Departamento de Atención & Activaciones',
  senderRegion = 'UniversaTV Entertainment España',
  includePricing = true,
  isBrazil = false,
}) {
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodeURIComponent(whatsappMessage)}`;
  const displayPhone = isBrazil ? '+55 (11) 99999-9999' : '+34 617 59 84 21';
  const optOutText = isBrazil
    ? 'Caso não deseje mais receber nossos comunicados, você pode se descadastrar a qualquer momento com um clique:'
    : 'Si no deseas recibir más avisos de pruebas gratuitas o información sobre novedades, puedes cancelar tu suscripción en cualquier momento:';
  const optOutBtnText = isBrazil ? 'Descadastrar-se desta lista' : 'Darse de baja / Cancelar suscripción';
  const privacyText = isBrazil ? 'Política de Privacidade' : 'Política de Privacidad';
  const legalText = isBrazil
    ? 'Universa TV Brasil © 2026. Todos os direitos reservados. Em conformidade com a LGPD (Lei nº 13.709/2018).'
    : 'UniversaTV Entertainment © 2026. Todos los derechos reservados. Cumplimiento de la normativa europea RGPD (UE) 2016/679 y LSSI-CE 34/2002 de España.';

  const pricingBlock = includePricing
    ? isBrazil
      ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #1e293b;">Nossos Planos Promocionais no Brasil:</p>
        <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.6;">
          • <strong>Mensal:</strong> R$ 29,90 / mês<br>
          • <strong>Trimestral:</strong> R$ 75,00 (Economia de 16%)<br>
          • <strong>Semestral:</strong> R$ 120,00 (Economia de 33%)<br>
          • <strong>Anual:</strong> R$ 199,00 (Menos de R$ 17 por mês!)
        </p>
      </div>`
      : `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #1e293b;">Nuestros Planes Oficiales en España (Sin permanencia):</p>
        <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.6;">
          • <strong>Mensual:</strong> 9,50€ / mes<br>
          • <strong>Trimestral:</strong> 25€ (Ahorro del 12%)<br>
          • <strong>Semestral:</strong> 40€ (Ahorro del 30%)<br>
          • <strong>Anual:</strong> 70€ (¡Menos de 6€ al mes!)
        </p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${isBrazil ? 'pt-BR' : 'es'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${headline}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-card { border-radius: 8px !important; width: 100% !important; max-width: 100% !important; }
      .email-header { padding: 18px 16px 14px 16px !important; }
      .email-body { padding: 18px 16px !important; font-size: 14px !important; line-height: 1.6 !important; }
      .email-title { font-size: 18px !important; line-height: 1.3 !important; }
      .email-box { padding: 14px 14px !important; margin: 16px 0 !important; }
      .email-btn { width: 100% !important; display: block !important; padding: 14px 16px !important; font-size: 15px !important; box-sizing: border-box !important; }
      .email-footer { padding: 16px 14px !important; font-size: 11px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div class="email-wrapper" style="width: 100%; background-color: #f4f6f9; padding: 24px 12px; box-sizing: border-box;">
    <div class="email-card" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
      
      <!-- Linha de Destaque Superior -->
      <div style="height: 4px; background: linear-gradient(90deg, #ff5500 0%, #ff8c00 100%);"></div>

      <!-- Cabeçalho com Logomarca Oficial da UniversaTV -->
      <div class="email-header" style="padding: 24px 24px 18px 24px; text-align: center; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
        <img src="https://universa-email.vercel.app/logo_universa_preto_horizontal.png" alt="UNIVERSATV ENTERTAINMENT" style="max-height: 46px; width: auto; max-width: 220px; display: block; margin: 0 auto; border: 0;" />
        <div style="margin-top: 10px;">
          <span style="display: inline-block; background-color: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
            ${badgeText}
          </span>
        </div>
      </div>

      <!-- Corpo Principal do E-mail -->
      <div class="email-body" style="padding: 28px 28px 24px 28px; color: #1e293b; font-size: 15px; line-height: 1.65;">
        
        <!-- Título Principal -->
        <h1 class="email-title" style="color: #0f172a; font-size: 21px; font-weight: 800; line-height: 1.35; margin: 0 0 16px 0; text-align: left;">
          ${headline}
        </h1>

        <!-- Saudação Personalizada -->
        <p style="margin: 0 0 14px 0; font-size: 15px; color: #334155;">
          ${greeting}
        </p>

        <!-- Parágrafos de Argumentação e Conexão Humana -->
        ${paragraphs.map((p) => `<p style="margin: 0 0 14px 0; font-size: 15px; color: #334155;">${p}</p>`).join('\n        ')}

        <!-- Box de Benefícios em Destaque (Estilo Card Luminous) -->
        <div class="email-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px; font-weight: 700; display: flex; align-items: center;">
            📦 ${boxTitle}
          </h3>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            ${boxItems
              .map(
                (item) => `<tr>
              <td style="vertical-align: top; width: 22px; padding: 4px 0; font-size: 15px; color: #2563eb;">✔</td>
              <td style="padding: 4px 0; font-size: 13.5px; color: #334155; line-height: 1.5;">${item}</td>
            </tr>`
              )
              .join('\n            ')}
          </table>
        </div>

        <!-- Botão Primário de Ação WhatsApp (Alta Conversão) -->
        <div style="text-align: center; margin: 28px 0 16px 0;">
          <a class="email-btn" href="${whatsappUrl}" target="_blank" style="display: inline-block; background-color: #22c55e; background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 16px; padding: 15px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35); text-align: center;">
            💬 ${ctaText}
          </a>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
            ⚡ Activación inmediata en menos de 5 minutos sin tarjeta de crédito.
          </p>
        </div>

        ${pricingBlock}

        ${
          secondaryNote
            ? `<p style="margin: 18px 0 0 0; font-size: 13px; color: #64748b; font-style: italic;">
          ${secondaryNote}
        </p>`
            : ''
        }

        <!-- Assinatura Pessoal do Remetente -->
        <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #f1f5f9;">
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">${senderName}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${senderRole}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 600; color: #ea580c;">${senderRegion}</p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
            WhatsApp: ${displayPhone} | Web: <a href="https://universatv.com" style="color: #64748b; text-decoration: none;">www.universatv.com</a>
          </p>
        </div>

      </div>

      <!-- Rodapé Legal e de Descadastro (RGPD / Deliverability Gmail & Outlook) -->
      <div class="email-footer" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 24px; font-size: 11px; color: #64748b; line-height: 1.6; text-align: center;">
        <p style="margin: 0 0 8px 0;">
          ${optOutText}
        </p>
        <p style="margin: 0 0 12px 0;">
          <a href="{{link_descadastro}}" style="color: #ea580c; text-decoration: underline; font-weight: 600;">
            ${optOutBtnText}
          </a>
          <span style="color: #cbd5e1; margin: 0 8px;">|</span>
          <a href="https://universatv.com/privacidad" style="color: #64748b; text-decoration: underline;">
            ${privacyText}
          </a>
        </p>
        <p style="margin: 0; font-size: 10px; color: #94a3b8;">
          ${legalText}
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

module.exports = { buildUniversaEmailHtml };
