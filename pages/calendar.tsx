import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AuthContext from '../components/AuthContext';
import Layout from '../components/Layout';
import { fetchCalendarEvents, GoogleCalendarEvent } from '../services/calendar';
import { format, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';

export default function Calendar() {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Check if calendar is connected and fetch events
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      checkCalendarConnection();
      loadEvents();
    }
  }, [user, loading, currentWeekStart]);

  // Handle query parameters for connection status
  useEffect(() => {
    if (router.query.connected === 'true') {
      setCalendarConnected(true);
    }

    if (router.query.error) {
      setError(typeof router.query.error === 'string' ? router.query.error : 'Failed to connect to Google Calendar');
    }
  }, [router.query]);

  const checkCalendarConnection = async () => {
    try {
      // Try to fetch events as a way to check if connected
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await fetchCalendarEvents(user!.id, timeMin, timeMax);
      setCalendarConnected(true);
    } catch (error) {
      console.error('Calendar not connected:', error);
      setCalendarConnected(false);
    }
  };

  const loadEvents = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const timeMin = currentWeekStart.toISOString();
      const timeMax = endOfWeek(currentWeekStart, { weekStartsOn: 1 }).toISOString();

      const calendarEvents = await fetchCalendarEvents(user.id, timeMin, timeMax);
      setEvents(calendarEvents);
      setError(null);
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  };

  const connectToGoogleCalendar = () => {
    // Redirect to Google OAuth flow
    // This URL should be configured in your Google Cloud Console
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/api/calendar/callback`;
    const SCOPES = encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events');

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${SCOPES}&access_type=offline&prompt=consent`;
  };

  const previousWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, -7));
  };

  const nextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  const renderWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(currentWeekStart, i);
      days.push(
        <div key={i} className="border p-2 bg-gray-50 font-medium">
          {format(day, 'EEE, MMM d')}
        </div>
      );
    }
    return days;
  };

  const renderEvents = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(currentWeekStart, i);
      const dayStart = new Date(day.setHours(0, 0, 0, 0)).toISOString();
      const dayEnd = new Date(day.setHours(23, 59, 59, 999)).toISOString();

      // Filter events for this day
      const dayEvents = events.filter(event => {
        const eventStart = event.start.dateTime;
        return eventStart >= dayStart && eventStart <= dayEnd;
      });

      days.push(
        <div key={i} className="border p-2 min-h-[150px]">
          {dayEvents.length > 0 ? (
            dayEvents.map(event => (
              <div key={event.id} className="mb-2 p-2 bg-blue-100 rounded">
                <div className="font-medium">{event.summary}</div>
                <div className="text-sm text-gray-600">
                  {format(parseISO(event.start.dateTime), 'h:mm a')}
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-sm">No events</div>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <Layout>
      <Head>
        <title>Calendar | FocusFlow</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Calendar</h1>

        {!calendarConnected ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Connect to Google Calendar</h2>
            <p className="mb-4">
              Connect your Google Calendar to view and manage your events alongside your tasks.
            </p>
            <button
              onClick={connectToGoogleCalendar}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Connect Google Calendar
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b">
              <button
                onClick={previousWeek}
                className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
              >
                &larr; Previous
              </button>

              <h2 className="text-lg font-semibold">
                {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'MMMM d, yyyy')}
              </h2>

              <button
                onClick={nextWeek}
                className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
              >
                Next &rarr;
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">Loading calendar events...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">{error}</div>
            ) : (
              <div className="grid grid-cols-7">
                {renderWeekDays()}
                {renderEvents()}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
