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
    // Find resources using Google Custom Search
    const { videos, articles } = await findTaskResources(task);

    // Prepare resources for saving
    const resources = [
      ...videos.map(video => ({
        task_id: task.id,
        user_id: userId,
        title: video.title,
        url: video.url,
        description: video.description,
        type: video.type,
        thumbnail_url: video.thumbnail_url || undefined
      })),
      ...articles.map(article => ({
        task_id: task.id,
        user_id: userId,
        title: article.title,
        url: article.url,
        description: article.description,
        type: article.type,
        thumbnail_url: article.thumbnail_url || undefined
      }))
    ];

    // Save resources to the database
    if (resources.length > 0) {
      const { data, error } = await supabase
        .from('task_resources')
        .insert(resources)
        .select();

      if (error) {
        throw error;
      }

      return data || [];
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
    // Delete existing resources
    const { error: deleteError } = await supabase
      .from('task_resources')
      .delete()
      .eq('task_id', task.id);

    if (deleteError) {
      throw deleteError;
    }

    // Find and save new resources
    return await findAndSaveTaskResources(task, userId);
  } catch (error) {
    console.error('Error refreshing task resources:', error);
    return [];
  }
};
