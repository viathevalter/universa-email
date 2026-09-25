const fs = require('fs');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqgtyxcawyjanspyvxro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3R5eGNhd3lqYW5zcHl2eHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDM4MTAsImV4cCI6MjEwMzU3OTgxMH0.otB80k2ij4EKVU5ts4XU7s6xTffi3UMkmiqOpYC-fNI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function purgeBouncedAndComplaints() {
  console.log('=== AUDITORIA COMPLETA DE BOUNCES, RECLAMAÇÕES E CANCELAMENTOS ===');

  // 1. Extrair todos os e-mails com Bounce ou Complaint do CSV do Resend
  console.log('1. Lendo histórico de eventos do Resend (emails-sent-*.csv)...');
  const fileStream = fs.createReadStream('./public/emails-sent-1788872704261.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const suppressedEmails = new Set();
  const bounceDetails = new Map(); // email -> event

  for await (const line of rl) {
    if (line.includes(',bounced,') || line.includes(',complained,') || line.includes(',failed,')) {
      // O campo 'to' está entre aspas ou vírgulas
      const match = line.match(/,([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}),/);
      if (match) {
        const email = match[1].toLowerCase().trim();
        suppressedEmails.add(email);
        const event = line.includes(',bounced,') ? 'bounced' : (line.includes(',complained,') ? 'complained' : 'failed');
        bounceDetails.set(email, event);
      }
    }
  }

  console.log(`Total de e-mails suprimidos identificados no Resend: ${suppressedEmails.size}`);

  // 2. Buscar todos os leads da base Supabase
  console.log('\n2. Carregando base completa de leads do Supabase...');
  let allLeads = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('leads')
      .select('id, email, country, tags, status, opted_out, mx_valid')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error || !data || data.length === 0) break;
    allLeads.push(...data);
    page++;
    if (data.length < pageSize) break;
  }
  console.log(`Total de leads no Supabase: ${allLeads.length}`);

  // 3. Verificar quantos leads no Supabase coincidem com a lista de supressão do Resend ou mx_valid = false
  const matchedSuppressed = allLeads.filter(l => suppressedEmails.has(l.email.toLowerCase().trim()) || l.opted_out || l.mx_valid === false);
  console.log(`Leads encontrados no Supabase que NÃO devem receber e-mails: ${matchedSuppressed.length}`);

  // 4. Atualizar o Supabase para marcar esses leads como opted_out = true e status = 'bounced'
  console.log('\n3. Marcando leads suprimidos no Supabase como opted_out = true...');
  const emailsToMark = Array.from(suppressedEmails);
  const BATCH_SIZE = 100;
  for (let i = 0; i < emailsToMark.length; i += BATCH_SIZE) {
    const batch = emailsToMark.slice(i, i + BATCH_SIZE);
    await supabase
      .from('leads')
      .update({
        opted_out: true,
        status: 'bounced',
        mx_valid: false,
        updated_at: new Date().toISOString(),
      })
      .in('email', batch);
  }
  console.log('✔ Leads atualizados no Supabase como suprimidos/bounced!');

  // 5. Verificar se algum desses leads suprimidos estava dentro dos 5 públicos da Espanha criados
  const { data: audiences } = await supabase.from('saved_audiences').select('*');
  const weekendAuds = audiences.filter(a => a.name.includes('Espanha Lote'));

  let anyInfected = false;
  for (const aud of weekendAuds) {
    const leadIds = new Set(aud.filters_json?.lead_ids || []);
    let countInAudience = 0;
    matchedSuppressed.forEach(l => {
      if (leadIds.has(l.id)) countInAudience++;
    });
    console.log(`- Audiência: "${aud.name}" possui ${countInAudience} leads suprimidos`);
    if (countInAudience > 0) anyInfected = true;
  }

  // 6. Se houver qualquer lead suprimido nos públicos agendados, regeneramos os públicos 100% limpos
  if (anyInfected || true) {
    console.log('\n4. Regenerando os 5 Lotes com 100% de garantia ANTI-BOUNCE...');
    const isPortugueseOrBrazilian = (l) => {
      if (l.country === 'Brasil' || l.country === 'Portugal') return true;
      if (l.tags && l.tags.some(t => {
        const lower = t.toLowerCase();
        return lower.includes('brasil') || lower.includes('portug') || lower.includes('pt-br') || lower.includes('pt-pt');
      })) return true;
      return false;
    };

    // Apenas leads saudáveis: Espanha, sem PT/BR, mx_valid !== false, opted_out !== true, e NÃO no histórico de bounce do Resend
    const cleanSpainLeads = allLeads.filter(l => {
      if (l.opted_out) return false;
      if (l.mx_valid === false) return false;
      if (suppressedEmails.has(l.email.toLowerCase().trim())) return false;
      const isSpain = (l.country === 'Espanha' || l.country === 'Spain' || (l.tags && l.tags.some(t => t.includes('ES') || t.includes('Espanha'))));
      return isSpain && !isPortugueseOrBrazilian(l);
    });

    console.log(`Total de leads da Espanha 100% LIMPOS, VÁLIDOS E SEM BOUNCES: ${cleanSpainLeads.length}`);

    const c1 = cleanSpainLeads.slice(0, 3000);
    const c2 = cleanSpainLeads.slice(3000, 6000);
    const c3 = cleanSpainLeads.slice(6000, 9000);
    const c4 = cleanSpainLeads.slice(9000, 11993);
    const sportsCinemaClean = cleanSpainLeads.filter(l =>
      l.tags && l.tags.some(t => t.includes('LALIGA') || t.includes('MOTORSPORT') || t.includes('CINE_SERIES'))
    );
    const c5 = sportsCinemaClean.slice(0, 3000);

    const chunks = [c1, c2, c3, c4, c5];
    for (let idx = 0; idx < weekendAuds.length; idx++) {
      const aud = weekendAuds[idx];
      const chunk = chunks[idx] || [];
      await supabase
        .from('saved_audiences')
        .update({
          filters_json: {
            country: ['Espanha'],
            lead_count: chunk.length,
            lead_ids: chunk.map(l => l.id),
          },
        })
        .eq('id', aud.id);
      console.log(`✔ Audiência ${aud.name} atualizada com ${chunk.length} leads 100% limpos!`);
    }
  }

  console.log('\n🎉 AUDITORIA E LIMPEZA CONCLUÍDAS COM SUCESSO!');
}

purgeBouncedAndComplaints();
