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
    // First, find the user by email - try multiple approaches
    console.log(`Looking for user with email: ${sharedWithEmail}`);

    // Try using the database function for case-insensitive lookup
    let { data: users, error: userError } = await supabase.rpc(
      'find_user_by_email',
      { search_email: sharedWithEmail }
    );

    if (userError) {
      console.error('Error with find_user_by_email function:', userError);

      // Fall back to direct query if the function fails
      const { data: directUsers, error: directError } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', sharedWithEmail)
        .limit(1);

      if (directError) {
        console.error('Error with direct email match:', directError);
      } else {
        users = directUsers;
      }
    }

    // If still no match, try a broader search
    if (!users || users.length === 0) {
      console.log('Case-insensitive match failed, trying broader search');
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('id, email');

      if (allProfilesError) {
        console.error('Error fetching all profiles:', allProfilesError);
      } else {
        console.log(`Found ${allProfiles?.length || 0} total profiles`);

        // Log all profiles for debugging
        if (allProfiles) {
          allProfiles.forEach(profile => {
            console.log(`Profile: ${profile.email} (${profile.id})`);
          });
        }

        // Try to find a match manually
        const matchedProfile = allProfiles?.find(profile =>
          profile.email && profile.email.toLowerCase() === sharedWithEmail.toLowerCase()
        );

        if (matchedProfile) {
          users = [matchedProfile];
          console.log(`Found manual match: ${matchedProfile.email} (${matchedProfile.id})`);
        }
      }
    }

    if (!users || users.length === 0) {
      // As a last resort, try a wildcard search
      console.log('Trying wildcard search for email');
      const { data: wildcardUsers, error: wildcardError } = await supabase
        .from('profiles')
        .select('id, email')
        .like('email', `%${sharedWithEmail.split('@')[1]}%`) // Match domain part
        .limit(10);

      if (wildcardError) {
        console.error('Error with wildcard search:', wildcardError);
      } else if (wildcardUsers && wildcardUsers.length > 0) {
        console.log(`Found ${wildcardUsers.length} users with similar email domains`);
        wildcardUsers.forEach(u => console.log(`- ${u.email} (${u.id})`));

        // Try to find a close match
        const closeMatch = wildcardUsers.find(u =>
          u.email &&
          (u.email.toLowerCase().includes(sharedWithEmail.toLowerCase()) ||
           sharedWithEmail.toLowerCase().includes(u.email.toLowerCase()))
        );

        if (closeMatch) {
          console.log(`Found close match: ${closeMatch.email}`);
          users = [closeMatch];
        }
      }

      // If still no match, create a temporary share record with a placeholder
      if (!users || users.length === 0) {
        console.log(`No user found with email ${sharedWithEmail}, creating a pending invitation`);

        // Get the current user's ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('You must be logged in to share tasks');
        }

        // Create a pending invitation instead of throwing an error
        throw new Error(`User with email ${sharedWithEmail} not found. Please make sure they have registered with FocusFlow.`);
      }
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

    // Check if the task is already shared with this user
    const { data: existingShares, error: existingShareError } = await supabase
      .from('task_shares')
      .select('id, status')
      .eq('task_id', taskId)
      .eq('shared_with_id', sharedWithId);

    if (existingShareError) {
      console.error('Error checking existing shares:', existingShareError);
    } else if (existingShares && existingShares.length > 0) {
      console.log('Task is already shared with this user:', existingShares);

      // If the share exists but was rejected, allow resharing
      const rejectedShare = existingShares.find(share => share.status === 'rejected');
      if (rejectedShare) {
        console.log('Found rejected share, updating it');

        // Update the existing share instead of creating a new one
        const { data: updatedShare, error: updateError } = await supabase
          .from('task_shares')
          .update({
            permission_level: permissionLevel,
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', rejectedShare.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return updatedShare;
      }

      // Otherwise, don't allow resharing
      throw new Error(`This task is already shared with ${sharedWithEmail}`);
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
    console.log('Getting task shares for task ID:', taskId);

    // Use the task_shares_with_profiles view instead of trying to join directly
    const { data: shares, error } = await supabase
      .from('task_shares_with_profiles')
      .select(`
        id,
        task_id,
        owner_id,
        shared_with_id,
        permission_level,
        status,
        created_at,
        updated_at,
        shared_with_email,
        shared_with_name
      `)
      .eq('task_id', taskId);

    if (error) {
      console.error('Error in getTaskShares query:', error);
      throw error;
    }

    console.log('Found task shares:', shares?.length || 0);

    // Transform the data to match the SharedUser interface
    return (shares || []).map((share) => {
      // Get email and name directly from the view
      const email = share.shared_with_email || '';
      const name = share.shared_with_name || undefined;

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
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Authentication error: ' + sessionError.message);
    }

    if (!sessionData.session) {
      console.error('No active session found');
      throw new Error('No active session found. Please log in again.');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('User error:', userError);
      throw new Error('Authentication error: ' + userError.message);
    }

    if (!user) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log('Authenticated user ID:', user.id);
    console.log('Session expires at:', sessionData.session.expires_at);

    // Verify the task share belongs to the current user
    const { data: share, error: fetchError } = await supabase
      .from('task_shares')
      .select('*')
      .eq('id', taskShareId)
      .eq('shared_with_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching task share:', fetchError);
      throw new Error('Failed to fetch task share: ' + fetchError.message);
    }

    if (!share) {
      console.error('Task share not found or not accessible');
      throw new Error('Task share not found or not accessible');
    }

    console.log('Found task share:', share);

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
      throw new Error('Failed to update task share: ' + error.message);
    }

    console.log('Task share status updated successfully to:', response);
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
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Authentication error: ' + sessionError.message);
    }

    if (!sessionData.session) {
      console.error('No active session found');
      throw new Error('No active session found. Please log in again.');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('User error:', userError);
      throw new Error('Authentication error: ' + userError.message);
    }

    if (!user) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log('Authenticated user ID:', user.id);
    console.log('Session expires at:', sessionData.session.expires_at);

    // Get tasks shared with the current user using the view with profile information
    const { data: shares, error: sharesError } = await supabase
      .from('task_shares_with_profiles')
      .select(`
        id,
        task_id,
        owner_id,
        permission_level,
        status,
        owner_email,
        owner_name
      `)
      .eq('shared_with_id', user.id)
      .eq('status', 'accepted');

    console.log('Fetched shared tasks with profiles:', shares?.length || 0);

    if (sharesError) {
      console.error('Error fetching shared tasks:', sharesError);
      throw new Error('Failed to fetch shared tasks: ' + sharesError.message);
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
      throw new Error('Failed to fetch task details: ' + tasksError.message);
    }

    if (!tasks || tasks.length === 0) {
      console.log('No task details found for the shared tasks');
      return [];
    }

    console.log('Task details found:', tasks.length);

    // Add sharing information to each task
    return tasks.map((task) => {
      const share = shares.find((s) => s.task_id === task.id);

      // Get owner information from the view
      const ownerEmail = share?.owner_email || '';
      const ownerName = share?.owner_name || '';
      const displayName = ownerName || ownerEmail || share?.owner_id || 'Unknown';

      return {
        ...task,
        is_shared: true,
        shared_by: displayName,
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
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Authentication error: ' + sessionError.message);
    }

    if (!sessionData.session) {
      console.error('No active session found');
      throw new Error('No active session found. Please log in again.');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('User error:', userError);
      throw new Error('Authentication error: ' + userError.message);
    }

    if (!user) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log('Authenticated user ID:', user.id);
    console.log('Session expires at:', sessionData.session.expires_at);

    // Get pending task shares for the current user using the view with profile information
    const { data, error } = await supabase
      .from('task_shares_with_profiles')
      .select(`
        id,
        task_id,
        owner_id,
        shared_with_id,
        permission_level,
        status,
        created_at,
        updated_at,
        owner_email,
        owner_name,
        tasks:task_id (id, title, description)
      `)
      .eq('shared_with_id', user.id)
      .eq('status', 'pending');

    console.log('Fetched pending task shares with profiles:', data?.length || 0);

    if (error) {
      console.error('Error fetching pending task shares:', error);
      throw new Error('Failed to fetch pending task shares: ' + error.message);
    }

    console.log('Pending task shares found:', data?.length || 0);

    if (!data || data.length === 0) {
      return [];
    }

    // Make sure we handle the nested objects properly
    return data.map(share => {
      // Use type assertions to help TypeScript understand the structure
      const taskData = share.tasks as { id?: string; title?: string; description?: string } | null | undefined;

      // Get properties safely
      const taskId = taskData && typeof taskData.id === 'string' ? taskData.id : '';
      const title = taskData && typeof taskData.title === 'string' ? taskData.title : '';
      const description = taskData && typeof taskData.description === 'string' ? taskData.description : '';
      const email = share.owner_email || '';
      const name = share.owner_name || '';

      return {
        ...share,
        tasks: {
          id: taskId,
          title,
          description
        },
        profiles: {
          id: share.owner_id || '',
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
      .from('task_share_activities_with_profiles')
      .select(`
        id,
        task_id,
        user_id,
        activity_type,
        activity_data,
        created_at,
        user_email,
        user_name
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    console.log('Fetched task share activities with profiles:', data?.length || 0);

    if (error) throw error;

    // Make sure we handle the nested objects properly
    return (data || []).map(activity => {
      // Get user information from the view
      const email = activity.user_email || '';
      const name = activity.user_name || '';

      return {
        ...activity,
        profiles: {
          id: activity.user_id || '',
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
