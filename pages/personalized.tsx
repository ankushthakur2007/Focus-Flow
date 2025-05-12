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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Personalized Recommendations</h1>
        <button
          className="btn btn-primary"
          onClick={() => fetchRecommendations(true)}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh All'}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
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
    </div>
  );
};

export default PersonalizedPage;
