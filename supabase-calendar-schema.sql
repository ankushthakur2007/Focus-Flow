-- Create user_calendar_tokens table
CREATE TABLE IF NOT EXISTS public.user_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    token_type TEXT NOT NULL,
    scope TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Add RLS policies for user_calendar_tokens
ALTER TABLE public.user_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own calendar tokens
CREATE POLICY "Users can view their own calendar tokens"
ON public.user_calendar_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own calendar tokens
CREATE POLICY "Users can insert their own calendar tokens"
ON public.user_calendar_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own calendar tokens
CREATE POLICY "Users can update their own calendar tokens"
ON public.user_calendar_tokens
FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own calendar tokens
CREATE POLICY "Users can delete their own calendar tokens"
ON public.user_calendar_tokens
FOR DELETE
USING (auth.uid() = user_id);

-- Create task_calendar_events table to track which tasks are linked to calendar events
CREATE TABLE IF NOT EXISTS public.task_calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(task_id, event_id)
);

-- Add RLS policies for task_calendar_events
ALTER TABLE public.task_calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own task calendar events
CREATE POLICY "Users can view their own task calendar events"
ON public.task_calendar_events
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own task calendar events
CREATE POLICY "Users can insert their own task calendar events"
ON public.task_calendar_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own task calendar events
CREATE POLICY "Users can update their own task calendar events"
ON public.task_calendar_events
FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own task calendar events
CREATE POLICY "Users can delete their own task calendar events"
ON public.task_calendar_events
FOR DELETE
USING (auth.uid() = user_id);
