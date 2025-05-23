import { useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import { Recommendation } from '../types/recommendation';
import AuthContext from './AuthContext';
import { format, parseISO } from 'date-fns';
import ErrorBoundary from './ErrorBoundary';
import { getTaskRecommendation } from '../services/gemini';
import { Task } from '../types/task';

interface TaskRecommendationProps {
  taskId: string;
}

const TaskRecommendationContent = ({ taskId }: TaskRecommendationProps) => {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  // Each recommendation manages its own expanded state
  const [expanded, setExpanded] = useState<boolean>(false);
  const { user } = useContext(AuthContext);
  const [taskOwnerId, setTaskOwnerId] = useState<string | null>(null);

  const fetchRecommendation = async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      // First, get the task to check if it's a shared task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) {
        console.error('Error fetching task:', taskError);
        if (isMounted) {
          setError('Could not fetch task details');
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setTaskOwnerId(taskData.user_id);
      }

      console.log('Task owner ID:', taskData.user_id);
      console.log('Current user ID:', user?.id);

      // Get the recommendation
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching recommendation:', error);
        if (isMounted) {
          setError('Could not fetch recommendation');
          setLoading(false);
        }
        return;
      }

      if (data && data.length > 0 && isMounted) {
        console.log('Found recommendation:', data[0]);
        setRecommendation(data[0] as Recommendation);
        setLoading(false);
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
            if (isMounted) {
              setError('Could not fetch shared recommendation');
              setLoading(false);
            }
          } else if (sharedData && sharedData.length > 0 && isMounted) {
            console.log('Found recommendation for shared task:', sharedData[0]);
            setRecommendation(sharedData[0] as Recommendation);
            setLoading(false);
          } else if (isMounted) {
            // No recommendation found, try to generate one if user is the task owner
            if (user && user.id === taskData.user_id) {
              await generateNewRecommendation(taskData);
            } else {
              setLoading(false);
              setError('No recommendation available for this shared task');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in recommendation flow:', error);
      if (isMounted) {
        setError('An unexpected error occurred');
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  };

  const generateNewRecommendation = async (taskData: Task) => {
    if (!user) return;

    setRegenerating(true);
    setError(null);

    try {
      // Get the most recent mood
      const { data: moodData, error: moodError } = await supabase
        .from('moods')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (moodError) {
        throw moodError;
      }

      const currentMood = moodData && moodData.length > 0 ? moodData[0].name : 'neutral';

      // Generate recommendation from Gemini AI
      const result = await getTaskRecommendation(taskData, currentMood);

      // Store the recommendation in Supabase
      const { error: recError, data: newRec } = await supabase
        .from('recommendations')
        .insert([{
          user_id: user.id,
          task_id: taskId,
          recommended_task: result.recommended_task,
          reasoning: result.reasoning,
          suggestion: result.suggestion,
          mood_tip: result.mood_tip,
          mood: currentMood,
          priority_level: result.priority_level,
          estimated_time: result.estimated_time,
          steps: result.steps,
          created_at: new Date().toISOString(),
        }])
        .select();

      if (recError) {
        console.error('Error saving recommendation:', recError);
        throw recError;
      }

      if (newRec && newRec.length > 0) {
        setRecommendation(newRec[0] as Recommendation);
      }
    } catch (error) {
      console.error('Error generating recommendation:', error);
      setError('Failed to generate AI recommendation');
    } finally {
      setRegenerating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    fetchRecommendation();

    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
    };
  }, [taskId]);

  // Check if this is a shared task with non-admin permission
  const [permissionLevel, setPermissionLevel] = useState<string | null>(null);
  const [isSharedTask, setIsSharedTask] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const checkPermission = async () => {
      if (!user || !taskId) return;

      try {
        // First check if this is a shared task
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('user_id')
          .eq('id', taskId)
          .single();

        if (taskError) {
          console.error('Error checking task ownership:', taskError);
          return;
        }

        // If the user is the task owner, they have full access
        if (taskData.user_id === user.id) {
          if (isMounted) {
            setPermissionLevel('admin');
          }
          return;
        }

        // If not the owner, check if it's a shared task
        const { data: shareData, error: shareError } = await supabase
          .from('task_shares')
          .select('permission_level')
          .eq('task_id', taskId)
          .eq('shared_with_id', user.id)
          .eq('status', 'accepted')
          .single();

        if (shareError && shareError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error checking task share permission:', shareError);
          return;
        }

        if (shareData && isMounted) {
          console.log('Found share data with permission level:', shareData.permission_level);
          setIsSharedTask(true);
          setPermissionLevel(shareData.permission_level);
        }
      } catch (err) {
        console.error('Error in checkPermission:', err);
      }
    };

    checkPermission();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, taskId]);

  const handleRegenerateRecommendation = async () => {
    if (!user || !taskId) return;

    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) {
        console.error('Error fetching task for regeneration:', taskError);
        setError('Could not fetch task details');
        return;
      }

      // Only allow regeneration if user is the task owner
      if (taskData.user_id !== user.id) {
        setError('Only the task owner can regenerate recommendations');
        return;
      }

      await generateNewRecommendation(taskData);
    } catch (error) {
      console.error('Error in regeneration flow:', error);
      setError('Failed to regenerate recommendation');
    }
  };

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

  if (regenerating) {
    return (
      <div className="text-sm text-gray-500 py-2">
        <div className="flex items-center">
          <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-primary-500 rounded-full"></div>
          Generating new AI insights...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-gray-500 py-2">
        <div>Error: {error}</div>
        {user && taskOwnerId === user.id && (
          <div className="mt-2">
            <button
              onClick={handleRegenerateRecommendation}
              className="text-xs text-primary-600 hover:text-primary-800 flex items-center"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  // If this is a shared task with non-admin permission, show a message
  if (isSharedTask && permissionLevel !== 'admin') {
    return (
      <div className="text-sm text-gray-500 py-2">
        <div>AI insights are only available to task owners and admins.</div>
        <div className="mt-2 text-xs">
          Your permission level: {permissionLevel || 'unknown'}
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="text-sm text-gray-500 py-2">
        <div>No AI insights available for this task yet.</div>
        {user && taskOwnerId === user.id && (
          <div className="mt-2 flex items-center">
            <button
              onClick={handleRegenerateRecommendation}
              className="text-xs text-primary-600 hover:text-primary-800 flex items-center"
            >
              Generate insights
            </button>
          </div>
        )}
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
        <div className="flex items-center space-x-2">
          {user && taskOwnerId === user.id && (
            <button
              onClick={handleRegenerateRecommendation}
              className="text-xs text-primary-600 hover:text-primary-800 flex items-center"
              title="Regenerate insights"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
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
                  <li key={index}>
                    {typeof step === 'string' ? (
                      step
                    ) : (
                      <div>
                        <div className="font-medium">{step.title}</div>
                        {step.description && (
                          <div className="text-sm mt-1">{step.description}</div>
                        )}
                      </div>
                    )}
                  </li>
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

// Wrapper component with error boundary
const TaskRecommendation = (props: TaskRecommendationProps) => {
  return (
    <ErrorBoundary fallback={
      <div className="text-sm text-gray-500 py-2">
        <div>There was an error loading AI insights for this task.</div>
        <div className="mt-2 text-xs">
          Please try refreshing the page.
        </div>
      </div>
    }>
      <TaskRecommendationContent {...props} />
    </ErrorBoundary>
  );
};

export default TaskRecommendation;
