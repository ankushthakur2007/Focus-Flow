import { supabase } from './supabase';
import { Task, TaskResource } from '../types/task';
import { findTaskResources } from './googleSearch';

/**
 * Fetch resources for a task
 */
export const fetchTaskResources = async (taskId: string): Promise<TaskResource[]> => {
  try {
    const { data, error } = await supabase
      .from('task_resources')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching task resources:', error);
    return [];
  }
};

/**
 * Save a resource to the database
 */
export const saveTaskResource = async (resource: Omit<TaskResource, 'id' | 'created_at' | 'updated_at'>): Promise<TaskResource | null> => {
  try {
    const { data, error } = await supabase
      .from('task_resources')
      .insert([{
        ...resource,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error saving task resource:', error);
    return null;
  }
};

/**
 * Delete a resource from the database
 */
export const deleteTaskResource = async (resourceId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('task_resources')
      .delete()
      .eq('id', resourceId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting task resource:', error);
    return false;
  }
};

/**
 * Find and save resources for a task
 */
export const findAndSaveTaskResources = async (task: Task, userId: string): Promise<TaskResource[]> => {
  try {
    console.log('Finding and saving resources for task:', task.title);

    // Find resources using Google Custom Search
    const { videos, articles } = await findTaskResources(task);

    console.log('Resources found:', {
      videosCount: videos.length,
      articlesCount: articles.length
    });

    // If no resources found, return empty array
    if (videos.length === 0 && articles.length === 0) {
      console.log('No resources found for task:', task.title);
      return [];
    }

    // Prepare resources for saving
    const resources = [
      ...videos.map(video => ({
        task_id: task.id,
        user_id: userId,
        title: video.title || 'Video Resource', // Provide fallback title
        url: video.url,
        description: video.description || 'Video tutorial related to this task', // Provide fallback description
        type: video.type,
        thumbnail_url: video.thumbnail_url || undefined
      })),
      ...articles.map(article => ({
        task_id: task.id,
        user_id: userId,
        title: article.title || 'Article Resource', // Provide fallback title
        url: article.url,
        description: article.description || 'Article related to this task', // Provide fallback description
        type: article.type,
        thumbnail_url: article.thumbnail_url || undefined
      }))
    ];

    console.log('Prepared resources for saving:', resources.length);

    // Save resources to the database
    if (resources.length > 0) {
      // Insert resources in batches to avoid potential size limits
      const batchSize = 10;
      let savedResources: TaskResource[] = [];

      for (let i = 0; i < resources.length; i += batchSize) {
        const batch = resources.slice(i, i + batchSize);
        console.log(`Saving batch ${i/batchSize + 1} of resources (${batch.length} items)`);

        const { data, error } = await supabase
          .from('task_resources')
          .insert(batch)
          .select();

        if (error) {
          console.error('Error saving batch of resources:', error);
          // Continue with next batch instead of failing completely
        } else if (data) {
          savedResources = [...savedResources, ...data];
        }
      }

      console.log('Successfully saved resources:', savedResources.length);
      return savedResources;
    }

    return [];
  } catch (error) {
    console.error('Error finding and saving task resources:', error);
    return [];
  }
};

/**
 * Refresh resources for a task
 */
export const refreshTaskResources = async (task: Task, userId: string): Promise<TaskResource[]> => {
  try {
    console.log('Refreshing resources for task:', task.title);

    // First check if the task exists
    if (!task.id) {
      console.error('Cannot refresh resources: Task ID is missing');
      return [];
    }

    // Delete existing resources
    console.log('Deleting existing resources for task:', task.id);
    const { error: deleteError } = await supabase
      .from('task_resources')
      .delete()
      .eq('task_id', task.id);

    if (deleteError) {
      console.error('Error deleting existing resources:', deleteError);
      // Continue anyway to try to add new resources
    } else {
      console.log('Successfully deleted existing resources for task:', task.id);
    }

    // Find and save new resources
    console.log('Finding and saving new resources for task:', task.title);
    const newResources = await findAndSaveTaskResources(task, userId);
    console.log('Refresh complete. New resources count:', newResources.length);

    return newResources;
  } catch (error) {
    console.error('Error refreshing task resources:', error);
    return [];
  }
};
