import { supabase } from './supabase';
import { CalendarEvent } from '../types/calendar';
import { Task } from '../types/task';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isAfter } from 'date-fns';

/**
 * Fetch calendar events for a specific date range
 * @param startDate Start date of the range
 * @param endDate End date of the range
 * @returns Array of calendar events
 */
export const fetchCalendarEvents = async (
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> => {
  try {
    // Fetch events from calendar_events table
    const { data: calendarEvents, error: calendarError } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startDate.toISOString())
      .lte('end_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (calendarError) throw calendarError;

    // Return the events
    return calendarEvents || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
};

/**
 * Fetch calendar events for a specific month
 * @param date Any date within the month
 * @returns Array of calendar events
 */
export const fetchMonthEvents = async (date: Date): Promise<CalendarEvent[]> => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return fetchCalendarEvents(start, end);
};

/**
 * Fetch calendar events for a specific week
 * @param date Any date within the week
 * @returns Array of calendar events
 */
export const fetchWeekEvents = async (date: Date): Promise<CalendarEvent[]> => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Start week on Monday
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return fetchCalendarEvents(start, end);
};

/**
 * Create a new calendar event
 * @param event Calendar event to create
 * @returns Created event or null if error
 */
export const createCalendarEvent = async (
  event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<CalendarEvent | null> => {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([{
        ...event,
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
};

/**
 * Update an existing calendar event
 * @param id ID of the event to update
 * @param event Updated event data
 * @returns Updated event or null if error
 */
export const updateCalendarEvent = async (
  id: string,
  event: Partial<Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>>
): Promise<CalendarEvent | null> => {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .update({
        ...event,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return null;
  }
};

/**
 * Delete a calendar event
 * @param id ID of the event to delete
 * @returns Boolean indicating success
 */
export const deleteCalendarEvent = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
};

/**
 * Create a calendar event from a task
 * @param taskId ID of the task
 * @param startTime Start time of the event
 * @param endTime End time of the event
 * @returns Created event or null if error
 */
export const createEventFromTask = async (
  taskId: string,
  startTime: Date,
  endTime: Date
): Promise<CalendarEvent | null> => {
  try {
    // First, get the task details
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError) throw taskError;

    // Create the calendar event
    return createCalendarEvent({
      user_id: taskData.user_id,
      title: taskData.title,
      description: taskData.description || '',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      all_day: false,
      color: getPriorityColor(taskData.priority),
      related_task_id: taskId
    });
  } catch (error) {
    console.error('Error creating event from task:', error);
    return null;
  }
};

/**
 * Get a color based on task priority
 * @param priority Task priority
 * @returns Color string
 */
const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'high':
      return '#ef4444'; // red-500
    case 'medium':
      return '#f59e0b'; // amber-500
    case 'low':
      return '#10b981'; // emerald-500
    default:
      return '#3b82f6'; // blue-500
  }
};
