import { useState } from 'react';

interface TaskFormProps {
  onSubmit: (title: string, description: string, priority: string, category: string) => void;
  onCancel: () => void;
}

const TaskForm = ({ onSubmit, onCancel }: TaskFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('other');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title, description, priority, category);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('other');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="text-lg font-bold mb-4">Add New Task</h2>

      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Task Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="Enter task title"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description (for AI recommendations)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input h-24"
          placeholder="Describe your task in detail to get better AI recommendations"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium mb-1">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="input"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
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

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
        >
          Add Task
        </button>
      </div>
    </form>
  );
};

export default TaskForm;
