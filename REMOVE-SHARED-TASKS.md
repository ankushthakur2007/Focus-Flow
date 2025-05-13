# Removing Shared Tasks Functionality

This guide will help you completely remove the shared tasks functionality from your FocusFlow application.

## Step 1: Run the Removal Script

First, run the removal script to delete all shared task-related files:

```bash
chmod +x scripts/remove-shared-tasks.sh
./scripts/remove-shared-tasks.sh
```

## Step 2: Update Layout Component

Edit the `components/Layout.tsx` file to remove shared task navigation:

1. Remove the "Shared" link from the desktop navigation
2. Remove the "Shared" link from the mobile navigation
3. Remove the keyboard shortcut for shared tasks (the `g+s` shortcut)

Example changes:

```tsx
// Remove this block from desktop navigation
<Link
  href="/shared"
  className={`px-3 py-2 rounded-md text-sm font-medium ${
    isActive('/shared')
      ? 'bg-primary-500 text-white'
      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
  }`}
>
  Shared
</Link>

// Remove this block from mobile navigation
<Link
  href="/shared"
  className={`px-3 py-3 rounded-md text-sm font-medium ${
    isActive('/shared')
      ? 'bg-primary-500 text-white'
      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
  }`}
  onClick={() => setMobileMenuOpen(false)}
>
  Shared
</Link>

// Remove this block from keyboard shortcuts
else if (keysPressed['s'] || keysPressed['S']) {
  // Go to Shared
  router.push('/shared');
  keysPressed = {};
}
```

## Step 3: Update TaskCard Component

Edit the `components/TaskCard.tsx` file to remove shared task functionality:

1. Remove the `isShared` and `sharedBy` props
2. Remove the share button and related functionality
3. Remove permission level checks
4. Remove the TaskShareModal import and usage

Example changes:

```tsx
// Change the interface to remove shared task props
interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onDelete: (taskId: string) => void;
}

// Change the component definition
const TaskCard = ({ task, onStatusChange, onDelete }: TaskCardProps) => {
  // Remove these lines
  const [showShareModal, setShowShareModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissionLevel, setPermissionLevel] = useState<'admin' | 'edit' | 'view' | null>(null);

  // Remove the useEffect for checking permissions

  // Remove the share button
  {/* Remove this block
    <TouchFriendlyButton
      onClick={() => setShowShareModal(true)}
      className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 flex items-center px-4 py-2 sm:px-3 sm:py-1 rounded-md hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
      ariaLabel="Share this task"
      title="Share this task"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 sm:h-5 sm:w-5 mr-2 sm:mr-1"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
      </svg>
      <span className="inline">Share</span>
    </TouchFriendlyButton>
  */}

  // Remove the TaskShareModal
  {/* Remove this block
    {showShareModal && (
      <TaskShareModal
        task={task}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    )}
  */}
```

## Step 4: Update Tasks Page

Edit the `pages/tasks.tsx` file to remove shared task functionality:

1. Remove the `view` state and tabs for "My Tasks" and "Shared with Me"
2. Remove the `sharedTasks` state and `fetchSharedTasks` function
3. Remove the import for `getTasksSharedWithMe`

Example changes:

```tsx
// Remove this import
import { getTasksSharedWithMe } from '../services/taskSharing';

// Remove the view state
const [view, setView] = useState<'my' | 'shared'>('my');

// Remove the sharedTasks state
const [sharedTasks, setSharedTasks] = useState<Task[]>([]);

// Remove the fetchSharedTasks function
const fetchSharedTasks = async () => {
  // ...
};

// Remove the view tabs
<div className="flex space-x-2 mb-4">
  <button
    className={`px-4 py-2 rounded-md ${
      view === 'my'
        ? 'bg-primary-500 text-white'
        : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }`}
    onClick={() => setView('my')}
  >
    My Tasks
  </button>
  <button
    className={`px-4 py-2 rounded-md ${
      view === 'shared'
        ? 'bg-primary-500 text-white'
        : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }`}
    onClick={() => setView('shared')}
  >
    Shared with Me
  </button>
</div>
```

## Step 5: Update Task Type

Edit the `types/task.ts` file to remove shared task types:

1. Remove the `is_shared` and `shared_by` properties from the Task interface
2. Remove the TaskShare, TaskShareActivity, and SharedUser interfaces

Example changes:

```tsx
// Remove these properties from the Task interface
is_shared?: boolean;
shared_by?: string;

// Remove these interfaces
export interface TaskShare {
  // ...
}

export interface TaskShareActivity {
  // ...
}

export interface SharedUser {
  // ...
}
```

## Step 6: Update Database Schema

If you want to completely remove the shared tasks from your database, run the API endpoint you created:

1. Visit `https://your-vercel-app-url.vercel.app/api/remove-shared-tasks`
2. This will delete all shared task data and drop the related tables

## Step 7: Commit and Deploy

After making all these changes:

1. Commit the changes to your repository
2. Push to GitHub
3. Vercel will automatically deploy the updated application

Your FocusFlow application should now be completely free of shared task functionality!
