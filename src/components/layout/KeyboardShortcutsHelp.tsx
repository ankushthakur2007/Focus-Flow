import { useState, useEffect } from 'react';

const KeyboardShortcutsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle the help dialog with Shift+?
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === '?') {
        setIsOpen(prev => !prev);
      }

      // Close with Escape key
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-10 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (Shift+?)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={() => setIsOpen(false)}
      ></div>
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 pointer-events-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-lg mb-2">General</h3>
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span>Show/hide keyboard shortcuts</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">Shift + ?</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Toggle dark mode</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">Shift + D</kbd>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-lg mb-2">Navigation</h3>
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span>Go to Tasks</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">G + T</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Go to Mood</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">G + M</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Go to Personalized</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">G + P</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Go to Analytics</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">G + A</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Go to Shared</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">G + S</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Go to Profile</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">G + U</kbd>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Press <kbd className="px-1 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> to close this dialog
          </div>
        </div>
      </div>
    </>
  );
};

export default KeyboardShortcutsHelp;
