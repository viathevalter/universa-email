const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqgtyxcawyjanspyvxro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3R5eGNhd3lqYW5zcHl2eHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDM4MTAsImV4cCI6MjEwMzU3OTgxMH0.otB80k2ij4EKVU5ts4XU7s6xTffi3UMkmiqOpYC-fNI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAll() {
  console.log('--- TABELAS DO SUPABASE ---');

  // Leads
  const { count: totalLeads } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log('Total leads no Supabase:', totalLeads);

  const { data: contactedLeads } = await supabase.from('leads').select('id, name, email, status').eq('status', 'contacted').limit(10);
  console.log('Leads com status "contacted":', contactedLeads);

  // Audiences
  const { data: audiences, error: audErr } = await supabase.from('saved_audiences').select('*');
  console.log('Públicos no Supabase:', audiences, audErr ? 'Erro: ' + audErr.message : '');

  // Campaigns
  const { data: campaigns } = await supabase.from('marketing_campaigns').select('*');
  console.log('Campanhas no Supabase:', campaigns);
}

checkAll();
