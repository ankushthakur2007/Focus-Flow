import { useState, useEffect } from 'react';
import { CalendarEvent } from '../types/calendar';
import { Task } from '../types/task';
import { format } from 'date-fns';
import { supabase } from '../services/supabase';

interface CalendarEventModalProps {
  event: CalendarEvent | null;
  date: Date | null;
  onClose: () => void;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete: () => void;
}

const CalendarEventModal = ({ event, date, onClose, onSave, onDelete }: CalendarEventModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('other');
  const [color, setColor] = useState('#3b82f6'); // Default blue color

  useEffect(() => {
    if (event) {
      // Editing existing event
      setTitle(event.title);
      setDescription(event.description || '');

      const start = new Date(event.start_time);

      setDueDate(format(start, 'yyyy-MM-dd'));
      setDueTime(format(start, 'HH:mm'));

      // Set priority based on color
      if (event.color) {
        if (event.color === '#ef4444') setPriority('high');
        else if (event.color === '#f59e0b') setPriority('medium');
        else if (event.color === '#10b981') setPriority('low');
      }

      setColor(event.color || '#3b82f6');
    } else if (date) {
      // Creating new task
      setDueDate(format(date, 'yyyy-MM-dd'));
      setDueTime(format(date, 'HH:mm'));
    }
  }, [event, date]);

  // Function to create a task with due date in the tasks table and visualize it in the calendar view
  const createTask = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const dueDateTime = new Date(`${dueDate}T${dueTime}`);

      // Create task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          title,
          description,
          priority,
          category,
          status: 'pending',
          user_id: userData.user.id,
          due_date: dueDateTime.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select();

      if (taskError) throw taskError;

      // Also create calendar event for visualization
      const startDateTime = new Date(`${dueDate}T${dueTime}`);
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(startDateTime.getHours() + 1);

      onSave({
        title,
        description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: false,
        color: getPriorityColor(priority),
        related_task_id: taskData?.[0]?.id
      });
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (event) {
      // Editing existing event
      const startDateTime = new Date(`${dueDate}T${dueTime}`);
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(startDateTime.getHours() + 1);

      onSave({
        title,
        description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: false,
        color: getPriorityColor(priority)
      });
    } else {
      // Creating new task
      createTask();
    }
  };

  // Get color based on priority
  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'high':
        return '#ef4444'; // red-500
      case 'medium':
        return '#f59e0b'; // amber-500
      case 'low':
        return '#10b981'; // emerald-500
      default:
        return '#3b82f6'; // blue-500
    }
  };

  const colorOptions = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#ef4444', label: 'Red' },
    { value: '#10b981', label: 'Green' },
    { value: '#f59e0b', label: 'Yellow' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#6b7280', label: 'Gray' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {event ? 'Edit Task' : 'Create Task'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (for AI recommendations)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Describe your task in detail to get better AI recommendations"
              />
            </div>

            <div className="flex flex-wrap -mx-2 mb-4">
              <div className="w-1/2 px-2 mb-4">
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="w-1/2 px-2 mb-4">
                <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Time
                </label>
                <input
                  type="time"
                  id="dueTime"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap -mx-2 mb-4">
              <div className="w-1/2 px-2 mb-4">
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    setColor(getPriorityColor(e.target.value));
                  }}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="w-1/2 px-2 mb-4">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="work">Work</option>
                  <option value="study">Study</option>
                  <option value="chores">Chores</option>
                  <option value="health">Health</option>
                  <option value="social">Social</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between">
              <div>
                {event && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CalendarEventModal;
