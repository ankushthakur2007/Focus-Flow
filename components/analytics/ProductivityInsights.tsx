import { useState, useEffect } from 'react';
import { ArrowPathIcon as RefreshIcon } from '@heroicons/react/24/outline';
import { LightBulbIcon, ClockIcon, ChartBarIcon, TagIcon, FaceSmileIcon as EmojiHappyIcon } from '@heroicons/react/24/solid';
import { fetchProductivityInsights, generateProductivityInsights, ProductivityInsight } from '../../services/analytics';

interface ProductivityInsightsProps {
  timeRange: string;
  isLoading: boolean;
}

const ProductivityInsights: React.FC<ProductivityInsightsProps> = ({ timeRange, isLoading }) => {
  const [insights, setInsights] = useState<ProductivityInsight[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    const loadInsights = async () => {
      try {
        setError(null);
        const data = await fetchProductivityInsights(timeRange);
        setInsights(data);
      } catch (err) {
        console.error('Error loading productivity insights:', err);
        setError('Failed to load productivity insights');
      }
    };

    loadInsights();
  }, [timeRange, isLoading]);

  const handleRefreshInsights = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const data = await generateProductivityInsights(timeRange);
      setInsights(data);
    } catch (err) {
      console.error('Error generating productivity insights:', err);
      setError('Failed to generate new insights');
    } finally {
      setRefreshing(false);
    }
  };

  // Helper function to get icon based on insight type
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'productivity':
        return <ChartBarIcon className="h-5 w-5 text-blue-500" />;
      case 'time':
        return <ClockIcon className="h-5 w-5 text-green-500" />;
      case 'category':
        return <TagIcon className="h-5 w-5 text-purple-500" />;
      case 'mood':
        return <EmojiHappyIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <LightBulbIcon className="h-5 w-5 text-amber-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Productivity Insights</h2>
        <button
          onClick={handleRefreshInsights}
          disabled={refreshing}
          className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30 transition-colors duration-200 disabled:opacity-50"
          aria-label="Refresh insights"
        >
          <RefreshIcon className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Insights'}
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-md">
          {error}
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <LightBulbIcon className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" />
          <p className="mb-2">No insights available yet</p>
          <p className="text-sm">Complete more tasks to generate personalized insights</p>
        </div>
      ) : (
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Based on your task completion patterns and mood data, here are some insights:
          </p>
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex-shrink-0 mr-3 mt-0.5">
                  {getInsightIcon(insight.type)}
                </div>
                <div>
                  <p className="text-gray-800 dark:text-gray-200 m-0">{insight.text}</p>
                  {insight.recommendation && (
                    <p className="text-primary-600 dark:text-primary-400 text-sm mt-1 mb-0">
                      <strong>Tip:</strong> {insight.recommendation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductivityInsights;
