import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 检查环境变量是否存在，如果不存在则创建一个模拟客户端
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Auth helpers
export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signUp = async (email: string, password: string) => {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  if (!supabase) {
    return { error: { message: 'Supabase not configured' } };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
};