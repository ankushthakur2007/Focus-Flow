import { supabase } from './supabase';

// Types for Google Calendar API
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  colorId?: string;
}

export interface CalendarTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  scope: string;
}

// Store tokens in Supabase
export const storeCalendarTokens = async (
  userId: string,
  tokens: CalendarTokens
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_calendar_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        token_type: tokens.token_type,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error storing calendar tokens:', error);
    throw error;
  }
};

// Get tokens from Supabase
export const getCalendarTokens = async (
  userId: string
): Promise<CalendarTokens | null> => {
  try {
    const { data, error } = await supabase
      .from('user_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      token_type: data.token_type,
      scope: data.scope,
    };
  } catch (error) {
    console.error('Error getting calendar tokens:', error);
    return null;
  }
};

// Refresh token if expired
export const refreshCalendarToken = async (
  userId: string
): Promise<CalendarTokens | null> => {
  try {
    const tokens = await getCalendarTokens(userId);
    if (!tokens) return null;

    // Check if token is expired
    if (Date.now() >= tokens.expires_at) {
      // Refresh token using your backend endpoint
      const response = await fetch('/api/calendar/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      });

      if (!response.ok) throw new Error('Failed to refresh token');

      const newTokens = await response.json();
      await storeCalendarTokens(userId, newTokens);
      return newTokens;
    }

    return tokens;
  } catch (error) {
    console.error('Error refreshing calendar token:', error);
    return null;
  }
};

// Fetch calendar events
export const fetchCalendarEvents = async (
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> => {
  try {
    const tokens = await refreshCalendarToken(userId);
    if (!tokens) throw new Error('No calendar tokens found');

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
        timeMin
      )}&timeMax=${encodeURIComponent(timeMax)}`,
      {
        headers: {
          Authorization: `${tokens.token_type} ${tokens.access_token}`,
        },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch calendar events');

    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};

// Create calendar event from task
export const createCalendarEvent = async (
  userId: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    reminders?: { useDefault: boolean };
    colorId?: string;
  }
): Promise<GoogleCalendarEvent> => {
  try {
    const tokens = await refreshCalendarToken(userId);
    if (!tokens) throw new Error('No calendar tokens found');

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `${tokens.token_type} ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) throw new Error('Failed to create calendar event');

    return await response.json();
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
};

// Update calendar event
export const updateCalendarEvent = async (
  userId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>
): Promise<GoogleCalendarEvent> => {
  try {
    const tokens = await refreshCalendarToken(userId);
    if (!tokens) throw new Error('No calendar tokens found');

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `${tokens.token_type} ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) throw new Error('Failed to update calendar event');

    return await response.json();
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
};

// Delete calendar event
export const deleteCalendarEvent = async (
  userId: string,
  eventId: string
): Promise<void> => {
  try {
    const tokens = await refreshCalendarToken(userId);
    if (!tokens) throw new Error('No calendar tokens found');

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `${tokens.token_type} ${tokens.access_token}`,
        },
      }
    );

    if (!response.ok) throw new Error('Failed to delete calendar event');
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
};
