import { ReactNode, useContext, useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthContext from './AuthContext';
import ThemeToggle from './ThemeToggle';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import Footer from './Footer';
import NotificationBell from './NotificationBell';

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

  // Add keyboard shortcuts for navigation
  useEffect(() => {
    let keysPressed: Record<string, boolean> = {};
    let keyTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if not in an input field
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      keysPressed[event.key] = true;

      // Clear previous timeout
      if (keyTimeout) {
        clearTimeout(keyTimeout);
      }

      // Set a timeout to clear the keys pressed
      keyTimeout = setTimeout(() => {
        keysPressed = {};
      }, 1000);

      // Navigation shortcuts with 'g' prefix
      if (keysPressed['g'] || keysPressed['G']) {
        if (keysPressed['t'] || keysPressed['T']) {
          // Go to Tasks
          router.push('/tasks');
          keysPressed = {};
        } else if (keysPressed['c'] || keysPressed['C']) {
          // Go to Calendar
          router.push('/calendar');
          keysPressed = {};
        } else if (keysPressed['m'] || keysPressed['M']) {
          // Go to Mood
          router.push('/mood');
          keysPressed = {};
        } else if (keysPressed['p'] || keysPressed['P']) {
          // Go to Personalized
          router.push('/personalized');
          keysPressed = {};
        } else if (keysPressed['a'] || keysPressed['A']) {
          // Go to Analytics
          router.push('/analytics');
          keysPressed = {};
        } else if (keysPressed['u'] || keysPressed['U']) {
          // Go to Profile (user)
          router.push('/profile');
          keysPressed = {};
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (keyTimeout) {
        clearTimeout(keyTimeout);
      }
    };
  }, [router]);

  const isActive = (path: string) => router.pathname === path;

  // Check if the current page is a debug page that should be accessible without auth
  const isDebugPage = router.pathname.includes('debug') || router.pathname.includes('oauth-debug') || router.pathname.includes('direct-oauth-test');

  return (
    <>
      <Head>
        <title>FocusFlow</title>
        <meta name="description" content="A productivity app to help you focus on what matters" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex flex-col">
        {(user && !loading) || isDebugPage ? (
          <>
            <header className={`bg-white dark:bg-gray-800 shadow fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${scrolled ? 'shadow-md' : ''}`}>
              <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center">
                    <Link href="/" className="text-xl font-bold text-primary-500">
                      FocusFlow
                    </Link>
                  </div>

                  {/* Theme Toggle and Notification Bell (Mobile) */}
                  <div className="md:hidden flex items-center space-x-2">
                    <NotificationBell />
                    <ThemeToggle />
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
                    {/* Calendar Navigation Link */}
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
                      href="/analytics"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        isActive('/analytics')
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      Analytics
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

                  {/* Desktop Theme Toggle and Notification Bell */}
                  <div className="hidden md:flex items-center space-x-2 mr-4">
                    <NotificationBell />
                    <ThemeToggle />
                  </div>

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
                  {/* Calendar Mobile Navigation Link */}
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
                    href="/analytics"
                    className={`px-3 py-3 rounded-md text-sm font-medium ${
                      isActive('/analytics')
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Analytics
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
        ) : null}

        <main className="flex-grow">
          {children}
        </main>

        <Footer />

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp />
      </div>
    </>
  );
};

export default Layout;
