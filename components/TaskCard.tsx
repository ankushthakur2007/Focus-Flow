import { useState, useContext, useEffect } from 'react';
import { Task, TaskResource } from '../types/task';
import { format, parseISO } from 'date-fns';
import TaskRecommendation from './TaskRecommendation';
import TaskBreakdownModal from './TaskBreakdownModal';
import ResourcesSection from './ResourcesSection';
import AuthContext from './AuthContext';
import { supabase } from '../services/supabase';
import { fetchTaskResources, refreshTaskResources } from '../services/taskResources';

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
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  // Resources state
  const [resources, setResources] = useState<TaskResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);

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

  // Fetch resources for the task
  useEffect(() => {
    const getResources = async () => {
      if (!user || !task.id) return;

      try {
        setIsLoadingResources(true);
        const taskResources = await fetchTaskResources(task.id);
        setResources(taskResources);
      } catch (error) {
        console.error('Error fetching task resources:', error);
      } finally {
        setIsLoadingResources(false);
      }
    };

    getResources();
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

  // Handle refreshing resources for the task
  const handleRefreshResources = async () => {
    if (!user || !task.id) return;

    try {
      setIsLoadingResources(true);
      const refreshedResources = await refreshTaskResources(task, user.id);
      setResources(refreshedResources);
    } catch (error) {
      console.error('Error refreshing task resources:', error);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const handleTaskUpdate = async () => {
    // Refresh the task data after steps are added/updated
    try {
      console.log('Refreshing task data for task:', task.id);

      // First, get the latest task data with steps
      const { data: updatedTaskData, error: taskError } = await supabase
        .from('tasks')
        .select('*, task_steps(*), task_resources(*)')
        .eq('id', task.id)
        .single();

      if (taskError) {
        console.error('Error fetching updated task:', taskError);
        return;
      }

      console.log('Updated task data:', updatedTaskData);

      // Update task object with the latest data
      if (updatedTaskData) {
        // Make a deep copy of the updated task data
        const updatedTask = JSON.parse(JSON.stringify(updatedTaskData));

        // Update the task object with the new data
        // Use type assertion to tell TypeScript that the keys are valid for Task
        Object.keys(updatedTask).forEach(key => {
          (task as any)[key] = updatedTask[key];
        });

        // Update resources if they exist in the updated task data
        if (updatedTaskData.task_resources) {
          setResources(updatedTaskData.task_resources);
        }

        console.log('Task object after update:', task);
      }

      // Update the status in the UI to match the database
      if (updatedTaskData && updatedTaskData.status !== task.status) {
        onStatusChange(task.id, updatedTaskData.status);
      } else {
        // If no change, still call onStatusChange to refresh the UI
        onStatusChange(task.id, task.status);
      }

      // Force a re-render by closing and reopening the modal if it's open
      if (showBreakdownModal) {
        setShowBreakdownModal(false);
        setTimeout(() => {
          setShowBreakdownModal(true);
        }, 100);
      }
    } catch (err) {
      console.error('Error in handleTaskUpdate:', err);
      // Fallback to original behavior
      onStatusChange(task.id, task.status);
    }
  };

  return (
    <>
      {/* Task Breakdown Modal - Rendered outside the card */}
      {showBreakdownModal && (
        <TaskBreakdownModal
          task={task}
          onClose={() => setShowBreakdownModal(false)}
          onUpdate={handleTaskUpdate}
        />
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft hover:shadow-card-hover border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:-translate-y-1 animate-fade-in">

      {/* Card Header */}
      <div className="p-5 flex flex-col sm:flex-row justify-between items-start gap-3">
        <div className="flex items-start space-x-3 w-full">
          <div className={`w-4 h-4 rounded-full mt-1.5 ${getPriorityColor(task.priority)} shadow-sm flex items-center justify-center`}>
            {task.status === 'completed' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex-grow">
            <h3 className={`font-medium text-lg break-words ${task.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
              {task.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <div className="flex items-center badge badge-primary">
                <span className="mr-1">{getCategoryIcon(task.category)}</span>
                <span className="text-xs">{task.category.charAt(0).toUpperCase() + task.category.slice(1)}</span>
              </div>
              <span className={`badge ${
                task.priority === 'high' ? 'badge-danger' :
                task.priority === 'medium' ? 'badge-warning' :
                'badge-success'
              }`}>
                {task.priority.toUpperCase()}
              </span>
              {task.start_date && (
                <div className="badge badge-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs">
                    {format(parseISO(task.start_date), 'MMM d')}
                  </span>
                </div>
              )}
              {task.due_date && (
                <div className={`badge ${new Date(task.due_date) < new Date() ? 'badge-danger' : 'badge-primary'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs">
                    {format(parseISO(task.due_date), 'MMM d')}
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {task.progress !== undefined && (
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Progress</span>
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400">{task.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill bg-gradient-to-r ${
                      task.progress < 30 ? 'from-danger-400 to-danger-600' :
                      task.progress < 70 ? 'from-warning-400 to-warning-600' :
                      'from-success-400 to-success-600'
                    } animate`}
                    style={{
                      width: `${task.progress}%`,
                      '--progress-width': `${task.progress}%`
                    } as React.CSSProperties}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end space-x-2">
          <span className={`badge ${
            task.status === 'pending' ? 'badge-warning' :
            task.status === 'in_progress' ? 'badge-primary' :
            task.status === 'completed' ? 'badge-success' : 'badge-primary'
          }`}>
            {task.status === 'in_progress' ? 'In progress' :
             task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={expanded ? "Collapse task details" : "Expand task details"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
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
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${expanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {/* Description Section */}
          {task.description && (
            <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Description
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {task.description}
              </p>
            </div>
          )}

          {/* Details Section */}
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {task.created_at && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Created: {format(parseISO(task.created_at), 'MMM d, yyyy')}</span>
                </div>
              )}
              {task.start_date && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-success-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Start: {format(parseISO(task.start_date), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${new Date(task.due_date) < new Date() ? 'text-danger-500' : 'text-warning-500'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className={`${new Date(task.due_date) < new Date() ? 'text-danger-600 dark:text-danger-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    Due: {format(parseISO(task.due_date), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              )}
            </div>

            {/* Notification Toggle */}
            <div className="mt-4 flex items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <label htmlFor={`notification-toggle-${task.id}`} className={`flex items-center ${isUpdating ? 'cursor-wait opacity-70' : 'cursor-pointer'} w-full`}>
                <div className="relative">
                  <input
                    id={`notification-toggle-${task.id}`}
                    type="checkbox"
                    className="sr-only"
                    checked={notificationsEnabled}
                    onChange={(e) => toggleNotifications(e.target.checked)}
                    disabled={isUpdating}
                  />
                  <div className={`block w-12 h-6 rounded-full transition-colors duration-300 ${notificationsEnabled ? 'bg-gradient-to-r from-primary-400 to-primary-600 shadow-glow' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white dark:bg-gray-200 w-4 h-4 rounded-full transition-all duration-300 ${notificationsEnabled ? 'transform translate-x-6' : ''}`}></div>
                </div>
                <div className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  {isUpdating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${notificationsEnabled ? 'text-primary-500' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                      </svg>
                      {notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="px-5 py-4 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-800/50">
            <TaskRecommendation taskId={task.id} />
          </div>

          {/* Resources Section */}
          <div className="px-5 py-4">
            <ResourcesSection
              resources={resources}
              isLoading={isLoadingResources}
              onRefresh={handleRefreshResources}
            />
          </div>

          {/* Actions */}
          <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center w-full sm:w-auto">
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task.id, e.target.value)}
                className="input text-sm py-2 w-full sm:w-auto"
                aria-label="Change task status"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={() => setShowBreakdownModal(true)}
                className="btn btn-secondary flex items-center"
                title="Break down task into steps"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="hidden sm:inline">Breakdown</span>
              </button>

              <a
                href={`/chat/${task.id}`}
                className="btn btn-primary flex items-center"
                title="Chat about this task"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
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
                className="btn btn-danger btn-icon"
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
    </div>
    </>
  );
};

export default TaskCard;
