import { useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import AuthContext from '../components/AuthContext';
import { Mood } from '../types/mood';
import { format, parseISO } from 'date-fns';

const moods = [
  { name: 'Energetic', emoji: '⚡' },
  { name: 'Happy', emoji: '😊' },
  { name: 'Calm', emoji: '😌' },
  { name: 'Tired', emoji: '😴' },
  { name: 'Stressed', emoji: '😰' },
  { name: 'Sad', emoji: '😢' },
  { name: 'Angry', emoji: '😠' },
  { name: 'Anxious', emoji: '😟' },
];

const MoodPage = () => {
  const [moodHistory, setMoodHistory] = useState<Mood[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;

    const fetchMoods = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('moods')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(20);

        if (error) {
          throw error;
        }

        setMoodHistory(data || []);
      } catch (error) {
        console.error('Error fetching moods:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMoods();

    // Set up realtime subscription
    const subscription = supabase
      .channel('public:moods')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'moods',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchMoods();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const logMood = async (mood: { name: string; emoji: string }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('moods')
        .insert([{
          name: mood.name,
          emoji: mood.emoji,
          user_id: user.id,
          timestamp: new Date().toISOString(),
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging mood:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">How are you feeling today?</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {moods.map((mood) => (
          <button
            key={mood.name}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-4"
            onClick={() => logMood(mood)}
          >
            <span className="text-4xl mb-2">{mood.emoji}</span>
            <span className="font-medium">{mood.name}</span>
          </button>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-4">Mood History</h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : moodHistory.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No mood logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {moodHistory.map((mood) => (
            <div
              key={mood.id}
              className="card flex items-center p-4"
            >
              <span className="text-3xl mr-4">{mood.emoji}</span>
              <div>
                <p className="font-medium">{mood.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {mood.timestamp
                    ? format(parseISO(mood.timestamp), 'MMM d, h:mm a')
                    : 'Just now'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MoodPage;
