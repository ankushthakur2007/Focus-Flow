-- Fix for the process_task_due_notifications function (version 4)
-- This is a simplified version that focuses on the core functionality

-- Update the process_task_due_notifications function
CREATE OR REPLACE FUNCTION process_task_due_notifications()
RETURNS void AS $$
DECLARE
  task_record RECORD;
  days_until_due INTEGER;
BEGIN
  -- Loop through all pending and in-progress tasks with due dates
  FOR task_record IN 
    SELECT t.* 
    FROM tasks t
    WHERE 
      t.status IN ('pending', 'in_progress') 
      AND t.due_date IS NOT NULL
      AND (t.notification_settings IS NULL OR (t.notification_settings->>'reminder_sent')::boolean = false)
  LOOP
    -- Calculate the number of days until the due date
    days_until_due := EXTRACT(DAY FROM (task_record.due_date::timestamp - NOW()::timestamp));
    
    -- Only create a notification if there are exactly 5 days until the due date
    IF days_until_due = 5 THEN
      -- Only create notification if notifications are enabled for this task
      IF task_record.notification_settings IS NULL OR (task_record.notification_settings->>'notifications_enabled')::boolean = true THEN
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
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a simple reset function if it doesn't exist
CREATE OR REPLACE FUNCTION reset_notification_flags_for_completed_tasks()
RETURNS void AS $$
BEGIN
  -- Reset reminder_sent flag when a task is marked as completed
  UPDATE tasks
  SET notification_settings = jsonb_set(
    COALESCE(notification_settings, '{}'::jsonb),
    '{reminder_sent}',
    'false'
  )
  WHERE status = 'completed';
END;
$$ LANGUAGE plpgsql;
