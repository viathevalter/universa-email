import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  const { lead, url, campaign } = req.query || {};

  const targetUrl = url ? decodeURIComponent(url) : 'https://wa.me/34617598421';
  const leadEmail = lead ? decodeURIComponent(lead).toLowerCase().trim() : null;

  if (leadEmail) {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yqgtyxcawyjanspyvxro.supabase.co';
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3R5eGNhd3lqYW5zcHl2eHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDM4MTAsImV4cCI6MjEwMzU3OTgxMH0.otB80k2ij4EKVU5ts4XU7s6xTffi3UMkmiqOpYC-fNI';
      const supabase = createClient(supabaseUrl, supabaseKey);

      const isWhatsApp = targetUrl.includes('wa.me') || targetUrl.includes('whatsapp');
      const newStatus = isWhatsApp ? 'converted' : 'replied';

      // Atualiza o lead no Kanban
      await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .ilike('email', leadEmail);

      // Atualiza fila se existir
      await supabase
        .from('marketing_campaign_queue')
        .update({ clicked_at: new Date().toISOString() })
        .ilike('recipient_email', leadEmail);

      // Incrementa cliques na campanha
      if (campaign) {
        const { data: c } = await supabase.from('marketing_campaigns').select('clicked_count').eq('id', campaign).single();
        if (c) {
          await supabase.from('marketing_campaigns').update({ clicked_count: (c.clicked_count || 0) + 1 }).eq('id', campaign);
        }
      }
    } catch (e) {
      console.error('[Track Click Error]', e);
    }
  }

  // Redireciona imediatamente o usuario para o destino final (WhatsApp)
  res.writeHead(302, { Location: targetUrl });
  res.end();
}
