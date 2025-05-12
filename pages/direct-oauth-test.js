import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';

export default function DirectOAuthTest() {
  const [clientId, setClientId] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [customClientId, setCustomClientId] = useState('');
  
  useEffect(() => {
    // Get the values from environment variables
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/callback` 
      : `${window.location.origin}/api/calendar/callback`;
    
    setClientId(GOOGLE_CLIENT_ID);
    setRedirectUri(REDIRECT_URI);
    setCustomClientId(GOOGLE_CLIENT_ID);
  }, []);
  
  const handleDirectOAuth = () => {
    // Use the custom client ID if provided, otherwise use the one from env vars
    const finalClientId = customClientId || clientId;
    
    // Construct the OAuth URL
    const SCOPES = encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events');
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${finalClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${SCOPES}&access_type=offline&prompt=consent`;
    
    // Open in the same window
    window.location.href = oauthUrl;
  };
  
  const handleSupabaseOAuth = async () => {
    try {
      // Import the supabase client
      const { supabase } = await import('../services/supabase');
      
      // Use Supabase's OAuth flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
        },
      });
      
      if (error) {
        console.error('Supabase OAuth error:', error);
        alert(`Supabase OAuth error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error initiating Supabase OAuth:', error);
      alert(`Error initiating Supabase OAuth: ${error.message}`);
    }
  };
  
  return (
    <Layout>
      <Head>
        <title>Direct OAuth Test | FocusFlow</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Direct OAuth Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Direct OAuth Flow</h2>
          
          <div className="mb-4">
            <label className="block font-medium mb-1">Client ID:</label>
            <input 
              type="text" 
              value={customClientId} 
              onChange={(e) => setCustomClientId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter Google Client ID"
            />
            <p className="text-sm text-gray-500 mt-1">
              Default from env: {clientId || 'Not set'}
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block font-medium mb-1">Redirect URI:</label>
            <input 
              type="text" 
              value={redirectUri} 
              disabled
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          
          <div className="flex space-x-4 mt-6">
            <button 
              onClick={handleDirectOAuth}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Test Direct OAuth
            </button>
            
            <button 
              onClick={handleSupabaseOAuth}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test Supabase OAuth
            </button>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">How This Works</h2>
          
          <div className="space-y-4">
            <p>
              This page provides two ways to test the Google OAuth flow:
            </p>
            
            <div>
              <h3 className="font-medium">1. Direct OAuth:</h3>
              <p>
                This method directly constructs the Google OAuth URL and redirects to it.
                It bypasses Supabase and directly uses the Google OAuth flow.
                This helps isolate whether the issue is with Google OAuth configuration or with Supabase.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium">2. Supabase OAuth:</h3>
              <p>
                This method uses Supabase's built-in OAuth flow.
                It's the same method used in your application's login page.
                This tests the complete flow as it would work in your application.
              </p>
            </div>
            
            <p>
              If the Direct OAuth works but Supabase OAuth doesn't, the issue is likely with your Supabase configuration.
              If neither works, the issue is likely with your Google OAuth client configuration.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
