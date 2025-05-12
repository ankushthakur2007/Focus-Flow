#!/bin/bash

# Script to help deploy FocusFlow to Vercel

echo "FocusFlow Deployment Helper"
echo "=========================="
echo ""
echo "This script will help you deploy FocusFlow to Vercel."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI is not installed. Would you like to install it? (y/n)"
    read -r install_vercel
    if [[ "$install_vercel" =~ ^[Yy]$ ]]; then
        npm install -g vercel
    else
        echo "Please install Vercel CLI manually and run this script again."
        exit 1
    fi
fi

echo "Logging in to Vercel..."
vercel login

echo "Deploying to Vercel..."
vercel --prod

echo ""
echo "Deployment complete!"
echo ""
echo "IMPORTANT: Don't forget to configure your Supabase project:"
echo "1. Go to your Supabase project settings"
echo "2. Under 'Authentication' > 'URL Configuration', add your Vercel deployment URL to the 'Site URL' and 'Redirect URLs'"
echo "3. For Google and GitHub authentication:"
echo "   - Go to 'Authentication' > 'Providers'"
echo "   - Enable Google and GitHub providers"
echo "   - Follow the instructions to set up OAuth credentials for each provider"
echo "   - Add your Vercel deployment URL + '/auth/callback' to the redirect URLs"
echo ""
echo "Your FocusFlow app is now deployed and ready to use!"
