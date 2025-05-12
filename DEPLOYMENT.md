# FocusFlow Deployment Guide

This guide will walk you through the process of deploying the FocusFlow web application to Vercel.

## Prerequisites

Before you begin, make sure you have:

1. A [GitHub](https://github.com) account
2. A [Vercel](https://vercel.com) account
3. A [Supabase](https://supabase.com) account
4. A [Google AI Studio](https://makersuite.google.com/app/apikey) account for the Gemini API

## Step 1: Prepare Your Repository

1. Fork or clone the FocusFlow repository to your GitHub account
2. Make sure your repository is public or that you have connected Vercel to your GitHub account

## Step 2: Deploy to Vercel

### Option 1: Using the Vercel Web Interface

1. Log in to your [Vercel account](https://vercel.com)
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
5. Add the following environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `NEXT_PUBLIC_GEMINI_API_KEY`: Your Gemini API key
6. Click "Deploy"

### Option 2: Using the Vercel CLI

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```
2. Navigate to your project directory:
   ```
   cd focusflow-web
   ```
3. Run the deployment script:
   ```
   ./deploy-to-vercel.sh
   ```
4. Follow the prompts to complete the deployment

## Step 3: Configure Supabase

After deploying to Vercel, you need to configure your Supabase project:

1. Go to your [Supabase project dashboard](https://app.supabase.com)
2. Navigate to "Authentication" > "URL Configuration"
3. Add your Vercel deployment URL (e.g., `https://your-app.vercel.app`) to:
   - Site URL
   - Redirect URLs (add both `https://your-app.vercel.app` and `https://your-app.vercel.app/auth/callback`)

## Step 4: Configure OAuth Providers

### Google Authentication

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Enable "Google"
4. Follow the instructions to set up Google OAuth credentials:
   - Go to the [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Navigate to "APIs & Services" > "Credentials"
   - Create an OAuth 2.0 Client ID
   - Add your Vercel deployment URL + `/auth/callback` to the authorized redirect URIs
   - Copy the Client ID and Client Secret
5. Enter the Client ID and Client Secret in your Supabase settings

### GitHub Authentication

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Enable "GitHub"
4. Follow the instructions to set up GitHub OAuth credentials:
   - Go to your [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Add your Vercel deployment URL + `/auth/callback` to the callback URL
   - Copy the Client ID and Client Secret
5. Enter the Client ID and Client Secret in your Supabase settings

## Step 5: Test Your Deployment

1. Visit your Vercel deployment URL
2. Test the authentication flow:
   - Sign up with email and password
   - Sign in with Google
   - Sign in with GitHub
3. Test the core functionality:
   - Create tasks
   - Log moods
   - View personalized recommendations

## Troubleshooting

If you encounter issues during deployment:

1. Check the Vercel deployment logs for errors
2. Verify that all environment variables are correctly set
3. Ensure your Supabase project is properly configured
4. Check that your OAuth providers are correctly set up

For more help, refer to the [Vercel documentation](https://vercel.com/docs) or [Supabase documentation](https://supabase.com/docs).
