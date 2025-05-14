import { ReactNode, useContext, useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthContext from './AuthContext';
import ThemeToggle from './ThemeToggle';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import Footer from './Footer';
import { supabase } from '../services/supabase';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to mark a notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      // Update the notification in the database
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      // Update the local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      // Update the unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Fetch notifications and unread count
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        setLoadingNotifications(true);

        // Get unread count
        const { count, error: countError } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)
          .eq('user_id', user.id);

        if (countError) throw countError;
        setUnreadCount(count || 0);

        // Only fetch notifications when dropdown is open
        if (notificationsOpen) {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

          if (error) throw error;
          setNotifications(data || []);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();

    // Set up real-time subscription for new notifications
    const subscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        // Increment unread count when new notification is received
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, notificationsOpen]);

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

      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {(user && !loading) || isDebugPage ? (
          <>
            <header className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm fixed top-0 left-0 right-0 z-20 transition-all duration-500 ${scrolled ? 'shadow-card' : ''}`}>
              <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center">
                    <Link href="/" className="text-xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent hover:from-primary-600 hover:to-primary-700 transition-all duration-300 transform hover:scale-105">
                      FocusFlow
                    </Link>
                  </div>

                  {/* Theme Toggle and Notification Bell (Mobile) */}
                  <div className="md:hidden flex items-center space-x-4">
                    <div className="relative" ref={notificationRef}>
                      <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 relative hover:shadow-md active:shadow-inner active:scale-95"
                        aria-label="Notifications"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-gray-700 dark:text-gray-200"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                        {unreadCount > 0 && (
                          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-danger-500 to-danger-600 rounded-full animate-pulse-slow shadow-glow-danger">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>

                      {notificationsOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-card overflow-hidden z-50 border border-gray-200 dark:border-gray-700 animate-fade-in">
                          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-800">
                            <h3 className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">Notifications</h3>
                            {unreadCount > 0 && (
                              <button
                                onClick={async () => {
                                  try {
                                    await supabase
                                      .from('notifications')
                                      .update({ is_read: true })
                                      .eq('user_id', user?.id)
                                      .eq('is_read', false);
                                    setUnreadCount(0);
                                  } catch (error) {
                                    console.error('Error marking notifications as read:', error);
                                  }
                                }}
                                className="text-xs bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-1 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800/40 transition-colors duration-300"
                              >
                                Mark all as read
                              </button>
                            )}
                          </div>

                          {loadingNotifications ? (
                            <div className="p-6 text-center">
                              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
                              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
                            </div>
                          ) : notifications.length > 0 ? (
                            <div className="max-h-96 overflow-y-auto">
                              {notifications.map((notification) => (
                                <div
                                  key={notification.id}
                                  onClick={() => {
                                    if (!notification.is_read) {
                                      markNotificationAsRead(notification.id);
                                    }

                                    // If there's a related task, navigate to it
                                    if (notification.related_task_id) {
                                      router.push(`/tasks?id=${notification.related_task_id}`);
                                      setNotificationsOpen(false);
                                    }
                                  }}
                                  className={`p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                                    !notification.is_read ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                                  } cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300`}
                                >
                                  <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                      {!notification.is_read && (
                                        <span className="inline-block w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse-slow"></span>
                                      )}
                                      {notification.title}
                                    </h4>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full ml-2">
                                      {new Date(notification.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{notification.message}</p>

                                  {notification.related_task_id && (
                                    <div className="mt-3 flex">
                                      <button className="text-xs bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 px-3 py-1 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800/40 transition-colors duration-300 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                        View Task
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center">
                              <div className="inline-block p-3 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                              </div>
                              <p className="text-gray-500 dark:text-gray-400 font-medium">No notifications yet</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">We'll notify you when something important happens</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <ThemeToggle />
                  </div>

                  {/* Desktop Navigation */}
                  <nav className="hidden md:flex space-x-2">
                    <Link
                      href="/tasks"
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive('/tasks') || isActive('/')
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:shadow-lg transform hover:translate-y-[-2px]'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-md'
                      }`}
                    >
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                        Tasks
                      </span>
                    </Link>
                    {/* Calendar Navigation Link */}
                    <Link
                      href="/calendar"
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive('/calendar')
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:shadow-lg transform hover:translate-y-[-2px]'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-md'
                      }`}
                    >
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        Calendar
                      </span>
                    </Link>
                    <Link
                      href="/mood"
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive('/mood')
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:shadow-lg transform hover:translate-y-[-2px]'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-md'
                      }`}
                    >
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" />
                        </svg>
                        Mood
                      </span>
                    </Link>
                    <Link
                      href="/personalized"
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive('/personalized')
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:shadow-lg transform hover:translate-y-[-2px]'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-md'
                      }`}
                    >
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        Personalized
                      </span>
                    </Link>
                    <Link
                      href="/analytics"
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive('/analytics')
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:shadow-lg transform hover:translate-y-[-2px]'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-md'
                      }`}
                    >
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                        Analytics
                      </span>
                    </Link>
                    <Link
                      href="/profile"
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive('/profile')
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:shadow-lg transform hover:translate-y-[-2px]'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-md'
                      }`}
                    >
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        Profile
                      </span>
                    </Link>
                  </nav>

                  {/* Desktop Theme Toggle and Notification Bell */}
                  <div className="hidden md:flex items-center space-x-4 mr-4">
                    <div className="relative" ref={notificationRef}>
                      <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                        aria-label="Notifications"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-gray-700 dark:text-gray-200"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                        {unreadCount > 0 && (
                          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>

                      {notificationsOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden z-50">
                          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notifications</h3>
                            {unreadCount > 0 && (
                              <button
                                onClick={async () => {
                                  try {
                                    await supabase
                                      .from('notifications')
                                      .update({ is_read: true })
                                      .eq('user_id', user?.id)
                                      .eq('is_read', false);
                                    setUnreadCount(0);
                                  } catch (error) {
                                    console.error('Error marking notifications as read:', error);
                                  }
                                }}
                                className="text-xs text-primary-500 hover:text-primary-600"
                              >
                                Mark all as read
                              </button>
                            )}
                          </div>

                          {loadingNotifications ? (
                            <div className="p-4 text-center">
                              <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
                            </div>
                          ) : notifications.length > 0 ? (
                            <div className="max-h-96 overflow-y-auto">
                              {notifications.map((notification) => (
                                <div
                                  key={notification.id}
                                  onClick={() => {
                                    if (!notification.is_read) {
                                      markNotificationAsRead(notification.id);
                                    }

                                    // If there's a related task, navigate to it
                                    if (notification.related_task_id) {
                                      router.push(`/tasks?id=${notification.related_task_id}`);
                                      setNotificationsOpen(false);
                                    }
                                  }}
                                  className={`p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                                    !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                  } cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700`}
                                >
                                  <div className="flex justify-between">
                                    <h4 className="font-medium text-gray-800 dark:text-gray-200">{notification.title}</h4>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(notification.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
                                  {!notification.is_read && (
                                    <div className="mt-2 flex justify-end">
                                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                              No notifications yet
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <ThemeToggle />
                  </div>

                  {/* Mobile Menu Button */}
                  <button
                    className="md:hidden flex items-center p-2 rounded-full text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-all duration-300 hover:shadow-md active:shadow-inner active:scale-95"
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
              className={`fixed inset-0 z-10 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 ${
                mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div
                className={`fixed top-16 right-0 bottom-0 w-72 bg-white dark:bg-gray-800 shadow-card transform transition-all duration-500 ease-in-out ${
                  mobileMenuOpen ? 'translate-x-0 rounded-l-2xl' : 'translate-x-full'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <nav className="flex flex-col p-6 space-y-3">
                  <Link
                    href="/tasks"
                    className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                      isActive('/tasks') || isActive('/')
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-sm'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    Tasks
                  </Link>
                  {/* Calendar Mobile Navigation Link */}
                  <Link
                    href="/calendar"
                    className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                      isActive('/calendar')
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-sm'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Calendar
                  </Link>
                  <Link
                    href="/mood"
                    className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                      isActive('/mood')
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-sm'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" />
                    </svg>
                    Mood
                  </Link>
                  <Link
                    href="/personalized"
                    className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                      isActive('/personalized')
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-sm'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    Personalized
                  </Link>
                  <Link
                    href="/analytics"
                    className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                      isActive('/analytics')
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-sm'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    Analytics
                  </Link>
                  <Link
                    href="/profile"
                    className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                      isActive('/profile')
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 hover:shadow-sm'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Profile
                  </Link>

                  {/* Theme Toggle in Mobile Menu */}
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>
                      <ThemeToggle />
                    </div>
                  </div>
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
