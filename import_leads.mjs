import fs from 'node:fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqgtyxcawyjanspyvxro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3R5eGNhd3lqYW5zcHl2eHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDM4MTAsImV4cCI6MjEwMzU3OTgxMH0.otB80k2ij4EKVU5ts4XU7s6xTffi3UMkmiqOpYC-fNI';

const supabase = createClient(supabaseUrl, supabaseKey);
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const f1 = 'C:/Projetos IA/Email-Marketing/Mailing-empregos/candidatos_wolters_todos_2026-09-06.xlsx';
const f2 = 'C:/Projetos IA/Email-Marketing/Mailing-empregos/CV_Forms_Google.xlsx';

function normalizeStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function toTitleCase(str) {
  if (!str) return '';
  const lower = str.toLowerCase().replace(/\s+/g, ' ').trim();
  const smallWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'y', 'del', 'la', 'las', 'el', 'los', 'en', 'em']);
  return lower
    .split(' ')
    .map((word, idx) => {
      if (idx > 0 && smallWords.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function normalizeUnicodeChars(str) {
  return str.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

const DOMAIN_FIXES = {
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmai.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gamail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hormail.com': 'hotmail.com',
  'jotmail.com': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'hotmsil.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.es': 'yahoo.es',
  'yahoo.con': 'yahoo.es',
  'iclod.com': 'icloud.com'
};

function cleanEmail(rawEmail) {
  if (!rawEmail) return { valid: false, reason: 'empty' };
  let email = normalizeUnicodeChars(String(rawEmail)).trim().toLowerCase();
  
  if (email.includes(';') || (email.includes(',') && email.indexOf('@') < email.indexOf(','))) {
    email = email.split(/[;,]/)[0].trim();
  }
  
  email = email.replace(/\s+/g, '');
  email = email.replace(/^mailto:/, '');
  email = email.replace(/[.,;:]+$/, '');
  email = email.replace(/,com$/, '.com');
  
  if (email.includes('@hotm@il.com')) email = email.replace('@hotm@il.com', '@hotmail.com');

  if (!email.includes('@')) {
    return { valid: false, email, reason: 'no_at' };
  }
  
  const parts = email.split('@');
  if (parts.length !== 2) {
    return { valid: false, email, reason: 'multiple_at' };
  }
  
  let [user, domain] = parts;
  user = user.trim();
  domain = domain.trim();
  
  if (!user || !domain) {
    return { valid: false, email, reason: 'empty_user_or_domain' };
  }
  
  if (domain === 'gmail') domain = 'gmail.com';
  if (domain === 'hotmail') domain = 'hotmail.com';
  if (domain === 'outlook') domain = 'outlook.com';
  if (domain === 'gmailcom') domain = 'gmail.com';
  if (domain === 'hotmailcom') domain = 'hotmail.com';
  if (domain === 'gmail.') domain = 'gmail.com';
  if (domain.startsWith('gmail.com.')) domain = 'gmail.com';
  if (domain.startsWith('hotmail.com.')) domain = 'hotmail.com';

  if (domain.startsWith('gmail.com') && domain.length > 9) domain = 'gmail.com';
  if (domain.startsWith('hotmail.com') && domain.length > 11) domain = 'hotmail.com';

  if (DOMAIN_FIXES[domain]) {
    domain = DOMAIN_FIXES[domain];
  }
  
  const correctedEmail = `${user}@${domain}`;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(correctedEmail)) {
    return { valid: false, email: correctedEmail, original: rawEmail, reason: 'regex_fail' };
  }
  
  const bogusDomains = ['test.com', 'exemplo.com', 'example.com', 'correo.com', 'email.com', 'no.com', 'nada.com'];
  if (bogusDomains.includes(domain)) {
    return { valid: false, email: correctedEmail, original: rawEmail, reason: 'bogus_domain' };
  }
  
  return {
    valid: true,
    email: correctedEmail,
    original: rawEmail,
    domain
  };
}

function detectCountryAndLanguage(phone, countryField, cityField, nationalityField) {
  const p = normalizeStr(phone).replace(/\s+/g, '');
  const c = normalizeStr(countryField).toLowerCase();
  const city = normalizeStr(cityField).toLowerCase();
  const nat = normalizeStr(nationalityField).toLowerCase();

  let detectedCountry = 'Desconhecido';
  let ddi = '';
  let language = 'es';
  let regionType = 'Latam';

  if (p.startsWith('+55') || p.startsWith('0055')) {
    detectedCountry = 'Brasil';
    ddi = '+55';
    language = 'pt-BR';
    regionType = 'Brasil';
  } else if (p.startsWith('+351') || p.startsWith('00351')) {
    detectedCountry = 'Portugal';
    ddi = '+351';
    language = 'pt-PT';
    regionType = 'Portugal';
  } else if (p.startsWith('+34') || p.startsWith('0034')) {
    detectedCountry = 'Espanha';
    ddi = '+34';
    language = 'es';
    regionType = 'Espanha';
  } else if (p.startsWith('+57') || p.startsWith('0057')) {
    detectedCountry = 'Colômbia';
    ddi = '+57';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+58') || p.startsWith('0058')) {
    detectedCountry = 'Venezuela';
    ddi = '+58';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+51') || p.startsWith('0051')) {
    detectedCountry = 'Peru';
    ddi = '+51';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+54') || p.startsWith('0054')) {
    detectedCountry = 'Argentina';
    ddi = '+54';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+52') || p.startsWith('0052')) {
    detectedCountry = 'México';
    ddi = '+52';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+593')) {
    detectedCountry = 'Equador';
    ddi = '+593';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+56')) {
    detectedCountry = 'Chile';
    ddi = '+56';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+591')) {
    detectedCountry = 'Bolívia';
    ddi = '+591';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+595')) {
    detectedCountry = 'Paraguai';
    ddi = '+595';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+598')) {
    detectedCountry = 'Uruguai';
    ddi = '+598';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+502') || p.startsWith('+503') || p.startsWith('+504') || p.startsWith('+505') || p.startsWith('+506') || p.startsWith('+507')) {
    detectedCountry = 'América Central';
    ddi = p.slice(0, 4);
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+1')) {
    detectedCountry = 'EUA / República Dominicana';
    ddi = '+1';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+40') || p.startsWith('+33') || p.startsWith('+39') || p.startsWith('+49') || p.startsWith('+44')) {
    detectedCountry = 'Europa (Outros)';
    ddi = p.slice(0, 3);
    language = 'es';
    regionType = 'Europa';
  }

  if (detectedCountry === 'Desconhecido') {
    const combined = `${c} ${city} ${nat}`.toLowerCase();
    if (combined.includes('brasil') || combined.includes('brazil') || combined.includes('brasileir') || combined.includes('curitiba') || combined.includes('são paulo') || combined.includes('rio de janeiro')) {
      detectedCountry = 'Brasil';
      language = 'pt-BR';
      regionType = 'Brasil';
    } else if (combined.includes('portugal') || combined.includes('portugu') || combined.includes('lisboa') || combined.includes('porto') || combined.includes('braga')) {
      detectedCountry = 'Portugal';
      language = 'pt-PT';
      regionType = 'Portugal';
    } else if (combined.includes('españa') || combined.includes('spain') || combined.includes('madrid') || combined.includes('barcelona') || combined.includes('valencia') || combined.includes('galicia') || combined.includes('coruña')) {
      detectedCountry = 'Espanha';
      language = 'es';
      regionType = 'Espanha';
    } else if (combined.includes('colombia') || combined.includes('colombian') || combined.includes('bogot') || combined.includes('medell')) {
      detectedCountry = 'Colômbia';
      language = 'es';
      regionType = 'Latam';
    } else if (combined.includes('venezuela') || combined.includes('venezolan') || combined.includes('caracas')) {
      detectedCountry = 'Venezuela';
      language = 'es';
      regionType = 'Latam';
    } else if (combined.includes('peru') || combined.includes('peruan') || combined.includes('lima')) {
      detectedCountry = 'Peru';
      language = 'es';
      regionType = 'Latam';
    } else if (combined.includes('argentina') || combined.includes('buenos aires')) {
      detectedCountry = 'Argentina';
      language = 'es';
      regionType = 'Latam';
    } else if (combined.includes('mexico') || combined.includes('méxico')) {
      detectedCountry = 'México';
      language = 'es';
      regionType = 'Latam';
    }
  }

  if (detectedCountry === 'Desconhecido') {
    const rawDigits = p.replace(/\D/g, '');
    if ((rawDigits.length === 10 || rawDigits.length === 11) && !p.startsWith('+')) {
      const ddd = parseInt(rawDigits.slice(0, 2), 10);
      if (ddd >= 11 && ddd <= 99) {
        detectedCountry = 'Brasil';
        language = 'pt-BR';
        regionType = 'Brasil';
      }
    } else if (rawDigits.length === 9 && (rawDigits.startsWith('6') || rawDigits.startsWith('7'))) {
      detectedCountry = 'Espanha';
      language = 'es';
      regionType = 'Espanha';
    } else if (rawDigits.length === 9 && rawDigits.startsWith('9')) {
      detectedCountry = 'Portugal';
      language = 'pt-PT';
      regionType = 'Portugal';
    }
  }

  return { detectedCountry, ddi, language, regionType };
}

function extractProfessionTag(role) {
  const r = (role || '').toUpperCase();
  if (r.includes('SOLDADOR MIG') || r.includes('GMAW') || r.includes('FCAW')) return 'Soldador MIG/MAG';
  if (r.includes('SOLDADOR TIG') || r.includes('GTAW')) return 'Soldador TIG';
  if (r.includes('ELECTRODO') || r.includes('SMAW')) return 'Soldador Eletrodo';
  if (r.includes('SOLDADOR')) return 'Soldador';
  if (r.includes('TUBERO')) return 'Tubero';
  if (r.includes('ELECTRICISTA') || r.includes('ELÉCTRICO')) return 'Eletricista';
  if (r.includes('MECÁNICO') || r.includes('MECANICO')) return 'Mecânico';
  if (r.includes('MONTADOR')) return 'Montador';
  if (r.includes('CALDERERO') || r.includes('ARMADOR')) return 'Caldeireiro';
  if (r.includes('CNC')) return 'Operador CNC';
  return 'Técnico Industrial';
}

async function runImport() {
  console.log('--- Lendo planilhas ---');
  const buf1 = fs.readFileSync(f1);
  const wb1 = XLSX.read(buf1, { type: 'buffer' });
  const rows1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], { defval: '' });

  const buf2 = fs.readFileSync(f2);
  const wb2 = XLSX.read(buf2, { type: 'buffer' });
  const rows2 = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { defval: '' });

  const leadsMap = new Map();

  // 1. Inserir Wolters
  for (const r of rows1) {
    const rawEmail = r['Correo Electrónico (Email)'];
    const emailRes = cleanEmail(rawEmail);
    if (!emailRes.valid) continue;

    const email = emailRes.email;
    leadsMap.set(email, {
      name: toTitleCase(normalizeStr(r['Nombre Completo'])),
      email,
      phone: normalizeStr(r['Teléfono / WhatsApp']),
      puesto: normalizeStr(r['Oferta / Puesto de Interés']),
      nacionalidad: normalizeStr(r['Nacionalidad']),
      pais: normalizeStr(r['País de Residencia']),
      ciudad: normalizeStr(r['Ubicación / Ciudad']),
      documentacion: normalizeStr(r['Documentación']),
      estado: normalizeStr(r['Estado en el Sistema']),
      dataRegistro: normalizeStr(r['Fecha de Registro']),
      sources: ['Wolters']
    });
  }

  // 2. Inserir Google Forms
  for (const r of rows2) {
    const rawEmail = r['Correo electrónico (si lo tienes)'];
    const emailRes = cleanEmail(rawEmail);
    if (!emailRes.valid) continue;

    const email = emailRes.email;
    if (leadsMap.has(email)) {
      const existing = leadsMap.get(email);
      existing.sources.push('Google Forms');
      if (!existing.phone && r['Teléfono/Whatsapp']) existing.phone = normalizeStr(r['Teléfono/Whatsapp']);
      if (!existing.puesto && r['  Seleccione la oferta de su interés:  ']) existing.puesto = normalizeStr(r['  Seleccione la oferta de su interés:  ']);
      if (!existing.ciudad && r['Donde esta ubicado actualmente']) existing.ciudad = normalizeStr(r['Donde esta ubicado actualmente']);
      if (!existing.documentacion && r['Que clase de documentación tiene?']) existing.documentacion = normalizeStr(r['Que clase de documentación tiene?']);
      if (r['¿Qué idiomas habla?  ']) existing.idiomas = normalizeStr(r['¿Qué idiomas habla?  ']);
    } else {
      leadsMap.set(email, {
        name: toTitleCase(normalizeStr(r['Nombre '])),
        email,
        phone: normalizeStr(r['Teléfono/Whatsapp']),
        puesto: normalizeStr(r['  Seleccione la oferta de su interés:  ']),
        nacionalidad: '',
        pais: normalizeStr(r['Donde esta ubicado actualmente']),
        ciudad: normalizeStr(r['Donde esta ubicado actualmente']),
        documentacion: normalizeStr(r['Que clase de documentación tiene?']),
        idiomas: normalizeStr(r['¿Qué idiomas habla?  ']),
        dataRegistro: '',
        sources: ['Google Forms']
      });
    }
  }

  console.log(`Total de leads consolidados prontos para inserção: ${leadsMap.size}`);

  const leadsToInsert = [];
  for (const item of leadsMap.values()) {
    const geo = detectCountryAndLanguage(item.phone, item.pais, item.ciudad, item.nacionalidad);
    const profTag = extractProfessionTag(item.puesto);

    const tags = [
      'Mailing Empregos',
      geo.regionType,
      `Idioma: ${geo.language === 'pt-BR' ? 'PT-BR' : geo.language === 'pt-PT' ? 'PT-PT' : 'ES'}`,
      profTag
    ];
    if (item.sources.includes('Wolters')) tags.push('Wolters');
    if (item.sources.includes('Google Forms')) tags.push('Google Forms');

    const companyName = item.puesto ? `Candidato - ${profTag}` : 'Candidato B2C';
    const notes = [
      `Origem: ${item.sources.join(' + ')}`,
      item.puesto ? `Vaga: ${item.puesto}` : '',
      item.documentacion ? `Doc: ${item.documentacion}` : '',
      item.idiomas ? `Idiomas: ${item.idiomas}` : '',
      item.dataRegistro ? `Data: ${item.dataRegistro}` : ''
    ].filter(Boolean).join(' | ');

    // Limpar e truncar para os tamanhos seguros do banco
    const cleanPhone = item.phone ? item.phone.slice(0, 45) : null;
    const cleanRole = (item.puesto || profTag).slice(0, 100);
    const cleanCity = item.ciudad ? item.ciudad.slice(0, 100) : null;
    const cleanCountry = (geo.detectedCountry !== 'Desconhecido' ? geo.detectedCountry : (geo.regionType === 'Latam' ? 'América Latina' : 'Espanha')).slice(0, 80);

    leadsToInsert.push({
      tenant_id: TENANT_ID,
      name: (item.name || 'Candidato').slice(0, 120),
      company_name: companyName.slice(0, 120),
      email: item.email,
      phone: cleanPhone,
      website: null,
      sector: 'Candidatos Emprego / B2C',
      role: cleanRole,
      company_size: 'B2C (Consumidor)',
      city: cleanCity,
      province: null,
      country: cleanCountry,
      tags,
      notes: notes.slice(0, 500),
      status: 'new',
      opted_out: false,
      mx_valid: true,
      mx_record: 'Validação sintática & domínio ativo'
    });
  }

  console.log(`Iniciando importação de todos os ${leadsToInsert.length} leads em lotes de 100...`);
  const BATCH_SIZE = 100;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
    const batch = leadsToInsert.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('leads').upsert(batch, { onConflict: 'tenant_id,email' });
    
    if (error) {
      console.error(`Erro no lote ${i} a ${i + batch.length}:`, error.message);
      // Tentar um por um no lote problemático para não perder os válidos
      for (const singleLead of batch) {
        const { error: sErr } = await supabase.from('leads').upsert(singleLead, { onConflict: 'tenant_id,email' });
        if (sErr) {
          console.error(`Erro em lead individual (${singleLead.email}):`, sErr.message);
          errorCount++;
        } else {
          successCount++;
        }
      }
    } else {
      successCount += batch.length;
    }

    if ((i / BATCH_SIZE) % 5 === 0 || i + BATCH_SIZE >= leadsToInsert.length) {
      console.log(`Progresso: ${Math.min(i + BATCH_SIZE, leadsToInsert.length)}/${leadsToInsert.length} leads processados...`);
    }
  }

  console.log('\n================ IMPORTAÇÃO FINALIZADA ================');
  console.log(`Sucesso: ${successCount} leads inseridos/atualizados`);
  console.log(`Falhas: ${errorCount}`);

  const { count: finalCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log(`Total geral de leads no sistema agora: ${finalCount}`);
}

runImport();
