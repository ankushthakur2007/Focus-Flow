import { useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import AuthContext from '../components/AuthContext';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { Task } from '../types/task';
import { Mood } from '../types/mood';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import {
  fetchTaskAnalytics,
  fetchMoodAnalytics,
  fetchDailyAnalytics,
  fetchMoodAnalytics2,
  fetchCategoryAnalytics,
  DailyAnalytics,
  MoodAnalytics,
  CategoryAnalytics,
  ProductivityInsight
} from '../services/analytics';
import TaskCompletionChart from '../components/analytics/TaskCompletionChart';
import ProductivityTrendChart from '../components/analytics/ProductivityTrendChart';
import MoodCorrelationChart from '../components/analytics/MoodCorrelationChart';
import CategoryDistributionChart from '../components/analytics/CategoryDistributionChart';
import AnalyticsSummary from '../components/analytics/AnalyticsSummary';
import ProductivityInsights from '../components/analytics/ProductivityInsights';

type TimeRange = '7days' | '30days' | '90days' | 'all';

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalytics[]>([]);
  const [moodAnalytics, setMoodAnalytics] = useState<MoodAnalytics[]>([]);
  const [categoryAnalytics, setCategoryAnalytics] = useState<CategoryAnalytics[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch analytics data from the new tables
        const [tasksData, moodsData, dailyData, moodAnalyticsData, categoryData] = await Promise.all([
          fetchTaskAnalytics(timeRange),
          fetchMoodAnalytics(timeRange),
          fetchDailyAnalytics(timeRange),
          fetchMoodAnalytics2(timeRange),
          fetchCategoryAnalytics(timeRange)
        ]);

        setTasks(tasksData);
        setMoods(moodsData);
        setDailyAnalytics(dailyData);
        setMoodAnalytics(moodAnalyticsData);
        setCategoryAnalytics(categoryData);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, timeRange]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  if (!user) {
    return (
      <ResponsiveContainer className="py-8">
        <div className="text-center py-12">
          <p>Please log in to view your analytics.</p>
        </div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer className="py-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Task Analytics & Insights</h1>

        <div className="flex space-x-2 w-full sm:w-auto">
          <select
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value as TimeRange)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm w-full sm:w-auto"
            aria-label="Select time range"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading analytics data...</p>
        </div>
      ) : error ? (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="text-red-500 mb-6 text-lg">{error}</div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setTimeRange(timeRange); // Trigger a refresh
            }}
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Analytics Summary */}
          <AnalyticsSummary
            tasks={tasks}
            moods={moods}
            timeRange={timeRange}
            dailyAnalytics={dailyAnalytics}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Task Completion Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Task Completion Rate</h2>
              <TaskCompletionChart
                tasks={tasks}
                timeRange={timeRange}
                dailyAnalytics={dailyAnalytics}
              />
            </div>

            {/* Productivity Trend Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Productivity Trend</h2>
              <ProductivityTrendChart
                tasks={tasks}
                timeRange={timeRange}
                dailyAnalytics={dailyAnalytics}
              />
            </div>

            {/* Mood Correlation Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Mood & Productivity Correlation</h2>
              <MoodCorrelationChart
                tasks={tasks}
                moods={moods}
                timeRange={timeRange}
                moodAnalytics={moodAnalytics}
              />
            </div>

            {/* Category Distribution Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Task Category Distribution</h2>
              <CategoryDistributionChart
                tasks={tasks}
                timeRange={timeRange}
                categoryAnalytics={categoryAnalytics}
              />
            </div>
          </div>

          {/* Productivity Insights */}
          <ProductivityInsights
            timeRange={timeRange}
            isLoading={loading}
          />
        </>
      )}
    </ResponsiveContainer>
  );
};

export default AnalyticsPage;
