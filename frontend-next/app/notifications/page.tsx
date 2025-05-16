"use client";
import { useState } from 'react';
import {
  Box, Typography, Button, TextField, Alert, AppBar, Toolbar, IconButton, Paper, Link
} from '@mui/material';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';

export default function NotificationsPage() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [countryCode, setCountryCode] = useState('94');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle'|'success'|'error'|'warning'>('idle');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unsubPhone, setUnsubPhone] = useState('');
  const [unsubStatus, setUnsubStatus] = useState<'idle'|'success'|'error'|'warning'>('idle');
  const [unsubMessage, setUnsubMessage] = useState('');
  const [unsubLoading, setUnsubLoading] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const THROTTLE_MS = 2000; // 2 seconds between submissions
  const [phoneError, setPhoneError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const validatePhone = (phone: string) => {
    if (!phone) {
      setPhoneError('Phone number is required');
      return false;
    }
    
    if (!/^\d+$/.test(phone)) {
      setPhoneError('Phone number must contain only digits');
      return false;
    }
    
    if (phone.length !== 9) {
      setPhoneError('Phone number must be exactly 9 digits');
      return false;
    }
    
    setPhoneError('');
    return true;
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setPhoneNumber(value);
    if (value) validatePhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    if (now - lastSubmitTime < THROTTLE_MS) {
      setStatus('warning');
      setMessage('Please wait a moment before submitting again');
      return;
    }
    setLastSubmitTime(now);
    
    setStatus('idle');
    setMessage('');
    setLoading(true);
    
    if (!validatePhone(phoneNumber)) {
      setStatus('warning');
      setMessage(phoneError || 'Invalid phone number');
      setLoading(false);
      return;
    }
    
    if (!countryCode) {
      setStatus('warning');
      setMessage('Please enter country code');
      setLoading(false);
      return;
    }
    
    if (countryCode !== '94') {
      setStatus('warning');
      setMessage('Service is only available for Sri Lankan phone numbers. Please contact Maverick Intelligence for other regions. 🌏');
      setLoading(false);
      return;
    }
    
    if (!username) {
      setStatus('warning');
      setMessage('Please enter your username');
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, username, countryCode })
      });
      
      const data = await res.json();
      
      if (res.status === 429) {
        setStatus('error');
        setMessage('Too many attempts. Please try again later (rate limit).');
      } else if (res.ok && data.success) {
        setStatus('success');
        setMessage(data.message);
        setPhoneNumber('');
        setUsername('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to subscribe.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    if (now - lastSubmitTime < THROTTLE_MS) {
      setUnsubStatus('warning');
      setUnsubMessage('Please wait a moment before submitting again');
      return;
    }
    setLastSubmitTime(now);
    
    setUnsubStatus('idle');
    setUnsubMessage('');
    setUnsubLoading(true);
    
    if (!unsubPhone) {
      setUnsubStatus('warning');
      setUnsubMessage('Please enter your phone number.');
      setUnsubLoading(false);
      return;
    }
    
    if (!/^\d{9}$/.test(unsubPhone)) {
      setUnsubStatus('warning');
      setUnsubMessage('Phone number must be exactly 9 digits');
      setUnsubLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: unsubPhone })
      });
      
      const data = await res.json();
      
      if (res.status === 429) {
        setUnsubStatus('error');
        setUnsubMessage('Too many attempts. Please try again later (rate limit).');
      } else if (res.ok && data.success) {
        setUnsubStatus('success');
        setUnsubMessage(data.message);
        setUnsubPhone('');
      } else {
        setUnsubStatus('error');
        setUnsubMessage(data.error || 'Failed to unsubscribe.');
      }
    } catch (err) {
      setUnsubStatus('error');
      setUnsubMessage('Network error. Please try again.');
    } finally {
      setUnsubLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc', fontFamily: 'Roboto, Arial, sans-serif' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      <Box sx={{ flexGrow: 1, width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f7fafc' }}>
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
              <Button startIcon={<AccountCircle />} sx={{ textTransform: 'none', fontWeight: 700, color: '#222' }}>Account</Button>
            </Box>
          </Toolbar>
        </AppBar>
        <Box sx={{ width: '100%', bgcolor: '#eaf1fb', py: { xs: 4, md: 7 }, px: { xs: 2, md: 0 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h3" fontWeight={800} align="center" sx={{ color: '#222', mb: 1, fontSize: { xs: '2rem', md: '2.7rem' } }}>
            Intelligent Alerts SMS Service <Box component="span" sx={{ color: '#2563eb' }}>by Maverick Intelligence</Box>
          </Typography>
          <Typography variant="h6" align="center" sx={{ color: '#444', mb: 3, fontWeight: 400, maxWidth: 600 }}>
            Stay informed with our Timely Intelligent Alerts! 📢 Please enter your phone number and username to subscribe.
          </Typography>
        </Box>
        <Box sx={{ width: '100%', maxWidth: 480, mx: 'auto', mt: 4, mb: 2 }}>
          <Paper sx={{ p: 4, borderRadius: 4, boxShadow: 2 }}>
            <form onSubmit={handleSubmit}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Subscribe to SMS Alerts</Typography>
              <TextField
                label="Country Code"
                value={countryCode}
                onChange={e => setCountryCode(e.target.value.replace(/\D/g, ''))}
                fullWidth
                margin="normal"
                placeholder="94"
                inputProps={{ maxLength: 3 }}
              />
              <TextField
                label="Phone Number"
                value={phoneNumber}
                onChange={handlePhoneChange}
                fullWidth
                margin="normal"
                placeholder="771234567"
                inputProps={{ maxLength: 9 }}
                error={!!phoneError}
                helperText={phoneError}
              />
              <TextField
                label="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                fullWidth
                margin="normal"
                placeholder="Enter username"
              />
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2, fontWeight: 700, fontSize: 16, borderRadius: 2, py: 1.2 }} disabled={loading}>
                {loading ? 'Subscribing...' : 'Subscribe to Alerts'}
              </Button>
              {status !== 'idle' && (
                <Alert severity={status} sx={{ mt: 2 }}>{message}</Alert>
              )}
            </form>
            <Alert severity="info" sx={{ mt: 2 }}>
              You're on a 30-day free trial.<br /> To keep receiving stock alerts, subscribe to a plan.<br />Contact Maverick Team for more information!
            </Alert>
          </Paper>
        </Box>
        <Box sx={{ width: '100%', maxWidth: 480, mx: 'auto', mt: 2, mb: 4 }}>
          <Paper sx={{ p: 4, borderRadius: 4, boxShadow: 2 }}>
            <form onSubmit={handleUnsubscribe}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Unsubscribe from SMS Alerts</Typography>
              <TextField
                label="Phone Number"
                value={unsubPhone}
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, '');
                  setUnsubPhone(value);
                }}
                fullWidth
                margin="normal"
                placeholder="771234567"
                inputProps={{ maxLength: 9 }}
                error={unsubPhone.length > 0 && !/^\d{9}$/.test(unsubPhone)}
                helperText={unsubPhone.length > 0 && !/^\d{9}$/.test(unsubPhone) ? 'Phone number must be exactly 9 digits' : ''}
              />
              <Button type="submit" variant="outlined" color="error" fullWidth sx={{ mt: 2, fontWeight: 700, fontSize: 16, borderRadius: 2, py: 1.2 }} disabled={unsubLoading}>
                {unsubLoading ? 'Unsubscribing...' : 'Unsubscribe'}
              </Button>
              {unsubStatus !== 'idle' && (
                <Alert severity={unsubStatus} sx={{ mt: 2 }}>{unsubMessage}</Alert>
              )}
            </form>
          </Paper>
        </Box>
        <Box sx={{ width: '100%', bgcolor: '#f7fafc', borderTop: '1px solid #eee', py: 2, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: '#888', mt: 4 }}>
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