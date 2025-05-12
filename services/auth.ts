import { supabase } from './supabase';
import { User, Session, AuthResponse, Provider } from '@supabase/supabase-js';

export const registerUser = async (
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // Create user profile if registration was successful
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return data;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

export const loginUser = async (
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

export const signInWithGoogle = async (): Promise<{ user: User | null; session: Session | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    return { user: null, session: null }; // This will redirect, so we return empty data
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signInWithGitHub = async (): Promise<{ user: User | null; session: Session | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    return { user: null, session: null }; // This will redirect, so we return empty data
  } catch (error) {
    console.error('Error signing in with GitHub:', error);
    throw error;
  }
};
