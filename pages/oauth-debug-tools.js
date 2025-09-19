import Head from 'next/head';
import Link from 'next/link';
import Layout from '../src/components/layout/Layout';

export default function OAuthDebugTools() {
  return (
    <Layout>
      <Head>
        <title>OAuth Debug Tools | FocusFlow</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">OAuth Debug Tools</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Basic Redirect URI Debug</h2>
            <p className="mb-4">
              Shows the basic redirect URI information and provides instructions for configuring Google OAuth.
            </p>
            <Link href="/debug-redirect" className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Open Debug Redirect
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">OAuth Environment Variables</h2>
            <p className="mb-4">
              Displays all relevant environment variables for OAuth configuration.
            </p>
            <Link href="/oauth-debug" className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Open OAuth Debug
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Advanced OAuth Debug</h2>
            <p className="mb-4">
              Comprehensive debugging tool with OAuth testing capabilities and detailed troubleshooting steps.
            </p>
            <Link href="/oauth-advanced-debug" className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Open Advanced Debug
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Direct OAuth Test</h2>
            <p className="mb-4">
              Test the OAuth flow directly, bypassing Supabase, to isolate where the issue might be.
            </p>
            <Link href="/direct-oauth-test" className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Open Direct OAuth Test
            </Link>
          </div>
        </div>
        
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Common OAuth Issues and Solutions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Error 401: invalid_client</h3>
              <p>
                This error typically means that Google doesn't recognize the client ID you're using.
                Possible solutions:
              </p>
              <ul className="list-disc ml-5 mt-2">
                <li>Verify that your client ID is correct and matches what's in Google Cloud Console</li>
                <li>Make sure you're using the correct project in Google Cloud Console</li>
                <li>Try creating a completely new OAuth client in Google Cloud Console</li>
                <li>Check if your Google Cloud project is in good standing (not suspended)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium">Redirect URI Mismatch</h3>
              <p>
                This error occurs when the redirect URI in your request doesn't match any of the authorized redirect URIs in Google Cloud Console.
                Possible solutions:
              </p>
              <ul className="list-disc ml-5 mt-2">
                <li>Add both redirect URIs to your OAuth client in Google Cloud Console:
                  <ul className="list-disc ml-5 mt-1">
                    <li>https://focus-flow-ankushthakur2007.vercel.app/api/calendar/callback</li>
                    <li>https://rgenfvgnclglsetsqnke.supabase.co/auth/v1/callback</li>
                  </ul>
                </li>
                <li>Make sure there are no spaces or special characters in your redirect URIs</li>
                <li>Verify that NEXT_PUBLIC_SITE_URL is set correctly in your environment variables</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium">Access Denied / Consent Screen Issues</h3>
              <p>
                These errors can occur if your OAuth consent screen is not properly configured.
                Possible solutions:
              </p>
              <ul className="list-disc ml-5 mt-2">
                <li>Make sure your OAuth consent screen is properly configured with the necessary scopes</li>
                <li>If your app is in "Testing" mode, add your email as a test user</li>
                <li>If you're using a Google Workspace account, check with your administrator for any restrictions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
