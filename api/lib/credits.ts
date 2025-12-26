import { createClient } from '@supabase/supabase-js';

export type CreditsRow = {
  id: string;
  email: string;
  free_used_at: string | null;
  credits_remaining: number;
  total_purchased: number;
  last_purchase_at: string | null;
  created_at: string;
  updated_at: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getOrCreateCreditsByEmail(email: string) {
  if (!supabase) {
    throw new Error('Supabase not configured for credits.');
  }

  const normalized = normalizeEmail(email);
  const { data, error } = await supabase.from('credits').select('*').eq('email', normalized).maybeSingle();
  if (error) {
    throw new Error(`Credits lookup failed: ${error.message}`);
  }
  if (data) {
    return data as CreditsRow;
  }

  const { data: created, error: insertError } = await supabase
    .from('credits')
    .insert({ email: normalized })
    .select('*')
    .single();

  if (insertError || !created) {
    throw new Error(`Credits insert failed: ${insertError?.message ?? 'Unknown error'}`);
  }

  return created as CreditsRow;
}

export async function updateCreditsByEmail(email: string, updates: Partial<CreditsRow>) {
  if (!supabase) {
    throw new Error('Supabase not configured for credits.');
  }

  const normalized = normalizeEmail(email);
  const { data, error } = await supabase
    .from('credits')
    .update(updates)
    .eq('email', normalized)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Credits update failed: ${error.message}`);
  }

  return data as CreditsRow;
}
