'use client';

import { Roboto } from 'next/font/google';
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SessionProvider } from 'next-auth/react';
import './globals.css';

const roboto = Roboto({ 
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
});

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#00b86b' },
    secondary: { main: '#6366f1' },
    background: {
      default: '#f7fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#4b5563',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: roboto.style.fontFamily,
    h1: { fontWeight: 900 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={roboto.className}>
      <body>
        <SessionProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
} 