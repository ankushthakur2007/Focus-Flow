import { supabase } from './supabase';
import { Task } from '../types/task';
import { Mood } from '../types/mood';
import {
  subDays, parseISO, format, startOfDay, endOfDay,
  isWithinInterval, startOfWeek, endOfWeek, addDays
} from 'date-fns';

type TimeRange = '7days' | '30days' | '90days' | 'all';

// Define interfaces for analytics data
export interface DailyAnalytics {
  id: string;
  user_id: string;
  date: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  completion_rate: number;
  most_productive_hour?: number;
  most_common_category?: string;
  most_common_mood?: string;
  created_at: string;
  updated_at: string;
}

export interface MoodAnalytics {
  id: string;
  user_id: string;
  mood_name: string;
  task_count: number;
  completion_rate: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryAnalytics {
  id: string;
  user_id: string;
  category: string;
  task_count: number;
  completion_rate: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyAnalytics {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  most_productive_day?: string;
  most_common_category?: string;
  most_common_mood?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch tasks data for analytics based on the selected time range
 */
export const fetchTaskAnalytics = async (timeRange: TimeRange): Promise<Task[]> => {
  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply time range filter if not 'all'
    if (timeRange !== 'all') {
      const days = parseInt(timeRange.replace('days', ''));
      const startDate = subDays(new Date(), days).toISOString();
      query = query.gte('created_at', startDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching task analytics:', error);
    throw error;
  }
};

/**
 * Fetch mood data for analytics based on the selected time range
 */
export const fetchMoodAnalytics = async (timeRange: TimeRange): Promise<Mood[]> => {
  try {
    let query = supabase
      .from('moods')
      .select('*')
      .order('timestamp', { ascending: false });

    // Apply time range filter if not 'all'
    if (timeRange !== 'all') {
      const days = parseInt(timeRange.replace('days', ''));
      const startDate = subDays(new Date(), days).toISOString();
      query = query.gte('timestamp', startDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching mood analytics:', error);
    throw error;
  }
};

/**
 * Fetch daily analytics from the analytics_daily table
 */
export const fetchDailyAnalytics = async (timeRange: TimeRange): Promise<DailyAnalytics[]> => {
  try {
    let query = supabase
      .from('analytics_daily')
      .select('*')
      .order('date', { ascending: false });

    // Apply time range filter if not 'all'
    if (timeRange !== 'all') {
      const days = parseInt(timeRange.replace('days', ''));
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      query = query.gte('date', startDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // If no data exists, calculate and store it
    if (!data || data.length === 0) {
      return await calculateAndStoreDailyAnalytics(timeRange);
    }

    return data;
  } catch (error) {
    console.error('Error fetching daily analytics:', error);
    throw error;
  }
};

/**
 * Fetch mood analytics from the analytics_mood table
 */
export const fetchMoodAnalytics2 = async (timeRange: TimeRange): Promise<MoodAnalytics[]> => {
  try {
    let query = supabase
      .from('analytics_mood')
      .select('*')
      .order('date', { ascending: false });

    // Apply time range filter if not 'all'
    if (timeRange !== 'all') {
      const days = parseInt(timeRange.replace('days', ''));
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      query = query.gte('date', startDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // If no data exists, calculate and store it
    if (!data || data.length === 0) {
      return await calculateAndStoreMoodAnalytics(timeRange);
    }

    return data;
  } catch (error) {
    console.error('Error fetching mood analytics:', error);
    throw error;
  }
};

/**
 * Fetch category analytics from the analytics_category table
 */
export const fetchCategoryAnalytics = async (timeRange: TimeRange): Promise<CategoryAnalytics[]> => {
  try {
    let query = supabase
      .from('analytics_category')
      .select('*')
      .order('date', { ascending: false });

    // Apply time range filter if not 'all'
    if (timeRange !== 'all') {
      const days = parseInt(timeRange.replace('days', ''));
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      query = query.gte('date', startDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // If no data exists, calculate and store it
    if (!data || data.length === 0) {
      return await calculateAndStoreCategoryAnalytics(timeRange);
    }

    return data;
  } catch (error) {
    console.error('Error fetching category analytics:', error);
    throw error;
  }
};

/**
 * Calculate and store daily analytics
 */
const calculateAndStoreDailyAnalytics = async (timeRange: TimeRange): Promise<DailyAnalytics[]> => {
  // Fetch raw data
  const tasks = await fetchTaskAnalytics(timeRange);
  const moods = await fetchMoodAnalytics(timeRange);

  // Group tasks by day
  const tasksByDay = groupTasksByDay(tasks, timeRange);

  // Calculate analytics for each day
  const dailyAnalytics: DailyAnalytics[] = [];

  for (const [dateStr, dayTasks] of Object.entries(tasksByDay)) {
    const date = parseISO(dateStr);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Find moods for this day
    const dayMoods = moods.filter(mood => {
      const moodDate = parseISO(mood.timestamp || '');
      return isWithinInterval(moodDate, { start: dayStart, end: dayEnd });
    });

    // Calculate statistics
    const totalTasks = dayTasks.length;
    const completedTasks = dayTasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = dayTasks.filter(task => task.status === 'in_progress').length;
    const pendingTasks = dayTasks.filter(task => task.status === 'pending').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Find most common category
    const categoryCount: Record<string, number> = {};
    dayTasks.forEach(task => {
      categoryCount[task.category] = (categoryCount[task.category] || 0) + 1;
    });

    let mostCommonCategory = '';
    let maxCategoryCount = 0;

    Object.entries(categoryCount).forEach(([category, count]) => {
      if (count > maxCategoryCount) {
        mostCommonCategory = category;
        maxCategoryCount = count;
      }
    });

    // Find most common mood
    const moodCount: Record<string, number> = {};
    dayMoods.forEach(mood => {
      moodCount[mood.name] = (moodCount[mood.name] || 0) + 1;
    });

    let mostCommonMood = '';
    let maxMoodCount = 0;

    Object.entries(moodCount).forEach(([mood, count]) => {
      if (count > maxMoodCount) {
        mostCommonMood = mood;
        maxMoodCount = count;
      }
    });

    // Create analytics object
    const analytics: Partial<DailyAnalytics> = {
      date: dateStr,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      in_progress_tasks: inProgressTasks,
      pending_tasks: pendingTasks,
      completion_rate: Math.round(completionRate * 100) / 100,
      most_common_category: mostCommonCategory || undefined,
      most_common_mood: mostCommonMood || undefined,
    };

    // Store in database
    const { data, error } = await supabase
      .from('analytics_daily')
      .upsert({
        ...analytics,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error('Error storing daily analytics:', error);
    } else if (data && data.length > 0) {
      dailyAnalytics.push(data[0] as DailyAnalytics);
    }
  }

  return dailyAnalytics;
};

/**
 * Calculate and store mood analytics
 */
const calculateAndStoreMoodAnalytics = async (timeRange: TimeRange): Promise<MoodAnalytics[]> => {
  // Implementation will be similar to calculateAndStoreDailyAnalytics
  // but focused on mood-specific analytics
  return [];
};

/**
 * Calculate and store category analytics
 */
const calculateAndStoreCategoryAnalytics = async (timeRange: TimeRange): Promise<CategoryAnalytics[]> => {
  // Implementation will be similar to calculateAndStoreDailyAnalytics
  // but focused on category-specific analytics
  return [];
};

/**
 * Calculate task completion rate
 */
export const calculateCompletionRate = (tasks: Task[]): number => {
  if (tasks.length === 0) return 0;

  const completedTasks = tasks.filter(task => task.status === 'completed');
  return Math.round((completedTasks.length / tasks.length) * 100);
};

/**
 * Group tasks by day for trend analysis
 */
export const groupTasksByDay = (tasks: Task[], timeRange: TimeRange): Record<string, Task[]> => {
  const result: Record<string, Task[]> = {};

  // Determine the number of days to include
  let days = 7;
  if (timeRange === '30days') days = 30;
  if (timeRange === '90days') days = 90;

  // Create entries for each day in the range
  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    result[dateStr] = [];
  }

  // Group tasks by day
  tasks.forEach(task => {
    const taskDate = format(parseISO(task.created_at), 'yyyy-MM-dd');
    if (result[taskDate]) {
      result[taskDate].push(task);
    } else if (timeRange === 'all') {
      // For 'all' time range, we need to create entries for days not in the predefined range
      result[taskDate] = [task];
    }
  });

  return result;
};

/**
 * Calculate daily completion rates
 */
export const calculateDailyCompletionRates = (
  tasksByDay: Record<string, Task[]>
): Record<string, number> => {
  const result: Record<string, number> = {};

  Object.entries(tasksByDay).forEach(([date, tasks]) => {
    if (tasks.length === 0) {
      result[date] = 0;
    } else {
      const completedTasks = tasks.filter(task => task.status === 'completed');
      result[date] = Math.round((completedTasks.length / tasks.length) * 100);
    }
  });

  return result;
};

/**
 * Group tasks by category
 */
export const groupTasksByCategory = (tasks: Task[]): Record<string, number> => {
  const result: Record<string, number> = {
    work: 0,
    study: 0,
    chores: 0,
    health: 0,
    social: 0,
    other: 0
  };

  tasks.forEach(task => {
    if (result[task.category] !== undefined) {
      result[task.category]++;
    }
  });

  return result;
};

/**
 * Calculate productivity score by mood
 */
export const calculateProductivityByMood = (
  tasks: Task[],
  moods: Mood[]
): Record<string, { count: number; completionRate: number }> => {
  const result: Record<string, { count: number; completionRate: number }> = {};

  // Initialize with common moods
  ['Energetic', 'Happy', 'Calm', 'Tired', 'Stressed', 'Sad', 'Angry', 'Anxious'].forEach(mood => {
    result[mood] = { count: 0, completionRate: 0 };
  });

  // Process each mood entry
  moods.forEach(mood => {
    const moodDate = parseISO(mood.timestamp || '');
    const dayStart = startOfDay(moodDate);
    const dayEnd = endOfDay(moodDate);

    // Find tasks created on the same day as the mood
    const tasksOnMoodDay = tasks.filter(task => {
      const taskDate = parseISO(task.created_at);
      return isWithinInterval(taskDate, { start: dayStart, end: dayEnd });
    });

    if (tasksOnMoodDay.length > 0) {
      const completedTasks = tasksOnMoodDay.filter(task => task.status === 'completed');
      const completionRate = Math.round((completedTasks.length / tasksOnMoodDay.length) * 100);

      if (!result[mood.name]) {
        result[mood.name] = { count: 0, completionRate: 0 };
      }

      result[mood.name].count++;
      // Update the running average of completion rate for this mood
      result[mood.name].completionRate =
        (result[mood.name].completionRate * (result[mood.name].count - 1) + completionRate) /
        result[mood.name].count;
    }
  });

  // Filter out moods with no data
  return Object.fromEntries(
    Object.entries(result).filter(([_, value]) => value.count > 0)
  );
};

/**
 * Get most productive day of the week
 */
export const getMostProductiveDay = (tasks: Task[]): string => {
  const dayStats: Record<string, { total: number; completed: number }> = {
    'Sunday': { total: 0, completed: 0 },
    'Monday': { total: 0, completed: 0 },
    'Tuesday': { total: 0, completed: 0 },
    'Wednesday': { total: 0, completed: 0 },
    'Thursday': { total: 0, completed: 0 },
    'Friday': { total: 0, completed: 0 },
    'Saturday': { total: 0, completed: 0 }
  };

  tasks.forEach(task => {
    const dayOfWeek = format(parseISO(task.created_at), 'EEEE');
    dayStats[dayOfWeek].total++;

    if (task.status === 'completed') {
      dayStats[dayOfWeek].completed++;
    }
  });

  let mostProductiveDay = 'Monday';
  let highestRate = 0;

  Object.entries(dayStats).forEach(([day, stats]) => {
    if (stats.total > 0) {
      const rate = stats.completed / stats.total;
      if (rate > highestRate) {
        highestRate = rate;
        mostProductiveDay = day;
      }
    }
  });

  return mostProductiveDay;
};
