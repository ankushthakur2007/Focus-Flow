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
    
    // 1. First, check if the task_shares_with_profiles view exists
    const { data: viewCheck, error: viewCheckError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = 'task_shares_with_profiles'
        );
      `
    });
    
    if (viewCheckError) {
      console.error('Error checking if view exists:', viewCheckError);
      return res.status(500).json({
        message: 'Error checking if view exists',
        error: viewCheckError.message
      });
    }
    
    // 2. Drop and recreate the view with proper joins
    const { error: viewError } = await supabase.rpc('exec_sql', {
      sql_query: `
        -- Drop the existing view if it exists
        DROP VIEW IF EXISTS task_shares_with_profiles;

        -- Create the view with proper joins
        CREATE VIEW task_shares_with_profiles AS
        SELECT
          ts.id,
          ts.task_id,
          ts.owner_id,
          ts.shared_with_id,
          ts.permission_level,
          ts.status,
          ts.created_at,
          ts.updated_at,
          owner.email AS owner_email,
          owner.name AS owner_name,
          shared.email AS shared_with_email,
          shared.name AS shared_with_name,
          t.title AS task_title,
          t.description AS task_description,
          t.status AS task_status,
          t.priority AS task_priority,
          t.category AS task_category,
          t.user_id AS task_user_id
        FROM
          task_shares ts
        LEFT JOIN
          profiles owner ON ts.owner_id = owner.id
        LEFT JOIN
          profiles shared ON ts.shared_with_id = shared.id
        LEFT JOIN
          tasks t ON ts.task_id = t.id;

        -- Grant permissions for the view
        GRANT SELECT ON task_shares_with_profiles TO authenticated;
      `
    });
    
    if (viewError) {
      console.error('Error creating view:', viewError);
      return res.status(500).json({
        message: 'Error creating view',
        error: viewError.message
      });
    }
    
    // 3. Fix permissions for all shared tasks to ensure they have admin access
    const { error: permissionError } = await supabase.rpc('exec_sql', {
      sql_query: `
        UPDATE task_shares
        SET permission_level = 'admin'
        WHERE status = 'accepted';
      `
    });
    
    if (permissionError) {
      console.error('Error updating permissions:', permissionError);
      return res.status(500).json({
        message: 'Error updating permissions',
        error: permissionError.message
      });
    }
    
    // 4. Check if there are any shared tasks with this user
    const { data: userShares, error: userSharesError } = await supabase
      .from('task_shares')
      .select('*')
      .eq('shared_with_id', user.id)
      .eq('status', 'accepted');
    
    if (userSharesError) {
      console.error('Error checking user shares:', userSharesError);
      return res.status(500).json({
        message: 'Error checking user shares',
        error: userSharesError.message
      });
    }
    
    // 5. Get the actual tasks to ensure we have complete task data
    let tasks = [];
    if (userShares && userShares.length > 0) {
      const taskIds = userShares.map((share) => share.task_id);
      const { data: taskData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds);
        
      if (tasksError) {
        console.error('Error fetching task details:', tasksError);
      } else {
        tasks = taskData || [];
      }
    }
    
    // 6. Check if the view was created correctly
    const { data: viewData, error: viewDataError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          id,
          task_id,
          owner_id,
          shared_with_id,
          permission_level,
          status,
          task_title,
          task_description,
          task_status
        FROM 
          task_shares_with_profiles
        WHERE
          shared_with_id = '${user.id}'
        LIMIT 10;
      `
    });
    
    if (viewDataError) {
      console.error('Error checking view data:', viewDataError);
      return res.status(500).json({
        message: 'Error checking view data',
        error: viewDataError.message
      });
    }
    
    res.status(200).json({ 
      message: 'Successfully fixed shared tasks',
      userShares: userShares || [],
      userSharesCount: userShares?.length || 0,
      tasks: tasks || [],
      tasksCount: tasks.length || 0,
      viewData: viewData || []
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
}
