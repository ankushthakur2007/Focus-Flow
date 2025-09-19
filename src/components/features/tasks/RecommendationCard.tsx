import { Recommendation } from '../../../lib/types/recommendation';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import TouchFriendlyButton from '../../ui/TouchFriendlyButton';

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
    mood: false,
    steps: false,
    details: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Header */}
      <div className="bg-primary-600 dark:bg-primary-800 p-4 text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Recommended Task</h2>
          <TouchFriendlyButton
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-full hover:bg-primary-500 dark:hover:bg-primary-700 transition-colors"
            title="Generate new recommendation"
            ariaLabel="Refresh recommendation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`}
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
          </TouchFriendlyButton>
        </div>
        <p className="text-lg mt-2 font-medium break-words">
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
            <h3 className="text-base sm:text-md font-semibold text-gray-700 dark:text-gray-300">
              Why This Task?
            </h3>
            <svg
              className={`w-6 h-6 sm:w-5 sm:h-5 text-gray-500 transition-transform ${expandedSections.why ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className={`px-4 pb-4 ${expandedSections.why ? 'block' : 'hidden'}`}>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-sm">
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

        {/* Step-by-Step Guide Section */}
        {recommendation.steps && recommendation.steps.length > 0 && (
          <div className="cursor-pointer">
            <div
              className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750"
              onClick={() => toggleSection('steps')}
            >
              <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <span className="mr-2">📋</span>
                Step-by-Step Guide
              </h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.steps ? 'transform rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <div className={`px-4 pb-4 ${expandedSections.steps ? 'block' : 'hidden'}`}>
              <ol className="list-decimal pl-5 space-y-2 text-gray-600 dark:text-gray-400">
                {recommendation.steps.map((step, index) => (
                  <li key={index} className="pl-1">{step}</li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Task Details Section */}
        <div className="cursor-pointer">
          <div
            className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => toggleSection('details')}
          >
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 flex items-center">
              <span className="mr-2">⏱️</span>
              Task Details
            </h3>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.details ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className={`px-4 pb-4 ${expandedSections.details ? 'block' : 'hidden'}`}>
            <div className="flex flex-col space-y-2">
              {recommendation.priority_level && (
                <div className="flex items-center">
                  <span className="font-medium mr-2">Priority:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    recommendation.priority_level.toLowerCase() === 'high'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      : recommendation.priority_level.toLowerCase() === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  }`}>
                    {recommendation.priority_level}
                  </span>
                </div>
              )}

              {recommendation.estimated_time && (
                <div className="flex items-center">
                  <span className="font-medium mr-2">Estimated Time:</span>
                  <span className="text-gray-600 dark:text-gray-400">{recommendation.estimated_time}</span>
                </div>
              )}
            </div>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
              <div className="flex items-center">
                <span className="mr-1">🎭</span>
                <span>Mood: <span className="font-medium">{recommendation.mood || 'neutral'}</span></span>
              </div>

              {recommendation.task_id && (
                <TouchFriendlyButton
                  onClick={() => window.location.href = `/chat/${recommendation.task_id}`}
                  className="text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 flex items-center px-3 py-2 sm:px-2 sm:py-1 rounded-md hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors"
                  title="Chat about this task"
                  ariaLabel="Chat about this task"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 sm:h-4 sm:w-4 mr-2 sm:mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Chat about this task</span>
                </TouchFriendlyButton>
              )}
            </div>

            {recommendation.created_at && (
              <div className="text-left sm:text-right whitespace-nowrap mt-2 sm:mt-0">
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generated: {format(parseISO(recommendation.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;
