import type { MarketingTemplate } from '../../types';

/**
 * Função utilitária que gera o HTML premium padronizado para os templates da UniversaTV.
 * Segue as melhores práticas de entregabilidade (alta proporção de texto, sem scripts,
 * tabelas e divs inline-CSS seguras para Gmail, Outlook e Apple Mail,
 * além de conformidade com RGPD e LSSI-CE de Espanha).
 */
export function buildUniversaEmailHtml({
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
}: {
  badgeText: string;
  headline: string;
  greeting: string;
  paragraphs: string[];
  boxTitle: string;
  boxItems: string[];
  ctaText: string;
  whatsappMessage: string;
  whatsappNumber?: string;
  secondaryNote?: string;
  senderName?: string;
  senderRole?: string;
  senderRegion?: string;
  includePricing?: boolean;
  isBrazil?: boolean;
}): string {
  const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;
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
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 24px; font-size: 11px; color: #64748b; line-height: 1.6; text-align: center;">
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

/**
 * 8 Templates Oficiais de Alta Conversão da UniversaTV segmentados por público-alvo:
 */
export const OFFICIAL_UNIVERSA_TEMPLATES: MarketingTemplate[] = [
  // 1. LaLiga & Esportes em Geral (Espanha)
  {
    id: 'tmpl_laliga_futbol_es',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: '⚽ [LaLiga & Champions] Fútbol en 4K sin pagar 120€/mes',
    subject: '⚽ ¿Ver todo el fútbol y Champions en 4K sin pagar 120€/mes? (Prueba 24h gratis)',
    category: 'futbol_laliga',
    html_content: buildUniversaEmailHtml({
      badgeText: '⚽ Toda LaLiga & Champions en 4K sin Cortes',
      headline: '¿Cansado de pagar más de 120€ al mes para ver el fútbol en España?',
      greeting: 'Hola <strong>{{nome}}</strong>, ¿qué tal estás?',
      paragraphs: [
        'Sabemos lo frustrante que resulta querer disfrutar de cada jornada de <strong>LaLiga EA Sports, Champions League, Copa del Rey y Premier League</strong> y tener que contratar paquetes carísimos de operadoras tradicionales que superan los 120€ o 140€ mensuales.',
        'En <strong>UniversaTV Entertainment</strong> creemos que el acceso a tus competiciones favoritas debe ser cómodo, fluido y a un precio justo.',
        'Disponemos de servidores dedicados de bajísima latencia para que vivas los 90 minutos con <strong>calidad real Full HD y 4K a 60 fotogramas por segundo</strong>, sin congelamientos en el momento del gol.',
        'No queremos que compres nada a ciegas. Queremos que pruebes la calidad directamente en tu Smart TV o móvil <strong>gratis durante 24 Horas</strong>.',
      ],
      boxTitle: '¿Qué incluye tu prueba gratuita de 24 Horas?',
      boxItems: [
        '<strong>Toda LaLiga EA Sports & Hypermotion</strong> y competiciones europeas.',
        '<strong>DAZN LaLiga, Movistar+, Premier League</strong> y ligas internacionales.',
        '<strong>Emisión sin cortes publicitarios</strong> con comentarios oficiales en español.',
        '<strong>Compatible con Smart TV (Samsung, LG, Android TV), Fire Stick, Móvil y PC</strong>.',
        '<strong>Activación guiada al instante</strong> por nuestro equipo a través de WhatsApp.',
      ],
      ctaText: 'Pide tu prueba gratis 24h por WhatsApp',
      whatsappMessage: 'Hola Carlos, quiero activar mi prueba gratuita de 24 horas para ver LaLiga y Champions en UniversaTV.',
      secondaryNote: '¿Tienes alguna duda sobre cómo instalarlo en tu Smart TV? Escríbenos por WhatsApp y te guiamos en 2 minutos.',
      senderName: 'Carlos Ventas',
      senderRole: 'Asesor Comercial & Soporte LaLiga',
      senderRegion: 'UniversaTV Entertainment España',
    }),
    variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 2. Real Madrid CF (Comunidade Madridista)
  {
    id: 'tmpl_real_madrid_es',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: '👑 [Real Madrid] Todos los partidos del Madrid en directo',
    subject: '⚪ ¿Dónde ver al Real Madrid en directo y en 4K sin cortes? Prueba 24 Horas Gratis',
    category: 'real_madrid',
    html_content: buildUniversaEmailHtml({
      badgeText: '👑 Especial Afición Madridista - Prueba 24h',
      headline: 'No te pierdas ningún partido del Real Madrid esta temporada',
      greeting: 'Hola <strong>{{nome}}</strong>, madridista,',
      paragraphs: [
        'Sabemos que como aficionado del <strong>Real Madrid</strong> cada partido de Liga y cada noche mágica de <strong>Champions League</strong> es sagrada.',
        'Lo que no tiene sentido es pagar una fortuna cada mes o sufrir con enlaces piratas que se caen justo cuando el Madrid entra en el área rival.',
        'En <strong>UniversaTV</strong> tienes todos los partidos del Real Madrid en directo, con la mejor señal oficial de España en <strong>4K Ultra HD</strong>, además de <strong>Real Madrid TV</strong>, ruedas de prensa y análisis previos y posteriores al encuentro.',
        'Para el próximo partido del Madrid queremos darte un <strong>acceso de prueba gratis de 24 horas</strong> sin compromiso.',
      ],
      boxTitle: 'Todo el contenido del Real Madrid a tu alcance:',
      boxItems: [
        '<strong>Todos los partidos del Real Madrid</strong> en LaLiga, Champions y Copa del Rey.',
        '<strong>Real Madrid TV 24/7</strong> y canales deportivos oficiales en alta definición.',
        '<strong>Servidores de alta capacidad:</strong> máxima fluidez incluso en El Clásico.',
        '<strong>Listo en 3 minutos</strong> en tu Smart TV, Fire Stick, tablet o teléfono.',
        '<strong>Soporte en español</strong> antes y durante los partidos.',
      ],
      ctaText: 'Activar Prueba 24h para el próximo partido',
      whatsappMessage: 'Hola Carlos, soy aficionado del Real Madrid y quiero probar las 24 horas gratis de UniversaTV para el próximo partido.',
      secondaryNote: 'La prueba dura 24 horas completas para que puedas ver el partido y examinar todos los canales.',
      senderName: 'Carlos Ventas',
      senderRole: 'Soporte y Atención a Peñas & Aficionados',
      senderRegion: 'UniversaTV Entertainment España',
    }),
    variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 3. FC Barcelona (Comunidade Culé)
  {
    id: 'tmpl_fc_barcelona_es',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: '🔵🔴 [FC Barcelona] Vive cada partido del Barça en 4K',
    subject: '🔵🔴 Vive cada partido del Barça en máxima calidad 4K (Test 24 Horas Gratis)',
    category: 'barcelona',
    html_content: buildUniversaEmailHtml({
      badgeText: '🔵🔴 Especial Afición Culé - Test 24 Horas',
      headline: 'Sigue al Barça en cada jornada de LaLiga y Champions en 4K',
      greeting: 'Hola <strong>{{nome}}</strong>, culé,',
      paragraphs: [
        'Vivir la pasión del <strong>FC Barcelona</strong> en cada jornada de LaLiga, Copa del Rey y Champions League no debería costar más de 100€ al mes.',
        'En <strong>UniversaTV</strong> ponemos a tu disposición una experiencia de streaming de calidad cinematográfica: imagen nítida en <strong>4K y 60 FPS</strong>, audio original y la máxima estabilidad del mercado europeo.',
        'Olvídate de cortes de señal y retardos molestos. Ponemos a tu disposición una <strong>prueba oficial de 24 horas</strong> para que disfrutes del juego del Barça desde la comodidad de tu salón.',
      ],
      boxTitle: 'Lo que tendrás disponible en tu Smart TV o Móvil:',
      boxItems: [
        '<strong>Todos los partidos del FC Barcelona</strong> en todas las competiciones oficiales.',
        '<strong>Canales deportivos de España y Cataluña</strong> en directo y sin interrupciones.',
        '<strong>Barça TV y programas de debate deportivo</strong>.',
        '<strong>Configuración sencilla:</strong> te enviamos tus credenciales y tutorial por WhatsApp.',
        '<strong>100% libre de permanencias o cobros automáticos</strong>.',
      ],
      ctaText: 'Quiero mi Prueba de 24h del Barça por WhatsApp',
      whatsappMessage: 'Hola Carlos, soy culé y quiero mi prueba de 24 horas gratis para ver los partidos del Barça en UniversaTV.',
      secondaryNote: 'Te entregamos usuario y contraseña al instante para que lo actives hoy mismo.',
      senderName: 'Carlos Ventas',
      senderRole: 'Atención a Clientes Deportivos',
      senderRegion: 'UniversaTV Entertainment España',
    }),
    variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 4. Fórmula 1 & MotoGP (Motores)
  {
    id: 'tmpl_formula1_motogp_es',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: '🏎️ [Fórmula 1 & MotoGP] Toda la velocidad a 60 FPS sin cortes',
    subject: '🏎️ Toda la temporada de Fórmula 1 y MotoGP en directo (Prueba 24 Horas Gratis)',
    category: 'motores_f1',
    html_content: buildUniversaEmailHtml({
      badgeText: '🏎️ F1 & MotoGP en Directo - Sin Anuncios',
      headline: 'Sigue a Alonso, Sainz y Martín en cada Gran Premio en 4K y 60 FPS',
      greeting: 'Hola <strong>{{nome}}</strong>, aficionado al motor,',
      paragraphs: [
        'Si eres de los que no se pierden los entrenamientos libres del viernes, la clasificación del sábado y la carrera del domingo, sabes lo crucial que es contar con una <strong>emisión a 60 fotogramas por segundo</strong> sin retardos.',
        'En <strong>UniversaTV</strong> retransmitimos toda la temporada de <strong>Fórmula 1 y MotoGP</strong> a través de DAZN F1 y canales especializados en máxima fidelidad.',
        'Disfruta de las cámaras de a bordo (on-board), las radios de equipo y el análisis de los mejores comentaristas sin pagar suscripciones desmedidas.',
        'Solicita tu <strong>prueba gratuita de 24 Horas</strong> para el próximo Gran Premio y compruébalo tú mismo.',
      ],
      boxTitle: 'El garaje completo en una sola pantalla:',
      boxItems: [
        '<strong>DAZN F1 y canales de motor internacionales</strong> en 4K / Full HD 60 FPS.',
        '<strong>Temporada completa de MotoGP, Moto2 y Moto3</strong>.',
        '<strong>IndyCar, WEC, Superbikes y Rally</strong>.',
        '<strong>Multi-dispositivo:</strong> míralo en tu Smart TV, ordenador, tablet o móvil.',
        '<strong>Activación inmediata por WhatsApp</strong> sin compromiso.',
      ],
      ctaText: 'Pide tu prueba gratis 24h para el Gran Premio',
      whatsappMessage: 'Hola Carlos, quiero activar mi prueba gratis de 24 horas para ver la Fórmula 1 y MotoGP en UniversaTV.',
      secondaryNote: 'Ideal para probar durante el fin de semana de carreras en tu Smart TV.',
      senderName: 'Carlos Ventas',
      senderRole: 'Especialista en Canales de Motor',
      senderRegion: 'UniversaTV Entertainment España',
    }),
    variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 5. Filmes e Séries (Cinefilos & Família)
  {
    id: 'tmpl_cine_series_es',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: '🎬 [Cine & Series] Estrenos de cine y +10.000 títulos en 4K',
    subject: '🎬 Todos los estrenos de cine y series en una sola app (Tu prueba de 24h gratis)',
    category: 'cine_series',
    html_content: buildUniversaEmailHtml({
      badgeText: '🍿 +10.000 Películas y Series en 4K On-Demand',
      headline: 'Deja de pagar 4 suscripciones distintas para ver tus series y películas',
      greeting: 'Hola <strong>{{nome}}</strong>,',
      paragraphs: [
        'Netflix, Disney+, HBO Max, Prime Video, SkyShowtime... Hoy en día tener todas las plataformas para que cada miembro de la familia vea lo que le gusta cuesta más de <strong>60€ al mes</strong>.',
        'En <strong>UniversaTV Entertainment</strong> hemos reunido <strong>más de 10.000 películas y series completas bajo demanda</strong> en una única aplicación intuitiva y rápida para tu televisor.',
        'Películas recién salidas del cine, sagas completas, documentales, contenido infantil y las temporadas más aclamadas, todo en <strong>4K Ultra HD con audio y subtítulos en español</strong>.',
        'Pide tu <strong>prueba gratis de 24 Horas</strong> hoy y descubre tu nueva serie favorita esta noche.',
      ],
      boxTitle: '¿Qué encontrarás en nuestro catálogo bajo demanda?',
      boxItems: [
        '<strong>+10.000 títulos on demand:</strong> estrenos de cine actualizados semanalmente.',
        '<strong>Series completas de todas las plataformas</strong> sin esperas.',
        '<strong>Canales de cine y series 24 horas</strong> sin publicidad comercial.',
        '<strong>Calidad 4K HDR y sonido envolvente</strong>.',
        '<strong>Canales infantiles y familiares</strong> para los más pequeños de la casa.',
      ],
      ctaText: 'Solicitar Prueba de 24 Horas de Cine & Series',
      whatsappMessage: 'Hola Carlos, quiero probar el catálogo de películas y series de UniversaTV por 24 horas gratis.',
      secondaryNote: 'Instalación fácil en Samsung, LG, Android TV o Fire Stick en menos de 5 minutos.',
      senderName: 'Carlos Ventas',
      senderRole: 'Asesor de Entretenimiento Familiar',
      senderRegion: 'UniversaTV Entertainment España',
    }),
    variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 6. Canais Latinos na Espanha / Europa (Comunidade Latina)
  {
    id: 'tmpl_canales_latinos_eu',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: '🌎 [Canales Latinos en Europa] La televisión de tu país en directo',
    subject: '🌎 Los canales de tu país en directo desde España (Pide tu prueba gratis 24h)',
    category: 'latinos_europa',
    html_content: buildUniversaEmailHtml({
      badgeText: '🌎 Tu Televisión Latina en Europa',
      headline: 'Siente la cercanía de tu tierra: los mejores canales latinos en tu salón',
      greeting: 'Hola <strong>{{nome}}</strong>, ¿cómo estás?',
      paragraphs: [
        'Sabemos lo que se echa de menos la televisión de tu país cuando vives en España o en Europa: las noticias locales de la mañana, las telenovelas de la tarde, el fútbol de tu liga y esos programas que te hacen sentir en casa.',
        'En <strong>UniversaTV</strong> reunimos en un solo acceso la mejor programación en directo de <strong>Colombia, México, Argentina, Perú, Venezuela, Chile, Ecuador, República Dominicana</strong> y toda América Latina, junto con toda la televisión de España.',
        'Todo con servidores europeos optimizados para que la imagen llegue instantánea y sin cortes.',
        'Queremos invitarte a probar <strong>completamente gratis durante 24 Horas</strong> sin ningún compromiso.',
      ],
      boxTitle: 'La programación de tu país dondequiera que estés:',
      boxItems: [
        '<strong>Canales nacionales e internacionales de Latinoamérica</strong> en vivo (RCN, Caracol, Televisa, Telefe, Latina...).',
        '<strong>Fútbol sudamericano:</strong> Copa Libertadores, Sudamericana y ligas locales.',
        '<strong>Telenovelas, noticias matinales y entretenimiento latino</strong>.',
        '<strong>Toda la televisión de España (TDT y premium)</strong> en la misma aplicación.',
        '<strong>Soporte humano en español 24/7</strong> vía WhatsApp.',
      ],
      ctaText: 'Pide tu prueba gratis de canales latinos por WhatsApp',
      whatsappMessage: 'Hola Carlos, vivo en España y quiero probar los canales de mi país en UniversaTV con la prueba de 24 horas gratis.',
      secondaryNote: 'Sin contratos ni permanencias. Si te gusta, te quedas; si no, no tienes que hacer nada.',
      senderName: 'Carlos Ventas',
      senderRole: 'Coordinador de Comunidad Hispana',
      senderRegion: 'UniversaTV Entertainment España',
    }),
    variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 7. Multidispositivo & Estabilidade Premium (Família / Geral)
  {
    id: 'tmpl_multidispositivo_premium_es',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: '📺 [Multidispositivo] Smart TV, TV Box, Fire Stick, Móvil y PC',
    subject: '📺 +5.000 Canales y Cine para toda tu familia en tu Smart TV (Prueba 24h gratis)',
    category: 'multidispositivo',
    html_content: buildUniversaEmailHtml({
      badgeText: '📺 Entretenimiento Total Multidispositivo',
      headline: '+5.000 canales en directo y +10.000 títulos en cualquier pantalla',
      greeting: 'Hola <strong>{{nome}}</strong>,',
      paragraphs: [
        '¿Buscas una solución definitiva de televisión y entretenimiento para toda la familia sin instalaciones complicadas ni antenas aparatosas?',
        'Con <strong>UniversaTV Entertainment</strong> sólo necesitas una conexión a internet estándar. Nuestra aplicación es compatible con cualquier televisor inteligente (Samsung, LG, Android TV), reproductores tipo Amazon Fire TV Stick, TV Box, tablets, iPhone, Android o tu ordenador.',
        'Más de <strong>5.000 canales en directo en alta definición</strong> (deportes, noticias, documentales, música y canales temáticos) y <strong>10.000 películas y series</strong> bajo demanda organizadas por géneros.',
        'Compruébalo tú mismo con una <strong>prueba gratis de 24 Horas</strong> guiada paso a paso por nuestro equipo de soporte.',
      ],
      boxTitle: 'Ventajas del servicio UniversaTV:',
      boxItems: [
        '<strong>Acceso multidispositivo:</strong> Smart TV, Fire Stick, Móvil, Tablet y PC.',
        '<strong>Instalación guiada en 5 minutos</strong> con credenciales personales.',
        '<strong>99.8% de estabilidad de red:</strong> servidores de alta disponibilidad.',
        '<strong>Guía de programación (EPG)</strong> integrada en pantalla.',
        '<strong>Planes accesibles desde menos de 6€ al mes</strong> sin permanencia.',
      ],
      ctaText: 'Solicitar prueba 24h multidispositivo por WhatsApp',
      whatsappMessage: 'Hola Carlos, quiero probar el servicio de UniversaTV en mi Smart TV / dispositivo con la prueba gratuita de 24 horas.',
      secondaryNote: 'Te enviamos una guía paso a paso con imágenes para instalar la app en 3 minutos.',
      senderName: 'Carlos Ventas',
      senderRole: 'Responsable de Soporte Técnico & Activaciones',
      senderRegion: 'UniversaTV Entertainment España',
    }),
    variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 8. Brasil & Brasileirão (Remetente Jackson Vendas)
  {
    id: 'tmpl_brasil_tv_24h_br',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: '⚽ [BR] Brasileirão, Premiere & +8.000 Canais - Teste 24h Grátis',
    subject: '⚽ Brasileirão, Premiere e Filmes 4K sem travar (Seu Teste 24 Horas Grátis)',
    category: 'b2c_br',
    html_content: buildUniversaEmailHtml({
      badgeText: '⚽ Brasileirão Série A & Premiere em 4K',
      headline: 'Cansado de pagar mais de R$ 250 por mês em TV a cabo que vive travando?',
      greeting: 'Olá <strong>{{nome}}</strong>, tudo bem?',
      paragraphs: [
        'Acompanhar os jogos do seu time no <strong>Brasileirão, Copa do Brasil e Libertadores</strong> não deveria custar uma fortuna todo mês em pacotes fechados de operadoras.',
        'Na <strong>Universa TV</strong> você tem acesso a mais de <strong>8.000 canais ao vivo em Full HD e 4K</strong>, incluindo todos os canais Premiere, SporTV, ESPN, canais abertos e fechados do Brasil e do mundo, além de mais de 10.000 filmes e séries on-demand.',
        'Nossos servidores contam com tecnologia anti-travamento para você assistir aos clássicos sem atrasos incômodos nem congelamentos.',
        'Liberamos para você um <strong>teste gratuito de 24 Horas</strong> para você testar na sua Smart TV, TV Box, Fire Stick ou celular antes de contratar qualquer plano.',
      ],
      boxTitle: 'O que você vai curtir no seu teste gratuito:',
      boxItems: [
        '<strong>Todos os jogos do Brasileirão Séries A e B</strong> no Premiere e canais esportivos.',
        '<strong>Libertadores, Sul-Americana, Champions e Ligas Europeias</strong>.',
        '<strong>Mais de 10.000 filmes e séries</strong> atualizados semanalmente.',
        '<strong>Fácil instalação:</strong> enviamos o passo a passo completo no seu WhatsApp.',
        '<strong>Suporte brasileiro 24 horas por dia</strong>.',
      ],
      ctaText: 'Ativar meu teste de 24 horas no WhatsApp',
      whatsappMessage: 'Olá Jackson, quero ativar meu teste grátis de 24 horas do Brasileirão na Universa TV.',
      whatsappNumber: '5511999999999',
      secondaryNote: 'Não pedimos dados bancários nem cartão de crédito para fazer o teste.',
      senderName: 'Jackson Vendas',
      senderRole: 'Atendimento & Suporte Esportivo',
      senderRegion: 'Universa TV Brasil',
      includePricing: true,
      isBrazil: true,
    }),
    variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
