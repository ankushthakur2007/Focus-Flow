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
          <h4 className="font-medium mb-2">Learning Resources</h4>
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-gray-400 mb-3">
                No resources found for this task.
              </p>
              <TouchFriendlyButton
                onClick={handleRefreshResources}
                className="btn btn-primary text-sm"
              >
                Find Resources
              </TouchFriendlyButton>
            </div>
          ) : (
            <>
              {/* Videos */}
              {resources.filter(r => r.type === 'video').length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Videos
                  </h5>
                  <div className="space-y-3">
                    {resources.filter(r => r.type === 'video').map(resource => (
                      <a 
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          {resource.thumbnail_url && (
                            <div className="flex-shrink-0">
                              <img 
                                src={resource.thumbnail_url} 
                                alt={resource.title} 
                                className="w-16 h-12 object-cover rounded"
                              />
                            </div>
                          )}
                          <div>
                            <h6 className="font-medium text-gray-900 dark:text-gray-100">
                              {resource.title}
                            </h6>
                            {resource.description && (
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {resource.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Articles */}
              {resources.filter(r => r.type === 'article' || r.type === 'blog').length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Articles & Blogs
                  </h5>
                  <div className="space-y-3">
                    {resources.filter(r => r.type === 'article' || r.type === 'blog').map(resource => (
                      <a 
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          {resource.thumbnail_url && (
                            <div className="flex-shrink-0">
                              <img 
                                src={resource.thumbnail_url} 
                                alt={resource.title} 
                                className="w-16 h-12 object-cover rounded"
                              />
                            </div>
                          )}
                          <div>
                            <h6 className="font-medium text-gray-900 dark:text-gray-100">
                              {resource.title}
                            </h6>
                            {resource.description && (
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {resource.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end mt-4">
                <TouchFriendlyButton
                  onClick={handleRefreshResources}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Refresh Resources
                </TouchFriendlyButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskResourcesCard;
