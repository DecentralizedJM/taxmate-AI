/**
 * Supabase Client
 * Database and authentication client for TaxMate AI
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          pan_hash: string | null;
          assessee_type: 'individual' | 'huf';
          preferred_regime: 'new' | 'old' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string | null;
          pan_hash?: string | null;
          assessee_type?: 'individual' | 'huf';
          preferred_regime?: 'new' | 'old' | null;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      tax_profiles: {
        Row: {
          id: string;
          user_id: string;
          assessment_year: string;
          income_heads: Record<string, number>;
          deductions: Record<string, number>;
          presumptive_business: Record<string, unknown> | null;
          regime_preference: 'new' | 'old' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assessment_year: string;
          income_heads?: Record<string, number>;
          deductions?: Record<string, number>;
          presumptive_business?: Record<string, unknown> | null;
          regime_preference?: 'new' | 'old' | null;
        };
        Update: Partial<Database['public']['Tables']['tax_profiles']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          assessment_year: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          assessment_year?: string;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'tool' | 'system';
          content: string;
          tool_calls: unknown[] | null;
          tool_results: unknown[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'tool' | 'system';
          content: string;
          tool_calls?: unknown[] | null;
          tool_results?: unknown[] | null;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          type: 'form16' | 'ais' | 'investment_proof' | 'rent_receipt' | 'other' | null;
          file_name: string | null;
          file_path: string | null;
          assessment_year: string | null;
          extracted_data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: 'form16' | 'ais' | 'investment_proof' | 'rent_receipt' | 'other' | null;
          file_name?: string | null;
          file_path?: string | null;
          assessment_year?: string | null;
          extracted_data?: Record<string, unknown> | null;
        };
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
      };
    };
  };
}

let supabaseClient: SupabaseClient<Database> | null = null;
let supabaseAdminClient: SupabaseClient<Database> | null = null;

/**
 * Get Supabase client for client-side use (with anon key)
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

  supabaseClient = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false, // Server-side doesn't persist
    },
  });

  return supabaseClient;
}

/**
 * Get Supabase admin client (with service key, bypasses RLS)
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (supabaseAdminClient) return supabaseAdminClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
  }

  supabaseAdminClient = createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdminClient;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

/**
 * Create a Supabase client with user's JWT token
 */
export function createAuthenticatedClient(jwt: string): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

  return createClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}
