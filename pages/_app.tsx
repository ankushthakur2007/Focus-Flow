import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import AuthContext from '../components/AuthContext';
import { ThemeProvider } from '../components/ThemeContext';
import { Session, User } from '@supabase/supabase-js';
import Head from 'next/head';
import ErrorBoundary from '../components/ErrorBoundary';

function MyApp({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Function to refresh the session
  const refreshSession = useCallback(async () => {
    try {
      console.log('Refreshing session...');
      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error refreshing session:', error);
        setAuthError(error.message);
        return;
      }

      if (!data.session) {
        console.log('No active session found during refresh');
        setSession(null);
        setUser(null);
      } else {
        console.log('Session refreshed successfully');
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (err) {
      console.error('Unexpected error refreshing session:', err);
      setAuthError('Failed to refresh session');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...');
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setAuthError(error.message);
          setLoading(false);
          return;
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);

        if (data.session) {
          console.log('User authenticated:', data.session.user.id);
          console.log('Session expires at:', new Date(data.session.expires_at! * 1000).toISOString());
        } else {
          console.log('No active session found');
        }

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('Auth state changed:', event);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            if (event === 'SIGNED_OUT') {
              console.log('User signed out');
            } else if (event === 'SIGNED_IN') {
              console.log('User signed in:', session?.user.id);
            } else if (event === 'TOKEN_REFRESHED') {
              console.log('Token refreshed');
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Unexpected error during auth initialization:', err);
        setAuthError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, session, loading, refreshSession, authError }}>
        <ThemeProvider user={user}>
          <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <meta name="theme-color" content="#0073ff" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          </Head>
          <Layout>
            {authError && !loading && (
              <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 m-4 rounded-md">
                <h3 className="font-bold mb-2">Authentication Error</h3>
                <p>{authError}</p>
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={refreshSession}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md"
                  >
                    Refresh Session
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            )}
            <Component {...pageProps} />
          </Layout>
        </ThemeProvider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}

export default MyApp;
