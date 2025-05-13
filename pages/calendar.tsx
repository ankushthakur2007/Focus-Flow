import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AuthContext from '../components/AuthContext';
import Layout from '../components/Layout';
import { fetchMonthEvents, fetchWeekEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../services/calendar-events';
import { CalendarEvent } from '../types/calendar';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  parseISO, isSameDay, isSameMonth, isToday, getDay, getDate } from 'date-fns';
import CalendarEventModal from '../components/CalendarEventModal';

type ViewMode = 'month' | 'week' | 'day';

export default function Calendar() {
  const { user, loading } = useContext(AuthContext);
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch events when user is logged in or date/view changes
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadEvents();
    }
  }, [user, loading, currentDate, viewMode]);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      let data: CalendarEvent[];
      if (viewMode === 'month') {
        data = await fetchMonthEvents(currentDate);
      } else if (viewMode === 'week') {
        data = await fetchWeekEvents(currentDate);
      } else {
        // Day view - fetch just for the selected day
        const start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);
        data = await fetchMonthEvents(currentDate);
      }
      setEvents(data);
      setError(null);
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(parseISO(event.start_time));
    setShowEventModal(true);
  };

  const handleSaveEvent = async (event: Partial<CalendarEvent>) => {
    try {
      if (selectedEvent) {
        // Update existing event
        const updatedEvent = await updateCalendarEvent(selectedEvent.id, event);
        if (updatedEvent) {
          setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
        }
      } else {
        // Create new event
        if (!user) return;

        const newEvent = await createCalendarEvent({
          ...event,
          user_id: user.id,
        } as Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>);

        if (newEvent) {
          setEvents(prev => [...prev, newEvent]);
        }
      }
      setShowEventModal(false);
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save event');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      const success = await deleteCalendarEvent(selectedEvent.id);
      if (success) {
        setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
        setShowEventModal(false);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event');
    }
  };

  const handlePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Start week on Sunday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const dateFormat = 'EEE';
    const days = [];
    let day = startDate;

    // Create header row with day names
    const dayHeaders = [];
    for (let i = 0; i < 7; i++) {
      dayHeaders.push(
        <div key={`header-${i}`} className="text-center font-medium py-2 border-b">
          {format(addDays(startDate, i), dateFormat)}
        </div>
      );
    }

    // Create calendar cells
    while (day <= endDate) {
      const formattedDate = format(day, 'd');
      const isCurrentMonth = isSameMonth(day, currentDate);
      const isCurrentDay = isToday(day);

      // Find events for this day
      const dayEvents = events.filter(event =>
        isSameDay(parseISO(event.start_time), day)
      );

      days.push(
        <div
          key={day.toString()}
          className={`min-h-[100px] p-1 border ${
            !isCurrentMonth ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : ''
          } ${isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
          onClick={() => handleDateClick(new Date(day))}
        >
          <div className="text-right p-1">
            <span className={`text-sm ${isCurrentDay ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
              {formattedDate}
            </span>
          </div>
          <div className="overflow-y-auto max-h-[80px]">
            {dayEvents.map(event => (
              <div
                key={event.id}
                className="text-xs mb-1 p-1 rounded truncate cursor-pointer"
                style={{ backgroundColor: event.color || '#3b82f6', color: 'white' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEventClick(event);
                }}
              >
                {format(parseISO(event.start_time), 'h:mm a')} {event.title}
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }

    // Create calendar grid
    const rows = [];
    let cells = [];

    days.forEach((day, i) => {
      if (i % 7 !== 0) {
        cells.push(day);
      } else {
        rows.push(cells);
        cells = [day];
      }
      if (i === days.length - 1) {
        rows.push(cells);
      }
    });

    return (
      <div>
        <div className="grid grid-cols-7 border-l border-r">
          {dayHeaders}
        </div>
        <div className="grid grid-cols-7 border-l">
          {days}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Start week on Sunday
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

    const days = [];
    let day = weekStart;

    // Create header row with day names and dates
    const dayHeaders = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = addDays(weekStart, i);
      const isCurrentDay = isToday(currentDay);

      dayHeaders.push(
        <div
          key={`header-${i}`}
          className={`text-center font-medium py-2 border-b ${isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
        >
          <div>{format(currentDay, 'EEE')}</div>
          <div className={`text-sm ${isCurrentDay ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto' : ''}`}>
            {format(currentDay, 'd')}
          </div>
        </div>
      );
    }

    // Create time slots
    const timeSlots = [];
    for (let hour = 8; hour < 20; hour++) {
      const hourFormatted = format(new Date().setHours(hour, 0, 0, 0), 'h a');

      const hourRow = [];
      for (let i = 0; i < 7; i++) {
        const currentDay = addDays(weekStart, i);
        const startTime = new Date(currentDay).setHours(hour, 0, 0, 0);
        const endTime = new Date(currentDay).setHours(hour + 1, 0, 0, 0);

        // Find events for this time slot
        const slotEvents = events.filter(event => {
          const eventStart = parseISO(event.start_time).getTime();
          return eventStart >= startTime && eventStart < endTime && isSameDay(parseISO(event.start_time), currentDay);
        });

        hourRow.push(
          <div
            key={`day-${i}-hour-${hour}`}
            className="border-r border-b min-h-[60px] relative"
            onClick={() => {
              const date = new Date(currentDay);
              date.setHours(hour, 0, 0, 0);
              handleDateClick(date);
            }}
          >
            {slotEvents.map(event => (
              <div
                key={event.id}
                className="absolute inset-x-0 mx-1 p-1 rounded text-xs truncate cursor-pointer text-white"
                style={{
                  backgroundColor: event.color || '#3b82f6',
                  top: `${(parseISO(event.start_time).getMinutes() / 60) * 100}%`,
                  height: '50px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEventClick(event);
                }}
              >
                {format(parseISO(event.start_time), 'h:mm a')} {event.title}
              </div>
            ))}
          </div>
        );
      }

      timeSlots.push(
        <div key={`hour-${hour}`} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-l">
          <div className="border-r border-b p-2 text-right text-sm text-gray-500">
            {hourFormatted}
          </div>
          {hourRow}
        </div>
      );
    }

    return (
      <div>
        <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-l border-r">
          <div className="border-r border-b"></div>
          {dayHeaders}
        </div>
        <div>
          {timeSlots}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Filter events for this day
    const dayEvents = events.filter(event =>
      isSameDay(parseISO(event.start_time), currentDate)
    );

    // Create time slots
    const timeSlots = [];
    for (let hour = 8; hour < 20; hour++) {
      const hourFormatted = format(new Date().setHours(hour, 0, 0, 0), 'h a');
      const startTime = new Date(currentDate).setHours(hour, 0, 0, 0);
      const endTime = new Date(currentDate).setHours(hour + 1, 0, 0, 0);

      // Find events for this time slot
      const slotEvents = dayEvents.filter(event => {
        const eventStart = parseISO(event.start_time).getTime();
        return eventStart >= startTime && eventStart < endTime;
      });

      timeSlots.push(
        <div key={`hour-${hour}`} className="grid grid-cols-[80px_1fr] border-l border-r border-b">
          <div className="p-2 text-right text-sm text-gray-500 border-r">
            {hourFormatted}
          </div>
          <div
            className="min-h-[60px] relative"
            onClick={() => {
              const date = new Date(currentDate);
              date.setHours(hour, 0, 0, 0);
              handleDateClick(date);
            }}
          >
            {slotEvents.map(event => (
              <div
                key={event.id}
                className="absolute inset-x-0 mx-2 p-2 rounded text-white text-sm cursor-pointer"
                style={{
                  backgroundColor: event.color || '#3b82f6',
                  top: `${(parseISO(event.start_time).getMinutes() / 60) * 100}%`,
                  height: '50px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEventClick(event);
                }}
              >
                {format(parseISO(event.start_time), 'h:mm a')} {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="text-center font-medium py-3 border-b bg-blue-50 dark:bg-blue-900/20">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </div>
        <div>
          {timeSlots}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <Head>
        <title>Calendar | FocusFlow</title>
        <meta name="description" content="View and manage your tasks in a calendar view" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">Calendar</h1>

          <div className="flex space-x-2">
            <button
              onClick={handleToday}
              className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
            >
              Today
            </button>
            <button
              onClick={handlePrevious}
              className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
            >
              &larr;
            </button>
            <button
              onClick={handleNext}
              className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
            >
              &rarr;
            </button>
            <div className="ml-4 flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
              <button
                onClick={() => handleViewModeChange('month')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'month'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-gray-700'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => handleViewModeChange('week')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'week'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-gray-700'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => handleViewModeChange('day')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'day'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-gray-700'
                }`}
              >
                Day
              </button>
            </div>
          </div>
        </div>

        <div className="text-xl font-semibold text-center mb-4">
          {viewMode === 'month'
            ? format(currentDate, 'MMMM yyyy')
            : viewMode === 'week'
            ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d')} - ${format(
                endOfWeek(currentDate, { weekStartsOn: 0 }),
                'MMM d, yyyy'
              )}`
            : format(currentDate, 'MMMM d, yyyy')}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-md">
            {error}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {viewMode === 'month' ? renderMonthView() : viewMode === 'week' ? renderWeekView() : renderDayView()}
          </div>
        )}
      </div>

      {showEventModal && (
        <CalendarEventModal
          event={selectedEvent}
          date={selectedDate}
          onClose={() => setShowEventModal(false)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </Layout>
  );
}
