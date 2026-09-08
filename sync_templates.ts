import { createClient } from '@supabase/supabase-js';
import { OFFICIAL_UNIVERSA_TEMPLATES } from './src/shared/constants/templatesData.ts';

const supabaseUrl = 'https://yqgtyxcawyjanspyvxro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3R5eGNhd3lqYW5zcHl2eHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDM4MTAsImV4cCI6MjEwMzU3OTgxMH0.otB80k2ij4EKVU5ts4XU7s6xTffi3UMkmiqOpYC-fNI';

const supabase = createClient(supabaseUrl, supabaseKey);
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function syncTemplates() {
  console.log(`Sincronizando ${OFFICIAL_UNIVERSA_TEMPLATES.length} templates oficiais com o Supabase...`);
  
  for (const tmpl of OFFICIAL_UNIVERSA_TEMPLATES) {
    const payload = {
      tenant_id: TENANT_ID,
      title: tmpl.title,
      subject: tmpl.subject,
      html_content: tmpl.html_content,
      preview_text: tmpl.subject.slice(0, 100),
      variables: tmpl.variables,
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase
      .from('marketing_templates')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('title', tmpl.title)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Atualizando template: ${tmpl.title}`);
      await supabase.from('marketing_templates').update(payload).eq('id', existing[0].id);
    } else {
      console.log(`Inserindo novo template: ${tmpl.title}`);
      const { error: insErr } = await supabase.from('marketing_templates').insert({
        ...payload,
        created_at: new Date().toISOString()
      });
      if (insErr) console.error(`Erro inserindo ${tmpl.title}:`, insErr.message);
    }
  }

  const { data: allTemplates } = await supabase.from('marketing_templates').select('id, title');
  console.log(`\nTotal de templates no banco: ${allTemplates ? allTemplates.length : 0}`);
  if (allTemplates) console.log(allTemplates.map(t => t.title));
}

syncTemplates();
