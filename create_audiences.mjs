import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqgtyxcawyjanspyvxro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3R5eGNhd3lqYW5zcHl2eHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDM4MTAsImV4cCI6MjEwMzU3OTgxMH0.otB80k2ij4EKVU5ts4XU7s6xTffi3UMkmiqOpYC-fNI';

const supabase = createClient(supabaseUrl, supabaseKey);
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const audiences = [
  {
    tenant_id: TENANT_ID,
    name: '🌎 Candidatos América Latina (TV & Canais Nacionais)',
    description: '1.923 leads de Colômbia, Peru, Argentina, México, Venezuela, Chile e outros países latinos (Idioma: Espanhol).',
    filters_json: {
      tags: ['Mailing Empregos', 'Latam'],
      sector: ['Candidatos Emprego / B2C'],
      country: ['Colômbia', 'Peru', 'México', 'Argentina', 'Chile', 'Venezuela', 'Equador', 'Bolívia', 'Paraguai', 'Uruguai', 'América Central', 'América Latina'],
      lead_count: 1923
    }
  },
  {
    tenant_id: TENANT_ID,
    name: '🇪🇸 Candidatos & Trabalhadores Espanha (LaLiga & Streaming)',
    description: '1.379 leads já residentes ou com número da Espanha (Idioma: Espanhol).',
    filters_json: {
      tags: ['Mailing Empregos', 'Espanha'],
      sector: ['Candidatos Emprego / B2C'],
      country: ['Espanha'],
      lead_count: 1379
    }
  },
  {
    tenant_id: TENANT_ID,
    name: '🇵🇹 Candidatos & Trabalhadores Portugal (Liga Portugal & Sport TV)',
    description: '888 leads residentes em Portugal ou com DDI +351 (Idioma: Português de Portugal).',
    filters_json: {
      tags: ['Mailing Empregos', 'Portugal'],
      sector: ['Candidatos Emprego / B2C'],
      country: ['Portugal'],
      lead_count: 888
    }
  },
  {
    tenant_id: TENANT_ID,
    name: '🇧🇷 Candidatos Brasileiros (Brasileirão & Premiere)',
    description: '270 leads brasileiros com DDI +55 e celulares do Brasil (Idioma: Português do Brasil).',
    filters_json: {
      tags: ['Mailing Empregos', 'Brasil'],
      sector: ['Candidatos Emprego / B2C'],
      country: ['Brasil'],
      lead_count: 270
    }
  },
  {
    tenant_id: TENANT_ID,
    name: '💼 Mailing Empregos Consolidado (Todos os 4.502)',
    description: 'Base completa de 4.502 candidatos auditados e higienizados de Wolters e Google Forms.',
    filters_json: {
      tags: ['Mailing Empregos'],
      sector: ['Candidatos Emprego / B2C'],
      lead_count: 4502
    }
  }
];

async function createAudiences() {
  console.log('Criando audiências salvas no Supabase...');
  for (const aud of audiences) {
    // Verificar se já existe audiência com mesmo nome
    const { data: existing } = await supabase.from('saved_audiences').select('id').eq('tenant_id', TENANT_ID).eq('name', aud.name).limit(1);
    if (existing && existing.length > 0) {
      console.log(`Audiência já existe (${aud.name}), atualizando...`);
      await supabase.from('saved_audiences').update(aud).eq('id', existing[0].id);
    } else {
      console.log(`Inserindo nova audiência (${aud.name})...`);
      const { error } = await supabase.from('saved_audiences').insert(aud);
      if (error) console.error(`Erro ao criar ${aud.name}:`, error.message);
    }
  }

  const { data: allAud } = await supabase.from('saved_audiences').select('id, name');
  console.log('Total de Audiências Salvas no sistema:', allAud.length);
  console.log(allAud);
}

createAudiences();
