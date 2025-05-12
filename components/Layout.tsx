import { ReactNode, useContext } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthContext from './AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();

  const isActive = (path: string) => router.pathname === path;

  return (
    <>
      <Head>
        <title>FocusFlow</title>
        <meta name="description" content="A productivity app to help you focus on what matters" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex flex-col">
        {user && !loading && (
          <header className="bg-white dark:bg-gray-800 shadow">
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <Link href="/" className="text-xl font-bold text-primary-500">
                    FocusFlow
                  </Link>
                </div>
                <nav className="hidden md:flex space-x-4">
                  <Link
                    href="/tasks"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/tasks') || isActive('/')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Tasks
                  </Link>
                  <Link
                    href="/mood"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/mood')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Mood
                  </Link>
                  <Link
                    href="/personalized"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/personalized')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Personalized
                  </Link>
                  <Link
                    href="/profile"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/profile')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Profile
                  </Link>
                </nav>
              </div>
            </div>
          </header>
        )}

        <main className="flex-grow">
          {children}
        </main>

        <footer className="bg-white dark:bg-gray-800 shadow">
          <div className="container mx-auto px-4 py-4">
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} FocusFlow. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Layout;
