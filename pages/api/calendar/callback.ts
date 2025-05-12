import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../services/supabase';
import { storeCalendarTokens } from '../../../services/calendar';

// Replace these with your actual Google OAuth credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL 
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/callback` 
  : 'http://localhost:3000/api/calendar/callback';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // This should be a GET request with a code parameter
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.redirect('/login?error=auth_required');
    }

    // Exchange authorization code for tokens
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error exchanging code for tokens:', errorData);
      return res.redirect(`/calendar?error=${encodeURIComponent(JSON.stringify(errorData))}`);
    }

    const data = await response.json();
    
    // Calculate expiration time (Google tokens typically expire in 1 hour)
    const expiresAt = Date.now() + (data.expires_in * 1000);

    // Store tokens in Supabase
    await storeCalendarTokens(session.user.id, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
      token_type: data.token_type,
      scope: data.scope,
    });

    // Redirect back to the calendar page
    return res.redirect('/calendar?connected=true');
  } catch (error) {
    console.error('Error in calendar callback:', error);
    return res.redirect('/calendar?error=server_error');
  }
}
