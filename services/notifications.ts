import { supabase } from './supabase';
import { Notification } from '../types/notification';

/**
 * Fetch notifications for the current user
 * @param limit Maximum number of notifications to fetch
 * @param includeRead Whether to include read notifications
 * @returns Array of notifications
 */
export const fetchNotifications = async (
  limit: number = 10,
  includeRead: boolean = false
): Promise<Notification[]> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!includeRead) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Get the count of unread notifications
 * @returns Number of unread notifications
 */
export const getUnreadCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
};

/**
 * Mark a notification as read
 * @param notificationId ID of the notification to mark as read
 * @returns Boolean indicating success
 */
export const markAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Mark all notifications as read
 * @returns Boolean indicating success
 */
export const markAllAsRead = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

/**
 * Create a new notification
 * @param notification Notification object to create
 * @returns Created notification or null if error
 */
export const createNotification = async (
  notification: Omit<Notification, 'id' | 'created_at'>
): Promise<Notification | null> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Delete a notification
 * @param notificationId ID of the notification to delete
 * @returns Boolean indicating success
 */
export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

/**
 * Set up a real-time subscription for notifications
 * @param userId User ID to subscribe to notifications for
 * @param onNotification Callback function when a notification is received
 * @returns Supabase subscription that can be unsubscribed
 */
export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: Notification) => void
) => {
  return supabase
    .channel('public:notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        onNotification(payload.new as Notification);
      }
    )
    .subscribe();
};
