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
              <div className="mb-4">
                <h4 className="font-medium mb-4 text-lg text-gray-700 dark:text-gray-300">
                  Learning Resources
                </h4>

                {/* Videos Section */}
                {videoResources.length > 0 && (
                  <div className="mb-6">
                    <h5 className="font-medium mb-3 text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                      Videos
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {videoResources.map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Blog Posts Section */}
                {articleResources.filter(r => r.type === 'blog').length > 0 && (
                  <div className="mb-6">
                    <h5 className="font-medium mb-3 text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                      Blog Posts
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {articleResources.filter(r => r.type === 'blog').map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Articles Section */}
                {articleResources.filter(r => r.type === 'article').length > 0 && (
                  <div className="mb-6">
                    <h5 className="font-medium mb-3 text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                      Articles
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {articleResources.filter(r => r.type === 'article').map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Resources Section */}
                {otherResources.length > 0 && (
                  <div className="mb-6">
                    <h5 className="font-medium mb-3 text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                      Other Resources
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {otherResources.map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
      className="block border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-square relative overflow-hidden bg-gray-100 dark:bg-gray-800">
        {resource.thumbnail_url ? (
          <img
            src={resource.thumbnail_url}
            alt={resource.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary-50 dark:bg-primary-900/20">
            <span className="text-4xl">
              {resource.type === 'video' ? '🎬' : resource.type === 'blog' ? '📝' : '📄'}
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <h5 className="font-medium text-white truncate">
            {resource.title}
          </h5>
          <div className="text-xs text-gray-200 truncate">
            {new URL(resource.url).hostname}
          </div>
        </div>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800 text-center">
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
          {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
        </span>
      </div>
    </a>
  );
};

export default ResourcesSection;
