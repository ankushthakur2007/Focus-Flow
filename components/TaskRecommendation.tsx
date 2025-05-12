import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Recommendation } from '../types/recommendation';
import { format, parseISO } from 'date-fns';

interface TaskRecommendationProps {
  taskId: string;
}

const TaskRecommendation = ({ taskId }: TaskRecommendationProps) => {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Each recommendation manages its own expanded state
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    const fetchRecommendation = async () => {
      setLoading(true);
      try {
        // First, get the task to check if it's a shared task
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('user_id')
          .eq('id', taskId)
          .single();

        if (taskError) {
          console.error('Error fetching task:', taskError);
          throw taskError;
        }

        // Get the recommendation
        const { data, error } = await supabase
          .from('recommendations')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching recommendation:', error);
          throw error;
        }

        if (data && data.length > 0) {
          setRecommendation(data[0] as Recommendation);
        } else {
          // If no recommendation found, check if this is a shared task
          // and try to fetch the recommendation using the task owner's user_id
          if (taskData) {
            console.log('Trying to fetch recommendation for shared task with owner ID:', taskData.user_id);

            const { data: sharedData, error: sharedError } = await supabase
              .from('recommendations')
              .select('*')
              .eq('task_id', taskId)
              .eq('user_id', taskData.user_id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (sharedError) {
              console.error('Error fetching shared recommendation:', sharedError);
            } else if (sharedData && sharedData.length > 0) {
              console.log('Found recommendation for shared task:', sharedData[0]);
              setRecommendation(sharedData[0] as Recommendation);
            }
          }
        }
      } catch (error) {
        console.error('Error in recommendation flow:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendation();
  }, [taskId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <div className="animate-pulse flex space-x-2">
          <div className="h-2 w-2 bg-primary-500 rounded-full"></div>
          <div className="h-2 w-2 bg-primary-500 rounded-full"></div>
          <div className="h-2 w-2 bg-primary-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="text-sm text-gray-500 py-2">
        No AI insights available for this task yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
          <span className="mr-2">✨</span>
          AI Insights
        </h4>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary-600 hover:text-primary-800 flex items-center"
        >
          {expanded ? 'Hide details' : 'Show details'}
          <svg
            className={`w-3 h-3 ml-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className={`transition-all duration-300 overflow-hidden ${expanded ? 'max-h-screen opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-md text-sm">
          <div className="mb-2">
            <span className="font-medium">Why it matters:</span> {recommendation.reasoning}
          </div>

          {recommendation.priority_level && (
            <div className="mb-2 flex items-center">
              <span className="font-medium mr-2">Priority:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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
            <div className="mb-2">
              <span className="font-medium">Estimated time:</span> {recommendation.estimated_time}
            </div>
          )}

          <div className="mb-2">
            <span className="font-medium">Suggestion:</span> {recommendation.suggestion}
          </div>

          {recommendation.steps && recommendation.steps.length > 0 && (
            <div className="mb-2">
              <span className="font-medium">Steps:</span>
              <ol className="list-decimal pl-5 mt-1 space-y-1">
                {recommendation.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="mb-2">
            <span className="font-medium">Mood tip:</span> {recommendation.mood_tip}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 flex flex-wrap justify-between items-center gap-2">
            <span className="whitespace-nowrap">Based on mood: {recommendation.mood}</span>
            {recommendation.created_at && (
              <span className="whitespace-nowrap text-right">
                {format(parseISO(recommendation.created_at), 'MMM d, h:mm a')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskRecommendation;
