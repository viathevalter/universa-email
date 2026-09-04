const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqgtyxcawyjanspyvxro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3R5eGNhd3lqYW5zcHl2eHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDM4MTAsImV4cCI6MjEwMzU3OTgxMH0.otB80k2ij4EKVU5ts4XU7s6xTffi3UMkmiqOpYC-fNI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- MARKETING TEMPLATES NO SUPABASE ---');
  const { data: templates, error: tmplErr } = await supabase.from('marketing_templates').select('id, title, subject');
  if (tmplErr) console.error('Erro templates:', tmplErr);
  else console.log('Templates encontrados:', templates);

  console.log('\n--- MARKETING CAMPAIGNS NO SUPABASE ---');
  const { data: campaigns, error: campErr } = await supabase.from('marketing_campaigns').select('id, title, status, sent_count, total_recipients');
  if (campErr) console.error('Erro campanhas:', campErr);
  else console.log('Campanhas encontradas:', campaigns);
}

main();
