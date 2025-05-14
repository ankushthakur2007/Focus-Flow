import { useState, useContext, useEffect } from 'react';
import { Task } from '../types/task';
import { format, parseISO } from 'date-fns';
import TaskRecommendation from './TaskRecommendation';
import AuthContext from './AuthContext';
import { supabase } from '../services/supabase';

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onDelete: (taskId: string) => void;
}

const TaskCard = ({ task, onStatusChange, onDelete }: TaskCardProps) => {
  // Each card has its own expanded state
  const [expanded, setExpanded] = useState(false);
  const { user } = useContext(AuthContext);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    task.notification_settings?.notifications_enabled !== false // Default to true if not explicitly set to false
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Ensure notification settings are properly initialized
  useEffect(() => {
    const initializeNotificationSettings = async () => {
      if (!user) return;

      // If notification_settings is undefined or notifications_enabled is undefined, initialize it
      if (!task.notification_settings || task.notification_settings.notifications_enabled === undefined) {
        console.log('Initializing notification settings for task:', task.id);

        const defaultSettings = {
          custom_reminder: false,
          reminder_time: 24,
          reminder_sent: false,
          notifications_enabled: true
        };

        try {
          const { error } = await supabase
            .from('tasks')
            .update({
              notification_settings: defaultSettings
            })
            .eq('id', task.id);

          if (error) {
            console.error('Error initializing notification settings:', error);
            return;
          }

          // Update the task object
          task.notification_settings = defaultSettings;
          setNotificationsEnabled(true);
        } catch (error) {
          console.error('Failed to initialize notification settings:', error);
        }
      }
    };

    initializeNotificationSettings();
  }, [task.id, user]);

  // Update notification settings in the database
  const toggleNotifications = async (enabled: boolean) => {
    if (!user || isUpdating) return;

    try {
      setIsUpdating(true);
      console.log('Current task notification settings:', task.notification_settings);
      console.log('Attempting to set notifications to:', enabled);

      // Get current notification settings or use default
      const currentSettings = task.notification_settings || {
        custom_reminder: false,
        reminder_time: 24,
        reminder_sent: false,
        notifications_enabled: true
      };

      // Update the notifications_enabled property
      const updatedSettings = {
        ...currentSettings,
        notifications_enabled: enabled
      };

      console.log('Updated settings to be saved:', updatedSettings);

      // Update in database
      const { data, error } = await supabase
        .from('tasks')
        .update({
          notification_settings: updatedSettings
        })
        .eq('id', task.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Database update response:', data);

      // Update local state and task object
      setNotificationsEnabled(enabled);
      task.notification_settings = updatedSettings;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      // Revert UI state if update failed
      setNotificationsEnabled(!enabled);
      alert('Failed to update notification settings. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-orange-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-orange-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-blue-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'work':
        return '💼';
      case 'study':
        return '📚';
      case 'chores':
        return '🏠';
      case 'health':
        return '❤️';
      case 'social':
        return '👥';
      default:
        return '📋';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Card Header */}
      <div className="p-4 flex flex-col sm:flex-row justify-between items-start gap-3">
        <div className="flex items-start space-x-3 w-full">
          <div className={`w-3 h-3 rounded-full mt-1.5 ${getPriorityColor(task.priority)}`}></div>
          <div className="flex-grow">
            <h3 className={`font-medium break-words ${task.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
              {task.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <div className="flex items-center">
                <span className="mr-1 text-xs">{getCategoryIcon(task.category)}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">{task.category.charAt(0).toUpperCase() + task.category.slice(1)}</span>
              </div>
              <span className={`text-xs font-medium ${getPriorityTextColor(task.priority)}`}>
                {task.priority.toUpperCase()}
              </span>
              {task.start_date && (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Start: {format(parseISO(task.start_date), 'MMM d')}
                  </span>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 mr-1 ${new Date(task.due_date) < new Date() ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className={`text-xs ${new Date(task.due_date) < new Date() ? 'text-red-500 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    Due: {format(parseISO(task.due_date), 'MMM d')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end space-x-2">
          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getStatusBadgeColor(task.status)}`}>
            {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={expanded ? "Collapse task details" : "Expand task details"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Card Content (visible when expanded) */}
      <div className={`divide-y divide-gray-100 dark:divide-gray-700 transition-all duration-300 overflow-hidden ${expanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
        {/* Description Section */}
        {task.description && (
          <div className="px-4 py-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {task.description}
            </p>
          </div>
        )}

        {/* Details Section */}
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {task.created_at && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Created: {format(parseISO(task.created_at), 'MMM d, yyyy')}
              </span>
            )}
            {task.start_date && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Start: {format(parseISO(task.start_date), 'MMM d, yyyy h:mm a')}
              </span>
            )}
            {task.due_date && (
              <span className={`text-xs ${new Date(task.due_date) < new Date() ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                Due: {format(parseISO(task.due_date), 'MMM d, yyyy h:mm a')}
              </span>
            )}
          </div>

          {/* Notification Toggle */}
          <div className="mt-3 flex items-center">
            <label htmlFor={`notification-toggle-${task.id}`} className={`flex items-center ${isUpdating ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}>
              <div className="relative">
                <input
                  id={`notification-toggle-${task.id}`}
                  type="checkbox"
                  className="sr-only"
                  checked={notificationsEnabled}
                  onChange={(e) => toggleNotifications(e.target.checked)}
                  disabled={isUpdating}
                />
                <div className={`block w-10 h-6 rounded-full ${notificationsEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'} transition-colors duration-300`}></div>
                <div className={`absolute left-1 top-1 bg-white dark:bg-gray-200 w-4 h-4 rounded-full transition-transform duration-300 ${notificationsEnabled ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <div className="ml-3 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                {isUpdating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Enable notifications'
                )}
              </div>
            </label>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="px-4 py-3">
          <TaskRecommendation taskId={task.id} />
        </div>

        {/* Actions */}
        <div className="px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center w-full sm:w-auto">
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 dark:bg-gray-700 dark:border-gray-600 w-full sm:w-auto"
              aria-label="Change task status"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
            <a
              href={`/chat/${task.id}`}
              className="text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 flex items-center px-3 py-1 rounded-md hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors"
              title="Chat about this task"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="hidden sm:inline">Chat</span>
            </a>

            <button
              onClick={() => onDelete(task.id)}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
              title="Delete task"
              aria-label="Delete task"
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
      </div>
    </div>
  );
};

export default TaskCard;
