-- Fix for the process_task_due_notifications function (version 3)
-- This addresses the syntax errors in the previous fixes

-- Update the process_task_due_notifications function to properly handle the 5-day threshold
-- while maintaining compatibility with the existing database structure
CREATE OR REPLACE FUNCTION process_task_due_notifications()
RETURNS void AS $$
DECLARE
  task_record RECORD;
  user_pref RECORD;
  days_until_due INTEGER;
  has_preferences BOOLEAN;
BEGIN
  -- Loop through all pending and in-progress tasks with due dates
  -- Note: We're keeping the join with profiles for compatibility with existing code
  FOR task_record IN 
    SELECT t.*, p.email 
    FROM tasks t
    JOIN auth.users u ON t.user_id = u.id
    JOIN profiles p ON t.user_id = p.id
    WHERE 
      t.status IN ('pending', 'in_progress') 
      AND t.due_date IS NOT NULL
      AND (t.notification_settings IS NULL OR (t.notification_settings->>'reminder_sent')::boolean = false)
  LOOP
    -- Get user notification preferences
    has_preferences := false;
    
    -- Try to get user preferences
    BEGIN
      SELECT * INTO STRICT user_pref 
      FROM user_notification_preferences 
      WHERE user_id = task_record.user_id;
      
      has_preferences := true;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        -- If user preferences don't exist, continue with default behavior
        has_preferences := false;
    END;
    
    -- Calculate the number of days until the due date
    days_until_due := EXTRACT(DAY FROM (task_record.due_date::timestamp - NOW()::timestamp));
    
    -- Only create a notification if there are exactly 5 days until the due date
    IF days_until_due = 5 THEN
      -- Check if notifications are enabled for this task
      IF task_record.notification_settings IS NULL OR (task_record.notification_settings->>'notifications_enabled')::boolean = true THEN
        -- Check if user preferences exist and notifications are enabled
        IF NOT has_preferences OR (user_pref.in_app_notifications_enabled AND user_pref.in_app_task_due_reminder) THEN
          -- Insert a notification
          INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            related_task_id
          ) VALUES (
            task_record.user_id,
            'Task Due in 5 Days',
            'Your task "' || task_record.title || '" is due in 5 days.',
            'task_due',
            task_record.id
          );
          
          -- Mark reminder as sent
          UPDATE tasks
          SET notification_settings = jsonb_set(
            COALESCE(notification_settings, '{}'::jsonb),
            '{reminder_sent}',
            'true'
          )
          WHERE id = task_record.id;
          
          -- Log that we would send an email (if email notifications are enabled)
          IF has_preferences AND user_pref.email_notifications_enabled AND user_pref.email_task_due_reminder THEN
            RAISE NOTICE 'Would send email to % about task % due in 5 days', 
              task_record.email, 
              task_record.title;
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a separate function to check and create the reset_notification_flags function
CREATE OR REPLACE FUNCTION ensure_reset_notification_flags_function()
RETURNS void AS $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  -- Check if the function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'reset_notification_flags_for_completed_tasks'
  ) INTO func_exists;
  
  -- Create the function if it doesn't exist
  IF NOT func_exists THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION reset_notification_flags_for_completed_tasks()
    RETURNS void AS $$
    BEGIN
      -- Reset reminder_sent flag when a task is marked as completed
      UPDATE tasks
      SET notification_settings = jsonb_set(
        COALESCE(notification_settings, ''{}'')::jsonb,
        ''{reminder_sent}'',
        ''false''
      )
      WHERE status = ''completed'';
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    ';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to ensure reset_notification_flags_for_completed_tasks exists
SELECT ensure_reset_notification_flags_function();

-- Drop the helper function after use
DROP FUNCTION ensure_reset_notification_flags_function();
