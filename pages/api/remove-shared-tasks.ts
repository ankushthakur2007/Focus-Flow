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
    
    // 1. First, get all task shares for this user (both as owner and shared with)
    const { data: ownerShares, error: ownerSharesError } = await supabase
      .from('task_shares')
      .select('id, task_id, owner_id, shared_with_id')
      .eq('owner_id', user.id);
    
    if (ownerSharesError) {
      console.error('Error fetching owner shares:', ownerSharesError);
      return res.status(500).json({
        message: 'Error fetching owner shares',
        error: ownerSharesError.message
      });
    }
    
    const { data: sharedWithMe, error: sharedWithMeError } = await supabase
      .from('task_shares')
      .select('id, task_id, owner_id, shared_with_id')
      .eq('shared_with_id', user.id);
    
    if (sharedWithMeError) {
      console.error('Error fetching shares with me:', sharedWithMeError);
      return res.status(500).json({
        message: 'Error fetching shares with me',
        error: sharedWithMeError.message
      });
    }
    
    // 2. Delete all task shares where user is the owner
    let ownerSharesDeleted = 0;
    if (ownerShares && ownerShares.length > 0) {
      const ownerShareIds = ownerShares.map(share => share.id);
      
      const { data: deleteOwnerSharesResult, error: deleteOwnerSharesError } = await supabase
        .from('task_shares')
        .delete()
        .in('id', ownerShareIds)
        .select();
      
      if (deleteOwnerSharesError) {
        console.error('Error deleting owner shares:', deleteOwnerSharesError);
        return res.status(500).json({
          message: 'Error deleting owner shares',
          error: deleteOwnerSharesError.message
        });
      }
      
      ownerSharesDeleted = deleteOwnerSharesResult?.length || 0;
    }
    
    // 3. Delete all task shares where user is shared with
    let sharedWithMeDeleted = 0;
    if (sharedWithMe && sharedWithMe.length > 0) {
      const sharedWithMeIds = sharedWithMe.map(share => share.id);
      
      const { data: deleteSharedWithMeResult, error: deleteSharedWithMeError } = await supabase
        .from('task_shares')
        .delete()
        .in('id', sharedWithMeIds)
        .select();
      
      if (deleteSharedWithMeError) {
        console.error('Error deleting shares with me:', deleteSharedWithMeError);
        return res.status(500).json({
          message: 'Error deleting shares with me',
          error: deleteSharedWithMeError.message
        });
      }
      
      sharedWithMeDeleted = deleteSharedWithMeResult?.length || 0;
    }
    
    // 4. Drop the task_shares_with_profiles view
    const { error: dropViewError } = await supabase.rpc('exec_sql', {
      sql_query: `
        DROP VIEW IF EXISTS task_shares_with_profiles;
      `
    });
    
    if (dropViewError) {
      console.error('Error dropping view:', dropViewError);
      return res.status(500).json({
        message: 'Error dropping view',
        error: dropViewError.message
      });
    }
    
    // 5. Drop the task_shares table
    const { error: dropTableError } = await supabase.rpc('exec_sql', {
      sql_query: `
        DROP TABLE IF EXISTS task_shares;
      `
    });
    
    if (dropTableError) {
      console.error('Error dropping table:', dropTableError);
      return res.status(500).json({
        message: 'Error dropping table',
        error: dropTableError.message
      });
    }
    
    res.status(200).json({ 
      message: 'Successfully removed all shared tasks',
      ownerSharesDeleted,
      sharedWithMeDeleted,
      viewDropped: !dropViewError,
      tableDropped: !dropTableError
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
}
