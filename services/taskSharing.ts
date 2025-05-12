import { supabase } from './supabase';
import { Task, TaskShare, TaskShareActivity, SharedUser } from '../types/task';

/**
 * Share a task with another user
 */
export const shareTask = async (
  taskId: string,
  sharedWithEmail: string,
  permissionLevel: 'view' | 'edit' | 'admin' = 'view'
): Promise<TaskShare> => {
  try {
    // First, find the user by email
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', sharedWithEmail)
      .limit(1);

    if (userError) throw userError;
    if (!users || users.length === 0) {
      throw new Error(`User with email ${sharedWithEmail} not found`);
    }

    const sharedWithId = users[0].id;

    // Check if the task exists and belongs to the current user
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError) throw taskError;
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Create the task share
    const { data: taskShare, error: shareError } = await supabase
      .from('task_shares')
      .insert({
        task_id: taskId,
        owner_id: task.user_id,
        shared_with_id: sharedWithId,
        permission_level: permissionLevel,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (shareError) throw shareError;
    return taskShare;
  } catch (error) {
    console.error('Error sharing task:', error);
    throw error;
  }
};

/**
 * Get all users a task is shared with
 */
export const getTaskShares = async (taskId: string): Promise<SharedUser[]> => {
  try {
    const { data: shares, error } = await supabase
      .from('task_shares')
      .select(`
        id,
        task_id,
        owner_id,
        shared_with_id,
        permission_level,
        status,
        created_at,
        updated_at,
        profiles:shared_with_id (id, email, name)
      `)
      .eq('task_id', taskId);

    if (error) throw error;

    // Transform the data to match the SharedUser interface
    return (shares || []).map((share) => {
      // Ensure profiles is an object, not an array
      const profile = typeof share.profiles === 'object' && share.profiles !== null
        ? share.profiles
        : {};

      return {
        id: share.shared_with_id,
        email: typeof profile.email === 'string' ? profile.email : '',
        name: typeof profile.name === 'string' ? profile.name : undefined,
        permission_level: share.permission_level,
        status: share.status,
      };
    });
  } catch (error) {
    console.error('Error getting task shares:', error);
    throw error;
  }
};

/**
 * Update the permission level for a shared task
 */
export const updateTaskSharePermission = async (
  taskId: string,
  sharedWithId: string,
  permissionLevel: 'view' | 'edit' | 'admin'
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('task_shares')
      .update({
        permission_level: permissionLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('task_id', taskId)
      .eq('shared_with_id', sharedWithId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating task share permission:', error);
    throw error;
  }
};

/**
 * Remove a user's access to a shared task
 */
export const removeTaskShare = async (
  taskId: string,
  sharedWithId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('task_shares')
      .delete()
      .eq('task_id', taskId)
      .eq('shared_with_id', sharedWithId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing task share:', error);
    throw error;
  }
};

/**
 * Accept or reject a shared task
 */
export const respondToTaskShare = async (
  taskShareId: string,
  response: 'accepted' | 'rejected'
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('task_shares')
      .update({
        status: response,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskShareId);

    if (error) throw error;
  } catch (error) {
    console.error('Error responding to task share:', error);
    throw error;
  }
};

/**
 * Get all tasks shared with the current user
 */
export const getTasksSharedWithMe = async (): Promise<Task[]> => {
  try {
    const { data: shares, error: sharesError } = await supabase
      .from('task_shares')
      .select(`
        task_id,
        owner_id,
        permission_level,
        status,
        profiles:owner_id (email, name)
      `)
      .eq('status', 'accepted');

    if (sharesError) throw sharesError;

    if (!shares || shares.length === 0) {
      return [];
    }

    // Get the actual tasks
    const taskIds = shares.map((share) => share.task_id);
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .in('id', taskIds);

    if (tasksError) throw tasksError;

    // Add sharing information to each task
    return tasks.map((task) => {
      const share = shares.find((s) => s.task_id === task.id);

      // Ensure profiles is an object, not an array
      const profile = share && typeof share.profiles === 'object' && share.profiles !== null
        ? share.profiles
        : {};

      return {
        ...task,
        is_shared: true,
        shared_by: typeof profile.email === 'string' ? profile.email : share?.owner_id || '',
      };
    });
  } catch (error) {
    console.error('Error getting shared tasks:', error);
    throw error;
  }
};

/**
 * Get all pending task shares for the current user
 */
export const getPendingTaskShares = async (): Promise<TaskShare[]> => {
  try {
    const { data, error } = await supabase
      .from('task_shares')
      .select(`
        id,
        task_id,
        owner_id,
        shared_with_id,
        permission_level,
        status,
        created_at,
        updated_at,
        tasks:task_id (title, description),
        profiles:owner_id (email, name)
      `)
      .eq('status', 'pending');

    if (error) throw error;

    // Make sure we handle the nested objects properly
    return (data || []).map(share => {
      // Ensure tasks and profiles are objects, not arrays
      const taskData = typeof share.tasks === 'object' && share.tasks !== null
        ? share.tasks
        : {};

      const profileData = typeof share.profiles === 'object' && share.profiles !== null
        ? share.profiles
        : {};

      return {
        ...share,
        tasks: {
          title: typeof taskData.title === 'string' ? taskData.title : '',
          description: typeof taskData.description === 'string' ? taskData.description : ''
        },
        profiles: {
          email: typeof profileData.email === 'string' ? profileData.email : '',
          name: typeof profileData.name === 'string' ? profileData.name : ''
        }
      };
    });
  } catch (error) {
    console.error('Error getting pending task shares:', error);
    throw error;
  }
};

/**
 * Get task share activities
 */
export const getTaskShareActivities = async (taskId: string): Promise<TaskShareActivity[]> => {
  try {
    const { data, error } = await supabase
      .from('task_share_activities')
      .select(`
        id,
        task_id,
        user_id,
        activity_type,
        activity_data,
        created_at,
        profiles:user_id (email, name)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Make sure we handle the nested objects properly
    return (data || []).map(activity => {
      // Ensure profiles is an object, not an array
      const profileData = typeof activity.profiles === 'object' && activity.profiles !== null
        ? activity.profiles
        : {};

      return {
        ...activity,
        profiles: {
          email: typeof profileData.email === 'string' ? profileData.email : '',
          name: typeof profileData.name === 'string' ? profileData.name : ''
        }
      };
    });
  } catch (error) {
    console.error('Error getting task share activities:', error);
    throw error;
  }
};
