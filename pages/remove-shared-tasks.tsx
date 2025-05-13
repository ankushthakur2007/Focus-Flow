import { useState, useEffect, useContext } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AuthContext from '../components/AuthContext';
import ResponsiveContainer from '../components/ResponsiveContainer';

const RemoveSharedTasksPage: NextPage = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleRemoveSharedTasks = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      const response = await fetch('/api/remove-shared-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove shared tasks');
      }

      setSuccess(true);
      setResult(data);
    } catch (err: any) {
      console.error('Error removing shared tasks:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Remove Shared Tasks | FocusFlow</title>
        <meta name="description" content="Remove all shared tasks from FocusFlow" />
      </Head>

      <ResponsiveContainer>
        <div className="py-8">
          <h1 className="text-2xl font-bold mb-6">Remove Shared Tasks</h1>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This action will permanently remove all shared tasks from your account. This includes:
            </p>

            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mb-6 space-y-2">
              <li>Tasks you have shared with others</li>
              <li>Tasks others have shared with you</li>
              <li>All task sharing data in the database</li>
            </ul>

            <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 p-4 rounded-md mb-6">
              <p className="font-bold">Warning</p>
              <p>This action cannot be undone. All shared task data will be permanently deleted.</p>
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-md mb-6">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 p-4 rounded-md mb-6">
                <p className="font-bold">Success</p>
                <p>All shared tasks have been removed successfully.</p>
                {result && (
                  <div className="mt-2 text-sm">
                    <p>Owner shares deleted: {result.ownerSharesDeleted}</p>
                    <p>Shared with me deleted: {result.sharedWithMeDeleted}</p>
                    <p>View dropped: {result.viewDropped ? 'Yes' : 'No'}</p>
                    <p>Table dropped: {result.tableDropped ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleRemoveSharedTasks}
                disabled={loading || success}
                className={`px-4 py-2 rounded-md font-medium ${
                  loading || success
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : success ? (
                  'Removed Successfully'
                ) : (
                  'Remove All Shared Tasks'
                )}
              </button>

              <button
                onClick={() => router.push('/tasks')}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Back to Tasks
              </button>
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </>
  );
};

export default RemoveSharedTasksPage;
