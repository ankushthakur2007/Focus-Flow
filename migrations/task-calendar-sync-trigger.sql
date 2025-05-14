-- Task Calendar Sync Trigger
-- This trigger automatically creates or updates calendar events when tasks with dates are created or updated

-- Function to sync tasks with calendar events
CREATE OR REPLACE FUNCTION sync_task_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
  event_id UUID;
  event_exists BOOLEAN;
  task_start_time TIMESTAMP WITH TIME ZONE;
  task_end_time TIMESTAMP WITH TIME ZONE;
  priority_color TEXT;
BEGIN
  -- Determine if we need to create/update a calendar event
  -- Only sync tasks that have either a start_date or due_date
  IF (NEW.start_date IS NULL AND NEW.due_date IS NULL) THEN
    -- No dates to sync, exit
    RETURN NEW;
  END IF;

  -- Determine the event time based on available dates
  IF NEW.start_date IS NOT NULL THEN
    task_start_time := NEW.start_date;
  ELSE
    task_start_time := NEW.due_date;
  END IF;

  -- Set end time to 1 hour after start time
  task_end_time := task_start_time + INTERVAL '1 hour';

  -- Get color based on priority
  CASE NEW.priority
    WHEN 'high' THEN priority_color := '#ef4444';
    WHEN 'medium' THEN priority_color := '#f59e0b';
    WHEN 'low' THEN priority_color := '#10b981';
    ELSE priority_color := '#3b82f6';
  END CASE;

  -- Check if a calendar event already exists for this task
  SELECT id, EXISTS(SELECT 1 FROM calendar_events WHERE related_task_id = NEW.id)
  INTO event_id, event_exists
  FROM calendar_events
  WHERE related_task_id = NEW.id
  LIMIT 1;

  IF event_exists THEN
    -- Update existing calendar event
    UPDATE calendar_events
    SET
      title = NEW.title,
      description = NEW.description,
      start_time = task_start_time,
      end_time = task_end_time,
      color = priority_color,
      updated_at = NOW()
    WHERE id = event_id;
  ELSE
    -- Create new calendar event
    INSERT INTO calendar_events (
      user_id,
      title,
      description,
      start_time,
      end_time,
      all_day,
      color,
      related_task_id,
      created_at,
      updated_at
    ) VALUES (
      NEW.user_id,
      NEW.title,
      NEW.description,
      task_start_time,
      task_end_time,
      false,
      priority_color,
      NEW.id,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS task_calendar_sync_trigger ON tasks;

-- Create trigger for task insert/update
CREATE TRIGGER task_calendar_sync_trigger
AFTER INSERT OR UPDATE OF title, description, priority, start_date, due_date
ON tasks
FOR EACH ROW
EXECUTE FUNCTION sync_task_to_calendar();

-- Function to delete calendar events when tasks are deleted
CREATE OR REPLACE FUNCTION delete_task_calendar_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete any calendar events associated with this task
  DELETE FROM calendar_events
  WHERE related_task_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS task_delete_calendar_sync_trigger ON tasks;

-- Create trigger for task deletion
CREATE TRIGGER task_delete_calendar_sync_trigger
BEFORE DELETE
ON tasks
FOR EACH ROW
EXECUTE FUNCTION delete_task_calendar_events();
