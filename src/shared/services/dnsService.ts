import type { DnsVerificationResult } from '../../types';

// Lista de domínios descartáveis / temporários conhecidos
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'guerrillamail.com',
  'trashmail.com',
  'yopmail.com',
  'sharklasers.com',
  'throwawaymail.com',
  'getairmail.com',
  'dispostable.com',
  'temp-mail.org',
  'fakeinbox.com',
  'nada.ltd',
  'generator.email',
]);

// Validação sintática de e-mail por RFC 5322 simplificada
export function isValidEmailSyntax(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email.trim().toLowerCase());
}

export function extractDomainFromEmail(email: string): string {
  if (!email.includes('@')) return '';
  return email.trim().split('@')[1].toLowerCase();
}

/**
 * Consulta registros DNS (MX ou A) usando Google Public DNS over HTTPS com fallback para Cloudflare DNS.
 */
async function queryDnsRecord(domain: string, type: 'MX' | 'A'): Promise<string[]> {
  const cleanDomain = domain.trim().toLowerCase();
  
  // 1. Tentativa Google DoH
  try {
    const googleUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=${type}`;
    const response = await fetch(googleUrl, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(4000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.Answer && Array.isArray(data.Answer)) {
        return data.Answer.map((ans: { data: string }) => ans.data);
      }
    }
  } catch (err) {
    console.warn(`[Google DoH Fail] Falha ao consultar ${type} para ${cleanDomain}`, err);
  }

  // 2. Fallback para Cloudflare DoH
  try {
    const cfUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=${type}`;
    const response = await fetch(cfUrl, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(4000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.Answer && Array.isArray(data.Answer)) {
        return data.Answer.map((ans: { data: string }) => ans.data);
      }
    }
  } catch (err) {
    console.warn(`[Cloudflare DoH Fail] Falha ao consultar ${type} para ${cleanDomain}`, err);
  }

  return [];
}

/**
 * Executa a verificação completa de entregabilidade do domínio e e-mail:
 * - Validação sintática
 * - Detecção de domínios descartáveis
 * - Consulta de MX Records reais via DNS over HTTPS
 * - Consulta de A Record (Website ativo)
 * - Cálculo de Score de Entregabilidade (0 a 100)
 */
export async function verifyEmailDns(emailOrDomain: string): Promise<DnsVerificationResult> {
  const isEmail = emailOrDomain.includes('@');
  const domain = isEmail ? extractDomainFromEmail(emailOrDomain) : emailOrDomain.trim().toLowerCase();
  const isSyntaxValid = isEmail ? isValidEmailSyntax(emailOrDomain) : Boolean(domain.includes('.'));
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);

  if (!domain || domain.length < 3 || !isSyntaxValid) {
    return {
      domain,
      hasMx: false,
      mxRecords: [],
      hasARecord: false,
      isDisposable,
      isSyntaxValid: false,
      score: 0,
      details: 'Sintaxe de e-mail ou domínio inválida.',
    };
  }

  if (isDisposable) {
    return {
      domain,
      hasMx: true,
      mxRecords: ['disposable-gateway'],
      hasARecord: true,
      isDisposable: true,
      isSyntaxValid: true,
      score: 10,
      details: 'Domínio descartável/temporário detectado. Alto risco de rejeição.',
    };
  }

  // Executa consultas paralelas com Promise.all
  try {
    const [mxRecords, aRecords] = await Promise.all([
      queryDnsRecord(domain, 'MX'),
      queryDnsRecord(domain, 'A'),
    ]);

    const hasMx = mxRecords.length > 0;
    const hasARecord = aRecords.length > 0;

    let score = 0;
    if (isSyntaxValid) score += 20;
    if (!isDisposable) score += 20;
    if (hasMx) score += 40;
    if (hasARecord) score += 20;

    // Detecta provedores conhecidos nos registros MX
    let provider = 'Servidor Próprio / Outro';
    const joinedMx = mxRecords.join(' ').toLowerCase();
    if (joinedMx.includes('google') || joinedMx.includes('l.google.com') || joinedMx.includes('aspmx')) {
      provider = 'Google Workspace';
    } else if (joinedMx.includes('outlook') || joinedMx.includes('microsoft') || joinedMx.includes('office365')) {
      provider = 'Microsoft 365 / Exchange';
    } else if (joinedMx.includes('zoho')) {
      provider = 'Zoho Mail';
    } else if (joinedMx.includes('locaweb')) {
      provider = 'Locaweb Mail';
    } else if (joinedMx.includes('hostgator') || joinedMx.includes('titan')) {
      provider = 'Titan / Webmail Corporativo';
    }

    return {
      domain,
      hasMx,
      mxRecords,
      hasARecord,
      isDisposable: false,
      isSyntaxValid: true,
      score,
      provider: hasMx ? provider : 'Sem Provedor MX',
      details: hasMx
        ? `MX verificado com sucesso (${provider}).`
        : 'Domínio sem registros MX válidos. Risco crítico de bounce.',
    };
  } catch (error) {
    console.warn(`[DNS Verification Exception] Falha ao verificar ${domain}:`, error);
    return {
      domain,
      hasMx: false,
      mxRecords: [],
      hasARecord: false,
      isDisposable: false,
      isSyntaxValid: true,
      score: 30,
      details: 'Tempo limite esgotado ao consultar servidores DNS.',
    };
  }
}
