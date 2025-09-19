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
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({
        message: 'Authentication required',
        error: authError ? authError.message : 'No user found'
      });
    }
    
    // Get a task to associate with the recommendation
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);
    
    if (tasksError) {
      return res.status(500).json({
        message: 'Error fetching tasks',
        error: tasksError.message
      });
    }
    
    if (!tasks || tasks.length === 0) {
      return res.status(404).json({
        message: 'No tasks found to associate with recommendation'
      });
    }
    
    // Insert a test recommendation
    const { data, error } = await supabase
      .from('recommendations')
      .insert([{
        user_id: user.id,
        task_id: tasks[0].id,
        recommended_task: 'Test Recommendation',
        reasoning: 'This is a test recommendation created by the API',
        suggestion: 'Follow the steps to complete this task',
        mood_tip: 'Take breaks when needed',
        mood: 'neutral',
        created_at: new Date().toISOString(),
      }])
      .select();
    
    if (error) {
      return res.status(500).json({
        message: 'Error inserting recommendation',
        error: error.message
      });
    }
    
    res.status(200).json({ 
      message: 'Test recommendation inserted successfully',
      data
    });
  } catch (error) {
    console.error('Error in test insert:', error);
    res.status(500).json({ 
      message: 'Error in test insert', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}
