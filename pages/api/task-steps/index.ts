import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../services/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getTaskSteps(req, res, user.id);
    case 'POST':
      return createTaskSteps(req, res, user.id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

// Get all steps for a user
async function getTaskSteps(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { task_id } = req.query;
    
    if (!task_id || typeof task_id !== 'string') {
      return res.status(400).json({
        message: 'Task ID is required',
      });
    }
    
    // First, check if the user has access to this task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .single();
    
    if (taskError) {
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
    
    // If the user is not the owner, check if the task is shared with them
    if (taskData.user_id !== userId) {
      const { data: shareData, error: shareError } = await supabase
        .from('task_shares')
        .select('*')
        .eq('task_id', task_id)
        .eq('shared_with_id', userId)
        .eq('status', 'accepted')
        .single();
      
      if (shareError || !shareData) {
        return res.status(403).json({
          message: 'You do not have access to this task',
          error: 'Not shared with you'
        });
      }
    }
    
    // Get all steps for this task
    const { data: steps, error: stepsError } = await supabase
      .from('task_steps')
      .select('*')
      .eq('task_id', task_id)
      .order('order_index', { ascending: true });
    
    if (stepsError) {
      return res.status(500).json({
        message: 'Error fetching task steps',
        error: stepsError.message
      });
    }
    
    return res.status(200).json(steps);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}

// Create multiple task steps at once
async function createTaskSteps(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { task_id, steps } = req.body;
    
    if (!task_id) {
      return res.status(400).json({
        message: 'Task ID is required',
      });
    }
    
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({
        message: 'Steps array is required',
      });
    }
    
    // First, check if the user has access to this task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .single();
    
    if (taskError) {
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
    
    // If the user is not the owner, check if the task is shared with them with edit permissions
    if (taskData.user_id !== userId) {
      const { data: shareData, error: shareError } = await supabase
        .from('task_shares')
        .select('*')
        .eq('task_id', task_id)
        .eq('shared_with_id', userId)
        .eq('status', 'accepted')
        .in('permission_level', ['edit', 'admin'])
        .single();
      
      if (shareError || !shareData) {
        return res.status(403).json({
          message: 'You do not have permission to add steps to this task',
          error: 'Insufficient permissions'
        });
      }
    }
    
    // Get the current highest order_index
    const { data: lastStep, error: lastStepError } = await supabase
      .from('task_steps')
      .select('order_index')
      .eq('task_id', task_id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();
    
    // Calculate the starting order_index
    const startOrderIndex = lastStep ? lastStep.order_index + 1 : 0;
    
    // Prepare the steps to insert
    const stepsToInsert = steps.map((step: any, index: number) => ({
      task_id,
      user_id: userId,
      title: step.title,
      description: step.description || '',
      is_completed: step.is_completed || false,
      order_index: startOrderIndex + index,
    }));
    
    // Create the new steps
    const { data: newSteps, error: createError } = await supabase
      .from('task_steps')
      .insert(stepsToInsert)
      .select();
    
    if (createError) {
      return res.status(500).json({
        message: 'Error creating task steps',
        error: createError.message
      });
    }
    
    return res.status(201).json(newSteps);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}
