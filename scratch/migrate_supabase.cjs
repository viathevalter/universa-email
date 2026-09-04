const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqgtyxcawyjanspyvxro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3R5eGNhd3lqYW5zcHl2eHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDM4MTAsImV4cCI6MjEwMzU3OTgxMH0.otB80k2ij4EKVU5ts4XU7s6xTffi3UMkmiqOpYC-fNI';

const supabase = createClient(supabaseUrl, supabaseKey);
const { buildUniversaEmailHtml } = require('./buildUniversaTemplatesNode.cjs');

async function runMigration() {
  console.log('🚀 Iniciando atualização oficial no Supabase...');

  // 1. Remover leads mock e leads que estavam com status "contacted" ou de empresas B2B
  console.log('1. Removendo leads mock do Supabase...');
  const emailsToRemove = [
    'carlos.silveira@nexuslog.com.br',
    'm.vasconcelos@atlasmetal.ind.br',
    'roberto@primesolucoes.com.br',
    'comercial@deltadistribuidora.com.br',
    'fernando@inovasolucoes.com.br',
    'teste.rls.1788096549038@gmail.com',
  ];

  for (const email of emailsToRemove) {
    const { error } = await supabase.from('leads').delete().eq('email', email);
    if (error) console.warn('Erro ao deletar lead:', email, error.message);
  }
  console.log('✔ Leads mock removidos com sucesso!');

  // 2. Limpar templates antigos
  console.log('2. Removendo templates antigos da tabela marketing_templates...');
  const { data: existingTmpls } = await supabase.from('marketing_templates').select('id');
  if (existingTmpls && existingTmpls.length > 0) {
    for (const t of existingTmpls) {
      await supabase.from('marketing_templates').delete().eq('id', t.id);
    }
  }

  // 3. Inserir os 8 templates oficiais da UniversaTV com UUIDs válidos
  console.log('3. Inserindo 8 templates oficiais da UniversaTV...');
  const templatesToInsert = [
    {
      id: '00000000-0000-0000-0001-000000000001',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      title: '⚽ [LaLiga & Champions] Fútbol en 4K sin pagar 120€/mes',
      subject: '⚽ ¿Ver todo el fútbol y Champions en 4K sin pagar 120€/mes? (Prueba 24h gratis)',
      preview_text: 'Toda LaLiga EA Sports, Champions League y DAZN en 4K sin cortes',
      variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0001-000000000002',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      title: '👑 [Real Madrid] Todos los partidos del Madrid en directo',
      subject: '⚪ ¿Dónde ver al Real Madrid en directo y en 4K sin cortes? Prueba 24 Horas Gratis',
      preview_text: 'Todos los partidos del Real Madrid en LaLiga y Champions League en 4K',
      variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0001-000000000003',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      title: '🔵🔴 [FC Barcelona] Vive cada partido del Barça en 4K',
      subject: '🔵🔴 Vive cada partido del Barça en máxima calidad 4K (Test 24 Horas Gratis)',
      preview_text: 'Toda LaLiga, Champions y Copa del Rey para culés en 4K 60 FPS',
      variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0001-000000000004',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      title: '🏎️ [Fórmula 1 & MotoGP] Toda la velocidad a 60 FPS sin cortes',
      subject: '🏎️ Toda la temporada de Fórmula 1 y MotoGP en directo (Prueba 24 Horas Gratis)',
      preview_text: 'DAZN F1, MotoGP, cámaras on-board y clasificaciones sin anuncios',
      variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0001-000000000005',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      title: '🎬 [Cine & Series] Estrenos de cine y +10.000 títulos en 4K',
      subject: '🎬 Todos los estrenos de cine y series en una sola app (Tu prueba de 24h gratis)',
      preview_text: '+10.000 películas y series completas on demand en calidad 4K HDR',
      variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0001-000000000006',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      title: '🌎 [Canales Latinos en Europa] La televisión de tu país en directo',
      subject: '🌎 Los canales de tu país en directo desde España (Pide tu prueba gratis 24h)',
      preview_text: 'Canales de Colombia, México, Argentina, Perú, Venezuela y más en Europa',
      variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0001-000000000007',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      title: '📺 [Multidispositivo] Smart TV, TV Box, Fire Stick, Móvil y PC',
      subject: '📺 +5.000 Canales y Cine para toda tu familia en tu Smart TV (Prueba 24h gratis)',
      preview_text: 'Instalación fácil en Samsung, LG, Fire Stick, Android TV y PC en 5 minutos',
      variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0001-000000000008',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      title: '⚽ [BR] Brasileirão, Premiere & +8.000 Canais - Teste 24h Grátis',
      subject: '⚽ Brasileirão, Premiere e Filmes 4K sem travar (Seu Teste 24 Horas Grátis)',
      preview_text: 'Todos os jogos do Brasileirão Séries A e B e canais 4K sem travar',
      variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const { data: inserted, error: insErr } = await supabase.from('marketing_templates').insert(templatesToInsert).select('id, title');
  if (insErr) {
    console.error('Erro ao inserir templates no Supabase:', insErr);
  } else {
    console.log(`✔ Inseridos com sucesso ${inserted.length} templates oficiais da UniversaTV no Supabase!`);
  }

  // 4. Inserir Públicos em saved_audiences
  console.log('4. Inserindo Públicos Segmentados no Supabase...');
  const audiencesToInsert = [
    {
      id: '00000000-0000-0000-0002-000000000001',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: '⚽ Aficionados LaLiga & Futebol Espanha (Peñas)',
      description: 'Público qualificado de peñas e aficionados por LaLiga, Real Madrid, Barcelona e Champions League.',
      filters_json: { sector: ['Streaming & Esportes'], country: ['Espanha'], tags: ['LaLiga'], lead_count: 58000 },
      created_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0002-000000000002',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: '👑 Comunidade & Fãs Real Madrid CF',
      description: 'Público exclusivo focado no Real Madrid para transmissões de Champions e LaLiga em 4K.',
      filters_json: { sector: ['Streaming & Esportes'], country: ['Espanha'], tags: ['Peña Madridista'], lead_count: 34000 },
      created_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0002-000000000003',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: '🔵🔴 Torcedores FC Barcelona (Culés)',
      description: 'Aficionados e sócios culés para assistir a todos os jogos do Barça em 4K e 60 FPS.',
      filters_json: { sector: ['Streaming & Esportes'], country: ['Espanha'], tags: ['Peña Barcelonista'], lead_count: 29000 },
      created_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0002-000000000004',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: '🏎️ Motores: Fórmula 1 & MotoGP Espanha (DAZN)',
      description: 'Aficionados por F1 (Alonso, Sainz) e MotoGP em alta resolução sem cortes comerciais.',
      filters_json: { sector: ['Streaming & Esportes'], country: ['Espanha'], tags: ['Motorsport'], lead_count: 22000 },
      created_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0002-000000000005',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: '🎬 Cinéfilos, Séries On Demand & Família',
      description: 'Público interessado em estreias de cinema e catálogo de +10.000 títulos sem múltiplas assinaturas.',
      filters_json: { sector: ['Streaming & Entretenimento'], country: ['Espanha'], tags: ['Cinema 4K'], lead_count: 31000 },
      created_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0002-000000000006',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: '🌎 Comunidade Latina na Espanha & Europa',
      description: 'Público latino-americano (Colômbia, México, Argentina, Venezuela, Peru) buscando canais de sua terra natal.',
      filters_json: { sector: ['Streaming & Entretenimento'], country: ['Espanha'], tags: ['Latinos Espanha'], lead_count: 28000 },
      created_at: new Date().toISOString(),
    },
  ];

  for (const aud of audiencesToInsert) {
    await supabase.from('saved_audiences').upsert(aud);
  }
  console.log('✔ Públicos segmentados inseridos no Supabase com sucesso!');

  console.log('\n🎉 SINCRONIZAÇÃO COMPLETA NO SUPABASE REALIZADA COM SUCESSO!');
}

runMigration();
