'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import {
  Box, Typography, Button, Drawer, List, ListItem, ListItemText, Divider, Avatar, ListItemIcon, Paper, Link, AppBar, Toolbar, IconButton, Card as MUICard, CardContent, CardActions, Container, Modal
} from '@mui/material';
import { Home, BarChart, Book, Notifications, AccountCircle, MenuBook, Logout, InsertChartOutlined, Menu as MenuIcon, ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Sidebar from '../components/Sidebar';
import { navLinks } from '../components/navLinks';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import InsightsIcon from '@mui/icons-material/Insights';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { FaPatreon } from 'react-icons/fa';
import Tooltip from '@mui/material/Tooltip';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CloseIcon from '@mui/icons-material/Close';

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
  const [contactOpen, setContactOpen] = useState(false);

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
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {!drawerOpen && (
                <IconButton edge="start" aria-label="menu" onClick={() => setDrawerOpen(true)} sx={{ color: '#000', mr: 2 }}>
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button 
                startIcon={<AccountCircle />} 
                href="/profile"
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 700, 
                  color: '#222',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.04)'
                  }
                }}
              >
                Account
              </Button>
              <Button 
                variant="outlined" 
                href="/#premium"
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 700, 
                  color: '#2563eb',
                  borderColor: '#2563eb',
                  borderRadius: 2,
                  px: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  '&:hover': { 
                    bgcolor: 'rgba(37,99,235,0.04)',
                    borderColor: '#1d4ed8'
                  }
                }}
              >
                Premium
              </Button>
            </Box>
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
        <Box id="premium" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 4 }, bgcolor: 'linear-gradient(135deg, #f8fafc 60%, #eaf1fb 100%)', borderTop: '1.5px solid #e0e7ef', borderBottom: '1.5px solid #e0e7ef' }}>
          <Container maxWidth="lg">
            <Typography 
              variant="h4" 
              fontWeight={800} 
              align="center" 
              sx={{ mb: 3, color: '#222', fontSize: { xs: '2rem', md: '2.2rem' } }}
            >
            Unlock Premium Features
          </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 4, md: 3 }, justifyContent: 'center', alignItems: 'stretch', mb: 3 }}>
              {/* Early Bird Offer Card */}
              <Box sx={{ position: 'relative', flex: 1, minWidth: 280, maxWidth: 380, mb: { xs: 3, md: 0 } }}>
                <Box sx={{ position: 'absolute', top: 18, left: -18, zIndex: 2 }}>
                  <Box sx={{ bgcolor: '#2563eb', color: '#fff', px: 2, py: 0.5, borderRadius: 2, fontWeight: 700, fontSize: 14, boxShadow: 2, transform: 'rotate(-12deg)' }}>
                    Best Value
                  </Box>
                </Box>
                <MUICard sx={{
                  height: '100%',
                  borderRadius: 3,
                  boxShadow: 3,
                  bgcolor: '#fff',
                  p: 2,
                  borderTop: '5px solid #2563eb',
                  background: 'linear-gradient(135deg, #fafdff 80%, #eaf1fb 100%)',
                  transition: 'transform 0.18s cubic-bezier(.4,2,.6,1)',
                  '&:hover': { transform: 'scale(1.035)', boxShadow: 6 },
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={700} align="center" sx={{ mb: 0.5 }}>Early Bird Offer</Typography>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>Limited Time Special</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', mb: 1 }}>
                      <Typography variant="h2" fontWeight={900} sx={{ color: '#2563eb', fontSize: { xs: 38, sm: 48 }, lineHeight: 1 }}>$80</Typography>
                      <Typography sx={{ color: '#888', fontWeight: 500, fontSize: 22, ml: 1, mt: 1 }}>/year</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>All the features in the Free-platform and:</Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 2, color: '#222', fontSize: 16, listStyle: 'none', p: 0 }}>
                      <li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}><CheckCircleIcon sx={{ fontSize: 20, mr: 1, color: '#00b96b' }} />12 months of premium access</li>
                      <li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}><CheckCircleIcon sx={{ fontSize: 20, mr: 1, color: '#00b96b' }} />Priority customer support</li>
                      <li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}><CheckCircleIcon sx={{ fontSize: 20, mr: 1, color: '#00b96b' }} />Early access to new features</li>
                      <li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                        <Tooltip title="Coming soon" arrow>
                          <HourglassEmptyIcon sx={{ fontSize: 20, mr: 1, color: '#f59e42', cursor: 'pointer' }} />
                        </Tooltip>
                        AI assistant
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                        <Tooltip title="Coming soon" arrow>
                          <HourglassEmptyIcon sx={{ fontSize: 20, mr: 1, color: '#f59e42', cursor: 'pointer' }} />
                        </Tooltip>
                        Financial Documents analyzer
                      </li>
                    </Box>
                    <Button 
                      variant="contained" 
                      fullWidth 
                      startIcon={<StarIcon />} 
                      sx={{ bgcolor: '#2563eb', color: '#fff', fontWeight: 700, borderRadius: 2, py: 1.2, mt: 1, fontSize: 17, '&:hover': { bgcolor: '#1d4ed8' } }}
                      onClick={() => setContactOpen(true)}
                    >
                      Contact Team
                    </Button>
                  </CardContent>
                </MUICard>
              </Box>
              {/* Premium Membership Card */}
              <Box sx={{ flex: 1, minWidth: 280, maxWidth: 380 }}>
                <MUICard sx={{
                  height: '100%',
                  borderRadius: 3,
                  boxShadow: 3,
                  bgcolor: '#fff',
                  p: 2,
                  borderTop: '5px solid #2563eb',
                  background: 'linear-gradient(135deg, #fafdff 80%, #eaf1fb 100%)',
                  transition: 'transform 0.18s cubic-bezier(.4,2,.6,1)',
                  '&:hover': { transform: 'scale(1.035)', boxShadow: 6 },
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={700} align="center" sx={{ mb: 0.5 }}>Premium Membership</Typography>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>Support us on Patreon</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', mb: 1 }}>
                      <Typography variant="h2" fontWeight={900} sx={{ color: '#2563eb', fontSize: { xs: 38, sm: 48 }, lineHeight: 1 }}>$9</Typography>
                      <Typography sx={{ color: '#888', fontWeight: 500, fontSize: 22, ml: 1, mt: 1 }}>/month</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>All the features in the Free-platform and:</Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 2, color: '#222', fontSize: 16, listStyle: 'none', p: 0 }}>
                      <li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}><CheckCircleIcon sx={{ fontSize: 20, mr: 1, color: '#00b96b' }} />Advanced market analytics</li>
                      <li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}><CheckCircleIcon sx={{ fontSize: 20, mr: 1, color: '#00b96b' }} />Standard customer support</li>
                      <li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                        <Tooltip title="Coming soon" arrow>
                          <HourglassEmptyIcon sx={{ fontSize: 20, mr: 1, color: '#f59e42', cursor: 'pointer' }} />
                        </Tooltip>
                        AI assistant
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                        <Tooltip title="Coming soon" arrow>
                          <HourglassEmptyIcon sx={{ fontSize: 20, mr: 1, color: '#f59e42', cursor: 'pointer' }} />
                        </Tooltip>
                        Financial Document analyzer
                      </li>
                    </Box>
                    <Button 
                      variant="contained" 
                      fullWidth 
                      startIcon={<FaPatreon style={{ fontSize: 22 }} />} 
                      href="https://www.patreon.com/c/CSEMaverick" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      sx={{ bgcolor: '#18181b', color: '#fff', fontWeight: 700, borderRadius: 2, py: 1.2, mt: 1, fontSize: 17, '&:hover': { bgcolor: '#2563eb' } }}
                    >
                  Join on Patreon
                </Button>
              </CardContent>
            </MUICard>
          </Box>
            </Box>
            <Paper elevation={0} sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: '#f3f6fa', textAlign: 'center', fontSize: 16, color: '#666', maxWidth: 600, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
              <InfoOutlinedIcon sx={{ color: '#2563eb', fontSize: 22, mr: 1 }} />
              In-app subscription coming soon. For direct bank transfer options, please contact Maverick for assistance.
            </Paper>
          </Container>
        </Box>
        {/* WhatsApp Contact Modal */}
        <Modal open={contactOpen} onClose={() => setContactOpen(false)}>
          <Box
            sx={{
              position: 'fixed',
              left: isMobile ? 0 : '50%',
              bottom: isMobile ? 0 : '50%',
              transform: isMobile ? 'none' : 'translate(-50%, 50%)',
              width: isMobile ? '100%' : 360,
              bgcolor: 'background.paper',
              borderTopLeftRadius: isMobile ? 16 : 4,
              borderTopRightRadius: isMobile ? 16 : 4,
              borderRadius: isMobile ? 0 : 4,
              p: 3,
              boxShadow: 24,
              textAlign: 'center',
              minHeight: 180,
              zIndex: 2000,
            }}
          >
            <IconButton
              onClick={() => setContactOpen(false)}
              sx={{ position: 'absolute', top: 8, right: 8 }}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <WhatsAppIcon sx={{ color: '#25D366', fontSize: 48, mb: 1 }} />
            <Typography variant="h6" fontWeight={700} mb={1}>
              Contact Maverick Intelligence
            </Typography>
            <Typography variant="body1" mb={2}>
              Chat with our team instantly on WhatsApp!
            </Typography>
            <Button
              variant="contained"
              color="success"
              size="large"
              fullWidth
              startIcon={<WhatsAppIcon />}
              href="https://wa.me/94785531071"
              target="_blank"
              sx={{
                fontWeight: 700,
                fontSize: '1.1rem',
                py: 1.2,
                borderRadius: 3,
                mb: 1,
              }}
            >
              Chat on WhatsApp
            </Button>
            <Typography variant="caption" color="text.secondary">
              WhatsApp: +94 785531071
            </Typography>
          </Box>
        </Modal>
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