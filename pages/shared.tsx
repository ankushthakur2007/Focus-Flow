import { useState, useEffect, useContext } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AuthContext from '../components/AuthContext';
import ResponsiveContainer from '../components/ResponsiveContainer';
import SharedTasksSection from '../components/SharedTasksSection';
import { getPendingTaskShares } from '../services/taskSharing';

const SharedTasksPage: NextPage = () => {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loadingPending, setLoadingPending] = useState<boolean>(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadPendingCount();
    }
  }, [user]);

  const loadPendingCount = async () => {
    try {
      setLoadingPending(true);
      const pendingShares = await getPendingTaskShares();
      setPendingCount(pendingShares.length);
    } catch (error) {
      console.error('Error loading pending shares count:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Shared Tasks | FocusFlow</title>
        <meta name="description" content="View and manage tasks shared with you" />
      </Head>

      <ResponsiveContainer className="py-8 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Shared Tasks</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage tasks shared with you
            </p>
          </div>
          
          {!loadingPending && pendingCount > 0 && (
            <div className="mt-4 sm:mt-0 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>You have {pendingCount} pending task invitation{pendingCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <SharedTasksSection />
      </ResponsiveContainer>
    </>
  );
};

export default SharedTasksPage;
