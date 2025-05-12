import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rgenfvgnclglsetsqnke.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZW5mdmduY2xnbHNldHNxbmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMjk3OTgsImV4cCI6MjA2MjYwNTc5OH0.YAJnf-oLX9np9J0aO1gK5OdGPcnKk0AzPgjM62u7dwU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth methods
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
};

// Database methods
export const getTasks = async () => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const getTasksByStatus = async (status: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const createTask = async (
  title: string,
  priority: string,
  category: string
) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        title,
        priority,
        category,
        status: 'pending',
      },
    ])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateTaskStatus = async (taskId: string, status: string) => {
  const { error } = await supabase
    .from('tasks')
    .update({ 
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);
  
  if (error) throw error;
};

export const deleteTask = async (taskId: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) throw error;
};

export const getMoods = async () => {
  const { data, error } = await supabase
    .from('moods')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(20);
  
  if (error) throw error;
  return data;
};

export const logMood = async (name: string, emoji: string) => {
  const { data, error } = await supabase
    .from('moods')
    .insert([
      {
        name,
        emoji,
        timestamp: new Date().toISOString(),
      },
    ])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getUserProfile = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

export const updateUserProfile = async (name: string, darkMode: boolean) => {
  const { error } = await supabase.from('profiles').upsert({
    name,
    dark_mode: darkMode,
    updated_at: new Date().toISOString(),
  });
  
  if (error) throw error;
};

// Realtime subscriptions
export const subscribeToTasks = (callback: (payload: any) => void) => {
  return supabase
    .channel('public:tasks')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      callback
    )
    .subscribe();
};

export const subscribeToMoods = (callback: (payload: any) => void) => {
  return supabase
    .channel('public:moods')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'moods' },
      callback
    )
    .subscribe();
};
