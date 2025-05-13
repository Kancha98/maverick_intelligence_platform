'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import {
  Box, Typography, Button, Drawer, List, ListItem, ListItemText, Divider, Avatar, ListItemIcon, Paper, Link, AppBar, Toolbar, IconButton
} from '@mui/material';
import { Home, BarChart, Book, Notifications, AccountCircle, MenuBook, Logout, InsertChartOutlined, Menu as MenuIcon, ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Sidebar from '../components/Sidebar';
import { navLinks } from '../components/navLinks';

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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff', fontFamily: 'Roboto, Arial, sans-serif' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      <Box
        sx={{
          flexGrow: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          position: 'relative',
          background: 'linear-gradient(135deg, #f7fafc 0%, #e3f0ff 100%)',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ml: drawerOpen && isDesktop ? `${drawerWidth}px` : 0,
          overflow: 'hidden',
        }}
      >
        <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: 'transparent', boxShadow: 'none', borderBottom: '1px solid #eee' }}>
          <Toolbar>
            {!drawerOpen && (
              <IconButton edge="start" aria-label="menu" onClick={() => setDrawerOpen(true)} sx={{ color: '#000' }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flexGrow: 1, fontFamily: 'Roboto, Arial, sans-serif' }}></Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: { xs: 1, sm: 2, md: 5 }, fontFamily: 'Roboto, Arial, sans-serif', bgcolor: 'transparent', position: 'relative', zIndex: 2 }}>
          {/* Title above card */}
          <Typography variant="h5" align="center" sx={{ fontWeight: 700, mb: 2, fontFamily: 'Roboto, Arial, sans-serif', color: '#222' }}>
            CSE Intelligence Platform by Maverick
          </Typography>
          <Box sx={{
            maxWidth: 700,
            minWidth: { xs: 0, sm: 340 },
            mx: 'auto',
            width: '100%',
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 3,
            boxShadow: 2,
            background: 'linear-gradient(135deg, rgba(247,250,252,0.96) 0%, rgba(227,240,255,0.96) 100%)',
            mt: { xs: 2, md: 2 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: '#222', mb: 1, fontFamily: 'Roboto,sans-serif' }}>
              Explore Dashboards
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: '#222', mb: 1, fontFamily: 'Roboto, sans-serif' }}>
              Stay updated
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: '#222', fontFamily: 'Roboto, sans-serif' }}>
              Beat The Market
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
            <Typography variant="body2" sx={{ fontFamily: 'Roboto, Arial, sans-serif', fontSize: 16, textAlign: 'center' }}>
              <span role="img" aria-label="pray">🙏</span> <Link href="https://www.patreon.com/c/CSEMaverick" target="_blank" rel="noopener noreferrer" sx={{ color: '#22c55e', fontWeight: 700, textDecoration: 'underline', fontSize: 16 }}>Patreon</Link> <span role="img" aria-label="heart">💚</span>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
} 