import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../services/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get the task ID from the URL
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        message: 'Task ID is required',
      });
    }
    
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
    console.log('Fetching task with ID:', id);
    
    // First, check if the user is the owner of the task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (taskError) {
      console.error('Error fetching task:', taskError);
      
      // Check if the error is because the task doesn't exist
      if (taskError.code === 'PGRST116') {
        return res.status(404).json({
          message: 'Task not found',
          error: taskError.message
        });
      }
      
      return res.status(500).json({
        message: 'Error fetching task',
        error: taskError.message
      });
    }
    
    // If the user is the owner, return the task
    if (taskData.user_id === user.id) {
      return res.status(200).json(taskData);
    }
    
    // If not the owner, check if the task is shared with the user
    console.log('User is not the owner, checking if task is shared');
    
    const { data: shareData, error: shareError } = await supabase
      .from('task_shares')
      .select('*')
      .eq('task_id', id)
      .eq('shared_with_id', user.id)
      .eq('status', 'accepted')
      .single();
    
    if (shareError) {
      console.error('Error checking task share:', shareError);
      
      // If no share record found, user doesn't have access
      if (shareError.code === 'PGRST116') {
        return res.status(403).json({
          message: 'You do not have access to this task',
          error: 'Not shared with you'
        });
      }
      
      return res.status(500).json({
        message: 'Error checking task share',
        error: shareError.message
      });
    }
    
    // User has access to the shared task, return it with sharing info
    return res.status(200).json({
      ...taskData,
      is_shared: true,
      shared_by: shareData.owner_id,
      permission_level: shareData.permission_level
    });
    
  } catch (error: any) {
    console.error('Unexpected error in tasksRedirect:', error);
    res.status(500).json({
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
}
