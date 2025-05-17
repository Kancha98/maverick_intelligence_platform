'use client';

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  IconButton,
  Typography,
  Button,
  Link,
} from '@mui/material';
import {
  Home,
  BarChart,
  Book,
  Notifications,
  AccountCircle,
  MenuBook,
  Logout,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import { navLinks } from './navLinks';

const drawerWidth = 270;

const PlaceholderLogo = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2 }}>
    <img src="/logo.png" alt="Maverick Intelligence Logo" style={{ width: 44, height: 44, borderRadius: 10 }} />
  </Box>
);

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  isDesktop: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, isDesktop }) => {
  const router = useRouter();
  const pathname = usePathname();

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Roboto, Arial, sans-serif', bgcolor: 'background.paper' }}>
      <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PlaceholderLogo />
        <Typography variant="h6" fontWeight={700} sx={{ ml: 1, fontFamily: 'Roboto, Arial, sans-serif' }}>Maverick Intelligence</Typography>
        <IconButton onClick={onClose} sx={{ ml: 'auto', display: { xs: 'inline-flex', md: 'inline-flex' } }}>
          <ChevronLeftIcon />
        </IconButton>
      </Box>
      <Divider sx={{ mb: 1 }} />
      <List sx={{ flexGrow: 1 }}>
        {navLinks.map((item) => (
          <ListItem button key={item.label} component={Link} href={item.path} sx={{ borderRadius: 2, mb: 0.5, mx: 1, bgcolor: pathname === item.path ? 'rgba(0,184,107,0.08)' : 'inherit' }}>
            <ListItemIcon sx={{ color: 'text.secondary' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontFamily: 'Roboto, Arial, sans-serif', fontWeight: item.label === 'Home' ? 700 : 400 }} />
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 2, fontFamily: 'Roboto, Arial, sans-serif' }}>
        <Button variant="text" color="warning" fullWidth startIcon={<Logout />} sx={{ fontWeight: 700, borderRadius: 2, fontFamily: 'Roboto, Arial, sans-serif', textTransform: 'none' }} onClick={() => router.push('/api/auth/signout')}>
          Logout
        </Button>
      </Box>
    </Box>
  );

  return isDesktop ? (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: open ? drawerWidth : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          transition: 'width 0.3s',
          overflowX: 'hidden',
          display: open ? 'block' : 'none',
        },
        display: open ? 'block' : 'none',
      }}
    >
      {drawer}
    </Drawer>
  ) : (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
        },
      }}
    >
      {drawer}
    </Drawer>
  );
};

export default Sidebar; 