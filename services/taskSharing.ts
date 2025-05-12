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
      // Use a type assertion to help TypeScript understand the structure
      const profileData = share.profiles as { email?: string; name?: string } | null | undefined;

      // Get email and name safely
      const email = profileData && typeof profileData.email === 'string' ? profileData.email : '';
      const name = profileData && typeof profileData.name === 'string' ? profileData.name : undefined;

      return {
        id: share.shared_with_id,
        email,
        name,
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
    console.log(`Responding to task share ${taskShareId} with ${response}`);

    // First, check if the user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated');
    }

    console.log('Authenticated user ID:', user.id);

    // Verify the task share belongs to the current user
    const { data: share, error: fetchError } = await supabase
      .from('task_shares')
      .select('*')
      .eq('id', taskShareId)
      .eq('shared_with_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching task share:', fetchError);
      throw fetchError;
    }

    if (!share) {
      console.error('Task share not found or not accessible');
      throw new Error('Task share not found or not accessible');
    }

    // Update the task share status
    const { error } = await supabase
      .from('task_shares')
      .update({
        status: response,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskShareId)
      .eq('shared_with_id', user.id);

    if (error) {
      console.error('Error updating task share status:', error);
      throw error;
    }

    console.log('Task share status updated successfully');
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
    console.log('Fetching tasks shared with me...');

    // First, check if the user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return [];
    }

    console.log('Authenticated user ID:', user.id);

    // Get tasks shared with the current user
    const { data: shares, error: sharesError } = await supabase
      .from('task_shares')
      .select(`
        task_id,
        owner_id,
        permission_level,
        status,
        profiles:owner_id (email, name)
      `)
      .eq('shared_with_id', user.id)
      .eq('status', 'accepted');

    if (sharesError) {
      console.error('Error fetching shared tasks:', sharesError);
      throw sharesError;
    }

    console.log('Shared tasks found:', shares?.length || 0);

    if (!shares || shares.length === 0) {
      return [];
    }

    // Get the actual tasks
    const taskIds = shares.map((share) => share.task_id);
    console.log('Fetching task details for IDs:', taskIds);

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .in('id', taskIds);

    if (tasksError) {
      console.error('Error fetching task details:', tasksError);
      throw tasksError;
    }

    // Add sharing information to each task
    return tasks.map((task) => {
      const share = shares.find((s) => s.task_id === task.id);

      // Use a type assertion to help TypeScript understand the structure
      const profileData = share?.profiles as { email?: string; name?: string } | null | undefined;

      // Get email safely
      const email = profileData && typeof profileData.email === 'string' ? profileData.email : '';

      return {
        ...task,
        is_shared: true,
        shared_by: email || share?.owner_id || '',
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
    console.log('Fetching pending task shares...');

    // First, check if the user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return [];
    }

    console.log('Authenticated user ID:', user.id);

    // Get pending task shares for the current user
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
      .eq('shared_with_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching pending task shares:', error);
      throw error;
    }

    console.log('Pending task shares found:', data?.length || 0);

    // Make sure we handle the nested objects properly
    return (data || []).map(share => {
      // Use type assertions to help TypeScript understand the structure
      const taskData = share.tasks as { title?: string; description?: string } | null | undefined;
      const profileData = share.profiles as { email?: string; name?: string } | null | undefined;

      // Get properties safely
      const title = taskData && typeof taskData.title === 'string' ? taskData.title : '';
      const description = taskData && typeof taskData.description === 'string' ? taskData.description : '';
      const email = profileData && typeof profileData.email === 'string' ? profileData.email : '';
      const name = profileData && typeof profileData.name === 'string' ? profileData.name : '';

      return {
        ...share,
        tasks: {
          title,
          description
        },
        profiles: {
          email,
          name
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
      // Use a type assertion to help TypeScript understand the structure
      const profileData = activity.profiles as { email?: string; name?: string } | null | undefined;

      // Get properties safely
      const email = profileData && typeof profileData.email === 'string' ? profileData.email : '';
      const name = profileData && typeof profileData.name === 'string' ? profileData.name : '';

      return {
        ...activity,
        profiles: {
          email,
          name
        }
      };
    });
  } catch (error) {
    console.error('Error getting task share activities:', error);
    throw error;
  }
};
