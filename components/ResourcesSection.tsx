import React, { useState } from 'react';
import { TaskResource } from '../types/task';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import TouchFriendlyButton from './TouchFriendlyButton';

interface ResourcesSectionProps {
  resources: TaskResource[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const ResourcesSection: React.FC<ResourcesSectionProps> = ({
  resources,
  isLoading = false,
  onRefresh,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Group resources by type
  const videoResources = resources.filter(resource => resource.type === 'video');
  const articleResources = resources.filter(resource => resource.type === 'article' || resource.type === 'blog');
  const otherResources = resources.filter(resource => resource.type === 'other');

  const hasResources = resources.length > 0;

  return (
    <div className={`mt-4 ${className}`}>
      <div
        className="flex items-center justify-between cursor-pointer py-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-medium flex items-center">
          <span>Resources</span>
          {hasResources && (
            <span className="ml-2 text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-2 py-0.5 rounded-full">
              {resources.length}
            </span>
          )}
        </h3>
        <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : !hasResources ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No resources found for this task.
              {onRefresh && (
                <TouchFriendlyButton
                  onClick={onRefresh}
                  className="ml-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Find Resources
                </TouchFriendlyButton>
              )}
            </div>
          ) : (
            <>
              {/* Videos Section */}
              {videoResources.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Videos
                  </h4>
                  <div className="space-y-3">
                    {videoResources.map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                  </div>
                </div>
              )}

              {/* Articles Section */}
              {articleResources.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Articles & Blogs
                  </h4>
                  <div className="space-y-3">
                    {articleResources.map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Resources Section */}
              {otherResources.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Other Resources
                  </h4>
                  <div className="space-y-3">
                    {otherResources.map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                  </div>
                </div>
              )}

              {/* Refresh Button */}
              {onRefresh && (
                <div className="flex justify-end mt-4">
                  <TouchFriendlyButton
                    onClick={onRefresh}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    Refresh Resources
                  </TouchFriendlyButton>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface ResourceCardProps {
  resource: TaskResource;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {resource.title}
          </h5>
          {resource.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {resource.description}
            </p>
          )}
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
            {new URL(resource.url).hostname}
          </div>
        </div>
      </div>
    </a>
  );
};

export default ResourcesSection;
