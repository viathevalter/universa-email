// ============================================================================
// SaaS Core Types: Multi-tenant, Leads, AI Prospecting, Campaigns & Resend
// ============================================================================

export type LeadStatus = 'new' | 'qualified' | 'contacted' | 'replied' | 'converted' | 'unqualified';
export type CompanySize = 'Tier 1 (Enterprise)' | 'Tier 2 (Mid-Market)' | 'Tier 3 (SMB / Small)';
export type ProspectingJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ProspectingResultStatus = 'raw' | 'imported' | 'discarded';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' | 'failed';
export type QueueItemStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'bounced' | 'complained';

export interface Tenant {
  id: string;
  name: string;
  trade_name?: string;
  resend_api_key?: string;
  marketing_sender_email?: string;
  sender_name?: string;
  gemini_api_key?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  company_name: string;
  email: string;
  phone?: string;
  website?: string;
  sector?: string;
  role?: string;
  company_size?: CompanySize | string;
  city?: string;
  province?: string;
  country?: string;
  tags: string[];
  notes?: string;
  status: LeadStatus;
  opted_out: boolean;
  mx_valid?: boolean;
  mx_record?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadProspectingJob {
  id: string;
  tenant_id: string;
  title: string;
  keywords: string;
  location: string;
  sector_filter?: string;
  target_count: number;
  processed_count: number;
  found_emails_count: number;
  status: ProspectingJobStatus;
  created_at: string;
}

export interface LeadProspectingResult {
  id: string;
  job_id: string;
  tenant_id: string;
  company_name: string;
  contact_name?: string;
  role?: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  sector?: string;
  company_size?: CompanySize | string;
  confidence_score: number;
  mx_status?: 'valid' | 'invalid' | 'checking' | 'unknown';
  mx_host?: string;
  domain_active?: boolean;
  status: ProspectingResultStatus;
  raw_reasoning?: string;
}

export interface MarketingTemplate {
  id: string;
  tenant_id: string;
  title: string;
  subject: string;
  html_content: string;
  preview_text?: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaign {
  id: string;
  tenant_id: string;
  template_id: string;
  title: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  reply_to?: string;
  target_audience_id?: string;
  status: CampaignStatus;
  scheduled_at?: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  failed_count: number;
  rate_limit_per_second: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaignQueue {
  id: string;
  campaign_id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  company_name: string;
  status: QueueItemStatus;
  resend_email_id?: string;
  sent_at?: string;
  error_message?: string;
  opened_at?: string;
  clicked_at?: string;
  created_at: string;
}

export interface SavedAudience {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  filters: {
    status?: LeadStatus[];
    company_size?: string[];
    sector?: string[];
    country?: string[];
    province?: string[];
    tags?: string[];
    mx_valid_only?: boolean;
    exclude_opted_out?: boolean;
    search_query?: string;
  };
  lead_count?: number;
  created_at: string;
}

export interface DnsVerificationResult {
  domain: string;
  hasMx: boolean;
  mxRecords: string[];
  hasARecord: boolean;
  isDisposable: boolean;
  isSyntaxValid: boolean;
  score: number;
  provider?: string;
  details?: string;
}

export interface ResendDomainStatus {
  id: string;
  name: string;
  status: 'not_started' | 'pending' | 'verified' | 'failed';
  region: string;
  dns_records: {
    record: 'SPF' | 'DKIM' | 'DMARC' | 'MX';
    name: string;
    type: string;
    value: string;
    status: 'pending' | 'verified' | 'failed';
  }[];
}
