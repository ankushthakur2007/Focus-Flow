# FocusFlow Web Application

A productivity app built with Next.js, Supabase, and Google's Gemini AI.

## Features

- Task management with priorities and categories
- Mood tracking
- AI-powered personalized recommendations
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
   ```
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

You can create these tables by running the SQL commands in `supabase-schema.sql` in the Supabase SQL Editor.
