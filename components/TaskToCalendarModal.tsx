import { useState } from 'react';
import { createCalendarEvent } from '../services/calendar';
import { Task } from '../types/task';

interface TaskToCalendarModalProps {
  task: Task;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TaskToCalendarModal = ({
  task,
  userId,
  isOpen,
  onClose,
  onSuccess,
}: TaskToCalendarModalProps) => {
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!startDate || !startTime) {
      setError('Please select a date and time');
      setLoading(false);
      return;
    }

    try {
      // Calculate end time based on duration
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(start.getTime() + duration * 60000);

      // Create calendar event
      await createCalendarEvent(userId, {
        summary: task.title,
        description: task.description || '',
        start: {
          dateTime: start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: true,
        },
        colorId: task.priority === 'high' ? '4' : task.priority === 'medium' ? '5' : '6',
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating calendar event:', error);
      setError('Failed to create calendar event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Add Task to Calendar</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task
            </label>
            <div className="p-3 bg-gray-50 rounded border">
              <p className="font-medium">{task.title}</p>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="startDate"
              className="w-full p-2 border rounded"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              type="time"
              id="startTime"
              className="w-full p-2 border rounded"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <select
              id="duration"
              className="w-full p-2 border rounded"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
          
          {error && (
            <div className="mb-4 text-red-500 text-sm">{error}</div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add to Calendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskToCalendarModal;
