import { Task } from '../../../lib/types/task';
import { format, parseISO } from 'date-fns';
import TaskRecommendation from './TaskRecommendation';

interface TaskItemProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onDelete: (taskId: string) => void;
}

const TaskItem = ({ task, onStatusChange, onDelete }: TaskItemProps) => {
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

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`w-3 h-3 rounded-full mt-1.5 ${getPriorityColor(task.priority)}`}></div>
          <div>
            <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {task.description.length > 100
                  ? `${task.description.substring(0, 100)}...`
                  : task.description}
              </p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-sm">
              <span className="flex items-center">
                <span className="mr-1">{getCategoryIcon(task.category)}</span>
                {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
              </span>
              <span className={`font-medium ${getPriorityColor(task.priority).replace('bg-', 'text-')}`}>
                {task.priority.toUpperCase()}
              </span>
              {task.created_at && (
                <span className="text-gray-500 dark:text-gray-400">
                  {format(parseISO(task.created_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>

            {/* AI Recommendation */}
            <TaskRecommendation taskId={task.id} />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={() => onDelete(task.id)}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
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
  );
};

export default TaskItem;
