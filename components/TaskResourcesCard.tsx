import React, { useState, useEffect, useContext } from 'react';
import { Task, TaskResource } from '../types/task';
import { fetchTaskResources, refreshTaskResources } from '../services/taskResources';
import AuthContext from './AuthContext';
import ResourcesSection from './ResourcesSection';
import TouchFriendlyButton from './TouchFriendlyButton';

interface TaskResourcesCardProps {
  task: Task;
}

const TaskResourcesCard: React.FC<TaskResourcesCardProps> = ({ task }) => {
  const [resources, setResources] = useState<TaskResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const getResources = async () => {
      if (!user || !task.id) return;

      try {
        setIsLoading(true);
        const taskResources = await fetchTaskResources(task.id);
        setResources(taskResources);
      } catch (error) {
        console.error('Error fetching task resources:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getResources();
  }, [task.id, user]);

  const handleRefreshResources = async () => {
    if (!user || !task.id) return;

    try {
      setIsLoading(true);
      const refreshedResources = await refreshTaskResources(task, user.id);
      setResources(refreshedResources);
    } catch (error) {
      console.error('Error refreshing task resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-medium text-lg">{task.title}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${
            task.status === 'completed'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
              : task.status === 'in_progress'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
          }`}>
            {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
          </span>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {task.description}
          </p>
        )}

        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <ResourcesSection
            resources={resources}
            isLoading={isLoading}
            onRefresh={handleRefreshResources}
            className="mt-0"
          />
        </div>
      </div>
    </div>
  );
};

export default TaskResourcesCard;
