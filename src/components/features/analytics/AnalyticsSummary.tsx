import { Task } from '../../../lib/types/task';
import { Mood } from '../../../lib/types/mood';
import { calculateCompletionRate, DailyAnalytics } from '../../../lib/services/analytics';

interface AnalyticsSummaryProps {
  tasks: Task[];
  moods: Mood[];
  timeRange: string;
  dailyAnalytics?: DailyAnalytics[];
}

const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ tasks, moods, timeRange, dailyAnalytics = [] }) => {
  // Calculate summary statistics - use analytics table data if available
  let completionRate = calculateCompletionRate(tasks);
  let totalTasks = tasks.length;
  let completedTasks = tasks.filter(task => task.status === 'completed').length;
  let inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  let pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const totalMoods = moods.length;

  // If we have analytics data, use that instead
  if (dailyAnalytics && dailyAnalytics.length > 0) {
    // Sum up the values from all daily analytics
    totalTasks = dailyAnalytics.reduce((sum, day) => sum + day.total_tasks, 0);
    completedTasks = dailyAnalytics.reduce((sum, day) => sum + day.completed_tasks, 0);
    inProgressTasks = dailyAnalytics.reduce((sum, day) => sum + day.in_progress_tasks, 0);
    pendingTasks = dailyAnalytics.reduce((sum, day) => sum + day.pending_tasks, 0);

    // Calculate the overall completion rate
    completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  // Get time range display text
  const getTimeRangeText = () => {
    switch (timeRange) {
      case '7days': return 'the last 7 days';
      case '30days': return 'the last 30 days';
      case '90days': return 'the last 90 days';
      case 'all': return 'all time';
      default: return 'the selected period';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Completion Rate */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
            <h3 className="text-3xl font-bold mt-1">{completionRate}%</h3>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          For {getTimeRangeText()}
        </p>
      </div>

      {/* Total Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
            <h3 className="text-3xl font-bold mt-1">{totalTasks}</h3>
          </div>
          <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>{completedTasks} completed</span>
          <span>{inProgressTasks} in progress</span>
          <span>{pendingTasks} pending</span>
        </div>
      </div>

      {/* Mood Entries */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mood Entries</p>
            <h3 className="text-3xl font-bold mt-1">{totalMoods}</h3>
          </div>
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          For {getTimeRangeText()}
        </p>
      </div>

      {/* Productivity Score */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Productivity Score</p>
            <h3 className="text-3xl font-bold mt-1">
              {completedTasks > 0 ? Math.round((completedTasks / (totalTasks || 1)) * 100) : 0}
            </h3>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Based on task completion
        </p>
      </div>
    </div>
  );
};

export default AnalyticsSummary;
