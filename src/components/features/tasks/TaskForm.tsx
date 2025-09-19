import { useState } from 'react';
import TouchFriendlyButton from '../../ui/TouchFriendlyButton';
import { format } from 'date-fns';

interface TaskFormProps {
  onSubmit: (title: string, description: string, priority: string, category: string, dueDate?: string) => void;
  onCancel: () => void;
}

const TaskForm = ({ onSubmit, onCancel }: TaskFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('other');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title, description, priority, category, dueDate || undefined);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('other');
      setDueDate('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-lg mx-auto w-full">
      <h2 className="text-xl sm:text-lg font-bold mb-5 sm:mb-4">Add New Task</h2>

      <div className="mb-5 sm:mb-4">
        <label htmlFor="title" className="block text-base sm:text-sm font-medium mb-2 sm:mb-1">
          Task Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input text-base sm:text-sm py-3 sm:py-2"
          placeholder="Enter task title"
          required
          autoComplete="off"
        />
      </div>

      <div className="mb-5 sm:mb-4">
        <label htmlFor="description" className="block text-base sm:text-sm font-medium mb-2 sm:mb-1">
          Description (for AI recommendations)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input h-32 sm:h-24 text-base sm:text-sm py-3 sm:py-2"
          placeholder="Describe your task in detail to get better AI recommendations"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4 mb-5 sm:mb-4">
        <div>
          <label htmlFor="priority" className="block text-base sm:text-sm font-medium mb-2 sm:mb-1">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="input text-base sm:text-sm py-3 sm:py-2"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label htmlFor="category" className="block text-base sm:text-sm font-medium mb-2 sm:mb-1">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input text-base sm:text-sm py-3 sm:py-2"
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

      <div className="mb-7 sm:mb-6">
        <label htmlFor="dueDate" className="block text-base sm:text-sm font-medium mb-2 sm:mb-1">
          Due Date (Optional)
        </label>
        <input
          type="datetime-local"
          id="dueDate"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="input text-base sm:text-sm py-3 sm:py-2"
        />
        <p className="text-xs text-gray-500 mt-1">Set a due date to receive notifications</p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-2 sm:space-x-2">
        <TouchFriendlyButton
          type="button"
          onClick={onCancel}
          className="btn btn-secondary mt-3 sm:mt-0 text-base sm:text-sm py-3 sm:py-2"
          ariaLabel="Cancel adding task"
        >
          Cancel
        </TouchFriendlyButton>
        <TouchFriendlyButton
          type="submit"
          className="btn btn-primary text-base sm:text-sm py-3 sm:py-2"
          ariaLabel="Add new task"
        >
          Add Task
        </TouchFriendlyButton>
      </div>
    </form>
  );
};

export default TaskForm;
