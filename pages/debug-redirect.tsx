import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../src/components/layout/Layout';

export default function DebugRedirect() {
  const [redirectUri, setRedirectUri] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [supabaseRedirectUri, setSupabaseRedirectUri] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    // Get the values
    const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const REDIRECT_URI = NEXT_PUBLIC_SITE_URL
      ? `${NEXT_PUBLIC_SITE_URL}/api/calendar/callback`
      : `${window.location.origin}/api/calendar/callback`;
    const SUPABASE_REDIRECT_URI = 'https://rgenfvgnclglsetsqnke.supabase.co/auth/v1/callback';

    setSiteUrl(NEXT_PUBLIC_SITE_URL);
    setRedirectUri(REDIRECT_URI);
    setClientId(GOOGLE_CLIENT_ID);
    setSupabaseRedirectUri(SUPABASE_REDIRECT_URI);
    setOrigin(window.location.origin);

    // Log to console
    console.log('NEXT_PUBLIC_SITE_URL:', NEXT_PUBLIC_SITE_URL);
    console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);
    console.log('Redirect URI:', REDIRECT_URI);
    console.log('Supabase Redirect URI:', SUPABASE_REDIRECT_URI);
    console.log('Window Origin:', window.location.origin);
  }, []);

  return (
    <Layout>
      <Head>
        <title>Debug Redirect URI | FocusFlow</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Debug Redirect URI</h1>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Redirect URI Information</h2>

          <div className="mb-4">
            <p className="font-medium">NEXT_PUBLIC_SITE_URL:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{siteUrl || 'Not set'}</pre>
          </div>

          <div className="mb-4">
            <p className="font-medium">Redirect URI:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{redirectUri}</pre>
          </div>

          <div className="mb-4">
            <p className="font-medium">Google Client ID:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{clientId || 'Not set'}</pre>
          </div>

          <div className="mb-4">
            <p className="font-medium">Supabase Redirect URI:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{supabaseRedirectUri}</pre>
          </div>

          <div className="mb-4">
            <p className="font-medium">Window Origin:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{origin}</pre>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="font-medium text-yellow-800">Instructions:</p>
            <ol className="list-decimal ml-5 mt-2 text-yellow-800">
              <li>Copy <strong>both</strong> Redirect URIs shown above (the calendar callback and the Supabase callback)</li>
              <li>Go to your Google Cloud Console</li>
              <li>Navigate to APIs &amp; Services &gt; Credentials</li>
              <li>Edit your OAuth 2.0 Client ID</li>
              <li>Add <strong>both</strong> URIs to the "Authorized redirect URIs" section</li>
              <li>Make sure there are no spaces before or after the URIs</li>
              <li>Verify that the Client ID shown above matches the one in Google Cloud Console</li>
              <li>Save your changes</li>
              <li>Try connecting to Google Calendar again</li>
              <li>If issues persist, try creating a completely new OAuth client in Google Cloud Console</li>
            </ol>
          </div>
        </div>
      </div>
    </Layout>
  );
}
