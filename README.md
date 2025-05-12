# FocusFlow Web Application

A productivity app built with Next.js, Supabase, and Google's Gemini AI.

## Features

- Task management with priorities and categories
- Mood tracking
- AI-powered personalized recommendations
- Google Calendar integration
- Dark mode support
- Google and GitHub authentication

## Deployment to Vercel

### Prerequisites

- A [Vercel](https://vercel.com) account
- A [Supabase](https://supabase.com) account
- A [Google AI Studio](https://makersuite.google.com/app/apikey) account for Gemini API

### Deployment Steps

1. Fork or clone this repository to your GitHub account
2. Log in to your Vercel account
3. Click "Add New" > "Project"
4. Import your GitHub repository
5. Configure the project:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
6. Add the following environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `NEXT_PUBLIC_GEMINI_API_KEY`: Your Gemini API key
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Same as your Google OAuth client ID (needed for frontend)
   - `NEXT_PUBLIC_SITE_URL`: Your Vercel deployment URL
7. Click "Deploy"

### Post-Deployment Configuration

1. Go to your Supabase project settings
2. Under "Authentication" > "URL Configuration", add your Vercel deployment URL to the "Site URL" and "Redirect URLs"
3. For Google and GitHub authentication:
   - Go to "Authentication" > "Providers"
   - Enable Google and GitHub providers
   - Follow the instructions to set up OAuth credentials for each provider
   - Add your Vercel deployment URL + `/auth/callback` to the redirect URLs

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NEXT_PUBLIC_SITE_URL=https://focus-flow-ankushthakur2007.vercel.app
   ```

   Note: For local development, you can change the NEXT_PUBLIC_SITE_URL to http://localhost:3000
4. Start the development server:
   ```
   npm run dev
   ```

## Database Setup

The application requires the following tables in Supabase:
- profiles
- tasks
- moods
- recommendations
- task_chats
- user_calendar_tokens
- task_calendar_events

You can create these tables by running the SQL commands in `supabase-schema.sql` and `supabase-calendar-schema.sql` in the Supabase SQL Editor.

## Calendar Integration Setup

1. Create a Google Cloud project and enable the Google Calendar API
2. Create OAuth 2.0 credentials:
   - Go to the Google Cloud Console > APIs & Services > Credentials
   - Create an OAuth 2.0 Client ID
   - Set the authorized redirect URI to `https://focus-flow-ankushthakur2007.vercel.app/api/calendar/callback` for production
   - For local development, you can add `http://localhost:3000/api/calendar/callback` as an additional redirect URI
3. Add the following scopes to your Google OAuth provider in Supabase:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
4. Add your Google client ID and secret to your environment variables
