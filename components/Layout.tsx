import { ReactNode, useContext, useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthContext from './AuthContext';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          <>
            <header className={`bg-white dark:bg-gray-800 shadow fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${scrolled ? 'shadow-md' : ''}`}>
              <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center">
                    <Link href="/" className="text-xl font-bold text-primary-500">
                      FocusFlow
                    </Link>
                  </div>

                  {/* Desktop Navigation */}
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
                      href="/calendar"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        isActive('/calendar')
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      Calendar
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

                  {/* Mobile Menu Button */}
                  <button
                    className="md:hidden flex items-center p-2 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                  >
                    {mobileMenuOpen ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </header>

            {/* Mobile Navigation Menu */}
            <div
              className={`fixed inset-0 z-10 bg-gray-800 bg-opacity-75 transition-opacity duration-300 ${
                mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div
                className={`fixed top-16 right-0 bottom-0 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
                  mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <nav className="flex flex-col p-4 space-y-2">
                  <Link
                    href="/tasks"
                    className={`px-3 py-3 rounded-md text-sm font-medium ${
                      isActive('/tasks') || isActive('/')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Tasks
                  </Link>
                  <Link
                    href="/mood"
                    className={`px-3 py-3 rounded-md text-sm font-medium ${
                      isActive('/mood')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Mood
                  </Link>
                  <Link
                    href="/personalized"
                    className={`px-3 py-3 rounded-md text-sm font-medium ${
                      isActive('/personalized')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Personalized
                  </Link>
                  <Link
                    href="/calendar"
                    className={`px-3 py-3 rounded-md text-sm font-medium ${
                      isActive('/calendar')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Calendar
                  </Link>
                  <Link
                    href="/profile"
                    className={`px-3 py-3 rounded-md text-sm font-medium ${
                      isActive('/profile')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                </nav>
              </div>
            </div>

            {/* Spacer to prevent content from being hidden under fixed header */}
            <div className="h-16"></div>
          </>
        )}

        <main className="flex-grow">
          {children}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Layout;
