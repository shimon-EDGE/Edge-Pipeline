export type Account = {
  id: string;
  org_name: string;
  website: string | null;
  us_israel_complexity: number;
  content_intensity: number;
  fragmentation_risk: number;
  org_size: number;
  signal_strength: number;
  edge_score: number;
  priority_tier: 'A' | 'B' | 'C';
  fragmentation_notes: string | null;
  source: 'linkedin' | 'referral' | 'research' | 'other';
  status: 'researching' | 'qualified' | 'active' | 'paused' | 'closed_won' | 'closed_lost';
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  account_id: string;
  full_name: string;
  title: string | null;
  linkedin_url: string | null;
  email: string | null;
  role_type: 'decision_maker' | 'influencer' | 'gatekeeper' | 'champion';
  influence_level: number;
  outreach_ready: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  contact_id: string;
  sequence_position: number;
  message_body: string;
  status: 'drafted' | 'approved' | 'sent' | 'replied' | 'no_response';
  generated_at: string;
  approved_at: string | null;
  sent_at: string | null;
  follow_up_due: string | null;
  generation_context: Record<string, any> | null;
  created_at: string;
};

export type PipelineActivity = {
  id: string;
  account_id: string;
  contact_id: string | null;
  action: string;
  notes: string | null;
  created_at: string;
};

export type OutreachQueueItem = {
  message_id: string;
  org_name: string;
  edge_score: number;
  priority_tier: string;
  full_name: string;
  title: string | null;
  linkedin_url: string | null;
  sequence_position: number;
  message_body: string;
  message_status: string;
  follow_up_due: string | null;
};
