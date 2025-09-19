import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/services/supabase';

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
    // Try to directly query the recommendations table
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .limit(5);

    if (error) {
      // If there's an error, the table might not exist
      res.status(200).json({
        message: 'Recommendations table check failed',
        error: error.message
      });
    } else {
      // Table exists, return some sample data
      res.status(200).json({
        message: 'Recommendations table exists',
        data
      });
    }
  } catch (error) {
    console.error('Error checking schema:', error);
    res.status(500).json({
      message: 'Error checking schema',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
