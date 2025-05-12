import { useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import AuthContext from '../components/AuthContext';
import { logoutUser } from '../services/auth';
import { useRouter } from 'next/router';

const ProfilePage = () => {
  const [name, setName] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const { user } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setName(data.name || '');
          setDarkMode(data.dark_mode || false);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    // Apply dark mode to the document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name,
          dark_mode: darkMode,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setMessage({
        text: 'Profile saved successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({
        text: 'Failed to save profile',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="card max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={user?.email || ''}
              disabled
              className="input bg-gray-100 dark:bg-gray-700"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Your name"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="darkMode"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="darkMode" className="ml-2 block text-sm">
              Dark Mode
            </label>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                  : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-secondary"
            >
              Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
