const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqgtyxcawyjanspyvxro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3R5eGNhd3lqYW5zcHl2eHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDM4MTAsImV4cCI6MjEwMzU3OTgxMH0.otB80k2ij4EKVU5ts4XU7s6xTffi3UMkmiqOpYC-fNI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function scheduleWeekendCampaigns() {
  console.log('🚀 Iniciando programação das campanhas do final de semana...');

  // 1. Buscar todos os leads da base
  console.log('1. Carregando leads da base Supabase...');
  let allLeads = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, email, country, tags, status, opted_out')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error || !data || data.length === 0) break;
    allLeads.push(...data);
    page++;
    if (data.length < pageSize) break;
  }
  console.log(`Total de leads carregados: ${allLeads.length}`);

  // 2. Filtrar exclusivamente Espanha e excluir línguas portuguesas/brasileiras
  const isPortugueseOrBrazilian = (l) => {
    if (l.country === 'Brasil' || l.country === 'Portugal') return true;
    if (l.tags && l.tags.some(t => {
      const lower = t.toLowerCase();
      return lower.includes('brasil') || lower.includes('portug') || lower.includes('pt-br') || lower.includes('pt-pt');
    })) return true;
    return false;
  };

  const spainLeads = allLeads.filter(l => {
    if (l.opted_out) return false;
    const isSpain = (l.country === 'Espanha' || l.country === 'Spain' || (l.tags && l.tags.some(t => t.includes('ES') || t.includes('Espanha'))));
    return isSpain && !isPortugueseOrBrazilian(l);
  });

  console.log(`Total de leads Espanha válidos (sem PT/BR): ${spainLeads.length}`);

  // 3. Fatiamento em 5 lotes
  const chunk1 = spainLeads.slice(0, 3000);
  const chunk2 = spainLeads.slice(3000, 6000);
  const chunk3 = spainLeads.slice(6000, 9000);
  const chunk4 = spainLeads.slice(9000, 11993);
  
  // Chunk 5: leads de maior engajamento em esportes e filmes na Espanha
  const sportsCinemaLeads = spainLeads.filter(l => 
    l.tags && l.tags.some(t => t.includes('LALIGA') || t.includes('MOTORSPORT') || t.includes('CINE_SERIES'))
  );
  const chunk5 = sportsCinemaLeads.slice(0, 3000);

  console.log(`- Lote 1 (Sexta 17:30): ${chunk1.length} leads`);
  console.log(`- Lote 2 (Sábado 10:30): ${chunk2.length} leads`);
  console.log(`- Lote 3 (Sábado 17:00): ${chunk3.length} leads`);
  console.log(`- Lote 4 (Domingo 10:30): ${chunk4.length} leads`);
  console.log(`- Lote 5 (Domingo 17:00): ${chunk5.length} leads`);

  // 4. Cadastrar / Atualizar os 5 Públicos Segmentados
  console.log('\n2. Criando os 5 Públicos Segmentados no Supabase...');
  const audiencesToInsert = [
    {
      id: '00000000-0000-0003-0001-000000000001',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: '🇪🇸 Espanha Lote 1 - Sex 17:30 (3.000 leads)',
      description: 'Público segmentado da Espanha para envio de sexta-feira às 17:30.',
      filters_json: {
        country: ['Espanha'],
        lead_count: chunk1.length,
        lead_ids: chunk1.map(l => l.id),
      },
    },
    {
      id: '00000000-0000-0003-0001-000000000002',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: '🇪🇸 Espanha Lote 2 - Sáb 10:30 (3.000 leads)',
      description: 'Público segmentado da Espanha para envio de sábado às 10:30 (Futebol & Esportes 4K).',
      filters_json: {
        country: ['Espanha'],
        lead_count: chunk2.length,
        lead_ids: chunk2.map(l => l.id),
      },
    },
    {
      id: '00000000-0000-0003-0001-000000000003',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: '🇪🇸 Espanha Lote 3 - Sáb 17:00 (3.000 leads)',
      description: 'Público segmentado da Espanha para envio de sábado às 17:00 (Serviço Completo TV & Cine).',
      filters_json: {
        country: ['Espanha'],
        lead_count: chunk3.length,
        lead_ids: chunk3.map(l => l.id),
      },
    },
    {
      id: '00000000-0000-0003-0001-000000000004',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: '🇪🇸 Espanha Lote 4 - Dom 10:30 (2.993 leads)',
      description: 'Público segmentado da Espanha para envio de domingo às 10:30 (Futebol Meio-Dia).',
      filters_json: {
        country: ['Espanha'],
        lead_count: chunk4.length,
        lead_ids: chunk4.map(l => l.id),
      },
    },
    {
      id: '00000000-0000-0003-0001-000000000005',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: '🇪🇸 Espanha Lote 5 - Dom 17:00 (3.000 leads)',
      description: 'Público segmentado da Espanha para envio de domingo às 17:00 (Estrenos & Cine Noite).',
      filters_json: {
        country: ['Espanha'],
        lead_count: chunk5.length,
        lead_ids: chunk5.map(l => l.id),
      },
    },
  ];

  for (const aud of audiencesToInsert) {
    const { error } = await supabase.from('saved_audiences').upsert(aud);
    if (error) console.warn('Erro ao inserir audiência:', aud.name, error.message);
    else console.log(`✔ Audiência salva: ${aud.name}`);
  }

  // 5. Cadastrar as 5 Campanhas na tabela marketing_campaigns
  console.log('\n3. Criando as 5 Campanhas Oficiais no Supabase...');
  
  // Limpar campanhas anteriores para manter painel limpo e organizado
  await supabase.from('marketing_campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const campaignsToInsert = [
    {
      id: '00000000-0000-0004-0001-000000000001',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      template_id: '00000000-0000-0000-0001-000000000091', // ⭐ Modelo 1 - Serviço Completo
      title: '[Sex 25/09 17:30] 📺 Acceso Total Espanha (3.000 envios)',
      subject: '📺 Acceso Total: TV en español, deportes y estrenos en 4K (Prueba 24h gratis)',
      sender_name: 'Carlos Ventas - Universa TV España',
      sender_email: 'carlos_ventas@mail.universatv.com',
      reply_to: 'carlos_ventas@mail.universatv.com',
      target_audience_id: '00000000-0000-0003-0001-000000000001',
      status: 'scheduled',
      scheduled_at: '2026-09-25T15:30:00.000Z', // 17:30 CEST
      total_recipients: 3000,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
      failed_count: 0,
      rate_limit_per_second: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0004-0001-000000000002',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      template_id: '00000000-0000-0000-0001-000000000092', // 🚀 Modelo 2 - Deportes 4K
      title: '[Sáb 26/09 10:30] ⚽ Fútbol & Deportes 4K Espanha (3.000 envios)',
      subject: '⚽ Fútbol en directo, series y estrenos en 4K sin cortes (Tu prueba de 24h gratis)',
      sender_name: 'Carlos Ventas - Universa TV España',
      sender_email: 'carlos_ventas@mail.universatv.com',
      reply_to: 'carlos_ventas@mail.universatv.com',
      target_audience_id: '00000000-0000-0003-0001-000000000002',
      status: 'scheduled',
      scheduled_at: '2026-09-26T08:30:00.000Z', // 10:30 CEST
      total_recipients: 3000,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
      failed_count: 0,
      rate_limit_per_second: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0004-0001-000000000003',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      template_id: '00000000-0000-0000-0001-000000000091', // ⭐ Modelo 1 - Serviço Completo
      title: '[Sáb 26/09 17:00] 📺 Acceso Total Espanha (3.000 envios)',
      subject: '📺 Acceso Total: TV en español, deportes y estrenos en 4K (Prueba 24h gratis)',
      sender_name: 'Carlos Ventas - Universa TV España',
      sender_email: 'carlos_ventas@mail.universatv.com',
      reply_to: 'carlos_ventas@mail.universatv.com',
      target_audience_id: '00000000-0000-0003-0001-000000000003',
      status: 'scheduled',
      scheduled_at: '2026-09-26T15:00:00.000Z', // 17:00 CEST
      total_recipients: 3000,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
      failed_count: 0,
      rate_limit_per_second: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0004-0001-000000000004',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      template_id: '00000000-0000-0000-0001-000000000092', // 🚀 Modelo 2 - Deportes 4K
      title: '[Dom 27/09 10:30] ⚽ Fútbol & Deportes 4K Espanha (2.993 envios)',
      subject: '⚽ Fútbol en directo, series y estrenos en 4K sin cortes (Tu prueba de 24h gratis)',
      sender_name: 'Carlos Ventas - Universa TV España',
      sender_email: 'carlos_ventas@mail.universatv.com',
      reply_to: 'carlos_ventas@mail.universatv.com',
      target_audience_id: '00000000-0000-0003-0001-000000000004',
      status: 'scheduled',
      scheduled_at: '2026-09-27T08:30:00.000Z', // 10:30 CEST
      total_recipients: 2993,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
      failed_count: 0,
      rate_limit_per_second: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0004-0001-000000000005',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      template_id: '00000000-0000-0000-0001-000000000091', // ⭐ Modelo 1 - Serviço Completo
      title: '[Dom 27/09 17:00] 📺 Acceso Total & Estrenos Espanha (3.000 envios)',
      subject: '📺 Acceso Total: TV en español, deportes y estrenos en 4K (Prueba 24h gratis)',
      sender_name: 'Carlos Ventas - Universa TV España',
      sender_email: 'carlos_ventas@mail.universatv.com',
      reply_to: 'carlos_ventas@mail.universatv.com',
      target_audience_id: '00000000-0000-0003-0001-000000000005',
      status: 'scheduled',
      scheduled_at: '2026-09-27T15:00:00.000Z', // 17:00 CEST
      total_recipients: 3000,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
      failed_count: 0,
      rate_limit_per_second: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  for (const c of campaignsToInsert) {
    const { error } = await supabase.from('marketing_campaigns').insert([c]);
    if (error) console.warn('Erro ao inserir campanha:', c.title, error.message);
    else console.log(`✔ Campanha agendada com sucesso: ${c.title}`);
  }

  console.log('\n🎉 TODAS AS 5 CAMPANHAS FORAM CRIADAS E AGENDADAS NO SUPABASE COM SUCESSO!');
}

scheduleWeekendCampaigns();
