import { useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import AuthContext from '../components/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import { Task } from '../types/task';
import { getTaskRecommendation } from '../services/gemini';

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      setLoading(true);

      try {
        let query = supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        setTasks(data || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Set up realtime subscription
    const subscription = supabase
      .channel('public:tasks')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, filter]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleAddTask = async (
    title: string,
    description: string,
    priority: string,
    category: string
  ) => {
    if (!user) return;

    try {
      // First, insert the task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          title,
          description,
          priority,
          category,
          status: 'pending',
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select();

      if (taskError) throw taskError;

      // Get the most recent mood
      const { data: moodData, error: moodError } = await supabase
        .from('moods')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (moodError) throw moodError;

      // If we have a task and description, get AI recommendation
      if (taskData && taskData.length > 0 && description) {
        const task = taskData[0];
        const currentMood = moodData && moodData.length > 0 ? moodData[0].name : 'neutral';

        // Get recommendation from Gemini AI
        try {
          const recommendation = await getTaskRecommendation(task, currentMood);

          // Store the recommendation in Supabase
          if (recommendation) {
            const { error: recError } = await supabase
              .from('recommendations')
              .insert([{
                user_id: user.id,
                task_id: task.id,
                recommended_task: recommendation.recommended_task,
                reasoning: recommendation.reasoning,
                suggestion: recommendation.suggestion,
                mood_tip: recommendation.mood_tip,
                mood: currentMood,
                created_at: new Date().toISOString(),
              }]);

            if (recError) console.error('Error saving recommendation:', recError);
          }
        } catch (aiError) {
          console.error('Error getting AI recommendation:', aiError);
        }
      }

      setShowForm(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add Task'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <TaskForm onSubmit={handleAddTask} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        <button
          className={`btn ${
            filter === 'all' ? 'btn-primary' : 'btn-secondary'
          }`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`btn ${
            filter === 'pending' ? 'btn-primary' : 'btn-secondary'
          }`}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button
          className={`btn ${
            filter === 'in_progress' ? 'btn-primary' : 'btn-secondary'
          }`}
          onClick={() => setFilter('in_progress')}
        >
          In Progress
        </button>
        <button
          className={`btn ${
            filter === 'completed' ? 'btn-primary' : 'btn-secondary'
          }`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No tasks found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TasksPage;
