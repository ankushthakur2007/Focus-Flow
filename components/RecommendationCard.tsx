import { Recommendation } from '../types/recommendation';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onRefresh: () => void;
  loading: boolean;
}

const RecommendationCard = ({ recommendation, onRefresh, loading }: RecommendationCardProps) => {
  // Track expanded sections independently for each card
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    why: false,
    approach: false,
    mood: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-primary-600 dark:bg-primary-800 p-4 text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Recommended Task</h2>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-full hover:bg-primary-500 dark:hover:bg-primary-700 transition-colors"
            title="Generate new recommendation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        <p className="text-lg mt-2 font-medium">
          {recommendation.recommended_task}
        </p>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {/* Why This Task? Section */}
        <div className="cursor-pointer">
          <div
            className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => toggleSection('why')}
          >
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">
              Why This Task?
            </h3>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.why ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className={`px-4 pb-4 ${expandedSections.why ? 'block' : 'hidden'}`}>
            <p className="text-gray-600 dark:text-gray-400">
              {recommendation.reasoning}
            </p>
          </div>
        </div>

        {/* Suggested Approach Section */}
        <div className="cursor-pointer">
          <div
            className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => toggleSection('approach')}
          >
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 flex items-center">
              <span className="mr-2">💡</span>
              Suggested Approach
            </h3>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.approach ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className={`px-4 pb-4 ${expandedSections.approach ? 'block' : 'hidden'}`}>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
              {recommendation.suggestion}
            </p>
          </div>
        </div>

        {/* Mood Tip Section */}
        <div className="cursor-pointer">
          <div
            className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => toggleSection('mood')}
          >
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 flex items-center">
              <span className="mr-2">🧠</span>
              Mood Tip
            </h3>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.mood ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className={`px-4 pb-4 ${expandedSections.mood ? 'block' : 'hidden'}`}>
            <p className="text-gray-600 dark:text-gray-400">
              {recommendation.mood_tip}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center">
              <div className="mr-2">
                Based on mood: <span className="font-medium">{recommendation.mood || 'neutral'}</span>
              </div>

              {recommendation.task_id && (
                <a
                  href={`/chat/${recommendation.task_id}`}
                  className="text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 flex items-center ml-2"
                  title="Chat about this task"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Chat</span>
                </a>
              )}
            </div>

            {recommendation.created_at && (
              <div className="text-right whitespace-nowrap">
                Generated: {format(parseISO(recommendation.created_at), 'MMM d, h:mm a')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;
