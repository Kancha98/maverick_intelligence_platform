'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import {
  Box, Typography, Button, Drawer, List, ListItem, ListItemText, Divider, Avatar, ListItemIcon, Paper, Link, AppBar, Toolbar, IconButton, Card as MUICard, CardContent, CardActions
} from '@mui/material';
import { Home, BarChart, Book, Notifications, AccountCircle, MenuBook, Logout, InsertChartOutlined, Menu as MenuIcon, ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Sidebar from '../components/Sidebar';
import { navLinks } from '../components/navLinks';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const drawerWidth = 270;

const PlaceholderLogo = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2 }}>
    <img src="/logo.png" alt="Maverick Intelligence Logo" style={{ width: 44, height: 44, borderRadius: 10 }} />
  </Box>
);

// Royalty-free stock market video (Pexels)
const VIDEO_URL = 'https://player.vimeo.com/external/332964948.sd.mp4?s=2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e&profile_id=164&oauth2_token_id=57447761';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [drawerOpen, setDrawerOpen] = useState(true);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isMobile = !isDesktop;

  if (status === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Roboto, Arial, sans-serif' }}>
        <PlaceholderLogo />
        <Typography color="text.secondary" sx={{ mt: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  if (!session) {
    return (
      <Box sx={{ minHeight: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
        {/* Video background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: 0,
            opacity: 0.35,
          }}
          src={VIDEO_URL}
        />
        {/* Overlay for readability */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(247, 248, 250, 0.7)', zIndex: 1 }} />
        {/* Centered card */}
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
          <Paper sx={{ maxWidth: 520, width: '100%', p: 3, borderRadius: 4, boxShadow: 3, backdropFilter: 'blur(4px)', fontFamily: 'Roboto, Arial, sans-serif' }}>
            <Paper sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Roboto, Arial, sans-serif' }}>
              <PlaceholderLogo />
              <Typography
                variant="h5"
                fontWeight={900}
                align="center"
                gutterBottom
                sx={{
                  fontFamily: 'Roboto, Arial, sans-serif',
                  fontSize: { xs: '1.7rem', sm: '2.1rem', md: '2.3rem' },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  mb: 1,
                }}
              >
                Maverick Intelligence
              </Typography>
              <Typography
                variant="subtitle1"
                align="center"
                color="text.secondary"
                sx={{
                  mb: 3,
                  fontFamily: 'Roboto, Arial, sans-serif',
                  fontWeight: 500,
                  fontSize: { xs: '1.05rem', sm: '1.15rem', md: '1.2rem' },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                }}
              >
                We help you to find your gem in less than 5 Mins!
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => signIn('google')}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  fontSize: 16,
                  borderRadius: 2,
                  bgcolor: '#fff',
                  color: '#00b86b',
                  borderColor: '#00b86b',
                  textTransform: 'none',
                  mb: 1,
                  '&:hover': { borderColor: '#009e5c', color: '#009e5c', bgcolor: '#f7f8fa' },
                }}
              >
                Continue with Google
              </Button>
            </Paper>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc', fontFamily: 'Roboto, Arial, sans-serif' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      <Box sx={{ flexGrow: 1, width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f7fafc' }}>
        {/* Top Bar */}
        <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: 'white', boxShadow: 'none', borderBottom: '1px solid #eee', px: 2 }}>
          <Toolbar sx={{ justifyContent: 'flex-end', gap: 2 }}>
            <Button startIcon={<AccountCircle />} sx={{ textTransform: 'none', fontWeight: 700, color: '#222' }}>Account</Button>
            <Button variant="contained" sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2563eb', color: '#fff', borderRadius: 2, px: 2, '&:hover': { bgcolor: '#1d4ed8' } }}>
              $ Premium Access
            </Button>
          </Toolbar>
        </AppBar>
        {/* Hero Section */}
        <Box sx={{ width: '100%', bgcolor: '#eaf1fb', py: { xs: 4, md: 7 }, px: { xs: 2, md: 0 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h3" fontWeight={800} align="center" sx={{ color: '#222', mb: 1, fontSize: { xs: '2rem', md: '2.7rem' } }}>
            CSE Intelligence Platform <Box component="span" sx={{ color: '#2563eb' }}>by Maverick Intelligence</Box>
          </Typography>
          <Typography variant="h6" align="center" sx={{ color: '#444', mb: 3, fontWeight: 400, maxWidth: 600 }}>
            Advanced analytics and predictive tools to help you make Navigate the financial market.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
            <Button variant="contained" size="large" sx={{ fontWeight: 700, fontSize: 18, borderRadius: 2, bgcolor: '#2563eb', color: '#fff', px: 4, '&:hover': { bgcolor: '#1d4ed8' } }}>
              Get Started
            </Button>
          </Box>
        </Box>
        {/* Tools Section */}
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', mt: { xs: 3, md: 5 }, mb: 4 }}>
          <Typography variant="h4" fontWeight={800} align="center" sx={{ mb: 3, color: '#222', fontSize: { xs: '1.5rem', md: '2.2rem' } }}>
            Powerful Tools for Market Intelligence
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, justifyContent: 'center' }}>
            <MUICard sx={{ flex: 1, minWidth: 260, borderRadius: 3, boxShadow: 1, bgcolor: '#fff' }}>
              <CardContent>
                <Box sx={{ mb: 1 }}><BarChart sx={{ color: '#60a5fa', fontSize: 36 }} /></Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Explore Dashboards</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Comprehensive market data visualizations and analytics. Access real-time market data, custom charts, and performance metrics to track your investments.
                </Typography>
                <Button endIcon={<ArrowForwardIosIcon sx={{ fontSize: 16 }} />} sx={{ textTransform: 'none', fontWeight: 700, color: '#2563eb' }}>Explore Now</Button>
              </CardContent>
            </MUICard>
            <MUICard sx={{ flex: 1, minWidth: 260, borderRadius: 3, boxShadow: 1, bgcolor: '#fff' }}>
              <CardContent>
                <Box sx={{ mb: 1 }}><InsertChartOutlined sx={{ color: '#60a5fa', fontSize: 36 }} /></Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Stay Updated</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Real-time alerts and market news. Get instant notifications on market movements, breaking news, and personalized alerts.
                </Typography>
                <Button endIcon={<ArrowForwardIosIcon sx={{ fontSize: 16 }} />} sx={{ textTransform: 'none', fontWeight: 700, color: '#2563eb' }}>Configure Alerts</Button>
              </CardContent>
            </MUICard>
            <MUICard sx={{ flex: 1, minWidth: 260, borderRadius: 3, boxShadow: 1, bgcolor: '#fff' }}>
              <CardContent>
                <Box sx={{ mb: 1 }}><Book sx={{ color: '#60a5fa', fontSize: 36 }} /></Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Beat The Market</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Advanced predictive analytics. Leverage AI-powered predictions and insights to identify opportunities before the market.
                </Typography>
                <Button endIcon={<ArrowForwardIosIcon sx={{ fontSize: 16 }} />} sx={{ textTransform: 'none', fontWeight: 700, color: '#2563eb' }}>View Predictions</Button>
              </CardContent>
            </MUICard>
          </Box>
        </Box>
        {/* Premium Section */}
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', mb: 6 }}>
          <Typography variant="h4" fontWeight={800} align="center" sx={{ mb: 3, color: '#222', fontSize: { xs: '1.5rem', md: '2.2rem' } }}>
            Unlock Premium Features
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <MUICard sx={{ minWidth: 320, maxWidth: 360, borderRadius: 3, boxShadow: 2, bgcolor: '#fff', p: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} align="center" sx={{ mb: 1 }}>Premium Membership</Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>Support us on Patreon</Typography>
                <Typography variant="h3" align="center" fontWeight={900} sx={{ color: '#2563eb', mb: 1 }}>$9</Typography>
                <Typography align="center" sx={{ mb: 2 }}>/month</Typography>
                <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                  <li>Advanced predictive analytics</li>
                  <li>Timely market alerts</li>
                  <li>Access to all features</li>
                  <li>Early access to new features</li>
                  <li>Priority customer support</li>
                </Box>
                <Button variant="contained" fullWidth sx={{ bgcolor: '#2563eb', color: '#fff', fontWeight: 700, borderRadius: 2, py: 1.2, '&:hover': { bgcolor: '#1d4ed8' } }} href="https://www.patreon.com/c/CSEMaverick" target="_blank" rel="noopener noreferrer">
                  Join on Patreon
                </Button>
              </CardContent>
            </MUICard>
          </Box>
        </Box>
        {/* Footer */}
        <Box sx={{ width: '100%', bgcolor: '#f7fafc', borderTop: '1px solid #eee', py: 2, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: '#888' }}>
          <Box>Maverick Intelligence<br />© 2025 All rights reserved</Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link href="#" sx={{ color: '#888', textDecoration: 'none', mr: 2 }}>Terms</Link>
            <Link href="#" sx={{ color: '#888', textDecoration: 'none', mr: 2 }}>Privacy</Link>
            <Link href="#" sx={{ color: '#888', textDecoration: 'none' }}>Contact</Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
} 