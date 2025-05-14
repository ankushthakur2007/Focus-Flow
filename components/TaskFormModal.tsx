import { useState, useEffect } from 'react';
import TouchFriendlyButton from './TouchFriendlyButton';
import { format, isAfter, parseISO } from 'date-fns';

interface TaskFormModalProps {
  onSubmit: (title: string, description: string, priority: string, category: string, startDate?: string, dueDate?: string) => void;
  onClose: () => void;
}

const TaskFormModal = ({ onSubmit, onClose }: TaskFormModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('other');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dateError, setDateError] = useState('');

  // Validate dates when they change
  useEffect(() => {
    if (startDate && dueDate) {
      if (isAfter(parseISO(startDate), parseISO(dueDate))) {
        setDateError('Start date cannot be after due date');
      } else {
        setDateError('');
      }
    } else {
      setDateError('');
    }
  }, [startDate, dueDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate dates before submission
    if (startDate && dueDate && isAfter(parseISO(startDate), parseISO(dueDate))) {
      setDateError('Start date cannot be after due date');
      return;
    }

    if (title.trim()) {
      onSubmit(title, description, priority, category, startDate || undefined, dueDate || undefined);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('other');
      setStartDate('');
      setDueDate('');
      setDateError('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">Add New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                placeholder="Enter task title"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (for AI recommendations)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                rows={3}
                placeholder="Describe your task in detail to get better AI recommendations"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">When will you start working on this task?</p>
              </div>

              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  id="dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">When does this task need to be completed?</p>
              </div>
            </div>

            {dateError && (
              <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-xl">
                <p>{dateError}</p>
              </div>
            )}
          </form>
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <TouchFriendlyButton
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 hover:shadow-sm active:shadow-inner active:scale-95"
          >
            Cancel
          </TouchFriendlyButton>
          <TouchFriendlyButton
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-md hover:from-primary-600 hover:to-primary-700 flex items-center disabled:opacity-50 transition-all duration-300 active:shadow-inner active:scale-95"
          >
            Add Task
          </TouchFriendlyButton>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal;
