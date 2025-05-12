import { useState, useEffect, useContext } from 'react';
import { Task, TaskShare } from '../types/task';
import { getTasksSharedWithMe, getPendingTaskShares, respondToTaskShare } from '../services/taskSharing';
import TaskCard from './TaskCard';
import AuthContext from './AuthContext';
import { supabase } from '../services/supabase';

const SharedTasksSection: React.FC = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [sharedTasks, setSharedTasks] = useState<Task[]>([]);
  const [pendingShares, setPendingShares] = useState<TaskShare[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showPending, setShowPending] = useState<boolean>(false);

  useEffect(() => {
    // Only load tasks when user is authenticated
    if (user && !authLoading) {
      loadSharedTasks();
    }
  }, [user, authLoading]);

  const loadSharedTasks = async () => {
    if (!user) {
      console.error('Cannot load shared tasks: User not authenticated');
      setError('You must be logged in to view shared tasks');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Loading shared tasks for user:', user.id);

      // Check if the session is valid
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found');
      }

      const [tasks, pending] = await Promise.all([
        getTasksSharedWithMe(),
        getPendingTaskShares()
      ]);

      console.log('Loaded shared tasks:', tasks.length);
      console.log('Loaded pending shares:', pending.length);

      setSharedTasks(tasks);
      setPendingShares(pending);
    } catch (err) {
      console.error('Error loading shared tasks:', err);
      setError('Failed to load shared tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToShare = async (taskShareId: string, response: 'accepted' | 'rejected') => {
    if (!user) {
      console.error('Cannot respond to task share: User not authenticated');
      setError('You must be logged in to respond to task shares');
      return;
    }

    setLoading(true);

    try {
      console.log(`Responding to task share ${taskShareId} with ${response}`);
      await respondToTaskShare(taskShareId, response);
      console.log('Response successful, reloading data');
      // Reload the data
      loadSharedTasks();
    } catch (err) {
      console.error('Error responding to task share:', err);
      setError('Failed to respond to task share');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-md">
          <h3 className="font-bold mb-2">Error</h3>
          <p>{error}</p>
          {!user && (
            <p className="mt-2 text-sm">
              Please make sure you are logged in. You may need to refresh the page or log in again.
            </p>
          )}
          <div className="mt-4 flex space-x-3">
            <button
              onClick={loadSharedTasks}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      {pendingShares.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Pending Task Invitations</h2>
            <button
              onClick={() => setShowPending(!showPending)}
              className="text-sm font-medium text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {showPending ? 'Hide' : 'Show'} ({pendingShares.length})
            </button>
          </div>

          {showPending && (
            <div className="space-y-4">
              {pendingShares.map((share) => (
                <div key={share.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{share.tasks?.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {share.tasks?.description?.substring(0, 100)}
                        {share.tasks?.description && share.tasks.description.length > 100 ? '...' : ''}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Shared by: {share.profiles?.name || share.profiles?.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Permission: {share.permission_level === 'view'
                          ? 'View Only'
                          : share.permission_level === 'edit'
                          ? 'Can Edit'
                          : 'Admin'}
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRespondToShare(share.id, 'accepted')}
                        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md"
                        disabled={loading}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespondToShare(share.id, 'rejected')}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md"
                        disabled={loading}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Shared With Me</h2>

        {sharedTasks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No tasks have been shared with you yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={() => loadSharedTasks()}
                onDelete={() => loadSharedTasks()}
                isShared={true}
                sharedBy={task.shared_by}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedTasksSection;
