import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../services/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check if the user is authenticated
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      return res.status(401).json({
        message: 'Not authenticated',
        error: sessionError?.message
      });
    }
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({
        message: 'User not found',
        error: userError?.message
      });
    }
    
    console.log('Authenticated user ID:', user.id);
    
    // Apply the SQL changes to fix shared task recommendations
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql_query: `
        -- Update recommendations policy to allow viewing shared task recommendations
        DROP POLICY IF EXISTS "Users can view their own recommendations" ON recommendations;
        DROP POLICY IF EXISTS "Users can view their own and shared task recommendations" ON recommendations;
        CREATE POLICY "Users can view their own and shared task recommendations"
          ON recommendations FOR SELECT
          USING (
            auth.uid() = user_id OR
            EXISTS (
              SELECT 1 FROM task_shares
              WHERE task_shares.task_id = recommendations.task_id
              AND task_shares.shared_with_id = auth.uid()
              AND task_shares.status = 'accepted'
            )
          );
        
        -- Ensure the recommendations table has all the required columns
        ALTER TABLE recommendations 
        ADD COLUMN IF NOT EXISTS priority_level TEXT,
        ADD COLUMN IF NOT EXISTS estimated_time TEXT,
        ADD COLUMN IF NOT EXISTS steps TEXT[];
      `
    });
    
    if (sqlError) {
      console.error('Error applying SQL changes:', sqlError);
      return res.status(500).json({
        message: 'Error applying SQL changes',
        error: sqlError.message
      });
    }
    
    // Check if the policy was applied correctly
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          policyname, 
          cmd
        FROM 
          pg_policies 
        WHERE 
          tablename = 'recommendations';
      `
    });
    
    if (policiesError) {
      console.error('Error checking policies:', policiesError);
      return res.status(500).json({
        message: 'Error checking policies',
        error: policiesError.message
      });
    }
    
    // Check if there are any shared tasks with recommendations
    const { data: sharedRecommendations, error: sharedError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          r.id as recommendation_id,
          r.task_id,
          r.user_id as recommendation_owner_id,
          ts.shared_with_id,
          ts.permission_level,
          ts.status as share_status
        FROM 
          recommendations r
        JOIN 
          task_shares ts ON r.task_id = ts.task_id
        WHERE 
          ts.status = 'accepted';
      `
    });
    
    if (sharedError) {
      console.error('Error checking shared recommendations:', sharedError);
      return res.status(500).json({
        message: 'Error checking shared recommendations',
        error: sharedError.message
      });
    }
    
    res.status(200).json({ 
      message: 'Successfully fixed shared task recommendations',
      policies,
      sharedRecommendations
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
}
