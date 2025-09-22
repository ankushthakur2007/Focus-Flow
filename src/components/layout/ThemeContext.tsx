import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/services/supabase';
import { User } from '@supabase/supabase-js';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
  setDarkMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode; user: User | null }> = ({
  children,
  user,
}) => {
  const [darkMode, setDarkMode] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Load user's theme preference from Supabase
  useEffect(() => {
    const loadThemePreference = async () => {
      // First check localStorage for theme preference
      const localTheme = localStorage.getItem('theme');

      if (localTheme) {
        setDarkMode(localTheme === 'dark');
        setInitialized(true);
      } else if (user) {
        // If no local preference, check user profile
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('dark_mode')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          if (data) {
            setDarkMode(data.dark_mode || false);
            // Save to localStorage for faster access next time
            localStorage.setItem('theme', data.dark_mode ? 'dark' : 'light');
          }
        } catch (error) {
          console.error('Error loading theme preference:', error);
          // Default to system preference if error
          checkSystemPreference();
        }
      } else {
        // If no user, check system preference
        checkSystemPreference();
      }

      setInitialized(true);
    };

    const checkSystemPreference = () => {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
    };

    loadThemePreference();
  }, [user]);

  // Apply theme to document
  useEffect(() => {
    if (!initialized) return;

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');

    // If user is logged in, save preference to profile
    if (user) {
      const saveThemePreference = async () => {
        try {
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              dark_mode: darkMode,
              updated_at: new Date().toISOString(),
            });
        } catch (error) {
          console.error('Error saving theme preference:', error);
        }
      };

      saveThemePreference();
    }
  }, [darkMode, initialized, user]);

  // Add keyboard shortcut for toggling dark mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle dark mode with Shift+D
      if (event.shiftKey && event.key === 'D') {
        toggleDarkMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
