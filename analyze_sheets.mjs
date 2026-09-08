import fs from 'node:fs';
import * as XLSX from 'xlsx';

const f1 = 'C:/Projetos IA/Email-Marketing/Mailing-empregos/candidatos_wolters_todos_2026-09-06.xlsx';
const f2 = 'C:/Projetos IA/Email-Marketing/Mailing-empregos/CV_Forms_Google.xlsx';

function normalizeStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// Mapa de correções comuns de domínio de e-mail (typos)
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
  let email = String(rawEmail).trim().toLowerCase();
  
  // Remover pontuação ou espaços finais/iniciais e caracteres invisíveis
  email = email.replace(/[\s\r\n\t]/g, '');
  email = email.replace(/^mailto:/, '');
  email = email.replace(/[.,;:]+$/, '');
  
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
  
  // Corrigir typo de domínio conhecido
  let wasCorrected = false;
  let originalDomain = domain;
  if (DOMAIN_FIXES[domain]) {
    domain = DOMAIN_FIXES[domain];
    wasCorrected = true;
  }
  
  const correctedEmail = `${user}@${domain}`;
  
  // Validação simples de regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(correctedEmail)) {
    return { valid: false, email: correctedEmail, original: rawEmail, reason: 'regex_fail' };
  }
  
  // Checar domínios obviamente falsos / placeholders
  const bogusDomains = ['test.com', 'exemplo.com', 'example.com', 'correo.com', 'email.com', 'no.com', 'nada.com'];
  if (bogusDomains.includes(domain)) {
    return { valid: false, email: correctedEmail, original: rawEmail, reason: 'bogus_domain' };
  }
  
  return {
    valid: true,
    email: correctedEmail,
    original: rawEmail,
    wasCorrected,
    domain
  };
}

// Analisador de DDI e País
function detectCountryAndLanguage(phone, countryField, cityField, nationalityField) {
  const p = normalizeStr(phone).replace(/\s+/g, '');
  const c = normalizeStr(countryField).toLowerCase();
  const city = normalizeStr(cityField).toLowerCase();
  const nat = normalizeStr(nationalityField).toLowerCase();

  let detectedCountry = 'Desconhecido';
  let ddi = '';
  let language = 'es'; // default para América Latina / Espanha
  let regionType = 'Latam';

  // Analisar DDI
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
    detectedCountry = 'EUA / República Dominicana / Porto Rico';
    ddi = '+1';
    language = 'es';
    regionType = 'Latam';
  } else if (p.startsWith('+40') || p.startsWith('+33') || p.startsWith('+39') || p.startsWith('+49') || p.startsWith('+44')) {
    detectedCountry = 'Europa (Outros)';
    ddi = p.slice(0, 3);
    language = 'es';
    regionType = 'Europa';
  }

  // Se DDI não foi detectado, tentar pelos campos de texto
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

  // Se o telefone parecer com celular brasileiro sem DDI (ex: 41 98639389 ou 11988887777 ou 479...)
  if (detectedCountry === 'Desconhecido') {
    const rawDigits = p.replace(/\D/g, '');
    if ((rawDigits.length === 10 || rawDigits.length === 11) && !p.startsWith('+')) {
      // Checar se dois primeiros dígitos são DDD brasileiro válido (11 a 99)
      const ddd = parseInt(rawDigits.slice(0, 2), 10);
      if (ddd >= 11 && ddd <= 99) {
        // Forte probabilidade de Brasil
        detectedCountry = 'Brasil (Inferido)';
        language = 'pt-BR';
        regionType = 'Brasil';
      }
    } else if (rawDigits.length === 9 && (rawDigits.startsWith('6') || rawDigits.startsWith('7'))) {
      // Celular típico de Espanha (9 dígitos começando com 6 ou 7)
      detectedCountry = 'Espanha (Inferido)';
      language = 'es';
      regionType = 'Espanha';
    } else if (rawDigits.length === 9 && rawDigits.startsWith('9')) {
      // Celular típico de Portugal (9 dígitos começando com 9)
      detectedCountry = 'Portugal (Inferido)';
      language = 'pt-PT';
      regionType = 'Portugal';
    }
  }

  return { detectedCountry, ddi, language, regionType };
}

function analyzeData() {
  console.log('Carregando arquivos...');
  const buf1 = fs.readFileSync(f1);
  const wb1 = XLSX.read(buf1, { type: 'buffer' });
  const rows1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], { defval: '' });

  const buf2 = fs.readFileSync(f2);
  const wb2 = XLSX.read(buf2, { type: 'buffer' });
  const rows2 = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { defval: '' });

  console.log(`Linhas brutas: Wolters = ${rows1.length} | CV_Forms_Google = ${rows2.length} | Total Bruto = ${rows1.length + rows2.length}`);

  const audit = {
    wolters: { total: rows1.length, validEmails: 0, invalidEmails: 0, correctedEmails: 0, emptyEmails: 0 },
    google: { total: rows2.length, validEmails: 0, invalidEmails: 0, correctedEmails: 0, emptyEmails: 0 },
    duplicatesBetweenSheets: 0,
    duplicatesInternalWolters: 0,
    duplicatesInternalGoogle: 0,
    correctedList: [],
    invalidList: [],
    countryBreakdown: {},
    regionBreakdown: {},
    languageBreakdown: {},
    puestoBreakdown: {}
  };

  const woltersMap = new Map(); // email -> row
  const googleMap = new Map();  // email -> row
  const consolidatedMap = new Map(); // email -> merged lead

  // 1. Processar Wolters
  for (const r of rows1) {
    const rawEmail = r['Correo Electrónico (Email)'];
    const emailRes = cleanEmail(rawEmail);
    
    if (!emailRes.valid) {
      if (emailRes.reason === 'empty') audit.wolters.emptyEmails++;
      else audit.wolters.invalidEmails++;
      audit.invalidList.push({ source: 'Wolters', raw: rawEmail, reason: emailRes.reason, name: r['Nombre Completo'] });
      continue;
    }

    if (emailRes.wasCorrected) {
      audit.wolters.correctedEmails++;
      audit.correctedList.push({ source: 'Wolters', original: rawEmail, corrected: emailRes.email });
    }
    audit.wolters.validEmails++;

    if (woltersMap.has(emailRes.email)) {
      audit.duplicatesInternalWolters++;
    } else {
      woltersMap.set(emailRes.email, {
        source: 'Wolters',
        name: normalizeStr(r['Nombre Completo']),
        email: emailRes.email,
        phone: normalizeStr(r['Teléfono / WhatsApp']),
        puesto: normalizeStr(r['Oferta / Puesto de Interés']),
        nacionalidad: normalizeStr(r['Nacionalidad']),
        pais: normalizeStr(r['País de Residencia']),
        ciudad: normalizeStr(r['Ubicación / Ciudad']),
        documentacion: normalizeStr(r['Documentación']),
        estado: normalizeStr(r['Estado en el Sistema']),
        dataRegistro: normalizeStr(r['Fecha de Registro'])
      });
    }
  }

  // 2. Processar CV_Forms_Google
  for (const r of rows2) {
    const rawEmail = r['Correo electrónico (si lo tienes)'];
    const emailRes = cleanEmail(rawEmail);

    if (!emailRes.valid) {
      if (emailRes.reason === 'empty') audit.google.emptyEmails++;
      else audit.google.invalidEmails++;
      audit.invalidList.push({ source: 'Google Forms', raw: rawEmail, reason: emailRes.reason, name: r['Nombre '] });
      continue;
    }

    if (emailRes.wasCorrected) {
      audit.google.correctedEmails++;
      audit.correctedList.push({ source: 'Google Forms', original: rawEmail, corrected: emailRes.email });
    }
    audit.google.validEmails++;

    if (googleMap.has(emailRes.email)) {
      audit.duplicatesInternalGoogle++;
    } else {
      googleMap.set(emailRes.email, {
        source: 'Google Forms',
        name: normalizeStr(r['Nombre ']),
        email: emailRes.email,
        phone: normalizeStr(r['Teléfono/Whatsapp']),
        puesto: normalizeStr(r['  Seleccione la oferta de su interés:  ']),
        nacionalidad: '',
        pais: normalizeStr(r['Donde esta ubicado actualmente']),
        ciudad: normalizeStr(r['Donde esta ubicado actualmente']),
        documentacion: normalizeStr(r['Que clase de documentación tiene?']),
        idiomas: normalizeStr(r['¿Qué idiomas habla?  ']),
        sirve: normalizeStr(r['Sirve?'])
      });
    }
  }

  // 3. Cruzamento e Consolidação
  for (const [email, lead] of woltersMap.entries()) {
    consolidatedMap.set(email, { ...lead, sources: ['Wolters'] });
  }

  for (const [email, lead] of googleMap.entries()) {
    if (consolidatedMap.has(email)) {
      audit.duplicatesBetweenSheets++;
      const existing = consolidatedMap.get(email);
      existing.sources.push('Google Forms');
      // Completar campos vazios se o Google Forms tiver info extra
      if (!existing.phone && lead.phone) existing.phone = lead.phone;
      if (!existing.puesto && lead.puesto) existing.puesto = lead.puesto;
      if (!existing.documentacion && lead.documentacion) existing.documentacion = lead.documentacion;
      if (lead.sirve) existing.sirve = lead.sirve;
    } else {
      consolidatedMap.set(email, { ...lead, sources: ['Google Forms'] });
    }
  }

  // 4. Analisar distribuição geográfica e linguística do consolidado
  for (const lead of consolidatedMap.values()) {
    const geo = detectCountryAndLanguage(lead.phone, lead.pais, lead.ciudad, lead.nacionalidad);
    lead.detectedCountry = geo.detectedCountry;
    lead.language = geo.language;
    lead.regionType = geo.regionType;
    lead.ddi = geo.ddi;

    audit.countryBreakdown[geo.detectedCountry] = (audit.countryBreakdown[geo.detectedCountry] || 0) + 1;
    audit.regionBreakdown[geo.regionType] = (audit.regionBreakdown[geo.regionType] || 0) + 1;
    audit.languageBreakdown[geo.language] = (audit.languageBreakdown[geo.language] || 0) + 1;

    const pKey = lead.puesto || 'Não especificado';
    audit.puestoBreakdown[pKey] = (audit.puestoBreakdown[pKey] || 0) + 1;
  }

  console.log('\n================ RESUMO DA AUDITORIA ================');
  console.log('Wolters:');
  console.log(`  Total: ${audit.wolters.total}`);
  console.log(`  E-mails Válidos: ${audit.wolters.validEmails}`);
  console.log(`  E-mails Válidos Corrigidos (typo fix): ${audit.wolters.correctedEmails}`);
  console.log(`  E-mails Vazios: ${audit.wolters.emptyEmails}`);
  console.log(`  E-mails Inválidos (descartados): ${audit.wolters.invalidEmails}`);
  console.log(`  Duplicados internos: ${audit.duplicatesInternalWolters}`);
  console.log(`  Leads únicos Wolters: ${woltersMap.size}`);

  console.log('\nCV Forms Google:');
  console.log(`  Total: ${audit.google.total}`);
  console.log(`  E-mails Válidos: ${audit.google.validEmails}`);
  console.log(`  E-mails Válidos Corrigidos (typo fix): ${audit.google.correctedEmails}`);
  console.log(`  E-mails Vazios: ${audit.google.emptyEmails}`);
  console.log(`  E-mails Inválidos (descartados): ${audit.google.invalidEmails}`);
  console.log(`  Duplicados internos: ${audit.duplicatesInternalGoogle}`);
  console.log(`  Leads únicos Google: ${googleMap.size}`);

  console.log('\nConsolidação e Deduplicação:');
  console.log(`  Leads presentes em AMBAS as planilhas: ${audit.duplicatesBetweenSheets}`);
  console.log(`  TOTAL FINAL DE LEADS ÚNICOS E HIGIENIZADOS: ${consolidatedMap.size}`);

  console.log('\nDistribuição por Região/Segmento:');
  console.table(audit.regionBreakdown);

  console.log('\nDistribuição por Idioma:');
  console.table(audit.languageBreakdown);

  console.log('\nTop 15 Países Detectados:');
  const sortedCountries = Object.entries(audit.countryBreakdown).sort((a,b) => b[1] - a[1]).slice(0, 15);
  console.table(sortedCountries);

  console.log('\nTop 10 Vagas/Puestos:');
  const sortedPuestos = Object.entries(audit.puestoBreakdown).sort((a,b) => b[1] - a[1]).slice(0, 10);
  console.table(sortedPuestos);

  console.log('\nExemplos de E-mails Corrigidos (Total:', audit.correctedList.length, '):');
  console.log(audit.correctedList.slice(0, 10));

  console.log('\nExemplos de E-mails Inválidos Excluídos (Total:', audit.invalidList.length, '):');
  console.log(audit.invalidList.slice(0, 10));
}

analyzeData();
