# Google OAuth Setup Guide

## Issue Fixed
The Google OAuth callback was failing because of an incorrect redirect URI configuration. We've updated the NextAuth configuration to handle this better.

## Required Environment Variables
Create or update your `.env.local` file with the following variables:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Google OAuth Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Select your OAuth 2.0 Client ID or create a new one
4. Make sure to add these authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google` (for production)

## Testing
After updating your Google OAuth settings and environment variables, restart your server with:
```
npm run dev
```

Then try the "Continue with Google" button again. The authentication should now work properly. 