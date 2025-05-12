import { useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import AuthContext from '../components/AuthContext';
import { Task } from '../types/task';
import { Mood } from '../types/mood';
import { Recommendation } from '../types/recommendation';
import { getRecommendation, getTaskRecommendation } from '../services/gemini';
import RecommendationCard from '../components/RecommendationCard';

const PersonalizedPage = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const { user } = useContext(AuthContext);

  const fetchRecommendations = async (forceRefresh = false) => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // Get user's tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'completed')
        .order('status', { ascending: true })
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      const tasks: Task[] = tasksData || [];

      if (tasks.length === 0) {
        setLoading(false);
        setRecommendations([]);
        return;
      }

      // Get user's most recent mood
      const { data: moodsData, error: moodsError } = await supabase
        .from('moods')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (moodsError) throw moodsError;

      let currentMood = 'neutral';
      if (moodsData && moodsData.length > 0) {
        const mood = moodsData[0] as Mood;
        currentMood = mood.name;
      }

      // If not forcing a refresh, check if we already have recommendations in Supabase
      if (!forceRefresh) {
        console.log('Checking for existing recommendations...');

        // Get recommendations from Supabase
        const { data: existingRecs, error: recsError } = await supabase
          .from('recommendations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (recsError) {
          console.error('Error fetching existing recommendations:', recsError);
        } else if (existingRecs && existingRecs.length > 0) {
          // We found existing recommendations, use them
          console.log('Found existing recommendations, using them instead of generating new ones');

          // Group recommendations by task_id to get the most recent for each task
          const taskRecommendations = new Map<string, Recommendation>();

          existingRecs.forEach(rec => {
            if (rec.task_id && !taskRecommendations.has(rec.task_id)) {
              taskRecommendations.set(rec.task_id, {
                id: rec.id,
                task_id: rec.task_id,
                recommended_task: rec.recommended_task,
                reasoning: rec.reasoning,
                suggestion: rec.suggestion,
                mood_tip: rec.mood_tip,
                mood: rec.mood,
                priority_level: rec.priority_level,
                estimated_time: rec.estimated_time,
                steps: rec.steps,
                created_at: rec.created_at
              });
            }
          });

          // Convert map to array
          const recommendationsArray = Array.from(taskRecommendations.values());

          // If we have recommendations, use them
          if (recommendationsArray.length > 0) {
            setRecommendations(recommendationsArray);
            setLoading(false);
            return; // Exit early, no need to generate new recommendations
          }

          console.log('No task-specific recommendations found, will generate new ones');
        } else {
          console.log('No existing recommendations found, generating new ones');
        }
      } else {
        console.log('Forcing refresh of recommendations');
      }

      // Generate recommendations for each task
      const newRecommendations: Recommendation[] = [];

      // Process tasks in batches to avoid overwhelming the API
      const batchSize = 3;
      const taskBatches = [];

      for (let i = 0; i < Math.min(tasks.length, 9); i += batchSize) {
        taskBatches.push(tasks.slice(i, i + batchSize));
      }

      for (const taskBatch of taskBatches) {
        const batchPromises = taskBatch.map(async (task) => {
          try {
            // Generate recommendation for this task
            console.log(`Generating recommendation for task: ${task.title}`);

            // Get recommendation from Gemini AI
            const result = await getTaskRecommendation(task, currentMood);

            if (result.recommended_task !== 'Unable to connect to AI service') {
              // Create recommendation object
              const recommendation: Recommendation = {
                task_id: task.id,
                recommended_task: task.title,
                reasoning: result.reasoning,
                suggestion: result.suggestion,
                mood_tip: result.mood_tip,
                mood: currentMood,
                priority_level: result.priority_level,
                estimated_time: result.estimated_time,
                steps: result.steps,
                created_at: new Date().toISOString()
              };

              // Save to Supabase
              const { error: recError } = await supabase
                .from('recommendations')
                .insert([{
                  user_id: user.id,
                  task_id: task.id,
                  recommended_task: task.title,
                  reasoning: result.reasoning,
                  suggestion: result.suggestion,
                  mood_tip: result.mood_tip,
                  mood: currentMood,
                  priority_level: result.priority_level,
                  estimated_time: result.estimated_time,
                  steps: result.steps,
                  created_at: new Date().toISOString(),
                }]);

              if (recError) {
                console.error(`Error saving recommendation for task ${task.title}:`, recError);
              } else {
                console.log(`Successfully saved recommendation for task ${task.title}`);
              }

              return recommendation;
            }
          } catch (error) {
            console.error(`Error generating recommendation for task ${task.title}:`, error);
          }
          return null;
        });

        // Wait for all recommendations in this batch
        const batchResults = await Promise.all(batchPromises);

        // Add valid recommendations to our array
        batchResults.forEach(result => {
          if (result) newRecommendations.push(result);
        });

        // Small delay between batches to avoid rate limiting
        if (taskBatches.indexOf(taskBatch) < taskBatches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (newRecommendations.length === 0) {
        setError('Failed to generate recommendations. Please try again later.');
      } else {
        setRecommendations(newRecommendations);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError('Failed to get recommendations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  // Function to refresh a specific recommendation
  const refreshSingleRecommendation = async (taskId: string) => {
    if (!user) return;

    // Find the task in Supabase
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !taskData) {
      console.error('Error fetching task for refresh:', taskError);
      return;
    }

    // Get current mood
    const { data: moodData, error: moodError } = await supabase
      .from('moods')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);

    const currentMood = moodData && moodData.length > 0
      ? moodData[0].name
      : 'neutral';

    try {
      // Generate new recommendation
      const result = await getTaskRecommendation(taskData, currentMood);

      if (result.recommended_task !== 'Unable to connect to AI service') {
        // Save to Supabase
        const { error: recError } = await supabase
          .from('recommendations')
          .insert([{
            user_id: user.id,
            task_id: taskId,
            recommended_task: taskData.title,
            reasoning: result.reasoning,
            suggestion: result.suggestion,
            mood_tip: result.mood_tip,
            mood: currentMood,
            priority_level: result.priority_level,
            estimated_time: result.estimated_time,
            steps: result.steps,
            created_at: new Date().toISOString(),
          }]);

        if (recError) {
          console.error('Error saving refreshed recommendation:', recError);
        } else {
          // Update the recommendations in state
          setRecommendations(prevRecs => {
            const newRecs = [...prevRecs];
            const index = newRecs.findIndex(r => r.task_id === taskId);

            if (index !== -1) {
              newRecs[index] = {
                ...newRecs[index],
                reasoning: result.reasoning,
                suggestion: result.suggestion,
                mood_tip: result.mood_tip,
                mood: currentMood,
                priority_level: result.priority_level,
                estimated_time: result.estimated_time,
                steps: result.steps,
                created_at: new Date().toISOString()
              };
            }

            return newRecs;
          });
        }
      }
    } catch (error) {
      console.error('Error refreshing recommendation:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Personalized Recommendations</h1>
        <button
          className="btn btn-primary w-full sm:w-auto"
          onClick={() => fetchRecommendations(true)}
          disabled={loading}
        >
          <span className="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            {loading ? 'Loading...' : 'Refresh All'}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Analyzing your tasks and mood...</p>
        </div>
      ) : error ? (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="text-red-500 mb-6 text-lg">{error}</div>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            There was a problem connecting to the AI service. Please check your connection and try again.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => fetchRecommendations(true)}
          >
            Try Again
          </button>
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map(recommendation => (
            <RecommendationCard
              key={recommendation.task_id || recommendation.id}
              recommendation={recommendation}
              onRefresh={() => recommendation.task_id
                ? refreshSingleRecommendation(recommendation.task_id)
                : fetchRecommendations(true)
              }
              loading={loading}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No recommendations available
          </p>
          <button
            className="btn btn-primary"
            onClick={() => fetchRecommendations(true)}
          >
            Generate Recommendations
          </button>
        </div>
      )}

      {/* Fixed Refresh Button for Mobile */}
      {recommendations.length > 0 && (
        <div className="fixed bottom-6 right-6 md:hidden z-10">
          <button
            className="btn btn-primary rounded-full w-14 h-14 shadow-lg flex items-center justify-center"
            onClick={() => fetchRecommendations(true)}
            disabled={loading}
            aria-label="Refresh Recommendations"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonalizedPage;
