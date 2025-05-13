#!/bin/bash

# Script to remove all shared task functionality from the codebase

echo "Starting removal of shared task functionality..."

# 1. Remove shared task components
echo "Removing shared task components..."
rm -f components/SharedTasksSection.tsx
rm -f components/TaskShareModal.tsx

# 2. Remove shared task pages
echo "Removing shared task pages..."
rm -f pages/shared.tsx
rm -f pages/api/fix-shared-tasks.ts
rm -f pages/api/fix-shared-tasks-direct.ts
rm -f pages/api/fix-shared-task-view.ts
rm -f pages/api/fix-shared-task-recommendations.ts
rm -f pages/api/fix-task-shares-redirect.ts
rm -f pages/api/remove-shared-tasks.ts
rm -f pages/remove-shared-tasks.tsx
rm -rf pages/api/tasksRedirect

# 3. Remove shared task services
echo "Removing shared task services..."
rm -f services/taskSharing.ts

# 4. Remove shared task migrations
echo "Removing shared task migrations..."
rm -f migrations/create-task-sharing-tables.sql
rm -f migrations/fix-task-shares-view.sql

echo "Shared task files removed successfully!"
echo "Now updating the remaining files to remove shared task references."
