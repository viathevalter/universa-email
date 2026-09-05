import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, svix-id, svix-timestamp, svix-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'Universa Resend Webhook Listener',
      endpoint: '/api/resend-webhook',
      supported_events: ['email.opened', 'email.clicked', 'email.delivered', 'email.bounced', 'email.complained'],
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const payload = req.body;
    const { type, data, created_at } = payload || {};

    console.log(`[Resend Webhook Event] ${type}`, JSON.stringify(data));

    const emailId = data?.email_id || data?.id;
    const recipient = Array.isArray(data?.to) ? data.to[0] : data?.to;
    const clickUrl = data?.click?.link;

    // Conecta ao Supabase se configurado para atualizar fila e status do lead no Kanban
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 1. Atualizar registro da fila se tiver emailId
      if (emailId) {
        if (type === 'email.clicked') {
          await supabase
            .from('marketing_campaign_queues')
            .update({ clicked_at: new Date().toISOString() })
            .eq('resend_email_id', emailId);
        } else if (type === 'email.opened') {
          await supabase
            .from('marketing_campaign_queues')
            .update({ opened_at: new Date().toISOString() })
            .eq('resend_email_id', emailId);
        } else if (type === 'email.bounced') {
          await supabase
            .from('marketing_campaign_queues')
            .update({ status: 'bounced', error_message: 'Bounced via Resend Webhook' })
            .eq('resend_email_id', emailId);
        }
      }

      // 2. Atualizar estágio do Lead no CRM / Funil Kanban em tempo real
      if (recipient) {
        const cleanRecipient = recipient.toLowerCase().trim();

        if (type === 'email.clicked') {
          const isWhatsAppClick = clickUrl && (clickUrl.includes('whatsapp') || clickUrl.includes('wa.me'));
          const targetStatus = isWhatsAppClick ? 'converted' : 'replied';

          await supabase
            .from('leads')
            .update({ status: targetStatus, updated_at: new Date().toISOString() })
            .ilike('email', cleanRecipient);
        } else if (type === 'email.opened') {
          await supabase
            .from('leads')
            .update({ status: 'replied', updated_at: new Date().toISOString() })
            .ilike('email', cleanRecipient);
        } else if (type === 'email.delivered' || type === 'email.sent') {
          await supabase
            .from('leads')
            .update({ status: 'contacted', updated_at: new Date().toISOString() })
            .ilike('email', cleanRecipient);
        } else if (type === 'email.bounced') {
          await supabase
            .from('leads')
            .update({ mx_valid: false, status: 'unqualified', updated_at: new Date().toISOString() })
            .ilike('email', cleanRecipient);
        }
      }
    }

    return res.status(200).json({
      received: true,
      event: type,
      emailId,
      recipient,
      clickUrl,
      timestamp: created_at || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Resend Webhook Error]', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar webhook do Resend' });
  }
}
