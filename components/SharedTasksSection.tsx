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
  const [respondingShares, setRespondingShares] = useState<Record<string, boolean>>({});

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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication error: ' + sessionError.message);
      }

      if (!session) {
        console.error('No active session found');
        throw new Error('Your session has expired. Please log in again.');
      }

      console.log('Session is valid, expires at:', session.expires_at);

      // Load tasks and pending shares in sequence to better isolate errors
      let tasks: Task[] = [];
      let pending: TaskShare[] = [];

      try {
        console.log('Fetching shared tasks...');
        tasks = await getTasksSharedWithMe();
        console.log('Loaded shared tasks:', tasks.length);
      } catch (taskErr: any) {
        console.error('Error loading shared tasks:', taskErr);
        throw new Error(`Failed to load shared tasks: ${taskErr.message || 'Unknown error'}`);
      }

      try {
        console.log('Fetching pending shares...');
        pending = await getPendingTaskShares();
        console.log('Loaded pending shares:', pending.length);
      } catch (pendingErr: any) {
        console.error('Error loading pending shares:', pendingErr);
        // Don't throw here, we can still show shared tasks even if pending fails
        // Just use an empty array for pending shares
      }

      setSharedTasks(tasks);
      setPendingShares(pending);
    } catch (err: any) {
      console.error('Error in loadSharedTasks:', err);
      setError(err.message || 'Failed to load shared tasks');

      // If it's an authentication error, suggest refreshing the page
      if (err.message && (
        err.message.includes('authentication') ||
        err.message.includes('session') ||
        err.message.includes('log in')
      )) {
        setError(`Authentication error: ${err.message}. Please refresh the page or log in again.`);
      }
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

    // Set loading state for this specific share
    setRespondingShares(prev => ({ ...prev, [taskShareId]: true }));
    setError(null);

    try {
      console.log(`Responding to task share ${taskShareId} with ${response}`);

      // Check if the session is valid before proceeding
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication error: ' + sessionError.message);
      }

      if (!session) {
        console.error('No active session found');
        throw new Error('Your session has expired. Please log in again.');
      }

      // Get the task share details before updating
      const { data: shareBeforeUpdate, error: fetchError } = await supabase
        .from('task_shares')
        .select('*')
        .eq('id', taskShareId)
        .single();

      if (fetchError) {
        console.error('Error fetching task share before update:', fetchError);
      } else {
        console.log('Task share before update:', shareBeforeUpdate);
      }

      // Attempt to respond to the task share
      await respondToTaskShare(taskShareId, response);
      console.log('Response successful, reloading data');

      // Get the task share details after updating to verify
      const { data: shareAfterUpdate, error: verifyError } = await supabase
        .from('task_shares')
        .select('*')
        .eq('id', taskShareId)
        .single();

      if (verifyError) {
        console.error('Error fetching task share after update:', verifyError);
      } else {
        console.log('Task share after update:', shareAfterUpdate);
      }

      // Reload the data
      loadSharedTasks();

      // Clear the loading state for this specific share
      setRespondingShares(prev => ({ ...prev, [taskShareId]: false }));
    } catch (err: any) {
      console.error('Error responding to task share:', err);

      // Provide a more specific error message
      if (err.message) {
        setError(`Failed to respond to task share: ${err.message}`);
      } else {
        setError('Failed to respond to task share');
      }

      // Try to get more information about the error
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        console.log('Current user ID:', currentUser?.id);

        const { data: shareData, error: shareError } = await supabase
          .from('task_shares')
          .select('*')
          .eq('id', taskShareId);

        if (shareError) {
          console.error('Error fetching task share for debugging:', shareError);
        } else {
          console.log('Task share data for debugging:', shareData);
        }
      } catch (debugErr) {
        console.error('Error during debugging:', debugErr);
      }

      // Clear the loading state for this specific share
      setRespondingShares(prev => ({ ...prev, [taskShareId]: false }));
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Shared Tasks</h2>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            loadSharedTasks();
          }}
          className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-md flex items-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

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
                        Shared by: {share.profiles?.name || share.profiles?.email || share.owner_id || 'Unknown'}
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
                      {respondingShares[share.id] ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500"></div>
                          <span className="text-sm text-gray-500">Processing...</span>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRespondToShare(share.id, 'accepted')}
                            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md"
                            disabled={Object.values(respondingShares).some(v => v)}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondToShare(share.id, 'rejected')}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md"
                            disabled={Object.values(respondingShares).some(v => v)}
                          >
                            Decline
                          </button>
                        </>
                      )}
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
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              When someone shares a task with you, it will appear here.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              These tasks have been shared with you by other users. You can view and interact with them based on your permission level.
            </p>
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
          </>
        )}
      </div>
    </div>
  );
};

export default SharedTasksSection;
