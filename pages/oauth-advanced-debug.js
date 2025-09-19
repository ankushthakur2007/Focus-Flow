import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '../src/components/layout/Layout';

export default function OAuthAdvancedDebug() {
  const [debugInfo, setDebugInfo] = useState({
    clientId: '',
    redirectUris: [],
    siteUrl: '',
    windowOrigin: '',
    supabaseUrl: '',
    userAgent: '',
    timestamp: '',
  });
  
  const [testResult, setTestResult] = useState({
    status: 'pending',
    message: 'Click "Test OAuth Configuration" to check your setup',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Collect all relevant environment variables and browser info
      setDebugInfo({
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'Not set',
        redirectUris: [
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/callback` || 'Cannot construct',
          'https://rgenfvgnclglsetsqnke.supabase.co/auth/v1/callback',
        ],
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'Not set',
        windowOrigin: window.location.origin,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
        userAgent: window.navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  const testOAuthConfig = async () => {
    setTestResult({
      status: 'testing',
      message: 'Testing OAuth configuration...',
    });

    try {
      // Construct a minimal OAuth URL to test if the client ID is valid
      const testUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${debugInfo.clientId}&redirect_uri=${encodeURIComponent(debugInfo.redirectUris[0])}&response_type=code&scope=email&access_type=offline&prompt=consent`;
      
      // Open in a new window to avoid navigating away from this page
      const testWindow = window.open(testUrl, '_blank', 'width=600,height=600');
      
      // Set a timeout to check if the window was blocked by a popup blocker
      setTimeout(() => {
        if (!testWindow || testWindow.closed || testWindow.closed === undefined) {
          setTestResult({
            status: 'warning',
            message: 'Popup was blocked. Please allow popups and try again.',
          });
        } else {
          setTestResult({
            status: 'info',
            message: 'Test window opened. If you see a Google login screen, your client ID is valid. If you see an error, check the error message for details.',
          });
        }
      }, 1000);
    } catch (error) {
      setTestResult({
        status: 'error',
        message: `Error testing OAuth: ${error.message}`,
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <Layout>
      <Head>
        <title>Advanced OAuth Debug | FocusFlow</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Advanced OAuth Debug</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">OAuth Configuration</h2>
          
          <div className="mb-4">
            <p className="font-medium">Google Client ID:</p>
            <div className="flex items-center">
              <pre className="bg-gray-100 p-2 rounded mt-1 flex-grow">{debugInfo.clientId}</pre>
              <button 
                onClick={() => copyToClipboard(debugInfo.clientId)}
                className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Copy
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="font-medium">Redirect URIs:</p>
            {debugInfo.redirectUris.map((uri, index) => (
              <div key={index} className="flex items-center mt-2">
                <pre className="bg-gray-100 p-2 rounded flex-grow">{uri}</pre>
                <button 
                  onClick={() => copyToClipboard(uri)}
                  className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
          
          <div className="mb-4">
            <p className="font-medium">NEXT_PUBLIC_SITE_URL:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{debugInfo.siteUrl}</pre>
          </div>
          
          <div className="mb-4">
            <p className="font-medium">Window Origin:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{debugInfo.windowOrigin}</pre>
          </div>
          
          <div className="mb-4">
            <p className="font-medium">Supabase URL:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{debugInfo.supabaseUrl}</pre>
          </div>
          
          <div className="mb-4">
            <p className="font-medium">User Agent:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{debugInfo.userAgent}</pre>
          </div>
          
          <div className="mb-4">
            <p className="font-medium">Timestamp:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1">{debugInfo.timestamp}</pre>
          </div>
          
          <div className="mt-6">
            <button 
              onClick={testOAuthConfig}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test OAuth Configuration
            </button>
            
            <div className={`mt-4 p-3 rounded ${
              testResult.status === 'error' ? 'bg-red-100 text-red-800' :
              testResult.status === 'success' ? 'bg-green-100 text-green-800' :
              testResult.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {testResult.message}
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting Steps</h2>
          
          <ol className="list-decimal ml-5 space-y-3">
            <li>Verify that your Google Client ID is correct and matches what's in Google Cloud Console.</li>
            <li>Make sure <strong>both</strong> redirect URIs are added to your OAuth client in Google Cloud Console.</li>
            <li>Check that there are no spaces or special characters in your redirect URIs.</li>
            <li>Ensure the Google Calendar API is enabled in your Google Cloud project.</li>
            <li>Verify that your OAuth consent screen is properly configured with the necessary scopes.</li>
            <li>Try creating a completely new OAuth client in Google Cloud Console.</li>
            <li>Clear your browser cache and cookies, especially for accounts.google.com.</li>
            <li>Try using an incognito/private browsing window.</li>
            <li>Check if your Google account is part of an organization that might have restrictions on OAuth.</li>
            <li>Make sure your project is not in a restricted state in Google Cloud Console.</li>
          </ol>
        </div>
      </div>
    </Layout>
  );
}
