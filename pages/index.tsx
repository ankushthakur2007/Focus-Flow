import type { NextPage } from 'next';
import { useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthContext from '../src/components/features/auth/AuthContext';
import TasksPage from './tasks';

const Home: NextPage = () => {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <TasksPage />;
};

export default Home;
