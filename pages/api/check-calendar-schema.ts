import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../services/supabase';

type ResponseData = {
  message: string;
  data?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    // Try to directly query the user_calendar_tokens table
    const { data, error } = await supabase
      .from('user_calendar_tokens')
      .select('*')
      .limit(1);

    if (error) {
      // If there's an error, the table might not exist
      res.status(200).json({
        message: 'user_calendar_tokens table check failed',
        error: error.message
      });
    } else {
      // Table exists, return success message
      res.status(200).json({
        message: 'user_calendar_tokens table exists',
        data
      });
    }
  } catch (error) {
    console.error('Error checking calendar schema:', error);
    res.status(500).json({
      message: 'Error checking calendar schema',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
