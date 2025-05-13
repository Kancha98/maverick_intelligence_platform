'use client';

import { Roboto } from 'next/font/google';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SessionProvider } from 'next-auth/react';
import './globals.css';

const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700', '900'] });

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#fbbf24' },
    secondary: { main: '#6366f1' },
    background: {
      default: '#181a20',
      paper: '#23242a',
    },
    text: {
      primary: '#fff',
      secondary: '#b0b8c1',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
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
    <html lang="en">
      <body className={roboto.className} style={{ background: '#181a20' }}>
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