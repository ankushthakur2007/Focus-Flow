import { useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import AuthContext from '../components/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import { Task } from '../types/task';
import { getTaskRecommendation } from '../services/gemini';
import { getTasksSharedWithMe } from '../services/taskSharing';

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sharedTasks, setSharedTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'my' | 'shared'>('my');
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;

    const fetchTasks = async () => {
      if (!isMounted) return;
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

        if (isMounted) {
          setTasks(data || []);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const fetchSharedTasks = async () => {
      if (!isMounted) return;
      setLoading(true);

      try {
        const sharedTasksData = await getTasksSharedWithMe();

        // Apply filter if needed
        let filteredTasks = sharedTasksData;
        if (filter !== 'all') {
          filteredTasks = sharedTasksData.filter(task => task.status === filter);
        }

        if (isMounted) {
          setSharedTasks(filteredTasks);
        }
      } catch (error) {
        console.error('Error fetching shared tasks:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Fetch the appropriate tasks based on the current view
    if (view === 'my') {
      fetchTasks();
    } else {
      fetchSharedTasks();
    }

    // Set up realtime subscription for my tasks
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
          if (view === 'my' && isMounted) {
            fetchTasks();
          }
        }
      )
      .subscribe();

    // Set up realtime subscription for task_shares
    const sharesSubscription = supabase
      .channel('public:task_shares')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_shares',
          filter: `shared_with_id=eq.${user.id}`
        },
        () => {
          if (view === 'shared' && isMounted) {
            fetchSharedTasks();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      sharesSubscription.unsubscribe();
    };
  }, [user, filter, view]);

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
    <div className="container mx-auto px-4 py-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {view === 'my' && (
          <button
            className="btn btn-primary w-full sm:w-auto"
            onClick={() => setShowForm(!showForm)}
          >
            <span className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              {showForm ? 'Cancel' : 'Add Task'}
            </span>
          </button>
        )}
      </div>

      {showForm && view === 'my' && (
        <div className="mb-6">
          <TaskForm onSubmit={handleAddTask} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* View Toggle */}
      <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            view === 'my'
              ? 'bg-white dark:bg-gray-800 shadow-sm'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => setView('my')}
        >
          My Tasks
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            view === 'shared'
              ? 'bg-white dark:bg-gray-800 shadow-sm'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={() => setView('shared')}
        >
          Shared With Me
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
        <button
          className={`btn ${
            filter === 'all' ? 'btn-primary' : 'btn-secondary'
          } flex-1 min-w-[80px] sm:flex-none`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`btn ${
            filter === 'pending' ? 'btn-primary' : 'btn-secondary'
          } flex-1 min-w-[80px] sm:flex-none`}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button
          className={`btn ${
            filter === 'in_progress' ? 'btn-primary' : 'btn-secondary'
          } flex-1 min-w-[80px] sm:flex-none`}
          onClick={() => setFilter('in_progress')}
        >
          In Progress
        </button>
        <button
          className={`btn ${
            filter === 'completed' ? 'btn-primary' : 'btn-secondary'
          } flex-1 min-w-[80px] sm:flex-none`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (view === 'my' && tasks.length === 0) || (view === 'shared' && sharedTasks.length === 0) ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {view === 'my' ? (
            <>
              <p className="text-gray-500 dark:text-gray-400 mb-4">No tasks found</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                Create your first task
              </button>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 mb-4">No tasks have been shared with you yet</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {view === 'my' ? (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
              />
            ))
          ) : (
            sharedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
                isShared={true}
                sharedBy={task.shared_by}
              />
            ))
          )}
        </div>
      )}

      {/* Fixed Add Button for Mobile */}
      {view === 'my' && (
        <div className="fixed bottom-6 right-6 md:hidden z-10">
          <button
            className="btn btn-primary rounded-full w-14 h-14 shadow-lg flex items-center justify-center"
            onClick={() => setShowForm(true)}
            aria-label="Add Task"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
