# Calendar Task Integration

This file documents the changes made to integrate task creation with the calendar feature.

## Changes Made

1. Modified the `CalendarEventModal.tsx` component to:
   - Change the title from "Create Event" to "Create Task"
   - Update the form fields to match task creation (title, description, priority, category, due date)
   - Implement a function to create a task in the tasks table with a due date
   - Add priority and category selection dropdowns
   - Remove the "all day event" checkbox and end date/time fields
   - Set up color coding based on task priority

## Benefits

1. **Task-Centric Calendar**: Now when users click on a date in the calendar, they'll create a task with a due date instead of a separate calendar event.

2. **Consistent Data Model**: Tasks are stored in the tasks table with due dates, which aligns with the app's focus on task management.

3. **Better User Experience**: The form now matches the task creation form with fields for priority and category.
