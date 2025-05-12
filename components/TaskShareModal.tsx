import { useState, useEffect } from 'react';
import { Task, SharedUser } from '../types/task';
import { shareTask, getTaskShares, updateTaskSharePermission, removeTaskShare } from '../services/taskSharing';

interface TaskShareModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

const TaskShareModal: React.FC<TaskShareModalProps> = ({ task, isOpen, onClose }) => {
  const [email, setEmail] = useState<string>('');
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'edit' | 'admin'>('view');
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && task) {
      loadSharedUsers();
    }
  }, [isOpen, task]);

  const loadSharedUsers = async () => {
    if (!task) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const users = await getTaskShares(task.id);
      setSharedUsers(users);
    } catch (err) {
      console.error('Error loading shared users:', err);
      setError('Failed to load shared users');
    } finally {
      setLoading(false);
    }
  };

  const handleShareTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await shareTask(task.id, email, permissionLevel);
      setSuccess(`Task shared with ${email}`);
      setEmail('');
      loadSharedUsers();
    } catch (err: any) {
      console.error('Error sharing task:', err);
      setError(err.message || 'Failed to share task');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (userId: string, newPermission: 'view' | 'edit' | 'admin') => {
    if (!task) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await updateTaskSharePermission(task.id, userId, newPermission);
      loadSharedUsers();
    } catch (err) {
      console.error('Error updating permission:', err);
      setError('Failed to update permission');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccess = async (userId: string) => {
    if (!task) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await removeTaskShare(task.id, userId);
      loadSharedUsers();
    } catch (err) {
      console.error('Error removing access:', err);
      setError('Failed to remove access');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Share Task</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <h3 className="font-medium text-lg mb-2">Task: {task.title}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{task.description}</p>
        </div>
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 p-3 rounded-md mb-4">
            {success}
          </div>
        )}
        
        <form onSubmit={handleShareTask} className="mb-6">
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700"
              placeholder="Enter email address"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="permission" className="block text-sm font-medium mb-1">
              Permission Level
            </label>
            <select
              id="permission"
              value={permissionLevel}
              onChange={(e) => setPermissionLevel(e.target.value as 'view' | 'edit' | 'admin')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700"
            >
              <option value="view">View Only</option>
              <option value="edit">Can Edit</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Sharing...' : 'Share Task'}
          </button>
        </form>
        
        <div>
          <h3 className="font-medium text-lg mb-2">Shared With</h3>
          {loading && <p className="text-gray-500 dark:text-gray-400">Loading...</p>}
          
          {!loading && sharedUsers.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">This task hasn't been shared with anyone yet.</p>
          )}
          
          {!loading && sharedUsers.length > 0 && (
            <ul className="space-y-3">
              {sharedUsers.map((user) => (
                <li key={user.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{user.name || user.email}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                      <div className="flex items-center mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          user.status === 'accepted' 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                            : user.status === 'rejected'
                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                        <span className="text-xs ml-2 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {user.permission_level === 'view' 
                            ? 'View Only' 
                            : user.permission_level === 'edit'
                            ? 'Can Edit'
                            : 'Admin'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <select
                        value={user.permission_level}
                        onChange={(e) => handleUpdatePermission(user.id, e.target.value as 'view' | 'edit' | 'admin')}
                        className="mr-2 text-sm px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700"
                        disabled={loading}
                      >
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      <button
                        onClick={() => handleRemoveAccess(user.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        disabled={loading}
                        aria-label="Remove access"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskShareModal;
