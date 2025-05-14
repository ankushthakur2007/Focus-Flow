-- Five-day notification trigger for FocusFlow
-- This updates the task due notification function to only send notifications
-- when there are exactly 5 days remaining before a task's due date

-- Update the task due notification function
CREATE OR REPLACE FUNCTION create_task_due_notification()
RETURNS TRIGGER AS $$
DECLARE
  days_until_due INTEGER;
BEGIN
  -- Only proceed if the task has a due date and it's a new task or the due date has changed
  IF NEW.due_date IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.due_date IS DISTINCT FROM NEW.due_date) THEN
    -- Calculate the number of days until the due date
    days_until_due := EXTRACT(DAY FROM (NEW.due_date::timestamp - NOW()::timestamp));
    
    -- Only create a notification if there are exactly 5 days until the due date
    IF days_until_due = 5 THEN
      -- Only create notification if notifications are enabled for this task
      IF NEW.notification_settings IS NULL OR (NEW.notification_settings->>'notifications_enabled')::boolean = true THEN
        -- Insert a notification
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          related_task_id
        ) VALUES (
          NEW.user_id,
          'Task Due in 5 Days',
          'Your task "' || NEW.title || '" is due in 5 days.',
          'task_due',
          NEW.id
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger is created
DROP TRIGGER IF EXISTS task_due_notification_trigger ON tasks;
CREATE TRIGGER task_due_notification_trigger
  AFTER INSERT OR UPDATE OF due_date ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_task_due_notification();

-- Also update the scheduled notification function to respect the 5-day threshold
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
