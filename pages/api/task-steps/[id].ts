import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../services/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getTaskSteps(req, res, id, user.id);
    case 'POST':
      return createTaskStep(req, res, id, user.id);
    case 'PUT':
      return updateTaskStep(req, res, id, user.id);
    case 'DELETE':
      return deleteTaskStep(req, res, id, user.id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

// Get all steps for a task
async function getTaskSteps(
  req: NextApiRequest,
  res: NextApiResponse,
  taskId: string,
  userId: string
) {
  try {
    // First, check if the user has access to this task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
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
        .eq('task_id', taskId)
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
      .eq('task_id', taskId)
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

// Create a new step for a task
async function createTaskStep(
  req: NextApiRequest,
  res: NextApiResponse,
  taskId: string,
  userId: string
) {
  try {
    const { title, description, is_completed, order_index } = req.body;
    
    if (!title) {
      return res.status(400).json({
        message: 'Title is required',
      });
    }
    
    // First, check if the user has access to this task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
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
        .eq('task_id', taskId)
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
      .eq('task_id', taskId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();
    
    // Calculate the next order_index
    const nextOrderIndex = lastStep ? lastStep.order_index + 1 : 0;
    
    // Create the new step
    const { data: newStep, error: createError } = await supabase
      .from('task_steps')
      .insert([
        {
          task_id: taskId,
          user_id: userId,
          title,
          description: description || '',
          is_completed: is_completed || false,
          order_index: order_index !== undefined ? order_index : nextOrderIndex,
        }
      ])
      .select();
    
    if (createError) {
      return res.status(500).json({
        message: 'Error creating task step',
        error: createError.message
      });
    }
    
    return res.status(201).json(newStep[0]);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}

// Update a task step
async function updateTaskStep(
  req: NextApiRequest,
  res: NextApiResponse,
  stepId: string,
  userId: string
) {
  try {
    const { title, description, is_completed, order_index } = req.body;
    
    // Get the step to update
    const { data: stepData, error: stepError } = await supabase
      .from('task_steps')
      .select('*, tasks!inner(*)')
      .eq('id', stepId)
      .single();
    
    if (stepError) {
      if (stepError.code === 'PGRST116') {
        return res.status(404).json({
          message: 'Step not found',
          error: stepError.message
        });
      }
      
      return res.status(500).json({
        message: 'Error fetching step',
        error: stepError.message
      });
    }
    
    // Check if the user has permission to update this step
    if (stepData.user_id !== userId && stepData.tasks.user_id !== userId) {
      // Check if the task is shared with the user with edit permissions
      const { data: shareData, error: shareError } = await supabase
        .from('task_shares')
        .select('*')
        .eq('task_id', stepData.task_id)
        .eq('shared_with_id', userId)
        .eq('status', 'accepted')
        .in('permission_level', ['edit', 'admin'])
        .single();
      
      if (shareError || !shareData) {
        return res.status(403).json({
          message: 'You do not have permission to update this step',
          error: 'Insufficient permissions'
        });
      }
    }
    
    // Update the step
    const { data: updatedStep, error: updateError } = await supabase
      .from('task_steps')
      .update({
        title: title !== undefined ? title : stepData.title,
        description: description !== undefined ? description : stepData.description,
        is_completed: is_completed !== undefined ? is_completed : stepData.is_completed,
        order_index: order_index !== undefined ? order_index : stepData.order_index,
        updated_at: new Date().toISOString()
      })
      .eq('id', stepId)
      .select();
    
    if (updateError) {
      return res.status(500).json({
        message: 'Error updating task step',
        error: updateError.message
      });
    }
    
    return res.status(200).json(updatedStep[0]);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}

// Delete a task step
async function deleteTaskStep(
  req: NextApiRequest,
  res: NextApiResponse,
  stepId: string,
  userId: string
) {
  try {
    // Get the step to delete
    const { data: stepData, error: stepError } = await supabase
      .from('task_steps')
      .select('*, tasks!inner(*)')
      .eq('id', stepId)
      .single();
    
    if (stepError) {
      if (stepError.code === 'PGRST116') {
        return res.status(404).json({
          message: 'Step not found',
          error: stepError.message
        });
      }
      
      return res.status(500).json({
        message: 'Error fetching step',
        error: stepError.message
      });
    }
    
    // Check if the user has permission to delete this step
    if (stepData.user_id !== userId && stepData.tasks.user_id !== userId) {
      return res.status(403).json({
        message: 'You do not have permission to delete this step',
        error: 'Insufficient permissions'
      });
    }
    
    // Delete the step
    const { error: deleteError } = await supabase
      .from('task_steps')
      .delete()
      .eq('id', stepId);
    
    if (deleteError) {
      return res.status(500).json({
        message: 'Error deleting task step',
        error: deleteError.message
      });
    }
    
    return res.status(200).json({ message: 'Step deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}
