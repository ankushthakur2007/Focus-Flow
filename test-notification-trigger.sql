-- Test script for the 5-day notification trigger
-- This script creates test tasks with different due dates to verify the notification behavior

-- Clear existing test data
DELETE FROM notifications WHERE message LIKE 'Test notification%';
DELETE FROM tasks WHERE title LIKE 'Test Task%';

-- Get the current user ID (replace with your actual user ID)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get the first user ID from the auth.users table
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found in auth.users table';
  END IF;
  
  -- Create a task due exactly 5 days from now (should trigger notification)
  INSERT INTO tasks (
    title,
    description,
    priority,
    category,
    status,
    user_id,
    due_date,
    notification_settings,
    created_at,
    updated_at
  ) VALUES (
    'Test Task - Due in 5 days',
    'This task should trigger a notification',
    'medium',
    'other',
    'pending',
    test_user_id,
    NOW() + INTERVAL '5 days',
    '{"notifications_enabled": true, "reminder_sent": false}'::jsonb,
    NOW(),
    NOW()
  );
  
  -- Create a task due in 4 days (should NOT trigger notification)
  INSERT INTO tasks (
    title,
    description,
    priority,
    category,
    status,
    user_id,
    due_date,
    notification_settings,
    created_at,
    updated_at
  ) VALUES (
    'Test Task - Due in 4 days',
    'This task should NOT trigger a notification',
    'medium',
    'other',
    'pending',
    test_user_id,
    NOW() + INTERVAL '4 days',
    '{"notifications_enabled": true, "reminder_sent": false}'::jsonb,
    NOW(),
    NOW()
  );
  
  -- Create a task due in 6 days (should NOT trigger notification)
  INSERT INTO tasks (
    title,
    description,
    priority,
    category,
    status,
    user_id,
    due_date,
    notification_settings,
    created_at,
    updated_at
  ) VALUES (
    'Test Task - Due in 6 days',
    'This task should NOT trigger a notification',
    'medium',
    'other',
    'pending',
    test_user_id,
    NOW() + INTERVAL '6 days',
    '{"notifications_enabled": true, "reminder_sent": false}'::jsonb,
    NOW(),
    NOW()
  );
  
  -- Check if notifications were created
  RAISE NOTICE 'Notifications created:';
  FOR notification IN 
    SELECT * FROM notifications 
    WHERE related_task_id IN (
      SELECT id FROM tasks WHERE title LIKE 'Test Task%'
    )
    ORDER BY created_at DESC
  LOOP
    RAISE NOTICE 'Task: %, Message: %', notification.title, notification.message;
  END LOOP;
END $$;
