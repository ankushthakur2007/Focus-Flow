import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../services/supabase';

// Replace these with your actual Google OAuth credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the refresh token from the request body
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Exchange refresh token for new access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error refreshing token:', errorData);
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    
    // Calculate expiration time (Google tokens typically expire in 1 hour)
    const expiresAt = Date.now() + (data.expires_in * 1000);

    // Return the new tokens
    return res.status(200).json({
      access_token: data.access_token,
      refresh_token: data.refresh_token || refresh_token, // Use the new refresh token if provided, otherwise keep the old one
      expires_at: expiresAt,
      token_type: data.token_type,
      scope: data.scope,
    });
  } catch (error) {
    console.error('Error in refresh-token API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
