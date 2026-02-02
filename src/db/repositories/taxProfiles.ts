/**
 * Tax Profile Repository
 * Database operations for user tax profiles
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IncomeHeads, DeductionsInput, PresumptiveBusiness } from '../../types';

// Simplified types
export interface TaxProfile {
  id: string;
  user_id: string;
  assessment_year: string;
  income_heads: Record<string, number>;
  deductions: Record<string, number>;
  presumptive_business: Record<string, unknown> | null;
  regime_preference: 'new' | 'old' | null;
  created_at: string;
  updated_at: string;
}

interface TaxProfileInsert {
  id?: string;
  user_id: string;
  assessment_year: string;
  income_heads?: Record<string, number>;
  deductions?: Record<string, number>;
  presumptive_business?: Record<string, unknown> | null;
  regime_preference?: 'new' | 'old' | null;
}

type TaxProfileUpdate = Partial<TaxProfileInsert>;

export class TaxProfileRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get tax profile by ID
   */
  async getById(profileId: string): Promise<TaxProfile | null> {
    const { data, error } = await this.supabase
      .from('tax_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  /**
   * Get user's tax profile for assessment year
   */
  async getByUserAndYear(
    userId: string,
    assessmentYear: string
  ): Promise<TaxProfile | null> {
    const { data, error } = await this.supabase
      .from('tax_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_year', assessmentYear)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  /**
   * Get all tax profiles for user
   */
  async getUserProfiles(userId: string): Promise<TaxProfile[]> {
    const { data, error } = await this.supabase
      .from('tax_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('assessment_year', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create tax profile
   */
  async create(profile: TaxProfileInsert): Promise<TaxProfile> {
    const { data, error } = await this.supabase
      .from('tax_profiles')
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update tax profile
   */
  async update(profileId: string, updates: TaxProfileUpdate): Promise<TaxProfile> {
    const { data, error } = await this.supabase
      .from('tax_profiles')
      .update(updates)
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get or create tax profile for user and year
   */
  async getOrCreate(
    userId: string,
    assessmentYear: string = '2025-26'
  ): Promise<TaxProfile> {
    const existing = await this.getByUserAndYear(userId, assessmentYear);
    if (existing) return existing;

    return this.create({ user_id: userId, assessment_year: assessmentYear });
  }

  /**
   * Update income heads
   */
  async updateIncomeHeads(
    profileId: string,
    incomeHeads: Partial<IncomeHeads>
  ): Promise<TaxProfile> {
    const existing = await this.getById(profileId);
    if (!existing) throw new Error('Profile not found');

    const merged = {
      ...(existing.income_heads || {}),
      ...incomeHeads,
    };

    return this.update(profileId, { income_heads: merged });
  }

  /**
   * Update deductions
   */
  async updateDeductions(
    profileId: string,
    deductions: Partial<DeductionsInput>
  ): Promise<TaxProfile> {
    const existing = await this.getById(profileId);
    if (!existing) throw new Error('Profile not found');

    const merged = {
      ...(existing.deductions || {}),
      ...deductions,
    };

    return this.update(profileId, { deductions: merged });
  }

  /**
   * Update presumptive business
   */
  async updatePresumptiveBusiness(
    profileId: string,
    presumptiveBusiness: PresumptiveBusiness
  ): Promise<TaxProfile> {
    return this.update(profileId, {
      presumptive_business: presumptiveBusiness as Record<string, unknown>,
    });
  }

  /**
   * Set regime preference
   */
  async setRegimePreference(
    profileId: string,
    regime: 'new' | 'old'
  ): Promise<TaxProfile> {
    return this.update(profileId, { regime_preference: regime });
  }

  /**
   * Delete tax profile
   */
  async delete(profileId: string): Promise<void> {
    const { error } = await this.supabase
      .from('tax_profiles')
      .delete()
      .eq('id', profileId);

    if (error) throw error;
  }

  /**
   * Convert database profile to calculation input
   */
  toCalculationInput(profile: TaxProfile): {
    incomeHeads: IncomeHeads;
    deductions: DeductionsInput;
    presumptiveBusiness?: PresumptiveBusiness;
  } {
    const defaultIncomeHeads: IncomeHeads = {
      salary: 0,
      houseProperty: 0,
      business: 0,
      capitalGainsOther: 0,
      otherSources: 0,
      vda: 0,
      stcgListedEquity: 0,
      ltcgListedEquity: 0,
    };

    return {
      incomeHeads: { ...defaultIncomeHeads, ...(profile.income_heads as Partial<IncomeHeads>) },
      deductions: (profile.deductions as DeductionsInput) || {},
      presumptiveBusiness: profile.presumptive_business as PresumptiveBusiness | undefined,
    };
  }
}
