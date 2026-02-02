/**
 * User Profile Repository
 * Database operations for user profiles
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// Simplified types to avoid complex generic issues
export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  pan_hash: string | null;
  assessee_type: 'individual' | 'huf';
  preferred_regime: 'new' | 'old' | null;
  created_at: string;
  updated_at: string;
}

interface UserProfileInsert {
  id: string;
  email?: string | null;
  name?: string | null;
  pan_hash?: string | null;
  assessee_type?: 'individual' | 'huf';
  preferred_regime?: 'new' | 'old' | null;
}

type UserProfileUpdate = Partial<UserProfileInsert>;

export class UserRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get user profile by ID
   */
  async getById(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  }

  /**
   * Create user profile
   */
  async create(profile: UserProfileInsert): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update user profile
   */
  async update(userId: string, updates: UserProfileUpdate): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get or create user profile
   */
  async getOrCreate(userId: string, email?: string): Promise<UserProfile> {
    const existing = await this.getById(userId);
    if (existing) return existing;

    return this.create({ id: userId, email });
  }

  /**
   * Update assessee type
   */
  async setAssesseeType(
    userId: string,
    assesseeType: 'individual' | 'huf'
  ): Promise<UserProfile> {
    return this.update(userId, { assessee_type: assesseeType });
  }

  /**
   * Update preferred regime
   */
  async setPreferredRegime(
    userId: string,
    regime: 'new' | 'old'
  ): Promise<UserProfile> {
    return this.update(userId, { preferred_regime: regime });
  }
}
