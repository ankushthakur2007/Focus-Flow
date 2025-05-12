import { useEffect, useState } from 'react';

export default function OAuthDebug() {
  const [envVars, setEnvVars] = useState({});
  
  useEffect(() => {
    // Collect all relevant environment variables
    setEnvVars({
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'Not set',
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'Not set',
      redirectUri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/callback` || 'Cannot construct',
    });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>OAuth Debug Information</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Environment Variables</h2>
        <pre style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
          {JSON.stringify(envVars, null, 2)}
        </pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Browser Information</h2>
        <pre style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
          User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent : 'Not available in SSR'}
        </pre>
      </div>
      
      <div>
        <h2>Instructions</h2>
        <ol>
          <li>Check that NEXT_PUBLIC_GOOGLE_CLIENT_ID matches exactly with your Google Cloud Console</li>
          <li>Verify that the redirectUri matches what you've configured in Google Cloud Console</li>
          <li>Make sure there are no spaces or special characters in these values</li>
        </ol>
      </div>
    </div>
  );
}
