import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';

export default function DebugRedirect() {
  const [redirectUri, setRedirectUri] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [clientId, setClientId] = useState('');
  
  useEffect(() => {
    // Get the values
    const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const REDIRECT_URI = NEXT_PUBLIC_SITE_URL 
      ? `${NEXT_PUBLIC_SITE_URL}/api/calendar/callback` 
      : `${window.location.origin}/api/calendar/callback`;
    
    setSiteUrl(NEXT_PUBLIC_SITE_URL);
    setRedirectUri(REDIRECT_URI);
    setClientId(GOOGLE_CLIENT_ID);
    
    // Log to console
    console.log('NEXT_PUBLIC_SITE_URL:', NEXT_PUBLIC_SITE_URL);
    console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);
    console.log('Redirect URI:', REDIRECT_URI);
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
            <p className="font-medium">GOOGLE_CLIENT_ID:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{clientId || 'Not set'}</pre>
          </div>
          
          <div className="mb-4">
            <p className="font-medium">Redirect URI:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{redirectUri}</pre>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="font-medium text-yellow-800">Instructions:</p>
            <ol className="list-decimal ml-5 mt-2 text-yellow-800">
              <li>Copy the exact Redirect URI shown above</li>
              <li>Go to your Google Cloud Console</li>
              <li>Navigate to APIs &amp; Services &gt; Credentials</li>
              <li>Edit your OAuth 2.0 Client ID</li>
              <li>Add this exact URI to the "Authorized redirect URIs" section</li>
              <li>Save your changes</li>
              <li>Try connecting to Google Calendar again</li>
            </ol>
          </div>
        </div>
      </div>
    </Layout>
  );
}
