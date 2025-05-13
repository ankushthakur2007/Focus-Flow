# Calendar Feature Setup

This document provides instructions for setting up the calendar feature in FocusFlow.

## Database Setup

To enable the calendar feature, you need to apply the calendar schema to your Supabase database:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of `migrations/calendar-notifications-schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the SQL commands

This will create the following tables:
- `calendar_events`: Stores calendar events
- `notifications`: Stores user notifications

It will also add a `due_date` column to the `tasks` table if it doesn't already exist.

## Verifying the Setup

After applying the schema, you should be able to:

1. See the Calendar tab in the navigation bar
2. Click on the Calendar tab to view the calendar
3. Click on a date to create a task with a due date
4. View tasks with due dates on the calendar

## Troubleshooting

If you don't see the Calendar tab in the navigation bar:

1. Make sure you're logged in
2. Check the browser console for any errors
3. Verify that the calendar schema has been applied correctly
4. Try clearing your browser cache and refreshing the page
