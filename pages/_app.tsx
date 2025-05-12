import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import AuthContext from '../components/AuthContext';
import { Session, User } from '@supabase/supabase-js';

function MyApp({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    };

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthContext.Provider>
  );
}

export default MyApp;
