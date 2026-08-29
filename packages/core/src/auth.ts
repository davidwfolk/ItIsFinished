import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

/**
 * Authentication helper wrapping Supabase Auth operations.
 */
export class AuthManager {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getCurrentSession() {
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (error) throw error;
    return session;
  }

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async signUpWithEmail(email: string, password: string, displayName?: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
        },
      },
    });
    if (error) throw error;
    return data;
  }

  async sendMagicLink(email: string, redirectTo?: string) {
    const origin = typeof globalThis !== 'undefined' && 'location' in globalThis ? (globalThis as any).location?.origin : undefined;
    const { data, error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || origin,
      },
    });
    if (error) throw error;
    return data;
  }

  async signInWithOAuth(provider: 'google' | 'apple' | 'github', redirectTo?: string) {
    const origin = typeof globalThis !== 'undefined' && 'location' in globalThis ? (globalThis as any).location?.origin : undefined;
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || origin,
      },
    });
    if (error) throw error;
    return data;
  }

  async resetPasswordForEmail(email: string, redirectTo?: string) {
    const origin = typeof globalThis !== 'undefined' && 'location' in globalThis ? (globalThis as any).location?.origin : undefined;
    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || (origin ? `${origin}/reset-password` : undefined),
    });
    if (error) throw error;
    return data;
  }

  async updateUserPassword(password: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password,
    });
    if (error) throw error;
    return data;
  }

  // --- Multi-Factor Authentication (MFA / TOTP) ---

  async enrollMfa(factorType: 'totp' = 'totp', friendlyName: string = 'Finished Authenticator') {
    const { data, error } = await this.supabase.auth.mfa.enroll({
      factorType,
      friendlyName,
      issuer: 'Finished',
    });
    if (error) throw error;
    return data;
  }

  async challengeMfa(factorId: string) {
    const { data, error } = await this.supabase.auth.mfa.challenge({
      factorId,
    });
    if (error) throw error;
    return data;
  }

  async verifyMfa(factorId: string, challengeId: string, code: string) {
    const { data, error } = await this.supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });
    if (error) throw error;
    return data;
  }

  async listMfaFactors() {
    const { data, error } = await this.supabase.auth.mfa.listFactors();
    if (error) throw error;
    return data;
  }

  async unenrollMfa(factorId: string) {
    const { data, error } = await this.supabase.auth.mfa.unenroll({
      factorId,
    });
    if (error) throw error;
    return data;
  }

  async getAssuranceLevel() {
    const { data, error } = await this.supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }
}
