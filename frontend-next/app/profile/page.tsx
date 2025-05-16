'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Box, TextField, Button, Typography, MenuItem, Snackbar, Alert, Paper, Container, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Grow } from '@mui/material';

const countries = ['Sri Lanka', 'India', 'UK', 'USA', 'Aus', 'South Korea', 'Japan', 'Qatar', 'UAE', 'Other'];

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: session?.user?.email || '',
    country_of_residence: '',
    trading_experience_cse: '',
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | React.ChangeEvent<{ name?: string; value: unknown }> | React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, [e.target.name as string]: e.target.value });
  const useGoogleEmail = () => setForm(f => ({ ...f, email: session?.user?.email || '' }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      setError('Unexpected server response. Please try again.');
      return;
    }
    if (res.ok && (data as any).success) setSuccess(true);
    else setError((data as any).error || 'Failed to save profile');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7fafc' }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} isDesktop={isDesktop} />
      <Box sx={{ flexGrow: 1, width: '100%', p: { xs: 2, md: 3 }, overflow: 'auto' }}>
        <Container maxWidth="sm">
          <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 2, border: '1px solid #eaeaea', backgroundColor: 'white', mt: 4 }}>
            <Typography variant="h5" mb={2} fontWeight={700}>Profile Management</Typography>
            <form onSubmit={handleSubmit}>
              <TextField label="Name" name="name" value={form.name} onChange={handleChange} required fullWidth margin="normal" />
              <TextField
                label="Email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                fullWidth
                margin="normal"
                InputProps={{
                  endAdornment: session?.user?.email && (
                    <Button onClick={useGoogleEmail} size="small">Use Google Email</Button>
                  ),
                }}
              />
              <TextField
                select
                label="Country of Residence"
                name="country_of_residence"
                value={form.country_of_residence}
                onChange={handleChange}
                required
                fullWidth
                margin="normal"
              >
                {countries.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField
                label="How long have you been a trader in CSE? (optional)"
                name="trading_experience_cse"
                value={form.trading_experience_cse}
                onChange={handleChange}
                fullWidth
                margin="normal"
              />
              <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>Save Profile</Button>
            </form>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Dialog
              open={success}
              onClose={() => setSuccess(false)}
              TransitionComponent={Grow}
              transitionDuration={400}
              PaperProps={{
                sx: {
                  borderRadius: 4,
                  p: 3,
                  minWidth: 350,
                  boxShadow: 8,
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'visible',
                },
              }}
            >
              <CheckCircleOutlineIcon
                color="success"
                sx={{
                  fontSize: 60,
                  position: 'absolute',
                  top: -40,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: 'background.paper',
                  borderRadius: '50%',
                  boxShadow: 2,
                  p: 1,
                }}
              />
              <DialogTitle sx={{ mt: 3, fontWeight: 700, fontSize: 24 }}>
                Profile Saved!
              </DialogTitle>
              <DialogContent>
                <Typography sx={{ mb: 1 }}>
                  Your profile has been saved.
                </Typography>
                <Typography sx={{ fontWeight: 500, color: 'primary.main', mb: 2 }}>
                  To ensure you receive <b>Intelligence Alerts</b>, please go to Notifications and sign up for alerts.
                </Typography>
              </DialogContent>
              <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button
                  onClick={() => setSuccess(false)}
                  color="inherit"
                  sx={{ fontWeight: 600, mr: 2 }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setSuccess(false);
                    router.push('/notifications');
                  }}
                  variant="contained"
                  color="success"
                  sx={{
                    fontWeight: 700,
                    px: 3,
                    boxShadow: 2,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Go to Notifications
                </Button>
              </DialogActions>
            </Dialog>
            {/* Premium Subscription Section */}
            <Paper elevation={2} sx={{ mt: 5, p: 3, borderRadius: 2, bgcolor: '#f7f8fa', border: '1px solid #e0e0e0', textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Subscribe to Premium</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Unlock advanced features and support the platform!
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                href="https://www.patreon.com/c/CSEMaverick" // Replace with your actual Patreon link
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mt: 1, fontWeight: 700 }}
              >
                Subscribe via Patreon
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                More payment options coming soon.
              </Typography>
            </Paper>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
} 